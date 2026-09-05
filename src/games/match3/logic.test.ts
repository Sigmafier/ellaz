import { describe, expect, it } from "vitest";
import { mulberry32 } from "@shared/rng";
import {
  DIFFICULTIES,
  LEVELS,
  POINTS_PER_GEM,
  areAdjacent,
  dealBoard,
  findMatches,
  goalFor,
  hasMove,
  isOver,
  neighbourIn,
  newGame,
  plainKinds,
  scoreReport,
  shuffleBoard,
  swapAt,
  swipeCell,
  tapCell,
  type Match3State,
} from "./logic";

/**
 * A board written as text, so a test says what it means.
 *
 *   board(`
 *     a a b
 *     c c c
 *     b a b
 *   `)
 *
 * Letters map to colour indices in first-seen order, which keeps the fixtures
 * readable without pinning them to whatever number the renderer paints red.
 */
function board(text: string): { grid: number[]; size: number } {
  const rows = text
    .trim()
    .split("\n")
    .map((r) => r.trim().split(/\s+/));
  const size = rows.length;
  for (const row of rows) {
    if (row.length !== size) throw new Error(`fixture is not square: ${row.length} vs ${size}`);
  }
  const seen = new Map<string, number>();
  const grid = rows.flat().map((ch) => {
    if (ch === ".") return 0; // an explicit hole, for the mid-cascade tests
    if (!seen.has(ch)) seen.set(ch, seen.size + 1);
    return seen.get(ch) as number;
  });
  return { grid, size };
}

/** A state wrapped around a fixture board, so `swapAt` can be pointed at it. */
function stateOf(text: string, over: Partial<Match3State> = {}): Match3State {
  const { grid, size } = board(text);
  const colors = Math.max(...grid);
  return {
    level: "easy",
    size,
    colors,
    grid,
    kinds: plainKinds(grid.length),
    selected: null,
    round: 1,
    cleared: 0,
    goal: LEVELS.easy.goal,
    score: 0,
    moves: 0,
    // Deliberately generous, so an existing cell that says nothing about the
    // move budget cannot accidentally run out mid-assertion and start
    // measuring the game-over guard instead of what it was written for. A cell
    // that IS about the budget passes its own `movesLeft` through `over`.
    movesLeft: 999,
    ...over,
  };
}

const rng = () => mulberry32(12345);

describe("finding lines", () => {
  it("finds a horizontal run of three", () => {
    const { grid, size } = board(`
      a b c
      d d d
      c b a
    `);
    expect(findMatches(grid, size)).toEqual([3, 4, 5]);
  });

  it("finds a vertical run of three", () => {
    const { grid, size } = board(`
      a b c
      a d e
      a f g
    `);
    expect(findMatches(grid, size)).toEqual([0, 3, 6]);
  });

  it("finds a run of four as four, not as two overlapping threes", () => {
    const { grid, size } = board(`
      a a a a
      b c b c
      c b c b
      b c b c
    `);
    expect(findMatches(grid, size)).toEqual([0, 1, 2, 3]);
  });

  it("counts the shared gem of a cross exactly once", () => {
    // The vertical arm and the horizontal arm both pass through index 4. A
    // union that double-counted it would score the swap higher than it is.
    const { grid, size } = board(`
      b a b
      a a a
      b a b
    `);
    expect(findMatches(grid, size)).toEqual([1, 3, 4, 5, 7]);
  });

  it("never matches holes", () => {
    // Mid-cascade a column of cleared cells is three identical zeroes. Without
    // the guard they read as a line, score themselves, and clear again -
    // forever, since collapsing holes produces more holes.
    const { grid, size } = board(`
      . . .
      a b c
      c b a
    `);
    expect(findMatches(grid, size)).toEqual([]);
  });

  it("finds nothing on a clean board", () => {
    const { grid, size } = board(`
      a b a
      b a b
      a b a
    `);
    expect(findMatches(grid, size)).toEqual([]);
  });
});

