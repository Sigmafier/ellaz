#!/usr/bin/env node
/**
 * Does pressing a key move or resize the game?
 *
 *   node scripts/repro/repro-keys-do-not-move-the-game.mjs --dist dist-x     # a build on disk
 *   node scripts/repro/repro-keys-do-not-move-the-game.mjs --base https://ellaz.fun --only snake
 *   node scripts/repro/repro-keys-do-not-move-the-game.mjs --control
 *
 * WHY THIS EXISTS (2026-09-14)
 *
 * The operator, on snake: "the keyboard changes the entire game screen size which is
 * bad!!!". Measured on live ellaz.fun that day, every one of the 43 games moved:
 * a game page is a document with the game on its first screen and the article under
 * it, so ArrowDown, Space, PageDown and End scrolled the DOCUMENT - Space took snake's
 * board 600px up and off a 1536x639 window. The four games that handle arrows
 * themselves (2048, blocks, maze, evolve) still scrolled on Space and PageDown. And on
 * a phone snake's first key swapped a 49px start button for a 46px hint, which moved
 * the frame 3px and made fitStage rescale the whole game.
 *
 * Every layout gate here measures a page nobody has touched. This one presses keys.
 *
 * WHAT IT ASSERTS, per game x window
 *
 *   after each of ArrowRight, ArrowDown, ArrowUp, ArrowLeft, Space, PageDown, End -
 *   pressed with focus on the page, then again (all but Space) with focus on a game
 *   control -
 *
 *     NOT SCROLLED   the document's scroll position did not move
 *     NOT RESIZED    #game-frame's layout height and fitStage's scale did not move
 *
 * SCOPE, said out loud
 *
 *   - The state a key can reach from arrival. A resize that only happens at game over
 *     is not in the population.
 *   - A reader who has scrolled the game OUT of view must still scroll with keys; the
 *     control asserts that, so the guard cannot pass by trapping the page.
 *   - Space with focus on a button is a press, not a stray key, and is not sent in that
 *     arm. A level change that resizes the game is real, and is not what this measures.
 */
import { chromium } from "file:///mnt/c/Users/ytr_o/OneDrive/Desktop/ellaz/studio/node_modules/playwright-core/index.mjs";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const argOf = (flag) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
};
const BASE = (argOf("--base") ?? "http://localhost:5180").replace(/\/$/, "");
const DIST = argOf("--dist");
const ONLY = argOf("--only")?.split(",");
const CONTROL = process.argv.includes("--control");

const WINDOWS = [
  [1536, 639, false], // the operator's own window
  [390, 844, true], // a phone, where fitStage scales
];
const KEYS = ["ArrowRight", "ArrowDown", "ArrowUp", "ArrowLeft", "Space", "PageDown", "End"];

const GAMES_DIR = fileURLToPath(new URL("../../src/games/", import.meta.url));
const ids = readdirSync(GAMES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(`${GAMES_DIR}${d.name}/meta.ts`))
  .map((d) => readFileSync(`${GAMES_DIR}${d.name}/meta.ts`, "utf8").match(/^\s*id:\s*"([^"]+)"/m)?.[1])
  .filter(Boolean)
  .sort();
if (ids.length < 40) throw new Error(`read only ${ids.length} game ids from ${GAMES_DIR} - refusing a partial population`);
const GAMES = ids.filter((id) => !ONLY || ONLY.includes(id));
if (ONLY && GAMES.length !== ONLY.length) throw new Error(`--only names a game that does not exist: ${ONLY.filter((g) => !ids.includes(g))}`);

