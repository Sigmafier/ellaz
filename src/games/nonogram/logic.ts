// Nonogram - pure logic. A square grid of hidden cells; every row and every
// column carries the RUN LENGTHS of its filled cells ("3 1" means a run of
// three, a gap, then a run of one). Fill the right cells and a picture comes
// out. No DOM, no React, no timer here. Deterministic given an rng, so
// `logic.test.ts` and `scripts/sim/nonogram-solvable.mjs` drive the same engine
// the player does.
//
// THE PUZZLE IS PROVED BEFORE IT IS DEALT, AND THE PROOF IS THE POINT.
//
// A nonogram whose clues admit two different pictures is not a hard nonogram.
// It is a coin toss wearing a puzzle's clothes: the player deduces as far as
// logic goes, guesses, and is told they are wrong by a board that had two right
// answers. A child cannot tell that apart from being bad at it.
//
// So `deal` never scatters clues and hopes, and it never asks a search whether
// a board is solvable either. A capped search answers "no solution found",
// which reads exactly the same for "impossible" and for "merely deep", and
// taking that first reading is how an unfair board reaches a five-year-old.
//
// Instead: draw the PICTURE first, read the clues off it, then run a LINE
// SOLVER over those clues alone. The line solver only ever writes a cell when
// every legal arrangement of that line agrees about it, so it is sound by
// construction - it cannot guess, and there is nothing in it to cap. If it
// fills the whole grid, then the clues force exactly one picture, and the
// puzzle is both UNIQUE and reachable without a single guess. If it stalls, the
// board would have needed a guess somewhere, and the deal is thrown away and
// re-rolled.
//
// That is a strictly stronger promise than uniqueness. A grid can have one
// solution that no amount of line-by-line reasoning reaches; those boards are
// real nonograms and they are also the ones that end in a coin toss, so they
// are rejected here too.
//
// It also buys the win check for free. Because the clues force one picture,
// "your rows read what the numbers say" and "you drew the hidden picture" are
// the same sentence - so `isSolved` compares runs against clues and the answer
// never has to be stored. Nothing in `NonogramState` spoils the picture, which
// means nothing on the child's disk does either.
import { pick } from "@shared/rng";

/** A cell index, `row * size + col`. Logic knows no pixels and no colours. */
export type Cell = number;

export type LevelId = "easy" | "medium" | "hard";

/** What the player has decided about one cell. */
export const BLANK = 0;
export const FILLED = 1;
/** Ruled OUT by the player. Never required, and never checked by `isSolved`. */
export const CROSSED = 2;
export type Mark = typeof BLANK | typeof FILLED | typeof CROSSED;

/** The run lengths of one line, longest-first in reading order. `[]` is an empty line. */
export type Clue = readonly number[];

export interface Level {
  /** The grid is always square: `size` x `size`. */
  size: number;
  /** Share of cells the noise starts filled. See `makePicture`. */
  density: number;
  /** Smoothing passes over the noise. 0 leaves speckle; 2 leaves shapes. */
  smooth: number;
}

/**
 * Three tiers, and only the GRID really changes - the density and the smoothing
 * are tuned to hold the filled share near half at every size, because a board
 * that is 78% filled is not a harder picture, it is a darker one.
 *
 * The 5x5 keeps `smooth: 0` on purpose. Smoothing a grid this small rounds a
 * picture down to one blob, and at five cells a line the speckle is where the
 * reading practice is. From 10x10 up the speckle is what makes a board look
 * like static, so two passes turn it into shapes - and the shapes happen to
 * survive the uniqueness proof more often, which was a bonus rather than the
 * reason (measured in `scripts/sim/nonogram-solvable.mjs`).
 */
export const LEVELS: Record<LevelId, Level> = {
  easy: { size: 5, density: 0.55, smooth: 0 },
  medium: { size: 10, density: 0.5, smooth: 2 },
  hard: { size: 15, density: 0.5, smooth: 2 },
};

