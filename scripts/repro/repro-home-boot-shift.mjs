#!/usr/bin/env node
/**
 * The home page's boot-time layout shift, and the flash a person can see.
 *
 *   node scripts/repro/repro-home-boot-shift.mjs [--base http://localhost:5176]
 *
 * WHAT WAS MEASURED, 2026-08-26, 390x844, CPU 4x, interleaved arms on ONE tree
 * with only the react/preact alias reverted for the second:
 *
 *     arm                     CLS      of which `ellaz-scroll`   document on screen
 *     react (before)         0.685            0.000                 2534 ms
 *     preact (shipped)       1.709            1.000                  504 ms
 *     preact + the rule      0.690            0.000                  504 ms
 *
 * `/world/` was measured and fixed at 0.2713 on 2026-08-22 and every game page
 * reads 0.003 to 0.010. NOTHING had ever measured `/` - the site's canonical
 * entry, its `x-default` target and its most-linked page - and it was the worst
 * page on the site by a factor of two.
 *
 * TWO DEFECTS, unrelated. Do not conflate them:
 *
 *  1. `ellaz-scroll` 0 -> 844px, worth exactly 1.000, and the one this GATES.
 *     `#home-doc` is the emitted document that exists because no AI crawler
 *     runs JavaScript; `main.tsx` removes it on the next animation frame. That
 *     was right while React 18 committed asynchronously and is a frame too late
 *     under `preact/compat`, whose `render()` returns with the DOM already
 *     committed - so one painted frame carries BOTH, the whole app laid out
 *     underneath the whole document. Closed in `global.css` by
 *     `body.app-shell:has(#root:not(:empty)) #home-doc{display:none}`, which
 *     cannot be wrong about WHEN a runtime committed the way a timer can.
 *
 *  2. ~0.683 when the lazy roster lands: the daily card appears above the
 *     category rail and pushes 100px of page down. Present on BOTH arms, so it
 *     predates the swap. REPORTED, never gated - see
 *     `.claude/rules/a-gate-that-reds-on-day-one-teaches-you-to-ignore-it.md`.
 *     The fix is the room's: reserve the slot's height while it is empty.
 *
 * THE CONTROL IS A SECOND BUILD, and finding that out cost a wrong one. The
 * obvious control - inject `display:block!important` at runtime to put the
 * pre-fix behaviour back - reads 0.689, i.e. HEALTHY, on the very build that
 * measures 1.709 without the rule. A stylesheet added after the navigation
 * commits does not reproduce a stylesheet that was never there: the layout tree
 * has already been built. So a control that cannot fail was reporting FAIL on a
 * correct page, which is the worst of both. Pass `--control-base` at a build
 * whose `global.css` lacks the rule and it is required to shift; without it the
 * run says so out loud rather than pretending.
 *
 *   python3 - <<'X'  # cut the rule, build the arm, put it back
 *   ...  npx vite build --outDir dist-nofix  ...
 *   X
 *   npx vite preview --outDir dist-nofix --port 5177 --strictPort
 *
 * Measured that way, 10 interleaved runs per arm, CPU 4x, ONE tree and ONE
 * variable: with the rule 0.685 median and 0/10 runs shifting `ellaz-scroll`;
 * without it 1.709 and 9/10.
 *
 * The other two controls prove both halves of the hand-off are observable at
 * all: with the entry script blocked the document must STAY (or the BEFORE
 * picture is of something else), and with it allowed the document must GO (or
 * this cannot see a removal).
 *
 * Needs playwright, a chromium, and a server for dist/:
 *   npx vite preview --outDir dist --port 5176 --strictPort
 */

import { chromium } from "playwright";

const argOf = (f) => (process.argv.indexOf(f) === -1 ? undefined : process.argv[process.argv.indexOf(f) + 1]);
const BASE = argOf("--base") ?? "http://localhost:5176";
const RUNS = Number(argOf("--runs") ?? 4);
const SHOT = argOf("--shots");
const CONTROL_BASE = argOf("--control-base");

const VIEWPORT = { width: 390, height: 844 };
const SLOW_4G = { downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8, latency: 400 };

