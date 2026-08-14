// Who is out of chips, and what happens to them.
//
// Pure, and separate from tableDO for the reason reap.ts is: the Durable
// Object is plumbing that no test in this repo can drive, so anything with a
// decision in it moves out here where a test can hold it still.
//
// The rule this encodes is one sentence: A SEAT HOLDING NOTHING DOES NOT SIT
// AT THE TABLE. It is not tidiness — `blinds.ts` counts only seats with
// chips, so every busted seat left in place is one player closer to a table
// that cannot deal, and the way THAT ends is a room full of faces where
// nothing happens and no error is printed anywhere.

/** Only the fields this decision reads. Structural, so TableState's SeatState fits. */
export interface BustedSeatView {
  playerId: string | null;
  stack: number;
  /** A rebuy asked for mid-hand that has not landed yet. */
  pendingRebuy: number;
}

export interface BustedFix {
  seat: number;
  /** `rebuy` restakes the house; `standUp` hands a person's seat back. */
  action: "rebuy" | "standUp";
}

/**
 * The seats to fix, in seat order.
 *
 * Two answers, because the two kinds of seat mean different things:
 *
 *  - THE HOUSE is restaked. It cannot decide to rebuy and there is nobody to
 *    ask, so a bot that busts and stays busted is just a dead chair — and its
 *    chips were never real.
 *  - A PERSON is stood up, keeping everything a leave normally gives them.
 *    Their seat goes back to "sit here", which is one tap and a buy-in sheet:
 *    the same door they came in by. Restaking them automatically would be
 *    inventing money for somebody who is entitled to decide they are done.
 *
 * Returns nothing at all while a hand is running, so a player is only ever
 * removed from a table they are no longer sitting in a pot at.
 */
export function bustedSeats(
  seats: readonly BustedSeatView[],
  opts: { handInProgress: boolean; isBot: (playerId: string) => boolean },
): BustedFix[] {
  if (opts.handInProgress) return [];
  const out: BustedFix[] = [];
  for (let i = 0; i < seats.length; i++) {
    const s = seats[i];
    if (!s.playerId) continue;
    // Standing up a player whose rebuy is already in flight would throw away
    // chips they have committed to bringing back.
    if (s.stack > 0 || s.pendingRebuy > 0) continue;
    out.push({ seat: i, action: opts.isBot(s.playerId) ? "rebuy" : "standUp" });
  }
  return out;
}
