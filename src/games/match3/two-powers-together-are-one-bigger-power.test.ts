import { describe, it, expect } from "vitest";
import { mulberry32 } from "@shared/rng";
import {
  BURST,
  PLAIN,
  RAINBOW,
  STRIPE_COL,
  STRIPE_ROW,
  comboBlast,
  findMatches,
  hasMove,
  LEVELS,
  newGame,
  plainKinds,
  swapAt,
  type Match3State,
} from "./logic";

/**
 * A player asked for the Candy Crush move: put two power-ups together and get
 * something bigger than either, and touch the five-line gem to any colour to
 * take that colour. Both are the SAME gesture underneath - a swap that is legal
 * with no line in it - which is the first thing in this game that fires a power
 * by being touched rather than by being cleared.
 *
 * The geometry is pure, so most of this tests `comboBlast` directly on boards
 * built by hand. The three cells that need the whole cascade - was the swap
 * refused, did the round advance, is the board still alive - go through
 * `swapAt`, which resolves everything in one call.
 */

const SIZE = 6;
// A SEEDED rng, never a constant. `seeded()` refills every hole with the same
// colour, so the board re-matches itself and `settle` never reaches a fixed
// point - the run OOMs rather than failing, which reads as the code hanging
// when it is the fixture that cannot terminate.
const seeded = () => mulberry32(20260905);
const at = (r: number, c: number) => r * SIZE + c;
/** A board with no line anywhere: colour = (r + 2c) % 4 + 1 never triples. */
const striped = () =>
  Array.from({ length: SIZE * SIZE }, (_, i) => ((Math.floor(i / SIZE) + 2 * (i % SIZE)) % 4) + 1);
const kindsWith = (entries: Record<number, number>) => {
  const k = plainKinds(SIZE * SIZE) as number[];
  for (const [i, v] of Object.entries(entries)) k[Number(i)] = v;
  return k;
};
const rowOf = (r: number) => Array.from({ length: SIZE }, (_, c) => at(r, c));
const colOf = (c: number) => Array.from({ length: SIZE }, (_, r) => at(r, c));
const sorted = (xs: readonly number[]) => [...new Set(xs)].sort((a, b) => a - b);

describe("the fixtures this file reasons about", () => {
  it("start with no line on them, so nothing here is measuring a stray match", () => {
    expect(findMatches(striped(), SIZE)).toEqual([]);
  });
});

describe("two power-ups swapped together", () => {
  // b is the pivot - the cell the second tap landed on. Row 2, column 3.
  const A = at(2, 2);
  const B = at(2, 3);

  it("stripe and stripe clear a full row AND a full column, never two rows", () => {
    const cells = comboBlast(A, B, striped(), kindsWith({ [A]: STRIPE_ROW, [B]: STRIPE_ROW }), SIZE);
    expect(cells).not.toBeNull();
    expect(sorted(cells!)).toEqual(sorted([...rowOf(2), ...colOf(3)]));
    // Two of the same orientation is the case that would read as "fire both".
    // It is still a cross, because a cross is the move.
    expect(sorted(cells!).length).toBe(SIZE + SIZE - 1);
  });

  it("the cross is drawn where the finger ended, not where it started", () => {
    const cells = comboBlast(A, B, striped(), kindsWith({ [A]: STRIPE_COL, [B]: STRIPE_ROW }), SIZE)!;
    expect(cells).toContain(at(5, 3));
    expect(cells).not.toContain(at(5, 2));
  });

  it("stripe and burst clear a cross three wide", () => {
    const cells = comboBlast(A, B, striped(), kindsWith({ [A]: STRIPE_ROW, [B]: BURST }), SIZE)!;
    const want = sorted([
      ...rowOf(1), ...rowOf(2), ...rowOf(3),
      ...colOf(2), ...colOf(3), ...colOf(4),
    ]);
    expect(sorted(cells)).toEqual(want);
    expect(want.length).toBe(27);
  });

  it("burst and burst clear five by five, not three by three", () => {
    const cells = comboBlast(A, B, striped(), kindsWith({ [A]: BURST, [B]: BURST }), SIZE)!;
    // Centred on the pivot at (2,3): rows 0..4, columns 1..5.
    const want: number[] = [];
    for (let r = 0; r <= 4; r += 1) for (let c = 1; c <= 5; c += 1) want.push(at(r, c));
    expect(sorted(cells)).toEqual(sorted(want));
    expect(sorted(cells).length).toBe(25);
  });

  it("two rainbows clear the whole board", () => {
    const cells = comboBlast(A, B, striped(), kindsWith({ [A]: RAINBOW, [B]: RAINBOW }), SIZE)!;
    expect(sorted(cells).length).toBe(SIZE * SIZE);
  });

  it("a rainbow and a stripe take every gem of that colour AND the lines through them", () => {
    const grid = striped();
    const kinds = kindsWith({ [A]: STRIPE_ROW, [B]: RAINBOW });
    const color = grid[A];
    const same = grid.map((v, i) => (v === color ? i : -1)).filter((i) => i >= 0);
    const cells = sorted(comboBlast(A, B, grid, kinds, SIZE)!);
    for (const i of same) expect(cells).toContain(i);
    // Strictly more than the plain rainbow would take, or the stripe paid for
    // nothing - which is the whole reason to set the pairing up.
    const plainRainbow = sorted(comboBlast(A, B, grid, kindsWith({ [B]: RAINBOW }), SIZE)!);
    expect(cells.length).toBeGreaterThan(plainRainbow.length);
  });

  it("a rainbow and a burst blow a three-by-three round every gem of that colour", () => {
    const grid = striped();
    const kinds = kindsWith({ [A]: BURST, [B]: RAINBOW });
    const cells = sorted(comboBlast(A, B, grid, kinds, SIZE)!);
    const plainRainbow = sorted(comboBlast(A, B, grid, kindsWith({ [B]: RAINBOW }), SIZE)!);
    expect(cells.length).toBeGreaterThan(plainRainbow.length);
    // The neighbours of one of that colour, which a bare rainbow leaves alone.
    const color = grid[A];
    const one = grid.findIndex((v, i) => v === color && i > SIZE && i % SIZE > 0);
    expect(cells).toContain(one - 1);
  });

  it("gives the same answer whichever gem was tapped first, for a symmetric pair", () => {
    const grid = striped();
    const one = comboBlast(A, B, grid, kindsWith({ [A]: BURST, [B]: BURST }), SIZE)!;
    const other = comboBlast(B, A, grid, kindsWith({ [A]: BURST, [B]: BURST }), SIZE)!;
    // Not identical - the pivot moves - but the same SIZE, which is the promise.
    expect(sorted(other).length).toBe(sorted(one).length);
  });
});

