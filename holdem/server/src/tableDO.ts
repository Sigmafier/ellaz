// One Durable Object per table: the authoritative game loop.
//
// Hibernation discipline (the plan's risk #1): DO storage is the only truth.
// Socket identity lives in serializeAttachment. The in-memory `table`/`seq`
// are caches rebuilt in the constructor via blockConcurrencyWhile. The
// reducer path is fully synchronous — no await between reading the table and
// persisting it — so the input gate can never interleave two actions.
//
// Timers: ONE alarm, always armed through armNext(); the stored `timer`
// record says what the alarm means. Deadlines are epoch ms; clients receive
// {deadlineEpochMs, serverNow} and compute the offset themselves.
//
// The reaper shares that one alarm. `armNext` arms the EARLIER of the game
// clock and the reap deadline, and `alarm()` re-derives which it was rather
// than trusting which it set — the two can only both be right if neither of
// them owns the slot exclusively.

import { computeLegal } from "../../shared/src/engine/betting";
import type { Env } from "./env";
import { LOBBY_NAME, type LobbyEntry } from "./lobby";
import { HEARTBEAT_MS, nextCheckAt, type TableSnapshot, verdict } from "./reap";
import { secureRng } from "../../shared/src/engine/rng";
import { apply } from "../../shared/src/engine/table";
import {
  type Command,
  createTable,
  DEFAULT_CONFIG,
  EngineError,
  type EngineEvent,
  type TableConfig,
  type TableState,
} from "../../shared/src/engine/types";
import { publicView, redactEvent, redactHistory } from "../../shared/src/engine/view";
import { pickName, type PlayerName, renderName, resolveName } from "../../shared/src/names";
import {
  type C2S,
  EMOTES,
  type HandSummary,
  type LedgerRow,
  parseC2S,
  PROTOCOL_VERSION,
  type S2C,
  type YouView,
} from "../../shared/src/protocol";

interface Meta {
  claimed: boolean;
  hostPlayerId: string | null;
  createdAt: number;
  /**
   * The last moment a socket was attached to this table. Written on every
   * hello and every close, and read by the reaper. Optional because tables
   * created before the lobby existed have no value for it — `?? 0` there means
   * "nobody ever arrived", and the reaper falls back to `createdAt`.
   */
  lastSeenAt?: number;
  /** The host asked not to be listed. Never affects when the table is reaped. */
  isPrivate?: boolean;
}

interface PlayerRec {
  playerId: string;
  /**
   * Two word ids, never text. The rendered string is derived on the way out,
   * which is what makes it impossible for a client to put arbitrary characters
   * on another player's screen: nothing a client sends is ever displayed.
   */
  name: PlayerName;
}

interface TimerRec {
  kind: "none" | "action" | "interHand";
  seat: number;
  actionSeq: number;
  deadline: number;
  timeBank: boolean;
}

interface LedgerRec {
  /** Rendered at write time — the ledger is a record of the session as played. */
  name: string;
  /**
   * And the ids, so a row can show the player's animal beside the figure.
   *
   * OPTIONAL, and not out of laziness: the leave path in postProcess creates a
   * row from the ENGINE's seat, which holds an opaque rendered string and knows
   * nothing about the pool. That path is only reachable for a player who left
   * without ever having bought in — the sit path always writes both — but it is
   * reachable, and a required field there would have to be filled with a lie.
   * Rows written before this field existed are the same case.
   */
  nameIds?: PlayerName;
  buyIn: number;
  cashedOut: number;
  handsPlayed: number;
}

interface Attachment {
  playerId: string | null;
  spectate: boolean;
}

/**
 * The name this server will actually use, which is not always the one asked for.
 *
 * THE POOL IS THE ALLOWLIST. An id that does not resolve never reaches storage,
 * so `PlayerRec.name` holds only words this build can render — which is what
 * lets every render site treat rendering as infallible.
 *
 * An unknown id is answered with a name rather than an error, and that is the
 * load-bearing choice. The realistic way to send one is to be a build ahead or
 * behind, and refusing the socket over a word would turn a cosmetic mismatch
 * into "you cannot join this table". A player who asked for something this
 * build has never heard of gets a real name and sees it come back; the `name`
 * message exists so they see WHICH.
 */
function acceptName(asked: PlayerName | undefined, current?: PlayerName): PlayerName {
  if (asked && resolveName(asked)) return asked;
  if (current && resolveName(current)) return current;
  return pickName();
}

function sameName(a: PlayerName | undefined, b: PlayerName | undefined): boolean {
  return !!a && !!b && a.adj === b.adj && a.noun === b.noun;
}

/**
 * The rendered string, for the places that need one: the engine's seat label,
 * the ledger, and saved hand history.
 *
 * The fallback can only fire on a record written by a build that knew a word
 * this one does not — `acceptName` makes it unreachable from the wire.
 */
function displayName(name: PlayerName | undefined): string {
  return renderName(name) ?? "Player";
}

// 6.5s, up from 4. The client PACES a run-out — an all-in deals the flop,
// turn and river as separate beats over about six seconds — and this pause is
// measured from the server's clock, which cannot see that queue. At 4s the
// next hand was already arriving while the felt was still dealing the last
// one, so the winner banner had no time to exist at all.
//
// The client holds a HandStarted as well (`AFTER_AWARD_MS` in pacer.ts). Both
// halves are needed: this one keeps every client honest about the same pause,
// and that one is the floor for the slowest story the felt can be telling.
const INTER_HAND_MS = 6_500;
const HISTORY_CAP = 500;
const RELINK_TTL_MS = 10 * 60_000;

