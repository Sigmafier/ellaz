// The client's whole state, and the one function that changes it.
//
// Pure on purpose: no React, no WebSocket, no Date.now(). Everything here is
// (state, message) -> state, so the interesting behaviour is testable in node
// and the socket layer stays a thin pipe. Same split as the engine itself.
//
// The server sends a full `room` snapshot after every command, so this file
// does NOT fold events into a parallel copy of the board. Events narrate (the
// hand log, the animations); the snapshot is the truth. Keeping a second copy
// of the rules here is how a client ends up disagreeing with the server about
// somebody's money.

import type { Card } from "@shared/engine/cards";
import type { EngineEvent } from "@shared/engine/types";
import type { PublicTableView } from "@shared/engine/view";
import { type PlayerName, renderName } from "@shared/names";
import type { HandSummary, LedgerRow, S2C, YouView } from "@shared/protocol";

export interface LogLine {
  id: number;
  text: string;
}

export interface ClientState {
  status: "connecting" | "live" | "kicked" | "error";
  playerId: string | null;
  myName: PlayerName | null;
  isHost: boolean;
  view: PublicTableView | null;
  /** Seat -> word ids, so each seat can show its animal. */
  seatNames: Record<number, PlayerName>;
  you: YouView | null;
  timer: { seatIdx: number; deadlineEpochMs: number; timeBank: boolean } | null;
  /**
   * serverNow - clientNow, in ms.
   *
   * Every deadline the server sends is in ITS clock. A phone whose clock is
   * three minutes fast would otherwise show a timer that is already expired,
   * and one running slow would show time that does not exist. Nobody sets their
   * clock by hand any more, which is exactly why this goes untested until it
   * bites one player and nobody can reproduce it.
   */
  clockOffsetMs: number;
  /** Cards revealed at showdown, cleared when the next hand starts. */
  reveals: Record<number, readonly Card[]>;
  log: LogLine[];
  error: string | null;
  ledger: LedgerRow[] | null;
  history: HandSummary[] | null;
  /** Highest sequence number seen. -1 before the first snapshot. */
  lastSeq: number;
  /**
   * Set when the event stream skips a sequence number, which means a message
   * was lost. The socket layer reconnects — `hello` always answers with a fresh
   * snapshot, so a resync needs no separate protocol.
   *
   * Worth having even though the snapshot is authoritative: a dropped batch
   * costs the hand LOG, and a log missing the hand somebody is asking about is
   * how a friendly game turns into an argument.
   */
  needsResync: boolean;
}

const LOG_CAP = 60;

export function initialState(): ClientState {
  return {
    status: "connecting",
    playerId: null,
    myName: null,
    isHost: false,
    view: null,
    seatNames: {},
    you: null,
    timer: null,
    clockOffsetMs: 0,
    reveals: {},
    log: [],
    error: null,
    ledger: null,
    history: null,
    lastSeq: -1,
    needsResync: false,
  };
}

/** Milliseconds left on the current action, corrected for clock skew. */
export function msLeft(state: ClientState, now: number): number {
  if (!state.timer) return 0;
  return Math.max(0, state.timer.deadlineEpochMs - (now + state.clockOffsetMs));
}

/** Whose turn is it, or -1. */
export function toAct(state: ClientState): number {
  return state.view?.hand?.toAct ?? -1;
}

export function isMyTurn(state: ClientState): boolean {
  const seat = state.you?.seatIdx ?? -1;
  return seat >= 0 && toAct(state) === seat;
}

/** The name for a seat, falling back to the engine's rendered copy. */
export function seatLabel(state: ClientState, seat: number): string {
  const ids = state.seatNames[seat];
  return renderName(ids) ?? state.view?.seats[seat]?.name ?? "";
}

