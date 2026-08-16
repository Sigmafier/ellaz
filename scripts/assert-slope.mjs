#!/usr/bin/env node
/**
 * The first visit must be O(1) in the size of the catalogue.
 *
 * WHY THIS EXISTS, BESIDE THE CEILING. `assert-payload.mjs` enforces a fixed
 * number of bytes. That is the right instrument for a regression and the wrong
 * one for a catalogue that is meant to grow: a ceiling measures the INTERCEPT
 * and is silent about the SLOPE. Every individual game passes it. The hundredth
 * game is what fails, and by then the architecture that caused it is a year old.
 *
 * So this measures the slope directly, by building the same tree twice:
 *
 *     arm A: the catalogue as it is
 *     arm B: the catalogue minus the LAST N games - roster, loader AND ART
 *     assert (A - B) / N <= PER_GAME_BUDGET
 *
 * The last N and not a random N: a new game is appended to the roster, so the
 * marginal game IS the tail. That is the number the budget is about.
 *
 * CUTTING THE ROSTER IS NOT ENOUGH TO CUT A GAME, and getting this wrong makes
 * the gate report a slope roughly eight times too low. Dropping a game from
 * `games.ts` alone leaves its scene in `gameArt.ts` (reachable from the object
 * literal) and its `meta.ts` in the shell chunk (reachable through the still
 * present `catalog.ts` loader, which `manualChunks` pins to `shell`). Arm B
 * removes all three, and asserts each removal landed before either number is
 * believed.
 *
 * NOTHING IS MEASURED IN THE WORKING TREE. Both arms are built from one throwaway
 * copy under the system temp dir, with `node_modules` symlinked back. A peer
 * session builds into `dist/` concurrently and would wipe an arm mid-assert; and
 * mutating tracked files in place to measure them is how a killed run leaves a
 * tree nobody can explain.
 *
 * Usage:
 *   node scripts/assert-slope.mjs              # the gate
 *   node scripts/assert-slope.mjs --control    # the negative control (below)
 *   node scripts/assert-slope.mjs --keep       # leave the temp tree for poking
 */
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { firstVisit } from "./assert-payload.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONTROL = process.argv.includes("--control");
const KEEP = process.argv.includes("--keep");

/**
 * How many games arm B removes.
 *
 * Big enough that gzip's own quantisation (a few tens of bytes either way on a
 * 90 KB artifact) divides down to noise rather than to a verdict, and small
 * enough to stay inside the LAZY half of the art split - so the gate measures
 * the marginal game, which is the one that is about to be added.
 */
const REMOVE_N = 8;

/**
 * What the rule ASKS for: a new game costs its row in the emitted home document
 * and nothing else. Reported every run, never enforced - see below.
 */
const O1_TARGET = 40;

/**
 * What one more game may cost a first visit today, in gzipped bytes.
 *
 * 140, MEASURED ON THIS TREE - 25 games, the art split landed, 2026-08-13, this
 * script, both arms from one copy. Naming the tree is the point: a threshold
 * argued against a tree nobody records goes stale within hours in this repo,
 * twice already
 * (.claude/rules/a-threshold-tuned-against-todays-tree-goes-stale.md).
 *
 * THE MEASUREMENT, and it disagrees with the proposal that asked for this gate:
 *
 *   before the art split   294.6 B gz per game   (265.5 shell + 29.1 document)
 *   after                  120.8 B gz per game   ( 91.2 shell + 29.5 document)
 *
 * `docs/scaling-the-first-visit.md` predicted 192 -> 29, and both halves of that
 * were low for one reason: its arm B cut the roster and the art but left the
 * `catalog.ts` LOADER in place, so every removed game's `meta.ts` stayed
 * reachable - and `manualChunks` pins every game's `meta.ts` to the shell chunk.
 * Its arm B was still paying for the metadata of the games it had "removed", so
 * that term cancelled out of the subtraction and never appeared. Confirmed on
 * the artifact: a lazy-half game's Hebrew title is in `shell-*.js`, not in
 * `art-rest-*.js`.
 *
 * So the 120.8 that remains is NOT art. It is the DOM-free `meta.ts` the static
 * roster carries so the home grid can render without any game code, plus that
 * game's roster and loader lines, plus the 29.5 B document row. The document row
 * is deliberate and load-bearing - it is what made `/` visible to answer engines
 * - and the metadata is architectural: nothing in Step 1 can move it, and Step 3
 * of that document (art and metadata as data, a virtualised grid) is what would.
 *
 * WHY 140 IS ENFORCED AND 40 IS ONLY REPORTED. A gate that reds on day one for
 * something nobody can fix that day teaches its reader to ignore it - the same
 * argument `assert-crawlable.mjs` makes for keeping its content floor advisory.
 * 140 is the line the architecture can actually hold, and it is not a rubber
 * stamp: putting the card art back in the shell lands at 294.6, more than
 * double. 140 and not 125: the delta is a gzip subtraction over 8 games, so a
 * few bytes of compressor noise divide down onto the per-game figure, and a
 * budget five bytes above the reading would red on a correct commit. 140 and not
 * 200: at 200 half the art map could come back before anything complained.
 *
 * When the metadata term goes, this drops to O1_TARGET in the same commit.
 */
