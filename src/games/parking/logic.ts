// Escape the Jam — pure logic. A 6x6 car park, cars two or three cells long,
// each locked to its own axis. One car is the player's; slide the others out of
// its way and drive it out through the gap in the right-hand wall. No drag, no
// reading, no timer. Deterministic given an rng, so `logic.test.ts` drives the
// same engine the player does.
//
// THE BOARD IS BUILT BACKWARDS, and that is the whole design.
//
// A child cannot tell an unsolvable jam from a hard one. They keep trying, they
// lose, and the thing that lied to them is the game. So the deal never scatters
// cars and hopes, and it never runs a solver to filter either — a solver that
// gives up under a node cap answers "no solution found", which reads the same
// for a board that has none and a board that is merely deep, and taking that
// first reading is how an impossible jam reaches a five-year-old.
//
// This mechanic makes the backwards construction almost free, because EVERY
// MOVE IS REVERSIBLE: a car slid two cells left can always be slid two cells
// back right, since sliding it left is exactly what emptied the cells it would
// return through. So any position reachable from a solved one by legal moves is
// itself solvable, and the reverse of the walk IS a solution.
//
// `deal` starts from the SOLVED board — the player's car hard against the wall
// at the exit row — and walks away from it, recording the inverse of each step.
// It hands that reversed walk back as `plan`; the test replays it through
// `canMoveTo` and `slide`, the shipped rules, and a second test searches for a
// solution that has never seen the plan at all.
//
// AND SOLVABLE IS ONLY HALF OF IT. This file shipped once with the construction
// argument correct and the puzzle missing: it accepted a board the moment SOME
// car stood in the player's way, and one car in the way is one car to move. A
// breadth-first search over the real position space put the true minimum at
// **2.1 moves at every tier, with roughly 90% of boards coming apart in exactly
// two**, while the walk each board was built by ran to 43 moves. Twelve cars,
// ten of them scenery, and a two-tap answer.
//
// The lesson outlives the bug: THE LENGTH OF THE WALK AND THE LENGTH OF THE
// SOLUTION ARE DIFFERENT NUMBERS, and no property of the first can see the
// second. A random walk wanders; a puzzle does not. So `solutionDepth` below
// measures the real one, and `deal` keeps a board only when it clears the
// depth floor its tier declares.
import { pick } from "@shared/rng";

/** A car slides along one axis and only ever along that one. */
export type Axis = "h" | "v";

/**
 * One car.
 *
 * `row`/`col` are its TOP-LEFT cell; a horizontal car extends right and a
 * vertical one extends down. `id` is always the car's own index in
 * `ParkingState.cars`, and `cars[0]` is always the player's, so "the car under
 * this cell" and "which entry to move" are the same number everywhere.
 */
export interface Car {
  id: number;
  axis: Axis;
  /** 2 or 3. The player's car is always 2. */
  len: number;
  row: number;
  col: number;
}

/**
 * One slide, in the car's OWN axis coordinate — the column for a horizontal
 * car, the row for a vertical one.
 *
 * Stored as from/to rather than as an offset because that is what `undo` wants:
 * putting a car back where it was is a position, and re-deriving it from a
 * signed offset is one sign error away from moving the car twice.
 */
export interface Move {
  car: number;
  from: number;
  to: number;
}

export interface ParkingState {
  /** Always 6. Carried on the state so the rules never read a module constant. */
  size: number;
  /** The row the gap in the right-hand wall is in. */
  exitRow: number;
  /** `cars[0]` is the PLAYER'S car, always axis "h", always len 2. */
  cars: Car[];
  /** The car the player has picked up, or null. */
  selected: number | null;
  moves: number;
  /** Every slide this run, newest last. Undo is unlimited, so nothing is dropped. */
  history: Move[];
}

export type LevelId = "easy" | "medium" | "hard";

