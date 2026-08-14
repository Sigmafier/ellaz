// Opponents, so somebody can actually play this.
//
//   npm run bots                    3 bots at a fresh private table on the live site
//   npm run bots -- --n 5           five of them
//   npm run bots -- --join 7K3QM    sit down at a table that already exists
//   npm run bots -- --local         against `npm run dev` on :8787
//
// They run HERE, on this machine, and reach the table through the same
// WebSocket a browser uses. Nothing is deployed and the server does not know
// they are bots — which is the whole design: a bot table exercises the real
// join, the real deal, the real clock and the real reconnect, and a bug that
// only shows up under bots is a bug a person would have hit too.
//
// The brain is in shared/src/bot/, unit-tested, because "the bots never raise"
// is a silent failure that wastes an entire sitting: the pot never grows,
// nobody is ever all in, and the run-out and the showdown — the two things
// most worth looking at — simply never happen.
//
// TypeScript, run through vite-node, so it can import the REAL evaluator
// rather than carrying a second opinion about what beats what.

import type { Card } from "../shared/src/engine/cards";
import { RANK_CHARS } from "../shared/src/engine/cards";
import type { EngineEvent } from "../shared/src/engine/types";
import type { PublicTableView } from "../shared/src/engine/view";
import type { S2C, YouView } from "../shared/src/protocol";
import { PROTOCOL_VERSION } from "../shared/src/protocol";
import { renderName } from "../shared/src/names";
import { equity } from "../shared/src/bot/equity";
import { decide, PERSONAS, type Persona } from "../shared/src/bot/policy";

// ---------------------------------------------------------------------------
// Arguments

const argv = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const has = (name: string) => argv.includes(`--${name}`);
const num = (name: string, fallback: number) => {
  const v = flag(name);
  const n = v === undefined ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const BOTS = Math.max(1, Math.min(8, num("n", 3)));
const SEATS = Math.max(2, Math.min(9, num("seats", 6)));
const STACK = Math.max(20, num("stack", 200));
// 2/5 with a 200 stack is 40 big blinds, and the depth is a deliberate choice
// rather than a default nobody thought about. At 100bb (1/2) the stacks are so
// deep relative to the pot that nobody is ever all in — measured over 8 hands
// on the first run of this script, not one. The run-out of an all-in is the
// best thing on the felt and the whole reason to sit down and look, so the
// table has to be one where it happens.
const SB = Math.max(1, num("sb", 2));
const BB = Math.max(SB * 2, num("bb", SB * 2 + 1));
const JOIN = flag("join")?.toUpperCase();
const LISTED = has("listed");
const QUIET = has("quiet");
// 300 samples is +/- 3 points, which is far finer than the gaps between the
// decisions it feeds. More would only make the bots slower to think.
const ITERS = Math.max(50, num("iters", 300));

const SITE = "https://poker.ellaz.fun";

// ---------------------------------------------------------------------------
// Which server

/**
 * The worker's URL is not in this repo — it contains the Cloudflare account's
 * own subdomain, which the deploy workflow discovers at build time and bakes
 * into the client bundle. So read it back out of the bundle the browser is
 * running: the bots then cannot possibly be pointed at a different server from
 * the one the person testing is looking at, and there is no constant here to
 * go stale the day the account changes.
 */
async function discoverServer(): Promise<string> {
  const html = await (await fetch(SITE, { redirect: "follow" })).text();
  const src = html.match(/<script[^>]+src="([^"]+\.js)"/)?.[1];
  if (!src) throw new Error(`no module script in ${SITE} — is the site up?`);
  const js = await (await fetch(new URL(src, SITE))).text();
  const url = js.match(/https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev/)?.[0];
  if (!url) throw new Error(`${SITE} names no server — pass --url explicitly`);
  return url;
}

const BASE =
  flag("url") ??
  process.env.HOLDEM_URL ??
  (has("local") ? "http://localhost:8787" : await discoverServer());
const WS_BASE = BASE.replace(/^http/, "ws");

// ---------------------------------------------------------------------------
// Pretty

const SUITS = ["c", "d", "h", "s"];
const card = (c: Card) => `${RANK_CHARS[(c / 4) | 0]}${SUITS[c % 4]}`;
const cardList = (cs: readonly Card[]) => cs.map(card).join(" ");
const pad = (s: string, n: number) => (s.length >= n ? s : s + " ".repeat(n - s.length));
const say = (line: string) => {
  if (!QUIET) console.log(line);
};

// ---------------------------------------------------------------------------
// One bot

