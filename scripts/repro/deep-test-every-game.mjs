#!/usr/bin/env node
/**
 * EVERY GAME, OPENED AND PLAYED.
 * ===========================================================================
 *
 * `e2e-shell-walkthrough.mjs` proves the SHELL works and opens ONE game. This
 * one opens all of them, on the live site, and asks the only question a static
 * gate cannot: does the thing on the screen respond?
 *
 * WHY A SCREENSHOT DIFF AND NOT A DOM ASSERTION. Half this catalogue renders
 * into a Phaser canvas, where the DOM after a move is byte-identical to the DOM
 * before it, and `getContext("2d")` is unavailable on a WebGL surface. A
 * capture of the play area is the one instrument that reads both kinds of game
 * the same way - which is also this repo's own rule about verifying the
 * artifact rather than the bytes that produced it.
 *
 * THE INPUT IS TRIED THREE WAYS, AND THE FIRST VERSION OF THIS FILE ONLY HAD
 * THE LAST ONE. Tapping the geometric CENTRE of the play area reported eight of
 * forty-two games dead: a memory board's centre is the gap between four cards, a
 * maths quiz's centre is the question rather than the answers, and echo, music
 * and sequence sit still until you press start. All eight moved the moment a
 * real control was clicked - so the finding was in the harness, not the games,
 * and it was pointing at eight healthy games. It now clicks the first real
 * control, then sweeps a 3x3 grid, then falls back to the centre plus keys, and
 * PRINTS WHICH ONE WORKED so the next reader can see what the game needed.
 *
 * AND IT REPORTS TWO FLAGS, NEVER ONE. An animating game changes between two
 * captures with no input at all, so "it changed after I tapped" is not evidence
 * on its own. Each game reports `animates` (B != A with nothing touched) and
 * `responds` (C != B after a tap and a key), and only a game that does NEITHER
 * is a finding. Reporting one flag would have called every idle puzzle broken
 * and every animated one healthy, whatever the input did.
 *
 *   node deep-test-every-game.mjs <base> <ids.json> [--control] [--workers N]
 *
 * `--control` aborts each game's own lazy chunk. Every cell MUST then report
 * NOT MOUNTED; a control run where anything still passes means the harness is
 * measuring something other than the game.
 *
 * Needs playwright, which is deliberately not a dependency of this repo - copy
 * it into a tree that has one and run it from there.
 */

import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const BASE = (args[0] ?? "https://ellaz.fun").replace(/\/$/, "");
const IDS = JSON.parse(readFileSync(args[1], "utf8"));
const CONTROL = args.includes("--control");
const WORKERS = Number(args[args.indexOf("--workers") + 1]) || 4;
const SETTLE = 3000;
const BEAT = 700;

const browser = await chromium.launch();

/** One game: open it, let it settle, look, tap, look again. */
async function play(id) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 120)));
  const row = { id, status: 0, mounted: 0, animates: false, responds: false, via: "-", errors, note: "" };

  try {
    if (CONTROL) {
      // The game's own chunk, by the name Vite gives it. Aborting it is the
      // one mutation that must make every cell here fail.
      await page.route(new RegExp(`/assets/game-${id.replace(/[^a-z0-9]/gi, "[^/]*")}[^/]*\\.js`), (r) => r.abort());
      await page.route(/\/assets\/game-[^/]*\.js/, (r) => r.abort());
    }
    const res = await page.goto(`${BASE}/games/${id}/`, { waitUntil: "load", timeout: 45_000 });
    row.status = res?.status() ?? 0;
    await page.waitForTimeout(SETTLE);

    const surface = (await page.locator("#game-frame").count())
      ? page.locator("#game-frame")
      : page.locator("#root");
    row.mounted = await surface.evaluate((el) => el.querySelectorAll("*").length).catch(() => 0);
    row.note = ((await page.locator("body").innerText().catch(() => "")) || "")
      .match(/didn.t load|something went wrong|failed to load/i)?.[0] ?? "";

    const box = await surface.boundingBox();
    if (!box || box.width < 40 || box.height < 40) {
      row.note ||= `play area ${box ? `${Math.round(box.width)}x${Math.round(box.height)}` : "absent"}`;
    } else {
      const shot = () => surface.screenshot({ timeout: 15_000 });
      const a = await shot();
      await page.waitForTimeout(BEAT);
      const b = await shot();
      row.animates = !a.equals(b);
      // A tap in the middle, then a key. Between them these start every game
      // in the catalogue: the canvas ones listen for pointer or arrows, the
      // DOM ones are made of buttons.
      // Three ways, cheapest and most likely first. Stop at the first that moves.
      const control = surface.locator('button:visible,[role="button"]:visible').first();
      if (await control.count()) {
        await control.click({ timeout: 5000, force: true }).catch(() => {});
        await page.waitForTimeout(BEAT);
        if (!(await shot()).equals(b)) { row.responds = true; row.via = "control"; }
      }
      if (!row.responds) {
        const before = await shot();
        for (const fx of [0.25, 0.5, 0.75]) for (const fy of [0.3, 0.55, 0.8]) {
          await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
          await page.waitForTimeout(110);
        }
        await page.waitForTimeout(BEAT);
        if (!(await shot()).equals(before)) { row.responds = true; row.via = "sweep"; }
      }
      if (!row.responds) {
        const before = await shot();
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("Space");
        await page.waitForTimeout(BEAT);
        if (!(await shot()).equals(before)) { row.responds = true; row.via = "keys"; }
      }
    }
  } catch (e) {
    row.note ||= String(e).split("\n")[0].slice(0, 110);
  }
  await ctx.close();
  return row;
}

// A small pool rather than all at once: 43 headless contexts on one machine
// measures the machine, not the games.
const queue = [...IDS];
const rows = [];
await Promise.all(
  Array.from({ length: WORKERS }, async () => {
    for (let id = queue.shift(); id; id = queue.shift()) rows.push(await play(id));
  }),
);
await browser.close();

rows.sort((x, y) => (x.id < y.id ? -1 : 1));
const bad = (r) =>
  r.status !== 200 || r.mounted < 15 || r.note || r.errors.length || (!r.animates && !r.responds);

console.log(`\n${BASE}   ${rows.length} games${CONTROL ? "   [CONTROL: every game chunk aborted]" : ""}\n`);
console.log("     id                    http  nodes  anim  resp  via      note");
for (const r of rows) {
  console.log(
    `${bad(r) ? "FAIL" : "ok  "} ${r.id.padEnd(22)}${String(r.status).padEnd(6)}${String(r.mounted).padEnd(7)}` +
      `${(r.animates ? "yes" : "no").padEnd(6)}${(r.responds ? "yes" : "no").padEnd(6)}${r.via.padEnd(9)}` +
      `${r.note}${r.errors.length ? `  ERR ${r.errors[0]}` : ""}`,
  );
}
const failed = rows.filter(bad);
console.log(`\n${rows.length - failed.length}/${rows.length} games open, mount and move.`);

if (CONTROL) {
  const alive = rows.filter((r) => !bad(r));
  console.log(
    alive.length
      ? `\nCONTROL FAILED: ${alive.length} game(s) still passed with their chunk aborted: ${alive.map((r) => r.id).join(", ")}`
      : "\nCONTROL OK - with the game chunks blocked, every cell fails. The harness is reading the game.",
  );
  process.exit(alive.length ? 1 : 0);
}
process.exit(failed.length ? 1 : 0);
