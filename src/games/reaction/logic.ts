// Green Light ("אור ירוק") — PURE rules. No DOM, no React, no Phaser.
//
// A traffic light sits red for an unpredictable while, turns green, and the
// child taps as fast as they can. Two properties carry the whole game, and both
// live in this file:
//
//   1. THE WAIT MUST BE UNPREDICTABLE, AND BOUNDED. If the child can anticipate
//      the change they start moving before it happens, and the number stops
//      being a reaction time — it becomes a measure of how well they guessed.
//      But a wait that is merely LONG fails the other way: a four-year-old will
//      not sit through eight seconds of nothing, and a round they abandon
//      measures nothing at all. So every band is wide (`MIN_SPREAD_MS`) and
//      capped (`WAIT_CEIL_MS`), and the difficulty ladder widens the band rather
//      than lengthening it — nothing about a reaction depends on how long you
//      waited for it.
//
//   2. AN EARLY TAP IS NOT A LOSS. Tapping while the light is still red re-arms
//      it with a fresh wait and says "not yet". There is no failure phase in
//      `Attempt` to reach, which is the structural version of that promise
//      rather than a policy a renderer has to remember. The re-armed wait has a
//      FLOOR (`REARM_MIN_MS`) so a child who is mashing cannot land a tap that
//      happens to arrive just after a very short re-arm and have it recorded as
//      a reaction time.
//
// This file deliberately does NOT use `@shared/spawn.pure`. That module answers
// "when does a prop exist, and did a tap hit the right kind of it" for a STREAM
// of moving props across lanes. Here there is exactly one target, it never
// moves, it never expires, and the only interesting quantity is a TIMESTAMP —
// which the spawner does not model. Wiring it in would mean one lane, a cap of
// one, and an infinite lifetime: every knob neutralised, and a reader misled
// into thinking props are spawning.
//
// Import pure modules by DIRECT path, never the `@shared` barrel — the barrel
// re-exports React components (enforced by `src/games/logic-is-pure.test.ts`).

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;

export type Difficulty = (typeof DIFFICULTIES)[number];

/**
 * The shortest wait any level may ask for.
 *
 * Below about a second the light changes while the child is still settling from
 * the tap that started the round, so the "reaction" includes them noticing that
 * the round began at all.
 */
export const WAIT_FLOOR_MS = 900;

/**
 * The longest wait any level may ask for.
 *
 * Five seconds is already a long time to a four-year-old. Past it they look
 * away, and a child looking away is not reacting to anything.
 */
export const WAIT_CEIL_MS = 5000;

/**
 * The narrowest band that is still genuinely unpredictable.
 *
 * A band tighter than this can be counted to, and a child who counts is timing
 * their own count rather than the light.
 */
export const MIN_SPREAD_MS = 1200;

/**
 * The floor on a wait that was RE-ARMED after an early tap.
 *
 * Chosen to sit above every level's `minWaitMs` (so it actually binds) and below
 * every level's `maxWaitMs` (so re-arms still vary instead of collapsing onto
 * one value a masher could learn). Both pinned in `logic.test.ts`.
 */
export const REARM_MIN_MS = 1400;

export interface LevelConfig {
  minWaitMs: number;
  maxWaitMs: number;
}

/**
 * The three bands. Harder means WIDER, not longer-on-average by much: the skill
 * being asked for is holding still through an unknown wait, and that gets harder
 * as the wait becomes less guessable.
 */
export const LEVELS: Record<Difficulty, LevelConfig> = {
  easy: { minWaitMs: 1000, maxWaitMs: 2600 },
  medium: { minWaitMs: 1100, maxWaitMs: 3800 },
  hard: { minWaitMs: 1200, maxWaitMs: 5000 },
};

function levelOf(d: Difficulty): LevelConfig {
  return LEVELS[d] ?? LEVELS.easy;
}

