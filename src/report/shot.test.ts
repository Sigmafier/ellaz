import { describe, expect, it } from "vitest";
import { MAX_SIDE, fit, isBlank, pickCanvas } from "./shot";

/* The pixel test is the part of this that can be silently wrong: a blank
   detector that never fires ships a black rectangle to an issue, and a blank
   detector that always fires quietly removes the feature. Both directions are
   pinned. */

const px = (...rgba: number[]) => new Uint8ClampedArray(rgba);
const flat = (n: number, v = 0) => new Uint8ClampedArray(n * 4).fill(v);

describe("isBlank", () => {
  it("calls a transparent read-back blank - the WebGL failure this exists for", () => {
    expect(isBlank(flat(5000, 0))).toBe(true);
  });

  it("calls an opaque black frame blank too", () => {
    const b = flat(5000, 0);
    for (let i = 3; i < b.length; i += 4) b[i] = 255;
    expect(isBlank(b)).toBe(true);
  });

  it("does NOT call a real frame blank", () => {
    const b = flat(5000, 0);
    // One differing pixel well inside the sampled walk.
    b[97 * 4] = 12;
    expect(isBlank(b)).toBe(false);
  });

  it("treats an empty buffer as blank rather than as a picture", () => {
    expect(isBlank(px())).toBe(true);
  });
});

describe("pickCanvas", () => {
  it("takes the biggest, because that is the game", () => {
    const board = { width: 800, height: 600 };
    expect(pickCanvas([{ width: 32, height: 32 }, board, { width: 100, height: 10 }])).toBe(board);
  });

  it("ignores a zero-sized canvas", () => {
    expect(pickCanvas([{ width: 0, height: 0 }])).toBeNull();
  });

  it("says so when there is no canvas at all - forty of forty-two games", () => {
    expect(pickCanvas([])).toBeNull();
  });
});

describe("fit", () => {
  it("never enlarges", () => {
    expect(fit(320, 200)).toEqual({ w: 320, h: 200 });
  });

  it("bounds the longest side and keeps the shape", () => {
    expect(fit(1920, 1080)).toEqual({ w: MAX_SIDE, h: 360 });
    expect(fit(1080, 1920)).toEqual({ w: 360, h: MAX_SIDE });
  });

  it("never rounds a side away to nothing", () => {
    expect(fit(4000, 3).w).toBe(MAX_SIDE);
    expect(fit(4000, 3).h).toBe(1);
  });
});
