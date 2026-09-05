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
  /** Moves a run starts with. */
  moves: number;
  /** Moves a completed round hands back. */
  movesPerRound: number;
}

/**
 * WHY THE MOVE BUDGET ENDS THE GAME, AND WHY A FLAT BONUS DOES IT.
 *
 * Until 2026-09-04 this game had no ending at all: `moves` only counted up, and
 * a board with no legal move was SHUFFLED rather than finished. So the offer to
 * play again fired after every round while the run carried on - reported as
 * "the play again / share should show only upon completion and not in
 * continuous plays" (issue #27), which is a symptom of there being no
 * completion to speak of.
 *
 * The goal GROWS every round (`goalStep`) and the bonus is FLAT, so the two
 * curves cross and every run ends on its own without a round cap, a timer, or
 * any number tuned to feel right. Early rounds hand back more than they cost,
 * which is the part that feels generous; later ones cannot.
 *
 * The numbers below were chosen and then MEASURED, never estimated -
 * `scripts/repro/match3-run-length.mts` plays 400 seeded runs per level through
 * this very module, picking a legal swap at random. A real player does better,
 * so these are FLOORS. Rounds as p10/median/p90, on this tree, 2026-09-04:
 *
 *   easy    goal 24 +9/rd,  25 moves +8    10/12/14 rounds   113 moves
 *   medium  goal 32 +8/rd,  25 moves +10    9/10/11 rounds   115 moves
 *   hard    goal 40 +10/rd, 25 moves +13    7/ 7/ 8 rounds   103 moves
 *
 * The FIRST set measured was 10/+8 flat across all three, and it produced 21
 * rounds on easy against 6 on hard - the same four numbers giving a run three
 * times longer at the level meant to be gentler, because four colours cascade
 * far more than six. Nothing in the source hints at that; only the sim showed
 * it. A run that never ends, and a run over in ninety seconds, are both
 * failures - re-run that script before touching any of these numbers.
 */
export const LEVELS: Record<Difficulty, LevelSpec> = {
  easy: { size: 6, colors: 4, goal: 24, goalStep: 9, moves: 25, movesPerRound: 8 },
  medium: { size: 7, colors: 5, goal: 32, goalStep: 8, moves: 25, movesPerRound: 10 },
  hard: { size: 8, colors: 6, goal: 40, goalStep: 10, moves: 25, movesPerRound: 13 },
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
  /**
   * The power-up on each gem, parallel to `grid` and the same length.
   *
   * A SECOND ARRAY rather than a richer gem, so every function that reasons
   * about colour alone - `findMatches`, `hasMove`, `dealBoard`, `shuffleBoard`
   * - is the same code it was before power-ups existed.
   */
  kinds: readonly number[];
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
  /**
   * Moves left before the run ends. A completed round hands back
   * `movesPerRound`; a refused swap costs nothing, for the same reason it does
   * not count as a move - a child who tried something that does not match has
   * not spent a turn, they have looked.
   */
  movesLeft: number;
}

/**
 * The run is finished: no moves left to spend.
 *
 * DERIVED rather than stored, so a snapshot cannot restore a board that
 * disagrees with its own counter. `goal` is stored because the renderer needs
 * it every frame and re-deriving it there is how two answers appear; this is
 * read at a handful of call sites and has exactly one.
 */
export const isOver = (state: Match3State): boolean => state.movesLeft <= 0;

/** One frame of a cascade: what vanished, and the board left behind. */
export interface CascadeStep {
  /** Indices cleared in this step, on the board BEFORE it. */
  cleared: readonly number[];
  /** The board after clearing, gravity and refill. */
  grid: readonly number[];
  /** The kinds after this step, parallel to `grid`. */
  kinds: readonly number[];
  /**
   * Specials that fired in this step, on the board BEFORE it, with the kind
   * each one was. The renderer needs this to draw the blast; deriving it from
   * `cleared` is impossible once the gems are gone.
   */
  fired: readonly { index: number; kind: number }[];
  /** Specials minted in this step, on the board AFTER it. */
  spawned: readonly { index: number; kind: number }[];
  /** Points this step scored, multiplier already applied. */
  points: number;
}

