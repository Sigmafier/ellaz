/**
 * ARE THE THREE HEADER CONTROLS ACTUALLY ROUND, ON THE BUILT PAGE?
 *
 * No source test can answer this. `header-pills-are-one-shape.test.ts` proves
 * all three read the SAME style object and that the object carries
 * `borderRadius: var(--radius-pill)` - and every one of those assertions was
 * green on 2026-08-25 while the operator was looking at a SQUARE globe.
 *
 * The reason is the shape of the picker rather than the shape of the pill: the
 * language button is wrapped in a positioning `<div>` for its popover, that
 * wrapper has `border-radius: 0`, and anything painted onto the wrapper
 * instead of the button lands as a hard-cornered box between two circles. It
 * happened in a MOCK first - a selector that walked the header group's
 * children caught the wrapper, not the button - which is exactly the reading
 * error this file exists to make impossible to ship.
 *
 * So this measures the RENDERED box of every control in the group and fails on
 * any that is not square-with-a-full-radius, at both the phone size and the
 * tablet size where `--hpill` changes value.
 *
 *   node scripts/repro/repro-header-pills-are-round.mjs [distDir]
 *
 * Exits 1 on a non-circle, on a radius under half the box, or on a height that
 * disagrees with its neighbours - the last one because a 48px chip in a row of
 * 40px pills is not a shape defect and still reads as one.
 */
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";
const T = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".svg":"image/svg+xml", ".png":"image/png", ".json":"application/json", ".webmanifest":"application/manifest+json", ".woff2":"font/woff2", ".txt":"text/plain", ".xml":"application/xml" };
const serve = (d) => async (r, q) => {
  let p = normalize(decodeURI(new URL(q.url()).pathname)).replace(/^(\.\.[/\\])+/, "");
  let f = join(d, p);
  if (existsSync(f) && !extname(f)) f = join(f, "index.html");
  if (!existsSync(f)) f = join(d, "404.html");
  if (!existsSync(f)) return r.fulfill({ status: 404, body: "" });
  r.fulfill({ status: 200, contentType: T[extname(f)] ?? "application/octet-stream", body: await readFile(f) });
};
const SEED = { v:1, coins:1240, stars:24, owned:[], placed:{}, games:{ snake:{ lastPlayedAt: Date.now() } } };
const bad = [];
let seen = 0;
const browser = await chromium.launch();
for (const w of [390, 720]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 844 } });
  await ctx.route("**/*", serve(process.argv[2] ?? "dist-P"));
  await ctx.addInitScript((p) => { try { localStorage.setItem("ellaz:profile:v1", JSON.stringify(p)); } catch {} }, SEED);
  const page = await ctx.newPage();
  await page.goto("http://ellaz.local/", { waitUntil: "load" });
  await page.waitForSelector("header", { timeout: 10000 });
  await page.waitForTimeout(900);
  const rows = await page.evaluate(() => {
    const h = document.querySelector("header");
    const g = h.lastElementChild;
    return [...g.children].map((el) => {
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 22),
        w: +b.width.toFixed(1), h: +b.height.toFixed(1),
        pad: cs.padding, radius: cs.borderRadius,
        minW: cs.minWidth, minH: cs.minHeight,
        // PAINTED, not merely present. The language picker's positioning
        // wrapper is a transparent `border-radius: 0` box and always has
        // been - that is not a defect, it is a defect WAITING, because
        // anything painted onto it instead of the button inside lands as a
        // hard-cornered slab between two circles. So the gate asks whether
        // this element draws anything, and only then demands a shape.
        painted:
          !/^(rgba\(0, 0, 0, 0\)|transparent)$/.test(cs.backgroundColor) ||
          cs.boxShadow !== "none" ||
          cs.borderStyle !== "none",
        kids: el.children.length,
      };
    });
  });
  console.log(`\n@${w}px`);
  // The WALLET is a pill by design - it holds a number, so it is wider than it
  // is tall. It is in the population for its HEIGHT only.
  const heights = new Set();
  for (const r of rows) {
    const wallet = /coins/.test(r.label);
    const round = Math.abs(r.w - r.h) < 2;
    // A radius under half the box is a rounded rectangle wearing a pill's
    // token - `999px` clamps to half, so anything less is a real corner.
    const px = parseFloat(r.radius) || 0;
    const full = px >= Math.min(r.w, r.h) / 2 - 0.5;
    heights.add(r.h);
    seen++;
    const verdict = !r.painted
      ? "unpainted"
      : wallet
        ? full ? "pill (ok)" : "SHARP"
        : round && full ? "circle" : "NOT ROUND";
    if (verdict === "SHARP" || verdict === "NOT ROUND") bad.push(`@${w} ${r.tag} "${r.label}" ${r.w}x${r.h} radius=${r.radius}`);
    console.log(`  ${r.tag.padEnd(6)} ${r.label.padEnd(24)} ${String(r.w).padStart(6)} x ${String(r.h).padEnd(6)} ${verdict.padEnd(10)} r=${r.radius} kids=${r.kids}`);
  }
  if (heights.size > 1) bad.push(`@${w} the row is ${heights.size} different heights: ${[...heights].join(", ")}`);
  await ctx.close();
}
await browser.close();
if (bad.length) {
  console.log("\nFAIL");
  for (const b of bad) console.log("  " + b);
  process.exit(1);
}
// POSITIVE CONTROL. Every assertion above passes vacuously over an empty group,
// and an empty group is exactly what a broken selector produces - so the gate
// asserts it SAW the four controls before it is allowed to say OK.
if (seen < 8) {
  console.log(`\nBLIND  only ${seen} controls measured across two widths, expected 8`);
  process.exit(1);
}
console.log(`\nOK  ${seen} controls measured; every painted one is round, full-radius, one height per row.`);
