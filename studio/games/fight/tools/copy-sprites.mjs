#!/usr/bin/env node
// Copy sprite exports (sheet, atlas, manifest, moves) from dist-export/ into the
// fight game's committed assets. `manifest.json` carries a `built: {commit,
// dirty, at}` stamp that changes on EVERY export - so byte-identity there is
// judged with `built` stripped, or a --check would never pass twice in a row.
//
//   node games/fight/tools/copy-sprites.mjs [--check] [--control] [--assets <dir>] [set...]

import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readExport, DEFAULT_EXPORT } from "../../../scripts/lib/export-index.mjs";
import { runControls } from "../../../scripts/lib/control.mjs";

const FIGHT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_ASSETS = join(FIGHT, "assets");
const FIGHTERS_DIR = join(FIGHT, "data", "fighters");
// kind -> file suffix. The order is the order plain runs print and --check counts.
const FILES = { sheet: "png", atlas: "atlas.json", manifest: "manifest.json", moves: "moves.json" };
const N_FILES = Object.keys(FILES).length;
const baseName = (setName, kind) => `${setName}.${FILES[kind]}`;

/** Sets named by data/fighters/*.json, or (that dir being absent - a concurrent
 * lane's WIP) whatever sets already have a committed assets/ dir. Returns
 * { sets, source } so the caller can say where the list came from. */
function defaultSets() {
  if (existsSync(FIGHTERS_DIR)) {
    const sets = readdirSync(FIGHTERS_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(readFileSync(join(FIGHTERS_DIR, f), "utf8")).sprites);
    return { sets, source: `${FIGHTERS_DIR} (${sets.length} fighter files)` };
  }
  const sets = existsSync(DEFAULT_ASSETS) ? readdirSync(DEFAULT_ASSETS).filter((d) => existsSync(join(DEFAULT_ASSETS, d))) : [];
  return { sets, source: `${DEFAULT_ASSETS} (fighters data absent - fallback to existing asset dirs)` };
}

/** Locate a set's export row, or throw naming it. */
function findSet(ex, name) {
  const [character, style] = name.split("--");
  const set = ex.sets.find((s) => s.character === character && s.style === style);
  if (!set) throw new Error(`copy-sprites: "${name}" is not in the export index (${ex.root}/index.json)`);
  if (!set.movesFile) throw new Error(`copy-sprites: "${name}" has no moves file - not a fighter`);
  return set;
}

/** A manifest with `built` removed, re-serialised the same way both sides. The
 * stamp changes on every export run, so comparing it would make --check fail
 * even when nothing about the sprite itself changed. */
