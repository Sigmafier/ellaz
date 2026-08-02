import { describe, it, expect } from "vitest";
import { beginInput, pressPad, startRound, type SeqState } from "@shared/sequence";
import { mulberry32 } from "@shared/rng";
import { PENTATONIC } from "@shared/notes";
import {
  FLASH_MAX_MS,
  FLASH_MIN_MS,
  GAP_MS,
  LEAD_IN_MS,
  LEVELS,
  MILESTONE_EVERY,
  MISS_FREQ,
  PADS,
  SETTLE_MS,
  buildPlayback,
  flashMsFor,
  isMilestoneRound,
  levelById,
  padTone,
} from "./logic";

/** Grow a seeded run to `rounds` rounds without playing it. */
function patternOf(rounds: number, pads: number, seed: number): number[] {
  const rng = mulberry32(seed);
  let s = startRound(null, pads, rng);
  for (let i = 1; i < rounds; i++) s = startRound(s, pads, rng);
  return s.pattern;
}

describe("levels", () => {
  it("gives 4 / 5 / 6 pads for easy / medium / hard", () => {
    expect(LEVELS.map((l) => l.pads)).toEqual([4, 5, 6]);
    expect(LEVELS.map((l) => l.id)).toEqual(["easy", "medium", "hard"]);
  });

  it("never asks for more pads than the palette has", () => {
    for (const level of LEVELS) {
      expect(level.pads).toBeLessThanOrEqual(PADS.length);
      expect(level.pads).toBeLessThanOrEqual(PENTATONIC.length);
    }
  });

  it("lays every level out in at least two rows, so no row is a thin strip", () => {
    for (const level of LEVELS) {
      expect(level.cols).toBeGreaterThan(1);
      expect(Math.ceil(level.pads / level.cols)).toBeGreaterThan(1);
    }
  });

  it("resolves a level by id and rejects an unknown one", () => {
    expect(levelById("hard").pads).toBe(6);
    expect(() => levelById("impossible" as "easy")).toThrow(/unknown level/);
  });
});

describe("pads", () => {
  it("gives every pad a distinct pitch, at every difficulty", () => {
    for (const level of LEVELS) {
      const tones = Array.from({ length: level.pads }, (_, i) => padTone(i));
      expect(new Set(tones).size).toBe(level.pads);
    }
  });

  it("takes its pitches from the pentatonic scale, index-aligned", () => {
    for (let i = 0; i < PADS.length; i++) expect(padTone(i)).toBe(PENTATONIC[i]);
  });

  it("refuses a pad index it has no tone for, rather than returning NaN", () => {
    expect(() => padTone(-1)).toThrow(/no tone/);
    expect(() => padTone(PENTATONIC.length)).toThrow(/no tone/);
    expect(() => padTone(1.5)).toThrow(/no tone/);
  });

  it("keeps the miss sound off the pad scale, so it cannot be mistaken for one", () => {
    expect(PENTATONIC).not.toContain(MISS_FREQ);
    expect(MISS_FREQ).toBeLessThan(Math.min(...PENTATONIC));
  });

  it("distinguishes pads WITHOUT colour: a unique glyph and name each", () => {
    expect(new Set(PADS.map((p) => p.glyph)).size).toBe(PADS.length);
    expect(new Set(PADS.map((p) => p.name.he)).size).toBe(PADS.length);
    expect(new Set(PADS.map((p) => p.name.en)).size).toBe(PADS.length);
    expect(new Set(PADS.map((p) => p.color)).size).toBe(PADS.length);
  });
});

