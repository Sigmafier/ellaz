// Catch the Frog ("תפסו את הצפרדע") — PURE rules. No DOM, no React, no Phaser.
//
// A CHASING GAME WITH NOTHING TO LOSE. One frog sits on one lily pad. Tap it and
// it hops to another pad; leave it alone and it hops anyway. As the round goes on
// it sits for less and less time, so the child is always chasing and never
// failing — a missed frog is not a miss, it is just the next hop.
//
// THREE DECISIONS CARRY THE GAME, and all three are pinned in `logic.test.ts`:
//
// 1. THE DWELL FLOOR. `dwellMs` shrinks with every hop, and `ABSOLUTE_FLOOR_MS`
//    is where it stops. This is the entire difficulty design, and it is a SAFETY
//    limit rather than a taste one: the round ends after N catches, so a frog
//    that sits for less time than a four-year-old needs to see it, decide, and
//    land a finger does not make the game hard — it makes the round IMPOSSIBLE
//    TO FINISH, and leaves a small child tapping forever with no way out. The
//    floor is stated as HOP_MS + MIN_SIT_MS so the two halves can be argued
//    about separately.
// 2. NEVER THE SAME PAD TWICE IN A ROW. A frog that "hops" onto the pad it is
//    already on reads as a broken game: the child watched something happen and
//    nothing changed. `nextHop` enforces this through its CANDIDATE LIST, so
//    even a degenerate rng cannot break it.
// 3. EXACTLY ONE FROG. `specFor` pins `maxAlive: 1`. Two frogs would make "tap
//    it and it hops" ambiguous and would destroy the premise the no-repeat rule
//    rests on (which pad did THAT one leave?).
//
// Motion is NOT modelled here, deliberately: where the frog is mid-hop is
// declared to the Web Animations API and interpolated by the compositor at the
// display's real refresh rate. See the header of `@shared/spawn.pure` and
// `.claude/rules/fixed-timestep-must-match-display.md`.
//
// The `rng` parameter goes LAST and defaults to `Math.random`, matching every
// other game. Import the pure modules DIRECTLY, never the `@shared` barrel — the
// barrel re-exports React components and this file must stay DOM-free (enforced
// by `src/games/logic-is-pure.test.ts`).
import { pick } from "@shared/rng";
import { SPAWN_DIFFICULTIES, type SpawnDifficulty, type SpawnSpec } from "@shared/spawn.pure";

/** The shared three-rung ladder, reused so the difficulty row looks like every other game's. */
export type Difficulty = SpawnDifficulty;

export const DIFFICULTIES = SPAWN_DIFFICULTIES;

// -----------------------------------------------------------------------------
// The pond
// -----------------------------------------------------------------------------

/** A lily pad's centre, as a percentage of the pond's width and height. */
export interface PadSpot {
  x: number;
  y: number;
}

/**
 * The minimum separation two pads must keep, in those same percentages.
 *
 * A pad is roughly 30% of the pond's width and 34% of its height at the smallest
 * phone size, so two pads closer than this OVERLAP — and a hop between two
 * overlapping pads is a hop the child cannot see, which is exactly the failure
 * the no-repeat rule exists to prevent. Either axis clearing is enough.
 */
export const MIN_PAD_GAP_X = 30;
export const MIN_PAD_GAP_Y = 34;

/**
 * Every pad the pond can hold, in the order tiers claim them.
 *
 * ORDER IS THE DESIGN, not a list. `padsFor` takes a PREFIX, so the first four
 * are the four CORNERS — that is what makes the easy pond spread across the
 * whole surface instead of crowding one half of it — and the two middle pads
 * arrive at medium and hard, where a fifth and sixth place to look is the point.
 */
export const PAD_SPOTS: readonly PadSpot[] = [
  { x: 16, y: 26 }, // top-left
  { x: 83, y: 75 }, // bottom-right
  { x: 84, y: 25 }, // top-right
  { x: 17, y: 74 }, // bottom-left
  { x: 50, y: 30 }, // top-middle    (medium)
  { x: 50, y: 70 }, // bottom-middle (hard)
];

