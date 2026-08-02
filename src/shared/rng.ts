// Canonical randomness helpers — the single copy for every game.
//
// Games keep their logic PURE and deterministic by taking an injectable `rng`.
// The convention here matches every existing game signature (`newGame(faces,
// rng = Math.random)`): the rng parameter goes LAST and defaults to
// `Math.random`, so a game can adopt these with a pure import swap and zero
// call-site churn.
//
// For a reproducible run (tests, daily puzzles, replay), build a generator with
// `mulberry32(seedFrom("level-3"))` and pass it in.

/**
 * Mulberry32 — a small, fast, well-distributed 32-bit PRNG.
 * Returns a generator producing values in [0, 1). The same seed always replays
 * the same sequence, which is what makes seeded puzzles reproducible.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hash a string into a 32-bit unsigned integer seed (xmur3 mixing step).
 * Stable across runs and platforms, and order-sensitive — "ab" and "ba" differ.
 * Pair with `mulberry32` to turn any label into a reproducible generator.
 */
export function seedFrom(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Random integer in [min, max] — INCLUSIVE of both bounds. */
export function randInt(min: number, max: number, rng: () => number = Math.random): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** A random element of `arr`. */
export function pick<T>(arr: readonly T[], rng: () => number = Math.random): T {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Fisher-Yates shuffle — NON-MUTATING: returns a new array and leaves the input
 * untouched. Walks descending (i from length-1 down to 1) because that is the
 * exact draw order every game's former private copy used; keeping it identical
 * means migrating a game cannot change any seeded permutation.
 */
export function shuffle<T>(arr: readonly T[], rng: () => number = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
