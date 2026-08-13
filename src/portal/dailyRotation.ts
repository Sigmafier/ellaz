// Which game is today's puzzle — the ONE place the rotation is derived.
//
// The rule is pure and lives in `@sdk/daily` (`dailyPick`); the ROSTER is a
// fact about the catalogue, which the SDK is below in the module graph. This
// module is the binding between them, and it is deliberately the only one:
// `createContext` calls it to decide whether a mounting game is the daily, and
// `Home` calls it to draw the card. Two derivations would be two answers to
// "what is today's puzzle", and they would disagree at midnight.
//
// IMPORTS `@sdk/daily` DIRECTLY, NEVER `@sdk/index`. `createContext.ts` imports
// this file, and `@sdk/index` re-exports `createContext` — so reaching for the
// barrel here would close a runtime import cycle. `daily.ts` itself imports
// only `@shared/rng` and `./profile`, neither of which comes back this way.
import { dailyPick, localDateKey } from "@sdk/daily";
import type { GameMeta } from "@sdk/types";
import { GAMES } from "./games";

/** The roster as ids, in catalogue order. Derived once — the roster is a constant. */
const IDS: readonly string[] = GAMES.map((m) => m.id);

/** Today, in the DEVICE's timezone. Never `toISOString()` — see `localDateKey`. */
export function todayKey(now: Date = new Date()): string {
  return localDateKey(now);
}

/**
 * The id of the game that is the puzzle on `dateKey`, or undefined for a key
 * that is not a real day.
 *
 * This is the function `createContext` hands to `createDailyPort`, so it is
 * what decides whether a game's `complete()` counts toward the streak.
 */
export function dailyGameId(dateKey: string): string | undefined {
  return dailyPick(IDS, dateKey);
}

/**
 * Today's puzzle as a full `GameMeta`, for the home card.
 *
 * Undefined only if the roster and the catalogue disagree, which
 * `catalog.test.ts` already forbids — but a home screen must never render a
 * card for a game it cannot link to, so the caller gets to skip it rather than
 * a crash.
 */
export function todaysGame(dateKey: string = todayKey()): GameMeta | undefined {
  const id = dailyGameId(dateKey);
  return id === undefined ? undefined : GAMES.find((m) => m.id === id);
}
