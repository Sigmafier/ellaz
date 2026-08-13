import type { Category, GameMeta, GameModule } from "@sdk/index";
import { GAMES } from "./games";

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

// One lazy loader per game. The ORDER lives in `games.ts` (which the build-time
// page emitter also reads); this map only says how to fetch each game's code, so
// there is no second list to drift out of order.
//
// A game present in GAMES but missing here produces an entry whose `load` is
// undefined — caught by `catalog.test.ts`, which asserts every entry's loader is
// a function.
const LOADERS: Record<string, () => Promise<{ default: GameModule }>> = {
  memory: () => import("../games/memory/index"),
  evolve: () => import("../games/evolve/index"),
  coloring: () => import("../games/coloring/index"),
  finddiff: () => import("../games/finddiff/index"),
  hidden: () => import("../games/hidden/index"),
  math: () => import("../games/math/index"),
  "2048": () => import("../games/n2048/index"),
  tictactoe: () => import("../games/tictactoe/index"),
  minesweeper: () => import("../games/minesweeper/index"),
  sudoku: () => import("../games/sudoku/index"),
  snake: () => import("../games/snake/index"),
  blocks: () => import("../games/blocks/index"),
  wordguess: () => import("../games/wordguess/index"),
  sortsize: () => import("../games/sortsize/index"),
  sequence: () => import("../games/sequence/index"),
  vanish: () => import("../games/vanish/index"),
  shadows: () => import("../games/shadows/index"),
  echo: () => import("../games/echo/index"),
  balloons: () => import("../games/balloons/index"),
  bubbles: () => import("../games/bubbles/index"),
  bees: () => import("../games/bees/index"),
  frog: () => import("../games/frog/index"),
  reaction: () => import("../games/reaction/index"),
  sort: () => import("../games/sort/index"),
  merge: () => import("../games/merge/index"),
};

// Curated order — this is the order the home grid renders in.
export const CATALOG: CatalogEntry[] = GAMES.map((meta) => ({
  meta,
  load: LOADERS[meta.id],
}));

export function findEntry(id: string): CatalogEntry | undefined {
  return CATALOG.find((e) => e.meta.id === id);
}
