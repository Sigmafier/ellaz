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
  | "personal_best"
  /**
   * A DAILY-PUZZLE STREAK reached a new milestone length — 3 days in a row, 7,
   * 14, then every 30. Not a game's to report: see `GAME_REASONS` below.
   */
  | "streak"
  /**
   * A PASS-AND-PLAY MATCH between two people on this one device finished.
   *
   * Reported once per MATCH and never per winner — see `VERSUS_MATCH_COINS`,
   * which is where the whole two-player payout argument lives.
   */
  | "versus_complete";

/**
 * The reasons a GAME may report through its own `RewardsPort`.
 *
 * `streak` is deliberately absent. A game knows what happened inside itself and
 * nothing about days: `daily.ts` alone decides that a day counted, and its
 * milestone latch alone decides that a milestone is due. Without this list a
 * game could report `{ reason: "streak" }` on every frame and mint coins up to
 * the session cap — the same class of hole as a game asking for 500 coins,
 * which `grant()` already refuses by taking a reason instead of an amount.
 *
 * `wallet.grantStreak()` is the one door `streak` comes through, and no game
 * holds a reference to the wallet.
 */
export const GAME_REASONS: ReadonlySet<string> = new Set<RewardReason>([
  "level_complete",
  "milestone",
  "personal_best",
  // Pass-and-play. A game DOES get to say this one, and the reason that is safe
  // is not trust — it is that saying it more often earns LESS than the solo path
  // the very same taps would already have earned. See `VERSUS_MATCH_COINS`.
  "versus_complete",
]);

/** The whole coin economy, in one table. Tune here, never at a call site. */
export const TIER_COINS: Record<RewardTier, number> = {
  easy: 3,
  medium: 5,
  hard: 8,
};

/** A milestone is a nudge, not an achievement — it pays a token amount. */
const MILESTONE_COINS = 1;

/**
 * What one daily-streak milestone pays. FLAT, and small on purpose.
 *
 * THE TRAP THIS NUMBER EXISTS TO AVOID: the shop is the only coin sink in this
 * app. A reward that fires once a day, forever, is a faucet into a bucket with
 * a fixed bottom — after a fortnight nothing in the shop costs anything, which
 * quietly deletes the only reason coins exist. So the daily puzzle pays NOTHING
 * for merely being played. Coins arrive only at a MILESTONE length, and only
 * the first time that length is ever reached (`paid` in `daily.ts` is a
 * permanent high-water mark). A child playing every day for a year is paid
 * about seventeen times, not 365.
 *
 * It is flat rather than a ladder because the SCHEDULE already does the
 * shaping: the rungs are 3, 7, 14, 30 and then every 30, so later payouts are
 * rarer without anyone having to price rarity twice. Splitting "how often" from
 * "how much" is the same split as the one between this file and `score.ts` —
 * and it means tuning the ladder never touches this number.
 *
 * A tier is never consulted: there is no easy or hard way to come back
 * tomorrow.
 */
export const STREAK_COINS = 6;

/**
 * What a finished PASS-AND-PLAY match pays. One flat coin, no tier, no star.
 *
 * THE PROBLEM THIS NUMBER SOLVES. Two people on one device share ONE profile
 * and ONE wallet, so "pay the winner" is not a thing this app can express — the
 * coins land in the same purse either way. And nothing can tell two children
 * apart from one child tapping both sides, because there IS nothing to tell
 * them apart WITH: no accounts, no logins, no second device. So a two-player
 * mode that pays like a solo win is a coin printer with a friendly face, and no
 * amount of detection would fix it. The payout has to be safe by ARITHMETIC.
 *
 * So it is: a match pays strictly LESS than the weakest solo win there is
 * (`TIER_COINS.easy`, 3). A child who wants coins is better off playing alone —
 * five taps of solo tictactoe on easy pay 3, the same five taps tapping both
 * sides of a versus match pay 1. Farming this mode is a way to earn a THIRD of
 * what the child could already earn, which is the only kind of "cannot be
 * farmed" that survives having no way to identify anybody.
 * `versus.test.ts` pins that ordering, and it goes red if the reason is ever
 * routed through the tier table.
 *
 * WHY IT IS PER MATCH AND NOT PER WIN. Because a loss must not be a punishment
 * — that is the whole platform. The coin is for FINISHING something together,
 * so it lands whoever won, and the child who lost sees it land too. It is also
 * why there is no tier: a "hard" match is not harder for the wallet.
 *
 * WHY NO STAR. Stars are never spent and never lost, they drive the profile's
 * win count, and `requiresStars` turns them into ACCESS to the premium shelf.
 * A star is the trophy for something the profile's owner did; beating a sibling
 * at snap is a fact about two people, one of whom is not the profile. Minting
 * one here would farm the one currency the coin cap does not bound.
 */
export const VERSUS_MATCH_COINS = 1;

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
  "streak",
  "versus_complete",
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
  if (g.reason === "streak") return STREAK_COINS;
  // FLAT, and the `tier` a game passed is deliberately ignored. Falling through
  // to the table below would let a "hard" match pay 8 against solo easy's 3,
  // and the whole safety argument in VERSUS_MATCH_COINS is that it cannot.
  if (g.reason === "versus_complete") return VERSUS_MATCH_COINS;
  return TIER_COINS[g.tier ?? "easy"] ?? TIER_COINS.easy;
}

/**
 * What a grant is worth in stars. Stars are the trophy currency: one per real
 * accomplishment, none for a mid-run milestone, and never spendable.
 *
 * An unknown reason earns no star, which also keeps it out of the win count —
 * the wallet increments `wins` from `stars > 0`, so failing closed here fails
 * closed there too.
 *
 * A STREAK milestone earns one, and that star is the larger half of the payout.
 * A star is never spent and never lost, so unlike a coin it cannot inflate
 * anything — and `requiresStars` in the shop already turns a star count into
 * ACCESS. So the answer to "what does coming back every day buy" is: the
 * premium shelf, through the gate that was already there, rather than a
 * parallel mechanism or a bigger pile of coins.
 */
export function starsFor(g: RewardGrant): number {
  if (!KNOWN_REASONS.has(g.reason)) return 0;
  // `versus_complete` joins `milestone` on the no-star side, and for a sharper
  // reason than "it is small": a star is ACCESS (the shop's `requiresStars`) and
  // it is the profile's win count, and neither belongs to a match played by two
  // people sharing one profile. See VERSUS_MATCH_COINS.
  return g.reason === "milestone" || g.reason === "versus_complete" ? 0 : 1;
}
