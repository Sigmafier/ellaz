/**
 * Lettercross - the bonus rounds behind the prize boxes. PURE: no DOM, no
 * React, no timers, so `bonus.test.ts` runs the real rules and the renderers
 * only draw them. The same split as `boxes.ts`, for the same reason.
 *
 * STEP 3 ASKED THE QUESTION, STEP 5 ANSWERS IT. One round shipped first so the
 * operator could judge whether being pulled OUT of a word puzzle feels like a
 * reward or an interruption. It felt good, so the other four arts get one.
 *
 * FIVE DIFFERENT VERBS, and that is the design rather than five skins:
 *
 *   bell   STOP a moving thing        timing
 *   gem    REMEMBER where it went     memory
 *   star   TAP many, quickly          speed
 *   leaf   COUNT what you saw         subitising
 *   drop   HOLD and let go            control
 *
 * Five variations on one timing bar would be one mini-game wearing five hats,
 * and the point of a bonus is that it is a different ACTIVITY from laying
 * letters. It is also why none of them is a word: a word puzzle inside a word
 * puzzle is not a break from anything.
 *
 * ONE SCORER FOR ALL FIVE. Every round reduces to a QUALITY in 0..1 and
 * `tierOf` alone turns that into a tier, so five games cannot drift into five
 * pay scales - the same argument `economy.ts` makes one layer up, where a game
 * reports a reason and never an amount.
 */

/** The three outcomes, which are `economy.ts`'s tiers and not a payout. */
export type BonusTier = "easy" | "medium" | "hard";

/** Which arts have a round. Every prize art does; `lock` is step 4's. */
export type BonusArt = "bell" | "gem" | "star" | "leaf" | "drop";
export const BONUS_ARTS: readonly BonusArt[] = ["bell", "gem", "star", "leaf", "drop"];

/**
 * HOW WELL DID THAT GO -> WHAT IT WAS WORTH. The one place five games agree.
 *
 * THERE IS NO MISS, and that is a rule rather than a generosity. This platform
 * does not punish: losing gives nothing and never takes anything away, so the
 * worst a round can do is pay the smallest tier. A bonus that can pay ZERO is a
 * trap wearing a prize's clothes, and a player who reached that box with a real
 * word has already earned something.
 *
 * The two thresholds are the bell round's original geometry read back as a
 * quality, so step 3's behaviour is unchanged to the digit - `bonus.test.ts`
 * asserts `tierAt` and `tierOf` agree across the whole band, which is what
 * makes this a refactor rather than a re-tune.
 */
export const HARD_Q = 0.84;
export const MEDIUM_Q = 0.4;

export function tierOf(quality: number): BonusTier {
  const q = Math.min(1, Math.max(0, quality));
  if (q >= HARD_Q) return "hard";
  if (q >= MEDIUM_Q) return "medium";
  return "easy";
}

// ---------------------------------------------------------------- bell: STOP

/**
 * ONE PASS OF THE BAND, edge to edge, in ms.
 *
 * Tuned rather than derived, and the trade is legibility against skill: the
 * middle zone is 16% of the band, so at 1300ms it is a 208ms window - a real
 * aim for an adult and forgiving enough that a child mostly lands the middle
 * tier rather than the floor. Faster than about 900ms and the middle stops
 * being hittable on purpose, which turns a skill into a slot machine.
 */
export const SWEEP_MS = 1300;

/** Half-widths from the centre. Everything outside `MEDIUM` is `easy`. */
export const HARD_HALF = 0.08;
export const MEDIUM_HALF = 0.3;

/**
 * Where the marker sits at `elapsedMs`, as 0..1 across the band.
 *
 * A TRIANGLE WAVE OF WALL-CLOCK TIME, never a per-frame increment. A position
 * accumulated frame by frame runs at the display's speed - twice as fast on a
 * 120Hz laptop as on a 60Hz phone, so the same tap is a different game on a
 * different screen. Derived from elapsed time it is identical on both, and the
 * renderer's rAF loop becomes a way of ASKING rather than a clock.
 * See .claude/rules/fixed-timestep-must-match-display.md.
 */
export function sweepAt(elapsedMs: number, periodMs: number = SWEEP_MS): number {
  const t = (Math.max(0, elapsedMs) % (periodMs * 2)) / periodMs; // 0..2
  return t <= 1 ? t : 2 - t;
}

/** How central a stop was, as 0..1. The centre is 1, either edge is 0. */
export function sweepQuality(pos: number): number {
  return 1 - Math.abs(Math.min(1, Math.max(0, pos)) - 0.5) / 0.5;
}

/** What a stop at `pos` was worth. Clamped, so a bad caller cannot fall through. */
export function tierAt(pos: number): BonusTier {
  return tierOf(sweepQuality(pos));
}

/** The band drawn as three zones, outer-in, as [start, end] pairs of 0..1. */
export const BONUS_ZONES: readonly { readonly tier: BonusTier; readonly from: number; readonly to: number }[] = [
  { tier: "easy", from: 0, to: 0.5 - MEDIUM_HALF },
  { tier: "medium", from: 0.5 - MEDIUM_HALF, to: 0.5 - HARD_HALF },
  { tier: "hard", from: 0.5 - HARD_HALF, to: 0.5 + HARD_HALF },
  { tier: "medium", from: 0.5 + HARD_HALF, to: 0.5 + MEDIUM_HALF },
  { tier: "easy", from: 0.5 + MEDIUM_HALF, to: 1 },
];

