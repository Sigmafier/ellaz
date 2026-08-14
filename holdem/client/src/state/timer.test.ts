// The client had no tests at all. These are the two pieces of client logic
// that are wrong in a way nobody would notice by looking: a countdown computed
// against the wrong clock, and a reducer whose showdown reveals are cleared at
// the wrong moment.

import { describe, expect, it } from "vitest";
import type { TimerState } from "./store";
import { msLeft, totalMs } from "./timer";

/** A timer the server issued at t=1000 with a 25s deadline, received at t=1000. */
const at = (over: Partial<TimerState> = {}): TimerState => ({
  seatIdx: 2,
  serverNow: 1_000,
  deadlineEpochMs: 26_000,
  receivedAt: 1_000,
  timeBank: false,
  ...over,
});

describe("msLeft", () => {
  it("is the full deadline at the instant it arrived", () => {
    expect(msLeft(at(), 1_000)).toBe(25_000);
  });

  it("counts down with elapsed local time", () => {
    expect(msLeft(at(), 6_000)).toBe(20_000);
  });

  it("clamps at zero rather than going negative", () => {
    expect(msLeft(at(), 999_999)).toBe(0);
  });

  it("is zero when there is no timer at all", () => {
    expect(msLeft(null, 1_000)).toBe(0);
  });

  // The whole reason this is not `deadline - Date.now()`.
  it("IGNORES a phone clock that is a minute fast", () => {
    // The device's clock reads 61s ahead of the server's. It received the
    // message at its own 62_000 while the server said 1_000, and 5 real
    // seconds have passed.
    const skewed = at({ receivedAt: 62_000 });
    expect(msLeft(skewed, 67_000)).toBe(20_000);
  });

  it("IGNORES a phone clock that is a minute slow, the same way", () => {
    const skewed = at({ receivedAt: -59_000 });
    expect(msLeft(skewed, -54_000)).toBe(20_000);
  });

  // The control: what the naive version would have said in those two cases.
  it("the naive deadline - now would read 0 and 81s on those same inputs", () => {
    const fast = at({ receivedAt: 62_000 });
    const slow = at({ receivedAt: -59_000 });
    const naive = (t: TimerState, now: number) => Math.max(0, t.deadlineEpochMs - now);
    expect(naive(fast, 67_000)).toBe(0); // "your time is up" with 20s left
    expect(naive(slow, -54_000)).toBe(80_000); // a timer that outlives the hand
    // ...against the real answer, which is the same 20s in both.
    expect(msLeft(fast, 67_000)).toBe(msLeft(slow, -54_000));
  });
});

describe("totalMs", () => {
  it("is the action time for an ordinary timer", () => {
    expect(totalMs(at(), 25_000, 30_000)).toBe(25_000);
  });

  it("includes the bank once a player has spent it", () => {
    expect(totalMs(at({ timeBank: true }), 25_000, 30_000)).toBe(55_000);
  });

  // Without this the bar would start past 100%, clamp, and appear frozen for
  // the first 30 seconds of the extension the player just paid for.
  it("keeps the bar under 1 for a fresh time-bank timer", () => {
    const t = at({ timeBank: true, deadlineEpochMs: 56_000 });
    expect(msLeft(t, 1_000) / totalMs(t, 25_000, 30_000)).toBeLessThanOrEqual(1);
    expect(msLeft(t, 1_000) / totalMs(t, 25_000, 0)).toBeGreaterThan(1); // the bug
  });
});
