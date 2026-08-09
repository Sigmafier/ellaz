import { describe, it, expect } from "vitest";
import { newGame, flip, resolveMismatch, isWon, settle, shuffle } from "./logic";

const FACES = ["🐶", "🐱", "🦊"]; // 3 pairs = 6 cards

describe("memory logic", () => {
  it("builds a deck of pairs, all face-down", () => {
    const s = newGame(FACES, () => 0);
    expect(s.cards.length).toBe(6);
    expect(s.totalPairs).toBe(3);
    expect(s.cards.every((c) => !c.flipped && !c.matched)).toBe(true);
  });

  it("reveals the first card, then matches an identical second", () => {
    // Deterministic deck: identity shuffle keeps [dog,dog,cat,cat,fox,fox]... but
    // shuffle with rng=()=>0 produces a fixed order; find two identical faces.
    let s = newGame(FACES, () => 0);
    const firstFace = s.cards[0].face;
    const partner = s.cards.findIndex((c, i) => i !== 0 && c.face === firstFace);

    let r = flip(s, 0);
    expect(r.outcome.kind).toBe("revealed");
    s = r.state;

    r = flip(s, partner);
    expect(r.outcome.kind).toBe("matched");
    s = r.state;
    expect(s.matchedPairs).toBe(1);
    expect(s.cards[0].matched).toBe(true);
    expect(s.cards[partner].matched).toBe(true);
    expect(s.moves).toBe(1);
  });

  it("locks on mismatch and resolves back to face-down", () => {
    let s = newGame(FACES, () => 0);
    const firstFace = s.cards[0].face;
    const different = s.cards.findIndex((c) => c.face !== firstFace);

    s = flip(s, 0).state;
    const r = flip(s, different);
    expect(r.outcome.kind).toBe("mismatch");
    s = r.state;
    expect(s.lock).toBe(true);

    s = resolveMismatch(s, 0, different);
    expect(s.lock).toBe(false);
    expect(s.cards[0].flipped).toBe(false);
    expect(s.cards[different].flipped).toBe(false);
  });

  it("ignores taps while locked or on matched/flipped cards", () => {
    let s = newGame(FACES, () => 0);
    s = flip(s, 0).state;
    // tapping the same card again is ignored
    expect(flip(s, 0).outcome.kind).toBe("ignored");
  });

  it("detects a win when all pairs matched", () => {
    let s = newGame(FACES, () => 0);
    // Greedily match every pair.
    while (!isWon(s)) {
      const a = s.cards.findIndex((c) => !c.matched);
      const b = s.cards.findIndex((c, i) => i !== a && !c.matched && c.face === s.cards[a].face);
      s = flip(s, a).state;
      s = flip(s, b).state;
    }
    expect(isWon(s)).toBe(true);
    expect(s.matchedPairs).toBe(3);
  });

  it("shuffle preserves multiset of elements", () => {
    const out = shuffle([1, 2, 3, 4, 5], () => 0.5);
    expect(out.slice().sort()).toEqual([1, 2, 3, 4, 5]);
  });

  // Difficulty levels pass a differently-sized faces slice to newGame. Verify the
  // deck size and totalPairs scale with the slice, and every face appears exactly twice.
  it.each([
    [6, "easy"],
    [8, "medium"],
    [10, "hard"],
  ])("builds a %i-pair deck (%s) with each face appearing twice", (pairs) => {
    const faces = Array.from({ length: pairs }, (_, i) => `F${i}`);
    const s = newGame(faces, () => 0);
    expect(s.cards.length).toBe(pairs * 2);
    expect(s.totalPairs).toBe(pairs);
    expect(s.cards.every((c) => !c.flipped && !c.matched)).toBe(true);
    for (const f of faces) {
      expect(s.cards.filter((c) => c.face === f).length).toBe(2);
    }
  });

  it("wins a larger (10-pair) deck by greedily matching every pair", () => {
    const faces = Array.from({ length: 10 }, (_, i) => `F${i}`);
    let s = newGame(faces, () => 0);
    while (!isWon(s)) {
      const a = s.cards.findIndex((c) => !c.matched);
      const b = s.cards.findIndex((c, i) => i !== a && !c.matched && c.face === s.cards[a].face);
      s = flip(s, a).state;
      s = flip(s, b).state;
    }
    expect(isWon(s)).toBe(true);
    expect(s.matchedPairs).toBe(10);
    expect(s.moves).toBe(10);
  });
});

// `settle` exists for exactly one reason: a saved position must never contain a
// state that only a TIMER could get out of. See its doc comment.
describe("settle — a position safe to store and reopen", () => {
  /** Two cards up, mismatched, lock held: the state a setTimeout would clear. */
  function midMismatch() {
    const s = newGame(FACES, () => 0);
    const a = 0;
    const b = s.cards.findIndex((c, i) => i !== a && c.face !== s.cards[a].face);
    const out = flip(flip(s, a).state, b);
    expect(out.outcome.kind).toBe("mismatch");
    return out.state;
  }

  it("releases the lock a stored mismatch would otherwise keep forever", () => {
    const stuck = midMismatch();
    expect(stuck.lock).toBe(true);
    // The bug this prevents, stated as a test: without settling, every card is
    // refused after a reload and the board is dead while looking perfectly fine.
    expect(flip(stuck, 4).outcome.kind).toBe("ignored");

    const safe = settle(stuck);
    expect(safe.lock).toBe(false);
    expect(flip(safe, 4).outcome.kind).not.toBe("ignored");
  });

  it("turns the mismatched pair back down, and leaves matched pairs up", () => {
    let s = newGame(FACES, () => 0);
    const a = 0;
    const b = s.cards.findIndex((c, i) => i !== a && c.face === s.cards[a].face);
    s = flip(flip(s, a).state, b).state; // a real match — stays face-up
    const c = s.cards.findIndex((card) => !card.matched);
    const d = s.cards.findIndex((card, i) => i !== c && !card.matched && card.face !== s.cards[c].face);
    s = flip(flip(s, c).state, d).state; // then a mismatch

    const safe = settle(s);
    expect(safe.cards.filter((card) => card.matched).every((card) => card.flipped)).toBe(true);
    expect(safe.cards.filter((card) => !card.matched).every((card) => !card.flipped)).toBe(true);
  });

  it("clears a half-made pick, which is the other way a stored board misleads", () => {
    // One card turned over and nothing chosen yet. Restored as-is it shows a
    // face-up card that the player did not turn over this sitting.
    const s = flip(newGame(FACES, () => 0), 0).state;
    expect(s.firstPick).toBe(0);
    const safe = settle(s);
    expect(safe.firstPick).toBeNull();
    expect(safe.cards[0].flipped).toBe(false);
  });

  it("leaves a settled board exactly as it is", () => {
    const s = newGame(FACES, () => 0);
    expect(settle(s)).toBe(s);
    // And agrees with resolveMismatch, the timer's own path, on the same state.
    const stuck = midMismatch();
    const viaTimer = resolveMismatch(stuck, 0, stuck.cards.findIndex((c, i) => i > 0 && c.flipped));
    expect(settle(stuck).cards.map((c) => c.flipped)).toEqual(viaTimer.cards.map((c) => c.flipped));
  });

  it("preserves the score — settling is not a restart", () => {
    const stuck = midMismatch();
    const safe = settle(stuck);
    expect(safe.moves).toBe(stuck.moves);
    expect(safe.matchedPairs).toBe(stuck.matchedPairs);
    expect(safe.cards.map((c) => c.face)).toEqual(stuck.cards.map((c) => c.face));
  });
});
