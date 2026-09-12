// The admission gate. An engine cell enters the tournament only when it
// replays the golden tape to the EXACT same three hashes and the same tick
// count, with zero page errors. Anything else is DISQUALIFIED - not "close",
// not "probably fine": the whole premise of the cells is that seven arms run
// one program, and a hash that differs by one digit means they do not.
//
//   node run-tape.mjs [--dist <dir>] [--game fight] [--tape versus-600] [cell...]
//   node run-tape.mjs --control
//
// The built tree is dist-toybox: the engine's cells under toybox/cells/<name>/
// and each game's page under games/<game>/page/, so `--game` says whose tapes,
// goldens and page a run reads (fight, the one game today, by default).
//
// No ports. Playwright answers every request to http://fight.test/ from the
// built tree on disk, so there is no server to leak, no port to collide with
// the ports registry, and nothing to leave running.
//
// Exit 0 every cell admitted - 1 any cell disqualified - 2 NO cells found.
// The 2 is the vacuum guard: "0 disqualified" over 0 cells is not a pass, and
// a run against a missing or half-built dist would otherwise read as green.
//
// This module is also where the other three harnesses get their shared parts
// (disk routing, cell listing, the jsonl sink). Importing it runs nothing.

import { appendFileSync, existsSync, readdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const HERE = dirname(fileURLToPath(import.meta.url));
export const FIGHT = resolve(HERE, "..", "..");
export const STUDIO = resolve(FIGHT, "..", "..");
export const DEFAULT_DIST = join(STUDIO, "dist-toybox");
export const DEFAULT_GAME = "fight";
/** a game's source root under studio/games/ - its tapes/ holds the goldens */
export const gameDirOf = (game) => join(STUDIO, "games", game);
export const RAW = join(FIGHT, "tournament", "data", "raw-fight.jsonl");
export const ORIGIN = "http://fight.test";

const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".map": "application/json", ".css": "text/css",
  ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".wasm": "application/wasm", ".woff2": "font/woff2",
};

/** `--flag value` and `--flag` pairs plus bare positionals, in one pass. */
export function parseFlags(argv, defaults = {}) {
  const out = { ...defaults, rest: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { out.rest.push(a); continue; }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}

/** relative path under dist for a cell's page: toybox/cells/<name>, or games/<game>/page for the game's own page */
const relDir = (cell, game) => (cell === "page" ? `games/${game}/page` : `toybox/cells/${cell}`);

/** where a cell's page lives in the built tree */
export const pageDirOf = (dist, cell, game = DEFAULT_GAME) => join(dist, relDir(cell, game));

/**
 * Every built cell page, from the tree itself - never a hand-kept list. The
 * game's page (games/<game>/page/index.html, the promoted Phaser cell with
 * live input) is a cell too: it must keep admitting on the golden after the
 * tournament, or the game has drifted from the bar.
 */
export function listCells(dist, game = DEFAULT_GAME) {
  const dir = join(dist, "toybox", "cells");
  const cells = !existsSync(dir) ? [] : readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(dir, e.name, "index.html")))
    .map((e) => e.name);
  if (existsSync(join(pageDirOf(dist, "page", game), "index.html"))) cells.push("page");
  return cells.sort();
}

/** Answer http://fight.test/** from `dist`. Works on a page or a context. */
export async function routeDisk(target, dist) {
  const root = realpathSync(dist);
  await target.route(`${ORIGIN}/**`, (route) => {
    const rel = decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/+/, "");
    const file = resolve(root, rel);
    if (!file.startsWith(root) || !existsSync(file)) return route.fulfill({ status: 404, body: `not found: ${rel}` });
    route.fulfill({ status: 200, contentType: TYPES[extname(file)] ?? "application/octet-stream", body: readFileSync(file) });
  });
}

