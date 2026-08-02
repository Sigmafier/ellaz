import { describe, it, expect } from "vitest";
import { LADDER, rungFor, CREATURES } from "./skin";
// The engine's own level table — the win targets the ladder has to cover.
// Relative import is deliberate: evolve reuses 2048's engine rather than copying it.
import { LEVELS } from "../n2048/logic";

const LOCALES = ["he", "en"] as const;

describe("evolve ladder", () => {
  it("is ascending powers of two starting at 2", () => {
    expect(LADDER.length).toBeGreaterThan(0);
    LADDER.forEach((rung, i) => {
      expect(rung.value).toBe(2 ** (i + 1));
    });
  });

  it("covers every win target with its own rung", () => {
    const maxTarget = Math.max(...Object.values(LEVELS).map((l) => l.target));
    expect(LADDER[LADDER.length - 1].value).toBeGreaterThanOrEqual(maxTarget);
    for (const level of Object.values(LEVELS)) {
      // Exact, not clamped: winning must land on a creature of its own.
      expect(rungFor(level.target)?.value).toBe(level.target);
    }
  });

  it("covers every tile value reachable on the way to a win", () => {
    const maxTarget = Math.max(...Object.values(LEVELS).map((l) => l.target));
    for (let v = 2; v <= maxTarget; v *= 2) {
      expect(rungFor(v)?.value).toBe(v);
    }
  });

  it("gives distinct rungs — no repeated value, glyph or name", () => {
    const unique = (xs: string[]) => new Set(xs).size === xs.length;
    expect(unique(LADDER.map((r) => String(r.value)))).toBe(true);
    expect(unique(LADDER.map((r) => r.glyph))).toBe(true);
    expect(unique(LADDER.map((r) => r.name.he))).toBe(true);
    expect(unique(LADDER.map((r) => r.name.en))).toBe(true);
  });

  it("names every rung in both locales and colours every tile", () => {
    for (const rung of LADDER) {
      expect(rung.glyph.length).toBeGreaterThan(0);
      for (const locale of LOCALES) {
        expect(rung.name[locale].trim().length).toBeGreaterThan(0);
      }
      expect(rung.bg).toMatch(/^(#|rgb)/);
    }
  });
});

describe("value to rung mapping", () => {
  it("is total for every positive value — a tile is never blank", () => {
    // Far past anything a real board reaches: above the ladder it clamps to the
    // top rung rather than returning nothing.
    for (let v = 2; v <= 2 ** 20; v *= 2) {
      const rung = rungFor(v);
      expect(rung).not.toBeNull();
      expect(rung?.glyph.length).toBeGreaterThan(0);
    }
    expect(rungFor(2 ** 20)).toBe(LADDER[LADDER.length - 1]);
    // Off-ladder values (never produced by the engine, but the map is total anyway).
    expect(rungFor(1)).toBe(LADDER[0]);
    expect(rungFor(3)).toBe(LADDER[0]);
    expect(rungFor(300)?.value).toBe(256);
  });

  it("is monotonic — a bigger tile is never an earlier creature", () => {
    let previous = -1;
    for (let v = 1; v <= 5000; v++) {
      const index = LADDER.indexOf(rungFor(v)!);
      expect(index).toBeGreaterThanOrEqual(previous);
      previous = index;
    }
  });

  it("maps empty cells to nothing", () => {
    expect(rungFor(0)).toBeNull();
    expect(rungFor(-8)).toBeNull();
  });
});

describe("the skin handed to the renderer", () => {
  it("paints what the ladder says, and nothing on an empty cell", () => {
    expect(CREATURES.tile(0)).toBeNull();
    for (const rung of LADDER) {
      const painted = CREATURES.tile(rung.value);
      expect(painted).toEqual({ glyph: rung.glyph, label: rung.name, bg: rung.bg });
    }
  });

  it("carries a board and empty-cell colour, and the kids touch target", () => {
    expect(CREATURES.boardBg).toMatch(/^(#|rgb)/);
    expect(CREATURES.emptyBg).toMatch(/^(#|rgb)/);
    expect(CREATURES.kids).toBe(true);
  });
});
