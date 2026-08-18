// Match Three — PURE rules. No DOM, no React, no canvas, no engine.
//
// Modules are imported by DIRECT path, never through the `@shared` barrel: the
// barrel re-exports `Prompt` and `winMoment`, which pull React and the portal
// in, and `src/games/logic-is-pure.test.ts` fails the build on it.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE WHOLE CASCADE IS RESOLVED HERE, IN ONE CALL, AND THE RENDERER REPLAYS IT.
//
// The obvious shape for a match-3 is a state machine the renderer drives: swap,
// wait for the animation, clear, wait, drop, wait, look for new matches, repeat.
// It works, and every one of those waits is a state that only a `setTimeout` can
// leave — which is precisely the shape `session-snapshot-convention.md` was
// written about. Memory's 850 ms mismatch lock reached the disk once and
// restored a board that refused every card, looking completely normal.
//
// So `swapAt()` runs the entire cascade to a settled board and returns the
// intermediate boards as a list of STEPS. The state it hands back is final: no
// pending clear, no gem in mid-air, nothing a timer owes it. The renderer walks
// `steps` for the animation and can be interrupted, backgrounded or unmounted
// at any point without the rules noticing, because the rules already finished.
//
// The same property is what makes a match-3 unit-testable in node at all: a
// cascade is a pure function from (board, swap) to (board, steps, points).
// ─────────────────────────────────────────────────────────────────────────────

/** The three rungs every game in this catalogue offers. */
export type Difficulty = "easy" | "medium" | "hard";
export const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard"] as const;

export interface LevelSpec {
  /** Board edge, in cells. Square. */
  size: number;
  /**
   * How many gem colours are in play — the single biggest difficulty lever, far
   * more than the board size. Four colours means a random swap matches often;
   * six means a child has to look.
   */
  colors: number;
  /** Gems to clear for the first round. */
  goal: number;
  /** How much the goal grows per round. */
  goalStep: number;
}

export const LEVELS: Record<Difficulty, LevelSpec> = {
  easy: { size: 6, colors: 4, goal: 24, goalStep: 6 },
  medium: { size: 7, colors: 5, goal: 32, goalStep: 8 },
  hard: { size: 8, colors: 6, goal: 40, goalStep: 10 },
};

/** Points for one gem in the first clear of a cascade. */
export const POINTS_PER_GEM = 10;

/**
 * The longest run of shuffles the board is given to find a legal move before
 * it is dealt again from scratch.
 *
 * A bound rather than `while (true)`: `shuffleBoard` draws from the gems the
 * board already holds, and a board of (say) four gems in two colours has
 * arrangements but may have no move in ANY of them. Unbounded, that is a hang
 * with a spinner in front of a five-year-old; bounded, it is one fresh deal.
 */
const SHUFFLE_TRIES = 60;

/* ─────────────────────────────────────────────────────────────────────────────
   THE BOARD

   A flat `number[]` of 1-based colour indices, row-major. 0 is never a colour —
   it is the hole a cleared gem leaves, and it exists only INSIDE a cascade step.
   A settled board holds no zeroes, which `newGame` and `swapAt` both guarantee
   and `logic.test.ts` pins.

   1-based on purpose: the renderer's palette array is 1-based too, so a colour
   index is the same number in both files and an off-by-one shows up as a wrong
   colour rather than as a silent `undefined`.
   ───────────────────────────────────────────────────────────────────────────*/

export interface Match3State {
  level: Difficulty;
  /** Board edge. Kept on the state so the renderer never re-derives it. */
  size: number;
  /** How many colours this board was dealt with. */
  colors: number;
  /** Row-major, `size * size` entries, every one 1..colors on a settled board. */
  grid: readonly number[];
  /** The gem a child has picked, or null. The whole input model — see `tapCell`. */
  selected: number | null;
  /** 1-based. The endless ladder this game climbs instead of ending. */
  round: number;
  /** Gems cleared in THIS round. Resets when the round advances. */
  cleared: number;
  /** Gems this round still needs. Derived, but stored so the renderer cannot get it wrong. */
  goal: number;
  score: number;
  /** Swaps that produced a match. A refused swap is not a move. */
  moves: number;
}

/** One frame of a cascade: what vanished, and the board left behind. */
export interface CascadeStep {
  /** Indices cleared in this step, on the board BEFORE it. */
  cleared: readonly number[];
  /** The board after clearing, gravity and refill. */
  grid: readonly number[];
  /** Points this step scored, multiplier already applied. */
  points: number;
}

