// Colour sort — pure logic. Tap a tube to pick up the run of one colour at its
// top, tap another to pour it in. No drag, no reading, no timer. Deterministic
// given an rng, so `logic.test.ts` drives the same engine the player does.
//
// THE BOARD IS BUILT BACKWARDS, and that is the whole design.
//
// A child cannot tell an unsolvable puzzle from a hard one. They keep trying,
// they lose, and the thing that lied to them is the game. So the deal never
// shuffles and hopes, and it never runs a solver to filter either — a solver
// that gives up under a node cap answers "no solution found", which reads the
// same for a board that has none and a board that is merely deep, and taking
// that first reading is how an impossible board reaches a five-year-old.
//
// `deal` starts from the SOLVED board and walks away from it, and every step it
// takes is one that a legal forward pour puts back. Reversing the walk is a
// solution, so solvability is a property of the construction rather than a
// claim about it. `deal` hands that walk back as `plan`; the test replays it
// through `canPour` and `pour` — the shipped rules — and a second test searches
// for a solution that has never seen the plan at all.
import { pick } from "@shared/rng";

/** A palette index, 1-based. Never a colour: logic paints nothing. */
export type Color = number;
/** `tube[0]` is the BOTTOM ball; the last item is the top one, and the one a tap lifts. */
export type Tube = Color[];

export type LevelId = "easy" | "medium" | "hard";

export interface Level {
  /** How many colours are in play. Each has exactly `capacity` balls, no more. */
  colors: number;
  /** Empty tubes beyond one per colour — all the working room the puzzle gives. */
  spare: number;
  /** How tall a tube is, and therefore how many of each colour exist. */
  capacity: number;
}

/**
 * Two spare tubes at every tier, deliberately. Difficulty here is the number of
 * colours to keep track of, not the room to manoeuvre — cutting a tier down to
 * one spare makes it a different, far more brittle puzzle, and one that a young
 * player loses to without understanding why.
 */
export const LEVELS: Record<LevelId, Level> = {
  easy: { colors: 4, spare: 2, capacity: 4 },
  medium: { colors: 6, spare: 2, capacity: 4 },
  hard: { colors: 8, spare: 2, capacity: 4 },
};

export const LEVEL_IDS = ["easy", "medium", "hard"] as const;

/** One pour: `count` balls off the top of `from`, onto `to`. */
export interface Move {
  from: number;
  to: number;
  count: number;
}

export interface SortState {
  tubes: Tube[];
  capacity: number;
  /** The tube the player is holding a run from, or null. */
  selected: number | null;
  moves: number;
  /** Every pour this run, newest last. Undo is unlimited, so nothing is dropped. */
  history: Move[];
}

/* -------------------------------------------------------------------- rules */

/** The unbroken run of one colour at the top of a tube — what a tap picks up. */
export function topRun(tube: Tube): { color: Color; count: number } | null {
  if (tube.length === 0) return null;
  const color = tube[tube.length - 1];
  let count = 1;
  while (count < tube.length && tube[tube.length - 1 - count] === color) count++;
  return { color, count };
}

/**
 * How many balls a pour would actually move: the whole top run, or as much of
 * it as the target has room for. 0 means the pour is not allowed at all.
 *
 * Out-of-range indices answer 0 rather than throwing. A restored position can
 * carry a tube index that no longer exists, and a thrown error inside a tap
 * handler costs a child the board.
 */
export function pourCount(state: SortState, from: number, to: number): number {
  if (from === to) return 0;
  const source = state.tubes[from];
  const dest = state.tubes[to];
  if (!source || !dest) return 0;
  const run = topRun(source);
  if (!run) return 0;
  if (dest.length > 0 && dest[dest.length - 1] !== run.color) return 0;
  return Math.min(run.count, state.capacity - dest.length);
}

export function canPour(state: SortState, from: number, to: number): boolean {
  return pourCount(state, from, to) > 0;
}

/** Pour, or return the state untouched when the pour is not legal. */
export function pour(state: SortState, from: number, to: number): SortState {
  const count = pourCount(state, from, to);
  if (count === 0) return state;
  const tubes = state.tubes.map((t) => t.slice());
  const moving = tubes[from].splice(tubes[from].length - count, count);
  tubes[to].push(...moving);
  return {
    ...state,
    tubes,
    selected: null,
    moves: state.moves + 1,
    history: [...state.history, { from, to, count }],
  };
}

export type TapOutcome =
  | { kind: "ignored" }
  | { kind: "picked"; tube: number }
  | { kind: "cancelled"; tube: number }
  | { kind: "poured"; move: Move }
  | { kind: "refused"; tube: number };

/**
 * The whole input model: tap to pick up, tap to pour, tap the same tube to put
 * it back. Returns what happened so the renderer can play the right sound.
 *
 * A refused pour KEEPS the run in the player's hand. Deselecting would make
 * every misjudged tap cost two taps to recover from, and a refusal is not an
 * error — the renderer shakes the tube and says nothing.
 */
