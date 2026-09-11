// One build for every arm of the tournament. The root is games/fight (not this
// directory) so a cell page can reach ../../data and ../../assets by the same
// relative path in dev and in the built tree, and `base: "./"` keeps every
// emitted URL relative so the hall can serve dist-fight from any prefix.
//
// Adding an arm is adding a cells/<name>/index.html - the input list is read
// from disk, never hand-kept, so a new cell cannot be silently left out of the
// build (a-path-filter-is-a-hand-kept-mirror-of-an-import-graph).

import { cpSync, existsSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { defineConfig } from "vite";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIGHT = resolve(HERE, "..");
const OUT = resolve(HERE, "../../../dist-fight");

/** every cells/<name>/index.html, plus the compare page once it exists */
function inputs(): Record<string, string> {
  const found: Record<string, string> = {};
  for (const name of readdirSync(HERE, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    const page = resolve(HERE, name.name, "index.html");
    if (existsSync(page)) found[`cell-${name.name}`] = page;
  }
  const compare = resolve(FIGHT, "tournament/compare/index.html");
  if (existsSync(compare)) found.compare = compare;
  return found;
}

// Three chunk names, because tournament/harness/bytes.mjs reports three
// numbers separately: what the ENGINE costs (vendor-<pkg>), what the one
// program every arm shares costs (fight-core: the sim, the harness, the
// clock, the shared input/fx/arena), and what the CELL AUTHOR wrote - which is
// whatever is left. Merging any two of them would make the engine's byte cost
// unreadable, which is half of what the tournament measures.
const ENGINES = ["phaser", "pixi.js", "kaplay", "excalibur", "littlejsengine", "melonjs"];

function chunkOf(id: string): string | undefined {
  const path = id.split("\0").pop() ?? id;
  const pkg = ENGINES.find((e) => path.includes(`/node_modules/${e}/`));
  if (pkg) return `vendor-${pkg}`;
  if (/\/games\/fight\/(core\/|cells\/(run-cell|retime|shared\/))/.test(path)) return "fight-core";
  return undefined;
}

/** the built tree must be self-contained: a cell page reaches ../../data and ../../assets */
function copyFightData(): Plugin {
  // source, not data: data/ holds load.ts and data.test.ts beside the json, and a
  // built tree that a hall serves has no business carrying them
  const noSource = (src: string): boolean => !src.endsWith(".ts");
  // honour `vite build --outDir <dir>`: two cell lanes building at once must not empty each
  // other's tree, so each builds its own and the harness reads it with --dist
  let out = OUT;
  return {
    name: "fight-copy-data",
    configResolved(c) { out = resolve(c.root, c.build.outDir); },
    closeBundle() {
      cpSync(resolve(FIGHT, "assets"), resolve(out, "assets"), { recursive: true, filter: noSource });
      cpSync(resolve(FIGHT, "data"), resolve(out, "data"), { recursive: true, filter: noSource });
      cpSync(resolve(FIGHT, "tournament/tapes"), resolve(out, "tournament/tapes"), { recursive: true, filter: noSource });
    },
  };
}

export default defineConfig({
  root: FIGHT,
  base: "./",
  publicDir: false,
  plugins: [copyFightData()],
  build: {
    outDir: OUT,
    // NOT vite's default "assets": the sprite sets are copied to dist-fight/assets,
    // and a hashed chunk landing in the same directory as robot--snes16/ makes the
    // one directory a cell fetches from also the one the bundler empties
    assetsDir: "bundle",
    emptyOutDir: true,
    rollupOptions: {
      input: inputs(),
      output: { manualChunks: (id: string) => chunkOf(id) },
    },
  },
});
