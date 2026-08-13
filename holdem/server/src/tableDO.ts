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

import { computeLegal } from "../../shared/src/engine/betting";
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
}

interface PlayerRec {
  playerId: string;
  name: string;
}

interface TimerRec {
  kind: "none" | "action" | "interHand";
  seat: number;
  actionSeq: number;
  deadline: number;
  timeBank: boolean;
}

interface LedgerRec {
  name: string;
  buyIn: number;
  cashedOut: number;
  handsPlayed: number;
}

interface Attachment {
  playerId: string | null;
  spectate: boolean;
}

const INTER_HAND_MS = 4_000;
const HISTORY_CAP = 500;
const RELINK_TTL_MS = 10 * 60_000;

export class TableDO implements DurableObject {
  private table: TableState | null = null;
  private meta: Meta = { claimed: false, hostPlayerId: null, createdAt: 0 };
  private seq = 0;
  private curHandEvents: EngineEvent[] = [];
  private lastEmoteAt = new Map<string, number>();

  constructor(
    private ctx: DurableObjectState,
    _env: unknown,
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
      const body = (await request.json()) as Partial<TableConfig> & { code: string };
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
      this.meta = { claimed: true, hostPlayerId: null, createdAt: Date.now() };
      await this.ctx.storage.put({ meta: this.meta, table: this.table, seq: 0 });
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

  async webSocketClose(): Promise<void> {
    // Nothing to tear down: identity is in attachments, state in storage.
    // The seat stays; the action timer will check/fold a vanished player.
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
        const name = Object.values(players).find((p) => p.playerId === att.playerId)?.name ?? "?";
        await this.applyAndCommit(ws, {
          type: "sit",
          seat: msg.seatIdx,
          playerId: att.playerId,
          name,
          buyIn,
        });
        await this.bumpLedger(att.playerId, name, (row) => (row.buyIn += buyIn));
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
        const name = Object.values(players).find((p) => p.playerId === att.playerId)?.name ?? "?";
        await this.bumpLedger(att.playerId, name, (row) => (row.buyIn += msg.amount));
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
        rec = { playerId: hit.playerId, name: existing?.[1].name ?? msg.name ?? "?" };
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
        this.send(ws, { t: "room", view: publicView(this.table!), seq: this.seq });
        return;
      }
      const name = (msg.name ?? "").trim().slice(0, 24);
      if (!name) {
        this.send(ws, { t: "err", code: "NAME_REQUIRED", msg: "first visit needs a name" });
        return;
      }
      rec = { playerId: crypto.randomUUID(), name };
      players[msg.token] = rec;
      await this.ctx.storage.put("players", players);
    } else if (msg.name && msg.name.trim() && msg.name.trim() !== rec.name) {
      rec.name = msg.name.trim().slice(0, 24);
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
    this.send(ws, { t: "room", view: publicView(table), seq: this.seq });
    this.send(ws, { t: "you", you: this.youFor(rec.playerId) });
    await this.sendTimer(ws);
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

    // Broadcast redacted events + fresh private views.
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
      if (att.playerId) this.send(sock, { t: "you", you: this.youFor(att.playerId) });
    }
    await this.armNext();
    await this.broadcastTimer();
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
    name: string,
    fn: (row: LedgerRec) => void,
  ): Promise<void> {
    const ledger = (await this.ctx.storage.get<Record<string, LedgerRec>>("ledger")) ?? {};
    const row = (ledger[playerId] ??= { name, buyIn: 0, cashedOut: 0, handsPlayed: 0 });
    row.name = name;
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

  private async armNext(): Promise<void> {
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
    if (next.kind === "none") {
      await this.ctx.storage.deleteAlarm();
    } else {
      await this.ctx.storage.setAlarm(next.deadline);
    }
  }

  async alarm(): Promise<void> {
    const timer = await this.ctx.storage.get<TimerRec>("timer");
    const table = this.table;
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
