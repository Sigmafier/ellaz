import { describe, it, expect } from "vitest";
import { mulberry32, seedFrom } from "@shared/rng";
import {
  LEVELS,
  LEVEL_IDS,
  adjacent,
  clear,
  covered,
  deal,
  head,
  isBlocked,
  isSolved,
  neighbours,
  newGame,
  openCount,
  scoreFor,
  seedWalk,
  step,
  stir,
  undo,
  type Cell,
  type LevelId,
  type OneStrokeState,
} from "./logic";

const seeded = (label: string) => mulberry32(seedFrom(label));

/** A board written out by hand. Nothing is drawn on it beyond the start cell. */
function board(size: number, start: Cell, blocked: Cell[] = []): OneStrokeState {
  return { size, blocked, start, path: [start] };
}

/** Walk a whole route through the shipped rules, one cell at a time. */
function draw(from: OneStrokeState, route: Cell[]): OneStrokeState {
  let s = from;
  for (const cell of route) s = step(s, cell).state;
  return s;
}

/** Every open cell of a board, in plain reading order. */
function openCells(state: OneStrokeState): Cell[] {
  const out: Cell[] = [];
  for (let c = 0; c < state.size * state.size; c++) if (!isBlocked(state, c)) out.push(c);
  return out;
}

/**
 * Does this walk visit every open cell exactly once, stepping only to a
 * neighbour? The one property the whole generator exists to hold, written out
 * here so every test below can ask it of anything.
 */
function isHamiltonian(walk: readonly Cell[], state: OneStrokeState): boolean {
  const open = new Set(openCells(state));
  if (walk.length !== open.size) return false;
  const seen = new Set<Cell>();
  for (let i = 0; i < walk.length; i++) {
    const cell = walk[i];
    if (!open.has(cell) || seen.has(cell)) return false;
    seen.add(cell);
    if (i > 0 && !adjacent(state.size, walk[i - 1], cell)) return false;
  }
  return true;
}

/**
 * The seed walk, restricted to the cells this board still has.
 *
 * This is the REGRESSION GUARD, ported from `scripts/sim/flow-routes.mjs`. Pipe
 * Flow's walk came from a budgeted depth-first search that gave up on 91.17% of
 * hard deals and silently fell back to the row-by-row zigzag, so nine hard
 * boards in ten were cut from one underlying walk. Nothing threw and every gate
 * was green; measuring which walk shipped was the only way to see it.
 *
 * `deal` here starts from the same zigzag and folds it, so a stir that stopped
 * working leaves the plan sitting on exactly this order. `zigzagDeals` below
 * must stay at 0, and the control two tests down proves the detector can fire.
 */
function looksLikeSeed(walk: readonly Cell[], state: OneStrokeState): boolean {
  const open = new Set(openCells(state));
  const order = seedWalk(state.size).filter((c) => open.has(c));
  const same = (a: readonly Cell[], b: readonly Cell[]) => a.every((c, i) => c === b[i]);
  return same(walk, order) || same(walk, [...order].reverse());
}

/* ------------------------------------------------------------------ the grid */

describe("the grid - what counts as next door", () => {
  it("joins cells that share an edge", () => {
    // A 5-wide grid: 7 is row 1 column 2, so 2 sits above it and 12 below.
    expect(adjacent(5, 7, 2)).toBe(true);
    expect(adjacent(5, 7, 12)).toBe(true);
    expect(adjacent(5, 7, 6)).toBe(true);
    expect(adjacent(5, 7, 8)).toBe(true);
  });

  it("refuses a diagonal, and refuses a cell to itself", () => {
    expect(adjacent(5, 7, 1)).toBe(false);
    expect(adjacent(5, 7, 13)).toBe(false);
    expect(adjacent(5, 7, 7)).toBe(false);
  });

  it("refuses the pair that differs by one across a row boundary", () => {
    // 4 and 5 differ by one and sit at opposite edges of a 5-wide grid. An
    // index comparison would let the line leave on the right and reappear on
    // the left, which is a legal-looking move that draws as a jump.
    expect(adjacent(5, 4, 5)).toBe(false);
    expect(adjacent(5, 9, 10)).toBe(false);
  });

  it("gives a corner two neighbours, an edge three and the middle four", () => {
    expect(neighbours(5, 0).sort((a, b) => a - b)).toEqual([1, 5]);
    expect(neighbours(5, 2).sort((a, b) => a - b)).toEqual([1, 3, 7]);
    expect(neighbours(5, 12).sort((a, b) => a - b)).toEqual([7, 11, 13, 17]);
  });

  it("never hands back a cell off the board", () => {
    for (let c = 0; c < 25; c++) {
      for (const n of neighbours(5, c)) expect(n).toBeGreaterThanOrEqual(0);
      for (const n of neighbours(5, c)) expect(n).toBeLessThan(25);
    }
  });
});

