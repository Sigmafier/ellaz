import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { mulberry32 } from "@shared/rng";
import {
  BLANK,
  CELL_CAP,
  CLUE_UNIT,
  CROSSED,
  FILLED,
  LEVELS,
  LEVEL_IDS,
  PANEL_USABLE,
  boardUnits,
  clueTotal,
  cluesOf,
  colSatisfied,
  deal,
  diamond,
  filledCount,
  forcedInLine,
  isSolved,
  lineSolve,
  makePicture,
  markFor,
  maxRuns,
  newGame,
  rowSatisfied,
  runsOf,
  scoreFor,
  setMark,
  tap,
  tapMark,
  type Clue,
  type LevelId,
  type Mark,
  type NonogramState,
} from "./logic";

/** A picture from `#` and `.` rows, which is how a nonogram is worth reading in a test. */
function draw(rows: string[]): { picture: boolean[]; size: number } {
  const size = rows.length;
  for (const row of rows) expect(row.length, `row "${row}" is not ${size} wide`).toBe(size);
  return { picture: rows.flatMap((row) => [...row].map((ch) => ch === "#")), size };
}

/** A board with its picture already painted in - the winning position. */
function painted(rows: string[]): NonogramState {
  const { picture, size } = draw(rows);
  const { rows: rowClues, cols } = cluesOf(picture, size);
  return {
    size,
    rows: rowClues,
    cols,
    marks: picture.map((on) => (on ? FILLED : BLANK) as Mark),
  };
}

/* ---------------------------------------------------------------- reading */

describe("runsOf reads a line the way a clue states it", () => {
  it("an empty line reads as no numbers at all", () => {
    // Not the same as a missing clue: a nonogram row with no numbers says
    // "nothing here", which is usually the most useful clue on the board.
    expect(runsOf([false, false, false])).toEqual([]);
  });

  it("a full line reads as one run", () => {
    expect(runsOf([true, true, true, true])).toEqual([4]);
  });

  it("counts the gaps between runs", () => {
    expect(runsOf([true, true, false, true, false, false, true, true, true])).toEqual([2, 1, 3]);
  });

  it("does not invent a run for a leading or trailing gap", () => {
    expect(runsOf([false, true, false])).toEqual([1]);
  });
});

describe("cluesOf reads both axes off a picture", () => {
  const { picture, size } = draw([
    "##...",
    ".#.#.",
    ".....",
    "#####",
    "#...#",
  ]);

  it("derives every row", () => {
    expect(cluesOf(picture, size).rows).toEqual([[2], [1, 1], [], [5], [1, 1]]);
  });

  it("derives every column", () => {
    expect(cluesOf(picture, size).cols).toEqual([[1, 2], [2, 1], [1], [1, 1], [2]]);
  });

  it("the two axes agree about how many cells are filled", () => {
    const { rows, cols } = cluesOf(picture, size);
    const sum = (cs: number[][]) => cs.flat().reduce((a, b) => a + b, 0);
    expect(sum(rows)).toBe(sum(cols));
  });
});

/* ----------------------------------------------------------- the line rule */