describe("buildPlayback", () => {
  it("plays exactly the pattern, in order, with each pad's own pitch", () => {
    const pattern = [2, 0, 3, 3, 1];
    const { steps } = buildPlayback(pattern);
    expect(steps.map((s) => s.pad)).toEqual(pattern);
    expect(steps.map((s) => s.freq)).toEqual(pattern.map(padTone));
  });

  it("is monotonic and NON-OVERLAPPING - one flash is dark before the next lights", () => {
    const { steps } = buildPlayback(patternOf(9, 4, 2024));
    expect(steps).toHaveLength(9);
    for (let i = 1; i < steps.length; i++) {
      const prevEnd = steps[i - 1].atMs + steps[i - 1].ms;
      expect(steps[i].atMs).toBeGreaterThan(steps[i - 1].atMs);
      expect(steps[i].atMs - prevEnd).toBe(GAP_MS);
    }
  });

  it("leads in before the first flash, so the child is looking when it starts", () => {
    expect(buildPlayback([1]).steps[0].atMs).toBe(LEAD_IN_MS);
  });

  it("gives the child a beat between the last flash and the first accepted press", () => {
    const pb = buildPlayback([0, 1, 2]);
    const last = pb.steps[2];
    expect(pb.endsAtMs).toBe(last.atMs + last.ms);
    expect(pb.inputAtMs - pb.endsAtMs).toBe(SETTLE_MS);
    expect(SETTLE_MS).toBeGreaterThanOrEqual(300);
  });

  it("handles an empty pattern without producing a negative or NaN schedule", () => {
    const pb = buildPlayback([]);
    expect(pb.steps).toEqual([]);
    expect(pb.endsAtMs).toBe(LEAD_IN_MS);
    expect(pb.inputAtMs).toBe(LEAD_IN_MS + SETTLE_MS);
  });

  it("speeds up as the pattern grows but never below the visible floor", () => {
    expect(flashMsFor(1)).toBe(FLASH_MAX_MS);
    expect(flashMsFor(5)).toBeLessThan(flashMsFor(1));
    for (const round of [1, 2, 5, 12, 40, 500]) {
      expect(flashMsFor(round)).toBeGreaterThanOrEqual(FLASH_MIN_MS);
      expect(flashMsFor(round)).toBeLessThanOrEqual(FLASH_MAX_MS);
    }
    // Never runs backwards: a longer pattern is never slower than a shorter one.
    for (let r = 2; r < 60; r++) expect(flashMsFor(r)).toBeLessThanOrEqual(flashMsFor(r - 1));
  });

  it("keeps every flash long enough to see, at the longest pattern we schedule", () => {
    const long = buildPlayback(patternOf(30, 6, 7));
    for (const step of long.steps) expect(step.ms).toBeGreaterThanOrEqual(FLASH_MIN_MS);
  });
});

describe("a whole run", () => {
  it("clears five rounds in a row, growing by one pad each round", () => {
    const level = levelById("medium");
    const rng = mulberry32(99);
    let s: SeqState = startRound(null, level.pads, rng);

    for (let round = 1; round <= 5; round++) {
      expect(s.round).toBe(round);
      expect(s.phase).toBe("showing");
      // Every pad the machine picked is one this level actually shows.
      for (const pad of s.pattern) expect(pad).toBeLessThan(level.pads);

      const pb = buildPlayback(s.pattern, s.round);
      expect(pb.steps).toHaveLength(round);
      expect(pb.inputAtMs).toBeGreaterThan(pb.endsAtMs);

      let cur = beginInput(s);
      for (const pad of s.pattern) cur = pressPad(cur, pad);
      expect(cur.phase).toBe("won");
      s = startRound(cur, level.pads, rng);
    }
    expect(s.pattern).toHaveLength(6);
  });

  it("ends the run on a wrong press at EVERY position in the pattern", () => {
    const level = levelById("easy");
    const rng = mulberry32(1234);
    let s = startRound(null, level.pads, rng);
    for (let i = 1; i < 4; i++) s = startRound(s, level.pads, rng);
    expect(s.pattern).toHaveLength(4);

    for (let wrongAt = 0; wrongAt < s.pattern.length; wrongAt++) {
      let cur = beginInput(s);
      for (let i = 0; i < wrongAt; i++) cur = pressPad(cur, s.pattern[i]);
      const wrong = (s.pattern[wrongAt] + 1) % level.pads;
      const lost = pressPad(cur, wrong);
      expect(lost.phase).toBe("lost");
      expect(lost.round).toBe(4);
    }
  });

  it("ignores a tap that lands while the machine is still showing the pattern", () => {
    const showing = startRound(null, 4, mulberry32(5));
    expect(pressPad(showing, (showing.pattern[0] + 1) % 4)).toBe(showing);
  });
});

describe("milestones", () => {
  it("pays every third cleared round, and never at round zero", () => {
    expect(MILESTONE_EVERY).toBe(3);
    expect(isMilestoneRound(0)).toBe(false);
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map(isMilestoneRound)).toEqual([
      false,
      false,
      true,
      false,
      false,
      true,
      false,
      false,
      true,
    ]);
  });
});

describe("determinism", () => {
  it("replays the same pattern AND the same schedule for the same seed", () => {
    const a = buildPlayback(patternOf(8, 6, 4242));
    const b = buildPlayback(patternOf(8, 6, 4242));
    expect(a).toEqual(b);
  });

  it("produces a different pattern for a different seed", () => {
    expect(patternOf(12, 6, 1)).not.toEqual(patternOf(12, 6, 2));
  });

  it("is a pure function of its input - building twice changes nothing", () => {
    const pattern = [0, 3, 1, 1, 2];
    const snapshot = [...pattern];
    buildPlayback(pattern);
    buildPlayback(pattern);
    expect(pattern).toEqual(snapshot);
  });
});