/** Push every pageerror and console error onto `errors`, with their text whole. */
export function watchErrors(page, errors) {
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  page.on("requestfailed", (r) => errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText ?? ""}`));
}

/** One JSON object per line, appended - a long run persists per row, never buffered. */
export function appendRow(row) {
  if (!existsSync(RAW)) writeFileSync(RAW, "");
  appendFileSync(RAW, `${JSON.stringify(row)}\n`);
}

/** an engine cell is told which game to play; a game's page already knows */
export const cellUrl = (cell, query, game = DEFAULT_GAME) => `${ORIGIN}/${relDir(cell, game)}/index.html?${cell === "page" ? "" : `game=${game}&`}${query}`;

export function readGolden(tape, game = DEFAULT_GAME) {
  const file = join(gameDirOf(game), "tapes", `${tape}.golden.json`);
  if (!existsSync(file)) throw new Error(`no golden for tape "${tape}" of game "${game}": ${file}`);
  return JSON.parse(readFileSync(file, "utf8"));
}

/** Open one cell page, replay the tape at fast=1, read the triple back. */
export async function observeCell(browser, dist, cell, tape, game = DEFAULT_GAME) {
  const ctx = await browser.newContext({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 });
  await routeDisk(ctx, dist);
  const page = await ctx.newPage();
  const errors = [];
  watchErrors(page, errors);
  await page.goto(cellUrl(cell, `tape=${tape}&fast=1`, game));
  try { await page.waitForFunction(() => window.__ready === true, null, { timeout: 15000 }); }
  catch { errors.push("window.__ready never became true within 15000 ms"); }
  try { await page.waitForFunction(() => window.__fightDone === true, null, { timeout: 60000 }); }
  catch { errors.push("window.__fightDone never became true within 60000 ms"); }
  const obs = await page.evaluate(() => ({
    ticks: window.__fightTicks ?? null,
    hash: window.__fightHash ?? null,
    chain: window.__fightChain ?? null,
    eventHash: window.__fightEventHash ?? null,
    stats: window.__fightStats ?? null,
    pageError: window.__fightError ?? null,
  }));
  if (obs.pageError) errors.push(`__fightError: ${obs.pageError}`);
  await ctx.close();
  return { ...obs, errors };
}

/**
 * The verdict, as a pure function of (golden, observation) so the control can
 * vary the GOLDEN and hold the run fixed. Operands print whole - these are
 * eight characters and a slice could hide the one that differs.
 */
export function verdictFor(golden, obs) {
  const bad = [];
  if (obs.ticks !== golden.ticks) bad.push(`ticks: expected ${golden.ticks} got ${obs.ticks}`);
  for (const k of ["hash", "chain", "eventHash"]) {
    if (obs[k] !== golden[k]) bad.push(`${k}: expected ${golden[k]} got ${obs[k]}`);
  }
  for (const e of obs.errors) bad.push(`error: ${e}`);
  return { admitted: bad.length === 0, mismatches: bad };
}

function printVerdict(cell, obs, v) {
  const triple = `ticks ${obs.ticks} hash ${obs.hash} chain ${obs.chain} eventHash ${obs.eventHash}`;
  console.log(`  ${cell.padEnd(12)} ${v.admitted ? "ADMITTED" : "DISQUALIFIED"}   ${triple}`);
  for (const m of v.mismatches) console.log(`      ${m}`);
}

async function control(dist, tape, game) {
  const golden = readGolden(tape, game);
  const cells = listCells(dist, game);
  const cell = cells.includes("canvas") ? "canvas" : cells[0];
  if (!cell) { console.log("run-tape control: NO cells built - cannot run a control"); return 2; }
  const browser = await chromium.launch({ headless: true });
  const obs = await observeCell(browser, dist, cell, tape, game);
  await browser.close();
  // One observation, two goldens: a tape run is deterministic by construction,
  // so re-running would vary the run AND the golden at once. The thing under
  // test is the comparison, so the comparison is what moves.
  const bent = { ...golden, hash: `${golden.hash.slice(0, 7)}${golden.hash.at(-1) === "0" ? "1" : "0"}` };
  const bentV = verdictFor(bent, obs);
  const realV = verdictFor(golden, obs);
  console.log(`  control  bent golden (hash ${bent.hash}): ${bentV.admitted ? "ADMITTED" : "DISQUALIFIED"} - expected DISQUALIFIED - ${bentV.admitted ? "WRONG" : "ok"}`);
  for (const m of bentV.mismatches) console.log(`      ${m}`);
  console.log(`  control  real golden (hash ${golden.hash}): ${realV.admitted ? "ADMITTED" : "DISQUALIFIED"} - expected ADMITTED - ${realV.admitted ? "ok" : "WRONG"}`);
  for (const m of realV.mismatches) console.log(`      ${m}`);
  const ok = !bentV.admitted && realV.admitted;
  console.log(`run-tape controls: 2 run - ${ok ? 0 : 1} misbehaved`);
  return ok ? 0 : 1;
}

async function main(argv) {
  const f = parseFlags(argv, { dist: DEFAULT_DIST, tape: "versus-600", game: DEFAULT_GAME });
  const dist = resolve(String(f.dist));
  const game = String(f.game);
  if (!existsSync(dist)) { console.log(`run-tape: dist not found: ${dist}`); return 2; }
  if (!existsSync(gameDirOf(game))) { console.log(`run-tape: no such game: ${gameDirOf(game)}`); return 2; }
  if (f.control) return control(dist, String(f.tape), game);
  const tape = String(f.tape);
  const golden = readGolden(tape, game);
  const cells = f.rest.length ? f.rest : listCells(dist, game);
  console.log(`run-tape: ${cells.length} cell(s) under ${dist} playing game ${game} against golden ${tape} (ticks ${golden.ticks} hash ${golden.hash} chain ${golden.chain} eventHash ${golden.eventHash})`);
  if (cells.length === 0) { console.log("run-tape: NO cells found - a verdict over an empty population is not a verdict"); return 2; }
  const browser = await chromium.launch({ headless: true });
  let bad = 0;
  for (const cell of cells) {
    const obs = await observeCell(browser, dist, cell, tape, game);
    const v = verdictFor(golden, obs);
    if (!v.admitted) bad++;
    printVerdict(cell, obs, v);
    appendRow({
      kind: "tape", at: new Date().toISOString(), game, cell, tape,
      ticks: obs.ticks, hash: obs.hash, chain: obs.chain, eventHash: obs.eventHash,
      admitted: v.admitted, errors: obs.errors, stats: obs.stats,
    });
  }
  await browser.close();
  console.log(`run-tape: ${cells.length} cell(s) - ${cells.length - bad} admitted - ${bad} disqualified`);
  return bad === 0 ? 0 : 1;
}

const isMain = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) process.exit(await main(process.argv.slice(2)));
