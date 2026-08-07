import { describe, it, expect } from "vitest";
import { RANK_CUTOFF, SHOW_PERCENTILE_UPTO, ownBest, standingView, youLine } from "./standing";

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

describe("what the player is told about their own record", () => {
  it("shows a local best when the cloud has never heard of them", () => {
    // THE BUG THIS EXISTS FOR. A player holding a 3:04 sudoku record opened the
    // boards and was told "play to join the board". Their record was right
    // there on the device - the screen had already read it to build the board
    // picker - but the only source consulted for "your best" was the Firestore
    // document, which is written on PUBLISH. So the `own` branch, the one this
    // whole rule is built around, could not fire for anyone offline, anyone
    // whose publish failed, or anyone before their first publish landed.
    expect(youLine({ kind: "own" }, ownBest(184300, undefined))).toEqual({
      kind: "best",
      value: 184300,
    });
  });

  it("prefers the local record over the cloud one, because local cannot be stale", () => {
    // A record is written locally on every personal best and pushed to the
    // cloud on a debounce. So the cloud copy is stale-or-equal by construction,
    // never fresher. A player who beat their best offline must be shown what
    // they actually did, not the older number the network happens to hold.
    expect(ownBest(170000, 184300)).toBe(170000);
  });

  it("falls back to the cloud when this device has no record of its own", () => {
    // A restored player mid-adoption, or one whose storage was cleared. The
    // cloud value is the only thing left and it is better than nothing.
    expect(ownBest(undefined, 184300)).toBe(184300);
  });

  it("says play-to-join only when there is genuinely no record anywhere", () => {
    expect(youLine({ kind: "own" }, ownBest(undefined, undefined))).toEqual({ kind: "none" });
  });

  it("never buries an earned position under a personal best", () => {
    // A rank or a percentile outranks the own-best line: it is the rarer and
    // better thing to say, and standingView already decided it was safe to say.
    expect(youLine({ kind: "rank", rank: 3 }, 184300)).toEqual({ kind: "rank", rank: 3 });
    expect(youLine({ kind: "percentile", top: 40 }, 184300)).toEqual({
      kind: "percentile",
      top: 40,
    });
  });

  it("ignores a junk local value rather than printing it at a child", () => {
    // readRecords already filters to finite numbers, but this is the last gate
    // before the value reaches a screen, and NaN renders as "NaN".
    expect(ownBest(Number.NaN, 184300)).toBe(184300);
    expect(ownBest(Number.POSITIVE_INFINITY, undefined)).toBeUndefined();
  });
});
