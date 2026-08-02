import { describe, it, expect } from "vitest";
import { mulberry32, seedFrom, randInt, pick, shuffle } from "./rng";

// Draw `n` values off a fresh generator for the given seed.
function draws(seed: number, n = 20): number[] {
  const r = mulberry32(seed);
  return Array.from({ length: n }, () => r());
}

describe("mulberry32", () => {
  it("is deterministic — the same seed replays the same sequence", () => {
    expect(draws(12345)).toEqual(draws(12345));
  });

  it("diverges for different seeds", () => {
    expect(draws(1)).not.toEqual(draws(2));
  });

  it("yields values inside [0, 1)", () => {
    for (const seed of [0, 1, 42, 999999, -7]) {
      for (const v of draws(seed, 200)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  it("does not return the same value every call", () => {
    const vals = draws(7, 50);
    expect(new Set(vals).size).toBeGreaterThan(1);
  });
});

describe("seedFrom", () => {
  it("is stable — the same string always gives the same seed", () => {
    expect(seedFrom("ellaz")).toBe(seedFrom("ellaz"));
    expect(seedFrom("")).toBe(seedFrom(""));
  });

  it("gives different seeds for different strings", () => {
    expect(seedFrom("cat")).not.toBe(seedFrom("dog"));
    expect(seedFrom("level-1")).not.toBe(seedFrom("level-2"));
    // near-identical strings must not collide
    expect(seedFrom("ab")).not.toBe(seedFrom("ba"));
  });

  it("returns a finite integer usable as a mulberry32 seed", () => {
    for (const s of ["", "a", "a longer seed string 🐶"]) {
      const seed = seedFrom(s);
      expect(Number.isInteger(seed)).toBe(true);
      expect(Number.isFinite(seed)).toBe(true);
    }
    // end-to-end: seedFrom → mulberry32 is reproducible
    const a = mulberry32(seedFrom("round-3"));
    const b = mulberry32(seedFrom("round-3"));
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe("randInt", () => {
  it("is INCLUSIVE of both bounds — both ends are reachable", () => {
    // rng()→0 must land on min; rng()→just under 1 must land on max.
    expect(randInt(3, 7, () => 0)).toBe(3);
    expect(randInt(3, 7, () => 0.999999)).toBe(7);
  });

  it("never escapes the range over many draws", () => {
    const r = mulberry32(2024);
    for (let i = 0; i < 2000; i++) {
      const v = randInt(0, 5, r);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(5);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("covers every value in the range, including both endpoints", () => {
    const r = mulberry32(99);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) seen.add(randInt(1, 6, r));
    expect([...seen].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("handles a single-value range", () => {
    expect(randInt(4, 4, () => 0)).toBe(4);
    expect(randInt(4, 4, () => 0.999999)).toBe(4);
  });

  it("handles negative bounds", () => {
    expect(randInt(-3, -1, () => 0)).toBe(-3);
    expect(randInt(-3, -1, () => 0.999999)).toBe(-1);
  });

  it("defaults its rng to Math.random when omitted", () => {
    for (let i = 0; i < 200; i++) {
      const v = randInt(2, 4);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(4);
    }
  });
});

describe("pick", () => {
  it("returns a member of the array", () => {
    const arr = ["a", "b", "c", "d"];
    const r = mulberry32(5);
    for (let i = 0; i < 200; i++) expect(arr).toContain(pick(arr, r));
  });

  it("can reach the first and last element", () => {
    const arr = [10, 20, 30];
    expect(pick(arr, () => 0)).toBe(10);
    expect(pick(arr, () => 0.999999)).toBe(30);
  });

  it("returns the only element of a single-item array", () => {
    expect(pick([42], () => 0.5)).toBe(42);
  });

  it("defaults its rng to Math.random when omitted", () => {
    const arr = [1, 2, 3];
    for (let i = 0; i < 100; i++) expect(arr).toContain(pick(arr));
  });
});

describe("shuffle", () => {
  it("does NOT mutate the input array", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const copy = [...input];
    shuffle(input, mulberry32(1));
    expect(input).toEqual(copy);
  });

  it("returns a new array, not the same reference", () => {
    const input = [1, 2, 3];
    expect(shuffle(input, () => 0.5)).not.toBe(input);
  });

  it("preserves the multiset — same elements, same counts", () => {
    const input = [1, 1, 2, 2, 2, 3, 4, 4];
    const out = shuffle(input, mulberry32(77));
    expect(out.length).toBe(input.length);
    expect([...out].sort()).toEqual([...input].sort());
  });

  it("is reproducible with a fixed seed", () => {
    const input = ["a", "b", "c", "d", "e", "f", "g"];
    expect(shuffle(input, mulberry32(4242))).toEqual(shuffle(input, mulberry32(4242)));
  });

  it("actually permutes — different seeds give different orders", () => {
    const input = Array.from({ length: 30 }, (_, i) => i);
    expect(shuffle(input, mulberry32(1))).not.toEqual(shuffle(input, mulberry32(2)));
  });

  it("handles empty and single-element arrays", () => {
    expect(shuffle([], () => 0.5)).toEqual([]);
    expect(shuffle([9], () => 0.5)).toEqual([9]);
  });

  it("defaults its rng to Math.random when omitted", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });

  // Behaviour lock: the games' pre-existing private copies were all descending
  // Fisher-Yates. Migrating them must not change any permutation, so the
  // canonical implementation is pinned to that exact draw order.
  it("matches the legacy per-game Fisher-Yates permutation exactly", () => {
    const legacy = <T>(arr: T[], rng: () => number): T[] => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    const input = Array.from({ length: 25 }, (_, i) => i);
    for (const seed of [0, 1, 7, 12345]) {
      expect(shuffle(input, mulberry32(seed))).toEqual(legacy(input, mulberry32(seed)));
    }
    // and for the constant rngs the existing game tests use
    expect(shuffle(input, () => 0)).toEqual(legacy(input, () => 0));
    expect(shuffle(input, () => 0.5)).toEqual(legacy(input, () => 0.5));
  });
});