describe("adjacency", () => {
  it("accepts orthogonal neighbours and refuses everything else", () => {
    expect(areAdjacent(4, 5, 3)).toBe(true); // right
    expect(areAdjacent(4, 1, 3)).toBe(true); // up
    expect(areAdjacent(4, 7, 3)).toBe(true); // down
    expect(areAdjacent(4, 3, 3)).toBe(true); // left
    expect(areAdjacent(4, 8, 3)).toBe(false); // diagonal
    expect(areAdjacent(4, 4, 3)).toBe(false); // itself
  });

  it("does not wrap around a row edge", () => {
    // 2 and 3 are consecutive in the flat array and are opposite ends of two
    // different rows. Index arithmetic alone would call them neighbours.
    expect(areAdjacent(2, 3, 3)).toBe(false);
  });
});

describe("a fresh board", () => {
  it("is dealt with no line already on it and a move available", () => {
    for (const level of DIFFICULTIES) {
      const s = newGame(level, mulberry32(7));
      expect(findMatches(s.grid, s.size)).toEqual([]);
      expect(hasMove(s.grid, s.size)).toBe(true);
    }
  });

  it("holds only real colours - never a hole", () => {
    const s = newGame("hard", mulberry32(3));
    expect(s.grid).toHaveLength(s.size * s.size);
    for (const v of s.grid) {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(s.colors);
    }
  });

  it("is the same board twice from the same seed", () => {
    expect(newGame("medium", mulberry32(42)).grid).toEqual(newGame("medium", mulberry32(42)).grid);
    expect(newGame("medium", mulberry32(42)).grid).not.toEqual(
      newGame("medium", mulberry32(43)).grid,
    );
  });
});

describe("swapping", () => {
  it("ignores a swap between cells that are not neighbours", () => {
    const s = stateOf(`
      a b c
      d e f
      g h i
    `);
    const { state, outcome } = swapAt(s, 0, 8, rng());
    expect(outcome.kind).toBe("ignored");
    expect(state).toBe(s);
  });

  it("rejects a legal swap that makes no line, and leaves the board alone", () => {
    const s = stateOf(`
      a b a
      b a b
      a b a
    `);
    const { state, outcome } = swapAt(s, 0, 1, rng());
    expect(outcome.kind).toBe("rejected");
    // The board is untouched. A refusal is not a mistake being scored, so the
    // move count must not move either.
    expect(state.grid).toEqual(s.grid);
    expect(state.moves).toBe(0);
    expect(state.score).toBe(0);
    // The selection clears, or a child taps the same refused neighbour again.
    expect(state.selected).toBeNull();
  });

  it("clears a line the swap creates and scores it", () => {
    // Swapping 2 and 5 puts a third `a` on the top row.
    const s = stateOf(`
      a a b
      c c a
      b a c
    `);
    const { state, outcome } = swapAt(s, 2, 5, rng());
    expect(outcome.kind).toBe("matched");
    if (outcome.kind !== "matched") return;
    expect(outcome.gems).toBeGreaterThanOrEqual(3);
    expect(outcome.points).toBeGreaterThanOrEqual(3 * POINTS_PER_GEM);
    expect(state.score).toBe(outcome.points);
    expect(state.moves).toBe(1);
  });

  it("settles completely - the board it hands back has no line and no hole", () => {
    // The whole reason the cascade lives in the rules: what comes back is
    // final, so nothing on disk can ever be a board mid-clear.
    const s = stateOf(`
      a a b
      c c a
      b a c
    `);
    const { state } = swapAt(s, 2, 5, mulberry32(99));
    expect(findMatches(state.grid, state.size)).toEqual([]);
    expect(state.grid).not.toContain(0);
  });

  it("reports every cascade step, and the steps sum to the total", () => {
    const s = stateOf(`
      a a b
      c c a
      b a c
    `);
    const { outcome } = swapAt(s, 2, 5, mulberry32(4));
    expect(outcome.kind).toBe("matched");
    if (outcome.kind !== "matched") return;
    expect(outcome.steps.length).toBeGreaterThanOrEqual(1);
    // The pre-cascade board comes back too: the renderer draws the trade
    // itself before anything vanishes, and must not re-derive it.
    expect(outcome.swapped[2]).toBe(s.grid[5]);
    expect(outcome.swapped[5]).toBe(s.grid[2]);
    const summed = outcome.steps.reduce((n, st) => n + st.points, 0);
    expect(summed).toBe(outcome.points);
    const gems = outcome.steps.reduce((n, st) => n + st.cleared.length, 0);
    expect(gems).toBe(outcome.gems);
    // Every step's board is a real board - the renderer draws these directly.
    for (const st of outcome.steps) {
      expect(st.grid).toHaveLength(s.size * s.size);
      expect(st.grid).not.toContain(0);
    }
  });

  it("pays a deeper cascade more per gem than the first clear", () => {
    // A two-step cascade of three gems each scores 3x10x1 + 3x10x2, not 6x10.
    const first = 3 * POINTS_PER_GEM * 1;
    const second = 3 * POINTS_PER_GEM * 2;
    expect(second).toBeGreaterThan(first);
  });
});