describe("forcedInLine only ever states what every arrangement agrees on", () => {
  const blank = (n: number): Mark[] => new Array<Mark>(n).fill(BLANK);

  it("a run as long as the line fills it", () => {
    const forced = forcedInLine([5], blank(5))!;
    expect(forced.filled).toEqual([true, true, true, true, true]);
  });

  it("no clue at all empties the line", () => {
    const forced = forcedInLine([], blank(4))!;
    expect(forced.empty).toEqual([true, true, true, true]);
    expect(forced.filled).toEqual([false, false, false, false]);
  });

  it("finds the overlap a longer-than-half run leaves", () => {
    // A run of 3 in 4 cells sits at 0-2 or 1-3, so cells 1 and 2 are filled
    // either way and the ends are not decided at all.
    const forced = forcedInLine([3], blank(4))!;
    expect(forced.filled).toEqual([false, true, true, false]);
    expect(forced.empty).toEqual([false, false, false, false]);
  });

  it("says nothing at all when nothing is forced", () => {
    const forced = forcedInLine([1], blank(3))!;
    expect(forced.filled).toEqual([false, false, false]);
    expect(forced.empty).toEqual([false, false, false]);
  });

  it("uses a cell the player has already ruled out", () => {
    const line: Mark[] = [BLANK, CROSSED, BLANK, BLANK];
    // The run of 2 cannot straddle the crossed cell, so it is at 2-3.
    const forced = forcedInLine([2], line)!;
    expect(forced.filled).toEqual([false, false, true, true]);
    expect(forced.empty[0]).toBe(true);
  });

  it("uses a cell that is already known filled", () => {
    const line: Mark[] = [BLANK, BLANK, BLANK, FILLED, BLANK];
    const forced = forcedInLine([2], line)!;
    // A run of 2 covering cell 3 is at 2-3 or 3-4, so cells 0 and 1 are out.
    expect(forced.empty[0]).toBe(true);
    expect(forced.empty[1]).toBe(true);
    expect(forced.filled[3]).toBe(true);
  });

  it("refuses a line no arrangement fits", () => {
    expect(forcedInLine([3, 3], new Array<Mark>(5).fill(BLANK))).toBeNull();
    expect(forcedInLine([2], [CROSSED, CROSSED, CROSSED])).toBeNull();
  });
});

/* ------------------------------------------------------------- the proof */

describe("lineSolve is the uniqueness proof", () => {
  it("solves a board whose clues force one picture", () => {
    const { picture, size } = draw([
      "#####",
      "#...#",
      "#####",
      "#....",
      "#####",
    ]);
    const { rows, cols } = cluesOf(picture, size);
    const proof = lineSolve(size, rows, cols);
    expect(proof.kind).toBe("solved");
    if (proof.kind !== "solved") return;
    expect(proof.marks.map((m) => m === FILLED)).toEqual(picture);
    expect(proof.passes).toBeGreaterThan(0);
  });

  it("reports a contradiction as impossible rather than as a stall", () => {
    // Row clues want six filled cells; the column clues want none.
    const rows: Clue[] = [[3], [3], [], [], []];
    const cols: Clue[] = [[], [], [], [], []];
    expect(lineSolve(5, rows, cols).kind).toBe("impossible");
  });

  /**
   * THE NEGATIVE CONTROL, and without it every assertion above is worthless.
   *
   * A proof that always answers "solved" passes every test in this file that
   * uses a real board. So here is a board whose clues genuinely admit two
   * pictures - two lone cells that can sit on one diagonal or the other - and
   * the proof has to refuse it.
   */
  it("REFUSES a board whose clues admit two pictures", () => {
    const rows: Clue[] = [[1], [1], [], [], []];
    const cols: Clue[] = [[1], [1], [], [], []];
    const proof = lineSolve(5, rows, cols);
    expect(proof.kind).toBe("stalled");
    if (proof.kind !== "stalled") return;
    // Exactly the four cells of the swap, and nothing else, is undecided.
    expect(proof.undetermined).toBe(4);
  });

  it("...and both pictures really do satisfy those clues", () => {
    // The other half of the control: proving the rejected board was ambiguous
    // rather than merely hard, so the refusal above is correct and not timid.
    const a = painted(["#....", ".#...", ".....", ".....", "....."]);
    const b = painted([".#...", "#....", ".....", ".....", "....."]);
    expect(isSolved(a)).toBe(true);
    expect(isSolved(b)).toBe(true);
    expect(a.rows).toEqual(b.rows);
    expect(a.cols).toEqual(b.cols);
    expect(a.marks).not.toEqual(b.marks);
  });

  it("the same shape one cell over IS provable, so the control is not just strictness", () => {
    // Two cells stacked instead of diagonal: the column clue reads [2], which
    // pins them. Same board size, same cell count, opposite verdict.
    const rows: Clue[] = [[1], [1], [], [], []];
    const cols: Clue[] = [[2], [], [], [], []];
    expect(lineSolve(5, rows, cols).kind).toBe("solved");
  });
});