const PER_GAME_BUDGET = 140;

/** Padding size for the negative control, in rects per planted scene. */
const CONTROL_RECTS = 60;

// ---------------------------------------------------------------------------
// the throwaway tree
// ---------------------------------------------------------------------------

/**
 * Directories the throwaway tree must not carry. `node_modules` is symlinked
 * back in below rather than copied; the rest are build output and scratch.
 *
 * Matched on the BASENAME anywhere in the tree, not on a top-level path, so a
 * nested `holdem/node_modules` is skipped too. `dist` is a prefix match because
 * the second base arm writes `dist-ellaz/`.
 */
const SKIP = new Set([".git", "node_modules", ".playwright-mcp", "screenshots", "shots"]);
const skip = (name) => SKIP.has(name) || name.startsWith("dist");

/**
 * `cpSync` rather than `rsync`, and that is a portability fix rather than a
 * style one: rsync is not installed everywhere node is, and this gate failed
 * with a raw `spawnSync ENOENT` on a container that had a perfectly good tree.
 *
 * A gate that cannot run is a gate nobody runs, and it fails in the shape that
 * reads as "the repo is broken" rather than "this machine lacks a tool" - the
 * same reason `a-diagnostic-that-truncates-what-it-compares.md` exists.
 */
function makeTree() {
  const root = mkdtempSync(join(tmpdir(), "ellaz-slope-"));
  cpSync(REPO, root, {
    recursive: true,
    // `dereference: false` keeps rsync -a's symlink behaviour.
    filter: (src) => !skip(basename(src)),
  });
  symlinkSync(join(REPO, "node_modules"), join(root, "node_modules"));
  return root;
}

/**
 * Build one arm, and REFUSE to return a number for a build that did not happen.
 *
 * A build arm whose stderr is swallowed produces no `dist/` and reads as a
 * successful measurement of nothing - both arms therefore assert they emitted an
 * index.html, and print the build's own output when they did not.
 */
function buildArm(root, outDir, label) {
  const started = Date.now();
  let output = "";
  try {
    output = execFileSync(
      process.execPath,
      [join(REPO, "node_modules", "vite", "bin", "vite.js"), "build", "--outDir", outDir],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 },
    );
  } catch (err) {
    output = `${err.stdout ?? ""}${err.stderr ?? ""}`;
    console.error(`\nassert-slope: arm ${label} FAILED TO BUILD\n${output}`);
    process.exit(1);
  }

  const dist = join(root, outDir);
  if (!existsSync(join(dist, "index.html"))) {
    console.error(
      `\nassert-slope: arm ${label} produced no ${outDir}/index.html.\n` +
        "A missing artifact is not a small one - refusing to report a number.\n" +
        output,
    );
    process.exit(1);
  }
  console.log(`  arm ${label}: built in ${((Date.now() - started) / 1000).toFixed(0)}s`);
  return dist;
}