export interface Level {
  /** How many cars are on the board, the player's included. */
  cars: number;
  /** How many steps the deal walks away from the solved board. */
  scramble: number;
  /**
   * The fewest slides the SHORTEST solution may take. A board that comes apart
   * in fewer than this is refused, however many cars are standing on it.
   *
   * MEASURED, never guessed. See the note above `LEVELS` for what was measured,
   * what was refused, and why these numbers are smaller than they look.
   */
  floor: number;
}

/**
 * The board stays 6x6 at every tier, deliberately. Difficulty here is how much
 * traffic there is and how deep the tangle goes, never the size of the space —
 * a child who has learnt where the exit is should not have to relearn it to
 * play a harder game.
 *
 * THE FLOORS ARE MEASURED, AND THEY ARE SMALLER THAN THEY LOOK. Read this
 * before raising one, because every reason they look wrong is answered here.
 *
 * A MOVE IS A WHOLE SLIDE. Tapping a cell sends a car all the way to it, so
 * crossing four cells is ONE move. Classic Rush Hour counts one move per CELL,
 * which is why its famous boards quote solutions of thirty and fifty; the same
 * boards are roughly a third of that in this metric. Comparing the two numbers
 * is comparing two different units, and it is the first thing that makes a
 * floor of 14 sound reasonable.
 *
 * THE CEILING IS THE LAYOUT, NOT THE WALK. Enumerating the ENTIRE position
 * space of an easy layout — 2,064 positions on average — and measuring the true
 * distance from every one of them to the nearest solved board gives a maximum
 * of 3.8 moves on average over twelve layouts, and 7 at the very best. That is
 * the deepest position the layout HAS; no amount of extra scrambling can beat
 * it. Walking further, sampling more of the walk, and biasing the placement so
 * more cars cross the exit row were each measured, and none of them moved it.
 *
 * So the deal earns its depth by trying many LAYOUTS and keeping the best,
 * which is why `DEAL_ATTEMPTS` is the number that matters and `scramble` is
 * not. These floors sit at or just above the average layout's ceiling.
 *
 * What ships, measured in one clean run of 400 seeded deals per tier, with the
 * shallowest board any of them produced:
 *
 *   easy    floor 4   met 100%   worst 4   p50 11 ms · p95  34 ms · p99  49 ms
 *   medium  floor 5   met 100%   worst 5   p50 55 ms · p95 235 ms · p99 442 ms
 *   hard    floor 5   met 100%   worst 5   p50 31 ms · p95 116 ms · p99 218 ms
 *
 * Two caveats on those times, both of which matter more than the digits. They
 * are DESKTOP NODE on the machine this was written on, so a phone is slower by
 * whatever that machine is slower by — they bound the SHAPE of the cost and not
 * the cost (`.claude/rules/a-number-belongs-to-the-toolchain-that-ships-it.md`).
 * And the TAIL moves between runs while the median does not: medium's worst deal
 * read 369 ms in one run and 550 ms in the next, because the tail is the rare
 * deal that exhausts the whole attempt bound. Quote the median; treat the p99 as
 * an order of magnitude.
 *
 * A deal happens on a mount, a restart, or a change of difficulty — never on a
 * move — so this is a pause on a button a child deliberately pressed, and the
 * alternative was a board they finish in two taps.
 *
 * What was refused, and why, so nobody re-derives it:
 *
 *   easy   floor 5   met  82% — the six-car ceiling above is the reason
 *   hard   floor 6   met  99.33%, p95 463 ms · max 861 ms — refused on BOTH
 *                    counts. It is not a floor that "nearly holds"; a floor met
 *                    99.33% of the time is a board a child hits once a fortnight
 *                    that the test cannot even state.
 *
 * MEDIUM AND HARD SHARE A FLOOR, and that is a finding rather than a shrug:
 * twelve cars do not make a DEEPER puzzle than nine, they make a busier one.
 * Hard's extra difficulty is the traffic to read, and it is honest to say so
 * rather than to write a bigger number the generator cannot hold.
 */
export const LEVELS: Record<LevelId, Level> = {
  easy: { cars: 6, scramble: 14, floor: 4 },
  medium: { cars: 9, scramble: 22, floor: 5 },
  hard: { cars: 12, scramble: 30, floor: 5 },
};