/**
 * How many pads are in play.
 *
 * More pads is a harder VISUAL SEARCH, which is the half of the difficulty that
 * is not speed. Three is the hard floor: on two pads the frog simply alternates,
 * the child stops looking and taps back and forth, and the game stops being a
 * game.
 */
export const PAD_COUNT: Record<Difficulty, number> = { easy: 4, medium: 5, hard: 6 };

export function padsFor(difficulty: Difficulty): readonly PadSpot[] {
  const count = PAD_COUNT[difficulty] ?? PAD_COUNT.easy;
  return PAD_SPOTS.slice(0, count);
}

// -----------------------------------------------------------------------------
// The dwell curve — how long the frog sits before hopping on its own
// -----------------------------------------------------------------------------

/**
 * How long the hop itself takes.
 *
 * Part of the frog's dwell, not extra to it: the clock starts when the frog
 * appears, and it appears in mid-air at the pad it is leaving. So the time a
 * child actually gets to aim is `dwell - HOP_MS` (see `sitMs`), and that is the
 * number the floor is built from.
 */
export const HOP_MS = 260;

/**
 * The stationary time a small child needs to SEE the frog, DECIDE, and REACH it.
 *
 * A four-year-old is nowhere near an adult's ~250 ms: there is a visual search
 * across up to six pads, then a decision, then a whole-arm movement to a tablet
 * held at arm's length. One second is not generous; it is the point below which
 * the game stops being winnable at all.
 */
export const MIN_SIT_MS = 1000;

/** The dwell no tier may ever go under. Stated as a sum, on purpose. */
export const ABSOLUTE_FLOOR_MS = HOP_MS + MIN_SIT_MS;

/** The opening dwell of a round — slow, so the first hop is easy to follow. */
export const DWELL_START: Record<Difficulty, number> = { easy: 3200, medium: 2800, hard: 2400 };

/** Where each tier's curve stops shrinking. Never below `ABSOLUTE_FLOOR_MS`. */
export const DWELL_FLOOR: Record<Difficulty, number> = { easy: 2000, medium: 1700, hard: 1400 };

/** How much faster the frog gets with every hop. */
export const DWELL_STEP: Record<Difficulty, number> = { easy: 90, medium: 110, hard: 130 };

/** How much of a head start each level past the first begins with, in hops. */
export const LEVEL_HEADSTART = 2;

/**
 * The dwell for the `hops`-th frog of this tier.
 *
 * TOTAL over every input. A broken hop count fails toward the SLOWEST frog the
 * tier allows rather than the fastest, because "accidentally easy" costs a child
 * nothing and "accidentally at the floor" takes the round away from them. An
 * unknown difficulty (a renamed tier, junk out of storage) would index to
 * `undefined` and make every arithmetic NaN — and a NaN `lifeMs` makes the
 * spawner treat the frog as NEVER ALIVE, which is a permanently empty pond that
 * throws nothing at all. Answer with the gentlest legal dwell instead.
 */
export function dwellMs(difficulty: Difficulty, hops: number): number {
  const start = DWELL_START[difficulty];
  const floorFor = DWELL_FLOOR[difficulty];
  const step = DWELL_STEP[difficulty];
  if (!(start > 0) || !(floorFor > 0) || !(step >= 0)) return DWELL_START.easy;

  const floor = Math.max(ABSOLUTE_FLOOR_MS, floorFor);
  // `Number.isFinite && > 0` so NaN, Infinity and negatives all land on 0 — the
  // start of the curve, i.e. the slowest frog.
  const n = Number.isFinite(hops) && hops > 0 ? Math.floor(hops) : 0;
  return Math.max(floor, start - n * step);
}

/** The stationary part of the dwell — the time a child actually gets to aim. */
export function sitMs(difficulty: Difficulty, hops: number): number {
  return dwellMs(difficulty, hops) - HOP_MS;
}

/** How many hops it takes this tier to reach its floor. Used to sanity-check tuning. */
export function hopsToFloor(difficulty: Difficulty): number {
  const start = DWELL_START[difficulty];
  const floor = Math.max(ABSOLUTE_FLOOR_MS, DWELL_FLOOR[difficulty]);
  const step = DWELL_STEP[difficulty];
  if (!(start > floor) || !(step > 0)) return 0;
  return Math.ceil((start - floor) / step);
}