export type SwapOutcome =
  | { kind: "ignored" }
  /**
   * A legal adjacent swap that makes no line. The board is UNCHANGED and this
   * is not a mistake being scored — the renderer answers with a bump and says
   * nothing, the same shape the World shop uses for an item nobody can afford.
   */
  | { kind: "rejected"; a: number; b: number }
  | {
      kind: "matched";
      a: number;
      b: number;
      /**
       * The board the instant the two gems trade places, before anything
       * clears. Returned rather than left for the renderer to re-derive, so
       * there is one answer to what a swap does instead of two that can drift.
       */
      swapped: readonly number[];
      steps: readonly CascadeStep[];
      /** Total points, all steps. */
      points: number;
      /** Gems cleared, all steps. */
      gems: number;
      /** The round this swap completed, or 0. Never more than one per swap. */
      roundUp: number;
      /** The board had no legal move left and was shuffled after settling. */
      shuffled: boolean;
    };

export type Rng = () => number;

const at = (size: number, r: number, c: number): number => r * size + c;

/* ───────────────────────────────────────────────────────────────── matching */

/**
 * Every index that is part of a run of three or more, horizontally or
 * vertically.
 *
 * Runs are found per row and per column and unioned, so a cross-shaped match
 * clears both arms and the shared gem exactly once. Holes (0) never match —
 * without that guard a column of three holes mid-cascade reads as a line and
 * scores itself, repeatedly.
 */
export function findMatches(grid: readonly number[], size: number): number[] {
  const hit = new Set<number>();

  const scan = (get: (i: number) => number, index: (i: number) => number) => {
    let runStart = 0;
    for (let i = 1; i <= size; i += 1) {
      const same = i < size && get(i) !== 0 && get(i) === get(runStart);
      if (same) continue;
      if (i - runStart >= 3) {
        for (let k = runStart; k < i; k += 1) hit.add(index(k));
      }
      runStart = i;
    }
  };

  for (let r = 0; r < size; r += 1) {
    scan(
      (c) => grid[at(size, r, c)],
      (c) => at(size, r, c),
    );
  }
  for (let c = 0; c < size; c += 1) {
    scan(
      (r) => grid[at(size, r, c)],
      (r) => at(size, r, c),
    );
  }
  return [...hit].sort((x, y) => x - y);
}

/** Are two indices orthogonally adjacent on a `size` board? */
export function areAdjacent(a: number, b: number, size: number): boolean {
  if (a === b) return false;
  const ra = Math.floor(a / size);
  const ca = a % size;
  const rb = Math.floor(b / size);
  const cb = b % size;
  return Math.abs(ra - rb) + Math.abs(ca - cb) === 1;
}

/**
 * Drop every gem into the holes below it, then fill the top from `rng`.
 *
 * Column by column from the bottom up, which is the only order that keeps the
 * relative order of the survivors — a naive "compact the array" pass mixes
 * columns and makes gems teleport sideways, which looks like a bug and is one.
 */
function collapse(grid: readonly number[], size: number, colors: number, rng: Rng): number[] {
  const next = [...grid];
  for (let c = 0; c < size; c += 1) {
    let write = size - 1;
    for (let r = size - 1; r >= 0; r -= 1) {
      const v = next[at(size, r, c)];
      if (v !== 0) {
        next[at(size, write, c)] = v;
        write -= 1;
      }
    }
    for (let r = write; r >= 0; r -= 1) {
      next[at(size, r, c)] = 1 + Math.floor(rng() * colors);
    }
  }
  return next;
}

/**
 * Resolve a board to a settled one, collecting every step.
 *
 * The multiplier is the CASCADE DEPTH, not the run length: a child who sets up
 * a chain is rewarded for the chain. It is capped at 5 so a lucky avalanche on
 * an easy board cannot mint a score no amount of skill reaches later.
 */
function settle(
  grid: readonly number[],
  size: number,
  colors: number,
  rng: Rng,
): { grid: readonly number[]; steps: CascadeStep[]; points: number; gems: number } {
  const steps: CascadeStep[] = [];
  let board = grid;
  let points = 0;
  let gems = 0;

  for (let depth = 1; ; depth += 1) {
    const cleared = findMatches(board, size);
    if (cleared.length === 0) break;

    const holed = [...board];
    for (const i of cleared) holed[i] = 0;
    const after = collapse(holed, size, colors, rng);

    const stepPoints = cleared.length * POINTS_PER_GEM * Math.min(depth, 5);
    points += stepPoints;
    gems += cleared.length;
    steps.push({ cleared, grid: after, points: stepPoints });
    board = after;
  }

  return { grid: board, steps, points, gems };
}