export type SwapOutcome =
  /**
   * Nothing happened, and the state is either untouched or carries a moved
   * selection. Both input paths produce it: a tap that picks a gem up, and a
   * swipe that pushed at the board edge.
   */
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
      /** The kinds at that same instant, parallel to `swapped`. */
      swappedKinds: readonly number[];
      steps: readonly CascadeStep[];
      /** Total points, all steps. */
      points: number;
      /** Gems cleared, all steps. */
      gems: number;
      /** The round this swap completed, or 0. Never more than one per swap. */
      roundUp: number;
      /** The board had no legal move left and was shuffled after settling. */
      shuffled: boolean;
      /** Moves left AFTER this swap, the round bonus already added. */
      movesLeft: number;
      /** This swap spent the last move: the run is over. */
      over: boolean;
    };

export type Rng = () => number;

const at = (size: number, r: number, c: number): number => r * size + c;

/* ─────────────────────────────────────────────────────────────────── kinds

   A gem has a COLOUR and a KIND, and they are two parallel arrays rather than
   one array of objects. That is deliberate: `findMatches`, `hasMove`,
   `dealBoard` and `shuffleBoard` all reason about colour alone and none of them
   had to change, so the matching rule this game is built on is the same code it
   was before power-ups existed.

   A kind is created by the SHAPE of the run that made it, and it fires when it
   is cleared - never by being tapped. There is no new input path, no new
   gesture, and nothing a five-year-old has to be taught: you match, and
   sometimes the board does something bigger.
   ───────────────────────────────────────────────────────────────────────────*/

/** An ordinary gem. */
export const PLAIN = 0;
/** Four in a row: clears its whole row when it goes. */
export const STRIPE_ROW = 1;
/** Four in a column: clears its whole column. */
export const STRIPE_COL = 2;
/** An L or a T - one gem in both a row run and a column run: clears the 3x3. */
export const BURST = 3;
/** Five or more: clears every gem sharing its colour. */
export const RAINBOW = 4;

export type Kind = 0 | 1 | 2 | 3 | 4;
export const KINDS: readonly Kind[] = [PLAIN, STRIPE_ROW, STRIPE_COL, BURST, RAINBOW];

/** A board of nothing but ordinary gems. */
export const plainKinds = (n: number): Kind[] => new Array<Kind>(n).fill(PLAIN);

/** One maximal line of three or more of the same colour. */
export interface Run {
  /** Indices in board order. */
  cells: number[];
  dir: "row" | "col";
  color: number;
}

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
export function findRuns(grid: readonly number[], size: number): Run[] {
  const runs: Run[] = [];

  const scan = (dir: "row" | "col", get: (i: number) => number, index: (i: number) => number) => {
    let runStart = 0;
    for (let i = 1; i <= size; i += 1) {
      const same = i < size && get(i) !== 0 && get(i) === get(runStart);
      if (same) continue;
      if (i - runStart >= 3 && get(runStart) !== 0) {
        const cells: number[] = [];
        for (let k = runStart; k < i; k += 1) cells.push(index(k));
        runs.push({ cells, dir, color: get(runStart) });
      }
      runStart = i;
    }
  };

  for (let r = 0; r < size; r += 1) {
    scan(
      "row",
      (c) => grid[at(size, r, c)],
      (c) => at(size, r, c),
    );
  }
  for (let c = 0; c < size; c += 1) {
    scan(
      "col",
      (r) => grid[at(size, r, c)],
      (r) => at(size, r, c),
    );
  }
  return runs;
}

/**
 * Every index that is part of a run of three or more.
 *
 * DERIVED from `findRuns` rather than implemented beside it. It used to be the
 * only matcher and it flattened the run away, which is why nothing could tell a
 * three from a five - see `findRuns`. Keeping it as a projection means the
 * matching rule has exactly one implementation, and every caller and test that
 * predates power-ups is untouched.
 *
 * Runs are unioned, so a cross-shaped match clears both arms and the shared gem
 * exactly once. Holes (0) never match - without that guard a column of three
 * holes mid-cascade reads as a line and scores itself, repeatedly.
 */
export function findMatches(grid: readonly number[], size: number): number[] {
  const hit = new Set<number>();
  for (const run of findRuns(grid, size)) for (const i of run.cells) hit.add(i);
  return [...hit].sort((x, y) => x - y);
}

