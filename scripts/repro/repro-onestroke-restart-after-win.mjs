#!/usr/bin/env node
/**
 * onestroke: after a WIN, restart clears the line and leaves the game won.
 *
 *   npx vite preview --port 5176 &
 *   node scripts/repro/repro-onestroke-restart-after-win.mjs --base http://localhost:5176
 *
 * Every other game with an input gate routes its restart through a `reset()`
 * that clears the gate. onestroke's is `onRestart={() => apply(clear(live.current))}`
 * - it rubs out the drawn line on the SAME board and never calls `setWon(false)`,
 * so `won` stays true, all three pointer handlers keep returning early, and the
 * clock stays stopped. The board looks fresh and answers nothing.
 *
 * WINNING IT is the whole cost of this probe, and it is why the board is read
 * out of the SESSION SNAPSHOT rather than off the screen: the snapshot carries
 * `size`, `blocked` and `start`, which is exactly enough to solve the stroke
 * offline with the same rule the game uses, and nothing has to be inferred from
 * a pixel.
 *
 * CONTROLS, both needed:
 *   - the win must be PRESENT before the click, or this says nothing about
 *     restarting from a win;
 *   - changing the DIFFICULTY (which routes through `reset`) must recover the
 *     same board, or the finding would be "onestroke is broken" rather than
 *     "the restart handler is the wrong one".
 */
import { chromium } from "playwright";

const arg = (f) => { const i = process.argv.indexOf(f); return i === -1 ? undefined : process.argv[i + 1]; };
const BASE = arg("--base") ?? "http://localhost:5176";
const HEAD = process.argv.includes("--headed");

/** The game's own adjacency: four-neighbour, no wrap, no walls. */
const neighbours = (c, size, blocked) => {
  const r = Math.floor(c / size), q = c % size, out = [];
  if (r > 0) out.push(c - size);
  if (r < size - 1) out.push(c + size);
  if (q > 0) out.push(c - 1);
  if (q < size - 1) out.push(c + 1);
  return out.filter((n) => !blocked.has(n));
};

/** A Hamiltonian path from `start` over every open square. Warnsdorff + backtracking. */
function solve(size, blockedArr, start) {
  const blocked = new Set(blockedArr);
  const need = size * size - blocked.size;
  const seen = new Set([start]);
  const path = [start];
  const walk = () => {
    if (path.length === need) return true;
    const here = path[path.length - 1];
    const next = neighbours(here, size, blocked)
      .filter((n) => !seen.has(n))
      .sort((a, b) =>
        neighbours(a, size, blocked).filter((n) => !seen.has(n)).length -
        neighbours(b, size, blocked).filter((n) => !seen.has(n)).length);
    for (const n of next) {
      seen.add(n); path.push(n);
      if (walk()) return true;
      seen.delete(n); path.pop();
    }
    return false;
  };
  return walk() ? path : null;
}

const browser = await chromium.launch({ headless: !HEAD });
const c = await browser.newContext({ viewport: { width: 420, height: 900 } });
const page = await c.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e).slice(0, 160)));

const stage = () => page.evaluate(() => document.querySelector(".ellaz-game-stage")?.innerText ?? "");
const WIN = /You win|🎉/;
let failures = 0;
const record = (ok, name, detail) => { if (!ok) failures++; console.log(`${ok ? "ok  " : "FAIL"} ${name.padEnd(34)} ${detail}`); };

await page.goto(`${BASE}/games/onestroke/`, { waitUntil: "domcontentloaded" });
await page.waitForSelector(".ellaz-play-surface", { timeout: 20000 });
await page.waitForTimeout(800);

