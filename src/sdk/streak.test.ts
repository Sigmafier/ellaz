import { describe, expect, it } from "vitest";
import {
  STREAK_FIRST,
  STREAK_LADDER,
  streakCapped,
  streakStep,
  streakTier,
} from "./streak";

describe("the streak ladder", () => {
  it("says nothing at all until the third correct answer", () => {
    // The whole reason the ladder exists is that it is NOT the ordinary
    // success sound. An escalation that fires on every correct answer is
    // just a second success sound played at the same time.
    expect(streakStep(0)).toBeUndefined();
    expect(streakStep(1)).toBeUndefined();
    expect(streakStep(2)).toBeUndefined();
    expect(streakStep(3)).toBeDefined();
  });

  it("distinguishes 'no sound' from 'the bottom rung', which are both falsy", () => {
    // THE BUG THIS EXISTS TO PREVENT. The bottom rung is 0 semitones, and a
    // module returning 0 for "too short to count" would be indistinguishable
    // from it under `if (step)` or `step ?? fallback`. Two correct answers
    // would then play the ladder's first note - on every single tap.
    expect(streakStep(2)).toBeUndefined();
    expect(streakStep(3)).toBe(0);
    expect(streakStep(2) === streakStep(3)).toBe(false);
  });

  it("climbs, one rung per correct answer", () => {
    const climb = [3, 4, 5, 6, 7].map((n) => streakStep(n));
    expect(climb).toEqual(STREAK_LADDER.slice(0, 5));
    // Strictly increasing, which is the only property a player actually hears.
    for (let i = 1; i < climb.length; i++) {
      expect(climb[i]!).toBeGreaterThan(climb[i - 1]!);
    }
  });

  it("holds at the top instead of dropping back to the bottom", () => {
    const top = STREAK_LADDER[STREAK_LADDER.length - 1];
    const atCap = STREAK_FIRST + STREAK_LADDER.length - 1;
    expect(streakStep(atCap)).toBe(top);
    expect(streakStep(atCap + 1)).toBe(top);
    expect(streakStep(500)).toBe(top);
    // Never wraps. A run of 40 must not sound like a run of 3 - that tells a
    // child who is doing well that they have just become a beginner again.
    expect(streakStep(atCap + 7)).not.toBe(STREAK_LADDER[0]);
  });

  it("reports when it has stopped climbing", () => {
    expect(streakCapped(3)).toBe(false);
    expect(streakCapped(STREAK_FIRST + STREAK_LADDER.length - 2)).toBe(false);
    expect(streakCapped(STREAK_FIRST + STREAK_LADDER.length - 1)).toBe(true);
  });

  it("stays inside a range a transposed voice survives", () => {
    // This voice is the only one in the app heard transposed. Two octaves is
    // the ceiling: a warm tine at +21 is still musical, and the same tine an
    // octave above that is a smoke alarm next to a child's ear.
    for (const s of STREAK_LADDER) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(24);
    }
  });

  it("is pentatonic, so any two rungs sound finished together", () => {
    // No minor second and no tritone anywhere in the set. A leading tone is
    // what makes an ascending line BEG for the next step, and building that
    // pull deliberately for five-year-olds is not something this platform does.
    const classes = new Set(STREAK_LADDER.map((s) => s % 12));
    expect([...classes].sort((a, b) => a - b)).toEqual([0, 2, 4, 7, 9]);
    for (const a of classes) {
      for (const b of classes) {
        const gap = Math.abs(a - b);
        expect([1, 6, 11]).not.toContain(gap);
      }
    }
  });

  it("survives junk rather than producing a junk pitch", () => {
    expect(streakStep(Number.NaN)).toBeUndefined();
    expect(streakStep(Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(streakStep(-4)).toBeUndefined();
    expect(streakStep(3.9)).toBe(streakStep(3));
  });
});

describe("the praise tier", () => {
  it("shares the ladder's floor, so words and notes cannot disagree", () => {
    // If a tier existed below the ladder's first rung, a game could announce
    // "great!" over silence. They start together or the pairing is a lie.
    for (let n = 0; n < STREAK_FIRST; n++) {
      expect(streakTier(n)).toBeUndefined();
      expect(streakStep(n)).toBeUndefined();
    }
    expect(streakTier(STREAK_FIRST)).toBeDefined();
  });

  it("is coarse on purpose - three tiers, not ten", () => {
    const seen = new Set(
      Array.from({ length: 40 }, (_, n) => streakTier(n)).filter(Boolean),
    );
    expect(seen.size).toBe(3);
    expect(streakTier(3)).toBe("good");
    expect(streakTier(6)).toBe("great");
    expect(streakTier(20)).toBe("amazing");
  });

  it("never goes backwards as the run gets longer", () => {
    const rank = { good: 1, great: 2, amazing: 3 } as const;
    let last = 0;
    for (let n = STREAK_FIRST; n < 60; n++) {
      const t = streakTier(n)!;
      expect(rank[t]).toBeGreaterThanOrEqual(last);
      last = rank[t];
    }
  });
});
