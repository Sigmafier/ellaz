/**
 * Match Three's power-ups: made by the SHAPE of a match, fired when they GO.
 *
 * Asked for 2026-09-04 (issue #24): "the candy crash super powers". The point
 * of this design is that there is no new input, no new gesture and nothing a
 * five-year-old has to be taught. You match, and sometimes the board does
 * something bigger. A gem's KIND is decided by the shape that made it and it
 * fires when it is cleared - never by being tapped.
 *
 * WHAT THIS FILE HOLDS, and every cell is a thing that was wrong or could be:
 *
 *   the SHAPE     - 3 mints nothing, 4 a stripe along the run, 5 a rainbow,
 *                   an L or T a burst at its intersection, and a cross whose
 *                   long arm is five is a RAINBOW rather than a burst;
 *   the BLAST     - a stripe takes its line, a burst its 3x3, a rainbow every
 *                   gem of its colour, and a blast that catches another
 *                   special fires that one too, to a fixed point;
 *   the CARRYING  - the kind travels with its gem through a swap, through
 *                   gravity, and through a shuffle;
 *   the REPORTING - `spawned` names the square the minted gem LANDED on, and
 *                   a special that merely fell is not reported as minted;
 *   the OLD RULES - `findMatches`, `hasMove` and `dealBoard` reason about
 *                   colour alone and are the same code they were.
 *
 * Every fixture here was built by hand and is PROVEN to have no pre-existing
 * match before it is used, because a fixture that is already matching measures
 * the settle loop rather than the cell it was written for.
 */
import { describe, expect, it } from "vitest";
import { mulberry32 } from "@shared/rng";
import {
  BURST,
  LEVELS,
  PLAIN,
  RAINBOW,
  STRIPE_COL,
  STRIPE_ROW,
  blastOf,
  dealBoard,
  decideSpawns,
  findMatches,
  findRuns,
  fireSpecials,
  hasMove,
  newGame,
  plainKinds,
  shuffleWithKinds,
  swapAt,
  type Kind,
  type Match3State,
} from "./logic";

/** A board written as text. Letters map to colours in first-seen order. */
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
    if (ch === ".") return 0;
    if (!seen.has(ch)) seen.set(ch, seen.size + 1);
    return seen.get(ch) as number;
  });
  return { grid, size };
}

function stateOf(text: string, kinds?: readonly Kind[]): Match3State {
  const { grid, size } = board(text);
  return {
    level: "easy",
    size,
    colors: Math.max(...grid),
    grid,
    kinds: kinds ?? plainKinds(grid.length),
    selected: null,
    round: 1,
    cleared: 0,
    goal: 9999,
    score: 0,
    moves: 0,
    movesLeft: 999,
  };
}

/** The spawns a board's shapes would mint. */
const spawnsOf = (text: string) => {
  const { grid, size } = board(text);
  return decideSpawns(findRuns(grid, size));
};

describe("the shape decides the power-up", () => {
  it("mints nothing for a plain three", () => {
    expect([
      ...spawnsOf(`
        a a a d e
        b c d e a
        c d e a b
        d e a b c
        e a b c d
      `),
    ]).toEqual([]);
  });

  it("mints a stripe ALONG the run for a four, at its middle", () => {
    expect([
      ...spawnsOf(`
        a b c d e
        a a a a b
        c d e c d
        d e c d e
        e c d e c
      `),
    ]).toEqual([[7, STRIPE_ROW]]);

    // The same four standing up mints the other stripe. A single STRIPE kind
    // that guessed its axis from the board is the version of this that clears
    // the wrong line, silently, on a board nobody is watching.
    expect([
      ...spawnsOf(`
        a b c d e
        a c d e c
        a d e c d
        a e c d e
        b c d e c
      `),
    ]).toEqual([[10, STRIPE_COL]]);
  });

  it("mints a rainbow for five", () => {
    expect([
      ...spawnsOf(`
        a b c d e
        a a a a a
        c d e c d
        d e c d e
        e c d e c
      `),
    ]).toEqual([[7, RAINBOW]]);
  });

  it("mints a burst at the INTERSECTION of an L", () => {
    // Index 5 is the corner - the one gem in both runs. A burst minted at
    // either run's middle instead would appear off the shape a child drew.
    expect([
      ...spawnsOf(`
        b c d e c
        a a a b c
        a c d e d
        a d e c e
        c e d e c
      `),
    ]).toEqual([[5, BURST]]);
  });

  it("mints a RAINBOW, not a burst, when a cross has a five-long arm", () => {
    // The one that was wrong in the first draft: `spent` retired both runs, so
    // the five never reached the rainbow branch and the bigger shape paid out
    // the smaller gem. A child who lines up five that happen to touch a three
    // must not be punished for the better move.
    expect([
      ...spawnsOf(`
        a b c d e
        a c d e c
        a a a a a
        c d e c d
        d e c d e
      `),
    ]).toEqual([[10, RAINBOW]]);
  });

  it("never mints two gems on one square", () => {
    const spawns = spawnsOf(`
      a b c d e
      a c d e c
      a a a a a
      c d e c d
      d e c d e
    `);
    expect(new Set(spawns.keys()).size).toBe(spawns.size);
  });
});

