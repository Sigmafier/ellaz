#!/usr/bin/env node
/**
 * WHICH ELEMENT MOVES, on the home page, and by how much.
 * ===========================================================================
 *
 * PageSpeed on 2026-09-07 reported CLS 0.200 on DESKTOP and 0.000 on MOBILE
 * for the same URL in the same session, and attributed the desktop shift to
 * the 42-tile game grid. The grid already draws an `aspect-ratio: 1/1`
 * placeholder for every game still loading, so its own height is right from
 * the first paint - which means what moved was the grid's POSITION, pushed
 * down by something arriving above it, and the element a shift is charged to
 * is the element that moved, not the one that caused it.
 *
 * So this reports the SOURCES of every shift, largest first, rather than one
 * number. A total tells you there is a problem; only attribution tells you
 * which line to change.
 *
 * WHY THE ARMS ARE INTERLEAVED. Desktop-then-mobile measures the arm order as
 * much as the arm: caches warm, the disk settles, the machine gets busy. This
 * repo has the receipt - on 2026-08-21 three arms with a change read 0.28 and
 * two without read 0.003, which was damning and false; interleaved, a control
 * arm read 0.283 and the shift turned out to predate the change entirely.
 * See .claude/rules/a-diagnostic-that-truncates-what-it-compares.md
 *
 *   npx vite preview --outDir dist --port 5176 --strictPort
 *   node scripts/repro/repro-home-cls-attribution.mjs
 */

import { chromium } from "playwright";

const argOf = (f) => (process.argv.indexOf(f) === -1 ? undefined : process.argv[process.argv.indexOf(f) + 1]);
const BASE = argOf("--base") ?? "http://localhost:5176";
const PATH = argOf("--path") ?? "/";
const ROUNDS = Number(argOf("--rounds") ?? 3);

/** Lighthouse's own two profiles, so the numbers are comparable to the report. */
const ARMS = {
  desktop: {
    viewport: { width: 1350, height: 940 },
    net: { downloadThroughput: (10 * 1024 * 1024) / 8, uploadThroughput: (10 * 1024 * 1024) / 8, latency: 40 },
    cpu: 1,
  },
  mobile: {
    viewport: { width: 390, height: 844 },
    net: { downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, latency: 150 },
    cpu: 4,
  },
};

/**
 * Record every shift with the SOURCE elements the browser blames, described
 * well enough to find in the source: tag, id, class, and the first few words
 * of text. `hadRecentInput` is excluded because a shift a person caused by
 * tapping is not a layout shift in the metric's sense.
 */
const INSTRUMENT = () => {
  window.__shifts = [];
  const describe = (n) => {
    if (!n || n.nodeType !== 1) return "<no node>";
    const id = n.id ? `#${n.id}` : "";
    const cls = typeof n.className === "string" && n.className ? `.${n.className.trim().split(/\s+/).join(".")}` : "";
    const txt = (n.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
    return `${n.tagName.toLowerCase()}${id}${cls}${txt ? ` "${txt}"` : ""}`;
  };
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      if (e.hadRecentInput) continue;
      window.__shifts.push({
        value: e.value,
        at: Math.round(e.startTime),
        sources: (e.sources ?? []).map((s) => describe(s.node)),
      });
    }
  }).observe({ type: "layout-shift", buffered: true });
};

const browser = await chromium.launch();

async function once(arm) {
  const cfg = ARMS[arm];
  const ctx = await browser.newContext({ viewport: cfg.viewport });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, ...cfg.net });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: cfg.cpu });
  await page.addInitScript(INSTRUMENT);
  await page.goto(`${BASE}${PATH}`, { waitUntil: "commit" });
  // Long enough to cover the lazy roster landing (~800 ms after mount) and the
  // font swap, both of which arrive after any "load" event.
  await page.waitForTimeout(4000);
  const shifts = await page.evaluate(() => window.__shifts);
  await ctx.close();
  return shifts;
}

const runs = { desktop: [], mobile: [] };
// INTERLEAVED. desktop, mobile, desktop, mobile, ...
for (let r = 0; r < ROUNDS; r++) {
  for (const arm of ["desktop", "mobile"]) runs[arm].push(await once(arm));
}
await browser.close();

const med = (xs) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0);

console.log(`\n${BASE}${PATH}   ${ROUNDS} rounds per arm, interleaved\n`);
let worst = 0;
for (const arm of ["desktop", "mobile"]) {
  const totals = runs[arm].map((s) => s.reduce((a, e) => a + e.value, 0));
  const m = med(totals);
  worst = Math.max(worst, m);
  console.log(`${arm.toUpperCase().padEnd(8)} CLS per run: ${totals.map((t) => t.toFixed(4)).join("  ")}   median ${m.toFixed(4)}`);

  // Attribution, summed across runs and divided by them, so one noisy run
  // cannot invent a culprit.
  const by = new Map();
  for (const run of runs[arm]) {
    for (const e of run) {
      for (const s of e.sources.length ? e.sources : ["<no source reported>"]) {
        by.set(s, (by.get(s) ?? 0) + e.value / runs[arm].length);
      }
    }
  }
  const top = [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (!top.length) console.log("         nothing moved.");
  for (const [el, v] of top) console.log(`         ${v.toFixed(4)}  ${el}`);
  console.log("");
}

// The decision rule, fixed BEFORE the measurement so the result cannot be
// rationalised: anything above this gets the reservation, anything below is a
// recorded no-op. 0.1 is the Core Web Vitals "good" threshold.
const GOOD = 0.1;
console.log(worst <= GOOD
  ? `OK  worst median ${worst.toFixed(4)} is within the ${GOOD} "good" threshold.`
  : `OVER  worst median ${worst.toFixed(4)} exceeds ${GOOD} - reserve the element named above.`);
process.exit(worst <= GOOD ? 0 : 1);