/* -------------------------------------------------------------- the deal */

describe("every dealt board is proved before it is shown", () => {
  const SEEDS = 120;

  it.each(LEVEL_IDS)("%s deals only boards a player can reason all the way through", (level) => {
    for (let seed = 0; seed < SEEDS; seed++) {
      const dealt = deal(level, mulberry32(seed * 2654435761 + 17));
      const proof = lineSolve(dealt.state.size, dealt.state.rows, dealt.state.cols);
      expect(proof.kind, `${level} seed ${seed} needs a guess`).toBe("solved");
      if (proof.kind !== "solved") return;
      // ...and the one picture it forces is the picture that was drawn.
      expect(proof.marks.map((m) => m === FILLED)).toEqual(dealt.picture);
    }
  });

  it.each(LEVEL_IDS)("%s never runs out of rolls", (level) => {
    // The fallback is proved separately, but reaching it would mean the tuning
    // has drifted, so this is the tripwire for that rather than for a bug.
    const used: number[] = [];
    for (let seed = 0; seed < SEEDS; seed++) {
      const dealt = deal(level, mulberry32(seed * 40503 + 7));
      expect(dealt.fallback).toBe(false);
      used.push(dealt.attempts);
    }
    expect(Math.max(...used)).toBeLessThan(20);
  });

  it("replays the same board from the same seed", () => {
    const a = deal("medium", mulberry32(99));
    const b = deal("medium", mulberry32(99));
    expect(a.state).toEqual(b.state);
    expect(a.picture).toEqual(b.picture);
  });

  it("deals a different board from a different seed", () => {
    const a = deal("medium", mulberry32(1));
    const b = deal("medium", mulberry32(2));
    expect(a.picture).not.toEqual(b.picture);
  });

  it.each(LEVEL_IDS)("%s starts every cell blank and sizes both axes", (level) => {
    const state = newGame(level, mulberry32(5));
    const { size } = LEVELS[level];
    expect(state.size).toBe(size);
    expect(state.rows).toHaveLength(size);
    expect(state.cols).toHaveLength(size);
    expect(state.marks).toHaveLength(size * size);
    expect(state.marks.every((m) => m === BLANK)).toBe(true);
  });

  it.each(LEVEL_IDS)("%s never deals a clue too long for its own line", (level) => {
    const { size } = LEVELS[level];
    for (let seed = 0; seed < 40; seed++) {
      const state = newGame(level, mulberry32(seed * 7919 + 3));
      for (const clue of [...state.rows, ...state.cols]) {
        const needed = clue.reduce((a, b) => a + b, 0) + Math.max(0, clue.length - 1);
        expect(needed).toBeLessThanOrEqual(size);
        expect(clue.every((n) => Number.isInteger(n) && n > 0)).toBe(true);
      }
    }
  });

  it.each(LEVEL_IDS)("%s never deals more runs than the gutter is built for", (level) => {
    const { size } = LEVELS[level];
    for (let seed = 0; seed < 60; seed++) {
      const state = newGame(level, mulberry32(seed * 104729 + 11));
      const widest = Math.max(...[...state.rows, ...state.cols].map((c) => c.length));
      expect(widest).toBeLessThanOrEqual(maxRuns(size));
    }
  });

  it.each(LEVEL_IDS)("%s never deals a blank or a solid rectangle", (level) => {
    const { size } = LEVELS[level];
    for (let seed = 0; seed < 40; seed++) {
      const on = deal(level, mulberry32(seed * 31337 + 5)).picture.filter(Boolean).length;
      expect(on).toBeGreaterThanOrEqual(size);
      expect(on).toBeLessThanOrEqual(size * size - size);
    }
  });

  it("the fallback carries the same proof every dealt board carries", () => {
    // `deal` returns the diamond without re-checking it, so this IS that check.
    // If it ever goes red, the fallback branch is shipping an unproved board.
    for (const level of LEVEL_IDS) {
      const { size } = LEVELS[level];
      const picture = diamond(size);
      const { rows, cols } = cluesOf(picture, size);
      expect(lineSolve(size, rows, cols).kind, `the ${size}x${size} diamond`).toBe("solved");
      expect(picture.filter(Boolean).length).toBeGreaterThanOrEqual(size);
    }
  });

  it("folding a picture over itself gives two lines the same clue", () => {
    const rng = mulberry32(42);
    const picture = makePicture(LEVELS.medium, "vertical", rng);
    const { cols } = cluesOf(picture, LEVELS.medium.size);
    expect(cols[0]).toEqual(cols[LEVELS.medium.size - 1]);
  });
});

