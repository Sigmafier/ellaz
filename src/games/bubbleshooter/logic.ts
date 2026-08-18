// Bubble Shooter — PURE rules. No DOM, no React, no canvas, no engine.
//
// Modules are imported by DIRECT path, never through the `@shared` barrel: the
// barrel re-exports `Prompt` and `winMoment`, which pull React and the portal
// in, and `src/games/logic-is-pure.test.ts` fails the build on it.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE TRAJECTORY IS COMPUTED HERE, NOT IN THE RENDERER — AND THAT IS THE WHOLE
// REASON THIS GAME NEEDS NO ENGINE.
//
// The obvious shape for a shooter is a physics loop: advance the ball every
// frame, test collisions every frame, decide where it landed when it stops. It
// works, and it drags in everything an engine exists to provide — a fixed
// timestep, a broadphase, a frame budget — plus the display-rate trap in
// `.claude/rules/fixed-timestep-must-match-display.md`, where a 60 Hz step on a
// 120 Hz screen freezes every second frame.
//
// `aim()` instead solves the shot ONCE, at the moment of firing, and returns a
// POLYLINE: launcher → wall bounce → wall bounce → the exact centre of the cell
// the bubble ends in. The renderer then does nothing but interpolate along that
// line by wall-clock elapsed time. So:
//
//   · the outcome cannot depend on frame rate, frame drops, or a backgrounded
//     tab, because no frame ever decides anything;
//   · the same polyline drawn dashed and dimmed IS the aiming guide, so what a
//     player is shown and where the bubble goes are one computation rather than
//     two that can disagree;
//   · every collision case is unit-testable in node, with no canvas at all.
//
// The march below is a fine-grained sweep rather than closed-form reflection
// because the field is not a plain box: a bubble can meet a wall and a bubble
// in the same step, and the first thing it meets is the thing that matters.
// ─────────────────────────────────────────────────────────────────────────────
import { mulberry32, seedFrom } from "@shared/rng";

/** The three rungs every game in this catalogue offers. */
export type Difficulty = "easy" | "medium" | "hard";
export const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard"] as const;

export interface LevelSpec {
  /** How many bubble colours are in play. The single biggest difficulty lever. */
  colors: number;
  /** Rows dealt at the top of a fresh board. */
  startRows: number;
  /** Shots between one ceiling advance and the next. */
  shotsPerPush: number;
}

export const LEVELS: Record<Difficulty, LevelSpec> = {
  easy: { colors: 4, startRows: 4, shotsPerPush: 12 },
  medium: { colors: 5, startRows: 5, shotsPerPush: 9 },
  hard: { colors: 6, startRows: 6, shotsPerPush: 6 },
};

/* ─────────────────────────────────────────────────────────────────────────────
   GEOMETRY, in BUBBLE UNITS: one bubble is exactly 1.0 across.
   The renderer multiplies by a pixel scale and never does trigonometry of its
   own, so a board at 320px and the same board at 700px are the same game.
   ───────────────────────────────────────────────────────────────────────────*/

/** Bubbles in a WIDE row. An offset row holds one fewer. */
export const COLS = 10;
/** Vertical distance between rows in a hex packing: √3/2, not 1. */
export const ROW_H = Math.sqrt(3) / 2;
/** Rows the grid can address at all, 0 .. FIELD_ROWS-1. */
export const FIELD_ROWS = 13;
/** A bubble that comes to rest on this row (or below) ends the run. */
export const DEATH_ROW = 12;
/** Clear space under the last playable row, where the launcher sits. */
const LAUNCH_GAP = 1.55;

/** Field width in bubble units. */
export const FIELD_W = COLS;
/** Field height in bubble units, launcher included. */
export const FIELD_H = 1 + DEATH_ROW * ROW_H + LAUNCH_GAP;
/** Where the launcher sits. Everything is fired from exactly here. */
export const LAUNCHER = { x: FIELD_W / 2, y: FIELD_H - 0.8 };
/** The line a bubble must not settle on or past, in units. */
export const DEATH_Y = 0.5 + DEATH_ROW * ROW_H;

/**
 * How far off vertical a shot may be aimed, in radians (~78°).
 *
 * Not 90°: a horizontal shot never rises, so it bounces between the two walls
 * until the step guard stops it — a shot that visibly does nothing. The clamp
 * is the difference between "you cannot aim there" and "that aim is broken".
 */