// The board, out of the snapshot. One tap makes the state worth saving; the
// hook's own 5s interval is what writes it.
// Addressed by the board's own `data-cell`, never by child index: the grid
// also renders wall tiles and overlays, so nth-child is not the cell number.
const cell$ = (i) => page.locator(`.ellaz-play-surface [data-cell="${i}"]`);
// NOTHING is tapped first. The hook writes on its own 5s interval, and a
// stray tap would leave the line one square long - so the solved route would
// start from the wrong head and the board would refuse it half way.
await page.waitForTimeout(6500);
const raw = await page.evaluate(() => localStorage.getItem("ellaz:onestroke:session"));
if (!raw) { console.log("FAIL could not read the session snapshot - nothing to solve"); await browser.close(); process.exit(1); }
const snap = JSON.parse(raw);
const st = snap.s?.state ?? snap.state;
if (!st) { console.log("FAIL snapshot has no state:", raw.slice(0, 200)); await browser.close(); process.exit(1); }
const { size, blocked, start } = st;
record(true, "board read from snapshot", `size=${size} blocked=${blocked.length} start=${start}`);

const route = solve(size, blocked, start);
if (!route) { console.log("FAIL no stroke exists for this board - reroll"); await browser.close(); process.exit(1); }
record(true, "solved offline", `${route.length} squares`);

// Draw it: press on `start`, move through every square, lift.
const centre = async (i) => {
  const b = await cell$(i).boundingBox();
  return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null;
};
// TAPPED, not dragged. Every kids game here is tap-completable by rule
// (drag is never REQUIRED), and a synthetic drag loses the board's pointer
// tracking after the first square - so tapping is both the supported path and
// the one a harness can actually drive.
const drawn = async () => {
  const m = (await stage()).match(/Squares\n(\d+)\//);
  return m ? Number(m[1]) : -1;
};
let want = 1;
for (const cell of route.slice(1)) {
  want += 1;
  for (let try_ = 0; try_ < 4; try_++) {
    await cell$(cell).click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(70);
    if (await drawn() >= want) break;          // a dropped tap desyncs the route
  }
}
await page.waitForTimeout(900);

const wonText = await stage();
record(WIN.test(wonText), "the board is WON", JSON.stringify(wonText.slice(0, 90)));
if (!WIN.test(wonText)) { await browser.close(); process.exit(1); }

// The thing being reported.
await page.locator("[data-restart]").first().click();
await page.waitForTimeout(1200);
const after = await stage();
record(!WIN.test(after), "restart clears the win", `stillWon=${WIN.test(after)} | ${JSON.stringify(after.slice(0, 90))}`);

// Is the board inert? Tap one square and see whether the line grows.
//
// TAPPED, and against the NEW board. Two ways this assertion lied while it was
// being written: a synthetic drag is not tracked by the board after the first
// square (which is why the solve above taps), and after a restart `start` and
// `blocked` belong to a board that no longer exists - so it aimed at the old
// marked square and reported a correct game inert.
await page.waitForTimeout(6500);                       // the hook's own save cadence
const raw2 = await page.evaluate(() => localStorage.getItem("ellaz:onestroke:session"));
const st2 = raw2 ? (JSON.parse(raw2).s?.state ?? JSON.parse(raw2).state) : null;
if (!st2) {
  record(false, "could re-read the board", "no snapshot after restart");
} else {
  const before = await page.evaluate(() => document.querySelector(".ellaz-play-surface").innerHTML);
  const next = neighbours(st2.start, st2.size, new Set(st2.blocked))[0];
  await cell$(next).click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(400);
  const moved = (await page.evaluate(() => document.querySelector(".ellaz-play-surface").innerHTML)) !== before;
  record(moved, "the board answers a finger", `tapped ${next} next to start ${st2.start}; changed=${moved}`);
}

// CONTROL: the difficulty toggle routes through reset(), so it must recover.
await page.locator("[data-level], .gc-level button, .gc-level").first().click().catch(() => {});
await page.waitForTimeout(1200);
const rec = await stage();
record(!WIN.test(rec), "control: changing level recovers", JSON.stringify(rec.slice(0, 90)));

if (errs.length) console.log("  page errors:", errs[0]);
console.log(failures ? `\n${failures} failing assertion(s)` : "\nall good");
await browser.close();
process.exit(failures ? 1 : 0);
