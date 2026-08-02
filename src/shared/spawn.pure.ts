// Spawn / live / expire / tap — the pure brain behind every "tap the moving
// thing" game (balloons, bubbles, bees, frog, reaction).
//
// PURE: no DOM, no React, no timers, no requestAnimationFrame. Every function
// takes the current time as an argument and returns a value; nothing here
// advances anything on its own.
//
// THERE IS DELIBERATELY NO SIMULATION LOOP HERE, AND THERE MUST NEVER BE ONE.
// A prop's POSITION is not modelled in this file and is not integrated
// anywhere: motion is declared to the Web Animations API ("travel from A to B
// over N ms") and interpolated by the compositor at the display's real refresh
// rate. A hand-rolled `1000/60` accumulator driven by rAF freezes every second
// frame on a 120 Hz screen, which reads as input lag and is structural rather
// than occasional — see `.claude/rules/fixed-timestep-must-match-display.md`.
// What this file models is only WHEN a prop exists and WHETHER a tap on it was
// right, both of which are wall-clock questions, not per-frame ones.
//
// The clock passed in as `now` is the GAME clock (pause-aware elapsed time),
// not `Date.now()`. Freezing that clock freezes spawning and expiry together,
// which is what stops a backgrounded tab filling with props.
//
// The `rng` parameter goes LAST and defaults to `Math.random`, matching
// `rng.ts` and every game signature in the repo.
import { pick } from "./rng";

/** How fast props arrive, how long they last, and how many may share the screen. */
export interface SpawnSpec {
  /** ms between spawns; the difficulty lever. */
  everyMs: number;
  /** how long a prop stays alive before it expires. */
  lifeMs: number;
  /** how many may be alive at once. */
  maxAlive: number;
}

/**
 * One thing on screen. `kind` is whatever the game asks about (a colour, a
 * letter, a number, "bee" | "butterfly"), and `lane` is a slot index the
 * renderer turns into a position — so two props never spawn on top of each
 * other and a five-year-old always has something to aim at.
 */
export interface Prop<T> {
  id: number;
  kind: T;
  bornAt: number;
  lifeMs: number;
  lane: number;
}

export type TapVerdict = "hit" | "wrong" | "miss";

/**
 * Is this prop on screen at `now`?
 *
 * The window is HALF-OPEN — alive at `bornAt`, alive at `bornAt + lifeMs - 1`,
 * gone at exactly `bornAt + lifeMs`. A `lifeMs` of 0 (or negative, or NaN)
 * means the prop is never alive rather than briefly alive, so a mis-configured
 * spec produces an empty screen a tester notices instead of a one-frame flicker
 * nobody sees. `Infinity` is legal and means "sits until tapped" — the shape
 * the reaction game's green light wants.
 */
export function isAlive<T>(prop: Prop<T>, now: number): boolean {
  if (!(prop.lifeMs > 0)) return false;
  return now >= prop.bornAt && now < prop.bornAt + prop.lifeMs;
}

/**
 * Which props are alive at `now`, in their original order. NON-MUTATING: the
 * input array is untouched, and the survivors are the same objects.
 */
export function alive<T>(props: readonly Prop<T>[], now: number): Prop<T>[] {
  return props.filter((p) => isAlive(p, now));
}

/**
 * Should a new prop spawn at `now`?
 *
 * TWO gates, and both matter. The interval alone floods the screen the moment
 * the player stops tapping; the cap alone makes a fast level arrive in one
 * burst. `aliveCount` must be the count of props alive at `now` — passing the
 * raw list length counts expired props and silently starves the spawner.
 *
 * Pass `lastSpawnAt = -Infinity` to spawn immediately on the first tick.
 */
export function dueToSpawn(
  lastSpawnAt: number,
  now: number,
  spec: SpawnSpec,
  aliveCount: number,
): boolean {
  // Written as `!(a < b)` so a NaN count refuses to spawn rather than flooding.
  if (!(aliveCount < spec.maxAlive)) return false;
  if (!(spec.everyMs > 0)) return true; // degenerate spec: the cap is the only gate
  return now - lastSpawnAt >= spec.everyMs;
}

/**
 * Judge a tap against the round's target.
 *
 * Accepts a null/undefined prop (a tap that landed on empty space) and an
 * optional `now`. Both produce `"miss"`, and the second is the one that matters
 * in practice: a prop animating out is still under the finger for a few hundred
 * milliseconds, and crediting a hit on something that has already expired is
 * how a game starts feeling arbitrary. TOTAL over every kind — it compares with
 * `Object.is` and never throws, so a kind of `0`, `""` or `NaN` is judged, not
 * crashed on.
 */
