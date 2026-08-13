import { describe, it, expect } from "vitest";
import { mulberry32, seedFrom } from "@shared/rng";
import {
  DIFFICULTIES,
  LADDER,
  LEVELS,
  MILESTONE_EVERY,
  cellCount,
  freeCells,
  hasMerge,
  isDead,
  isMilestoneTier,
  newGame,
  scoreReport,
  tapCell,
  tierPoints,
  type Cell,
  type MergeState,
} from "./logic";

/** A generator whose sequence is fixed by its label, so a run replays exactly. */
const rngOf = (label: string) => mulberry32(seedFrom(label));

/** Replace the board wholesale. The state is plain data, so a test can pose it. */
function pose(state: MergeState, cells: Cell[]): MergeState {
  expect(cells).toHaveLength(cellCount(state));
  return { ...state, cells: [...cells], selected: null };
}

/** Every cell holding something. */
const filled = (s: MergeState) => s.cells.filter((c) => c !== null).length;

describe("the ladder", () => {
  it("is long enough to climb and never repeats a face", () => {
    expect(LADDER.length).toBeGreaterThanOrEqual(12);
    expect(new Set(LADDER.map((r) => r.emoji)).size).toBe(LADDER.length);
  });

  it("names every rung in every language that has written prose", () => {
    for (const rung of LADDER) {
      expect(rung.he.length, `${rung.emoji} has no Hebrew name`).toBeGreaterThan(0);
      expect(rung.en.length, `${rung.emoji} has no English name`).toBeGreaterThan(0);
      expect(rung.es.length, `${rung.emoji} has no Spanish name`).toBeGreaterThan(0);
    }
  });

  it("pays more the higher you climb", () => {
    for (let t = 1; t < LADDER.length; t++) {
      expect(tierPoints(t)).toBeGreaterThan(tierPoints(t - 1));
    }
  });
});

describe("a new board", () => {
  it.each(DIFFICULTIES)("%s: seeds its own level's grid and nothing else", (level) => {
    const cfg = LEVELS[level];
    const s = newGame(level, rngOf(`new-${level}`));

    expect(s.cells).toHaveLength(cfg.rows * cfg.cols);
    expect(filled(s)).toBe(cfg.seed);
    expect(s.selected).toBeNull();
    expect(s.score).toBe(0);
    expect(s.merges).toBe(0);
  });

  it("only ever seeds the lowest rungs", () => {
    for (const level of DIFFICULTIES) {
      const s = newGame(level, rngOf(`low-${level}`));
      for (const c of s.cells) {
        if (c !== null) expect(c).toBeLessThanOrEqual(LEVELS[level].spawnTop);
      }
    }
  });
});

describe("tapping", () => {
  it("drops a fresh creature on an empty square when nothing is held", () => {
    const s0 = pose(newGame("easy", rngOf("drop")), Array(25).fill(null));
    const { state, outcome } = tapCell(s0, 7, rngOf("drop"));

    expect(outcome.kind).toBe("dropped");
    expect(state.cells[7]).toBe(0);
    expect(filled(state)).toBe(1);
  });

  it("picks a creature up, and puts it down again on a second tap", () => {
    let s = pose(newGame("easy", rngOf("pick")), Array(25).fill(null));
    s = tapCell(s, 3, rngOf("a")).state;

    let r = tapCell(s, 3, rngOf("b"));
    expect(r.outcome.kind).toBe("selected");
    expect(r.state.selected).toBe(3);

    r = tapCell(r.state, 3, rngOf("c"));
    expect(r.outcome.kind).toBe("cleared");
    expect(r.state.selected).toBeNull();
  });

  it("moves what it holds onto an empty square", () => {
    const s0 = pose(newGame("easy", rngOf("move")), [2, ...Array(24).fill(null)]);
    const held = tapCell(s0, 0, rngOf("m1")).state;
    const { state, outcome } = tapCell(held, 9, rngOf("m2"));

    expect(outcome.kind).toBe("moved");
    expect(state.cells[0]).toBeNull();
    expect(state.cells[9]).toBe(2);
    expect(state.selected).toBeNull();
  });

  it("switches to a mismatched creature instead of refusing the tap", () => {
    // A five-year-old taps two things that do not go together. That has to be a
    // new selection, never a rejection - a refusal reads as a broken button.
    const cells: Cell[] = [1, 4, ...Array(23).fill(null)];
    const s0 = pose(newGame("easy", rngOf("switch")), cells);
    const held = tapCell(s0, 0, rngOf("s1")).state;
    const { state, outcome } = tapCell(held, 1, rngOf("s2"));

    expect(outcome.kind).toBe("selected");
    expect(state.selected).toBe(1);
    expect(state.cells[0]).toBe(1);
  });

  it("ignores a tap outside the board", () => {
    const s = newGame("easy", rngOf("oob"));
    expect(tapCell(s, -1, rngOf("x")).outcome.kind).toBe("ignored");
    expect(tapCell(s, s.cells.length, rngOf("x")).outcome.kind).toBe("ignored");
  });
});

