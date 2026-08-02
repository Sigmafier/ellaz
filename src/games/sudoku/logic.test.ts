import { describe, it, expect } from "vitest";
import { mulberry32, seedFrom } from "@shared/rng";
import {
  generate,
  generateSpec,
  isValid,
  countSolutions,
  setCell,
  conflicts,
  isSolved,
  SPEC_4,
  SPEC_6,
  SPEC_9,
  type BoardSpec,
  type Grid,
} from "./logic";

// A small deterministic-ish RNG (LCG) so generation is reproducible in tests.
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

describe("sudoku logic", () => {
  it("generates a puzzle with a unique solution", () => {
    const st = generate("easy", lcg(42));
    // every given matches the solution
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (st.given[r][c]) expect(st.puzzle[r][c]).toBe(st.solution[r][c]);
    // the puzzle itself is uniquely solvable
    expect(countSolutions(st.puzzle.map((row) => row.slice()), 2)).toBe(1);
  });

  it("generates an expert puzzle with a unique solution and valid solution grid", () => {
    const st = generate("expert", lcg(99));
    // every given matches the solution
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (st.given[r][c]) expect(st.puzzle[r][c]).toBe(st.solution[r][c]);
    // the puzzle itself is uniquely solvable
    expect(countSolutions(st.puzzle.map((row) => row.slice()), 2)).toBe(1);
    // the solution is a complete valid grid
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++) {
        const v = st.solution[r][c];
        expect(v).toBeGreaterThanOrEqual(1);
        st.solution[r][c] = 0;
        expect(isValid(st.solution, r, c, v)).toBe(true);
        st.solution[r][c] = v;
      }
    // expert has no more givens than hard (fewer clues = harder)
    const givenCount = st.given.reduce((n, row) => n + row.filter(Boolean).length, 0);
    expect(givenCount).toBeLessThanOrEqual(30);
  });

  it("the solution is a valid complete grid", () => {
    const st = generate("easy", lcg(7));
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++) {
        const v = st.solution[r][c];
        expect(v).toBeGreaterThanOrEqual(1);
        st.solution[r][c] = 0;
        expect(isValid(st.solution, r, c, v)).toBe(true);
        st.solution[r][c] = v;
      }
  });

  it("does not let a player overwrite a given cell", () => {
    const st = generate("easy", lcg(3));
    let gr = -1, gc = -1;
    outer: for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++) if (st.given[r][c]) { gr = r; gc = c; break outer; }
    const after = setCell(st, gr, gc, 5);
    expect(after.puzzle[gr][gc]).toBe(st.puzzle[gr][gc]); // unchanged
  });

  it("flags conflicts and detects a solved board", () => {
    const st = generate("easy", lcg(11));
    expect(isSolved(st)).toBe(false);
    // fill the whole grid from the solution → solved, no conflicts
    let full = st;
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++) if (!full.given[r][c]) full = setCell(full, r, c, st.solution[r][c]);
    expect(conflicts(full).size).toBe(0);
    expect(isSolved(full)).toBe(true);
  });

  it("detects a conflicting entry", () => {
    const st = generate("easy", lcg(5));
    // find an empty cell and a filled peer in its row to force a conflict
    let er = -1, ec = -1;
    outer: for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++) if (!st.given[r][c] && st.puzzle[r][c] === 0) { er = r; ec = c; break outer; }
    // pick the value of some given in the same row
    const rowGiven = st.puzzle[er].find((v) => v !== 0)!;
    const bad = setCell(st, er, ec, rowGiven);
    expect(conflicts(bad).has(`${er},${ec}`)).toBe(true);
  });
});

// --- Sized boards (kids sizes) -------------------------------------------
// The solver used to hardcode 9 and /3. These pin the generalized form: a box
// is boxR rows by boxC columns, which is why 6x6 (2x3 boxes) needs the PAIR
// rather than a single sqrt(n).

/** Every row, column and box of a complete grid holds 1..n exactly once. */
function assertComplete(g: Grid, spec: BoardSpec) {
  const { n, boxR, boxC } = spec;
  const full = Array.from({ length: n }, (_, i) => i + 1);
  expect(g).toHaveLength(n);
  for (const row of g) expect([...row].sort((a, b) => a - b)).toEqual(full);
  for (let c = 0; c < n; c++)
    expect(g.map((row) => row[c]).sort((a, b) => a - b)).toEqual(full);
  for (let br = 0; br < n; br += boxR)
    for (let bc = 0; bc < n; bc += boxC) {
      const box: number[] = [];
      for (let dr = 0; dr < boxR; dr++) for (let dc = 0; dc < boxC; dc++) box.push(g[br + dr][bc + dc]);
      expect(box.sort((a, b) => a - b)).toEqual(full);
    }
}

