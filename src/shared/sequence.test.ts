import { describe, it, expect } from "vitest";
import { IDLE, beginInput, isComplete, pressPad, startRound, type SeqState } from "./sequence";
import { mulberry32 } from "./rng";

const PADS = 4;

/** Play a whole round correctly and return the resulting state. */
function playCorrectly(s: SeqState): SeqState {
  let cur = beginInput(s);
  for (const pad of s.pattern) cur = pressPad(cur, pad);
  return cur;
}

describe("startRound", () => {
  it("starts a fresh run at round 1 with one step", () => {
    const s = startRound(null, PADS, mulberry32(1));
    expect(s.round).toBe(1);
    expect(s.pattern).toHaveLength(1);
    expect(s.cursor).toBe(0);
    expect(s.phase).toBe("showing");
  });

  it("APPENDS one step and keeps the earlier ones", () => {
    const rng = mulberry32(7);
    const one = startRound(null, PADS, rng);
    const two = startRound(one, PADS, rng);
    expect(two.pattern).toHaveLength(2);
    expect(two.pattern.slice(0, 1)).toEqual(one.pattern);
    expect(two.round).toBe(2);
  });

  it("treats IDLE the same as null", () => {
    expect(startRound(IDLE, PADS, mulberry32(3))).toEqual(startRound(null, PADS, mulberry32(3)));
  });

  it("only ever generates pads inside [0, padCount)", () => {
    const rng = mulberry32(99);
    let s = startRound(null, 3, rng);
    for (let i = 0; i < 200; i++) s = startRound(s, 3, rng);
    for (const pad of s.pattern) {
      expect(Number.isInteger(pad)).toBe(true);
      expect(pad).toBeGreaterThanOrEqual(0);
      expect(pad).toBeLessThan(3);
    }
  });

  it("is deterministic under a seeded rng", () => {
    const build = (seed: number) => {
      const rng = mulberry32(seed);
      let s = startRound(null, PADS, rng);
      for (let i = 0; i < 10; i++) s = startRound(s, PADS, rng);
      return s.pattern;
    };
    expect(build(2024)).toEqual(build(2024));
    expect(build(1)).not.toEqual(build(2));
  });

  it("does not mutate the state it was given", () => {
    const one = startRound(null, PADS, mulberry32(5));
    const snapshot = { ...one, pattern: [...one.pattern] };
    startRound(one, PADS, mulberry32(6));
    expect(one).toEqual(snapshot);
  });

  it("rejects a nonsensical padCount rather than generating NaN pads", () => {
    expect(() => startRound(null, 0)).toThrow(/padCount/);
    expect(() => startRound(null, -2)).toThrow(/padCount/);
    expect(() => startRound(null, 2.5)).toThrow(/padCount/);
  });
});

describe("beginInput", () => {
  it("moves showing -> input", () => {
    expect(beginInput(startRound(null, PADS, mulberry32(1))).phase).toBe("input");
  });

  it("is a no-op from every other phase", () => {
    for (const phase of ["idle", "input", "won", "lost"] as const) {
      const s: SeqState = { pattern: [0], phase, cursor: 0, round: 1 };
      expect(beginInput(s)).toBe(s);
    }
  });
});

describe("pressPad — the happy path", () => {
  it("plays three rounds correctly, growing by one pad each time", () => {
    const rng = mulberry32(42);
    let s = startRound(null, PADS, rng);

    for (let round = 1; round <= 3; round++) {
      expect(s.round).toBe(round);
      expect(s.pattern).toHaveLength(round);
      expect(s.phase).toBe("showing");

      let cur = beginInput(s);
      for (let i = 0; i < s.pattern.length; i++) {
        cur = pressPad(cur, s.pattern[i]);
        expect(cur.cursor).toBe(i + 1);
        // Still mid-pattern means still accepting input.
        expect(cur.phase).toBe(i === s.pattern.length - 1 ? "won" : "input");
      }
      expect(isComplete(cur)).toBe(true);
      s = startRound(cur, PADS, rng);
    }
  });

  it("advances the cursor by exactly one per correct press", () => {
    const s = beginInput(startRound(startRound(null, PADS, mulberry32(8)), PADS, mulberry32(8)));
    const after = pressPad(s, s.pattern[0]);
    expect(after.cursor).toBe(1);
    expect(after.pattern).toEqual(s.pattern);
  });
});

describe("pressPad — the wrong pad", () => {
  it("loses at EVERY cursor position, not just the first", () => {
    const rng = mulberry32(11);
    // A 4-step pattern, so there are four distinct places to go wrong.
    let s = startRound(null, PADS, rng);
    for (let i = 0; i < 3; i++) s = startRound(s, PADS, rng);
    expect(s.pattern).toHaveLength(4);

    for (let wrongAt = 0; wrongAt < s.pattern.length; wrongAt++) {
      let cur = beginInput(s);
      for (let i = 0; i < wrongAt; i++) cur = pressPad(cur, s.pattern[i]);
      const wrong = (s.pattern[wrongAt] + 1) % PADS;
      const lost = pressPad(cur, wrong);
      expect(lost.phase).toBe("lost");
      // The cursor does NOT advance on a miss, so a renderer can highlight the
      // pad the player should have hit.
      expect(lost.cursor).toBe(wrongAt);
      expect(lost.pattern).toEqual(s.pattern);
    }
  });

  it("stays lost — further presses change nothing", () => {
    const s = beginInput(startRound(null, PADS, mulberry32(4)));
    const lost = pressPad(s, (s.pattern[0] + 1) % PADS);
    expect(lost.phase).toBe("lost");
    expect(pressPad(lost, s.pattern[0])).toBe(lost);
  });
});

describe("pressPad — presses outside input", () => {
  it("ignores a press in every phase but input, returning the SAME object", () => {
    for (const phase of ["idle", "showing", "won", "lost"] as const) {
      const s: SeqState = { pattern: [1, 2], phase, cursor: 0, round: 2 };
      expect(pressPad(s, 1)).toBe(s);
      expect(pressPad(s, 9)).toBe(s);
    }
  });

  it("ignores a mistap during playback, so the round is still winnable", () => {
    const showing = startRound(null, PADS, mulberry32(13));
    const wrong = (showing.pattern[0] + 1) % PADS;
    expect(pressPad(showing, wrong)).toBe(showing);
    expect(playCorrectly(showing).phase).toBe("won");
  });

  it("never mutates the state it was given", () => {
    const s = beginInput(startRound(null, PADS, mulberry32(21)));
    const snapshot = { ...s, pattern: [...s.pattern] };
    pressPad(s, s.pattern[0]);
    pressPad(s, (s.pattern[0] + 1) % PADS);
    expect(s).toEqual(snapshot);
  });
});

describe("isComplete", () => {
  it("is false before the pattern is finished", () => {
    const s = startRound(startRound(null, PADS, mulberry32(2)), PADS, mulberry32(2));
    expect(isComplete(s)).toBe(false);
    expect(isComplete(pressPad(beginInput(s), s.pattern[0]))).toBe(false);
  });

  it("is true once every pad has been entered", () => {
    const s = startRound(null, PADS, mulberry32(2));
    expect(isComplete(playCorrectly(s))).toBe(true);
  });

  it("is false for the idle state (an empty pattern is not a completed one)", () => {
    expect(isComplete(IDLE)).toBe(false);
  });
});