export const LEVEL_IDS = ["easy", "medium", "hard"] as const;

export interface NonogramState {
  size: number;
  /** `rows[r]` is row r's clue, top to bottom. */
  rows: readonly Clue[];
  /** `cols[c]` is column c's clue, left to right. */
  cols: readonly Clue[];
  /** The player's board, `size * size` marks. THE ANSWER IS NOT IN HERE. */
  marks: Mark[];
}

/* ------------------------------------------------------------------ reading */

export function rowOf(cell: Cell, size: number): number {
  return Math.floor(cell / size);
}

export function colOf(cell: Cell, size: number): number {
  return cell % size;
}

function onBoard(cell: unknown, size: number): cell is Cell {
  return Number.isInteger(cell) && (cell as number) >= 0 && (cell as number) < size * size;
}

/**
 * The runs of a line, which is what a clue IS.
 *
 * `[false,true,true,false,true]` reads `[2,1]`. An all-empty line reads `[]`,
 * and that is a real clue rather than a missing one - a nonogram row with no
 * numbers means "nothing in this row", which is often the most useful clue on
 * the board.
 */
export function runsOf(line: readonly boolean[]): number[] {
  const out: number[] = [];
  let run = 0;
  for (const on of line) {
    if (on) run++;
    else if (run) {
      out.push(run);
      run = 0;
    }
  }
  if (run) out.push(run);
  return out;
}

/** The cells of row `r`, as the player has them. */
export function rowMarks(state: NonogramState, r: number): Mark[] {
  const out: Mark[] = [];
  for (let c = 0; c < state.size; c++) out.push(state.marks[r * state.size + c]);
  return out;
}

/** The cells of column `c`, as the player has them. */
export function colMarks(state: NonogramState, c: number): Mark[] {
  const out: Mark[] = [];
  for (let r = 0; r < state.size; r++) out.push(state.marks[r * state.size + c]);
  return out;
}

const sameClue = (a: Clue, b: Clue): boolean =>
  a.length === b.length && a.every((n, i) => n === b[i]);

/** Does this row read exactly what its numbers say? Crosses are ignored. */
export function rowSatisfied(state: NonogramState, r: number): boolean {
  return sameClue(runsOf(rowMarks(state, r).map((m) => m === FILLED)), state.rows[r]);
}

/** Does this column read exactly what its numbers say? */
export function colSatisfied(state: NonogramState, c: number): boolean {
  return sameClue(runsOf(colMarks(state, c).map((m) => m === FILLED)), state.cols[c]);
}

/**
 * Every row and every column reads what its numbers say.
 *
 * No stored answer is compared against, and none needs to be: `deal` only ships
 * boards whose clues force ONE picture, so satisfying every clue and drawing
 * the hidden picture are the same event. Crosses are the player's own notes and
 * are deliberately not part of the condition - a solver who never crosses a
 * single cell has still solved it.
 */
export function isSolved(state: NonogramState): boolean {
  for (let i = 0; i < state.size; i++) {
    if (!rowSatisfied(state, i)) return false;
    if (!colSatisfied(state, i)) return false;
  }
  return true;
}

/** How many cells the player has filled in. */
export function filledCount(state: NonogramState): number {
  return state.marks.reduce<number>((n, m) => n + (m === FILLED ? 1 : 0), 0);
}

/** How many cells the finished picture holds - the sum of every row clue. */
export function clueTotal(state: NonogramState): number {
  return state.rows.reduce((n, clue) => n + clue.reduce((a, b) => a + b, 0), 0);
}

/**
 * What this game's record measures, in the one place that says so.
 *
 * Only the NUMBER of a personal best is ever persisted, never the unit, so
 * `sdk/score.ts` reads the unit to decide that a FAST solve wins - and the
 * board scopes the record to the tier, because four minutes on a 15x15 and four
 * minutes on a 5x5 are not the same afternoon.
 */
