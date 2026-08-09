// Blocks - pure game logic. No DOM, no framework, no React. Deterministic
// given an rng, so `logic.test.ts` and `scripts/sim/blocks-rows.mjs` drive the
// same engine the player does.
//
// THE PIECE SET IS OURS, and that is a constraint rather than a flourish. The
// falling-block mechanic is old and free; the SEVEN four-cell pieces in their
// famous colours are trade dress, so this ships a mixed set - three-cell
// starters a five-year-old can place, the mid-size shapes, and two five-cell
// awkward ones that only appear on hard - painted from the platform's own
// palette. See CLAUDE.md § Legal.
//
// The mix is also the difficulty. `easy` is not "the same game, slower": its
// pool holds four forgiving shapes, so a small player is never handed the plus
// that cannot sit flat on anything.

/** A cell is 0 (empty) or a piece's palette index, 1-based. */
export type Cell = number;
/** `board[row][col]`, row 0 at the TOP. */
export type Board = Cell[][];

export type PieceId =
  | "o"
  | "i3"
  | "l3"
  | "i4"
  | "t4"
  | "s4"
  | "z4"
  | "j4"
  | "l4"
  | "plus5"
  | "u5";

export interface Piece {
  id: PieceId;
  /**
   * A SQUARE matrix of 0/1. Square so `rotate()` is one transpose-and-reverse
   * with no bounding-box bookkeeping; the empty margin costs nothing because
   * `canPlace` only ever looks at the filled cells.
   */
  cells: number[][];
  /** Index into the renderer's palette. Never a colour: logic paints nothing. */
  color: number;
}

/** The shapes, authored as strings so the drawing is readable in the diff. */
const SHAPES: Record<PieceId, { rows: string[]; color: number }> = {
  // Two-by-two. The friendliest shape there is: it never needs rotating.
  o: { rows: ["11", "11"], color: 1 },
  // Three in a line, and a corner. Both fill a gap a four-cell piece cannot.
  i3: { rows: ["000", "111", "000"], color: 2 },
  l3: { rows: ["10", "11"], color: 3 },
  i4: { rows: ["0000", "1111", "0000", "0000"], color: 4 },
  t4: { rows: ["111", "010", "000"], color: 5 },
  s4: { rows: ["011", "110", "000"], color: 6 },
  z4: { rows: ["110", "011", "000"], color: 7 },
  j4: { rows: ["100", "111", "000"], color: 8 },
  l4: { rows: ["001", "111", "000"], color: 9 },
  // The two hard-only pieces. A plus can never sit flat, and a cup traps
  // whatever it lands over - both are deliberate, and both are why `hard` is
  // hard in a way that a shorter drop interval alone is not.
  plus5: { rows: ["010", "111", "010"], color: 10 },
  u5: { rows: ["101", "111", "000"], color: 11 },
};

export const PIECE_IDS = Object.keys(SHAPES) as PieceId[];

export function makePiece(id: PieceId): Piece {
  const s = SHAPES[id];
  return { id, cells: s.rows.map((r) => [...r].map((c) => (c === "1" ? 1 : 0))), color: s.color };
}

/** Clockwise quarter turn: transpose, then reverse each row. */
export function rotate(p: Piece): Piece {
  const n = p.cells.length;
  const out: number[][] = Array.from({ length: n }, () => Array<number>(n).fill(0));
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) out[c][n - 1 - r] = p.cells[r][c];
  return { ...p, cells: out };
}

/** The filled cells of a piece, as [row, col] offsets from its own top-left. */
export function filled(p: Piece): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let r = 0; r < p.cells.length; r++)
    for (let c = 0; c < p.cells.length; c++) if (p.cells[r][c]) out.push([r, c]);
  return out;
}

/* ------------------------------------------------------------------ levels */

export type LevelKey = "easy" | "normal" | "hard";

export interface Level {
  cols: number;
  rows: number;
  /** The bag this level draws from. A shape absent here never appears. */
  pool: PieceId[];
  /** Milliseconds per gravity step at the start of a run. */
  startMs: number;
  /** How much faster each speed-up makes it, and how low it may go. */
  stepMs: number;
  floorMs: number;
  /** Rows cleared between speed-ups. */
  rowsPerStep: number;
}

export const LEVELS: Record<LevelKey, Level> = {
  // Wider cells on a shorter board, four gentle shapes, and a drop slow enough
  // to think between. The floor stays above a second, so easy never becomes a
  // reflex test by attrition.
  easy: {
    cols: 8,
    rows: 14,
    pool: ["o", "i3", "l3", "i4"],
    startMs: 1000,
    stepMs: 45,
    floorMs: 620,
    rowsPerStep: 6,
  },
  normal: {
    cols: 10,
    rows: 18,
    pool: ["o", "i3", "l3", "i4", "t4", "s4", "z4", "j4", "l4"],
    startMs: 780,
    stepMs: 55,
    floorMs: 260,
    rowsPerStep: 5,
  },
  hard: {
    cols: 10,
    rows: 18,
    pool: PIECE_IDS,
    startMs: 520,
    stepMs: 40,
    floorMs: 140,
    rowsPerStep: 4,
  },
};

