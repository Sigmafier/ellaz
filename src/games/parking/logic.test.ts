import { describe, it, expect } from "vitest";
import { mulberry32, seedFrom } from "@shared/rng";
import {
  EXIT_ROW,
  LEVELS,
  LEVEL_IDS,
  SIZE,
  axisPos,
  blockers,
  canMoveTo,
  deal,
  isSolved,
  newGame,
  occupancy,
  reach,
  reachableCells,
  scoreFor,
  slide,
  solutionDepth,
  tap,
  undo,
  type Car,
  type ParkingState,
} from "./logic";

/** A board written out by hand for the rule tests. `cars[0]` is the player's. */
function board(cars: Car[]): ParkingState {
  return {
    size: SIZE,
    exitRow: EXIT_ROW,
    cars: cars.map((c, i) => ({ ...c, id: i })),
    selected: null,
    moves: 0,
    history: [],
  };
}

/** The player's car, always horizontal, always two long, always on the exit row. */
function player(col: number): Car {
  return { id: 0, axis: "h", len: 2, row: EXIT_ROW, col };
}

const cell = (row: number, col: number) => row * SIZE + col;
const seeded = (label: string) => mulberry32(seedFrom(label));

describe("who is standing where", () => {
  it("paints every cell a car covers and nothing else", () => {
    const s = board([player(0), { id: 1, axis: "v", len: 3, row: 1, col: 4 }]);
    const grid = occupancy(s);
    expect(grid[cell(EXIT_ROW, 0)]).toBe(0);
    expect(grid[cell(EXIT_ROW, 1)]).toBe(0);
    expect(grid[cell(EXIT_ROW, 2)]).toBeNull();
    expect(grid[cell(1, 4)]).toBe(1);
    expect(grid[cell(2, 4)]).toBe(1);
    expect(grid[cell(3, 4)]).toBe(1);
    expect(grid[cell(4, 4)]).toBeNull();
    expect(grid).toHaveLength(SIZE * SIZE);
  });

  // A restored snapshot can carry a car hanging off the edge. Writing past the
  // end would grow the array in silence, turning a corrupt save into a wrong
  // board rather than a rejected one.
  it("drops a cell that is off the board instead of growing the grid", () => {
    const s = board([player(0), { id: 1, axis: "h", len: 3, row: 5, col: 4 }]);
    expect(occupancy(s)).toHaveLength(SIZE * SIZE);
    expect(occupancy(s)[cell(5, 5)]).toBe(1);
  });
});

describe("what makes a slide legal", () => {
  it("lets a car cross empty tarmac in its own axis", () => {
    const s = board([player(0)]);
    expect(canMoveTo(s, 0, 1)).toBe(true);
    expect(canMoveTo(s, 0, 4)).toBe(true);
  });

  it("refuses a slide off the edge of the park", () => {
    const s = board([player(0)]);
    expect(canMoveTo(s, 0, -1)).toBe(false);
    expect(canMoveTo(s, 0, 5)).toBe(false);
  });

  it("refuses a slide through another car, however far past it the target is", () => {
    const s = board([player(0), { id: 1, axis: "v", len: 2, row: 2, col: 3 }]);
    expect(canMoveTo(s, 0, 1)).toBe(true); // up to col 2, still clear
    expect(canMoveTo(s, 0, 2)).toBe(false); // col 3 is taken
    expect(canMoveTo(s, 0, 3)).toBe(false); // and it cannot be jumped
  });

  it("keeps a car on its own axis by construction", () => {
    // A vertical car's offsets are rows; there is no offset that moves it
    // sideways, so a blocked column is a wall it can never go around.
    const s = board([player(0), { id: 1, axis: "v", len: 2, row: 0, col: 3 }]);
    expect(canMoveTo(s, 1, 1)).toBe(true);
    expect(canMoveTo(s, 1, 4)).toBe(true);
    expect(canMoveTo(s, 1, 5)).toBe(false);
  });

  it("refuses a zero offset, a fractional one, and a car that is not there", () => {
    const s = board([player(0)]);
    expect(canMoveTo(s, 0, 0)).toBe(false);
    expect(canMoveTo(s, 0, 1.5)).toBe(false);
    expect(canMoveTo(s, 9, 1)).toBe(false);
    expect(canMoveTo(s, -1, 1)).toBe(false);
  });
});

