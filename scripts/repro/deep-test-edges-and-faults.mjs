#!/usr/bin/env node
/**
 * THE INPUTS AND THE FAILURES NOBODY SENDS ON PURPOSE.
 * ===========================================================================
 *
 * `deep-test-every-game.mjs` asks whether the happy path works. This asks what
 * the shell does with a profile it did not write, a locale it has eleven of,
 * a storage API that throws, an analytics host an ad blocker ate, and a lazy
 * chunk that never arrives.
 *
 * Written 2026-09-07 beside the layout-shift work, because that change made
 * the home screen read the PROFILE synchronously to decide how many slots to
 * hold - which turns every odd profile into a rendering input for the first
 * time. A stale id, a corrupt record and a twenty-game history are now three
 * ways to get the wrong number of boxes, and none of them is reachable from a
 * fresh browser.
 *
 *   node deep-test-edges-and-faults.mjs <base>
 *
 * Every cell names the fault it injects and what must survive it. Cells that
 * inject a fault assert the SHELL still works - never that the fault is
 * absent, which is a different and much easier question.
 */

import { chromium } from "playwright";

const BASE = (process.argv[2] ?? "https://ellaz.fun").replace(/\/$/, "");
const LOCALES = ["en", "he", "es", "pt", "fr", "de", "ar", "it", "ru", "tr", "id"];
const RTL = new Set(["he", "ar"]);

let failed = 0;
const out = [];
// PRINTED AS IT HAPPENS, not collected and shown at the end. The first version
// buffered, and one timeout in the last cell threw away eleven results that had
// already been established - which reads exactly like a harness that never ran.
const check = (name, ok, detail = "") => {
  const line = `${ok ? "PASS" : "FAIL"}  ${name}${detail ? `   ${detail}` : ""}`;
  out.push(line);
  console.log(line);
  if (!ok) failed++;
};
// One cell falling over must not take the others with it: the point of a
// fault-injection suite is the cells that DID run.
const cell = async (name, fn) => {
  try { await fn(); } catch (e) { check(name, false, String(e).split("\n")[0].slice(0, 120)); }
};

const browser = await chromium.launch();

// ── PREFLIGHT · is the site even up ────────────────────────────────────────
//
// EVERY cell below injects a fault and then asserts the shell survived it. A
// shell that was never up survives nothing, and each cell reports its own
// specific-sounding failure about profiles and locales - which is how this
// harness spent a run describing eight imaginary defects while ellaz.fun was
// serving an index.html naming two chunks that 404ed (2026-09-07, a dropped
// FTP upload). Read cold, "a retired game reserves no slot: 0 slots" is a
// finding about the code. It was a finding about the host.
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const missing = [];
  page.on("response", (r) => r.status() >= 400 && missing.push(`${r.status()} ${r.url().split("/").pop()}`));
  await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 45_000 });
  const up = await page
    .waitForSelector("#root a[href*='/games/']", { timeout: 25_000 })
    .then(() => true)
    .catch(() => false);
  await ctx.close();
  if (!up || missing.length) {
    console.log(`ABORT: ${BASE} is not serving a working app right now.`);
    console.log(missing.length ? `  requests that failed: ${missing.join(", ")}` : "  the app never mounted.");
    console.log("  Every cell below would fail, and each would describe a defect that is not there.");
    await browser.close();
    process.exit(2);
  }
}

/** A page with whatever storage and routing this cell wants, already mounted. */
async function shell({ storage = {}, breakStorage = false, block = null, path = "/" } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 900 } });
  const errors = [];
  if (Object.keys(storage).length) {
    await ctx.addInitScript((kv) => {
      for (const [k, v] of Object.entries(kv)) {
        try { localStorage.setItem(k, v); } catch { /* the blocked-storage cell */ }
      }
    }, storage);
  }
  if (breakStorage) {
    // What a browser set to block site data actually does: the accessor itself
    // throws. Not an empty store - a throwing one.
    await ctx.addInitScript(() => {
      const boom = () => { throw new DOMException("blocked", "SecurityError"); };
      for (const name of ["localStorage", "sessionStorage"]) {
        Object.defineProperty(window, name, { configurable: true, get: boom });
      }
    });
  }
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 130)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 130)));
  if (block) await page.route(block, (r) => r.abort());
  await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 45_000 });
  await page.waitForSelector("#root a[href*='/games/']", { timeout: 25_000 }).catch(() => {});
  await page.waitForTimeout(2500);
  return { ctx, page, errors };
}

