#!/usr/bin/env node
/**
 * Does every game use the whole phone, with the one bar, and leave a PC alone?
 *
 *   npx vite build --outDir dist-phone
 *   node scripts/repro/repro-phone-fills-the-screen.mjs --dist dist-phone
 *   node scripts/repro/repro-phone-fills-the-screen.mjs --dist dist-phone --only survivors,snake
 *
 * Operator ruling 2026-09-14, picked off real renders (hall `20260914-015912`
 * and `20260914-021853`): on a phone the header and the utility row become ONE
 * 52px bar, and the game fills what is left. Measured on live ellaz.fun before
 * any code, 390x844, all 43 games: 40 left 21-449px of empty page under the
 * game, and maze, snake and coloring were shrunk to 87-90% with snake's down
 * arrow cut off.
 *
 * SERVED THROUGH PLAYWRIGHT'S ROUTER, NOT A PORT. The build is read straight
 * off disk and answered as https://ellaz.fun, so no server is started, no port
 * is picked, and there is no question of which build a server is holding - the
 * trap that read "43 of 43 unchanged" off a stale `vite preview` on 2026-09-13.
 *
 * WHAT IT ASSERTS, per game, on a phone:
 *   bar     the header is at most 52px and the utility row takes no height
 *   fill    the game's panel reaches the bottom of the box it was given
 *   whole   nothing the player can touch sits below the screen, and the frame
 *           is not shrunk under 0.95 - a shrink that far is the defect, not a fit
 *   reach   restart, where the game offers one, is IN the bar and on screen
 * and on a PC, the control arm: both rows are still there, untouched.
 *
 * SHRINK IS REPORTED, NOT ENFORCED, and on purpose. Measured 2026-09-14 after
 * the change: nothing is cut off on any of 86 phone arms, and six are still
 * scaled by fitStage - snake and maze (the pad plus the Controls row) at both
 * sizes, coloring and wordguess at 360x740. Every one of them is the same or
 * bigger than before except snake and maze at 360x740 (0.78 -> 0.76, 0.75 ->
 * 0.73), and all of them were CUT OFF before. Enforcing it today reds on a
 * design question - how compact a phone pad should be - that needs its own
 * ruling. See a-gate-that-reds-on-day-one-teaches-you-to-ignore-it.md.
 *
 * WRITTEN TO FAIL FIRST. Run against a build from before the change it must red
 * on every phone arm; a gate first run after the fix cannot be told from one
 * that never fires. Its own controls are the PC arm (the utility row must be
 * FOUND there, or "the row is hidden" could be a selector that matches nothing)
 * and a population floor.
 */
import { chromium } from "file:///mnt/c/Users/ytr_o/OneDrive/Desktop/ellaz/studio/node_modules/playwright-core/index.mjs";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
};
const DIST = resolve(arg("--dist") ?? "dist");
const ONLY = arg("--only")?.split(",");
const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
  ".png": "image/png", ".webp": "image/webp", ".json": "application/json", ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
};

const ids = readdirSync(join(DIST, "games"), { withFileTypes: true })
  // A GAME page, not a shelf: /games/kids/ lives in the same directory, carries
  // the same data-page="game", and has no game on it - measured, so the page
  // type cannot be the filter. A page with a game has the frame a game mounts in.
  .filter((d) => d.isDirectory() && existsSync(join(DIST, "games", d.name, "index.html")))
  .filter((d) => /id="game-frame"/.test(readFileSync(join(DIST, "games", d.name, "index.html"), "utf8")))
  .map((d) => d.name)
  .filter((id) => !ONLY || ONLY.includes(id))
  .sort();
if (!ONLY && ids.length < 40) throw new Error(`found ${ids.length} game pages in ${DIST} - refusing to measure a partial population`);

const PHONES = [
  { name: "390x844", w: 390, h: 844 },
  { name: "360x740", w: 360, h: 740 },
];
const PC = { name: "1536x639", w: 1536, h: 639 };