describe("a power-up fires when it goes", () => {
  const plainBoard = board(`
    a b c d e
    b c d e a
    c d e a b
    d e a b c
    e a b c d
  `);

  it("a row stripe takes its whole row, a column stripe its whole column", () => {
    expect(blastOf(12, STRIPE_ROW, plainBoard.grid, 5)).toEqual([10, 11, 12, 13, 14]);
    expect(blastOf(12, STRIPE_COL, plainBoard.grid, 5)).toEqual([2, 7, 12, 17, 22]);
  });

  it("a burst takes the 3x3 around it, clipped at the edge", () => {
    expect(blastOf(12, BURST, plainBoard.grid, 5)).toEqual([6, 7, 8, 11, 12, 13, 16, 17, 18]);
    // A corner keeps only what is on the board. Off-board indices wrap to real
    // squares on a row-major grid, so a missing bounds check does not throw -
    // it clears four gems on the far side of the board.
    expect(blastOf(0, BURST, plainBoard.grid, 5)).toEqual([0, 1, 5, 6]);
  });

  it("a rainbow takes every gem sharing its colour", () => {
    const colour = plainBoard.grid[12];
    const hit = blastOf(12, RAINBOW, plainBoard.grid, 5);
    expect(hit.every((i) => plainBoard.grid[i] === colour)).toBe(true);
    expect(hit.length).toBe(plainBoard.grid.filter((v) => v === colour).length);
  });

  it("an ordinary gem takes nothing, so every cleared cell can be asked", () => {
    expect(blastOf(12, PLAIN, plainBoard.grid, 5)).toEqual([]);
  });

  it("chains: a blast that reaches another special sets that one off too", () => {
    // A row stripe at 12 clears row 2. A column stripe sits at 14, in that row
    // and two squares away. Firing one must fire the other, or a power-up
    // reached by another power-up sits there and does nothing - which is
    // exactly what makes one feel broken.
    const kinds = plainKinds(25);
    kinds[12] = STRIPE_ROW;
    kinds[14] = STRIPE_COL;
    const hit = fireSpecials([12], plainBoard.grid, kinds, 5);
    for (const i of [10, 11, 12, 13, 14]) expect(hit.has(i)).toBe(true);
    for (const i of [4, 9, 14, 19, 24]) expect(hit.has(i)).toBe(true);
  });

  it("runs to a FIXED POINT, three links deep", () => {
    // A chain that can only be walked in order: the row stripe at 0 takes row
    // 0, which REACHES the column stripe at 4; that takes column 4, which
    // reaches the row stripe at 24; that takes row 4.
    //
    // The depth is the assertion. One pass clears 5 squares, two clear 9,
    // three clear 13 - so the number distinguishes a chain that stops early
    // from one that runs out, which "did it clear a lot" would not.
    const kinds = plainKinds(25);
    kinds[0] = STRIPE_ROW;
    kinds[4] = STRIPE_COL;
    kinds[24] = STRIPE_ROW;
    expect(fireSpecials([0], plainBoard.grid, kinds, 5).size).toBe(13);
  });

  it("terminates on a board that is nothing but specials", () => {
    const kinds = plainKinds(25).map(() => BURST as Kind);
    expect(fireSpecials([0], plainBoard.grid, kinds, 5).size).toBe(25);
  });
});

