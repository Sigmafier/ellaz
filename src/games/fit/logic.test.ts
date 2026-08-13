// Written BEFORE logic.ts, against the rules the game is supposed to have
// rather than against the code that ended up implementing them.
//
// Everything here drives the pure module with a SEEDED rng, so a failure is a
// failure and never a bad shuffle. Nothing in this file touches the DOM.
import { describe, expect, it } from "vitest";
import { mulberry32 } from "@shared/rng";
import {
  DIFFICULTIES,
  LEVELS,
  MILESTONE_EVERY,
  OFFER_SIZE,
  PALETTE_SIZE,
  SHAPE_IDS,
  clearScore,
  fitsAnywhere,
  isDead,
  legalAnchors,
  makeShape,
  milestoneStep,
  newGame,
  scoreReport,
  tapCell,
  tapSlot,
  type Cell,
  type Difficulty,
  type FitState,
  type ShapeId,
} from "./logic";

const seeded = (n = 1) => mulberry32(n);

/** A board with every cell filled except the ones named. */
function boardWith(state: FitState, empty: number[]): Cell[] {
  const grid: Cell[] = Array(state.size * state.size).fill(1);
  for (const i of empty) grid[i] = null;
  return grid;
}

/** An empty board with only the named cells filled. */
function boardOnly(state: FitState, filled: number[]): Cell[] {
  const grid: Cell[] = Array(state.size * state.size).fill(null);
  for (const i of filled) grid[i] = 1;
  return grid;
}

/** Force an exact offer, so a test never depends on what the bag drew. */
function withOffer(state: FitState, ids: (ShapeId | null)[]): FitState {
  return { ...state, offer: ids, selected: ids.findIndex((i) => i !== null) };
}

describe("the shapes", () => {
  it("are all non-empty and normalised to their own top-left", () => {
    for (const id of SHAPE_IDS) {
      const s = makeShape(id);
      expect(s.cells.length, id).toBeGreaterThan(0);
      expect(Math.min(...s.cells.map(([r]) => r)), id).toBe(0);
      expect(Math.min(...s.cells.map(([, c]) => c)), id).toBe(0);
    }
  });

  it("declare a bounding box that actually bounds them", () => {
    for (const id of SHAPE_IDS) {
      const s = makeShape(id);
      expect(Math.max(...s.cells.map(([r]) => r)), id).toBe(s.h - 1);
      expect(Math.max(...s.cells.map(([, c]) => c)), id).toBe(s.w - 1);
    }
  });

  it("are all connected, because a shape in two pieces reads as a bug", () => {
    for (const id of SHAPE_IDS) {
      const s = makeShape(id);
      const key = (r: number, c: number) => `${r},${c}`;
      const all = new Set(s.cells.map(([r, c]) => key(r, c)));
      const seen = new Set<string>();
      const stack: Array<[number, number]> = [[s.cells[0][0], s.cells[0][1]]];
      while (stack.length) {
        const [r, c] = stack.pop() as [number, number];
        if (seen.has(key(r, c))) continue;
        seen.add(key(r, c));
        for (const [dr, dc] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          if (all.has(key(r + dr, c + dc))) stack.push([r + dr, c + dc]);
        }
      }
      expect(seen.size, id).toBe(s.cells.length);
    }
  });

  it("only offers a level shapes that fit on that level's board", () => {
    for (const d of DIFFICULTIES) {
      const { size, pool } = LEVELS[d];
      for (const id of pool) {
        const s = makeShape(id);
        expect(Math.max(s.w, s.h), `${d}/${id}`).toBeLessThanOrEqual(size);
      }
    }
  });

  it("name a palette entry the renderer actually has", () => {
    // The rules never learn a hex code - `color` is an index, and the renderer
    // owns the array behind it. A tenth colour added here without a tenth entry
    // there would paint that whole shape family the fallback yellow, on a board
    // that otherwise looks completely normal.
    for (const id of SHAPE_IDS) {
      const { color } = makeShape(id);
      expect(color, id).toBeGreaterThanOrEqual(1);
      expect(color, id).toBeLessThanOrEqual(PALETTE_SIZE);
    }
    expect(new Set(SHAPE_IDS.map((id) => makeShape(id).color)).size).toBe(PALETTE_SIZE);
  });
});

