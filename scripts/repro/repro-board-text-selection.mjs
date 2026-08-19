#!/usr/bin/env node
/**
 * Reproducer — text selection over a game board, found 2026-08-19.
 *
 * RUNNABLE, and it asserts. Against a served production build:
 *
 *     npm run build && npm run preview &
 *     node scripts/repro/repro-board-text-selection.mjs http://localhost:5180
 *
 * Exits 1 if either defect comes back. It needs `playwright` and a browser,
 * which this repo does not depend on, so it is a repro rather than a gate —
 * `src/portal/selection-dismiss.test.ts` is the part that runs in CI, and it
 * pins the stylesheet and the wiring rather than the rendered behaviour.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT REPRODUCES — two defects, and they need different fixes
 *
 * Reported as "sometimes it selects mid game". Measured on the built artifact
 * at 390px, on /games/sudoku/, before and after:
 *
 *                                              before            after
 *   double-click the prose (CONTROL)           "old"             "old"
 *   double-click / drag the board              ""                ""
 *   DRAG ACROSS THE CHROME HEADER              "Level\nHard\n5/6"  ""
 *   highlight the prose, pointerdown on board  the whole para    ""
 *
 * 1. `user-select: none` sat on `.ellaz-play-surface`, which is only the
 *    BOARD. The level toggle, the stat row and the footer are siblings of that
 *    box, so a drag over them selected their text — 30% of the panel, directly
 *    above where a player's finger already is. Fixed by moving the rule up to
 *    `.ellaz-game-stage`, GameHost's mount, which contains all of it.
 *
 * 2. A selection made anywhere ELSE — the ~900 words of prose under the frame
 *    on a game page — stayed drawn across the board through every gesture,
 *    because a `user-select: none` region cannot take a selection off a region
 *    that has one. No CSS reaches that. `portal/selectionDismiss.ts` clears it
 *    on the first pointer down on the board.
 *
 * ---------------------------------------------------------------------------
 * WHY THE CONTROL IS THE LOAD-BEARING ROW
 *
 * Every assertion here passes when nothing is selectable ANYWHERE — including
 * when the probe simply cannot read a selection, which is the failure mode of
 * a probe rather than of the site. So the prose double-click must come back
 * NON-empty, in the same run, through the same code path. Without it "" is
 * indistinguishable from a broken instrument.
 *
 * WHAT IT CANNOT SEE: `-webkit-user-select` and `-webkit-touch-callout`.
 * Chromium reads the unprefixed property and has no callout, so this probe is
 * green with or without those two lines. They exist for iOS Safari before 17,
 * which is not what runs here. Do not read a green run as evidence for them.
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:5180";
// The slug is `meta.id`, never the directory name: `src/games/n2048/` publishes
// at `/games/2048/`, so `/games/n2048/` is a 404 that serves the app shell -
// which has no `.ellaz-play-surface`, so this reads as a 30 s timeout rather
// than as a missing page. Green on sudoku, match3, blocks, snake, memory, 2048
// and minesweeper on 2026-08-19.
const PATH = process.argv[3] ?? "/games/sudoku/";
const EXE = process.env.CHROMIUM_PATH; // unset = playwright's own download

const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
await page.goto(`${BASE}${PATH}`, { waitUntil: "domcontentloaded" });
// Wait for the BOARD, not for the network. The game mounts long before idle —
// in dev, `networkidle` lands ~13 s after it, and every timing read off that
// wait is 13 s of a clock that genuinely started at zero.
await page.waitForSelector(".ellaz-play-surface", { timeout: 30_000 });
await page.waitForTimeout(600);

const selection = () => page.evaluate(() => (window.getSelection()?.toString() ?? "").trim());
const clear = () => page.evaluate(() => window.getSelection()?.removeAllRanges());

/**
 * A rect over the first few CHARACTERS of the first real paragraph - not the
 * paragraph's own box.
 *
 * The obvious version returns `p.getBoundingClientRect()` and double-clicks its
 * centre, which is a coin flip: on a paragraph whose last line is short, the
 * geometric centre lands in the whitespace beside it, the double-click selects
 * nothing, and the CONTROL row reports failure for a reason that has nothing to
 * do with the site. Measured - it passed on /games/sudoku/ and /games/match3/
 * and failed on /games/blocks/, three pages of identical markup.
 *
 * A Range over the opening characters is always on a word.
 */
const PROSE = () => {
  const p = [...document.querySelectorAll("p")].find((n) => (n.textContent ?? "").length > 60);
  if (!p) return null;
  const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
  const node = walker.nextNode();
  if (!node) return null;
  const r = document.createRange();
  r.setStart(node, 0);
  r.setEnd(node, Math.min(4, node.textContent.length));
  const box = r.getBoundingClientRect();
  return box.width > 0 ? box.toJSON() : p.getBoundingClientRect().toJSON();
};
const BOARD = () => {
  const el = document.querySelector(".ellaz-play-surface");
  return el ? el.getBoundingClientRect().toJSON() : null;
};
/** The chrome header — the level toggle and the stat row, above the board. */
const CHROME = () => {
  const panel = document.querySelector(".ellaz-game-panel");
  const head = panel?.firstElementChild;
  return head ? head.getBoundingClientRect().toJSON() : null;
};

async function dblClick(name, find) {
  await clear();
  const box = await page.evaluate(find);
  if (!box) throw new Error(`${name}: nothing to click - the probe is looking at the wrong page`);
  await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(150);
  return selection();
}

async function dragAcross(name, find) {
  await clear();
  const box = await page.evaluate(find);
  if (!box) throw new Error(`${name}: nothing to drag across`);
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 2, y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(120);
  return selection();
}

const rows = [];
const record = (name, want, got) => rows.push({ name, want, got });

record("CONTROL prose double-click", "non-empty", await dblClick("prose", PROSE));
record("board double-click", "empty", await dblClick("board", BOARD));
record("board drag", "empty", await dragAcross("board", BOARD));
record("chrome header drag", "empty", await dragAcross("chrome", CHROME));

// Defect 2: a highlight made outside, then one pointer down on the board.
const before = await page.evaluate(() => {
  const p = [...document.querySelectorAll("p")].find((n) => (n.textContent ?? "").length > 60);
  if (!p) return "";
  const r = document.createRange();
  r.selectNodeContents(p);
  const s = window.getSelection();
  s.removeAllRanges();
  s.addRange(r);
  return (s.toString() ?? "").trim();
});
record("CONTROL prose highlighted", "non-empty", before);
const board = await page.evaluate(BOARD);
await page.mouse.move(board.x + board.width / 2, board.y + board.height / 2);
await page.mouse.down();
await page.waitForTimeout(120);
record("outside highlight, after pointerdown on board", "empty", await selection());
await page.mouse.up();

await browser.close();

let bad = 0;
for (const r of rows) {
  const ok = r.want === "empty" ? r.got === "" : r.got !== "";
  if (!ok) bad++;
  const shown = r.got === "" ? "(nothing)" : JSON.stringify(r.got.slice(0, 60));
  console.log(`${ok ? "ok  " : "FAIL"}  ${r.name} — want ${r.want}, got ${shown}`);
}

if (bad > 0) {
  console.error(`\n${bad} of ${rows.length} rows wrong. A CONTROL row failing means the`);
  console.error("probe cannot read a selection at all - fix that before reading the rest.");
  process.exit(1);
}
console.log(`\nOK  nothing inside a game is selectable, and a stray highlight is dismissed.`);
