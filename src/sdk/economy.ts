// The earn rates — PURE, zero I/O, and the single place economics are decided.
//
// This exists so 30+ games cannot each invent their own payout. A game says
// WHAT happened ("the player finished a hard level"); this module decides what
// that is worth. Games never pass a coin amount, and the wallet never takes one
// from them — see RewardsPort in types.ts.
import type { RewardGrant } from "./types";

export type RewardTier = "easy" | "medium" | "hard";

export type RewardReason =
  /** A level, round, or puzzle was finished. */
  | "level_complete"
  /** A mid-run progress ping in an endless game (every N points, a streak). */
  | "milestone"
  /** The player beat their own stored record. */
  | "personal_best";

/** The whole coin economy, in one table. Tune here, never at a call site. */
export const TIER_COINS: Record<RewardTier, number> = {
  easy: 3,
  medium: 5,
  hard: 8,
};

/** A milestone is a nudge, not an achievement — it pays a token amount. */
const MILESTONE_COINS = 1;

/**
 * Coins per mount an endless game can mint before payouts stop.
 *
 * shortcut: this number is a tunable GUESS, not a measured balance point. It
 * exists because snake, math and 2048 have no natural end, so without a ceiling
 * a player parked on one game could mint coins indefinitely and the shop would
 * lose all meaning. A per-mount budget is the cheapest ceiling that cannot be
 * farmed by grinding a single session.
 *
 * The upgrade path is a DAILY cap: once the profile carries a rolling
 * `earnedToday` + date stamp, move the ceiling there and let a mount spend
 * freely against it. That version survives a page reload, which this one
 * deliberately does not — remounting a game resets the budget, so this is a
 * brake on one long sitting, not an anti-cheat measure.
 */
export const SESSION_COIN_CAP = 40;

/**
 * The reasons that actually pay. A grant carrying anything else is not a
 * generous edge case, it is a BUG in the calling game, and it pays nothing.
 *
 * `RewardGrant.reason` is a TypeScript union, which is a compile-time promise
 * and not a runtime one: `SaveStore.get<T>` casts unvalidated JSON, so a
 * hand-edited or truncated save can put any string here. Checking the value at
 * runtime is the only thing that actually holds.
 */
const KNOWN_REASONS: ReadonlySet<string> = new Set<RewardReason>([
  "level_complete",
  "milestone",
  "personal_best",
]);

/**
 * What a grant is worth in coins. Never negative, never NaN.
 *
 * Two fallbacks, and they deliberately point in OPPOSITE directions:
 *
 * - An OMITTED tier is treated as the gentlest one, so a game that forgets to
 *   declare its difficulty under-pays rather than over-pays.
 * - An UNKNOWN tier or reason pays ZERO. It cannot be honoured, and honouring
 *   it by accident is how a typo becomes an economy.
 *
 * The `?? TIER_COINS.easy` is load-bearing rather than defensive: without it an
 * out-of-union tier indexes to `undefined`, which propagates to `NaN`, which
 * serialises as `null`, which the profile migration then reads back as 0 — so a
 * single bad string does not under-pay a child, it silently ANNIHILATES their
 * balance and poisons the session budget for every valid grant after it.
 */
export function coinsFor(g: RewardGrant): number {
  if (!KNOWN_REASONS.has(g.reason)) return 0;
  if (g.reason === "milestone") return MILESTONE_COINS;
  return TIER_COINS[g.tier ?? "easy"] ?? TIER_COINS.easy;
}

/**
 * What a grant is worth in stars. Stars are the trophy currency: one per real
 * accomplishment, none for a mid-run milestone, and never spendable.
 *
 * An unknown reason earns no star, which also keeps it out of the win count —
 * the wallet increments `wins` from `stars > 0`, so failing closed here fails
 * closed there too.
 */
export function starsFor(g: RewardGrant): number {
  if (!KNOWN_REASONS.has(g.reason)) return 0;
  return g.reason === "milestone" ? 0 : 1;
}
