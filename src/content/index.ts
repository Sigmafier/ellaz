import type { GameContent, Locale } from "./types";
import { memory } from "./games/memory";
import { snake } from "./games/snake";
import { sudoku } from "./games/sudoku";

export type { GameContent, GameCopy, FaqItem, Titled, Provenance, Locale } from "./types";

/**
 * Every game page's prose, keyed by the game id in `portal/catalog.ts`.
 *
 * Deliberately NOT reachable from the app. `no-app-imports.test.ts` forbids
 * portal, ui, sdk and games from importing this module, because one stray
 * import puts every word of every page into the precached shell that a child
 * downloads before they have chosen a game. The build-time page renderer is the
 * only consumer.
 *
 * The set is intentionally incomplete right now. Three pilots go in first, the
 * operator reads them and corrects the voice, and only then are the remaining
 * eighteen written - so a voice problem costs three pages instead of twenty-one.
 * `content.test.ts` asserts every id here exists in the catalog, but not yet the
 * reverse; that assertion turns on when the roster is complete.
 */
export const CONTENT: Record<string, GameContent> = {
  [memory.id]: memory,
  [sudoku.id]: sudoku,
  [snake.id]: snake,
};

/** The ids that have prose today. */
export const CONTENT_IDS = Object.keys(CONTENT);

export function contentFor(id: string, locale: Locale) {
  return CONTENT[id]?.[locale];
}