export function scoreFor(
  elapsedMs: number,
  level: LevelId,
): { value: number; unit: "ms"; board: LevelId } {
  return { value: elapsedMs, unit: "ms", board: level };
}

/* -------------------------------------------------------------------- rules */

/** Which mark a tap in this mode wants to leave behind. */
export type PaintMode = "fill" | "cross";

export function markFor(mode: PaintMode): Mark {
  return mode === "fill" ? FILLED : CROSSED;
}

/**
 * What a tap on this cell produces: the mode's mark, or BLANK if it is already
 * there. Tapping the same cell twice always takes it back, in both modes, so
 * changing your mind never needs a second control to find.
 */
export function tapMark(state: NonogramState, cell: Cell, mode: PaintMode): Mark {
  if (!onBoard(cell, state.size)) return BLANK;
  const wanted = markFor(mode);
  return state.marks[cell] === wanted ? BLANK : wanted;
}

export type NonogramOutcome =
  | { kind: "ignored" }
  | { kind: "marked"; cell: Cell; from: Mark; to: Mark };

export interface NonogramStep {
  state: NonogramState;
  outcome: NonogramOutcome;
}

const IGNORED = { kind: "ignored" } as const;

/**
 * Write one cell.
 *
 * An off-board index answers "ignored" rather than throwing. A restored
 * snapshot can hand these rules a cell this board no longer has, and a thrown
 * error inside a tap handler costs a child the whole board. Writing the mark a
 * cell already holds is ignored too, so a drag across cells that are already
 * right allocates nothing and re-renders nothing.
 */
export function setMark(state: NonogramState, cell: Cell, mark: Mark): NonogramStep {
  if (!onBoard(cell, state.size)) return { state, outcome: IGNORED };
  const from = state.marks[cell];
  if (from === mark) return { state, outcome: IGNORED };
  const marks = state.marks.slice();
  marks[cell] = mark;
  return { state: { ...state, marks }, outcome: { kind: "marked", cell, from, to: mark } };
}

/** A tap: the whole input model, and the one that must always work. */
export function tap(state: NonogramState, cell: Cell, mode: PaintMode): NonogramStep {
  if (!onBoard(cell, state.size)) return { state, outcome: IGNORED };
  return setMark(state, cell, tapMark(state, cell, mode));
}

/* ------------------------------------------------------------- the solver */

/**
 * What one line's clue forces, given what is already known about that line.
 *
 * Every legal arrangement of the runs is enumerated against the known cells,
 * and a position is only reported as forced when EVERY arrangement agrees about
 * it. That is what makes the solver sound: it writes a cell exactly when a
 * human could prove it, and it has no branch in which it guesses.
 *
 * The enumeration is small enough not to need a budget, which matters more than
 * it sounds - a budget would give this function a second way to answer "I could
 * not determine that", indistinguishable from the honest one. The widest line
 * here is 15 cells, where the most arrangements any clue admits is 495.
 *
 * Returns `null` for a line no arrangement fits, which is a contradiction
 * rather than a stall.
 */
