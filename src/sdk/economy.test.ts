import { describe, it, expect } from "vitest";
import {
  GAME_REASONS,
  SESSION_COIN_CAP,
  STREAK_COINS,
  TIER_COINS,
  coinsFor,
  starsFor,
} from "./economy";
import type { RewardReason, RewardTier } from "./economy";

const TIERS: RewardTier[] = ["easy", "medium", "hard"];
const REASONS: RewardReason[] = ["level_complete", "milestone", "personal_best"];

describe("TIER_COINS", () => {
  it("is the single earn table every game shares", () => {
    expect(TIER_COINS).toEqual({ easy: 3, medium: 5, hard: 8 });
  });

  it("rises with difficulty", () => {
    expect(TIER_COINS.easy).toBeLessThan(TIER_COINS.medium);
    expect(TIER_COINS.medium).toBeLessThan(TIER_COINS.hard);
  });
});

describe("coinsFor", () => {
  it("pays the tier rate for a completed level", () => {
    for (const tier of TIERS) {
      expect(coinsFor({ reason: "level_complete", tier })).toBe(TIER_COINS[tier]);
    }
  });

  it("pays the tier rate for a personal best", () => {
    for (const tier of TIERS) {
      expect(coinsFor({ reason: "personal_best", tier })).toBe(TIER_COINS[tier]);
    }
  });

  it("defaults an omitted tier to easy", () => {
    expect(coinsFor({ reason: "level_complete" })).toBe(TIER_COINS.easy);
    expect(coinsFor({ reason: "personal_best" })).toBe(TIER_COINS.easy);
  });

  it("pays a flat 1 for a milestone, whatever the tier", () => {
    expect(coinsFor({ reason: "milestone" })).toBe(1);
    for (const tier of TIERS) {
      expect(coinsFor({ reason: "milestone", tier })).toBe(1);
    }
  });
});

describe("starsFor", () => {
  it("gives no star for a mid-run milestone", () => {
    for (const tier of TIERS) {
      expect(starsFor({ reason: "milestone", tier })).toBe(0);
    }
    expect(starsFor({ reason: "milestone" })).toBe(0);
  });

  it("gives exactly one star for a completion or a personal best", () => {
    for (const tier of TIERS) {
      expect(starsFor({ reason: "level_complete", tier })).toBe(1);
      expect(starsFor({ reason: "personal_best", tier })).toBe(1);
    }
  });
});

describe("never negative", () => {
  it("holds across every reason x tier combination", () => {
    for (const reason of REASONS) {
      for (const tier of [...TIERS, undefined]) {
        const g = { reason, tier };
        expect(coinsFor(g)).toBeGreaterThanOrEqual(0);
        expect(starsFor(g)).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(coinsFor(g))).toBe(true);
        expect(Number.isInteger(starsFor(g))).toBe(true);
      }
    }
  });
});

describe("SESSION_COIN_CAP", () => {
  it("is a positive integer that bounds an endless game's minting", () => {
    expect(Number.isInteger(SESSION_COIN_CAP)).toBe(true);
    expect(SESSION_COIN_CAP).toBeGreaterThan(0);
  });

  it("still allows a few honest wins before biting", () => {
    // Sanity: the cap must not be so tight that a normal session of the
    // hardest tier is throttled on the very first grant.
    expect(SESSION_COIN_CAP).toBeGreaterThanOrEqual(TIER_COINS.hard);
  });
});

describe("streak — the daily-puzzle payoff", () => {
  it("pays a flat amount, whatever tier a caller invents", () => {
    expect(coinsFor({ reason: "streak" })).toBe(STREAK_COINS);
    for (const tier of TIERS) {
      expect(coinsFor({ reason: "streak", tier })).toBe(STREAK_COINS);
    }
  });

  it("earns a star, which is the half that cannot inflate anything", () => {
    // A star is never spent and never lost, and `requiresStars` already turns a
    // star count into ACCESS. That is the whole answer to "what does coming
    // back every day buy": the premium shelf, through the gate already there.
    expect(starsFor({ reason: "streak" })).toBe(1);
  });

  it("is bounded and small — it must not out-earn finishing a hard level", () => {
    // The shop is the only coin sink in this app. A daily reward that beat a
    // real win would make playing the game the slow way to earn.
    expect(STREAK_COINS).toBeGreaterThan(0);
    expect(STREAK_COINS).toBeLessThan(TIER_COINS.hard);
    expect(Number.isInteger(STREAK_COINS)).toBe(true);
  });

  it("is NOT a reason a game may report", () => {
    // A game knows nothing about days. `daily.ts` decides a milestone is owed
    // and `wallet.grantStreak` is the only door it comes through;
    // `wallet.test.ts` proves a game's own port refuses it.
    expect(GAME_REASONS.has("streak")).toBe(false);
    for (const reason of REASONS) expect(GAME_REASONS.has(reason)).toBe(true);
  });

  it("is still priced — refusing it at the port is not the same as pricing it 0", () => {
    // If this ever became 0 the guard in the wallet would look redundant and
    // somebody would delete it, and then a game could mint the real amount the
    // day this number moved back.
    expect(coinsFor({ reason: "streak" })).toBeGreaterThan(0);
  });
});
