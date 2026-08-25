/**
 * SIX WAYS TO GET THE HOME BAR ONTO ONE LINE, each priced on the real page.
 *
 * Operator, 2026-08-25: "i want this entirely to be in one line, so suggest how,
 * show just coints instead of stars maybe and suggest more options".
 *
 * The bar is two rows on every phone and one row only at 430px and up. There
 * are TWO wraps stacked, which is why a single fix can look like it did nothing:
 *
 *   OUTER  the wordmark and the control group are siblings in a wrapping flex,
 *          so below ~430px the group drops to its own line. This is the one the
 *          operator is looking at - it is present even on a FRESH profile with
 *          nothing in the wallet.
 *   INNER  the group itself wraps at 320-360 once the numbers are real, so the
 *          moon (and on a heavy profile the globe) fall to a third row.
 *
 * Each option is applied to the LIVE PAGE and re-measured, so what is reported
 * is what the browser did rather than what the arithmetic predicted. Row count
 * comes from distinct `top` values, not from height - "one line" is a statement
 * about rows and survives a padding change.
 *
 *   node scripts/repro/repro-home-bar-one-line.mjs [distDir]
 *
 * Exits 1 if NO option puts every profile on one line at 320px, which would
 * mean the honest answer is "take a control out", not "tune it".
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

const PROFILES = {
  fresh: { v: 1, coins: 0, stars: 0, owned: [], placed: {}, games: {} },
  real: { v: 1, coins: 1240, stars: 24, owned: [], placed: {}, games: { snake: { lastPlayedAt: Date.now() } } },
  heavy: { v: 1, coins: 99999, stars: 240, owned: [], placed: {}, games: { snake: { lastPlayedAt: Date.now() } } },
};

/**
 * Applied IN THE PAGE. Each returns nothing; the caller re-measures.
 *
 * These are mock-ups, not the implementation - the point is to price a shape
 * before writing it, per the UX bookends rule. `coins-only` hides the star half
 * by index rather than by class, because the chip's spans carry no hooks and
 * inventing one here would be building the option instead of measuring it.
 */
/**
 * Applied IN THE PAGE, then re-measured. These are mock-ups to PRICE a shape
 * before writing it, per the UX bookends rule.
 *
 * The header is three children: the emoji, an identity block holding the h1,
 * and the control group. Measured at 390px (inner width 358):
 *
 *     emoji            32px
 *     identity block  310px   <- `flex: 1 1 auto`, and "Ellaz" is ~60px of it
 *     control group   325px
 *
 * So the identity block GROWS to 310 to hold a 60px word, and that quarter of
 * the bar is the thing nobody chose. Every option below is measured against
 * that rather than against a guess.
 *
 * An option is a LIST OF STEP NAMES, not a function, because `page.evaluate`
 * serialises what it is given and a closure over sibling helpers does not cross
 * - it arrives as `ReferenceError: shrinkIdentity is not defined`. The steps
 * are therefore declared inside the one function that runs in the page.
 */
const OPTIONS = {
  "0 as shipped": [],
  "A coins only": ["coins"],
  "B compact numbers 1240->1.2k": ["compact"],
  "C no emoji": ["emoji"],
  "D 40px pills": ["pills"],
  "E theme out of the bar": ["theme"],
  "F identity stops growing": ["identity"],
  "G identity + coins only": ["identity", "coins"],
  "H identity + coins + no emoji": ["identity", "coins", "emoji"],
  "I identity + compact + no emoji": ["identity", "compact", "emoji"],
  "J identity + coins + 40px pills": ["identity", "coins", "pills"],
  // The emoji STAYS in these - the operator was shown the bar with and without
  // it on 2026-08-24 and picked with. What goes instead is the WORD, on a phone
  // only, the same way the tagline beside it already goes: you are on the home
  // screen, so the one thing you do not need telling is which site this is.
  "K word hidden on a phone": ["word"],
  "L word hidden + coins only": ["word", "coins"],
  "M word hidden + coins + 40px pills": ["word", "coins", "pills"],
  "N word hidden + coins + compact": ["word", "coins", "compact"],
};

