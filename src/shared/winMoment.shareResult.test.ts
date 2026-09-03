/**
 * winMoment() and the share chip, and only that wire.
 *
 * The same shape `winMoment.daily.test.ts` already holds the daily port to:
 * `announceWinShare` is reached through a plain function call with nothing to
 * catch a silent no-op, so this proves the call HAPPENS, that it happens AFTER
 * the coins are already banked (the chip is cosmetic and must never be able to
 * cost a child their win), and that a thrown chip handler cannot break a win
 * either - the same guarantee every other cosmetic in this file already has.
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import type { GameContext } from "@sdk/index";
import { winMoment } from "./winMoment";
import { registerShareChipHandler, type WinShareEvent } from "./shareResult";

function ctxWith(rewards: { grant: () => { coins: number; stars: number; capped: boolean } }): GameContext {
  return {
    mount: undefined as never,
    locale: "en",
    dir: "ltr",
    t: (k: string) => k,
    storage: { get: () => undefined, set: () => {}, remove: () => {} },
    analytics: { init: () => {}, track: () => {}, levelStart: () => {}, levelComplete: () => {} },
    audio: { muted: false, toggleMute: () => {}, onMuteChange: () => () => {}, play: () => {}, tone: () => {}, now: () => 0, unlock: () => {} },
    rewards,
    daily: { complete: () => {} },
  } as unknown as GameContext;
}

afterEach(() => {
  // A leaked registration would leak into the NEXT test file's chip, exactly
  // the failure GameHost's own unmount cleanup exists to prevent in the app.
  registerShareChipHandler(null);
});

describe("winMoment offers to share a win", () => {
  it("announces the win, once, on every reason", () => {
    for (const reason of ["level_complete", "milestone", "personal_best"] as const) {
      const events: WinShareEvent[] = [];
      registerShareChipHandler((e) => events.push(e));
      winMoment(ctxWith({ grant: () => ({ coins: 3, stars: 1, capped: false }) }), {
        reason,
        confetti: false,
      });
      expect(events, reason).toHaveLength(1);
    }
  });

  it("is a no-op when nothing is listening - a hand-built test context, most of this suite", () => {
    registerShareChipHandler(null);
    expect(() =>
      winMoment(ctxWith({ grant: () => ({ coins: 3, stars: 1, capped: false }) }), {
        reason: "milestone",
        confetti: false,
      }),
    ).not.toThrow();
  });

  it("carries the run's own score and personal-best flag through untouched", () => {
    const events: WinShareEvent[] = [];
    registerShareChipHandler((e) => events.push(e));
    winMoment(ctxWith({ grant: () => ({ coins: 1, stars: 0, capped: false }) }), {
      reason: "level_complete",
      confetti: false,
      score: { value: 14, unit: "moves" },
    });
    expect(events[0].score).toEqual({ value: 14, unit: "moves" });
    // No `ctx.score` port on this hand-built context, so nothing could have
    // set a personal best - the false is the honest answer, not a default
    // standing in for one this test never earned.
    expect(events[0].isPersonalBest).toBe(false);
  });

  it("fires AFTER the coins are banked, not before - a thrown grant must never reach the chip", () => {
    const events: WinShareEvent[] = [];
    registerShareChipHandler((e) => events.push(e));
    const grant = vi.fn(() => {
      throw new Error("wallet write failed mid-win");
    });
    expect(() =>
      winMoment(ctxWith({ grant }), { reason: "milestone", confetti: false }),
    ).toThrow();
    // The grant call itself is the bank; a context whose grant throws never
    // produced a `result` to hand anywhere, chip included.
    expect(events).toHaveLength(0);
  });

  it("a thrown chip handler cannot break the win - same guarantee as every other cosmetic", () => {
    registerShareChipHandler(() => {
      throw new Error("chip mount failed");
    });
    expect(() =>
      winMoment(ctxWith({ grant: () => ({ coins: 5, stars: 0, capped: false }) }), {
        reason: "level_complete",
        confetti: false,
      }),
    ).not.toThrow();
  });
});
