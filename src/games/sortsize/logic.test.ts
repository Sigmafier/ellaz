import { describe, it, expect } from "vitest";
import { mulberry32, seedFrom } from "@shared/rng";
import {
  DIFFICULTIES,
  LEVELS,
  byRank,
  initState,
  isComplete,
  makeRound,
  newGame,
  nextExpected,
  requiredTaps,
  sizeLadder,
  tapBin,
  tapItem,
  type Difficulty,
  type Round,
  type RoundState,
} from "./logic";

// Every assertion below runs against many seeded rounds rather than one, because
// the failure this file exists to catch - a pair of items too close in size to
// tell apart - is a property of the GENERATOR, not of any single round.
function rounds(difficulty: Difficulty, n = 200): Round[] {
  const out: Round[] = [];
  for (let i = 0; i < n; i++) out.push(makeRound(difficulty, mulberry32(seedFrom(`${difficulty}-${i}`))));
  return out;
}

/** The smallest ratio between ANY two distinct sizes in the round. */
function minPairwiseRatio(round: Round): number {
  const sizes = byRank(round).map((i) => i.size);
  let worst = Infinity;
  for (let a = 0; a < sizes.length; a++) {
    for (let b = a + 1; b < sizes.length; b++) {
      worst = Math.min(worst, sizes[b] / sizes[a]);
    }
  }
  return worst;
}

describe("sortsize - the difficulty ladder is the scale ratio", () => {
  it("pins the designed ratios: easy is unmistakable, hard is a real judgement", () => {
    // These numbers ARE the game. Changing one changes what the game asks a
    // child to do, so a change here should be deliberate enough to edit a test.
    expect(LEVELS.easy.minRatio).toBe(2.5);
    expect(LEVELS.medium.minRatio).toBe(1.6);
    expect(LEVELS.hard.minRatio).toBe(1.25);
    // Monotonically harder, and never narrower than 1.25.
    expect(LEVELS.easy.minRatio).toBeGreaterThan(LEVELS.medium.minRatio);
    expect(LEVELS.medium.minRatio).toBeGreaterThan(LEVELS.hard.minRatio);
    expect(LEVELS.hard.minRatio).toBeGreaterThanOrEqual(1.25);
  });

  it("one round type per difficulty, in the designed order", () => {
    expect(LEVELS.easy.kind).toBe("pick");
    expect(LEVELS.medium.kind).toBe("order");
    expect(LEVELS.hard.kind).toBe("bucket");
    expect(DIFFICULTIES).toEqual(["easy", "medium", "hard"]);
  });

  for (const difficulty of DIFFICULTIES) {
    const cfg = LEVELS[difficulty];

    it(`[${difficulty}] EVERY pair of items clears the ${cfg.minRatio}x floor`, () => {
      for (const round of rounds(difficulty)) {
        // Not just "the sizes differ" - the whole point is that they differ by
        // enough to SEE. A round below the floor is an unfair round.
        expect(minPairwiseRatio(round)).toBeGreaterThanOrEqual(cfg.minRatio);
        expect(round.minRatio).toBe(cfg.minRatio);
      }
    });

    it(`[${difficulty}] sizes are strictly increasing by rank and all distinct`, () => {
      for (const round of rounds(difficulty)) {
        const sizes = byRank(round).map((i) => i.size);
        expect(sizes).toHaveLength(cfg.count);
        expect(new Set(sizes).size).toBe(cfg.count);
        for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeGreaterThan(sizes[i - 1]);
        // Whole pixels - a fractional font-size is a blurry glyph.
        for (const s of sizes) expect(Number.isInteger(s)).toBe(true);
      }
    });

    it(`[${difficulty}] rounds are well-formed: ids unique, ranks 0..n-1, one glyph`, () => {
      for (const round of rounds(difficulty)) {
        expect(round.kind).toBe(cfg.kind);
        expect(round.difficulty).toBe(difficulty);
        expect(round.items).toHaveLength(cfg.count);
        expect(new Set(round.items.map((i) => i.id)).size).toBe(cfg.count);
        expect(byRank(round).map((i) => i.rank)).toEqual(
          Array.from({ length: cfg.count }, (_, i) => i),
        );
        // One character per round: the question is size, never which animal.
        expect(new Set(round.items.map((i) => i.emoji)).size).toBe(1);
        for (const item of round.items) {
          expect(item.he.length).toBeGreaterThan(0);
          expect(item.en.length).toBeGreaterThan(0);
        }
      }
    });

    it(`[${difficulty}] display order does not leak the answer`, () => {
      // If items always rendered smallest-first, position would answer the
      // question instead of size. Over many rounds the display order must vary.
      const firstRanks = new Set(rounds(difficulty).map((r) => r.items[0].rank));
      expect(firstRanks.size).toBeGreaterThan(1);
    });

    it(`[${difficulty}] the same seed replays the identical round`, () => {
      const a = makeRound(difficulty, mulberry32(4242));
      const b = makeRound(difficulty, mulberry32(4242));
      expect(b).toEqual(a);
      const c = makeRound(difficulty, mulberry32(4243));
      expect(JSON.stringify(c)).not.toBe(JSON.stringify(a));
    });
  }
});

