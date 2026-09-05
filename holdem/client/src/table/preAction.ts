// The pre-action: what an armed "check / fold" does when the turn arrives.
//
// A pre-action is a decision made BEFORE the action reaches you — the box
// every poker client puts beside the felt for the hand you have already given
// up on. Ours does the one thing worth doing without looking: check when the
// street is free, fold when it costs anything.
//
// It is a CLIENT pre-action, not a server mode. The server already has a
// check/fold of its own — `doTimeout` in the engine plays exactly this move
// when the clock runs out — but reaching it costs the whole decision timer,
// stalls everyone else at the table for it, and charges the seat a timeout
// (two of those and the engine sits the player out, table.ts:683). Arming it
// here spends none of that: it acts the instant the turn lands, through the
// same `act` message a tapped button sends, so the server stays the only
// authority over what is legal.
//
// Pure and DOM-free so it tests in node — the bar that uses it cannot be
// tested at all (there is no DOM in this workspace's vitest environment), so
// every rule that decides whether a chip leaves a player's stack lives here.

import type { LegalActions } from "@shared/engine/betting";

/** The two moves an armed check/fold can make. */
export type PreActionMove = "check" | "fold";

/**
 * What an armed check/fold does with this decision, or null for "nothing".
 *
 * `legal` is non-null only when the server says it is this seat's turn
 * (computeLegal returns null otherwise), so a null here is the ordinary
 * every-other-moment case rather than an error.
 *
 * CHECK IS PREFERRED WHENEVER IT IS LEGAL, and the ordering is the whole
 * behaviour: a seat facing no bet gets its free card, and only a seat facing
 * one folds. Reading `callAmount` instead would be a second, drifting
 * definition of "does this street cost me anything" — the server already
 * published the answer in `actions`.
 */
export function preActionMove(legal: LegalActions | null): PreActionMove | null {
  if (!legal) return null;
  if (legal.actions.includes("check")) return "check";
  if (legal.actions.includes("fold")) return "fold";
  // Neither is legal — nothing this can safely send. The bar leaves the
  // decision to the player rather than inventing one.
  return null;
}

/** What the bar knows about this seat when it asks whether to offer the box. */
export interface PreActionSeat {
  inHand: boolean;
  folded: boolean;
  allIn: boolean;
  sittingOut: boolean;
}

/**
 * May the check/fold box be offered right now?
 *
 * Offered only to a seated player who still has a decision COMING: in a live
 * hand, holding cards, not folded, not all-in, not sitting out, and not
 * already to act — the turn itself is not a pre-action, it is the action, and
 * the real buttons own it.
 */
export function canArmPreAction(c: {
  seatIdx: number;
  handLive: boolean;
  yourTurn: boolean;
  seat: PreActionSeat | null | undefined;
}): boolean {
  if (c.seatIdx < 0 || !c.handLive || c.yourTurn) return false;
  const s = c.seat;
  if (!s) return false;
  return s.inHand && !s.folded && !s.allIn && !s.sittingOut;
}

/**
 * Is a box armed for hand `armedFor` still armed in hand `handNo`?
 *
 * AN ARMED PRE-ACTION NEVER SURVIVES ITS OWN HAND. The state is the hand
 * number it was armed for rather than a boolean, so "still armed" is a
 * comparison and not a latch somebody has to remember to clear — a latch left
 * standing folds the next hand, which may be the aces the player sat down for.
 * `handNo` is -1 between hands (tableDO.youFor), so the pause disarms it too.
 */
export function stillArmed(armedFor: number | null, handNo: number | null | undefined): boolean {
  return armedFor !== null && armedFor >= 0 && armedFor === handNo;
}