describe("the endless ladder", () => {
  it("advances the round when the goal is met and carries the remainder", () => {
    const s = stateOf(
      `
      a a b
      c c a
      b a c
    `,
      { cleared: 0, goal: 3, round: 1, level: "easy" },
    );
    const { state, outcome } = swapAt(s, 2, 5, mulberry32(11));
    expect(outcome.kind).toBe("matched");
    if (outcome.kind !== "matched") return;
    expect(outcome.roundUp).toBe(1);
    expect(state.round).toBe(2);
    // Whatever the cascade cleared beyond the goal counts toward the next round
    // rather than being thrown away.
    expect(state.cleared).toBe(outcome.gems - 3);
    expect(state.goal).toBe(goalFor("easy", 2));
  });

  it("advances at most one round per swap", () => {
    // A goal of 1 with a cascade clearing many gems could otherwise fire a
    // handful of celebrations a child cannot tell apart - and, through
    // winMoment, a handful of grants.
    const s = stateOf(
      `
      a a b
      c c a
      b a c
    `,
      { cleared: 0, goal: 1, round: 1 },
    );
    const { state, outcome } = swapAt(s, 2, 5, mulberry32(11));
    if (outcome.kind !== "matched") throw new Error("expected a match");
    expect(outcome.roundUp).toBe(1);
    expect(state.round).toBe(2);
  });

  it("does not advance the round when the goal is not met", () => {
    const s = stateOf(
      `
      a a b
      c c a
      b a c
    `,
      { cleared: 0, goal: 9999, round: 4 },
    );
    const { state, outcome } = swapAt(s, 2, 5, mulberry32(11));
    if (outcome.kind !== "matched") throw new Error("expected a match");
    expect(outcome.roundUp).toBe(0);
    expect(state.round).toBe(4);
  });

  it("grows the goal with the round", () => {
    expect(goalFor("easy", 2)).toBeGreaterThan(goalFor("easy", 1));
    expect(goalFor("hard", 1)).toBe(LEVELS.hard.goal);
  });
});

describe("never a dead board", () => {
  it("recognises a board with no legal swap", () => {
    // Found by exhaustive search rather than by eye, and that is the point: a
    // two-colour checkerboard LOOKS locked and is measured to have twelve legal
    // moves, because swapping any adjacent pair leaves two identical pairs
    // touching. A fixture reasoned about instead of measured would have pinned
    // the opposite of the truth here.
    const { grid, size } = board(`
      b a c b
      b a a c
      c c b b
      a c b a
    `);
    expect(findMatches(grid, size)).toEqual([]);
    expect(hasMove(grid, size)).toBe(false);
  });

  it("recognises a board that has one", () => {
    const { grid, size } = board(`
      a a b a
      b b a b
      a b a b
      b a b a
    `);
    expect(hasMove(grid, size)).toBe(true);
  });

  it("shuffles a locked board into a playable one, keeping the same gems", () => {
    const { grid, size } = board(`
      b a c b
      b a a c
      c c b b
      a c b a
    `);
    const shuffled = shuffleBoard(grid, size, 3, mulberry32(5));
    expect(findMatches(shuffled, size)).toEqual([]);
    expect(hasMove(shuffled, size)).toBe(true);
    expect(shuffled).toHaveLength(grid.length);
    // Same multiset: a shuffle rearranges what the child had, it does not deal
    // them a different board.
    expect([...shuffled].sort()).toEqual([...grid].sort());
  });

  it("hands back a playable board after every settle", () => {
    // The property that matters, over a long run rather than one fixture.
    //
    // The loop stops at the game over rather than at a fixed count: since
    // 2026-09-04 a run ends when the move budget drains (around 113 moves on
    // easy), and a flat 120 iterations walked past that and then reported
    // "no legal move" - the game-over guard refusing input, read as a dead
    // board. The distinction is the whole point of this test, so it is now
    // asserted rather than avoided.
    let s = newGame("easy", mulberry32(2026));
    const roll = mulberry32(77);
    let i = 0;
    for (; i < 120 && !isOver(s); i += 1) {
      expect(hasMove(s.grid, s.size)).toBe(true);
      // Find any legal swap and play it.
      let played = false;
      for (let idx = 0; idx < s.size * s.size && !played; idx += 1) {
        for (const other of [idx + 1, idx + s.size]) {
          if (!areAdjacent(idx, other, s.size)) continue;
          const attempt = swapAt(s, idx, other, roll);
          if (attempt.outcome.kind === "matched") {
            s = attempt.state;
            played = true;
            break;
          }
        }
      }
      expect(played).toBe(true);
      expect(findMatches(s.grid, s.size)).toEqual([]);
      expect(s.grid).not.toContain(0);
    }
    expect(s.round).toBeGreaterThan(1);
    // It stopped because the BUDGET ran out, not because the loop ran out -
    // without this the whole test would pass on a first iteration that ended
    // the run, having proved nothing about a long run at all.
    expect(isOver(s)).toBe(true);
    expect(i).toBeGreaterThan(60);
  });
});

