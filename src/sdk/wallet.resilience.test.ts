// Regression tests for the five defects an adversarial audit found by EXECUTING
// the real modules (2026-08-02). Every one of them was silent: nothing threw,
// nothing logged, and the app carried on looking correct.
//
// Each test below states the failure it pins in terms of what a CHILD would
// experience, because that is the only reason any of them matter. Several are
// paired with a positive control, since a rollback that always rolls back and a
// payout that always pays zero would satisfy a careless assertion just as well.
import { describe, it, expect } from "vitest";
import { createWallet } from "./wallet";
import { PROFILE_KEY, memoryBackend, migrateProfile } from "./profile";
import { SESSION_COIN_CAP, TIER_COINS } from "./economy";
import type { KeyValueBackend } from "./profile";
import type { RewardGrant } from "./types";

/** A store that refuses every write the way a full or disabled device does. */
function refusingBackend(seed?: Record<string, string>): KeyValueBackend {
  const inner = memoryBackend(seed);
  return { read: (k) => inner.read(k), write: () => false };
}

/** A store that THROWS instead of returning false — Safari private mode. */
function throwingBackend(seed?: Record<string, string>): KeyValueBackend {
  const inner = memoryBackend(seed);
  return {
    read: (k) => inner.read(k),
    write: () => {
      throw new DOMException("QuotaExceededError");
    },
  };
}

/** Refuses until `allow` is flipped, so one test can span both regimes. */
function flakyBackend(): KeyValueBackend & { allow: boolean } {
  const inner = memoryBackend();
  const b = {
    allow: false,
    read: (k: string) => inner.read(k),
    write: (k: string, v: string) => (b.allow ? inner.write(k, v) : false),
  };
  return b;
}

/** Force a value past the compile-time union, the way corrupt JSON would. */
function bad(g: Record<string, unknown>): RewardGrant {
  return g as unknown as RewardGrant;
}

describe("an unknown tier must under-pay, never annihilate", () => {
  it("pays nothing and leaves the existing balance untouched", () => {
    const wallet = createWallet(memoryBackend());
    const rewards = wallet.createRewardsPort("frog");

    // Earn a real balance first, so there is something to destroy.
    rewards.grant({ reason: "level_complete", tier: "hard" });
    const earned = wallet.coins;
    expect(earned).toBe(TIER_COINS.hard); // positive control: normal path works

    const res = rewards.grant(bad({ reason: "level_complete", tier: "expert" }));

    // Before the fix: TIER_COINS["expert"] was undefined -> NaN -> serialised as
    // null -> read back as 0. The child's whole balance vanished.
    expect(Number.isNaN(res.coins)).toBe(false);
    expect(wallet.coins).toBe(earned + res.coins);
    expect(Number.isNaN(wallet.coins)).toBe(false);
    expect(wallet.coins).toBeGreaterThanOrEqual(earned);
  });

  it("does not poison the grants that come after it", () => {
    const wallet = createWallet(memoryBackend());
    const rewards = wallet.createRewardsPort("frog");

    rewards.grant(bad({ reason: "level_complete", tier: "expert" }));
    // Before the fix, `spentThisSession += NaN` made the session budget NaN, so
    // every later grant — with a perfectly valid tier — also paid NaN. The mount
    // was dead for the rest of the sitting.
    const after = rewards.grant({ reason: "level_complete", tier: "medium" });

    expect(after.coins).toBe(TIER_COINS.medium);
    expect(wallet.coins).toBeGreaterThanOrEqual(TIER_COINS.medium);
  });
});

