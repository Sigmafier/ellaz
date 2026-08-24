/**
 * Every prize box sits on the extension of a real row or column.
 *
 * This is the gate for the defect the operator reported on 2026-08-24 as the
 * boxes being "diagonal". The complaint was right and it was about the rules,
 * not the picture: the four padlocks sat at the CORNERS, and a corner touches
 * the board at a single point - no row and no column runs through it - so no
 * word could ever have reached one. Four of twelve prizes were unreachable by
 * construction, and nothing in the repo could say so.
 *
 * The positive control matters more than the assertion here. Every check below
 * passes vacuously over an empty list, and a checker that says "in line" to
 * everything passes them all too, so the suite proves `lineOf` can REFUSE
 * before it is allowed to report that nothing was refused.
 */
import { describe, expect, it } from "vitest";
import { SIZE } from "./logic";
import { BOXES, BOX_RADIUS, lineOf, sideOf, type PrizeBox } from "./boxes";

const at = (row: number, col: number): PrizeBox => ({ art: "gem", row, col });
const key = (b: PrizeBox) => `${b.row},${b.col}`;

describe("the rule can refuse", () => {
  it("calls all four corners unreachable", () => {
    for (const [r, c] of [[-1, -1], [-1, SIZE], [SIZE, -1], [SIZE, SIZE]]) {
      expect(lineOf(at(r, c)), `corner ${r},${c} was accepted`).toBeNull();
    }
  });

  it("names the line for a box on an edge, so a pass is not silence", () => {
    expect(lineOf(at(-1, 3))).toBe("column 3");
    expect(lineOf(at(3, SIZE))).toBe("row 3");
  });
});

describe("every shipped box", () => {
  it("is on a real row or column", () => {
    const stranded = BOXES.filter((b) => lineOf(b) === null).map(key);
    expect(stranded, `unreachable by any word: ${stranded.join(" | ")}`).toEqual([]);
  });

  it("is in the RING, never on a board square", () => {
    const onBoard = BOXES.filter(
      (b) => b.row >= 0 && b.row < SIZE && b.col >= 0 && b.col < SIZE,
    ).map(key);
    expect(onBoard, `taking a square the board needs: ${onBoard.join(" | ")}`).toEqual([]);
  });

  it("has the ring to itself - no two boxes in one cell", () => {
    expect(new Set(BOXES.map(key)).size).toBe(BOXES.length);
  });

  /**
   * AND NO TWO ARE NEIGHBOURS. Since 2026-08-25 a box is a square a tile goes
   * on, so this stopped being tidiness and became a rule: the reason a word
   * cannot run ALONG the ring is that the cells either side of a box are dead
   * for ever, and a run stops at an empty square. Two boxes side by side would
   * be a two-letter word laid entirely in the ring, touching no board square
   * and collecting two prizes for it. `logic.ts`'s `PLAYABLE` says this
   * assumption out loud; this is the assertion under it.
   */
  it("has no two boxes side by side", () => {
    const touching: string[] = [];
    for (const a of BOXES) for (const b of BOXES) {
      if (a === b) continue;
      if (Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1) touching.push(`${key(a)} / ${key(b)}`);
    }
    expect(touching, `adjacent in the ring: ${touching.join(" | ")}`).toEqual([]);
  });

  it("knows which side it is on, and that side has a radius", () => {
    for (const b of BOXES) {
      const side = sideOf(b);
      if (b.row < 0) expect(side).toBe("top");
      else if (b.row >= SIZE) expect(side).toBe("bottom");
      else expect(side).toBe(b.col < 0 ? "left" : "right");
      expect(BOX_RADIUS[side], `no radius for ${side}`).toBeTruthy();
    }
  });
});

describe("the ring is symmetric", () => {
  // Mirrored across both axes, so no corner of the board is luckier than
  // another. It is the same rule the old premium map was built on, and the
  // reason scattered positions read as a diagonal drift in the first place.
  const mirror = (n: number) => (n < 0 || n >= SIZE ? n : SIZE - 1 - n);

  it("reads the same left to right", () => {
    const here = new Set(BOXES.map(key));
    const flipped = BOXES.map((b) => `${b.row},${mirror(b.col)}`);
    expect([...flipped].filter((k) => !here.has(k))).toEqual([]);
  });

  it("reads the same top to bottom", () => {
    const here = new Set(BOXES.map(key));
    const flipped = BOXES.map((b) => `${mirror(b.row)},${b.col}`);
    expect([...flipped].filter((k) => !here.has(k))).toEqual([]);
  });

  it("puts the same number on each edge as its opposite", () => {
    const on = (f: (b: PrizeBox) => boolean) => BOXES.filter(f).length;
    expect(on((b) => b.row < 0)).toBe(on((b) => b.row >= SIZE));
    expect(on((b) => b.col < 0)).toBe(on((b) => b.col >= SIZE));
  });
});
