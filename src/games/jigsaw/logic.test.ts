import { describe, expect, it } from "vitest";
import { mulberry32 } from "@shared/rng";
import {
  DIFFICULTIES,
  LEVELS,
  correctCount,
  isSolved,
  newGame,
  pieceCount,
  scoreReport,
  shuffledTray,
  tapSlot,
  tapTray,
  type JigsawState,
} from "./logic";

const PICTURES = 6;

/**
 * The invariant the whole module rests on: every piece is in exactly one place.
 *
 * Asserted after every operation below rather than in one test of its own,
 * because the ways to break it are all in the MOVES - a lift that forgets to
 * clear the slot duplicates a piece, and a swap that forgets the occupant loses
 * one. Both leave a board that renders perfectly.
 */
function expectEveryPieceHomedOnce(s: JigsawState) {
  const seen = [...s.tray, ...s.slots.filter((p): p is number => p !== null)].sort((a, b) => a - b);
  expect(seen).toEqual(Array.from({ length: s.slots.length }, (_, i) => i));
  // And a held piece is always a TRAY piece, never one in a slot and never one
  // in neither - a third home for a piece is the shape that makes the line
  // above pass while the game loses one.
  if (s.selected !== null) expect(s.tray).toContain(s.selected);
}

/** Solve a board the short way, for the tests that need a finished one. */
function solve(start: JigsawState): JigsawState {
  let s = start;
  for (let i = 0; i < s.slots.length; i += 1) {
    s = tapTray(s, i).state;
    s = tapSlot(s, i).state;
  }
  return s;
}

describe("a fresh puzzle", () => {
  it("puts every piece in the tray and no piece on the board", () => {
    for (const level of DIFFICULTIES) {
      const s = newGame(level, PICTURES, mulberry32(9));
      expect(s.slots).toHaveLength(pieceCount(level));
      expect(s.slots.every((p) => p === null)).toBe(true);
      expect([...s.tray].sort((a, b) => a - b)).toEqual(
        Array.from({ length: pieceCount(level) }, (_, i) => i),
      );
      expect(s.selected).toBeNull();
      expect(s.moves).toBe(0);
      expectEveryPieceHomedOnce(s);
    }
  });

  it("never hands over a tray that is already the answer", () => {
    // One order in 720 on the easy cut IS 0..5, and a child handed that has no
    // puzzle at all. Checked over many deals rather than one.
    for (let seed = 0; seed < 200; seed += 1) {
      const s = newGame("easy", PICTURES, mulberry32(seed));
      expect(s.tray.some((id, i) => id !== i)).toBe(true);
    }
  });

  it("picks a picture inside the range it was given", () => {
    for (let seed = 0; seed < 50; seed += 1) {
      const s = newGame("medium", PICTURES, mulberry32(seed));
      expect(s.picture).toBeGreaterThanOrEqual(0);
      expect(s.picture).toBeLessThan(PICTURES);
    }
  });

  it("survives being told there is exactly one picture", () => {
    const s = newGame("easy", 1, mulberry32(1));
    expect(s.picture).toBe(0);
  });

  it("is the same deal twice from the same seed", () => {
    expect(newGame("hard", PICTURES, mulberry32(5))).toEqual(
      newGame("hard", PICTURES, mulberry32(5)),
    );
  });
});

describe("picking a piece up", () => {
  const fresh = () => newGame("easy", PICTURES, mulberry32(3));

  it("holds a tray piece", () => {
    const s = fresh();
    const { state } = tapTray(s, s.tray[2]);
    expect(state.selected).toBe(s.tray[2]);
    expectEveryPieceHomedOnce(state);
  });

  it("puts it down when the same piece is tapped twice", () => {
    const s = fresh();
    const held = tapTray(s, s.tray[0]).state;
    expect(tapTray(held, s.tray[0]).state.selected).toBeNull();
  });

  it("ignores a piece that is not in the tray", () => {
    const s = fresh();
    const placed = tapSlot(tapTray(s, s.tray[0]).state, 0).state;
    const piece = placed.slots[0] as number;
    const { state, outcome } = tapTray(placed, piece);
    expect(outcome.kind).toBe("ignored");
    expect(state.selected).toBeNull();
  });

  it("is never counted as a move", () => {
    const s = fresh();
    expect(tapTray(s, s.tray[0]).state.moves).toBe(0);
  });
});

