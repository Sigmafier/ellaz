import type { Locale } from "@i18n/index";
// PURE game rules. No DOM, no React, no Phaser — driven by an injectable rng
// so a round is reproducible in a test.
import { pick } from "@shared/rng";
import { EN, HE, type WordLength } from "./words";

/** How a single tile came back. */
export type Mark = "hit" | "near" | "miss";

export interface Guess {
  /** Normalised letters, one per tile. */
  letters: string[];
  marks: Mark[];
}

export interface WordState {
  /** The answer, NORMALISED. Never shown until the round is over. */
  target: string[];
  length: WordLength;
  guesses: Guess[];
  /** Letters typed but not yet submitted. */
  draft: string[];
  solved: boolean;
}

export const MAX_GUESSES = 6;

/**
 * Hebrew final letters, and their ordinary twins.
 *
 * A Hebrew letter changes shape at the end of a word — mem is מ inside and ם
 * last — and it is THE SAME LETTER. So the keyboard offers only the ordinary
 * form, every comparison runs on the ordinary form, and the final form exists
 * at exactly one moment: drawing the last tile of a row.
 *
 * Skip this and the game is quietly unwinnable. `מלון` would hold a ן the
 * keyboard cannot produce, so the answer could never be typed — a round that
 * accepts every guess, marks them all correctly, and can only ever be lost.
 */
const FINAL_TO_PLAIN: Record<string, string> = {
  "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ",
};
const PLAIN_TO_FINAL: Record<string, string> = {
  "כ": "ך", "מ": "ם", "נ": "ן", "פ": "ף", "צ": "ץ",
};

/** One letter, in its ordinary form. Anything else passes through unchanged. */
export function normalizeLetter(ch: string): string {
  return FINAL_TO_PLAIN[ch] ?? ch;
}

/** A word as an array of ordinary-form letters. */
export function normalize(word: string): string[] {
  return [...word].map(normalizeLetter);
}

/**
 * Letters for DISPLAY: the last one takes its final form.
 *
 * Applied per row at draw time rather than stored, so nothing on the disk and
 * nothing in a comparison ever holds a final letter.
 */
export function finalize(letters: string[]): string[] {
  if (letters.length === 0) return letters;
  const out = [...letters];
  const last = out.length - 1;
  out[last] = PLAIN_TO_FINAL[out[last]] ?? out[last];
  return out;
}

/** The alphabet the on-screen keyboard offers, in reading order. */
export const HE_KEYS = [..."אבגדהוזחטיכלמנסעפצקרשת"];
export const EN_KEYS = [..."abcdefghijklmnopqrstuvwxyz"];

/**
 * The keyboard and the word list are per-LANGUAGE data, not translations of
 * each other - a Spanish board needs Spanish letters and Spanish words, and
 * neither can be derived from the English. Records, so promoting a language
 * reds here rather than dealing a child an English hand.
 */
const KEYS: Record<Locale, string[]> = { he: HE_KEYS, en: EN_KEYS };
const WORDS: Record<Locale, Record<WordLength, readonly string[]>> = { he: HE, en: EN };

export function keysFor(locale: Locale): string[] {
  return KEYS[locale];
}

function listFor(locale: Locale, length: WordLength): readonly string[] {
  return WORDS[locale][length];
}

/**
 * Mark a guess against the answer — TWO PASSES, and the order matters.
 *
 * The naive single pass ("is this letter anywhere in the target?") is wrong
 * whenever a letter repeats, and wrong in the direction that misleads: guess
 * `שמים` against `שמחה` marks BOTH mems as near, telling the player there are
 * two when there is one. They then spend guesses defending a letter that is
 * not there.
 *
 * So exact positions are claimed first and their letters removed from the
 * pool; only the leftovers can be marked near, and only while the pool lasts.
 */
export function mark(target: string[], guess: string[]): Mark[] {
  const marks: Mark[] = new Array(guess.length).fill("miss");
  // Letters still available to justify a "near". Exact hits are spent first.
  const pool = new Map<string, number>();

  for (let i = 0; i < target.length; i++) {
    if (guess[i] === target[i]) marks[i] = "hit";
    else pool.set(target[i], (pool.get(target[i]) ?? 0) + 1);
  }

  for (let i = 0; i < guess.length; i++) {
    if (marks[i] === "hit") continue;
    const left = pool.get(guess[i]) ?? 0;
    if (left > 0) {
      marks[i] = "near";
      pool.set(guess[i], left - 1);
    }
  }

  return marks;
}

/** A fresh round. `rng` last and defaulted, per the repo convention. */
export function newRound(
  locale: Locale,
  length: WordLength,
  rng: () => number = Math.random,
): WordState {
  const word = pick(listFor(locale, length), rng);
  return { target: normalize(word), length, guesses: [], draft: [], solved: false };
}

/** Is this round finished, either way? */
export function isOver(s: WordState): boolean {
  return s.solved || s.guesses.length >= MAX_GUESSES;
}

/** Type a letter into the draft row. Ignored when the row is full or the round is done. */
export function typeLetter(s: WordState, ch: string): WordState {
  if (isOver(s) || s.draft.length >= s.length) return s;
  return { ...s, draft: [...s.draft, normalizeLetter(ch)] };
}

/** Rub out the last letter typed. */
export function backspace(s: WordState): WordState {
  if (isOver(s) || s.draft.length === 0) return s;
  return { ...s, draft: s.draft.slice(0, -1) };
}

export type SubmitOutcome =
  | { kind: "ignored" }
  | { kind: "short" }
  | { kind: "scored"; marks: Mark[]; solved: boolean; lost: boolean };

/**
 * Commit the draft row.
 *
 * DELIBERATELY NOT A DICTIONARY CHECK. A real word the list does not happen to
 * contain is still a fair guess, and refusing it teaches a child that their
 * word is wrong when it is only absent. Every guess is accepted and marked;
 * the list decides what the ANSWER can be, never what a guess may be.
 */
export function submit(s: WordState): { state: WordState; outcome: SubmitOutcome } {
  if (isOver(s)) return { state: s, outcome: { kind: "ignored" } };
  if (s.draft.length < s.length) return { state: s, outcome: { kind: "short" } };

  const marks = mark(s.target, s.draft);
  const solved = marks.every((m) => m === "hit");
  const guesses = [...s.guesses, { letters: s.draft, marks }];
  const lost = !solved && guesses.length >= MAX_GUESSES;

  return {
    state: { ...s, guesses, draft: [], solved },
    outcome: { kind: "scored", marks, solved, lost },
  };
}

/**
 * The best mark each letter has earned so far, for colouring the keyboard.
 *
 * "Best" is ordered hit > near > miss, so a letter that was near in guess two
 * and hit in guess four stays hit. Downgrading it would erase a fact the
 * player has already paid a guess for.
 */
export function keyboardMarks(s: WordState): Record<string, Mark> {
  const rank: Record<Mark, number> = { miss: 0, near: 1, hit: 2 };
  const out: Record<string, Mark> = {};
  for (const g of s.guesses) {
    g.letters.forEach((ch, i) => {
      const current = out[ch];
      if (!current || rank[g.marks[i]] > rank[current]) out[ch] = g.marks[i];
    });
  }
  return out;
}