describe("sortsize - pick rounds have exactly one right answer", () => {
  it("the solution is the single largest or single smallest item", () => {
    for (const round of rounds("easy")) {
      expect(round.solution).toHaveLength(1);
      expect(round.target === "biggest" || round.target === "smallest").toBe(true);
      const ranked = byRank(round);
      const winner = round.target === "biggest" ? ranked[ranked.length - 1] : ranked[0];
      expect(round.solution[0]).toBe(winner.id);

      // Unambiguous: nothing else shares the winning size.
      const sizes = ranked.map((i) => i.size);
      const extreme = round.target === "biggest" ? Math.max(...sizes) : Math.min(...sizes);
      expect(sizes.filter((s) => s === extreme)).toHaveLength(1);
      expect(winner.size).toBe(extreme);
    }
  });

  it("both targets get asked across many rounds", () => {
    expect(new Set(rounds("easy").map((r) => r.target)).size).toBe(2);
  });

  it("a correct tap finishes the round; a wrong tap changes nothing", () => {
    const round = makeRound("easy", mulberry32(7));
    const start = initState(round);
    const loser = round.items.find((i) => i.id !== round.solution[0])!;

    const miss = tapItem(start, loser.id);
    expect(miss.kind).toBe("wrong");
    expect(miss.done).toBe(false);
    // Gentle: no progress lost, no punishment, the round is untouched.
    expect(miss.state).toEqual(start);

    const hit = tapItem(miss.state, round.solution[0]);
    expect(hit.kind).toBe("correct");
    expect(hit.done).toBe(true);
    expect(isComplete(hit.state)).toBe(true);

    // Anything after the round is over is simply ignored.
    expect(tapItem(hit.state, loser.id).kind).toBe("ignored");
  });
});

describe("sortsize - order rounds track partial progress", () => {
  it("the solution is the full sequence in the asked direction", () => {
    for (const round of rounds("medium")) {
      const ranked = byRank(round).map((i) => i.id);
      const expected = round.direction === "asc" ? ranked : [...ranked].reverse();
      expect(round.solution).toEqual(expected);
      expect(new Set(round.solution).size).toBe(round.items.length);
    }
  });

  it("both directions get asked across many rounds", () => {
    expect(new Set(rounds("medium").map((r) => r.direction)).size).toBe(2);
  });

  it("accepts only the next id in sequence, and remembers how far we got", () => {
    const round = makeRound("medium", mulberry32(99));
    let state: RoundState = initState(round);

    expect(nextExpected(state)).toBe(round.solution[0]);

    // Tapping the LAST item first is wrong, however tempting the biggest is.
    const outOfOrder = tapItem(state, round.solution[round.solution.length - 1]);
    expect(outOfOrder.kind).toBe("wrong");
    expect(outOfOrder.state.progress).toEqual([]);

    for (let i = 0; i < round.solution.length; i++) {
      expect(nextExpected(state)).toBe(round.solution[i]);
      const out = tapItem(state, round.solution[i]);
      expect(out.kind).toBe("correct");
      state = out.state;
      // Partial progress is exactly the prefix already tapped, in order.
      expect(state.progress).toEqual(round.solution.slice(0, i + 1));
      expect(out.done).toBe(i === round.solution.length - 1);
      // Re-tapping an item already banked is a no-op, not a wrong answer.
      expect(tapItem(state, round.solution[i]).kind).toBe("ignored");
    }

    expect(isComplete(state)).toBe(true);
    expect(nextExpected(state)).toBe(null);
    expect(state.progress).toHaveLength(requiredTaps(round));
  });

  it("a wrong tap mid-sequence never resets what was already earned", () => {
    const round = makeRound("medium", mulberry32(1234));
    const first = tapItem(initState(round), round.solution[0]);
    expect(first.kind).toBe("correct");

    const wrong = tapItem(first.state, round.solution[round.solution.length - 1]);
    expect(wrong.kind).toBe("wrong");
    expect(wrong.state.progress).toEqual([round.solution[0]]);
  });
});

