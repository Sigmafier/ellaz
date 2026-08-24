/**
 * Lettercross - the bonus round behind a prize box: YOUR OWN BOARD.
 *
 * PURE: no DOM, no React, no timers, so `bonusBoard.test.ts` runs the real
 * rules and the renderer only draws them. Same split as `boxes.ts` and for the
 * same reason.
 *
 * WHAT THIS IS A RECREATION OF, and it is not a guess. The 1993 Hebrew game
 * BONUS (מטח / CET) put a word puzzle behind every bonus square, and its own
 * executable carries the instruction for this one, verbatim:
 *
 *   "ב-__ שניות עליך להרכיב תשבץ ממספר רב של אותיות ככל האפשר.
 *    הבונוס הוא - סך כל הנקודות של המלים שהרכבת."
 *   (In N seconds build a crossword from as many letters as possible.
 *    The bonus is the total points of the words you built.)
 *
 * Its own board was 5 x 10 with 16 dealt letters and one minute, and a round
 * scored ZERO if even one word on it was illegal. Four of those five numbers
 * are kept below. The width is not: nine is our main board's width, so a cell
 * here is exactly the cell the player was just tapping, which is the half of
 * "feels like the original" that a phone can actually deliver.
 *
 * THE ARCADE ROUNDS THIS REPLACED WERE THE WRONG GENRE. `bonus.ts` used to
 * argue, in a comment, that "a word puzzle inside a word puzzle is not a break
 * from anything". That was a real design position and the artifact refutes it:
 * every one of BONUS's five bonus screens is a word game, and the reason it
 * works is that the bonus is not a BREAK, it is a second helping. The comment
 * is gone rather than left standing as a second answer.
 */
import { LETTER_VALUE, type Scored } from "./logic";
import { WORDS } from "./words";

/** Columns. NINE, matching the main board, so the cell size does not change. */
export const BW = 9;
/** Rows. FIVE, which is BONUS's own, and what makes this a strip not a board. */
export const BH = 5;
/** Letters dealt, repeats allowed - BONUS's number. */
export const BONUS_TILES = 16;
/** One minute. BONUS's number, and the reason this round has a clock at all. */
export const BONUS_MS = 60_000;

/** A square: a lowercase letter, or empty. No wilds - the deal is what it is. */
export type MiniCell = string | null;
export type MiniBoard = readonly MiniCell[];

export const emptyMini = (): MiniBoard => Array<MiniCell>(BW * BH).fill(null);

/**
 * THE DEAL. Weighted like the main bag, so the letters feel like the game's
 * letters rather than a fresh alphabet, and repeats are allowed because
 * BONUS's own description says some may appear more than once.
 *
 * THE VOWEL FLOOR IS THE WHOLE POINT OF THIS FUNCTION. Sixteen independent
 * draws from an English distribution hand out four vowels often enough to
 * matter, and a rack that cannot spell anything turns the biggest prize in the
 * game into sixty seconds of being told no. It is a FLOOR and not a quota: a
 * generous deal is left alone.
 */
const POOL = "eeeeeeeeeeaaaaaaaiiiiiiiooooooonnnnnrrrrrtttttsssssllllluuuuddddccchhhmmggppbbyyffwwvkjxqz";
const VOWELS = "aeiou";
export const MIN_VOWELS = 5;

export function dealTiles(rng: () => number = Math.random, n: number = BONUS_TILES): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(POOL[Math.floor(rng() * POOL.length)]);
  let short = MIN_VOWELS - out.filter((c) => VOWELS.includes(c)).length;
  for (let i = 0; i < out.length && short > 0; i++) {
    if (VOWELS.includes(out[i])) continue;
    out[i] = VOWELS[Math.floor(rng() * VOWELS.length)];
    short--;
  }
  return out;
}

/**
 * Every run of two or more letters on the strip, across and down.
 *
 * It does NOT reuse `validate` from `logic.ts`, and that is deliberate rather
 * than lazy: that function is written against a square `SIZE` board and owns
 * the main game's connection and first-word rules, none of which apply here -
 * inside a bonus you lay words "as you wish". Parameterising it would put the
 * main game's core one typo away from a change made for a mini-game. What IS
 * shared is the only part that must never disagree: `WORDS` and `LETTER_VALUE`.
 */
function runsOf(board: MiniBoard): number[][] {
  const runs: number[][] = [];
  for (let r = 0; r < BH; r++) {
    let run: number[] = [];
    for (let c = 0; c <= BW; c++) {
      const i = r * BW + c;
      if (c < BW && board[i]) run.push(i);
      else { if (run.length >= 2) runs.push(run); run = []; }
    }
  }
  for (let c = 0; c < BW; c++) {
    let run: number[] = [];
    for (let r = 0; r <= BH; r++) {
      const i = r * BW + c;
      if (r < BH && board[i]) run.push(i);
      else { if (run.length >= 2) runs.push(run); run = []; }
    }
  }
  return runs;
}

export type MiniScore = {
  readonly words: readonly Scored[];
  /** Every run that is not a word. Non-empty means `total` is 0. */
  readonly bad: readonly string[];
  readonly total: number;
};

/**
 * SCORE THE WHOLE STRIP AT THE END, all or nothing.
 *
 * BONUS judged this round once, when the minute ran out, and paid nothing at
 * all if a single word on the board was illegal. That rule is what makes it the
 * biggest prize in the game rather than a free handful of points, so it is kept
 * exactly - and it is why nothing here refuses a placement while the clock is
 * running. A round that judged every word as it landed would have no risk in it
 * and would not be this round.
 *
 * A LONE LETTER IS NOT A WORD AND IS NOT A CRIME. A tile with no neighbour
 * forms no run, so it scores nothing and spoils nothing. Treating it as an
 * illegal word would make an abandoned tile cost the player everything, which
 * is a rule nobody would guess and one BONUS did not have.
 */
export function scoreMini(board: MiniBoard): MiniScore {
  const words: Scored[] = [];
  const bad: string[] = [];
  for (const run of runsOf(board)) {
    const word = run.map((i) => board[i]!).join("");
    if (!WORDS.has(word)) { bad.push(word); continue; }
    let sum = 0;
    for (const i of run) sum += LETTER_VALUE[board[i]!] ?? 0;
    words.push({ word, score: sum });
  }
  const total = bad.length ? 0 : words.reduce((n, w) => n + w.score, 0);
  return { words, bad, total };
}

/**
 * POINTS -> QUALITY, which `tierOf` alone turns into a tier.
 *
 * FOURTEEN, and the number was argued from what a thumb can do in a minute
 * rather than from the points. Our letters are cheap - `cat`, `note` and `star`
 * are four points each off common letters - and placing a four-letter word is
 * eight taps, so sixty seconds is three or four words for someone who is quick.
 * At 14 the ladder reads exactly like that: one word easy, two medium, three
 * hard. `bonusBoard.test.ts` pins the ladder against REAL words rather than
 * against the constant, so lowering it to flatter a player shows up as a
 * changed rung and not as a quiet re-tune.
 *
 * A ZEROED ROUND STILL PAYS THE FLOOR. `tierOf` has no miss, so an illegal word
 * costs the player the UPSIDE and never the prize for having reached the box -
 * this platform does not punish, and BONUS's all-or-nothing rule is about how
 * much you win, not about whether reaching a bonus square was worth it.
 */
export const MINI_TARGET = 14;
export function miniQuality(total: number): number {
  return Math.min(1, Math.max(0, total) / MINI_TARGET);
}
