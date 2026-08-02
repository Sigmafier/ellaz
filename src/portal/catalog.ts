import type { Category, GameMeta, GameModule } from "@sdk/index";

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
import { meta as sequence } from "../games/sequence/meta";
import { meta as vanish } from "../games/vanish/meta";
import { meta as shadows } from "../games/shadows/meta";
import { meta as sortsize } from "../games/sortsize/meta";
import { meta as echo } from "../games/echo/meta";
import { meta as evolve } from "../games/evolve/meta";

export interface CatalogEntry {
  meta: GameMeta;
  load: () => Promise<{ default: GameModule }>;
}

// Home-grid section order, and the i18n key each heading uses. It lives HERE
// rather than in Home.tsx so `catalog.test.ts` can assert that every category a
// game claims actually has a section to render under — Home skips sections with
// no games, so a game in an unlisted category is invisible with no error at all.
export const CATEGORY_ORDER: ReadonlyArray<{ category: Category; titleKey: string }> = [
  { category: "kids", titleKey: "forKids" },
  { category: "learn", titleKey: "learn" },
  { category: "think", titleKey: "think" },
  { category: "speed", titleKey: "speed" },
  { category: "create", titleKey: "create" },
  { category: "classics", titleKey: "classics" },
];

// Curated order — this is the order the home grid renders in.
export const CATALOG: CatalogEntry[] = [
  { meta: memory, load: () => import("../games/memory/index") },
  { meta: evolve, load: () => import("../games/evolve/index") },
  { meta: coloring, load: () => import("../games/coloring/index") },
  { meta: finddiff, load: () => import("../games/finddiff/index") },
  { meta: hidden, load: () => import("../games/hidden/index") },
  { meta: math, load: () => import("../games/math/index") },
  { meta: n2048, load: () => import("../games/n2048/index") },
  { meta: tictactoe, load: () => import("../games/tictactoe/index") },
  { meta: minesweeper, load: () => import("../games/minesweeper/index") },
  { meta: sudoku, load: () => import("../games/sudoku/index") },
  { meta: snake, load: () => import("../games/snake/index") },

  // Wave 1 — the pre-reading kids catalog. `sortsize` sits under `learn`
  // (pre-numeric ordering); the rest under `think`.
  { meta: sortsize, load: () => import("../games/sortsize/index") },
  { meta: sequence, load: () => import("../games/sequence/index") },
  { meta: vanish, load: () => import("../games/vanish/index") },
  { meta: shadows, load: () => import("../games/shadows/index") },
  { meta: echo, load: () => import("../games/echo/index") },
];

export function findEntry(id: string): CatalogEntry | undefined {
  return CATALOG.find((e) => e.meta.id === id);
}
