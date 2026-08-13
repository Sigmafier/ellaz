// Fit - pure game logic for the place-a-shape-on-a-grid puzzle.
//
// WHAT THIS IS, AND WHAT IT IS NOT. There is already a falling-block game in
// this catalogue (`src/games/blocks/`) and this is deliberately its opposite in
// every mechanic that matters:
//
//   blocks                            fit
//   ------                            ---
//   gravity, on a clock               nothing moves until a child taps
//   the piece rotates                 shapes arrive pre-turned; you plan instead
//   only ROWS clear                   rows AND columns clear, together
//   you lose by stacking to the top   you run out when nothing offered fits
//   the skill is reacting in time     the skill is looking ahead
//
// So there is no timer anywhere in this file, no `tick`, and no `rotate`. Every
// one of those absences is the design.
//
// TAP, NEVER DRAG. The whole genre is a drag genre, and drag is exactly what a
// five-year-old on a phone - and anyone on assistive input - cannot reliably
// hold. The model here is a HELD shape plus a reducer: one of the three offered
// shapes is always held, and a tap on the board either places it or answers
// with a bump. A renderer may add drag ON TOP; it may never be the only way
// through. That is why there is no `drag(from, to)` here.
//
// ENDLESS, so there is no completion and this file grants NOTHING. It reports
// what happened - cells placed, lines cleared, points gained - and the renderer
// decides what that is worth via `winMoment`. The earn table lives in
// `src/sdk/economy.ts` and nowhere else.
//
// NOTHING HERE CAN ONLY BE LEFT BY A TIMER, which is what makes the whole state
// safe to write to disk. The flash a cleared line makes lives in the renderer
// and never reaches `FitState`; the one derived field, `selected`, is always a
// valid slot by construction. See session-snapshot-convention.md for the memory
// bug that rule was written from.
//
// PURE: no DOM, no React, no Phaser. The `rng` parameter goes LAST and defaults
// to `Math.random`. Imports are DIRECT module paths rather than the `@shared`
// barrel, which re-exports React components.
import { shuffle } from "@shared/rng";

/* ------------------------------------------------------------------ shapes */

export type ShapeId =
  | "dot"
  | "duo2h"
  | "duo2v"
  | "trio3h"
  | "trio3v"
  | "quad4h"
  | "quad4v"
  | "quint5h"
  | "quint5v"
  | "box2"
  | "box3"
  | "corner3a"
  | "corner3b"
  | "corner3c"
  | "corner3d"
  | "elbow5a"
  | "elbow5b"
  | "elbow5c"
  | "elbow5d";

/**
 * The shape set, drawn as strings so the picture is readable in the diff.
 *
 * IT IS OURS, and that is a constraint rather than a flourish. The famous
 * four-cell pieces in their famous colours are trade dress; this set is built
 * around what a PLACEMENT game needs instead - single cells and short bars to
 * finish a line with, squares and corners to eat space, and long bars that only
 * fit while the board is still open. See CLAUDE.md § Legal.
 *
 * THERE IS NO ROTATION, so each orientation is its own shape. That is the rule
 * that makes this a planning game: a bar you cannot turn has to be planned for
 * before it arrives, not fixed once it does.
 *
 * `color` is an index into the renderer's palette, grouped by family so a child
 * learns the set by colour before they can name it. Logic paints nothing.
 */
const SHAPES: Record<ShapeId, { rows: string[]; color: number }> = {
  dot: { rows: ["1"], color: 1 },

  duo2h: { rows: ["11"], color: 2 },
  duo2v: { rows: ["1", "1"], color: 2 },

  trio3h: { rows: ["111"], color: 3 },
  trio3v: { rows: ["1", "1", "1"], color: 3 },

  quad4h: { rows: ["1111"], color: 4 },
  quad4v: { rows: ["1", "1", "1", "1"], color: 4 },

  quint5h: { rows: ["11111"], color: 5 },
  quint5v: { rows: ["1", "1", "1", "1", "1"], color: 5 },

  box2: { rows: ["11", "11"], color: 6 },
  box3: { rows: ["111", "111", "111"], color: 7 },

  // A three-cell corner, all four ways round.
  corner3a: { rows: ["10", "11"], color: 8 },
  corner3b: { rows: ["11", "10"], color: 8 },
  corner3c: { rows: ["11", "01"], color: 8 },
  corner3d: { rows: ["01", "11"], color: 8 },

  // A five-cell corner: two three-long arms sharing their end. The awkward one.
  elbow5a: { rows: ["100", "100", "111"], color: 9 },
  elbow5b: { rows: ["111", "100", "100"], color: 9 },
  elbow5c: { rows: ["111", "001", "001"], color: 9 },
  elbow5d: { rows: ["001", "001", "111"], color: 9 },
};

