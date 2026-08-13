// Randomness helpers, copied from ellaz src/shared/rng.ts (the seeded half)
// plus a crypto-backed generator for real deals.
//
// The engine takes an injectable `rng: () => number` with NO default — the
// caller must decide. Tests pass `mulberry32(seedFrom("case-17"))` for
// reproducible decks; the server passes `secureRng()` for live hands, because
// mulberry32 has 32 bits of state and a 52-card deck has ~226 bits of entropy:
// a seeded PRNG can reach at most 2^32 of the 52! orderings and its state is
// recoverable from observed outputs. A pre-existing seed is an insider vector.

/**
 * Mulberry32 — a small, fast, well-distributed 32-bit PRNG.
 * Returns a generator producing values in [0, 1). The same seed always replays
 * the same sequence. TESTS ONLY for dealing — see the header.
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

/**
 * Fisher-Yates shuffle — NON-MUTATING: returns a new array and leaves the input
 * untouched. Same descending walk as the ellaz copy so a seed replays the same
 * permutation in both codebases.
 */
export function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * A generator over [0, 1) backed by crypto.getRandomValues — the one to use for
 * live deals. Buffers 64 draws per syscall. 32 random bits per draw feeds
 * shuffle()'s `Math.floor(rng() * (i+1))`, whose modulo-ish bias at i <= 51 is
 * < 2^-26 per draw — negligible against a friendly game, and it keeps the
 * generator signature identical to the seeded one so the engine cannot tell
 * which it was handed.
 */
export function secureRng(): () => number {
  const buf = new Uint32Array(64);
  let idx = buf.length;
  return () => {
    if (idx >= buf.length) {
      crypto.getRandomValues(buf);
      idx = 0;
    }
    return buf[idx++] / 4294967296;
  };
}
