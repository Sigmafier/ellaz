/**
 * Lettercross - the prize boxes around the board, as data and one rule.
 *
 * NO DOM, NO React: this says WHERE a box may sit and what that means, and
 * `Lettercross.tsx` says what one looks like. Splitting them is what lets
 * `boxes-are-in-line.test.ts` run the real rule rather than read the source
 * for it.
 */
import { SIZE } from "./logic";

export type BoxArt = "gem" | "star" | "leaf" | "bell" | "drop" | "lock";

/**
 * WHERE A BOX MAY SIT, and this is a rule rather than a taste.
 *
 * A box is addressed in BOARD coordinates: -1 is the ring above or left of the
 * board, SIZE is the ring below or right of it. Every box must therefore have
 * one coordinate inside 0..SIZE-1, which is what puts it on the extension of a
 * real row or column - so a word running down that line arrives at it.
 *
 * A CORNER box does not. At (-1, -1) it touches the board at a single POINT:
 * no row and no column passes through it, so no word can ever reach one. Four
 * padlocks sat there until 2026-08-24 and read to the operator as "diagonal",
 * which was the right complaint about the right thing - it was a rules defect
 * wearing a layout one. They are capped onto columns 0 and SIZE-1 instead,
 * where they finish the top and bottom lines. `boxes-are-in-line.test.ts`
 * refuses any box that is on neither.
 */
export type BoxSide = "top" | "bottom" | "left" | "right";
export type PrizeBox = {
  readonly art: BoxArt;
  readonly row: number;
  readonly col: number;
  /** Printed on a padlock. Nothing reads it yet - the rule arrives in step 2. */
  readonly value?: number;
};

/** The two prize columns, mirrored across the board so no corner is luckier. */
const EDGE_A = Math.round((SIZE - 1) * 0.3);
const EDGE_B = SIZE - 1 - EDGE_A;

export const BOXES: readonly PrizeBox[] = [
  { art: "lock", row: -1, col: 0, value: 5 },
  { art: "gem", row: -1, col: EDGE_A },
  { art: "star", row: -1, col: EDGE_B },
  { art: "lock", row: -1, col: SIZE - 1, value: 3 },
  { art: "lock", row: SIZE, col: 0, value: 3 },
  { art: "leaf", row: SIZE, col: EDGE_A },
  { art: "drop", row: SIZE, col: EDGE_B },
  { art: "lock", row: SIZE, col: SIZE - 1, value: 5 },
  { art: "bell", row: EDGE_A, col: -1 },
  { art: "gem", row: EDGE_B, col: -1 },
  { art: "star", row: EDGE_A, col: SIZE },
  { art: "drop", row: EDGE_B, col: SIZE },
];

/** Which edge a box is on - it rounds its outer corners and squares its inner. */
export function sideOf(b: PrizeBox): BoxSide {
  if (b.row < 0) return "top";
  if (b.row >= SIZE) return "bottom";
  return b.col < 0 ? "left" : "right";
}

/** The row or column a word would have to run along to reach this box. */
export function lineOf(b: PrizeBox): string | null {
  if (b.col >= 0 && b.col < SIZE) return `column ${b.col}`;
  if (b.row >= 0 && b.row < SIZE) return `row ${b.row}`;
  return null;
}

// Percentages of the box's own size, so nothing here depends on the cell in px.
export const BOX_RADIUS: Readonly<Record<BoxSide, string>> = {
  top: "22% 22% 0 0", bottom: "0 0 22% 22%",
  left: "22% 0 0 22%", right: "0 22% 22% 0",
};

