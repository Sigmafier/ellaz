// fixed.ts is the only file in core/ allowed to divide, so it is the only
// place the language's rounding rule is visible. These pin the rule itself,
// not a caller's use of it: GDScript truncates toward zero and Lua 5.1 has no
// integer type, so every negative case below is a port's first disagreement.

import { abs, clamp, floorDiv, mod, mul, sign, toFP, toPx } from "./fixed";
import { FP } from "./types";

describe("floorDiv", () => {
  it("floors, it does not truncate, on negatives", () => {
    // Math.trunc would give 0 and -1. Vertical velocity is negative while
    // rising, so this is the jump-cut divide every tick a fighter is airborne.
    expect(floorDiv(-1, 2)).toBe(-1);
    expect(floorDiv(-3, 2)).toBe(-2);
  });

  it("agrees with plain integer division on non-negatives", () => {
    expect(floorDiv(0, 2)).toBe(0);
    expect(floorDiv(1, 2)).toBe(0);
    expect(floorDiv(3, 2)).toBe(1);
    expect(floorDiv(4, 2)).toBe(2);
  });

  it("floors toward negative infinity with a negative divisor too", () => {
    expect(floorDiv(1, -2)).toBe(-1);
    expect(floorDiv(-1, -2)).toBe(0);
  });
});

describe("mod", () => {
  it("is never negative", () => {
    for (let a = -50; a <= 50; a++) {
      for (const n of [1, 2, 3, 7, 60, 256]) {
        const m = mod(a, n);
        expect(m).toBeGreaterThanOrEqual(0);
        expect(m).toBeLessThan(n);
      }
    }
  });

  it("wraps a tick counter the way a tick counter should wrap", () => {
    expect(mod(-1, 60)).toBe(59);
    expect(mod(0, 60)).toBe(0);
    expect(mod(61, 60)).toBe(1);
  });

  it("disagrees with the language's own %, which is the reason it exists", () => {
    expect(-1 % 60).toBe(-1);
    expect(mod(-1, 60)).toBe(59);
  });
});

describe("mul", () => {
  it("is the identity when one side is FP", () => {
    for (const x of [0, 1, 7, 255, 256, 1000, -1, -7, -1000]) {
      expect(mul(FP, x)).toBe(x);
      expect(mul(x, FP)).toBe(x);
    }
  });

  it("halves with FP/2 and floors the odd remainder downward", () => {
    expect(mul(toFP(3), FP / 2)).toBe(toFP(1) + FP / 2);
    expect(mul(-1, FP / 2)).toBe(-1); // -0.5 floors to -1, never to 0
  });
});

describe("toFP / toPx", () => {
  it("round-trips whole pixels", () => {
    for (const px of [0, 1, 16, 255, 1024, -1, -16, -1024]) {
      expect(toPx(toFP(px))).toBe(px);
    }
  });

  it("floors sub-pixel positions, including negative ones", () => {
    expect(toPx(FP - 1)).toBe(0);
    expect(toPx(-1)).toBe(-1); // NOT 0 - the view rounds down, always
    expect(toPx(-FP - 1)).toBe(-2);
  });
});

describe("clamp / sign / abs", () => {
  it("clamps to both ends and passes the middle through", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it("signs into exactly -1, 0, 1", () => {
    expect(sign(-999)).toBe(-1);
    expect(sign(-1)).toBe(-1);
    expect(sign(0)).toBe(0);
    expect(sign(1)).toBe(1);
    expect(sign(999)).toBe(1);
  });

  it("absolutes without Math.abs's float detour", () => {
    expect(abs(-999)).toBe(999);
    expect(abs(0)).toBe(0);
    expect(abs(999)).toBe(999);
  });
});
