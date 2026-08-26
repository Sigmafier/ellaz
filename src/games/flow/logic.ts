// Pipe Flow — pure logic. Pairs of coloured dots sit on a square grid; the
// player lays a pipe from one dot of a pair to its twin through orthogonally
// adjacent cells. Pipes may not cross, and the board is won when every pair is
// joined AND every cell is under a pipe. No drag, no reading, no timer.
// Deterministic given an rng, so `logic.test.ts` drives the same engine the
// player does.
//
// THE BOARD IS BUILT FROM A SOLUTION, and that is the whole design.
//
// A child cannot tell an unsolvable puzzle from a hard one. They keep trying,
// they lose, and the thing that lied to them is the game. So the deal never
// scatters dots and hopes, and it never runs a solver to filter either — a
// solver that gives up under a node cap answers "no solution found", which
// reads the same for a board that has none and a board that is merely deep,
// and taking that first reading is how an impossible board reaches a
// five-year-old.
//
// `deal` builds a HAMILTONIAN PATH first: one ordered walk that visits every
// cell of the grid exactly once, each step to an orthogonal neighbour. Then it
// CUTS that walk into contiguous segments, one per colour, and the two ends of
// each segment become that colour's pair of dots. Because the segments
// partition a walk that covered the whole grid, they cover every cell and they
// cannot overlap — so "every pair joined and every cell covered" is satisfied
// by the segments themselves. Solvability is a property of the construction
// rather than a claim about it.
//
// `deal` hands those segments back as `plan`, and the test replays them through
// `beginAt`, `extendTo` and `release` — the shipped rules, not a restatement of
// them. `plan` is returned rather than stored on the state on purpose: it is a
// property of the deal, not of the position, and a solution living inside the
// state is a solution that ends up on the child's disk and inside every saved
// snapshot.
import { randInt, shuffle } from "@shared/rng";

/** A cell index, `row * size + col`. Logic knows no pixels and no colours. */
export type Cell = number;

export type LevelId = "easy" | "medium" | "hard";

export interface Level {
  /** The grid is always square: `size` x `size`. */
  size: number;
  /** How many pairs of dots, and therefore how many pipes to lay. */
  pairs: number;
}

/**
 * Three tiers, and the grid grows with the pair count rather than instead of
 * it. Holding the grid still and adding pairs would make the later tiers
 * CRAMPED rather than harder: every extra colour on a fixed board shortens
 * every pipe, and a puzzle of six two-cell hops is a shorter puzzle, not a
 * deeper one. Growing both keeps the average pipe about six cells long at
 * every tier, so what changes is how many routes have to agree with each other.
 */
export const LEVELS: Record<LevelId, Level> = {
  easy: { size: 5, pairs: 4 },
  medium: { size: 6, pairs: 5 },
  hard: { size: 7, pairs: 6 },
};

export const LEVEL_IDS = ["easy", "medium", "hard"] as const;

