import type { GameContent, Locale } from "./types";
import { balloons } from "./games/balloons";
import { blocks } from "./games/blocks";
import { bees } from "./games/bees";
import { bubbles } from "./games/bubbles";
import { frog } from "./games/frog";
import { echo } from "./games/echo";
import { sequence } from "./games/sequence";
import { shadows } from "./games/shadows";
import { vanish } from "./games/vanish";
import { coloring } from "./games/coloring";
import { evolve } from "./games/evolve";
import { finddiff } from "./games/finddiff";
import { hidden } from "./games/hidden";
import { math } from "./games/math";
import { memory } from "./games/memory";
import { minesweeper } from "./games/minesweeper";
import { n2048 } from "./games/n2048";
import { reaction } from "./games/reaction";
import { snake } from "./games/snake";
import { sudoku } from "./games/sudoku";
import { tictactoe } from "./games/tictactoe";
import { lettercross } from "./games/lettercross";
import { wordguess } from "./games/wordguess";
import { sort } from "./games/sort";
import { merge } from "./games/merge";
import { pet } from "./games/pet";
import { fit } from "./games/fit";
import { match3 } from "./games/match3";
import { jigsaw } from "./games/jigsaw";
import { music } from "./games/music";
import { maze } from "./games/maze";
import { letters } from "./games/letters";
import { spell } from "./games/spell";
import { bubbleshooter } from "./games/bubbleshooter";

export type { GameContent, GameCopy, FaqItem, Titled, Provenance, Locale, PageLocale } from "./types";

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
  [blocks.id]: blocks,
  [minesweeper.id]: minesweeper,
  [n2048.id]: n2048,
  [tictactoe.id]: tictactoe,
  [balloons.id]: balloons,
  [bees.id]: bees,
  [bubbles.id]: bubbles,
  [frog.id]: frog,
  [reaction.id]: reaction,
  [echo.id]: echo,
  [sequence.id]: sequence,
  [shadows.id]: shadows,
  [vanish.id]: vanish,
  [coloring.id]: coloring,
  [evolve.id]: evolve,
  [finddiff.id]: finddiff,
  [hidden.id]: hidden,
  [math.id]: math,
  [lettercross.id]: lettercross,
  [wordguess.id]: wordguess,
  [sort.id]: sort,
  [merge.id]: merge,
  [pet.id]: pet,
  [fit.id]: fit,
  [match3.id]: match3,
  [jigsaw.id]: jigsaw,
  [music.id]: music,
  [maze.id]: maze,
  [letters.id]: letters,
  [spell.id]: spell,
  [bubbleshooter.id]: bubbleshooter,
};

/** The ids that have prose today. */
export const CONTENT_IDS = Object.keys(CONTENT);

export function contentFor(id: string, locale: Locale) {
  return CONTENT[id]?.copy[locale];
}
