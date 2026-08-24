import { describe, expect, it } from "vitest";
import { newGame, validate, apply, SIZE } from "./logic";

/**
 * What the board is FOR, since 2026-08-24. The operator, verbatim:
 *
 *   "user should put any word they want anywhere, also we dont need the color
 *    blocks, all should be placeable. also i dont need the bonus or special
 *    boxes."
 *
 * Three rules were removed that day - the centre start, the connection
 * requirement, and every premium square. Two of the tests in `logic.test.ts`
 * used to assert the opposite of what this file asserts, and they were FLIPPED
 * rather than deleted, so a rule creeping back has something to break.
 *
 * This file exists for the fourth thing, which is not a removal but the hole
 * the removals opened: with nothing left to enforce WHERE a tile goes, a single
 * tile went anywhere for zero points. See the last block.
 */
const idx = (r: number, c: number) => r * SIZE + c;
const lay = (r: number, c: number, w: string, down = false) =>
  [...w].map((letter, k) => ({ index: down ? idx(r + k, c) : idx(r, c + k), letter, wild: false }));

describe("a word goes anywhere", () => {
  const g = newGame("medium", () => 0.5);

  it("takes the opening word in any corner, and in the middle, and scores them the same", () => {
    // DERIVED from SIZE, never typed out. These were [0,8],[10,0],[10,8],[5,4]
    // - correct on an 11-wide board and, the day it became 9 wide, three of
    // them ran off the edge and one wrapped onto the next row. A coordinate
    // literal in a test is a threshold tuned against today's tree.
    const last = SIZE - "cat".length;          // the rightmost start that fits
    const spots: [number, number][] = [
      [0, 0], [0, last], [SIZE - 1, 0], [SIZE - 1, last],
      [Math.floor(SIZE / 2), Math.floor(last / 2)],
    ];
    const totals = spots.map((s) => {
      const v = validate(g.board, lay(s[0], s[1], "cat"));
      expect(v.ok, `refused at ${s}`).toBe(true);
      return v.ok ? v.total : -1;
    });
    // Position cannot matter any more. Comparing them to EACH OTHER rather than
    // to a constant is the point: a hardcoded 4 would still pass if one square
    // were quietly special and every spot happened to miss it.
    expect(new Set(totals).size, `same word scored differently by position: ${totals}`).toBe(1);
  });

  it("takes a word that touches nothing already on the board", () => {
    const after = apply(g, lay(5, 4, "cat")).board;
    const v = validate(after, lay(0, 0, "dog"));
    expect(v.ok).toBe(true);
  });

  it("still reads a cross-word when two words DO meet", () => {
    // Not a connection rule - it is what a grid means. 'cat' across (5,4..6),
    // then 'x' under the 'c' spells 'cx' downward, which is not a word.
    const after = apply(g, lay(5, 4, "cat")).board;
    const v = validate(after, [{ index: idx(6, 4), letter: "x", wild: false }]);
    expect(v.ok).toBe(false);
  });
});

describe("but it must still be a word", () => {
  const g = newGame("medium", () => 0.5);

  it("refuses a lone tile, which formed no word and cost nothing", () => {
    // THE HOLE THE FREEDOM OPENED, and the reason this file exists. `collect`
    // passes any run under two letters, so once `start` and `touch` were gone a
    // single tile broke no rule at all: measured `{"ok":true,"words":[],
    // "total":0}` - a turn that empties the bag and scores nothing, repeatable
    // forever. Anywhere is the freedom; a word is still the price.
    const v = validate(g.board, [{ index: idx(3, 3), letter: "q", wild: false }]);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("word");
  });

  it("refuses letters that are not a word", () => {
    const v = validate(g.board, lay(3, 3, "qz"));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("word");
  });

  it("still refuses a play split across two lines, and one with a hole in it", () => {
    const diagonal = [
      { index: idx(3, 3), letter: "c", wild: false },
      { index: idx(4, 4), letter: "a", wild: false },
    ];
    const d = validate(g.board, diagonal);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.reason).toBe("line");

    const holed = [
      { index: idx(3, 3), letter: "c", wild: false },
      { index: idx(3, 5), letter: "t", wild: false },
    ];
    const h = validate(g.board, holed);
    expect(h.ok).toBe(false);
    if (!h.ok) expect(h.reason).toBe("gap");
  });
});
