#!/usr/bin/env node
/**
 * Does the app still WORK with preact/compat standing in for React?
 *
 *   npx vite preview --outDir dist-preact --port 5180 &
 *   node scripts/repro/repro-preact-swap.mjs
 *
 * WHY THIS EXISTS, and why it is a browser probe rather than a test.
 *
 * The alias lives in `vite.config.ts` alone. `vitest.config.ts` has its own
 * resolve block, its environment is `node`, and its `include` is `*.test.ts` -
 * so the 3,944 tests in this repo render no component and all of them pass
 * whether the swap works or not. Nothing in the suite can see this break.
 *
 * And the two ways it breaks do not throw.
 *
 * 1. `useSyncExternalStore` is what re-renders the home grid when the lazy
 *    metadata and the lazy card art land, and the room when its second shelf
 *    does. If preact's is subtly different, the cards below the fold keep their
 *    placeholder forever and the room keeps its free defaults. The page renders,
 *    nothing errors, and it is simply wrong for everyone who scrolls.
 *
 * 2. `reactHost.tsx` mounts a nested root inside the portal's tree and tears it
 *    down in a `queueMicrotask` so two reconcilers do not race over the same
 *    nodes. preact's `createRoot` is a thin wrapper over
 *    `render`/`unmountComponentAtNode`, so that is not the same code path.
 *
 * THE CONTROLS ARE THE LOAD-BEARING HALF. A card-art count of 38 proves nothing
 * unless the same counter reads LOW when `art-rest-*.js` is blocked - otherwise
 * the counter may simply be counting something that was always there. Same for
 * the roster: block `meta-rest-*.js` and the labelled-card count must fall to
 * the shell's 15. Both run, both must produce the opposite reading, and the run
 * FAILS if a control does not fire.
 *
 * The rAF control is inherited from `repro-new-games-play.mjs` for the reason
 * written there: a hidden or throttled context reports every rAF-driven game as
 * frozen, and a run that cannot tell "stopped" from "paused" is not worth
 * reading.
 */

import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";

const BASE = argOf("--base") ?? "http://localhost:5180";
const HEAD = process.argv.includes("--headed");
const ONLY = argOf("--only");
/**
 * `--shots <dir>` writes the five screens the operator rules on.
 *
 * Run it against BOTH arms and hash the pairs. Measured 2026-08-26 at 390x844:
 * the home, the room and the boards come out BYTE-IDENTICAL between React and
 * preact. Sudoku and Match-3 do not - and the control for that is running the
 * SAME arm twice, which also differs, because both games deal a random board.
 * Without that second run the two differing hashes read as a Preact defect.
 */
const SHOTS = argOf("--shots");