describe("sortsize - bucket rounds sort by tap-then-bin", () => {
  it("splits evenly at the median, with the decisive pair still above the floor", () => {
    for (const round of rounds("hard")) {
      const ranked = byRank(round);
      const half = ranked.length / 2;
      expect(Number.isInteger(half)).toBe(true);

      const small = ranked.slice(0, half);
      const big = ranked.slice(half);
      for (const item of small) expect(round.bins[item.id]).toBe("small");
      for (const item of big) expect(round.bins[item.id]).toBe("big");
      expect(Object.keys(round.bins)).toHaveLength(ranked.length);

      // The pair straddling the split is the one the child actually has to
      // judge, so it carries the same fairness floor as every other neighbour.
      const boundary = big[0].size / small[small.length - 1].size;
      expect(boundary).toBeGreaterThanOrEqual(round.minRatio);
    }
  });

  it("tap an item to select it, then a bin to place it", () => {
    const round = makeRound("hard", mulberry32(2026));
    let state: RoundState = initState(round);
    // A bin tap with nothing selected does nothing at all.
    expect(tapBin(state, "big").kind).toBe("ignored");

    const ranked = byRank(round);
    for (let i = 0; i < ranked.length; i++) {
      const item = ranked[i];
      const correctBin = round.bins[item.id];
      const wrongBin = correctBin === "big" ? "small" : "big";

      const sel = tapItem(state, item.id);
      expect(sel.kind).toBe("selected");
      expect(sel.state.selected).toBe(item.id);
      state = sel.state;

      const miss = tapBin(state, wrongBin);
      expect(miss.kind).toBe("wrong");
      // The selection SURVIVES a miss, so the fix is one tap on the other bin.
      expect(miss.state.selected).toBe(item.id);
      expect(miss.state.placed[item.id]).toBeUndefined();

      const hit = tapBin(miss.state, correctBin);
      expect(hit.kind).toBe("correct");
      state = hit.state;
      expect(state.placed[item.id]).toBe(correctBin);
      expect(state.selected).toBe(null);
      expect(state.progress).toHaveLength(i + 1);
      expect(hit.done).toBe(i === ranked.length - 1);

      // An item already in a bin cannot be picked up again.
      expect(tapItem(state, item.id).kind).toBe("ignored");
    }

    expect(isComplete(state)).toBe(true);
    expect(Object.keys(state.placed)).toHaveLength(ranked.length);
    expect(tapBin(state, "big").kind).toBe("ignored");
  });

  it("bucket rounds carry no pick/order solution to be confused with", () => {
    for (const round of rounds("hard", 20)) {
      expect(round.solution).toEqual([]);
      expect(round.target).toBe(null);
      expect(round.direction).toBe(null);
      expect(requiredTaps(round)).toBe(round.items.length);
    }
  });
});

describe("sortsize - the ladder itself", () => {
  it("ceil rounding can never drop a neighbouring pair below the ratio", () => {
    // Rounding to NEAREST does exactly that at 1.25 (86/69 = 1.246), which is
    // the whole reason `sizeLadder` ceils. Sweep the plausible space and prove
    // the floor holds for every base at every shipped ratio.
    for (const ratio of [1.25, 1.6, 2.5]) {
      for (let base = 12; base <= 80; base++) {
        const sizes = sizeLadder(base, ratio, 6);
        expect(sizes[0]).toBe(base);
        for (let i = 1; i < sizes.length; i++) {
          expect(sizes[i] / sizes[i - 1]).toBeGreaterThanOrEqual(ratio);
          expect(Number.isInteger(sizes[i])).toBe(true);
        }
      }
    }
  });

  it("a one-item ladder is just the base", () => {
    expect(sizeLadder(40, 1.25, 1)).toEqual([40]);
  });

  it("newGame hands back a fresh, untouched state for the round", () => {
    for (const difficulty of DIFFICULTIES) {
      const state = newGame(difficulty, mulberry32(11));
      expect(state.progress).toEqual([]);
      expect(state.placed).toEqual({});
      expect(state.selected).toBe(null);
      expect(isComplete(state)).toBe(false);
      expect(state.round).toEqual(makeRound(difficulty, mulberry32(11)));
    }
  });

  it("an unknown id is ignored rather than counted wrong", () => {
    const state = newGame("medium", mulberry32(5));
    const out = tapItem(state, "nope");
    expect(out.kind).toBe("ignored");
    expect(out.state).toEqual(state);
  });
});