/** How long the current gravity step lasts, given how far the run has got. */
export function intervalFor(level: LevelKey, lines: number): number {
  const L = LEVELS[level];
  return Math.max(L.floorMs, L.startMs - Math.floor(lines / L.rowsPerStep) * L.stepMs);
}

/**
 * What a clear is worth. Four at once pays 100 against 4x10 for four singles,
 * because the whole skill of the game is holding a well open while the stack
 * builds - if a single paid the same per row, patience would be worth nothing.
 */
export const ROW_SCORE = [0, 10, 30, 60, 100];

export function scoreFor(cleared: number): number {
  return ROW_SCORE[cleared] ?? ROW_SCORE[ROW_SCORE.length - 1] + (cleared - 4) * 40;
}

/* ------------------------------------------------------------------- state */

export interface BlocksState {
  level: LevelKey;
  board: Board;
  cols: number;
  rows: number;
  /** The falling piece, and the top-left of its matrix in board coordinates. */
  piece: Piece;
  pr: number;
  pc: number;
  next: Piece;
  /**
   * The shuffled draw pile. A bag rather than an independent draw per piece:
   * uniform random gives real droughts - a player can wait fifteen pieces for
   * the long one they are holding a well open for, which reads as the game
   * cheating rather than as luck.
   */
  bag: PieceId[];
  score: number;
  lines: number;
  over: boolean;
}

function emptyBoard(cols: number, rows: number): Board {
  return Array.from({ length: rows }, () => Array<Cell>(cols).fill(0));
}

