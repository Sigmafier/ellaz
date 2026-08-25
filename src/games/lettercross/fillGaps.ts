/**
 * Lettercross - "fill the missing letters in the word in front of you". PURE:
 * no DOM, no React, no timers.
 *
 * The fourth of BONUS's five bonus screens, and the first one it gave NO
 * numbers for - the record has a clock and a price for the other four and a "?"
 * for this. So both are borrowed rather than invented, and each borrowing is
 * named where it happens: the clock below, the price in `fillQuality`.
 *
 * TWO GAPS, and the count is a measurement rather than a taste. Asked of the
 * 346-word pool, how many blanked patterns have EXACTLY ONE dictionary answer:
 *
 *   1 gap    499 patterns   - but that IS the shared-letter round with one word
 *   2 gaps   275 patterns   - 85 five-letter, 190 six-letter
 *   3 gaps    39 patterns   - 36 of them six-letter, so the round repeats itself
 *
 * One gap is disqualified on design rather than on supply: a single missing
 * letter in a single word is `sharedLetter.ts` with the other lines deleted, so
 * two of the five screens would be the same screen. Three is disqualified on
 * supply - 39 puzzles is a round a child sees twice in an evening.
 *
 * Note what the 2-gap row does NOT contain: nothing shorter than five letters.
 * Take two letters out of `frog` and what is left cannot single out a word, so
 * the generator never has to exclude short words - the uniqueness test does it.
 *
 * EXACTLY ONE ANSWER IS WHAT MAKES THE GENEROUS RULE AND THE STRICT RULE THE
 * SAME RULE. A player who fills the gaps with some other real word has not
 * cheated and must not be told no; a round that only accepts the word it was
 * thinking of would refuse them. Requiring uniqueness up front means there is no
 * other real word, so "accept any word" and "accept the answer" cannot disagree
 * and the round needs only one of them.
 *
 * The two lists are `sharedLetter.ts`'s, for its reasons: the word SHOWN comes
 * from `puzzleWords.ts`, the answer is CHECKED against `words.ts`.
 */
import { PUZZLE_WORDS } from "./puzzleWords";
import { AZ, isWord, shuffled } from "./patterns";
import { MEDIUM_Q } from "./bonus";

/** How many letters to offer - the same row `sharedLetter.ts` draws. */
export const CHOICES = 8;

/** How many letters are taken out. See the measurement above. */
export const GAPS = 2;

/**
 * BORROWED FROM THE TWO-WORD SCREEN, because BONUS recorded no clock for this
 * one. That screen asks a player to read two short words and settle on one
 * letter in 20s; this asks them to read one short word and settle on two. The
 * shapes are close enough that inventing a third number would be pretending to
 * know something.
 */
export const FILL_MS = 20_000;

export type FillPuzzle = {
  /** The answer, from the pool - the word this round may put on a screen. */
  readonly word: string;
  /** The same word with `GAPS` letters replaced by "_". */
  readonly pattern: string;
  /** Where the gaps are, ascending - the order they fill in. */
  readonly gaps: readonly number[];
  /** Every answer letter, plus near misses, shuffled. */
  readonly choices: readonly string[];
};

/** Pool words long enough that two gaps can still leave a unique answer. */
const CANDIDATES = PUZZLE_WORDS.filter((w) => w.length >= GAPS + 3);

/**
 * Every real word this pattern could be. Walks the gaps rather than the
 * dictionary: 26^GAPS lookups against a Set, instead of 28,515 string compares.
 */
export function answersFor(pattern: string): string[] {
  const gaps = [...pattern].map((c, i) => (c === "_" ? i : -1)).filter((i) => i >= 0);
  const out: string[] = [];
  const walk = (k: number, cur: string[]) => {
    if (k === gaps.length) {
      const w = cur.join("");
      if (isWord(w)) out.push(w);
      return;
    }
    for (const c of AZ) { cur[gaps[k]] = c; walk(k + 1, cur); }
  };
  walk(0, [...pattern]);
  return out;
}

/** Which letters ever stand at a given position in a pool word of a given length. */
function lettersByPosition(): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const w of PUZZLE_WORDS) {
    for (let i = 0; i < w.length; i++) {
      const k = `${w.length}:${i}`;
      const seen = m.get(k);
      if (!seen) m.set(k, [w[i]]);
      else if (!seen.includes(w[i])) seen.push(w[i]);
    }
  }
  return m;
}
const AT_POSITION = lettersByPosition();

