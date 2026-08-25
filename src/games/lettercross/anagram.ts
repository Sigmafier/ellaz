/**
 * Lettercross - "build a word from ALL the letters in front of you". PURE: no
 * DOM, no React, no timers.
 *
 * The fifth and last of BONUS's five bonus screens, and the only one it priced
 * by SIZE rather than flat:
 *
 *   ?  build a word from all the letters in front of you   30-100 pts by length
 *
 * So the price gradient here is the original's own, unlike `fillGaps.ts` where
 * the record is silent and the price is borrowed. Only the clock is borrowed -
 * see `ANAGRAM_MS`.
 *
 * ALL THE LETTERS, WHICHEVER WORD YOU MAKE OF THEM. The ask names the letters
 * and not a particular word, so any real word using every tile is right. That is
 * not a generosity bolted on: 133 of the 252 words this round can draw share
 * their letters with another dictionary word, so a rule that only accepted the
 * word we happened to scramble would be telling a player who built `stale` out
 * of `least` that they were wrong.
 *
 * Which is also why the two lists sit the other way round from every other
 * screen here, and this is the subtle part. Elsewhere the pool decides what is
 * SHOWN and the dictionary decides what is TRUE. Here nothing shows a word at
 * all until the round is over - the screen holds loose letters - so the pool's
 * job is only to pick a set of letters worth handing over, and the dictionary
 * judges alone. The pool word comes back at the end, for the reveal, because
 * that reveal is a word on a screen and `puzzleWords.ts` owns those.
 *
 * THE SCRAMBLE MUST NOT ALREADY BE A WORD. `read` shuffled to `dear` is a round
 * that is over before the clock starts, and it does not read as a bug - it reads
 * as a child being quick. Every pool word has at least one ordering that is not
 * a word, measured across all four lengths, so this is always satisfiable.
 */
import { PUZZLE_WORDS } from "./puzzleWords";
import { isWord, letterKey } from "./patterns";
import { pick, shuffle } from "@shared/rng";
import { HARD_Q, MEDIUM_Q } from "./bonus";

/**
 * Four to six letters.
 *
 * THREE IS EXCLUDED, and not for being easy - for being already solved. 55 of
 * the pool's 94 three-letter words share their letters with another word, so a
 * shuffle of `cat` lands on `act` about as often as not and the round opens on
 * its own answer. Seven and up simply are not in the pool.
 *
 * Measured supply: 114 four-letter words, 101 five, 37 six.
 */
export const MIN_LEN = 4;
export const MAX_LEN = 6;

/**
 * BORROWED FROM THE THREE-WORD SCREEN, because BONUS recorded no clock for this
 * one either. Of the four screens it did time, that is the one whose top price
 * is also 100, which is the only thread between them the record actually
 * supplies. 30s is also the more generous of the two available numbers, and this
 * is the round where the player has to physically arrange six tiles rather than
 * tap one letter - so where the evidence runs out, the extra ten seconds go to
 * the round that spends time on handling.
 */
export const ANAGRAM_MS = 30_000;

export type AnagramPuzzle = {
  /** The pool word the letters came from - shown only at the reveal. */
  readonly word: string;
  /** The letters as they are laid out, which is never itself a word. */
  readonly letters: readonly string[];
};

const CANDIDATES = PUZZLE_WORDS.filter((w) => w.length >= MIN_LEN && w.length <= MAX_LEN);

/**
 * Is this arrangement a right answer - uses EVERY letter, and is a real word?
 *
 * Both halves are checked even though the screen can only build an arrangement
 * out of the tiles it was given. A pure function that trusts its caller to have
 * made the multiset right is a pure function that stops being true the moment a
 * second caller exists.
 */
export function isAnswer(letters: readonly string[], guess: string): boolean {
  if (guess.length !== letters.length) return false;
  if (letterKey(guess) !== letterKey(letters.join(""))) return false;
  return isWord(guess);
}

/** Every real word these letters spell. Used by the tests, never by the screen. */
export function answersFor(letters: readonly string[]): string[] {
  const k = letterKey(letters.join(""));
  const out = new Set<string>();
  const walk = (cur: string[], rest: string[]) => {
    if (!rest.length) { const w = cur.join(""); if (isWord(w)) out.add(w); return; }
    for (let i = 0; i < rest.length; i++) walk([...cur, rest[i]], [...rest.slice(0, i), ...rest.slice(i + 1)]);
  };
  walk([], [...letters]);
  return [...out].filter((w) => letterKey(w) === k);
}

/**
 * A word's letters, laid out in an order that is not a word.
 *
 * Bounded shuffles first, then an exhaustive walk over the orderings, so
 * `undefined` means "this word has no non-word ordering" rather than "the
 * shuffle was unlucky". Measured: no pool word is in that state, and
 * `anagram.test.ts` pins it across the whole pool rather than over seeds -
 * the question is about each word, so it can be asked of every one of them.
 */
export function makeAnagram(rng: () => number = Math.random): AnagramPuzzle | undefined {
  const chosen = pick(CANDIDATES, rng);
  const order = scramble(chosen, rng);
  return order ? { word: chosen, letters: order } : undefined;
}

export function scramble(word: string, rng: () => number = Math.random): string[] | undefined {
  for (let attempt = 0; attempt < 60; attempt++) {
    const order = shuffle([...word], rng);
    if (!isWord(order.join(""))) return order;
  }
  const walk = (cur: string[], rest: string[]): string[] | undefined => {
    if (!rest.length) return isWord(cur.join("")) ? undefined : cur;
    for (let i = 0; i < rest.length; i++) {
      const got = walk([...cur, rest[i]], [...rest.slice(0, i), ...rest.slice(i + 1)]);
      if (got) return got;
    }
    return undefined;
  };
  return walk([], [...word]);
}

/**
 * HOW WELL DID THAT GO -> the original's own gradient, as far as three tiers
 * reach.
 *
 * BONUS paid 30 to 100 BY LENGTH, so length is the axis here because the record
 * says so - this is the one screen where the gradient is not a guess. What is
 * ours is the granularity: the original had a points scale and `economy.ts` has
 * three tiers, one of which is the floor a LOST round already pays. So the
 * gradient lands on the two that are left.
 *
 * A four-letter solve therefore pays the smallest tier a win can pay, which is
 * the honest reading of a screen whose own floor price (30) is below the flat
 * price of the two-word screen (40).
 *
 * The player does not choose the length, so this is a prize the draw decides -
 * exactly as it did in 1993. Not solved pays the floor, per `bonus.ts`.
 */
export function anagramQuality(length: number, solved: boolean): number {
  if (!solved) return 0;
  return length >= 5 ? HARD_Q : MEDIUM_Q;
}