export const MAX_ANGLE = 1.36;

/** Centre-to-centre distance below which a flying bubble has hit a resting one. */
const HIT_DIST = 0.92;
/** March resolution. Small enough that a bubble cannot tunnel a 1.0-wide target. */
const STEP = 0.02;

export interface Cell {
  row: number;
  col: number;
}
export interface Point {
  x: number;
  y: number;
}

/** Is this row shifted half a bubble to the right? */
export function isOffset(row: number, shift: 0 | 1): boolean {
  return (row + shift) % 2 === 1;
}

/** How many bubbles this row can hold. Offset rows hold one fewer. */
export function rowWidth(row: number, shift: 0 | 1): number {
  return isOffset(row, shift) ? COLS - 1 : COLS;
}

/** The centre of a cell, in bubble units. */
export function cellCenter(row: number, col: number, shift: 0 | 1): Point {
  return { x: col + 0.5 + (isOffset(row, shift) ? 0.5 : 0), y: 0.5 + row * ROW_H };
}

/**
 * The six cells touching this one.
 *
 * The parity term is the whole function, and getting it backwards is the
 * silent bug this game can have: matches and floaters are both flood fills over
 * this list, so a wrong diagonal makes groups fail to pop and hanging clusters
 * fail to fall, with no error anywhere and a board that merely feels unfair.
 * `logic.test.ts` pins it by SYMMETRY — if a is a neighbour of b, b must be a
 * neighbour of a — which is a property no hand-written table satisfies by luck.
 */
export function neighbors(row: number, col: number, shift: 0 | 1): Cell[] {
  const d = isOffset(row, shift) ? 0 : -1;
  const out: Cell[] = [];
  const push = (r: number, c: number) => {
    if (r < 0 || r >= FIELD_ROWS) return;
    if (c < 0 || c >= rowWidth(r, shift)) return;
    out.push({ row: r, col: c });
  };
  push(row, col - 1);
  push(row, col + 1);
  push(row - 1, col + d);
  push(row - 1, col + d + 1);
  push(row + 1, col + d);
  push(row + 1, col + d + 1);
  return out;
}

/* ─────────────────────────────────────────────────────────────────────────── */

export interface ShooterState {
  level: Difficulty;
  /** rows[r][c] — a colour index, or null for an empty cell. */
  rows: (number | null)[][];
  /** Parity of row 0. Flips on every ceiling advance, which is what keeps the
   *  rows already on the board sitting exactly where they were. */
  shift: 0 | 1;
  /** The colour loaded in the launcher. */
  current: number;
  /** The colour on deck, shown beside the launcher. */
  next: number;
  /** Shots remaining before the ceiling advances. */
  shotsLeft: number;
  score: number;
  /** Boards cleared this run. A cleared board deals a fresh one. */
  boards: number;
  dead: boolean;
}

export const POP_POINTS = 10;
/**
 * A bubble knocked loose is worth double a bubble popped.
 *
 * The rule is the game's whole strategy in one number: three of a colour is
 * always available and always worth 30, so without it there is no reason ever
 * to aim anywhere in particular. Cutting the support out from under a cluster
 * is the shot worth looking for, and the score has to say so.
 */
export const DROP_POINTS = 20;

/** Colours currently resting on the board, ascending. */
export function boardColors(state: ShooterState): number[] {
  const seen = new Set<number>();
  for (const row of state.rows) for (const c of row) if (c !== null) seen.add(c);
  return [...seen].sort((a, b) => a - b);
}

/**
 * The colour to load next.
 *
 * ALWAYS drawn from what is actually on the board. Drawing from the level's
 * full palette instead is the classic unfairness in this genre: the last two
 * greens are gone, the launcher keeps handing you green, and every shot makes
 * the board worse with no move that could have been better. Falling back to the
 * palette only when the board is empty keeps that impossible.
 */
export function pickColor(state: ShooterState, rng: () => number): number {
  const live = boardColors(state);
  const pool = live.length > 0 ? live : Array.from({ length: LEVELS[state.level].colors }, (_, i) => i);
  return pool[Math.floor(rng() * pool.length)] ?? 0;
}

function emptyRows(shift: 0 | 1): (number | null)[][] {
  return Array.from({ length: FIELD_ROWS }, (_, r) =>
    Array.from({ length: rowWidth(r, shift) }, () => null as number | null),
  );
}

