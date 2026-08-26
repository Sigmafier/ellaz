#!/usr/bin/env node
/**
 * Does the Preact build behave like the React build, on every game?
 *
 *   node scripts/repro/repro-arm-parity.mjs [--preact 5176] [--react 5177]
 *
 * WHY THIS EXISTS. The Preact swap is a `resolve.alias` and nothing else, so it
 * is invisible to every gate in this repo: `vitest.config.ts` carries its own
 * resolve block with no alias, its environment is `node`, and its include is
 * `*.test.ts` - so all 4,303 tests render no component and pass whether the swap
 * works or not. The two ways it fails do not throw either. `useSyncExternalStore`
 * is what re-renders the grid when the lazy metadata and card art land, so a
 * subtle difference leaves cards blank forever with a clean console; and
 * `reactHost.tsx` tears down a nested root inside the portal's own tree, which is
 * a different code path in preact.
 *
 * THE CONTROL IS THE WHOLE DESIGN, and it is a two-pass one.
 *
 * Most games here are RANDOM - a sudoku board, a word search, a fruit drop. So a
 * cross-arm pixel difference is the EXPECTED reading, not a finding, and a naive
 * run reports 30-odd "failures" that are all the deal changing. Pass 2 therefore
 * re-shoots the SAME arm a second time for exactly the games that differed: if an
 * arm differs from ITSELF by a comparable amount in a comparable region, the
 * difference is the content and not the engine. A harness that cannot tell those
 * two apart is not a harness, it is a random number generator with opinions.
 *
 * Behaviour is judged separately from pixels, because a game can render
 * identically and be dead: `mounted`, `reacts` (does the board change when its
 * own buttons are pressed), console errors, uncaught exceptions and failed
 * requests are compared as facts, and those ARE expected to match exactly.
 *
 * KNOWN LIMIT, so a flag on it is read correctly. `reacts` presses up to eight of
 * the board's own buttons and asks whether the markup changed. A game whose move
 * takes TWO presses that must agree - `parking`, where you pick a car and then
 * pick where it goes - answers by luck of the deal, so its `reacts` flips between
 * runs on ONE build. It was flagged as a behaviour difference in one run of four
 * and matched in the other three. A single-run flag on a two-step game is the
 * harness, not the engine; re-run it before believing it.
 */

import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";

const argOf = (f, d) => { const i = process.argv.indexOf(f); return i === -1 ? d : process.argv[i + 1]; };
const PORTS = { preact: argOf("--preact", "5176"), react: argOf("--react", "5177") };
const OUT = argOf("--out", "/tmp/arm-parity");
const ONLY = argOf("--only", null);
const CONTROL = process.argv.includes("--control");

const GAMES = (() => {
  const j = JSON.parse(readFileSync(new URL("../../dist/pages.json", import.meta.url), "utf8"));
  const rows = Array.isArray(j) ? j : j.pages;
  return [...new Set(rows.filter((r) => r.kind === "game" && r.locale === "en").map((r) => r.id))];
})();
// --control drives the verdict to RED with no server setup at all: a game id
// nothing is called cannot mount in either arm, which is the same shape as a
// dead port, a wrong path or a torn build. It is the one case whose summary was
// otherwise ALL ZEROS while nothing had loaded, so it is the one worth being
// able to re-run. The other two controls need a second artifact and so are
// recipes rather than a flag:
//
//   one arm is not the site       --only memory --react 8772
//   a real rendering difference   append `.ellaz-play-surface{transform:translateY(14px)}`
//                                 to the react arm's shell-*.css, then --only memory
//                                 (a deterministic game, so self-difference is 0 and
//                                  the classifier cannot excuse it as the deal)
const LIST = CONTROL ? ["__no_such_game__"] : ONLY ? [ONLY] : GAMES;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

