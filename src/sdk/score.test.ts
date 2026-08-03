import { describe, it, expect } from "vitest";
import { UNIT_DIRECTION, bestOf, directionFor, formatScore, isBetter, isRankable } from "./score";

// score.ts is the comparability table, exactly as economy.ts is the earn table:
// a game reports WHAT happened (a value and what it measures) and this module
// alone decides what ranks above what. Pure, zero I/O, node-testable.

describe("directionFor — the game does not get a vote", () => {
  it("ranks points high-first and time/moves low-first", () => {
    expect(directionFor("points")).toBe("high");
    expect(directionFor("ms")).toBe("low");
    expect(directionFor("moves")).toBe("low");
  });

  it("covers every unit in the table, so a new unit cannot be forgotten", () => {
    for (const [unit, dir] of Object.entries(UNIT_DIRECTION)) {
      expect(directionFor(unit as keyof typeof UNIT_DIRECTION)).toBe(dir);
    }
  });

  it("falls back to high for an out-of-union unit rather than throwing", () => {
    // SaveStore.get<T> casts unvalidated JSON, so a hand-edited save can put any
    // string here. Same runtime-check discipline as economy.ts KNOWN_REASONS.
    expect(directionFor("bananas" as never)).toBe("high");
  });
});

describe("isRankable — a value that cannot be ordered must never become a best", () => {
  it("accepts ordinary finite numbers including zero and negatives", () => {
    expect(isRankable(0)).toBe(true);
    expect(isRankable(1234)).toBe(true);
    expect(isRankable(-5)).toBe(true);
    expect(isRankable(12.75)).toBe(true);
  });

  it("rejects NaN and both infinities", () => {
    // NaN is the economy.ts annihilation trap in score form: stored as a best it
    // serialises to null, reads back as 0, and every later run either always or
    // never beats it depending on direction.
    expect(isRankable(NaN)).toBe(false);
    expect(isRankable(Infinity)).toBe(false);
    expect(isRankable(-Infinity)).toBe(false);
  });

  it("rejects anything that is not a number at all", () => {
    expect(isRankable("100" as never)).toBe(false);
    expect(isRankable(null as never)).toBe(false);
    expect(isRankable(undefined as never)).toBe(false);
    expect(isRankable({} as never)).toBe(false);
  });
});

describe("isBetter — high", () => {
  it("treats the first ever score as a best", () => {
    expect(isBetter(10, undefined, "high")).toBe(true);
    expect(isBetter(0, undefined, "high")).toBe(true);
  });

  it("beats a lower previous best", () => {
    expect(isBetter(11, 10, "high")).toBe(true);
  });

  it("does not beat an equal or higher one", () => {
    expect(isBetter(10, 10, "high")).toBe(false);
    expect(isBetter(9, 10, "high")).toBe(false);
  });
});

describe("isBetter — low", () => {
  it("treats the first ever score as a best", () => {
    expect(isBetter(5000, undefined, "low")).toBe(true);
  });

  it("beats a slower previous best", () => {
    expect(isBetter(4999, 5000, "low")).toBe(true);
  });

  it("does not beat an equal or slower one", () => {
    expect(isBetter(5000, 5000, "low")).toBe(false);
    expect(isBetter(5001, 5000, "low")).toBe(false);
  });

  it("a zero time is still a best, not a falsy miss", () => {
    // `prev || fallback` would treat a stored 0 as absent. Guard the shape.
    expect(isBetter(1, 0, "low")).toBe(false);
    expect(isBetter(0, 1, "low")).toBe(true);
  });
});

describe("isBetter — unrankable values never win", () => {
  it("rejects a NaN candidate against any previous best", () => {
    expect(isBetter(NaN, 10, "high")).toBe(false);
    expect(isBetter(NaN, undefined, "high")).toBe(false);
  });

  it("treats an unrankable STORED best as absent, so a real score can land", () => {
    // A corrupt save must not permanently block every future personal best.
    expect(isBetter(10, NaN as never, "high")).toBe(true);
    expect(isBetter(10, "oops" as never, "high")).toBe(true);
  });
});

describe("bestOf", () => {
  it("keeps the better of the two per direction", () => {
    expect(bestOf(10, 7, "high")).toBe(10);
    expect(bestOf(7, 10, "high")).toBe(10);
    expect(bestOf(10, 7, "low")).toBe(7);
    expect(bestOf(7, 10, "low")).toBe(7);
  });

  it("returns the rankable one when the other is junk", () => {
    expect(bestOf(10, NaN as never, "high")).toBe(10);
    expect(bestOf(NaN as never, 10, "low")).toBe(10);
  });
});

describe("formatScore — what a child reads", () => {
  it("shows points as a plain integer", () => {
    expect(formatScore(1234, "points")).toBe("1234");
  });

  it("shows moves as a plain integer", () => {
    expect(formatScore(42, "moves")).toBe("42");
  });

  it("shows time in seconds with one decimal", () => {
    expect(formatScore(5000, "ms")).toBe("5.0s");
    expect(formatScore(12750, "ms")).toBe("12.8s");
    expect(formatScore(900, "ms")).toBe("0.9s");
  });

  it("never renders NaN or Infinity at a child", () => {
    expect(formatScore(NaN, "points")).toBe("—");
    expect(formatScore(Infinity, "ms")).toBe("—");
  });

  it("rounds a fractional point value rather than showing decimals", () => {
    expect(formatScore(10.6, "points")).toBe("11");
  });
});

describe("formatScore — a minute is not 90 seconds", () => {
  // Sudoku and minesweeper are measured in MINUTES, not the seconds a reaction
  // tap takes. "420.3s" is technically the same number and unreadable; nobody
  // counts a board in seconds once past a minute.
  it("switches to m:ss at one minute", () => {
    expect(formatScore(60_000, "ms")).toBe("1:00");
    expect(formatScore(90_000, "ms")).toBe("1:30");
    expect(formatScore(423_400, "ms")).toBe("7:03");
  });

  it("pads the seconds so it never reads as 7:3", () => {
    expect(formatScore(421_000, "ms")).toBe("7:01");
  });

  it("still reads short times in seconds, where tenths matter", () => {
    expect(formatScore(12_750, "ms")).toBe("12.8s");
    expect(formatScore(59_900, "ms")).toBe("59.9s");
  });

  it("does not let rounding produce a 60th second", () => {
    // 59.96s rounds to "60.0s" under toFixed(1) — a time that does not exist.
    expect(formatScore(59_960, "ms")).toBe("1:00");
  });
});
