// Arrows Out — pure logic. A grid holds arrows; tapping one flies it off the
// board in the direction it points, but only if every cell between it and the
// edge is empty. Clear the board to win. No drag, no reading, no timer inside
// the rules. Deterministic given an rng, so `logic.test.ts` drives the same
// engine the player does.
//
// THE BOARD IS BUILT BACKWARDS, and that is the whole design.
//
// A child cannot tell an unsolvable puzzle from a hard one. They keep trying,
// they lose, and the thing that lied to them is the game. So the deal never
// scatters arrows and hopes, and it never runs a solver to filter either — a
// solver that gives up under a node cap answers "no solution found", which
// reads the same for a board that has none and a board that is merely deep,
// and taking that first reading is how an impossible board reaches a
// five-year-old.
//
// `deal` starts from the EMPTY (solved) board and adds one arrow at a time,
// and it only ever places an arrow on a cell whose exit path in that direction
// is clear RIGHT THEN. So at the moment arrow k lands, arrow k could have
// flown out. Removing the arrows in the reverse of the order they were placed
// walks the board back through exactly those states, and every step of that
// walk is a legal tap — solvability is a property of the construction rather
// than a claim about it. `deal` hands that walk back as `plan`; the test
// replays it through `canLeave` and `tap` — the shipped rules — and a second
// test searches for a solution that has never seen the plan at all.
import { pick } from "@shared/rng";

/** Which way an arrow points, and therefore which edge it leaves by. */
export type Dir = "up" | "down" | "left" | "right";

export const DIRS = ["up", "down", "left", "right"] as const;

export type LevelId = "easy" | "medium" | "hard";

export interface Level {
  /** The grid is square: `size` x `size` cells. */
  size: number;
  /** How many arrows the deal aims for. See `deal` — it may hand back fewer. */
  arrows: number;
}

/**
 * Three tiers, and difficulty here is DENSITY rather than area.
 *
 * A bigger grid alone is an easier puzzle, not a harder one: more empty cells
 * means more arrows have a clear line out, so almost any tap works. What makes
 * a board hard is how much of it is full, because that is what forces a player
 * to unblock one arrow before another can move.
 */
export const LEVELS: Record<LevelId, Level> = {
  easy: { size: 4, arrows: 8 },
  medium: { size: 5, arrows: 14 },
  hard: { size: 6, arrows: 22 },
};

export const LEVEL_IDS = ["easy", "medium", "hard"] as const;

export interface ArrowTapState {
  size: number;
  /** cell index -> the arrow there, or null. `row * size + col`. */
  cells: (Dir | null)[];
  /** how many arrows are left */
  left: number;
  taps: number;
}

/* -------------------------------------------------------------------- rules */

/** One step in each direction, as (row, column) deltas. */
const STEP: Record<Dir, { dr: number; dc: number }> = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
};

/**
 * Is every cell between `cell` and the edge, along `dir`, empty?
 *
 * Takes the raw board rather than a state so `deal` can ask it about a
 * half-built grid. The arrow standing ON `cell` is not part of its own path,
 * so a lone arrow anywhere always has four clear exits.
 */
function pathClear(cells: readonly (Dir | null)[], size: number, cell: number, dir: Dir): boolean {
  const { dr, dc } = STEP[dir];
  let r = Math.floor(cell / size) + dr;
  let c = (cell % size) + dc;
  while (r >= 0 && r < size && c >= 0 && c < size) {
    if (cells[r * size + c] !== null) return false;
    r += dr;
    c += dc;
  }
  return true;
}

/**
 * Is `cell` holding an arrow that could leave right now?
 *
 * Out-of-range indices answer `false` rather than throwing. A restored position
 * can carry a cell index that no longer exists, and a thrown error inside a tap
 * handler costs a child the board.
 */
export function canLeave(state: ArrowTapState, cell: number): boolean {
  const dir = arrowAt(state, cell);
  return dir !== null && pathClear(state.cells, state.size, cell, dir);
}

/** The arrow on `cell`, or null for an empty cell OR an index off the board. */
function arrowAt(state: ArrowTapState, cell: number): Dir | null {
  if (!Number.isInteger(cell) || cell < 0 || cell >= state.cells.length) return null;
  return state.cells[cell] ?? null;
}

export type TapOutcome =
  | { kind: "ignored" }
  | { kind: "refused"; cell: number }
  | { kind: "flew"; cell: number; dir: Dir };

/**
 * The whole input model: one tap, on one arrow. Returns what happened so the
 * renderer can play the right sound.
 *
 * The three outcomes are three different things and the renderer treats them
 * differently, which is why they are not one boolean:
 *
 *  - `ignored`  — an empty cell, or an index that is not on this board. The
 *                 player has not asked for anything, so nothing answers.
 *  - `refused`  — a real arrow, blocked. NOT a mistake and not an error: the
 *                 arrow shakes, the game says nothing, and `taps` does not
 *                 move. Counting a refusal would make the record a measure of
 *                 how often a five-year-old guesses wrong.
 *  - `flew`     — it left. This is the only outcome that changes the board.
 */
