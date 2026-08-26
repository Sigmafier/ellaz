// Fruit Drop — pure logic, and that includes the physics.
//
// Fruit fall into an open-topped box. Two of the SAME kind that touch merge
// into the next fruit up the chain, which sets off a chain reaction as the
// whole pile resettles. The box fills. The run ends when something comes to
// rest above the line at the top. There is no completion: the record is the
// score.
//
// THE SIMULATION LIVES HERE, NOT IN THE RENDERER, and that is the whole design.
//
// Everything on the board is a CIRCLE, which is what makes a real solver
// tractable without a physics engine: two circles overlap exactly when the
// distance between their centres is under the sum of their radii, and the way
// to separate them is along that same line. No polygons, no rotation, no
// contact manifolds. A box of circles is roughly forty lines of arithmetic.
//
// Because it is arithmetic and not a canvas, `step` is a PURE function of the
// world and the timestep — same world in, same world out, every time — so
// `logic.test.ts` drives the exact simulation the player does rather than an
// approximation of it. A physics bug is then a failing assertion instead of a
// pile that "looks a bit wrong" on somebody's phone.
//
// The world is measured in ABSTRACT UNITS: 100 tall, and as wide as the level
// says. Nothing in this file has ever heard of a pixel — the renderer scales
// one world unit to one CSS length and every position follows. That is what
// lets the same simulation run identically on a 390px phone and a desktop.
import { pick } from "@shared/rng";

/* ------------------------------------------------------------- the world */

/** How tall the box is, in world units. The WIDTH is what a level changes. */
export const WORLD_H = 100;

/**
 * The line across the top of the box. A fruit resting with its top above this
 * ends the run. See `over` below for why "resting" is doing real work there.
 */
export const DEATH_LINE = 15;

/**
 * Where a dropped fruit enters the world — above the death line, deliberately,
 * because that is where the player is aiming from.
 */
export const SPAWN_Y = 7;

/** A dropped fruit is already moving, so it never reads as "resting up here". */
const DROP_SPEED = 8;

/**
 * The fixed sub-step the constants below are tuned against, in seconds.
 *
 * 1/120 rather than 1/60 for two unrelated reasons. It is stable: a circle
 * moving at 60 units per second travels half a small fruit's radius per step
 * at 120 Hz and a whole one at 60 Hz, and a mover that jumps past its contact
 * point in one step is a mover that tunnels through the floor. And it divides
 * evenly into both common refresh rates, so a 60 Hz display consumes two
 * sub-steps a frame and a 120 Hz display consumes one, with no leftover that
 * has to be smeared.
 *
 * The renderer consumes REAL elapsed time in `while (acc >= STEP_MS)`, never a
 * fixed number of frames — see `.claude/rules/fixed-timestep-must-match-display.md`
 * for the version of this that freezes every second frame on a 120 Hz screen.
 */
export const DT = 1 / 120;

/** The same number in milliseconds, which is what a rAF timestamp is measured in. */
export const STEP_MS = DT * 1000;

/**
 * The chain, smallest to biggest, as RADII in world units.
 *
 * A table rather than a growth formula: the ladder has to READ as a ladder at a
 * glance, and every neighbouring pair is roughly 1.2x, which is the smallest
 * step a child reliably tells apart. Two of the biggest fruit are 35.6 units
 * across and the narrowest box is 52 wide, so the top of the chain physically
 * cannot sit side by side — which is exactly what makes reaching it an ending
 * rather than a plateau.
 */
const RADII: readonly number[] = [3.2, 4.1, 5.2, 6.4, 7.8, 9.4, 11.2, 13.2, 15.4, 17.8];

/** How many rungs the chain has. The renderer draws one face per rung. */
export const TIER_COUNT = RADII.length;

/** The last rung. Merging two of these pops both — see `mergePass`. */
export const TOP_TIER = TIER_COUNT - 1;

/**
 * A tier's radius, CLAMPED rather than trusted.
 *
 * A restored snapshot can carry a tier this build no longer has, and an
 * `undefined` radius poisons every distance in the step into `NaN` — which
 * does not throw, it renders an empty box and a score that never moves. The
 * session validator refuses such a snapshot first; this is the belt to that
 * brace, because arithmetic that silently produces `NaN` is the worst failure
 * available here.
 */
