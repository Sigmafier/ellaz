// Legal-action computation — one function used both to VALIDATE an incoming
// action and to TELL a client what its options are (`you.legal`), so the two
// can never disagree.
//
// Amounts use RAISE-TO semantics everywhere: `to` is the seat's total
// committed-this-street target, never an increment. `callAmount` alone is the
// number of chips to ADD, because that is the number on the button label.

import type { HandState, SeatState, TableState } from "./types";

export interface LegalActions {
  actions: ("fold" | "check" | "call" | "bet" | "raise")[];
  /** Chips to add to call (already capped by stack). */
  callAmount?: number;
  /** Raise-to bounds (total this street). Present iff "raise" is legal. */
  minRaiseTo?: number;
  maxRaiseTo?: number;
  /** Bet-to bounds (total this street). Present iff "bet" is legal. */
  minBetTo?: number;
  maxBetTo?: number;
}

/** May this seat still raise when the action is on them? (The per-wager rule.) */
export function mayRaise(hand: HandState, seatIdx: number): boolean {
  return !hand.actedSinceFullRaise[seatIdx];
}

export function computeLegal(state: TableState, seatIdx: number): LegalActions | null {
  const hand = state.hand;
  if (!hand || hand.toAct !== seatIdx) return null;
  const seat: SeatState = state.seats[seatIdx];
  if (!seat.inHand || seat.folded || seat.allIn) return null;

  const { bb } = state.config;
  const behind = seat.stack; // chips not yet committed
  const totalAvail = seat.committed + behind; // max possible `to`
  const facing = hand.betTo - seat.committed;

  const legal: LegalActions = { actions: [] };

  if (facing <= 0) {
    legal.actions.push("check");
    if (hand.betTo === 0) {
      // Opening bet: min the BB, or all-in for less.
      if (behind > 0) {
        legal.actions.push("bet");
        legal.minBetTo = Math.min(bb, totalAvail);
        legal.maxBetTo = totalAvail;
      }
    } else if (mayRaise(hand, seatIdx) && totalAvail > hand.betTo) {
      // betTo > 0 with nothing facing = the blind's option (BB or live post).
      legal.actions.push("raise");
      legal.minRaiseTo = Math.min(hand.betTo + hand.lastFullRaiseSize, totalAvail);
      legal.maxRaiseTo = totalAvail;
    }
    legal.actions.push("fold"); // legal, if odd, when checking is free
  } else {
    legal.actions.push("fold");
    legal.actions.push("call");
    legal.callAmount = Math.min(facing, behind);
    if (mayRaise(hand, seatIdx) && totalAvail > hand.betTo) {
      legal.actions.push("raise");
      legal.minRaiseTo = Math.min(hand.betTo + hand.lastFullRaiseSize, totalAvail);
      legal.maxRaiseTo = totalAvail;
    }
  }
  return legal;
}
