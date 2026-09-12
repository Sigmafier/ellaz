// Boxes, and the two questions the sim asks of them. No division, no floats,
// no DOM - every quantity in and out is FP (1/256 px) and integral.
//
// THE CONVENTION, and it is the whole file:
//
//   A CBox as authored is PIVOT-RELATIVE. The pivot is the fighter's feet, at
//   body (0, 0). `x` runs right, `y` runs DOWN, so a box drawn on the torso
//   has a NEGATIVE y (it is above the feet) and `y + h` walks back toward 0.
//
//   A fighter stands at world `x` and floats `h` above the floor (h >= 0, and
//   h is a HEIGHT, not the box's own `h` field - they are different letters in
//   the same sentence and this comment is the only thing that says so).
//
//   Placing that box in the world therefore reads:
//
//        world x   =  x + box.x                       (facing +1)
//                  =  x - (box.x + box.w)             (facing -1, mirrored
//                                                      across the pivot COLUMN)
//        world y   =  box.y - h                       ("feet at 0, up is
//                                                      negative" - lifting the
//                                                      fighter makes y smaller)
//        w, h      =  unchanged; a mirror moves a box, it never resizes one.
//
//   So the world frame is the same frame as the pivot frame, just translated:
//   y still runs down, the floor is still y = 0, and everything above it is
//   negative. Nothing in here converts to screen space; that is a cell's job.

import type { CBox } from "./types";

/** Place a pivot-relative box at world `x`, lifted by `h`, mirrored when facing -1. */
export function worldBox(box: CBox, x: number, h: number, face: 1 | -1): CBox {
  const localX = face === 1 ? box.x : -(box.x + box.w);
  return { x: x + localX, y: box.y - h, w: box.w, h: box.h };
}

/**
 * Strict AABB overlap. Touching edges do NOT overlap: two boxes that share an
 * edge occupy zero area together, and a hit that lands on zero area is a hit
 * that lands on a rounding decision.
 */
export function overlaps(a: CBox, b: CBox): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/**
 * The signed amount to move `a` along x so it no longer overlaps `b`, smallest
 * magnitude; 0 when they do not overlap. Positive pushes `a` right, negative
 * left. A tie resolves RIGHT (positive) - arbitrary, but it has to be written
 * down somewhere or two ports pick differently.
 */
export function overlapX(a: CBox, b: CBox): number {
  if (!overlaps(a, b)) return 0;
  const right = b.x + b.w - a.x; // > 0: push a past b's right edge
  const left = b.x - (a.x + a.w); // < 0: push a past b's left edge
  return right <= -left ? right : left;
}