/** In the page: where the document is scrolled, and how big the game is. */
function read() {
  const frame = document.getElementById("game-frame");
  if (!frame) return { error: "no #game-frame on this page" };
  const tf = getComputedStyle(frame).transform;
  let scrolled = Math.round(document.scrollingElement?.scrollTop ?? scrollY);
  // Any other scroller that moved counts too - a key must not shift the game inside it.
  for (const el of document.querySelectorAll(".ellaz-scroll")) scrolled += Math.round(el.scrollTop);
  return { scroll: scrolled, frameH: frame.offsetHeight, scale: tf === "none" ? 1 : Number(tf.match(/matrix\(([-\d.]+)/)?.[1] ?? 1) };
}

const browser = await chromium.launch();
const TYPES = { html: "text/html", js: "text/javascript", css: "text/css", json: "application/json", svg: "image/svg+xml", png: "image/png", webp: "image/webp", woff2: "font/woff2", webmanifest: "application/manifest+json" };

async function open(id, w, h, touch) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, serviceWorkers: "block", hasTouch: touch });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("ellaz:consent:v1", "denied");
    } catch {}
  });
  if (DIST)
    await ctx.route(`${new URL(BASE).origin}/**`, (route) => {
      let path = decodeURIComponent(new URL(route.request().url()).pathname);
      if (path.endsWith("/")) path += "index.html";
      const file = `${DIST.replace(/\/$/, "")}${path}`;
      if (!existsSync(file)) return route.fulfill({ status: 404, body: "not in dist" });
      route.fulfill({ status: 200, contentType: TYPES[path.split(".").pop()] ?? "application/octet-stream", body: readFileSync(file) });
    });
  const page = await ctx.newPage();
  // Three tries: a network blip must read as a blip, never as a verdict.
  for (let i = 0; ; i++) {
    try {
      await page.goto(`${BASE}/games/${id}/`, { waitUntil: "load", timeout: 45000 });
      break;
    } catch (e) {
      if (i === 2) {
        await ctx.close();
        throw e;
      }
      await page.waitForTimeout(2000);
    }
  }
  await page.waitForTimeout(1800);
  return { ctx, page };
}

/** Press every key from `focus` and report what moved. */
async function press(page, focus) {
  const moved = [];
  await page.evaluate(() => (document.scrollingElement.scrollTop = 0));
  await page.evaluate((how) => {
    document.activeElement?.blur?.();
    if (how === "control") document.querySelector(".ellaz-game-panel button")?.focus({ preventScroll: true });
    window.__keyFocus = document.activeElement?.getAttribute("aria-label") || document.activeElement?.className || document.activeElement?.tagName;
  }, focus);
  const before = await page.evaluate(read);
  if (before.error) return { error: before.error };
  const focused = await page.evaluate(() => String(window.__keyFocus).slice(0, 40));
  // Space on a focused button PRESSES it - a click, not a stray key. On the difficulty
  // toggle that changes the level, and what a new level does to the size is a
  // different question from this gate's (measured 2026-09-14: 8 games, wordsearch
  // 495 -> 536px). So the control arm leaves Space out.
  for (const key of focus === "control" ? KEYS.filter((k) => k !== "Space") : KEYS) {
    await page.keyboard.press(key);
    await page.waitForTimeout(350);
    const now = await page.evaluate(read);
    if (Math.abs(now.scroll - before.scroll) > 1) moved.push(`${key} scrolled the page ${now.scroll - before.scroll}px`);
    if (Math.abs(now.frameH - before.frameH) > 1 || Math.abs(now.scale - before.scale) > 0.002)
      moved.push(`${key} resized the game: frame ${before.frameH}->${now.frameH}px, scale ${before.scale}->${now.scale}`);
    // Put the page back so the next key is measured from the same place.
    await page.evaluate(() => {
      document.scrollingElement.scrollTop = 0;
      for (const el of document.querySelectorAll(".ellaz-scroll")) el.scrollTop = 0;
    });
  }
  return { moved: [...new Set(moved)].map((m) => (focus === "control" ? `${m} (focus: ${focused})` : m)) };
}

const rows = [];
for (const id of GAMES)
  for (const [w, h, touch] of WINDOWS) {
    const win = `${w}x${h}`;
    try {
      const { ctx, page } = await open(id, w, h, touch);
      const onPage = await press(page, "page");
      const onControl = onPage.error ? { moved: [] } : await press(page, "control");
      await ctx.close();
      if (onPage.error) rows.push({ id, win, error: onPage.error });
      else rows.push({ id, win, moved: [...onPage.moved.map((m) => `focus on the page: ${m}`), ...onControl.moved.map((m) => `focus on a control: ${m}`)] });
    } catch (e) {
      rows.push({ id, win, error: String(e).split("\n")[0].slice(0, 120) });
    }
  }