export interface FlowState {
  size: number;
  /**
   * `endpoints[color] = [a, b]` — the two dots of one pair, as cell indices.
   * The colour is a 0-based INDEX and never a hex code, exactly so the rules
   * can be unit-tested without a palette existing anywhere.
   */
  endpoints: ReadonlyArray<readonly [Cell, Cell]>;
  /**
   * `paths[color]` = the cells the player has laid for that colour, in the
   * order they laid them, always starting at one of its two dots. An empty
   * array means nothing has been drawn for that colour yet.
   */
  paths: Cell[][];
  /** The colour whose pipe is being drawn right now, or null. */
  drawing: number | null;
  /** Completed pipe-laying gestures. See `release`. */
  moves: number;
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
 * grid cells 4 and 5 differ by one and sit at opposite edges, so a pipe would
 * be able to leave the board on the right and reappear on the left.
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

/**
 * Which colour's pipe covers this cell, or null.
 *
 * A DOT is not covered until a pipe reaches it: the answer here is about the
 * paths alone, so a pair the player has not touched reads as empty ground even
 * though the renderer is drawing two dots on it.
 */
export function cellOwner(state: FlowState, cell: Cell): number | null {
  for (let c = 0; c < state.paths.length; c++) {
    if (state.paths[c].includes(cell)) return c;
  }
  return null;
}

/** Which colour has a DOT on this cell, or null. */
export function endpointAt(state: FlowState, cell: Cell): number | null {
  for (let c = 0; c < state.endpoints.length; c++) {
    const [a, b] = state.endpoints[c];
    if (a === cell || b === cell) return c;
  }
  return null;
}

/** The dot at the far end of the pipe being drawn — the one that finishes it. */
function twinOf(state: FlowState, color: number): Cell {
  const [a, b] = state.endpoints[color];
  return state.paths[color][0] === a ? b : a;
}

/** Is this colour's pipe joined, dot to dot? */
export function isConnected(state: FlowState, color: number): boolean {
  const path = state.paths[color];
  if (path.length < 2) return false;
  const [a, b] = state.endpoints[color];
  const head = path[path.length - 1];
  const tail = path[0];
  return (tail === a && head === b) || (tail === b && head === a);
}

/** How many pipes are joined right now — the number the stat row shows. */
export function connectedCount(state: FlowState): number {
  let n = 0;
  for (let c = 0; c < state.paths.length; c++) if (isConnected(state, c)) n++;
  return n;
}

/**
 * Every pair joined AND every cell covered. BOTH halves, and the second is the
 * one that is easy to leave out.
 *
 * Joining alone would win on a board full of holes: the shortest route between
 * two dots that happen to sit near each other is two cells long, so a player
 * could join all six pairs having covered a third of the grid. That is not this
 * puzzle — the deal cuts a walk that visited every cell, so a solution that
 * leaves a hole is not the solution the board was built from, and letting it
 * win would teach a child that the empty squares never mattered.
 */
export function isSolved(state: FlowState): boolean {
  const covered = new Set<Cell>();
  for (let c = 0; c < state.paths.length; c++) {
    if (!isConnected(state, c)) return false;
    for (const cell of state.paths[c]) {
      // Two pipes on one cell is a board `extendTo` cannot produce, and the
      // check costs nothing next to reading a restored snapshot wrong.
      if (covered.has(cell)) return false;
      covered.add(cell);
    }
  }
  return covered.size === state.size * state.size;
}

/**
 * What this game's record measures, in the one place that says so.
 *
 * Only the NUMBER is persisted, never the unit, so `sdk/score.ts` reads the
 * unit to decide that fewer moves win — and the board scopes the record to the
 * difficulty, because eleven pipes laid on a 5x5 and eleven on a 7x7 are not
 * the same achievement.
 */
export function scoreFor(
  state: FlowState,
  level: LevelId,
): { value: number; unit: "moves"; board: LevelId } {
  return { value: state.moves, unit: "moves", board: level };
}

/* -------------------------------------------------------------------- rules */

export type FlowOutcome =
  | { kind: "ignored" }
  | { kind: "began"; color: number; cleared: boolean }
  | { kind: "extended"; color: number; cell: Cell; cut: number | null }
  | { kind: "retracted"; color: number; to: Cell }
  | { kind: "completed"; color: number }
  | { kind: "released"; color: number; counted: boolean };

export interface FlowStep {
  state: FlowState;
  outcome: FlowOutcome;
}

const IGNORED = { kind: "ignored" } as const;

/** A pipe of one cell is the dot on its own, so it is not a route yet. */
const MIN_ROUTE = 2;

/**
 * Close whatever gesture is open, and say whether it was worth counting.
 *
 * A lone dot is dropped rather than left lying about: it draws as a pipe stub
 * going nowhere, and a child who taps a dot and changes their mind should be
 * left with the board they started from. Dropping it is also why the move does
 * not count — taking a route back must never cost anything, for exactly the
 * reason `sort/logic.ts` gives for undo. A count that only goes up turns
 * changing your mind into a penalty and turns the record into a measure of how
 * often a five-year-old mis-taps.
 */
function endGesture(state: FlowState): { state: FlowState; counted: boolean } {
  const color = state.drawing;
  if (color === null) return { state, counted: false };
  const paths = state.paths.map((p) => p.slice());
  const counted = paths[color].length >= MIN_ROUTE;
  if (!counted) paths[color] = [];
  return {
    state: { ...state, paths, drawing: null, moves: state.moves + (counted ? 1 : 0) },
    counted,
  };
}

/**
 * Start a pipe at a dot.
 *
 * Starting at a dot whose colour ALREADY has a pipe clears that pipe first, and
 * that is the standard forgiving behaviour rather than a shortcut: it is how a
 * child undoes a wrong route without a separate button to find, read and
 * understand. Whatever gesture was open closes first, so the two never overlap.
 *
 * A cell with no dot on it answers "ignored" rather than throwing. A restored
 * position can hand these rules an index this board no longer has, and a thrown
 * error inside a tap handler costs a child the board.
 */
export function beginAt(state: FlowState, cell: Cell): FlowStep {
  const color = onBoard(cell, state.size) ? endpointAt(state, cell) : null;
  if (color === null) return { state, outcome: IGNORED };

  const closed = endGesture(state).state;
  const paths = closed.paths.map((p) => p.slice());
  const cleared = paths[color].length > 0;
  paths[color] = [cell];
  return {
    state: { ...closed, paths, drawing: color },
    outcome: { kind: "began", color, cleared },
  };
}

/**
 * Take the pipe being drawn into an adjacent cell.
 *
 * Four things can happen, and three of them are the forgiving reading:
 *
 *  - the cell is already on THIS pipe, anywhere along it: the pipe RETRACTS to
 *    there. Stepping back onto the previous cell is the ordinary case and falls
 *    out of the same line, so a finger that overshoots simply comes back.
 *  - the cell is under ANOTHER colour's pipe: that pipe is CUT back to just
 *    before the collision. The alternative is refusing the move, which makes a
 *    crowded board feel locked and forces a child to go and dismantle the other
 *    route first.
 *  - the cell is this colour's other dot: the pipe is JOINED. The head sits on
 *    the dot from then on, so nothing can be drawn past it and only a
 *    retraction can move it.
 *  - anything else — not adjacent, off the board, another colour's dot — is
 *    IGNORED. Another colour's dot is a wall on purpose: the deal never routes
 *    one segment through another segment's end, so allowing it would open
 *    routes the construction never promised.
 */
export function extendTo(state: FlowState, cell: Cell): FlowStep {
  const color = state.drawing;
  if (color === null) return { state, outcome: IGNORED };
  if (!onBoard(cell, state.size)) return { state, outcome: IGNORED };

  const path = state.paths[color];
  if (path.length === 0) return { state, outcome: IGNORED };

  const head = path[path.length - 1];
  if (!adjacent(state.size, head, cell)) return { state, outcome: IGNORED };

  const own = path.indexOf(cell);
  if (own >= 0) {
    const paths = state.paths.map((p) => p.slice());
    paths[color] = path.slice(0, own + 1);
    return {
      state: { ...state, paths },
      outcome: { kind: "retracted", color, to: cell },
    };
  }

  // The pipe already reaches its far dot, so there is nowhere forward to go.
  // Retraction above is deliberately checked first, or a joined pipe would be
  // frozen until the player cleared it from the other end.
  if (path.length > 1 && head === twinOf(state, color)) return { state, outcome: IGNORED };

  const dot = endpointAt(state, cell);
  if (dot !== null && dot !== color) return { state, outcome: IGNORED };

  const paths = state.paths.map((p) => p.slice());

  if (dot === color) {
    paths[color] = [...path, cell];
    return { state: { ...state, paths }, outcome: { kind: "completed", color } };
  }

  const victim = cellOwner(state, cell);
  if (victim !== null) {
    const hit = paths[victim].indexOf(cell);
    const kept = paths[victim].slice(0, hit);
    // A cut that leaves a single dot leaves a stub, and a stub is not a route.
    paths[victim] = kept.length >= MIN_ROUTE ? kept : [];
  }
  paths[color] = [...path, cell];
  return {
    state: { ...state, paths },
    outcome: { kind: "extended", color, cell, cut: victim },
  };
}

/**
 * The gesture ended: the finger lifted after a drag, or the pipe just joined.
 *
 * This is what `moves` counts, and it is why the record measures ROUTE QUALITY
 * rather than finger travel. A pipe eight cells long is one move whether it was
 * dragged in one sweep or tapped out cell by cell, so the number says how many
 * times the player committed to a route, not how much they touched the screen.
 */
export function release(state: FlowState): FlowStep {
  const color = state.drawing;
  if (color === null) return { state, outcome: IGNORED };
  const closed = endGesture(state);
  return {
    state: closed.state,
    outcome: { kind: "released", color, counted: closed.counted },
  };
}

/* ---------------------------------------------------------------- the deal */

export interface Deal {
  state: FlowState;
  /** One solution route per colour, in `endpoints` order. See the header. */
  plan: Cell[][];
}

/**
 * How many cells the shortest pipe may be.
 *
 * Two dots side by side would be a pair a child joins without looking, and
 * three in a row is barely more. Three cells is the floor here AND the two ends
 * of every segment are checked not to be neighbours, so no pipe is ever a
 * single obvious hop — those two together are what stop a tier collapsing into
 * "tap the pairs that are already touching".
 */
const MIN_SEGMENT = 3;

/**
 * How hard to try for a random cut before taking the even one.
 *
 * A bound rather than a loop until it works: the constraint below is a
 * property of where the walk happens to bend, so a pathological walk could in
 * principle never satisfy it, and a deal that hangs is worse than a deal that
 * is a little regular.
 */
const CUT_ATTEMPTS = 60;

/**
 * How many backbite moves to stir the walk with, per cell of the grid.
 *
 * 200 is a MEASUREMENT, not a round number. At 7x7 it is ~9,800 moves, and it
 * is what took the share of hard deals still recognisable as the seed snake
 * from 91.2% to 0. Each move is a suffix reversal of at most 49 cells, so the
 * whole stir is under half a million array writes and lands well inside a
 * frame - which is the property that let this replace a search with a budget.
 */
const STIR_PER_CELL = 200;

/**
 * A walk that visits every cell of the grid exactly once, well mixed.
 *
 * THIS USED TO BE A SEARCH AND THE SEARCH WAS THE BUG. A randomised
 * depth-first walk with backtracking under a 200,000-node budget is correct
 * whenever it finishes and simply gives up when it does not - and on a 7x7 it
 * gave up almost every time. Measured over 4,000 deals per level by
 * `scripts/sim/flow-routes.mjs`: the budget ran out on 91.2% of hard deals and
 * 53.8% of medium ones, so those boards fell back to the deterministic snake
 * and nine hard boards in ten were cut from the SAME underlying walk. The dots
 * moved; the shape of the answer did not. Nothing failed, nothing threw, and
 * every gate in this repo stayed green - the only way to see it was to measure
 * which branch ran.
 *
 * So there is no search any more. `boustrophedon` gives a valid walk for free,
 * and BACKBITE turns it into a random one: take an end of the walk, pick any
 * grid neighbour of it, and reverse the piece of the walk between them. That
 * move keeps every cell visited exactly once - reversing a suffix preserves
 * adjacency inside it and creates exactly one new adjacency at the fold - so
 * the result is a Hamiltonian path after every single move. It cannot fail, it
 * cannot run out of budget, and it has no fallback branch to hide in.
 *
 * The parity trap the old comment warned about is gone with the search rather
 * than solved: on an odd grid the two ends of ANY walk over every cell sit on
 * the majority colour, and backbite only ever produces such a walk, so there
 * is no longer a start to choose badly.
 */
function randomTour(size: number, rng: () => number): Cell[] {
  const n = size * size;
  const path = boustrophedon(size);
  /** Where each cell currently sits in `path`, so a fold is O(1) to find. */
  const at = new Array<number>(n);
  for (let i = 0; i < n; i++) at[path[i]] = i;

  const reverseTail = (from: number) => {
    for (let i = from, j = n - 1; i < j; i++, j--) {
      const a = path[i];
      path[i] = path[j];
      path[j] = a;
      at[path[i]] = i;
      at[path[j]] = j;
    }
  };

  const moves = n * STIR_PER_CELL;
  for (let m = 0; m < moves; m++) {
    // Both ends have to move or the walk only ever grows from one of them, so
    // half the moves flip the walk end for end first. Reversing the whole path
    // is the same cost as the fold itself at this size.
    if (rng() < 0.5) reverseTail(0);

    const tail = path[n - 1];
    const options = neighbours(size, tail);
    const v = options[randInt(0, options.length - 1, rng)];
    const j = at[v];
    // `v` is already the tail's neighbour ON the walk: folding there would put
    // the walk back exactly as it is, so skip rather than waste the move.
    if (j === n - 2) continue;
    reverseTail(j + 1);
  }

  return path;
}

/**
 * The SEED walk: along row 0, back along row 1, along row 2, and so on.
 *
 * It is always a valid walk over every cell of any rectangle, which is the one
 * property `randomTour` needs of it - backbite has to start from a walk that
 * is already Hamiltonian, and this is the cheapest one there is. It is no
 * longer a fallback, and nothing ships a board cut straight from it.
 */
function boustrophedon(size: number): Cell[] {
  const out: Cell[] = [];
  for (let r = 0; r < size; r++) {
    for (let i = 0; i < size; i++) {
      const c = r % 2 === 0 ? i : size - 1 - i;
      out.push(r * size + c);
    }
  }
  return out;
}

/** Chop `tour` into consecutive runs of the given lengths. */
function chop(tour: Cell[], lengths: number[]): Cell[][] {
  const out: Cell[][] = [];
  let at = 0;
  for (const len of lengths) {
    out.push(tour.slice(at, at + len));
    at += len;
  }
  return out;
}

/**
 * `parts` lengths summing to `total`, none below `MIN_SEGMENT`.
 *
 * Built by giving everyone the floor and then handing out the slack one cell at
 * a time, rather than by picking cut points and rejecting the bad ones. Every
 * draw is valid by construction, so there is no retry loop and no tier where
 * the numbers happen to leave it spinning.
 */
function randomLengths(total: number, parts: number, rng: () => number): number[] {
  const lengths = new Array<number>(parts).fill(MIN_SEGMENT);
  for (let slack = total - MIN_SEGMENT * parts; slack > 0; slack--) {
    lengths[randInt(0, parts - 1, rng)]++;
  }
  return lengths;
}

/** As even as `total` divides, with the remainder spread over the first few. */
function evenLengths(total: number, parts: number): number[] {
  const base = Math.floor(total / parts);
  const extra = total % parts;
  return Array.from({ length: parts }, (_, i) => base + (i < extra ? 1 : 0));
}

/**
 * Cut the walk into one segment per colour.
 *
 * The two ends of a segment become a pair of dots, so a segment whose ends are
 * NEIGHBOURS deals a pair a child can join in one hop — which looks like a free
 * pair and is in fact a trap, since taking it leaves the cells that segment was
 * meant to cover with nothing to fill them and the board cannot be finished.
 * Rejecting those is cheap; the even cut is the floor under the retries.
 */
function cutIntoSegments(tour: Cell[], size: number, pairs: number, rng: () => number): Cell[][] {
  const endsApart = (segs: Cell[][]) =>
    segs.every((s) => !adjacent(size, s[0], s[s.length - 1]));

  for (let attempt = 0; attempt < CUT_ATTEMPTS; attempt++) {
    const segs = chop(tour, randomLengths(tour.length, pairs, rng));
    if (endsApart(segs)) return segs;
  }
  return chop(tour, evenLengths(tour.length, pairs));
}

/**
 * A board and the routes that finish it.
 *
 * The segments are shuffled before they become colours, so colour 0 is not
 * always the pair sitting at the start of the walk. It changes nothing about
 * the puzzle and everything about whether the palette looks laid out in a line.
 */
export function deal(level: LevelId, rng: () => number = Math.random): Deal {
  const { size, pairs } = LEVELS[level];
  const tour = randomTour(size, rng);
  const segments = cutIntoSegments(tour, size, pairs, rng);
  const plan = shuffle(segments, rng);
  const endpoints = plan.map((s) => [s[0], s[s.length - 1]] as const);

  return {
    state: {
      size,
      endpoints,
      paths: plan.map(() => [] as Cell[]),
      drawing: null,
      moves: 0,
    },
    plan,
  };
}

export function newGame(level: LevelId, rng: () => number = Math.random): FlowState {
  return deal(level, rng).state;
}