describe("merging", () => {
  it("turns two of the same into the next one up, and empties the source", () => {
    const s0 = pose(newGame("easy", rngOf("merge")), [3, 3, ...Array(23).fill(null)]);
    const held = tapCell(s0, 0, rngOf("g1")).state;
    const { state, outcome } = tapCell(held, 1, rngOf("g2"));

    expect(outcome).toMatchObject({ kind: "merged", from: 0, to: 1, tier: 4 });
    expect(state.cells[0]).toBeNull();
    expect(state.cells[1]).toBe(4);
    expect(state.score).toBe(tierPoints(4));
    expect(state.merges).toBe(1);
    expect(state.selected).toBeNull();
  });

  it("refuses to merge at the top of the ladder rather than inventing a rung", () => {
    // The ceiling is the trap: a merge that just added one would index off the
    // end of LADDER and the renderer would draw `undefined`.
    const top = LADDER.length - 1;
    const s0 = pose(newGame("easy", rngOf("ceil")), [top, top, ...Array(23).fill(null)]);
    const held = tapCell(s0, 0, rngOf("c1")).state;
    const { state, outcome } = tapCell(held, 1, rngOf("c2"));

    expect(outcome.kind).toBe("selected");
    expect(state.cells[0]).toBe(top);
    expect(state.cells[1]).toBe(top);
    expect(state.score).toBe(0);
  });

  it("drops the level's pressure back onto the board after a merge", () => {
    for (const level of DIFFICULTIES) {
      const cfg = LEVELS[level];
      const empty: Cell[] = Array(cfg.rows * cfg.cols).fill(null);
      const s0 = pose(newGame(level, rngOf(`p-${level}`)), [0, 0, ...empty.slice(2)]);
      const held = tapCell(s0, 0, rngOf(`p1-${level}`)).state;
      const { state } = tapCell(held, 1, rngOf(`p2-${level}`));

      // two in, one out, then the level's spawn
      expect(filled(state), level).toBe(1 + cfg.spawnPerMerge);
    }
  });

  it("never spawns more than there is room for", () => {
    // hard drops two per merge; on a board with one square free after the merge
    // it must place one and stop, not overwrite a creature.
    const cfg = LEVELS.hard;
    const size = cfg.rows * cfg.cols;
    const cells: Cell[] = Array.from({ length: size }, (_, i) => (i < 2 ? 0 : (i % 5) + 4));
    const s0 = pose(newGame("hard", rngOf("full")), cells);
    const held = tapCell(s0, 0, rngOf("f1")).state;
    const { state } = tapCell(held, 1, rngOf("f2"));

    expect(filled(state)).toBe(size);
    expect(state.cells.every((c) => c !== null)).toBe(true);
  });
});