/** Runs in the page. `steps` is the option's list of names. */
const applySteps = (steps) => {
  const h = document.querySelector("header");
  const chip = document.querySelector('[aria-label*="coins"]');
  const step = {
    identity: () => {
      const id = h?.children[1];
      if (id) id.style.flex = "0 1 auto";
    },
    coins: () => {
      const parts = [...(chip?.children ?? [])];
      if (parts.length >= 2) parts[parts.length - 1].style.display = "none";
    },
    emoji: () => {
      if (h?.firstElementChild) h.firstElementChild.style.display = "none";
    },
    compact: () => {
      // The count is a TEXT NODE beside an <svg> inside the span, so an
      // element-only walk steps over it - which is why the first version of
      // this arm reported twelve cells of "no change" while doing nothing.
      const walk = document.createTreeWalker(chip ?? document.body, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        const v = Number((n.nodeValue || "").replace(/[^\d]/g, ""));
        if (v >= 1000) n.nodeValue = (v / 1000).toFixed(1).replace(/\.0$/, "") + "k";
      }
    },
    pills: () => document.documentElement.style.setProperty("--tap", "40px"),
    word: () => {
      // The h1 only, never the block - the block is what the tagline lives in,
      // and the h1 must stay in the document for a crawler and a screen reader
      // exactly as the tagline and the emitted screen name already do.
      const h1 = h?.querySelector("h1");
      if (h1) h1.style.display = "none";
      const id = h?.children[1];
      if (id) id.style.flex = "0 1 auto";
    },
    theme: () => {
      const g = h?.lastElementChild;
      if (g?.lastElementChild) g.lastElementChild.style.display = "none";
    },
  };
  for (const nme of steps) step[nme]?.();
};

/**
 * ROWS BY VERTICAL OVERLAP, not by distinct `top`.
 *
 * The header is `alignItems: center`, so a 24px h1 and a 48px pill sitting on
 * the SAME line have different `top` values. Counting distinct tops reported
 * "2 rows" for a header measuring 76px - one row's height - i.e. a counter that
 * could not express the thing it was built to count. Two boxes share a row when
 * they overlap vertically at all.
 *
 * It also skipped the header's MIDDLE child for a while - the `flex: 1 1 auto`
 * block holding the h1, the widest thing in the bar - so the diagnosis drawn
 * from it ("the wordmark is only 32px") was about the emoji alone.
 */
const measure = () => {
  const h = document.querySelector("header");
  if (!h) return null;
  const vis = (el) => el && getComputedStyle(el).display !== "none";
  const boxes = [];
  for (const el of h.children) {
    if (!vis(el)) continue;
    if (el === h.lastElementChild) {
      for (const k of el.children) if (vis(k)) boxes.push(k.getBoundingClientRect());
    } else boxes.push(el.getBoundingClientRect());
  }
  boxes.sort((a, b) => a.top - b.top);
  let rows = 0, edge = -Infinity;
  for (const b of boxes) {
    if (b.top >= edge) { rows += 1; edge = b.bottom; }
    else edge = Math.max(edge, b.bottom);
  }
  return { rows, h: Math.round(h.getBoundingClientRect().height) };
};

/**
 * THE CONTROL, and it exists because FOUR instrument faults in this one file
 * each read as a result: a skipped child, an arm that edited nothing, a
 * detector blind to CSS variables, and a row counter that could not represent
 * one row. None of them errored.
 *
 * It asks the counter a question whose answer is known, in BOTH directions, on
 * the real page: two boxes of different heights that share a line must count as
 * ONE row (the bug that was live), and a third too wide to join them must add a
 * SECOND. A control that can only pass is not a control.
 */
const control = () => {
  const h = document.querySelector("header");
  const probe = document.createElement("div");
  probe.style.cssText = "display:flex;flex-wrap:wrap;align-items:center;width:200px";
  probe.innerHTML =
    '<div style="width:80px;height:48px"></div><div style="width:80px;height:16px"></div>' +
    '<div style="width:180px;height:24px"></div>';
  h.appendChild(probe);
  const boxes = [...probe.children].map((el) => el.getBoundingClientRect());
  boxes.sort((a, b) => a.top - b.top);
  let rows = 0, edge = -Infinity;
  for (const b of boxes) {
    if (b.top >= edge) { rows += 1; edge = b.bottom; }
    else edge = Math.max(edge, b.bottom);
  }
  probe.remove();
  return rows;
};


