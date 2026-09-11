// Equal pixels, equal DPR, equal sprites - or the timing sweep is measuring
// the arms' workloads and calling it engine performance.
//
//   node assert-equal-work.mjs [--dist <dir>] [cell...]
//   node assert-equal-work.mjs --control
//
// Round 3 of the prior tournament (docs/engine-tournament/ROUND3-VERDICT.md)
// was decided by an arm quietly rendering 4.76x the pixels of its neighbours.
// Two things follow, and this gate is built on both:
//
//   1. Ask the ARTIFACT, not the config. An engine can request antialias and
//      not get it; re-getting the context hands back the SAME context with the
//      attributes it was actually granted.
//   2. Equal pixels is still not equal work. An arm that culls a fighter draws
//      fewer sprites into the same backbuffer and wins on nothing. So `drawn`
//      is compared beside the buffer size.
//
// A 2D canvas reports null for the GL fields. That is a reading, not an error.

import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { DEFAULT_DIST, cellUrl, listCells, parseFlags, routeDisk, watchErrors } from "./run-tape.mjs";

/** What the live page says about the surface it just drew 600 ticks onto. */
async function readWork(page) {
  return page.evaluate(() => {
    const c = document.querySelector("canvas");
    if (!c) return { error: "no canvas element on the page" };
    // Re-getting the context returns the SAME context with its real attributes;
    // it does not create a second one. On a 2D canvas both calls return null.
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    const a = gl && gl.getContextAttributes ? gl.getContextAttributes() : null;
    const s = window.__fightStats ?? {};
    return {
      backbuffer: [c.width, c.height],
      css: [c.clientWidth, c.clientHeight],
      dpr: window.devicePixelRatio,
      api: gl ? (typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext ? "webgl2" : "webgl1") : "2d",
      antialias: a ? a.antialias : null,
      alpha: a ? a.alpha : null,
      samples: gl ? gl.getParameter(gl.SAMPLES) : null,
      drawingBuffer: gl ? [gl.drawingBufferWidth, gl.drawingBufferHeight] : null,
      drawn: s.drawn ?? null,
      engine: s.engine ?? "?",
      version: s.version ?? "?",
      reported: s.backbuffer ?? null,
      reportedDpr: s.dpr ?? null,
    };
  });
}

