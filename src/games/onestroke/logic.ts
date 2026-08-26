// One Stroke - pure logic. A grid holds open squares and walls. One square is
// marked, and the player draws a single unbroken line from it through every
// open square, one step at a time, never lifting and never crossing what they
// have already drawn. The board is won when the line covers every open square.
// No timer inside the rules, no reading, no drag required. Deterministic given
// an rng, so `logic.test.ts` drives the same engine the player does.
//
// THE BOARD IS BUILT FROM AN ANSWER, and that is the whole design.
//
// A child cannot tell an unsolvable puzzle from a hard one. They keep going,
// they lose, and the thing that lied to them is the game. So the deal never
// scatters walls and hopes, and it never runs a solver to filter either - a
// solver that gives up under a node cap answers "no solution found", which
// reads the same for a board that has none and a board that is merely deep,
// and taking that first reading is how an impossible board reaches a
// five-year-old.
//
// `deal` produces a HAMILTONIAN PATH first: one ordered walk that visits every
// open square exactly once, each step to an orthogonal neighbour. The walls are
// then not chosen and checked, they are TAKEN OFF THE ENDS of that walk - a
// prefix and a suffix - so what is left is still one unbroken walk over exactly
// the squares that remain. The marked square is where that walk begins. A
// solution therefore exists before the board is drawn, and nothing had to be
// solved to know it.
//
// THE WALK IS STIRRED, NOT SEARCHED, and that distinction is borrowed from a
// measured failure one directory over. Pipe Flow built its walk with a
// randomised depth-first search under a 200,000-node budget: correct whenever
// it finished, and on a 7x7 it gave up 91.17% of the time and fell back to a
// fixed row-by-row zigzag, so nine hard boards in ten were cut from the same
// underlying shape. Nothing threw and every gate stayed green. `stir` below is
// BACKBITE instead - take an end of the walk, pick any neighbour of it, reverse
// the piece between them - and every one of those moves leaves a walk that
// still visits every square exactly once. It cannot fail, it has no budget to
// run out of, and it has no fallback branch to hide in.
//
// `deal` hands the finished walk back as `plan` and the test replays it through
// `step` - the shipped rules, not a restatement of them. `plan` is returned
// rather than stored on the state on purpose: it is a property of the deal, not
// of the position, and an answer living inside the state is an answer that ends
// up on the child's disk inside every saved snapshot.
import { randInt } from "@shared/rng";

/** A cell index, `row * size + col`. Logic knows no pixels and no colours. */
export type Cell = number;

export type LevelId = "easy" | "medium" | "hard";

export interface Level {
  /** The grid is always square: `size` x `size`. */
  size: number;
  /** How many of those squares are walls, and therefore not part of the line. */
  blocked: number;
}

/**
 * Three tiers, and both numbers move together on purpose.
 *
 * The grid is what makes a board longer to think about; the walls are what stop
 * it being a lap of the rectangle. Growing the grid alone would give the later
 * tiers more room and therefore MORE routes that work, which is a bigger puzzle
 * and not a harder one. Adding walls alone would eventually make a board so
 * tight that only one route exists, which is a harder puzzle and a duller one -
 * every corner would be forced and nothing would be chosen.
 *
 * These counts leave 23, 30 and 38 open squares. `scripts/sim/onestroke-paths.mjs`
 * measures what that does to a player rather than assuming it.
 */
export const LEVELS: Record<LevelId, Level> = {
  easy: { size: 5, blocked: 2 },
  medium: { size: 6, blocked: 6 },
  hard: { size: 7, blocked: 11 },
};

export const LEVEL_IDS = ["easy", "medium", "hard"] as const;

export interface OneStrokeState {
  size: number;
  /** The walls, as cell indices. Never part of the line, never drawn on. */
  blocked: readonly Cell[];
  /** The marked square. The line always begins here and can never leave it. */
  start: Cell;
  /**
   * The line as drawn so far, in order, always starting at `start`. It is never
   * empty: a fresh board is the marked square on its own.
   */
  path: Cell[];
}

/* ------------------------------------------------------------------ the grid */

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
 * Orthogonally adjacent, and never diagonally.
 *
 * Computed from row and column rather than from `Math.abs(a - b) === 1`, which
 * is the tempting one-liner and is wrong at every row boundary: on a 5-wide
 * grid, cells 4 and 5 differ by one and sit at opposite edges, so the line
 * would be able to leave the board on the right and reappear on the left.
 */
export function adjacent(size: number, a: Cell, b: Cell): boolean {
  if (!onBoard(a, size) || !onBoard(b, size)) return false;
  const dr = Math.abs(rowOf(a, size) - rowOf(b, size));
  const dc = Math.abs(colOf(a, size) - colOf(b, size));
  return dr + dc === 1;
}