/**
 * How long a seat is held for a player with no socket, before it is given back.
 *
 * Sitting out already happens after two timeouts, and it is not enough on its
 * own: an auto-sat-out player still OCCUPIES the seat, so a table fills with
 * people who left and stops being joinable while looking busy. Measured live
 * 2026-08-14 — one table held four seats for players whose browsers had been
 * closed for the better part of an hour, and the lobby advertised it as 4/6.
 *
 * Five minutes rather than one, because a closed socket is not the same as a
 * departure: a locked phone, a backgrounded tab and a tunnel all close sockets
 * and the client reconnects by itself on wake. Five is long enough that every
 * one of those comes back to its seat and short enough that a genuinely
 * abandoned seat is free before the next hand matters.
 *
 * A player who is CONNECTED is never stood up, however long they sit out. A
 * tab that is open is a person who might come back this minute, and taking
 * their chips off the table for being quiet is a worse failure than a seat
 * that stays busy.
 */
const STAND_UP_MS = 5 * 60_000;

export class TableDO implements DurableObject {
  private table: TableState | null = null;
  private meta: Meta = { claimed: false, hostPlayerId: null, createdAt: 0 };
  private seq = 0;
  private curHandEvents: EngineEvent[] = [];
  private lastEmoteAt = new Map<string, number>();
  /**
   * The last shape reported to the lobby. In memory only, and deliberately —
   * losing it on hibernation costs one redundant write on the next action,
   * which is cheaper than a storage round-trip on every action to avoid it.
   */
  private lastLobbySig = "";

