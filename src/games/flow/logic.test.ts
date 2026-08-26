import { describe, it, expect } from "vitest";
import { mulberry32, seedFrom } from "@shared/rng";
import {
  LEVELS,
  LEVEL_IDS,
  adjacent,
  beginAt,
  cellOwner,
  connectedCount,
  deal,
  endpointAt,
  extendTo,
  isConnected,
  isSolved,
  neighbours,
  newGame,
  release,
  scoreFor,
  type Cell,
  type FlowState,
  type LevelId,
} from "./logic";

/** A board written out by hand, for the rule tests. Nothing is drawn on it yet. */
function board(size: number, endpoints: Array<readonly [Cell, Cell]>): FlowState {
  return { size, endpoints, paths: endpoints.map(() => []), drawing: null, moves: 0 };
}

/** Walk a whole route: touch its first dot, then every cell along it. */
function lay(start: FlowState, route: Cell[]): FlowState {
  let s = beginAt(start, route[0]).state;
  for (const cell of route.slice(1)) s = extendTo(s, cell).state;
  return release(s).state;
}

const seeded = (label: string) => mulberry32(seedFrom(label));

/* ------------------------------------------------------------------ the grid */

describe("the grid — what counts as next door", () => {
  it("joins cells that share an edge", () => {
    // A 5-wide grid: 7 sits at row 1 col 2, so 2 is above and 12 below.
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

  /**
   * The whole reason `adjacent` reads rows and columns rather than comparing
   * indices: 4 and 5 differ by one and sit at opposite edges of a 5-wide grid,
   * so an index comparison would let a pipe leave on the right and come back
   * on the left.
   */
  it("does not wrap around a row edge", () => {
    expect(adjacent(5, 4, 5)).toBe(false);
    expect(adjacent(5, 9, 10)).toBe(false);
  });

  it("refuses anything off the board", () => {
    expect(adjacent(5, 0, -1)).toBe(false);
    expect(adjacent(5, 24, 25)).toBe(false);
    expect(adjacent(5, 0, 1.5)).toBe(false);
  });

  it("lists three neighbours on an edge and two in a corner", () => {
    expect(neighbours(5, 0).sort((a, b) => a - b)).toEqual([1, 5]);
    expect(neighbours(5, 2).sort((a, b) => a - b)).toEqual([1, 3, 7]);
    expect(neighbours(5, 12).sort((a, b) => a - b)).toEqual([7, 11, 13, 17]);
  });
});

/* ------------------------------------------------------------------ reading */

describe("reading the board", () => {
  it("names the colour whose pipe covers a cell, and nobody for bare ground", () => {
    const s = lay(board(5, [[0, 2]]), [0, 1, 2]);
    expect(cellOwner(s, 1)).toBe(0);
    expect(cellOwner(s, 7)).toBeNull();
  });

  // A dot is not covered until a pipe reaches it: the two questions are
  // different, and the renderer draws the dot either way.
  it("names the colour with a dot on a cell, whether or not a pipe is there", () => {
    const s = board(5, [
      [0, 2],
      [10, 14],
    ]);
    expect(endpointAt(s, 0)).toBe(0);
    expect(endpointAt(s, 14)).toBe(1);
    expect(endpointAt(s, 1)).toBeNull();
    expect(cellOwner(s, 0)).toBeNull();
  });

  it("calls a pipe joined only when it reaches both dots", () => {
    const start = board(5, [[0, 2]]);
    expect(isConnected(start, 0)).toBe(false);
    const half = extendTo(beginAt(start, 0).state, 1).state;
    expect(isConnected(half, 0)).toBe(false);
    expect(isConnected(extendTo(half, 2).state, 0)).toBe(true);
  });

  it("counts the joined pipes for the stat row", () => {
    let s = board(5, [
      [0, 2],
      [10, 12],
    ]);
    expect(connectedCount(s)).toBe(0);
    s = lay(s, [0, 1, 2]);
    expect(connectedCount(s)).toBe(1);
    s = lay(s, [10, 11, 12]);
    expect(connectedCount(s)).toBe(2);
  });
});

/* ------------------------------------------------------------------- laying */

describe("starting a pipe", () => {
  it("begins at a dot and puts that dot in hand", () => {
    const r = beginAt(board(5, [[0, 2]]), 0);
    expect(r.outcome).toEqual({ kind: "began", color: 0, cleared: false });
    expect(r.state.drawing).toBe(0);
    expect(r.state.paths[0]).toEqual([0]);
  });

  it("ignores a cell with no dot on it", () => {
    const s = board(5, [[0, 2]]);
    const r = beginAt(s, 7);
    expect(r.outcome.kind).toBe("ignored");
    expect(r.state).toBe(s);
  });

  /**
   * The standard forgiving behaviour, and the reason this game needs no undo
   * button: touching a dot again wipes that colour's route, so a child changes
   * their mind with the same gesture they used to make it.
   */
  it("clears the colour's own route when it starts again", () => {
    const done = lay(board(5, [[0, 2]]), [0, 1, 2]);
    expect(done.paths[0]).toHaveLength(3);
    const again = beginAt(done, 0);
    expect(again.outcome).toEqual({ kind: "began", color: 0, cleared: true });
    expect(again.state.paths[0]).toEqual([0]);
  });

  it("closes whatever route was open before it opens another", () => {
    const s = board(5, [
      [0, 2],
      [10, 12],
    ]);
    const open = extendTo(beginAt(s, 0).state, 1).state;
    expect(open.moves).toBe(0);
    const next = beginAt(open, 10).state;
    expect(next.drawing).toBe(1);
    // The half-laid red route stays on the board and is counted, exactly as if
    // the finger had lifted.
    expect(next.paths[0]).toEqual([0, 1]);
    expect(next.moves).toBe(1);
  });
});

describe("extending a pipe", () => {
  const two = () =>
    board(5, [
      [0, 4],
      [10, 14],
    ]);

  it("steps into an adjacent empty cell", () => {
    const r = extendTo(beginAt(two(), 0).state, 1);
    expect(r.outcome).toEqual({ kind: "extended", color: 0, cell: 1, cut: null });
    expect(r.state.paths[0]).toEqual([0, 1]);
  });

  it("ignores a cell that is not next door", () => {
    const held = beginAt(two(), 0).state;
    const r = extendTo(held, 3);
    expect(r.outcome.kind).toBe("ignored");
    expect(r.state).toBe(held);
  });

  it("ignores anything at all when no route is open", () => {
    const s = two();
    expect(extendTo(s, 1).outcome.kind).toBe("ignored");
    expect(extendTo(s, 1).state).toBe(s);
  });

  it("retracts when the finger comes back to the cell before", () => {
    const s = extendTo(extendTo(beginAt(two(), 0).state, 1).state, 2).state;
    expect(s.paths[0]).toEqual([0, 1, 2]);
    const back = extendTo(s, 1);
    expect(back.outcome).toEqual({ kind: "retracted", color: 0, to: 1 });
    expect(back.state.paths[0]).toEqual([0, 1]);
  });

  /**
   * A route that loops back onto itself anywhere retracts to the cell touched,
   * not just to the previous one — same line of code, and it is what stops a
   * pipe crossing itself.
   */
  it("retracts to a cell further back when the route loops round", () => {
    // 0 -> 1 -> 6 -> 5, and 5 is next door to 0.
    let s = beginAt(two(), 0).state;
    for (const c of [1, 6, 5]) s = extendTo(s, c).state;
    expect(s.paths[0]).toEqual([0, 1, 6, 5]);
    const looped = extendTo(s, 0);
    expect(looped.outcome).toEqual({ kind: "retracted", color: 0, to: 0 });
    expect(looped.state.paths[0]).toEqual([0]);
  });

  /**
   * Cutting rather than refusing. Refusing would make a crowded board feel
   * locked and force a child to go and dismantle the other route first, which
   * is two ideas where there should be none.
   */
  it("cuts another colour's pipe back to just before the collision", () => {
    let s = lay(two(), [10, 11, 12, 13, 14]);
    expect(s.paths[1]).toEqual([10, 11, 12, 13, 14]);
    // 0 -> 1 -> 2 -> 7 -> 12, and 12 is the third cell of the other route.
    s = beginAt(s, 0).state;
    for (const c of [1, 2, 7]) s = extendTo(s, c).state;
    const cut = extendTo(s, 12);
    expect(cut.outcome).toEqual({ kind: "extended", color: 0, cell: 12, cut: 1 });
    expect(cut.state.paths[1]).toEqual([10, 11]);
    expect(cut.state.paths[0]).toEqual([0, 1, 2, 7, 12]);
  });

  it("drops a cut route entirely when only its dot would survive", () => {
    // Cutting at the SECOND cell leaves [10], which is that colour's dot on its
    // own — a stub that draws as a pipe going nowhere, so it goes rather than
    // sitting on the board pretending to be a route.
    let s = lay(two(), [10, 11, 12, 13, 14]);
    s = beginAt(s, 0).state;
    for (const c of [5, 6]) s = extendTo(s, c).state;
    const cut = extendTo(s, 11);
    expect(cut.outcome).toEqual({ kind: "extended", color: 0, cell: 11, cut: 1 });
    expect(cut.state.paths[1]).toEqual([]);
  });

  /**
   * Another pair's dot is a wall. The deal never routes one segment through
   * another segment's end, so allowing it would open routes the construction
   * never promised to leave room for.
   */
  it("ignores another colour's dot", () => {
    const s = extendTo(beginAt(two(), 0).state, 5).state;
    const r = extendTo(s, 10);
    expect(r.outcome.kind).toBe("ignored");
    expect(r.state).toBe(s);
  });

  it("joins the pipe when it reaches its matching dot", () => {
    let s = beginAt(two(), 0).state;
    for (const c of [1, 2, 3]) s = extendTo(s, c).state;
    const done = extendTo(s, 4);
    expect(done.outcome).toEqual({ kind: "completed", color: 0 });
    expect(isConnected(done.state, 0)).toBe(true);
  });

  it("will not draw on past a joined pipe, but will still take it back", () => {
    let s = beginAt(two(), 0).state;
    for (const c of [1, 2, 3, 4]) s = extendTo(s, c).state;
    // 9 is below 4 and empty, and the head is sitting on the far dot.
    expect(extendTo(s, 9).outcome.kind).toBe("ignored");
    // Retraction is checked first on purpose, or a joined pipe would be frozen.
    expect(extendTo(s, 3).outcome.kind).toBe("retracted");
  });

  // A restored position can hand these rules an index this board no longer has,
  // and a thrown error inside a tap handler costs a child the board.
  it("ignores an index that is not on the board rather than throwing", () => {
    const held = beginAt(two(), 0).state;
    for (const bad of [-1, 25, 999, 1.5, Number.NaN]) {
      expect(() => extendTo(held, bad)).not.toThrow();
      expect(extendTo(held, bad).outcome.kind, `extendTo ${bad}`).toBe("ignored");
      expect(() => beginAt(held, bad)).not.toThrow();
      expect(beginAt(held, bad).outcome.kind, `beginAt ${bad}`).toBe("ignored");
    }
  });

  it("never mutates the state it was handed", () => {
    const before = beginAt(two(), 0).state;
    const snapshot = JSON.stringify(before);
    extendTo(before, 1);
    extendTo(before, 5);
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

/* ------------------------------------------------------------------- moves */

describe("what a move is", () => {
  /**
   * One route is one move however it was laid, so the record measures ROUTE
   * QUALITY rather than finger travel. A drag and eight taps produce the same
   * number, which is the only way a record can mean the same thing to a child
   * who drags and a child who cannot.
   */
  it("counts one per route, not one per cell", () => {
    let s = board(5, [
      [0, 4],
      [10, 14],
    ]);
    s = lay(s, [0, 1, 2, 3, 4]);
    expect(s.moves).toBe(1);
    s = lay(s, [10, 11, 12, 13, 14]);
    expect(s.moves).toBe(2);
  });

  it("costs nothing to take a route back", () => {
    // Touching a dot and letting go clears that colour and leaves the board a
    // move behind rather than a move ahead — changing your mind must never be
    // a penalty, for the reason undo is free in every other game here.
    const done = lay(board(5, [[0, 2]]), [0, 1, 2]);
    expect(done.moves).toBe(1);
    const cleared = release(beginAt(done, 0).state).state;
    expect(cleared.paths[0]).toEqual([]);
    expect(cleared.moves).toBe(1);
  });

  it("ignores a release when no route is open", () => {
    const s = board(5, [[0, 2]]);
    const r = release(s);
    expect(r.outcome.kind).toBe("ignored");
    expect(r.state).toBe(s);
    expect(r.state.moves).toBe(0);
  });

  it("lets go of the route it closed", () => {
    const s = release(extendTo(beginAt(board(5, [[0, 2]]), 0).state, 1).state);
    expect(s.state.drawing).toBeNull();
    expect(s.outcome).toEqual({ kind: "released", color: 0, counted: true });
  });
});

/* ------------------------------------------------------------------ solved */

describe("solved", () => {
  /**
   * BOTH halves, and the second is the one that is easy to leave out. Joining
   * alone would win on a board full of holes, and the deal cut a walk that
   * visited every cell — so a win with a hole in it is not the solution the
   * board was built from.
   */
  it("wants every pipe joined AND every square covered", () => {
    // A 2x2 with two pairs, whose four cells are exactly the two routes.
    let s = board(2, [
      [0, 1],
      [2, 3],
    ]);
    expect(isSolved(s)).toBe(false);
    s = lay(s, [0, 1]);
    expect(isSolved(s)).toBe(false); // joined, and half the board is bare
    s = lay(s, [2, 3]);
    expect(isSolved(s)).toBe(true);
  });

  it("is not won by joining every pair while a square stays empty", () => {
    // 1x3 of pipe on a 5-wide board: joined, and 22 cells untouched.
    const s = lay(board(5, [[0, 2]]), [0, 1, 2]);
    expect(connectedCount(s)).toBe(1);
    expect(isSolved(s)).toBe(false);
  });

  it("is not won by covering the board with a pipe that never reaches its dot", () => {
    let s = board(2, [
      [0, 3],
      [1, 2],
    ]);
    // Colour 0 wanders 0 -> 1 -> 3 and colour 1 is never drawn, so every cell
    // that IS covered is covered by a route that does not join its own pair.
    s = lay(s, [0, 1]);
    expect(isSolved(s)).toBe(false);
  });
});

/* ------------------------------------------------------------------- deals */

describe("the deal", () => {
  it.each(LEVEL_IDS)("%s has the grid and the pairs its level asks for", (level) => {
    const L = LEVELS[level];
    const s = newGame(level, seeded(`flow-shape-${level}`));
    expect(s.size).toBe(L.size);
    expect(s.endpoints).toHaveLength(L.pairs);
    expect(s.paths).toHaveLength(L.pairs);
    expect(s.paths.every((p) => p.length === 0)).toBe(true);
    expect(s.drawing).toBeNull();
    expect(s.moves).toBe(0);

    // Every dot on the board is a different cell: two colours sharing one would
    // render as a single circle a child can start two pipes from.
    const dots = s.endpoints.flatMap(([a, b]) => [a, b]);
    expect(new Set(dots).size).toBe(dots.length);
    for (const cell of dots) {
      expect(Number.isInteger(cell)).toBe(true);
      expect(cell).toBeGreaterThanOrEqual(0);
      expect(cell).toBeLessThan(L.size * L.size);
    }
  });

  it.each(LEVEL_IDS)("%s deals a puzzle rather than a finished board", (level) => {
    for (let i = 0; i < 25; i++) {
      const s = newGame(level, seeded(`flow-fresh-${level}-${i}`));
      expect(isSolved(s)).toBe(false);
      expect(connectedCount(s)).toBe(0);
    }
  });

  it("replays a seed exactly, and two seeds differ", () => {
    const a = newGame("medium", seeded("flow-seed-a"));
    const b = newGame("medium", seeded("flow-seed-a"));
    const c = newGame("medium", seeded("flow-seed-b"));
    expect(a.endpoints).toEqual(b.endpoints);
    expect(a.endpoints).not.toEqual(c.endpoints);
  });

  it("deals a different board most of the time", () => {
    // Not a determinism test — a guard on the fallback. The boustrophedon walk
    // is deterministic, so a search that never succeeded would deal one board
    // per level forever and every assertion above would still pass.
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      seen.add(JSON.stringify(newGame("hard", seeded(`flow-variety-${i}`)).endpoints));
    }
    expect(seen.size).toBeGreaterThan(15);
  });
});

/**
 * SOLVABILITY — the one property this generator exists to guarantee.
 *
 * A child cannot tell an unsolvable puzzle from a hard one. They keep trying,
 * and the game is the thing that lied. So the board is never scattered and
 * hoped over, and it is never filtered by a solver either — a solver that gives
 * up under a node cap reports "no solution found", which is the same answer for
 * a board that has none and a board that is merely deep, and shipping the first
 * reading of that is how an impossible board reaches a five-year-old.
 *
 * It is cut out of a walk over every cell of the grid instead, and the two
 * tests below fail for different reasons:
 *
 *  - the first replays the routes the generator recorded, through `beginAt`,
 *    `extendTo` and `release` — the shipped rules, not a restatement of them.
 *    It covers every tier, and it fails if the construction argument is wrong
 *    anywhere.
 *  - the second ignores the shipped rules completely and checks the PARTITION
 *    itself: contiguous, disjoint, covering, ending on the right dots. That is
 *    the independent half — it would still pass if `extendTo` were broken, and
 *    it is what says the plan is a genuine solution rather than a list the
 *    engine happens to agree with.
 */
describe("every board it deals can be finished", () => {
  it.each(LEVEL_IDS)("%s: the plan it recorded is legal, cell for cell", (level) => {
    for (let i = 0; i < 30; i++) {
      const { state, plan } = deal(level, seeded(`flow-plan-${level}-${i}`));
      expect(plan, `${level} #${i} dealt no plan`).toHaveLength(LEVELS[level].pairs);

      let s = state;
      plan.forEach((route, color) => {
        const where = `${level} #${i} colour ${color}`;
        const begun = beginAt(s, route[0]);
        expect(begun.outcome, `${where}: did not begin at a dot`).toEqual({
          kind: "began",
          color,
          cleared: false,
        });
        s = begun.state;

        route.slice(1).forEach((cell, step) => {
          const r = extendTo(s, cell);
          const last = step === route.length - 2;
          expect(r.outcome.kind, `${where} step ${step}`).toBe(last ? "completed" : "extended");
          // Nothing may ever be cut while the plan is being laid: the routes
          // partition the walk, so a cut here would mean two of them overlap
          // and the construction argument is wrong.
          if (r.outcome.kind === "extended") {
            expect(r.outcome.cut, `${where} step ${step} cut another route`).toBeNull();
          }
          s = r.state;
        });
        s = release(s).state;
      });

      expect(isSolved(s), `${level} #${i} ended unsolved`).toBe(true);
      // One move per route, laid perfectly: the best score this board allows.
      expect(s.moves).toBe(LEVELS[level].pairs);
    }
  });

  it.each(LEVEL_IDS)("%s: the routes it recorded partition the whole grid", (level) => {
    const L = LEVELS[level];
    for (let i = 0; i < 30; i++) {
      const { state, plan } = deal(level, seeded(`flow-partition-${level}-${i}`));
      const seen = new Set<Cell>();
      plan.forEach((route, color) => {
        const where = `${level} #${i} colour ${color}`;
        expect(route.length, `${where}: too short to be a route`).toBeGreaterThanOrEqual(3);
        expect(route[0], `${where}: does not start on its dot`).toBe(state.endpoints[color][0]);
        expect(route[route.length - 1], `${where}: does not end on its dot`).toBe(
          state.endpoints[color][1],
        );
        // The two dots of a pair are never neighbours, so no pair is a single
        // obvious hop that leaves the cells it should have covered stranded.
        expect(
          adjacent(L.size, route[0], route[route.length - 1]),
          `${where}: its two dots are side by side`,
        ).toBe(false);
        route.forEach((cell, step) => {
          expect(seen.has(cell), `${where}: cell ${cell} is on two routes`).toBe(false);
          seen.add(cell);
          if (step > 0) {
            expect(adjacent(L.size, route[step - 1], cell), `${where} step ${step}`).toBe(true);
          }
        });
      });
      expect(seen.size, `${level} #${i} leaves the grid uncovered`).toBe(L.size * L.size);
    }
  });

  /**
   * The control the two tests above are worth less without.
   *
   * They assert that a real deal has these properties. Neither says the checks
   * could ever have FAILED — a partition test that never rejects anything reads
   * exactly like a correct one. So here is a board that genuinely is not a
   * partition, and it has to be caught.
   */
  it("and a board that is not a partition is caught", () => {
    // Two routes over the same cell, on a grid neither of them covers.
    let s = board(3, [
      [0, 2],
      [3, 5],
    ]);
    s = lay(s, [0, 1, 2]);
    // Colour 1 is driven straight through colour 0's middle cell, which cuts it.
    s = lay(s, [3, 4, 1]);
    expect(isConnected(s, 0)).toBe(false);
    expect(isSolved(s)).toBe(false);
  });
});

/* ------------------------------------------------------------------- score */

describe("what the record measures", () => {
  it("is moves, on a board scoped to the difficulty", () => {
    // Eleven routes on a 5x5 and eleven on a 7x7 are not the same achievement,
    // so the record is per level. The unit is declared once, here: only the
    // NUMBER is ever persisted, and `sdk/score.ts` reads the unit to decide
    // that fewer is better.
    const s = lay(board(5, [[0, 2]]), [0, 1, 2]);
    expect(scoreFor(s, "hard")).toEqual({ value: 1, unit: "moves", board: "hard" });
    expect(scoreFor(board(5, [[0, 2]]), "easy")).toEqual({
      value: 0,
      unit: "moves",
      board: "easy",
    });
  });

  it.each(LEVEL_IDS)("%s: a perfect run scores one per pair", (level: LevelId) => {
    const { state, plan } = deal(level, seeded(`flow-score-${level}`));
    let s = state;
    for (const route of plan) s = lay(s, route);
    expect(isSolved(s)).toBe(true);
    expect(scoreFor(s, level)).toEqual({
      value: LEVELS[level].pairs,
      unit: "moves",
      board: level,
    });
  });
});