export const LEVEL_IDS = ["easy", "medium", "hard"] as const;

/** Six across, six down, at every level. */
export const SIZE = 6;

/** The third row. The classic place for the gap, and it leaves air above and below. */
export const EXIT_ROW = 2;

/* -------------------------------------------------------------------- rules */

/** Where a car sits along its own axis: the column if horizontal, the row if not. */
export function axisPos(car: Car): number {
  return car.axis === "h" ? car.col : car.row;
}

/**
 * Which car is on each cell, indexed `row * size + col`, or null for tarmac.
 *
 * Cells outside the board are DROPPED rather than written, because a restored
 * snapshot can carry a car that hangs off the edge and a stray write past the
 * end would silently grow the array — turning a corrupt save into a wrong board
 * instead of a rejected one.
 */
export function occupancy(state: ParkingState): (number | null)[] {
  const grid: (number | null)[] = new Array(state.size * state.size).fill(null);
  state.cars.forEach((car, i) => {
    for (let k = 0; k < car.len; k++) {
      const row = car.axis === "h" ? car.row : car.row + k;
      const col = car.axis === "h" ? car.col + k : car.col;
      if (row < 0 || row >= state.size || col < 0 || col >= state.size) continue;
      grid[row * state.size + col] = i;
    }
  });
  return grid;
}

/**
 * Can this car slide `offset` cells along its own axis, with every cell it
 * would cross empty and on the board?
 *
 * Out-of-range car indices and a zero offset answer false rather than throwing.
 * A restored position can name a car this board does not have, and a thrown
 * error inside a tap handler costs a child the whole board.
 */
export function canMoveTo(state: ParkingState, car: number, offset: number): boolean {
  const c = state.cars[car];
  if (!c || !Number.isInteger(offset) || offset === 0) return false;
  const grid = occupancy(state);
  const forward = offset > 0;
  const distance = Math.abs(offset);
  for (let k = 1; k <= distance; k++) {
    // The cell the LEADING end of the car lands on at step k: one past its far
    // end going forward, one before its near end going back.
    const lead = forward ? c.len - 1 + k : -k;
    const row = c.axis === "h" ? c.row : c.row + lead;
    const col = c.axis === "h" ? c.col + lead : c.col;
    if (row < 0 || row >= state.size || col < 0 || col >= state.size) return false;
    if (grid[row * state.size + col] !== null) return false;
  }
  return true;
}

/** Slide, or return the state untouched when the slide is not legal. */
export function slide(state: ParkingState, car: number, offset: number): ParkingState {
  if (!canMoveTo(state, car, offset)) return state;
  const from = axisPos(state.cars[car]);
  const cars = state.cars.map((c, i) =>
    i === car
      ? {
          ...c,
          row: c.axis === "v" ? c.row + offset : c.row,
          col: c.axis === "h" ? c.col + offset : c.col,
        }
      : c,
  );
  return {
    ...state,
    cars,
    selected: null,
    moves: state.moves + 1,
    history: [...state.history, { car, from, to: from + offset }],
  };
}

/**
 * Every offset this car could legally slide, nearest first in each direction.
 *
 * Walks outward and stops at the first blocked cell, so it is O(free cells)
 * rather than O(distance squared) — and, more usefully, it can never report a
 * far cell as reachable through a near one that is occupied.
 */
export function reach(state: ParkingState, car: number): number[] {
  const c = state.cars[car];
  if (!c) return [];
  // The grid is built ONCE here rather than inside `canMoveTo` per distance.
  // That is a real optimisation and not a style preference: the depth gate below
  // expands tens of thousands of positions per deal, and rebuilding a 36-cell
  // occupancy map for every candidate offset made a deal take seconds on a
  // phone. The rule it applies is byte-for-byte the one `canMoveTo` applies,
  // and `reach-agrees-with-canMoveTo` in the test file pins that they cannot
  // drift apart.
  const grid = occupancy(state);
  const out: number[] = [];
  for (const step of [1, -1]) {
    for (let d = 1; d < state.size; d++) {
      const lead = step > 0 ? c.len - 1 + d : -d;
      const row = c.axis === "h" ? c.row : c.row + lead;
      const col = c.axis === "h" ? c.col + lead : c.col;
      if (row < 0 || row >= state.size || col < 0 || col >= state.size) break;
      if (grid[row * state.size + col] !== null) break;
      out.push(step * d);
    }
  }
  return out;
}

