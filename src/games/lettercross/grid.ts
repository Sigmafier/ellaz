/**
 * Lettercross - the geometry, and nothing else. No rules, no art, no DOM.
 *
 * It exists so `boxes.ts` and `logic.ts` can both name the same grid without
 * importing each other: boxes needs the coordinate space to say where a prize
 * sits, and logic needs to know which squares are prizes before it can say what
 * may be played on. Left in one file those two are a cycle. The shared half is
 * geometry, so geometry is what moved out.
 *
 * ONE INDEX SPACE, and that is the change of 2026-08-25. The board used to be
 * SIZE x SIZE with the prize boxes drawn OUTSIDE it, addressable by nothing - so
 * a box was collected by filling the board square NEXT to it. The operator, on
 * playing the first bonus round: "the mini game only apply if you put a letter
 * in the outside boxes not near them". That is BONUS's own rule, quoted out of
 * its own executable: placing the FIRST OR LAST letter of a word ON a bonus
 * square is what wins the prize.
 *
 * A box that holds a letter needs somewhere to keep it. So the index space is
 * the whole W x W stage now and a prize box is a square like any other - which
 * also means the rule needs no special case anywhere: a word simply runs off the
 * edge of the board and the last letter lands in the box.
 */

/** The playing board. See logic.ts for why it is nine. */
export const SIZE = 9;
/** The STAGE: the board plus its one-cell ring. Every index here is in it. */
export const W = SIZE + 2;
export const CELLS = W * W;

/** A square: a letter, and whether the tile spelling it was a wild (scores 0). */
export type Cell = { readonly letter: string; readonly wild: boolean } | null;
export type Board = readonly Cell[];

/** Stage coordinates, 0..W-1. */
export const at = (row: number, col: number) => row * W + col;
export const rowOf = (i: number) => Math.floor(i / W);
export const colOf = (i: number) => i % W;

/**
 * A BOARD square as a stage index. Board coordinates run 0..SIZE-1 and the ring
 * is one cell thick, so the board's own 0,0 is the stage's 1,1. Boxes keep
 * addressing themselves in board coordinates too (-1 is the ring above or left,
 * SIZE the ring below or right), which is what lets one `+1` serve both.
 */
export const boardAt = (row: number, col: number) => at(row + 1, col + 1);
