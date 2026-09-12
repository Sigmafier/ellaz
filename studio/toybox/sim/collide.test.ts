// Every number here is FP (1/256 px) and every expectation is written out as
// an arithmetic literal rather than re-derived from the function under test -
// a test that recomputes the implementation agrees with any bug in it.
//
// The convention these pin, restated once so the file is readable alone:
// a CBox is pivot-relative, the pivot is the feet, y runs DOWN, and lifting a
// fighter by `h` makes its world y SMALLER (up is negative).

import { overlapX, overlaps, worldBox } from "./collide";
import type { CBox } from "./types";

/** a torso box: 10 wide, 30 tall, sitting 30 above the feet and 2 right of the pivot */
const TORSO: CBox = { x: 2, y: -30, w: 10, h: 30 };

describe("worldBox", () => {
  it("translates by x when facing right", () => {
    expect(worldBox(TORSO, 100, 0, 1)).toEqual({ x: 102, y: -30, w: 10, h: 30 });
  });

  it("mirrors across the PIVOT COLUMN when facing left, and does not resize", () => {
    // facing right the box spans [102, 112) around a pivot at 100 - two to the
    // right of it. Facing left it must span [88, 98) - two to the LEFT of it.
    const right = worldBox(TORSO, 100, 0, 1);
    const left = worldBox(TORSO, 100, 0, -1);
    expect(left).toEqual({ x: 88, y: -30, w: 10, h: 30 });
    expect(left.w).toBe(right.w);
    expect(left.h).toBe(right.h);
    expect(100 - left.x).toBe(right.x + right.w - 100);
  });

  it("mirrors a box that straddles the pivot onto itself", () => {
    const straddle: CBox = { x: -6, y: -20, w: 12, h: 20 };
    expect(worldBox(straddle, 0, 0, -1)).toEqual(worldBox(straddle, 0, 0, 1));
  });

  it("lifts: a positive h makes world y smaller, because up is negative", () => {
    const grounded = worldBox(TORSO, 100, 0, 1);
    const airborne = worldBox(TORSO, 100, 256, 1);
    expect(airborne.y).toBe(-30 - 256);
    expect(airborne.y).toBeLessThan(grounded.y);
    expect(airborne.x).toBe(grounded.x); // a lift is not a slide
    expect(airborne.h).toBe(grounded.h);
  });

  it("the feet of a grounded fighter land on y = 0", () => {
    const feet: CBox = { x: -4, y: -2, w: 8, h: 2 };
    const placed = worldBox(feet, 500, 0, 1);
    expect(placed.y + placed.h).toBe(0);
  });

  it("mirrors and lifts independently", () => {
    expect(worldBox(TORSO, 100, 256, -1)).toEqual({ x: 88, y: -286, w: 10, h: 30 });
  });
});