export function forcedInLine(
  clue: Clue,
  line: readonly Mark[],
): { filled: boolean[]; empty: boolean[] } | null {
  const n = line.length;
  const filled = new Array<boolean>(n).fill(true);
  const empty = new Array<boolean>(n).fill(true);
  const draft = new Array<boolean>(n).fill(false);
  let any = false;

  /** Runs `clue[at..]` placed into `line[from..]`. */
  const place = (at: number, from: number): void => {
    if (at === clue.length) {
      for (let i = from; i < n; i++) {
        if (line[i] === FILLED) return; // a filled cell with no run left to cover it
        draft[i] = false;
      }
      any = true;
      for (let i = 0; i < n; i++) {
        if (draft[i]) empty[i] = false;
        else filled[i] = false;
      }
      return;
    }

    const len = clue[at];
    let rest = 0;
    for (let k = at + 1; k < clue.length; k++) rest += clue[k] + 1;

    for (let start = from; start + len + rest <= n; start++) {
      // Everything skipped on the way to `start` has to be empty, so a FILLED
      // cell behind us ends the loop rather than skipping this position: no
      // later start can cover it either.
      let clear = true;
      for (let i = from; i < start; i++) {
        if (line[i] === FILLED) {
          clear = false;
          break;
        }
      }
      if (!clear) break;

      let fits = true;
      for (let i = start; i < start + len; i++) {
        if (line[i] === CROSSED) {
          fits = false;
          break;
        }
      }
      if (!fits) continue;
      // The cell after a run must be empty, or the run is longer than the clue.
      if (start + len < n && line[start + len] === FILLED) continue;

      for (let i = from; i < start; i++) draft[i] = false;
      for (let i = start; i < start + len; i++) draft[i] = true;
      if (start + len < n) draft[start + len] = false;
      place(at + 1, start + len + 1);
    }
  };

  place(0, 0);
  return any ? { filled, empty } : null;
}

export type SolveResult =
  | { kind: "solved"; marks: Mark[]; passes: number }
  | { kind: "stalled"; marks: Mark[]; passes: number; undetermined: number }
  /** No picture satisfies these clues at all. A dealt board can never be this. */
  | { kind: "impossible"; passes: number };

/**
 * Deduce as far as line-by-line reasoning goes, and say where it got to.
 *
 * Rows then columns, over and over, until a whole sweep changes nothing. Only
 * forced cells are ever written, so `kind: "solved"` is a PROOF that the clues
 * admit exactly one picture and that a player can reach it without guessing
 * once. `kind: "stalled"` means the rest of that board is a coin toss.
 *
 * `passes` is how many sweeps it took. It is returned rather than logged
 * because it is the honest measure of how much cross-referencing a tier asks
 * for: a board solved in two sweeps mostly fell out of its own clues, and one
 * that took six made the player look at the other axis five times.
 */
export function lineSolve(size: number, rows: readonly Clue[], cols: readonly Clue[]): SolveResult {
  const marks: Mark[] = new Array<Mark>(size * size).fill(BLANK);
  let passes = 0;
  let changed = true;

  while (changed) {
    changed = false;
    passes++;

    for (let r = 0; r < size; r++) {
      const line: Mark[] = [];
      for (let c = 0; c < size; c++) line.push(marks[r * size + c]);
      const forced = forcedInLine(rows[r], line);
      if (!forced) return { kind: "impossible", passes };
      for (let c = 0; c < size; c++) {
        const at = r * size + c;
        if (marks[at] !== BLANK) continue;
        if (forced.filled[c]) {
          marks[at] = FILLED;
          changed = true;
        } else if (forced.empty[c]) {
          marks[at] = CROSSED;
          changed = true;
        }
      }
    }

    for (let c = 0; c < size; c++) {
      const line: Mark[] = [];
      for (let r = 0; r < size; r++) line.push(marks[r * size + c]);
      const forced = forcedInLine(cols[c], line);
      if (!forced) return { kind: "impossible", passes };
      for (let r = 0; r < size; r++) {
        const at = r * size + c;
        if (marks[at] !== BLANK) continue;
        if (forced.filled[r]) {
          marks[at] = FILLED;
          changed = true;
        } else if (forced.empty[r]) {
          marks[at] = CROSSED;
          changed = true;
        }
      }
    }
  }

  const undetermined = marks.reduce<number>((n, m) => n + (m === BLANK ? 1 : 0), 0);
  return undetermined === 0
    ? { kind: "solved", marks, passes }
    : { kind: "stalled", marks, passes, undetermined };
}

/* ---------------------------------------------------------------- the deal */