export const SHAPE_IDS = Object.keys(SHAPES) as ShapeId[];

/** How many distinct palette entries a renderer must supply. */
export const PALETTE_SIZE = 9;

export interface Shape {
  id: ShapeId;
  /** Filled cells as `[row, col]` offsets from the shape's own top-left. */
  cells: Array<[number, number]>;
  w: number;
  h: number;
  /** Index into the renderer's palette. Never a colour: logic paints nothing. */
  color: number;
}

export function makeShape(id: ShapeId): Shape {
  const def = SHAPES[id];
  const cells: Array<[number, number]> = [];
  for (let r = 0; r < def.rows.length; r++) {
    for (let c = 0; c < def.rows[r].length; c++) {
      if (def.rows[r][c] === "1") cells.push([r, c]);
    }
  }
  return {
    id,
    cells,
    w: Math.max(...def.rows.map((row) => row.length)),
    h: def.rows.length,
    color: def.color,
  };
}

export function isShapeId(value: unknown): value is ShapeId {
  return typeof value === "string" && value in SHAPES;
}

/* ------------------------------------------------------------------ levels */

export type Difficulty = "easy" | "medium" | "hard";

/** Matches `RewardTier`, so a level id is also what the economy prices. */
export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

/** How many shapes sit in the tray at once. Three is the whole planning problem. */
export const OFFER_SIZE = 3;

export interface LevelConfig {
  /** The board is square. A line is `size` cells long, in either direction. */
  size: number;
  /** The bag this level draws from. A shape absent here never appears. */
  pool: ShapeId[];
  /**
   * THE FIRST DIFFICULTY LEVER, and the kind one.
   *
   * When true, a refill prefers a shape the board can actually take right now.
   * A small player's run then ends because they filled the board, never because
   * the draw handed them a five-cell corner with nowhere to go - which to a
   * four-year-old is indistinguishable from the game breaking.
   *
   * It is an approximation on purpose: fit is judged against the board as it
   * stands, and the other two offered shapes will change it. Good enough to
   * remove the unfair ending, honest enough not to promise a run can never end.
   */
  forgiving: boolean;
}

/**
 * THE SECOND LEVER IS THE POOL, not a speed - there is no speed here to turn up.
 *
 * `easy` is not "the same game, larger". Its pool holds only shapes three cells
 * long or smaller, so every gap a child leaves is still fillable, and its board
 * is small enough that a line is six cells rather than eight. `hard` adds the
 * five-long bars and the three-by-three block, which need a plan several
 * placements ahead or they have nowhere to sit.
 */
export const LEVELS: Record<Difficulty, LevelConfig> = {
  easy: {
    size: 6,
    pool: [
      "dot",
      "duo2h",
      "duo2v",
      "trio3h",
      "trio3v",
      "box2",
      "corner3a",
      "corner3b",
      "corner3c",
      "corner3d",
    ],
    forgiving: true,
  },
  medium: {
    size: 8,
    pool: [
      "dot",
      "duo2h",
      "duo2v",
      "trio3h",
      "trio3v",
      "quad4h",
      "quad4v",
      "box2",
      "corner3a",
      "corner3b",
      "corner3c",
      "corner3d",
      "elbow5a",
      "elbow5b",
      "elbow5c",
      "elbow5d",
    ],
    forgiving: false,
  },
  hard: {
    size: 8,
    pool: SHAPE_IDS,
    forgiving: false,
  },
};

