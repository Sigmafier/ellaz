import { describe, it, expect } from "vitest";
import { CAST, CAST_THEMES, castOf, drawCast, type CastTheme } from "./cast";
import { mulberry32 } from "./rng";

describe("CAST", () => {
  it("covers every declared theme with at least 8 items", () => {
    for (const theme of CAST_THEMES) {
      expect(CAST[theme].length).toBeGreaterThanOrEqual(8);
    }
    // Record totality the other way: no stray key beyond CAST_THEMES.
    expect(Object.keys(CAST).sort()).toEqual([...CAST_THEMES].sort());
  });

  it("has visually distinct emoji within each theme", () => {
    // The mechanical half of the distinctness rule: two identical glyphs make a
    // "what disappeared?" round unanswerable. (Look-alike-but-different glyphs
    // are a judgement call no test can make — see the note in cast.ts.)
    for (const theme of CAST_THEMES) {
      const emoji = CAST[theme].map((i) => i.emoji);
      expect(new Set(emoji).size).toBe(emoji.length);
    }
  });

  it("never repeats a NAME within a theme, in either locale", () => {
    for (const theme of CAST_THEMES) {
      const he = CAST[theme].map((i) => i.he);
      const en = CAST[theme].map((i) => i.en);
      expect(new Set(he).size).toBe(he.length);
      expect(new Set(en).size).toBe(en.length);
    }
  });

  it("gives every item a non-empty emoji and both locale names", () => {
    for (const theme of CAST_THEMES) {
      for (const item of CAST[theme]) {
        expect(item.emoji.length).toBeGreaterThan(0);
        expect(item.he.trim().length).toBeGreaterThan(0);
        expect(item.en.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("writes the Hebrew name in Hebrew letters, not transliterated", () => {
    const hebrew = /[א-ת]/;
    for (const theme of CAST_THEMES) {
      for (const item of CAST[theme]) {
        expect(hebrew.test(item.he)).toBe(true);
      }
    }
  });
});

describe("castOf", () => {
  it("returns the theme's items in declared order", () => {
    expect(castOf("animals")).toBe(CAST.animals);
    expect(castOf("food")[0]).toEqual(CAST.food[0]);
  });

  it("throws an honest error on an id that is not a theme", () => {
    expect(() => castOf("dinosaurs" as CastTheme)).toThrow(/unknown cast theme/);
  });
});

describe("drawCast", () => {
  it("returns n items, all distinct", () => {
    const drawn = drawCast("animals", 5, mulberry32(1));
    expect(drawn).toHaveLength(5);
    expect(new Set(drawn.map((i) => i.emoji)).size).toBe(5);
  });

  it("only ever returns members of the theme", () => {
    const pool = new Set(castOf("vehicles").map((i) => i.emoji));
    for (const item of drawCast("vehicles", 4, mulberry32(9))) {
      expect(pool.has(item.emoji)).toBe(true);
    }
  });

  it("is deterministic under a seeded rng", () => {
    expect(drawCast("fruit", 4, mulberry32(2024))).toEqual(drawCast("fruit", 4, mulberry32(2024)));
  });

  it("actually draws differently for different seeds", () => {
    // Over the whole theme, two seeds must produce different ORDERS.
    const a = drawCast("nature", 10, mulberry32(1)).map((i) => i.emoji);
    const b = drawCast("nature", 10, mulberry32(2)).map((i) => i.emoji);
    expect(a).not.toEqual(b);
  });

  it("does not mutate the source theme", () => {
    const before = [...CAST.toys];
    drawCast("toys", 5, mulberry32(3));
    expect(CAST.toys).toEqual(before);
  });

  it("CLAMPS to the theme size when n is too large", () => {
    const size = castOf("toys").length;
    const drawn = drawCast("toys", size + 50, mulberry32(4));
    expect(drawn).toHaveLength(size);
    expect(new Set(drawn.map((i) => i.emoji)).size).toBe(size);
  });

  it("returns an empty array for n <= 0", () => {
    expect(drawCast("food", 0, mulberry32(5))).toEqual([]);
    expect(drawCast("food", -3, mulberry32(5))).toEqual([]);
  });

  it("floors a fractional n rather than returning a ragged array", () => {
    expect(drawCast("food", 2.9, mulberry32(6))).toHaveLength(2);
  });

  it("defaults its rng to Math.random when omitted", () => {
    const drawn = drawCast("animals", 3);
    expect(drawn).toHaveLength(3);
    expect(new Set(drawn.map((i) => i.emoji)).size).toBe(3);
  });
});
