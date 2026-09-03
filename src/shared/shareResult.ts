// The win-screen share chip's plumbing - what game is being played, and the
// pure text for what just happened, both handed to the portal layer without
// this file ever touching the DOM.
//
// Two halves, on purpose:
//
//   THE PURE HALF (`resultLineFor`) turns a run's ScoreReport plus whether it
//   was a personal best into ONE LINE OF TEXT - "New best: 14" - the exact
//   shape `buildGameInvite` in `sdk/share.ts` expects on `GameInvite.resultLine`.
//   Labels are handed in already resolved to the reader's language, the same
//   discipline `buildGameInvite`'s own `InviteLabels` holds itself to: this file
//   has no opinion about which of eleven languages the reader speaks.
//
//   THE WIRING HALF is two module-level registries, the same shape
//   `portal/WalletChip.tsx`'s anchor registry already uses for the same reason:
//   `winMoment()` runs inside `src/shared`, which knows nothing about a game's
//   id, its title, or its own portal chrome - a game only ever talks to
//   GameContext. `GameHost` registers what IT knows (which game, its title, its
//   page) when a game mounts, and a handler for what to DO about a win; winMoment
//   reports that a win happened and what it scored, and neither side needs to
//   know whether the other exists. A hand-built test context, the standalone
//   bundle (see GameHost's variant guard), or a win fired before GameHost
//   finished registering all resolve to the same thing: nothing listens, so
//   nothing happens.
//
// PURE where it can be, so `resultLineFor` is unit-testable with no browser at
// all - the same reason `sdk/share.ts` stays DOM-free.
import type { ScoreReport } from "@sdk/index";
import { formatScore, isRankable } from "@sdk/index";

/** What GameHost knows about the game currently mounted, once it does. */
export interface CurrentGameInvite {
  gameId: string;
  /** Already resolved to the reader's language. */
  title: string;
  emoji?: string;
  /** THIS game's own page, in the reader's language, base-aware. */
  url: string;
}

let currentGame: CurrentGameInvite | null = null;

/**
 * Called by GameHost on mount, and with `null` on unmount / while no game's
 * page-level identity is known yet. A game that has exited must not leave its
 * predecessor's title sitting behind for a chip nobody asked to see.
 */
export function registerCurrentGame(game: CurrentGameInvite | null): void {
  currentGame = game;
}

/** What a share fired right now would be about, or null if nothing is mounted. */
export function getCurrentGame(): CurrentGameInvite | null {
  return currentGame;
}

/** What a win handed to winMoment() looked like, narrowed to what a share needs. */
export interface WinShareEvent {
  /** The run's own score report, if this game reports one at all. */
  score?: ScoreReport;
  /** Whether THIS run set a new personal best. */
  isPersonalBest: boolean;
}

type ShareChipHandler = (event: WinShareEvent) => void;
let chipHandler: ShareChipHandler | null = null;

/** Called by GameHost to say what happens when a win fires. `null` stops listening. */
export function registerShareChipHandler(fn: ShareChipHandler | null): void {
  chipHandler = fn;
}

/**
 * Called by winMoment() on every win, after the coins are already banked. A
 * no-op whenever nothing is registered - see the file header for the three
 * ordinary reasons that is. Does NOT swallow a throw from the handler itself -
 * winMoment() already wraps this call in the same try/catch that guards every
 * other cosmetic, and a second layer here would only hide which one failed.
 */
export function announceWinShare(event: WinShareEvent): void {
  chipHandler?.(event);
}

/**
 * ONE LINE describing what this run did, or undefined for a game with no
 * score at all - `coloring`, or a run whose value could not be ranked
 * (`isRankable`). That absence is deliberate, not a gap to fill in: it is what
 * lets `buildGameInvite` fall back to its plain "come play this game" invite,
 * exactly as it already does for the page-level share button.
 *
 * Labels are already resolved strings, never i18n keys - this function has no
 * `t()` and must not grow one; the reader's language is the caller's problem,
 * the same split `buildGameInvite`'s `InviteLabels` already draws.
 */
export function resultLineFor(
  score: ScoreReport | undefined,
  isPersonalBest: boolean,
  labels: { best: string; scored: string },
): string | undefined {
  if (!score || !isRankable(score.value)) return undefined;
  const formatted = formatScore(score.value, score.unit);
  const label = isPersonalBest ? labels.best : labels.scored;
  return `${label} ${formatted}`;
}
