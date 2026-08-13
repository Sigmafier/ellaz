import { describe, it, expect } from "vitest";
import { createDailyStore, shiftDateKey, type DailyStore } from "./daily";
import { createWallet } from "./wallet";
import { memoryBackend, type KeyValueBackend } from "./profile";
import { STREAK_COINS } from "./economy";
import { claimStreakReward } from "./streakPayout";

// The composition — the schedule, the price and the purse, driven together.
//
// The pure halves are covered where they live (`daily.test.ts` for the ladder
// and the latch, `wallet.test.ts` for the payout). What can only be seen from
// here is the property that matters to a child's coin balance: a milestone
// reaches the wallet EXACTLY ONCE, whatever the caller does — including a
// caller that calls on every render, twice at once from two screens, or across
// a reload.

/** A device: one storage, a streak store and a wallet reading the same disk. */
function device(seed?: Record<string, string>) {
  const backend: KeyValueBackend = memoryBackend(seed);
  return { backend, store: createDailyStore(backend), purse: createWallet(backend) };
}

/** A separate storage per SIDE, so a refusing disk can be aimed at one of them. */
function splitDevice(refuse: "streak" | "wallet") {
  const streakDisk = memoryBackend();
  const walletDisk = memoryBackend();
  const refusing = (b: KeyValueBackend): KeyValueBackend => ({ read: b.read, write: () => false });
  return {
    store: createDailyStore(refuse === "streak" ? refusing(streakDisk) : streakDisk),
    purse: createWallet(refuse === "wallet" ? refusing(walletDisk) : walletDisk),
  };
}

/** Play `days` consecutive days from 2026-08-01. */
function playRun(store: DailyStore, days: number, from = "2026-08-01"): void {
  for (let i = 0; i < days; i++) store.complete(shiftDateKey(from, i));
}

describe("claimStreakReward", () => {
  it("pays nothing before the first milestone", () => {
    const { store, purse } = device();
    playRun(store, 2);
    expect(claimStreakReward(store, purse)).toEqual({ milestone: 0, coins: 0, stars: 0 });
    expect(purse.coins).toBe(0);
    expect(purse.stars).toBe(0);
  });

  it("pays coins AND a star the day a milestone lands", () => {
    const { store, purse } = device();
    playRun(store, 3);

    expect(claimStreakReward(store, purse)).toEqual({
      milestone: 3,
      coins: STREAK_COINS,
      stars: 1,
    });
    expect(purse.coins).toBe(STREAK_COINS);
    expect(purse.stars).toBe(1);
  });

  it("PAYS ONCE, however many callers ask — the property, end to end", () => {
    // Without the on-disk latch in `DailyStore.claim` this loop is a coin
    // printer: `daily.test.ts` proves the latch, this proves the money.
    const { store, purse } = device();
    playRun(store, 3);

    for (let i = 0; i < 200; i++) claimStreakReward(store, purse);

    expect(purse.coins).toBe(STREAK_COINS);
    expect(purse.stars).toBe(1);
  });

  it("pays once ACROSS A RELOAD, which a latch in memory could not", () => {
    const backend = memoryBackend();
    const first = createDailyStore(backend);
    playRun(first, 7);
    // Two rungs are behind this run, and only the highest is owed.
    expect(claimStreakReward(first, createWallet(backend)).milestone).toBe(7);

    for (let reload = 0; reload < 10; reload++) {
      const store = createDailyStore(backend);
      const purse = createWallet(backend);
      expect(claimStreakReward(store, purse)).toEqual({ milestone: 0, coins: 0, stars: 0 });
      expect(purse.coins).toBe(STREAK_COINS);
      expect(purse.stars).toBe(1);
    }
  });

  it("pays each rung of a year exactly once — bounded, not a daily faucet", () => {
    const { store, purse } = device();
    for (let i = 0; i < 365; i++) {
      store.complete(shiftDateKey("2026-01-01", i));
      // Claimed after every single day, the way a mounted screen would.
      claimStreakReward(store, purse);
      claimStreakReward(store, purse);
    }
    // 3, 7, 14, then every 30 up to 360: seventeen payouts across a whole year
    // of perfect attendance, not 365.
    const payouts = 3 + 12;
    expect(purse.stars).toBe(payouts);
    expect(purse.coins).toBe(payouts * STREAK_COINS);
  });

  it("never re-opens a rung a broken-and-rebuilt streak reaches again", () => {
    const { store, purse } = device();
    playRun(store, 3, "2026-08-01");
    claimStreakReward(store, purse);
    // Days off, then three more in a row, over and over.
    for (let week = 1; week <= 6; week++) {
      playRun(store, 3, shiftDateKey("2026-08-01", week * 10));
      claimStreakReward(store, purse);
    }
    expect(purse.coins).toBe(STREAK_COINS);
    expect(purse.stars).toBe(1);
  });

  it("takes NOTHING when a streak breaks", () => {
    const { store, purse } = device();
    playRun(store, 7);
    claimStreakReward(store, purse);
    const banked = { coins: purse.coins, stars: purse.stars };

    // A fortnight away, then a single day back.
    store.complete("2026-08-25");
    claimStreakReward(store, purse);

    expect(purse.coins).toBe(banked.coins);
    expect(purse.stars).toBe(banked.stars);
    // And the record itself still stands.
    expect(store.read().longest).toBe(7);
  });

  it("pays NOTHING rather than repeatedly when the latch cannot be stored", () => {
    // The fail-closed half of latch-first-pay-second. Paying here would re-pay
    // on every reload forever on exactly the devices nobody can see.
    const { store, purse } = splitDevice("streak");
    playRun(store, 3);
    for (let i = 0; i < 20; i++) claimStreakReward(store, purse);
    expect(purse.coins).toBe(0);
    expect(purse.stars).toBe(0);
  });

  it("spends the milestone when the WALLET refuses — never re-arms it", () => {
    // The other side of the same trade: the latch is already down, so a device
    // that cannot bank the coins loses this milestone rather than retrying it
    // forever. A device that can store nothing loses everything anyway.
    const { store, purse } = splitDevice("wallet");
    playRun(store, 3);
    expect(claimStreakReward(store, purse)).toEqual({ milestone: 3, coins: 0, stars: 0 });
    expect(purse.coins).toBe(0);
    expect(store.read().paid).toBe(3);
    expect(claimStreakReward(store, purse).milestone).toBe(0);
  });

  it("never throws, whatever the store does", () => {
    const exploding = {
      read: () => {
        throw new Error("nope");
      },
      claim: () => {
        throw new Error("nope");
      },
      complete: () => {
        throw new Error("nope");
      },
      subscribe: () => () => {},
    } as unknown as DailyStore;
    const { purse } = device();
    expect(() => claimStreakReward(exploding, purse)).not.toThrow();
    expect(claimStreakReward(exploding, purse)).toEqual({ milestone: 0, coins: 0, stars: 0 });
  });

  it("leaves the SHOP unlocked by longest, not by what was paid", () => {
    // The two halves of the payoff are independent on purpose: the coins are
    // latched by `paid`, the shelf is gated on `longest`. A child who was paid
    // once still sees the shelf every day afterwards.
    const { store } = device();
    playRun(store, 14);
    expect(store.read().longest).toBe(14);
    store.complete("2026-09-20"); // a lapse: current back to 1
    expect(store.read().current).toBe(1);
    expect(store.read().longest).toBe(14);
  });
});