/**
 * The head start a level begins its curve with.
 *
 * Without this, level 9 opens exactly as slowly as level 1 and the level counter
 * is decoration. With it, each level starts a couple of hops further along the
 * same curve — and because `dwellMs` floors unconditionally, level 999 is still
 * a playable frog rather than a flicker.
 */
export function hopOffsetForLevel(level: number): number {
  if (!Number.isFinite(level) || level <= 1) return 0;
  return Math.floor(level - 1) * LEVEL_HEADSTART;
}

// -----------------------------------------------------------------------------
// Where the frog goes
// -----------------------------------------------------------------------------

/** One hop: the pad the frog landed on, and the pad it left. */
export interface Hop {
  /** The pad it is sitting on now. */
  pad: number;
  /**
   * The pad it came from — what the renderer draws the arc FROM. Equals `pad` on
   * the first hop of a round, so a fresh frog simply lands rather than flying in
   * from a pad nobody saw it leave.
   */
  from: number;
}

/**
 * The next hop, never onto the pad the frog is already on.
 *
 * The rule is enforced by the CANDIDATE LIST, not by a retry loop or a
 * comparison after the draw: an rng stuck at 0 (or at 0.999) still cannot
 * produce the previous pad, because the previous pad is not in the pool.
 *
 * TOTAL over every input. A `from` that is out of range — real path: the player
 * switches from hard's six pads to easy's four while the frog sits on pad 5 —
 * is treated as a fresh start rather than as a pad to avoid. A pond of one pad
 * cannot honour the rule at all, so it answers honestly with that pad instead of
 * spinning forever looking for a different one.
 */
export function nextHop(
  from: number | null,
  padCount: number,
  rng: () => number = Math.random,
): Hop {
  const count = Math.floor(padCount);
  if (!Number.isFinite(count) || count < 1) return { pad: 0, from: 0 };

  const previous =
    from !== null && Number.isInteger(from) && from >= 0 && from < count ? from : null;

  const pool: number[] = [];
  for (let i = 0; i < count; i++) if (i !== previous) pool.push(i);
  // Only reachable on a one-pad pond, where the no-repeat rule is unsatisfiable.
  const pad = pool.length > 0 ? pick(pool, rng) : 0;

  return { pad, from: previous ?? pad };
}

// -----------------------------------------------------------------------------
// The spawner spec
// -----------------------------------------------------------------------------

/**
 * The smallest gap between one frog appearing and the next.
 *
 * Only bites when a frog is caught almost instantly — without it a fast tap
 * teleports the frog with no beat in between, and the hop stops reading as a
 * hop. It is NOT the hop cadence: normally the frog's own dwell is what spaces
 * them out.
 */
export const HOP_GAP_MS = 220;

/**
 * What the spawner should be doing right now.
 *
 * `maxAlive: 1` is the game, and it means this spec is deliberately NOT
 * `isSustainable` — that helper asks "does the cap throttle the spawner?", and
 * here the answer must be YES. The interval is permanently overdue, so a new
 * frog appears the instant the last one leaves. Pinned in `logic.test.ts` so
 * nobody "fixes" the warning by putting a second frog on the pond.
 */
export function specFor(difficulty: Difficulty, hops: number): SpawnSpec {
  return { everyMs: HOP_GAP_MS, lifeMs: dwellMs(difficulty, hops), maxAlive: 1 };
}

// -----------------------------------------------------------------------------
// Finishing a round
// -----------------------------------------------------------------------------

/** Catches needed to finish a round and move up a level. */
export const ROUND_GOAL: Record<Difficulty, number> = { easy: 6, medium: 8, hard: 10 };

/**
 * Is the round done?
 *
 * `>=`, not `===`: two taps landing in the same tick must not step over the goal
 * and leave the round running forever. Written so a NaN count reads as NOT done
 * — the round carries on, which is recoverable, rather than granting a reward
 * for a number nobody counted.
 */
export function isRoundComplete(catches: number, difficulty: Difficulty): boolean {
  const goal = ROUND_GOAL[difficulty] ?? ROUND_GOAL.easy;
  return catches >= goal;
}