function manifestSansBuilt(text) {
  const obj = JSON.parse(text);
  delete obj.built;
  return JSON.stringify(obj, Object.keys(obj).sort());
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function copyOne(setName, ex, destRoot) {
  const set = findSet(ex, setName);
  const src = { sheet: set.sheet, atlas: set.atlasFile, manifest: set.manifestFile, moves: set.movesFile };
  const destDir = join(destRoot, setName);
  mkdirSync(destDir, { recursive: true });
  const written = [];
  for (const kind of Object.keys(FILES)) {
    const base = baseName(setName, kind);
    const bytes = readFileSync(src[kind]);
    writeFileSync(join(destDir, base), bytes);
    written.push({ path: `${setName}/${base}`, sha: sha256(bytes), size: bytes.length });
  }
  return written;
}

function plainRun(sets, ex, destRoot) {
  let n = 0;
  for (const setName of sets) {
    for (const f of copyOne(setName, ex, destRoot)) {
      console.log(`  ${f.path}  ${f.sha}  ${f.size}B`);
      n++;
    }
  }
  console.log(`copy-sprites: ${n} files written for ${sets.length} sets`);
  return 0;
}

/** Compare one set's four files between two asset dirs. Returns diff names. */
function diffSet(setName, a, b) {
  const diffs = [];
  for (const kind of Object.keys(FILES)) {
    const rel = `${setName}/${baseName(setName, kind)}`;
    const pa = join(a, rel), pb = join(b, rel);
    if (!existsSync(pa) || !existsSync(pb)) { diffs.push(rel); continue; }
    const ba = readFileSync(pa), bb = readFileSync(pb);
    if (kind === "manifest") {
      if (manifestSansBuilt(ba.toString("utf8")) !== manifestSansBuilt(bb.toString("utf8"))) diffs.push(rel);
    } else if (!ba.equals(bb)) {
      diffs.push(rel);
    }
  }
  return diffs;
}

/** Run the --check comparison against `assetsDir`. Returns { compared, diffs }.
 * Copies into a scratch dir first rather than diffing against dist-export directly,
 * so the comparison exercises the exact bytes the plain run would write. */
function runCheck(sets, ex, assetsDir) {
  const scratch = mkdtempSync(join(tmpdir(), "copy-sprites-"));
  try {
    for (const setName of sets) copyOne(setName, ex, scratch);
    let compared = 0;
    const diffs = [];
    for (const setName of sets) {
      compared += N_FILES;
      for (const rel of diffSet(setName, scratch, assetsDir)) diffs.push(rel);
    }
    return { compared, diffs };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

function doCheck(sets, ex, assetsDir) {
  const { compared, diffs } = runCheck(sets, ex, assetsDir);
  for (const d of diffs) console.log(`DIFF ${d}`);
  console.log(`copy-sprites --check: ${compared} files compared, ${diffs.length} differ`);
  // A walk that finds nothing must not read as a pass - the vacuum guard.
  if (compared < N_FILES * sets.length) return 2;
  return diffs.length > 0 ? 1 : 0;
}

const editJson = (p, edit) => { const m = JSON.parse(readFileSync(p, "utf8")); edit(m); writeFileSync(p, JSON.stringify(m)); };

// Each mutation touches ONE set's files in a scratch copy, then checks that copy
// against the real assets - proving the check notices what it claims to (FIRE),
// or, for the build stamp, that it does not (PASS: `built` must be ignored).
function controls(ex) {
  const { sets } = defaultSets();
  const setName = sets[0];
  const mutated = (mutate) => {
    const scratch = mkdtempSync(join(tmpdir(), "copy-sprites-ctl-"));
    for (const s of sets) copyOne(s, ex, scratch);
    mutate(scratch);
    const diffs = sets.flatMap((s) => diffSet(s, scratch, DEFAULT_ASSETS));
    rmSync(scratch, { recursive: true, force: true });
    return diffs.map((d) => `DIFF ${d}`);
  };
  const flipByte = (dir) => {
    const p = join(dir, setName, `${setName}.png`);
    const buf = readFileSync(p);
    buf[buf.length >> 1] ^= 0xff;
    writeFileSync(p, buf);
  };
  const bumpDamage = (dir) => editJson(join(dir, setName, `${setName}.moves.json`), (m) => {
    const hit = Object.values(m.states).flatMap((s) => s.frames.flatMap((f) => f.itr ?? [])).find((x) => x.kind === "hit");
    hit.damage += 5;
  });
  const bumpBuiltAt = (dir) => editJson(join(dir, setName, `${setName}.manifest.json`), (m) => { m.built.at = new Date(0).toISOString(); });
  return [
    { name: "the real assets", expect: "PASS", run: () => runCheck(sets, ex, DEFAULT_ASSETS).diffs.map((d) => `DIFF ${d}`) },
    { name: "one byte flipped in a committed sheet", expect: "FIRE", run: () => mutated(flipByte) },
    { name: "a manifest whose only change is its build stamp", expect: "PASS", run: () => mutated(bumpBuiltAt) },
    { name: "a moves file with one damage value changed", expect: "FIRE", run: () => mutated(bumpDamage) },
  ];
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const assetsIdx = args.indexOf("--assets");
  const assetsDir = assetsIdx >= 0 ? resolve(args[assetsIdx + 1]) : DEFAULT_ASSETS;
  const positional = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--assets");
  if (!existsSync(DEFAULT_EXPORT)) { console.error("copy-sprites: run `npm run export` first"); process.exit(3); }
  const ex = readExport();

  let sets = positional;
  if (sets.length === 0) {
    const d = defaultSets();
    sets = d.sets;
    console.log(`copy-sprites: sets from ${d.source}`);
  }
  if (sets.length === 0) { console.error("copy-sprites: no sets to copy - a gate over nothing is not a pass"); process.exit(2); }
  for (const s of sets) findSet(ex, s); // fail fast, name the offender

  if (args.includes("--control")) {
    process.exit(runControls("copy-sprites", controls(ex)) ? 0 : 1);
  } else if (args.includes("--check")) {
    if (!existsSync(assetsDir)) { console.log(`copy-sprites --check: 0 files compared, ${assetsDir} does not exist`); process.exit(2); }
    process.exit(doCheck(sets, ex, assetsDir));
  } else {
    process.exit(plainRun(sets, ex, assetsDir));
  }
}
