#!/usr/bin/env node
/**
 * Does a game fill the window it was given, and is a phone untouched?
 *
 *   npm run preview      # or dev on 5180
 *   node scripts/repro/repro-board-fills-the-window.mjs
 *   node scripts/repro/repro-board-fills-the-window.mjs --control
 *
 * WHY THIS READS `offsetWidth` AND NEVER `getBoundingClientRect()`
 *
 * `getBoundingClientRect()` is POST-TRANSFORM. `fitStage` puts a `scale()` on
 * `#game-frame` whenever the mounted game is taller than the stage box, so on
 * any window where it fires a rect reports a number no term of the board's own
 * `min(<n>vw, <n>vh, <cap>px)` can produce - and that number reads exactly like
 * a measurement. Measured 2026-09-13 on the survivors page:
 *
 *     window        min() resolves   layout box   visual rect   #game-frame
 *     1536 x 639         371            371          371        none
 *     1536 x 695         403            403          272        matrix(0.674)
 *
 * A whole session was spent believing the 420px cap was binding because of the
 * second row. It never binds at these sizes. `offsetWidth` is the layout box and
 * is immune to the transform, so the two read together are the discriminator -
 * and this gate prints both on every arm for exactly that reason.
 *
 * WHY IT SWEEPS SEVERAL HEIGHTS
 *
 * The same two rows. At 639 the board fits its box and nothing scales; at 695 it
 * wants 403, no longer fits, and the whole frame is shrunk to 67% - so a TALLER
 * window makes the game VISUALLY SMALLER. A gate pinned to one height would have
 * passed at 639 and never seen it.
 *
 * WHAT IT ASSERTS
 *
 *   desktop   scale must be 1        - the shrink-only safety valve firing on a
 *                                      big screen means the game did not fit
 *   desktop   fill >= 0.90           - the mounted frame must use the height the
 *                                      stage box already gives it
 *   phone     board width == BASELINE - "not harming mobile" is an equality, per
 *                                      game, not a spot check. Baselines are the
 *                                      values today's tree produces; an unset one
 *                                      prints rather than passes.
 *
 * The assertions are expected to FAIL on today's tree. That is the point - a gate
 * first run after a fix cannot be told from a gate that never fires.
 */
import { chromium } from "file:///mnt/c/Users/ytr_o/OneDrive/Desktop/ellaz/studio/node_modules/playwright-core/index.mjs";
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BASE = argOf("--base") ?? "http://localhost:5180";
const CONTROL = process.argv.includes("--control");

/** The population, pinned by the expression each board declares in source.
 *  The expression is asserted, not just used to find the element: if a game's
 *  sizing changes, this gate must say so rather than quietly measure something
 *  else. One canvas game, two DOM boards, one fixed grid. */
const PROVEN = [
  // `chrome` here is DOCUMENTATION and nothing reads it - the live check uses
  // `--b-chrome` off the rendered element. It is corrected rather than deleted
  // because a stale number sitting beside a live one is read as the live one:
  // survivors went 292 -> 183 when the arcade HUD landed and 183 -> 16 when the
  // entrance screen took the last three rows off the panel.
  { id: "survivors", path: "/games/survivors/", expr: "min(92vw, 58vh, 420px)", phone: 359, chrome: 16 },
  { id: "match3", path: "/games/match3/", expr: "min(92vw, 54vh, 480px)", phone: 359, chrome: 230 },
  { id: "sudoku", path: "/games/sudoku/", expr: "min(94vw, 44vh, 440px)", phone: 367, chrome: 259 },
  { id: "2048", path: "/games/2048/", expr: "min(88vw, 48vh, 420px)", phone: 343, chrome: 187 },
];

/* EVERY GAME, read off the tree - never a hand list (2026-09-14).
 *
 * The four above were the proving population when the policy landed; the other
 * 39 were outside it, so this gate said nothing about the games that were still
 * a fixed box on a PC. The population is now every `src/games/<dir>/meta.ts`,
 * so a game added tomorrow is measured without anyone remembering to list it.
 *
 * An unswept game has no `.ellaz-board` and no single width expression to find,
 * so its phone arm is checked by the FRAME's layout size against a baseline
 * recorded from the tree before the sweep (`--record`). That is a coarser
 * equality than a board width, and it is the one that exists for all 43. */
