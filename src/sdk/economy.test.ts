import { describe, it, expect } from "vitest";
import { TIER_COINS, SESSION_COIN_CAP, coinsFor, starsFor } from "./economy";
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
