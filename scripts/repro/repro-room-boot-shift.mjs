/**
 * The room's boot-time layout shift, and the probe that can actually see one.
 *
 * Measured 2026-08-22 on the live site: `/world/` at 390px read CLS **0.2713**,
 * which is POOR, while every game page read 0.003 to 0.010. Cause: before React
 * mounts, `#game-frame` is content-sized and EMPTY, so it is 0px tall, and the
 * room's box centres it - putting it at y=474 in a 740px box. The scene then
 * mounts 1297px tall and the frame snaps to y=104. A full-width block moving
 * 370px is the whole number.
 *
 * Fix: `body[data-page="world"] #game-frame:empty{min-height:100%}`.
 *
 * TWO THINGS THIS SCRIPT EXISTS TO STOP SOMEBODY REPEATING.
 *
 * 1. THE CONTROL MUST BE PLANTED ON SCREEN. The first version of this probe
 *    planted its 400px block before the `h1` and read 0.0084 - identical to the
 *    unplanted arm - so it reported the site healthy while being incapable of
 *    seeing anything. The stage fills the viewport, so the `h1` is BELOW THE
 *    FOLD, and CLS correctly ignores what is off screen. A control has to
 *    produce the OPPOSITE reading, not merely a passing one.
 *
 * 2. ARMS ARE INTERLEAVED. An earlier CLS reading in this repo ran three arms
 *    with a feature and then two without, got 0.28 against 0.003, and was
 *    completely wrong about the cause - interleaved, a control arm read 0.283
 *    too. A differential whose arms are not interleaved measures the arm ORDER
 *    as much as the arm.
 *
 * Needs `playwright` and a browser, which this repo does not install - run it
 * with NODE_PATH pointing at a tree that has them.
 *
 *   node scripts/repro/repro-room-boot-shift.mjs [url]
 *
 * Exits 1 if the room is over the 0.10 "good" bar, or if the control is blind.
 */
import { chromium } from "playwright";

const URL = process.argv[2] ?? "https://ellaz.fun/world/";
const GOOD = 0.1;
const OBS = `window.__cls=0;new PerformanceObserver(l=>{for(const e of l.getEntries()){if(!e.hadRecentInput)window.__cls+=e.value;}}).observe({type:"layout-shift",buffered:true});`;

const browser = await chromium.launch();

async function measure({ plant = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.addInitScript(OBS);
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  if (plant) {
    await page.waitForTimeout(1200);
    // At the very TOP of the body, which is the only place a planted shift is
    // guaranteed to be on screen. See note 1 above.
    await page.evaluate(() => {
      const d = document.createElement("div");
      d.style.height = "300px";
      document.body.prepend(d);
    });
  }
  // Wait on the CLOCK, never on networkidle: measured, networkidle lands about
  // 13s after the screen is already up, so anything timed against it is timing
  // the wrong thing.
  await page.waitForTimeout(6000);
  const out = await page.evaluate(() => {
    const f = document.querySelector("#game-frame")?.getBoundingClientRect();
    return { cls: window.__cls, frame: f ? `${Math.round(f.y)}/${Math.round(f.height)}` : "none" };
  });
  await ctx.close();
  return out;
}

const runs = [];
for (let i = 0; i < 3; i++) runs.push(await measure());
const control = await measure({ plant: true });
await browser.close();

const median = runs.map((r) => r.cls).sort((a, b) => a - b)[1];
for (const [i, r] of runs.entries()) console.log(`  run ${i + 1}  CLS ${r.cls.toFixed(4)}  frame ${r.frame}`);
console.log(`  median  ${median.toFixed(4)}  (good < ${GOOD})`);
console.log(`  positive control (300px on screen)  ${control.cls.toFixed(4)}`);

if (control.cls <= GOOD) {
  console.error("FAIL  the probe is BLIND - it did not see a planted 300px shift, so every number above is void.");
  process.exit(1);
}
if (median > GOOD) {
  console.error(`FAIL  ${URL} reads CLS ${median.toFixed(4)}, over the ${GOOD} "good" bar.`);
  process.exit(1);
}
console.log(`OK  ${URL} is inside the good bar, and the probe proved it can see a shift.`);