/* ------------------------------------------------------------------ scoring */

/**
 * What clearing `n` lines at once is worth.
 *
 * Super-linear, and that IS the game: `5n(n + 1)` pays 10 for one line and 30
 * for two, so setting up a row and a column to fall together beats taking them
 * one at a time. Without that, patience would be worth nothing and the game
 * would reward tidying rather than planning.
 */
export function clearScore(lines: number): number {
  return lines <= 0 ? 0 : 5 * lines * (lines + 1);
}

/** A coin every this many lines. See `milestoneStep`. */
export const MILESTONE_EVERY = 5;

/**
 * Which milestone a run at `lines` cleared has reached.
 *
 * Derived from the run's own line count rather than counted up, so a RESUMED
 * run recomputes exactly the step it was already paid for. A latch that started
 * back at zero over a board already at twenty lines would pay the next clear
 * again - once per resume, forever. See session-snapshot-convention.md.
 */
export function milestoneStep(lines: number): number {
  return Math.floor(lines / MILESTONE_EVERY);
}

/* ------------------------------------------------------------------- state */

/** An empty square is `null`. Anything else is a palette index. */
export type Cell = number | null;

export interface FitState {
  level: Difficulty;
  size: number;
  /** Row-major, `size * size` long. */
  grid: Cell[];
  /** The tray. `null` is a slot already used this round. */
  offer: (ShapeId | null)[];
  /**
   * The slot being held. ALWAYS a slot holding a shape.
   *
   * There is no deselect, deliberately. "Nothing held" is a state a child can
   * enter and then not know how to leave - the board answers every tap with
   * silence and nothing on screen says why. A held shape is never in the way:
   * a tap either places it or bumps.
   */
  selected: number;
  score: number;
  /** Lines cleared this run, rows and columns together. */
  cleared: number;
  placed: number;
  /**
   * The shuffled draw pile.
   *
   * A bag rather than an independent draw per shape: uniform random gives real
   * droughts, and a player holding a column open for the one bar that never
   * comes reads that as the game cheating rather than as luck.
   */
  bag: ShapeId[];
}

export type TapOutcome =
  | { kind: "ignored" }
  /** The player is now holding `slot`. */
  | { kind: "selected"; slot: number }
  /** The held shape does not fit there. Not an error - see the renderer. */
  | { kind: "blocked"; at: number }
  | {
      kind: "placed";
      /** The anchor cell the player tapped - the shape's own top-left. */
      at: number;
      slot: number;
      /** Every cell the shape filled, before anything cleared. */
      cells: number[];
      /** Full rows and columns that went, by index. */
      rows: number[];
      cols: number[];
      /** Every cell those lines emptied, each counted once. */
      clearedCells: number[];
      gained: number;
      /** The tray ran out and was drawn again. */
      refilled: boolean;
    };

export function cellCount(state: FitState): number {
  return state.size * state.size;
}

/* -------------------------------------------------------------- placement */

/** Can `shape` sit with its top-left at (r0, c0)? */
export function canPlace(
  grid: readonly Cell[],
  size: number,
  shape: Shape,
  r0: number,
  c0: number,
): boolean {
  for (const [dr, dc] of shape.cells) {
    const r = r0 + dr;
    const c = c0 + dc;
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    if (grid[r * size + c] !== null) return false;
  }
  return true;
}

/**
 * Every cell this shape's TOP-LEFT could legally sit on.
 *
 * The renderer marks these while a shape is held, which is how a child learns
 * the anchor rule without a word of instruction - the marks thin out as the
 * board fills, so they stop being decoration and start being the answer.
 */
export function legalAnchors(state: FitState, shape: Shape): number[] {
  const out: number[] = [];
  for (let r = 0; r < state.size; r++) {
    for (let c = 0; c < state.size; c++) {
      if (canPlace(state.grid, state.size, shape, r, c)) out.push(r * state.size + c);
    }
  }
  return out;
}