function argOf(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

/** The roster, read from the source of truth rather than typed here. */
const ROSTER = [
  ...readFileSync(new URL("../../src/portal/shellRoster.ts", import.meta.url), "utf8")
    .split("export const ROSTER_IDS")[1]
    .split("];")[0]
    .matchAll(/"([\w-]+)"/g),
].map((m) => m[1]);

if (ROSTER.length < 20) {
  console.error(`FAIL  parsed ${ROSTER.length} game ids out of shellRoster.ts - the matcher moved.`);
  process.exit(1);
}

let failures = 0;
function record(ok, name, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${name.padEnd(26)} ${detail}`);
}

const browser = await chromium.launch({ headless: !HEAD });

/** A fresh context every time - a first visit is the population that matters. */
async function fresh(blockPattern) {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  if (blockPattern) {
    await page.route("**/*", (route) =>
      blockPattern.test(route.request().url()) ? route.abort() : route.continue(),
    );
  }
  return { ctx, page, errors };
}

async function dismissConsent(page) {
  const decline = page.locator("button", { hasText: /No thanks|Decline|לא תודה/i }).first();
  if (await decline.count()) await decline.click().catch(() => {});
}

/* ----------------------------------------------------------- the rAF control */

{
  const { ctx, page } = await fresh();
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const { n, visibility } = await page.evaluate(async () => {
    let n = 0;
    const tick = () => {
      n++;
      if (n < 600) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    await new Promise((r) => setTimeout(r, 500));
    return { n, visibility: document.visibilityState };
  });
  record(n > 10, "rAF control", `${n} frames in 500ms, visibility=${visibility}`);
  if (n <= 10) {
    console.error("\nThe frame clock is not running. Every reading below would be a lie.");
    await browser.close();
    process.exit(1);
  }
  await ctx.close();
}

/* ---------------------------------------- the home grid, and what arrives late */

/**
 * How many cards are drawn with a REAL scene rather than nothing.
 *
 * KEYED ON THE SCENE'S OWN viewBox, `0 0 200 150`, and that is not fussiness.
 * A card also carries a star badge and a beta pill, both of them inline `<svg>`
 * on a 24x24 box - so `card.querySelector("svg")` returns the BADGE, and the
 * first version of this counter read 1 of 39 on a perfectly healthy page. It
 * read 1 of 39 on the React arm too, which is the only reason the probe was
 * corrected instead of Preact being blamed.
 *
 * Measured on the artifact: 39 of 39 with `art-rest` served, 15 of 39 with it
 * blocked - the shell's own half. That gap IS the subscription working.
 */
const countArt = (page) =>
  page.evaluate(() => {
    const cards = [...document.querySelectorAll("a[href*='/games/']")];
    const withScene = cards.filter((c) =>
      [...c.querySelectorAll("svg")].some((s) => s.getAttribute("viewBox") === "0 0 200 150"),
    ).length;
    return { cards: cards.length, withScene };
  });

let armedHigh = 0;
{
  const { ctx, page, errors } = await fresh();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await dismissConsent(page);
  await page.waitForTimeout(2500);
  const { cards, withScene } = await countArt(page);
  armedHigh = withScene;
  record(
    cards >= ROSTER.length,
    "home: every card laid out",
    `${cards} cards for ${ROSTER.length} games`,
  );
  record(
    withScene >= ROSTER.length,
    "home: lazy card art arrived",
    `${withScene} of ${cards} cards drawn with a real scene`,
  );
  record(errors.length === 0, "home: console clean", errors[0] ?? "no errors");
  await ctx.close();
}

{
  // THE CONTROL. Same page, same counter, `art-rest-*.js` refused. If this does
  // not read LOW the counter is not measuring what the line above claims.
  const { ctx, page } = await fresh(/art-rest-.*\.js$/);
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await dismissConsent(page);
  await page.waitForTimeout(2500);
  const { withScene } = await countArt(page);
  record(
    withScene < armedHigh,
    "home: art control fires",
    `${withScene} with art-rest blocked vs ${armedHigh} without`,
  );
  await ctx.close();
}

{
  // The roster's own arrival, which is a different subscription in a different
  // module: block `meta-rest` and the cards must fall back to the shell's half.
  const { ctx, page } = await fresh(/meta-rest-.*\.js$/);
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await dismissConsent(page);
  await page.waitForTimeout(2500);
  const named = await page.evaluate(
    () =>
      [...document.querySelectorAll("a[href*='/games/']")].filter(
        (a) => (a.textContent ?? "").trim().length > 0,
      ).length,
  );
  record(
    named < ROSTER.length,
    "home: roster control fires",
    `${named} labelled cards with meta-rest blocked, of ${ROSTER.length}`,
  );
  await ctx.close();
}

/* ------------------------------------------------------------- the room */

{
  const { ctx, page, errors } = await fresh();
  await page.goto(`${BASE}/world/`, { waitUntil: "networkidle" });
  await dismissConsent(page);
  await page.waitForTimeout(2000);
  const shop = await page.evaluate(
    () => document.querySelectorAll("[class*='shop'] button, main button").length,
  );
  record(shop > 10, "world: shop rendered", `${shop} pressable items`);
  record(errors.length === 0, "world: console clean", errors[0] ?? "no errors");
  await ctx.close();
}

/* -------------------------------------------- every game mounts and responds */

const games = ONLY ? [ONLY] : ROSTER;
for (const id of games) {
  const { ctx, page, errors } = await fresh();
  let detail = "";
  let ok = false;
  try {
    await page.goto(`${BASE}/games/${id}/`, { waitUntil: "domcontentloaded" });
    await dismissConsent(page);
    await page.waitForSelector(".ellaz-play-surface", { timeout: 20_000, state: "attached" });
    await page.waitForTimeout(700);
    // A mounted game draws SOMETHING. An empty stage is the shape a silently
    // broken renderer leaves - it is not an error, it is a blank box.
    //
    // A CANVAS GAME DRAWS ALMOST NO NODES, and a flat node floor called snake,
    // bubbleshooter and fruit broken on BOTH arms. So a canvas with a real size
    // counts as drawn: what matters is that the renderer got somewhere, and for
    // those three the pixels are not in the DOM at all.
    const { nodes, canvas } = await page.evaluate(() => {
      const s = document.querySelector(".ellaz-play-surface");
      if (!s) return { nodes: -1, canvas: false };
      const c = s.querySelector("canvas");
      return {
        nodes: s.querySelectorAll("*").length,
        canvas: !!c && c.width > 0 && c.height > 0,
      };
    });
    // ...and the loading state is gone, which is what says mount() RESOLVED
    // rather than that the emitted poster is still on screen.
    const stillLoading = await page.evaluate(
      () => !!document.querySelector("[data-loading='true']"),
    );
    ok = (nodes > 3 || canvas) && !stillLoading && errors.length === 0;
    detail = `${nodes} nodes${canvas ? " + canvas" : ""}${stillLoading ? ", STILL LOADING" : ""}${
      errors.length ? `, ${errors.length} console error(s): ${errors[0].slice(0, 120)}` : ""
    }`;
  } catch (e) {
    detail = String(e).split("\n")[0];
  }
  record(ok, `game ${id}`, detail);
  await ctx.close();
}

/* ------------------------------------------------ the pictures, if asked for */

if (SHOTS) {
  mkdirSync(SHOTS, { recursive: true });
  const screens = [
    ["1-home", "/"],
    ["2-game-sudoku", "/games/sudoku/"],
    ["3-game-match3", "/games/match3/"],
    ["4-world", "/world/"],
    ["5-boards", "/boards/"],
  ];
  for (const [name, path] of screens) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    await dismissConsent(page);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${SHOTS}/${name}.png` });
    await ctx.close();
    console.log(`shot ${name}`);
  }
}

await browser.close();

console.log(
  failures === 0
    ? `\nOK  ${games.length} games mounted, both lazy-arrival controls fired.`
    : `\nFAIL  ${failures} check(s) failed.`,
);
process.exit(failures === 0 ? 0 : 1);
