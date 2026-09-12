// One build for the engine's cells and every game's page. The root is studio/
// (not this directory) so a game page reaches its own ../data, ../assets and
// ../tapes by the same relative path in dev and in the built tree, and the
// engine's canvas cell reaches any game's by ../../../games/<name>; `base: "./"`
// keeps every emitted URL relative so the hall can serve dist-toybox from any
// prefix.
//
// The inputs are read from disk, never hand-kept: every toybox/cells/<name>/
// index.html, every games/<game>/page/index.html, and every games/<game>/
// tournament/compare/index.html (a tournament's grading page - history that
// must keep building). A new cell or a new game cannot be silently left out
// (a-path-filter-is-a-hand-kept-mirror-of-an-import-graph); a game with a
// page/ directory and no index.html is refused rather than skipped.

import { cpSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { defineConfig } from "vite";

const HERE = dirname(fileURLToPath(import.meta.url));
const STUDIO = resolve(HERE, "..");
const GAMES = join(STUDIO, "games");
const OUT = join(STUDIO, "dist-toybox");

/** every game directory under studio/games/ that carries a page */
function gamesWithPage(): string[] {
  if (!existsSync(GAMES)) return [];
  const out: string[] = [];
  for (const g of readdirSync(GAMES, { withFileTypes: true })) {
    if (!g.isDirectory()) continue;
    const pageDir = join(GAMES, g.name, "page");
    if (!existsSync(pageDir)) continue;
    if (!existsSync(join(pageDir, "index.html"))) throw new Error(`games/${g.name}/page/ has no index.html - a page directory with no page`);
    out.push(g.name);
  }
  return out.sort();
}

/** the engine's cells, every game's page, and every game's compare page */
function inputs(): Record<string, string> {
  const found: Record<string, string> = {};
  const cells = join(HERE, "cells");
  for (const d of readdirSync(cells, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const page = join(cells, d.name, "index.html");
    if (existsSync(page)) found[`cell-${d.name}`] = page;
  }
  if (Object.keys(found).length === 0) throw new Error("no cell page under toybox/cells - nothing to build");
  for (const g of gamesWithPage()) {
    found[`game-${g}`] = join(GAMES, g, "page", "index.html");
    const compare = join(GAMES, g, "tournament", "compare", "index.html");
    if (existsSync(compare)) found[`compare-${g}`] = compare;
  }
  return found;
}

// Three chunk names, because harness/bytes.mjs reports three numbers
// separately: what the ENGINE LIBRARY costs (vendor-<pkg>), what the one
// program every arm shares costs (toybox-core: the sim, the harness, the clock,
// the shared input/fx/arena), and what the CELL AUTHOR wrote - whatever is
// left. Merging any two of them would make the library's byte cost unreadable,
// which is half of what the tournament measured.
// only the winner is installed now; a package added here without a cell is a chunk name nothing emits
const ENGINES = ["phaser"];

function chunkOf(id: string): string | undefined {
  const path = id.split("\0").pop() ?? id;
  const pkg = ENGINES.find((e) => path.includes(`/node_modules/${e}/`));
  if (pkg) return `vendor-${pkg}`;
  if (/\/toybox\/(sim\/|cells\/(run-cell|retime|shared\/))/.test(path)) return "toybox-core";
  return undefined;
}

/** the built tree must be self-contained: a page reaches its game's ../data, ../assets and ../tapes */
function copyGameData(): Plugin {
  // source, not data: a built tree that a hall serves has no business carrying
  // a .ts, nor the goldens that sit beside the tapes (the gate reads those from
  // the source tree)
  const noSource = (src: string): boolean => !src.endsWith(".ts") && !src.endsWith(".golden.json");
  // honour `vite build --outDir <dir>`: two lanes building at once must not empty
  // each other's tree, so each builds its own and the harness reads it with --dist
  let out = OUT;
  return {
    name: "toybox-copy-game-data",
    configResolved(c) { out = resolve(c.root, c.build.outDir); },
    closeBundle() {
      for (const g of gamesWithPage()) {
        for (const dir of ["assets", "data", "tapes"]) {
          const src = join(GAMES, g, dir);
          if (existsSync(src)) cpSync(src, join(out, "games", g, dir), { recursive: true, filter: noSource });
        }
      }
    },
  };
}

export default defineConfig({
  root: STUDIO,
  base: "./",
  publicDir: false,
  plugins: [copyGameData()],
  build: {
    outDir: OUT,
    // NOT vite's default "assets": the sprite sets are copied to dist-toybox/games/<g>/assets,
    // and a hashed chunk landing beside robot--snes16/ would make the one directory a
    // page fetches from also the one the bundler empties
    assetsDir: "bundle",
    emptyOutDir: true,
    rollupOptions: {
      input: inputs(),
      output: { manualChunks: (id: string) => chunkOf(id) },
    },
  },
});
