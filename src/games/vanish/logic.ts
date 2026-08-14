// "What disappeared?" - the pure round model.
//
// PURE: no React, no DOM, no timers. This file owns what a round IS (which
// characters are on the board, which one vanishes, how long the child gets to
// study them); the renderer owns only WHEN each beat happens and what a tile
// looks like. That split is what makes the fairness properties below unit-
// testable in the node environment.
//
// Every function is NON-MUTATING, and that is load-bearing rather than stylistic:
// a wrong answer must leave the round exactly as answerable as it was, so the
// child can try again forever. There is deliberately no "attempts", no "lives"
// and no lockout anywhere in this file - a wrong tap simply asks the same
// question again. This platform has no losing.
//
// The `rng` parameter goes LAST and defaults to `Math.random`, matching every
// other game signature in the repo.
// Direct module paths, NOT the `@shared` barrel: the barrel re-exports Prompt
// (React) and useGameTimer, so a pure logic module importing it drags React and
// a CSS side-effect into the logic core. Enforced by `logic-is-pure.test.ts`.
import { CAST, CAST_THEMES, drawCast, type CastItem, type CastTheme } from "@shared/cast";
import { pick, randInt, shuffle } from "@shared/rng";

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;

export type Difficulty = (typeof DIFFICULTIES)[number];

export interface LevelSpec {
  /** How many characters go on the board. */
  count: number;
  /** How long the study beat lasts, in ms. */
  studyMs: number;
  /** Board columns. Chosen so every level fills complete rows. */
  columns: number;
}

/**
 * The difficulty ladder.
 *
 * ITEM COUNT IS THE HONEST LEVER; TIME IS THE SECOND ONE. This is a memory
 * game, not a reaction game, so no level ever drops below what a five-year-old
 * can actually use: the *total* study window GROWS with the board (you cannot
 * encode six characters in less wall-clock time than three), while the PER-ITEM
 * budget shrinks 2.33s -> 2.00s -> 1.50s. That shrinking per-item budget is the
 * difficulty; the growing total is what keeps it fair.
 *
 * `logic.test.ts` pins both halves - a floor of 1.5s per item and 5s overall,
 * and the monotonic direction of each - so a future "let's make hard harder"
 * cannot quietly turn this into a reflex test.
 */
export const LEVELS: Record<Difficulty, LevelSpec> = {
  easy: { count: 3, studyMs: 7000, columns: 3 },
  medium: { count: 4, studyMs: 8000, columns: 2 },
  hard: { count: 6, studyMs: 9000, columns: 3 },
};

/** The largest board any level asks for. Every cast theme must hold at least this many. */
export const MAX_ITEMS = 6;

/** Never study fewer than this many ms per character, at any difficulty. */
export const MIN_MS_PER_ITEM = 1500;

/**
 * How many characters the answer row offers.
 *
 * The row is the vanished character plus DECOYS from the same theme that were
 * never on the board — not the board set re-shown. Re-showing the board made
 * this a spot-the-odd-one-out against the visible tiles instead of a memory
 * game: a child could ignore the study beat entirely and just tap the answer
 * that had no twin on the board. With fresh decoys, the row shares nothing with
 * the reduced board, so the only way to know what is gone is to have looked.
 */
export const OPTION_COUNT: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 4 };

/** Never study for less than this in total, at any difficulty. */
export const MIN_STUDY_MS = 5000;

/** The three beats of a round, in order. */
export const PHASES = ["study", "cover", "reveal"] as const;

export type Phase = (typeof PHASES)[number];

/** How long the blanket stays down between studying and revealing. */
export const COVER_MS = 1100;

/** The next beat. `reveal` is terminal - the round ends when the child answers. */
export function nextPhase(phase: Phase): Phase {
  return phase === "study" ? "cover" : "reveal";
}

export interface Round {
  difficulty: Difficulty;
  theme: CastTheme;
  /** The full cast, in BOARD order. Distinct by construction (see `drawCast`). */
  items: readonly CastItem[];
  /** Index into `items` of the character that vanishes. */
  vanished: number;
  /**
   * The answer row: the vanished character plus decoys from the same theme that
   * were NEVER on the board, all shuffled. It shares nothing with the reduced
   * board on purpose — see `OPTION_COUNT` — so the child answers from memory
   * rather than by matching against the tiles still on screen.
   */
  choices: readonly CastItem[];
  studyMs: number;
  columns: number;
}

/**
 * Build a round: draw a themed cast, hide one of them, shuffle the answer row.
 *
 * Note this reads the board size back off `items.length` rather than trusting
 * `spec.count`. `drawCast` CLAMPS instead of throwing when a theme is short, and
 * a round one character smaller is a smaller round, while a thrown error mid-game
 * is a black screen for a five-year-old. `logic.test.ts` pins that no theme is
 * ever actually short, so the clamp is a belt, not a plan.
 */
export function newRound(difficulty: Difficulty, rng: () => number = Math.random): Round {
  const spec = LEVELS[difficulty];
  const theme = pick(CAST_THEMES, rng);
  const items = drawCast(theme, spec.count, rng);
  const vanished = randInt(0, items.length - 1, rng);
  const answer = items[vanished];

  // Decoys: same-theme characters that were NOT on the board. Drawing from the
  // theme's full cast keeps the row coherent (all fruit, all animals) while
  // sharing nothing with the reduced board. If a theme is too small to supply a
  // full set of decoys, the row is simply shorter — never fewer than the answer
  // plus one, and drawCast already pins that no theme is actually that short.
  const onBoard = new Set(items.map((i) => i.emoji));
  const decoyPool = CAST[theme].filter((c) => !onBoard.has(c.emoji));
  const decoys = shuffle(decoyPool, rng).slice(0, Math.max(0, OPTION_COUNT[difficulty] - 1));
  const choices = shuffle([answer, ...decoys], rng);

  return { difficulty, theme, items, vanished, choices, studyMs: spec.studyMs, columns: spec.columns };
}

/** The character that disappeared. Always a member of `round.items`. */
export function vanishedItem(round: Round): CastItem {
  return round.items[round.vanished];
}

/**
 * The board as it looks after the blanket comes up: every character in its
 * original slot, and `null` at the one that is gone.
 *
 * Keeping the slot (rather than closing the gap) is deliberate - the hole is
 * what the child is looking at, and a re-flowed board would change every
 * position at once and make the round a spot-the-difference puzzle.
 */
export function revealedItems(round: Round): (CastItem | null)[] {
  return round.items.map((item, i) => (i === round.vanished ? null : item));
}

/** Is `choiceIndex` in the answer row the character that vanished? */
export function isCorrectChoice(round: Round, choiceIndex: number): boolean {
  const chosen = round.choices[choiceIndex];
  return chosen !== undefined && chosen.emoji === vanishedItem(round).emoji;
}
