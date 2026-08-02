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
import { CAST_THEMES, drawCast, type CastItem, type CastTheme } from "@shared/cast";
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
   * The SAME characters in a DIFFERENT order - the answer row.
   *
   * Shuffling independently of the board matters: if the answers sat in board
   * order, the child could solve it by position alone (the odd one out lines up
   * with the hole) without ever looking at the characters. Shuffled, the answer
   * row asks "which of these is not up there any more?", which is the question.
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
  return {
    difficulty,
    theme,
    items,
    vanished: randInt(0, items.length - 1, rng),
    choices: shuffle(items, rng),
    studyMs: spec.studyMs,
    columns: spec.columns,
  };
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
