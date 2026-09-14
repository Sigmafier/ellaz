import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { PANEL_USABLE } from "@ui/boardSize";
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
 * So the cap is 64, and until 2026-09-14 this asserted it against the panel cap
 * read out of the shipped stylesheet. See below for what it asserts now.
 */

/*
 * 2026-09-14: the panel lost its px cap (`.ellaz-game-panel { max-width: none }`
 * on a PC, operator: "use the entire width of the PC screen"), so the number
 * this file used to read out of `global.css` is gone and its old assertion read
 * `-16px` of usable width. What replaced it is the reason it is safe: on a PC
 * the maze no longer sizes a CELL at all. The whole board is `.ellaz-board`,
 * bounded by the height the window leaves and the width beside the footer
 * column, and a cell is one `1fr` track of it. The 64px cell cap now governs
 * the PHONE arm only.
 *
 * So this asserts both halves: the phone arm's widest board still clears the
 * desktop ceiling every `boardVars` board is held to, and the PC arm really is
 * routed through the policy rather than through the cell cap.
 */
const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SRC = readFileSync(join(ROOT, "games", "maze", "MazeGame.tsx"), "utf8");

/** The px ceiling of the cell expression, read out of the renderer. */
function cellCap(src: string): number | null {
  const m = src.match(/const cell = `min\([^`]*?(\d+(?:\.\d+)?)px\)`/);
  return m ? parseFloat(m[1]) : null;
}

/** Whether the renderer's PC arm is sized by the board policy, not the cell cap. */
function pcArmUsesPolicy(src: string): boolean {
  return (
    /className=\{pc \? `ellaz-play-surface \$\{BOARD_CLASS\}`/.test(src) &&
    /\bboardVars\(\{[^}]*\bratio: 1\b/.test(src) &&
    /gridTemplateColumns: pc \? `repeat\(\$\{size\}, 1fr\)`/.test(src)
  );
}

describe("the maze board fits the desktop panel", () => {
  it("finds the cell cap at all", () => {
    // Non-vacuity first. Every assertion below passes on a null it never
    // noticed, and a matcher that stops matching is the failure this whole file
    // is about.
    expect(cellCap(SRC), "no px cap in MazeGame's cell expression").toBeGreaterThan(0);
  });

  it("the phone arm's widest board clears the desktop ceiling", () => {
    const widest = Math.max(...DIFFICULTIES.map((d) => LEVELS[d].size));
    const board = widest * cellCap(SRC)!;
    expect(
      board,
      `${widest} cells at ${cellCap(SRC)}px is a ${board}px board, the ceiling is ${PANEL_USABLE}px`,
    ).toBeLessThanOrEqual(PANEL_USABLE);
  });

  it("the PC arm is sized by the board policy, not by the cell cap", () => {
    expect(pcArmUsesPolicy(SRC)).toBe(true);
  });

  it("knows which level is the widest", () => {
    // Pins the input, so a level added at 12 cells has to walk past this line
    // rather than quietly making the assertion above about a board nobody plays.
    expect(Math.max(...DIFFICULTIES.map((d) => LEVELS[d].size))).toBe(LEVELS.expert.size);
  });

  it("the matchers read what they are given, and report what they are not", () => {
    // The control, in both directions - see the rule file named above.
    expect(cellCap('const cell = `min(${x}vw, ${y}vh, 64px)`;')).toBe(64);
    expect(cellCap("const cell = `min(8vw, 8vh)`;")).toBeNull();
    // The PC arm with its cell-cap tracks restored must read as NOT routed.
    const reverted = SRC.replace(
      "gridTemplateColumns: pc ? `repeat(${size}, 1fr)`",
      "gridTemplateColumns: pc ? `repeat(${size}, ${cell})`",
    );
    expect(reverted).not.toBe(SRC);
    expect(pcArmUsesPolicy(reverted)).toBe(false);
  });
});
