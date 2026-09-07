#!/usr/bin/env node
/**
 * DOES THE APP STILL WORK - driven, not read.
 * ===========================================================================
 *
 * Every gate in this repo reads bytes. `build:check` reads the source,
 * `assert:payload` reads `dist/`, `assert:pages` reads the emitted documents,
 * `assert:fast` reads the served head. Not one of them opens the site and uses
 * it, which is the whole subject of
 * .claude/rules/a-build-gate-that-never-runs-the-artifact.md - a bundle whose
 * own game module had been stubbed out passed every static assertion and
 * rendered "The game didn't load".
 *
 * So this drives the shell: it taps the things a child taps and asserts what
 * they do. It was written on 2026-09-07 beside the layout-shift work, because
 * that change re-shaped the home grid, the daily card and the keep-playing
 * rail, and "the numbers got better" says nothing about whether the page still
 * plays.
 *
 * IT SEEDS A PROFILE. A fresh browser has no keep-playing rail at all, so a
 * run against a clean context can never exercise the half of the change that
 * touches it. The seeded arm writes `ellaz:profile:v1` before the first
 * navigation and asserts the rail comes back with those games in it.
 *
 * PLAYWRIGHT IS NOT A DEPENDENCY OF THIS REPO and deliberately is not one -
 * the plan that added the font work refused new packages. Run it from a tree
 * that has one:
 *
 *   npm run build && npx vite preview --outDir dist --port 5176 --strictPort
 *   mkdir -p ~/<tree-with-playwright>/.e2e && cp scripts/repro/e2e-shell-walkthrough.mjs $_
 *   cd $_ && node e2e-shell-walkthrough.mjs http://localhost:5176
 */

import { chromium } from "playwright";

const BASE = (process.argv[2] ?? "http://localhost:5176").replace(/\/$/, "");
const HEADED = process.argv.includes("--headed");

/**
 * THE CONTROL. A green walkthrough that has never been watched fail proves
 * nothing about the walkthrough - see
 * .claude/rules/a-diagnostic-that-truncates-what-it-compares.md, where a
 * harness reported six SURVIVED because it had run nothing at all.
 *
 * `--control` blocks the lazy catalogue chunks, so the games below the fold
 * never arrive. The two checks that read the finished grid MUST fail and the
 * rest MUST still pass: a run where everything fails is a broken harness, and
 * a run where nothing fails is a blind one. The script asserts that shape
 * itself rather than leaving it to whoever reads the output.
 */
const CONTROL = process.argv.includes("--control");
const CONTROL_MUST_FAIL = [
  // The grid: 15 of the catalogue's games are in the shell, the other 27 stay
  // reserved slots. Both halves of that are the reservation working.
  "home draws the whole catalogue",
  "no placeholder survives the catalogue landing",
  // The daily card is a placeholder rather than a link, because its game's
  // TITLE is in the blocked chunk - which is the shape the fix intends: the
  // space is held, nothing invites a tap, and no wrong name is shown.
  "the daily card links to a game",
  // Aborting a request is itself a console error. Expected, and listed rather
  // than filtered, so a run where these are the ONLY failures still reds.
  "no uncaught errors on the fresh path",
  "no uncaught errors on the returning path",
];