/** Every orthogonal neighbour of `cell` that is still on the board. */
export function neighbours(size: number, cell: Cell): Cell[] {
  const r = rowOf(cell, size);
  const c = colOf(cell, size);
  const out: Cell[] = [];
  if (r > 0) out.push(cell - size);
  if (r < size - 1) out.push(cell + size);
  if (c > 0) out.push(cell - 1);
  if (c < size - 1) out.push(cell + 1);
  return out;
}

/* ------------------------------------------------------------------- reading */

/** Is this square a wall? An index off the board answers true - nothing may go there. */
export function isBlocked(state: OneStrokeState, cell: Cell): boolean {
  if (!onBoard(cell, state.size)) return true;
  return state.blocked.includes(cell);
}

/** How many squares the line has to cover to finish this board. */
export function openCount(state: OneStrokeState): number {
  return state.size * state.size - state.blocked.length;
}

/** How many it covers right now - the number the stat row shows. */
export function covered(state: OneStrokeState): number {
  return state.path.length;
}

/** The live end of the line, which is the only place it can grow from. */
export function head(state: OneStrokeState): Cell {
  return state.path[state.path.length - 1];
}

/**
 * Every open square covered, exactly once.
 *
 * The set is rebuilt rather than trusted to `path.length`. `step` cannot
 * produce a repeat, but a restored snapshot arrives from a disk that a previous
 * build wrote, that a browser may have truncated and that a person can edit -
 * and a duplicate there would win a board that is not actually covered.
 */
export function isSolved(state: OneStrokeState): boolean {
  if (state.path.length !== openCount(state)) return false;
  const seen = new Set<Cell>();
  for (const cell of state.path) {
    if (isBlocked(state, cell) || seen.has(cell)) return false;
    seen.add(cell);
  }
  return true;
}

/**
 * What this game's record measures, in the one place that says so.
 *
 * It is the CLOCK, and that is forced by the construction rather than chosen.
 * Every line that finishes a board is exactly one square long per open square,
 * because the rules let a square be covered once and the board is only won when
 * all of them are - so a tap count is the same number for every winner and
 * ranks nobody. What differs between two players is how long it took them to
 * see the route.
 *
 * The board scopes the record to the level, because 23 squares and 38 squares
 * are not the same achievement, and `sdk/score.ts` reads the unit to decide
 * that a faster time wins.
 */
export function scoreFor(
  _state: OneStrokeState,
  level: LevelId,
  ms: number,
): { value: number; unit: "ms"; board: LevelId } {
  return { value: ms, unit: "ms", board: level };
}

/* -------------------------------------------------------------------- rules */

export type StrokeOutcome =
  | { kind: "ignored" }
  | { kind: "drawn"; cell: Cell }
  | { kind: "retracted"; to: Cell }
  | { kind: "completed"; cell: Cell };

export interface StrokeStep {
  state: OneStrokeState;
  outcome: StrokeOutcome;
}

const IGNORED = { kind: "ignored" } as const;

/**
 * Take the line back one square.
 *
 * The only way back there is, and it is deliberately small. `undo` and touching
 * the square you came from are the same move through the same code, so the
 * button and the finger can never disagree about what taking it back means.
 *
 * At the marked square it answers "ignored" rather than emptying anything: the
 * line is never shorter than the square it starts on, so there is always
 * somewhere for the next step to grow from.
 */
export function undo(state: OneStrokeState): StrokeStep {
  if (state.path.length < 2) return { state, outcome: IGNORED };
  const path = state.path.slice(0, -1);
  return { state: { ...state, path }, outcome: { kind: "retracted", to: path[path.length - 1] } };
}

/** Back to the marked square, keeping the board. This is what restart draws. */
export function clear(state: OneStrokeState): OneStrokeState {
  return { ...state, path: [state.start] };
}

/**
 * Touch a square. The whole input model, and the one that must always work.
 *
 * Four readings, and only one of them draws:
 *
 *  - the square you CAME FROM: the line steps back one. That is what makes a
 *    dragged finger that overshoots simply come back, and it is the same move
 *    `undo` makes.
 *  - any OTHER square already under the line: IGNORED. Retracting all the way
 *    back to it is the tempting reading and it is the wrong one here - on a
 *    board of nearly forty squares a stray touch near the start would wipe a
 *    drawing that took a minute to make, with nothing anywhere to get it back.
 *    One mistap costs one square, or it costs nothing.
 *  - an open square NEXT DOOR: the line grows. If that was the last open square
 *    the board is finished, and the outcome says so rather than leaving the
 *    caller to re-derive it.
 *  - anything else - a wall, a diagonal, a square across the board, an index
 *    this board does not have: IGNORED. A refusal is not an error, and a thrown
 *    error inside a tap handler costs a child the board.
 */