describe("sliding", () => {
  it("moves the car and counts the move", () => {
    const s = slide(board([player(0)]), 0, 3);
    expect(s.cars[0].col).toBe(3);
    expect(s.moves).toBe(1);
    expect(s.history).toEqual([{ car: 0, from: 0, to: 3 }]);
  });

  it("records the position in the car's OWN axis", () => {
    const s = slide(board([player(0), { id: 1, axis: "v", len: 2, row: 0, col: 5 }]), 1, 2);
    expect(s.cars[1].row).toBe(2);
    expect(s.cars[1].col).toBe(5);
    expect(s.history[0]).toEqual({ car: 1, from: 0, to: 2 });
  });

  it("returns the same object on an illegal slide, so nothing counts", () => {
    const before = board([player(0), { id: 1, axis: "v", len: 2, row: 2, col: 2 }]);
    expect(slide(before, 0, 2)).toBe(before);
  });

  it("never mutates the state it was handed", () => {
    const before = board([player(1)]);
    const snapshot = JSON.stringify(before);
    slide(before, 0, 2);
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe("tapping — pick up, slide, put down", () => {
  it("ignores a tap on empty tarmac when nothing is held", () => {
    const r = tap(board([player(0)]), cell(0, 0));
    expect(r.outcome.kind).toBe("ignored");
    expect(r.state.selected).toBeNull();
  });

  it("picks a car up on the first tap and slides it on the second", () => {
    let r = tap(board([player(0)]), cell(EXIT_ROW, 1));
    expect(r.outcome).toEqual({ kind: "picked", car: 0 });
    expect(r.state.selected).toBe(0);

    r = tap(r.state, cell(EXIT_ROW, 4));
    expect(r.outcome).toEqual({ kind: "moved", move: { car: 0, from: 0, to: 3 } });
    expect(r.state.cars[0].col).toBe(3);
    expect(r.state.selected).toBeNull();
    expect(r.state.moves).toBe(1);
  });

  // The tapped cell is where the car's NEAREST END lands, so a tap behind a car
  // pulls it back rather than pushing its far end there.
  it("lands the near end on the tapped cell when the tap is behind the car", () => {
    const held = tap(board([player(3)]), cell(EXIT_ROW, 3)).state;
    const r = tap(held, cell(EXIT_ROW, 1));
    expect(r.outcome).toEqual({ kind: "moved", move: { car: 0, from: 3, to: 1 } });
    expect(r.state.cars[0].col).toBe(1);
  });

  it("puts the car down when its own cell is tapped again", () => {
    const held = tap(board([player(0)]), cell(EXIT_ROW, 0)).state;
    const r = tap(held, cell(EXIT_ROW, 1));
    expect(r.outcome).toEqual({ kind: "cancelled", car: 0 });
    expect(r.state.selected).toBeNull();
    expect(r.state.moves).toBe(0);
  });

  // A child who changes their mind about which car is in the way is not making
  // a mistake, and making them put the first one down first is a tap spent on
  // bookkeeping.
  it("picks up a different car instead of refusing", () => {
    const s = board([player(0), { id: 1, axis: "v", len: 2, row: 0, col: 4 }]);
    const held = tap(s, cell(EXIT_ROW, 0)).state;
    const r = tap(held, cell(0, 4));
    expect(r.outcome).toEqual({ kind: "picked", car: 1 });
    expect(r.state.selected).toBe(1);
    expect(r.state.moves).toBe(0);
  });

  // A refusal is not an error. The renderer nudges the car and says nothing,
  // and the car stays in the child's hand so the next tap can be the right one
  // — deselecting here would make every misjudged tap cost two taps to recover.
  it("refuses a cell off the car's axis and keeps hold of it", () => {
    const held = tap(board([player(0)]), cell(EXIT_ROW, 0)).state;
    const r = tap(held, cell(0, 0));
    expect(r.outcome).toEqual({ kind: "refused", car: 0 });
    expect(r.state.selected).toBe(0);
    expect(r.state.moves).toBe(0);
  });

  it("refuses a cell in line but behind another car, and keeps hold of it", () => {
    const s = board([player(0), { id: 1, axis: "v", len: 2, row: 2, col: 3 }]);
    const held = tap(s, cell(EXIT_ROW, 0)).state;
    const r = tap(held, cell(EXIT_ROW, 5));
    expect(r.outcome).toEqual({ kind: "refused", car: 0 });
    expect(r.state.selected).toBe(0);
  });

  it("ignores a cell that is not on the board rather than throwing", () => {
    const s = board([player(0)]);
    expect(tap(s, -1).outcome.kind).toBe("ignored");
    expect(tap(s, SIZE * SIZE).outcome.kind).toBe("ignored");
    expect(tap(s, 4.5).outcome.kind).toBe("ignored");
    const held = tap(s, cell(EXIT_ROW, 0)).state;
    expect(tap(held, 999).outcome.kind).toBe("ignored");
    expect(tap(held, 999).state.selected).toBe(0);
  });

  it("counts a move only when a car actually moves", () => {
    let s = board([player(0), { id: 1, axis: "v", len: 2, row: 2, col: 3 }]);
    s = tap(s, cell(EXIT_ROW, 0)).state; // pick up
    s = tap(s, cell(0, 0)).state; // refused, off axis
    s = tap(s, cell(EXIT_ROW, 5)).state; // refused, blocked
    s = tap(s, cell(EXIT_ROW, 1)).state; // put down
    s = tap(s, cell(5, 5)).state; // ignored, empty tarmac
    expect(s.moves).toBe(0);
    s = tap(tap(s, cell(EXIT_ROW, 0)).state, cell(EXIT_ROW, 2)).state;
    expect(s.moves).toBe(1);
  });
});

describe("where a tap can send the selected car", () => {
  it("is every cell its leading end can reach, and stops at the first car", () => {
    const s = board([player(2), { id: 1, axis: "v", len: 2, row: 2, col: 5 }]);
    const cells = reachableCells(s, 0).sort((a, b) => a - b);
    expect(cells).toEqual([cell(EXIT_ROW, 0), cell(EXIT_ROW, 1), cell(EXIT_ROW, 4)]);
  });

  it("is nothing at all for a car with no room and nothing for a car that is not there", () => {
    const boxed = board([player(0), { id: 1, axis: "v", len: 2, row: 2, col: 2 }]);
    expect(reachableCells(boxed, 0)).toEqual([]);
    expect(reachableCells(boxed, 7)).toEqual([]);
  });
});

describe("undo — unlimited, and it takes the move counter back too", () => {
  it("puts the car back exactly where it was", () => {
    const start = board([player(0), { id: 1, axis: "v", len: 3, row: 3, col: 1 }]);
    const s = slide(slide(start, 1, -3), 0, 3);
    expect(undo(undo(s)).cars).toEqual(start.cars);
  });

  /**
   * A counter that only ever goes up turns undo into a penalty, and the record
   * into a measure of how often a five-year-old mis-taps. A move taken back is
   * not a move that was made.
   */
  it("returns the move count, not just the board", () => {
    const s = slide(slide(board([player(0)]), 0, 2), 0, 1);
    expect(s.moves).toBe(2);
    expect(undo(s).moves).toBe(1);
    expect(undo(undo(s)).moves).toBe(0);
  });

  it("walks all the way back to the deal, however far that is", () => {
    const start = newGame("easy", seeded("parking-undo-all"));
    let s = start;
    for (let i = 0; i < 25; i++) {
      const move = firstLegalMove(s);
      if (!move) break;
      s = slide(s, move.car, move.to - move.from);
    }
    expect(s.history.length).toBeGreaterThan(3);
    while (s.history.length) s = undo(s);
    expect(s.cars).toEqual(start.cars);
    expect(s.moves).toBe(0);
  });

  it("is a no-op on a board nobody has touched", () => {
    const start = board([player(0)]);
    expect(undo(start)).toBe(start);
  });

  it("drops whatever was being held", () => {
    const held = tap(slide(board([player(0)]), 0, 2), cell(EXIT_ROW, 2)).state;
    expect(held.selected).toBe(0);
    expect(undo(held).selected).toBeNull();
  });
});

describe("who is in the way", () => {
  it("counts the distinct cars between the player and the gap", () => {
    const s = board([
      player(0),
      { id: 1, axis: "v", len: 3, row: 0, col: 3 },
      { id: 2, axis: "v", len: 2, row: 1, col: 5 },
      { id: 3, axis: "v", len: 2, row: 4, col: 1 }, // behind the player, not in the way
    ]);
    expect(blockers(s)).toBe(2);
  });

  it("is nothing once the lane is clear, and nothing on a finished board", () => {
    expect(blockers(board([player(0)]))).toBe(0);
    expect(blockers(board([player(4)]))).toBe(0);
  });
});

describe("solved", () => {
  it("is the player's car hard against the wall on the exit row", () => {
    expect(isSolved(board([player(4)]))).toBe(true);
    expect(isSolved(board([player(3)]))).toBe(false);
  });

  it("is never true of anyone else's car reaching the wall", () => {
    const s = board([player(0), { id: 1, axis: "h", len: 2, row: 0, col: 4 }]);
    expect(isSolved(s)).toBe(false);
  });
});

describe("the deal", () => {
  it.each(LEVEL_IDS)("%s puts the cars its level asks for on the board", (level) => {
    const L = LEVELS[level];
    const s = newGame(level, seeded(`parking-shape-${level}`));
    expect(s.cars).toHaveLength(L.cars);
    expect(s.size).toBe(SIZE);
    expect(s.exitRow).toBe(EXIT_ROW);
    expect(s.moves).toBe(0);
    expect(s.selected).toBeNull();
    expect(s.history).toEqual([]);

    // The player's car is the one the whole game is about, so its shape is an
    // invariant rather than a coincidence of the layout.
    expect(s.cars[0]).toMatchObject({ id: 0, axis: "h", len: 2, row: EXIT_ROW });

    s.cars.forEach((c, i) => {
      expect(c.id, "ids must be indices — occupancy reports one and callers move the other").toBe(i);
      expect([2, 3]).toContain(c.len);
      const lastRow = c.axis === "v" ? c.row + c.len - 1 : c.row;
      const lastCol = c.axis === "h" ? c.col + c.len - 1 : c.col;
      expect(c.row).toBeGreaterThanOrEqual(0);
      expect(c.col).toBeGreaterThanOrEqual(0);
      expect(lastRow).toBeLessThan(SIZE);
      expect(lastCol).toBeLessThan(SIZE);
    });

    // Nothing overlaps: every occupied cell belongs to exactly one car, and the
    // total is the sum of the lengths.
    const covered = occupancy(s).filter((c) => c !== null).length;
    expect(covered).toBe(s.cars.reduce((n, c) => n + c.len, 0));
  });

  it.each(LEVEL_IDS)("%s deals a jam rather than a finished board", (level) => {
    for (let i = 0; i < 10; i++) {
      expect(isSolved(newGame(level, seeded(`parking-mixed-${level}-${i}`)))).toBe(false);
    }
  });

  // A board a child wins on the first tap teaches them the game is not asking
  // them anything, which is worse than a board that is too hard.
  it.each(LEVEL_IDS)("%s never deals a clear run to the exit", (level) => {
    for (let i = 0; i < 10; i++) {
      const s = newGame(level, seeded(`parking-open-${level}-${i}`));
      expect(blockers(s), `${level} #${i} could drive straight out`).toBeGreaterThan(0);
    }
  });

  it("replays a seed exactly, and two seeds differ", () => {
    const a = newGame("medium", seeded("parking-seed-a"));
    const b = newGame("medium", seeded("parking-seed-a"));
    const c = newGame("medium", seeded("parking-seed-b"));
    expect(a.cars).toEqual(b.cars);
    expect(a.cars).not.toEqual(c.cars);
  });
});

/**
 * SOLVABILITY — the one property this generator exists to guarantee.
 *
 * A child cannot tell an unsolvable jam from a hard one. They keep trying, and
 * the game is the thing that lied. So the board is never scattered and hoped
 * over, and it is never filtered by a solver either — a solver that gives up
 * under a node cap reports "no solution found", which is the same answer for a
 * board that has none and a board that is merely deep, and shipping the first
 * reading of that is how an impossible board reaches a five-year-old.
 *
 * It is built BACKWARDS from the solved board instead. Every slide is
 * reversible, so each step of the walk has a legal forward move that undoes it,
 * and reversing the walk is a solution.
 *
 * Two tests, because they can fail for different reasons:
 *
 *  - the first replays the plan the generator recorded, through `canMoveTo` and
 *    `slide` — the shipped rules, not a restatement of them. It covers every
 *    tier, and it fails if the construction argument is wrong anywhere.
 *  - the second ignores that plan completely and searches for a solution from
 *    scratch. It is the independent half: it would still pass if the recorded
 *    plan were garbage, and it is what proves the board is genuinely solvable
 *    rather than merely accompanied by a consistent-looking list.
 */
describe("every board it deals can be finished", () => {
  it.each(LEVEL_IDS)("%s: the plan it recorded is legal, move for move", (level) => {
    for (let i = 0; i < 15; i++) {
      const { state, plan } = deal(level, seeded(`parking-plan-${level}-${i}`));
      // At least the tier's DEPTH FLOOR, because a solution can never be
      // shorter than the shortest solution. This assertion used to read
      // `>= LEVELS[level].scramble` — the length of the WALK the board was built
      // by — which is the exact confusion this file now exists to keep apart: a
      // 43-move walk was passing it on a board two taps from finished.
      expect(plan.length, `${level} #${i} dealt a shallow plan`).toBeGreaterThanOrEqual(
        LEVELS[level].floor,
      );

      let s = state;
      plan.forEach((m, step) => {
        const where = `${level} #${i} step ${step}`;
        expect(axisPos(s.cars[m.car]), `${where}: car is not where the plan left it`).toBe(m.from);
        expect(canMoveTo(s, m.car, m.to - m.from), `${where}: illegal slide`).toBe(true);
        s = slide(s, m.car, m.to - m.from);
      });
      expect(isSolved(s), `${level} #${i} ended unsolved`).toBe(true);
      // The plan is a solution, not a stroll: every move in it counted.
      expect(s.moves).toBe(plan.length);
    }
  });

  it.each(["easy", "medium"] as const)("%s: a search that never saw it finds one", (level) => {
    for (let i = 0; i < 5; i++) {
      const s = newGame(level, seeded(`parking-search-${level}-${i}`));
      expect(search(s).solved, `${level} #${i} has no solution`).toBe(true);
    }
  });

  /**
   * The control the test above is worthless without.
   *
   * A search that answered "solvable" to everything would pass every board this
   * generator has dealt and every board it ever could, and it would read
   * exactly like a correct one. So it is shown a board that genuinely cannot be
   * finished and has to say so.
   *
   * Column 3 is filled top to bottom by two vertical cars, neither of which has
   * anywhere to go, so it is a permanent wall the player can never cross. The
   * rest of the board still moves freely — the state count is asserted to prove
   * the search really did exhaust it rather than getting stuck on move zero and
   * reporting "no" from a standstill.
   */
  it("says no to a board that really cannot be finished", () => {
    const walled = board([
      player(0),
      { id: 1, axis: "v", len: 3, row: 0, col: 3 },
      { id: 2, axis: "v", len: 3, row: 3, col: 3 },
      { id: 3, axis: "h", len: 2, row: 0, col: 0 },
      { id: 4, axis: "v", len: 2, row: 0, col: 5 },
    ]);
    const stuck = search(walled);
    expect(stuck.solved).toBe(false);
    expect(stuck.states).toBeGreaterThan(10);
  });
});

/**
 * `reach` no longer calls `canMoveTo`. It builds the occupancy grid ONCE and
 * walks outward, because the depth gate expands tens of thousands of positions
 * per deal and rebuilding a 36-cell map per candidate offset made a deal take
 * seconds on a phone.
 *
 * That is two implementations of one rule, which is exactly the shape that
 * drifts. So they are compared against each other over every car of every
 * dealt board, at every offset either could possibly answer for — including
 * the ones off the end of the board, where "no" has to come from both.
 */
describe("the two ways of asking whether a car can move agree", () => {
  it.each(LEVEL_IDS)("%s: on every car, at every offset", (level) => {
    for (let i = 0; i < 8; i++) {
      const s = newGame(level, seeded(`parking-reach-${level}-${i}`));
      for (let car = 0; car < s.cars.length; car++) {
        const reachable = new Set(reach(s, car));
        for (let offset = -SIZE; offset <= SIZE; offset++) {
          if (offset === 0) continue;
          expect(reachable.has(offset), `car ${car} offset ${offset}`).toBe(
            canMoveTo(s, car, offset),
          );
        }
      }
    }
  });
});

/**
 * HOW DEEP THE PUZZLE ACTUALLY IS — and why this test exists at all.
 *
 * The generator used to accept a board the moment SOME car stood in the
 * player's way, and it reported a walk 27 to 43 moves long as evidence that the
 * board was hard. It was not evidence of anything. A breadth-first search over
 * the real position space measured the true minimum at **2.1 moves at every
 * tier, with roughly 90% of boards coming apart in exactly two** — one car in
 * the way is one car to move, and a twelve-car board where ten cars are scenery
 * is not this game.
 *
 * The lesson is worth more than the fix: the length of the WALK the board was
 * built by and the length of the SOLUTION are different numbers, and only the
 * second one is the puzzle. Nothing about the first can see the second.
 */
describe("how deep the puzzle actually is", () => {
  it("measures the true minimum, and saturates rather than lying", () => {
    // Two cars, and the player can drive out the moment the blocker moves: one
    // slide to clear the lane, one to leave. The whole defect in one board.
    const shallow = board([player(0), { id: 1, axis: "v", len: 2, row: 1, col: 3 }]);
    expect(solutionDepth(shallow, 12)).toBe(2);
    // Asked a smaller question, it gives a smaller answer and never a wrong
    // one: `cap` means "at least cap", so a 2-deep board still reports 2.
    expect(solutionDepth(shallow, 2)).toBe(2);
    expect(solutionDepth(shallow, 1)).toBe(1);
    // A board already won is zero moves from being won.
    expect(solutionDepth(board([player(4)]), 9)).toBe(0);
    // And a clear run to the exit is one.
    expect(solutionDepth(board([player(0)]), 9)).toBe(1);
  });

  it.each(LEVEL_IDS)("%s clears its measured floor on every seeded deal", (level) => {
    const floor = LEVELS[level].floor;
    for (let i = 0; i < 25; i++) {
      const s = newGame(level, seeded(`parking-floor-${level}-${i}`));
      expect(
        solutionDepth(s, floor),
        `${level} #${i} comes apart in fewer than ${floor} moves`,
      ).toBeGreaterThanOrEqual(floor);
    }
  });

  /**
   * The control the test above is worthless without.
   *
   * Every board this generator deals could get shallower tomorrow and the
   * assertion would still read as a passing test unless something proves it can
   * go red. So the SAME predicate is pointed at a planted board that comes
   * apart in two moves — the exact shape that shipped — and has to refuse it.
   */
  it("FAILS on a planted board that comes apart in two moves", () => {
    const planted = board([
      player(0),
      { id: 1, axis: "v", len: 2, row: 1, col: 3 },
      { id: 2, axis: "v", len: 3, row: 3, col: 5 },
      { id: 3, axis: "h", len: 2, row: 0, col: 0 },
    ]);
    // It looks like a jam by every cheaper measure, which is the point: it is
    // not already won, and there IS a car in the player's way.
    expect(isSolved(planted)).toBe(false);
    expect(blockers(planted)).toBeGreaterThan(0);
    // And it is two moves deep, so the floor at every tier refuses it.
    expect(solutionDepth(planted, 12)).toBe(2);
    for (const level of LEVEL_IDS) {
      expect(
        solutionDepth(planted, LEVELS[level].floor) >= LEVELS[level].floor,
        `${level}'s floor accepted a two-move board`,
      ).toBe(false);
    }
  });
});

describe("what the record measures", () => {
  it("is moves, on a board scoped to the difficulty", () => {
    // Eighteen moves through six cars and eighteen through twelve are not the
    // same achievement, so the record is per level. The unit is declared once,
    // here: only the NUMBER is ever persisted, and `sdk/score.ts` reads the
    // unit to decide that fewer is better.
    const s = slide(board([player(0)]), 0, 2);
    expect(scoreFor(s, "hard")).toEqual({ value: 1, unit: "moves", board: "hard" });
    expect(scoreFor(board([player(0)]), "easy")).toEqual({
      value: 0,
      unit: "moves",
      board: "easy",
    });
  });
});

/* ------------------------------------------------------------------ helpers */

/** The first legal slide on the board, or null. Used to drive a few moves. */
function firstLegalMove(s: ParkingState): { car: number; from: number; to: number } | null {
  for (let car = 0; car < s.cars.length; car++) {
    const from = axisPos(s.cars[car]);
    for (const offset of [1, -1, 2, -2]) {
      if (canMoveTo(s, car, offset)) return { car, from, to: from + offset };
    }
  }
  return null;
}

/** Two boards with every car in the same place are one state, whatever the history. */
function fingerprint(s: ParkingState): string {
  return s.cars.map((c) => `${c.row},${c.col}`).join("|");
}

/**
 * Breadth-first search for a solution, over the SHIPPED rules — it asks
 * `canMoveTo` and `slide` rather than restating them, so a bug in either fails
 * this test too.
 *
 * The budget THROWS rather than returning false. "Ran out of nodes" and "this
 * board is impossible" are different findings, and a search that reports the
 * second when it means the first is the exact failure this whole file is about.
 */
function search(start: ParkingState, budget = 200_000): { solved: boolean; states: number } {
  const seen = new Set<string>([fingerprint(start)]);
  let frontier: ParkingState[] = [start];
  let nodes = 0;

  while (frontier.length) {
    const next: ParkingState[] = [];
    for (const s of frontier) {
      if (isSolved(s)) return { solved: true, states: nodes };
      if (++nodes > budget) throw new Error(`search budget exhausted after ${nodes} states`);
      for (let car = 0; car < s.cars.length; car++) {
        for (const step of [1, -1]) {
          for (let d = 1; d < s.size; d++) {
            const offset = step * d;
            if (!canMoveTo(s, car, offset)) break;
            const child = slide(s, car, offset);
            const fp = fingerprint(child);
            if (seen.has(fp)) continue;
            seen.add(fp);
            next.push(child);
          }
        }
      }
    }
    frontier = next;
  }
  return { solved: false, states: nodes };
}