export function radiusOf(tier: number): number {
  if (!Number.isFinite(tier)) return RADII[0];
  const t = Math.min(TOP_TIER, Math.max(0, Math.floor(tier)));
  return RADII[t];
}

/**
 * What the box may DEAL, and it is only the bottom of the chain.
 *
 * The whole game is that the big fruit can be BUILT and never handed to you.
 * Weighted toward the smallest, so a run has enough raw material to work with
 * rather than a board full of tier-4s nobody can pair up.
 */
const DEAL_BAG: readonly number[] = [0, 0, 0, 0, 1, 1, 1, 2, 2, 3, 4];

/** The biggest tier the box will ever hand you. Everything above it is earned. */
export const MAX_DEALT_TIER = Math.max(...DEAL_BAG);

export function dealTier(rng: () => number = Math.random): number {
  return pick(DEAL_BAG, rng);
}

export type LevelId = "easy" | "medium" | "hard";

export interface Level {
  /** The box width in world units. The only thing difficulty changes. */
  width: number;
}

/**
 * DIFFICULTY IS THE BOX WIDTH, and nothing else.
 *
 * A narrower box is harder because there is less room to park a fruit beside
 * the twin it is waiting for, so mistakes stack instead of spreading out. The
 * chain, the radii and the deal are identical at every tier on purpose: a child
 * moving from easy to hard is playing the same game with less room, not
 * learning three different ones.
 */
export const LEVELS: Record<LevelId, Level> = {
  easy: { width: 74 },
  medium: { width: 62 },
  hard: { width: 52 },
};

export const LEVEL_IDS = ["easy", "medium", "hard"] as const;