/**
 * The cell indices a tap could send this car to — the cell its LEADING end
 * would land on for each legal offset.
 *
 * The renderer draws a dot on each of these. It is the whole reason a
 * four-year-old can play this: the alternative is tapping around a grid to
 * discover which squares happen to be in line and free.
 */
export function reachableCells(state: ParkingState, car: number): number[] {
  const c = state.cars[car];
  if (!c) return [];
  return reach(state, car).map((offset) => {
    const lead = offset > 0 ? c.len - 1 + offset : offset;
    const row = c.axis === "h" ? c.row : c.row + lead;
    const col = c.axis === "h" ? c.col + lead : c.col;
    return row * state.size + col;
  });
}

/**
 * How far this car must slide for its nearest end to land on `cell`, or 0 when
 * the cell is not in line with it at all.
 *
 * Nearest END rather than nearest cell: tapping three cells to the right of a
 * two-long car means "come over here", so the car's front bumper lands on the
 * tapped cell and its back follows. Measuring from the other end would leave
 * the car short of where the finger pointed, every time.
 */
function offsetToward(car: Car, cell: number, size: number): number {
  const row = Math.floor(cell / size);
  const col = cell % size;
  if (car.axis === "h") {
    if (row !== car.row) return 0;
    if (col > car.col + car.len - 1) return col - (car.col + car.len - 1);
    if (col < car.col) return col - car.col;
    return 0;
  }
  if (col !== car.col) return 0;
  if (row > car.row + car.len - 1) return row - (car.row + car.len - 1);
  if (row < car.row) return row - car.row;
  return 0;
}

export type TapOutcome =
  | { kind: "ignored" }
  | { kind: "picked"; car: number }
  | { kind: "cancelled"; car: number }
  | { kind: "moved"; move: Move }
  | { kind: "refused"; car: number };

/**
 * The whole input model: tap a car to pick it up, tap a free cell in line with
 * it to slide it there, tap the same car again to put it down. Returns what
 * happened so the renderer can play the right sound.
 *
 * A REFUSED slide KEEPS the car selected. Deselecting would make every
 * misjudged tap cost two taps to recover from, and a refusal is not an error —
 * the renderer nudges the car and says nothing.
 *
 * Tapping a DIFFERENT car picks that one up instead of refusing. A child who
 * changes their mind about which car is in the way is not making a mistake, and
 * making them put the first one down first is a tap spent on bookkeeping.
 *
 * Out-of-range cells answer `ignored` rather than throwing, for the same reason
 * `canMoveTo` does.
 */
export function tap(
  state: ParkingState,
  cell: number,
): { state: ParkingState; outcome: TapOutcome } {
  if (!Number.isInteger(cell) || cell < 0 || cell >= state.size * state.size) {
    return { state, outcome: { kind: "ignored" } };
  }
  const here = occupancy(state)[cell];

  if (state.selected === null) {
    if (here === null) return { state, outcome: { kind: "ignored" } };
    return { state: { ...state, selected: here }, outcome: { kind: "picked", car: here } };
  }

  if (here === state.selected) {
    return { state: { ...state, selected: null }, outcome: { kind: "cancelled", car: here } };
  }

  if (here !== null) {
    return { state: { ...state, selected: here }, outcome: { kind: "picked", car: here } };
  }

  const selected = state.cars[state.selected];
  // Only reachable from a snapshot naming a car this board does not have. Drop
  // the selection rather than throw; the next tap starts clean.
  if (!selected) return { state: { ...state, selected: null }, outcome: { kind: "ignored" } };

  const offset = offsetToward(selected, cell, state.size);
  if (offset === 0 || !canMoveTo(state, state.selected, offset)) {
    return { state, outcome: { kind: "refused", car: state.selected } };
  }

  const from = axisPos(selected);
  const move: Move = { car: state.selected, from, to: from + offset };
  return { state: slide(state, move.car, offset), outcome: { kind: "moved", move } };
}

