import type { GameMeta, GameModule } from "@sdk/index";

// Each game's metadata lives in its own DOM-free `meta.ts`, imported statically
// here so the home grid renders instantly without pulling any game code (or
// React/Phaser) into the shell bundle. The `load` loader dynamic-imports the game
// itself, so it is only downloaded when the player opens it.
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

export interface CatalogEntry {
  meta: GameMeta;
  load: () => Promise<{ default: GameModule }>;
}

// Curated order — this is the order the home grid renders in.
export const CATALOG: CatalogEntry[] = [
  { meta: memory, load: () => import("../games/memory/index") },
  { meta: coloring, load: () => import("../games/coloring/index") },
  { meta: finddiff, load: () => import("../games/finddiff/index") },
  { meta: hidden, load: () => import("../games/hidden/index") },
  { meta: math, load: () => import("../games/math/index") },
  { meta: n2048, load: () => import("../games/n2048/index") },
  { meta: tictactoe, load: () => import("../games/tictactoe/index") },
  { meta: minesweeper, load: () => import("../games/minesweeper/index") },
  { meta: sudoku, load: () => import("../games/sudoku/index") },
  { meta: snake, load: () => import("../games/snake/index") },
];

export function findEntry(id: string): CatalogEntry | undefined {
  return CATALOG.find((e) => e.meta.id === id);
}