const SIZED = [
  { level: "kids4" as const, spec: SPEC_4, cells: 16 },
  { level: "kids6" as const, spec: SPEC_6, cells: 36 },
];

describe.each(SIZED)("sudoku logic — $level", ({ level, spec, cells }) => {
  it("generates a puzzle with exactly one solution", () => {
    const st = generate(level, mulberry32(seedFrom(`${level}-unique`)));
    expect(st.spec).toEqual(spec);
    for (let r = 0; r < spec.n; r++)
      for (let c = 0; c < spec.n; c++)
        if (st.given[r][c]) expect(st.puzzle[r][c]).toBe(st.solution[r][c]);
    expect(countSolutions(st.puzzle.map((row) => row.slice()), 2, spec)).toBe(1);
  });

  it("the solution satisfies every row, column and box constraint", () => {
    const st = generate(level, mulberry32(seedFrom(`${level}-valid`)));
    assertComplete(st.solution, spec);
    // and isValid agrees, cell by cell
    for (let r = 0; r < spec.n; r++)
      for (let c = 0; c < spec.n; c++) {
        const v = st.solution[r][c];
        st.solution[r][c] = 0;
        expect(isValid(st.solution, r, c, v, spec)).toBe(true);
        st.solution[r][c] = v;
      }
  });

  it("is deterministic under mulberry32(seed)", () => {
    const a = generate(level, mulberry32(seedFrom("same-seed")));
    const b = generate(level, mulberry32(seedFrom("same-seed")));
    const c = generate(level, mulberry32(seedFrom("other-seed")));
    expect(a.puzzle).toEqual(b.puzzle);
    expect(a.solution).toEqual(b.solution);
    expect(c.solution).not.toEqual(a.solution);
  });

  it("leaves a plausible clue count — solvable but not pre-filled", () => {
    const st = generate(level, mulberry32(seedFrom(`${level}-clues`)));
    const givens = st.given.reduce((n, row) => n + row.filter(Boolean).length, 0);
    expect(givens).toBeGreaterThan(cells * 0.2); // enough to be gentle
    expect(givens).toBeLessThan(cells * 0.85); // still a puzzle, not a printout
  });

  it("plays: fills from the solution to a solved board with no conflicts", () => {
    const st = generate(level, mulberry32(seedFrom(`${level}-play`)));
    expect(isSolved(st)).toBe(false);
    let full = st;
    for (let r = 0; r < spec.n; r++)
      for (let c = 0; c < spec.n; c++)
        if (!full.given[r][c]) full = setCell(full, r, c, st.solution[r][c]);
    expect(conflicts(full).size).toBe(0);
    expect(isSolved(full)).toBe(true);
  });
});

describe("sudoku logic — non-square boxes", () => {
  it("6x6 boxes are 2 rows by 3 columns, not 3 by 2", () => {
    // (0,0) and (1,2) share a 2x3 box; (2,0) does not.
    const g: Grid = Array.from({ length: 6 }, () => Array<number>(6).fill(0));
    g[0][0] = 5;
    expect(isValid(g, 1, 2, 5, SPEC_6)).toBe(false); // same 2x3 box
    expect(isValid(g, 2, 1, 5, SPEC_6)).toBe(true); // next box down, different col
  });

  it("counts solutions against the spec it is given", () => {
    // An empty 4x4 grid has 288 completions; capped by `limit`.
    const empty: Grid = Array.from({ length: 4 }, () => Array<number>(4).fill(0));
    expect(countSolutions(empty, 2, SPEC_4)).toBe(2);
  });

  it("generateSpec drives the engine directly from a spec", () => {
    const st = generateSpec(SPEC_4, 8, mulberry32(seedFrom("direct")));
    expect(st.spec).toEqual(SPEC_4);
    assertComplete(st.solution, SPEC_4);
    expect(countSolutions(st.puzzle.map((r) => r.slice()), 2, SPEC_4)).toBe(1);
  });

  it("SPEC_9 is the default, so the 9x9 entry points are unchanged", () => {
    expect(SPEC_9).toEqual({ n: 9, boxR: 3, boxC: 3 });
    const st = generate("easy", mulberry32(seedFrom("nine")));
    expect(st.spec).toEqual(SPEC_9);
    // isValid/countSolutions called WITHOUT a spec still mean 9x9
    expect(countSolutions(st.puzzle.map((r) => r.slice()), 2)).toBe(1);
  });
});