/** Clamp anything at all into [0,1]. A broken draw becomes the low end. */
function unit(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

function sample(lo: number, hi: number, rng: () => number): number {
  const a = Math.min(lo, hi);
  const b = Math.max(lo, hi);
  return Math.round(a + unit(rng()) * (b - a));
}

/**
 * How long the light stays red this time.
 *
 * The `rng` parameter goes LAST and defaults to `Math.random`, matching every
 * other game in the repo. TOTAL over every input: a nonsense draw or an unknown
 * difficulty degrades to a playable wait inside a real band, never to an instant
 * green (which reads as a broken game) or to a minute of nothing.
 */
export function waitMs(d: Difficulty, rng: () => number = Math.random): number {
  const { minWaitMs, maxWaitMs } = levelOf(d);
  return sample(minWaitMs, maxWaitMs, rng);
}

/** The wait after an early tap: same band, but never below the floor. */
export function rearmWaitMs(d: Difficulty, rng: () => number = Math.random): number {
  const { minWaitMs, maxWaitMs } = levelOf(d);
  return sample(Math.max(minWaitMs, REARM_MIN_MS), maxWaitMs, rng);
}

export type Phase = "ready" | "waiting" | "go" | "result";

/**
 * One go at the light.
 *
 * THERE IS NO "LOST" PHASE, and that absence is the design. `earlyTaps` is a
 * counter kept because it is interesting, not because it costs anything — it
 * feeds a gentle "not yet", never a score.
 */
export interface Attempt {
  phase: Phase;
  /** The armed wait for THIS attempt, in ms of GAME-clock time (pause-aware). */
  waitMs: number;
  earlyTaps: number;
  /** The measured reaction once `phase` is "result". 0 before that, and 0 for
   *  any reading that came back unreadable. */
  reactionMs: number;
}

export const READY: Attempt = { phase: "ready", waitMs: 0, earlyTaps: 0, reactionMs: 0 };

export function armAttempt(d: Difficulty, rng: () => number = Math.random): Attempt {
  return { phase: "waiting", waitMs: waitMs(d, rng), earlyTaps: 0, reactionMs: 0 };
}

/**
 * The child tapped while the light was still red.
 *
 * Stays in "waiting" with a NEW wait. Nothing is lost, nothing is scored, and
 * nothing scolds. Every transition below is NON-MUTATING and returns the SAME
 * object when it does not apply, so a stray pointer event in the wrong phase is
 * a no-op rather than a corrupted attempt.
 */
export function tapEarly(a: Attempt, d: Difficulty, rng: () => number = Math.random): Attempt {
  if (a.phase !== "waiting") return a;
  return {
    phase: "waiting",
    waitMs: rearmWaitMs(d, rng),
    earlyTaps: a.earlyTaps + 1,
    reactionMs: 0,
  };
}

/** The wait elapsed — the light is green. */
export function goLive(a: Attempt): Attempt {
  if (a.phase !== "waiting") return a;
  return { ...a, phase: "go" };
}

/** The child tapped on green. `reactionMs` is the measurement (see the renderer). */
export function tapGo(a: Attempt, reactionMs: number): Attempt {
  if (a.phase !== "go") return a;
  const r = Math.round(reactionMs);
  // An unreadable reading is a measurement bug, not a superhuman child: it lands
  // at zero, which `isPlausible` then refuses to bank.
  return { ...a, phase: "result", reactionMs: Number.isFinite(r) && r > 0 ? r : 0 };
}

/**
 * How the result screen congratulates the child.
 *
 * Every band is positive — there is no band for "too slow", because there is no
 * too slow here. A five-year-old's simple visual reaction is nowhere near an
 * adult's ~250 ms, so "steady" is the ordinary case and is still praise.
 */
export type Praise = "steady" | "good" | "quick" | "lightning";

export const LIGHTNING_AT = 350;
export const QUICK_AT = 550;
export const GOOD_AT = 900;

export function praiseFor(ms: number): Praise {
  if (!(ms >= LIGHTNING_AT)) {
    // Written this way so NaN falls in here, and then out to "steady": a broken
    // clock must never read as the fastest tap of the child's life.
    return Number.isFinite(ms) && ms > 0 ? "lightning" : "steady";
  }
  if (ms < QUICK_AT) return "quick";
  if (ms < GOOD_AT) return "good";
  return "steady";
}

/**
 * Faster than a human being can respond to something they did not expect.
 *
 * Simple visual reaction has a physiological floor around 150 ms even for
 * trained adults; anything under this came from moving BEFORE green, or from two
 * pointer events merging. Such a reading is still praised (kindly), but it may
 * never become the record — an unbeatable 3 ms best would end the game.
 */
export const ANTICIPATION_MS = 120;

/**
 * Past this the child was not present for the measurement: a backgrounded tab, a
 * phone call, someone walking off. The elapsed time is real and means nothing.
 */
export const STALE_MS = 10_000;

export function isPlausible(ms: number): boolean {
  return Number.isFinite(ms) && ms >= ANTICIPATION_MS && ms <= STALE_MS;
}

/** No record yet. Lower is better here, so zero cannot double as a score. */
export const NO_BEST = 0;

export function isNewBest(prevBestMs: number, ms: number): boolean {
  if (!isPlausible(ms)) return false;
  // A corrupt stored best (NaN, negative, a hand-edited save) reads as "none"
  // rather than throwing — `SaveStore.get<T>` casts unvalidated JSON.
  if (!(prevBestMs > 0)) return true;
  return ms < prevBestMs;
}

export function bestOf(prevBestMs: number, ms: number): number {
  if (isNewBest(prevBestMs, ms)) return Math.round(ms);
  return prevBestMs > 0 ? prevBestMs : NO_BEST;
}

/**
 * Which timestamp to treat as the moment the finger landed.
 *
 * A pointer event carries its OWN timestamp, taken at dispatch; calling
 * `performance.now()` inside the handler measures a later moment, after event
 * dispatch and queueing (and after whatever else the main thread was doing).
 * The event's stamp is the earlier and truer number — WHEN it is on the same
 * timebase. Some engines stamp events with epoch milliseconds instead, and
 * subtracting a `performance.now()`-based paint time from 1.7e12 yields a
 * "reaction time" of about fifty-four years.
 *
 * So: use the event's stamp when it is plausibly the same clock, and fall back
 * to `now` otherwise. Falling back is always SAFE — it can only make the
 * measured time slightly longer, never impossibly short.
 */
export const TAP_TIME_SLACK_MS = 2000;

export function readTapTime(eventTimeStamp: number, now: number): number {
  if (!Number.isFinite(now)) return Number.isFinite(eventTimeStamp) ? eventTimeStamp : 0;
  if (!Number.isFinite(eventTimeStamp)) return now;
  if (eventTimeStamp <= 0) return now;
  // Comfortably ahead of `now` ⇒ a different timebase (epoch), not this tap.
  if (eventTimeStamp > now + 250) return now;
  // Far behind ⇒ a stale or replayed stamp.
  if (eventTimeStamp < now - TAP_TIME_SLACK_MS) return now;
  return eventTimeStamp;
}

/**
 * How often an endless run drips a coin.
 *
 * One per success turns a three-second loop into a slot machine and burns the
 * session cap in under two minutes. Every third keeps the pace of a reward
 * roughly one per ten seconds of play.
 */
export const MILESTONE_EVERY = 3;

export function isMilestone(successCount: number): boolean {
  if (!Number.isFinite(successCount) || successCount <= 0) return false;
  return successCount % MILESTONE_EVERY === 0;
}

/** The time as the child sees it: "0.41", not "412". */
export function seconds(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0.00";
  return (ms / 1000).toFixed(2);
}