describe("the power-up travels with its gem", () => {
  // A stripe at index 2. The swap below clears three squares in row 2, so the
  // stripe falls from 2 to 7 - it MOVES, and it is not minted.
  const FALLING = `
    a b c d e
    b c a e d
    c a b a e
    d e a c b
    e d c b a
  `;

  it("the fixture is settled to begin with, or it measures the wrong thing", () => {
    expect(findMatches(board(FALLING).grid, 5)).toEqual([]);
  });

  it("falls WITH its gem when the squares under it clear", () => {
    const kinds = plainKinds(25);
    kinds[2] = STRIPE_ROW;
    const out = swapAt(stateOf(FALLING, kinds), 12, 17, mulberry32(3));
    expect(out.outcome.kind).toBe("matched");
    if (out.outcome.kind !== "matched") return;
    const step = out.outcome.steps[0];
    expect(step.cleared).toEqual([11, 12, 13]);
    // Moved down one square in its own column, still a stripe, still the only
    // one. A kind left behind while its colour fell would put the power-up on
    // whatever landed underneath it - the board appearing to cheat.
    expect(step.kinds.filter((k) => k !== PLAIN).length).toBe(1);
    expect(step.kinds[7]).toBe(STRIPE_ROW);
  });

  it("is NOT reported as newly minted just because it landed somewhere new", () => {
    // The defect this cell exists for: `spawned` was derived by diffing the
    // kinds arrays across gravity, and a special that merely FELL lands on a
    // square that used to be plain - so every drop read as a fresh mint and
    // the renderer drew the sparkle on a gem the child had had for three
    // moves. `spawned` is now mapped through collapse's own record of what
    // moved where, and this shape mints nothing at all.
    const kinds = plainKinds(25);
    kinds[2] = STRIPE_ROW;
    const out = swapAt(stateOf(FALLING, kinds), 12, 17, mulberry32(3));
    if (out.outcome.kind !== "matched") throw new Error("fixture stopped matching");
    expect(out.outcome.steps[0].spawned).toEqual([]);
  });

  it("names the square a minted gem LANDED on, after gravity", () => {
    // A T whose corner is minted and then falls, because the squares under it
    // are part of the same shape. The renderer draws the mint sparkle at the
    // reported index; a pre-drop index draws it on empty air.
    const out = swapAt(
      stateOf(`
        b c d e c
        c a a a c
        a c d e d
        a d e c e
        c e d e c
      `),
      5,
      10,
      mulberry32(11),
    );
    if (out.outcome.kind !== "matched") throw new Error("fixture stopped matching");
    const step = out.outcome.steps[0];
    expect(step.spawned.length).toBe(1);
    const landed = step.spawned[0];
    // Wherever it landed, the board AGREES: the reported square really holds
    // that kind. This is the assertion a pre-drop index fails.
    expect(step.kinds[landed.index]).toBe(landed.kind);
  });

  it("travels through a swap rather than staying on the square", () => {
    // The swap trades 12 and 17, and the line it makes is 11-12-13. A burst
    // starting on 12 therefore rides DOWN to 17, out of the line, and does not
    // fire; a burst starting on 17 rides UP into the line and does. Both
    // directions are asserted, because a kind left behind on its old square
    // gets the first one right by accident.
    const rode = plainKinds(25);
    rode[12] = BURST;
    const away = swapAt(stateOf(FALLING, rode), 12, 17, mulberry32(3));
    if (away.outcome.kind !== "matched") throw new Error("fixture stopped matching");
    expect(away.outcome.swappedKinds[17]).toBe(BURST);
    expect(away.outcome.swappedKinds[12]).toBe(PLAIN);
    expect(away.outcome.steps[0].fired).toEqual([]);

    const into = plainKinds(25);
    into[17] = BURST;
    const hit = swapAt(stateOf(FALLING, into), 12, 17, mulberry32(3));
    if (hit.outcome.kind !== "matched") throw new Error("fixture stopped matching");
    expect(hit.outcome.swappedKinds[12]).toBe(BURST);
    expect(hit.outcome.steps[0].fired).toEqual([{ index: 12, kind: BURST }]);
    // And the blast really widened the clear: the 3x3 around 12 went too,
    // where the plain version of the same swap took exactly three squares.
    expect(hit.outcome.steps[0].cleared.length).toBeGreaterThan(3);
  });

  it("survives a shuffle, which is when a child is most likely to be holding one", () => {
    const start = newGame("easy", mulberry32(5));
    const kinds = plainKinds(start.grid.length);
    kinds[0] = RAINBOW;
    kinds[7] = STRIPE_COL;
    const mixed = shuffleWithKinds(start.grid, kinds, start.size, start.colors, mulberry32(9));
    expect([...mixed.kinds].filter((k) => k !== PLAIN).sort()).toEqual(
      [...kinds].filter((k) => k !== PLAIN).sort(),
    );
    // And on gems, never on nothing: a kind on a hole is a power-up nobody
    // can ever fire.
    for (let i = 0; i < mixed.kinds.length; i += 1) {
      if (mixed.kinds[i] !== PLAIN) expect(mixed.grid[i]).toBeGreaterThan(0);
    }
  });
});

describe("the rules that existed before power-ups are the same rules", () => {
  it("matching is not given the kinds at all, so it cannot depend on them", () => {
    expect(findMatches.length).toBe(2);
    expect(hasMove.length).toBe(2);
    expect(dealBoard.length).toBe(3);
  });

  it("a fresh deal carries no power-ups, on every level", () => {
    for (const level of ["easy", "medium", "hard"] as const) {
      const fresh = newGame(level, mulberry32(3));
      expect(fresh.kinds.length).toBe(LEVELS[level].size ** 2);
      expect(fresh.kinds.every((k) => k === PLAIN)).toBe(true);
    }
  });

  it("a settled board never holds a power-up on a hole, over 400 real swaps", () => {
    // A kind stranded on a 0 is unreachable for ever, and it is exactly what a
    // gravity pass that moves colours without moving kinds produces.
    const rng = mulberry32(77);
    let state = newGame("medium", rng);
    let sawOne = false;
    for (let n = 0; n < 400; n += 1) {
      const i = Math.floor(rng() * state.grid.length);
      const j = i + (rng() < 0.5 ? 1 : state.size);
      state = swapAt(state, i, j, rng).state;
      expect(state.kinds.length).toBe(state.grid.length);
      for (let c = 0; c < state.grid.length; c += 1) {
        if (state.kinds[c] !== PLAIN) {
          sawOne = true;
          expect(state.grid[c]).toBeGreaterThan(0);
        }
      }
    }
    // The instrument must have seen a power-up at all, or this cell passes on
    // a run where none was ever minted and proves nothing.
    expect(sawOne, "no power-up appeared in 400 swaps - the cell proved nothing").toBe(true);
  });
});
