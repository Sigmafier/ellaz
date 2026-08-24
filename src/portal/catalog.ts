import type { Category, GameMeta, GameModule } from "@sdk/index";
import { ROSTER_IDS, SHELL_GAMES } from "./shellRoster";

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
  lettercross: () => import("../games/lettercross/index"),
  wordguess: () => import("../games/wordguess/index"),
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
  pet: () => import("../games/pet/index"),
  fit: () => import("../games/fit/index"),
  music: () => import("../games/music/index"),
  maze: () => import("../games/maze/index"),
  letters: () => import("../games/letters/index"),
  spell: () => import("../games/spell/index"),
  bubbleshooter: () => import("../games/bubbleshooter/index"),
  match3: () => import("../games/match3/index"),
  jigsaw: () => import("../games/jigsaw/index"),
};

// Curated order — this is the order the home grid renders in.
/**
 * The games whose metadata has arrived. A FUNCTION, not a constant, and that is
 * the whole safety property of this file.
 *
 * The shell carries full metadata for only the games above the fold; the rest
 * arrive from `gamesRest.ts` on browser idle. So this list GROWS once, from
 * `SHELL_META_COUNT` to the full roster. A module-level `const METAS =
 * CATALOG.map(...)` would capture the short list forever - rendering perfectly,
 * with 18 games simply missing and nothing anywhere reporting it. Making the
 * catalogue a call makes that stale capture unrepresentable rather than
 * forbidden by a comment.
 *
 * Read `ROSTER_SIZE` when you need to know how many games there will BE - the
 * home grid reserves the space so the page does not reflow when the rest land.
 */
export function catalog(): ReadonlyArray<CatalogEntry> {
  return entries;
}

/** Every game in the roster, loaded or not. The grid reserves room for these. */
export const ROSTER_SIZE = ROSTER_IDS.length;

let entries: CatalogEntry[] = SHELL_GAMES.map((meta) => ({ meta, load: LOADERS[meta.id] }));

const listeners = new Set<() => void>();
let arriving: Promise<void> | undefined;

/**
 * Pull in the metadata for the games below the fold.
 *
 * Idempotent and safe to call from anywhere: the first call starts the fetch and
 * every later one waits on the same promise. A failed import leaves the shell
 * half in place rather than throwing - a home screen showing 15 games is a bad
 * day; a home screen showing an error is a broken product.
 */
export function ensureFullCatalog(): Promise<void> {
  if (entries.length === ROSTER_SIZE) return Promise.resolve();
  arriving ??= import("./gamesRest")
    .then(({ REST }) => {
      // Rebuild rather than push: `games.ts` defines the roster as the shell half
      // followed by the rest, and `roster-split.test.ts` pins that order. The grid
      // renders in roster order, so appending in any other order would silently
      // reshuffle the home screen.
      entries = [...SHELL_GAMES, ...REST].map((meta) => ({ meta, load: LOADERS[meta.id] }));
      for (const fn of listeners) fn();
    })
    .catch(() => {
      // Let a later call try again - a flaky first fetch must not mean the rest
      // of the catalogue is gone for the whole session.
      arriving = undefined;
    });
  return arriving;
}

/**
 * The lazy loader for `id`, whether or not its metadata is here yet.
 *
 * The loader map is COMPLETE in the shell and always has been. Only the metadata
 * splits. `fullCatalog.ts` uses this to pair the whole roster for the tests.
 *
 * It is NOT free, and this comment said it was until it was measured. The 33
 * chunk NAMES alone are 431 B gz - 13.1 B per game - and the loader expressions
 * around them 649 B, which is most of the per-game slope that survives the
 * metadata split. Moving the below-the-fold loaders into `gamesRest.ts` beside
 * their metas is the next honest cut; it was not done here because `entryFor`
 * already awaits that chunk, so it is a change with its own controls to write.
 * Do not restore a claim about this without a number.
 */
export function loaderFor(id: string): CatalogEntry["load"] | undefined {
  return LOADERS[id];
}

/** Re-render when the rest of the catalogue lands. Returns an unsubscribe. */
export function subscribeCatalog(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * The entry for `id`, if its metadata is here. Undefined can mean "no such game"
 * OR "below the fold and not fetched yet", so anything that must MOUNT a game
 * awaits `ensureFullCatalog()` first - see `entryFor`.
 */
export function findEntry(id: string): CatalogEntry | undefined {
  return entries.find((e) => e.meta.id === id);
}

/** The entry for `id`, fetching the rest of the roster if that is what is missing. */
export async function entryFor(id: string): Promise<CatalogEntry | undefined> {
  const known = findEntry(id);
  if (known) return known;
  if (!ROSTER_IDS.includes(id)) return undefined; // genuinely no such game
  await ensureFullCatalog();
  return findEntry(id);
}
