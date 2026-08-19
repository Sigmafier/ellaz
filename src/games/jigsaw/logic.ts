// Jigsaw — PURE rules. No DOM, no React, no canvas, no engine.
//
// Modules are imported by DIRECT path, never through the `@shared` barrel: the
// barrel re-exports `Prompt` and `winMoment`, which pull React and the portal
// in, and `src/games/logic-is-pure.test.ts` fails the build on it.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE RULES NEVER SEE THE PICTURE, AND THAT IS THE WHOLE DESIGN.
//
// A jigsaw looks like it is about an image, so the obvious shape is a module
// that knows about SVG. This one holds a PERMUTATION and nothing else: piece
// `n` belongs in slot `n`, the board is solved when every slot holds its own
// piece, and which drawing is being cut up is an integer this file never
// interprets. The renderer owns the picture entirely.
//
// That split is what keeps `logic.ts` importable in node with no DOM — the
// purity gate would refuse `@ui/gameArt` outright — and it is also what makes
// the game cost nothing to extend: another picture is one more entry in the
// renderer's list, with no rule to change and no test to update.
//
// TAP, NEVER DRAG. There is no `drag(from, to)` here at all. A tap picks a
// piece up and a tap on a slot puts it down, which is the kids rule in
// CLAUDE.md and the accessible path besides — a five-year-old on a phone, and
// anyone on assistive input, cannot reliably hold a sustained pointer gesture.
// Drag may be layered ON TOP of this later; it may never replace it.
// ─────────────────────────────────────────────────────────────────────────────

/** The three rungs every game in this catalogue offers. */
export type Difficulty = "easy" | "medium" | "hard";
export const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard"] as const;

export interface LevelSpec {
  cols: number;
  rows: number;
}

/**
 * Cut sizes, chosen against the 200x150 stage every scene in `@ui/gameArt` is
 * drawn on — so a piece is close to square at all three, rather than a letterbox
 * sliver on one of them. 4x3 is exactly square; the other two are within a fifth.
 */
export const LEVELS: Record<Difficulty, LevelSpec> = {
  easy: { cols: 3, rows: 2 },
  medium: { cols: 4, rows: 3 },
  hard: { cols: 5, rows: 4 },
};

export const pieceCount = (level: Difficulty): number =>
  LEVELS[level].cols * LEVELS[level].rows;

