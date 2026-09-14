#!/usr/bin/env node
/**
 * Does changing difficulty move or resize the game?
 *
 *   node scripts/repro/repro-difficulty-keeps-the-game-size.mjs --dist dist-x     # a build on disk
 *   node scripts/repro/repro-difficulty-keeps-the-game-size.mjs --base https://ellaz.fun --only wordsearch
 *   node scripts/repro/repro-difficulty-keeps-the-game-size.mjs --control
 *
 * WHY THIS EXISTS (2026-09-14)
 *
 * The key gate (repro-keys-do-not-move-the-game.mjs) pressed Space on a focused
 * difficulty toggle and found that a new level resizes games: wordsearch went 495 ->
 * 536px on a PC and fitStage shrank it to 0.938, maze grew 23px on a phone and
 * rescaled, and six more moved 2-8px. The operator ruled "fix it now". A player taps
 * the toggle between rounds, so a whole game jumping under their finger is the same
 * defect as a key jumping it, reached by a different input.
 *
 * WHAT IT ASSERTS, per game x window
 *
 *   tap the game's difficulty control through every level and back to the first -
 *
 *     SAME HEIGHT   #game-frame's layout height is within 1px of the first level's
 *     SAME SCALE    fitStage's scale is within 0.002 of the first level's
 *
 *   and, so a toggle that never changed anything cannot pass: at least two levels
 *   were actually seen.
 *
 * SCOPE, said out loud
 *
 *   - The board as each level DEALS it, 900ms after the tap. A size that changes
 *     later in a round (a board that grows as it is played) is not in the population.
 *   - A game with no difficulty control is counted and skipped, never passed.
 */
import { chromium } from "file:///mnt/c/Users/ytr_o/OneDrive/Desktop/ellaz/studio/node_modules/playwright-core/index.mjs";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const argOf = (flag) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
};
const BASE = (argOf("--base") ?? "http://localhost:5180").replace(/\/$/, "");
const DIST = argOf("--dist");
const ONLY = argOf("--only")?.split(",");
const CONTROL = process.argv.includes("--control");
const SETTLE = 900;

const WINDOWS = [
  [1536, 639, false], // the operator's own window
  [390, 844, true], // a phone, where fitStage scales
];

const GAMES_DIR = fileURLToPath(new URL("../../src/games/", import.meta.url));
const ids = readdirSync(GAMES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(`${GAMES_DIR}${d.name}/meta.ts`))
  .map((d) => readFileSync(`${GAMES_DIR}${d.name}/meta.ts`, "utf8").match(/^\s*id:\s*"([^"]+)"/m)?.[1])
  .filter(Boolean)
  .sort();
if (ids.length < 40) throw new Error(`read only ${ids.length} game ids from ${GAMES_DIR} - refusing a partial population`);
const GAMES = ids.filter((id) => !ONLY || ONLY.includes(id));
if (ONLY && GAMES.length !== ONLY.length) throw new Error(`--only names a game that does not exist: ${ONLY.filter((g) => !ids.includes(g))}`);

/** In the page: how big the game is, and which level is showing. */
function read() {
  const frame = document.getElementById("game-frame");
  if (!frame) return { error: "no #game-frame on this page" };
  document.scrollingElement.scrollTop = 0;
  const tf = getComputedStyle(frame).transform;
  const toggle = document.querySelector("#game-frame .gc-level");
  const picked = document.querySelector('#game-frame button[aria-label^="difficulty "][class*="primary"], #game-frame button[aria-label^="difficulty "][aria-pressed="true"]');
  return {
    frameH: frame.offsetHeight,
    scale: tf === "none" ? 1 : Number(tf.match(/matrix\(([-\d.]+)/)?.[1] ?? 1),
    level: toggle?.getAttribute("aria-label") ?? picked?.getAttribute("aria-label") ?? null,
  };
}

const browser = await chromium.launch();
const TYPES = { html: "text/html", js: "text/javascript", css: "text/css", json: "application/json", svg: "image/svg+xml", png: "image/png", webp: "image/webp", woff2: "font/woff2", webmanifest: "application/manifest+json" };

async function open(id, w, h, touch) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, serviceWorkers: "block", hasTouch: touch });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("ellaz:consent:v1", "denied");
    } catch {}
  });
  if (DIST)
    await ctx.route(`${new URL(BASE).origin}/**`, (route) => {
      let path = decodeURIComponent(new URL(route.request().url()).pathname);
      if (path.endsWith("/")) path += "index.html";
      const file = `${DIST.replace(/\/$/, "")}${path}`;
      if (!existsSync(file)) return route.fulfill({ status: 404, body: "not in dist" });
      route.fulfill({ status: 200, contentType: TYPES[path.split(".").pop()] ?? "application/octet-stream", body: readFileSync(file) });
    });
  const page = await ctx.newPage();
  for (let i = 0; ; i++) {
    try {
      await page.goto(`${BASE}/games/${id}/`, { waitUntil: "load", timeout: 45000 });
      break;
    } catch (e) {
      if (i === 2) {
        await ctx.close();
        throw e;
      }
      await page.waitForTimeout(2000);
    }
  }
  await page.waitForTimeout(1800);
  return { ctx, page };
}

