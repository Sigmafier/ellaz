#!/usr/bin/env node
/**
 * Do the four new games actually PLAY in a browser?
 *
 *   node scripts/repro/repro-new-games-play.mjs [--base http://localhost:5180]
 *
 * WHY THIS EXISTS, and it is not "we added four games so we added a probe".
 *
 * Every gate in this repo reads `dist/` or a source tree. `logic.test.ts` drives
 * the rules in node, where there is no DOM and no frame clock at all - so a game
 * whose RULES are perfect and whose RENDERER never advances passes every one of
 * them. Fruit Drop is the case in point: its physics settles a dropped fruit on
 * the floor in 242 sub-steps when `step` is driven directly, and none of that
 * says the animation loop in front of it is running.
 *
 * It also exists because of how the first attempt to check this by hand went.
 * Driving a real Chrome through the extension reported the fruit frozen in
 * mid-air and every tap ignored, which reads exactly like a broken game. The
 * window was MINIMISED: `document.visibilityState` was "hidden", so the browser
 * had paused `requestAnimationFrame` entirely, and a plain three-line rAF
 * counter in the same tab also ticked zero. The measurement was wrong, not the
 * game - and nothing about the symptom said so. Hence a headless run, where the
 * page is always visible, plus the control below that proves it.
 *
 * THE CONTROL IS THE POINT. Before any game is opened, the harness asserts a
 * bare rAF loop actually ticks in this browser. Without it a hidden or throttled
 * context reports every rAF-driven game as broken, and a run that cannot tell
 * "the loop is stopped" from "the loop is paused" is not a run worth reading.
 */

import { chromium } from "playwright";

const BASE = argOf("--base") ?? "http://localhost:5180";
const HEAD = process.argv.includes("--headed");

function argOf(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

const results = [];
function record(game, ok, detail) {
  results.push({ game, ok, detail });
  console.log(`${ok ? "ok  " : "FAIL"} ${game.padEnd(9)} ${detail}`);
}

/** The stat row draws `label` over its value; this reads the value back. */
async function stat(page, label) {
  return page.evaluate((want) => {
    for (const cell of document.querySelectorAll(".gc-stat")) {
      const l = cell.querySelector(".gc-label")?.textContent?.trim();
      if (l === want) return cell.querySelector(".gc-value")?.textContent?.trim() ?? null;
    }
    return null;
  }, label);
}

async function open(page, id) {
  await page.goto(`${BASE}/games/${id}/`, { waitUntil: "domcontentloaded" });
  // A first visit always draws the consent bar, and it covers the bottom of the
  // screen - so a probe that leaves it up is measuring a state nobody is in.
  const decline = page.locator("button", { hasText: /No thanks|Decline/i }).first();
  if (await decline.count()) await decline.click().catch(() => {});
  await page.waitForSelector(".ellaz-play-surface", { timeout: 15_000, state: "attached" });
  await page.waitForTimeout(400);
}

const browser = await chromium.launch({ headless: !HEAD });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });

/* ------------------------------------------------------- the control, first */