const railSlots = (page) =>
  page.evaluate(() => {
    const rails = [...document.querySelectorAll("#root .ellaz-rail")];
    // The keep-playing rail, not the category rail: the category rail's chips
    // all carry aria-pressed and the keep-playing cards never do.
    const r = rails.find((x) => !x.querySelector("[aria-pressed]"));
    return r ? r.children.length : 0;
  });

const profile = (games) => JSON.stringify({ v: 1, coins: 7, games });

// ── C1 · a profile the app did not write ───────────────────────────────────
{
  // A game that has LEFT the roster still sits in a returning player's profile
  // forever, and findEntry will never resolve it. It must reserve nothing.
  const { ctx, page, errors } = await shell({
    storage: { "ellaz:profile:v1": profile({
      snake: { lastPlayedAt: 3e12, stars: 1 },
      sortsize: { lastPlayedAt: 4e12, stars: 3 },      // deleted 2026-08-14
      "not-a-game-at-all": { lastPlayedAt: 5e12, stars: 0 },
    }) },
  });
  const n = await railSlots(page);
  check("a retired game reserves no slot", n === 1, `${n} slot(s), expected 1 (snake)`);
  check("  ...and nothing threw", errors.length === 0, errors[0] ?? "");
  await ctx.close();
}
{
  // Twenty games played. The rail is capped, and the cap must apply to the
  // SLOTS, not only to the cards - a cap applied after the lookup would let the
  // rail grow from four to twenty as the catalogue arrived.
  const many = Object.fromEntries(
    ["snake","memory","2048","math","maze","sudoku","match3","merge","fit","flow",
     "frog","fruit","hidden","jigsaw","letters","music","pet","sort","spell","vanish"]
      .map((id, i) => [id, { lastPlayedAt: 3e12 + i, stars: 0 }]),
  );
  const { ctx, page, errors } = await shell({ storage: { "ellaz:profile:v1": profile(many) } });
  const n = await railSlots(page);
  check("twenty games played, the rail stays capped", n > 0 && n <= 6, `${n} slot(s)`);
  check("  ...and nothing threw", errors.length === 0, errors[0] ?? "");
  await ctx.close();
}
{
  // A record migrateProfile has to salvage rather than throw on.
  const { ctx, page, errors } = await shell({
    storage: { "ellaz:profile:v1": '{"v":1,"coins":"lots","games":{"snake":{"lastPlayedAt":"yesterday"}}' },
  });
  const tiles = await page.locator("#root a[aria-label][href*='/games/']").count();
  check("a corrupt profile still renders the catalogue", tiles >= 40, `${tiles} tiles`);
  check("  ...and nothing threw", errors.length === 0, errors[0] ?? "");
  await ctx.close();
}

// ── C1 · every language the interface speaks ───────────────────────────────
for (const loc of LOCALES) {
  const { ctx, page, errors } = await shell({ storage: { "ellaz:locale": loc } });
  const state = await page.evaluate(() => ({
    dir: document.documentElement.dir || getComputedStyle(document.body).direction,
    tiles: document.querySelectorAll("#root a[aria-label][href*='/games/']").length,
    // The header row grows with the language list; this repo has a rule about it.
    overflow: (() => {
      const s = document.querySelector("#root .ellaz-scroll");
      return s ? s.scrollWidth - s.clientWidth : 0;
    })(),
  }));
  const wantRtl = RTL.has(loc);
  check(
    `${loc}: renders, correct direction, no sideways scroll`,
    state.tiles >= 40 && (state.dir === "rtl") === wantRtl && state.overflow <= 1 && errors.length === 0,
    `dir=${state.dir} tiles=${state.tiles} overflow=${state.overflow}px ${errors[0] ?? ""}`,
  );
  await ctx.close();
}