/** Read the row and column clues off a finished picture. */
export function cluesOf(picture: readonly boolean[], size: number): { rows: number[][]; cols: number[][] } {
  const rows: number[][] = [];
  const cols: number[][] = [];
  for (let r = 0; r < size; r++) {
    const line: boolean[] = [];
    for (let c = 0; c < size; c++) line.push(picture[r * size + c]);
    rows.push(runsOf(line));
  }
  for (let c = 0; c < size; c++) {
    const line: boolean[] = [];
    for (let r = 0; r < size; r++) line.push(picture[r * size + c]);
    cols.push(runsOf(line));
  }
  return { rows, cols };
}

/** Which half of the picture gets copied over the other, if either. */
export type Symmetry = "none" | "vertical" | "horizontal";

export const SYMMETRIES: readonly Symmetry[] = ["none", "vertical", "horizontal"];

/**
 * A picture: noise, smoothed into shapes, then optionally folded over itself.
 *
 * The fold is why a board tends to look like something rather than like static.
 * It also makes the puzzle EASIER to prove, which was a surprise and is worth
 * writing down: a mirrored picture gives two lines the same clue, and a clue
 * read twice pins its own line twice. Measured over 1,500 candidate 15x15
 * boards, folding took the share that survives the uniqueness proof from 77.3%
 * to 85.5%.
 */
export function makePicture(level: Level, symmetry: Symmetry, rng: () => number): boolean[] {
  const { size, density, smooth } = level;
  let cells = Array.from({ length: size * size }, () => rng() < density);

  for (let pass = 0; pass < smooth; pass++) {
    const next = cells.slice();
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        let on = 0;
        let total = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const rr = r + dr;
            const cc = c + dc;
            if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
            total++;
            if (cells[rr * size + cc]) on++;
          }
        }
        // A strict majority of the neighbourhood (the cell itself included)
        // decides; a tie leaves the cell alone, so the pass cannot flip a
        // balanced edge back and forth forever.
        next[r * size + c] = on * 2 > total ? true : on * 2 === total ? cells[r * size + c] : false;
      }
    }
    cells = next;
  }

  const half = Math.floor(size / 2);
  if (symmetry === "vertical") {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < half; c++) cells[r * size + (size - 1 - c)] = cells[r * size + c];
    }
  } else if (symmetry === "horizontal") {
    for (let c = 0; c < size; c++) {
      for (let r = 0; r < half; r++) cells[(size - 1 - r) * size + c] = cells[r * size + c];
    }
  }

  return cells;
}

/**
 * A picture with nothing much in it is not a picture.
 *
 * Both ends matter and for different reasons: an almost-empty board is a screen
 * of zeros with nothing to read, and an almost-full one is a rectangle. One
 * row's worth of cells at each end is a floor rather than a preference - it is
 * the least that stops a tier occasionally dealing a blank.
 */
function worthDrawing(picture: readonly boolean[], size: number): boolean {
  const on = picture.reduce<number>((n, c) => n + (c ? 1 : 0), 0);
  return on >= size && on <= size * size - size;
}

/**
 * How many candidate pictures to draw before falling back.
 *
 * Between 77% and 88% of candidates survive the uniqueness proof at the three
 * tiers (`scripts/sim/nonogram-solvable.mjs`), so forty rolls miss with a
 * probability under 1e-25. The cap exists because an unbounded loop is a hang
 * waiting for a tier nobody re-measured, not because it is expected to bind.
 */
export const DEAL_ATTEMPTS = 40;

/**
 * The board dealt when the rolls run out - a solid diamond.
 *
 * It is NOT a guess. `logic.test.ts` runs the same `lineSolve` over it at all
 * three sizes and requires `kind: "solved"`, so the fallback carries the same
 * proof every dealt board carries; it is simply proved once, at build time,
 * instead of forty times a second. That is the whole reason `deal` may return
 * it without re-checking - a re-check would need a branch for the failure, and
 * there is no honest thing to put in that branch.
 */
export function diamond(size: number): boolean[] {
  const mid = (size - 1) / 2;
  const radius = Math.floor(size / 2);
  return Array.from(
    { length: size * size },
    (_, i) => Math.abs(rowOf(i, size) - mid) + Math.abs(colOf(i, size) - mid) <= radius,
  );
}