describe("overlaps", () => {
  const a: CBox = { x: 0, y: 0, w: 10, h: 10 };

  it("is true when the boxes share area", () => {
    expect(overlaps(a, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
    expect(overlaps(a, { x: -5, y: -5, w: 10, h: 10 })).toBe(true);
    expect(overlaps(a, { x: 2, y: 2, w: 2, h: 2 })).toBe(true); // fully inside
    expect(overlaps(a, { x: -5, y: -5, w: 20, h: 20 })).toBe(true); // fully around
  });

  it("is symmetric", () => {
    const b: CBox = { x: 5, y: 5, w: 10, h: 10 };
    expect(overlaps(a, b)).toBe(overlaps(b, a));
    const far: CBox = { x: 500, y: 500, w: 1, h: 1 };
    expect(overlaps(a, far)).toBe(overlaps(far, a));
  });

  it("is FALSE on a touching edge - zero shared area is not a hit", () => {
    expect(overlaps(a, { x: 10, y: 0, w: 10, h: 10 })).toBe(false); // right edge
    expect(overlaps(a, { x: -10, y: 0, w: 10, h: 10 })).toBe(false); // left edge
    expect(overlaps(a, { x: 0, y: 10, w: 10, h: 10 })).toBe(false); // below
    expect(overlaps(a, { x: 0, y: -10, w: 10, h: 10 })).toBe(false); // above
    expect(overlaps(a, { x: 10, y: 10, w: 10, h: 10 })).toBe(false); // corner
  });

  it("is true one FP unit before that edge, so the strictness is a hair and not a gap", () => {
    expect(overlaps(a, { x: 9, y: 0, w: 10, h: 10 })).toBe(true);
    expect(overlaps(a, { x: -9, y: 0, w: 10, h: 10 })).toBe(true);
  });

  it("needs BOTH axes - a box beside it on x but aligned on y does not overlap", () => {
    expect(overlaps(a, { x: 50, y: 0, w: 10, h: 10 })).toBe(false);
    expect(overlaps(a, { x: 0, y: 50, w: 10, h: 10 })).toBe(false);
  });

  // NOT pinned here, deliberately: a DEGENERATE box (w or h of 0) reads as
  // overlapping under the strict-AABB formula this contract specifies, even
  // though it shares zero area. Adding a `w > 0` guard would be a behaviour
  // this lane invented, so it is reported to the caller rather than asserted
  // in either direction - whoever owns the compiler should refuse to emit one.
});

describe("overlapX", () => {
  const a: CBox = { x: 0, y: 0, w: 10, h: 10 };

  it("is 0 when the boxes do not overlap, touching edges included", () => {
    expect(overlapX(a, { x: 50, y: 0, w: 10, h: 10 })).toBe(0);
    expect(overlapX(a, { x: 10, y: 0, w: 10, h: 10 })).toBe(0);
    expect(overlapX(a, { x: 0, y: 50, w: 10, h: 10 })).toBe(0); // apart on y only
  });

  it("pushes LEFT (negative) when `a` is mostly to the left", () => {
    // a spans [0,10), b spans [8,18). Clearing left costs 2, right costs 18.
    const d = overlapX(a, { x: 8, y: 0, w: 10, h: 10 });
    expect(d).toBe(-2);
    expect(overlaps({ ...a, x: a.x + d }, { x: 8, y: 0, w: 10, h: 10 })).toBe(false);
  });

  it("pushes RIGHT (positive) when `a` is mostly to the right", () => {
    // a spans [0,10), b spans [-8,2). Clearing right costs 2, left costs 18.
    const d = overlapX(a, { x: -8, y: 0, w: 10, h: 10 });
    expect(d).toBe(2);
    expect(overlaps({ ...a, x: a.x + d }, { x: -8, y: 0, w: 10, h: 10 })).toBe(false);
  });

  it("always picks the smaller magnitude of the two escapes", () => {
    for (let bx = -9; bx <= 9; bx++) {
      const b: CBox = { x: bx, y: 0, w: 10, h: 10 };
      const d = overlapX(a, b);
      const right = b.x + b.w - a.x;
      const left = b.x - (a.x + a.w);
      expect(Math.abs(d)).toBe(Math.min(right, -left));
      expect(overlaps({ ...a, x: a.x + d }, b)).toBe(false);
    }
  });

  it("resolves a dead tie to the right, deterministically", () => {
    // a spans [0,10), b spans [-5,5): both escapes cost 5.
    expect(overlapX(a, { x: -5, y: 0, w: 10, h: 10 })).toBe(5);
  });

  it("clears a box fully inside `a`, in whichever direction is nearer", () => {
    const inner: CBox = { x: 1, y: 1, w: 2, h: 2 };
    const d = overlapX(a, inner);
    expect(d).toBe(3); // right edge of inner is at 3, a.x is 0
    expect(overlaps({ ...a, x: a.x + d }, inner)).toBe(false);
  });

  it("moves the box it was told to move: `a`, never `b`", () => {
    const b: CBox = { x: 8, y: 0, w: 10, h: 10 };
    const d = overlapX(a, b);
    // applying it to b instead would move them further together, not apart
    expect(overlaps(a, { ...b, x: b.x + d })).toBe(true);
  });
});