/** Deal the opening rows of a board at `level`, leaving everything below empty. */
function dealRows(level: Difficulty, shift: 0 | 1, rng: () => number): (number | null)[][] {
  const spec = LEVELS[level];
  const rows = emptyRows(shift);
  for (let r = 0; r < spec.startRows; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      rows[r][c] = Math.floor(rng() * spec.colors);
    }
  }
  return rows;
}

export function newGame(level: Difficulty, rng: () => number = Math.random): ShooterState {
  const shift: 0 | 1 = 0;
  const state: ShooterState = {
    level,
    rows: dealRows(level, shift, rng),
    shift,
    current: 0,
    next: 0,
    shotsLeft: LEVELS[level].shotsPerPush,
    score: 0,
    boards: 0,
    dead: false,
  };
  state.current = pickColor(state, rng);
  state.next = pickColor(state, rng);
  return state;
}

/** A board for a seed — used by the tests and by anything wanting a replay. */
export function seededGame(level: Difficulty, seed: string): ShooterState {
  return newGame(level, mulberry32(seedFrom(seed)));
}

/* ─────────────────────────────────────────────────────────────────────────────
   THE SHOT
   ───────────────────────────────────────────────────────────────────────────*/

export interface Shot {
  /** Launcher → each wall bounce → the centre of the cell it lands in. */
  path: Point[];
  /** Where it comes to rest. `null` only if the field has no room at all. */
  cell: Cell | null;
  /** True when the bubble reached the ceiling without meeting anything. */
  ceiling: boolean;
}

/** Is anything resting at this cell? */
export function at(state: ShooterState, row: number, col: number): number | null {
  if (row < 0 || row >= FIELD_ROWS) return null;
  const line = state.rows[row];
  if (!line || col < 0 || col >= line.length) return null;
  return line[col];
}

/**
 * The empty cell a bubble stopping at `pos` belongs in.
 *
 * Nearest-centre, restricted to cells that are either on the ceiling row or
 * touching something already resting. Without that restriction a bubble grazing
 * a cluster can snap into a cell hanging in mid-air, which then reads as a bug
 * in the floater check rather than in the snap.
 */
function snapCell(state: ShooterState, pos: Point): Cell | null {
  let best: Cell | null = null;
  let bestD = Infinity;
  const r0 = Math.max(0, Math.floor((pos.y - 0.5) / ROW_H) - 1);
  const r1 = Math.min(FIELD_ROWS - 1, r0 + 3);
  for (let r = r0; r <= r1; r++) {
    for (let c = 0; c < rowWidth(r, state.shift); c++) {
      if (at(state, r, c) !== null) continue;
      const anchored =
        r === 0 || neighbors(r, c, state.shift).some((n) => at(state, n.row, n.col) !== null);
      if (!anchored) continue;
      const p = cellCenter(r, c, state.shift);
      const d = (p.x - pos.x) ** 2 + (p.y - pos.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = { row: r, col: c };
      }
    }
  }
  return best;
}

/**
 * Solve a shot at `angle` (0 = straight up, positive = clockwise/right).
 *
 * Pure and total: it always terminates, and it returns the same answer for the
 * same board and angle every time. The renderer calls it twice with the same
 * arguments — once to draw the aiming guide, once to fire — and relies on both
 * answers being identical.
 */