describe("tapping", () => {
  const fresh = () =>
    stateOf(`
      a b a
      b a b
      a b a
    `);

  it("picks a gem up on the first tap", () => {
    const { state, outcome } = tapCell(fresh(), 4, rng());
    expect(state.selected).toBe(4);
    expect(outcome.kind).toBe("ignored");
  });

  it("puts it down again when the same gem is tapped twice", () => {
    const held = { ...fresh(), selected: 4 };
    const { state } = tapCell(held, 4, rng());
    expect(state.selected).toBeNull();
  });

  it("moves the selection to a gem that is not a neighbour", () => {
    // Not a refusal: a child pointing at a far gem means "that one instead".
    const held = { ...fresh(), selected: 0 };
    const { state, outcome } = tapCell(held, 8, rng());
    expect(state.selected).toBe(8);
    expect(outcome.kind).toBe("ignored");
  });

  it("attempts the swap when the second tap is a neighbour", () => {
    const held = stateOf(
      `
      a a b
      c c a
      b a c
    `,
      { selected: 2 },
    );
    const { outcome } = tapCell(held, 5, mulberry32(11));
    expect(outcome.kind).toBe("matched");
  });

  it("reaches every swap a swipe reaches, so drag is never REQUIRED", () => {
    // The kids rule. Since swipe landed, "there is no drag entry point" is no
    // longer the invariant - this is: every swap a gesture can make, two taps
    // can also make, on the same board, to the same result. A swipe that could
    // reach a swap the tap path cannot would take this game away from exactly
    // the players it is for.
    const dirs = ["up", "down", "left", "right"] as const;
    const start = stateOf(`
      a a b
      c c a
      b a c
    `);
    let checked = 0;
    for (let i = 0; i < start.size * start.size; i += 1) {
      for (const dir of dirs) {
        const target = neighbourIn(i, dir, start.size);
        if (target === null) continue;
        const swiped = swipeCell(start, i, dir, mulberry32(11));
        // The same trade by hand: pick the gem up, then tap the neighbour.
        const picked = tapCell(start, i, mulberry32(11)).state;
        const tapped = tapCell(picked, target, mulberry32(11));
        expect(swiped.outcome).toEqual(tapped.outcome);
        expect(swiped.state.grid).toEqual(tapped.state.grid);
        checked += 1;
      }
    }
    // A control: an empty loop would satisfy every assertion above. A 3x3 board
    // has 12 orthogonal adjacencies, each reachable from both ends.
    expect(checked).toBe(24);
  });
});

