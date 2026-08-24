/**
 * Lettercross - the bonus round behind ONE box. PURE: no DOM, no React, no
 * timers, so `bonus.test.ts` runs the real rule and `BonusRound.tsx` only draws
 * it. The same split as `boxes.ts`, for the same reason.
 *
 * STEP 3 OF THE GAME PLAN, and it is the decision point rather than a feature:
 * the original BONUS opens a sub mini-game behind each of its boxes, and the
 * question nobody can answer without playing it is whether being pulled OUT of
 * a word puzzle feels like a reward or like an interruption. So exactly one box
 * has one, and the rest keep the plain coin from step 2 - which is what lets
 * both be felt in the same run.
 *
 * WHAT IT IS: a marker sweeps the band, one tap stops it, where it stopped
 * decides how much the round was worth. One tap, no reading, no drag, ~2s.
 * A different ACTIVITY from laying letters, which is the whole point - a bonus
 * that were more word puzzle would not be being pulled out of anything, and
 * would test nothing.
 */

/** The three outcomes, which are `economy.ts`'s tiers and not a payout. */
export type BonusTier = "easy" | "medium" | "hard";

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

/**
 * Half-widths from the centre. Everything outside `MEDIUM` is `easy`.
 *
 * THERE IS NO MISS, and that is a rule rather than a generosity. This platform
 * does not punish: losing gives nothing and never takes anything away, so the
 * worst a bonus round can do is pay the smallest tier. A bonus that can pay
 * ZERO is a trap wearing a prize's clothes, and a child who reached that box
 * with a real word has already earned something.
 */
export const HARD_HALF = 0.08;
export const MEDIUM_HALF = 0.30;

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

/** What a stop at `pos` was worth. Clamped, so a bad caller cannot fall through. */
export function tierAt(pos: number): BonusTier {
  const d = Math.abs(Math.min(1, Math.max(0, pos)) - 0.5);
  if (d <= HARD_HALF) return "hard";
  if (d <= MEDIUM_HALF) return "medium";
  return "easy";
}

/** The band drawn as three zones, outer-in, as [start, end] pairs of 0..1. */
export const BONUS_ZONES: readonly { readonly tier: BonusTier; readonly from: number; readonly to: number }[] = [
  { tier: "easy", from: 0, to: 0.5 - MEDIUM_HALF },
  { tier: "medium", from: 0.5 - MEDIUM_HALF, to: 0.5 - HARD_HALF },
  { tier: "hard", from: 0.5 - HARD_HALF, to: 0.5 + HARD_HALF },
  { tier: "medium", from: 0.5 + HARD_HALF, to: 0.5 + MEDIUM_HALF },
  { tier: "easy", from: 0.5 + MEDIUM_HALF, to: 1 },
];

/**
 * WHICH BOX OPENS IT - `bell` because it is one of the two arts appearing
 * exactly once, so "one mini-game behind one box" is true by construction
 * rather than by a count somebody has to keep. `bonus.test.ts` refuses an art
 * that more than one box carries.
 */
export const BONUS_ART = "bell";