/** Which sides of a piece lie on the OUTSIDE of the picture. */
export interface PieceEdges {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

/**
 * The flat sides of a piece — a real jigsaw's frame, derived rather than drawn.
 *
 * This is still a permutation module: `piece` is a number, `cols`/`rows` are
 * numbers, and nothing here knows what is printed on anything. But WHICH sides
 * of a piece face outward is a fact about the cut, not about the picture, so it
 * belongs with the rules and can be tested in node.
 *
 * It exists because the game shipped without it and the page already promised
 * it: `src/content/games/jigsaw.ts` tells a child that "the four corners are
 * the only pieces with two flat sides, so they are the easiest to recognise",
 * which was advice about a cardboard puzzle rather than about this one. Every
 * piece here was an identical rectangle, so the whole corners-first strategy —
 * the way people actually solve a jigsaw — was unavailable, and the only
 * remaining approach was to try pieces one at a time. The renderer draws the
 * sides this returns as a flat rim, so a corner reads as a corner at a glance.
 */
export function pieceEdges(piece: number, cols: number, rows: number): PieceEdges {
  const col = piece % cols;
  const row = Math.floor(piece / cols);
  return {
    top: row === 0,
    right: col === cols - 1,
    bottom: row === rows - 1,
    left: col === 0,
  };
}

/**
 * How many flat sides a piece has: 2 for a corner, 1 for an edge, 0 for the
 * middle. The one number a child sorting a tray is actually looking for.
 *
 * A single-column or single-row cut would report 2 on every piece, which is
 * correct — such a board is all frame. No level here is shaped that way.
 */
export function frameSides(piece: number, cols: number, rows: number): number {
  const e = pieceEdges(piece, cols, rows);
  return Number(e.top) + Number(e.right) + Number(e.bottom) + Number(e.left);
}

export interface JigsawState {
  level: Difficulty;
  cols: number;
  rows: number;
  /**
   * WHICH picture, as an index into a list this module never sees. The renderer
   * maps it to a scene; the rules treat it as an opaque label that has to
   * survive a save.
   */
  picture: number;
  /**
   * Slot `i` holds this piece, or null. A piece belongs in the slot with its
   * own number, which is what makes `isSolved` one line and needs no
   * bookkeeping about "correct" anywhere else.
   */
  slots: readonly (number | null)[];
  /** Pieces not on the board, in the order they are offered. */
  tray: readonly number[];
  /**
   * The piece in hand, or null. ALWAYS a piece that is currently in the tray —
   * see `tapSlot`, where lifting returns the piece to the tray in the same
   * breath as selecting it. Holding a piece that is in neither place would be a
   * third home for it, and the invariant below is what the session spec checks.
   */
  selected: number | null;
  /** Placements. A lift is not a move, and neither is picking a piece up. */
  moves: number;
}

export type Rng = () => number;

export type TapOutcome =
  | { kind: "ignored" }
  /** A piece went into a slot. `home` says whether it was the right one. */
  | { kind: "placed"; piece: number; slot: number; home: boolean; solved: boolean }
  /** A piece came back off the board. */
  | { kind: "lifted"; piece: number; slot: number }
  /** The held piece went in and the occupant came out. */
  | { kind: "swapped"; piece: number; slot: number; displaced: number; home: boolean; solved: boolean };

/**
 * A shuffled tray that is not already the answer.
 *
 * Fisher-Yates, then a check: on the easy board there are 720 orders and one of
 * them is 0,1,2,3,4,5, so roughly one child in 720 would be handed a tray whose
 * pieces are already in order — which is not a puzzle. Retried rather than
 * rotated, because a rotation is a second rule somebody has to know about.
 */
export function shuffledTray(count: number, rng: Rng): number[] {
  const ids = Array.from({ length: count }, (_, i) => i);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    for (let i = ids.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    if (ids.some((id, i) => id !== i)) return ids;
  }
  // Twenty shuffles all landing on the identity needs a degenerate rng. Swap
  // the first two by hand rather than looping forever in front of a child.
  if (ids.length >= 2) [ids[0], ids[1]] = [ids[1], ids[0]];
  return ids;
}

export function newGame(
  level: Difficulty,
  pictures: number,
  rng: Rng = Math.random,
): JigsawState {
  const { cols, rows } = LEVELS[level];
  const count = cols * rows;
  return {
    level,
    cols,
    rows,
    picture: Math.floor(rng() * Math.max(1, pictures)),
    slots: new Array<number | null>(count).fill(null),
    tray: shuffledTray(count, rng),
    selected: null,
    moves: 0,
  };
}

/** Every slot holding its own piece. The only definition of finished. */
export function isSolved(state: JigsawState): boolean {
  return state.slots.every((piece, i) => piece === i);
}

/** How many slots hold the right piece — the progress bar, and nothing else. */
export function correctCount(state: JigsawState): number {
  return state.slots.reduce((n: number, piece, i) => n + (piece === i ? 1 : 0), 0);
}

/** Pick a tray piece up, or put it back down. Never a move. */
export function tapTray(state: JigsawState, piece: number): { state: JigsawState; outcome: TapOutcome } {
  if (!state.tray.includes(piece)) return { state, outcome: { kind: "ignored" } };
  return {
    state: { ...state, selected: state.selected === piece ? null : piece },
    outcome: { kind: "ignored" },
  };
}

/**
 * The board half of the input model.
 *
 * Holding a piece, a tap PLACES it — into an empty slot, or in exchange for
 * whatever was there. Holding nothing, a tap on an occupied slot LIFTS that
 * piece back to the tray and hands it to the child, so the same gesture that
 * takes a piece off is the one that starts moving it somewhere else.
 *
 * A wrong slot is accepted. This is a jigsaw, not a quiz: putting a piece
 * somewhere and seeing that it does not belong is how the puzzle is solved, so
 * refusing the placement would remove the game. Nothing is scored against it —
 * there is no fail state here at all, only a board that is not finished yet.
 */
export function tapSlot(state: JigsawState, slot: number): { state: JigsawState; outcome: TapOutcome } {
  if (slot < 0 || slot >= state.slots.length) return { state, outcome: { kind: "ignored" } };
  const occupant = state.slots[slot];

  if (state.selected === null) {
    if (occupant === null) return { state, outcome: { kind: "ignored" } };
    const slots = [...state.slots];
    slots[slot] = null;
    return {
      // Back to the tray AND in hand: the piece has exactly one home at every
      // moment, which is the invariant the session spec is able to check.
      state: { ...state, slots, tray: [occupant, ...state.tray], selected: occupant },
      outcome: { kind: "lifted", piece: occupant, slot },
    };
  }

  const piece = state.selected;
  const slots = [...state.slots];
  slots[slot] = piece;
  const tray = state.tray.filter((p) => p !== piece);
  if (occupant !== null) tray.unshift(occupant);

  const next: JigsawState = { ...state, slots, tray, selected: null, moves: state.moves + 1 };
  const home = piece === slot;
  const solved = isSolved(next);

  return {
    state: next,
    outcome:
      occupant === null
        ? { kind: "placed", piece, slot, home, solved }
        : { kind: "swapped", piece, slot, displaced: occupant, home, solved },
  };
}

/**
 * What this game's record measures.
 *
 * PLACEMENTS, and fewer is better — `src/sdk/score.ts` ranks `moves` low. The
 * floor is the piece count, since a perfect solve puts every piece down exactly
 * once, which makes the number legible without a word of explanation: twelve on
 * a twelve-piece board is flawless.
 *
 * Scoped per difficulty, because twenty pieces and six are not the same
 * achievement and a shared board would let the easy cut own the record forever.
 *
 * `logic.ts` is the one place that names the unit, and
 * `score-unit-declared.test.ts` pins it against `meta.ts` — only the VALUE of a
 * record is ever persisted, so a wrong unit orders this board backwards forever.
 */
export function scoreReport(
  state: JigsawState,
  level: Difficulty,
): { value: number; unit: "moves"; board: string } {
  return { value: state.moves, unit: "moves", board: level };
}