/**
 * Take back the last slide — board AND counter.
 *
 * The counter matters as much as the cars. A count that only ever goes up turns
 * undo into a penalty and turns the record into a measure of how often a
 * five-year-old mis-taps; a move taken back is not a move that was made.
 *
 * It is safe because undo is strictly last-in-first-out: at the moment a move is
 * undone the board is exactly as that move left it, so the cells the car came
 * from are still empty and putting it back at `from` cannot overlap anything.
 */
export function undo(state: ParkingState): ParkingState {
  const last = state.history[state.history.length - 1];
  if (!last) return state;
  if (!state.cars[last.car]) return state;
  const cars = state.cars.map((c, i) =>
    i === last.car
      ? { ...c, row: c.axis === "v" ? last.from : c.row, col: c.axis === "h" ? last.from : c.col }
      : c,
  );
  return {
    ...state,
    cars,
    selected: null,
    moves: state.moves - 1,
    history: state.history.slice(0, -1),
  };
}

/**
 * How many DISTINCT cars stand between the player's front bumper and the gap.
 *
 * Zero means the way out is clear, which is also true of a board already won —
 * so `deal` uses this to refuse a jam with nothing in it, and the renderer uses
 * it as the second number in the row: it counts down to nothing exactly as the
 * puzzle comes apart.
 */
export function blockers(state: ParkingState): number {
  const player = state.cars[0];
  if (!player) return 0;
  const grid = occupancy(state);
  const seen = new Set<number>();
  for (let col = player.col + player.len; col < state.size; col++) {
    const car = grid[player.row * state.size + col];
    if (car !== null && car !== 0) seen.add(car);
  }
  return seen.size;
}

/**
 * The player's car has reached the exit: it is at the exit row, hard against
 * the right-hand wall, with the gap directly in front of it.
 *
 * That IS the solved position `deal` walks away from, which is what makes the
 * construction argument work — "solvable" here means "the walk can be run
 * backwards to exactly this board".
 */
export function isSolved(state: ParkingState): boolean {
  const player = state.cars[0];
  return (
    !!player &&
    player.axis === "h" &&
    player.row === state.exitRow &&
    player.col + player.len === state.size
  );
}

/**
 * What this game's record measures, in the one place that says so.
 *
 * Only the NUMBER is persisted, never the unit, so `sdk/score.ts` reads the
 * unit to decide that fewer moves win — and the board scopes the record to the
 * difficulty, because eighteen moves through six cars and eighteen through
 * twelve are not the same achievement.
 */
export function scoreFor(
  state: ParkingState,
  level: LevelId,
): { value: number; unit: "moves"; board: LevelId } {
  return { value: state.moves, unit: "moves", board: level };
}

/* --------------------------------------------------------------- the depth */

/** Two boards with every car in the same place are one position. */
function fingerprint(state: ParkingState): string {
  let out = "";
  for (const car of state.cars) out += `${car.row * SIZE + car.col},`;
  return out;
}

/**
 * How many slides the SHORTEST solution takes, measured up to `cap`.
 *
 * The answer saturates: a return of `cap` means "at least `cap`", never
 * "exactly `cap`". That is deliberate and it is what makes this affordable —
 * the only question the deal asks is "is this board at least N deep?", and
 * answering the harder question ("what is the true minimum?") means opening the
 * whole position space for every candidate rather than the first N layers of it.
 *
 * WHY THIS EXISTS AT ALL, because it is the defect that made it necessary. The
 * generator used to accept a board as soon as some car stood in the player's
 * way, and one car in the way is one car to move: a breadth-first search over
 * the real position space found the true minimum was **2.1 moves at every tier,
 * with ~90% of boards coming apart in exactly two**, while the recorded walk was
 * 27 to 43 moves long. The walk wanders; the puzzle does not. A twelve-car board
 * where ten cars are scenery and the answer is two taps is not this game, and
 * the length of the walk cannot see that — only the depth can.
 *
 * It asks `canMoveTo` and `slide` rather than restating them, so it measures the
 * car park a child actually opens. That is also why it is not on the load path
 * for solvability: construction guarantees a solution exists, and this only ever
 * grades how good one is.
 */
