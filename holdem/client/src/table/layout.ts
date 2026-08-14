// Seat placement: seats sit on an ellipse, rotated so YOUR seat is always
// bottom-center. Positions are percentages of the felt box; the felt itself
// is pinned dir="ltr" so these are physical coordinates in every locale.

export interface SeatPos {
  x: number; // percent
  y: number; // percent
}

/** Radii as a percentage of the felt box. See `seatRadius` in scale.ts. */
export interface Radii {
  rx: number;
  ry: number;
}

/**
 * Display position for seat index `seat` at a table of `n` seats, given the
 * viewer sits at `mySeat` (-1 = spectator, seat 0 lands bottom-center).
 *
 * `r` defaults to the original circle, so every existing caller and test keeps
 * the layout it was written against. A wide felt passes a flat ellipse instead
 * — pushing seats to the left and right rim rather than stacking them through
 * the one dimension a landscape phone does not have.
 */
export function seatPosition(seat: number, n: number, mySeat: number, r: Radii = { rx: 36, ry: 36 }): SeatPos {
  const anchor = mySeat >= 0 ? mySeat : 0;
  const slot = ((seat - anchor) % n + n) % n;
  // slot 0 at the bottom (90° in screen coords), advancing clockwise. Radii
  // keep a whole seat card inside the viewport on a 390px phone.
  const angle = Math.PI / 2 + (slot / n) * Math.PI * 2;
  return {
    x: 50 + r.rx * Math.cos(angle),
    y: 50 + r.ry * Math.sin(angle),
  };
}