/**
 * Which cell of each run becomes a special, and which special.
 *
 * A gem in BOTH a row run and a column run is the L/T shape and outranks
 * everything: it becomes a BURST at the intersection, and both its runs are
 * spent. Otherwise five or more makes a RAINBOW and four makes a STRIPE along
 * the run, both at the run's middle cell so the new gem appears where the eye
 * was already looking.
 *
 * At most one special per run, and a cell already claimed by a longer run keeps
 * the stronger kind - two runs crossing cannot mint two gems on one square.
 */
export function decideSpawns(runs: readonly Run[]): Map<number, Kind> {
  const out = new Map<number, Kind>();
  const rank: Record<number, number> = { [PLAIN]: 0, [STRIPE_ROW]: 1, [STRIPE_COL]: 1, [BURST]: 2, [RAINBOW]: 3 };
  const claim = (index: number, kind: Kind) => {
    const held = out.get(index);
    if (held === undefined || rank[kind] > rank[held]) out.set(index, kind);
  };

  const rows = runs.filter((r) => r.dir === "row");
  const cols = runs.filter((r) => r.dir === "col");
  const spent = new Set<Run>();

  for (const row of rows) {
    for (const col of cols) {
      const cross = row.cells.find((i) => col.cells.includes(i));
      if (cross === undefined) continue;
      // A cross whose longer arm is five or more is a rainbow, not a burst.
      // Without this the L outranks the 5 and a child who lined up five gems
      // that happen to touch a three gets the WEAKER gem for the bigger shape,
      // which reads as the game punishing the better move.
      claim(cross, Math.max(row.cells.length, col.cells.length) >= 5 ? RAINBOW : BURST);
      spent.add(row);
      spent.add(col);
    }
  }

  for (const run of runs) {
    if (spent.has(run)) continue;
    const middle = run.cells[Math.floor(run.cells.length / 2)];
    if (run.cells.length >= 5) claim(middle, RAINBOW);
    else if (run.cells.length === 4) claim(middle, run.dir === "row" ? STRIPE_ROW : STRIPE_COL);
  }
  return out;
}

/**
 * What this special takes with it when it goes.
 *
 * Returns only the EXTRA cells: the special's own square is already in the set
 * that triggered it. A PLAIN gem takes nothing, which is what makes this safe
 * to call on every cleared cell without asking first.
 */
export function blastOf(
  index: number,
  kind: number,
  grid: readonly number[],
  size: number,
): number[] {
  const r = Math.floor(index / size);
  const c = index % size;
  const out: number[] = [];
  if (kind === STRIPE_ROW) {
    for (let k = 0; k < size; k += 1) out.push(at(size, r, k));
  } else if (kind === STRIPE_COL) {
    for (let k = 0; k < size; k += 1) out.push(at(size, k, c));
  } else if (kind === BURST) {
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
        out.push(at(size, rr, cc));
      }
    }
  } else if (kind === RAINBOW) {
    const color = grid[index];
    if (color !== 0) {
      for (let i = 0; i < grid.length; i += 1) if (grid[i] === color) out.push(i);
    }
  }
  return out;
}

/**
 * Fire every special caught in `seed`, and every special their blasts catch,
 * until nothing new is caught.
 *
 * A fixed point rather than one pass, because a stripe that clears a row can
 * reach a bomb three squares away, and that bomb has to go off too - a chain
 * that stops after one link is the thing that makes a power-up feel broken.
 * Terminates because the set only ever grows and the board is finite.
 */
export function fireSpecials(
  seed: Iterable<number>,
  grid: readonly number[],
  kinds: readonly number[],
  size: number,
): Set<number> {
  const all = new Set<number>(seed);
  const pending = [...all];
  while (pending.length > 0) {
    const i = pending.pop()!;
    const kind = kinds[i] ?? PLAIN;
    if (kind === PLAIN) continue;
    for (const j of blastOf(i, kind, grid, size)) {
      if (all.has(j)) continue;
      all.add(j);
      pending.push(j);
    }
  }
  return all;
}

/**
 * What a swap of two POWER-UPS clears, or a rainbow swapped onto any gem.
 *
 * THIS IS THE ONE GESTURE IN THIS GAME THAT IS NOT "A POWER FIRES WHEN IT IS
 * CLEARED". Every other kind is made by the shape of a run and goes off when a
 * line sweeps it up, which is why nothing here ever needed a second way to
 * touch the board. A player asked for the Candy Crush move - put two specials
 * together and get something bigger, and touch the rainbow to any gem to take
 * that colour - so this returns the cells such a swap clears, and `null` when
 * the swap is an ordinary one that still has to make a line.
 *
 * Read on the SWAPPED board, so `a` holds what the player dragged there.
 * `b` is the pivot: it is where the second tap landed, and a cross drawn
 * anywhere else reads as the game aiming somewhere the finger was not.
 */