// ------------------------------------------------------------ gem: REMEMBER

export const CUPS = 3;
export const GEM_SWAPS = 4;
/** One swap, then a beat to read it. Slower than the eye needs, on purpose. */
export const GEM_SWAP_MS = 620;
/** How long the gem is shown before the cups close over it. */
export const GEM_PEEK_MS = 900;

/** A swap is the two cups that trade places, as indices into 0..CUPS-1. */
export type Swap = readonly [number, number];

/**
 * The shuffle, as data. Deterministic from `rng` so a test can follow it, and
 * generated rather than authored so nobody can learn one pattern.
 *
 * Consecutive identical swaps are rejected: A-B then A-B again is a no-op that
 * LOOKS like two moves, so a player who tracked it correctly sees the gem end
 * up where they were sure it would not. That is not difficulty, it is a lie.
 */
export function gemSwaps(rng: () => number = Math.random, n: number = GEM_SWAPS): Swap[] {
  const out: Swap[] = [];
  let last = "";
  for (let i = 0; i < n; i++) {
    let a = 0, b = 0, key = "";
    do {
      a = Math.floor(rng() * CUPS);
      b = Math.floor(rng() * CUPS);
      key = [a, b].sort().join("-");
    } while (a === b || key === last);
    last = key;
    out.push([a, b]);
  }
  return out;
}

/** Where the gem ends up, having started under `from` and taken every swap. */
export function gemAfter(from: number, swaps: readonly Swap[]): number {
  let at = from;
  for (const [a, b] of swaps) at = at === a ? b : at === b ? a : at;
  return at;
}

/** Right or wrong, and nothing between - three cups have no near miss. */
export function gemQuality(picked: number, actual: number): number {
  return picked === actual ? 1 : 0;
}

// --------------------------------------------------------------- star: SPEED

export const STARS = 5;
/** How long each star stays lit. One is always lit, so the round is ~3.4s. */
export const STAR_LIT_MS = 680;

/**
 * Which star lights on each beat. Never the same one twice running, so the
 * round always asks the hand to MOVE - a repeat is a free hit, and a game that
 * scores free hits stops measuring anything.
 */
export function starOrder(rng: () => number = Math.random, n: number = STARS): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let k = Math.floor(rng() * STARS);
    if (out.length && k === out[out.length - 1]) k = (k + 1) % STARS;
    out.push(k);
  }
  return out;
}

/** Plain hit rate. Five of five is 1, and three of five is medium. */
export function starQuality(hits: number, total: number = STARS): number {
  return total <= 0 ? 0 : Math.min(1, Math.max(0, hits / total));
}

// ---------------------------------------------------------------- leaf: COUNT

export const LEAF_MIN = 3;
export const LEAF_MAX = 7;
/** How long the leaves are on screen. Too short to count one by one. */
export const LEAF_FLASH_MS = 800;

/** How many leaves fell. Small enough to SEE rather than count. */
export function leafCount(rng: () => number = Math.random): number {
  return LEAF_MIN + Math.floor(rng() * (LEAF_MAX - LEAF_MIN + 1));
}

/**
 * Exact, near, or neither.
 *
 * OFF BY ONE IS HALF MARKS rather than nothing, because six leaves seen for
 * 800ms and answered "five" is a good look at a hard question. Scoring it the
 * same as "three" would tell a player their estimate was worthless when it was
 * nearly right, and this is the one round where the honest answer is a range.
 */
export function leafQuality(answer: number, actual: number): number {
  const off = Math.abs(answer - actual);
  return off === 0 ? 1 : off === 1 ? 0.5 : 0;
}

// ----------------------------------------------------------------- drop: HOLD

/** How long a hold takes to fill the jar from empty to the brim. */
export const FILL_MS = 2200;
/** The line to stop at. Off-centre, so "hold about half" is not the answer. */
export const FILL_TARGET = 0.72;
/** How far off the line still scores anything at all. */
export const FILL_TOLERANCE = 0.34;

/**
 * How full the jar is after holding for `elapsedMs`. Wall-clock, capped at the
 * brim - the same argument as `sweepAt`, and for the same reason.
 */
export function fillAt(elapsedMs: number, periodMs: number = FILL_MS): number {
  return Math.min(1, Math.max(0, elapsedMs) / periodMs);
}

/**
 * How close to the line the release was.
 *
 * A JAR THAT REACHES THE BRIM HAS SPILLED, and spilling scores zero rather
 * than a near miss - otherwise the strongest play is to hold and never let go,
 * which is a round you win by not playing it. It still pays the easy tier,
 * because nothing here punishes; it simply pays the least.
 */
export function fillQuality(fill: number): number {
  if (fill >= 1) return 0;
  return Math.max(0, 1 - Math.abs(fill - FILL_TARGET) / FILL_TOLERANCE);
}
