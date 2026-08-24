import type { Category, GameMeta } from "@sdk/index";

/**
 * The roster the SHELL carries: every game's id, and full metadata for only the
 * games a visitor can see before scrolling.
 *
 * WHY THIS FILE EXISTS. `games.ts` imported all 33 `meta.ts` files statically so
 * the home grid could render without pulling any game code. That worked and it
 * made the first visit grow with the catalogue: measured on the served artifact
 * 2026-08-21, the metadata is ~91 B gz per game - `title` alone is 28.5 - paid by
 * every child, for cards most of them never scroll to. Pruning the five fields
 * the grid never reads (`ageBand`, `orientation`, `renderer`, `ownsChrome`,
 * `scoreUnit`) recovers 181 B in total, which does not buy even one game. The
 * only route to an O(1) first visit is that the shell stops carrying a RECORD per
 * game, which is what this file does.
 *
 * WHY THE IDS ARE STILL ALL HERE, as a plain string list. The grid lays out one
 * card per id immediately, so the page does not REFLOW when the rest arrive - the
 * cards below the fold simply fill in their label and colour, the same beat the
 * card art already has. 33 ids compress to a couple of bytes each; 33 records do
 * not. A game added below the fold therefore costs the shell its id and nothing
 * else.
 *
 * WHERE THE LINE IS DRAWN IS NOT A JUDGEMENT CALL. `SHELL_META_COUNT` must equal
 * `SHELL_ART_COUNT` in `src/ui/gameArt.ts` - the same question ("what is above
 * the fold") must not have two answers - and `roster-split.test.ts` fails the
 * build if they disagree, if `ROSTER_IDS` stops matching the full roster, or if
 * `gamesRest.ts` stops holding exactly the remainder.
 */

import { meta as memory } from "../games/memory/meta";
import { meta as evolve } from "../games/evolve/meta";
import { meta as coloring } from "../games/coloring/meta";
import { meta as finddiff } from "../games/finddiff/meta";
import { meta as hidden } from "../games/hidden/meta";
import { meta as math } from "../games/math/meta";
import { meta as n2048 } from "../games/n2048/meta";
import { meta as tictactoe } from "../games/tictactoe/meta";
import { meta as minesweeper } from "../games/minesweeper/meta";
import { meta as sudoku } from "../games/sudoku/meta";
import { meta as snake } from "../games/snake/meta";
import { meta as blocks } from "../games/blocks/meta";
import { meta as wordguess } from "../games/wordguess/meta";
import { meta as sequence } from "../games/sequence/meta";
import { meta as vanish } from "../games/vanish/meta";

/**
 * How many games' metadata a first visit carries. Equal to `SHELL_ART_COUNT` by
 * construction, asserted rather than remembered: they answer the same question.
 */
export const SHELL_META_COUNT = 15;

/** Every game, in the order the home grid renders it. Ids only - see above. */
export const ROSTER_IDS: ReadonlyArray<string> = [
  "memory",
  "evolve",
  "coloring",
  "finddiff",
  "hidden",
  "math",
  "2048",
  "tictactoe",
  "minesweeper",
  "sudoku",
  "snake",
  "blocks",
  "wordguess",
  "sequence",
  "vanish",
  "shadows",
  "echo",
  "balloons",
  "bubbles",
  "bees",
  "frog",
  "reaction",
  "sort",
  "merge",
  "pet",
  "fit",
  "music",
  "maze",
  "letters",
  "spell",
  "bubbleshooter",
  "match3",
  "jigsaw",
  "lettercross",
];

/**
 * Every game's CATEGORY, for the games whose metadata has not arrived yet.
 *
 * The home screen's filter chips are drawn from the categories that actually
 * hold a game, and three of them - `learn`, `speed` and `create` - have ALL of
 * their games below the fold. Without this, those three chips would appear a
 * beat after first paint and shift a row a four-year-old navigates by. The cards
 * they filter to can fill in late; the chips cannot.
 *
 * Measured at 5.1 B gz per game on the served artifact, which keeps the per-game
 * slope near 37 against the 40 B target. It is the one field worth buying back.
 */
export const ROSTER_CATEGORY: Readonly<Record<string, Category>> = {
  memory: "kids",
  evolve: "kids",
  coloring: "kids",
  finddiff: "kids",
  hidden: "kids",
  math: "learn",
  "2048": "classics",
  tictactoe: "classics",
  minesweeper: "classics",
  sudoku: "classics",
  snake: "classics",
  blocks: "classics",
  wordguess: "learn",
  lettercross: "classics",
  sequence: "think",
  vanish: "think",
  shadows: "think",
  echo: "think",
  balloons: "kids",
  bubbles: "learn",
  bees: "speed",
  frog: "speed",
  reaction: "speed",
  sort: "think",
  merge: "think",
  pet: "kids",
  fit: "think",
  music: "create",
  maze: "kids",
  letters: "learn",
  spell: "learn",
  bubbleshooter: "classics",
  match3: "think",
  jigsaw: "kids",
};

/** Full metadata for the games above the fold. The rest are in `gamesRest.ts`. */
export const SHELL_GAMES: ReadonlyArray<GameMeta> = [
  memory,
  evolve,
  coloring,
  finddiff,
  hidden,
  math,
  n2048,
  tictactoe,
  minesweeper,
  sudoku,
  snake,
  blocks,

  // The first game here that a player has to be able to READ, so its `ageBand`
  // is "all" - a five-year-old cannot play it - and it sits outside the kids
  // block above.
  wordguess,

  // Wave 1 - the pre-reading kids catalog, under `think`.
  sequence,
  vanish,
];