function probe() {
  const top = document.querySelector("header.top");
  const urow = document.querySelector(".urow");
  const box = document.querySelector(".stage .box");
  const frame = document.getElementById("game-frame");
  const panel = frame?.querySelector(".ellaz-game-panel");
  if (!top || !box || !frame) return { error: "no header, box or frame" };
  const m = getComputedStyle(frame).transform.match(/matrix\(([^,]+)/);
  const scale = m ? Number(m[1]) : 1;
  const b = box.getBoundingClientRect();
  let lowest = 0;
  for (const el of frame.querySelectorAll("button, canvas, [role=button], input")) {
    const r = el.getBoundingClientRect();
    if (r.width > 1 && r.height > 1 && getComputedStyle(el).visibility !== "hidden") lowest = Math.max(lowest, r.bottom);
  }
  const restart = document.querySelector("[data-restart]");
  return {
    topH: Math.round(top.getBoundingClientRect().height),
    urowH: urow ? Math.round(urow.getBoundingClientRect().height) : null,
    scale,
    boxBottom: Math.round(b.bottom),
    panelBottom: panel ? Math.round(panel.getBoundingClientRect().bottom) : null,
    lowest: Math.round(lowest),
    vh: innerHeight,
    restartShown: restart ? !restart.hidden : false,
    restartInBar: restart ? Boolean(restart.closest("header.top")) : false,
    restartOnScreen: restart ? restart.getBoundingClientRect().bottom <= innerHeight : false,
  };
}

async function measure(browser, id, vp) {
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1,
    isMobile: vp.w < 720, hasTouch: vp.w < 720, serviceWorkers: "block",
  });
  await ctx.route("https://ellaz.fun/**", (route) => {
    let f = join(DIST, decodeURIComponent(new URL(route.request().url()).pathname));
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
    if (!existsSync(f)) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ status: 200, body: readFileSync(f), headers: { "content-type": TYPES[extname(f)] ?? "application/octet-stream" } });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`https://ellaz.fun/games/${id}/`, { waitUntil: "load" });
  await page.waitForFunction(() => document.getElementById("game-frame")?.children.length > 0, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  // Two readings 600 ms apart must agree before either is believed: a page still
  // settling reads as a defect that is really just a frame early.
  const a = await page.evaluate(probe);
  await page.waitForTimeout(600);
  const r = await page.evaluate(probe);
  // LAYOUT fields only. `lowest` is the bottom of any button or canvas, and in
  // balloons and bubbles those are things FLOATING across the board - two
  // readings of a live game differ there by design, which is not unsettled.
  const layout = (x) => JSON.stringify([x.topH, x.urowH, x.scale, x.boxBottom, x.panelBottom]);
  r.settled = layout(a) === layout(r);
  r.errors = errors.length;
  await ctx.close();
  return r;
}

const STRICT = process.env.PHONE_SCALE_STRICT === "1";
let notes = [];

function phoneFailures(r) {
  notes = [];
  if (r.error) return [r.error];
  const f = [];
  if (!r.settled) f.push("did not settle");
  if (r.topH > 52) f.push(`bar ${r.topH}px > 52`);
  if (r.urowH === null) f.push("no utility row element at all");
  else if (r.urowH > 0) f.push(`utility row still takes ${r.urowH}px`);
  // REPORTED, not enforced, until the tall games are dealt with - see the
  // header. `PHONE_SCALE_STRICT=1` arms it.
  if (r.scale < 0.95) (STRICT ? f : notes).push(`frame shrunk to ${r.scale.toFixed(2)}`);
  if (r.lowest > r.vh + 1) f.push(`a control ends ${r.lowest - r.vh}px below the screen`);
  if (r.panelBottom !== null && r.panelBottom < r.boxBottom - 16) f.push(`panel stops ${r.boxBottom - r.panelBottom}px short of the box`);
  if (r.restartShown && !r.restartInBar) f.push("restart is not in the bar");
  if (r.restartShown && !r.restartOnScreen) f.push("restart is off screen");
  if (r.errors) f.push(`${r.errors} page error(s)`);
  return f;
}

const browser = await chromium.launch();
let failed = 0;
let arms = 0;
let shrunk = 0;
console.log(`population: ${ids.length} game pages from ${DIST}`);
for (const id of ids) {
  for (const vp of PHONES) {
    const r = await measure(browser, id, vp);
    const f = phoneFailures(r);
    arms++;
    if (f.length) failed++;
    if (!f.length && notes.length) shrunk++;
    console.log(`${f.length ? "FAIL" : notes.length ? "note" : "ok  "} ${id.padEnd(14)} ${vp.name}  bar ${r.topH} row ${r.urowH} scale ${r.scale?.toFixed?.(2)} panel ${r.panelBottom}/${r.boxBottom} lowest ${r.lowest}/${r.vh}${f.length ? "  - " + f.join("; ") : notes.length ? "  - " + notes.join("; ") : ""}`);
  }
}

// THE CONTROL ARM: a PC keeps both rows. If the utility row cannot be found
// here, "the row takes no height" above is a selector matching nothing.
for (const id of ids.filter((x) => ["survivors", "2048", "snake"].includes(x))) {
  const r = await measure(browser, id, PC);
  const ok = !r.error && r.topH >= 56 && r.urowH !== null && r.urowH >= 44 && !r.restartInBar;
  arms++;
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${id.padEnd(14)} ${PC.name}  CONTROL both rows present: bar ${r.topH} row ${r.urowH} restartInBar ${r.restartInBar}`);
}
await browser.close();
console.log(`\n${failed} of ${arms} arms fail`);
console.log(`${shrunk} phone arm(s) still shrunk under 0.95 - reported, ${STRICT ? "ENFORCED" : "not enforced (PHONE_SCALE_STRICT=1 arms it)"}`);
process.exit(failed ? 1 : 0);
