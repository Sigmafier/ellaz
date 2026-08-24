/**
 * Lettercross - the prize boxes around the board, as data and one rule.
 *
 * NO DOM, NO React: this says WHERE a box may sit and what that means, and
 * `Lettercross.tsx` says what one looks like. Splitting them is what lets
 * `boxes-are-in-line.test.ts` run the real rule rather than read the source
 * for it.
 */
import { SIZE, at, type Board } from "./grid";

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


/**
 * THE SQUARE THIS BOX *IS* - its own cell in the stage's index space.
 *
 * Until 2026-08-25 this function was `reachIndex` and returned the board square
 * NEXT to the box, because the box itself had no index to return. That made
 * "reaching" a box mean filling the square beside it, and the operator's
 * correction is the whole reason this file changed: "the mini game only apply
 * if you put a letter in the outside boxes not near them."
 *
 * A box is addressed in BOARD coordinates (-1 is the ring above or left, SIZE
 * the ring below or right) and the stage is the board plus that one-cell ring,
 * so the conversion is one `+1` on each axis and there is no table of twelve
 * indices to keep in step with anything.
 */
export function boxIndex(b: PrizeBox): number {
  return at(b.row + 1, b.col + 1);
}

/**
 * Every prize square, as a set. `logic.ts` reads this to build the mask of what
 * may be played on: the inner board plus these twelve, and nothing else in the
 * ring. It is derived from `BOXES` rather than listed beside it, so a box moved
 * is a square moved and the two cannot drift apart.
 */
export const BOX_INDICES: ReadonlySet<number> = new Set(BOXES.map(boxIndex));

/**
 * A PADLOCK IS SHUT, and reaching one is not the same as opening it.
 *
 * Step 2 of the game plan collects a box by arriving at it. Step 4 gives the
 * wild tile a job and opens the padlocks, so a lock reached today is FOUND and
 * not COLLECTED - the number printed on it still means nothing and nothing here
 * pretends otherwise. Marking it found is what stops the note firing again on
 * every later turn, since the square next to it stays filled for ever.
 */
export const isLocked = (b: PrizeBox) => b.art === "lock";

/**
 * Which boxes hold a letter, as indices into `BOXES`.
 *
 * Takes the WHOLE board rather than this turn's placements: a box is taken when
 * its own square is occupied, by whichever turn put a tile there. Diffing the
 * result against what was already reached is the caller's job, and that record
 * rides the session snapshot - without it, walking out and back in re-collects
 * every box on the board (session-snapshot-convention.md).
 */
export function reachedBoxes(board: Board): number[] {
  const out: number[] = [];
  BOXES.forEach((b, i) => { if (board[boxIndex(b)]) out.push(i); });
  return out;
}
