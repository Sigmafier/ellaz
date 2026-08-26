#!/usr/bin/env node
/**
 * Does the LIVE site still play? A browser, against ellaz.fun, every day.
 *
 *   node scripts/repro/repro-live-smoke.mjs [--base https://ellaz.fun] [--n 8]
 *   node scripts/repro/repro-live-smoke.mjs --control        # must go red
 *   node scripts/repro/repro-live-smoke.mjs --all            # every game, on demand
 *
 * WHY. Every gate in this repo reads `dist/` or a source tree, except
 * `assert-crawlable.mjs` (which reads the network as a crawler and never runs a
 * line of our JavaScript) and `assert-live.mjs` (which fetches artifacts and
 * compares hashes, and cannot tell a 200 that executes from a 200 that throws).
 * Nothing has ever OPENED the live site. That gap is the exact size of the
 * runtime swap this repo shipped on 2026-08-26: `react` and `react-dom` are
 * aliased onto `preact/compat`, a change no test in the suite can see, whose two
 * failure modes do not throw, and which reaches a child through a service worker
 * that can serve a page from a build nobody is looking at any more.
 *
 * IT SAMPLES, AND THAT IS NOT LAZINESS. Hostinger's CDN bot challenge arms on a
 * RUN of requests from one IP - that is the 2026-08-08 outage, and it is why
 * `assert-crawlable.mjs` was cut from a 200-URL walk to 40. Opening all 42 games
 * in a browser every day would put this job's traffic beside that budget for no
 * extra signal: a regression in the reconciler is not per-game. So a fixed core
 * (the home, the room, one canvas game, one DOM game) runs EVERY day, and the
 * rest rotate on the date, covering the whole catalogue every few days.
 *
 * THE GAME LIST COMES OFF THE LIVE SITEMAP, not off `dist/`. This job does not
 * build, so a list read from the repo would describe a tree the live site may not
 * be running yet - and reading the sitemap makes the sitemap part of what is
 * being checked.
 *
 * WHAT COUNTS AS BROKEN is deliberately narrow: an uncaught exception, a failed
 * request to our own origin, or a game whose board never appears. Console
 * `error` text is REPORTED and does not fail the run - third-party tags write
 * there, and a gate that reds on someone else's script is a gate people learn to
 * ignore (.claude/rules/a-gate-that-reds-on-day-one-teaches-you-to-ignore-it.md).
 */

import { chromium } from "playwright";

const argOf = (f, d) => { const i = process.argv.indexOf(f); return i === -1 ? d : process.argv[i + 1]; };
const BASE = (argOf("--base", "https://ellaz.fun")).replace(/\/$/, "");
const CONTROL = process.argv.includes("--control");
const ALL = process.argv.includes("--all");
const N = Number(argOf("--n", "8"));

// The core never rotates: the home is the entry, the room is the only screen
// with its own lazy art shelf, snake is the one canvas game, sudoku is the
// densest DOM one. A reconciler regression shows here first.
// Each core screen names the artwork that proves IT drew, because they do not
// share one. The home grid draws game cards; the room draws a 300x300 scene into
// `#game-frame` and has no `#root` at all. Asserting the home's marker on the
// room reported the live room broken when it was fine - the probe's own bug, and
// the reason this is a per-path selector rather than one global one.
const CORE = [
  { path: "/", art: 'svg[viewBox="0 0 200 150"]', what: "game card scenes" },
  { path: "/world/", art: 'svg[viewBox="0 0 300 300"]', what: "room scene" },
];
const CORE_GAMES = ["snake", "sudoku"];

const origin = new URL(BASE).origin;

async function gameIds() {
  const res = await fetch(`${BASE}/sitemap.xml`, { headers: { "user-agent": "ellaz-live-smoke" } });
  if (!res.ok) throw new Error(`sitemap.xml -> HTTP ${res.status}`);
  const xml = await res.text();
  // `/games/<x>/` is BOTH a game and a category landing page, and a category page
  // has no board - so a plain path match reports the live site broken on `kids`
  // and `learn`. The discriminator is DERIVED rather than a list to keep in step:
  // every game page carries an `<image:image>` (its art SVG, since 2026-08-22) and
  // no category page does. A hand-kept category list would go stale the day
  // `create` reaches three games and earns its own page.
  const blocks = [...xml.matchAll(/<url>[\s\S]*?<\/url>/g)].map((m) => m[0]);
  const hit = (b) => b.match(/<loc>[^<]*?\/games\/([a-z0-9]+)\/<\/loc>/);
  const games = blocks.filter((b) => hit(b) && b.includes("<image:image>"));
  const skipped = blocks.filter((b) => hit(b) && !b.includes("<image:image>"));
  const uniq = [...new Set(games.map((b) => hit(b)[1]))];
  // Two floors, and the second is the one that matters: a filter that excludes
  // NOTHING has stopped discriminating, and would hand the category pages back.
  if (uniq.length < 10) throw new Error(`sitemap parsed to ${uniq.length} game ids - refusing to report on that`);
  if (skipped.length === 0) throw new Error("the <image:image> filter excluded nothing - the sitemap changed shape and this probe can no longer tell a game from a category");
  console.log(`sitemap: ${uniq.length} games, ${[...new Set(skipped.map((b) => hit(b)[1]))].join("/")} excluded as category pages`);
  return uniq;
}

