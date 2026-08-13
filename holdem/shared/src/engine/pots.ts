// Side-pot layering and award arithmetic.
//
// Layer boundaries come from the DISTINCT totalCommitted levels of the LIVE
// (non-folded) seats only — a folded seat's chips are dead money that flows
// into whichever layers its total reaches, but a folded total never opens a
// layer of its own (it would only create a pot with an identical eligible
// set to its neighbour). Eligibility for a pot: live seats committed to at
// least that layer's level.
//
// Invariant, asserted by the caller: sum(pot amounts) === sum(totalCommitted)
// after refunds. Odd chips: each pot splits floor-equally and the remainder
// goes one chip at a time to the winners nearest clockwise from the left of
// the button.

export interface Pot {
  amount: number;
  /** Seat indices eligible to win this pot, ascending. */
  eligible: number[];
}

export interface PotInput {
  /** Per seat: chips committed over the whole hand (after refunds). */
  totalCommitted: number[];
  /** Per seat: dealt into the hand. */
  inHand: boolean[];
  /** Per seat: folded. */
  folded: boolean[];
}

export function buildPots({ totalCommitted, inHand, folded }: PotInput): Pot[] {
  const n = totalCommitted.length;
  const liveLevels = new Set<number>();
  for (let i = 0; i < n; i++) {
    if (inHand[i] && !folded[i] && totalCommitted[i] > 0) liveLevels.add(totalCommitted[i]);
  }
  const levels = [...liveLevels].sort((a, b) => a - b);
  const pots: Pot[] = [];
  let prev = 0;
  for (const level of levels) {
    let amount = 0;
    const eligible: number[] = [];
    for (let i = 0; i < n; i++) {
      if (!inHand[i]) continue;
      amount += Math.min(totalCommitted[i], level) - Math.min(totalCommitted[i], prev);
      if (!folded[i] && totalCommitted[i] >= level) eligible.push(i);
    }
    if (amount > 0) pots.push({ amount, eligible });
    prev = level;
  }
  // Dead money above the highest live level (a folded seat that somehow
  // committed more than every live seat — cannot happen after refunds, but a
  // silent chip leak here would be unfindable, so fold it into the last pot).
  let overflow = 0;
  for (let i = 0; i < n; i++) {
    if (inHand[i]) overflow += Math.max(0, totalCommitted[i] - prev);
  }
  if (overflow > 0 && pots.length > 0) pots[pots.length - 1].amount += overflow;
  return pots;
}

/**
 * Split `amount` among `winners` (seat indices): floor-equal shares, odd chips
 * one each to winners nearest clockwise from the seat LEFT of the button.
 */
export function splitPot(
  amount: number,
  winners: number[],
  buttonSeat: number,
  seatCount: number,
): Record<number, number> {
  const shares: Record<number, number> = {};
  const base = Math.floor(amount / winners.length);
  let remainder = amount - base * winners.length;
  for (const w of winners) shares[w] = base;
  // walk clockwise starting left of the button
  for (let k = 1; k <= seatCount && remainder > 0; k++) {
    const seat = (buttonSeat + k) % seatCount;
    if (winners.includes(seat)) {
      shares[seat] += 1;
      remainder -= 1;
    }
  }
  return shares;
}
