/**
 * BEFORE/AFTER captures for the Visual Hall, from TWO builds of ONE tree.
 *
 * The operator's standing law, 2026-08-25: "any UI change must be eyeballed by
 * me befor after and acked". They are on WSL and the TUI cannot open an image
 * attachment, so the pair has to reach a browser - `show-visual.sh --ab` puts
 * it on localhost:8772.
 *
 * Both arms come from THIS tree rather than one from the live site: the tree
 * carries work the live build does not, so a live-vs-local pair would show
 * several variables at once and the operator would be ruling on the wrong one.
 *
 *   node scripts/repro/shot-arms.mjs <distDir> <label>
 */
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const DIST = process.argv[2];
const LABEL = process.argv[3];
if (!DIST || !LABEL) throw new Error("usage: shot-arms.mjs <distDir> <label>");

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".webmanifest": "application/manifest+json", ".woff2": "font/woff2", ".txt": "text/plain", ".xml": "application/xml" };

/**
 * NO HTTP SERVER, and that is deliberate rather than clever.
 *
 * The obvious shape is a static server on a port. 5180 - this repo's own
 * documented preview port - was already held by a peer's dev server, and
 * ~/.claude/rules/technical/never-invent-a-port.md is explicit that picking a
 * free one is not an available move. Playwright's own router serves the build
 * straight off disk, so there is no port to pick, nothing to collide with, and
 * two arms can be captured while somebody else is working.
 */
function fulfilFromDisk(dist) {
  return async (route, request) => {
    let p = normalize(decodeURI(new URL(request.url()).pathname)).replace(/^(\.\.[/\\])+/, "");
    let file = join(dist, p);
    if (existsSync(file) && !extname(file)) file = join(file, "index.html");
    if (!existsSync(file)) file = join(dist, "404.html");
    if (!existsSync(file)) return route.fulfill({ status: 404, body: "" });
    route.fulfill({
      status: 200,
      contentType: TYPES[extname(file)] ?? "application/octet-stream",
      body: await readFile(file),
    });
  };
}

const SEED = {
  v: 1,
  coins: 1240,
  stars: 24,
  owned: [],
  placed: {},
  games: { snake: { lastPlayedAt: 1756000000000 }, memory: { lastPlayedAt: 1755900000000 } },
};

const browser = await chromium.launch();

/**
 * Every shot is a RETURNING player, and that is not a detail.
 *
 * The duplicate leaderboards row is gated on `recent.length > 0`, so a fresh
 * profile shows one link on the broken build and the whole comparison reports
 * nothing. This repo has the note already:
 * a-row-that-grows-with-the-catalog-must-wrap.md - "an empty profile hides this
 * bug completely, which is why it survived a screenshot review". The 24 stars
 * and four-digit coin balance are the width case too, so one seed serves both.
 */
const shots = [
  // Tight crops, one per change, because the operator is ruling on ONE thing
  // per link and a full page makes them hunt for it.
  ["01-boards-row", "/", 390, 900, { x: 0, y: 0, width: 390, height: 470 }],
  ["02-coins", "/", 390, 900, { x: 0, y: 40, width: 390, height: 76 }],
  ["03-theme-pill", "/", 390, 900, { x: 195, y: 48, width: 195, height: 62 }],
  ["04-globe-game", "/games/snake/", 390, 900, { x: 0, y: 0, width: 390, height: 116 }],
  ["05-globe-game-wide", "/games/snake/", 1440, 900, { x: 700, y: 0, width: 740, height: 130 }],
  // The sheet OPEN, because "there is a globe" and "tapping it offers the four
  // languages this page exists in" are two different things to look at.
  ["06-globe-open", "/games/snake/", 390, 900, { x: 0, y: 0, width: 390, height: 330 }, "open"],
  // And the whole screens, so nothing is being hidden by a crop.
  ["10-home-390", "/", 390, 900, null],
  ["11-home-1440", "/", 1440, 900, null],
  ["12-game-390", "/games/snake/", 390, 900, null],
];

for (const [name, path, w, h, clip, act] of shots) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await ctx.route("**/*", fulfilFromDisk(DIST));
  await ctx.addInitScript(`try{localStorage.setItem("ellaz:profile:v1",'${JSON.stringify(SEED)}')}catch{}`);
  const page = await ctx.newPage();
  await page.goto(`http://ellaz.local${path}`, { waitUntil: "load" });
  // Wait for the thing that renders, never for the network: in a built bundle
  // networkidle lands well after the header is up, and on a game page the
  // clock has been running the whole time.
  await page.waitForSelector("header", { timeout: 15000 });
  await page.waitForFunction(() => document.fonts.ready.then(() => true), null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(700);
  // `details.open = true` rather than a click: on the BEFORE arm there is no
  // globe to click at all, and a probe that throws on one arm cannot produce a
  // pair. A missing sheet has to render as a missing sheet.
  if (act === "open") await page.evaluate(() => { const d = document.querySelector("header .lang"); if (d) d.open = true; });
  await page.screenshot({ path: `screenshots/six-${name}-${LABEL}.png`, clip: clip ?? undefined });
  await ctx.close();
}

await browser.close();
console.log(`captured ${shots.length} shots for ${LABEL}`);