export function tap(state: SortState, index: number): { state: SortState; outcome: TapOutcome } {
  const tube = state.tubes[index];
  if (!tube) return { state, outcome: { kind: "ignored" } };

  if (state.selected === null) {
    if (tube.length === 0) return { state, outcome: { kind: "ignored" } };
    return { state: { ...state, selected: index }, outcome: { kind: "picked", tube: index } };
  }

  if (state.selected === index) {
    return { state: { ...state, selected: null }, outcome: { kind: "cancelled", tube: index } };
  }

  const count = pourCount(state, state.selected, index);
  if (count === 0) return { state, outcome: { kind: "refused", tube: index } };

  const move = { from: state.selected, to: index, count };
  return { state: pour(state, move.from, move.to), outcome: { kind: "poured", move } };
}

/**
 * Take back the last pour — board AND counter.
 *
 * The counter matters as much as the balls. A count that only ever goes up
 * turns undo into a penalty and turns the record into a measure of how often a
 * five-year-old mis-taps; a move taken back is not a move that was made.
 *
 * It is safe because undo is strictly last-in-first-out: at the moment a move
 * is undone the board is exactly as that move left it, so the top `count` balls
 * of its target are exactly the ones it moved.
 */
export function undo(state: SortState): SortState {
  const last = state.history[state.history.length - 1];
  if (!last) return state;
  const tubes = state.tubes.map((t) => t.slice());
  const back = tubes[last.to].splice(tubes[last.to].length - last.count, last.count);
  tubes[last.from].push(...back);
  return {
    ...state,
    tubes,
    selected: null,
    moves: state.moves - 1,
    history: state.history.slice(0, -1),
  };
}

/**
 * Every tube empty, or FULL of one colour.
 *
 * Full is load-bearing: without it a board holding the last four balls two and
 * two would read as finished, and the win would fire on a puzzle in pieces.
 */
export function isSolved(state: SortState): boolean {
  return state.tubes.every(
    (t) => t.length === 0 || (t.length === state.capacity && t.every((c) => c === t[0])),
  );
}

/**
 * What this game's record measures, in the one place that says so.
 *
 * Only the NUMBER is persisted, never the unit, so `sdk/score.ts` reads the
 * unit to decide that fewer moves win — and the board scopes the record to the
 * difficulty, because fourteen moves on four colours and fourteen on eight are
 * not the same achievement.
 */
export function scoreFor(
  state: SortState,
  level: LevelId,
): { value: number; unit: "moves"; board: LevelId } {
  return { value: state.moves, unit: "moves", board: level };
}

/* ---------------------------------------------------------------- the deal */

export interface Deal {
  state: SortState;
  /** A legal sequence of pours that finishes this board. See the header. */
  plan: Move[];
}

/**
 * Every backwards step available from `tubes`, as the FORWARD move that undoes
 * each one. Lifting `count` balls of one colour off `b` and dropping them on
 * `a` is undone by pouring `a` back into `b`, and that forward pour is legal
 * only under both conditions below — which is why they are checked here rather
 * than hoped for afterwards.
 */
function backwardsMoves(tubes: Tube[], capacity: number, skip: Move | null): Move[] {
  const out: Move[] = [];
  for (let b = 0; b < tubes.length; b++) {
    const run = topRun(tubes[b]);
    if (!run) continue;
    for (let count = 1; count <= run.count; count++) {
      // Taking the WHOLE run off `b` leaves another colour showing, and nothing
      // may be poured back onto that — unless the run was the entire tube, in
      // which case `b` ends up empty and accepts anything.
      if (count === run.count && tubes[b].length !== count) continue;
      for (let a = 0; a < tubes.length; a++) {
        if (a === b) continue;
        if (capacity - tubes[a].length < count) continue;
        // `a` must not already show this colour, or the run sitting on it would
        // be longer than `count` and the forward pour would move too much.
        if (tubes[a][tubes[a].length - 1] === run.color) continue;
        if (skip && skip.from === a && skip.to === b && skip.count === count) continue;
        out.push({ from: a, to: b, count });
      }
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
 */
export function deal(level: LevelId, rng: () => number = Math.random): Deal {
  const { colors, spare, capacity } = LEVELS[level];
  const tubes: Tube[] = [];
  for (let c = 1; c <= colors; c++) tubes.push(Array<Color>(capacity).fill(c));
  for (let i = 0; i < spare; i++) tubes.push([]);

  const plan: Move[] = [];
  const steps = colors * capacity * 4;

  const scramble = () => {
    let previous: Move | null = null;
    for (let i = 0; i < steps; i++) {
      const options = backwardsMoves(tubes, capacity, previous);
      if (options.length === 0) break;
      const move = pick(options, rng);
      // Backwards: lift `count` off `move.to` and drop them on `move.from`.
      const lifted = tubes[move.to].splice(tubes[move.to].length - move.count, move.count);
      tubes[move.from].push(...lifted);
      plan.unshift(move);
      previous = move;
    }
  };

  // Walk away from the solved board — and walk again if the walk happened to
  // wander back onto one, which would deal a puzzle with nothing to do.
  // Vanishingly unlikely over this many steps, and "vanishingly unlikely" is
  // still a blank puzzle for one child in ten thousand.
  for (let round = 0; round < 5; round++) {
    scramble();
    if (!isSolved(emptyState(tubes, capacity))) break;
  }

  return { state: emptyState(tubes, capacity), plan };
}

function emptyState(tubes: Tube[], capacity: number): SortState {
  return { tubes: tubes.map((t) => t.slice()), capacity, selected: null, moves: 0, history: [] };
}

export function newGame(level: LevelId, rng: () => number = Math.random): SortState {
  return deal(level, rng).state;
}