export function judgeTap<T>(
  prop: Prop<T> | null | undefined,
  target: T,
  now?: number,
): TapVerdict {
  if (!prop) return "miss";
  if (now !== undefined && !isAlive(prop, now)) return "miss";
  return Object.is(prop.kind, target) ? "hit" : "wrong";
}

/**
 * A free lane, or `null` when every lane is taken.
 *
 * Returns `null` rather than a wrong lane on purpose: two props stacked on one
 * spot is worse than one prop fewer, because the one underneath is untappable
 * and reads as a broken game. Non-integer or absurd `lanes` also answers
 * `null`. Out-of-range and duplicate entries in `occupied` are ignored.
 */
export function pickLane(
  occupied: readonly number[],
  lanes: number,
  rng: () => number = Math.random,
): number | null {
  const count = Math.floor(lanes);
  if (!Number.isFinite(count) || count < 1) return null;

  const taken = new Set<number>(occupied);
  const free: number[] = [];
  for (let i = 0; i < count; i++) if (!taken.has(i)) free.push(i);
  if (free.length === 0) return null;

  return pick(free, rng);
}

/** Everything `spawn()` needs to decide. See `spawn` for the semantics. */
export interface SpawnOptions<T> {
  /** Every prop currently held by the caller, expired ones included. */
  props: readonly Prop<T>[];
  /** Game-clock time now. */
  now: number;
  /** Game-clock time of the last spawn; `-Infinity` before the first. */
  lastSpawnAt: number;
  spec: SpawnSpec;
  /** How many lanes the play surface has. */
  lanes: number;
  /** Id for the new prop. Must never repeat within a mount (React keys). */
  nextId: number;
  /** What the new prop IS, given the lane it landed on. */
  kindFor: (lane: number) => T;
}

/**
 * The next prop, or `null` when nothing should spawn yet.
 *
 * Composes the three gates in the order that keeps them honest: expire first
 * (so a dead prop neither counts against the cap nor holds its lane), then the
 * interval + cap, then the lane. A full board answers `null` even when the
 * interval is long overdue.
 */
export function spawn<T>(o: SpawnOptions<T>, rng: () => number = Math.random): Prop<T> | null {
  const live = alive(o.props, o.now);
  if (!dueToSpawn(o.lastSpawnAt, o.now, o.spec, live.length)) return null;

  const lane = pickLane(
    live.map((p) => p.lane),
    o.lanes,
    rng,
  );
  if (lane === null) return null;

  return { id: o.nextId, kind: o.kindFor(lane), bornAt: o.now, lifeMs: o.spec.lifeMs, lane };
}

/**
 * How many props a spec settles at once it is running — `lifeMs / everyMs`,
 * rounded up.
 *
 * Worth knowing because it is the number the cap has to accommodate. See
 * `isSustainable`.
 */
export function steadyStateAlive(spec: SpawnSpec): number {
  if (!(spec.everyMs > 0) || !(spec.lifeMs > 0)) return 0;
  return Math.ceil(spec.lifeMs / spec.everyMs);
}

/**
 * Can this spec actually run, or does its own cap throttle it?
 *
 * A spec whose spawn rate outruns its life time pins the board at `maxAlive`
 * forever: the interval is always overdue, the cap always refuses, and the game
 * degrades into "wait for something to pop". Nothing errors, so it ships. Any
 * game exposing custom difficulty should assert this on its presets.
 */
export function isSustainable(spec: SpawnSpec): boolean {
  return steadyStateAlive(spec) <= spec.maxAlive;
}

/** The shared difficulty ladder, in order. */
export const SPAWN_DIFFICULTIES = ["easy", "medium", "hard"] as const;

export type SpawnDifficulty = (typeof SPAWN_DIFFICULTIES)[number];

/**
 * Default presets for the five tap-the-target games.
 *
 * Tuned around two child-facing numbers, both pinned by `spawn.pure.test.ts`:
 * every `lifeMs` leaves well over a second to see, decide and reach (a
 * four-year-old on a phone is nowhere near an adult's ~250 ms), and every level
 * is `isSustainable`, so the cap shapes the screen without ever throttling the
 * spawner. A game wanting its own numbers should keep both properties.
 */
export const SPAWN_PRESETS: Record<SpawnDifficulty, SpawnSpec> = {
  easy: { everyMs: 1400, lifeMs: 4200, maxAlive: 4 },
  medium: { everyMs: 1000, lifeMs: 3200, maxAlive: 5 },
  hard: { everyMs: 700, lifeMs: 2400, maxAlive: 6 },
};