export function fitsAnywhere(state: FitState, shape: Shape): boolean {
  for (let r = 0; r < state.size; r++) {
    for (let c = 0; c < state.size; c++) {
      if (canPlace(state.grid, state.size, shape, r, c)) return true;
    }
  }
  return false;
}

/**
 * Nothing left to do: not one of the offered shapes fits anywhere.
 *
 * DERIVED rather than stored, so a restored board is judged fresh by the rules
 * this build actually has. A stored `over` flag written by a previous build
 * would be a fact the current rules cannot check.
 */
export function isDead(state: FitState): boolean {
  return !state.offer.some((id) => id !== null && fitsAnywhere(state, makeShape(id)));
}

/* -------------------------------------------------------------- the bag */

function fitsGrid(grid: readonly Cell[], size: number, id: ShapeId): boolean {
  const shape = makeShape(id);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) if (canPlace(grid, size, shape, r, c)) return true;
  }
  return false;
}

/**
 * Take one shape off the pile, refilling and reshuffling it when it runs dry.
 *
 * On a `forgiving` level the pile is scanned for a shape that fits the board as
 * it stands, and the bag is topped up once if none of what remains does. When
 * the whole pool has nothing that fits, the head is taken anyway - a run has to
 * be allowed to end, and pretending otherwise would deal a shape that cannot be
 * played and call it a favour.
 */
function drawOne(
  grid: readonly Cell[],
  size: number,
  bag: ShapeId[],
  pool: ShapeId[],
  forgiving: boolean,
  rng: () => number,
): { id: ShapeId; bag: ShapeId[] } {
  let b = bag.length ? bag : shuffle(pool, rng);
  if (forgiving && !b.some((id) => fitsGrid(grid, size, id))) b = [...b, ...shuffle(pool, rng)];
  const found = forgiving ? b.findIndex((id) => fitsGrid(grid, size, id)) : -1;
  const at = found >= 0 ? found : 0;
  return { id: b[at], bag: [...b.slice(0, at), ...b.slice(at + 1)] };
}

function drawOffer(
  grid: readonly Cell[],
  size: number,
  bag: ShapeId[],
  pool: ShapeId[],
  forgiving: boolean,
  rng: () => number,
): { offer: ShapeId[]; bag: ShapeId[] } {
  const offer: ShapeId[] = [];
  let rest = bag;
  for (let i = 0; i < OFFER_SIZE; i++) {
    const drawn = drawOne(grid, size, rest, pool, forgiving, rng);
    offer.push(drawn.id);
    rest = drawn.bag;
  }
  return { offer, bag: rest };
}

export function newGame(level: Difficulty = "medium", rng: () => number = Math.random): FitState {
  const cfg = LEVELS[level];
  const grid: Cell[] = Array(cfg.size * cfg.size).fill(null);
  const { offer, bag } = drawOffer(grid, cfg.size, [], cfg.pool, cfg.forgiving, rng);
  return {
    level,
    size: cfg.size,
    grid,
    offer,
    selected: 0,
    score: 0,
    cleared: 0,
    placed: 0,
    bag,
  };
}

/* ------------------------------------------------------------- clearing */

/** Remove every full row and column at once. A shared cell goes exactly once. */
export function clearFull(
  grid: readonly Cell[],
  size: number,
): { grid: Cell[]; rows: number[]; cols: number[]; cells: number[] } {
  const rows: number[] = [];
  const cols: number[] = [];
  for (let r = 0; r < size; r++) {
    let full = true;
    for (let c = 0; c < size; c++) {
      if (grid[r * size + c] === null) {
        full = false;
        break;
      }
    }
    if (full) rows.push(r);
  }
  for (let c = 0; c < size; c++) {
    let full = true;
    for (let r = 0; r < size; r++) {
      if (grid[r * size + c] === null) {
        full = false;
        break;
      }
    }
    if (full) cols.push(c);
  }

  const out = [...grid];
  const cells: number[] = [];
  // Both passes read `out`, which is why the null check doubles as the dedupe:
  // the corner a full row and a full column share is already null the second
  // time it is reached, so it is counted once.
  const take = (i: number) => {
    if (out[i] === null) return;
    out[i] = null;
    cells.push(i);
  };
  for (const r of rows) for (let c = 0; c < size; c++) take(r * size + c);
  for (const c of cols) for (let r = 0; r < size; r++) take(r * size + c);
  return { grid: out, rows, cols, cells };
}

