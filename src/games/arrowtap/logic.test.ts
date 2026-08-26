import { describe, it, expect } from "vitest";
import { mulberry32, seedFrom } from "@shared/rng";
import {
  DIRS,
  LEVELS,
  LEVEL_IDS,
  canLeave,
  deal,
  hasMove,
  isSolved,
  newGame,
  scoreFor,
  tap,
  type ArrowTapState,
  type Dir,
  type LevelId,
} from "./logic";

/**
 * A board written out by hand, one string per row, for the rule tests.
 *
 * `^ v < >` are the four arrows and `.` is an empty cell, so a fixture reads as
 * the picture a child would see — which is the only way a hand-built board is
 * checkable by eye. Anything else throws rather than becoming a null, because a
 * typo silently turning into an empty cell would make the fixture test a
 * different board from the one written down.
 */
const GLYPH: Record<string, Dir | null> = {
  "^": "up",
  v: "down",
  "<": "left",
  ">": "right",
  ".": null,
};

function board(rows: string[]): ArrowTapState {
  const size = rows.length;
  const cells: (Dir | null)[] = [];
  for (const row of rows) {
    if (row.length !== size) throw new Error(`row "${row}" is not ${size} wide`);
    for (const ch of row) {
      if (!(ch in GLYPH)) throw new Error(`"${ch}" is not an arrow or a dot`);
      cells.push(GLYPH[ch]);
    }
  }
  return { size, cells, left: cells.filter((c) => c !== null).length, taps: 0 };
}

const seeded = (label: string) => mulberry32(seedFrom(label));

/** How many arrows this board holds, counted off the grid rather than off `left`. */
function count(s: ArrowTapState): number {
  return s.cells.filter((c) => c !== null).length;
}

describe("the fixture reader", () => {
  // It is a test helper, so a bug in it is a bug in every test below. Two
  // properties: it lays cells out row-major, and it refuses anything it does
  // not understand rather than quietly dropping it.
  it("lays a board out row by row", () => {
    const s = board([">.", ".^"]);
    expect(s.size).toBe(2);
    expect(s.cells).toEqual(["right", null, null, "up"]);
    expect(s.left).toBe(2);
  });

  it("refuses a ragged board and an unknown glyph", () => {
    expect(() => board([">..", ".^"])).toThrow();
    expect(() => board(["x.", ".."])).toThrow();
  });
});

describe("when an arrow can leave", () => {
  it("leaves when everything between it and its edge is empty", () => {
    // The up arrow at the bottom right has one empty cell above it.
    expect(canLeave(board(["..", ".^"]), 3)).toBe(true);
  });

  it("leaves from the edge it points at, with nothing in the way at all", () => {
    // An arrow ON the edge it points at has a path of zero cells, which is
    // vacuously clear — so a top-row up arrow always goes, however full the
    // rest of the board is.
    const s = board(["^^^", "vvv", "<<<"]);
    expect(canLeave(s, 0)).toBe(true);
    expect(canLeave(s, 1)).toBe(true);
    expect(canLeave(s, 2)).toBe(true);
  });

  it("is blocked by any arrow on the path, however far away", () => {
    // The up arrow at the bottom of column 0 has an arrow two cells above it.
    expect(canLeave(board(["v..", "...", "^.."]), 6)).toBe(false);
    // ...and is fine once that cell is empty.
    expect(canLeave(board(["...", "...", "^.."]), 6)).toBe(true);
  });

  it("only looks along the direction the arrow points", () => {
    // Blocked to the left, wide open to the right: a right arrow goes.
    const s = board(["v>.", "...", "..."]);
    expect(canLeave(s, 1)).toBe(true);
    // The same board with the arrow turned around cannot.
    expect(canLeave(board(["v<.", "...", "..."]), 1)).toBe(false);
  });

  it("says no for an empty cell", () => {
    expect(canLeave(board([".>", ".."]), 0)).toBe(false);
  });

  // A restored position can hand these rules an index that no longer exists.
  // Answering "no" beats throwing inside a tap handler.
  it("says no for an index that is not on the board", () => {
    const s = board([">.", ".."]);
    expect(canLeave(s, 9)).toBe(false);
    expect(canLeave(s, -1)).toBe(false);
    expect(canLeave(s, 1.5)).toBe(false);
    expect(canLeave(s, NaN)).toBe(false);
  });
});