export interface Deal {
  state: NonogramState;
  /**
   * The hidden picture. Handed back for tests and for the simulation script,
   * and deliberately NOT stored on the state - an answer inside the state is an
   * answer inside every snapshot, which is to say on the child's own disk.
   */
  picture: boolean[];
  /** How many candidates were drawn, including the one that survived. */
  attempts: number;
  /** True when the rolls ran out and `diamond` was used. Expected to be never. */
  fallback: boolean;
  /** Sweeps the proof needed. A measure of how much cross-referencing the board asks for. */
  passes: number;
}

/**
 * Deal a board that is proved solvable, uniquely, without a guess.
 *
 * Nothing here can return a board it has not proved. Every candidate goes
 * through `lineSolve`, and only `kind: "solved"` is accepted; the fallback
 * below carries its proof in a test rather than at runtime.
 */
export function deal(level: LevelId, rng: () => number = Math.random): Deal {
  const spec = LEVELS[level];

  for (let attempt = 1; attempt <= DEAL_ATTEMPTS; attempt++) {
    const symmetry = pick(SYMMETRIES, rng);
    const picture = makePicture(spec, symmetry, rng);
    if (!worthDrawing(picture, spec.size)) continue;

    const { rows, cols } = cluesOf(picture, spec.size);
    const proof = lineSolve(spec.size, rows, cols);
    if (proof.kind !== "solved") continue;

    return {
      state: {
        size: spec.size,
        rows,
        cols,
        marks: new Array<Mark>(spec.size * spec.size).fill(BLANK),
      },
      picture,
      attempts: attempt,
      fallback: false,
      passes: proof.passes,
    };
  }

  const picture = diamond(spec.size);
  const { rows, cols } = cluesOf(picture, spec.size);
  return {
    state: {
      size: spec.size,
      rows,
      cols,
      marks: new Array<Mark>(spec.size * spec.size).fill(BLANK),
    },
    picture,
    attempts: DEAL_ATTEMPTS,
    fallback: true,
    passes: 0,
  };
}

export function newGame(level: LevelId, rng: () => number = Math.random): NonogramState {
  return deal(level, rng).state;
}

/* ------------------------------------------------------------- the layout */

/**
 * The most runs a line of `size` cells can hold: every other cell filled.
 *
 * The renderer sizes its clue gutter from this rather than from the board in
 * front of it, so the grid does not jump a few pixels every time a restart
 * deals a busier picture - and so no board can ever be dealt whose clues do not
 * fit. `logic.test.ts` checks the second half against real deals.
 */
export function maxRuns(size: number): number {
  return Math.ceil(size / 2);
}

/** How wide one clue number is, as a fraction of a cell. */
export const CLUE_UNIT = 0.5;

/**
 * The board's width in cell-widths: the grid plus the clue gutter beside it.
 *
 * The gutter is square - the same allowance above the board for column clues as
 * beside it for row clues - so one number describes both axes.
 */
export function boardUnits(level: LevelId): number {
  const { size } = LEVELS[level];
  return size + maxRuns(size) * CLUE_UNIT;
}

/**
 * The px ceiling each tier's `min(...)` uses in `NonogramGame.tsx`.
 *
 * Declared here, beside the arithmetic that constrains it, and pinned twice:
 * `logic.test.ts` checks `boardUnits * cap` clears the 684px the desktop game
 * panel leaves, and reads the renderer's own literals back to check they still
 * say these numbers. The literals have to stay literal over there - the gate in
 * `src/ui/game-panel-clears-widest-board.test.ts` reads px out of the source as
 * TEXT, and an interpolated cap is a cap it cannot see.
 */
export const CELL_CAP: Record<LevelId, number> = { easy: 88, medium: 52, hard: 34 };

/** What the desktop game panel leaves a board, after GameChrome's own padding. */
export const PANEL_USABLE = 684;