/** One circle in the box. `id` is stable across steps so the renderer can key on it. */
export interface Fruit {
  id: number;
  tier: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** What just happened, so the renderer can put a burst exactly where it landed. */
export interface Merge {
  x: number;
  y: number;
  /** The tier of the PAIR that merged, not of the fruit it produced. */
  tier: number;
  /** True when this was two top-tier fruit, which pop and leave nothing behind. */
  popped: boolean;
}

export interface World {
  /** Box width in world units. Comes from the level and never changes after. */
  width: number;
  height: number;
  fruit: Fruit[];
  /** Monotonic, so a merged fruit is never confused with the pair it replaced. */
  nextId: number;
  score: number;
  /** The tier the player is about to drop. */
  pending: number;
  /** The one after that, shown as a preview. */
  queued: number;
  /** Sub-steps until another drop is allowed. Stops a rapid tap emptying the queue. */
  cooldown: number;
  /** Consecutive sub-steps in which nothing is moving. See `isSettled`. */
  calmFor: number;
  /** Consecutive sub-steps in which something has been resting above the line. */
  overFor: number;
  over: boolean;
  /** Total merges this run - the renderer reads the DELTA to know one happened. */
  merges: number;
  lastMerge: Merge | null;
}

/* ---------------------------------------------------------------- tuning */

/** World units per second per second. Tuned so a drop reaches the floor in ~0.9s. */
const GRAVITY = 190;

/** Fraction of speed shed per second, so a pile comes to rest instead of jittering. */
const LINEAR_DAMP = 0.9;

/** How much bounce a fruit-on-fruit contact keeps. Low: fruit are not marbles. */
const RESTITUTION = 0.12;

/** The same for a wall or the floor. */
const WALL_RESTITUTION = 0.15;

/**
 * Contacts slower than this do not bounce at all - they simply stop.
 *
 * Without it a pile NEVER comes to rest, and the reason is worth keeping. Every
 * sub-step gravity adds a little downward speed to every fruit; a contact that
 * REFLECTS that speed, however small the coefficient, hands some of it straight
 * back, and in a stack wedged between two walls the reflections feed each other
 * faster than damping bleeds them off. Measured on a four-high wedge before
 * this existed: the bottom fruit sat at 0.08 units per second and the top one
 * at 5.90, climbing, after seven simulated seconds.
 *
 * So a slow contact is treated as RESTING: the impulse removes the approach
 * speed exactly rather than inverting it. This is the standard restitution
 * slop, and it is what makes `isSettled` reachable - which the renderer relies
 * on to stop its animation loop, and the end-of-run counter relies on to mature.
 */
const BOUNCE_FLOOR = 6;

/** How fast a fruit sliding along the floor is slowed, per second. */
const FLOOR_DRAG = 2.4;

/**
 * How much of the SIDEWAYS slip at a contact is taken out, per pass.
 *
 * Fruit are not ball bearings, and without this they behave like them. A
 * separating impulse only ever acts along the line between two centres, so on
 * a contact at any angle other than straight down it cancels part of gravity
 * and leaves the rest as a slide - which nothing then removes, so a fruit
 * resting diagonally on another accelerates sideways forever. Measured on a
 * wedge before this existed: 0.00 units per second at the bottom of the stack
 * and 7.98 at the top, still climbing after seven simulated seconds.
 *
 * It is viscous rather than Coulomb (proportional to the slip rather than to
 * the normal force), which is cheap, unconditionally stable, and indis-
 * tinguishable at the speeds a pile of fruit ever reaches.
 */
const CONTACT_FRICTION = 0.28;

/**
 * How many times the separation pass runs per sub-step.
 *
 * One pass separates each overlapping pair but immediately re-overlaps it
 * against the neighbours it was pushed into, so a deep pile needs several to
 * settle. Five is where the pile stopped visibly sinking into itself; more is
 * cost with nothing to show for it.
 */
const RELAX_ITERATIONS = 5;

/**
 * Below this many world units per second a fruit counts as NOT MOVING, for both
 * falling asleep and for ending the run.
 *
 * It is measured as the distance the fruit actually TRAVELLED over the sub-step,
 * not as the length of its velocity vector, and the difference is the whole
 * reason this comment exists. In a wedged pile the positional correction quietly
 * undoes the velocity the solver leaves behind, so a stack that has not moved a
 * hair in seven simulated seconds still reports several units per second of
 * "speed" - measured, 0.00 at the bottom of a four-high wedge and 4.17 at the
 * top. Believe the positions: a fruit that is where it was is at rest, whatever
 * its velocity claims.
 */
const REST_SPEED = 2;

/** Sub-steps of resting-above-the-line before the run ends. Half a second. */
const OVER_STEPS = 60;

/**
 * Sub-steps of total stillness before the world is considered asleep.
 *
 * LONGER than `OVER_STEPS`, and that ordering is load-bearing rather than
 * incidental: the renderer stops stepping a settled world, so if a pile could
 * fall asleep before the over-counter matured, a pile that came to rest above
 * the line would freeze there forever and the run would never end.
 */
const CALM_STEPS = 90;

/** Sub-steps between drops. A fifth of a second - long enough to see it leave. */
const DROP_COOLDOWN_STEPS = 24;

/* ---------------------------------------------------------------- scoring */

/**
 * What a merge is worth, as a pure function of the tier that merged.
 *
 * Triangular, so the chain pays increasingly: two of the smallest are worth 1
 * and each rung is worth more than every rung below it put together is easy to
 * reach. The game REPORTS this number and never says what it is worth in coins
 * — `sdk/economy.ts` alone decides that, exactly as it decides what a hard
 * level pays (see the rewards rule).
 *
 * The top of the chain carries a bonus rather than another rung, because two
 * top fruit POP: the reward for finishing the ladder has to be worth the room
 * those two were occupying.
 */
export const TOP_MERGE_BONUS = 100;

export function scoreForMerge(tier: number): number {
  const t = Math.min(TOP_TIER, Math.max(0, Math.floor(Number.isFinite(tier) ? tier : 0)));
  const base = ((t + 1) * (t + 2)) / 2;
  return t === TOP_TIER ? base + TOP_MERGE_BONUS : base;
}

/**
 * What this game's record measures, in the one place that says so.
 *
 * Only the NUMBER is persisted, never the unit, so `sdk/score.ts` reads the
 * unit to decide that MORE points win — and the board scopes the record to the
 * difficulty, because a wide box and a narrow one are not the same run.
 */
export function scoreFor(
  world: World,
  level: LevelId,
): { value: number; unit: "points"; board: LevelId } {
  return { value: world.score, unit: "points", board: level };
}

/* ------------------------------------------------------------- the world */

export function newWorld(level: LevelId, rng: () => number = Math.random): World {
  return {
    width: LEVELS[level].width,
    height: WORLD_H,
    fruit: [],
    nextId: 1,
    score: 0,
    pending: dealTier(rng),
    queued: dealTier(rng),
    cooldown: 0,
    calmFor: 0,
    overFor: 0,
    over: false,
    merges: 0,
    lastMerge: null,
  };
}

/**
 * Where a drop at `x` would actually land, clamped so the fruit cannot be
 * spawned half inside a wall.
 *
 * Exported because the renderer draws the pending fruit at exactly the position
 * this returns: an aim that shows one place and drops in another is the kind of
 * thing a child reads as the game cheating.
 */
export function clampDropX(world: World, x: number): number {
  const r = radiusOf(world.pending);
  const lo = r;
  const hi = world.width - r;
  if (!Number.isFinite(x)) return (lo + hi) / 2;
  return Math.min(hi, Math.max(lo, x));
}

/** Whether a tap would do anything right now. */
export function canDrop(world: World): boolean {
  return !world.over && world.cooldown <= 0;
}

/**
 * Release the pending fruit.
 *
 * Refuses by returning the SAME object rather than throwing, the way `pour`
 * does in the sorting game: a refusal is not an error, and a throw inside a tap
 * handler costs a child the board. The renderer compares identity to know
 * nothing happened.
 */
export function drop(world: World, x: number, rng: () => number = Math.random): World {
  if (!canDrop(world)) return world;
  const at = clampDropX(world, x);
  const f: Fruit = { id: world.nextId, tier: world.pending, x: at, y: SPAWN_Y, vx: 0, vy: DROP_SPEED };
  return {
    ...world,
    fruit: [...world.fruit, f],
    nextId: world.nextId + 1,
    pending: world.queued,
    queued: dealTier(rng),
    cooldown: DROP_COOLDOWN_STEPS,
    calmFor: 0,
    lastMerge: null,
  };
}

/**
 * Is there anything left to simulate?
 *
 * The renderer stops its animation loop on a true here and starts it again on
 * the next drop, which is why this game needs no pause control: once the pile
 * is still, no clock is running and walking away costs a player nothing.
 */
export function isSettled(world: World): boolean {
  return world.over || (world.cooldown <= 0 && world.calmFor >= CALM_STEPS);
}

/* ------------------------------------------------------------- the physics */

/** How much a contact at this speed gives back. Slow contacts give back nothing. */
function bounce(speed: number): number {
  return Math.abs(speed) < BOUNCE_FLOOR ? 0 : WALL_RESTITUTION;
}

/** Keep a circle inside the box, and bleed the speed the wall took off it. */
function constrain(f: Fruit, width: number, height: number): void {
  const r = radiusOf(f.tier);
  if (f.x < r) {
    f.x = r;
    if (f.vx < 0) f.vx = -f.vx * bounce(f.vx);
  } else if (f.x > width - r) {
    f.x = width - r;
    if (f.vx > 0) f.vx = -f.vx * bounce(f.vx);
  }
  if (f.y > height - r) {
    f.y = height - r;
    if (f.vy > 0) f.vy = -f.vy * bounce(f.vy);
  }
  // No ceiling. The box is open at the top, which is the entire premise: a
  // fruit may stick out of it, and that is what the death line is for.
}

/**
 * Fold every same-tier overlap into the next fruit up, at most once each per
 * sub-step.
 *
 * "At most once" is what keeps a chain reaction a CHAIN: three of a kind
 * touching resolve as one merge this step and the result meets the third one
 * next step, which is a beat a child can watch, rather than collapsing the
 * whole column in a single frame with nothing to see.
 */
interface MergeResult {
  fruit: Fruit[];
  score: number;
  /** How many pairs folded this sub-step. Several can, in different parts of the pile. */
  count: number;
  /** The last one, which is the one the renderer puts a burst on. */
  last: Merge | null;
  /** The id counter AFTER any fruit this pass created. */
  nextId: number;
}

function mergePass(list: Fruit[], world: World): MergeResult {
  const gone = new Set<number>();
  const born: Fruit[] = [];
  let nextId = world.nextId;
  let score = 0;
  let count = 0;
  let last: Merge | null = null;

  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (gone.has(a.id)) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (gone.has(b.id) || b.tier !== a.tier) continue;
      const reach = radiusOf(a.tier) + radiusOf(b.tier);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      if (dx * dx + dy * dy >= reach * reach) continue;

      gone.add(a.id);
      gone.add(b.id);
      const x = (a.x + b.x) / 2;
      const y = (a.y + b.y) / 2;
      score += scoreForMerge(a.tier);
      const popped = a.tier >= TOP_TIER;
      // The top of the chain has nowhere to go, so both fruit LEAVE. Anything
      // else would either cap silently (two watermelons that refuse to merge
      // read as a bug) or need an eleventh rung, and the ladder has to end.
      if (!popped) {
        born.push({
          id: nextId++,
          tier: a.tier + 1,
          x,
          y,
          // The average, not zero: the pair's momentum belongs to what they
          // became, so a merge inside a falling column keeps falling.
          vx: (a.vx + b.vx) / 2,
          vy: (a.vy + b.vy) / 2,
        });
      }
      last = { x, y, tier: a.tier, popped };
      count++;
      break; // `a` is spent; move on to the next unmerged fruit.
    }
  }

  if (count === 0) return { fruit: list, score: 0, count: 0, last: null, nextId: world.nextId };
  return {
    fruit: [...list.filter((f) => !gone.has(f.id)), ...born],
    score,
    count,
    last,
    nextId,
  };
}

