// Time to first frame, cold and warm, over N rounds - and a REFUSAL to rank
// when the noise is bigger than the thing being ranked.
//
//   node sweep.mjs [--dist <dir>] [--rounds 3] [cell...]
//
// Three design choices, each of which a previous sweep got wrong somewhere:
//
//   - The cell ORDER alternates every round. A differential whose arms are not
//     interleaved measures the arm order as much as the arm; the ellaz repo has
//     a rule file about exactly that (an un-interleaved CLS run read 0.28 for
//     the arms and 0.003 for the controls, and the difference was the order).
//   - Every row carries os.loadavg()[0]. A number taken while the box was busy
//     is not comparable to one taken while it was idle, and the only way to
//     know afterwards is to have written it down at the time.
//   - Rows are appended as they are produced. A long run is never piped to
//     tail and never held in memory to be printed at the end.
//
// The last line is a verdict about whether a verdict is possible. When any
// cell's spread (max - min cold ttff) is wider than the gap to its nearest
// neighbour, the ordering is noise and this prints the per-round orderings
// instead of a ranking.

import { existsSync, realpathSync } from "node:fs";
import { loadavg } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { DEFAULT_DIST, appendRow, cellUrl, listCells, parseFlags, routeDisk, watchErrors } from "./run-tape.mjs";

const HOLD_MS = 2000;

/** Navigate, wait for the first frame, run at real time for 2 s, read back. */
async function loadOnce(page, cell) {
  const errors = [];
  await page.goto(cellUrl(cell, "tape=versus-600"));
  try { await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 }); }
  catch { errors.push("window.__ready never became true within 30000 ms"); }
  await page.waitForTimeout(HOLD_MS);
  const s = await page.evaluate(() => {
    const st = window.__fightStats ?? {};
    return { ttffMs: st.ttffMs ?? null, stepsPerFrame: st.stepsPerFrame ?? null, distinctDraws: st.distinctDraws ?? null, ticks: window.__fightTicks ?? null, refresh: st.refresh ?? null };
  });
  return { ...s, errors };
}

/** Cold = a context that has never seen these bytes. Warm = the second visit. */
async function sweepCell(browser, dist, cell) {
  const ctx = await browser.newContext({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 });
  await routeDisk(ctx, dist);
  const page = await ctx.newPage();
  const errors = [];
  watchErrors(page, errors);
  const cold = await loadOnce(page, cell);
  const warm = await loadOnce(page, cell);
  await ctx.close();
  return { cold, warm, errors: [...errors, ...cold.errors, ...warm.errors] };
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};

/**
 * Is an ordering by median cold ttff readable at all? Only when every cell's
 * own spread is narrower than the distance to its nearest neighbour - else the
 * cells overlap and the order is whichever round you happened to look at.
 */
export function rankable(stats) {
  const order = [...stats].sort((a, b) => a.median - b.median);
  const blocked = [];
  for (let i = 0; i < order.length; i++) {
    const gaps = [];
    if (i > 0) gaps.push(order[i].median - order[i - 1].median);
    if (i < order.length - 1) gaps.push(order[i + 1].median - order[i].median);
    const gap = gaps.length ? Math.min(...gaps) : Infinity;
    if (order[i].spread > gap) blocked.push(`${order[i].cell}: spread ${order[i].spread.toFixed(1)} ms exceeds the ${gap.toFixed(1)} ms gap to its nearest neighbour`);
  }
  return { order, blocked };
}

function summarise(rows, cells, rounds) {
  const stats = cells.map((cell) => {
    const cold = rows.filter((r) => r.cell === cell).map((r) => r.cold.ttffMs).filter((v) => typeof v === "number");
    return { cell, n: cold.length, median: cold.length ? median(cold) : NaN, spread: cold.length ? Math.max(...cold) - Math.min(...cold) : NaN, cold };
  });
  console.log(`sweep: ${cells.length} cell(s) x ${rounds} round(s), cold ttff ms`);
  for (const s of stats) console.log(`  ${s.cell.padEnd(12)} median ${s.median.toFixed(1)}  spread ${s.spread.toFixed(1)}  n ${s.n}  all [${s.cold.map((v) => v.toFixed(1)).join(", ")}]`);
  const { order, blocked } = rankable(stats);
  if (blocked.length === 0 && cells.length > 1) {
    console.log(`sweep ranking (fastest cold first): ${order.map((o) => `${o.cell} ${o.median.toFixed(1)}`).join(" < ")}`);
    return;
  }
  if (cells.length < 2) { console.log("sweep: ONE cell - there is nothing to rank; these are its readings, not a placing"); return; }
  console.log("sweep: NO RANKING - the cells overlap inside their own noise:");
  for (const b of blocked) console.log(`  ${b}`);
  console.log("  per-round orderings instead (each round sorted by its own cold ttff):");
  for (let r = 0; r < rounds; r++) {
    const inRound = rows.filter((x) => x.round === r && typeof x.cold.ttffMs === "number").sort((a, b) => a.cold.ttffMs - b.cold.ttffMs);
    console.log(`    round ${r}: ${inRound.map((x) => `${x.cell} ${x.cold.ttffMs.toFixed(1)}`).join(" < ")}`);
  }
}

async function main(argv) {
  const f = parseFlags(argv, { dist: DEFAULT_DIST, rounds: "3" });
  const dist = resolve(String(f.dist));
  if (!existsSync(dist)) { console.log(`sweep: dist not found: ${dist}`); return 2; }
  const cells = f.rest.length ? f.rest : listCells(dist);
  const rounds = Number(f.rounds);
  if (cells.length === 0) { console.log("sweep: NO cells found - nothing to time"); return 2; }
  const browser = await chromium.launch({ headless: true });
  const rows = [];
  for (let round = 0; round < rounds; round++) {
    const order = round % 2 === 0 ? cells : [...cells].reverse();
    for (const cell of order) {
      const { cold, warm, errors } = await sweepCell(browser, dist, cell);
      const row = {
        kind: "sweep", at: new Date().toISOString(), round, cell,
        cold: { ttffMs: cold.ttffMs }, warm: { ttffMs: warm.ttffMs },
        stepsPerFrame: warm.stepsPerFrame, distinctDraws: warm.distinctDraws,
        load: loadavg()[0], refresh: warm.refresh, errors,
      };
      rows.push(row);
      appendRow(row);
      console.log(`  round ${round} ${cell.padEnd(12)} cold ${String(cold.ttffMs)} ms  warm ${String(warm.ttffMs)} ms  steps/frame ${String(warm.stepsPerFrame)}  distinct ${String(warm.distinctDraws)}  load ${row.load.toFixed(2)}${errors.length ? `  errors ${errors.length}` : ""}`);
      for (const e of errors) console.log(`      ${e}`);
    }
  }
  await browser.close();
  summarise(rows, cells, rounds);
  return 0;
}

const isMain = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) process.exit(await main(process.argv.slice(2)));