export function aim(state: ShooterState, angle: number): Shot {
  const a = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, angle));
  let dx = Math.sin(a);
  let dy = -Math.cos(a);
  let x = LAUNCHER.x;
  let y = LAUNCHER.y;
  const path: Point[] = [{ x, y }];

  const minX = 0.5;
  const maxX = FIELD_W - 0.5;
  // Bounded twice over: by the number of wall bounces and by total distance.
  // A shot clamped just inside horizontal still rises, so the distance guard is
  // what makes this total rather than merely usually-terminating.
  let bounces = 0;
  const maxSteps = Math.ceil((FIELD_H + FIELD_W) * 12 / STEP);

  for (let i = 0; i < maxSteps; i++) {
    x += dx * STEP;
    y += dy * STEP;

    if (x < minX || x > maxX) {
      x = x < minX ? 2 * minX - x : 2 * maxX - x;
      dx = -dx;
      path.push({ x, y });
      if (++bounces > 10) break;
    }

    // The ceiling. Row 0 is the only place a bubble can rest unsupported.
    if (y <= 0.5) {
      const cell = snapCell(state, { x, y: 0.5 });
      return { path: finish(path, cell, state), cell, ceiling: true };
    }

    // Anything resting nearby. Only the three rows around this height can be
    // within a bubble's width, so the sweep stays O(1) per step.
    const nearRow = Math.round((y - 0.5) / ROW_H);
    for (let r = Math.max(0, nearRow - 1); r <= Math.min(FIELD_ROWS - 1, nearRow + 1); r++) {
      const w = rowWidth(r, state.shift);
      const c0 = Math.max(0, Math.floor(x) - 2);
      const c1 = Math.min(w - 1, Math.ceil(x) + 1);
      for (let c = c0; c <= c1; c++) {
        if (at(state, r, c) === null) continue;
        const p = cellCenter(r, c, state.shift);
        if ((p.x - x) ** 2 + (p.y - y) ** 2 < HIT_DIST * HIT_DIST) {
          const cell = snapCell(state, { x, y });
          return { path: finish(path, cell, state), cell, ceiling: false };
        }
      }
    }
  }

  // Unreachable on any real board: the ceiling is a full-width backstop, so a
  // rising bubble always meets it. Answered rather than thrown, because a shot
  // that quietly does nothing is a better failure than a crashed game.
  return { path, cell: null, ceiling: false };
}

/** Close the polyline on the centre of the landing cell. */
function finish(path: Point[], cell: Cell | null, state: ShooterState): Point[] {
  if (!cell) return path;
  return [...path, cellCenter(cell.row, cell.col, state.shift)];
}

/* ─────────────────────────────────────────────────────────────────────────────
   RESOLVING WHAT LANDED
   ───────────────────────────────────────────────────────────────────────────*/

/** Same-coloured cells connected to `from`, `from` included. */
export function matchGroup(state: ShooterState, from: Cell): Cell[] {
  const color = at(state, from.row, from.col);
  if (color === null) return [];
  const key = (c: Cell) => `${c.row},${c.col}`;
  const seen = new Set<string>([key(from)]);
  const out: Cell[] = [from];
  const queue: Cell[] = [from];
  while (queue.length) {
    const cur = queue.pop()!;
    for (const n of neighbors(cur.row, cur.col, state.shift)) {
      if (seen.has(key(n))) continue;
      if (at(state, n.row, n.col) !== color) continue;
      seen.add(key(n));
      out.push(n);
      queue.push(n);
    }
  }
  return out;
}

/**
 * Everything no longer hanging from the ceiling.
 *
 * A flood fill from every filled cell in row 0; whatever it does not reach is
 * falling. Computed over the WHOLE board rather than around the popped group,
 * because a pop can strand a cluster that never touched it.
 */
export function floaters(state: ShooterState): Cell[] {
  const w0 = rowWidth(0, state.shift);
  const seen = new Set<string>();
  const queue: Cell[] = [];
  for (let c = 0; c < w0; c++) {
    if (at(state, 0, c) !== null) {
      seen.add(`0,${c}`);
      queue.push({ row: 0, col: c });
    }
  }
  while (queue.length) {
    const cur = queue.pop()!;
    for (const n of neighbors(cur.row, cur.col, state.shift)) {
      const k = `${n.row},${n.col}`;
      if (seen.has(k)) continue;
      if (at(state, n.row, n.col) === null) continue;
      seen.add(k);
      queue.push(n);
    }
  }
  const out: Cell[] = [];
  for (let r = 0; r < FIELD_ROWS; r++) {
    for (let c = 0; c < rowWidth(r, state.shift); c++) {
      if (at(state, r, c) !== null && !seen.has(`${r},${c}`)) out.push({ row: r, col: c });
    }
  }
  return out;
}

/** Is the board empty? */
export function isCleared(state: ShooterState): boolean {
  return state.rows.every((row) => row.every((c) => c === null));
}

/** Has anything settled on or past the death line? */
export function isDead(state: ShooterState): boolean {
  for (let r = DEATH_ROW; r < FIELD_ROWS; r++) {
    if (state.rows[r]?.some((c) => c !== null)) return true;
  }
  return false;
}

