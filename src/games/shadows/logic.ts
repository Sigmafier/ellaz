// Shadow Match ("צל ותמונה") — PURE logic. No DOM, no React, no Phaser.
//
// ONE SILHOUETTE IS THE QUESTION, THE PICTURES ARE THE ANSWERS — not the
// inverse. Both readings were on the table (one picture plus several shadows
// works too), and this one wins for a five-year-old: the child scans three
// familiar, colourful objects and matches an outline to one of them, instead of
// scanning three near-identical black blobs and holding the picture in mind.
// The odd, abstract thing belongs in the question slot.
//
// Difficulty is entirely a property of WHICH items share a round:
//
//   easy    3 choices, each from a DIFFERENT theme (elephant vs car vs apple —
//           the outlines could not be more different, so a first-timer wins)
//   medium  4 choices, each from a different theme
//   hard    4 choices from the SAME theme, so the outlines genuinely resemble
//           one another and the child has to read the SHAPE, not the category.
//
// That is the whole ladder: no timers, no lives, nothing to lose. A wrong tap
// costs nothing anywhere in this file, by construction — `isCorrect` is a pure
// question and holds no state to punish.
//
// The `rng` parameter goes LAST and defaults to `Math.random`, matching every
// other game and `@shared/rng`. Import the modules directly rather than the
// `@shared` barrel: the barrel re-exports `Prompt` and `winMoment`, which pull
// React and the portal in, and this file must stay DOM-free.
import { CAST_THEMES, drawCast, type CastItem, type CastTheme } from "@shared/cast";
import { pick, shuffle } from "@shared/rng";

export type Difficulty = "easy" | "medium" | "hard";

export interface ShadowChoice extends CastItem {
  /**
   * Stable id, `<theme>:<emoji>`. Themes never share a glyph, so this is unique
   * within a round and safe as a React key — and it stays unique even if a glyph
   * were one day added to two themes, which a bare emoji id would not.
   */
  id: string;
  theme: CastTheme;
}

export interface ShadowRound {
  choices: ShadowChoice[];
  answerId: string;
  /** The glyph the renderer draws as a silhouette. Always one of `choices`. */
  answerEmoji: string;
}

export interface DifficultyConfig {
  choices: number;
  /** Draw every choice from ONE theme, so the outlines are genuinely similar. */
  sameTheme: boolean;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: { choices: 3, sameTheme: false },
  medium: { choices: 4, sameTheme: false },
  hard: { choices: 4, sameTheme: true },
};

function toChoice(item: CastItem, theme: CastTheme): ShadowChoice {
  return { ...item, id: `${theme}:${item.emoji}`, theme };
}

/**
 * One item from each of `n` DISTINCT themes.
 *
 * `CAST_THEMES` holds six themes and `n` is at most four, so this never runs
 * short. If a future difficulty asked for more, `slice` would quietly return a
 * smaller round rather than throw — a shorter round is a smaller round; a thrown
 * error mid-game is a black screen for a five-year-old.
 */
function fromDistinctThemes(n: number, rng: () => number): ShadowChoice[] {
  return shuffle(CAST_THEMES, rng)
    .slice(0, n)
    .map((theme) => toChoice(drawCast(theme, 1, rng)[0], theme));
}

/** `n` DISTINCT items from ONE theme — the hard ladder. */
function fromOneTheme(n: number, rng: () => number): ShadowChoice[] {
  const theme = pick(CAST_THEMES, rng);
  return drawCast(theme, n, rng).map((item) => toChoice(item, theme));
}

/**
 * A fresh round: the choices in display order, plus which one casts the shadow.
 *
 * The answer is picked AFTER the shuffle, so its position carries no bias — a
 * child who learns "it is always the middle one" has learned nothing useful.
 */
export function newRound(difficulty: Difficulty, rng: () => number = Math.random): ShadowRound {
  const cfg = DIFFICULTY_CONFIG[difficulty];
  const drawn = cfg.sameTheme ? fromOneTheme(cfg.choices, rng) : fromDistinctThemes(cfg.choices, rng);
  const choices = shuffle(drawn, rng);
  const answer = pick(choices, rng);
  return { choices, answerId: answer.id, answerEmoji: answer.emoji };
}

/** Did this tap match the silhouette? A pure question — nothing is recorded. */
export function isCorrect(round: ShadowRound, id: string): boolean {
  return id === round.answerId;
}