async function observeWork(browser, dist, cell) {
  const ctx = await browser.newContext({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 });
  await routeDisk(ctx, dist);
  const page = await ctx.newPage();
  const errors = [];
  watchErrors(page, errors);
  await page.goto(cellUrl(cell, "tape=versus-600&fast=1"));
  try { await page.waitForFunction(() => window.__fightDone === true, null, { timeout: 60000 }); }
  catch { errors.push("window.__fightDone never became true within 60000 ms"); }
  const work = await readWork(page);
  return { ctx, page, row: { cell, ...work, errors } };
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The comparison, as a pure function of the rows so the control can feed it a
 * bent row. Returns a failure list; empty means the arms did equal work.
 */
export function compareWork(rows) {
  const bad = [];
  for (const r of rows) {
    if (r.error) bad.push(`${r.cell}: ${r.error}`);
    for (const e of r.errors ?? []) bad.push(`${r.cell}: ${e}`);
    if (r.reported && !same(r.reported, r.backbuffer)) {
      bad.push(`${r.cell}: cell reports backbuffer ${JSON.stringify(r.reported)} but its canvas element is ${JSON.stringify(r.backbuffer)}`);
    }
  }
  const base = rows[0];
  if (!base) return bad;
  for (const r of rows.slice(1)) {
    if (!same(r.backbuffer, base.backbuffer)) bad.push(`backbuffer differs: ${base.cell} ${JSON.stringify(base.backbuffer)} vs ${r.cell} ${JSON.stringify(r.backbuffer)}`);
    if (r.dpr !== base.dpr) bad.push(`dpr differs: ${base.cell} ${base.dpr} vs ${r.cell} ${r.dpr}`);
    if (r.drawn !== base.drawn) bad.push(`drawn differs: ${base.cell} ${base.drawn} vs ${r.cell} ${r.drawn} - equal pixels is not equal work`);
  }
  return bad;
}

function table(rows) {
  const head = ["cell", "engine", "version", "backbuffer", "drawingBuffer", "css", "dpr", "samples", "antialias", "drawn"];
  const body = rows.map((r) => [
    r.cell, String(r.engine), String(r.version),
    r.backbuffer ? r.backbuffer.join("x") : "-",
    r.drawingBuffer ? r.drawingBuffer.join("x") : "null",
    r.css ? r.css.join("x") : "-",
    String(r.dpr), String(r.samples), String(r.antialias), String(r.drawn),
  ]);
  const w = head.map((h, i) => Math.max(h.length, ...body.map((b) => b[i].length)));
  console.log(`  ${head.map((h, i) => h.padEnd(w[i])).join("  ")}`);
  for (const b of body) console.log(`  ${b.map((v, i) => v.padEnd(w[i])).join("  ")}`);
}

async function control(dist) {
  const cells = listCells(dist);
  const cell = cells.includes("canvas") ? "canvas" : cells[0];
  if (!cell) { console.log("equal-work control: NO cells built - cannot run a control"); return 2; }
  const browser = await chromium.launch({ headless: true });
  const { ctx, page, row } = await observeWork(browser, dist, cell);
  const again = { cell: `${cell}#2`, ...(await readWork(page)), errors: [] };
  await page.evaluate(() => { document.querySelector("canvas").width *= 2; });
  const bent = { cell: `${cell}#bent`, ...(await readWork(page)), errors: [] };
  await ctx.close();
  await browser.close();
  const quiet = compareWork([row, again]);
  const fired = compareWork([{ ...row, reported: null }, { ...bent, reported: null }]);
  console.log(`  control  two honest reads of ${cell}: ${quiet.length ? "FIRED" : "quiet"} - expected quiet - ${quiet.length ? "WRONG" : "ok"}`);
  for (const m of quiet) console.log(`      ${m}`);
  console.log(`  control  canvas.width doubled in the page: ${fired.length ? "FIRED" : "quiet"} - expected FIRE - ${fired.length ? "ok" : "WRONG"}`);
  for (const m of fired) console.log(`      ${m}`);
  const ok = quiet.length === 0 && fired.length > 0;
  console.log(`equal-work controls: 2 run - ${ok ? 0 : 1} misbehaved`);
  return ok ? 0 : 1;
}

async function main(argv) {
  const f = parseFlags(argv, { dist: DEFAULT_DIST });
  const dist = resolve(String(f.dist));
  if (!existsSync(dist)) { console.log(`equal-work: dist not found: ${dist}`); return 2; }
  if (f.control) return control(dist);
  const cells = f.rest.length ? f.rest : listCells(dist);
  console.log(`equal-work: ${cells.length} cell(s) under ${dist}/cells`);
  if (cells.length === 0) { console.log("equal-work: NO cells found - nothing to compare"); return 2; }
  const browser = await chromium.launch({ headless: true });
  const rows = [];
  for (const cell of cells) {
    const { ctx, row } = await observeWork(browser, dist, cell);
    await ctx.close();
    rows.push(row);
  }
  await browser.close();
  table(rows);
  const bad = compareWork(rows);
  for (const b of bad) console.log(`  FAIL  ${b}`);
  if (cells.length === 1) console.log("equal-work: ONE cell - the cross-arm comparison had nothing to compare; this is a reading, not a pass");
  console.log(bad.length === 0 ? `equal-work: ${cells.length} cell(s) - ok` : `equal-work: ${bad.length} failure(s)`);
  return bad.length === 0 ? 0 : 1;
}

const isMain = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) process.exit(await main(process.argv.slice(2)));