describe("a new game", () => {
  it("opens on an empty board with a full offer and something already held", () => {
    for (const d of DIFFICULTIES) {
      const s = newGame(d, seeded());
      expect(s.grid.length).toBe(LEVELS[d].size ** 2);
      expect(s.grid.every((c) => c === null)).toBe(true);
      expect(s.offer.length).toBe(OFFER_SIZE);
      expect(s.offer.every((id) => id !== null)).toBe(true);
      expect(s.selected).toBe(0);
      expect(s.score).toBe(0);
      expect(s.cleared).toBe(0);
      expect(s.placed).toBe(0);
      expect(isDead(s)).toBe(false);
    }
  });

  it("only ever offers shapes from its own level's pool", () => {
    for (const d of DIFFICULTIES) {
      for (let seed = 1; seed <= 20; seed++) {
        const s = newGame(d, seeded(seed));
        for (const id of s.offer) expect(LEVELS[d].pool, `${d}/${seed}`).toContain(id);
      }
    }
  });

  it("is deterministic given the same seed, and differs across seeds", () => {
    expect(newGame("hard", seeded(7))).toEqual(newGame("hard", seeded(7)));
    const many = new Set(
      Array.from({ length: 24 }, (_, i) => newGame("hard", seeded(i + 1)).offer.join()),
    );
    expect(many.size).toBeGreaterThan(1);
  });
});

describe("placing", () => {
  it("paints the held shape's own cells and nothing else", () => {
    const s = withOffer(newGame("medium", seeded()), ["box2", "dot", "dot"]);
    const { state, outcome } = tapCell(s, 0, seeded());
    expect(outcome.kind).toBe("placed");
    const painted = state.grid.flatMap((c, i) => (c === null ? [] : [i]));
    expect(painted.sort((a, b) => a - b)).toEqual([0, 1, s.size, s.size + 1]);
  });

  it("pays one point per cell when nothing clears", () => {
    const s = withOffer(newGame("medium", seeded()), ["trio3h", "dot", "dot"]);
    const { state } = tapCell(s, 0, seeded());
    expect(state.score).toBe(3);
    expect(state.placed).toBe(1);
    expect(state.cleared).toBe(0);
  });

  it("refuses a placement that would leave the board", () => {
    const s = withOffer(newGame("medium", seeded()), ["trio3h", "dot", "dot"]);
    // Two columns from the right edge: a three-wide shape cannot start here.
    const { state, outcome } = tapCell(s, s.size - 2, seeded());
    expect(outcome).toEqual({ kind: "blocked", at: s.size - 2 });
    expect(state).toBe(s);
  });

  it("refuses a placement that would overlap what is already there", () => {
    const s = withOffer(newGame("medium", seeded()), ["dot", "dot", "dot"]);
    const first = tapCell(s, 0, seeded()).state;
    const again = tapCell(first, 0, seeded());
    expect(again.outcome.kind).toBe("blocked");
    expect(again.state).toBe(first);
  });

  it("anchors the shape at its own TOP-LEFT, which is what the hint dots show", () => {
    const s = withOffer(newGame("medium", seeded()), ["duo2v", "dot", "dot"]);
    const anchors = legalAnchors(s, makeShape("duo2v"));
    // Every cell on the bottom row is an illegal anchor for a two-tall shape.
    for (let c = 0; c < s.size; c++) {
      expect(anchors).not.toContain((s.size - 1) * s.size + c);
      expect(anchors).toContain((s.size - 2) * s.size + c);
    }
  });

  it("takes the used slot out of the offer and holds the next one", () => {
    const s = withOffer(newGame("medium", seeded()), ["dot", "duo2h", "trio3h"]);
    const { state } = tapCell(s, 0, seeded());
    expect(state.offer[0]).toBeNull();
    expect(state.selected).toBe(1);
  });

  it("refills the offer once all three are used, never before", () => {
    const s = withOffer(newGame("medium", seeded()), ["dot", "dot", "dot"]);
    const one = tapCell(s, 0, seeded());
    expect(one.outcome.kind === "placed" && one.outcome.refilled).toBe(false);
    const two = tapCell(one.state, 1, seeded());
    const three = tapCell(two.state, 2, seeded());
    expect(three.outcome.kind === "placed" && three.outcome.refilled).toBe(true);
    expect(three.state.offer.every((id) => id !== null)).toBe(true);
    expect(three.state.selected).toBe(0);
  });
});

