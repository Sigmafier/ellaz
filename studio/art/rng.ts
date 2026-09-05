// A seeded generator, so a style that jitters (crayon, paper grain)
// renders the SAME bytes for the same seed. Exports and gallery shots depend
// on that: a diff between two runs must mean the art changed, never that the
// dice did. mulberry32 - 32-bit state, good enough distribution, six lines.

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable seed from a string, so `rngFor("paper:brawl-room")` is repeatable. */
export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const rngFor = (text: string): Rng => mulberry32(seedFrom(text));
