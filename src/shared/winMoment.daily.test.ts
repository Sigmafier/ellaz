/**
 * The daily wire, and only the daily wire.
 *
 * `winMoment` reaches `ctx.daily?.complete()` through an optional chain, which
 * is correct - a hand-built test context predates the port and must not throw
 * inside a win - and which is also exactly the shape that can silently do
 * nothing forever. A port that is never reached and a port that is reached and
 * no-ops are indistinguishable from every screen, every log and every other
 * test in this repo.
 *
 * So this file asserts the call HAPPENS, and that it happens in the BANKED
 * half. The banked half is the whole reason the line sits where it does: a day
 * a child actually played is a fact about them, in the same class as a coin and
 * a personal best, and a thrown confetti must not be able to cost them a
 * streak. `winMoment` already wraps every cosmetic in try/catch for the coin;
 * this proves the streak is inside the same guarantee.
 */
import { describe, expect, it, vi } from "vitest";
import type { GameContext } from "@sdk/index";
import { winMoment } from "./winMoment";

/**
 * The smallest context a win can run against. Deliberately hand-built rather
 * than produced by `createContext`, because the real factory now always
 * supplies `daily` - so a test using it could not tell a wired port from an
 * unwired one, which is the single thing this file exists to check.
 */
function ctxWith(daily: unknown, audio?: Partial<GameContext["audio"]>): GameContext {
  return {
    mount: undefined as never,
    locale: "he",
    dir: "rtl",
    t: (k: string) => k,
    storage: { get: () => undefined, set: () => {}, remove: () => {} },
    analytics: { init: () => {}, track: () => {}, levelStart: () => {}, levelComplete: () => {} },
    audio: { muted: false, toggleMute: () => {}, onMuteChange: () => () => {}, play: () => {}, tone: () => {}, now: () => 0, unlock: () => {}, ...audio },
    rewards: { grant: () => ({ coins: 3, stars: 1, capped: false }), balance: () => ({ coins: 0, stars: 0 }) },
    daily,
  } as unknown as GameContext;
}

describe("winMoment reaches the daily port", () => {
  it("reports the day on a win", () => {
    const complete = vi.fn();
    winMoment(ctxWith({ complete }), { reason: "level_complete", tier: "easy", level: "l1" });
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("passes NOTHING, so a game cannot claim to be today's puzzle", () => {
    // The same law as `grant()` taking a reason rather than a coin amount: the
    // port decides, the caller reports. If an argument ever appears here, a
    // game has been handed the power to name the day or the game, and the whole
    // point of the port is gone.
    const complete = vi.fn();
    winMoment(ctxWith({ complete }), { reason: "milestone", confetti: false });
    expect(complete).toHaveBeenCalledWith();
  });

  it("reports on EVERY reason, not just a completed level", () => {
    // Gating on `level_complete` would mean an endless game as today's pick
    // could almost never count, so the streak would break on our choice of game
    // rather than on whether the child played.
    for (const reason of ["level_complete", "milestone", "personal_best"] as const) {
      const complete = vi.fn();
      winMoment(ctxWith({ complete }), { reason, confetti: false });
      expect(complete, reason).toHaveBeenCalledTimes(1);
    }
  });

  it("is BANKED, not decorated - a thrown sound still counts the day", () => {
    const complete = vi.fn();
    const ctx = ctxWith({ complete }, {
      play: () => {
        throw new Error("audio device went away mid-win");
      },
    });
    expect(() => winMoment(ctx, { reason: "level_complete", tier: "hard", level: "l9" })).not.toThrow();
    expect(complete, "the day must survive a thrown cosmetic").toHaveBeenCalledTimes(1);
  });

  it("survives a host with no daily port at all", () => {
    // The optional chain's actual job. An older host, or any of the game tests
    // written before this port existed, must still be able to win.
    expect(() => winMoment(ctxWith(undefined), { reason: "milestone", confetti: false })).not.toThrow();
  });

  it("survives a daily port that throws", () => {
    const complete = vi.fn(() => {
      throw new Error("disk is full");
    });
    expect(() => winMoment(ctxWith({ complete }), { reason: "milestone", confetti: false })).not.toThrow();
    expect(complete).toHaveBeenCalledTimes(1);
  });
});