/* ------------------------------------------------------------- the reducer */

/** Pick up one of the offered shapes. */
export function tapSlot(state: FitState, slot: number): { state: FitState; outcome: TapOutcome } {
  const ignored = { state, outcome: { kind: "ignored" } as const };
  if (!Number.isInteger(slot) || slot < 0 || slot >= state.offer.length) return ignored;
  if (state.offer[slot] === null) return ignored;
  if (isDead(state)) return ignored;
  // Tapping what is already held is answered rather than refused. It changes
  // nothing, and a button that reports nothing reads as broken.
  if (slot === state.selected) return { state, outcome: { kind: "selected", slot } };
  return {
    state: { ...state, selected: slot },
    outcome: { kind: "selected", slot },
  };
}

/**
 * Put the held shape down on the board, top-left at the tapped cell.
 *
 * A tap that does not fit is `blocked`, never an error and never a penalty:
 * nothing is lost, nothing is taken, the shape is still held and the child can
 * simply tap somewhere else.
 */
export function tapCell(
  state: FitState,
  index: number,
  rng: () => number = Math.random,
): { state: FitState; outcome: TapOutcome } {
  const ignored = { state, outcome: { kind: "ignored" } as const };
  if (!Number.isInteger(index) || index < 0 || index >= state.grid.length) return ignored;
  if (isDead(state)) return ignored;

  const heldId = state.offer[state.selected];
  if (heldId === null || heldId === undefined) return ignored;

  const shape = makeShape(heldId);
  const r0 = Math.floor(index / state.size);
  const c0 = index % state.size;
  if (!canPlace(state.grid, state.size, shape, r0, c0)) {
    return { state, outcome: { kind: "blocked", at: index } };
  }

  const painted = [...state.grid];
  const cells: number[] = [];
  for (const [dr, dc] of shape.cells) {
    const i = (r0 + dr) * state.size + (c0 + dc);
    painted[i] = shape.color;
    cells.push(i);
  }

  const cleared = clearFull(painted, state.size);
  const lines = cleared.rows.length + cleared.cols.length;
  const gained = cells.length + clearScore(lines);

  const cfg = LEVELS[state.level];
  let offer: (ShapeId | null)[] = state.offer.map((id, i) => (i === state.selected ? null : id));
  let bag = state.bag;
  let refilled = false;
  if (offer.every((id) => id === null)) {
    // Drawn against the board AFTER the clear, so a forgiving level is judging
    // the room the player actually has rather than the room they just used.
    const next = drawOffer(cleared.grid, state.size, bag, cfg.pool, cfg.forgiving, rng);
    offer = next.offer;
    bag = next.bag;
    refilled = true;
  }
  // Always a slot holding a shape: the tray was just refilled if it was empty.
  const selected = offer.findIndex((id) => id !== null);

  return {
    state: {
      ...state,
      grid: cleared.grid,
      offer,
      selected: selected >= 0 ? selected : 0,
      score: state.score + gained,
      cleared: state.cleared + lines,
      placed: state.placed + 1,
      bag,
    },
    outcome: {
      kind: "placed",
      at: index,
      slot: state.selected,
      cells,
      rows: cleared.rows,
      cols: cleared.cols,
      clearedCells: cleared.cells,
      gained,
      refilled,
    },
  };
}

/* -------------------------------------------------------------- reporting */

/**
 * What this run's record MEASURES, in the shape `ctx.score` wants.
 *
 * A VALUE and a UNIT and never a direction - `src/sdk/score.ts` decides that
 * points rank high, so a game cannot order its own board backwards. `board`
 * scopes the record to a difficulty because a six-wide line and an eight-wide
 * one are not the same achievement.
 */
export function scoreReport(
  state: FitState,
  board: Difficulty,
): { value: number; unit: "points"; board: string } {
  return { value: state.score, unit: "points", board };
}