const GAMES_DIR = fileURLToPath(new URL("../../src/games/", import.meta.url));
const BASELINE_FILE = fileURLToPath(new URL("./board-phone-baseline.json", import.meta.url));
const RECORD = process.argv.includes("--record");
const ONLY = argOf("--only")?.split(",");
const baseline = existsSync(BASELINE_FILE) ? JSON.parse(readFileSync(BASELINE_FILE, "utf8")) : {};
const ids = readdirSync(GAMES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(`${GAMES_DIR}${d.name}/meta.ts`))
  .map((d) => readFileSync(`${GAMES_DIR}${d.name}/meta.ts`, "utf8").match(/^\s*id:\s*"([^"]+)"/m)?.[1])
  .filter(Boolean)
  .sort();
if (ids.length < 40) throw new Error(`read only ${ids.length} game ids from ${GAMES_DIR} - refusing to measure a partial population`);
const GAMES = ids
  .map((id) => PROVEN.find((g) => g.id === id) ?? { id, path: `/games/${id}/`, expr: null, phone: null })
  .filter((g) => !ONLY || ONLY.includes(g.id));

const VIEWPORTS = [
  { name: "phone 390x844", w: 390, h: 844, kind: "phone" },
  { name: "pc 1536x639", w: 1536, h: 639, kind: "desktop" }, // the operator's own window
  { name: "pc 1536x695", w: 1536, h: 695, kind: "desktop" }, // where fitStage fires today
  { name: "pc 1920x1080", w: 1920, h: 1080, kind: "desktop" }, // the fullscreen geometry
];

const FILL_FLOOR = 0.9;

