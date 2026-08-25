/**
 * WHY THE HOME BAR IS TWO ROWS AT 390px, per element rather than in total.
 *
 * Operator, 2026-08-25: "i want this entirely to be in one line, so suggest how,
 * show just coins instead of stars maybe and suggest more options".
 *
 * A total width is not a finding - it says the row does not fit and nothing
 * about what to take out. This prints every child's own box, so an option can
 * be priced before it is drawn.
 *
 *   node scripts/repro/measure-home-bar.mjs <distDir>
 */
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const DIST = process.argv[2] ?? "dist-after";
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

// Two profiles, because the wrap is a function of the NUMBERS and a single
// sample cannot tell "this bar is too full" from "this player has big numbers".
const PROFILES = {
  "fresh (0 coins, 0 stars, no streak)": { v: 1, coins: 0, stars: 0, owned: [], placed: {}, games: {} },
  "real (1240 coins, 24 stars, streak)": {
    v: 1, coins: 1240, stars: 24, owned: [], placed: {},
    games: { snake: { lastPlayedAt: Date.now() }, memory: { lastPlayedAt: Date.now() - 86400000 } },
  },
  "heavy (99999 coins, 240 stars)": { v: 1, coins: 99999, stars: 240, owned: [], placed: {}, games: { snake: { lastPlayedAt: Date.now() } } },
};

const browser = await chromium.launch();
for (const [name, profile] of Object.entries(PROFILES)) {
  for (const w of [320, 360, 390, 430]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: 1 });
    await ctx.route("**/*", fulfilFromDisk(DIST));
    await ctx.addInitScript((p) => {
      try { localStorage.setItem("ellaz:profile:v1", JSON.stringify(p)); } catch { /* incognito */ }
    }, profile);
    const page = await ctx.newPage();
    await page.goto("http://ellaz.local/", { waitUntil: "load" });
    await page.waitForSelector("header", { timeout: 10000 });
    await page.waitForTimeout(350);

    const r = await page.evaluate(() => {
      const h = document.querySelector("header");
      if (!h) return null;
      const hb = h.getBoundingClientRect();
      // The trailing group is the last element child of the header.
      const group = h.lastElementChild;
      const kids = [...(group?.children ?? [])].map((el) => {
        const b = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          label: el.getAttribute("aria-label") || (el.textContent || "").trim().slice(0, 22) || el.className.slice(0, 18),
          w: Math.round(b.width),
          top: Math.round(b.top),
        };
      });
      // ROW COUNT, not height: distinct `top` values among the children is what
      // "one line" actually means, and it survives a padding change.
      const rows = new Set(kids.map((k) => k.top)).size;
      const lead = h.firstElementChild?.getBoundingClientRect();
      return {
        headerH: Math.round(hb.height),
        rows,
        lead: lead ? { w: Math.round(lead.width), text: (h.firstElementChild.textContent || "").trim().slice(0, 18) } : null,
        groupW: group ? Math.round(group.getBoundingClientRect().width) : 0,
        demand: group ? Math.round(group.scrollWidth) : 0,
        kids,
      };
    });
    if (r) {
      const flag = r.rows > 1 ? "  <-- TWO ROWS" : "";
      console.log(`\n${name} @ ${w}px   header ${r.headerH}px, ${r.rows} row(s)${flag}`);
      console.log(`  lead "${r.lead?.text}" ${r.lead?.w}px | group ${r.groupW}px (wants ${r.demand}px)`);
      for (const k of r.kids) console.log(`     ${String(k.w).padStart(4)}px  top=${k.top}  ${k.label}`);
    }
    await ctx.close();
  }
}
await browser.close();