/* ---------------------------------------------------------------- playing */

describe("marking cells", () => {
  const fresh = (): NonogramState => newGame("easy", mulberry32(3));

  it("a tap in fill mode fills, and the same tap again takes it back", () => {
    const state = fresh();
    const first = tap(state, 0, "fill");
    expect(first.state.marks[0]).toBe(FILLED);
    expect(first.outcome).toEqual({ kind: "marked", cell: 0, from: BLANK, to: FILLED });
    expect(tap(first.state, 0, "fill").state.marks[0]).toBe(BLANK);
  });

  it("a tap in cross mode rules a cell out, and again takes it back", () => {
    const state = fresh();
    const first = tap(state, 4, "cross");
    expect(first.state.marks[4]).toBe(CROSSED);
    expect(tap(first.state, 4, "cross").state.marks[4]).toBe(BLANK);
  });

  it("filling a cell the player had ruled out just fills it", () => {
    // Never a two-step undo. Changing your mind is one tap in either mode.
    const crossed = tap(fresh(), 7, "cross").state;
    expect(tap(crossed, 7, "fill").state.marks[7]).toBe(FILLED);
  });

  it("leaves the board alone when the mark is already there", () => {
    const state = tap(fresh(), 2, "fill").state;
    const again = setMark(state, 2, FILLED);
    expect(again.outcome.kind).toBe("ignored");
    expect(again.state).toBe(state);
  });

  it("ignores a cell that is not on the board instead of throwing", () => {
    // A restored snapshot can hand these rules an index this board no longer
    // has, and a throw inside a tap handler costs a child the whole board.
    const state = fresh();
    expect(tap(state, -1, "fill").outcome.kind).toBe("ignored");
    expect(tap(state, 999, "fill").outcome.kind).toBe("ignored");
    expect(setMark(state, 1.5, FILLED).outcome.kind).toBe("ignored");
  });

  it("never mutates the state it was handed", () => {
    const state = fresh();
    const before = state.marks.slice();
    tap(state, 6, "fill");
    expect(state.marks).toEqual(before);
  });

  it("markFor and tapMark agree about what a mode wants", () => {
    const state = fresh();
    expect(markFor("fill")).toBe(FILLED);
    expect(markFor("cross")).toBe(CROSSED);
    expect(tapMark(state, 0, "fill")).toBe(FILLED);
    expect(tapMark(tap(state, 0, "fill").state, 0, "fill")).toBe(BLANK);
  });
});

/* ---------------------------------------------------------------- winning */