describe("what the renderer needs in order to reward a run", () => {
  it("marks a new top rung, once, the first time it is reached", () => {
    const empty: Cell[] = Array(25).fill(null);
    const mergeAt = (s: MergeState, a: number, b: number) =>
      tapCell(tapCell(s, a, rngOf("t")).state, b, rngOf("t")).outcome;

    const s0 = pose(newGame("easy", rngOf("top")), [0, 0, 0, 0, ...empty.slice(4)]);
    const first = tapCell(tapCell(s0, 0, rngOf("t")).state, 1, rngOf("t"));
    expect(first.outcome).toMatchObject({ tier: 1, newTop: true });

    // a second tier-1 is a climb the run has already made
    const again = pose(first.state, [0, 0, ...empty.slice(2)]);
    expect(mergeAt(again, 0, 1)).toMatchObject({ tier: 1, newTop: false });
  });

  it("calls a milestone only on a rung the run has never reached", () => {
    // Without this the run is PAID TWICE: reach the milestone rung, make
    // another one, and the renderer grants again. Same shape as the resume
    // double-grant in the session rule, one layer down.
    const empty: Cell[] = Array(25).fill(null);
    const rung = MILESTONE_EVERY;
    expect(isMilestoneTier(rung)).toBe(true);

    const s0 = pose(newGame("easy", rngOf("ms")), [rung - 1, rung - 1, ...empty.slice(2)]);
    const first = tapCell(tapCell(s0, 0, rngOf("m")).state, 1, rngOf("m"));
    expect(first.outcome).toMatchObject({ tier: rung, milestone: true });

    const again = pose(first.state, [rung - 1, rung - 1, ...empty.slice(2)]);
    const second = tapCell(tapCell(again, 0, rngOf("m")).state, 1, rngOf("m"));
    expect(second.outcome).toMatchObject({ tier: rung, milestone: false });
  });

  it("never calls tier zero a milestone", () => {
    expect(isMilestoneTier(0)).toBe(false);
  });

  it("reports a value and a unit, and never a direction", () => {
    const s = { ...newGame("medium", rngOf("score")), score: 96 };
    expect(scoreReport(s, "medium")).toEqual({ value: 96, unit: "points", board: "medium" });
  });
});

describe("a board with nothing left to do", () => {
  const size = LEVELS.hard.rows * LEVELS.hard.cols;
  const top = LADDER.length - 1;

  /**
   * The only full board that cannot be played, and building one says why: 16
   * squares against 14 rungs means every OTHER full board holds a pair by
   * pigeonhole. So a stuck board needs the ceiling - one rung each below the
   * top, and the rest creatures that can climb no further.
   */
  const stuck = (): Cell[] =>
    Array.from({ length: size }, (_, i) => (i < top ? i : top));

  it("needs the ceiling to be stuck at all", () => {
    const board = stuck();
    expect(board.filter((c) => c === top)).toHaveLength(size - top);
    expect(new Set(board.filter((c) => c !== top)).size).toBe(top);
  });

  it("is dead when it is full and holds no pair that can climb", () => {
    const s = pose(newGame("hard", rngOf("dead")), stuck());

    expect(freeCells(s)).toEqual([]);
    expect(hasMerge(s)).toBe(false);
    expect(isDead(s)).toBe(true);
  });

  it("is alive while a pair remains, even with no room", () => {
    const cells = stuck();
    cells[size - 1] = 0; // a second caterpillar - one merge is still there
    const s = pose(newGame("hard", rngOf("alive")), cells);

    expect(freeCells(s)).toEqual([]);
    expect(hasMerge(s)).toBe(true);
    expect(isDead(s)).toBe(false);
  });

  it("is alive while a square is free, even with no pair", () => {
    const cells = stuck();
    cells[size - 1] = null;
    const s = pose(newGame("hard", rngOf("room")), cells);

    expect(hasMerge(s)).toBe(false);
    expect(isDead(s)).toBe(false);
  });

  it("ignores every tap once it is dead", () => {
    const s = pose(newGame("hard", rngOf("dead2")), stuck());
    for (let i = 0; i < size; i++) {
      expect(tapCell(s, i, rngOf("d")).outcome.kind, `tap ${i}`).toBe("ignored");
    }
  });
});

describe("determinism", () => {
  it("replays the same run from the same seed", () => {
    const script = [0, 4, 9, 9, 2, 7, 1, 1, 6, 12, 3, 3, 8, 5];

    const play = () => {
      const rng = rngOf("replay");
      let s = newGame("medium", rng);
      for (const i of script) s = tapCell(s, i, rng).state;
      return s;
    };

    const a = play();
    const b = play();
    expect(a.cells).toEqual(b.cells);
    expect(a.score).toBe(b.score);
    expect(a.topTier).toBe(b.topTier);
    expect(a.merges).toBe(b.merges);
  });

  it("plays a different run from a different seed", () => {
    const boardFor = (label: string) => {
      const rng = rngOf(label);
      let s = newGame("medium", rng);
      for (const i of [0, 1, 2, 3, 4, 5, 6, 7]) s = tapCell(s, i, rng).state;
      return s.cells;
    };
    expect(boardFor("one")).not.toEqual(boardFor("two"));
  });
});