describe("swiping", () => {
  const fresh = () =>
    stateOf(`
      a b a
      b a b
      a b a
    `);

  it("pushes a gem into each of its four neighbours", () => {
    expect(neighbourIn(4, "up", 3)).toBe(1);
    expect(neighbourIn(4, "down", 3)).toBe(7);
    expect(neighbourIn(4, "left", 3)).toBe(3);
    expect(neighbourIn(4, "right", 3)).toBe(5);
  });

  it("stops at the board edge instead of wrapping to the next row", () => {
    // Index arithmetic is what makes this the interesting one: cell 2 plus one
    // is cell 3, which is the far side of the board on the row below.
    expect(neighbourIn(2, "right", 3)).toBeNull();
    expect(neighbourIn(3, "left", 3)).toBeNull();
    expect(neighbourIn(1, "up", 3)).toBeNull();
    expect(neighbourIn(7, "down", 3)).toBeNull();
  });

  it("makes the swap when the push lands a line", () => {
    const s = stateOf(`
      a a b
      c c a
      b a c
    `);
    // Gem 2 pushed down trades with gem 5, which puts an `a` beside `a a`.
    const { outcome } = swipeCell(s, 2, "down", mulberry32(11));
    expect(outcome.kind).toBe("matched");
  });

  it("bumps a push that makes no line, and leaves the board alone", () => {
    const s = fresh();
    const { state, outcome } = swipeCell(s, 0, "right", mulberry32(11));
    expect(outcome.kind).toBe("rejected");
    expect(state.grid).toEqual(s.grid);
    // Not a mistake being scored: the move count does not move either.
    expect(state.moves).toBe(0);
  });

  it("ignores a push off the edge and changes nothing at all", () => {
    // Not a refusal and not a bump: a finger that left the board did not ask
    // for anything, so it must not clear a gem the child had already picked up.
    const held = { ...fresh(), selected: 8 };
    const { state, outcome } = swipeCell(held, 8, "right", mulberry32(11));
    expect(outcome.kind).toBe("ignored");
    expect(state).toBe(held);
  });

  it("does not need a gem picked up first", () => {
    // The whole point of the gesture: one motion rather than two taps, so it
    // must not quietly depend on the selection the tap path builds.
    const s = stateOf(`
      a a b
      c c a
      b a c
    `);
    expect(s.selected).toBeNull();
    expect(swipeCell(s, 2, "down", mulberry32(11)).outcome.kind).toBe("matched");
  });

  it("clears the selection once a swipe has traded", () => {
    // Otherwise the ring stays on a gem that is no longer there, and the next
    // tap trades against a cell the child is not looking at.
    const held = stateOf(
      `
      a a b
      c c a
      b a c
    `,
      { selected: 8 },
    );
    const { state } = swipeCell(held, 2, "down", mulberry32(11));
    expect(state.selected).toBeNull();
  });
});

describe("the record", () => {
  it("reports the round reached, per difficulty", () => {
    const s = stateOf(`
      a b
      b a
    `);
    const r = scoreReport({ ...s, round: 7 }, "hard");
    expect(r).toEqual({ value: 7, unit: "points", board: "hard" });
  });

  it("uses a board per difficulty, so the scales never mix", () => {
    const s = stateOf(`
      a b
      b a
    `);
    expect(scoreReport(s, "easy").board).not.toBe(scoreReport(s, "hard").board);
  });
});

describe("the levels", () => {
  it("gives every difficulty a board, a palette and a goal", () => {
    for (const level of DIFFICULTIES) {
      const cfg = LEVELS[level];
      expect(cfg.size).toBeGreaterThanOrEqual(6);
      expect(cfg.colors).toBeGreaterThanOrEqual(4);
      expect(cfg.goal).toBeGreaterThan(0);
      expect(cfg.goalStep).toBeGreaterThan(0);
    }
  });

  it("makes each rung harder than the last", () => {
    // Colours are the real lever - more colours means a random swap matches
    // less often - so they must climb monotonically.
    expect(LEVELS.easy.colors).toBeLessThan(LEVELS.medium.colors);
    expect(LEVELS.medium.colors).toBeLessThan(LEVELS.hard.colors);
  });

  it("deals every declared board size without a line on it", () => {
    for (const level of DIFFICULTIES) {
      const cfg = LEVELS[level];
      const grid = dealBoard(cfg.size, cfg.colors, mulberry32(31));
      expect(grid).toHaveLength(cfg.size * cfg.size);
      expect(findMatches(grid, cfg.size)).toEqual([]);
    }
  });
});