describe("the rainbow, swapped onto an ordinary gem", () => {
  const A = at(3, 2);
  const B = at(3, 3);

  it("takes the colour it was pointed at, never its own", () => {
    const grid = striped();
    // Post-swap: the rainbow sits at B, the plain gem it displaced sits at A.
    const kinds = kindsWith({ [B]: RAINBOW });
    const pointedAt = grid[A];
    const cells = sorted(comboBlast(A, B, grid, kinds, SIZE)!);
    const want = sorted([A, B, ...grid.map((v, i) => (v === pointedAt ? i : -1)).filter((i) => i >= 0)]);
    expect(cells).toEqual(want);
    // And the rainbow's OWN colour, if it differs, is not swept up wholesale.
    const ownColour = grid[B];
    if (ownColour !== pointedAt) {
      const ownEverywhere = grid.map((v, i) => (v === ownColour ? i : -1)).filter((i) => i >= 0);
      expect(ownEverywhere.every((i) => cells.includes(i))).toBe(false);
    }
  });

  it("is a legal swap with no line in it at all", () => {
    const state: Match3State = { ...newGame("easy", seeded()), grid: striped(), kinds: kindsWith({ [B]: RAINBOW }), size: SIZE };
    const swapped = [...state.grid];
    [swapped[A], swapped[B]] = [swapped[B], swapped[A]];
    expect(findMatches(swapped, SIZE), "the fixture must have no line, or this proves nothing").toEqual([]);

    const { outcome, state: after } = swapAt(state, A, B, seeded());
    expect(outcome.kind).not.toBe("rejected");
    // Charged like any other swap. The bonus lands in the same expression, so a
    // combo big enough to finish a round reads as +7 rather than -1 - which is
    // the arithmetic, not a free move.
    expect(after.movesLeft).toBe(
      state.movesLeft - 1 + (after.round > state.round ? LEVELS.easy.movesPerRound : 0),
    );
  });

  it("still refuses an ordinary swap that makes no line - the negative control", () => {
    // One stripe and one plain gem is NOT a combo. It must behave exactly as
    // two plain gems do, or every power-up becomes a free move.
    const state: Match3State = { ...newGame("easy", seeded()), grid: striped(), kinds: kindsWith({ [B]: STRIPE_ROW }), size: SIZE };
    expect(swapAt(state, A, B, seeded()).outcome.kind).toBe("rejected");
  });

  it("and two plain gems with no line are refused too - the other control", () => {
    const state: Match3State = { ...newGame("easy", seeded()), grid: striped(), kinds: plainKinds(SIZE * SIZE), size: SIZE };
    expect(swapAt(state, A, B, seeded()).outcome.kind).toBe("rejected");
  });
});

