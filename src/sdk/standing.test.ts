import { describe, it, expect } from "vitest";
import { RANK_CUTOFF, SHOW_PERCENTILE_UPTO, standingView } from "./standing";

describe("no child is ever shown as last", () => {
  it("says nothing about position when they are in the bottom quarter", () => {
    // The whole rule, in one case: 90th of 100 gets their own progress and no
    // number. There is no phrasing of "top 90%" that a child reads as anything
    // other than "you are nearly last".
    expect(standingView({ total: 100, better: 89 })).toEqual({ kind: "own" });
  });

  it("never emits a percentile above the cutoff, at any board size", () => {
    for (const total of [4, 7, 20, 63, 100, 1000]) {
      for (let better = 0; better < total; better++) {
        const view = standingView({ total, better });
        if (view.kind === "percentile") {
          expect(view.top, `${better + 1}/${total}`).toBeLessThanOrEqual(SHOW_PERCENTILE_UPTO);
          expect(view.top).toBeGreaterThan(0);
        }
        if (view.kind === "rank") {
          expect(view.rank).toBeGreaterThanOrEqual(1);
          expect(view.rank).toBeLessThanOrEqual(total);
        }
      }
    }
  });

  it("gives the very last player on a board nothing to read", () => {
    for (const total of [5, 50, 500]) {
      expect(standingView({ total, better: total - 1 }).kind).toBe("own");
    }
  });
});

describe("an exact position, but only near the top", () => {
  it("gives a real rank to the first few", () => {
    expect(standingView({ total: 500, better: 0 })).toEqual({ kind: "rank", rank: 1 });
    expect(standingView({ total: 500, better: 9 })).toEqual({ kind: "rank", rank: 10 });
  });

  it("stops giving ranks past the cutoff", () => {
    expect(standingView({ total: 500, better: RANK_CUTOFF }).kind).toBe("percentile");
  });

  it("on a SMALL board a rank must also be a top tenth, not just a low number", () => {
    // 10th of 12 is a low number and a terrible thing to tell a child. The rank
    // branch needs both conditions or it becomes the bottom-of-the-board
    // message it exists to prevent.
    expect(standingView({ total: 12, better: 9 }).kind).not.toBe("rank");
    expect(standingView({ total: 200, better: 9 })).toEqual({ kind: "rank", rank: 10 });
  });
});

describe("a board too small to say anything about", () => {
  it("shows own progress when the player is alone", () => {
    expect(standingView({ total: 1, better: 0 })).toEqual({ kind: "own" });
    expect(standingView({ total: 0, better: 0 })).toEqual({ kind: "own" });
  });

  it("still congratulates the leader once there is someone to lead", () => {
    expect(standingView({ total: 2, better: 0 })).toEqual({ kind: "rank", rank: 1 });
  });
});

describe("junk in never produces a number out", () => {
  it("shrugs off impossible counts", () => {
    for (const s of [
      { total: -1, better: 0 },
      { total: 10, better: -3 },
      { total: 10, better: 99 },
      { total: Number.NaN, better: 0 },
      { total: 10, better: Number.NaN },
      { total: Number.POSITIVE_INFINITY, better: 0 },
    ]) {
      expect(standingView(s).kind, JSON.stringify(s)).toBe("own");
    }
  });
});
