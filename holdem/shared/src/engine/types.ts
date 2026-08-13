// Engine state, commands and events. Pure data — no DOM, no Workers, no I/O.
//
// The engine is a reducer: apply(state, command, rng?) -> { state, events }.
// Events are the facts the server broadcasts (redacted per seat) and persists —
// the stored event list IS the hand history and the replay format.

import type { Card } from "./cards";

export type Street = "preflop" | "flop" | "turn" | "river";
export type TablePhase = "waiting" | "hand" | "interHand";
export type ChipsMode = "fresh" | "league";

export interface TableConfig {
  code: string;
  maxSeats: number; // 2..9
  sb: number;
  bb: number;
  startingStack: number;
  chipsMode: ChipsMode;
  actionTimeMs: number; // per decision, default 25_000
  timeBankMs: number; // one per player per hand, default 30_000
  minBuyIn: number;
  maxBuyIn: number;
}

export type SeatStatus = "empty" | "active" | "sittingOut";

export interface SeatState {
  playerId: string | null;
  name: string;
  stack: number;
  status: SeatStatus;
  /** Dealt into the current hand. */
  inHand: boolean;
  folded: boolean;
  allIn: boolean;
  /** Chips put in on the current street. */
  committed: number;
  /** Chips put in over the whole hand — drives side-pot layering. */
  totalCommitted: number;
  /** Consecutive timeouts; 2 => sat out after the hand. */
  timeouts: number;
  /** Joined (or returned) mid-game and has not yet posted/reached the BB. */
  owesBB: boolean;
  /** Rebuy amount waiting for the hand to end. */
  pendingRebuy: number;
  /**
   * Asked to leave while dealt into a hand. The seat is folded but stays
   * occupied until the hand ends so its committed chips remain in the pot —
   * clearing it immediately would leak them out of the layering.
   */
  pendingLeave: boolean;
}

export interface HandState {
  handNo: number;
  /** Remaining deck after all deals so far. SERVER-SECRET — never in any view. */
  deck: Card[];
  board: Card[];
  /** Per seat index; null when not dealt in. SERVER-SECRET except own seat. */
  holes: (readonly [Card, Card] | null)[];
  street: Street;
  /** Seat to act, or -1 while no betting is open (runouts, settlement). */
  toAct: number;
  /** Committed-this-street total a live seat must match. */
  betTo: number;
  /** The size of the last full bet/raise this street — the min-raise increment. */
  lastFullRaiseSize: number;
  /**
   * Per seat: has acted since the last FULL raise this street. A seat may
   * raise iff this is false (blind posts and live posts leave it false — that
   * is the BB option). A full raise clears it for every other live seat; an
   * incomplete all-in raise does not (the per-wager rule).
   */
  actedSinceFullRaise: boolean[];
  /** Seat of the last aggressor on the CURRENT street, -1 if none. */
  lastAggressor: number;
  /** Seat of the last aggressor on the river, -1 if river checked through. */
  riverAggressor: number;
  /** Per seat: time bank already spent this hand. */
  timeBankUsed: boolean[];
  /** Guards stale client actions: increments on every accepted action. */
  actionSeq: number;
  /** True once betting can no longer occur (<=1 live non-all-in): run out the board. */
  runout: boolean;
}

export interface TableState {
  config: TableConfig;
  seats: SeatState[];
  /** Where the BUTTON POSITION rests — may be an empty seat (dead button). */
  buttonSeat: number;
  /** Where the SB POSITION rests; sbPosted says whether anyone posted it. */
  smallBlindSeat: number;
  /** The seat that posted BB last hand — the anchor the dead-button rule advances. */
  bigBlindSeat: number;
  phase: TablePhase;
  hand: HandState | null;
  handCounter: number;
}

// ---------------------------------------------------------------------------
// Commands

export type PlayerActionKind = "fold" | "check" | "call" | "bet" | "raise";