/* Controls. A guard that swallows every key forever passes every arm above, and so
 * does an instrument that cannot see a scroll. Each cell below forces the reading
 * the gate exists to tell apart. */
const control = [];
if (CONTROL)
  try {
    const { ctx, page } = await open("sudoku", 1536, 639, false);
    // 1. the instrument sees a scroll
    const a = await page.evaluate(read);
    await page.evaluate(() => (document.scrollingElement.scrollTop += 80));
    const b = await page.evaluate(read);
    control.push({ cell: "a planted 80px scroll is seen", ok: b.scroll - a.scroll === 80, got: `${b.scroll - a.scroll}px` });
    // 2. a reader who scrolled the game out of view still scrolls with keys
    await page.evaluate(() => {
      document.scrollingElement.scrollTop = document.scrollingElement.scrollHeight;
      document.activeElement?.blur?.();
    });
    const low = await page.evaluate(read);
    await page.keyboard.press("PageUp");
    await page.waitForTimeout(400);
    const up = await page.evaluate(read);
    control.push({ cell: "with the game out of view, PageUp still scrolls the article", ok: up.scroll < low.scroll - 50, got: `${low.scroll} -> ${up.scroll}` });
    // 3. typing a space into a text field is never swallowed
    await page.evaluate(() => {
      document.scrollingElement.scrollTop = 0;
      const i = document.createElement("input");
      i.id = "key-control-input";
      document.querySelector(".ellaz-game-panel").prepend(i);
      i.focus();
    });
    await page.keyboard.type("a b");
    const typed = await page.evaluate(() => document.getElementById("key-control-input").value);
    control.push({ cell: "a space typed into a text field arrives", ok: typed === "a b", got: JSON.stringify(typed) });
    await ctx.close();
    // 4. the GAME still gets its keys. Phaser drops an event that is already
    // defaultPrevented, and the first version of the guard ran before Phaser's listener:
    // every arm above was green while snake ignored every arrow (2026-09-14). A guard
    // that silences the game passes a scroll check perfectly, so this cell asks the game.
    for (const [id, key] of [["snake", "ArrowRight"], ["2048", "ArrowLeft"]]) {
      const g = await open(id, 1536, 639, false);
      const text = () => g.page.evaluate(() => document.querySelector(".ellaz-game-panel")?.innerText.replace(/\s+/g, " "));
      const t0 = await text();
      let t1 = t0;
      for (const k of [key, "ArrowUp", "ArrowDown", "ArrowRight", "ArrowLeft"]) {
        await g.page.keyboard.press(k);
        await g.page.waitForTimeout(500);
        t1 = await text();
        if (t1 !== t0) break;
      }
      control.push({ cell: `${id} still reacts to the arrow keys`, ok: t1 !== t0, got: t1 !== t0 ? "the game panel changed" : "nothing changed" });
      await g.ctx.close();
    }
  } catch (e) {
    control.push({ cell: "the control cells ran at all", ok: false, got: String(e).slice(0, 140) });
  }

await browser.close();

console.log(`\npopulation: ${GAMES.length} games x ${WINDOWS.length} windows = ${rows.length} arms, ${KEYS.length} keys each from two focus states, base ${DIST ? `${BASE} <- ${DIST}` : BASE}`);
const bad = rows.filter((r) => r.error || r.moved.length);
for (const r of bad) {
  if (r.error) console.log(`  ERROR ${r.id} @ ${r.win}: ${r.error}`);
  else {
    console.log(`  ${r.id} @ ${r.win}:`);
    for (const m of r.moved) console.log(`      ${m}`);
  }
}
const badGames = [...new Set(bad.map((r) => r.id))];
console.log(`\nfailures: ${bad.length} of ${rows.length} arms, in ${badGames.length} games`);
if (CONTROL) {
  console.log("\ncontrol:");
  for (const c of control) console.log(`  ${c.ok ? "OK  " : "FAIL"} ${c.cell}  (${c.got})`);
}
process.exit(bad.length || control.some((c) => !c.ok) ? 1 : 0);
