// Seat placement: seats sit on an ellipse, rotated so YOUR seat is always
// bottom-center. Positions are percentages of the felt box; the felt itself
// is pinned dir="ltr" so these are physical coordinates in every locale.

export interface SeatPos {
  x: number; // percent
  y: number; // percent
}

/**
 * Display position for seat index `seat` at a table of `n` seats, given the
 * viewer sits at `mySeat` (-1 = spectator, seat 0 lands bottom-center).
 */
export function seatPosition(seat: number, n: number, mySeat: number): SeatPos {
  const anchor = mySeat >= 0 ? mySeat : 0;
  const slot = ((seat - anchor) % n + n) % n;
  // slot 0 at the bottom (90° in screen coords), advancing clockwise. Radii
  // keep a whole seat card inside the viewport on a 390px phone.
  const angle = Math.PI / 2 + (slot / n) * Math.PI * 2;
  return {
    x: 50 + 36 * Math.cos(angle),
    y: 50 + 36 * Math.sin(angle),
  };
}