/** Date-seeded rotation, so the whole catalogue is covered over a few days. */
function pick(ids, n, day) {
  const rest = ids.filter((i) => !CORE_GAMES.includes(i));
  const start = day % Math.max(1, rest.length);
  const out = [];
  for (let k = 0; out.length < Math.max(0, n - CORE_GAMES.length) && k < rest.length; k++)
    out.push(rest[(start + k) % rest.length]);
  return [...CORE_GAMES, ...out];
}

const findings = [];
const note = (ok, what, detail) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what.padEnd(26)} ${detail}`);
  if (!ok) findings.push(`${what}: ${detail}`);
};

const browser = await chromium.launch();

async function open(path, { needsBoard, art }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  const page = await ctx.newPage();
  const thrown = [], failed = [], consoleErrors = [];
  page.on("pageerror", (e) => thrown.push(String(e).slice(0, 140)));
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 100)); });
  page.on("requestfailed", (r) => { if (r.url().startsWith(origin)) failed.push(new URL(r.url()).pathname); });

  let board = false, cards = 0;
  try {
    await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 30000 });
    const d = page.locator("button", { hasText: /No thanks|Decline/i }).first();
    if (await d.count()) await d.click({ timeout: 3000 }).catch(() => {});
    if (needsBoard) {
      await page.waitForSelector(".ellaz-play-surface", { timeout: 20000, state: "attached" });
      board = true;
    } else {
      // The home and the room prove the LAZY path: their art arrives in a second
      // chunk through useSyncExternalStore, which is the half of the swap that
      // fails without throwing.
      await page.waitForFunction((sel) => document.querySelectorAll(sel).length > 0,
        art, { timeout: 20000 }).catch(() => {});
      cards = await page.evaluate((sel) => document.querySelectorAll(sel).length, art);
      board = cards > 0;
    }
  } catch (e) {
    thrown.push("DID NOT LOAD " + String(e.message).slice(0, 90));
  }
  await ctx.close();
  return { board, cards, thrown, failed, consoleErrors };
}

const day = Math.floor(Date.parse(new Date().toISOString().slice(0, 10)) / 86400000);
let ids;
try {
  ids = CONTROL ? ["__no_such_game__"] : await gameIds();
} catch (e) {
  console.error(`FAIL  could not read the game list: ${e.message}`);
  await browser.close();
  process.exit(1);
}
const games = CONTROL ? ["__no_such_game__"] : ALL ? ids : pick(ids, N, day);

console.log(`live smoke: ${BASE}${CONTROL ? "  [CONTROL - this run MUST go red]" : ""}`);
console.log(`day ${day} -> ${games.length} of ${ids.length} games: ${games.join(", ")}\n`);

for (const { path, art, what } of CONTROL ? [] : CORE) {
  const r = await open(path, { needsBoard: false, art });
  note(r.board && !r.thrown.length && !r.failed.length, path,
    `${r.cards} ${what}, ${r.thrown.length} thrown, ${r.failed.length} failed requests`);
  r.thrown.forEach((t) => console.log(`       thrown: ${t}`));
  r.failed.forEach((f) => console.log(`       failed: ${f}`));
}

for (const id of games) {
  const r = await open(`/games/${id}/`, { needsBoard: true });
  note(r.board && !r.thrown.length && !r.failed.length, `/games/${id}/`,
    `${r.board ? "board up" : "NO BOARD"}, ${r.thrown.length} thrown, ${r.failed.length} failed requests` +
    (r.consoleErrors.length ? `, ${r.consoleErrors.length} console error(s) [reported, not fatal]` : ""));
  r.thrown.forEach((t) => console.log(`       thrown: ${t}`));
  r.failed.forEach((f) => console.log(`       failed: ${f}`));
  r.consoleErrors.forEach((c) => console.log(`       console: ${c}`));
}

await browser.close();

if (CONTROL) {
  // Ask the live site for a game it does not have. It must go red - and the first
  // version of this control asked for `sudoku`, which passes, so it reported
  // CONTROL FAILED every time and said nothing about the verdict. A control that
  // cannot make the verdict fail proves nothing about the verdict.
  const ok = findings.length > 0;
  console.log(ok
    ? "\nCONTROL OK  a page that is not the app goes red"
    : "\nCONTROL FAILED  the smoke passed against a page with no game on it - it cannot fail, so its green runs mean nothing");
  process.exit(ok ? 0 : 2);
}

console.log(findings.length ? `\nFAIL  ${findings.length} problem(s) on the live site` : `\nOK  the live site plays`);
process.exit(findings.length ? 1 : 0);
