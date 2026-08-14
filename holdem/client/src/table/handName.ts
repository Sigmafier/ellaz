// Naming the winning hand — and finding which five cards made it.
//
// This is entirely CLIENT-SIDE and needs no protocol change, which is the whole
// reason it is here: at a showdown the client already holds the winner's hole
// cards (the ShowdownReveal events) and the board, and `evaluate` lives in
// @shared. The engine's own comment says so: "Two Pair, Aces and Nines is the
// client's job".
//
// The one case with no name is the honest one. When everybody folds there is no
// showdown, no revealed cards, and no hand — `handName` returns null and the
// banner says the pot was won uncontested. Naming a hand nobody showed would be
// inventing information, and at a poker table that is not a cosmetic error.

import type { Card } from "@shared/engine/cards";
import { rankOf } from "@shared/engine/cards";
import { CATEGORY, describe, evaluate, rank5, type Category } from "@shared/engine/evaluator";
import type { Locale } from "../i18n";

/** Card rank symbols, index 0 = deuce … 12 = ace. Same order as `rankOf`. */
const SYMBOL = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

/** English singular and plural, because "Pair of aces" reads and "Pair of A" does not. */
const ONE = ["two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "jack", "queen", "king", "ace"];
const MANY = ["twos", "threes", "fours", "fives", "sixes", "sevens", "eights", "nines", "tens", "jacks", "queens", "kings", "aces"];

/**
 * Hebrew uses the card SYMBOL for the specific ranks rather than a spelled-out
 * plural. That is what Israeli players actually write ("זוג אסים" for aces, but
 * "זוג 9" for nines), and inventing Hebrew plurals for the number cards would
 * produce confident nonsense in a language the operator reads and I do not.
 */
const HE_CATEGORY: Record<Category, string> = {
  [CATEGORY.highCard]: "קלף גבוה",
  [CATEGORY.pair]: "זוג",
  [CATEGORY.twoPair]: "שתי זוגות",
  [CATEGORY.trips]: "שלושה",
  [CATEGORY.straight]: "רצף",
  [CATEGORY.flush]: "פלאש",
  [CATEGORY.fullHouse]: "פול האוס",
  [CATEGORY.quads]: "ארבעה",
  [CATEGORY.straightFlush]: "רצף פלאש",
};

/** The 21 ways to choose 5 of 7. Built once; `evaluate` keeps its own copy. */
const C57: number[][] = (() => {
  const out: number[][] = [];
  for (let a = 0; a < 3; a++)
    for (let b = a + 1; b < 4; b++)
      for (let c = b + 1; c < 5; c++)
        for (let d = c + 1; d < 6; d++)
          for (let e = d + 1; e < 7; e++) out.push([a, b, c, d, e]);
  return out;
})();

/**
 * The five cards that actually made the hand, for highlighting.
 *
 * Returned as the cards themselves rather than indices, so a caller comparing
 * against the board does not have to know how the seven were concatenated.
 * Fewer than 7 cards (an all-in on the flop) falls back to all of them.
 */
export function best5(all: readonly Card[]): Card[] {
  if (all.length < 5) return [...all];
  if (all.length === 5) return [...all];
  const sets = all.length === 7 ? C57 : combos(all.length);
  let bestScore = -1;
  let best: Card[] = [];
  const buf: Card[] = new Array(5);
  for (const idxs of sets) {
    for (let i = 0; i < 5; i++) buf[i] = all[idxs[i]];
    const s = rank5(buf);
    if (s > bestScore) {
      bestScore = s;
      best = [...buf];
    }
  }
  return best;
}

function combos(n: number): number[][] {
  const out: number[][] = [];
  for (let a = 0; a < n - 4; a++)
    for (let b = a + 1; b < n - 3; b++)
      for (let c = b + 1; c < n - 2; c++)
        for (let d = c + 1; d < n - 1; d++)
          for (let e = d + 1; e < n; e++) out.push([a, b, c, d, e]);
  return out;
}

/**
 * Name the best hand among these cards, in this language.
 *
 * `null` when there are not five cards to judge — which at a real table means
 * nobody showed, not that something went wrong.
 */
export function handName(all: readonly Card[], locale: Locale): string | null {
  if (all.length < 5) return null;
  const { category, ranks } = describe(evaluate(all));
  const hi = ranks[0] ?? 0;
  const lo = ranks[1] ?? 0;

  if (locale === "he") {
    const c = HE_CATEGORY[category];
    switch (category) {
      case CATEGORY.highCard:
      case CATEGORY.flush:
      case CATEGORY.straight:
      case CATEGORY.straightFlush:
        return `${c} ${SYMBOL[hi]}`;
      case CATEGORY.twoPair:
        return `${c}: ${SYMBOL[hi]} ו-${SYMBOL[lo]}`;
      case CATEGORY.fullHouse:
        return `${c}: ${SYMBOL[hi]} על ${SYMBOL[lo]}`;
      default:
        return `${c} ${SYMBOL[hi]}`;
    }
  }

  switch (category) {
    case CATEGORY.highCard:
      return `${cap(ONE[hi])} high`;
    case CATEGORY.pair:
      return `Pair of ${MANY[hi]}`;
    case CATEGORY.twoPair:
      return `Two pair, ${MANY[hi]} and ${MANY[lo]}`;
    case CATEGORY.trips:
      return `Three ${MANY[hi]}`;
    case CATEGORY.straight:
      return `Straight to the ${ONE[hi]}`;
    case CATEGORY.flush:
      return `Flush, ${ONE[hi]} high`;
    case CATEGORY.fullHouse:
      return `Full house, ${MANY[hi]} over ${MANY[lo]}`;
    case CATEGORY.quads:
      return `Four ${MANY[hi]}`;
    case CATEGORY.straightFlush:
      // 12 is the ace, and an ace-high straight flush has a name of its own.
      return hi === 12 ? "Royal flush" : `Straight flush to the ${ONE[hi]}`;
  }
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Exported for the test, which asserts the tables line up with `rankOf`. */
export const _ranks = { SYMBOL, ONE, MANY, rankOf };
