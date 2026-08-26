#!/usr/bin/env node
/**
 * Do the four Wave 11 games RESPOND to a finger?
 *
 *   npx vite preview --port 5176 &
 *   node scripts/repro/repro-wave11-play.mjs --base http://localhost:5176
 *
 * `repro-preact-swap.mjs` proves all 42 games MOUNT. Mounting is not playing: a
 * board can render perfectly and ignore every touch, and `logic.test.ts` drives
 * the rules in node where there is no pointer at all - so nothing else in this
 * repo asks whether a tap does anything. That is the same gap
 * `repro-new-games-play.mjs` was written for one wave earlier.
 *
 * WHAT IT ASSERTS is deliberately shallow and deliberately not shallower: the
 * board's markup CHANGES under a real pointer sequence, at a real coordinate,
 * in a real browser. It does not judge the move - `logic.test.ts` does that,
 * with 268 tests across the four - it judges the wire between the finger and
 * the rules, which is the one thing those tests structurally cannot see.
 *
 * THE CONTROL IS THE rAF LOOP, inherited from `repro-new-games-play.mjs` for
 * the reason written there: a hidden or throttled tab pauses `requestAnimationFrame`
 * entirely, so every rAF-driven game reports frozen and the measurement is
 * wrong rather than the game. A run that cannot tell "stopped" from "paused" is
 * not worth reading.
 */

import { chromium } from "playwright";

const BASE = argOf("--base") ?? "http://localhost:5176";
const HEAD = process.argv.includes("--headed");
function argOf(f) {
  const i = process.argv.indexOf(f);
  return i === -1 ? undefined : process.argv[i + 1];
}

const GAMES = ["nonogram", "onestroke", "wordsearch", "untangle"];

let failures = 0;
const record = (ok, name, detail) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${name.padEnd(12)} ${detail}`);
};

const browser = await chromium.launch({ headless: !HEAD });

{
  const page = await browser.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const n = await page.evaluate(async () => {
    let n = 0;
    const tick = () => { n++; if (n < 600) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    await new Promise((r) => setTimeout(r, 500));
    return n;
  });
  record(n > 10, "rAF control", `${n} frames in 500ms`);
  await page.close();
  if (n <= 10) { await browser.close(); process.exit(1); }
}

for (const id of GAMES) {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  let ok = false;
  let detail = "";
  try {
    await page.goto(`${BASE}/games/${id}/`, { waitUntil: "domcontentloaded" });
    const decline = page.locator("button", { hasText: /No thanks|Decline/i }).first();
    if (await decline.count()) await decline.click().catch(() => {});
    const surface = page.locator(".ellaz-play-surface").first();
    await surface.waitFor({ timeout: 20_000 });
    await page.waitForTimeout(700);

    const before = await surface.innerHTML();
    const box = await surface.boundingBox();
    if (!box) throw new Error("the play surface has no box");

    // TAP THE GAME'S OWN CONTROLS, not a fraction of the box.
    //
    // The first version of this aimed at four points in the middle of the
    // surface and reported onestroke and untangle broken. They are not: a
    // one-stroke path may only be extended from its head, and untangle's dots
    // are 44px buttons on a ring with empty canvas between them - so both were
    // correctly refusing a tap on nothing, and the probe was measuring where it
    // aimed rather than what the game does.
    //
    // Every one of these four is built from real `<button>`s, which is the
    // platform's own tap-completable law showing up as something a probe can
    // hold on to. Walk them until the board changes.
    //
    // A pointer sequence rather than `click()`: they bind Pointer Events under
    // `touch-action: none`, so a synthetic mouse click is not the input they
    // listen for.
    const cells = surface.locator("button");
    const count = Math.min(await cells.count(), 24);
    if (count === 0) throw new Error("the play surface offers no button to tap");
    let taps = 0;
    for (let i = 0; i < count; i++) {
      const cb = await cells.nth(i).boundingBox();
      if (!cb) continue;
      const x = cb.x + cb.width / 2;
      const y = cb.y + cb.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + 2, y + 2);
      await page.mouse.up();
      await page.waitForTimeout(140);
      taps += 1;
      if ((await surface.innerHTML()) !== before) break;
    }

    const after = await surface.innerHTML();
    ok = after !== before && errors.length === 0;
    detail = ok
      ? `the board changed under a real pointer (${taps} tap${taps === 1 ? "" : "s"})`
      : `${after === before ? `NOTHING CHANGED after ${taps} taps on its own buttons` : ""}${
          errors.length ? ` ${errors.length} console error(s): ${errors[0].slice(0, 140)}` : ""
        }`;
  } catch (e) {
    detail = String(e).split("\n")[0];
  }
  record(ok, id, detail);
  await ctx.close();
}

await browser.close();
console.log(failures === 0 ? `\nOK  ${GAMES.length} games respond to a finger.` : `\nFAIL  ${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
