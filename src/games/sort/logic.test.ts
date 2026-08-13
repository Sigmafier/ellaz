import { describe, it, expect } from "vitest";
import { mulberry32, seedFrom } from "@shared/rng";
import {
  LEVELS,
  LEVEL_IDS,
  canPour,
  deal,
  isSolved,
  newGame,
  pour,
  pourCount,
  scoreFor,
  tap,
  topRun,
  undo,
  type SortState,
  type Tube,
} from "./logic";

/** A board written out by hand, bottom-of-tube first, for the rule tests. */
function board(tubes: Tube[], capacity = 4): SortState {
  return { tubes: tubes.map((t) => [...t]), capacity, selected: null, moves: 0, history: [] };
}

/** Every ball on the board, so a deal can be checked for conservation. */
function census(s: SortState): Map<number, number> {
  const seen = new Map<number, number>();
  for (const tube of s.tubes) for (const c of tube) seen.set(c, (seen.get(c) ?? 0) + 1);
  return seen;
}

const seeded = (label: string) => mulberry32(seedFrom(label));

describe("the top run — what a tap picks up", () => {
  it("is the whole unbroken run of one colour at the top", () => {
    expect(topRun([1, 2, 2, 2])).toEqual({ color: 2, count: 3 });
    expect(topRun([2, 2, 1])).toEqual({ color: 1, count: 1 });
    expect(topRun([3, 3, 3, 3])).toEqual({ color: 3, count: 4 });
  });

  it("is nothing at all on an empty tube", () => {
    expect(topRun([])).toBeNull();
  });
});

describe("what makes a pour legal", () => {
  it("accepts an empty target", () => {
    expect(canPour(board([[1, 1], []]), 0, 1)).toBe(true);
  });

  it("accepts a matching top with room", () => {
    expect(canPour(board([[1, 1], [2, 1]]), 0, 1)).toBe(true);
  });

  it("refuses a target showing another colour", () => {
    expect(canPour(board([[1, 1], [2]]), 0, 1)).toBe(false);
  });

  it("refuses a full target, matching colour or not", () => {
    expect(canPour(board([[1], [1, 1, 1, 1]]), 0, 1)).toBe(false);
  });

  it("refuses an empty source, and refuses a tube pouring into itself", () => {
    expect(canPour(board([[], [1]]), 0, 1)).toBe(false);
    expect(canPour(board([[1, 1], []]), 0, 0)).toBe(false);
  });

  // A restored position can hand these rules an index that no longer exists.
  // Answering "no" beats throwing inside a tap handler.
  it("refuses an index that is not on the board", () => {
    const s = board([[1], []]);
    expect(canPour(s, 0, 9)).toBe(false);
    expect(canPour(s, -1, 1)).toBe(false);
  });
});