describe("an unknown reason fails closed", () => {
  it("pays no coins, no star, and does not count as a win", () => {
    const wallet = createWallet(memoryBackend());
    const rewards = wallet.createRewardsPort("frog");

    const res = rewards.grant(bad({ reason: "bogus_reason", tier: "hard" }));

    expect(res.coins).toBe(0);
    expect(res.stars).toBe(0);
    expect(wallet.stars).toBe(0);
    expect(wallet.snapshot().games.frog?.wins ?? 0).toBe(0);
  });

  it("still pays the three real reasons — the check is not blanket-refusing", () => {
    const wallet = createWallet(memoryBackend());
    const rewards = wallet.createRewardsPort("frog");

    expect(rewards.grant({ reason: "level_complete", tier: "easy" }).stars).toBe(1);
    expect(rewards.grant({ reason: "personal_best", tier: "easy" }).stars).toBe(1);
    const ms = rewards.grant({ reason: "milestone" });
    expect(ms.coins).toBe(1);
    expect(ms.stars).toBe(0); // a milestone is a nudge, not an achievement
  });
});

describe("a refused write is rolled back, never shown as earned", () => {
  for (const [label, make] of [
    ["a store that returns false", refusingBackend],
    ["a store that throws", throwingBackend],
  ] as const) {
    it(`${label}: grant reports nothing banked and the balance does not move`, () => {
      const backend = make();
      const wallet = createWallet(backend);
      const rewards = wallet.createRewardsPort("frog");

      const res = rewards.grant({ reason: "level_complete", tier: "hard" });

      // The bug this pins: the chip counted up, coins flew to the wallet, and a
      // reload silently put the child back to zero. `winMoment` skips the coin
      // flight when `coins` is 0, so reporting honestly also stops the animation.
      expect(res.persisted).toBe(false);
      expect(res.coins).toBe(0);
      expect(res.stars).toBe(0);
      expect(wallet.coins).toBe(0);
      expect(wallet.stars).toBe(0);
      expect(migrateProfile(backend.read(PROFILE_KEY)).coins).toBe(0);
    });

    it(`${label}: a purchase is not shown as owned`, () => {
      const backend = make({
        [PROFILE_KEY]: JSON.stringify({ v: 1, coins: 100, stars: 0, owned: [], equipped: {}, games: {} }),
      });
      const wallet = createWallet(backend);

      const res = wallet.buy("hat_cap", 60, "hat");

      expect(res.ok).toBe(false);
      expect(res.reason).toBe("unsaved");
      expect(wallet.coins).toBe(100); // not charged
      expect(wallet.owns("hat_cap")).toBe(false); // not placed in the room
    });
  }

  it("POSITIVE CONTROL: the same calls succeed on a working store", () => {
    const backend = memoryBackend({
      [PROFILE_KEY]: JSON.stringify({ v: 1, coins: 100, stars: 0, owned: [], equipped: {}, games: {} }),
    });
    const wallet = createWallet(backend);

    const res = wallet.buy("hat_cap", 60, "hat");
    expect(res.ok).toBe(true);
    expect(wallet.coins).toBe(40);
    expect(wallet.owns("hat_cap")).toBe(true);

    const g = wallet.createRewardsPort("frog").grant({ reason: "level_complete", tier: "hard" });
    expect(g.persisted).toBe(true);
    expect(g.coins).toBe(TIER_COINS.hard);
  });
});

describe("a rolled-back grant does not burn the session budget", () => {
  it("pays in full once storage recovers", () => {
    const backend = flakyBackend();
    const wallet = createWallet(backend);
    const rewards = wallet.createRewardsPort("frog");

    // Enough refused grants to exhaust the cap, had they been charged.
    const attempts = Math.ceil(SESSION_COIN_CAP / TIER_COINS.hard) + 2;
    for (let i = 0; i < attempts; i++) {
      expect(rewards.grant({ reason: "level_complete", tier: "hard" }).persisted).toBe(false);
    }

    backend.allow = true;
    const res = rewards.grant({ reason: "level_complete", tier: "hard" });

    // Charging the budget for coins that were never banked would let a failing
    // device silently spend a child's whole session allowance on nothing.
    expect(res.persisted).toBe(true);
    expect(res.coins).toBe(TIER_COINS.hard);
    expect(res.capped).toBe(false);
  });
});
