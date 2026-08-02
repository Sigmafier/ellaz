// Bees Only ("רק דבורים") — PURE rules. No DOM, no React, no Phaser.
//
// A DISCRIMINATION-AND-RESTRAINT GAME, NOT A REACTION GAME. Bees and butterflies
// fly across the sky for a fixed span of time; the child taps the bees and lets
// the butterflies go. Nothing here punishes: tapping a butterfly costs nothing,
// missing a bee costs nothing, and the round always ends in a completion. The
// only number that goes up is `caught`.
//
// The one design decision worth arguing about is the MIX, so it is stated here
// and pinned in `logic.test.ts`:
//
//   * Too many bees and there is no restraint to practise. The child settles
//     into a tap-everything rhythm within a few seconds and stops looking, which
//     is the exact habit this game exists to interrupt.
//   * Too few and a four-year-old sits watching an empty sky. Waiting is not a
//     skill, and a timed round of waiting is a round they do not finish.
//   * A butterfly must be COMMON, not rare. A rare butterfly inside a fast
//     tap-rhythm is a gotcha — punishment by surprise, even with no score to
//     lose — while a butterfly every few seconds keeps the child checking.
//
// So the ladder runs the other way from most games: harder means FEWER bees
// (0.65 → 0.60 → 0.50), because the skill being trained is telling them apart,
// not moving faster. Speed is already handled by the spawn preset.
//
// Import the pure modules DIRECTLY, never the `@shared` barrel: the barrel
// re-exports `Prompt` and `useSpawner`, which pull React in, and this file must
// stay DOM-free (enforced by `src/games/logic-is-pure.test.ts`).
import { SPAWN_DIFFICULTIES, SPAWN_PRESETS, type SpawnSpec } from "@shared/spawn.pure";

export type Creature = "bee" | "butterfly";

/** The one the child is asked for. The pretty one is never the target. */
export const TARGET: Creature = "bee";

export type Difficulty = (typeof SPAWN_DIFFICULTIES)[number];

export const DIFFICULTIES = SPAWN_DIFFICULTIES;

/**
 * How long a round lasts.
 *
 * 40 seconds: long enough that every tier yields well over fifteen bees (see
 * `expectedBees`), so the closing number feels like something; short enough that
 * a four-year-old sits through it, and that starting again is cheap rather than
 * a commitment. There is no pause button and none is needed — the clock is the
 * pause-aware game clock, so putting the tablet down stops it (`useGameTimer`).
 */
export const ROUND_MS = 40_000;

/**
 * Horizontal flight lanes on the play surface.
 *
 * MUST be at least the largest preset's `maxAlive` (hard = 6). `pickLane`
 * answers `null` when every lane is taken and `spawn` then returns `null`, so a
 * board with fewer lanes than the cap silently starves its own spawner — the sky
 * never fills, nothing errors, and it looks like a tuning problem. Pinned.
 */
export const LANES = 6;

/**
 * The longest run of one creature the generator will emit.
 *
 * Without a cap, an unlucky draw gives five butterflies in a row (dead air in a
 * timed round) or eight bees in a row (which teaches "tap everything" — exactly
 * the habit the game is trying to interrupt). Three is the largest run that is
 * still over in about two seconds at every tier.
 */
export const MAX_RUN = 3;

export interface LevelConfig {
  spec: SpawnSpec;
  /**
   * The DRAW WEIGHT for a bee, not the share the child meets — the run cap pulls
   * the realised mix toward even. See `realisedBeeShare`.
   */
  beeRatio: number;
}

export const LEVELS: Record<Difficulty, LevelConfig> = {
  easy: { spec: SPAWN_PRESETS.easy, beeRatio: 0.65 },
  medium: { spec: SPAWN_PRESETS.medium, beeRatio: 0.6 },
  hard: { spec: SPAWN_PRESETS.hard, beeRatio: 0.5 },
};

/** Clamp a configured weight into [0,1]; anything unusable becomes a coin flip. */
function weight(beeRatio: number): number {
  if (!Number.isFinite(beeRatio)) return 0.5;
  return Math.min(1, Math.max(0, beeRatio));
}

export function other(c: Creature): Creature {
  return c === "bee" ? "butterfly" : "bee";
}