describe("pouring", () => {
  it("moves the whole run when the target has room for it", () => {
    const s = pour(board([[1, 2, 2, 2], []]), 0, 1);
    expect(s.tubes).toEqual([[1], [2, 2, 2]]);
    expect(s.moves).toBe(1);
  });

  it("moves only what fits, and leaves the rest behind", () => {
    // Three greens on top, two spaces in the target: one green stays put.
    expect(pourCount(board([[1, 2, 2, 2], [2, 2]]), 0, 1)).toBe(2);
    const s = pour(board([[1, 2, 2, 2], [2, 2]]), 0, 1);
    expect(s.tubes).toEqual([
      [1, 2],
      [2, 2, 2, 2],
    ]);
  });

  it("returns the same object on an illegal pour, so nothing counts", () => {
    const before = board([[1], [2]]);
    const after = pour(before, 0, 1);
    expect(after).toBe(before);
  });

  it("never mutates the state it was handed", () => {
    const before = board([[1, 1], []]);
    const snapshot = JSON.stringify(before);
    pour(before, 0, 1);
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe("tapping — pick up, pour, cancel", () => {
  it("ignores a tap on an empty tube when nothing is held", () => {
    const r = tap(board([[], [1]]), 0);
    expect(r.outcome.kind).toBe("ignored");
    expect(r.state.selected).toBeNull();
  });

  it("picks up the first tap and pours on the second", () => {
    let r = tap(board([[1, 1], []]), 0);
    expect(r.outcome).toEqual({ kind: "picked", tube: 0 });
    expect(r.state.selected).toBe(0);

    r = tap(r.state, 1);
    expect(r.outcome).toEqual({ kind: "poured", move: { from: 0, to: 1, count: 2 } });
    expect(r.state.tubes).toEqual([[], [1, 1]]);
    expect(r.state.selected).toBeNull();
    expect(r.state.moves).toBe(1);
  });

  it("cancels when the held tube is tapped again", () => {
    const held = tap(board([[1, 1], []]), 0).state;
    const r = tap(held, 0);
    expect(r.outcome).toEqual({ kind: "cancelled", tube: 0 });
    expect(r.state.selected).toBeNull();
    expect(r.state.moves).toBe(0);
  });

  // A refusal is not an error. The renderer shakes the tube and says nothing,
  // and the ball stays in the child's hand so the next tap can be the right one
  // — deselecting here would make every misjudged tap cost two taps to recover.
  it("refuses an illegal target and keeps hold of the ball", () => {
    const held = tap(board([[1], [2]]), 0).state;
    const r = tap(held, 1);
    expect(r.outcome).toEqual({ kind: "refused", tube: 1 });
    expect(r.state.selected).toBe(0);
    expect(r.state.moves).toBe(0);
    expect(r.state.tubes).toEqual([[1], [2]]);
  });

  it("counts a move only when balls actually move", () => {
    let s = board([[1], [2], []]);
    s = tap(s, 0).state; // pick up
    s = tap(s, 1).state; // refused
    s = tap(s, 0).state; // cancel
    s = tap(s, 2).state; // ignored — nothing held, empty tube
    expect(s.moves).toBe(0);
    s = tap(tap(s, 0).state, 2).state; // a real pour
    expect(s.moves).toBe(1);
  });
});

describe("undo — unlimited, and it takes the move counter back too", () => {
  it("puts the balls back exactly where they were", () => {
    const start = board([[1, 2, 2], [2], []]);
    const s = pour(start, 0, 1);
    expect(undo(s).tubes).toEqual(start.tubes);
  });

  /**
   * A counter that only ever goes up turns undo into a penalty, and the record
   * into a measure of how often a five-year-old mis-taps. A move taken back is
   * not a move that was made.
   */
  it("returns the move count, not just the board", () => {
    const s = pour(pour(board([[1, 1], [], []]), 0, 1), 1, 2);
    expect(s.moves).toBe(2);
    expect(undo(s).moves).toBe(1);
    expect(undo(undo(s)).moves).toBe(0);
  });

  it("walks all the way back to the deal, however far that is", () => {
    const start = newGame("easy", seeded("sort-undo-all"));
    let s = start;
    for (let i = 0; i < 30; i++) {
      const move = firstLegalMove(s);
      if (!move) break;
      s = pour(s, move[0], move[1]);
    }
    expect(s.history.length).toBeGreaterThan(3);
    while (s.history.length) s = undo(s);
    expect(s.tubes).toEqual(start.tubes);
    expect(s.moves).toBe(0);
  });

  it("is a no-op on a board nobody has touched", () => {
    const start = board([[1, 1], []]);
    expect(undo(start)).toBe(start);
  });

  it("drops whatever was being held", () => {
    // Pour 0 into 1, then pick 1 up again — undo must put the balls back and
    // let go of them, or the next tap pours out of a tube that just refilled.
    const held = tap(pour(board([[1, 1], [], []]), 0, 1), 1).state;
    expect(held.selected).toBe(1);
    expect(undo(held).selected).toBeNull();
  });
});

describe("solved", () => {
  it("is every tube empty or full of one colour", () => {
    expect(isSolved(board([[1, 1, 1, 1], [], [2, 2, 2, 2]]))).toBe(true);
    expect(isSolved(board([[], []]))).toBe(true);
  });

  it("is not a tube holding one colour and room to spare", () => {
    // Otherwise a board with the last four balls split across two tubes would
    // read as finished, and the win would fire on a puzzle still in pieces.
    expect(isSolved(board([[1, 1], [1, 1]]))).toBe(false);
  });

  it("is not a tube holding two colours", () => {
    expect(isSolved(board([[1, 1, 2, 2], []]))).toBe(false);
  });
});

describe("the deal", () => {
  it.each(LEVEL_IDS)("%s has the tubes and the balls its level asks for", (level) => {
    const L = LEVELS[level];
    const s = newGame(level, seeded(`sort-shape-${level}`));
    expect(s.tubes).toHaveLength(L.colors + L.spare);
    expect(s.capacity).toBe(L.capacity);
    expect(s.moves).toBe(0);
    expect(s.selected).toBeNull();
    expect(s.history).toEqual([]);

    const counts = census(s);
    expect(counts.size).toBe(L.colors);
    for (const [, n] of counts) expect(n).toBe(L.capacity);
    for (const tube of s.tubes) expect(tube.length).toBeLessThanOrEqual(L.capacity);
  });

  it.each(LEVEL_IDS)("%s deals a puzzle rather than a finished board", (level) => {
    for (let i = 0; i < 25; i++) {
      expect(isSolved(newGame(level, seeded(`sort-mixed-${level}-${i}`)))).toBe(false);
    }
  });

  it("replays a seed exactly, and two seeds differ", () => {
    const a = newGame("medium", seeded("sort-seed-a"));
    const b = newGame("medium", seeded("sort-seed-a"));
    const c = newGame("medium", seeded("sort-seed-b"));
    expect(a.tubes).toEqual(b.tubes);
    expect(a.tubes).not.toEqual(c.tubes);
  });
});

/**
 * SOLVABILITY — the one property this generator exists to guarantee.
 *
 * A child cannot tell an unsolvable puzzle from a hard one. They keep trying,
 * and the game is the thing that lied. So the board is never shuffled and
 * hoped over, and it is never filtered by a solver either — a solver that gives
 * up under a node cap reports "no solution found", which is the same answer for
 * a board that has none and a board that is merely deep, and shipping the first
 * reading of that is how an impossible board reaches a five-year-old.
 *
 * It is built BACKWARDS from the solved board instead, by moves each of which
 * has a legal forward move that undoes it. Reversing that list is a solution.
 *
 * Two tests, because they can fail for different reasons:
 *
 *  - the first replays the plan the generator recorded, through `canPour` and
 *    `pour` — the shipped rules, not a restatement of them. It covers every
 *    tier, and it fails if the construction argument is wrong anywhere.
 *  - the second ignores that plan completely and searches for a solution from
 *    scratch. It is the independent half: it would still pass if the recorded
 *    plan were garbage, and it is what proves the board is genuinely solvable
 *    rather than merely accompanied by a consistent-looking list.
 */
describe("every board it deals can be finished", () => {
  it.each(LEVEL_IDS)("%s: the plan it recorded is legal, move for move", (level) => {
    for (let i = 0; i < 40; i++) {
      const { state, plan } = deal(level, seeded(`sort-plan-${level}-${i}`));
      expect(plan.length, `${level} #${i} dealt an empty plan`).toBeGreaterThan(0);

      let s = state;
      plan.forEach((m, step) => {
        const where = `${level} #${i} step ${step}`;
        expect(canPour(s, m.from, m.to), `${where}: illegal pour`).toBe(true);
        expect(pourCount(s, m.from, m.to), `${where}: wrong count`).toBe(m.count);
        s = pour(s, m.from, m.to);
      });
      expect(isSolved(s), `${level} #${i} ended unsolved`).toBe(true);
    }
  });

  it.each(["easy", "medium"] as const)("%s: a search that never saw it finds one", (level) => {
    for (let i = 0; i < 12; i++) {
      const s = newGame(level, seeded(`sort-search-${level}-${i}`));
      expect(search(s).solved, `${level} #${i} has no solution`).toBe(true);
    }
  });

  /**
   * The control the test above is worthless without.
   *
   * A search that answered "solvable" to everything would pass every board this
   * generator has dealt and every board it ever could, and it would read exactly
   * like a correct one. So it is shown boards that genuinely cannot be finished
   * and has to say so.
   *
   * The second is the one that matters. The first is stuck on move zero, so
   * "no" there only proves the answer is reachable — a search that never left
   * the start would say it too. The second has legal moves in every direction
   * and no solution behind any of them, so `no` can only come from actually
   * exhausting the board, and the state count is asserted to prove it did.
   */
  it("says no to a board that really cannot be finished", () => {
    const stuck = search(board([[1, 2, 1, 2], [2, 1, 2, 1]]));
    expect(stuck.solved).toBe(false);

    // Three colours, three balls each: no tube can ever be filled, so nothing
    // here is solvable however it is rearranged — and it rearranges plenty.
    const roomy = search(board([[1, 1, 2], [2, 2, 1], [3, 3, 3], []]));
    expect(roomy.solved).toBe(false);
    expect(roomy.states).toBeGreaterThan(10);
  });
});

describe("what the record measures", () => {
  it("is moves, on a board scoped to the difficulty", () => {
    // Fourteen moves on four colours and fourteen on eight are not the same
    // achievement, so the record is per level. The unit is declared once, here:
    // only the NUMBER is ever persisted, and `sdk/score.ts` reads the unit to
    // decide that fewer is better.
    const s = pour(board([[1, 1], []]), 0, 1);
    expect(scoreFor(s, "hard")).toEqual({ value: 1, unit: "moves", board: "hard" });
    expect(scoreFor(board([[1]]), "easy")).toEqual({ value: 0, unit: "moves", board: "easy" });
  });
});

/* ------------------------------------------------------------------ helpers */

/** The first legal pour on the board, or null. Used to drive a few moves. */
function firstLegalMove(s: SortState): [number, number] | null {
  for (let f = 0; f < s.tubes.length; f++)
    for (let t = 0; t < s.tubes.length; t++) if (canPour(s, f, t)) return [f, t];
  return null;
}

/** Tubes are interchangeable, so two boards differing only in their order are one state. */
function fingerprint(s: SortState): string {
  return s.tubes
    .map((t) => t.join(","))
    .sort()
    .join("|");
}

/**
 * Depth-first search for a solution, over the SHIPPED rules — it asks `canPour`
 * and `pour` rather than restating them, so a bug in either fails this test too.
 *
 * The budget THROWS rather than returning false. "Ran out of nodes" and "this
 * board is impossible" are different findings, and a search that reports the
 * second when it means the first is the exact failure this whole file is about.
 */
function search(start: SortState, budget = 400_000): { solved: boolean; states: number } {
  const seen = new Set<string>();
  const stack: SortState[] = [start];
  let nodes = 0;

  while (stack.length) {
    const s = stack.pop()!;
    if (isSolved(s)) return { solved: true, states: nodes };
    if (++nodes > budget) throw new Error(`search budget exhausted after ${nodes} states`);
    const fp = fingerprint(s);
    if (seen.has(fp)) continue;
    seen.add(fp);

    const moves: { next: SortState; rank: number }[] = [];
    for (let f = 0; f < s.tubes.length; f++) {
      const run = topRun(s.tubes[f]);
      if (!run) continue;
      // Tipping a tube that already holds one colour into an empty one just
      // renames the tube. It is the fastest way to search forever.
      const uniform = s.tubes[f].length === run.count;
      for (let t = 0; t < s.tubes.length; t++) {
        if (!canPour(s, f, t)) continue;
        if (uniform && s.tubes[t].length === 0) continue;
        const next = pour(s, f, t);
        moves.push({ next, rank: rankMove(next, s, f, t, run.count) });
      }
    }
    // Ascending, so the most promising move is on top of the stack.
    moves.sort((a, b) => a.rank - b.rank);
    for (const m of moves) stack.push(m.next);
  }
  return { solved: false, states: nodes };
}

/** Higher is more promising: finishing a colour beats emptying a tube beats stacking. */
function rankMove(next: SortState, prev: SortState, from: number, to: number, run: number): number {
  const dest = next.tubes[to];
  const completed = dest.length === next.capacity && dest.every((c) => c === dest[0]);
  return (
    (completed ? 4 : 0) +
    (next.tubes[from].length === 0 ? 2 : 0) +
    (prev.tubes[to].length ? 1 : 0) +
    run / 10
  );
}
