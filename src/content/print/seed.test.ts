import { describe, it, expect } from "vitest";
import { printRng, printSeed } from "./seed";

/** The first `n` draws, as a string, so two generators compare in one line. */
const draw = (rng: () => number, n = 8) => Array.from({ length: n }, () => rng().toFixed(9)).join(",");

describe("the print seed", () => {
  it("labels a sheet by its kind and index", () => {
    expect(printSeed("maze", 3)).toBe("maze:3");
  });

  it("refuses an index that is not a whole sheet number", () => {
    expect(() => printSeed("maze", -1)).toThrow(/non-negative/);
    expect(() => printSeed("maze", 1.5)).toThrow(/non-negative/);
    expect(() => printSeed("", 0)).toThrow(/needs a kind/);
  });

  it("replays the same sequence for the same label", () => {
    expect(draw(printRng("sudoku", 2))).toBe(draw(printRng("sudoku", 2)));
  });

  it("deals a different sequence for a different index", () => {
    expect(draw(printRng("sudoku", 2))).not.toBe(draw(printRng("sudoku", 3)));
  });

  it("deals a different sequence for a different kind", () => {
    // The failure this catches is one shared generator behind four packs, which
    // would look perfectly random on any one page and identical across them.
    expect(draw(printRng("sudoku", 0))).not.toBe(draw(printRng("maze", 0)));
  });

  it("draws inside [0,1)", () => {
    const rng = printRng("wordsearch", 0);
    for (let i = 0; i < 500; i += 1) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
