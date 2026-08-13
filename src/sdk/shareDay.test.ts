import { describe, it, expect } from "vitest";
import { localDay, playedOn } from "./shareDay";

describe("which day it is where the child is", () => {
  it("uses the DEVICE's calendar, never UTC", () => {
    // A child in Israel playing at 01:00 on the 14th is still on the 13th in
    // UTC. `toISOString().slice(0,10)` would share yesterday, once a night,
    // for every timezone east of Greenwich.
    const d = new Date(2026, 7, 13, 1, 0, 0);
    expect(localDay(d)).toBe("2026-08-13");
  });

  it("zero-pads, so a January date is not `2026-1-3`", () => {
    expect(localDay(new Date(2026, 0, 3))).toBe("2026-01-03");
  });

  it("answers the empty string for an unusable date rather than NaN-NaN-NaN", () => {
    expect(localDay(new Date(Number.NaN))).toBe("");
  });

  it("treats a game never opened as not played today, never as the epoch", () => {
    const now = new Date(2026, 7, 13, 12, 0, 0);
    expect(playedOn(undefined, now)).toBe(false);
    expect(playedOn(0, now)).toBe(false);
    expect(playedOn(Number.NaN, now)).toBe(false);
    expect(playedOn(-5, now)).toBe(false);
  });

  it("counts a play from earlier today and not one from last night", () => {
    const now = new Date(2026, 7, 13, 12, 0, 0);
    expect(playedOn(new Date(2026, 7, 13, 0, 5, 0).getTime(), now)).toBe(true);
    expect(playedOn(new Date(2026, 7, 12, 23, 55, 0).getTime(), now)).toBe(false);
  });
});
