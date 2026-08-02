// Sudoku — pure generator + solver + play state. Puzzles are generated with a
// uniqueness guarantee (a cell is only removed if the puzzle stays uniquely
// solvable). Deterministic given a RNG. No DOM.
import { shuffle } from "@shared/rng";

export type Grid = number[][]; // 9x9, 0 = empty

export interface SudokuState {
  puzzle: Grid; // current visible grid (givens + player entries)
  given: boolean[][]; // true = fixed clue, not editable
  solution: Grid;
}

export type Level = "easy" | "medium" | "hard" | "expert";
const GIVENS: Record<Level, number> = { easy: 42, medium: 34, hard: 28, expert: 24 };

function emptyGrid(): Grid {
  return Array.from({ length: 9 }, () => Array<number>(9).fill(0));
}
function cloneGrid(g: Grid): Grid {
  return g.map((r) => r.slice());
}

export function isValid(g: Grid, r: number, c: number, v: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (g[r][i] === v || g[i][c] === v) return false;
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++)
    for (let dc = 0; dc < 3; dc++) if (g[br + dr][bc + dc] === v) return false;
  return true;
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

// Fill an empty grid with a random complete valid solution.
function fillFull(g: Grid, rng: () => number): boolean {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) {
      if (g[r][c] === 0) {
        for (const v of shuffle(DIGITS, rng)) {
          if (isValid(g, r, c, v)) {
            g[r][c] = v;
            if (fillFull(g, rng)) return true;
            g[r][c] = 0;
          }
        }
        return false;
      }
    }
  return true;
}

// Count solutions up to `limit` (used to verify uniqueness — stop early at 2).
export function countSolutions(g: Grid, limit = 2): number {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) {
      if (g[r][c] === 0) {
        let total = 0;
        for (let v = 1; v <= 9; v++) {
          if (isValid(g, r, c, v)) {
            g[r][c] = v;
            total += countSolutions(g, limit - total);
            g[r][c] = 0;
            if (total >= limit) return total;
          }
        }
        return total;
      }
    }
  return 1; // no empty cell → a complete valid solution
}

export function generate(level: Level, rng: () => number = Math.random): SudokuState {
  const solution = emptyGrid();
  fillFull(solution, rng);

  const puzzle = cloneGrid(solution);
  const target = GIVENS[level];
  const cells = shuffle(
    Array.from({ length: 81 }, (_, i) => i),
    rng,
  );

  let givens = 81;
  for (const idx of cells) {
    if (givens <= target) break;
    const r = Math.floor(idx / 9);
    const c = idx % 9;
    if (puzzle[r][c] === 0) continue;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    if (countSolutions(cloneGrid(puzzle), 2) !== 1) {
      puzzle[r][c] = backup; // removal broke uniqueness — keep it
    } else {
      givens--;
    }
  }

  const given = puzzle.map((row) => row.map((v) => v !== 0));
  return { puzzle, given, solution };
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
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) {
      const v = g[r][c];
      if (v === 0) continue;
      g[r][c] = 0;
      if (!isValid(g, r, c, v)) bad.add(`${r},${c}`);
      g[r][c] = v;
    }
  return bad;
}

export function isSolved(state: SudokuState): boolean {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) if (state.puzzle[r][c] !== state.solution[r][c]) return false;
  return true;
}
