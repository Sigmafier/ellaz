// Sudoku — pure generator + solver + play state. Puzzles are generated with a
// uniqueness guarantee (a cell is only removed if the puzzle stays uniquely
// solvable). Deterministic given a RNG. No DOM.
//
// The board is described by a BoardSpec: `n` symbols on an n x n grid, split
// into boxes of `boxR` rows by `boxC` columns. The pair is load-bearing — a
// 6x6 board has 2x3 boxes, which no single sqrt(n) can express.
import { shuffle } from "@shared/rng";

export type Grid = number[][]; // n x n, 0 = empty

/** n symbols on an n x n grid, boxes of boxR rows by boxC columns (boxR*boxC === n). */
export interface BoardSpec {
  n: number;
  boxR: number;
  boxC: number;
}

export const SPEC_4: BoardSpec = { n: 4, boxR: 2, boxC: 2 };
export const SPEC_6: BoardSpec = { n: 6, boxR: 2, boxC: 3 };
export const SPEC_9: BoardSpec = { n: 9, boxR: 3, boxC: 3 };

export interface SudokuState {
  puzzle: Grid; // current visible grid (givens + player entries)
  given: boolean[][]; // true = fixed clue, not editable
  solution: Grid;
  spec: BoardSpec; // the board this state was generated for
}

export type Level = "kids4" | "kids6" | "easy" | "medium" | "hard" | "expert";

// One table: which board a level is played on, and how few clues to aim for.
// Removal is best-effort — a cell stays if taking it out would make the puzzle
// ambiguous — so the real clue count is >= `givens`.
const LEVELS: Record<Level, { spec: BoardSpec; givens: number }> = {
  kids4: { spec: SPEC_4, givens: 9 },
  kids6: { spec: SPEC_6, givens: 18 },
  easy: { spec: SPEC_9, givens: 42 },
  medium: { spec: SPEC_9, givens: 34 },
  hard: { spec: SPEC_9, givens: 28 },
  expert: { spec: SPEC_9, givens: 24 },
};

/** The board a level is played on — the renderer needs this before generating. */
export function specForLevel(level: Level): BoardSpec {
  return LEVELS[level].spec;
}

function emptyGrid(spec: BoardSpec): Grid {
  return Array.from({ length: spec.n }, () => Array<number>(spec.n).fill(0));
}
function cloneGrid(g: Grid): Grid {
  return g.map((r) => r.slice());
}

export function isValid(g: Grid, r: number, c: number, v: number, spec: BoardSpec = SPEC_9): boolean {
  for (let i = 0; i < spec.n; i++) {
    if (g[r][i] === v || g[i][c] === v) return false;
  }
  const br = Math.floor(r / spec.boxR) * spec.boxR;
  const bc = Math.floor(c / spec.boxC) * spec.boxC;
  for (let dr = 0; dr < spec.boxR; dr++)
    for (let dc = 0; dc < spec.boxC; dc++) if (g[br + dr][bc + dc] === v) return false;
  return true;
}

function digits(spec: BoardSpec): number[] {
  return Array.from({ length: spec.n }, (_, i) => i + 1);
}

// Fill an empty grid with a random complete valid solution.
function fillFull(g: Grid, spec: BoardSpec, rng: () => number): boolean {
  const values = digits(spec);
  for (let r = 0; r < spec.n; r++)
    for (let c = 0; c < spec.n; c++) {
      if (g[r][c] === 0) {
        for (const v of shuffle(values, rng)) {
          if (isValid(g, r, c, v, spec)) {
            g[r][c] = v;
            if (fillFull(g, spec, rng)) return true;
            g[r][c] = 0;
          }
        }
        return false;
      }
    }
  return true;
}

// Count solutions up to `limit` (used to verify uniqueness — stop early at 2).
export function countSolutions(g: Grid, limit = 2, spec: BoardSpec = SPEC_9): number {
  for (let r = 0; r < spec.n; r++)
    for (let c = 0; c < spec.n; c++) {
      if (g[r][c] === 0) {
        let total = 0;
        for (let v = 1; v <= spec.n; v++) {
          if (isValid(g, r, c, v, spec)) {
            g[r][c] = v;
            total += countSolutions(g, limit - total, spec);
            g[r][c] = 0;
            if (total >= limit) return total;
          }
        }
        return total;
      }
    }
  return 1; // no empty cell → a complete valid solution
}

/**
 * The engine: a full solution for `spec`, then clues carved away down to
 * `targetGivens` while the puzzle stays uniquely solvable.
 */
export function generateSpec(
  spec: BoardSpec,
  targetGivens: number,
  rng: () => number = Math.random,
): SudokuState {
  const solution = emptyGrid(spec);
  fillFull(solution, spec, rng);

  const puzzle = cloneGrid(solution);
  const cells = shuffle(
    Array.from({ length: spec.n * spec.n }, (_, i) => i),
    rng,
  );

  let givens = spec.n * spec.n;
  for (const idx of cells) {
    if (givens <= targetGivens) break;
    const r = Math.floor(idx / spec.n);
    const c = idx % spec.n;
    if (puzzle[r][c] === 0) continue;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    if (countSolutions(cloneGrid(puzzle), 2, spec) !== 1) {
      puzzle[r][c] = backup; // removal broke uniqueness — keep it
    } else {
      givens--;
    }
  }

  const given = puzzle.map((row) => row.map((v) => v !== 0));
  return { puzzle, given, solution, spec };
}

export function generate(level: Level, rng: () => number = Math.random): SudokuState {
  const { spec, givens } = LEVELS[level];
  return generateSpec(spec, givens, rng);
}

export function setCell(state: SudokuState, r: number, c: number, v: number): SudokuState {
  if (state.given[r][c]) return state;
  const puzzle = cloneGrid(state.puzzle);
  puzzle[r][c] = v; // 0 clears
  return { ...state, puzzle };
}

// Cells (as "r,c" keys) that conflict with another filled cell in the same
// row/col/box — for red-highlighting. Givens can't conflict (valid solution).
export function conflicts(state: SudokuState): Set<string> {
  const bad = new Set<string>();
  const g = state.puzzle;
  const spec = state.spec;
  for (let r = 0; r < spec.n; r++)
    for (let c = 0; c < spec.n; c++) {
      const v = g[r][c];
      if (v === 0) continue;
      g[r][c] = 0;
      if (!isValid(g, r, c, v, spec)) bad.add(`${r},${c}`);
      g[r][c] = v;
    }
  return bad;
}

export function isSolved(state: SudokuState): boolean {
  const { n } = state.spec;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) if (state.puzzle[r][c] !== state.solution[r][c]) return false;
  return true;
}