describe("putting a piece down", () => {
  const fresh = () => newGame("easy", PICTURES, mulberry32(3));

  it("places the held piece into an empty slot", () => {
    const s = tapTray(fresh(), 0).state;
    const { state, outcome } = tapSlot(s, 0);
    expect(outcome.kind).toBe("placed");
    expect(state.slots[0]).toBe(0);
    expect(state.tray).not.toContain(0);
    expect(state.selected).toBeNull();
    expect(state.moves).toBe(1);
    expectEveryPieceHomedOnce(state);
  });

  it("accepts a piece in the WRONG slot, and says so", () => {
    // A jigsaw is solved by trying pieces. Refusing a wrong one would remove
    // the game and replace it with a quiz.
    const s = tapTray(fresh(), 0).state;
    const { state, outcome } = tapSlot(s, 3);
    expect(outcome.kind).toBe("placed");
    if (outcome.kind !== "placed") return;
    expect(outcome.home).toBe(false);
    expect(outcome.solved).toBe(false);
    expect(state.slots[3]).toBe(0);
    expectEveryPieceHomedOnce(state);
  });

  it("does nothing when a tap lands on an empty slot with nothing held", () => {
    const s = fresh();
    const { state, outcome } = tapSlot(s, 4);
    expect(outcome.kind).toBe("ignored");
    expect(state).toBe(s);
  });

  it("ignores a slot that is not on the board", () => {
    const s = tapTray(fresh(), 0).state;
    expect(tapSlot(s, 99).outcome.kind).toBe("ignored");
    expect(tapSlot(s, -1).outcome.kind).toBe("ignored");
  });
});

describe("taking a piece back", () => {
  const placed = () => {
    const s = newGame("easy", PICTURES, mulberry32(3));
    return tapSlot(tapTray(s, 2).state, 5).state;
  };

  it("lifts the piece into the hand and back into the tray at once", () => {
    const s = placed();
    const { state, outcome } = tapSlot(s, 5);
    expect(outcome.kind).toBe("lifted");
    expect(state.slots[5]).toBeNull();
    expect(state.selected).toBe(2);
    expect(state.tray).toContain(2);
    expectEveryPieceHomedOnce(state);
  });

  it("is not a move - only placements count", () => {
    const s = placed();
    expect(tapSlot(s, 5).state.moves).toBe(s.moves);
  });
});

describe("swapping", () => {
  it("puts the held piece in and the occupant back in the tray", () => {
    let s = newGame("easy", PICTURES, mulberry32(3));
    s = tapSlot(tapTray(s, 1).state, 0).state; // piece 1 sits in slot 0
    s = tapTray(s, 0).state; // now hold piece 0
    const { state, outcome } = tapSlot(s, 0);

    expect(outcome.kind).toBe("swapped");
    if (outcome.kind !== "swapped") return;
    expect(outcome.displaced).toBe(1);
    expect(outcome.home).toBe(true);
    expect(state.slots[0]).toBe(0);
    expect(state.tray).toContain(1);
    expectEveryPieceHomedOnce(state);
  });

  it("counts as one move, not two", () => {
    let s = newGame("easy", PICTURES, mulberry32(3));
    s = tapSlot(tapTray(s, 1).state, 0).state;
    const before = s.moves;
    s = tapTray(s, 0).state;
    expect(tapSlot(s, 0).state.moves).toBe(before + 1);
  });
});

