// One number decides how big everything on the felt is.
//
// The defect this replaces: the felt was sized in PERCENTAGES of the viewport
// and everything on it in HARDCODED PIXELS — board cards 42, hole cards 38,
// card backs 30, fonts 11/12/13/14, nameplate 76, dealer button 20. So the
// table inflated on a big screen and the cards stayed phone-sized, and on a
// landscape phone the seat boxes stacked until they met in the middle.
//
// Everything is expressed against `scale` now, derived from the measured box.
// Pure so it can be tested without a browser.
//
// IT TAKES THE WRAPPER BOX, NOT THE FELT, and that is load-bearing rather than
// incidental. The side rail only exists when the shape is wide, and the rail
// takes width away from the felt — so deciding "wide" from the felt's own box
// is a feedback loop: rail appears, felt narrows, shape flips to tall, rail
// disappears, felt widens, shape flips back. Measuring the wrapper (which the
// rail cannot change) and deriving the felt from it breaks that by
// construction rather than by damping.

/** Does the felt lay out wide (seats around a flat ellipse) or tall? */
export type Shape = "wide" | "tall";

export interface TableScale {
  shape: Shape;
  /** Multiplier applied to every authored size. 1 == the old fixed design. */
  scale: number;
}

/**
 * A wrapper wider than this ratio lays its seats out on a flat ellipse and
 * moves the controls to a side rail. 1.25 rather than 1.0 so a near-square
 * tablet does not flip back and forth on a few pixels of browser chrome.
 */
export const WIDE_RATIO = 1.25;

/**
 * The control rail's width when the shape is wide.
 *
 * A CONSTANT, and deliberately not a function of `scale`: a rail that grew with
 * the scale it helps determine would reintroduce the feedback loop the wrapper
 * measurement exists to prevent. 116 fits FOLD / CALL 12 / RAISE stacked with
 * 44px tap targets.
 */
export const RAIL_W = 116;

/** The felt's inset inside the wrapper — must match the CSS in Table.tsx. */
const INSET_X = 0.08; // 4% each side
const INSET_Y: Record<Shape, number> = { tall: 0.19, wide: 0.14 };

/**
 * What one seat plus the board needs, vertically, at scale 1.
 *
 *   tall  a seat box stacks cards ABOVE the nameplate — 53 + 40 + 4 + 18 ≈ 115.
 *         Two of those plus the board block (pot 22 + gap 8 + cards 59 ≈ 89)
 *         is 319px before anything else.
 *   wide  the cards sit BESIDE the nameplate, so a seat box is ~56 tall, and
 *         the seats spread along a flat ellipse instead of stacking through
 *         the middle. The binding column is one seat + the board ≈ 150.
 *
 * A landscape phone has roughly 290px of felt height. Against 319 it cannot
 * even fit the current design; against 150 it has room to grow by half again.
 * No multiplier could have bought that — reclaiming the height did.
 */
const NEED_H: Record<Shape, number> = { tall: 319, wide: 150 };

/** And horizontally, so a short wide screen cannot scale past its own width. */
const NEED_W: Record<Shape, number> = { tall: 330, wide: 520 };

/**
 * Never below 1: the old sizes are the floor, so no screen gets SMALLER than
 * it is today. Never above 2.6: past that the cards are larger than a real
 * deck held at arm's length and the table stops reading as a table.
 */
export const MIN_SCALE = 1;
export const MAX_SCALE = 2.6;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The felt box a wrapper of this size will produce, rail and insets removed. */
export function feltBox(w: number, h: number, shape: Shape): { w: number; h: number } {
  const usable = w - (shape === "wide" ? RAIL_W : 0);
  return { w: Math.max(0, usable * (1 - INSET_X)), h: Math.max(0, h * (1 - INSET_Y[shape])) };
}

/** Measure the WRAPPER box — the element that holds the felt and the rail. */
export function tableScale(w: number, h: number): TableScale {
  // A zero box happens for one frame before layout settles, and on a hidden
  // tab. Answering 1 is the same answer as "the old design", which is a
  // usable table rather than a collapsed one.
  if (!(w > 0) || !(h > 0)) return { shape: "tall", scale: MIN_SCALE };

  const shape: Shape = w / h >= WIDE_RATIO ? "wide" : "tall";
  const felt = feltBox(w, h, shape);
  const raw = Math.min(felt.w / NEED_W[shape], felt.h / NEED_H[shape]);
  return { shape, scale: clamp(raw, MIN_SCALE, MAX_SCALE) };
}

/**
 * Seat ellipse radii, as a percentage of the felt box.
 *
 * Wide pushes seats out to the rim horizontally and pulls them IN vertically,
 * so a heads-up table puts the two players at the left and right ends with the
 * board between them, instead of stacking them top and bottom through the one
 * dimension that is short.
 */
export function seatRadius(shape: Shape): { rx: number; ry: number } {
  // ry is LARGER in wide, not smaller — which is the opposite of the first
  // guess and was settled by looking at a render. "The height is short, so
  // pull the seats in" pulls them straight into the board: at ry 30 the top
  // seat's committed-chips pill sat on top of the pot chip. Pushing them out
  // to the rim is what clears the middle for the board.
  return shape === "wide" ? { rx: 42, ry: 39 } : { rx: 36, ry: 36 };
}