export function comboBlast(
  a: number,
  b: number,
  grid: readonly number[],
  kinds: readonly number[],
  size: number,
): number[] | null {
  const ka = kinds[a] ?? PLAIN;
  const kb = kinds[b] ?? PLAIN;
  if (ka === PLAIN && kb === PLAIN) return null;

  const cells = new Set<number>([a, b]);
  const row = (r: number) => {
    for (let c = 0; c < size; c += 1) cells.add(at(size, r, c));
  };
  const col = (c: number) => {
    for (let r = 0; r < size; r += 1) cells.add(at(size, r, c));
  };
  const block = (i: number, reach: number) => {
    const r0 = Math.floor(i / size);
    const c0 = i % size;
    for (let dr = -reach; dr <= reach; dr += 1) {
      for (let dc = -reach; dc <= reach; dc += 1) {
        const r = r0 + dr;
        const c = c0 + dc;
        if (r < 0 || c < 0 || r >= size || c >= size) continue;
        cells.add(at(size, r, c));
      }
    }
  };
  const stripe = (k: number) => k === STRIPE_ROW || k === STRIPE_COL;
  const r = Math.floor(b / size);
  const c = b % size;

  // Two rainbows: the whole board. The biggest moment the game has, and it can
  // hand a round over in one tap - chosen on purpose rather than by accident.
  if (ka === RAINBOW && kb === RAINBOW) {
    for (let i = 0; i < grid.length; i += 1) cells.add(i);
    return [...cells];
  }

  // A rainbow and anything else - including a plain gem, which is the move
  // everybody knows: every gem of the OTHER gem's colour goes. Paired with a
  // stripe or a burst, each of those gems becomes that power first and then
  // fires, which is what makes the pairing worth setting up.
  if (ka === RAINBOW || kb === RAINBOW) {
    const other = ka === RAINBOW ? b : a;
    const partner = ka === RAINBOW ? kb : ka;
    const color = grid[other];
    const same: number[] = [];
    for (let i = 0; i < grid.length; i += 1) if (grid[i] === color) same.push(i);
    for (const i of same) cells.add(i);
    if (stripe(partner)) {
      // Alternating rather than random: a board that plays out differently on
      // two runs of the same seed is a board no test can pin.
      same.forEach((i, n) => (n % 2 === 0 ? row(Math.floor(i / size)) : col(i % size)));
    } else if (partner === BURST) {
      for (const i of same) block(i, 1);
    }
    return [...cells];
  }

  // Two stripes: a full row AND a full column, whichever way round the two
  // gems were facing. Two rows would be the literal reading of "fire both" and
  // it is not the move - a cross is.
  if (stripe(ka) && stripe(kb)) {
    row(r);
    col(c);
    return [...cells];
  }

  // A stripe and a burst: the cross, three wide.
  if ((stripe(ka) && kb === BURST) || (ka === BURST && stripe(kb))) {
    for (let d = -1; d <= 1; d += 1) {
      if (r + d >= 0 && r + d < size) row(r + d);
      if (c + d >= 0 && c + d < size) col(c + d);
    }
    return [...cells];
  }

  // Two bursts: 5x5, which is the 3x3 each of them would have done, joined.
  if (ka === BURST && kb === BURST) {
    block(b, 2);
    return [...cells];
  }

  // One special and one plain gem, and the special is not a rainbow. An
  // ordinary swap: it still has to make a line, and the power still fires by
  // being cleared.
  return null;
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
function collapse(
  grid: readonly number[],
  kinds: readonly number[],
  size: number,
  colors: number,
  rng: Rng,
): { grid: number[]; kinds: Kind[]; moved: Map<number, number> } {
  const next = [...grid];
  // Where each surviving gem ENDED UP. Returned rather than re-derived,
  // because the only other way to find a minted gem after gravity is to
  // compare kinds index by index - and that reports a special which merely
  // FELL as one that was just created, drawing the mint sparkle on a gem the
  // child has had for three moves.
  const moved = new Map<number, number>();
  // The kind falls WITH its gem. Moving the colour and leaving the kind behind
  // would teleport a power-up onto whatever landed underneath it, which reads
  // as the board cheating and is the one bug this pairing can have.
  const nextKinds = [...kinds] as Kind[];
  for (let c = 0; c < size; c += 1) {
    let write = size - 1;
    for (let r = size - 1; r >= 0; r -= 1) {
      const from = at(size, r, c);
      const v = next[from];
      if (v !== 0) {
        const to = at(size, write, c);
        next[to] = v;
        nextKinds[to] = nextKinds[from];
        moved.set(from, to);
        write -= 1;
      }
    }
    for (let r = write; r >= 0; r -= 1) {
      const i = at(size, r, c);
      next[i] = 1 + Math.floor(rng() * colors);
      nextKinds[i] = PLAIN;
    }
  }
  return { grid: next, kinds: nextKinds, moved };
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
  kinds: readonly number[],
  size: number,
  colors: number,
  rng: Rng,
  seed?: { cells: readonly number[]; fired: readonly { index: number; kind: number }[] },
): {
  grid: readonly number[];
  kinds: readonly number[];
  steps: CascadeStep[];
  points: number;
  gems: number;
} {
  const steps: CascadeStep[] = [];
  let board = grid;
  let kind = kinds;
  let points = 0;
  let gems = 0;

  for (let depth = 1; ; depth += 1) {
    // A COMBO SWAP SEEDS THE FIRST STEP AND NOTHING ELSE. The two gems the
    // player put together clear a shape the matching rules know nothing about,
    // and everything under it - the chain into other specials, gravity, the
    // cascade multiplier, the round - runs exactly as it does for a line. From
    // the second step on this is an ordinary cascade, which is why the whole
    // gesture costs one parameter rather than a second code path.
    //
    // No mint on a seeded step: a combo is spent, not banked.
    const seeded = depth === 1 && seed !== undefined && seed.cells.length > 0;
    const runs = seeded ? [] : findRuns(board, size);
    if (!seeded && runs.length === 0) break;

    // The three questions, in this order and no other:
    //   what lined up  ->  what that sets off  ->  what it leaves behind.
    const spawns = seeded ? new Map<number, Kind>() : decideSpawns(runs);
    const lined = new Set<number>();
    if (seeded) for (const i of seed!.cells) lined.add(i);
    else for (const run of runs) for (const i of run.cells) lined.add(i);

    // The two combo gems are already PLAIN in `kind` - `swapAt` spends them -
    // so this loop reports the OTHER specials the blast swallowed and never
    // double-counts the pair, which arrive in `seed.fired` instead.
    const fired: { index: number; kind: number }[] = seeded ? [...seed!.fired] : [];
    for (const i of lined) if ((kind[i] ?? PLAIN) !== PLAIN) fired.push({ index: i, kind: kind[i] });
    const all = fireSpecials(lined, board, kind, size);
    // ...and every special the blast itself reached, which is the chain.
    for (const i of all) {
      if (lined.has(i)) continue;
      if ((kind[i] ?? PLAIN) !== PLAIN) fired.push({ index: i, kind: kind[i] });
    }

    // A minted gem SURVIVES its own match. If it was already a special its
    // blast has fired above and it is upgraded rather than removed - generous,
    // deliberate, and the alternative is a five-run that mints a rainbow and
    // clears it in the same breath.
    for (const i of spawns.keys()) all.delete(i);

    const holed = [...board];
    const holedKinds = [...kind] as Kind[];
    for (const i of all) {
      holed[i] = 0;
      holedKinds[i] = PLAIN;
    }
    for (const [i, k] of spawns) holedKinds[i] = k;

    const after = collapse(holed, holedKinds, size, colors, rng);

    // Where each minted gem ENDED UP. It is placed BEFORE gravity runs, so the
    // index the renderer needs is the one after the drop, not the one the run
    // was on - reporting the pre-drop index draws the sparkle on empty air.
    //
    // Mapped through `collapse`'s own record of what moved where. Diffing the
    // kinds arrays index by index looks equivalent and is not: a special that
    // simply FELL lands on a square that used to be plain, so the diff reports
    // it as newly minted every time anything under it clears.
    const landed: { index: number; kind: number }[] = [];
    for (const [i, k] of spawns) landed.push({ index: after.moved.get(i) ?? i, kind: k });

    const cleared = [...all].sort((x, y) => x - y);
    const stepPoints = cleared.length * POINTS_PER_GEM * Math.min(depth, 5);
    points += stepPoints;
    gems += cleared.length;
    steps.push({ cleared, grid: after.grid, kinds: after.kinds, fired, spawned: landed, points: stepPoints });
    board = after.grid;
    kind = after.kinds;
  }

  return { grid: board, kinds: kind, steps, points, gems };
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
export function hasMove(grid: readonly number[], size: number, kinds?: readonly number[]): boolean {
  // A power-up swap is legal with no line in it, so a board holding a rainbow
  // is never dead however the colours fell, and neither is one with two
  // specials side by side. Checked BEFORE the colour sweep because it is the
  // cheaper question and because getting it wrong shuffles a board the player
  // was about to win on.
  //
  // `kinds` is optional: `dealBoard` and the shuffler ask about a board of
  // plain gems, where there is nothing to find.
  if (kinds) {
    for (let i = 0; i < grid.length; i += 1) {
      const k = kinds[i] ?? PLAIN;
      if (k === PLAIN) continue;
      if (k === RAINBOW) return true;
      if (i % size < size - 1 && (kinds[i + 1] ?? PLAIN) !== PLAIN) return true;
      if (i + size < grid.length && (kinds[i + size] ?? PLAIN) !== PLAIN) return true;
    }
  }
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
  return shuffleWithKinds(grid, plainKinds(grid.length), size, colors, rng).grid;
}

/**
 * The same shuffle, moving each gem's POWER-UP with it.
 *
 * A shuffle happens when the board has no legal move, which is exactly the
 * moment a child is most likely to be holding a special they were saving. A
 * shuffle that dropped it would be the game taking something away as a reward
 * for being stuck.
 *
 * The permutation is shuffled, not the values, so both arrays move together by
 * construction rather than by two shuffles being asked to agree. The fallback
 * is a fresh deal, and a fresh deal genuinely has no specials on it.
 */
export function shuffleWithKinds(
  grid: readonly number[],
  kinds: readonly number[],
  size: number,
  colors: number,
  rng: Rng,
): { grid: number[]; kinds: Kind[] } {
  const order = grid.map((_, i) => i);
  for (let attempt = 0; attempt < SHUFFLE_TRIES; attempt += 1) {
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const bag = order.map((from) => grid[from]);
    if (findMatches(bag, size).length === 0 && hasMove(bag, size)) {
      return { grid: bag, kinds: order.map((from) => (kinds[from] ?? PLAIN) as Kind) };
    }
  }
  const fresh = dealBoard(size, colors, rng);
  return { grid: fresh, kinds: plainKinds(fresh.length) };
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
    kinds: plainKinds(cfg.size * cfg.size),
    selected: null,
    round: 1,
    cleared: 0,
    goal: cfg.goal,
    score: 0,
    moves: 0,
    movesLeft: cfg.moves,
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

  // A finished run answers nothing. Without this a child could keep swapping
  // under the game-over card and quietly climb past their own final score - the
  // same class of hole as a board that stays live behind a modal.
  if (isOver(state)) return { state, outcome: { kind: "ignored" } };

  const swapped = [...state.grid];
  [swapped[a], swapped[b]] = [swapped[b], swapped[a]];
  // The power-up travels with the gem, or a swap would leave it behind on a
  // square whose colour it no longer belongs to.
  const swappedKinds = [...(state.kinds ?? plainKinds(n))];
  [swappedKinds[a], swappedKinds[b]] = [swappedKinds[b], swappedKinds[a]];

  // Two power-ups put together, or a rainbow touched to any gem, is legal with
  // no line in it at all - see `comboBlast`. Asked BEFORE the line check,
  // because the line check is what would refuse it.
  const combo = comboBlast(a, b, swapped, swappedKinds, state.size);

  if (combo === null && findMatches(swapped, state.size).length === 0) {
    // Nothing changes but the selection, which clears: holding the gem would
    // leave a child tapping a neighbour that has already been tried.
    return { state: { ...state, selected: null }, outcome: { kind: "rejected", a, b } };
  }

  let seed: { cells: readonly number[]; fired: readonly { index: number; kind: number }[] } | undefined;
  if (combo !== null) {
    seed = {
      cells: combo,
      fired: [
        { index: a, kind: swappedKinds[a] },
        { index: b, kind: swappedKinds[b] },
      ].filter((f) => f.kind !== PLAIN),
    };
    // SPENT. Without this the pair fires twice - once as the combo, again as
    // ordinary specials caught inside their own blast - and a rainbow paired
    // with a stripe would clear its own colour as well as the one it was
    // pointed at.
    swappedKinds[a] = PLAIN;
    swappedKinds[b] = PLAIN;
  }

  const done = settle(swapped, swappedKinds, state.size, state.colors, rng, seed);

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

  // The swap costs one, and a completed round hands back a flat bonus. The
  // bonus lands in the SAME expression as the cost so a round finished on the
  // last move is playable rather than a win the child never gets to spend.
  const cfg = LEVELS[state.level];
  const movesLeft = state.movesLeft - 1 + (roundUp > 0 ? cfg.movesPerRound : 0);
  const over = movesLeft <= 0;

  let grid = done.grid;
  let kinds = done.kinds;
  let shuffled = false;
  // Only reshuffle a board somebody can still play. Shuffling under a finished
  // run would redraw the gems behind the game-over card for no one.
  if (!over && !hasMove(grid, state.size, kinds)) {
    const mixed = shuffleWithKinds(grid, kinds, state.size, state.colors, rng);
    grid = mixed.grid;
    kinds = mixed.kinds;
    shuffled = true;
  }

  return {
    state: {
      ...state,
      grid,
      kinds,
      selected: null,
      round,
      cleared,
      goal,
      score: state.score + done.points,
      moves: state.moves + 1,
      movesLeft,
    },
    outcome: {
      kind: "matched",
      a,
      b,
      swapped,
      swappedKinds,
      steps: done.steps,
      points: done.points,
      gems: done.gems,
      roundUp,
      shuffled,
      movesLeft,
      over,
    },
  };
}

/**
 * The whole input model: TAP, and swipe as a shortcut over it.
 *
 * First tap picks a gem up. A second tap on a NEIGHBOUR attempts the swap; a
 * second tap anywhere else picks that gem up instead, and a second tap on the
 * same gem puts it down. `swipeCell` below does the same swap in one gesture
 * and is never the only way to reach one — a five-year-old on a phone, and
 * anyone on assistive input, cannot reliably hold a sustained pointer gesture
 * (CLAUDE.md § kids games), so the two-tap path stays complete.
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

/** The four ways a gem can be pushed. Screen directions on an LTR board. */
export type SwipeDir = "up" | "down" | "left" | "right";

/**
 * The cell one step from `index` in `dir`, or null at the board edge.
 *
 * It walks the ROW and COLUMN rather than adding ±1 / ±size to the index,
 * because index arithmetic wraps: cell 5 on a 6-wide board plus one is cell 6,
 * which is the first cell of the NEXT row and not a neighbour at all. That is
 * the same edge case `areAdjacent` refuses, and a swipe off the right edge is
 * exactly how a child finds it.
 */
export function neighbourIn(index: number, dir: SwipeDir, size: number): number | null {
  const n = size * size;
  if (!Number.isInteger(index) || index < 0 || index >= n) return null;
  const r = Math.floor(index / size) + (dir === "down" ? 1 : dir === "up" ? -1 : 0);
  const c = (index % size) + (dir === "right" ? 1 : dir === "left" ? -1 : 0);
  if (r < 0 || c < 0 || r >= size || c >= size) return null;
  return at(size, r, c);
}

/**
 * Push a gem one cell in a direction — the same trade two taps make.
 *
 * It resolves the direction to a neighbour and hands straight to `swapAt`, so
 * there is one implementation of what a swap DOES and a gesture cannot acquire
 * rules of its own. A swipe off the edge is `ignored` and leaves the state
 * untouched, selection included: nothing happened, so nothing changes.
 */
export function swipeCell(
  state: Match3State,
  index: number,
  dir: SwipeDir,
  rng: Rng = Math.random,
): { state: Match3State; outcome: SwapOutcome } {
  const target = neighbourIn(index, dir, state.size);
  if (target === null) return { state, outcome: { kind: "ignored" } };
  return swapAt(state, index, target, rng);
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
