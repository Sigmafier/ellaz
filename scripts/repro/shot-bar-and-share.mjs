/**
 * TWO eyeball sets, from the real built page, for two operator questions of
 * 2026-08-25:
 *
 *   1. "i want this entirely to be in one line, so suggest how, show just
 *       coints instead of stars maybe and suggest more options"
 *   2. "i want different share button icon"
 *
 * Both are drawn ON the real page rather than beside it, so what is ruled on is
 * the thing that would ship. The row-count evidence behind set 1 is
 * `repro-home-bar-one-line.mjs`; this only takes the pictures.
 *
 *   node scripts/repro/shot-bar-and-share.mjs [distDir]
 */
import { readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const DIST = process.argv[2] ?? "dist-after";
const OUT = "screenshots";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".webmanifest": "application/manifest+json", ".woff2": "font/woff2", ".txt": "text/plain", ".xml": "application/xml" };

function fulfilFromDisk(dist) {
  return async (route, request) => {
    let p = normalize(decodeURI(new URL(request.url()).pathname)).replace(/^(\.\.[/\\])+/, "");
    let file = join(dist, p);
    if (existsSync(file) && !extname(file)) file = join(file, "index.html");
    if (!existsSync(file)) file = join(dist, "404.html");
    if (!existsSync(file)) return route.fulfill({ status: 404, body: "" });
    route.fulfill({ status: 200, contentType: TYPES[extname(file)] ?? "application/octet-stream", body: await readFile(file) });
  };
}

const SEED = { v: 1, coins: 1240, stars: 24, owned: [], placed: {}, games: { snake: { lastPlayedAt: Date.now() } } };

// ---- set 1: the home bar ---------------------------------------------------
const BAR = {
  "bar-0-shipped": [],
  "bar-A-coins-only": ["coins"],
  "bar-L-word-hidden-coins": ["word", "coins"],
  "bar-M-word-coins-40px": ["word", "coins", "pills"],
};

const applySteps = (steps) => {
  const h = document.querySelector("header");
  const chip = document.querySelector('[aria-label*="coins"]');
  const step = {
    coins: () => {
      const parts = [...(chip?.children ?? [])];
      if (parts.length >= 2) parts[parts.length - 1].style.display = "none";
    },
    word: () => {
      const h1 = h?.querySelector("h1");
      if (h1) h1.style.display = "none";
      const id = h?.children[1];
      if (id) id.style.flex = "0 1 auto";
    },
    pills: () => document.documentElement.style.setProperty("--tap", "40px"),
  };
  for (const n of steps) step[n]?.();
};

// ---- set 2: the share glyph ------------------------------------------------
/**
 * Five candidates in THIS repo's icon idiom - 24x24, no fill, round caps, the
 * same 2.1 stroke and the same ~4..20 coordinate band as `src/ui/icons.tsx`.
 * Drawn at the real pill size on the real utility row, because a glyph judged
 * in isolation is judged at the wrong size next to the wrong neighbours.
 *
 * The shipped mock is the iOS box-and-arrow, which reads "export" or "save to
 * files" as much as "share" - and the operator's ruling is that this is an
 * INVITE. That is the case against it; the ruling is theirs.
 */
const SHARE = {
  "share-1-box-arrow (as mocked)":
    '<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 15V4"/><path d="M8.5 7.2 12 3.8l3.5 3.4"/>',
  "share-2-nodes":
    '<circle cx="17.8" cy="5.6" r="2.6"/><circle cx="6.2" cy="12" r="2.6"/><circle cx="17.8" cy="18.4" r="2.6"/><path d="M8.5 10.7 15.5 7"/><path d="M8.5 13.3 15.5 17"/>',
  "share-3-paper-plane":
    '<path d="M20.6 3.4 3.4 10.2l6.2 2.9 2.9 6.2z"/><path d="M20.6 3.4 9.6 13.1"/>',
  "share-4-forward-arrow":
    '<path d="M4.2 18.6c0-5.6 3.4-8.4 8.6-8.4V5.4l6.8 6.4-6.8 6.4v-4.8c-4.2 0-6.8 1.4-8.6 5.2z"/>',
  "share-5-link":
    '<path d="M10.2 13.8a4 4 0 0 0 5.7 0l2.9-2.9a4 4 0 1 0-5.7-5.7l-1.6 1.7"/><path d="M13.8 10.2a4 4 0 0 0-5.7 0l-2.9 2.9a4 4 0 1 0 5.7 5.7l1.6-1.7"/>',
};

const putShare = (inner) => {
  const tools = document.querySelector(".urow .tools");
  if (!tools) throw new Error("no .urow .tools on this page - the mock would draw nowhere real");
  const b = document.createElement("button");
  b.className = tools.firstElementChild?.className ?? "hbtn ico";
  b.setAttribute("aria-label", "Share this game");
  b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  tools.appendChild(b);
};

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const [name, steps] of Object.entries(BAR)) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.route("**/*", fulfilFromDisk(DIST));
  await ctx.addInitScript((p) => { try { localStorage.setItem("ellaz:profile:v1", JSON.stringify(p)); } catch { /* incognito */ } }, SEED);
  const page = await ctx.newPage();
  await page.goto("http://ellaz.local/", { waitUntil: "load" });
  await page.waitForSelector("header", { timeout: 10000 });
  await page.waitForTimeout(900);           // past WalletChip's 520ms roll-up
  await page.evaluate(applySteps, steps);
  await page.waitForTimeout(200);
  const box = await page.evaluate(() => {
    const b = document.querySelector("header").getBoundingClientRect();
    return { x: 0, y: 0, width: 390, height: Math.ceil(b.bottom) + 8 };
  });
  await page.screenshot({ path: join(OUT, `${name}.png`), clip: box });
  console.log(`  ${name}  header ${box.height - 8}px`);
  await ctx.close();
}

for (const [name, inner] of Object.entries(SHARE)) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  await ctx.route("**/*", fulfilFromDisk(DIST));
  await ctx.addInitScript((p) => { try { localStorage.setItem("ellaz:profile:v1", JSON.stringify(p)); } catch { /* incognito */ } }, SEED);
  const page = await ctx.newPage();
  await page.goto("http://ellaz.local/games/snake/", { waitUntil: "load" });
  await page.waitForSelector(".urow .tools", { timeout: 10000 });
  await page.waitForTimeout(500);
  await page.evaluate(putShare, inner);
  await page.waitForTimeout(150);
  const box = await page.evaluate(() => {
    const b = document.querySelector(".urow").getBoundingClientRect();
    return { x: 0, y: Math.max(0, b.top - 6), width: 390, height: Math.ceil(b.height) + 12 };
  });
  await page.screenshot({ path: join(OUT, `${name.split(" ")[0]}.png`), clip: box });
  console.log(`  ${name}`);
  await ctx.close();
}
await browser.close();
console.log(`\nwrote ${Object.keys(BAR).length + Object.keys(SHARE).length} shots to ${OUT}/`);
