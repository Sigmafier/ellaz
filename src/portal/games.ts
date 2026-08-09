import type { GameMeta } from "@sdk/index";

// Each game's metadata lives in its own DOM-free `meta.ts`. They are imported
// statically here so the home grid renders instantly without pulling any game
// code (or React, or Phaser) into the shell bundle.
import { meta as memory } from "../games/memory/meta";
import { meta as coloring } from "../games/coloring/meta";
import { meta as finddiff } from "../games/finddiff/meta";
import { meta as hidden } from "../games/hidden/meta";
import { meta as math } from "../games/math/meta";
import { meta as n2048 } from "../games/n2048/meta";
import { meta as tictactoe } from "../games/tictactoe/meta";
import { meta as minesweeper } from "../games/minesweeper/meta";
import { meta as sudoku } from "../games/sudoku/meta";
import { meta as snake } from "../games/snake/meta";
import { meta as sequence } from "../games/sequence/meta";
import { meta as vanish } from "../games/vanish/meta";
import { meta as shadows } from "../games/shadows/meta";
import { meta as sortsize } from "../games/sortsize/meta";
import { meta as echo } from "../games/echo/meta";
import { meta as evolve } from "../games/evolve/meta";
import { meta as balloons } from "../games/balloons/meta";
import { meta as bubbles } from "../games/bubbles/meta";
import { meta as bees } from "../games/bees/meta";
import { meta as frog } from "../games/frog/meta";
import { meta as reaction } from "../games/reaction/meta";
import { meta as blocks } from "../games/blocks/meta";

/**
 * The roster, in the order the home grid renders it.
 *
 * WHY THIS IS NOT IN `catalog.ts`
 * `catalog.ts` pairs each game with a `() => import(...)` loader, so importing
 * it drags the whole lazy-game graph along. The build-time page emitter
 * (`src/build/**`) needs the METADATA and must never touch game code - it runs
 * in Node, inside `vite.config.ts`, where a stray `import("../games/snake")`
 * would try to load Phaser at config time.
 *
 * So the roster lives here, importing nothing but 21 DOM-free `meta.ts` files
 * and a type. `catalog.ts` attaches the loaders on top; the emitter reads this
 * directly. One ordering, two consumers, no duplicate list to drift.
 */
export const GAMES: ReadonlyArray<GameMeta> = [
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

  // Wave 1 - the pre-reading kids catalog. `sortsize` sits under `learn`
  // (pre-numeric ordering); the rest under `think`.
  sortsize,
  sequence,
  vanish,
  shadows,
  echo,

  // Wave 2 - the tap-the-moving-target cluster, all three on the shared
  // spawner (`@shared/spawn`). `bees` is the first game in the `speed`
  // section, which until then was declared in CATEGORY_ORDER but empty.
  balloons,
  bubbles,
  bees,
  frog,
  // `reaction` is the one Wave 2 game that does NOT use the shared spawner, on
  // purpose: there is a single light, it never moves and never expires, and the
  // quantity that matters is a timestamp - none of which the spawner models.
  reaction,
];

export function metaFor(id: string): GameMeta | undefined {
  return GAMES.find((m) => m.id === id);
}