/**
 * Advance the ceiling one row.
 *
 * `shift` flips as the row goes on, and that is not decoration: a row is offset
 * by its own index plus the shift, so flipping keeps every row already placed at
 * exactly the offset — and the width — it had a moment ago. Without it the whole
 * board would re-stagger under the player and half the rows would change length.
 */
export function pushRow(state: ShooterState, rng: () => number): ShooterState {
  const shift: 0 | 1 = state.shift === 0 ? 1 : 0;
  const spec = LEVELS[state.level];
  const live = boardColors(state);
  const pool = live.length > 0 ? live : Array.from({ length: spec.colors }, (_, i) => i);
  const fresh: (number | null)[] = Array.from({ length: rowWidth(0, shift) }, () =>
    pool[Math.floor(rng() * pool.length)] ?? 0,
  );
  const rows = [fresh, ...state.rows.slice(0, FIELD_ROWS - 1)];
  // The row pushed off the bottom of the addressable grid still counts: if it
  // held anything, the board has already reached past the death line.
  const spilled = state.rows[FIELD_ROWS - 1]?.some((c) => c !== null) ?? false;
  const next = { ...state, rows, shift };
  return { ...next, dead: spilled || isDead(next) };
}

export interface ShotOutcome {
  /** Where the bubble came to rest. */
  cell: Cell;
  /** The group that popped — empty when fewer than three met. */
  popped: Cell[];
  /** Bubbles cut loose by that pop. */
  dropped: Cell[];
  gained: number;
  /** The board was emptied and a fresh one has been dealt. */
  cleared: boolean;
  /** The ceiling advanced on this shot. */
  pushed: boolean;
  dead: boolean;
}

/** A shot that could not land — the field is full. Nothing changes. */
export interface NoShot {
  cell: null;
}

/** Three of a colour is the pop threshold, everywhere, at every level. */
export const MATCH_MIN = 3;

/**
 * Fire, and resolve everything that follows, in one pure step.
 *
 * The ORDER below is the game: place, match, drop, score, then advance the
 * ceiling. Checking death before the pop would end a run on a bubble that the
 * very same shot removes.
 */
export function fire(
  state: ShooterState,
  angle: number,
  rng: () => number = Math.random,
): { state: ShooterState; shot: Shot; outcome: ShotOutcome | NoShot } {
  const shot = aim(state, angle);
  if (!shot.cell || state.dead) return { state, shot, outcome: { cell: null } };

  const rows = state.rows.map((r) => r.slice());
  rows[shot.cell.row][shot.cell.col] = state.current;
  let next: ShooterState = { ...state, rows };

  const group = matchGroup(next, shot.cell);
  let popped: Cell[] = [];
  let dropped: Cell[] = [];
  if (group.length >= MATCH_MIN) {
    popped = group;
    for (const c of popped) next.rows[c.row][c.col] = null;
    dropped = floaters(next);
    for (const c of dropped) next.rows[c.row][c.col] = null;
  }

  const gained = popped.length * POP_POINTS + dropped.length * DROP_POINTS;
  next = { ...next, score: next.score + gained };

  const cleared = isCleared(next);
  if (cleared) {
    // A finished board is a win, not an ending. The run keeps its score and its
    // record; only the field is new, and the ceiling clock starts over.
    next = {
      ...next,
      rows: dealRows(next.level, next.shift, rng),
      boards: next.boards + 1,
      shotsLeft: LEVELS[next.level].shotsPerPush,
    };
  }

  let pushed = false;
  if (!cleared) {
    const left = next.shotsLeft - 1;
    if (left <= 0) {
      next = pushRow(next, rng);
      next = { ...next, shotsLeft: LEVELS[next.level].shotsPerPush };
      pushed = true;
    } else {
      next = { ...next, shotsLeft: left };
    }
  }

  const dead = next.dead || isDead(next);
  next = { ...next, dead };

  // Reload. `pickColor` reads the board AFTER everything above, so the colour
  // handed over is one the player can still use.
  next = { ...next, current: next.next, next: pickColor(next, rng) };

  return { state: next, shot, outcome: { cell: shot.cell, popped, dropped, gained, cleared, pushed, dead } };
}

/** What this game's record measures. The renderer never invents a unit. */
export function scoreReport(state: ShooterState): { value: number; unit: "points"; board: string } {
  return { value: state.score, unit: "points", board: state.level };
}