/* ─────────────────────────────────────────────────────────── legality */

/**
 * Does ANY adjacent swap on this board produce a line?
 *
 * Checked by actually performing each swap and asking `findMatches`, rather
 * than by pattern-matching the famous match-3 shapes. The shape list is the
 * fast way and it is a second implementation of the matching rule — the two
 * drift, and when they do the board declares itself dead with a legal move
 * sitting on it, or worse, declares itself alive with none.
 *
 * Only right and down are tried, because every adjacency is some cell's right
 * or down neighbour and swapping is symmetric.
 */
export function hasMove(grid: readonly number[], size: number): boolean {
  const test = [...grid];
  const swapped = (a: number, b: number): boolean => {
    [test[a], test[b]] = [test[b], test[a]];
    const found = findMatches(test, size).length > 0;
    [test[a], test[b]] = [test[b], test[a]];
    return found;
  };

  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const i = at(size, r, c);
      if (c + 1 < size && swapped(i, i + 1)) return true;
      if (r + 1 < size && swapped(i, i + size)) return true;
    }
  }
  return false;
}

/**
 * Rearrange the gems already on the board until there is a move and no gem is
 * already in a line.
 *
 * It SHUFFLES rather than re-deals so the child keeps the colours they had —
 * a board that silently becomes a different board is the "the game is cheating"
 * feeling `blocks`' bag exists to avoid. Falls back to a fresh deal only when
 * this multiset genuinely has no playable arrangement.
 */
export function shuffleBoard(
  grid: readonly number[],
  size: number,
  colors: number,
  rng: Rng,
): number[] {
  const bag = [...grid];
  for (let attempt = 0; attempt < SHUFFLE_TRIES; attempt += 1) {
    for (let i = bag.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    if (findMatches(bag, size).length === 0 && hasMove(bag, size)) return [...bag];
  }
  return dealBoard(size, colors, rng);
}

/**
 * A fresh board with no gem already in a line and at least one legal move.
 *
 * Dealt cell by cell, refusing any colour that would complete a run behind it,
 * which is cheaper and far more reliable than dealing at random and re-rolling
 * the whole board. The candidate list can empty out on a two-colour board, so
 * it falls back to any colour and lets the settle-and-shuffle below clean up.
 */
export function dealBoard(size: number, colors: number, rng: Rng): number[] {
  let last = new Array<number>(size * size).fill(1);
  for (let attempt = 0; attempt < SHUFFLE_TRIES; attempt += 1) {
    const grid = new Array<number>(size * size).fill(0);
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        const banned = new Set<number>();
        if (c >= 2 && grid[at(size, r, c - 1)] === grid[at(size, r, c - 2)]) {
          banned.add(grid[at(size, r, c - 1)]);
        }
        if (r >= 2 && grid[at(size, r - 1, c)] === grid[at(size, r - 2, c)]) {
          banned.add(grid[at(size, r - 1, c)]);
        }
        const pool: number[] = [];
        for (let v = 1; v <= colors; v += 1) if (!banned.has(v)) pool.push(v);
        const from = pool.length > 0 ? pool : Array.from({ length: colors }, (_, k) => k + 1);
        grid[at(size, r, c)] = from[Math.floor(rng() * from.length)];
      }
    }
    if (hasMove(grid, size)) return grid;
    last = grid;
  }
  // Every attempt produced a locked board, which needs a degenerate colour
  // count to reach at all. Hand back the last one rather than recursing: the
  // caller can still shuffle it, and a board with no move is still a board,
  // whereas a recursive retry on the same arguments is a hang with a spinner
  // in front of a child (a-wait-rule-whose-release-needs-the-thing-it-blocks.md
  // is the same shape one layer up).
  return last;
}

/* ────────────────────────────────────────────────────────────── the game */

export function newGame(level: Difficulty, rng: Rng = Math.random): Match3State {
  const cfg = LEVELS[level];
  return {
    level,
    size: cfg.size,
    colors: cfg.colors,
    grid: dealBoard(cfg.size, cfg.colors, rng),
    selected: null,
    round: 1,
    cleared: 0,
    goal: cfg.goal,
    score: 0,
    moves: 0,
  };
}