// ---------------------------------------------------------------------------
// reading the catalogue out of the source, textually
// ---------------------------------------------------------------------------

/** `import { meta as evolve } from "../games/evolve/meta";` -> ident + directory. */
function rosterImports(src) {
  return [...src.matchAll(/import \{ meta as (\w+) \} from "\.\.\/games\/([\w-]+)\/meta";/g)].map(
    (m) => ({ ident: m[1], dir: m[2] }),
  );
}

/** The identifiers inside `export const GAMES = [ ... ]`, in order. */
function rosterOrder(src) {
  const open = src.indexOf("export const GAMES");
  const start = src.indexOf("[", open);
  const end = src.indexOf("\n];", start);
  if (open < 0 || start < 0 || end < 0) throw new Error("games.ts: cannot find the GAMES array");
  return [...src.slice(start, end).matchAll(/^\s{2}(\w+),\s*$/gm)].map((m) => m[1]);
}

/** A game's published slug, which is `meta.id` and NOT its directory name. */
function idOf(root, dir) {
  const src = readFileSync(join(root, "src/games", dir, "meta.ts"), "utf8");
  const m = /\bid:\s*"([^"]+)"/.exec(src);
  if (!m) throw new Error(`src/games/${dir}/meta.ts: no id`);
  return m[1];
}

/**
 * Where each entry of an art map begins.
 *
 * Scene bodies are multi-line template literals, so this cuts by the offset of
 * the NEXT entry rather than trying to find the end of this one - the shape that
 * cannot be fooled by a backtick or a brace inside an SVG path.
 */
function artEntries(src) {
  const re = /\n {2}(?:"([^"]+)"|([A-Za-z_$][\w$]*)):\s*\{\s*a:\s*"/g;
  const out = [];
  for (let m; (m = re.exec(src)); ) out.push({ key: m[1] ?? m[2], at: m.index });
  return out;
}

function artKeys(src) {
  return artEntries(src).map((e) => e.key);
}

// ---------------------------------------------------------------------------
// arm B's mutation
// ---------------------------------------------------------------------------

function removeArt(root, file, ids) {
  const path = join(root, file);
  if (!existsSync(path)) return [];
  const before = readFileSync(path, "utf8");
  const entries = artEntries(before);
  const hit = entries.filter((e) => ids.includes(e.key));
  if (hit.length === 0) return [];

  let src = before;
  // Back to front, so an earlier cut cannot shift a later offset.
  for (let i = entries.length - 1; i >= 0; i--) {
    if (!ids.includes(entries[i].key)) continue;
    const end = i + 1 < entries.length ? entries[i + 1].at : src.indexOf("\n};", entries[i].at);
    if (end < 0) throw new Error(`${file}: cannot find the end of entry ${entries[i].key}`);
    src = src.slice(0, entries[i].at) + src.slice(end);
  }

  const after = artKeys(src);
  const survivors = hit.map((h) => h.key).filter((k) => after.includes(k));
  if (survivors.length > 0) throw new Error(`${file}: scenes survived removal: ${survivors}`);
  const expected = artKeys(before).filter((k) => !ids.includes(k));
  if (after.join() !== expected.join()) throw new Error(`${file}: removal disturbed other scenes`);
  writeFileSync(path, src);
  return hit.map((h) => h.key);
}

