import { describe, expect, it } from "vitest";
import { mulberry32 } from "@shared/rng";
import {
  KICKS,
  LEVELS,
  PIECE_IDS,
  canPlace,
  clearRows,
  filled,
  ghostRow,
  hardDrop,
  intervalFor,
  makePiece,
  newGame,
  render,
  rotate,
  scoreFor,
  shift,
  spin,
  tick,
  type BlocksState,
  type PieceId,
} from "./logic";

const seeded = (n = 7) => mulberry32(n);

/** A state with a hand-drawn board, so a test can describe a situation exactly. */
function withBoard(s: BlocksState, rows: string[]): BlocksState {
  return { ...s, board: rows.map((r) => [...r].map((c) => (c === "." ? 0 : 1))) };
}

describe("the pieces", () => {
  it("are all square matrices with the cells their name promises", () => {
    const size: Record<PieceId, number> = {
      o: 4,
      i3: 3,
      l3: 3,
      i4: 4,
      t4: 4,
      s4: 4,
      z4: 4,
      j4: 4,
      l4: 4,
      plus5: 5,
      u5: 5,
    };
    for (const id of PIECE_IDS) {
      const p = makePiece(id);
      expect(p.cells.every((r) => r.length === p.cells.length), `${id} is not square`).toBe(true);
      expect(filled(p).length, id).toBe(size[id]);
    }
  });

  it("gives every piece its own colour, so two shapes never read as one", () => {
    const colors = PIECE_IDS.map((id) => makePiece(id).color);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it("comes back to itself after four turns, and never loses a cell", () => {
    for (const id of PIECE_IDS) {
      let p = makePiece(id);
      for (let i = 0; i < 4; i++) {
        p = rotate(p);
        expect(filled(p).length, `${id} lost cells on turn ${i + 1}`).toBe(
          filled(makePiece(id)).length,
        );
      }
      expect(p.cells, `${id} did not return to its start`).toEqual(makePiece(id).cells);
    }
  });

  it("actually turns the ones that are not symmetric", () => {
    // Without this the round-trip above passes for a rotate() that does nothing.
    expect(rotate(makePiece("i3")).cells).not.toEqual(makePiece("i3").cells);
    expect(rotate(makePiece("l4")).cells).not.toEqual(makePiece("l4").cells);
    // ...and the two that ARE symmetric must not move, which is the control.
    expect(rotate(makePiece("o")).cells).toEqual(makePiece("o").cells);
    expect(rotate(makePiece("plus5")).cells).toEqual(makePiece("plus5").cells);
  });
});

describe("the levels", () => {
  it("keeps the two awkward five-cell pieces out of easy and normal", () => {
    for (const key of ["easy", "normal"] as const) {
      expect(LEVELS[key].pool).not.toContain("plus5");
      expect(LEVELS[key].pool).not.toContain("u5");
    }
    expect(LEVELS.hard.pool).toEqual(PIECE_IDS);
  });

  it("gets faster as rows go, and stops at its floor", () => {
    for (const key of ["easy", "normal", "hard"] as const) {
      const L = LEVELS[key];
      expect(intervalFor(key, 0)).toBe(L.startMs);
      expect(intervalFor(key, L.rowsPerStep)).toBe(L.startMs - L.stepMs);
      expect(intervalFor(key, 10_000)).toBe(L.floorMs);
      // A run that never speeds up is a level with a pointless floor.
      expect(L.floorMs).toBeLessThan(L.startMs);
    }
  });

  it("keeps easy slow enough to think in", () => {
    // The one number in this file that is a DESIGN decision rather than a
    // consequence: a five-year-old placing a piece needs more than half a
    // second at the fastest easy ever gets.
    expect(LEVELS.easy.floorMs).toBeGreaterThanOrEqual(600);
  });
});

describe("scoring", () => {
  it("pays more for rows taken together than the same rows taken singly", () => {
    expect(scoreFor(4)).toBeGreaterThan(4 * scoreFor(1));
    expect(scoreFor(0)).toBe(0);
    for (let n = 1; n < 4; n++) expect(scoreFor(n + 1)).toBeGreaterThan(scoreFor(n));
  });
});

describe("where a piece may sit", () => {
  const base = newGame("normal", seeded());

  it("refuses to leave the board sideways or through the floor", () => {
    const p = makePiece("o");
    expect(canPlace(base, p, 0, -1)).toBe(false);
    expect(canPlace(base, p, 0, base.cols - 1)).toBe(false);
    expect(canPlace(base, p, base.rows - 1, 0)).toBe(false);
    expect(canPlace(base, p, base.rows - 2, 0)).toBe(true);
  });

  it("allows a piece to hang above the ceiling while it enters", () => {
    // Negative rows are how a piece arrives. Treating them as a collision would
    // end every run on the first spawn.
    expect(canPlace(base, makePiece("o"), -2, 3)).toBe(true);
  });

  it("refuses to overlap the stack", () => {
    const s = withBoard(newGame("easy", seeded()), [
      "........",
      "........",
      "........",
      "........",
      "........",
      "........",
      "........",
      "........",
      "........",
      "........",
      "........",
      "........",
      "..##....",
      "########",
    ]);
    expect(canPlace(s, makePiece("o"), 11, 2)).toBe(false);
    expect(canPlace(s, makePiece("o"), 10, 2)).toBe(true);
  });
});

describe("moving the falling piece", () => {
  it("stops at the wall instead of scrolling off it", () => {
    let s = newGame("normal", seeded());
    for (let i = 0; i < 20; i++) s = shift(s, -1).state;
    const blocked = shift(s, -1);
    expect(blocked.moved).toBe(false);
    expect(blocked.state).toBe(s); // the same object, so no needless re-render
    expect(filled(s.piece).every(([, dc]) => s.pc + dc >= 0)).toBe(true);
  });

  it("kicks off a wall rather than refusing to turn", () => {
    // An i4 flat against the left wall: turning it upright needs a nudge right,
    // and without the kick the button reads as broken.
    let s = newGame("normal", seeded());
    s = { ...s, piece: makePiece("i4"), pc: -1, pr: 4 };
    const turned = spin(s);
    expect(turned.moved).toBe(true);
    expect(canPlace(turned.state, turned.state.piece, turned.state.pr, turned.state.pc)).toBe(true);
  });

  it("gives up rather than teleporting when no kick fits", () => {
    // A one-wide shaft: an i4 lying flat in it has nowhere to stand up.
    const s = withBoard({ ...newGame("easy", seeded()), piece: makePiece("i3"), pr: 6, pc: 2 }, [
      "........",
      "........",
      "........",
      "........",
      "........",
      "........",
      "##...###",
      "########",
      "########",
      "########",
      "########",
      "########",
      "########",
      "########",
    ]);
    const turned = spin({ ...s, piece: makePiece("i3"), pr: 5, pc: 2 });
    expect(turned.moved).toBe(false);
    expect(KICKS).toContain(0);
  });
});

describe("landing", () => {
  it("falls one row per tick until the floor, then locks", () => {
    let s = newGame("easy", seeded());
    let locked = 0;
    for (let i = 0; i < 40 && !locked; i++) {
      const r = tick(s, seeded(i));
      locked = r.locked ? 1 : 0;
      s = r.state;
    }
    expect(locked).toBe(1);
    // Something is now on the board.
    expect(s.board.flat().some((c) => c > 0)).toBe(true);
  });

  it("drops to the shadow row and pays a point per row fallen", () => {
    const start = newGame("easy", seeded());
    const landing = ghostRow(start);
    const dropped = landing - start.pr;
    const r = hardDrop(start, seeded());
    expect(dropped).toBeGreaterThan(0);
    expect(r.locked).toBe(true);
    expect(r.state.score).toBe(dropped); // no rows cleared on the first drop
  });

  it("clears a full row, keeps the rest, and pushes blanks in at the top", () => {
    const { board, cleared } = clearRows(
      [
        [0, 0, 0],
        [1, 0, 1],
        [2, 2, 2],
        [3, 0, 0],
      ],
      3,
    );
    expect(cleared).toBe(1);
    expect(board).toEqual([
      [0, 0, 0],
      [0, 0, 0],
      [1, 0, 1],
      [3, 0, 0],
    ]);
  });

  it("leaves a board with no full row exactly as it found it", () => {
    const b = [
      [0, 1],
      [1, 0],
    ];
    expect(clearRows(b, 2).cleared).toBe(0);
    expect(clearRows(b, 2).board).toBe(b);
  });

  it("scores and counts the row a landing completes", () => {
    // Eight-wide easy board, bottom row one cell short, an o sitting over the gap.
    const s = withBoard({ ...newGame("easy", seeded()), piece: makePiece("o"), pr: 0, pc: 6 }, [
      "........",
      "........",
      "........",
      "........",
      "........",
      "........",
      "........",
      "........",
      "........",
      "........",
      "........",
      "........",
      "........",
      "######..",
    ]);
    const r = hardDrop(s, seeded());
    expect(r.cleared).toBe(1);
    expect(r.state.lines).toBe(1);
    expect(r.state.score).toBeGreaterThanOrEqual(scoreFor(1));
  });
});

describe("the end of a run", () => {
  it("ends when the next piece has nowhere to enter", () => {
    // A stack to the ceiling with a THREE-wide shaft at the far left, filled by
    // a two-wide piece: the landing leaves a column short, so it clears nothing
    // and whatever is drawn next arrives in the middle, on top of the stack.
    const rows = Array.from({ length: 14 }, () => "...#####");
    const s = withBoard({ ...newGame("easy", seeded()), piece: makePiece("o"), pr: 0, pc: 0 }, rows);
    const r = hardDrop(s, seeded());
    expect(r.cleared).toBe(0);
    expect(r.state.over).toBe(true);
  });

  it("does NOT end on a landing that clears the rows in its way", () => {
    // The mirror image: the same ceiling-high stack, but the shaft is the last
    // two columns of every row, so landing in it COMPLETES two rows. A game
    // that ends here punishes the best move on the board.
    const rows = Array.from({ length: 14 }, () => "######..");
    const s = withBoard({ ...newGame("easy", seeded()), piece: makePiece("o"), pr: 0, pc: 6 }, rows);
    const r = hardDrop(s, seeded());
    expect(r.cleared).toBe(2);
    expect(r.state.over).toBe(false);
  });

  it("refuses to move or drop once it is over", () => {
    const dead: BlocksState = { ...newGame("normal", seeded()), over: true };
    expect(shift(dead, 1).moved).toBe(false);
    expect(spin(dead).moved).toBe(false);
    expect(tick(dead, seeded()).state).toBe(dead);
    expect(hardDrop(dead, seeded()).state).toBe(dead);
  });
});

describe("the draw pile", () => {
  it("hands out the whole pool before repeating any of it", () => {
    // The reason a bag exists at all: with an independent draw per piece, a
    // player holding a well open for the long piece can wait fifteen turns for
    // it, and that reads as the game cheating.
    const rng = seeded(11);
    let s = newGame("normal", rng);
    const pool = LEVELS.normal.pool;
    const seen: PieceId[] = [s.piece.id, s.next.id];
    while (seen.length < pool.length) {
      s = hardDrop(s, rng).state;
      seen.push(s.next.id);
    }
    expect(new Set(seen).size).toBe(pool.length);
  });

  it("never draws a piece the level does not stock", () => {
    const rng = seeded(3);
    let s = newGame("easy", rng);
    const allowed = new Set<PieceId>(LEVELS.easy.pool);
    for (let i = 0; i < 60; i++) {
      expect(allowed.has(s.piece.id), `easy drew ${s.piece.id}`).toBe(true);
      expect(allowed.has(s.next.id), `easy queued ${s.next.id}`).toBe(true);
      s = hardDrop(s, rng).state;
      if (s.over) s = newGame("easy", rng);
    }
  });

  it("plays the same run twice from the same seed", () => {
    const play = () => {
      const rng = seeded(42);
      let s = newGame("hard", rng);
      for (let i = 0; i < 30 && !s.over; i++) s = hardDrop(s, rng).state;
      return { score: s.score, lines: s.lines, board: s.board };
    };
    expect(play()).toEqual(play());
  });
});

describe("what the screen is handed", () => {
  it("paints the falling piece solid and its landing shadow negative", () => {
    const s = newGame("normal", seeded());
    const painted = render(s);
    const solid = painted.flat().filter((c) => c > 0).length;
    const ghost = painted.flat().filter((c) => c < 0).length;
    expect(solid).toBe(filled(s.piece).length - hiddenAbove(s));
    expect(ghost).toBeGreaterThan(0);
  });

  it("draws nothing falling once the run is over", () => {
    const s: BlocksState = { ...newGame("normal", seeded()), over: true };
    expect(render(s).flat().every((c) => c === 0)).toBe(true);
  });

  it("never mutates the state it was handed", () => {
    const s = newGame("normal", seeded());
    const before = JSON.stringify(s.board);
    render(s);
    expect(JSON.stringify(s.board)).toBe(before);
  });
});

/** Cells of the falling piece still above row 0, which the board cannot show. */
function hiddenAbove(s: BlocksState): number {
  return filled(s.piece).filter(([dr]) => s.pr + dr < 0).length;
}