/** The goal for a given round. Round 1 is `goal`; each one after adds `goalStep`. */
export function goalFor(level: Difficulty, round: number): number {
  const cfg = LEVELS[level];
  return cfg.goal + (round - 1) * cfg.goalStep;
}

/**
 * Swap two cells, resolve everything that follows, and hand back a settled
 * board.
 *
 * `rng` is a parameter rather than state so the whole thing is deterministic
 * under test, and it is the LAST parameter defaulting to `Math.random` per the
 * repo convention. The renderer passes nothing: a refill has no replay to stay
 * consistent with, because what the snapshot stores is the settled BOARD rather
 * than a seed to re-derive it from.
 */
export function swapAt(
  state: Match3State,
  a: number,
  b: number,
  rng: Rng = Math.random,
): { state: Match3State; outcome: SwapOutcome } {
  const n = state.size * state.size;
  if (a < 0 || b < 0 || a >= n || b >= n || !areAdjacent(a, b, state.size)) {
    return { state, outcome: { kind: "ignored" } };
  }

  const swapped = [...state.grid];
  [swapped[a], swapped[b]] = [swapped[b], swapped[a]];

  if (findMatches(swapped, state.size).length === 0) {
    // Nothing changes but the selection, which clears: holding the gem would
    // leave a child tapping a neighbour that has already been tried.
    return { state: { ...state, selected: null }, outcome: { kind: "rejected", a, b } };
  }

  const done = settle(swapped, state.size, state.colors, rng);

  // The round advances at most ONCE per swap. A cascade big enough to clear two
  // rounds' worth pays the second one into the next round's progress instead of
  // firing two celebrations a child cannot tell apart.
  let round = state.round;
  let cleared = state.cleared + done.gems;
  let goal = state.goal;
  let roundUp = 0;
  if (cleared >= goal) {
    roundUp = round;
    cleared -= goal;
    round += 1;
    goal = goalFor(state.level, round);
  }

  let grid = done.grid;
  let shuffled = false;
  if (!hasMove(grid, state.size)) {
    grid = shuffleBoard(grid, state.size, state.colors, rng);
    shuffled = true;
  }

  return {
    state: {
      ...state,
      grid,
      selected: null,
      round,
      cleared,
      goal,
      score: state.score + done.points,
      moves: state.moves + 1,
    },
    outcome: {
      kind: "matched",
      a,
      b,
      swapped,
      steps: done.steps,
      points: done.points,
      gems: done.gems,
      roundUp,
      shuffled,
    },
  };
}

/**
 * The whole input model: TAP, never drag.
 *
 * First tap picks a gem up. A second tap on a NEIGHBOUR attempts the swap; a
 * second tap anywhere else picks that gem up instead, and a second tap on the
 * same gem puts it down. Drag may be layered on top of this later; it may never
 * replace it — a five-year-old on a phone, and anyone on assistive input,
 * cannot reliably hold a sustained pointer gesture (CLAUDE.md § kids games).
 */
export function tapCell(
  state: Match3State,
  index: number,
  rng: Rng = Math.random,
): { state: Match3State; outcome: SwapOutcome } {
  const n = state.size * state.size;
  if (index < 0 || index >= n) return { state, outcome: { kind: "ignored" } };

  if (state.selected === null) {
    return { state: { ...state, selected: index }, outcome: { kind: "ignored" } };
  }
  if (state.selected === index) {
    return { state: { ...state, selected: null }, outcome: { kind: "ignored" } };
  }
  if (!areAdjacent(state.selected, index, state.size)) {
    return { state: { ...state, selected: index }, outcome: { kind: "ignored" } };
  }
  return swapAt(state, state.selected, index, rng);
}

/**
 * What this game's record measures.
 *
 * The ROUND reached, not the score — the same answer balloons, bubbles, frog
 * and the rest of the endless ladder give, so one player's boards read
 * consistently across the catalogue. Scoped per difficulty because a round on a
 * six-colour board is not the same achievement as a round on a four-colour one.
 *
 * `logic.ts` is the one place that names the unit, and
 * `score-unit-declared.test.ts` pins it against `meta.ts` — only the VALUE of a
 * record is ever persisted, so a wrong unit orders this board backwards forever.
 */
export function scoreReport(
  state: Match3State,
  level: Difficulty,
): { value: number; unit: "points"; board: string } {
  return { value: state.round, unit: "points", board: level };
}