await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
const ticks = await page.evaluate(async () => {
  let n = 0;
  const tick = () => { n++; if (n < 600) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  await new Promise((r) => setTimeout(r, 500));
  return { n, visibility: document.visibilityState };
});
if (ticks.n < 5) {
  console.error(
    `CONTROL FAILED: ${ticks.n} animation frames in 500ms, visibility=${ticks.visibility}.\n` +
      `This browser is not painting, so every rAF-driven game below would read as\n` +
      `frozen whether or not it is. Nothing here can be trusted - fix the harness.`,
  );
  await browser.close();
  process.exit(2);
}
console.log(`control: ${ticks.n} animation frames in 500ms (${ticks.visibility})\n`);

/* ------------------------------------------------------------------ the games */

// FLOW - lay a pipe from one dot of a pair and check the board took it.
{
  await open(page, "flow");
  const cells = page.locator('.ellaz-play-surface [role="gridcell"], .ellaz-play-surface button');
  const before = await stat(page, "Moves");
  // The dots are the only cells that start a route. Tap one, then walk from it.
  const dot = page.locator(".ellaz-play-surface button").filter({ has: page.locator("span") }).first();
  const box = await dot.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(150);
  const filled = await page.evaluate(() => {
    const surface = document.querySelector(".ellaz-play-surface");
    return [...surface.querySelectorAll("*")].filter((e) => {
      const bg = getComputedStyle(e).backgroundColor;
      return bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
    }).length;
  });
  record("flow", filled > 0 && (await cells.count()) >= 25,
    `${await cells.count()} cells, ${filled} painted, moves ${before} -> ${await stat(page, "Moves")}`);
}

// ARROWTAP - tap arrows until one leaves, and the clock must be running.
{
  await open(page, "arrowtap");
  const t0 = await stat(page, "Time");
  const left0 = Number(await stat(page, "Arrows"));
  const tiles = page.locator(".ellaz-play-surface button");
  let flew = false;
  const n = await tiles.count();
  for (let i = 0; i < n && !flew; i++) {
    await tiles.nth(i).click({ force: true }).catch(() => {});
    await page.waitForTimeout(80);
    if (Number(await stat(page, "Arrows")) < left0) flew = true;
  }
  await page.waitForTimeout(1100);
  const t1 = await stat(page, "Time");
  record("arrowtap", flew && t1 !== t0,
    `arrows ${left0} -> ${await stat(page, "Arrows")}, clock ${t0} -> ${t1}`);
}

// FRUIT - the one that needs a frame clock. Drop, then watch it FALL.
{
  await open(page, "fruit");
  // TWO elements carry this class on every game page - `GameChrome` puts it on
  // its own wrapper and the game puts it on its board - so the board is the
  // LAST one. A bare locator is a strict-mode violation, which is playwright
  // telling you the selector means two different things.
  const surface = page.locator(".ellaz-play-surface").last();
  const box = await surface.boundingBox();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
  const trail = await page.evaluate(async () => {
    const s = document.querySelector(".ellaz-play-surface");
    const y = () => {
      const spans = [...s.querySelectorAll("span")].filter((e) => (e.textContent || "").length <= 2);
      return spans.map((e) => Math.round(e.getBoundingClientRect().top));
    };
    const out = [];
    for (let i = 0; i < 12; i++) { out.push(y()); await new Promise((r) => setTimeout(r, 250)); }
    return { out, floor: Math.round(s.getBoundingClientRect().bottom) };
  });
  const lows = trail.out.map((r) => Math.max(...r, 0));
  const fell = Math.max(...lows) - Math.min(...lows);
  // CAME TO REST is asserted as "the last three samples agree", not as a
  // distance from the bottom of the box. A distance needs a number, and the
  // number would have to know the fruit's radius, the box padding and the
  // border - so it would be a constant tuned against today's tier that goes
  // stale the day a radius changes, reporting a working game as broken. Two
  // properties with no constant in them say the whole thing: it MOVED a long
  // way, and then it STOPPED.
  const tail = lows.slice(-3);
  const rested = Math.max(...tail) - Math.min(...tail) <= 2;
  record("fruit", fell > 40 && rested,
    `fell ${fell}px, then still for ${tail.length} samples (spread ${Math.max(...tail) - Math.min(...tail)}px)`);
}

// PARKING - select a car, move it, and the move counter must move with it.
{
  await open(page, "parking");
  const before = Number(await stat(page, "Moves"));
  const cells = page.locator(".ellaz-play-surface button");
  const n = await cells.count();
  let moved = false;
  for (let i = 0; i < n && !moved; i++) {
    await cells.nth(i).click({ force: true }).catch(() => {});
    await page.waitForTimeout(60);
    for (let j = 0; j < n && !moved; j++) {
      await cells.nth(j).click({ force: true }).catch(() => {});
      await page.waitForTimeout(40);
      if (Number(await stat(page, "Moves")) > before) moved = true;
    }
  }
  record("parking", moved, `moves ${before} -> ${await stat(page, "Moves")}`);
}

await browser.close();

const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} games play.`);
if (bad.length) {
  console.error(`FAIL  ${bad.map((b) => b.game).join(", ")}`);
  process.exit(1);
}