/** One game, one arm: screenshot + the facts that must match exactly. */
async function visit(arm, id, tag) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  const page = await ctx.newPage();
  const errors = [], failed = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 120)); });
  page.on("pageerror", (e) => errors.push("THROWN " + String(e).slice(0, 120)));
  page.on("requestfailed", (r) => failed.push(new URL(r.url()).pathname));

  let mounted = false, reacts = false;
  try {
    await page.goto(`http://127.0.0.1:${PORTS[arm]}/games/${id}/`, { waitUntil: "domcontentloaded", timeout: 20000 });
    const d = page.locator("button", { hasText: /No thanks|Decline/i }).first();
    if (await d.count()) await d.click({ timeout: 2000 }).catch(() => {});
    await page.waitForSelector(".ellaz-play-surface", { timeout: 15000, state: "attached" });
    mounted = true;
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/${id}.${arm}${tag}.png` });

    // Does it ANSWER a finger? Press the board's own buttons - aiming at a
    // fraction of the box called two games broken once, because both were
    // correctly refusing a tap on empty canvas.
    const before = await page.evaluate(() => document.querySelector(".ellaz-play-surface")?.innerHTML.length ?? 0);
    const btns = page.locator(".ellaz-play-surface button");
    const n = Math.min(await btns.count(), 8);
    for (let i = 0; i < n && !reacts; i++) {
      await btns.nth(i).click({ force: true, timeout: 1500 }).catch(() => {});
      await page.waitForTimeout(140);
      const after = await page.evaluate(() => document.querySelector(".ellaz-play-surface")?.innerHTML.length ?? 0);
      if (after !== before) reacts = true;
    }
    if (!reacts && n === 0) {
      const box = await page.locator(".ellaz-play-surface").last().boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(400);
        const after = await page.evaluate(() => document.querySelector(".ellaz-play-surface")?.innerHTML.length ?? 0);
        reacts = after !== before;
      }
    }
  } catch (e) {
    errors.push("HARNESS " + String(e.message).slice(0, 90));
  }
  await ctx.close();
  return { mounted, reacts, errors, failed };
}

/** Pixel difference between two shots: how much, and where. */
async function diff(a, b) {
  const p = await browser.newPage();
  const enc = (f) => "data:image/png;base64," + readFileSync(f).toString("base64");
  const r = await p.evaluate(async ([x, y]) => {
    const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = s; });
    const ia = await load(x), ib = await load(y);
    const w = Math.min(ia.width, ib.width), h = Math.min(ia.height, ib.height);
    const px = (img) => { const c = document.createElement("canvas"); c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0); return c.getContext("2d").getImageData(0, 0, w, h).data; };
    const da = px(ia), db = px(ib);
    let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const i = (yy * w + xx) * 4;
      if (Math.abs(da[i] - db[i]) + Math.abs(da[i+1] - db[i+1]) + Math.abs(da[i+2] - db[i+2]) > 24) {
        n++; if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy;
      }
    }
    return { pct: +(100 * n / (w * h)).toFixed(3), box: x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } };
  }, [enc(a), enc(b)]);
  await p.close();
  return r;
}

const overlap = (a, b) => {
  if (!a || !b) return 0;
  const w = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const h = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return (w * h) / Math.max(1, Math.min(a.w * a.h, b.w * b.h));
};

/* --------------------------------------------------------- pass 1: both arms */
console.log(`pass 1 - ${LIST.length} games x 2 arms\n`);
const rows = [];
for (const id of LIST) {
  const react = await visit("react", id, "");
  const preact = await visit("preact", id, "");
  const d = await diff(`${OUT}/${id}.react.png`, `${OUT}/${id}.preact.png`).catch(() => ({ pct: -1, box: null }));
  rows.push({ id, react, preact, cross: d });
  const beh = react.mounted === preact.mounted && react.reacts === preact.reacts
    && react.errors.length === preact.errors.length;
  console.log(`  ${id.padEnd(14)} pixels ${String(d.pct).padStart(7)}%   behaviour ${beh ? "match" : "DIFFERS"}`);
}

/* ------------------------------- pass 2: the control, only where it is needed */
const suspects = rows.filter((r) => r.cross.pct > 0.05);
console.log(`\npass 2 - the control: re-shooting the SAME arm for the ${suspects.length} games that differed`);
for (const r of suspects) {
  await visit("preact", r.id, ".again");
  r.self = await diff(`${OUT}/${r.id}.preact.png`, `${OUT}/${r.id}.preact.again.png`).catch(() => ({ pct: -1, box: null }));
  // The game is simply RANDOM if shooting one build twice moves a comparable
  // amount of pixels. The FIRST version of this line also demanded the two
  // changed regions OVERLAP, and that was wrong twice in one run: a randomly
  // dealt row (`fit`) puts its changed tiles in different COLUMNS each deal, so
  // the boxes miss each other while the cause is plainly the deal. Where the
  // same build differs from itself by as much as the two builds differ, there is
  // nothing left for the engine to explain, wherever the pixels landed - so
  // position is only consulted when the self-difference is the smaller one.
  r.random = r.self.pct > 0.05 &&
    (r.self.pct >= r.cross.pct * 0.9 || overlap(r.cross.box, r.self.box) > 0.25);
  console.log(`  ${r.id.padEnd(14)} cross ${String(r.cross.pct).padStart(7)}%  self ${String(r.self.pct).padStart(7)}%  -> ${r.random ? "random content" : "UNEXPLAINED"}`);
}

/* ------------------------------------------------------------------- verdict */
const behaviour = rows.filter((r) =>
  r.react.mounted !== r.preact.mounted || r.react.reacts !== r.preact.reacts ||
  r.react.errors.length !== r.preact.errors.length || r.react.failed.length !== r.preact.failed.length);
// NOT "did preact react" - `reacts` presses buttons, and 13 of 42 games are
// driven by a keyboard, a swipe or a drag, so a false there is the HARNESS's
// reach and not the build's health. Counting it made a wholly healthy sweep
// exit 1 every single time, with three summary lines all reading clean, which
// is the shape that teaches a reader to stop reading the exit code
// (.claude/rules/a-gate-that-reds-on-day-one-teaches-you-to-ignore-it.md).
// This harness compares two arms; an absolute claim about ONE arm belongs in
// its verdict only where NEITHER arm managed to load - which is a dead port, a
// wrong path or a torn build, and is the one case whose summary would otherwise
// be all zeros.
const broken = rows.filter((r) => !r.react.mounted && !r.preact.mounted);
const unexplained = suspects.filter((r) => !r.random);

console.log(`\n${"=".repeat(72)}`);
console.log(`games                       ${rows.length}`);
console.log(`mounted + answer a tap      preact ${rows.filter(r => r.preact.mounted && r.preact.reacts).length}/${rows.length}   react ${rows.filter(r => r.react.mounted && r.react.reacts).length}/${rows.length}`);
console.log(`behaviour differs           ${behaviour.length}${behaviour.length ? "  -> " + behaviour.map(r => r.id).join(", ") : ""}`);
console.log(`pixels identical            ${rows.filter(r => r.cross.pct === 0).length}/${rows.length}`);
console.log(`pixels differ, random       ${suspects.filter(r => r.random).length}`);
console.log(`pixels differ, UNEXPLAINED  ${unexplained.length}${unexplained.length ? "  -> " + unexplained.map(r => r.id).join(", ") : ""}`);
console.log(`console errors              preact ${rows.reduce((a, r) => a + r.preact.errors.length, 0)}   react ${rows.reduce((a, r) => a + r.react.errors.length, 0)}`);
console.log(`NEITHER arm loaded          ${broken.length}${broken.length ? "  -> " + broken.map(r => r.id).join(", ") : ""}`);
const cannotPress = rows.filter((r) => r.preact.mounted && !r.preact.reacts).length;
if (cannotPress) console.log(`(${cannotPress} game(s) mounted but take a key, a swipe or a drag, which this harness cannot press. That is its reach, not a defect.)`);
for (const r of rows) for (const e of r.preact.errors) console.log(`    preact ${r.id}: ${e}`);
for (const r of rows) for (const e of r.react.errors) console.log(`    react  ${r.id}: ${e}`);

writeFileSync(`${OUT}/report.json`, JSON.stringify(rows, null, 1));
console.log(`\nshots + report.json in ${OUT}`);
await browser.close();
const why = [
  behaviour.length && `behaviour differs on ${behaviour.length}`,
  unexplained.length && `${unexplained.length} unexplained pixel difference(s)`,
  broken.length && `${broken.length} game(s) where NEITHER arm loaded`,
].filter(Boolean);
// Say WHY it is red, on the line above the exit. A non-zero status with a
// summary of zeros is how injection 2 read before this existed.
console.log(why.length ? `\nFAIL  ${why.join("; ")}` : `\nOK  the two builds agree`);

if (CONTROL) {
  const ok = broken.length === 1 && why.length === 1;
  console.log(ok
    ? "\nCONTROL OK  the verdict goes red, and says which of the three reasons it is"
    : "\nCONTROL FAILED  a game that cannot exist did not red the verdict - this harness cannot fail, so none of its green runs mean anything");
  process.exit(ok ? 0 : 2);
}
process.exit(why.length ? 1 : 0);