export function step(state: OneStrokeState, cell: Cell): StrokeStep {
  if (!onBoard(cell, state.size)) return { state, outcome: IGNORED };

  const at = state.path.indexOf(cell);
  if (at >= 0) {
    // The square before the head, and nothing else. The head itself is `at ===
    // length - 1` and falls through to ignored, so touching where the line
    // already is does nothing at all.
    return at === state.path.length - 2 ? undo(state) : { state, outcome: IGNORED };
  }

  if (isBlocked(state, cell)) return { state, outcome: IGNORED };
  if (!adjacent(state.size, head(state), cell)) return { state, outcome: IGNORED };

  const path = [...state.path, cell];
  const next = { ...state, path };
  return {
    state: next,
    outcome: path.length === openCount(state) ? { kind: "completed", cell } : { kind: "drawn", cell },
  };
}

/* ---------------------------------------------------------------- the deal */

export interface Deal {
  state: OneStrokeState;
  /** One line that finishes this board, from `state.start`. See the header. */
  plan: Cell[];
  /**
   * How many backbite folds landed while stirring the WHOLE GRID, before the
   * walls were taken off.
   *
   * An INSTRUMENTED COUNTER rather than a statistic, and the one that is
   * guaranteed: no cell of a full rectangle has fewer than two neighbours, so
   * this stir can always move and a zero here means it never ran. Pipe Flow's
   * walk silently stopped being stirred for weeks and every gate stayed green,
   * because nothing anywhere counted which branch had run.
   */
  seedFolds: number;
  /**
   * How many landed while stirring the REGION the walls left.
   *
   * Not guaranteed, and the honesty is the point. A region can be a corridor
   * whose two ends are both dead ends, and backbite has no legal move from
   * either - so this reads 0, the board is still a valid one, and the line
   * through it is simply the one the cut handed over. `deal` re-cuts to avoid
   * that (see `foldable`), which is a QUALITY choice among boards that are all
   * already solvable, never a retry until an answer exists.
   * `scripts/sim/onestroke-paths.mjs` reports the share that still read 0.
   */
  folds: number;
}

/**
 * How many backbite moves to stir a walk with, per cell of the region.
 *
 * 200 is carried over from the flow deal, where it is a MEASUREMENT rather than
 * a round number: it is what took the share of hard deals still recognisable as
 * the seed zigzag from 91.2% to zero. Each move reverses at most one whole
 * walk, so the stir on the largest board here is a few hundred thousand array
 * writes and lands well inside a frame. That cost is the property that let a
 * stir replace a search.
 */
const STIR_PER_CELL = 200;

/**
 * The SEED walk: along row 0, back along row 1, along row 2, and so on.
 *
 * It visits every cell of any square grid exactly once, which is the single
 * property `stir` needs of a starting point - backbite has to begin from a walk
 * that is already Hamiltonian, and this is the cheapest one there is.
 *
 * It is EXPORTED so the regression guard can be written against the real thing.
 * `logic.test.ts` and `scripts/sim/onestroke-paths.mjs` both ask whether a
 * dealt board is still sitting on this order, and a second private copy of six
 * lines of arithmetic is a second thing that can quietly stop agreeing.
 */
export function seedWalk(size: number): Cell[] {
  const out: Cell[] = [];
  for (let r = 0; r < size; r++) {
    for (let i = 0; i < size; i++) {
      const c = r % 2 === 0 ? i : size - 1 - i;
      out.push(r * size + c);
    }
  }
  return out;
}

/**
 * BACKBITE. Stir a Hamiltonian walk into a random one, in place.
 *
 * One move: take the far end of the walk, pick any neighbour of it that is
 * inside the region, and reverse the piece of the walk that comes after that
 * neighbour. The result still visits every square exactly once - reversing a
 * suffix leaves every adjacency inside it intact and creates exactly one new
 * one at the fold, which is the neighbour we chose. So the walk is Hamiltonian
 * after every single move, and the invariant needs no checking anywhere.
 *
 * Half the moves flip the whole walk end for end first, or only one of its two
 * ends would ever move and the other half of the walk would stay as it was
 * dealt. Reversing the whole thing costs the same as the fold itself at these
 * sizes.
 *
 * `isOpen` is what makes this work on a board with walls: the region a real
 * deal stirs is not the rectangle, so a neighbour outside it is not a place the
 * walk may fold to. `onFold` exists for `logic.test.ts`, which asserts the
 * invariant after every individual fold rather than only at the end.
 *
 * Returns how many folds actually landed. A fold is SKIPPED when the neighbour
 * drawn is already the one next to the end on the walk, since folding there
 * would put the walk back exactly as it is.
 */