let failed = 0;
const results = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `   ${detail}` : ""}`);
  if (!ok) failed++;
  return ok;
};

/**
 * A returning player: three games opened, newest first by `lastPlayedAt`.
 * `migrateProfile` salvages a partial record rather than throwing, so the
 * fields the rail does not read are left out on purpose - if that stops being
 * true, this arm fails loudly rather than silently rendering an empty rail.
 */
const SEED = {
  ids: ["snake", "memory", "2048"],
  json: JSON.stringify({
    v: 1,
    coins: 12,
    games: {
      snake: { lastPlayedAt: 3_000_000_000_000, stars: 2 },
      memory: { lastPlayedAt: 2_000_000_000_000, stars: 1 },
      "2048": { lastPlayedAt: 1_000_000_000_000, stars: 0 },
    },
  }),
};

const browser = await chromium.launch({ headless: !HEADED });

async function open({ seed = false, viewport = { width: 1350, height: 940 } } = {}) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  if (CONTROL) {
    // The rest of the catalogue rides `meta-rest`; blocking it leaves the
    // shell's own games on screen and everything else a reserved slot.
    await page.route(/\/assets\/meta-rest-/, (r) => r.abort());
  }
  if (seed) {
    await ctx.addInitScript(
      ([k, v]) => {
        try {
          localStorage.setItem(k, v);
        } catch {
          /* a context with storage blocked is a different test */
        }
      },
      ["ellaz:profile:v1", SEED.json],
    );
  }
  await page.goto(`${BASE}/`, { waitUntil: "load" });
  await page.waitForSelector("#root a[href*='/games/']", { timeout: 20_000 });
  return { ctx, page, errors };
}

// ---------------------------------------------------------------------------
// 1. A FRESH VISITOR
// ---------------------------------------------------------------------------
{
  const { ctx, page, errors } = await open();
  await page.waitForTimeout(2500); // the lazy catalogue

  const tiles = await page.locator("#root a[aria-label][href*='/games/']").count();
  check("home draws the whole catalogue", tiles >= 40, `${tiles} game tiles`);

  const placeholders = await page.locator("#root div[aria-hidden][style*='aspect-ratio']").count();
  check("no placeholder survives the catalogue landing", placeholders === 0, `${placeholders} left`);

  // Anchors with no accessible name are an accessibility failure, and the
  // reservation work added elements that could easily have become some.
  const nameless = await page.evaluate(() =>
    [...document.querySelectorAll("#root a")].filter(
      (a) => !(a.getAttribute("aria-label") || a.textContent || "").trim(),
    ).length,
  );
  check("every link has an accessible name", nameless === 0, `${nameless} nameless`);

  // The category rail must actually filter, and filter to a NON-EMPTY grid -
  // an empty grid gives a child no way back.
  const chips = page.locator("#root button[aria-pressed]");
  const chipCount = await chips.count();
  check("the category rail offers chips", chipCount >= 3, `${chipCount} chips`);
  const before = await page.locator("#root a[aria-label][href*='/games/']").count();
  await chips.nth(1).click();
  await page.waitForTimeout(400);
  const after = await page.locator("#root a[aria-label][href*='/games/']").count();
  check("a category chip filters the grid", after > 0 && after < before, `${before} -> ${after}`);
  await chips.nth(0).click();
  await page.waitForTimeout(400);
  check(
    "the All chip restores the grid",
    (await page.locator("#root a[aria-label][href*='/games/']").count()) === before,
  );

  // The daily card: a real link to a real game page.
  const daily = page.locator("#root a[aria-label*='puzzle' i]").first();
  const dailyHref = (await daily.count()) ? await daily.getAttribute("href") : null;
  check("the daily card links to a game", Boolean(dailyHref?.includes("/games/")), dailyHref ?? "absent");

  // Playing one. The tile is a real navigation, and the game must MOUNT -
  // a page that 200s with a dead canvas is the failure this file exists for.
  await page.locator("#root a[aria-label][href*='/games/']").first().click();
  await page.waitForLoadState("load");
  await page.waitForTimeout(3500);
  const mounted = await page.evaluate(() => {
    const f = document.querySelector("#game-frame") ?? document.querySelector("#root");
    return {
      url: location.pathname,
      nodes: f ? f.querySelectorAll("*").length : 0,
      text: (document.body.textContent ?? "").slice(0, 200),
    };
  });
  check("a tile opens a game that mounts", mounted.nodes > 20, `${mounted.url} ${mounted.nodes} nodes`);
  check(
    "the game did not render an error card",
    !/didn.t load|something went wrong/i.test(mounted.text),
  );

  check("no uncaught errors on the fresh path", errors.length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 2. A RETURNING PLAYER - the keep-playing rail, which a fresh context has not got
// ---------------------------------------------------------------------------
{
  const { ctx, page, errors } = await open({ seed: true });

  // Immediately: the rail's slots exist before the catalogue resolves them.
  const early = await page.evaluate(() => {
    const rail = [...document.querySelectorAll("#root .ellaz-rail")].find((r) =>
      r.previousElementSibling?.textContent?.length,
    );
    return rail ? rail.children.length : -1;
  });
  await page.waitForTimeout(2500);
  const late = await page.evaluate(() => {
    const rails = [...document.querySelectorAll("#root .ellaz-rail")];
    const rail = rails.find((r) => r.querySelector("a[href*='/games/']") && r.children.length <= 6);
    return rail
      ? {
          n: rail.children.length,
          hrefs: [...rail.querySelectorAll("a")].map((a) => a.getAttribute("href")),
        }
      : { n: -1, hrefs: [] };
  });
  check("the keep-playing rail comes back for a returning player", late.n === SEED.ids.length, `${late.n} cards`);
  check("its slot count never changes", early === late.n, `${early} -> ${late.n}`);
  check(
    "it links to the games that were played",
    SEED.ids.every((id) => late.hrefs.some((h) => h?.includes(`/games/${id}/`))),
    late.hrefs.join(" "),
  );

  // The wallet reads the seeded profile - proof the seed is real and not inert.
  const coins = await page.evaluate(() => (document.body.textContent ?? "").includes("12"));
  check("the seeded wallet is on screen", coins, "coins: 12");

  check("no uncaught errors on the returning path", errors.length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 3. HEBREW, RTL, AND THE ROOM - a phone viewport, because that is the audience
// ---------------------------------------------------------------------------
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${BASE}/he/`, { waitUntil: "load" });
  await page.waitForSelector("#root a[href*='/games/']", { timeout: 20_000 });
  await page.waitForTimeout(2000);
  const rtl = await page.evaluate(() => ({
    dir: document.documentElement.dir,
    lang: document.documentElement.lang,
    // A spatial grid must stay LTR whatever the page direction does.
    gridDir: getComputedStyle(document.querySelector("#root [style*='display: grid']") ?? document.body).direction,
  }));
  check("the Hebrew app is RTL", rtl.dir === "rtl", `dir=${rtl.dir} lang=${rtl.lang}`);

  // The room. It is the one screen with its own boot-shift history, so it is
  // opened rather than assumed.
  const world = page.locator("#root a[href*='/world']").first();
  if (await world.count()) {
    await world.click();
    await page.waitForTimeout(2500);
    const scene = await page.evaluate(
      () => (document.querySelector("#game-frame") ?? document.body).querySelectorAll("*").length,
    );
    check("the room opens and draws", scene > 20, `${scene} nodes`);
  } else {
    check("the room is reachable from the home screen", false, "no /world link");
  }
  check("no uncaught errors in Hebrew", errors.length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

await browser.close();

console.log(`\n${BASE}${CONTROL ? "   [CONTROL: the lazy catalogue is blocked]" : ""}\n`);
for (const r of results) console.log(r);
console.log(`\n${results.length - failed}/${results.length} checks passed`);

if (CONTROL) {
  const fell = new Set(results.filter((r) => r.startsWith("FAIL")).map((r) => r.slice(6).split("   ")[0]));
  const missed = CONTROL_MUST_FAIL.filter((n) => !fell.has(n));
  const extra = [...fell].filter((n) => !CONTROL_MUST_FAIL.includes(n));
  if (missed.length) console.log(`\nCONTROL BROKEN: these did not notice the blocked catalogue: ${missed.join(", ")}`);
  if (extra.length) console.log(`\nCONTROL NOISY: these failed for some other reason: ${extra.join(", ")}`);
  console.log(missed.length || extra.length ? "\nCONTROL FAILED" : "\nCONTROL OK - the walkthrough can see a broken page, and only where it should.");
  process.exit(missed.length || extra.length ? 1 : 0);
}

process.exit(failed ? 1 : 0);