export function solutionDepth(state: ParkingState, cap: number): number {
  if (isSolved(state)) return 0;
  if (cap <= 0) return 0;

  const seen = new Set<string>([fingerprint(state)]);
  let frontier: ParkingState[] = [state];

  for (let depth = 1; depth <= cap; depth++) {
    const next: ParkingState[] = [];
    for (const s of frontier) {
      for (let car = 0; car < s.cars.length; car++) {
        for (const offset of reach(s, car)) {
          const child = slide(s, car, offset);
          const fp = fingerprint(child);
          if (seen.has(fp)) continue;
          seen.add(fp);
          if (isSolved(child)) return depth;
          if (depth < cap) next.push(child);
        }
      }
    }
    // The whole position space, exhausted with no way out. Unreachable on a
    // board built backwards from a solved one, and `cap` is still the honest
    // answer to the only question asked: it is at least that deep.
    if (next.length === 0) return cap;
    frontier = next;
  }
  return cap;
}

/* ---------------------------------------------------------------- the deal */

export interface Deal {
  state: ParkingState;
  /** A legal sequence of slides that finishes this board. See the header. */
  plan: Move[];
}

/**
 * How many random positions to try for one car before giving up on the whole
 * board. The hard tier packs twelve cars onto thirty-six cells, so a run of
 * unlucky picks genuinely happens; abandoning the layout is cheaper than
 * backtracking, because the layout costs nothing to rebuild.
 */
const PLACEMENT_TRIES = 300;
/**
 * How often a car is three cells long rather than two.
 *
 * Measured rather than chosen. At 0.28 the hard tier's deals took a p95 of
 * 302 ms and cleared a floor of 6 on 28% of boards; at 0.45 that became 92 ms
 * and 23%. The depth is a wash and the time is three times better, because
 * longer cars leave fewer free cells and so a smaller position space to search.
 * Past 0.6 the park is too tight to scramble and the depth falls away.
 */
const LONG_CAR_ODDS = 0.45;

/**
 * How many steps the walk takes past its level's own count.
 *
 * It buys CANDIDATES, not depth. Every position it reaches belongs to the same
 * layout and so shares that layout's ceiling, which is the thing that actually
 * binds (see the note above `LEVELS`). Walking further therefore samples the
 * same narrow band of depths more thoroughly rather than reaching past it.
 */
const EXTRA_STEPS = 60;

/**
 * Grade a position every this many steps of the walk.
 *
 * Every graded position costs a bounded search, so this is the dial between how
 * many candidates one layout offers and what they cost. It is NOT a measured
 * optimum — every sweep that set the floors held it at 4 throughout. The lever
 * that actually moved the depth was `DEAL_ATTEMPTS`, because positions from one
 * walk all belong to one layout and share its ceiling.
 */
const SAMPLE_EVERY = 4;

/**
 * How many whole layouts to build before settling for the deepest board seen.
 *
 * THIS is the lever, and raising it is nearly free at the MEDIAN. A layout that
 * clears the floor usually turns up in the first handful, so a typical deal pays
 * for a handful however high this is set and only the rare miss pays the whole
 * bound. Measured on easy: 40 layouts met the floor 98% of the time, 80 met it
 * 99.2%, 120 met it 100%, and the median deal took 15, 13 and 15 ms.
 *
 * It is set well past where each tier first reached 100% because the cost of
 * the extra headroom lands on almost nobody, and the alternative — a floor the
 * suite states and the generator misses one deal in a hundred — is a test that
 * goes red for whoever changes an unrelated constant.
 *
 * BOUNDED, and the bound is the point: a tier whose floor is out of reach must
 * not spin. When the loop runs out it hands back the deepest candidate it
 * graded rather than looping again or quietly lowering the floor.
 */