function argOf(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

/** Read everything in one pass, in the page, so a single layout serves them all. */
function probe(expectedExpr) {
  const norm = (s) => String(s).replace(/\s+/g, " ").trim();

  const frame = document.getElementById("game-frame");
  const box = document.querySelector(".stage .box");
  if (!frame || !box) return { error: "no #game-frame or .stage .box on this page" };

  /* A swept game carries `.ellaz-board` and declares its numbers as custom
   * properties; an unswept one still inlines `min(...)`. Both are found, so this
   * gate keeps measuring the whole population THROUGH the sweep rather than
   * going quietly blind to every game it has already converted - which is the
   * failure `a-path-filter-is-a-hand-kept-mirror-of-an-import-graph.md` names. */
  let board = frame.querySelector(".ellaz-board");
  let declaredChrome = null;
  if (board) {
    declaredChrome = Math.round(parseFloat(getComputedStyle(board).getPropertyValue("--b-chrome")));
  } else if (!expectedExpr) {
    return { unswept: true, frameLayoutW: frame.offsetWidth, frameLayoutH: frame.offsetHeight };
  } else {
    const candidates = [...frame.querySelectorAll("[style*='min(']")].map((el) => ({
      el,
      width: norm(el.style.width || ""),
    }));
    const hit = candidates.find((c) => c.width === norm(expectedExpr));
    if (!hit) {
      return {
        error: "no .ellaz-board, and no element declares the expected width",
        expected: norm(expectedExpr),
        saw: candidates.map((c) => c.width).filter(Boolean).slice(0, 8),
      };
    }
    board = hit.el;
  }

  // What does each term resolve to right now? Printed so "it did not grow" has
  // an answer rather than a guess.
  const p = document.createElement("div");
  p.style.position = "absolute";
  p.style.visibility = "hidden";
  document.body.appendChild(p);
  const term = (v) => {
    p.style.width = v;
    return Math.round(parseFloat(getComputedStyle(p).width));
  };
  const m = norm(expectedExpr ?? "").match(/min\(([\d.]+)vw,\s*([\d.]+)vh,\s*([\d.]+)px\)/);
  const terms = m
    ? { vw: term(`${m[1]}vw`), vh: term(`${m[2]}vh`), cap: Number(m[3]) }
    : { vw: NaN, vh: NaN, cap: NaN };
  p.remove();
  const binds = Object.entries(terms).sort((a, b) => a[1] - b[1])[0]?.[0] ?? "?";

  const tf = getComputedStyle(frame).transform;
  const scale = tf === "none" ? 1 : Number((tf.match(/matrix\(([\d.]+)/) ?? [, "1"])[1]);

  /* `box.clientHeight` IS NOT THE ROOM THE PAGE GIVES THE GAME, and reading it as
   * such made this gate report its worst arm as a pass. Below MIN_SCALE, fitStage
   * gives up and writes `height: auto` on the box, which then grows to whatever
   * the frame needs and lets the page scroll. So a game hanging 267 px below the
   * fold measures a box exactly as tall as itself: fill 100%, scale 1, green.
   *
   * Two reads fix it. `released` is the give-up itself - on a desktop it means the
   * game did not fit the screen, which is the whole defect. `availH` resolves the
   * stylesheet's own calc, so it is the height the box WOULD have, transform or no
   * transform, and it is what fill must be measured against. */
  const released = box.style.height === "auto";
  const q = document.createElement("div");
  q.style.position = "absolute";
  q.style.visibility = "hidden";
  q.style.height = "calc(100dvh - var(--hh) - var(--uh) - var(--oh))";
  document.body.appendChild(q);
  const availH = Math.round(parseFloat(getComputedStyle(q).height));
  q.remove();

  return {
    frameLayoutW: frame.offsetWidth,
    boardLayoutW: board.offsetWidth, // the LAYOUT box - immune to the transform
    boardLayoutH: board.offsetHeight,
    boardRectW: Math.round(board.getBoundingClientRect().width), // post-transform
    frameLayoutH: frame.offsetHeight,
    boxH: availH,
    released,
    scale,
    terms,
    binds,
    // RETURNED, which it was not. It was computed above and dropped on the
    // floor, so `arm()` read `undefined` and every arm reported that the page
    // had no `--b-chrome` - while the element carries it plainly
    // (`getPropertyValue("--b-chrome")` -> "183px", verified directly). An
    // instrument that blames its subject for its own omission is the most
    // expensive kind of wrong, because the message sounds like a finding.
    declaredChrome,
  };
}

async function arm(page, game, vp) {
  await page.setViewportSize({ width: vp.w, height: vp.h });
  await page.goto(BASE + game.path, { waitUntil: "load" });
  await page.waitForTimeout(1800); // mount, then let fitStage's rAF settle

  let r = await page.evaluate(probe, game.expr);
  if (r.error) return { ...r, game: game.id, vp: vp.name };
  const sig = `${r.frameLayoutW}x${r.frameLayoutH}`;
  if (r.unswept) {
    const fails = [];
    if (vp.kind === "desktop") fails.push("not on the PC sizing policy - no .ellaz-board, so a PC gets the phone's fixed box");
    else if (!RECORD && baseline[game.id] && baseline[game.id] !== sig) fails.push(`phone frame moved: ${baseline[game.id]} -> ${sig}`);
    return { ...r, game: game.id, vp: vp.name, kind: vp.kind, sig, fails };
  }

  // Two reads 400ms apart must agree, or the page is still settling and every
  // number below belongs to a moment that no longer exists.
  await page.waitForTimeout(400);
  const again = await page.evaluate(probe, game.expr);
  const settled = !again.error && again.boardLayoutW === r.boardLayoutW && again.scale === r.scale;
  r = again.error ? r : again;

  const fill = r.boxH > 0 ? r.frameLayoutH / r.boxH : 0;
  const fails = [];
  if (!settled) fails.push("page had not settled between two reads");
  /* The declared chrome is a number typed into a game and compared against a
   * number the page renders. That is exactly the shape
   * `a-threshold-tuned-against-todays-tree-goes-stale.md` collects: correct the
   * day it was measured, silently wrong the day a row is added, and the symptom
   * is the overflow this whole change exists to remove. So it is asserted, not
   * trusted - 8px of slack for a font or a border, no more. */
  /*
   * THREE STATES, NOT TWO - and this check had two, which is how it sat out the
   * one failure it exists for. A swept board declares `--b-chrome`; reading it
   * back can also FAIL, and `parseFloat("")` is `NaN`. `NaN != null` is true, so
   * the guard ran, and `Math.abs(real - NaN) > 8` is false, so it passed. The
   * error state was indistinguishable from agreement.
   *
   * It cost the real thing: survivors declared 292 while rendering 183 - a
   * 109px gap against an 8px tolerance - and this printed nothing. The board
   * was sized from the stale number and came out a third of the width it had
   * room for. `0` and `NaN` are the permissive values; say so explicitly.
   */
  /*
   * DESKTOP ONLY, because that is where the number is READ. `--b-chrome` feeds
   * the desktop branch's height arithmetic and nothing else; the phone arm is
   * `min(<vw>vw, <vh>vh, <cap>px)` and never consults it.
   *
   * This is scoped rather than relaxed, and the distinction matters: on its
   * first honest run this check caught `match3 declares 294px, renders 319px`
   * at 390x844 - a real 25px gap, because match3's goal bar wraps to a second
   * line on a phone and does not on a desktop. So a game's chrome is not one
   * number across every width. On the phone that gap is INAPPLICABLE (nothing
   * reads the value there), not tolerable - and a check that fires where its
   * subject is unused teaches you to ignore it. It still fires on all three
   * desktop widths, which is every arm the value can actually break.
   */
  if (vp.kind === "desktop" && r.declaredChrome !== null) {
    const real = r.frameLayoutH - r.boardLayoutH;
    if (!Number.isFinite(r.declaredChrome))
      // Names what was OBSERVED and not a cause. The first wording asserted the
      // page was missing the property; the page was fine and this script had
      // dropped it. A refusal may say "I cannot judge" - it may not diagnose.
      fails.push(`no readable chrome reached this check (got ${JSON.stringify(r.declaredChrome)}) - cannot judge, so refusing`);
    else if (Math.abs(real - r.declaredChrome) > 8)
      fails.push(`declares chrome ${r.declaredChrome}px, renders ${real}px - the board is sized from a stale number`);
  }
  if (vp.kind === "desktop") {
    if (r.released)
      fails.push(`too tall to shrink honestly - fitStage gave the height back, so the game runs ${r.frameLayoutH - r.boxH}px below the fold`);
    if (r.scale !== 1) fails.push(`fitStage shrank the frame to ${r.scale} on a big screen`);
    if (fill < FILL_FLOOR) fails.push(`frame fills ${(fill * 100).toFixed(0)}% of its box, floor ${FILL_FLOOR * 100}%`);
    /* The ceiling is not symmetry for its own sake. Without it the only thing
     * catching an OVERSIZED frame is fitStage's reaction to it, so the day the
     * valve is touched a game hanging off the bottom of the screen reads green.
     * My own control passed at 150% before this line existed. */
    if (fill > 1) fails.push(`frame overflows its box by ${r.frameLayoutH - r.boxH}px (fills ${(fill * 100).toFixed(0)}%)`);
  } else if (!RECORD && baseline[game.id] && baseline[game.id] !== sig) {
    fails.push(`phone frame moved: ${baseline[game.id]} -> ${sig}`);
  } else if (game.phone === null) {
    if (!baseline[game.id]) fails.push(`phone baseline unset - today's tree says frame ${sig}, board ${r.boardLayoutW}`);
  } else if (r.boardLayoutW !== game.phone) {
    fails.push(`phone board moved: ${game.phone} -> ${r.boardLayoutW}`);
  }
  return { ...r, game: game.id, vp: vp.name, kind: vp.kind, sig, fill, fails };
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ deviceScaleFactor: 1 });
const page = await ctx.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));

