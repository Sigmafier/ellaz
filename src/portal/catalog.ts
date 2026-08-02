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
import { meta as balloons } from "../games/balloons/meta";
import { meta as bubbles } from "../games/bubbles/meta";
import { meta as bees } from "../games/bees/meta";
import { meta as frog } from "../games/frog/meta";
import { meta as reaction } from "../games/reaction/meta";

export interface CatalogEntry {
  meta: GameMeta;
  load: () => Promise<{ default: GameModule }>;
}

// Home filter order, the i18n key each label uses, and the GLYPH that stands in
// for it. It lives HERE rather than in Home.tsx so `catalog.test.ts` can assert
// that every category a game claims is actually reachable — the home screen only
// renders the categories listed here, so a game in an unlisted one is invisible
// with no error at all.
//
// The glyph is not decoration: it is how a four-year-old who cannot yet read
// "חשיבה" navigates. It must be legible at 26px and distinct from the others.
export const CATEGORY_ORDER: ReadonlyArray<{
  category: Category;
  titleKey: string;
  glyph: string;
}> = [
  { category: "kids", titleKey: "forKids", glyph: "🧸" },
  { category: "learn", titleKey: "learn", glyph: "🔤" },
  { category: "think", titleKey: "think", glyph: "🧠" },
  { category: "speed", titleKey: "speed", glyph: "⚡" },
  { category: "create", titleKey: "create", glyph: "🎨" },
  { category: "classics", titleKey: "classics", glyph: "♟️" },
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

  // Wave 2 — the tap-the-moving-target cluster, all three on the shared
  // spawner (`@shared/spawn`). `bees` is the first game in the `speed`
  // section, which until now was declared in CATEGORY_ORDER but empty.
  { meta: balloons, load: () => import("../games/balloons/index") },
  { meta: bubbles, load: () => import("../games/bubbles/index") },
  { meta: bees, load: () => import("../games/bees/index") },
  { meta: frog, load: () => import("../games/frog/index") },
  // `reaction` is the one Wave 2 game that does NOT use the shared spawner, on
  // purpose: there is a single light, it never moves and never expires, and the
  // quantity that matters is a timestamp — none of which the spawner models.
  { meta: reaction, load: () => import("../games/reaction/index") },
];

export function findEntry(id: string): CatalogEntry | undefined {
  return CATALOG.find((e) => e.meta.id === id);
}