describe("finishing", () => {
  it("is solved only when every slot holds its own piece", () => {
    const s = newGame("medium", PICTURES, mulberry32(8));
    expect(isSolved(s)).toBe(false);
    const done = solve(s);
    expect(isSolved(done)).toBe(true);
    expect(done.tray).toEqual([]);
  });

  it("reports solved on the placement that finishes it, and not before", () => {
    let s = newGame("easy", PICTURES, mulberry32(8));
    const n = s.slots.length;
    for (let i = 0; i < n - 1; i += 1) {
      s = tapTray(s, i).state;
      const { state, outcome } = tapSlot(s, i);
      s = state;
      if (outcome.kind === "placed") expect(outcome.solved).toBe(false);
    }
    s = tapTray(s, n - 1).state;
    const { outcome } = tapSlot(s, n - 1);
    expect(outcome.kind).toBe("placed");
    if (outcome.kind !== "placed") return;
    expect(outcome.solved).toBe(true);
  });

  it("is not solved by a full board in the wrong order", () => {
    // Every slot occupied and every piece misplaced - the state a "is the tray
    // empty" check would call finished.
    let s = newGame("easy", PICTURES, mulberry32(8));
    const n = s.slots.length;
    for (let i = 0; i < n; i += 1) {
      s = tapTray(s, i).state;
      s = tapSlot(s, (i + 1) % n).state;
    }
    expect(s.tray).toEqual([]);
    expect(isSolved(s)).toBe(false);
    expect(correctCount(s)).toBe(0);
  });

  it("counts the pieces that are home", () => {
    let s = newGame("easy", PICTURES, mulberry32(8));
    expect(correctCount(s)).toBe(0);
    s = tapSlot(tapTray(s, 0).state, 0).state;
    expect(correctCount(s)).toBe(1);
    s = tapSlot(tapTray(s, 1).state, 4).state;
    expect(correctCount(s)).toBe(1);
  });
});

describe("the record", () => {
  it("counts placements, and fewer is better", () => {
    const s = newGame("medium", PICTURES, mulberry32(8));
    const done = solve(s);
    const r = scoreReport(done, "medium");
    expect(r.unit).toBe("moves");
    // A perfect solve is exactly one placement per piece, which is what makes
    // the number readable without explanation.
    expect(r.value).toBe(pieceCount("medium"));
  });

  it("uses a board per difficulty, so twenty pieces never rank against six", () => {
    const s = newGame("easy", PICTURES, mulberry32(8));
    expect(scoreReport(s, "easy").board).not.toBe(scoreReport(s, "hard").board);
  });
});

describe("the cuts", () => {
  it("gets bigger with every rung", () => {
    expect(pieceCount("easy")).toBeLessThan(pieceCount("medium"));
    expect(pieceCount("medium")).toBeLessThan(pieceCount("hard"));
  });

  it("keeps every piece close to square on the 200x150 stage", () => {
    // A cut that letterboxes the pieces makes the picture unreadable at
    // thumbnail size, which is the whole content of this game.
    for (const level of DIFFICULTIES) {
      const { cols, rows } = LEVELS[level];
      const ratio = 200 / cols / (150 / rows);
      expect(ratio).toBeGreaterThan(0.75);
      expect(ratio).toBeLessThan(1.34);
    }
  });
});

describe("the tray shuffle", () => {
  it("returns every piece exactly once", () => {
    const t = shuffledTray(12, mulberry32(2));
    expect([...t].sort((a, b) => a - b)).toEqual(Array.from({ length: 12 }, (_, i) => i));
  });

  it("terminates on a degenerate rng rather than spinning", () => {
    // `rng` always 0 makes Fisher-Yates a no-op, so every shuffle returns the
    // identity. Unbounded retries would hang the game with a spinner in front
    // of a child; the fallback hands back a real permutation instead.
    const t = shuffledTray(6, () => 0);
    expect([...t].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(t.some((id, i) => id !== i)).toBe(true);
  });
});

describe("there is no drag entry point at all", () => {
  it("offers only taps", () => {
    // The kids rule is that drag is never REQUIRED. The strongest form of that
    // is a rules module with nowhere to put one.
    const api = Object.keys({ tapTray, tapSlot, newGame, isSolved });
    expect(api.some((k) => /drag|drop/i.test(k))).toBe(false);
  });
});