/* -------------------------------------------------------------- the board */

describe("reading a board", () => {
  it("counts only the open cells", () => {
    expect(openCount(board(4, 0))).toBe(16);
    expect(openCount(board(4, 0, [5, 6, 9]))).toBe(13);
  });

  it("knows which cells are walls", () => {
    const b = board(4, 0, [5, 6]);
    expect(isBlocked(b, 5)).toBe(true);
    expect(isBlocked(b, 7)).toBe(false);
  });

  it("starts with the line one cell long, on the marked square", () => {
    const b = board(4, 9);
    expect(b.path).toEqual([9]);
    expect(covered(b)).toBe(1);
    expect(head(b)).toBe(9);
    expect(isSolved(b)).toBe(false);
  });
});

/* ------------------------------------------------------------------- rules */

describe("drawing the line", () => {
  it("steps into an open cell next door", () => {
    const s = step(board(3, 0), 1);
    expect(s.outcome).toEqual({ kind: "drawn", cell: 1 });
    expect(s.state.path).toEqual([0, 1]);
  });

  it("refuses a diagonal", () => {
    const s = step(board(3, 0), 4);
    expect(s.outcome.kind).toBe("ignored");
    expect(s.state.path).toEqual([0]);
  });

  it("refuses a cell that is not next to the head at all", () => {
    const s = step(board(3, 0), 8);
    expect(s.outcome.kind).toBe("ignored");
  });

  it("refuses a wall", () => {
    const s = step(board(3, 0, [1]), 1);
    expect(s.outcome.kind).toBe("ignored");
    expect(s.state.path).toEqual([0]);
  });

  it("refuses a cell that is not on the board", () => {
    expect(step(board(3, 0), -1).outcome.kind).toBe("ignored");
    expect(step(board(3, 0), 9).outcome.kind).toBe("ignored");
    expect(step(board(3, 0), 1.5).outcome.kind).toBe("ignored");
  });

  it("steps back one cell when you touch the square you came from", () => {
    const s = draw(board(3, 0), [1, 2]);
    expect(s.path).toEqual([0, 1, 2]);
    const back = step(s, 1);
    expect(back.outcome).toEqual({ kind: "retracted", to: 1 });
    expect(back.state.path).toEqual([0, 1]);
  });

  it("ignores a touch on an older part of the line, so one mistap costs one cell", () => {
    // Deliberately NOT a retraction to that cell. On a board of nearly forty
    // squares, a stray touch near the start would otherwise wipe most of a
    // drawing that took a minute to make, and there is nothing to get it back.
    const s = draw(board(3, 0), [1, 2, 5, 4]);
    const tap = step(s, 0);
    expect(tap.outcome.kind).toBe("ignored");
    expect(tap.state.path).toEqual([0, 1, 2, 5, 4]);
  });

  it("ignores a touch on the head itself", () => {
    const s = draw(board(3, 0), [1]);
    const tap = step(s, 1);
    expect(tap.outcome.kind).toBe("ignored");
    expect(tap.state.path).toEqual([0, 1]);
  });

  it("never lets a cell appear twice on the line", () => {
    let s = board(4, 0);
    const rng = seeded("no-revisits");
    for (let i = 0; i < 400; i++) {
      const cell = Math.floor(rng() * 16);
      s = step(s, cell).state;
      expect(new Set(s.path).size).toBe(s.path.length);
    }
  });
});

describe("taking it back", () => {
  it("undo removes the last cell", () => {
    const s = draw(board(3, 0), [1, 2]);
    const back = undo(s);
    expect(back.outcome).toEqual({ kind: "retracted", to: 1 });
    expect(back.state.path).toEqual([0, 1]);
  });

  it("undo at the start square does nothing", () => {
    const back = undo(board(3, 4));
    expect(back.outcome.kind).toBe("ignored");
    expect(back.state.path).toEqual([4]);
  });

  it("undo and the step-back touch are the same move", () => {
    const s = draw(board(3, 0), [1, 2, 5]);
    expect(undo(s).state.path).toEqual(step(s, 2).state.path);
  });

  it("clear goes back to the start square and nowhere else", () => {
    const s = draw(board(3, 0), [1, 2, 5, 4]);
    const fresh = clear(s);
    expect(fresh.path).toEqual([0]);
    expect(fresh.start).toBe(0);
    expect(fresh.blocked).toEqual(s.blocked);
  });

  it("redraws happily after an undo", () => {
    const s = undo(draw(board(3, 0), [1, 2])).state;
    expect(draw(s, [4]).path).toEqual([0, 1, 4]);
  });
});