/** Remove the last `n` games from the copy - roster, loader and art. */
function removeTailGames(root, n) {
  const gamesPath = join(root, "src/portal/games.ts");
  const gamesSrc = readFileSync(gamesPath, "utf8");
  const imports = rosterImports(gamesSrc);
  const order = rosterOrder(gamesSrc);
  const dirOf = new Map(imports.map((i) => [i.ident, i.dir]));

  if (order.length !== imports.length) {
    throw new Error(`games.ts: ${imports.length} imports but ${order.length} roster entries`);
  }
  if (n >= order.length) throw new Error(`cannot remove ${n} of ${order.length} games`);

  const idents = order.slice(-n);
  const ids = idents.map((ident) => idOf(root, dirOf.get(ident)));

  // --- roster -------------------------------------------------------------
  let next = gamesSrc
    .split("\n")
    .filter((line) => {
      const imp = /import \{ meta as (\w+) \}/.exec(line);
      if (imp && idents.includes(imp[1])) return false;
      const row = /^\s{2}(\w+),\s*$/.exec(line);
      return !(row && idents.includes(row[1]));
    })
    .join("\n");
  const leftOrder = rosterOrder(next);
  if (leftOrder.length !== order.length - n) {
    throw new Error(`games.ts: roster went ${order.length} -> ${leftOrder.length}, wanted -${n}`);
  }
  if (idents.some((i) => leftOrder.includes(i))) throw new Error("games.ts: a removed game survived");
  writeFileSync(gamesPath, next);

  // --- loaders ------------------------------------------------------------
  // `meta.ts` is pinned to the shell chunk by manualChunks, and the loader keeps
  // it reachable. Leave this behind and arm B still carries every removed game's
  // metadata, which is most of what the gate is trying to see.
  const catalogPath = join(root, "src/portal/catalog.ts");
  const catalogSrc = readFileSync(catalogPath, "utf8");
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const loaderLine = (id) => new RegExp(`^\\s*"?${esc(id)}"?:\\s*\\(\\) => import\\(`);
  const keptLines = catalogSrc.split("\n").filter((l) => !ids.some((id) => loaderLine(id).test(l)));
  const dropped = catalogSrc.split("\n").length - keptLines.length;
  if (dropped !== n) throw new Error(`catalog.ts: dropped ${dropped} loaders, wanted ${n}`);
  writeFileSync(catalogPath, keptLines.join("\n"));

  // --- art ----------------------------------------------------------------
  const scenes = [
    ...removeArt(root, "src/ui/gameArt.ts", ids),
    ...removeArt(root, "src/ui/gameArtRest.ts", ids),
  ];
  const artless = ids.filter((id) => !scenes.includes(id));
  if (artless.length > 0) {
    throw new Error(`no scene found for ${artless.join(", ")} - the art cut did not land`);
  }

  return ids;
}

// ---------------------------------------------------------------------------
// the negative control
// ---------------------------------------------------------------------------

/**
 * Make each of the last N games expensive to the SHELL, and confirm the gate
 * reds naming it.
 *
 * The padding is pseudo-random geometry rather than repeated filler: eight
 * copies of the same 3 KB string gzip to almost nothing, so a "fat" scene built
 * from repetition proves only that the compressor works. It is valid SVG because
 * the emitter rasterises every scene into an og card, and a control that breaks
 * the build tests the build, not the gate.
 */
function plantFatScenes(root, ids) {
  let seed = 20260813;
  const rnd = (max) => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed % (max * 10)) / 10;
  };
  const path = join(root, "src/ui/gameArt.ts");
  const src = readFileSync(path, "utf8");
  const entries = artEntries(src);
  const last = entries[entries.length - 1];
  const end = src.indexOf("\n};", last.at);
  if (end < 0) throw new Error("gameArt.ts: cannot find the end of the art map");

  const planted = ids
    .map((id) => {
      const rects = Array.from(
        { length: CONTROL_RECTS },
        () =>
          `<rect x="${rnd(200)}" y="${rnd(150)}" width="${rnd(40)}" height="${rnd(40)}" ` +
          `fill="#${(seed & 0xffffff).toString(16).padStart(6, "0")}"/>`,
      ).join("");
      return `\n  "${id}": { a: "#FF4D8D", b: "#FF7FAC", d: "circle", s: \`${rects}\` },`;
    })
    .join("");

  writeFileSync(path, src.slice(0, end) + planted + src.slice(end));
  const keys = artKeys(readFileSync(path, "utf8"));
  const missing = ids.filter((id) => !keys.includes(id));
  if (missing.length > 0) throw new Error(`control did not land for ${missing.join(", ")}`);
}

// ---------------------------------------------------------------------------