/**
 * The letters to offer.
 *
 * THERE IS NO SUCH THING AS A NEAR MISS ON THIS ROUND, and that is a theorem
 * rather than a shortcoming - it is worth reading before "improving" the row.
 *
 * The obvious decoy is a letter that would complete ONE gap with the other one
 * already correct. That set is always EMPTY here. Filling the other gap with its
 * true letter and finding some letter `c` that completes the rest gives a real
 * word which matches the whole pattern - so it is an answer of the pattern, and
 * the pattern was chosen to have exactly one. Measured, because a theorem you
 * have not run is a belief: 400 single-gap completions across 200 puzzles, zero
 * alternatives. `fill-gaps.test.ts` pins it.
 *
 * So the row cannot be made to argue with the player, and the round is not
 * elimination - it is RECOGNITION. `n_g_t` is a question about whether you can
 * see `night`, which is the right question to ask a five-year-old and the reason
 * this screen is in a children's game at all. The row's job is to be a keyboard
 * small enough for a phone.
 *
 * WHICH IS WHY THE PADDING IS NOT RANDOM. Eight letters drawn uniformly from the
 * alphabet arrive carrying `q`, `x` and `z` about a third of the time, and a row
 * with three impossible letters in it has quietly narrowed itself to five. The
 * decoys are drawn from the letters that really do stand at those positions in
 * words of that length - 10 to 20 of them per position - so every letter in the
 * row looks like it belongs.
 *
 * Both answer letters go in first and they may be the SAME letter - `_ipp_r`
 * wants two p's from one button. The row is a set of letters rather than a
 * letter per gap, so a repeat costs a slot instead of taking two.
 */
function choicesFor(word: string, gaps: readonly number[], rng: () => number): string[] {
  const picked = new Set<string>(gaps.map((i) => word[i]));
  const plausible = new Set<string>();
  for (const i of gaps) for (const c of AT_POSITION.get(`${word.length}:${i}`) ?? []) plausible.add(c);
  for (const c of shuffled([...plausible], rng)) {
    if (picked.size >= CHOICES) break;
    picked.add(c);
  }
  // Only if a position is so narrow it cannot fill the row, so the row's SIZE
  // never leaks how tight the puzzle is.
  for (const c of shuffled(AZ, rng)) {
    if (picked.size >= CHOICES) break;
    picked.add(c);
  }
  return shuffled([...picked], rng);
}

/**
 * A word with `GAPS` letters taken out and EXACTLY ONE real word that fits.
 *
 * A bounded random search, then an exhaustive walk over every word and every
 * pair of positions. The walk is what makes `undefined` mean "this pool has no
 * such puzzle" rather than "the search gave up" - and the shipped pool has 275,
 * pinned over 300 seeds in `fill-gaps.test.ts`.
 *
 * It stays in the type anyway, for `sharedLetter.ts`'s reason: a caller that
 * cannot express "there was no puzzle" is a caller that will one day throw
 * inside a bonus round, in front of a child who had just won it.
 */
export function makeFill(rng: () => number = Math.random): FillPuzzle | undefined {
  const cut = (w: string, gaps: readonly number[]) =>
    [...w].map((c, i) => (gaps.includes(i) ? "_" : c)).join("");

  const build = (w: string, gaps: number[]): FillPuzzle | undefined => {
    const pattern = cut(w, gaps);
    const answers = answersFor(pattern);
    if (answers.length !== 1 || answers[0] !== w) return undefined;
    return { word: w, pattern, gaps, choices: choicesFor(w, gaps, rng) };
  };

  for (let attempt = 0; attempt < 400; attempt++) {
    const w = CANDIDATES[Math.floor(rng() * CANDIDATES.length)];
    if (!w) break;
    const gaps = shuffled([...w].map((_, i) => i), rng).slice(0, GAPS).sort((a, b) => a - b);
    const made = build(w, gaps);
    if (made) return made;
  }

  for (const w of shuffled(CANDIDATES, rng)) {
    for (let a = 0; a < w.length; a++) {
      for (let b = a + 1; b < w.length; b++) {
        const made = build(w, [a, b]);
        if (made) return made;
      }
    }
  }
  return undefined;
}

/**
 * HOW WELL DID THAT GO - and here it is only whether it went at all.
 *
 * BONUS PRICED THIS SCREEN NOWHERE, so this takes the SMALLER of the two prices
 * it did record - 40 rather than 100 - and never scales. Two reasons, and the
 * second is the one that decides it.
 *
 * The shape argues for it: one short word and two gaps is the two-word screen's
 * question rather than the three-word screen's, so it is priced like the two.
 *
 * And the direction of the guess is not symmetric. Guessing the price UP hands a
 * child coins the original never promised and quietly re-tunes an economy
 * `economy.ts` owns; guessing it DOWN costs them the difference between two
 * prizes on a screen they still won. When the record is silent, the cheap wrong
 * answer is the one to pick.
 *
 * Not solved pays the floor rather than nothing, for `bonus.ts`'s reason: this
 * platform does not punish, and a player who reached the box with a real word
 * has already earned something.
 */
export function fillQuality(solved: boolean): number {
  return solved ? MEDIUM_Q : 0;
}
