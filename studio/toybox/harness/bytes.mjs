// What each arm costs a first visit, split three ways and NEVER blended.
//
//   node bytes.mjs [--dist <dir>] [--game fight]
//
// Why three numbers and not one total: every cell ships the same fight-core
// and the same sprite sheets. A single "total" is therefore mostly a constant
// - roughly 760 KB of identical PNG and a shared core - and a 72-378 KB
// difference between engines disappears inside it. The engine column is the
// only one the tournament is choosing between; the other two are the price of
// the game and are paid whichever arm wins.
//
// Scope, stated so the number cannot be quoted wider than it was measured:
// this reads the JS the built page DECLARES - its module script plus every
// modulepreload link - gzipped at level 9. Stylesheets, the sprite PNGs and
// any chunk fetched by a later dynamic import are out. It is the JS cost of
// opening the page, not the byte cost of the whole tree.

import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { DEFAULT_DIST, DEFAULT_GAME, appendRow, listCells, pageDirOf, parseFlags } from "./run-tape.mjs";

/** Every JS URL the built page declares: its module script and its preloads. */
export function declaredScripts(html) {
  const urls = [];
  for (const m of html.matchAll(/<script[^>]*\ssrc=["']([^"']+)["'][^>]*>/gi)) urls.push(m[1]);
  for (const m of html.matchAll(/<link[^>]*\srel=["']modulepreload["'][^>]*>/gi)) {
    const href = /\shref=["']([^"']+)["']/i.exec(m[0]);
    if (href) urls.push(href[1]);
  }
  return [...new Set(urls)].filter((u) => !/^https?:/i.test(u));
}

/** A URL in the page resolved to a file: root-relative to dist, else beside the page. */
function resolveAsset(url, dist, pageDir) {
  const clean = url.split("?")[0].split("#")[0];
  return clean.startsWith("/") ? join(dist, clean.slice(1)) : resolve(pageDir, clean);
}

/**
 * vendor-<engine> is the library, toybox-core* is the shared sim and harness,
 * everything else is what this cell's own author wrote. Keyed on the chunk
 * NAME the build gives it (toybox/vite.config.ts chunkOf), so a cell cannot
 * hide a library inside its entry without the name changing.
 *
 * vite's modulepreload polyfill is shared, not authored: it is byte-identical
 * in every cell and nobody wrote it, so charging it to the cell author puts a
 * constant nobody chose into the one column that is meant to be theirs.
 */
export function bucketOf(basename) {
  if (/^vendor-/.test(basename)) return "engine";
  if (/^toybox-core/.test(basename) || /^modulepreload-polyfill/.test(basename)) return "shared";
  return "authored";
}

function measureCell(dist, cell, game) {
  const pageDir = pageDirOf(dist, cell, game);
  const html = readFileSync(join(pageDir, "index.html"), "utf8");
  const out = { cell, engine: 0, shared: 0, authored: 0, total: 0, files: [], missing: [] };
  for (const url of declaredScripts(html)) {
    const file = resolveAsset(url, dist, pageDir);
    if (!existsSync(file)) { out.missing.push(`${url} -> ${file}`); continue; }
    const base = file.split("/").pop();
    const gz = gzipSync(readFileSync(file), { level: 9 }).length;
    const bucket = bucketOf(base);
    out[bucket] += gz;
    out.total += gz;
    out.files.push({ file: base, bucket, gz, raw: statSync(file).size });
  }
  return out;
}

function table(rows) {
  const head = ["cell", "engine gz", "shared gz", "authored gz", "total gz", "chunks"];
  const body = rows.map((r) => [r.cell, String(r.engine), String(r.shared), String(r.authored), String(r.total), String(r.files.length)]);
  const w = head.map((h, i) => Math.max(h.length, ...body.map((b) => b[i].length)));
  console.log(`  ${head.map((h, i) => h.padEnd(w[i])).join("  ")}`);
  for (const b of body) console.log(`  ${b.map((v, i) => v.padEnd(w[i])).join("  ")}`);
}

function main(argv) {
  const f = parseFlags(argv, { dist: DEFAULT_DIST, game: DEFAULT_GAME });
  const dist = resolve(String(f.dist));
  const game = String(f.game);
  if (!existsSync(dist)) { console.log(`bytes: dist not found: ${dist}`); return 2; }
  const cells = f.rest.length ? f.rest : listCells(dist, game);
  console.log(`bytes: ${cells.length} cell(s) under ${dist} playing ${game} - gzip level 9, declared JS only`);
  if (cells.length === 0) { console.log("bytes: NO cells found - nothing to weigh"); return 2; }
  const rows = cells.map((c) => measureCell(dist, c, game)).sort((a, b) => a.total - b.total);
  table(rows);
  let bad = 0;
  for (const r of rows) {
    for (const m of r.missing) { bad++; console.log(`  FAIL  ${r.cell}: declared chunk not on disk: ${m}`); }
    for (const fi of r.files) console.log(`  ${r.cell.padEnd(12)} ${fi.bucket.padEnd(8)} ${String(fi.gz).padStart(8)} gz  ${String(fi.raw).padStart(9)} raw  ${fi.file}`);
    appendRow({ kind: "bytes", at: new Date().toISOString(), game, cell: r.cell, engine: r.engine, shared: r.shared, authored: r.authored, total: r.total });
  }
  console.log(bad === 0 ? `bytes: ${rows.length} cell(s) weighed - ok` : `bytes: ${bad} missing chunk(s)`);
  return bad === 0 ? 0 : 1;
}

const isMain = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) process.exit(main(process.argv.slice(2)));