const browser = await chromium.launch();

{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route("**/*", fulfilFromDisk(DIST));
  const page = await ctx.newPage();
  await page.goto("http://ellaz.local/", { waitUntil: "load" });
  await page.waitForSelector("header", { timeout: 10000 });
  const got = await page.evaluate(control);
  await ctx.close();
  if (got !== 2) {
    console.error(`CONTROL FAILED: the row counter says ${got} for a known two-row case. Nothing below is readable.`);
    process.exit(2);
  }
  console.log("control ok: two boxes of differing heights on one line count as ONE row; a third too wide adds a SECOND.\n");
}

const WIDTHS = [320, 360, 390, 430];
const results = {};

for (const [oname, steps] of Object.entries(OPTIONS)) {
  results[oname] = {};
  for (const [pname, profile] of Object.entries(PROFILES)) {
    for (const w of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 844 } });
      await ctx.route("**/*", fulfilFromDisk(DIST));
      await ctx.addInitScript((p) => {
        try { localStorage.setItem("ellaz:profile:v1", JSON.stringify(p)); } catch { /* incognito */ }
      }, profile);
      const page = await ctx.newPage();
      await page.goto("http://ellaz.local/", { waitUntil: "load" });
      await page.waitForSelector("header", { timeout: 10000 });
      // Past WalletChip's COUNT_MS (520) roll-up, or the counter re-renders over
      // an option that edits the number and the option reads as inert.
      await page.waitForTimeout(800);
      // GEOMETRY, not markup. `--tap: 40px` changes no HTML at all, so an
      // innerHTML comparison called a working arm "unmeasured" - the detector
      // being blind to the very thing the arm does.
      const fingerprint = () => page.evaluate(() => {
        const h = document.querySelector("header");
        return [...h.querySelectorAll("*")].map((el) => {
          const b = el.getBoundingClientRect();
          return `${Math.round(b.x)},${Math.round(b.y)},${Math.round(b.width)}`;
        }).join("|") + "::" + h.innerHTML.length;
      });
      const before = await fingerprint();
      await page.evaluate(applySteps, steps);
      await page.waitForTimeout(150);
      const after = await fingerprint();
      const moved = before !== after;
      results[oname][`${pname}@${w}`] = { ...(await page.evaluate(measure)), moved };
      await ctx.close();
    }
  }
}
await browser.close();

const cells = Object.keys(results["0 as shipped"]);
const pad = (s, n) => String(s).padEnd(n);
console.log("\nROWS in the home header (1 = one line). " + DIST + "\n");
console.log(pad("option", 34) + cells.map((c) => pad(c, 12)).join(""));
console.log("-".repeat(34 + cells.length * 12));
let anyClean = false;
const inert = [];
for (const [oname, row] of Object.entries(results)) {
  const line = cells.map((c) => pad(row[c] ? `${row[c].rows} (${row[c].h}px)` : "?", 12)).join("");
  const clean = cells.every((c) => row[c]?.rows === 1);
  if (clean && oname !== "0 as shipped") anyClean = true;
  // An option that never altered the DOM has NOT been shown to have no effect -
  // it has not been tested. Those two read identically in a results table, which
  // is how the compact-numbers arm reported twelve cells of "no change" while
  // the wallet's roll-up animation was quietly overwriting it.
  const touched = cells.filter((c) => row[c]?.moved).length;
  if (oname !== "0 as shipped" && touched === 0) inert.push(oname);
  console.log(pad(oname + (clean ? "  <= ONE LINE" : ""), 34) + line);
}
if (inert.length) {
  console.log("\nUNMEASURED - these never changed the DOM, so their row counts say nothing:");
  for (const o of inert) console.log("   " + o);
}
console.log("");
if (!anyClean) {
  console.log("NO option holds one line across every profile at 320px.");
  process.exit(1);
}
console.log("At least one option holds one line everywhere.");