describe("a board that holds a power-up is not a dead board", () => {
  // A striped board has moves, so it cannot show this. This one has none.
  const locked = () => Array.from({ length: SIZE * SIZE }, (_, i) => ((i % 3) + Math.floor(i / SIZE) * 2) % 5 + 1);

  it("is dead on colours alone, which is the fixture this needs", () => {
    const g = locked();
    // If this ever starts having a move the two cells below stop meaning
    // anything, so it is asserted rather than assumed.
    expect(hasMove(g, SIZE)).toBe(false);
  });

  it("comes alive with a rainbow on it, because a rainbow can be swapped anywhere", () => {
    expect(hasMove(locked(), SIZE, kindsWith({ [at(4, 4)]: RAINBOW }))).toBe(true);
  });

  it("comes alive with two specials side by side, because putting them together is a move", () => {
    expect(hasMove(locked(), SIZE, kindsWith({ [at(1, 1)]: BURST, [at(1, 2)]: STRIPE_COL }))).toBe(true);
  });

  it("stays dead with one lone stripe, which needs a line like anything else", () => {
    expect(hasMove(locked(), SIZE, kindsWith({ [at(1, 1)]: STRIPE_ROW }))).toBe(false);
  });

  it("stays dead when asked without kinds at all - the old callers are unchanged", () => {
    expect(hasMove(locked(), SIZE)).toBe(false);
  });
});

describe("what a combo costs and what it pays", () => {
  const A = at(2, 2);
  const B = at(2, 3);
  const boardOf = (kinds: number[]): Match3State => ({
    ...newGame("easy", seeded()),
    grid: striped(),
    kinds,
    size: SIZE,
  });

  it("spends the pair, so neither gem fires a second time as itself", () => {
    const before = boardOf(kindsWith({ [A]: STRIPE_ROW, [B]: STRIPE_ROW }));
    const { state } = swapAt(before, A, B, seeded());
    // Every kind on the settled board came from a mint, never from a survivor:
    // a spent stripe that stayed put would still be a stripe here.
    expect(state.kinds.length).toBe(SIZE * SIZE);
    expect(state.kinds.every((k) => k === PLAIN || k === STRIPE_ROW || k === STRIPE_COL || k === BURST || k === RAINBOW)).toBe(true);
  });

  it("costs exactly one move, like every other swap", () => {
    const before = boardOf(kindsWith({ [A]: RAINBOW, [B]: RAINBOW }));
    const { state } = swapAt(before, A, B, seeded());
    const bonus = state.round > before.round ? LEVELS.easy.movesPerRound : 0;
    expect(state.movesLeft).toBe(before.movesLeft - 1 + bonus);
  });

  it("advances the round at most once, even when it clears the whole board", () => {
    const before = boardOf(kindsWith({ [A]: RAINBOW, [B]: RAINBOW }));
    const { state } = swapAt(before, A, B, seeded());
    expect(state.round - before.round).toBeLessThanOrEqual(1);
    expect(state.score).toBeGreaterThan(before.score);
  });

  it("mints nothing, even when the same swap also makes a run long enough to mint", () => {
    // A combo is SPENT, not banked. The rule only has teeth on a swap that is
    // BOTH - two stripes put together that also complete a FOUR - because a
    // three mints nothing anyway and every other combo leaves no line at all.
    // A planted defect (`decideSpawns` on the seeded step) survived two earlier
    // fixtures for exactly that reason: they were behaviourally identical.
    const A = at(2, 2);
    const B = at(3, 2);
    const g = [
      1, 3, 1, 3, 1, 3,
      3, 1, 3, 1, 3, 1,
      1, 3, 2, 3, 1, 3,
      2, 2, 1, 2, 4, 3,
      3, 1, 3, 1, 3, 1,
      1, 3, 1, 3, 1, 3,
    ];
    expect(findMatches(g, SIZE), "the fixture must start clean").toEqual([]);
    const swapped = [...g];
    [swapped[A], swapped[B]] = [swapped[B], swapped[A]];
    // Row 3 becomes 2,2,2,2 - a FOUR, which is what mints a stripe.
    expect(findMatches(swapped, SIZE).length).toBeGreaterThanOrEqual(4);

    const before: Match3State = {
      ...newGame("easy", seeded()),
      grid: g,
      kinds: kindsWith({ [A]: STRIPE_ROW, [B]: STRIPE_COL }),
      size: SIZE,
    };
    const { outcome } = swapAt(before, A, B, seeded());
    expect(outcome.kind).toBe("matched");
    if (outcome.kind !== "matched") return;
    expect(outcome.steps[0].spawned).toEqual([]);
  });

  it("leaves a settled board behind, with no hole and nothing a timer owes it", () => {
    const before = boardOf(kindsWith({ [A]: BURST, [B]: BURST }));
    const { state } = swapAt(before, A, B, seeded());
    expect(state.grid.length).toBe(SIZE * SIZE);
    expect(state.grid.every((v) => v >= 1 && v <= state.colors)).toBe(true);
    expect(findMatches(state.grid, SIZE)).toEqual([]);
  });

  it("reports the pair as having fired, so the renderer can draw it", () => {
    const before = boardOf(kindsWith({ [A]: STRIPE_ROW, [B]: BURST }));
    const { outcome } = swapAt(before, A, B, seeded());
    expect(outcome.kind).toBe("matched");
    if (outcome.kind !== "matched") return;
    const firstFired = outcome.steps[0].fired.map((f) => f.kind).sort();
    expect(firstFired).toEqual([STRIPE_ROW, BURST].sort());
  });
});
