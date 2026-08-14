// The lab's table — a real hand, dealt by the real engine, into the real store.
//
// THE POINT OF THIS FILE IS THAT IT IS NOT A MOCK. It runs `apply()` from
// @shared/engine, redacts each event exactly the way the server does, and
// hands the result to `deliver()` — the same pacer the socket feeds. So the
// lab's felt is the shipping felt: the same reducer, the same components, the
// same pacing, the same juice layer firing the same sounds and the same chips
// flying to the same pot.
//
// That matters because the axes people care about most are the moving ones —
// how a card is dealt, what a fold looks like, how fast the whole thing goes.
// A hand-written script of "what I think a hand looks like" would be a second
// implementation of the table, and the first thing it would do is disagree
// with the real one about the thing being judged. This cannot: if the demo
// hand is wrong, the table is wrong.
//
// It costs the lab chunk the engine (~10 KB) and the shell nothing.

import { computeLegal, type LegalActions } from "@shared/engine/betting";
import type { Card } from "@shared/engine/cards";
import { mulberry32, seedFrom } from "@shared/engine/rng";
import { apply } from "@shared/engine/table";
import { createTable, DEFAULT_CONFIG, type EngineEvent, type TableState } from "@shared/engine/types";
import { publicView, redactEvent } from "@shared/engine/view";
import type { PlayerName } from "@shared/names";
import { deliver, resetPacer } from "../state/pacer";
import { resetState } from "../state/store";

/** The seat the lab sits in, so hole cards are visible while judging faces. */
export const DEMO_SEAT = 2;

const SEATS: { name: string; word: PlayerName }[] = [
  { name: "Bold Badger", word: { adj: "bold", noun: "badger" } },
  { name: "Calm Owl", word: { adj: "calm", noun: "owl" } },
  { name: "Swift Tiger", word: { adj: "swift", noun: "tiger" } },
  { name: "Clever Fox", word: { adj: "clever", noun: "fox" } },
  { name: "Cheerful Panda", word: { adj: "cheerful", noun: "panda" } },
];

const NAMES: Record<number, PlayerName> = Object.fromEntries(
  SEATS.map((s, i) => [i, s.word]),
);

/**
 * How each seat plays, as an ORDER OF PREFERENCE over whatever is legal.
 *
 * Preference order rather than probability, so a demo hand is reproducible
 * from its seed and a look can be compared against itself. Two of the five
 * never have "fold" ahead of a way to stay in, which is what guarantees a
 * showdown — a hand that ends preflop shows none of the axes anybody opened
 * this screen to look at.
 */
const STYLE: Record<number, string[]> = {
  0: ["raise", "bet", "call", "check", "fold"],
  1: ["call", "check", "fold"],
  2: ["check", "call", "bet", "fold"],
  3: ["fold", "check", "call"],
  4: ["check", "call", "raise", "bet", "fold"],
};

function chooseAction(seat: number, legal: LegalActions) {
  const want = STYLE[seat] ?? ["check", "call", "fold"];
  const kind = want.find((k) => legal.actions.includes(k as never)) ?? legal.actions[0];
  switch (kind) {
    case "bet":
      // The smallest legal bet. A demo hand that shoves is over in one street
      // and shows nothing; small bets keep four seats in and the pot growing.
      return { kind: "bet" as const, to: legal.minBetTo ?? 0 };
    case "raise":
      return { kind: "raise" as const, to: legal.minRaiseTo ?? 0 };
    case "call":
      return { kind: "call" as const };
    case "check":
      return { kind: "check" as const };
    default:
      return { kind: "fold" as const };
  }
}

function seatTable(): TableState {
  let s = createTable({
    code: "LAB",
    ...DEFAULT_CONFIG,
    maxSeats: SEATS.length,
    minBuyIn: 1,
    maxBuyIn: 1_000_000,
  });
  SEATS.forEach((p, i) => {
    s = apply(s, { type: "sit", seat: i, playerId: `lab${i}`, name: p.name, buyIn: 200 }).state;
  });
  return s;
}

let seq = 0;

function push(state: TableState, events: EngineEvent[]): void {
  if (events.length) {
    // Redacted for OUR seat, exactly as the server does it — so the lab sees
    // its own hole cards and nobody else's, and the showdown is the first
    // moment another hand appears. Getting this wrong would not crash
    // anything; it would quietly turn the demo into a game of open cards,
    // which is a different-looking table.
    const mine = events
      .map((e) => redactEvent(e, DEMO_SEAT))
      .filter((e): e is EngineEvent => e !== null);
    if (mine.length) deliver({ t: "ev", seq: seq++, events: mine });
  }
  deliver({ t: "room", view: publicView(state), names: NAMES, seq: seq++ });
  const hand = state.hand;
  deliver({
    t: "you",
    you: {
      playerId: `lab${DEMO_SEAT}`,
      seatIdx: DEMO_SEAT,
      hole: (hand?.holes[DEMO_SEAT] as readonly [Card, Card] | null) ?? null,
      // Always null: the lab is a thing to WATCH, and an action bar offering
      // to fold a hand nobody is playing is a button that lies. The seat still
      // shows its own cards, which is all the card axes need.
      legal: null,
      handNo: hand?.handNo ?? 0,
      actionSeq: hand?.actionSeq ?? 0,
      sittingOut: false,
      timeBankAvailable: false,
    },
  });
}

/**
 * Deal hands forever until stopped.
 *
 * Everything is wrapped: a demo that throws must stop dealing, not take the
 * lab down with it — the axes are still pickable on a still table, and a lab
 * that white-screens is worse than one that stops moving.
 */
export function runDemo(opts: { seed?: string; actionMs?: number } = {}): () => void {
  const actionMs = opts.actionMs ?? 950;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let table = seatTable();
  let hands = 0;

  const wait = (ms: number, fn: () => void) => {
    if (stopped) return;
    timer = setTimeout(() => {
      if (!stopped) fn();
    }, ms);
  };

  const step = () => {
    try {
      const hand = table.hand;
      if (!hand) return wait(1800, deal);
      const legal = computeLegal(table, hand.toAct);
      if (!legal) return wait(600, step);
      const r = apply(table, {
        type: "act",
        seat: hand.toAct,
        actionSeq: hand.actionSeq,
        action: chooseAction(hand.toAct, legal),
      });
      table = r.state;
      push(table, r.events);
      // A little longer after a street lands, so a flop is not immediately
      // buried under the next bet.
      const dealt = r.events.some((e) => e.type === "StreetDealt");
      wait(dealt ? actionMs * 1.5 : actionMs, table.hand ? step : deal);
    } catch {
      stopped = true;
    }
  };

  const deal = () => {
    try {
      // A different deck every hand, and a stated one, so a report can say
      // which hand it is describing.
      const r = apply(table, { type: "startHand" }, mulberry32(seedFrom(`${opts.seed ?? "lab"}:${hands++}`)));
      table = r.state;
      push(table, r.events);
      wait(actionMs, step);
    } catch {
      stopped = true;
    }
  };

  resetPacer();
  resetState();
  push(table, []);
  wait(500, deal);

  return () => {
    stopped = true;
    if (timer !== null) clearTimeout(timer);
    // The queue outlives this component otherwise, and every beat in it is a
    // real S2C the reducer believes — a demo beat landing on a real table
    // would deal lab cards onto a live hand.
    resetPacer();
    resetState();
  };
}
