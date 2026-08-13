// Way Home - pure logic for the tap-a-square, walk-the-shortest-path maze.
//
// WHAT THIS IS, AND WHAT IT IS NOT. Nothing in this catalogue moves a character
// through a space except `snake`, and this is deliberately its opposite in
// every mechanic that matters:
//
//   snake                             maze
//   -----                             ----
//   steering, on a clock              nothing moves until a child taps
//   the space is empty                the space IS the puzzle
//   you die by touching a wall        walls simply cannot be walked through
//   one input, held under time        one tap, thought about for as long as
//                                     anybody likes
//   the skill is reacting             the skill is choosing an ORDER
//
// It is also not `hidden` or `finddiff`, which are about LOOKING: everything
// here is visible from the first frame, and the whole question is which way
// round to collect it.
//
// THERE IS NO FAILURE STATE. No timer, no lives, no losing. A run that wanders
// is still a win; it is simply not a PERFECT one, and only perfection feeds the
// record. That is what lets a four-year-old and a nine-year-old play the same
// deal without the younger one being punished for it.
//
// TAP, NEVER DRAG - and never a step-by-step joystick either. A tap names a
// DESTINATION and the mouse walks the shortest way there, so no part of this
// game asks a child to hold a gesture or to hit a 40px square repeatedly. That
// also moves the difficulty off dexterity and onto planning, which is the
// skill the game is actually about.
//
// WHY THE RECORD IS A STREAK OF PERFECT RUNS, and not "fewest steps": every
// maze is dealt fresh, so a step count measures which maze you were handed at
// least as much as how you played it. `par` is that maze's own optimum, so
// "did you match par" is comparable across deals in a way a raw number is not.
// Same shape as `tictactoe`, whose record is its longest run of wins.
//
// PURE: no DOM, no React, no Phaser. The `rng` parameter goes LAST and defaults
// to `Math.random`. Imports are DIRECT module paths rather than the `@shared`
// barrel, which re-exports React components.
import { shuffle } from "@shared/rng";

/* ------------------------------------------------------------------ levels */

export type Difficulty = "easy" | "medium" | "hard";

/** Matches `RewardTier`, so a level id is also what the economy prices. */
export const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard"];

export interface LevelConfig {
  /** The board is square, `size` cells to a side. */
  size: number;
  /** How many crumbs have to be collected before home counts. */
  cheese: number;
  /**
   * How much of the maze is opened back up, 0 to 1.
   *
   * THE KIND LEVER, and the reason a five-cell board is not simply "the same
   * game, smaller". A perfect maze has exactly one route between any two cells,
   * so every wrong turn has to be walked back - which is a lot of backtracking
   * for somebody who is four. Braiding removes dead ends, and at 0.9 the easy
   * board reads as a garden with hedges rather than as a maze.
   */
  braid: number;
}

/**
 * THE SECOND LEVER IS HOW MANY CRUMBS, not a speed - there is no speed here to
 * turn up. One crumb is a straight errand; four is a real ordering problem,
 * because the best route rarely visits them in the order they catch your eye.
 */
export const LEVELS: Record<Difficulty, LevelConfig> = {
  easy: { size: 5, cheese: 2, braid: 0.9 },
  medium: { size: 6, cheese: 3, braid: 0.45 },
  hard: { size: 7, cheese: 4, braid: 0.1 },
};

/* ------------------------------------------------------------------- walls */

/**
 * Where the walls are, as two flat arrays the size of the board.
 *
 * `right[i]` is the wall between cell `i` and the cell to its right; `down[i]`
 * the one below it. Entries on the last column and the last row describe an
 * edge of the board and are never read - `isOpen` refuses a non-neighbour
 * before it looks anything up, which is what stops a route wrapping from the
 * end of one row onto the start of the next.
 *
 * Two arrays rather than four sides per cell, so one wall is one fact. Storing
 * it twice would let a snapshot arrive with a wall that exists from one side
 * and not the other, and the mouse would walk through it in exactly one
 * direction.
 */
export interface Walls {
  right: boolean[];
  down: boolean[];
}

/** Every cell orthogonally adjacent to `i`, in a fixed order (up, right, down, left). */
export function neighbours(size: number, i: number): number[] {
  const r = Math.floor(i / size);
  const c = i % size;
  const out: number[] = [];
  if (r > 0) out.push(i - size);
  if (c < size - 1) out.push(i + 1);
  if (r < size - 1) out.push(i + size);
  if (c > 0) out.push(i - 1);
  return out;
}

/** Can the mouse walk straight from `a` to `b`? False unless they are neighbours. */
export function isOpen(walls: Walls, size: number, a: number, b: number): boolean {
  if (!neighbours(size, a).includes(b)) return false;
  const [lo, hi] = a < b ? [a, b] : [b, a];
  return hi - lo === 1 ? !walls.right[lo] : !walls.down[lo];
}

export function openNeighbours(walls: Walls, size: number, i: number): number[] {
  return neighbours(size, i).filter((n) => isOpen(walls, size, i, n));
}