/**
 * Push every overlapping pair apart, and take the energy out of the contact.
 *
 * Mass is the radius SQUARED — a circle's area — rather than every fruit being
 * equal, and that is what makes a pile stable: an equal-mass solver lets a
 * blueberry shove a watermelon exactly as far as the watermelon shoves it, so
 * the bottom of the stack wanders and the whole pile creeps sideways.
 */
function separate(list: Fruit[], width: number, height: number): void {
  for (let iter = 0; iter < RELAX_ITERATIONS; iter++) {
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      const ra = radiusOf(a.tier);
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        const rb = radiusOf(b.tier);
        const reach = ra + rb;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d = Math.sqrt(dx * dx + dy * dy);
        if (d >= reach) continue;

        // Two circles at the SAME point have no separating direction, and
        // dividing by that distance is how a whole board becomes NaN. Straight
        // up is chosen rather than random so the step stays reproducible.
        if (d < 1e-6) {
          dx = 0;
          dy = -1;
          d = 1e-6;
        }
        const nx = dx / d;
        const ny = dy / d;
        const overlap = reach - d;

        const ma = ra * ra;
        const mb = rb * rb;
        const total = ma + mb;
        // Each moves in proportion to the OTHER's mass, so the pair's centre of
        // mass does not drift and the heavy one barely budges.
        const shareA = (overlap * mb) / total;
        const shareB = (overlap * ma) / total;
        a.x -= nx * shareA;
        a.y -= ny * shareA;
        b.x += nx * shareB;
        b.y += ny * shareB;

        // Only APPROACHING pairs get an impulse. Applying one to a pair already
        // moving apart adds energy the contact never had, and a pile that gains
        // energy from being touched never stops moving.
        const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (vn < 0) {
          // Resting contacts get NO restitution, so the impulse cancels the
          // approach exactly instead of handing part of it back. See BOUNCE_FLOOR.
          const e = -vn < BOUNCE_FLOOR ? 0 : RESTITUTION;
          const impulse = (-(1 + e) * vn) / (1 / ma + 1 / mb);
          a.vx -= (impulse / ma) * nx;
          a.vy -= (impulse / ma) * ny;
          b.vx += (impulse / mb) * nx;
          b.vy += (impulse / mb) * ny;
        }

        // And the sideways half of the same contact. Without it a pile slides.
        const tx = -ny;
        const ty = nx;
        const vt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty;
        if (vt !== 0) {
          const drag = (-CONTACT_FRICTION * vt) / (1 / ma + 1 / mb);
          a.vx -= (drag / ma) * tx;
          a.vy -= (drag / ma) * ty;
          b.vx += (drag / mb) * tx;
          b.vy += (drag / mb) * ty;
        }
      }
    }
    // Re-clamp AFTER separating: a push away from a neighbour is what shoves a
    // fruit through a wall, so the walls have to be the last word each pass.
    for (const f of list) constrain(f, width, height);
  }
}

