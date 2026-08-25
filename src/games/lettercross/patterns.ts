/**
 * Lettercross - the questions a bonus screen asks the DICTIONARY. PURE: no DOM,
 * no React, no timers.
 *
 * Four of BONUS's five bonus screens put a word on the screen with something
 * taken out of it, and every one of them needs the same two questions answered:
 * which letters turn this gap into a real word, and is this arrangement a real
 * word at all. This file is where those are asked, so that three rounds share
 * one answer rather than three.
 *
 * IT ASKS `words.ts` AND NEVER SHOWS IT. That is the whole split, and it is
 * written out at the top of `puzzleWords.ts`: the dictionary JUDGES, the pool
 * SHOWS. Nothing here returns a word to put on a screen - `solvers` returns
 * letters and `isWord` returns a boolean. A round that wants a word to display
 * takes it from the pool it was built from.
 */
import { WORDS } from "./words";

export const AZ = "abcdefghijklmnopqrstuvwxyz".split("");

/** The same word with position `i` replaced by a gap. */
export const blank = (w: string, i: number) => `${w.slice(0, i)}_${w.slice(i + 1)}`;

/** The first gap in `p`, filled with `c`. */
export const fill = (p: string, c: string) => p.replace("_", c);

/** Is this arrangement of letters a real word? Judging only - never a display. */
export const isWord = (w: string) => WORDS.has(w);

/**
 * Every letter that turns EVERY one of these single-gap patterns into a real
 * word - asked of the DICTIONARY, never of the pool. A puzzle is only fair when
 * its answer is the only one a player could defend, and "defend" means with a
 * word they know rather than with a word on our short list.
 */
export function solvers(patterns: readonly string[]): string[] {
  return AZ.filter((c) => patterns.every((p) => WORDS.has(fill(p, c))));
}

/** Fisher-Yates on a copy, so nothing here mutates a shared array. */
export function shuffled<T>(xs: readonly T[], rng: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** The letters of a word, sorted - two words are anagrams when these match. */
export const letterKey = (w: string) => [...w].sort().join("");
