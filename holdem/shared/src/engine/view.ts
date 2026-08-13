// Per-seat redaction — the privacy boundary.
//
// Engine events are generated once; the server calls redactEvent(event, seat)
// per recipient. The deck never appears in any event. Hole cards appear only
// in HoleCardsDealt (delivered solely to their own seat) and in
// ShowdownReveal with mucked: false. A spectator (TV mode) passes seat -1 and
// receives the public stream.
//
// publicView builds the `room` snapshot for join/reconnect: everything a seat
// may know EXCEPT its own hole cards, which ride in the private `you` message
// so one snapshot serves every recipient.

import type { Card } from "./cards";
import type { EngineEvent, SeatStatus, Street, TablePhase, TableState } from "./types";

export interface PublicSeatView {
  seat: number;
  playerId: string | null;
  name: string;
  stack: number;
  status: SeatStatus;
  inHand: boolean;
  folded: boolean;
  allIn: boolean;
  committed: number;
  totalCommitted: number;
  sittingOut: boolean;
}

export interface PublicTableView {
  code: string;
  config: {
    maxSeats: number;
    sb: number;
    bb: number;
    startingStack: number;
    chipsMode: string;
    actionTimeMs: number;
    timeBankMs: number;
    minBuyIn: number;
    maxBuyIn: number;
  };
  phase: TablePhase;
  seats: PublicSeatView[];
  buttonSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  hand: {
    handNo: number;
    street: Street;
    board: Card[];
    toAct: number;
    betTo: number;
    minRaiseIncrement: number;
    actionSeq: number;
    potTotal: number;
    timeBankUsed: boolean[];
  } | null;
}

export function publicView(s: TableState): PublicTableView {
  const { code, ...config } = s.config;
  return {
    code,
    config,
    phase: s.phase,
    seats: s.seats.map((seat, i) => ({
      seat: i,
      playerId: seat.playerId,
      name: seat.name,
      stack: seat.stack,
      status: seat.status,
      inHand: seat.inHand,
      folded: seat.folded,
      allIn: seat.allIn,
      committed: seat.committed,
      totalCommitted: seat.totalCommitted,
      sittingOut: seat.status === "sittingOut",
    })),
    buttonSeat: s.buttonSeat,
    smallBlindSeat: s.smallBlindSeat,
    bigBlindSeat: s.bigBlindSeat,
    hand: s.hand
      ? {
          handNo: s.hand.handNo,
          street: s.hand.street,
          board: [...s.hand.board],
          toAct: s.hand.toAct,
          betTo: s.hand.betTo,
          minRaiseIncrement: s.hand.lastFullRaiseSize,
          actionSeq: s.hand.actionSeq,
          potTotal: s.seats.reduce((a, seat) => a + (seat.inHand ? seat.totalCommitted : 0), 0),
          timeBankUsed: [...s.hand.timeBankUsed],
        }
      : null,
  };
}

/**
 * Redact one event for one recipient. Returns null when the recipient must
 * not receive the event at all. `forSeat` -1 = spectator/public stream.
 */
export function redactEvent(event: EngineEvent, forSeat: number): EngineEvent | null {
  if (event.type === "HoleCardsDealt") {
    return event.seat === forSeat ? event : null;
  }
  return event;
}

/**
 * Redact a stored hand's event list for history reads: mucked seats' hole
 * cards are stripped so "mucked cards stay hidden forever" holds in the
 * replay too. Seats that showed down (mucked: false) have their cards in the
 * ShowdownReveal already; their HoleCardsDealt may also pass through so the
 * replay can show the winner's cards from the start of the hand.
 */
export function redactHistory(events: EngineEvent[], forSeat: number): EngineEvent[] {
  const shown = new Set<number>();
  for (const e of events) {
    if (e.type === "ShowdownReveal" && !e.mucked) shown.add(e.seat);
  }
  const out: EngineEvent[] = [];
  for (const e of events) {
    if (e.type === "HoleCardsDealt" && e.seat !== forSeat && !shown.has(e.seat)) continue;
    out.push(e);
  }
  return out;
}