/* ------------------------------------------------------------------ winning */

describe("what counts as finished", () => {
  it("wins when the line covers every open cell", () => {
    const b = board(2, 0);
    const s = draw(b, [1, 3, 2]);
    expect(isSolved(s)).toBe(true);
  });

  it("says so on the step that fills the last cell", () => {
    const s = draw(board(2, 0), [1, 3]);
    const last = step(s, 2);
    expect(last.outcome).toEqual({ kind: "completed", cell: 2 });
    expect(isSolved(last.state)).toBe(true);
  });

  it("does not win on a line that leaves a cell out", () => {
    const s = draw(board(3, 0), [1, 2, 5, 4, 3]);
    expect(covered(s)).toBe(6);
    expect(isSolved(s)).toBe(false);
  });

  it("accepts any covering line, not only the one the deal had in mind", () => {
    // Only the START is marked, so a board has many answers and the player is
    // never asked to rediscover ours. Two different routes over the same 2x2.
    expect(isSolved(draw(board(2, 0), [1, 3, 2]))).toBe(true);
    expect(isSolved(draw(board(2, 0), [2, 3, 1]))).toBe(true);
  });

  it("ignores walls when it decides the board is full", () => {
    const b = board(3, 0, [4]);
    const s = draw(b, [1, 2, 5, 8, 7, 6, 3]);
    expect(covered(s)).toBe(8);
    expect(isSolved(s)).toBe(true);
  });
});

describe("the record", () => {
  it("is a time, scoped to the level it was set on", () => {
    // `ms` and never a tap count: every finished board takes exactly one tap
    // per open square, so counting taps would rank every winner the same.
    const s = board(5, 0);
    expect(scoreFor(s, "hard", 12750)).toEqual({ value: 12750, unit: "ms", board: "hard" });
    expect(scoreFor(s, "easy", 0)).toEqual({ value: 0, unit: "ms", board: "easy" });
  });

  it("has one fixed length of answer per board, which is why the clock is the record", () => {
    for (const level of LEVEL_IDS) {
      const { state, plan } = deal(level, seeded(`fixed-${level}`));
      expect(plan.length).toBe(openCount(state));
    }
  });
});

/* -------------------------------------------------------------- the seed walk */

describe("the seed walk the stir starts from", () => {
  it("visits every cell of the grid exactly once, stepping to a neighbour", () => {
    for (const size of [4, 5, 6, 7]) {
      const walk = seedWalk(size);
      expect(isHamiltonian(walk, board(size, walk[0]))).toBe(true);
    }
  });
});

/* ----------------------------------------------------------------- backbite */

describe("backbite - every fold leaves a walk that still visits every cell", () => {
  it("holds after each individual fold, on an open grid", () => {
    const b = board(5, 0);
    const walk = seedWalk(5);
    const open = (c: Cell) => !isBlocked(b, c);
    let folds = 0;
    stir(walk, 5, open, 300, seeded("fold-invariant"), (current) => {
      folds++;
      expect(isHamiltonian(current, b)).toBe(true);
    });
    expect(folds).toBeGreaterThan(0);
  });

  it("holds after each fold on a board with walls, too", () => {
    // The region a real deal stirs is not the whole grid, so the invariant has
    // to hold against the OPEN subgraph rather than against the rectangle.
    const { state, plan } = deal("hard", seeded("fold-walls"));
    const walk = plan.slice();
    const open = (c: Cell) => !isBlocked(state, c);
    let folds = 0;
    stir(walk, state.size, open, 300, seeded("fold-walls-stir"), (current) => {
      folds++;
      expect(isHamiltonian(current, state)).toBe(true);
    });
    expect(folds).toBeGreaterThan(0);
  });

  it("moves the walk rather than leaving it where it started", () => {
    const before = seedWalk(6);
    const after = before.slice();
    stir(after, 6, () => true, 400, seeded("moves-it"));
    expect(after).not.toEqual(before);
  });

  it("cannot run out of anything - it reports a fold count, never a failure", () => {
    // The whole reason there is no search here. A budgeted search answers "not
    // found" for a board that has none and for one that is merely deep, and
    // taking the first reading is how an impossible board reaches a child.
    const walk = seedWalk(7);
    const folds = stir(walk, 7, () => true, 500, seeded("no-budget"));
    expect(folds).toBeGreaterThan(0);
    expect(folds).toBeLessThanOrEqual(500);
  });
});

/* --------------------------------------------------------------- the deal */