/**
 * ONE fixed sub-step of the simulation. Pure: same world and `dt` in, same
 * world out, so the tests drive exactly what the player does.
 *
 * The input is never mutated. Fruit are cloned at the door, the clones are
 * mutated freely inside (a solver that allocates a new object per pair per
 * iteration would allocate thousands per second for nothing), and what comes
 * back is a new world over new fruit.
 */
export function step(world: World, dt: number = DT): World {
  // Where everything was, so "is it moving" can be answered by looking rather
  // than by trusting the velocities. See REST_SPEED.
  const was = new Map<number, { x: number; y: number }>();
  for (const f of world.fruit) was.set(f.id, { x: f.x, y: f.y });

  const list: Fruit[] = world.fruit.map((f) => ({ ...f }));
  const damp = Math.max(0, 1 - LINEAR_DAMP * dt);

  for (const f of list) {
    f.vy += GRAVITY * dt;
    f.vx *= damp;
    f.vy *= damp;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    const r = radiusOf(f.tier);
    // Friction only while actually on the floor, or a fruit in mid-air would
    // slow sideways for no reason a player could see.
    if (f.y >= world.height - r - 0.01) f.vx *= Math.max(0, 1 - FLOOR_DRAG * dt);
    constrain(f, world.width, world.height);
  }

  const merged = mergePass(list, world);
  separate(merged.fruit, world.width, world.height);

  /** How far this fruit actually travelled this sub-step, per second. */
  const travelled = (f: Fruit): number => {
    const p = was.get(f.id);
    // Brand new - dropped, or just made by a merge. Never "at rest" on the
    // frame it appears, or a merge above the line could end the run instantly.
    if (!p) return Number.POSITIVE_INFINITY;
    return Math.sqrt((f.x - p.x) ** 2 + (f.y - p.y) ** 2) / dt;
  };

  let fastest = 0;
  for (const f of merged.fruit) {
    const moved = travelled(f);
    if (moved > fastest) fastest = moved;
  }

  // BOTH CONDITIONS, AND BOTH MATTER.
  //
  // "Above the line" alone would end the run on the fruit the player just let
  // go of: it enters the world above the line by construction, because that is
  // where they were aiming from, so a height test on its own kills a player for
  // a drop they have not even watched land.
  //
  // "Slow" alone means nothing at all - everything in a settled box is slow.
  //
  // It is the CONJUNCTION, held for half a second, that says the thing a player
  // would call losing: the pile has stopped moving and it is over the top. The
  // sustain is what lets a fruit tumble up over the line and roll back down
  // without the run ending under it.
  let breach = false;
  for (const f of merged.fruit) {
    if (f.y - radiusOf(f.tier) >= DEATH_LINE) continue;
    if (travelled(f) >= REST_SPEED) continue;
    breach = true;
    break;
  }
  const overFor = world.over ? world.overFor : breach ? world.overFor + 1 : 0;

  return {
    ...world,
    fruit: merged.fruit,
    nextId: merged.nextId,
    score: world.score + merged.score,
    cooldown: Math.max(0, world.cooldown - 1),
    calmFor: fastest < REST_SPEED ? world.calmFor + 1 : 0,
    overFor,
    over: world.over || overFor >= OVER_STEPS,
    merges: world.merges + merged.count,
    lastMerge: merged.last,
  };
}