/** Remove the wall between two NEIGHBOURING cells. Only ever called with a pair. */
function openWall(walls: Walls, a: number, b: number): void {
  const [lo, hi] = a < b ? [a, b] : [b, a];
  if (hi - lo === 1) walls.right[lo] = false;
  else walls.down[lo] = false;
}

/**
 * Carve a maze, then braid it.
 *
 * A depth-first backtracker, which produces a PERFECT maze: every cell
 * reachable, exactly one route between any two. That guarantee is the whole
 * reason it is used rather than scattering walls at random - a random board is
 * unsolvable often enough that a child would meet one, and an unreachable crumb
 * is a puzzle that cannot be finished with nothing on screen to say so.
 *
 * Braiding then opens `braid` of the dead ends back up. It can only ever REMOVE
 * walls, so connectedness survives it by construction.
 */
export function carve(size: number, braid: number, rng: () => number = Math.random): Walls {
  const n = size * size;
  const walls: Walls = { right: Array(n).fill(true), down: Array(n).fill(true) };
  const seen = Array(n).fill(false);
  const stack = [0];
  seen[0] = true;
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const fresh = neighbours(size, cur).filter((x) => !seen[x]);
    if (!fresh.length) {
      stack.pop();
      continue;
    }
    const next = fresh[Math.floor(rng() * fresh.length)];
    openWall(walls, cur, next);
    seen[next] = true;
    stack.push(next);
  }

  if (braid > 0) {
    for (let i = 0; i < n; i++) {
      // Judged as the loop reaches it: opening one dead end can retire the one
      // beside it, and re-opening a cell that is no longer a dead end would
      // dissolve the maze into an empty room.
      if (openNeighbours(walls, size, i).length !== 1) continue;
      if (rng() >= braid) continue;
      const closed = neighbours(size, i).filter((x) => !isOpen(walls, size, i, x));
      if (!closed.length) continue;
      openWall(walls, i, closed[Math.floor(rng() * closed.length)]);
    }
  }
  return walls;
}

/* ------------------------------------------------------------------- paths */

/** Steps from `from` to every cell. -1 for anything walled off (see `carve`). */
export function distances(walls: Walls, size: number, from: number): number[] {
  const d = Array(size * size).fill(-1);
  d[from] = 0;
  const queue = [from];
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head];
    for (const n of openNeighbours(walls, size, cur)) {
      if (d[n] !== -1) continue;
      d[n] = d[cur] + 1;
      queue.push(n);
    }
  }
  return d;
}

/**
 * The squares to walk through to get from `from` to `to`, `from` excluded.
 *
 * Empty when they are the same cell, null when there is no way - which cannot
 * happen in a carved maze and is answered honestly anyway, because the
 * alternative is a renderer that trusts a route it was never given.
 */
export function pathBetween(
  walls: Walls,
  size: number,
  from: number,
  to: number,
): number[] | null {
  if (from === to) return [];
  const prev = Array(size * size).fill(-1);
  prev[from] = from;
  const queue = [from];
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head];
    if (cur === to) break;
    for (const n of openNeighbours(walls, size, cur)) {
      if (prev[n] !== -1) continue;
      prev[n] = cur;
      queue.push(n);
    }
  }
  if (prev[to] === -1) return null;
  const path: number[] = [];
  for (let at = to; at !== from; at = prev[at]) path.unshift(at);
  return path;
}

/* --------------------------------------------------------------------- par */

function permutations(items: number[]): number[][] {
  if (items.length <= 1) return [items];
  const out: number[][] = [];
  for (let i = 0; i < items.length; i++) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const tail of permutations(rest)) out.push([items[i], ...tail]);
  }
  return out;
}

/**
 * The shortest possible run: which order to collect the crumbs in, and what
 * that costs.
 *
 * Brute force over every order, which is 24 of them at four crumbs and is the
 * honest way to get an answer that is actually optimal. A greedy
 * nearest-crumb-first walk is wrong often enough that `par` would be a number
 * nobody could match, and "perfect" would quietly become unreachable.
 */
export function optimalRoute(
  walls: Walls,
  size: number,
  start: number,
  cheese: readonly number[],
  home: number,
): { order: number[]; steps: number } {
  const points = [start, ...cheese, home];
  const from = points.map((p) => distances(walls, size, p));

  let best: { order: number[]; steps: number } | null = null;
  for (const order of permutations(cheese.map((_, i) => i + 1))) {
    let total = 0;
    let at = 0;
    for (const next of order) {
      total += from[at][points[next]];
      at = next;
    }
    total += from[at][home];
    if (!best || total < best.steps) best = { order: order.map((i) => points[i]), steps: total };
  }
  return best ?? { order: [], steps: from[0][home] };
}

/* ------------------------------------------------------------------- state */

