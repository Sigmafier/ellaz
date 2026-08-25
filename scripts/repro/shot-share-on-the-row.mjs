/**
 * The share button, before and after, on the real game page.
 *
 * Operator law 2026-08-25: "any UI change must be eyeballed by me befor after
 * and acked". So this shoots the utility row of a real built page from TWO
 * dist directories - the tree before the button existed and the tree after -
 * rather than drawing the button beside a screenshot of the row.
 *
 *   node scripts/repro/shot-share-on-the-row.mjs <beforeDist> <afterDist>
 *
 * 390x844 at 3x, cropped to the row, because a glyph judged at 1x in a
 * full-page screenshot is judged at the wrong size next to the wrong
 * neighbours - which is how the five candidates were shot too.
 */
import { readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const BEFORE = process.argv[2] ?? "dist-after";
const AFTER = process.argv[3] ?? "dist";
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

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const [label, dist] of [["before", BEFORE], ["after", AFTER]]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  await ctx.route("**/*", fulfilFromDisk(dist));
  const page = await ctx.newPage();
  await page.goto("http://ellaz.local/games/snake/", { waitUntil: "load" });
  await page.waitForSelector(".urow", { timeout: 10000 });
  // Past the runtime's reveal: every button in this row is emitted `hidden`
  // and unhidden by `PageApp`, so a shot taken at `load` is a picture of the
  // build's opinion rather than of what a player sees.
  await page.waitForTimeout(2500);
  const row = page.locator(".urow");
  const buttons = await page.locator(".urow .ubtn:visible").count();
  const share = await page.locator(".urow [data-share]:visible").count();
  console.log(`  ${label.padEnd(7)} ${dist.padEnd(12)} ${buttons} visible buttons, share ${share ? "PRESENT" : "absent"}`);
  await row.screenshot({ path: join(OUT, `share-row-${label}.png`) });
  await ctx.close();
}
await browser.close();
console.log(`\nwrote 2 shots to ${OUT}/`);