/** FCP, the mount, the frame the document leaves, and every shift with its source. */
const INSTRUMENT = () => {
  window.__b = { paint: null, mounted: null, gone: null, cls: 0, scroll: 0 };
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) if (e.name === "first-contentful-paint") window.__b.paint ??= e.startTime;
  }).observe({ type: "paint", buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      if (e.hadRecentInput) continue;
      window.__b.cls += e.value;
      // Attribute to the app's scroll container BY CLASS. `sources[].node` is
      // often already detached by the time this reads it, and the total alone
      // cannot tell the two defects above apart.
      for (const s of e.sources || []) {
        const c = s.node && typeof s.node.className === "string" ? s.node.className : "";
        if (c.includes("ellaz-scroll")) window.__b.scroll += e.value;
      }
    }
  }).observe({ type: "layout-shift", buffered: true });
  const tick = () => {
    const root = document.getElementById("root");
    if (window.__b.mounted === null && root && root.children.length) window.__b.mounted = performance.now();
    if (window.__b.gone === null && !document.getElementById("home-doc")) window.__b.gone = performance.now();
    if (window.__b.gone === null) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const browser = await chromium.launch();

async function load({ slow = false, blockEntry = false, shot, base = BASE } = {}) {
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();
  await page.addInitScript(INSTRUMENT);
  if (blockEntry) await page.route(/\/assets\/index-.*\.js/, (r) => r.abort());
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: slow ? 4 : 1 });
  if (slow) await cdp.send("Network.emulateNetworkConditions", { offline: false, ...SLOW_4G });
  await page.goto(`${base}/`, { waitUntil: blockEntry ? "domcontentloaded" : "commit" });
  if (!blockEntry)
    await page.waitForFunction(() => window.__b.gone !== null, null, { timeout: 40_000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const present = await page.evaluate(() => !!document.getElementById("home-doc"));
  if (shot) await page.screenshot({ path: shot });
  const b = await page.evaluate(() => window.__b);
  await ctx.close();
  return { ...b, present, flash: b.gone === null ? null : Math.round(b.gone - b.paint) };
}

const rows = [];
for (let i = 0; i < RUNS; i++)
  // Interleave the speeds and rotate the order: a differential whose arms run
  // in blocks measures the arm ORDER as much as the arm.
  for (const slow of i % 2 ? [true, false] : [false, true])
    rows.push({ arm: slow ? "slow-4g" : "fast", ...(await load({ slow })) });

const med = (a, f) => {
  const s = a.map(f).filter((v) => v !== null).sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

console.log(`\n${BASE}/  -  ${RUNS} interleaved runs per arm at ${VIEWPORT.width}x${VIEWPORT.height}\n`);
console.log("arm       median CLS   of which ellaz-scroll   document on screen for");
for (const name of ["fast", "slow-4g"]) {
  const a = rows.filter((r) => r.arm === name);
  console.log(
    `${name.padEnd(9)} ${med(a, (r) => r.cls).toFixed(3).padStart(10)}   ` +
      `${med(a, (r) => r.scroll).toFixed(3).padStart(20)}   ${String(med(a, (r) => r.flash)).padStart(6)} ms`,
  );
}

const blocked = await load({ blockEntry: true, shot: SHOT ? `${SHOT}/home-boot-BEFORE.png` : undefined });
const allowed = await load({ shot: SHOT ? `${SHOT}/home-boot-AFTER.png` : undefined });
const controls = [
  ["entry script blocked -> the document STAYS", blocked.present],
  ["entry script allowed -> the document GOES", !allowed.present],
];
if (CONTROL_BASE) {
  const arm = [];
  for (let i = 0; i < RUNS; i++) arm.push(await load({ base: CONTROL_BASE }));
  const shifted = arm.filter((r) => r.scroll > 0.01).length;
  controls.push([`a build WITHOUT the rule shifts (${shifted}/${arm.length} runs)`, shifted > arm.length / 2]);
}
await browser.close();

console.log("");
for (const [what, ok] of controls) console.log(`${ok ? "ok  " : "FAIL"} control: ${what}`);
if (!CONTROL_BASE)
  console.log(
    `NOT RUN control: a build without the rule must shift. Pass --control-base <url>;\n` +
      `                 the header says how to make one. Without it this run cannot\n` +
      `                 prove it would notice the defect coming back.`,
  );
if (controls.some(([, ok]) => !ok)) {
  console.error(`\nCONTROLS FAILED - this cannot see the defect it exists for. Fix the harness, not the page.`);
  process.exit(2);
}

const scroll = Math.max(...rows.map((r) => r.scroll));
const total = Math.max(...rows.map((r) => r.cls));
console.log(
  `\nThe lazy roster still costs about ${(total - scroll).toFixed(3)} when the daily card lands and pushes the\n` +
    `page down ~100px. REPORTED, not gated: it is on both runtimes and predates the swap.`,
);
if (scroll > 0.01) {
  console.error(`\nFAIL  the document/app hand-off costs ${scroll.toFixed(3)} CLS on the site's canonical entry.`);
  process.exit(1);
}
console.log(`\nOK  the hand-off costs ${scroll.toFixed(3)} - the document leaves in the reflow the app arrives in.`);