/** Refill and shuffle the bag when it runs dry. Fisher-Yates, seeded rng. */
function refill(pool: PieceId[], rng: () => number): PieceId[] {
  const bag = [...pool];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function draw(bag: PieceId[], pool: PieceId[], rng: () => number): { id: PieceId; bag: PieceId[] } {
  const b = bag.length ? bag : refill(pool, rng);
  return { id: b[0], bag: b.slice(1) };
}

/** Where a freshly drawn piece enters: centred, with its top row on row 0. */
function entryCol(p: Piece, cols: number): number {
  return Math.floor((cols - p.cells.length) / 2);
}

export function newGame(level: LevelKey = "normal", rng: () => number = Math.random): BlocksState {
  const L = LEVELS[level];
  const first = draw([], L.pool, rng);
  const second = draw(first.bag, L.pool, rng);
  const piece = makePiece(first.id);
  return {
    level,
    board: emptyBoard(L.cols, L.rows),
    cols: L.cols,
    rows: L.rows,
    piece,
    // Negative rows are legal and load-bearing: a piece whose top matrix row is
    // empty (i3, i4, t4) would otherwise enter a row lower than it looks.
    pr: -topMargin(piece),
    pc: entryCol(piece, L.cols),
    next: makePiece(second.id),
    bag: second.bag,
    score: 0,
    lines: 0,
    over: false,
  };
}

/** How many empty rows a piece's matrix carries above its first filled one. */
function topMargin(p: Piece): number {
  const rows = filled(p).map(([r]) => r);
  return rows.length ? Math.min(...rows) : 0;
}

/* -------------------------------------------------------------- collisions */

/** Can this piece sit with its matrix top-left at (r, c)? Above the board is fine. */
export function canPlace(s: BlocksState, p: Piece, r: number, c: number): boolean {
  for (const [dr, dc] of filled(p)) {
    const br = r + dr;
    const bc = c + dc;
    if (bc < 0 || bc >= s.cols || br >= s.rows) return false;
    // A cell above the ceiling collides with nothing - that is the room a piece
    // needs while it is still entering.
    if (br >= 0 && s.board[br][bc]) return false;
  }
  return true;
}

export interface MoveResult {
  state: BlocksState;
  moved: boolean;
}

/** Shift the falling piece. Returns `moved: false` and the SAME state if blocked. */
export function shift(s: BlocksState, dc: number): MoveResult {
  if (s.over) return { state: s, moved: false };
  return canPlace(s, s.piece, s.pr, s.pc + dc)
    ? { state: { ...s, pc: s.pc + dc }, moved: true }
    : { state: s, moved: false };
}

/**
 * Rotate, kicking sideways if the turn would clip a wall or the stack.
 *
 * The kick order matters: one column, then two, before giving up. Without it a
 * piece against the left wall simply refuses to turn, and a player reads an
 * unresponsive button as a broken button rather than as a rule.
 */
export const KICKS = [0, -1, 1, -2, 2];

export function spin(s: BlocksState): MoveResult {
  if (s.over) return { state: s, moved: false };
  const turned = rotate(s.piece);
  for (const k of KICKS) {
    if (canPlace(s, turned, s.pr, s.pc + k))
      return { state: { ...s, piece: turned, pc: s.pc + k }, moved: true };
  }
  return { state: s, moved: false };
}

/** The row the piece would land on if it fell from here. */
export function ghostRow(s: BlocksState): number {
  let r = s.pr;
  while (canPlace(s, s.piece, r + 1, s.pc)) r++;
  return r;
}

/* ------------------------------------------------------------ locking down */

/** Remove every full row. Returns the new board and how many went. */
export function clearRows(board: Board, cols: number): { board: Board; cleared: number } {
  const kept = board.filter((row) => row.some((c) => c === 0));
  const cleared = board.length - kept.length;
  if (!cleared) return { board, cleared: 0 };
  const blank = Array.from({ length: cleared }, () => Array<Cell>(cols).fill(0));
  return { board: [...blank, ...kept], cleared };
}

export interface TickResult {
  state: BlocksState;
  /** True when the piece stopped falling this step and became part of the stack. */
  locked: boolean;
  /** Rows removed by that landing. */
  cleared: number;
  /** Points this step added. */
  gained: number;
}

/**
 * Freeze the falling piece into the stack, clear what it filled, and bring the
 * next one in. Ends the run when the new piece has nowhere to enter.
 *
 * Locking OUT OF SIGHT is what ends a game: a stack tall enough that the entry
 * position is occupied. Checked against the board AFTER the clear, so a landing
 * that removes four rows is never a loss.
 */
function lock(s: BlocksState, bonus: number, rng: () => number): TickResult {
  const board = s.board.map((row) => [...row]);
  for (const [dr, dc] of filled(s.piece)) {
    const br = s.pr + dr;
    if (br >= 0) board[br][s.pc + dc] = s.piece.color;
  }
  const { board: cleared, cleared: n } = clearRows(board, s.cols);
  const gained = scoreFor(n) + bonus;

  const piece = s.next;
  const pool = LEVELS[s.level].pool;
  const { id, bag } = draw(s.bag, pool, rng);
  const pr = -topMargin(piece);
  const pc = entryCol(piece, s.cols);
  const landed: BlocksState = {
    ...s,
    board: cleared,
    score: s.score + gained,
    lines: s.lines + n,
    piece,
    pr,
    pc,
    next: makePiece(id),
    bag,
  };

  return {
    state: canPlace(landed, piece, pr, pc) ? landed : { ...landed, over: true },
    locked: true,
    cleared: n,
    gained,
  };
}

/** One gravity step: fall a row, or land. */
export function tick(s: BlocksState, rng: () => number = Math.random): TickResult {
  if (s.over) return { state: s, locked: false, cleared: 0, gained: 0 };
  if (canPlace(s, s.piece, s.pr + 1, s.pc))
    return { state: { ...s, pr: s.pr + 1 }, locked: false, cleared: 0, gained: 0 };
  return lock(s, 0, rng);
}

/**
 * Drop to the floor and land immediately, paying a point per row fallen.
 *
 * The bonus is small on purpose. It rewards deciding early - which is the thing
 * that makes the game fast - without letting a player out-score a row clear by
 * slamming pieces into a mess.
 */
export function hardDrop(s: BlocksState, rng: () => number = Math.random): TickResult {
  if (s.over) return { state: s, locked: false, cleared: 0, gained: 0 };
  const landing = ghostRow(s);
  const dropped = landing - s.pr;
  return lock({ ...s, pr: landing }, dropped, rng);
}

/**
 * A read-only paint of the board WITH the falling piece and its landing shadow
 * drawn in, so a renderer never has to reason about coordinates.
 *
 * The ghost is negative (`-color`) rather than a separate grid: one array
 * carries everything the screen needs, and a renderer that ignores the sign
 * still draws a correct board.
 */
export function render(s: BlocksState): Board {
  const out = s.board.map((row) => [...row]);
  if (!s.over) {
    const g = ghostRow(s);
    for (const [dr, dc] of filled(s.piece)) {
      const br = g + dr;
      if (br >= 0 && !out[br][s.pc + dc]) out[br][s.pc + dc] = -s.piece.color;
    }
    for (const [dr, dc] of filled(s.piece)) {
      const br = s.pr + dr;
      if (br >= 0) out[br][s.pc + dc] = s.piece.color;
    }
  }
  return out;
}