describe("tapping", () => {
  it("flies the arrow off and says which way it went", () => {
    const r = tap(board(["..", ".>"]), 3);
    expect(r.outcome).toEqual({ kind: "flew", cell: 3, dir: "right" });
    expect(r.state.cells[3]).toBeNull();
    expect(r.state.left).toBe(0);
    expect(r.state.taps).toBe(1);
  });

  it("refuses a blocked arrow and changes nothing at all", () => {
    const before = board(["v..", "...", "^.."]);
    const r = tap(before, 6);
    expect(r.outcome).toEqual({ kind: "refused", cell: 6 });
    // The SAME object, not an equal one: there is nothing for the renderer to
    // repaint, which is what lets it shake the cell and return.
    expect(r.state).toBe(before);
  });

  it("ignores an empty cell and an index off the board", () => {
    const before = board([">.", ".."]);
    expect(tap(before, 1).outcome).toEqual({ kind: "ignored" });
    expect(tap(before, 1).state).toBe(before);
    expect(tap(before, 99).outcome).toEqual({ kind: "ignored" });
    expect(tap(before, -3).outcome).toEqual({ kind: "ignored" });
  });

  /**
   * A refused tap is not a mistake, so it is not a tap.
   *
   * The record this game keeps is a TIME rather than a count, so nothing here
   * is scored on `taps` today. It is still counted honestly, because the moment
   * anything reads it — a stat, a milestone, a future record — a counter that
   * went up on every reasonable guess would be a measure of how often a
   * five-year-old guesses wrong.
   */
  it("counts only arrows that actually flew", () => {
    // Column 0 holds a down arrow above an up arrow, so each blocks the other;
    // the right arrow at the top right is the one thing that can move.
    let s = board(["v.>", "...", "^.."]);
    s = tap(s, 6).state; // refused — the down arrow is in the way
    s = tap(s, 0).state; // refused — the up arrow is in the way
    s = tap(s, 4).state; // ignored — an empty cell
    s = tap(s, 99).state; // ignored — not on the board
    expect(s.taps).toBe(0);

    // ...and the counter is not simply stuck: a legal tap moves it.
    s = tap(s, 2).state;
    expect(s.taps).toBe(1);
    expect(s.left).toBe(2);
  });

  it("never mutates the state it was handed", () => {
    const before = board([">.", ".."]);
    const snapshot = JSON.stringify(before);
    tap(before, 0);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it("keeps `left` in step with the grid, tap after tap", () => {
    // `left` is what the chrome draws, and the session validator refuses a
    // snapshot where it disagrees with the cells — so the two must never part.
    let s = board(["^^", "^^"]);
    for (const cell of [0, 1, 2, 3]) {
      s = tap(s, cell).state;
      expect(s.left).toBe(count(s));
    }
    expect(s.left).toBe(0);
  });
});

describe("solved, and dead", () => {
  it("is solved when the grid is empty", () => {
    expect(isSolved(board(["..", ".."]))).toBe(true);
    expect(isSolved(board([".>", ".."]))).toBe(false);
  });

  /**
   * A board with arrows and no legal tap is DEAD. The renderer asks `hasMove`
   * so it can offer a fresh board rather than leave a child tapping a grid
   * that has stopped answering. Whether a DEALT board can ever get here is a
   * separate question, and the two tests further down answer it.
   */
  it("knows a board where nothing can move", () => {
    // Four arrows pointing at each other around the middle of a 3x3: each one
    // has exactly one arrow between it and its edge.
    const ring = board([".v.", ">.<", ".^."]);
    expect(isSolved(ring)).toBe(false);
    expect(hasMove(ring)).toBe(false);
    for (let i = 0; i < 9; i++) expect(canLeave(ring, i)).toBe(false);
  });

  it("knows a board where something can", () => {
    expect(hasMove(board([".v.", ">.<", "..."]))).toBe(true);
  });

  it("says a solved board has no move, which is why the renderer asks both", () => {
    // `hasMove` alone cannot tell "finished" from "stuck" — the renderer must
    // check `isSolved` first, and this pins the reason.
    expect(hasMove(board(["..", ".."]))).toBe(false);
    expect(isSolved(board(["..", ".."]))).toBe(true);
  });

  /**
   * A DEALT board cannot be stranded, and that is a property of the rules
   * rather than of the deal.
   *
   * The brief this game was built to assumed a player could tap themselves
   * into a dead board, and the rules make it impossible: a tap only ever
   * EMPTIES a cell, and an empty cell can never block anything. So every path
   * that was clear stays clear, the set of legal taps only grows, and a
   * solution that existed at the deal still exists after any legal tap — take
   * the original solving order and skip the arrow that already left, and every
   * remaining step meets a board that is a subset of the one it met before.
   *
   * This is the mechanised half of that argument: play RANDOMLY, all the way
   * down, on real deals at every tier. A single stranded run fails it.
   */
  it("random play clears a dealt board, whatever order it picks", () => {
    for (const level of LEVEL_IDS) {
      for (let i = 0; i < 20; i++) {
        const rng = seeded(`arrowtap-random-${level}-${i}`);
        let s = newGame(level, seeded(`arrowtap-random-board-${level}-${i}`));
        const dealt = s.left;
        let guard = dealt + 1;
        while (!isSolved(s)) {
          const legal = s.cells.map((_, k) => k).filter((k) => canLeave(s, k));
          expect(legal.length, `${level} #${i} stranded with ${s.left} arrows left`).toBeGreaterThan(0);
          s = tap(s, legal[Math.floor(rng() * legal.length)]).state;
          // Every iteration removes exactly one arrow, so this can only fire if
          // a tap stopped doing that — which would otherwise spin forever.
          expect(--guard, `${level} #${i} looped without clearing`).toBeGreaterThan(0);
        }
        expect(s.taps).toBe(dealt);
      }
    }
  });

  /**
   * So why does `hasMove` exist at all?
   *
   * Because "the deal cannot produce one" is not "the renderer can never be
   * handed one". A session snapshot arrives off a disk that a person can edit,
   * and the validator checks the snapshot's SHAPE rather than its solvability
   * — deliberately, because deciding solvability is the search below and it
   * does not belong in a load path. A board that stopped answering is a real
   * state to render, and the honest answer to it is a quiet offer of a fresh
   * board rather than a child tapping a grid forever.
   */
  it("catches a dead board a snapshot could still carry", () => {
    const ring = board([".v.", ">.<", ".^."]);
    expect(isSolved(ring)).toBe(false);
    expect(hasMove(ring)).toBe(false);
  });
});

describe("the level table", () => {
  it("lists exactly the levels it specifies", () => {
    expect([...LEVEL_IDS].sort()).toEqual(Object.keys(LEVELS).sort());
  });

  it("asks for fewer arrows than the grid has cells", () => {
    // The last arrow placed needs a clear line out, and a completely full grid
    // has none anywhere except along an edge — so a level asking for
    // `size * size` could never be dealt in full and would silently deal short.
    for (const level of LEVEL_IDS as readonly LevelId[]) {
      const { size, arrows } = LEVELS[level];
      expect(arrows).toBeGreaterThan(0);
      expect(arrows).toBeLessThan(size * size);
    }
  });
});

describe("the deal", () => {
  it.each(LEVEL_IDS)("%s has the grid and the arrows its level asks for", (level) => {
    const L = LEVELS[level];
    const s = newGame(level, seeded(`arrowtap-shape-${level}`));
    expect(s.size).toBe(L.size);
    expect(s.cells).toHaveLength(L.size * L.size);
    expect(s.taps).toBe(0);
    expect(s.left).toBe(count(s));
    // The bound in `deal` means "at most", never "exactly", and the tiers are
    // measured to reach their target every time — so a deal that came up short
    // is a finding rather than an expected outcome.
    expect(s.left).toBe(L.arrows);
    for (const c of s.cells) {
      if (c !== null) expect(DIRS).toContain(c);
    }
  });

  it.each(LEVEL_IDS)("%s deals a puzzle rather than a finished board", (level) => {
    for (let i = 0; i < 25; i++) {
      const s = newGame(level, seeded(`arrowtap-mixed-${level}-${i}`));
      expect(isSolved(s)).toBe(false);
      expect(s.left).toBeGreaterThan(0);
    }
  });

  it.each(LEVEL_IDS)("%s deals a board with a move already available", (level) => {
    // Guaranteed by construction — the LAST arrow placed had a clear line at
    // the moment it landed and nothing has been added since — but a deal that
    // opened dead would be indistinguishable from a hard one to the child
    // looking at it, so it is asserted rather than argued.
    for (let i = 0; i < 25; i++) {
      expect(hasMove(newGame(level, seeded(`arrowtap-open-${level}-${i}`)))).toBe(true);
    }
  });

  it("replays a seed exactly, and two seeds differ", () => {
    const a = newGame("medium", seeded("arrowtap-seed-a"));
    const b = newGame("medium", seeded("arrowtap-seed-a"));
    const c = newGame("medium", seeded("arrowtap-seed-b"));
    expect(a.cells).toEqual(b.cells);
    expect(a.cells).not.toEqual(c.cells);
  });

  it("replays a seeded PLAN exactly too", () => {
    // The plan is what the solvability test replays, so it has to be as
    // reproducible as the board — a plan that drifted between two runs of one
    // seed would make a failure below impossible to look at twice.
    expect(deal("hard", seeded("arrowtap-plan-seed")).plan).toEqual(
      deal("hard", seeded("arrowtap-plan-seed")).plan,
    );
  });

  it("keeps the plan and the board the same size", () => {
    for (const level of LEVEL_IDS) {
      const { state, plan } = deal(level, seeded(`arrowtap-planlen-${level}`));
      expect(plan).toHaveLength(state.left);
      // Every cell in the plan holds an arrow, and no cell appears twice: the
      // plan is a permutation of the occupied cells, which is what makes
      // "replay it and the board is empty" a meaningful claim.
      expect(new Set(plan).size).toBe(plan.length);
      for (const cell of plan) expect(state.cells[cell]).not.toBeNull();
    }
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
 * It is built BACKWARDS from the empty board instead: every arrow is placed on
 * a cell whose exit path was clear at that moment, so removing them in reverse
 * order walks back through exactly those states and every step is a legal tap.
 *
 * Two tests, because they can fail for different reasons:
 *
 *  - the first replays the plan the generator recorded, through `canLeave` and
 *    `tap` — the shipped rules, not a restatement of them. It covers every
 *    tier, and it fails if the construction argument is wrong anywhere.
 *  - the second ignores that plan completely and searches for a solution from
 *    scratch. It is the independent half: it would still pass if the recorded
 *    plan were garbage, and it is what proves the board is genuinely solvable
 *    rather than merely accompanied by a consistent-looking list.
 */
describe("every board it deals can be finished", () => {
  it.each(LEVEL_IDS)("%s: the plan it recorded is legal, tap for tap", (level) => {
    for (let i = 0; i < 40; i++) {
      const { state, plan } = deal(level, seeded(`arrowtap-replay-${level}-${i}`));
      expect(plan.length, `${level} #${i} dealt an empty plan`).toBeGreaterThan(0);

      let s = state;
      plan.forEach((cell, step) => {
        const where = `${level} #${i} step ${step}`;
        expect(canLeave(s, cell), `${where}: cell ${cell} cannot leave`).toBe(true);
        const r = tap(s, cell);
        expect(r.outcome.kind, `${where}: the rules refused it`).toBe("flew");
        s = r.state;
      });
      expect(isSolved(s), `${level} #${i} ended unsolved`).toBe(true);
      expect(s.taps, `${level} #${i} counted the wrong number of taps`).toBe(plan.length);
    }
  });

  it.each(LEVEL_IDS)("%s: a search that never saw the plan finds one", (level) => {
    for (let i = 0; i < 12; i++) {
      const s = newGame(level, seeded(`arrowtap-search-${level}-${i}`));
      expect(search(s).solved, `${level} #${i} has no solution`).toBe(true);
    }
  });

  /**
   * The control the test above is worthless without.
   *
   * A search that answered "solvable" to everything would pass every board this
   * generator has dealt and every board it ever could, and it would read
   * exactly like a correct one. So it is shown boards that genuinely cannot be
   * finished and has to say so.
   *
   * The second is the one that matters. The first is stuck on move zero, so
   * "no" there only proves the answer is reachable — a search that never left
   * the start would say it too. The second has a legal tap available and no
   * solution behind it, so `no` can only come from actually exhausting the
   * board, and the state count is asserted to prove it did.
   */
  it("says no to a board that really cannot be finished", () => {
    const ring = search(board([".v.", ">.<", ".^."]));
    expect(ring.solved).toBe(false);
    expect(ring.states).toBe(1);

    // One arrow that can go, and a ring behind it that never can.
    const roomy = search(board([".v..", ">.<.", ".^..", "...>"]));
    expect(roomy.solved).toBe(false);
    expect(roomy.states).toBeGreaterThan(1);
  });
});

describe("what the record measures", () => {
  it("is a time, on a board scoped to the difficulty", () => {
    // Eight arrows on a 4x4 and twenty-two on a 6x6 are not the same
    // achievement, so the record is per level. The unit is declared once, here:
    // only the NUMBER is ever persisted, and `sdk/score.ts` reads the unit to
    // decide that faster is better.
    const s = board(["..", ".."]);
    expect(scoreFor(s, "hard", 12750)).toEqual({ value: 12750, unit: "ms", board: "hard" });
    expect(scoreFor(s, "easy", 0)).toEqual({ value: 0, unit: "ms", board: "easy" });
  });

  it("reports the clock it was handed, never the taps", () => {
    // The two are different numbers and `winMoment.ms` is a DURATION field, so
    // a count reaching either of them is logged as a time. This repo has
    // shipped that twice.
    const played = tap(board([">.", ".."]), 0).state;
    expect(played.taps).toBe(1);
    expect(scoreFor(played, "easy", 8400).value).toBe(8400);
  });

  it("declares one unit for every level", () => {
    for (const level of LEVEL_IDS) {
      expect(scoreFor(board(["."]), level, 1).unit).toBe("ms");
      expect(scoreFor(board(["."]), level, 1).board).toBe(level);
    }
  });
});

/* ------------------------------------------------------------------ helpers */

/** A board's identity for the search, so two orders of the same taps are one state. */
function fingerprint(s: ArrowTapState): string {
  return s.cells.map((c) => c ?? "-").join("");
}

/**
 * Depth-first search for a solution, over the SHIPPED rules — it asks
 * `canLeave` and `tap` rather than restating them, so a bug in either fails
 * this test too.
 *
 * The budget THROWS rather than returning false. "Ran out of nodes" and "this
 * board is impossible" are different findings, and a search that reports the
 * second when it means the first is the exact failure this whole file is about.
 */
function search(start: ArrowTapState, budget = 400_000): { solved: boolean; states: number } {
  const seen = new Set<string>();
  const stack: ArrowTapState[] = [start];
  let nodes = 0;

  while (stack.length) {
    const s = stack.pop()!;
    if (isSolved(s)) return { solved: true, states: nodes };
    if (++nodes > budget) throw new Error(`search budget exhausted after ${nodes} states`);
    const fp = fingerprint(s);
    if (seen.has(fp)) continue;
    seen.add(fp);

    for (let cell = 0; cell < s.cells.length; cell++) {
      if (!canLeave(s, cell)) continue;
      stack.push(tap(s, cell).state);
    }
  }
  return { solved: false, states: nodes };
}