function main() {
  const root = makeTree();
  console.log(`assert-slope: two arms from one copy at ${root}`);

  const order = rosterOrder(readFileSync(join(root, "src/portal/games.ts"), "utf8"));
  console.log(`  catalogue: ${order.length} games, arm B drops the last ${REMOVE_N}`);

  if (CONTROL) {
    // Plant BEFORE arm A, so arm A carries the fat scenes and arm B removes
    // them - which is exactly the shape of a catalogue whose art is back in the
    // shell.
    const gamesSrc = readFileSync(join(root, "src/portal/games.ts"), "utf8");
    const dirOf = new Map(rosterImports(gamesSrc).map((i) => [i.ident, i.dir]));
    const targets = rosterOrder(gamesSrc)
      .slice(-REMOVE_N)
      .map((ident) => idOf(root, dirOf.get(ident)));
    plantFatScenes(root, targets);
    console.log(`  CONTROL: planted a fat shell scene for ${targets.join(", ")}`);
  }

  const distA = buildArm(root, "dist-arm-a", "A");
  const a = firstVisit(distA);

  const ids = removeTailGames(root, REMOVE_N);
  console.log(`  removed (roster + loader + art): ${ids.join(", ")}`);

  const distB = buildArm(root, "dist-arm-b", "B");
  const b = firstVisit(distB);

  const delta = a.total - b.total;
  const slope = delta / REMOVE_N;

  const byName = (m) =>
    new Map(m.rows.map(([size, name]) => [name.replace(/-[A-Za-z0-9_-]+\.(js|css)$/, ".$1"), size]));
  const ra = byName(a);
  const rb = byName(b);
  console.log("\n  where the delta lives:");
  for (const [name, size] of ra) {
    const other = rb.get(name) ?? 0;
    if (size !== other) {
      console.log(`    ${String(size - other).padStart(7)} B gz  ${name}`);
    }
  }

  console.log(
    `\n  arm A  ${a.total.toLocaleString()} B gz  (${order.length} games)\n` +
      `  arm B  ${b.total.toLocaleString()} B gz  (${order.length - REMOVE_N} games)\n` +
      `  delta  ${delta.toLocaleString()} B gz over ${REMOVE_N} games\n` +
      `  SLOPE  ${slope.toFixed(1)} B gz per game, budget ${PER_GAME_BUDGET}`,
  );

  // The rule's own number, reported whether or not it is met. It is not enforced
  // because the gap is the statically-imported `meta.ts`, which no change to the
  // art can touch - see PER_GAME_BUDGET above. Reporting it every run is what
  // keeps it from quietly becoming 140 forever.
  console.log(
    slope <= O1_TARGET
      ? `  O(1) TARGET met (${O1_TARGET} B gz per game) - PER_GAME_BUDGET can come down to it.`
      : `  O(1) target is ${O1_TARGET} B gz per game, not met. The part of the gap that is ` +
        `NOT card art is\n  the roster's static meta.ts - docs/scaling-the-first-visit.md step 3 ` +
        `is what removes it.`,
  );

  if (!KEEP) rmSync(root, { recursive: true, force: true });

  if (slope > PER_GAME_BUDGET) {
    console.error(
      `\nFAIL  each new game costs the first visit ${slope.toFixed(1)} B gz, over the ${PER_GAME_BUDGET} B budget.\n` +
        "      The first visit must be O(1) in the size of the catalogue: a new game may\n" +
        "      cost its row in the emitted home document and nothing else. Something the\n" +
        "      home grid renders now scales with the roster - the card art is the usual\n" +
        "      one (src/ui/gameArt.ts must hold ONLY the scenes above the fold; the rest\n" +
        "      belong in gameArtRest.ts, which is lazy). The delta above says which\n" +
        "      asset grew.\n" +
        "      Raising PER_GAME_BUDGET is a decision with a diff. Do not raise it silently.",
    );
    process.exit(1);
  }

  if (CONTROL) {
    console.error(
      "\nFAIL  the CONTROL passed. Every planted game carried a fat shell scene and the\n" +
        "      gate did not notice, so its green above is worth nothing.",
    );
    process.exit(1);
  }

  console.log(
    `OK  the first visit is O(1) in the catalogue (${(PER_GAME_BUDGET - slope).toFixed(1)} B gz per game spare).`,
  );
}

main();