const rows = [];
for (const game of GAMES) for (const vp of VIEWPORTS) rows.push(await arm(page, game, vp));

/* The control proves both verdicts are reachable on this page, on this tree.
 * Without it a gate that is red today is indistinguishable from a gate that is
 * red always - and the second one teaches you to ignore it. */
const control = [];
/* The control must never be able to destroy the measurement. It runs before the
 * print, so an exception here loses all 16 arms and leaves a stack trace where
 * the evidence should be - which is what happened the first time the sweep and
 * this cell disagreed about how to find a board. A broken control is a finding,
 * reported as a failed cell; it is not a reason to have measured nothing. */
if (CONTROL) try {
  const g = PROVEN[0];
  await page.setViewportSize({ width: 1536, height: 639 });
  await page.goto(BASE + g.path, { waitUntil: "load" });
  await page.waitForTimeout(1800);

  // cell 1 - a planted scale must be SEEN (the check is not blind)
  await page.evaluate(() => {
    document.getElementById("game-frame").style.transform = "scale(0.5)";
  });
  const seen = await page.evaluate(probe, g.expr);
  control.push({ cell: "planted scale(0.5) is seen", ok: seen.scale === 0.5, got: seen.scale });

  // cell 2 - a board grown to its box must PASS both checks (they are satisfiable)
  const grown = await page.evaluate((expr) => {
    const f = document.getElementById("game-frame");
    f.style.transform = "";
    const box = document.querySelector(".stage .box");
    const norm = (s) => String(s).replace(/\s+/g, " ").trim();
    // Same two shapes the probe knows about. The first version of this cell
    // looked only for an inline `min(`, so the moment the sweep converted this
    // very game the control threw - and took the whole measurement table with
    // it, because it runs before the print.
    const board =
      f.querySelector(".ellaz-board") ??
      [...f.querySelectorAll("[style*='min(']")].find((el) => norm(el.style.width) === norm(expr));
    if (!board) return false;
    const chrome = f.offsetHeight - board.offsetHeight;
    const aspect = board.offsetWidth / board.offsetHeight;
    /* Target the height the stylesheet gives the box, never `box.clientHeight` -
     * on this arm the box is RELEASED and reports the frame's own height, so
     * sizing against it grows the board to fit a box the board just defined.
     * Leave fitStage's 16px gutter plus slack, or the valve fires and the cell
     * fails for a reason that has nothing to do with what it is testing. */
    const q = document.createElement("div");
    q.style.position = "absolute";
    q.style.visibility = "hidden";
    q.style.height = "calc(100dvh - var(--hh) - var(--uh) - var(--oh))";
    document.body.appendChild(q);
    const availH = Math.round(parseFloat(getComputedStyle(q).height));
    q.remove();
    box.style.height = "";
    board.style.width = `${Math.floor((availH - chrome - 24) * aspect)}px`;
    return true;
  }, g.expr);
  await page.waitForTimeout(600);
  const after = await page.evaluate((expr) => {
    const f = document.getElementById("game-frame");
    const tf = getComputedStyle(f).transform;
    const q = document.createElement("div");
    q.style.position = "absolute";
    q.style.visibility = "hidden";
    q.style.height = "calc(100dvh - var(--hh) - var(--uh) - var(--oh))";
    document.body.appendChild(q);
    const availH = Math.round(parseFloat(getComputedStyle(q).height));
    q.remove();
    return {
      fill: f.offsetHeight / availH,
      released: document.querySelector(".stage .box").style.height === "auto",
      scale: tf === "none" ? 1 : Number((tf.match(/matrix\(([\d.]+)/) ?? [, "1"])[1]),
    };
  }, g.expr);
  control.push({
    cell: "a board grown to its box passes every desktop check",
    ok: grown && after.scale === 1 && !after.released && after.fill >= FILL_FLOOR && after.fill <= 1,
    got: `fill ${(after.fill * 100).toFixed(0)}% scale ${after.scale} released ${after.released}`,
  });
} catch (e) {
  control.push({ cell: "the control cells ran at all", ok: false, got: String(e).slice(0, 140) });
}

await browser.close();

console.log(`\npopulation: ${GAMES.length} games x ${VIEWPORTS.length} viewports = ${rows.length} arms, base ${BASE}`);
console.log(
  "  game        viewport         binds  layoutW  rectW  boardH  chrome  frameH   boxH   fill  scale",
);
for (const r of rows) {
  if (r.error) {
    console.log(`  ${r.game.padEnd(11)} ${r.vp.padEnd(16)} ERROR ${r.error}${r.saw ? " saw " + JSON.stringify(r.saw) : ""}`);
    continue;
  }
  if (r.unswept) {
    console.log(`  ${r.game.padEnd(11)} ${r.vp.padEnd(16)} UNSWEPT frame ${r.sig}`);
    continue;
  }
  console.log(
    `  ${r.game.padEnd(11)} ${r.vp.padEnd(16)} ${r.binds.padEnd(6)} ` +
      `${String(r.boardLayoutW).padStart(7)} ${String(r.boardRectW).padStart(6)} ` +
      `${String(r.boardLayoutH).padStart(6)} ${String(r.frameLayoutH - r.boardLayoutH).padStart(7)} ` +
      `${String(r.frameLayoutH).padStart(6)} ${String(r.boxH).padStart(6)} ` +
      `${(r.fill * 100).toFixed(0).padStart(5)}% ${String(r.scale).padStart(6)}` +
      (r.released ? "  RELEASED - page scrolls" : ""),
  );
}

if (RECORD) {
  const phone = Object.fromEntries(rows.filter((r) => r.kind === "phone" && r.sig).map((r) => [r.game, r.sig]));
  writeFileSync(BASELINE_FILE, JSON.stringify({ ...baseline, ...phone }, null, 2) + "\n");
  console.log(`\nrecorded ${Object.keys(phone).length} phone frame baselines -> ${BASELINE_FILE}`);
}
const swept = new Set(rows.filter((r) => !r.unswept && !r.error).map((r) => r.game));
console.log(`on the PC policy: ${swept.size} of ${GAMES.length} games`);

const bad = rows.filter((r) => r.error || (r.fails && r.fails.length));
console.log(`\nfailures: ${bad.length} of ${rows.length} arms`);
for (const r of bad) {
  for (const f of r.error ? [r.error] : r.fails) console.log(`  ${r.game} @ ${r.vp}: ${f}`);
}

if (CONTROL) {
  console.log("\ncontrol:");
  for (const c of control) console.log(`  ${c.ok ? "OK  " : "FAIL"} ${c.cell}  (${c.got})`);
}
console.log("page errors: " + (pageErrors.length ? pageErrors[0] : "none"));

process.exit(bad.length || control.some((c) => !c.ok) ? 1 : 0);
