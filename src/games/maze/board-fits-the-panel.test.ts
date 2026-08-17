import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { DIFFICULTIES, LEVELS } from "./logic";

/**
 * The maze's cell cap times its widest board must clear the desktop panel.
 *
 * `game-panel-clears-widest-board.test.ts` reads every game's `min(...)` px
 * ceilings and compares them against `.ellaz-game-panel`'s 700px cap. It is
 * blind to this game by construction: maze sizes a CELL, not a board, so the
 * number it reads is one square and the board is that many times wider. It
 * reported 76 while the board was 8 x 76 = 608, and it would go on reporting 76
 * at any board size - the exact "instrument that cannot represent the thing it
 * is looking for" shape as
 * `.claude/rules/a-diagnostic-that-truncates-what-it-compares.md`.
 *
 * That blindness cost nothing while the widest board was seven cells. The
 * expert board is TEN, and 10 x 76 = 760px against the 684px the panel leaves -
 * an oversized board does not throw or spill, it grows a scrollbar inside a
 * play surface that is `overflow: auto`, which reads as "this game is a bit
 * awkward on desktop" rather than as a regression anybody files.
 *
 * So the cap is 64 now, and this asserts the arithmetic that makes 64 the right
 * number rather than a taste. It reads BOTH sides - the literal out of the
 * renderer and the cap out of the shipped stylesheet - so neither can move
 * without the other being checked against it.
 */

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SRC = readFileSync(join(ROOT, "games", "maze", "MazeGame.tsx"), "utf8");
const CSS = readFileSync(join(ROOT, "ui", "global.css"), "utf8");

/** GameChrome's own padding, both sides - the width the board cannot use. */
const PANEL_PADDING = 8 * 2;

/** The px ceiling of the cell expression, read out of the renderer. */
function cellCap(src: string): number | null {
  const m = src.match(/const cell = `min\([^`]*?(\d+(?:\.\d+)?)px\)`/);
  return m ? parseFloat(m[1]) : null;
}

/** `.ellaz-game-panel`'s max-width, read out of the shipped stylesheet. */
function panelCap(css: string): number | null {
  const m = css.match(/\.ellaz-game-panel\s*\{[^}]*?max-width:\s*(\d+)px/);
  return m ? parseInt(m[1], 10) : null;
}

describe("the maze board fits the desktop panel", () => {
  it("finds both numbers at all", () => {
    // Non-vacuity first. Every assertion below passes on a null it never
    // noticed, and a matcher that stops matching is the failure this whole file
    // is about.
    expect(cellCap(SRC), "no px cap in MazeGame's cell expression").toBeGreaterThan(0);
    expect(panelCap(CSS), "no max-width on .ellaz-game-panel").toBeGreaterThan(0);
  });

  it("leaves the widest board room to lie flat", () => {
    const widest = Math.max(...DIFFICULTIES.map((d) => LEVELS[d].size));
    const board = widest * cellCap(SRC)!;
    const usable = panelCap(CSS)! - PANEL_PADDING;
    expect(
      board,
      `${widest} cells at ${cellCap(SRC)}px is a ${board}px board, panel leaves ${usable}px`,
    ).toBeLessThanOrEqual(usable);
  });

  it("knows which level is the widest", () => {
    // Pins the input, so a level added at 12 cells has to walk past this line
    // rather than quietly making the assertion above about a board nobody plays.
    expect(Math.max(...DIFFICULTIES.map((d) => LEVELS[d].size))).toBe(LEVELS.expert.size);
  });

  it("the matcher reads a cap it is given, and reports one it is not", () => {
    // The control, in both directions - see the rule file named above.
    expect(cellCap('const cell = `min(${x}vw, ${y}vh, 64px)`;')).toBe(64);
    expect(cellCap("const cell = `min(8vw, 8vh)`;")).toBeNull();
    expect(panelCap(".ellaz-game-panel { max-width: 700px }")).toBe(700);
    expect(panelCap(".ellaz-game-panel { padding: 8px }")).toBeNull();
  });
});