/**
 * Walk every level. `plant` runs after each tap - the control uses it to grow the
 * panel, so it drives the same code path the real arms do.
 */
async function walk(page, plant) {
  const first = await page.evaluate(read);
  if (first.error) return { error: first.error };
  const toggle = page.locator("#game-frame .gc-level").first();
  const pills = page.locator('#game-frame button[aria-label^="difficulty "]');
  const nPills = await pills.count();
  if (!(await toggle.count()) && nPills < 2) return { none: true };
  // A pill row (DifficultySelector) marks the picked level only by its colour, so
  // for pills the level is the label of the pill this walk pressed, and the walk
  // ends by pressing the first pill again.
  const usePills = !(await toggle.count());
  if (usePills) {
    await pills.nth(0).click();
    await page.waitForTimeout(SETTLE);
    Object.assign(first, await page.evaluate(read), { level: await pills.nth(0).getAttribute("aria-label") });
  }
  const seen = [first];
  for (let i = 0; i < 10; i++) {
    const at = usePills ? (i + 1) % nPills : -1;
    if (usePills) await pills.nth(at).click();
    else await toggle.click();
    if (plant) await page.evaluate(plant, i);
    await page.waitForTimeout(SETTLE);
    const now = await page.evaluate(read);
    if (usePills) now.level = await pills.nth(at).getAttribute("aria-label");
    seen.push(now);
    if (now.level === first.level) break;
  }
  const levels = new Set(seen.map((s) => s.level));
  if (levels.size < 2) return { error: `the difficulty control never changed the level (read ${[...levels].join(", ")})` };
  const moved = seen
    .filter((s) => Math.abs(s.frameH - first.frameH) > 1 || Math.abs(s.scale - first.scale) > 0.002)
    .map((s) => `${s.level}: frame ${first.frameH}->${s.frameH}px, scale ${first.scale}->${s.scale}`);
  return { moved: [...new Set(moved)], levels: levels.size, first };
}

const rows = [];
for (const id of GAMES)
  for (const [w, h, touch] of WINDOWS) {
    const win = `${w}x${h}`;
    try {
      const { ctx, page } = await open(id, w, h, touch);
      const r = await walk(page);
      await ctx.close();
      rows.push({ id, win, ...r });
    } catch (e) {
      rows.push({ id, win, error: String(e).split("\n")[0].slice(0, 120) });
    }
  }

/* Controls. A gate that cannot see a resize passes every arm, and so does one whose
 * toggle click lands on nothing - the second is caught per arm above, the first here. */
const control = [];
if (CONTROL)
  try {
    const { ctx, page } = await open("sudoku", 1536, 639, false);
    const r = await walk(page, (i) => {
      const d = document.createElement("div");
      d.style.height = `${30 * (i + 1)}px`;
      document.querySelector(".ellaz-game-panel").prepend(d);
    });
    control.push({ cell: "a panel that grows 30px per level is flagged", ok: !!r.moved?.length, got: r.moved?.[0] ?? r.error ?? "not flagged" });
    await ctx.close();
    const g = await open("sudoku", 1536, 639, false);
    const clean = await walk(g.page);
    control.push({ cell: "the same game untouched walks at least two levels", ok: (clean.levels ?? 0) >= 2, got: `${clean.levels ?? 0} levels${clean.error ? `, ${clean.error}` : ""}` });
    await g.ctx.close();
  } catch (e) {
    control.push({ cell: "the control cells ran at all", ok: false, got: String(e).slice(0, 140) });
  }

await browser.close();

const none = [...new Set(rows.filter((r) => r.none).map((r) => r.id))];
const walked = rows.filter((r) => !r.none);
console.log(`\npopulation: ${GAMES.length} games x ${WINDOWS.length} windows; ${walked.length} arms walked every level, ${none.length} games have no difficulty control${none.length ? ` (${none.join(", ")})` : ""}; base ${DIST ? `${BASE} <- ${DIST}` : BASE}`);
const bad = walked.filter((r) => r.error || r.moved.length);
for (const r of bad) {
  if (r.error) console.log(`  ERROR ${r.id} @ ${r.win}: ${r.error}`);
  else {
    console.log(`  ${r.id} @ ${r.win}:`);
    for (const m of r.moved) console.log(`      ${m}`);
  }
}
const badGames = [...new Set(bad.map((r) => r.id))];
console.log(`\nfailures: ${bad.length} of ${walked.length} arms, in ${badGames.length} games${badGames.length ? ` (${badGames.join(", ")})` : ""}`);
if (CONTROL) {
  console.log("\ncontrol:");
  for (const c of control) console.log(`  ${c.ok ? "OK  " : "FAIL"} ${c.cell}  (${c.got})`);
}
process.exit(bad.length || control.some((c) => !c.ok) ? 1 : 0);