describe("the win condition is the clues, not a stored answer", () => {
  const rows = ["##.#.", ".###.", "#...#", ".#.#.", "#####"];

  it("a fresh board is not solved", () => {
    expect(isSolved(newGame("easy", mulberry32(8)))).toBe(false);
  });

  it("painting the picture wins", () => {
    expect(isSolved(painted(rows))).toBe(true);
  });

  it("one cell short does not win", () => {
    const state = painted(rows);
    const at = state.marks.indexOf(FILLED);
    expect(isSolved(setMark(state, at, BLANK).state)).toBe(false);
  });

  it("one cell too many does not win", () => {
    const state = painted(rows);
    const at = state.marks.indexOf(BLANK);
    expect(isSolved(setMark(state, at, FILLED).state)).toBe(false);
  });

  it("crosses are the player's own notes and count for nothing", () => {
    const state = painted(rows);
    const blanks = state.marks.flatMap((m, i) => (m === BLANK ? [i] : []));
    const noted = blanks.reduce((s, i) => setMark(s, i, CROSSED).state, state);
    expect(isSolved(noted)).toBe(true);
    // ...and a board crossed everywhere and filled nowhere is not a win either.
    const crossedOnly = { ...state, marks: state.marks.map(() => CROSSED as Mark) };
    expect(isSolved(crossedOnly)).toBe(false);
  });

  it("a dealt board is won by exactly the picture it was dealt from", () => {
    for (const level of LEVEL_IDS) {
      const dealt = deal(level, mulberry32(77));
      const solved = {
        ...dealt.state,
        marks: dealt.picture.map((on) => (on ? FILLED : BLANK) as Mark),
      };
      expect(isSolved(solved), level).toBe(true);
    }
  });

  it("says which single row or column is not right yet", () => {
    const state = painted(rows);
    expect(rowSatisfied(state, 0)).toBe(true);
    expect(colSatisfied(state, 0)).toBe(true);
    const broken = setMark(state, 0, BLANK).state;
    expect(rowSatisfied(broken, 0)).toBe(false);
    expect(colSatisfied(broken, 0)).toBe(false);
    expect(rowSatisfied(broken, 4)).toBe(true);
  });

  it("counts progress against the picture's own size", () => {
    const state = painted(rows);
    expect(clueTotal(state)).toBe(state.marks.filter((m) => m === FILLED).length);
    expect(filledCount(state)).toBe(clueTotal(state));
    expect(filledCount(newGame("easy", mulberry32(2)))).toBe(0);
  });
});

describe("what the record measures", () => {
  it("is a time, ranked per tier", () => {
    expect(scoreFor(41250, "hard")).toEqual({ value: 41250, unit: "ms", board: "hard" });
  });

  it("scopes the board to the tier, so a 5x5 cannot outrank a 15x15", () => {
    expect(scoreFor(1, "easy").board).not.toBe(scoreFor(1, "hard").board);
  });
});

/* ---------------------------------------------------------------- layout */

describe("the board fits the desktop panel", () => {
  it("every tier's widest board clears what the panel leaves", () => {
    for (const level of LEVEL_IDS) {
      const widest = boardUnits(level) * CELL_CAP[level];
      expect(widest, `${level} at ${CELL_CAP[level]}px cells`).toBeLessThanOrEqual(PANEL_USABLE);
    }
  });

  it("the renderer still uses those exact px caps", () => {
    // The caps have to stay LITERAL in the renderer, because the tree-wide gate
    // in src/ui/game-panel-clears-widest-board.test.ts reads px out of a `min()`
    // as text - an interpolated cap is one it cannot see, and a check that
    // cannot see a value reports green about it forever.
    const src = readFileSync(fileURLToPath(new URL("./NonogramGame.tsx", import.meta.url)), "utf8");
    const caps = [...src.matchAll(/min\([^)]*?(\d+)px\)/g)].map((m) => parseInt(m[1], 10));
    expect(caps.sort((a, b) => a - b)).toEqual(
      (Object.values(CELL_CAP) as number[]).sort((a, b) => a - b),
    );
  });

  it("the gutter is built for the busiest line a size can hold", () => {
    expect(maxRuns(5)).toBe(3);
    expect(maxRuns(10)).toBe(5);
    expect(maxRuns(15)).toBe(8);
    expect(boardUnits("easy")).toBeCloseTo(5 + 3 * CLUE_UNIT, 6);
  });
});

describe("the tier table", () => {
  it("lists every level exactly once, in the order the toggle shows", () => {
    expect([...LEVEL_IDS].sort()).toEqual(Object.keys(LEVELS).sort());
    expect(LEVEL_IDS).toHaveLength(new Set(LEVEL_IDS).size);
  });

  it("grows the grid rather than the ink", () => {
    const sizes = LEVEL_IDS.map((id: LevelId) => LEVELS[id].size);
    expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
    expect(new Set(sizes).size).toBe(sizes.length);
  });
});