describe("clearing", () => {
  it("clears a full row and pays the clear on top of the cells placed", () => {
    const base = newGame("medium", seeded());
    const size = base.size;
    // Row 0 filled except its last cell, and nothing else on the board - so the
    // dot completes exactly one line and no column comes with it.
    const filled = Array.from({ length: size - 1 }, (_, c) => c);
    const s = withOffer({ ...base, grid: boardOnly(base, filled) }, ["dot", "duo2h", "trio3h"]);

    const { state, outcome } = tapCell(s, size - 1, seeded());
    if (outcome.kind !== "placed") throw new Error("expected a placement");
    expect(outcome.rows).toEqual([0]);
    expect(outcome.cols).toEqual([]);
    expect(outcome.clearedCells.length).toBe(size);
    expect(state.cleared).toBe(1);
    for (let c = 0; c < size; c++) expect(state.grid[c]).toBeNull();
    expect(state.score).toBe(1 + clearScore(1));
  });

  it("clears a full column too, which is the whole difference from a falling game", () => {
    const base = newGame("medium", seeded());
    const size = base.size;
    const filled = Array.from({ length: size - 1 }, (_, r) => r * size);
    const s = withOffer({ ...base, grid: boardOnly(base, filled) }, ["dot", "dot", "dot"]);

    const { state, outcome } = tapCell(s, (size - 1) * size, seeded());
    if (outcome.kind !== "placed") throw new Error("expected a placement");
    expect(outcome.cols).toEqual([0]);
    expect(outcome.rows).toEqual([]);
    expect(state.cleared).toBe(1);
  });

  it("counts a shared cell once when a row and a column go together", () => {
    const base = newGame("medium", seeded());
    const size = base.size;
    // Row 0 and column 0, each one cell short, and nothing else on the board -
    // so the corner completes exactly two lines rather than the whole grid.
    const filled: number[] = [];
    for (let c = 1; c < size; c++) filled.push(c);
    for (let r = 1; r < size; r++) filled.push(r * size);
    const s = withOffer({ ...base, grid: boardOnly(base, filled) }, ["dot", "dot", "dot"]);

    const { state, outcome } = tapCell(s, 0, seeded());
    if (outcome.kind !== "placed") throw new Error("expected a placement");
    expect(outcome.rows).toEqual([0]);
    expect(outcome.cols).toEqual([0]);
    // Two full lines share their corner, so it is 2 * size - 1 cells, not 2 * size.
    expect(outcome.clearedCells.length).toBe(2 * size - 1);
    expect(state.cleared).toBe(2);
    expect(state.score).toBe(1 + clearScore(2));
  });

  it("pays more for two lines at once than for two lines one at a time", () => {
    expect(clearScore(0)).toBe(0);
    expect(clearScore(2)).toBeGreaterThan(2 * clearScore(1));
    for (let n = 1; n < 8; n++) expect(clearScore(n)).toBeGreaterThan(clearScore(n - 1));
  });
});

describe("the end of a run", () => {
  it("is not over while any offered shape still fits somewhere", () => {
    const base = newGame("medium", seeded());
    const s = withOffer({ ...base, grid: boardWith(base, [0]) }, ["box2", "box2", "dot"]);
    expect(fitsAnywhere(s, makeShape("box2"))).toBe(false);
    expect(fitsAnywhere(s, makeShape("dot"))).toBe(true);
    expect(isDead(s)).toBe(false);
  });

  it("is over when nothing offered fits anywhere", () => {
    const base = newGame("medium", seeded());
    const s = withOffer({ ...base, grid: boardWith(base, []) }, ["dot", "dot", "dot"]);
    expect(isDead(s)).toBe(true);
  });

  it("answers every tap with nothing once it is over", () => {
    const base = newGame("medium", seeded());
    const s = withOffer({ ...base, grid: boardWith(base, []) }, ["dot", "dot", "dot"]);
    expect(tapCell(s, 0, seeded()).outcome).toEqual({ kind: "ignored" });
    expect(tapSlot(s, 1).outcome).toEqual({ kind: "ignored" });
  });

  it("hands the easy board a shape it can take, while the pool still holds one", () => {
    // `forgiving` is easy's difficulty lever: a refill prefers a shape the
    // board can actually accept, so a run ends because the board is full rather
    // than because the draw was unlucky.
    expect(LEVELS.easy.forgiving).toBe(true);
    const base = newGame("easy", seeded());
    const size = base.size;
    // Three free squares, arranged so filling one completes no line at all.
    const s = {
      ...base,
      grid: boardWith(base, [0, 1, size]),
      offer: ["dot", null, null] as (ShapeId | null)[],
      selected: 0,
    };

    const { state } = tapCell(s, 0, seeded(3));
    // Two diagonal free squares are left, so only a single cell can fit - and
    // the refill found one rather than ending a live run on a bad draw.
    expect(state.offer.some((id) => id !== null && fitsAnywhere(state, makeShape(id)))).toBe(true);
    expect(isDead(state)).toBe(false);
  });
});