export function stir(
  path: Cell[],
  size: number,
  isOpen: (cell: Cell) => boolean,
  moves: number,
  rng: () => number,
  onFold?: (path: readonly Cell[]) => void,
): number {
  const n = path.length;
  if (n < 3) return 0;

  /** Where each cell currently sits in `path`, so a fold is O(1) to find. */
  const at = new Array<number>(size * size).fill(-1);
  for (let i = 0; i < n; i++) at[path[i]] = i;

  const reverseFrom = (from: number) => {
    for (let i = from, j = n - 1; i < j; i++, j--) {
      const a = path[i];
      path[i] = path[j];
      path[j] = a;
      at[path[i]] = i;
      at[path[j]] = j;
    }
  };

  let folds = 0;
  for (let m = 0; m < moves; m++) {
    if (rng() < 0.5) reverseFrom(0);

    const tail = path[n - 1];
    const options = neighbours(size, tail).filter(isOpen);
    // The walk is connected, so the end always has at least the square before
    // it. An empty list is impossible; the guard costs nothing and means a
    // future caller handing in a torn region gets a still walk, not a crash.
    if (options.length === 0) continue;
    const v = options[randInt(0, options.length - 1, rng)];
    const j = at[v];
    if (j === n - 2) continue;

    reverseFrom(j + 1);
    folds++;
    onFold?.(path);
  }

  return folds;
}

/**
 * How many cuts to try before taking whatever the last one gave.
 *
 * A bound rather than a loop until it works. Every candidate is ALREADY a
 * solvable board - the retry is only ever asking for a more interesting one -
 * so running out of attempts costs a duller puzzle and never a broken one, and
 * a deal that could hang would be the worse trade by a distance.
 */
const CUT_ATTEMPTS = 24;

/**
 * Can backbite move this region's walk at all?
 *
 * True when at least one END of the walk has an open neighbour that is not the
 * square next to it along the walk. An end with only its own walk-neighbour is
 * a dead end, backbite has no legal fold from it, and when BOTH ends are dead
 * ends the stir is frozen before it starts - measured at 20% of hard cuts
 * before this check existed, which is one board in five whose line is whatever
 * the cut happened to leave.
 *
 * O(1), which is why it is asked BEFORE stirring rather than discovered after:
 * a check that costs one array lookup can gate a retry, and a check that costs
 * a full stir cannot.
 */
function foldable(walk: readonly Cell[], size: number, walls: Set<Cell>): boolean {
  const ends: Array<[Cell, Cell]> = [
    [walk[0], walk[1]],
    [walk[walk.length - 1], walk[walk.length - 2]],
  ];
  return ends.some(([end, along]) =>
    neighbours(size, end).some((n) => !walls.has(n) && n !== along),
  );
}

/**
 * A board, and one line that finishes it.
 *
 * Four steps, and the third is the one worth reading twice:
 *
 *  1. the seed zigzag over the whole grid;
 *  2. stirred, so it is a random walk over the whole grid rather than a shape;
 *  3. the walls come OFF THE ENDS of that walk - a prefix and a suffix - which
 *     is what keeps the promise. What is left is a contiguous middle of a walk,
 *     so it is still one unbroken line over exactly the squares that remain, and
 *     the region it covers is connected because it contains that line. Choosing
 *     walls any other way would mean checking afterwards whether an answer
 *     still existed, which is the search this design does not have.
 *  4. stirred again, this time over the region, so the marked square is not
 *     always where the walls happened to stop.
 *
 * Splitting the walls between the two ends is not decoration: taken all from one
 * end they form a single blob every time, and a board with one blob in it looks
 * like the same board at every level.
 */
export function deal(level: LevelId, rng: () => number = Math.random): Deal {
  const { size, blocked } = LEVELS[level];
  const cells = size * size;

  const full = seedWalk(size);
  const seedFolds = stir(full, size, () => true, cells * STIR_PER_CELL, rng);

  let walls: Cell[] = [];
  let wallSet = new Set<Cell>();
  let plan: Cell[] = full;
  for (let attempt = 0; attempt < CUT_ATTEMPTS; attempt++) {
    const front = randInt(0, blocked, rng);
    const back = blocked - front;
    walls = [...full.slice(0, front), ...full.slice(cells - back)];
    wallSet = new Set(walls);
    plan = full.slice(front, cells - back);
    if (foldable(plan, size, wallSet)) break;
  }

  const folds = stir(plan, size, (cell) => !wallSet.has(cell), plan.length * STIR_PER_CELL, rng);

  return {
    state: {
      size,
      blocked: walls,
      start: plan[0],
      path: [plan[0]],
    },
    plan,
    seedFolds,
    folds,
  };
}

export function newGame(level: LevelId, rng: () => number = Math.random): OneStrokeState {
  return deal(level, rng).state;
}