const DEAL_ATTEMPTS = 250;

/** A fresh state: no selection, no moves, no history, whatever the cars are doing. */
function fresh(cars: Car[]): ParkingState {
  return {
    size: SIZE,
    exitRow: EXIT_ROW,
    cars: cars.map((c) => ({ ...c })),
    selected: null,
    moves: 0,
    history: [],
  };
}

/**
 * The SOLVED board: the player's car parked in the gap, plus the rest of the
 * traffic dropped anywhere it fits.
 *
 * Nothing constrains where the other cars go — not even the exit row. A
 * horizontal car sharing that row can only ever be BEHIND the player here (the
 * player is against the wall), and the walk that follows can only reach
 * positions a legal move reaches, so it can never strand one in front.
 *
 * Returns null when the traffic would not fit, which the caller escapes by
 * rebuilding rather than by backtracking.
 */
function solvedBoard(count: number, rng: () => number): Car[] | null {
  const cars: Car[] = [
    { id: 0, axis: "h", len: 2, row: EXIT_ROW, col: SIZE - 2 },
  ];
  const taken = new Set<number>();
  for (let k = 0; k < 2; k++) taken.add(EXIT_ROW * SIZE + (SIZE - 2 + k));

  for (let i = 1; i < count; i++) {
    let placed = false;
    for (let t = 0; t < PLACEMENT_TRIES && !placed; t++) {
      // Two-long cars dominate on purpose. At twelve cars a three-long majority
      // fills three quarters of the park, and a board with almost no free cells
      // has almost no legal moves — which produces a SHORT walk and therefore
      // an easy jam, the opposite of what the hard tier is asking for.
      const len = rng() < LONG_CAR_ODDS ? 3 : 2;
      const axis: Axis = rng() < 0.5 ? "h" : "v";
      const span = SIZE - len;
      const row = axis === "h" ? Math.floor(rng() * SIZE) : Math.floor(rng() * (span + 1));
      const col = axis === "h" ? Math.floor(rng() * (span + 1)) : Math.floor(rng() * SIZE);
      const cells: number[] = [];
      for (let k = 0; k < len; k++) {
        cells.push(axis === "h" ? row * SIZE + col + k : (row + k) * SIZE + col);
      }
      if (cells.some((cell) => taken.has(cell))) continue;

      cells.forEach((cell) => taken.add(cell));
      cars.push({ id: i, axis, len, row, col });
      placed = true;
    }
    if (!placed) return null;
  }
  return cars;
}

/**
 * Every legal slide on this board, as the move that WOULD be made.
 *
 * `skip` refuses to move the same car back the way it just came. Without it the
 * walk spends most of its steps shuffling one car forwards and backwards, which
 * looks like scrambling and leaves the board where it started — and it would
 * also pad the plan with pairs of moves that cancel, so a finished puzzle would
 * report a "solution" twice as long as the one it needs.
 */
function legalMoves(state: ParkingState, skip: Move | null): Move[] {
  const out: Move[] = [];
  for (let car = 0; car < state.cars.length; car++) {
    const from = axisPos(state.cars[car]);
    for (const offset of reach(state, car)) {
      if (skip && skip.car === car && Math.sign(offset) === -Math.sign(skip.to - skip.from)) {
        continue;
      }
      out.push({ car, from, to: from + offset });
    }
  }
  return out;
}

/** A board worth handing a child: not already won, and something in the way. */
function isAJam(state: ParkingState): boolean {
  return !isSolved(state) && blockers(state) > 0;
}

/**
 * Walk away from a solved board, recording the inverse of each step AND every
 * position worth grading on the way.
 *
 * `plan` is built with `unshift`, so it comes back in the order a player would
 * make the moves: undo the LAST scramble step first, and the FIRST one last.
 * That ordering is also what makes a SAMPLE cheap — the plan that finishes the
 * position at step `i` is the last `i` entries of the finished plan, so the
 * walk stores positions and nothing else.
 */