describe("choosing a shape", () => {
  it("switches to another slot", () => {
    const s = newGame("medium", seeded());
    const { state, outcome } = tapSlot(s, 2);
    expect(outcome).toEqual({ kind: "selected", slot: 2 });
    expect(state.selected).toBe(2);
  });

  it("re-affirms the held slot rather than letting a child hold nothing", () => {
    const s = newGame("medium", seeded());
    const { state, outcome } = tapSlot(s, 0);
    expect(outcome).toEqual({ kind: "selected", slot: 0 });
    expect(state.selected).toBe(0);
  });

  it("ignores an empty slot and an index off the end", () => {
    const s = withOffer(newGame("medium", seeded()), ["dot", null, "dot"]);
    expect(tapSlot(s, 1).outcome).toEqual({ kind: "ignored" });
    expect(tapSlot(s, 9).outcome).toEqual({ kind: "ignored" });
  });

  it("holds something at every moment of a long run", () => {
    let s = newGame("easy", seeded(11));
    for (let n = 0; n < 400 && !isDead(s); n++) {
      expect(s.offer[s.selected], `turn ${n}`).not.toBeNull();
      const slot = s.offer.findIndex((id) => id !== null && fitsAnywhere(s, makeShape(id)));
      if (slot === -1) break;
      if (slot !== s.selected) {
        s = tapSlot(s, slot).state;
        continue;
      }
      const anchors = legalAnchors(s, makeShape(s.offer[slot] as ShapeId));
      s = tapCell(s, anchors[0], mulberry32(100 + n)).state;
    }
    expect(s.placed).toBeGreaterThan(10);
  });
});

describe("what the run reports", () => {
  it("reports a value and a unit and never a direction", () => {
    const s = { ...newGame("hard", seeded()), score: 420 };
    const report = scoreReport(s, "hard");
    expect(report).toEqual({ value: 420, unit: "points", board: "hard" });
    expect(Object.keys(report)).not.toContain("direction");
  });

  it("scopes the record to the difficulty, because the boards are different sizes", () => {
    const sizes = new Set(DIFFICULTIES.map((d) => LEVELS[d].size));
    expect(sizes.size).toBeGreaterThan(1);
    for (const d of DIFFICULTIES) expect(scoreReport(newGame(d, seeded()), d).board).toBe(d);
  });

  it("steps a milestone once every MILESTONE_EVERY lines and never in between", () => {
    expect(milestoneStep(0)).toBe(0);
    expect(milestoneStep(MILESTONE_EVERY - 1)).toBe(0);
    expect(milestoneStep(MILESTONE_EVERY)).toBe(1);
    expect(milestoneStep(MILESTONE_EVERY * 2)).toBe(2);
    // Monotonic, so a resumed run recomputing this from its own line count can
    // never land BELOW the step it has already been paid for.
    for (let n = 1; n < 40; n++) {
      expect(milestoneStep(n)).toBeGreaterThanOrEqual(milestoneStep(n - 1));
    }
  });
});

describe("the levels", () => {
  it("are the three the economy already knows how to price", () => {
    expect(DIFFICULTIES).toEqual<Difficulty[]>(["easy", "medium", "hard"]);
  });

  it("get harder: a smaller board, a bigger pool, or fewer favours", () => {
    expect(LEVELS.easy.pool.length).toBeLessThan(LEVELS.medium.pool.length);
    expect(LEVELS.medium.pool.length).toBeLessThan(LEVELS.hard.pool.length);
    expect(LEVELS.easy.forgiving).toBe(true);
    expect(LEVELS.medium.forgiving).toBe(false);
    expect(LEVELS.hard.forgiving).toBe(false);
  });

  it("name only shapes that exist", () => {
    for (const d of DIFFICULTIES) {
      for (const id of LEVELS[d].pool) expect(SHAPE_IDS).toContain(id);
    }
  });
});