export function reduce(state: ClientState, msg: S2C, seq = state.log.length): ClientState {
  switch (msg.t) {
    case "welcome":
      return {
        ...state,
        status: "live",
        playerId: msg.playerId,
        myName: msg.name,
        isHost: msg.isHost,
        // The one message that carries the server's clock with no deadline
        // attached, so it is the cheapest place to learn the offset.
        clockOffsetMs: msg.serverNow - Date.now(),
        error: null,
      };

    case "name":
      return { ...state, myName: msg.name };

    case "room":
      // A snapshot is a fresh start for the sequence: it IS the state at that
      // seq, so whatever was missed before it no longer matters.
      return {
        ...state,
        view: msg.view,
        seatNames: msg.names,
        lastSeq: msg.seq,
        needsResync: false,
      };

    case "you":
      return { ...state, you: msg.you };

    case "timer":
      return {
        ...state,
        timer: {
          seatIdx: msg.seatIdx,
          deadlineEpochMs: msg.deadlineEpochMs,
          timeBank: msg.timeBank,
        },
        clockOffsetMs: msg.serverNow - Date.now(),
      };

    case "ev":
      return applyEvents(state, msg.events, msg.seq);

    case "chat":
      return pushLog(state, `${msg.name} ${msg.emote}`, seq);

    case "history":
      return { ...state, history: msg.hands };

    case "ledger":
      return { ...state, ledger: msg.rows };

    case "kicked":
      return { ...state, status: "kicked" };

    case "err":
      // Not fatal on its own: most errors are "you cannot do that right now"
      // and the table is still perfectly alive behind them.
      return { ...state, error: msg.msg };

    case "hand":
    case "relinkCode":
    case "pong":
      return state;

    default:
      // Exhaustive: adding an S2C variant without handling it fails to compile
      // here rather than being silently ignored at runtime, which is how a
      // client quietly stops reacting to something the server started sending.
      return assertNever(msg);
  }
}

function assertNever(msg: never): never {
  throw new Error(`unhandled server message: ${JSON.stringify(msg)}`);
}

function applyEvents(state: ClientState, events: EngineEvent[], seq: number): ClientState {
  // A gap means a batch was lost. Flag it and still apply what did arrive —
  // the log will have a hole either way, and dropping this batch too would
  // only widen it.
  const gapped = state.lastSeq >= 0 && seq > state.lastSeq + 1;
  let next: ClientState = {
    ...state,
    lastSeq: Math.max(state.lastSeq, seq),
    needsResync: state.needsResync || gapped,
  };

  for (const e of events) {
    switch (e.type) {
      case "HandStarted":
        // Reveals belong to the hand that produced them. Clearing here rather
        // than at HandEnded is what keeps the winning cards on screen through
        // the pause between hands, which is when people actually look at them.
        next = { ...next, reveals: {} };
        next = pushLog(next, `— hand #${e.handNo} —`, seq);
        break;

      case "ShowdownReveal":
        if (e.cards && !e.mucked) {
          next = { ...next, reveals: { ...next.reveals, [e.seat]: e.cards } };
        }
        break;

      case "ActionTaken":
        next = pushLog(next, `${nameOf(next, e.seat)} ${describeAction(e.kind, e.to, e.allIn)}`, seq);
        break;

      case "BlindPosted":
        next = pushLog(next, `${nameOf(next, e.seat)} posts ${e.amount}`, seq);
        break;

      case "StreetDealt":
        next = pushLog(next, `${e.street}`, seq);
        break;

      case "PotAwarded":
        next = pushLog(
          next,
          `${e.winners.map((w) => nameOf(next, w)).join(", ")} wins ${e.amount}`,
          seq,
        );
        break;

      case "SeatChanged":
        next = pushLog(next, `${e.name ?? nameOf(next, e.seat)} ${e.change}`, seq);
        break;

      case "TimeBankUsed":
        next = pushLog(next, `${nameOf(next, e.seat)} uses the time bank`, seq);
        break;

      case "Refund":
        next = pushLog(next, `${nameOf(next, e.seat)} is returned ${e.amount}`, seq);
        break;

      case "HoleCardsDealt":
      case "HandEnded":
      case "ConfigChanged":
        break;
    }
  }

  return next;
}

function nameOf(state: ClientState, seat: number): string {
  return seatLabel(state, seat) || `seat ${seat + 1}`;
}

function describeAction(kind: string, to: number, allIn: boolean): string {
  const suffix = allIn ? " (all in)" : "";
  if (kind === "fold") return "folds";
  if (kind === "check") return "checks";
  if (kind === "call") return `calls ${to}${suffix}`;
  if (kind === "bet") return `bets ${to}${suffix}`;
  if (kind === "raise") return `raises to ${to}${suffix}`;
  return kind;
}

function pushLog(state: ClientState, text: string, seq: number): ClientState {
  const id = state.log.length ? state.log[state.log.length - 1].id + 1 : seq * 1000;
  const log = [...state.log, { id, text }];
  return { ...state, log: log.length > LOG_CAP ? log.slice(-LOG_CAP) : log };
}