  constructor(
    private ctx: DurableObjectState,
    private env: Env,
  ) {
    this.ctx.blockConcurrencyWhile(async () => {
      this.meta = (await this.ctx.storage.get<Meta>("meta")) ?? this.meta;
      this.table = (await this.ctx.storage.get<TableState>("table")) ?? null;
      this.seq = (await this.ctx.storage.get<number>("seq")) ?? 0;
      this.curHandEvents = (await this.ctx.storage.get<EngineEvent[]>("hist:cur")) ?? [];
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/init" && request.method === "POST") {
      if (this.meta.claimed) return new Response(JSON.stringify({ error: "claimed" }), { status: 409 });
      const body = (await request.json()) as Partial<TableConfig> & {
        code: string;
        isPrivate?: boolean;
      };
      const config: TableConfig = {
        code: body.code,
        maxSeats: clampInt(body.maxSeats, 2, 9, DEFAULT_CONFIG.maxSeats),
        sb: clampInt(body.sb, 1, 1_000_000, DEFAULT_CONFIG.sb),
        bb: clampInt(body.bb, 2, 2_000_000, DEFAULT_CONFIG.bb),
        startingStack: clampInt(body.startingStack, 10, 10_000_000, DEFAULT_CONFIG.startingStack),
        chipsMode: body.chipsMode === "league" ? "league" : "fresh",
        actionTimeMs: clampInt(body.actionTimeMs, 5_000, 120_000, DEFAULT_CONFIG.actionTimeMs),
        timeBankMs: clampInt(body.timeBankMs, 0, 120_000, DEFAULT_CONFIG.timeBankMs),
        minBuyIn: clampInt(body.minBuyIn, 1, 10_000_000, DEFAULT_CONFIG.minBuyIn),
        maxBuyIn: clampInt(body.maxBuyIn, 1, 100_000_000, DEFAULT_CONFIG.maxBuyIn),
      };
      if (config.bb < config.sb) config.bb = config.sb * 2;
      if (config.maxBuyIn < config.minBuyIn) config.maxBuyIn = config.minBuyIn;
      this.table = createTable(config);
      this.meta = {
        claimed: true,
        hostPlayerId: null,
        createdAt: Date.now(),
        lastSeenAt: 0,
        isPrivate: body.isPrivate === true,
      };
      await this.ctx.storage.put({ meta: this.meta, table: this.table, seq: 0 });
      // Report at birth, so the room a host is about to share is already in
      // the lobby when their friends look — and arm the reaper, so a room
      // created and abandoned in the same minute still gets collected.
      await this.reportToLobby();
      await this.armNext();
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    if (request.headers.get("upgrade")?.toLowerCase() === "websocket") {
      if (!this.meta.claimed || !this.table) {
        return new Response("room not found", { status: 404 });
      }
      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({ playerId: null, spectate: false } satisfies Attachment);
      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("not found", { status: 404 });
  }

  // -------------------------------------------------------------------------
  // WebSocket handlers (hibernation API)

  async webSocketMessage(ws: WebSocket, raw: ArrayBuffer | string): Promise<void> {
    const msg = parseC2S(typeof raw === "string" ? raw : "");
    if (!msg) {
      this.send(ws, { t: "err", code: "BAD_MESSAGE", msg: "unparseable message" });
      return;
    }
    try {
      await this.dispatch(ws, msg);
    } catch (e) {
      if (e instanceof EngineError) {
        this.send(ws, { t: "err", code: e.code, msg: e.message });
      } else {
        this.send(ws, { t: "err", code: "INTERNAL", msg: "internal error" });
        console.error("dispatch failed", e);
      }
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    // Nothing to tear down: identity is in attachments, state in storage.
    // The seat stays; the action timer will check/fold a vanished player.
    //
    // But this is the moment a table can become empty, and an empty table that
    // never wakes up is one nothing can ever collect — so it is also the only
    // place the reaper's clock can start. `touch` stamps the departure and
    // `armNext` picks up the reap deadline the game clock no longer covers.
    //
    // `ws` is passed through because it is STILL in getWebSockets() here —
    // see connectedCount.
    await this.touch(ws);
    await this.armNext(ws);
  }

  /**
   * A socket that broke rather than closed. The same departure.
   *
   * There was no handler here at all, and its absence is half of why the
   * lobby advertised dead rooms: the hibernation API delivers a clean close to
   * `webSocketClose` and a broken one HERE, and a tab that is killed, a phone
   * that loses signal or a laptop lid that shuts is the second kind. Those
   * departures were never stamped and never reported, so the table's last word
   * to the lobby stayed "somebody is here" — which is exactly the sentence
   * `PRESENCE_TTL_MS` now puts an expiry on, but the honest fix is to say the
   * true thing at the time rather than to let a timeout paper over it.
   */
  async webSocketError(ws: WebSocket): Promise<void> {
    await this.touch(ws);
    await this.armNext(ws);
  }

  /**
   * How many sockets are attached, not counting one that is on its way out.
   *
   * `getWebSockets()` still contains the closing socket during
   * `webSocketClose`, and drops it at the first await — so the same expression
   * returns 1 and then 0 within one handler, depending only on whether
   * anything yielded in between. Measured: `[CLOSE] sockets=1`, then after a
   * cross-object fetch, `conn=0`.
   *
   * Read naively, the last player to leave is reported to the lobby as still
   * present, and the row then says "somebody is here" about an empty room —
   * which `shouldList` believes, so the table is advertised until something
   * else happens to correct it. Excluding the departing socket explicitly
   * makes the answer independent of where the awaits happen to fall.
   */
  private connectedCount(excluding?: WebSocket): number {
    const all = this.ctx.getWebSockets();
    return excluding ? all.filter((s) => s !== excluding).length : all.length;
  }

  /**
   * Record that somebody was here, and tell the lobby.
   *
   * Called on arrival and on departure. On arrival the stamp is redundant
   * (a connected table is never idle) and on departure it is everything: it
   * is the instant the emptiness began.
   */
  private async touch(leaving?: WebSocket): Promise<void> {
    this.meta.lastSeenAt = Date.now();
    await this.ctx.storage.put("meta", this.meta);
    await this.reportToLobby(leaving);
  }

  /** This table, as the reaper sees it. */
  private snapshot(leaving?: WebSocket): TableSnapshot {
    return {
      connected: this.connectedCount(leaving),
      // Taken NOW, by the only party that can see its own sockets. Once this
      // travels to the lobby it stops being current, and `reportedAt` is what
      // lets the far end know how much to believe it.
      reportedAt: Date.now(),
      createdAt: this.meta.createdAt,
      lastSeenAt: this.meta.lastSeenAt ?? 0,
      handsPlayed: this.table?.handCounter ?? 0,
      chipsMode: this.table?.config.chipsMode === "league" ? "league" : "fresh",
    };
  }

  /**
   * Push a row to the lobby. Fire and forget, and swallow everything.
   *
   * The lobby is a convenience; the table is the product. A registry that is
   * slow, full, or simply not deployed yet must not be able to stop a hand,
   * so there is no error path out of here on purpose — the worst outcome is a
   * table that is playable by code and missing from a list.
   */
  private async reportToLobby(leaving?: WebSocket): Promise<void> {
    const table = this.table;
    if (!table) return;
    const s = this.snapshot(leaving);
    const entry: LobbyEntry = {
      code: table.config.code,
      seated: table.seats.filter((seat) => seat.playerId).length,
      maxSeats: table.config.maxSeats,
      sb: table.config.sb,
      bb: table.config.bb,
      playing: !!table.hand,
      chipsMode: s.chipsMode,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      connected: s.connected,
      reportedAt: s.reportedAt,
      handsPlayed: s.handsPlayed,
      isPrivate: this.meta.isPrivate === true,
    };
    try {
      const stub = this.env.LOBBY.get(this.env.LOBBY.idFromName(LOBBY_NAME));
      await stub.fetch("https://do/report", { method: "POST", body: JSON.stringify(entry) });
    } catch {
      /* a lobby outage is not a table outage */
    }
  }

  /**
   * The table is over. Delete everything it owns.
   *
   * The only destructive act in this server, and it is deliberately total: the
   * state, the history, the ledger, the bankrolls, the relink codes. Half a
   * table is worse than none — a room that answers a socket with no seats and
   * no chips looks like a bug to whoever walks into it.
   *
   * `claimed` going back to false is the useful side effect: the code becomes
   * allocatable again, so five characters are not spent forever on a room
   * somebody abandoned.
   */
  private async collect(): Promise<void> {
    const code = this.table?.config.code;
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
    this.table = null;
    this.meta = { claimed: false, hostPlayerId: null, createdAt: 0 };
    this.seq = 0;
    this.curHandEvents = [];
    if (code) await this.dropFromLobby(code);
  }

  /**
   * Give back the seats of players who are not here any more.
   *
   * Absence is measured per PLAYER rather than per seat: a seat index is a
   * position at a table and a playerId is a person, and it is the person who
   * left. Keyed the other way, standing up and sitting down elsewhere would
   * look like continuity and a seat swap would look like an absence.
   *
   * Run from the alarm, which for an occupied table means every heartbeat. A
   * table with NOBODY connected needs nothing from this — the reaper deletes
   * the whole thing on its own clock — so this only has to solve the case
   * that actually blocks people: real players at a table whose other seats
   * are held by ghosts.
   */
  private async standUpAbsent(): Promise<void> {
    const table = this.table;
    if (!table) return;
    const now = Date.now();

    const here = new Set<string>();
    for (const sock of this.ctx.getWebSockets()) {
      const att = safeAttachment(sock);
      if (att?.playerId) here.add(att.playerId);
    }

    const absent = (await this.ctx.storage.get<Record<string, number>>("absent")) ?? {};
    const seated = new Set<string>();
    const evict: number[] = [];

    for (let i = 0; i < table.seats.length; i++) {
      const pid = table.seats[i].playerId;
      if (!pid) continue;
      seated.add(pid);
      if (here.has(pid)) {
        delete absent[pid];
        continue;
      }
      // First time we have noticed. The clock starts now, not at whatever
      // moment the socket happened to drop — a table that was hibernating
      // has no idea when that was, and guessing earlier would stand people
      // up on the strength of a gap it never observed.
      absent[pid] ??= now;
      if (now - absent[pid] >= STAND_UP_MS) evict.push(i);
    }

    // Forget anyone who is no longer seated at all, so this cannot grow
    // without bound on a table that has been running all evening.
    for (const pid of Object.keys(absent)) if (!seated.has(pid)) delete absent[pid];
    await this.ctx.storage.put("absent", absent);

    for (const seat of evict) {
      const pid = table.seats[seat].playerId;
      // `leave` mid-hand is safe: the engine sets pendingLeave and vacates at
      // the end of the hand, so nobody is pulled out of a pot they are in.
      await this.applyAndCommit(null, { type: "leave", seat });
      if (pid) delete absent[pid];
    }
    if (evict.length) await this.ctx.storage.put("absent", absent);
  }

  private async dropFromLobby(code: string): Promise<void> {
    try {
      const stub = this.env.LOBBY.get(this.env.LOBBY.idFromName(LOBBY_NAME));
      await stub.fetch("https://do/drop", { method: "POST", body: JSON.stringify({ code }) });
    } catch {
      /* the lobby drops stale rows at read time anyway */
    }
  }

  private async dispatch(ws: WebSocket, msg: C2S): Promise<void> {
    if (msg.t === "hello") {
      await this.handleHello(ws, msg);
      return;
    }
    if (msg.t === "ping") {
      this.send(ws, { t: "pong", now: Date.now(), echoed: msg.now });
      return;
    }
    const att = ws.deserializeAttachment() as Attachment;
    if (!att.playerId) {
      this.send(ws, { t: "err", code: "NO_HELLO", msg: "say hello first" });
      return;
    }
    const table = this.table!;
    const seatIdx = table.seats.findIndex((s) => s.playerId === att.playerId);

    switch (msg.t) {
      case "takeSeat": {
        let buyIn = msg.buyIn;
        if (table.config.chipsMode === "league") {
          const bankrolls =
            (await this.ctx.storage.get<Record<string, number>>("bankrolls")) ?? {};
          buyIn = bankrolls[att.playerId] ?? table.config.startingStack;
          delete bankrolls[att.playerId];
          await this.ctx.storage.put("bankrolls", bankrolls);
          if (buyIn <= 0) {
            this.send(ws, { t: "err", code: "BROKE", msg: "no bankroll left — ask the host for a top-up" });
            return;
          }
        }
        const players = (await this.ctx.storage.get<Record<string, PlayerRec>>("players")) ?? {};
        const ids = Object.values(players).find((p) => p.playerId === att.playerId)?.name;
        // The engine's seat label is an opaque string and stays that way — it
        // must not learn about the word pool, which is why `room` carries the
        // ids alongside the view rather than inside it.
        await this.applyAndCommit(ws, {
          type: "sit",
          seat: msg.seatIdx,
          playerId: att.playerId,
          name: displayName(ids),
          buyIn,
        });
        await this.bumpLedger(att.playerId, ids, (row) => (row.buyIn += buyIn));
        return;
      }
      case "leaveSeat": {
        if (seatIdx < 0) return;
        await this.applyAndCommit(ws, { type: "leave", seat: seatIdx });
        return;
      }
      case "sitOut":
        if (seatIdx >= 0) await this.applyAndCommit(ws, { type: "sitOut", seat: seatIdx });
        return;
      case "sitIn":
        if (seatIdx >= 0) await this.applyAndCommit(ws, { type: "sitIn", seat: seatIdx });
        return;
      case "rebuy": {
        if (seatIdx < 0) return;
        await this.applyAndCommit(ws, { type: "rebuy", seat: seatIdx, amount: msg.amount });
        const players = (await this.ctx.storage.get<Record<string, PlayerRec>>("players")) ?? {};
        const ids = Object.values(players).find((p) => p.playerId === att.playerId)?.name;
        await this.bumpLedger(att.playerId, ids, (row) => (row.buyIn += msg.amount));
        return;
      }
      case "setName": {
        const players = (await this.ctx.storage.get<Record<string, PlayerRec>>("players")) ?? {};
        const entry = Object.entries(players).find(([, p]) => p.playerId === att.playerId);
        if (!entry) return;
        const [token, rec] = entry;
        rec.name = acceptName(msg.name, rec.name);
        players[token] = rec;
        await this.ctx.storage.put("players", players);
        // Answer with what was SETTLED ON, not what was asked for — an id this
        // build does not know comes back as a different, real name, and the
        // client must render the reply rather than its own request.
        this.send(ws, { t: "name", name: rec.name });
        // A seated player's name is on everyone's felt, so the whole room needs
        // the new one. The engine's own seat label is set at sit time and is
        // not worth re-deriving mid-hand; `names` is what clients render.
        this.broadcast(this.roomMsg(players));
        return;
      }
      case "act": {
        if (seatIdx < 0) throw new EngineError("BAD_SEAT", "not seated");
        if (!table.hand || table.hand.handNo !== msg.handNo)
          throw new EngineError("STALE_SEQ", "that hand is over");
        const action =
          msg.action === "bet" || msg.action === "raise"
            ? { kind: msg.action, to: msg.amount ?? 0 }
            : { kind: msg.action };
        await this.applyAndCommit(ws, {
          type: "act",
          seat: seatIdx,
          actionSeq: msg.actionSeq,
          action: action as Extract<Command, { type: "act" }>["action"],
        });
        return;
      }
      case "useTimeBank": {
        if (seatIdx < 0) throw new EngineError("BAD_SEAT", "not seated");
        await this.applyAndCommit(ws, { type: "useTimeBank", seat: seatIdx });
        return;
      }
      case "chat": {
        if (seatIdx < 0 || !EMOTES.includes(msg.emote)) return;
        const last = this.lastEmoteAt.get(att.playerId) ?? 0;
        if (Date.now() - last < 1_000) return;
        this.lastEmoteAt.set(att.playerId, Date.now());
        this.broadcast({
          t: "chat",
          seatIdx,
          name: table.seats[seatIdx].name,
          emote: msg.emote,
          at: msg.at,
        });
        return;
      }
      case "getHistory": {
        const summaries = (await this.ctx.storage.get<HandSummary[]>("hist:summaries")) ?? [];
        const before = msg.beforeHandNo ?? Infinity;
        const limit = Math.min(msg.limit ?? 20, 50);
        const page = summaries.filter((h) => h.handNo < before).slice(-limit).reverse();
        this.send(ws, {
          t: "history",
          hands: page,
          hasMore: summaries.some((h) => h.handNo < (page[page.length - 1]?.handNo ?? -1)),
        });
        return;
      }
      case "getHand": {
        const events = await this.ctx.storage.get<EngineEvent[]>(`hist:${msg.handNo}`);
        if (!events) {
          this.send(ws, { t: "err", code: "NOT_FOUND", msg: "no such hand" });
          return;
        }
        this.send(ws, { t: "hand", handNo: msg.handNo, events: redactHistory(events, seatIdx) });
        return;
      }
      case "getLedger": {
        this.send(ws, { t: "ledger", rows: await this.ledgerRows() });
        return;
      }
      case "startNow": {
        this.requireHost(att.playerId);
        if (!table.hand) await this.applyAndCommit(ws, { type: "startHand" });
        return;
      }
      case "hostSettings": {
        this.requireHost(att.playerId);
        await this.applyAndCommit(ws, { type: "setConfig", patch: msg.patch ?? {} });
        return;
      }
      case "hostKick": {
        this.requireHost(att.playerId);
        const kickSeat = table.seats.findIndex((s) => s.playerId === msg.playerId);
        if (kickSeat >= 0) await this.applyAndCommit(ws, { type: "leave", seat: kickSeat });
        for (const sock of this.ctx.getWebSockets()) {
          const a = sock.deserializeAttachment() as Attachment;
          if (a.playerId === msg.playerId) {
            this.send(sock, { t: "kicked" });
            sock.close(1000, "kicked");
          }
        }
        return;
      }
      case "hostRelink": {
        this.requireHost(att.playerId);
        const code = makeRelinkCode();
        const relinks = (await this.ctx.storage.get<Record<string, { playerId: string; expires: number }>>("relinks")) ?? {};
        for (const [k, v] of Object.entries(relinks)) if (v.expires < Date.now()) delete relinks[k];
        relinks[code] = { playerId: msg.playerId, expires: Date.now() + RELINK_TTL_MS };
        await this.ctx.storage.put("relinks", relinks);
        this.send(ws, { t: "relinkCode", playerId: msg.playerId, code, expiresAt: relinks[code].expires });
        return;
      }
    }
  }

  private async handleHello(
    ws: WebSocket,
    msg: Extract<C2S, { t: "hello" }>,
  ): Promise<void> {
    if (msg.v !== PROTOCOL_VERSION) {
      this.send(ws, { t: "err", code: "VERSION", msg: "refresh the app" });
      return;
    }
    const players = (await this.ctx.storage.get<Record<string, PlayerRec>>("players")) ?? {};
    let rec = players[msg.token];

    if (!rec && msg.relink) {
      const relinks =
        (await this.ctx.storage.get<Record<string, { playerId: string; expires: number }>>("relinks")) ?? {};
      const hit = relinks[msg.relink.toUpperCase()];
      if (hit && hit.expires > Date.now()) {
        const existing = Object.entries(players).find(([, p]) => p.playerId === hit.playerId);
        // The relinked player keeps the name the table already knows them by;
        // only if that record is gone does the new device's request count.
        rec = { playerId: hit.playerId, name: acceptName(existing?.[1].name ?? msg.name) };
        // The new device replaces the old one.
        for (const [token, p] of Object.entries(players)) {
          if (p.playerId === hit.playerId) delete players[token];
        }
        players[msg.token] = rec;
        delete relinks[msg.relink.toUpperCase()];
        await this.ctx.storage.put({ players, relinks });
      }
    }

    if (!rec) {
      if (msg.spectate) {
        ws.serializeAttachment({ playerId: null, spectate: true } satisfies Attachment);
        this.send(ws, this.roomMsg(players));
        return;
      }
      // No NAME_REQUIRED any more. A name is drawn rather than typed, so
      // "arrived without one" is not a client error to report — it is a name
      // this side has not assigned yet.
      rec = { playerId: crypto.randomUUID(), name: acceptName(msg.name) };
      players[msg.token] = rec;
      await this.ctx.storage.put("players", players);
    } else if (msg.name && !sameName(msg.name, rec.name)) {
      rec.name = acceptName(msg.name, rec.name);
      players[msg.token] = rec;
      await this.ctx.storage.put("players", players);
    }

    if (!this.meta.hostPlayerId) {
      this.meta.hostPlayerId = rec.playerId;
      await this.ctx.storage.put("meta", this.meta);
    }

    ws.serializeAttachment({ playerId: rec.playerId, spectate: false } satisfies Attachment);
    const table = this.table!;
    const seatIdx = table.seats.findIndex((s) => s.playerId === rec.playerId);
    this.send(ws, {
      t: "welcome",
      v: PROTOCOL_VERSION,
      playerId: rec.playerId,
      name: rec.name,
      seatIdx,
      isHost: this.meta.hostPlayerId === rec.playerId,
      serverNow: Date.now(),
      chipsMode: table.config.chipsMode,
    });
    this.send(ws, this.roomMsg(players));
    this.send(ws, { t: "you", you: this.youFor(rec.playerId) });
    await this.sendTimer(ws);
    // Somebody is here: stop the reaper's clock and refresh the lobby row.
    await this.touch();
    await this.armNext();
  }

  // -------------------------------------------------------------------------
  // Engine plumbing

  private async applyAndCommit(origin: WebSocket | null, cmd: Command): Promise<void> {
    const table = this.table;
    if (!table) throw new EngineError("BAD_STATE", "room not initialized");
    const preState = table;
    let result;
    try {
      result = apply(table, cmd, secureRng());
    } catch (e) {
      if (e instanceof EngineError && origin) {
        this.send(origin, { t: "err", code: e.code, msg: e.message });
        return;
      }
      throw e;
    }
    this.table = result.state;
    this.seq += 1;

    // History: every event of the current hand, including private deals.
    let archived = false;
    for (const e of result.events) {
      if (e.type === "HandStarted") this.curHandEvents = [];
      this.curHandEvents.push(e);
      if (e.type === "HandEnded") archived = true;
    }

    await this.ctx.storage.put({
      table: this.table,
      seq: this.seq,
      "hist:cur": this.curHandEvents,
    });
    if (archived) await this.archiveHand();
    await this.postProcess(result.events, preState);

    // Broadcast redacted events, a fresh public snapshot (the client's view
    // is always THIS, never a client-side event fold — events exist for
    // animation and history), and fresh private views.
    const view = publicView(this.table);
    const names = this.seatNames(
      (await this.ctx.storage.get<Record<string, PlayerRec>>("players")) ?? {},
    );
    const sockets = this.ctx.getWebSockets();
    for (const sock of sockets) {
      const att = safeAttachment(sock);
      if (!att) continue;
      const forSeat = att.playerId
        ? this.table.seats.findIndex((s) => s.playerId === att.playerId)
        : -1;
      const events = result.events
        .map((e) => redactEvent(e, forSeat))
        .filter((e): e is EngineEvent => e !== null);
      this.send(sock, { t: "ev", seq: this.seq, events });
      this.send(sock, { t: "room", view, names, seq: this.seq });
      if (att.playerId) this.send(sock, { t: "you", you: this.youFor(att.playerId) });
    }
    await this.armNext();
    await this.broadcastTimer();
    await this.reportIfChanged();
  }

  /**
   * Tell the lobby, but only when the lobby's own view of us moved.
   *
   * Every call, check and fold runs through applyAndCommit, so reporting from
   * there unconditionally would put a cross-object write on the critical path
   * of every action in every hand. The lobby renders four things; this is a
   * signature of exactly those four, and nothing else can trigger a write.
   */
  private async reportIfChanged(): Promise<void> {
    const t = this.table;
    if (!t) return;
    const seated = t.seats.filter((s) => s.playerId).length;
    const sig = `${seated}/${t.hand ? 1 : 0}/${t.handCounter}`;
    if (sig === this.lastLobbySig) return;
    this.lastLobbySig = sig;
    await this.reportToLobby();
  }

  /**
   * Ledger/bankroll side effects, attributed against the PRE-command state:
   * a leave event carries the cash-out stack but its seat is already cleared
   * in the new state, so only preState still knows which player walked away.
   */
  private async postProcess(events: EngineEvent[], preState: TableState): Promise<void> {
    const ledger = (await this.ctx.storage.get<Record<string, LedgerRec>>("ledger")) ?? {};
    let ledgerDirty = false;
    let bankrolls: Record<string, number> | null = null;

    for (const e of events) {
      if (e.type === "SeatChanged" && e.change === "leave") {
        const pid = preState.seats[e.seat]?.playerId;
        if (!pid) continue;
        const cashOut = e.stack ?? 0;
        const row = (ledger[pid] ??= {
          name: preState.seats[e.seat].name,
          buyIn: 0,
          cashedOut: 0,
          handsPlayed: 0,
        });
        row.cashedOut += cashOut;
        ledgerDirty = true;
        if (this.table!.config.chipsMode === "league") {
          bankrolls ??= (await this.ctx.storage.get<Record<string, number>>("bankrolls")) ?? {};
          bankrolls[pid] = (bankrolls[pid] ?? 0) + cashOut;
        }
      } else if (e.type === "HandEnded") {
        for (const seatStr of Object.keys(e.stacks)) {
          const pid = preState.seats[Number(seatStr)]?.playerId;
          if (pid && ledger[pid]) {
            ledger[pid].handsPlayed += 1;
            ledgerDirty = true;
          }
        }
      }
    }
    if (ledgerDirty) await this.ctx.storage.put("ledger", ledger);
    if (bankrolls) await this.ctx.storage.put("bankrolls", bankrolls);
  }

  private async archiveHand(): Promise<void> {
    const events = this.curHandEvents;
    const handNo = (events.find((e) => e.type === "HandStarted") as { handNo?: number } | undefined)
      ?.handNo;
    if (handNo === undefined) return;

    const summaries = (await this.ctx.storage.get<HandSummary[]>("hist:summaries")) ?? [];
    summaries.push(summarize(events, handNo, this.table!));
    while (summaries.length > HISTORY_CAP) {
      const dropped = summaries.shift()!;
      await this.ctx.storage.delete(`hist:${dropped.handNo}`);
    }
    await this.ctx.storage.put({
      [`hist:${handNo}`]: events,
      "hist:summaries": summaries,
      "hist:cur": [],
    });
    this.curHandEvents = [];

    // League: persist bankrolls for players who left DURING the hand is
    // handled at leave-time; here we snapshot nothing — stacks live on seats.
  }

  private async bumpLedger(
    playerId: string,
    ids: PlayerName | undefined,
    fn: (row: LedgerRec) => void,
  ): Promise<void> {
    const ledger = (await this.ctx.storage.get<Record<string, LedgerRec>>("ledger")) ?? {};
    const name = displayName(ids);
    const nameIds = ids ?? { adj: "", noun: "" };
    const row = (ledger[playerId] ??= { name, nameIds, buyIn: 0, cashedOut: 0, handsPlayed: 0 });
    row.name = name;
    row.nameIds = nameIds;
    fn(row);
    await this.ctx.storage.put("ledger", ledger);
  }

  private async ledgerRows(): Promise<LedgerRow[]> {
    const ledger = (await this.ctx.storage.get<Record<string, LedgerRec>>("ledger")) ?? {};
    const bankrolls = (await this.ctx.storage.get<Record<string, number>>("bankrolls")) ?? {};
    const table = this.table!;
    return Object.entries(ledger)
      .map(([playerId, row]) => {
        const seat = table.seats.find((s) => s.playerId === playerId);
        const live = seat ? seat.stack + seat.totalCommitted + seat.pendingRebuy : 0;
        const banked = bankrolls[playerId] ?? 0;
        return {
          playerId,
          name: row.name,
          nameIds: row.nameIds ?? { adj: "", noun: "" },
          net: row.cashedOut + live + banked - row.buyIn,
          buyIn: row.buyIn,
          handsPlayed: row.handsPlayed,
          seated: !!seat,
        };
      })
      .sort((a, b) => b.net - a.net);
  }

  // -------------------------------------------------------------------------
  // Timers

  private async armNext(leaving?: WebSocket): Promise<void> {
    const table = this.table!;
    let next: TimerRec = { kind: "none", seat: -1, actionSeq: -1, deadline: 0, timeBank: false };

    if (table.phase === "hand" && table.hand && table.hand.toAct >= 0) {
      const prev = await this.ctx.storage.get<TimerRec>("timer");
      const hand = table.hand;
      if (
        prev &&
        prev.kind === "action" &&
        prev.seat === hand.toAct &&
        prev.actionSeq === hand.actionSeq
      ) {
        next = prev; // same decision still pending — do not reset the clock
        if (!prev.timeBank && hand.timeBankUsed[hand.toAct]) {
          next = { ...prev, timeBank: true, deadline: prev.deadline + table.config.timeBankMs };
        }
      } else {
        next = {
          kind: "action",
          seat: hand.toAct,
          actionSeq: hand.actionSeq,
          deadline: Date.now() + table.config.actionTimeMs,
          timeBank: false,
        };
      }
    } else if (table.phase === "interHand" || table.phase === "waiting") {
      const eligible = table.seats.filter((s) => s.status === "active" && s.stack > 0).length;
      if (eligible >= 2) {
        next = {
          kind: "interHand",
          seat: -1,
          actionSeq: -1,
          deadline: Date.now() + INTER_HAND_MS,
          timeBank: false,
        };
      }
    }

    await this.ctx.storage.put("timer", next);

    // The reaper shares this alarm. It only ever has a deadline when nobody is
    // connected, and the game clock only ever has one when somebody is — so in
    // practice they never compete. `Math.min` rather than an assumption
    // because "in practice" is not a guarantee, and the failure of getting it
    // wrong is a game clock that never fires.
    const reapAt = nextCheckAt(this.snapshot(leaving), Date.now());
    const deadlines = [
      next.kind === "none" ? null : next.deadline,
      reapAt,
    ].filter((d): d is number => d !== null);

    if (!deadlines.length) {
      await this.ctx.storage.deleteAlarm();
    } else {
      await this.ctx.storage.setAlarm(Math.min(...deadlines));
    }
  }

  async alarm(): Promise<void> {
    const table = this.table;

    // The reaper goes first, and re-derives its own verdict rather than
    // trusting which deadline armed the alarm. Two clocks share one slot; the
    // only safe way to read it is to ask both what they think NOW.
    if (table) {
      const now = Date.now();
      const v = verdict(this.snapshot(), now);
      if (v === "delete") {
        await this.collect();
        return;
      }
      if (v === "unlist") {
        // Still alive, just quiet. Refresh the lobby row so its read-time
        // staleness check has current numbers, then re-arm for the delete
        // boundary. Nothing else on this table needs to happen.
        await this.reportToLobby();
        await this.armNext();
        return;
      }
      // Occupied: say so, at most once every HEARTBEAT_MS.
      //
      // This is the renewal that makes an expiry on presence safe. It is
      // rate-limited against `lastSeenAt` rather than fired on every alarm
      // because alarms are also the action clock — a table in a fast hand
      // wakes every few seconds, and a lobby write per fold would turn a
      // convenience into the busiest thing in the room.
      if (now - (this.meta.lastSeenAt ?? 0) >= HEARTBEAT_MS) {
        await this.touch();
        // Same beat, same reason: this is the only regular wake-up an
        // occupied table has, so it is where a seat held by somebody who
        // left gets handed back.
        await this.standUpAbsent();
      }
    }

    const timer = await this.ctx.storage.get<TimerRec>("timer");
    if (!timer || !table) return;
    if (timer.kind === "action") {
      const hand = table.hand;
      if (
        hand &&
        hand.toAct === timer.seat &&
        hand.actionSeq === timer.actionSeq &&
        Date.now() >= timer.deadline
      ) {
        await this.applyAndCommit(null, { type: "timeout", seat: timer.seat });
      } else {
        await this.armNext();
        await this.broadcastTimer();
      }
      return;
    }
    if (timer.kind === "interHand") {
      // The deadline check is load-bearing, not defensive.
      //
      // This branch used to start the hand on ANY alarm, which was correct
      // only while the inter-hand deadline was the sole thing that could wake
      // a table with players at it. The reaper's heartbeat is now a second
      // one — so without this, every heartbeat that landed during the pause
      // would deal the next hand early, cutting the four seconds people have
      // to look at who won down to whatever was left.
      if (Date.now() < timer.deadline) {
        await this.armNext();
        return;
      }
      if (!table.hand) {
        await this.applyAndCommit(null, { type: "startHand" });
      }
    }
  }

  private async broadcastTimer(): Promise<void> {
    for (const sock of this.ctx.getWebSockets()) {
      await this.sendTimer(sock);
    }
  }

  private async sendTimer(ws: WebSocket): Promise<void> {
    const timer = await this.ctx.storage.get<TimerRec>("timer");
    if (!timer || timer.kind !== "action") return;
    this.send(ws, {
      t: "timer",
      seatIdx: timer.seat,
      deadlineEpochMs: timer.deadline,
      serverNow: Date.now(),
      timeBank: timer.timeBank,
    });
  }

  // -------------------------------------------------------------------------
  // Views

  private youFor(playerId: string): YouView {
    const table = this.table!;
    const seatIdx = table.seats.findIndex((s) => s.playerId === playerId);
    const hand = table.hand;
    return {
      playerId,
      seatIdx,
      hole: seatIdx >= 0 && hand ? (hand.holes[seatIdx] ?? null) : null,
      legal: seatIdx >= 0 ? computeLegal(table, seatIdx) : null,
      handNo: hand?.handNo ?? -1,
      actionSeq: hand?.actionSeq ?? -1,
      sittingOut: seatIdx >= 0 && table.seats[seatIdx].status === "sittingOut",
      timeBankAvailable: seatIdx >= 0 && hand ? !hand.timeBankUsed[seatIdx] : false,
    };
  }

  private requireHost(playerId: string): void {
    if (this.meta.hostPlayerId !== playerId)
      throw new EngineError("BAD_STATE", "host only");
  }

  /**
   * Seat index → the two word ids, for the seats that are occupied.
   *
   * Keyed by seat rather than by playerId because that is what a client
   * renders, and it carries no playerId for seats it looks up — a spectator
   * receives this too.
   */
  private seatNames(players: Record<string, PlayerRec>): Record<number, PlayerName> {
    const byId = new Map<string, PlayerName>();
    for (const p of Object.values(players)) byId.set(p.playerId, p.name);
    const out: Record<number, PlayerName> = {};
    this.table?.seats.forEach((seat, idx) => {
      const n = seat.playerId ? byId.get(seat.playerId) : undefined;
      if (n) out[idx] = n;
    });
    return out;
  }

  /** The public snapshot plus the names that go with it — always sent together. */
  private roomMsg(players: Record<string, PlayerRec>): S2C {
    return {
      t: "room",
      view: publicView(this.table!),
      names: this.seatNames(players),
      seq: this.seq,
    };
  }

  private send(ws: WebSocket, msg: S2C): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // A dying socket is the client's problem; reconnect resyncs.
    }
  }

  private broadcast(msg: S2C): void {
    for (const sock of this.ctx.getWebSockets()) this.send(sock, msg);
  }
}

function safeAttachment(ws: WebSocket): Attachment | null {
  try {
    return (ws.deserializeAttachment() as Attachment) ?? null;
  } catch {
    return null;
  }
}

function clampInt(v: unknown, min: number, max: number, dflt: number): number {
  if (typeof v !== "number" || !Number.isInteger(v)) return dflt;
  return Math.max(min, Math.min(max, v));
}

function makeRelinkCode(): string {
  const buf = new Uint8Array(6);
  crypto.getRandomValues(buf);
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let out = "";
  for (const b of buf) out += alphabet[b % alphabet.length];
  return out;
}

/** Build the compact history card for one archived hand. */
function summarize(events: EngineEvent[], handNo: number, table: TableState): HandSummary {
  const startStacks: Record<number, number> = {};
  const endStacks: Record<number, number> = {};
  const names: Record<number, string> = {};
  const board: number[] = [];
  const winners = new Set<number>();
  let potTotal = 0;

  for (const e of events) {
    if (e.type === "HandStarted") {
      Object.assign(startStacks, e.stacks);
      for (const seatStr of Object.keys(e.stacks)) {
        const idx = Number(seatStr);
        names[idx] = table.seats[idx]?.name || `#${idx}`;
      }
    } else if (e.type === "StreetDealt") {
      board.push(...e.cards);
    } else if (e.type === "PotAwarded") {
      potTotal += e.amount;
      for (const w of e.winners) winners.add(w);
    } else if (e.type === "HandEnded") {
      Object.assign(endStacks, e.stacks);
    }
  }
  // NOTE: net is end-start of the hand's stacks, so a rebuy landing at the
  // end of this hand shows up as winnings on the card. The ledger is the
  // accurate money record; this is the quick argument-settling view.
  const net: Record<number, number> = {};
  for (const seatStr of Object.keys(startStacks)) {
    const idx = Number(seatStr);
    if (endStacks[idx] !== undefined) net[idx] = endStacks[idx] - startStacks[idx];
  }
  return { handNo, endedAt: Date.now(), net, potTotal, board, winners: [...winners], names };
}