class Bot {
  readonly token = `bot-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  ws!: WebSocket;
  name = "…";
  persona: Persona;
  seat = -1;
  view: PublicTableView | null = null;
  you: YouView | null = null;
  /** `handNo:actionSeq` of the last spot acted on — never act on one twice. */
  private acted = "";
  private closing = false;
  /**
   * A takeSeat is in flight.
   *
   * Without this every bot asks three times: the server sends `room` before
   * `you`, so a bot sees a snapshot in which it is seated while its own
   * `this.seat` is still -1, and asks again. It is answered with BAD_STATE and
   * nothing breaks — but three red lines above the table read as a broken
   * script, which is the last thing a debugging harness should look like.
   */
  private seatRequested = false;

  constructor(
    readonly index: number,
    persona: Persona,
    readonly code: string,
  ) {
    this.persona = persona;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${WS_BASE}/ws/${this.code}`);
      this.ws.onopen = () => {
        // No `name` — the server draws one from the pool, exactly as it does
        // for a person, so a bot is indistinguishable from a player at the
        // felt. That is the point: anything odd you see, a player would see.
        this.send({ t: "hello", v: PROTOCOL_VERSION, token: this.token });
        resolve();
      };
      this.ws.onerror = () => reject(new Error(`bot ${this.index} could not reach ${WS_BASE}`));
      this.ws.onclose = () => {
        if (!this.closing) say(`  bot ${this.index} disconnected`);
      };
      this.ws.onmessage = (ev) => this.onMessage(JSON.parse(String(ev.data)) as S2C);
    });
  }

  private send(m: unknown) {
    if (this.ws.readyState === 1) this.ws.send(JSON.stringify(m));
  }

  private onMessage(m: S2C) {
    switch (m.t) {
      case "welcome":
        this.seat = m.seatIdx;
        // The server settles the name — it draws one from the pool and may
        // not honour a request — so the runner renders what came back rather
        // than anything of its own. It also arrives BEFORE a seat exists,
        // which is why the header can name every bot even while one is still
        // finding a chair.
        this.name = renderName(m.name) ?? this.name;
        break;
      case "room":
        this.view = m.view;
        this.upkeep();
        break;
      case "you":
        this.you = m.you;
        this.seat = m.you.seatIdx;
        void this.maybeAct();
        break;
      case "ev":
        if (this.index === 0) narrate(m.events, this.view);
        break;
      case "err":
        // A seat taken from under us between the snapshot and the request is
        // ordinary at a filling table, not an error worth printing — clear the
        // latch and take the next one.
        if (m.code === "SEAT_TAKEN") {
          this.seatRequested = false;
          break;
        }
        // Everything else is printed rather than swallowed: a bot that is
        // silently being refused looks exactly like a bot that is thinking.
        say(`  ! ${this.name}: ${m.code} ${m.msg}`);
        break;
    }
  }

  /** Sit down, buy back in, come back from a forced sit-out. */
  private upkeep() {
    const v = this.view;
    if (!v || this.closing) return;

    if (this.seat < 0) {
      if (this.seatRequested) return;
      const free = v.seats.find((s) => s.status === "empty");
      if (free) {
        this.seatRequested = true;
        this.send({ t: "takeSeat", seatIdx: free.seat, buyIn: buyIn(v) });
      }
      return;
    }

    const me = v.seats[this.seat];
    if (!me || me.inHand) return;
    // Busting out is not the end of the evening for a bot. Without this the
    // table quietly stops dealing once one player holds all the chips, which
    // reads as a hang rather than as a win.
    if (me.stack <= 0) this.send({ t: "rebuy", amount: buyIn(v) });
    else if (me.sittingOut) this.send({ t: "sitIn" });
  }

  private async maybeAct() {
    const you = this.you;
    const v = this.view;
    if (!you?.legal || !you.hole || !v?.hand || this.closing) return;

    const key = `${you.handNo}:${you.actionSeq}`;
    if (key === this.acted) return;
    this.acted = key;

    const board = v.hand.board;
    const opponents = v.seats.filter((s) => s.inHand && !s.folded && s.seat !== this.seat).length;
    const eq = equity(you.hole, board, opponents, ITERS, Math.random);
    const d = decide(
      { legal: you.legal, eq, pot: v.hand.potTotal, betTo: v.hand.betTo },
      this.persona,
      Math.random(),
    );

    const [lo, hi] = this.persona.think;
    await sleep(lo + Math.random() * (hi - lo));

    // The clock may have folded us while we were thinking, or a reconnect may
    // have moved the hand on. Sending a stale seq is answered with an error
    // and nothing else, but the log line would claim we acted.
    if (this.you?.handNo !== you.handNo || this.you?.actionSeq !== you.actionSeq) return;

    this.send({
      t: "act",
      handNo: you.handNo,
      actionSeq: you.actionSeq,
      action: d.action,
      amount: d.amount,
    });

    const shown = d.amount === undefined ? d.action : `${d.action} ${d.amount}`;
    say(
      `  ${pad(this.name, 18)} ${pad(shown, 12)} ${pad(`${Math.round(eq * 100)}%`, 5)} ${d.why}` +
        (QUIET ? "" : `   [${cardList(you.hole)}]`),
    );
  }

  async leave() {
    this.closing = true;
    if (this.seat >= 0) this.send({ t: "leaveSeat" });
    await sleep(120);
    this.ws.close();
  }
}