describe("the deal builds the board backwards", () => {
  const SEEDS = 60;

  it.each(LEVEL_IDS)("%s: the plan visits every open cell exactly once", (level: LevelId) => {
    for (let i = 0; i < SEEDS; i++) {
      const { state, plan } = deal(level, seeded(`${level}-ham-${i}`));
      expect(isHamiltonian(plan, state)).toBe(true);
    }
  });

  it.each(LEVEL_IDS)("%s: the walls match the level and never sit under the plan", (level: LevelId) => {
    const spec = LEVELS[level];
    for (let i = 0; i < SEEDS; i++) {
      const { state, plan } = deal(level, seeded(`${level}-walls-${i}`));
      expect(state.size).toBe(spec.size);
      expect(state.blocked.length).toBe(spec.blocked);
      expect(new Set(state.blocked).size).toBe(spec.blocked);
      expect(openCount(state)).toBe(spec.size * spec.size - spec.blocked);
      for (const cell of plan) expect(isBlocked(state, cell)).toBe(false);
    }
  });

  it.each(LEVEL_IDS)("%s: the board opens on the plan's first cell, with nothing drawn", (level: LevelId) => {
    for (let i = 0; i < 20; i++) {
      const { state, plan } = deal(level, seeded(`${level}-open-${i}`));
      expect(state.start).toBe(plan[0]);
      expect(state.path).toEqual([state.start]);
      expect(isSolved(state)).toBe(false);
    }
  });

  it.each(LEVEL_IDS)("%s: replaying the plan through the shipped rules wins", (level: LevelId) => {
    // The deal's promise is only worth anything if the RULES accept it. Driven
    // through `step` rather than by writing the path into the state, so a rule
    // that refused a planned move would show up here as a refusal.
    for (let i = 0; i < 20; i++) {
      const { state, plan } = deal(level, seeded(`${level}-replay-${i}`));
      let s = state;
      for (const cell of plan.slice(1)) {
        const taken = step(s, cell);
        expect(taken.outcome.kind).not.toBe("ignored");
        s = taken.state;
      }
      expect(isSolved(s)).toBe(true);
    }
  });

  it("is deterministic for a given seed", () => {
    const a = deal("medium", seeded("same"));
    const b = deal("medium", seeded("same"));
    expect(b.plan).toEqual(a.plan);
    expect(b.state).toEqual(a.state);
    expect(b.folds).toBe(a.folds);
    expect(b.seedFolds).toBe(a.seedFolds);
  });

  it("hands newGame the same board without the answer attached", () => {
    const state = newGame("easy", seeded("no-answer"));
    expect(Object.keys(state).sort()).toEqual(["blocked", "path", "size", "start"]);
  });
});

/* ------------------------------------------------- the regression guard */

describe("no board ships as the unstirred seed walk", () => {
  it("the detector can actually fire", () => {
    // Without this every reading below is a sentence about the detector rather
    // than about the game: a matcher that never matches reports a clean sweep
    // over anything at all.
    const b = board(5, 0);
    const order = seedWalk(5);
    expect(looksLikeSeed(order, b)).toBe(true);
    expect(looksLikeSeed([...order].reverse(), b)).toBe(true);
  });

  it.each(LEVEL_IDS)("%s: zigzag deals stays at 0", (level: LevelId) => {
    let zigzag = 0;
    for (let i = 0; i < 120; i++) {
      const { state, plan } = deal(level, seeded(`${level}-zigzag-${i}`));
      if (looksLikeSeed(plan, state)) zigzag++;
    }
    expect(zigzag, `${level} boards still cut straight from the seed walk`).toBe(0);
  });

  it.each(LEVEL_IDS)("%s: every deal reports the folds it applied to the grid", (level: LevelId) => {
    // `seedFolds` is the guaranteed one: no square of a full rectangle has
    // fewer than two neighbours, so this stir can always move. A zero here
    // means it never ran at all, which is the failure the counter exists for.
    for (let i = 0; i < 20; i++) {
      const { seedFolds } = deal(level, seeded(`${level}-folds-${i}`));
      expect(seedFolds).toBeGreaterThan(0);
    }
  });

  it.each(LEVEL_IDS)("%s: the cut leaves a region the second stir can move", (level: LevelId) => {
    // Not guaranteed by construction, so it is measured rather than asserted
    // absolutely: a region whose two ends are both dead ends has no legal fold,
    // and `foldable` re-cuts to avoid one. Before that check, one hard board in
    // five was frozen. A handful across 120 seeds is the honest bar.
    let frozen = 0;
    for (let i = 0; i < 120; i++) {
      if (deal(level, seeded(`${level}-frozen-${i}`)).folds === 0) frozen++;
    }
    expect(frozen, `${level} regions the stir could not fold`).toBeLessThanOrEqual(2);
  });
});