// ── C6 · faults at real boundaries ─────────────────────────────────────────
{
  // A browser set to block site data: the accessor THROWS. Every read in this
  // app is meant to be wrapped; this is the cell that proves it.
  const { ctx, page, errors } = await shell({ breakStorage: true });
  const tiles = await page.locator("#root a[aria-label][href*='/games/']").count();
  check("storage that throws: the home page still works", tiles >= 40, `${tiles} tiles`);
  if (tiles) {
    await page.locator("#root a[aria-label][href*='/games/']").first().click();
    await page.waitForLoadState("load");
    await page.waitForTimeout(3000);
    const nodes = await page.evaluate(
      () => (document.querySelector("#game-frame") ?? document.body).querySelectorAll("*").length);
    check("storage that throws: a game still opens and mounts", nodes > 20, `${nodes} nodes`);
  }
  check("  ...and nothing threw", errors.length === 0, errors[0] ?? "");
  await ctx.close();
}
{
  // An ad blocker. Analytics failing must never reach the player.
  const { ctx, page, errors } = await shell({ block: /googletagmanager|google-analytics/ });
  const tiles = await page.locator("#root a[aria-label][href*='/games/']").count();
  // A blocked request logs a console error of its own; only OUR errors count.
  const ours = errors.filter((e) => !/ERR_FAILED|net::|Failed to load resource/i.test(e));
  check("analytics blocked: the catalogue is unaffected", tiles >= 40, `${tiles} tiles`);
  check("analytics blocked: nothing of ours threw", ours.length === 0, ours[0] ?? "");
  await ctx.close();
}
{
  // The lazy catalogue never arrives. The grid must still hold every slot -
  // that is what the roster of ids is FOR.
  const { ctx, page, errors } = await shell({ block: /\/assets\/meta-rest-/ });
  const held = await page.evaluate(() =>
    document.querySelectorAll("#root a[aria-label][href*='/games/'], #root div[aria-hidden][style*='aspect-ratio']").length);
  check("the catalogue never arrives: the grid still holds its slots", held >= 40, `${held} slots`);
  await ctx.close();
}

// ── C7 · a session that plays three games and comes back ───────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 900, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 130)));
  const seen = [];
  for (const id of ["snake", "memory", "sudoku"]) {
    await page.goto(`${BASE}/games/${id}/`, { waitUntil: "load" });
    await page.waitForTimeout(2500);
    const box = await page.locator("#game-frame, #root").first().boundingBox();
    if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.6);
    await page.waitForTimeout(900);
    seen.push(id);
  }
  await page.goto(`${BASE}/`, { waitUntil: "load" });
  const came = await page
    .waitForSelector("#root a[href*='/games/']", { timeout: 25_000 })
    .then(() => true)
    .catch(() => false);
  if (!came) {
    const seenText = await page.evaluate(() => ({
      title: document.title,
      root: (document.querySelector("#root")?.innerHTML ?? "").length,
      doc: Boolean(document.querySelector("#home-doc")),
      body: (document.body.textContent ?? "").replace(/\s+/g, " ").slice(0, 160),
      sw: Boolean(navigator.serviceWorker?.controller),
    }));
    check("after three games, the home screen comes back", false, JSON.stringify(seenText));
  }
  await page.waitForTimeout(2500);
  const hrefs = await page.evaluate(() => {
    const rails = [...document.querySelectorAll("#root .ellaz-rail")];
    const r = rails.find((x) => !x.querySelector("[aria-pressed]"));
    return r ? [...r.querySelectorAll("a")].map((a) => a.getAttribute("href")) : [];
  });
  check(
    "three games played, all three come back on the keep-playing rail",
    seen.every((id) => hrefs.some((h) => h?.includes(`/games/${id}/`))),
    hrefs.join(" ") || "(rail empty)",
  );
  check("  ...and nothing threw across the whole session", errors.length === 0, errors[0] ?? "");
  await ctx.close();
}

await browser.close();
console.log(`\n${BASE}\n`);
for (const line of out) console.log(line);
console.log(`\n${out.length - failed}/${out.length} checks passed`);
process.exit(failed ? 1 : 0);