/**
 * The share of bees the generator ACTUALLY produces, given a draw weight.
 *
 * Not the same number as `beeRatio`, and the gap is not small: the run cap can
 * only ever cut short the MAJORITY creature's runs, so it always pulls the mix
 * toward even (0.65 realises as ~0.585). Quoting the draw weight as the on-screen
 * mix overstates the bees by several points, which matters because the round
 * length was chosen against this number.
 *
 * Closed form of the Markov chain over (creature, run length): the chain spends
 * time in bee-states in proportion to `1 + p + … + p^(k-1)` and in butterfly
 * states in proportion to the same series in `q`. Checked against the real
 * generator in `logic.test.ts` — a formula nobody re-derives is a formula that
 * silently stops matching.
 */
export function realisedBeeShare(beeRatio: number, maxRun: number = MAX_RUN): number {
  const p = weight(beeRatio);
  const series = (x: number): number => {
    let sum = 0;
    let term = 1;
    for (let i = 0; i < maxRun; i++) {
      sum += term;
      term *= x;
    }
    return sum;
  };
  const bees = series(p);
  const flies = series(1 - p);
  return bees / (bees + flies);
}

/**
 * The next creature to spawn, given what came just before.
 *
 * `recent` is the tail of the stream, NEWEST LAST; only the last `MAX_RUN`
 * entries are read, so a caller may keep a short history (or none at all). Total
 * over every input: a nonsense weight degrades to a coin flip rather than to an
 * empty sky, because a config mistake must never leave a child with nothing to
 * tap.
 *
 * The `rng` parameter goes LAST and defaults to `Math.random`, matching every
 * other game in the repo.
 */
export function nextCreature(
  recent: readonly Creature[],
  beeRatio: number,
  rng: () => number = Math.random,
): Creature {
  const tail = recent.slice(-MAX_RUN);
  if (tail.length === MAX_RUN && tail.every((c) => c === tail[0])) return other(tail[0]);
  return rng() < weight(beeRatio) ? "bee" : "butterfly";
}

/**
 * What happened in a round.
 *
 * Four counters, none of which can go down. `fluttered` and `escaped` are kept
 * because they are interesting, not because they are penalties — the closing
 * screen shows `caught` and `freed`, and `freed` is the restraint the game is
 * actually about: butterflies the child let fly.
 */
export interface RoundScore {
  /** Bees tapped. */
  caught: number;
  /** Butterflies tapped. They fluttered off unharmed; nothing was lost. */
  fluttered: number;
  /** Bees that flew away untapped. Not a failure — bees are fast. */
  escaped: number;
  /** Butterflies left in peace. The restraint, counted. */
  freed: number;
}

export function emptyScore(): RoundScore {
  return { caught: 0, fluttered: 0, escaped: 0, freed: 0 };
}

/** A tap landed on a live creature. NON-MUTATING. */
export function countTap(score: RoundScore, creature: Creature): RoundScore {
  return creature === "bee"
    ? { ...score, caught: score.caught + 1 }
    : { ...score, fluttered: score.fluttered + 1 };
}

/** A creature left the screen untapped. NON-MUTATING. */
export function countExpire(score: RoundScore, creature: Creature): RoundScore {
  return creature === "bee"
    ? { ...score, escaped: score.escaped + 1 }
    : { ...score, freed: score.freed + 1 };
}

/**
 * Milliseconds left in the round.
 *
 * FAILS TOWARD "KEEP PLAYING": an elapsed time that is negative, NaN or missing
 * reads as a full round rather than an ended one. Ending a round early because a
 * clock glitched takes a round away from a child mid-play, which is the worse of
 * the two wrong answers.
 */
export function remainingMs(elapsedMs: number): number {
  if (!(elapsedMs > 0)) return ROUND_MS;
  return Math.max(0, ROUND_MS - elapsedMs);
}

/** Whole seconds left, for the clock chip. Never negative. */
export function secondsLeft(elapsedMs: number): number {
  return Math.ceil(remainingMs(elapsedMs) / 1000);
}

export function isRoundOver(elapsedMs: number): boolean {
  return remainingMs(elapsedMs) <= 0;
}

/** Roughly how many bees a full round offers. Used to sanity-check the tuning. */
export function expectedBees(difficulty: Difficulty): number {
  const { spec, beeRatio } = LEVELS[difficulty];
  return Math.floor(ROUND_MS / spec.everyMs) * realisedBeeShare(beeRatio);
}

/**
 * How the closing screen congratulates the child.
 *
 * Every band is positive — there is no band for "you did badly", because there
 * is no doing badly here. `start` is what a first round looks like.
 */
export type Praise = "start" | "good" | "great";

export const GOOD_AT = 5;
export const GREAT_AT = 12;

export function praiseFor(caught: number): Praise {
  if (!(caught >= GOOD_AT)) return "start"; // written so NaN lands here, not below
  return caught >= GREAT_AT ? "great" : "good";
}