export type Command =
  | { type: "sit"; seat: number; playerId: string; name: string; buyIn: number }
  | { type: "leave"; seat: number }
  | { type: "sitOut"; seat: number }
  | { type: "sitIn"; seat: number }
  | { type: "rebuy"; seat: number; amount: number }
  | { type: "startHand" }
  | {
      type: "act";
      seat: number;
      actionSeq: number;
      action:
        | { kind: "fold" }
        | { kind: "check" }
        | { kind: "call" }
        /** `to` is the TOTAL committed-this-street target (raise-to semantics). */
        | { kind: "bet"; to: number }
        | { kind: "raise"; to: number };
    }
  | { type: "timeout"; seat: number }
  | { type: "useTimeBank"; seat: number }
  | { type: "setConfig"; patch: Partial<Pick<TableConfig, "sb" | "bb" | "actionTimeMs" | "minBuyIn" | "maxBuyIn">> };

// ---------------------------------------------------------------------------
// Events

export type BlindKind = "sb" | "bb" | "post";

export type EngineEvent =
  | {
      type: "HandStarted";
      handNo: number;
      buttonSeat: number;
      smallBlindSeat: number; // position; -1 never happens (position always rests somewhere)
      sbPosted: boolean;
      bigBlindSeat: number;
      dealtSeats: number[];
      stacks: Record<number, number>;
    }
  | { type: "BlindPosted"; seat: number; kind: BlindKind; amount: number; allIn: boolean }
  /** PRIVATE: the server must only deliver this to `seat` (and to history). */
  | { type: "HoleCardsDealt"; seat: number; cards: readonly [Card, Card] }
  | {
      type: "ActionTaken";
      seat: number;
      kind: PlayerActionKind;
      /** Total committed this street after the action. */
      to: number;
      allIn: boolean;
      actionSeq: number;
    }
  | { type: "StreetDealt"; street: Exclude<Street, "preflop">; cards: Card[] }
  | { type: "TimeBankUsed"; seat: number }
  | { type: "Refund"; seat: number; amount: number }
  | { type: "ShowdownReveal"; seat: number; cards?: readonly [Card, Card]; mucked: boolean; score?: number }
  | { type: "PotAwarded"; potIndex: number; amount: number; winners: number[]; shares: Record<number, number> }
  | { type: "HandEnded"; handNo: number; stacks: Record<number, number> }
  | { type: "SeatChanged"; seat: number; change: "sit" | "leave" | "sitOut" | "sitIn" | "rebuy" | "autoSitOut"; name?: string; stack?: number }
  | { type: "ConfigChanged"; patch: Record<string, number> };

export interface ApplyResult {
  state: TableState;
  events: EngineEvent[];
}

/** A rejected command — the reducer throws this; the server maps it to an err message. */
export class EngineError extends Error {
  constructor(
    public code:
      | "NOT_YOUR_TURN"
      | "STALE_SEQ"
      | "BAD_AMOUNT"
      | "BAD_SEAT"
      | "BAD_STATE"
      | "SEAT_TAKEN"
      | "NO_TIME_BANK"
      | "CANNOT_RAISE",
    msg: string,
  ) {
    super(msg);
  }
}

export const DEFAULT_CONFIG: Omit<TableConfig, "code"> = {
  maxSeats: 9,
  sb: 1,
  bb: 2,
  startingStack: 200,
  chipsMode: "fresh",
  actionTimeMs: 25_000,
  timeBankMs: 30_000,
  minBuyIn: 40,
  maxBuyIn: 400,
};

export function emptySeat(): SeatState {
  return {
    playerId: null,
    name: "",
    stack: 0,
    status: "empty",
    inHand: false,
    folded: false,
    allIn: false,
    committed: 0,
    totalCommitted: 0,
    timeouts: 0,
    owesBB: false,
    pendingRebuy: 0,
    pendingLeave: false,
  };
}

export function createTable(config: TableConfig): TableState {
  return {
    config,
    seats: Array.from({ length: config.maxSeats }, emptySeat),
    buttonSeat: -1,
    smallBlindSeat: -1,
    bigBlindSeat: -1,
    phase: "waiting",
    hand: null,
    handCounter: 0,
  };
}