const buyIn = (v: PublicTableView) =>
  Math.max(v.config.minBuyIn, Math.min(v.config.maxBuyIn, v.config.startingStack));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// A running commentary, from one bot's socket only
//
// Every bot receives the same public events, so narrating from all of them
// would print the board five times. Bot 0 is the narrator; the private events
// it cannot see (other players' hole cards) are exactly the ones that should
// not be in a log a person is looking at while playing.

/** A seat's name, or its number when the snapshot has moved on past it. */
const who = (view: PublicTableView | null, seat: number) =>
  view?.seats[seat]?.name || `seat ${seat}`;

function narrate(events: EngineEvent[], view: PublicTableView | null) {
  for (const e of events) {
    if (e.type === "HandStarted") {
      say(`\n#${e.handNo} preflop`);
    } else if (e.type === "StreetDealt") {
      // `view` is still the PREVIOUS snapshot here — the server sends `ev`
      // before `room` — so the board it holds is the one before these cards.
      // Concatenating is what makes the log show the full board rather than
      // just the turn card on its own.
      const board = view?.hand?.board ?? [];
      say(`  — ${pad(e.street, 6)} ${cardList([...board, ...e.cards].slice(0, 5))}`);
    } else if (e.type === "ShowdownReveal" && !e.mucked && e.cards) {
      say(`  = ${who(view, e.seat)} shows ${cardList(e.cards)}`);
    } else if (e.type === "PotAwarded") {
      say(`  $ ${e.winners.map((s) => who(view, s)).join(" + ")} wins ${e.amount}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Go

const code = JOIN ?? (await createTable());

async function createTable(): Promise<string> {
  const res = await fetch(`${BASE}/api/create`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      maxSeats: SEATS,
      sb: SB,
      bb: BB,
      startingStack: STACK,
      minBuyIn: Math.max(1, Math.round(STACK / 5)),
      maxBuyIn: STACK * 2,
      // Long enough that a person can think, and long enough that a bot with
      // a two-second delay is never near it.
      actionTimeMs: 45_000,
      // Private by default. The lobby is shared with anyone else looking at
      // the site, and a table of robots is not something to advertise there.
      isPrivate: !LISTED,
    }),
  });
  if (!res.ok) throw new Error(`create failed: HTTP ${res.status}`);
  const { code } = (await res.json()) as { code: string };
  return code;
}

const personas = Array.from({ length: BOTS }, (_, i) => PERSONAS[i % PERSONAS.length]);
const bots = personas.map((p, i) => new Bot(i, p, code));

for (const b of bots) {
  await b.connect();
  // Staggered, so they take seats in order rather than racing for the same
  // one and bouncing off SEAT_TAKEN.
  await sleep(250);
}

await sleep(600);

console.log("");
// The privacy note belongs to a table we CREATED. Printing it on a --join
// stated something false about somebody else's table: RG90D was in the lobby
// the whole time, and the header said it was not.
console.log(`  table ${code}${JOIN ? "  (joined)" : LISTED ? "" : "  (private — not in the lobby)"}`);
console.log(`  play    ${SITE}/#/room/${code}`);
console.log(`  watch   ${SITE}/#/tv/${code}`);
console.log(`  server  ${BASE}`);
console.log("");
for (const b of bots) console.log(`  ${pad(b.name, 18)} ${pad(b.persona.id, 9)} ${b.persona.label}`);
console.log("");
console.log("  Ctrl-C to stand them up and leave the table empty.");

let leaving = false;
process.on("SIGINT", () => {
  if (leaving) process.exit(1);
  leaving = true;
  console.log("\n  standing up…");
  // Leaving the seats rather than dropping the sockets: an abandoned table is
  // collected either way, but this is the path a person takes, so it is the
  // one worth exercising.
  void Promise.all(bots.map((b) => b.leave())).then(() => process.exit(0));
});