export interface MazeState {
  level: Difficulty;
  size: number;
  walls: Walls;
  /** Where the mouse is. */
  at: number;
  home: number;
  /** Crumbs still out there, ascending so two equal boards compare equal. */
  cheese: number[];
  /** Squares walked THIS maze. */
  steps: number;
  /**
   * The fewest steps this maze can be finished in.
   *
   * A fact about the deal, computed once and carried, because it cannot be
   * recomputed later: the moment a crumb is collected the board no longer
   * contains the question par is the answer to.
   */
  par: number;
  /**
   * Perfect mazes finished in a row, THIS RUN.
   *
   * It lives in the state rather than in the renderer so a snapshot carries it
   * without anybody having to remember to add it - a streak left behind on a
   * resume would silently reset a child's record-in-progress to nothing.
   */
  streak: number;
}

export type TapOutcome =
  | { kind: "ignored" }
  /** Nowhere to walk. Cannot happen in a carved maze; answered rather than assumed. */
  | { kind: "blocked"; at: number }
  | {
      kind: "moved";
      /** Every square walked through, in order, `at` excluded. */
      path: number[];
      /** Crumbs the route picked up on the way - not only the one aimed at. */
      collected: number[];
      solved: boolean;
      /** Finished, in exactly `par` steps. */
      perfect: boolean;
    };

/**
 * Nothing left to do. DERIVED rather than stored, so a restored board is judged
 * by the rules this build actually has rather than by a flag a previous one
 * wrote.
 */
export function isSolved(state: MazeState): boolean {
  return state.cheese.length === 0 && state.at === state.home;
}

export function newMaze(
  level: Difficulty = "easy",
  streak = 0,
  rng: () => number = Math.random,
): MazeState {
  const cfg = LEVELS[level];
  const size = cfg.size;
  const n = size * size;
  const walls = carve(size, cfg.braid, rng);

  const at = Math.floor(rng() * n);
  const d = distances(walls, size, at);
  // Home goes as far from the mouse as the maze allows. A home next door would
  // make most deals one tap, and the run would be over before a child had
  // finished looking at the board. Ties go to the lowest index, so the deal
  // stays reproducible from its seed.
  let home = at;
  for (let i = 0; i < n; i++) if (d[i] > d[home]) home = i;

  const all = Array.from({ length: n }, (_, i) => i).filter((i) => i !== at && i !== home);
  // Crumbs at least two squares out, so none of them is collected by accident
  // on the first tap. The unfiltered pool is the fallback rather than the rule:
  // on a small braided board there may not be enough far cells, and a maze with
  // fewer crumbs than the level promises is worse than a close one.
  const far = all.filter((i) => d[i] >= 2);
  const pool = far.length >= cfg.cheese ? far : all;
  const cheese = shuffle(pool, rng).slice(0, cfg.cheese).sort((a, b) => a - b);

  return {
    level,
    size,
    walls,
    at,
    home,
    cheese,
    steps: 0,
    par: optimalRoute(walls, size, at, cheese, home).steps,
    streak,
  };
}

/**
 * Send the mouse to the tapped square.
 *
 * Everything on the way is picked up, which is the rule that makes a tap on a
 * far crumb a real decision rather than a chore: the route matters, not just
 * the destination. Reaching home before the last crumb is a perfectly legal
 * walk and simply is not a win.
 */
export function tap(state: MazeState, index: number): { state: MazeState; outcome: TapOutcome } {
  const ignored = { state, outcome: { kind: "ignored" } as const };
  if (!Number.isInteger(index) || index < 0 || index >= state.size * state.size) return ignored;
  // The renderer deals the next maze a beat after this one is finished. A tap
  // inside that beat must not add steps to a run that has already been scored.
  if (isSolved(state)) return ignored;
  if (index === state.at) return ignored;

  const path = pathBetween(state.walls, state.size, state.at, index);
  if (!path || path.length === 0) return { state, outcome: { kind: "blocked", at: index } };

  const collected = path.filter((c) => state.cheese.includes(c));
  const cheese = state.cheese.filter((c) => !collected.includes(c));
  const steps = state.steps + path.length;
  const solved = cheese.length === 0 && index === state.home;
  const perfect = solved && steps === state.par;

  return {
    state: {
      ...state,
      at: index,
      cheese,
      steps,
      // A wasted step costs the streak and nothing else. There is no failure in
      // this game: the maze is still finished, the win still pays.
      streak: solved ? (perfect ? state.streak + 1 : 0) : state.streak,
    },
    outcome: { kind: "moved", path, collected, solved, perfect },
  };
}

/* -------------------------------------------------------------- reporting */

/**
 * What this run's record MEASURES, in the shape `ctx.score` wants.
 *
 * A VALUE and a UNIT and never a direction - `src/sdk/score.ts` decides that
 * points rank high, so a game cannot order its own board backwards. `board`
 * scopes it to a difficulty because a perfect five-square garden and a perfect
 * seven-square maze are not the same achievement.
 */
export function scoreReport(
  state: MazeState,
  board: Difficulty,
): { value: number; unit: "points"; board: string } {
  return { value: state.streak, unit: "points", board };
}