interface Walk {
  /** Positions to grade, in the order the walk reached them. */
  samples: { state: ParkingState; step: number }[];
  /** The inverse walk from the FINAL position. */
  plan: Move[];
}

function walkAway(start: Car[], steps: number, rng: () => number): Walk {
  let state = fresh(start);
  const plan: Move[] = [];
  const samples: { state: ParkingState; step: number }[] = [];
  let previous: Move | null = null;

  for (let i = 0; i < steps + EXTRA_STEPS; i++) {
    const options = legalMoves(state, previous);
    // Gridlock. Nothing can move, so nothing more can be done with this layout.
    if (options.length === 0) break;
    const move = pick(options, rng);
    state = slide(state, move.car, move.to - move.from);
    plan.unshift({ car: move.car, from: move.to, to: move.from });
    previous = move;
    const step = i + 1;
    if (step >= steps && step % SAMPLE_EVERY === 0) samples.push({ state: fresh(state.cars), step });
  }

  // A walk that gridlocked before its level's own step count never reached a
  // sample. Its final position is still a legal board, so it is offered rather
  // than thrown away, and the depth gate decides whether it is worth anything.
  if (samples.length === 0 && plan.length > 0) {
    samples.push({ state: fresh(state.cars), step: plan.length });
  }
  return { samples, plan };
}

/**
 * A board and the plan that finishes it.
 *
 * `plan` is returned rather than stored on the state on purpose: it is a
 * property of the DEAL, not of the position, and a solution living inside the
 * state is a solution that ends up on the child's disk and inside every saved
 * snapshot.
 *
 * TWO GATES, AND THEY ANSWER DIFFERENT QUESTIONS. `isAJam` is the cheap one:
 * not already won, and something in the player's way. `solutionDepth` is the
 * real one, and it exists because the cheap gate was ALL there was and it was
 * measurably not enough — one car in the way is one car to move, so boards
 * passing it had a true minimum of 2.1 moves at every tier while the recorded
 * walk ran to 43. The length of the walk cannot see that. Only the depth can.
 *
 * The plan handed back is the one that finishes the position that was GRADED,
 * which is why the walk keeps its samples: reversing the whole walk would solve
 * a different board.
 *
 * BOUNDED at `DEAL_ATTEMPTS` layouts, each contributing a handful of samples.
 * When the loop runs out it returns the DEEPEST board it graded rather than
 * looping again — a tier whose floor is genuinely out of reach must fail toward
 * the best board available, and it must do it in bounded time on a phone.
 */
export function deal(level: LevelId, rng: () => number = Math.random): Deal {
  const { cars, scramble, floor } = LEVELS[level];
  let best: Deal | null = null;
  let bestDepth = -1;

  for (let attempt = 0; attempt < DEAL_ATTEMPTS; attempt++) {
    const layout = solvedBoard(cars, rng);
    if (!layout) continue;
    const walk = walkAway(layout, scramble, rng);

    // Deepest-walked FIRST. A position further from the solved board is the
    // likelier one to clear the floor, so grading from the end lets the common
    // case stop before paying for the rest of the samples.
    for (let i = walk.samples.length - 1; i >= 0; i--) {
      const { state, step } = walk.samples[i];
      if (!isAJam(state)) continue;
      const depth = solutionDepth(state, floor);
      if (depth > bestDepth) {
        bestDepth = depth;
        best = { state, plan: walk.plan.slice(walk.plan.length - step) };
      }
      if (bestDepth >= floor) return best as Deal;
    }
  }

  // Nothing cleared the floor, or nothing could be placed at all. Hand back the
  // deepest board graded, and failing even that the solved board itself — which
  // is a board with nothing to do, and the only outcome here nobody has ever
  // observed.
  return best ?? { state: fresh(solvedBoard(cars, rng) ?? []), plan: [] };
}

export function newGame(level: LevelId, rng: () => number = Math.random): ParkingState {
  return deal(level, rng).state;
}