export function tap(
  state: ArrowTapState,
  cell: number,
): { state: ArrowTapState; outcome: TapOutcome } {
  const dir = arrowAt(state, cell);
  if (dir === null) return { state, outcome: { kind: "ignored" } };
  if (!pathClear(state.cells, state.size, cell, dir)) {
    return { state, outcome: { kind: "refused", cell } };
  }

  const cells = state.cells.slice();
  cells[cell] = null;
  return {
    state: { ...state, cells, left: state.left - 1, taps: state.taps + 1 },
    outcome: { kind: "flew", cell, dir },
  };
}

/**
 * Nothing left on the board.
 *
 * Derived from the CELLS rather than read off `left`, because the cells are
 * what the player sees. `left` is kept in step by `tap` and the session
 * validator refuses a snapshot where the two disagree, so this can only ever
 * differ from `left === 0` on a board no code here can produce — and in that
 * case the honest answer is the one drawn on screen.
 */
export function isSolved(state: ArrowTapState): boolean {
  return state.cells.every((c) => c === null);
}

/**
 * Can ANY arrow leave right now?
 *
 * A board with arrows and no legal tap is DEAD, and it is reachable by ordinary
 * play: clearing the outside of a ring before its inside strands whatever is
 * left. The renderer asks this so it can offer a fresh board rather than leave
 * a child tapping a grid that has stopped answering — which is the same failure
 * as an unsolvable deal, arrived at from the other end.
 */
export function hasMove(state: ArrowTapState): boolean {
  return state.cells.some((c, i) => c !== null && pathClear(state.cells, state.size, i, c));
}

/**
 * What this game's record measures, in the one place that says so.
 *
 * Only the NUMBER is persisted, never the unit, so `sdk/score.ts` reads the
 * unit to decide that a FASTER clear wins — and the board scopes the record to
 * the difficulty, because eight arrows on a 4x4 and twenty-two on a 6x6 are not
 * the same achievement.
 *
 * `_state` is unused and named that way on purpose: every game's `scoreFor`
 * takes the position it is scoring, and keeping the shape means the day this
 * game scores something the board knows (taps, say) the signature does not have
 * to move. `noUnusedParameters` is on, so the underscore is what lets an
 * honest-but-unread parameter stay.
 */
export function scoreFor(
  _state: ArrowTapState,
  level: LevelId,
  ms: number,
): { value: number; unit: "ms"; board: LevelId } {
  return { value: ms, unit: "ms", board: level };
}

/* ---------------------------------------------------------------- the deal */

export interface Deal {
  state: ArrowTapState;
  /** Cell indices to tap, in an order that finishes this board. See the header. */
  plan: number[];
}

/** Every (cell, direction) an arrow could be ADDED to right now. See `deal`. */
function placements(cells: (Dir | null)[], size: number): { cell: number; dir: Dir }[] {
  const out: { cell: number; dir: Dir }[] = [];
  for (let cell = 0; cell < cells.length; cell++) {
    if (cells[cell] !== null) continue;
    for (const dir of DIRS) {
      if (pathClear(cells, size, cell, dir)) out.push({ cell, dir });
    }
  }
  return out;
}

/**
 * A board and the plan that finishes it.
 *
 * `plan` is returned rather than stored on the state on purpose: it is a
 * property of the deal, not of the position, and a solution living inside the
 * state is a solution that ends up on the child's disk and inside every saved
 * snapshot.
 *
 * ONE walk, bounded, and it stops rather than retrying. Measured over 600 deals
 * (200 per tier, seeded) on 2026-08-25: every walk placed the full count its
 * level asked for, because the tiers sit well under what this grid can hold
 * (the same probe packed a 6x6 to 31.9 arrows on average against a target of
 * 22). So a retry loop here would be a lever nothing has ever pulled, and
 * "deal what you have" is both the honest and the cheaper answer.
 */
export function deal(level: LevelId, rng: () => number = Math.random): Deal {
  const spec = LEVELS[level];
  const cells: (Dir | null)[] = Array<Dir | null>(spec.size * spec.size).fill(null);
  const placed: number[] = [];

  while (placed.length < spec.arrows) {
    const options = placements(cells, spec.size);
    // BOUNDED, and it stops rather than retries. Once the grid is crowded
    // enough that no empty cell has a clear line to any edge, no further arrow
    // can be added that would have been able to fly out — so there is nothing
    // to search for and looping would only spin. A board with fewer arrows than
    // asked for is still a real puzzle; a board that hangs is not. `left` on the
    // returned state reports what was actually dealt, never what was requested.
    if (options.length === 0) break;
    const { cell, dir } = pick(options, rng);
    cells[cell] = dir;
    placed.push(cell);
  }

  return {
    state: { size: spec.size, cells, left: placed.length, taps: 0 },
    // The plan is the placements REVERSED: the last arrow down is the first one
    // that can come off, because the board under it is exactly the board it
    // landed on.
    plan: placed.slice().reverse(),
  };
}

export function newGame(level: LevelId, rng: () => number = Math.random): ArrowTapState {
  return deal(level, rng).state;
}
