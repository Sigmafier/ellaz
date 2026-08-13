// Hand evaluator — best 5 of N, variant-ready.
//
// `rank5` scores exactly five cards into one comparable 32-bit number:
//   score = category << 20 | five ranks packed 4 bits each, most significant
//   first, ordered by how they break ties for that category.
// Higher score wins, equal score splits — no secondary comparison anywhere.
//
// `evaluate` takes any N >= 5 cards and returns the best 5-card score. NLHE
// hands are 7 cards (21 combinations); Omaha later reuses rank5 with its own
// exactly-2-plus-exactly-3 combination walk, which is why the combination walk
// is not fused into the scorer.

import type { Card } from "./cards";
import { rankOf, suitOf } from "./cards";

export const CATEGORY = {
  highCard: 0,
  pair: 1,
  twoPair: 2,
  trips: 3,
  straight: 4,
  flush: 5,
  fullHouse: 6,
  quads: 7,
  straightFlush: 8,
} as const;

export type Category = (typeof CATEGORY)[keyof typeof CATEGORY];

function pack(category: number, ranks: number[]): number {
  // ranks: up to 5 entries, most significant first; pad with 0.
  let v = category << 20;
  for (let i = 0; i < 5; i++) v |= (ranks[i] ?? 0) << (16 - 4 * i);
  return v;
}

/**
 * If the given DISTINCT ranks (descending) contain a straight, return its high
 * rank, else -1. The wheel (A-5) reports high rank 3 (the five), which is what
 * makes it the lowest straight.
 */
function straightHigh(desc: number[]): number {
  // desc is distinct, descending. Ace (12) also plays low as -1.
  const withWheelAce = desc.includes(12) ? [...desc, -1] : desc;
  let run = 1;
  for (let i = 1; i < withWheelAce.length; i++) {
    if (withWheelAce[i] === withWheelAce[i - 1] - 1) {
      run++;
      if (run >= 5) return withWheelAce[i] + 4;
    } else {
      run = 1;
    }
  }
  return -1;
}

/** Score exactly five cards. */
export function rank5(c5: readonly Card[]): number {
  // counts per rank
  const count = new Array<number>(13).fill(0);
  for (const c of c5) count[rankOf(c)]++;
  const flush = c5.every((c) => suitOf(c) === suitOf(c5[0]));

  // distinct ranks descending
  const distinct: number[] = [];
  for (let r = 12; r >= 0; r--) if (count[r] > 0) distinct.push(r);

  const sHigh = distinct.length === 5 ? straightHigh(distinct) : -1;
  if (flush && sHigh >= 0) return pack(CATEGORY.straightFlush, [sHigh]);

  // group ranks by multiplicity: higher count first, then higher rank first
  const groups = distinct
    .map((r) => ({ r, n: count[r] }))
    .sort((a, b) => b.n - a.n || b.r - a.r);

  if (groups[0].n === 4) return pack(CATEGORY.quads, [groups[0].r, groups[1].r]);
  if (groups[0].n === 3 && groups[1].n === 2)
    return pack(CATEGORY.fullHouse, [groups[0].r, groups[1].r]);
  if (flush) return pack(CATEGORY.flush, distinct);
  if (sHigh >= 0) return pack(CATEGORY.straight, [sHigh]);
  if (groups[0].n === 3)
    return pack(CATEGORY.trips, [groups[0].r, groups[1].r, groups[2].r]);
  if (groups[0].n === 2 && groups[1].n === 2)
    return pack(CATEGORY.twoPair, [groups[0].r, groups[1].r, groups[2].r]);
  if (groups[0].n === 2)
    return pack(CATEGORY.pair, [groups[0].r, groups[1].r, groups[2].r, groups[3].r]);
  return pack(CATEGORY.highCard, distinct);
}

// Precomputed 5-of-7 index table — the hot path at showdown.
const COMBOS_5_OF_7: number[][] = (() => {
  const out: number[][] = [];
  for (let a = 0; a < 3; a++)
    for (let b = a + 1; b < 4; b++)
      for (let c = b + 1; c < 5; c++)
        for (let d = c + 1; d < 6; d++)
          for (let e = d + 1; e < 7; e++) out.push([a, b, c, d, e]);
  return out;
})();

function* combos5(n: number): Generator<number[]> {
  const idx = [0, 1, 2, 3, 4];
  while (true) {
    yield idx.slice();
    let i = 4;
    while (i >= 0 && idx[i] === n - 5 + i) i--;
    if (i < 0) return;
    idx[i]++;
    for (let j = i + 1; j < 5; j++) idx[j] = idx[j - 1] + 1;
  }
}

/** Best 5-card score among any N >= 5 cards. */
export function evaluate(all: readonly Card[]): number {
  if (all.length === 5) return rank5(all);
  if (all.length < 5) throw new Error(`evaluate needs >= 5 cards, got ${all.length}`);
  let best = -1;
  const pickBuf: Card[] = new Array(5);
  const indexSets = all.length === 7 ? COMBOS_5_OF_7 : combos5(all.length);
  for (const idxs of indexSets) {
    for (let i = 0; i < 5; i++) pickBuf[i] = all[idxs[i]];
    const s = rank5(pickBuf);
    if (s > best) best = s;
  }
  return best;
}

export interface HandDescription {
  category: Category;
  /** Tie-break ranks most significant first, 0..12 (0 = deuce, 12 = ace). */
  ranks: number[];
}

/** Unpack a score for display ("Two Pair, Aces and Nines" is the client's job). */
export function describe(score: number): HandDescription {
  const category = (score >> 20) as Category;
  const ranks: number[] = [];
  for (let i = 0; i < 5; i++) ranks.push((score >> (16 - 4 * i)) & 0xf);
  // Trim trailing zero padding beyond what the category actually uses.
  const used =
    category === CATEGORY.highCard || category === CATEGORY.flush
      ? 5
      : category === CATEGORY.pair
        ? 4
        : category === CATEGORY.twoPair || category === CATEGORY.trips
          ? 3
          : category === CATEGORY.quads || category === CATEGORY.fullHouse
            ? 2
            : 1; // straight, straight flush
  return { category, ranks: ranks.slice(0, used) };
}
