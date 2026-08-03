import { describe, it, expect, vi } from "vitest";
import { createWallet } from "./wallet";
import { PROFILE_KEY, memoryBackend, migrateProfile } from "./profile";
import { SESSION_COIN_CAP, TIER_COINS } from "./economy";
import type { KeyValueBackend } from "./profile";
import { renderName, resolveName } from "./names";
import { mulberry32 } from "@shared/rng";

/** A wallet on a private in-memory store, plus the store, so a test can reload. */
function freshWallet(seed?: Record<string, string>) {
  const backend: KeyValueBackend = memoryBackend(seed);
  return { backend, wallet: createWallet(backend) };
}

describe("grant -> persist -> reload round-trip", () => {
  it("writes the earned coins and stars through to the backend", () => {
    const { backend, wallet } = freshWallet();
    const rewards = wallet.createRewardsPort("snake");

    const res = rewards.grant({ reason: "level_complete", tier: "medium" });

    expect(res.coins).toBe(TIER_COINS.medium);
    expect(res.stars).toBe(1);
    expect(res.totalCoins).toBe(TIER_COINS.medium);
    expect(res.totalStars).toBe(1);
    expect(res.capped).toBe(false);

    // Persisted BEFORE grant() returned — read the raw store, not the object.
    const stored = migrateProfile(backend.read(PROFILE_KEY));
    expect(stored.coins).toBe(TIER_COINS.medium);
    expect(stored.stars).toBe(1);
  });

  it("a second wallet built on the same store sees the balance", () => {
    const { backend, wallet } = freshWallet();
    wallet.createRewardsPort("math").grant({ reason: "level_complete", tier: "hard" });

    const reloaded = createWallet(backend);
    expect(reloaded.coins).toBe(TIER_COINS.hard);
    expect(reloaded.stars).toBe(1);
  });

  it("records per-game wins and stars", () => {
    const { wallet } = freshWallet();
    const rewards = wallet.createRewardsPort("n2048");

    rewards.grant({ reason: "level_complete", tier: "easy" });
    rewards.grant({ reason: "personal_best", tier: "easy" });
    rewards.grant({ reason: "milestone" });

    const games = wallet.snapshot().games;
    // A milestone is a mid-run ping, not a win — it must not inflate the count.
    expect(games.n2048).toEqual({ wins: 2, stars: 2 });
  });

  it("exposes a live balance on the port itself", () => {
    const { wallet } = freshWallet();
    const rewards = wallet.createRewardsPort("snake");
    expect(rewards.coins).toBe(0);
    rewards.grant({ reason: "level_complete", tier: "easy" });
    expect(rewards.coins).toBe(TIER_COINS.easy);
    expect(rewards.stars).toBe(1);
  });

  it("accumulates across games", () => {
    const { wallet } = freshWallet();
    wallet.createRewardsPort("a").grant({ reason: "level_complete", tier: "easy" });
    wallet.createRewardsPort("b").grant({ reason: "level_complete", tier: "easy" });
    expect(wallet.coins).toBe(TIER_COINS.easy * 2);
    expect(wallet.stars).toBe(2);
  });
});

describe("session coin cap", () => {
  it("swallows the overflow and reports capped:true", () => {
    const { wallet } = freshWallet();
    const rewards = wallet.createRewardsPort("snake");

    let minted = 0;
    let sawCap = false;
    // Grind well past the cap on the highest tier.
    for (let i = 0; i < Math.ceil(SESSION_COIN_CAP / TIER_COINS.hard) + 5; i++) {
      const res = rewards.grant({ reason: "level_complete", tier: "hard" });
      minted += res.coins;
      if (res.capped) sawCap = true;
    }

    expect(sawCap).toBe(true);
    expect(minted).toBe(SESSION_COIN_CAP);
    expect(wallet.coins).toBe(SESSION_COIN_CAP);
  });

  it("pays out the partial remainder on the grant that crosses the cap", () => {
    const { wallet } = freshWallet();
    const rewards = wallet.createRewardsPort("snake");

    let spentBudget = 0;
    // Fill the budget to within less than one hard-tier payout of the cap.
    while (SESSION_COIN_CAP - spentBudget > TIER_COINS.hard) {
      spentBudget += rewards.grant({ reason: "level_complete", tier: "hard" }).coins;
    }
    const remainder = SESSION_COIN_CAP - spentBudget;

    const crossing = rewards.grant({ reason: "level_complete", tier: "hard" });
    expect(crossing.coins).toBe(remainder);
    expect(crossing.capped).toBe(remainder < TIER_COINS.hard);
    expect(wallet.coins).toBe(SESSION_COIN_CAP);
  });

  it("never grants negative coins once the budget is spent", () => {
    const { wallet } = freshWallet();
    const rewards = wallet.createRewardsPort("snake");
    for (let i = 0; i < 50; i++) rewards.grant({ reason: "level_complete", tier: "hard" });
    const res = rewards.grant({ reason: "level_complete", tier: "hard" });
    expect(res.coins).toBe(0);
    expect(res.capped).toBe(true);
    expect(wallet.coins).toBe(SESSION_COIN_CAP);
  });

  it("still awards the star after the coin cap bites", () => {
    // The cap throttles the CURRENCY, not the trophy — stars are never lost.
    const { wallet } = freshWallet();
    const rewards = wallet.createRewardsPort("snake");
    for (let i = 0; i < 50; i++) rewards.grant({ reason: "level_complete", tier: "hard" });
    const before = wallet.stars;
    const res = rewards.grant({ reason: "level_complete", tier: "hard" });
    expect(res.stars).toBe(1);
    expect(wallet.stars).toBe(before + 1);
  });

  it("is PER MOUNT — a fresh port gets a fresh budget", () => {
    const { wallet } = freshWallet();
    const first = wallet.createRewardsPort("snake");
    for (let i = 0; i < 50; i++) first.grant({ reason: "level_complete", tier: "hard" });
    expect(first.grant({ reason: "level_complete", tier: "hard" }).capped).toBe(true);

    const second = wallet.createRewardsPort("snake");
    const res = second.grant({ reason: "level_complete", tier: "hard" });
    expect(res.coins).toBe(TIER_COINS.hard);
    expect(res.capped).toBe(false);
  });
});

describe("buy", () => {
  it("charges once and grants ownership", () => {
    const { wallet } = freshWallet({ [PROFILE_KEY]: '{"v":1,"coins":100}' });
    const res = wallet.buy("rug-red", 30, "floor");

    expect(res.ok).toBe(true);
    expect(res.alreadyOwned).toBe(false);
    expect(wallet.coins).toBe(70);
    expect(wallet.owns("rug-red")).toBe(true);
  });

  it("is IDEMPOTENT — a double tap must not double-charge", () => {
    const { wallet } = freshWallet({ [PROFILE_KEY]: '{"v":1,"coins":100}' });

    const first = wallet.buy("rug-red", 30, "floor");
    const second = wallet.buy("rug-red", 30, "floor");
    const third = wallet.buy("rug-red", 30, "floor");

    expect(first.alreadyOwned).toBe(false);
    expect(second.ok).toBe(true);
    expect(second.alreadyOwned).toBe(true);
    expect(third.alreadyOwned).toBe(true);
    expect(wallet.coins).toBe(70);
    expect(wallet.snapshot().owned).toEqual(["rug-red"]);
  });

  it("is rejected when the item is unaffordable, and charges nothing", () => {
    const { wallet } = freshWallet({ [PROFILE_KEY]: '{"v":1,"coins":10}' });
    const res = wallet.buy("lamp", 30, "decor");

    expect(res.ok).toBe(false);
    expect(res.reason).toBe("unaffordable");
    expect(wallet.coins).toBe(10);
    expect(wallet.owns("lamp")).toBe(false);
  });

  it("rejects a hostile price instead of minting coins", () => {
    const { wallet } = freshWallet({ [PROFILE_KEY]: '{"v":1,"coins":10}' });
    expect(wallet.buy("free-lunch", -50, "decor").ok).toBe(false);
    expect(wallet.buy("nan", NaN, "decor").ok).toBe(false);
    expect(wallet.coins).toBe(10);
  });

  it("persists the purchase", () => {
    const { backend, wallet } = freshWallet({ [PROFILE_KEY]: '{"v":1,"coins":100}' });
    wallet.buy("rug-red", 30, "floor");
    const stored = migrateProfile(backend.read(PROFILE_KEY));
    expect(stored.coins).toBe(70);
    expect(stored.owned).toEqual(["rug-red"]);
  });

  it("reports affordability without mutating anything", () => {
    const { wallet } = freshWallet({ [PROFILE_KEY]: '{"v":1,"coins":30}' });
    expect(wallet.canAfford(30)).toBe(true);
    expect(wallet.canAfford(31)).toBe(false);
    expect(wallet.coins).toBe(30);
  });
});

describe("equip", () => {
  it("equips an owned item into its category", () => {
    const { wallet } = freshWallet({ [PROFILE_KEY]: '{"v":1,"coins":100}' });
    wallet.buy("rug-red", 30, "floor");
    expect(wallet.equip("floor", "rug-red")).toBe(true);
    expect(wallet.equipped("floor")).toBe("rug-red");
  });

  it("refuses to equip an item the player does not own", () => {
    const { wallet } = freshWallet();
    expect(wallet.equip("floor", "rug-gold")).toBe(false);
    expect(wallet.equipped("floor")).toBeUndefined();
  });

  it("replaces the previous item in the same category", () => {
    const { wallet } = freshWallet({ [PROFILE_KEY]: '{"v":1,"coins":100}' });
    wallet.buy("rug-red", 10, "floor");
    wallet.buy("rug-blue", 10, "floor");
    wallet.equip("floor", "rug-red");
    wallet.equip("floor", "rug-blue");
    expect(wallet.equipped("floor")).toBe("rug-blue");
    expect(wallet.owns("rug-red")).toBe(true);
  });
});

describe("subscribe", () => {
  it("fires on every change, and stops after unsubscribe", () => {
    const { wallet } = freshWallet({ [PROFILE_KEY]: '{"v":1,"coins":100}' });
    const seen: number[] = [];
    const off = wallet.subscribe((p) => seen.push(p.coins));

    wallet.createRewardsPort("snake").grant({ reason: "level_complete", tier: "easy" });
    wallet.buy("rug-red", 30, "floor");
    wallet.equip("floor", "rug-red");
    const afterSubscribed = seen.length;
    expect(afterSubscribed).toBeGreaterThanOrEqual(3);

    off();
    wallet.buy("lamp", 5, "decor");
    wallet.createRewardsPort("math").grant({ reason: "level_complete", tier: "easy" });
    expect(seen.length).toBe(afterSubscribed);
  });

  it("supports several independent subscribers", () => {
    const { wallet } = freshWallet();
    let a = 0;
    let b = 0;
    const offA = wallet.subscribe(() => a++);
    wallet.subscribe(() => b++);

    wallet.createRewardsPort("snake").grant({ reason: "level_complete", tier: "easy" });
    expect(a).toBe(1);
    expect(b).toBe(1);

    offA();
    wallet.createRewardsPort("snake").grant({ reason: "level_complete", tier: "easy" });
    expect(a).toBe(1);
    expect(b).toBe(2);
  });

  it("does not fire for a rejected purchase", () => {
    const { wallet } = freshWallet({ [PROFILE_KEY]: '{"v":1,"coins":5}' });
    let fired = 0;
    wallet.subscribe(() => fired++);
    wallet.buy("lamp", 500, "decor");
    expect(fired).toBe(0);
  });

  it("survives a throwing subscriber — one bad listener cannot break the wallet", () => {
    const { wallet } = freshWallet();
    let good = 0;
    wallet.subscribe(() => {
      throw new Error("boom");
    });
    wallet.subscribe(() => good++);
    expect(() =>
      wallet.createRewardsPort("snake").grant({ reason: "level_complete", tier: "easy" }),
    ).not.toThrow();
    expect(good).toBe(1);
  });
});

describe("stars are a trophy — never spent, never lost", () => {
  it("no operation ever decrements the star count", () => {
    const { wallet } = freshWallet({ [PROFILE_KEY]: '{"v":1,"coins":500}' });
    const rewards = wallet.createRewardsPort("snake");

    let high = 0;
    const check = () => {
      expect(wallet.stars).toBeGreaterThanOrEqual(high);
      high = wallet.stars;
    };

    rewards.grant({ reason: "level_complete", tier: "hard" });
    check();
    rewards.grant({ reason: "personal_best", tier: "medium" });
    check();
    rewards.grant({ reason: "milestone" });
    check();
    wallet.buy("rug-red", 30, "floor");
    check();
    wallet.buy("rug-red", 30, "floor"); // idempotent no-op
    check();
    wallet.buy("mansion", 999999, "decor"); // rejected
    check();
    wallet.equip("floor", "rug-red");
    check();
    for (let i = 0; i < 50; i++) rewards.grant({ reason: "level_complete", tier: "hard" });
    check();

    expect(wallet.stars).toBe(52);
  });

  it("spending every coin leaves the stars intact", () => {
    const { wallet } = freshWallet({ [PROFILE_KEY]: '{"v":1,"coins":100,"stars":9}' });
    wallet.buy("everything", 100, "decor");
    expect(wallet.coins).toBe(0);
    expect(wallet.stars).toBe(9);
  });
});

describe("snapshot", () => {
  it("hands out a copy the caller cannot use to mutate the wallet", () => {
    const { wallet } = freshWallet({ [PROFILE_KEY]: '{"v":1,"coins":10}' });
    const snap = wallet.snapshot();
    snap.coins = 99999;
    snap.owned.push("hacked");
    expect(wallet.coins).toBe(10);
    expect(wallet.owns("hacked")).toBe(false);
  });
});

describe("markPlayed / recentlyPlayed", () => {
  /** A store seeded with explicit stamps, so ordering never races the clock. */
  function seedGames(games: Record<string, { wins?: number; stars?: number; lastPlayedAt?: number }>) {
    return freshWallet({ [PROFILE_KEY]: JSON.stringify({ v: 1, games }) });
  }

  it("returns an empty list for a player who has opened nothing", () => {
    const { wallet } = freshWallet();
    expect(wallet.recentlyPlayed()).toEqual([]);
    expect(wallet.recentlyPlayed(6)).toEqual([]);
  });

  it("records an open and returns it", () => {
    const { wallet } = freshWallet();
    wallet.markPlayed("snake");
    expect(wallet.recentlyPlayed()).toEqual(["snake"]);
  });

  it("orders most-recently-played FIRST", () => {
    vi.useFakeTimers();
    try {
      const { wallet } = freshWallet();
      vi.setSystemTime(new Date(1_000));
      wallet.markPlayed("memory");
      vi.setSystemTime(new Date(2_000));
      wallet.markPlayed("snake");
      vi.setSystemTime(new Date(3_000));
      wallet.markPlayed("math");
      expect(wallet.recentlyPlayed()).toEqual(["math", "snake", "memory"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("re-opening a game moves it back to the front", () => {
    vi.useFakeTimers();
    try {
      const { wallet } = freshWallet();
      vi.setSystemTime(new Date(1_000));
      wallet.markPlayed("memory");
      vi.setSystemTime(new Date(2_000));
      wallet.markPlayed("snake");
      vi.setSystemTime(new Date(3_000));
      wallet.markPlayed("memory");
      expect(wallet.recentlyPlayed()).toEqual(["memory", "snake"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("EXCLUDES a game that was never opened, rather than sorting it as 0", () => {
    // A game with wins but no stamp was played before this field existed (or
    // its stamp was junk). "Never opened" must not outrank nothing.
    const { wallet } = seedGames({
      hidden: { wins: 9, stars: 9 },
      snake: { wins: 1, stars: 1, lastPlayedAt: 5_000 },
    });
    expect(wallet.recentlyPlayed()).toEqual(["snake"]);
  });

  it("excludes a game whose stamp was unusable junk", () => {
    const { wallet } = freshWallet({
      [PROFILE_KEY]: '{"v":1,"games":{"snake":{"wins":1,"stars":1,"lastPlayedAt":"yesterday"}}}',
    });
    expect(wallet.recentlyPlayed()).toEqual([]);
  });

  it("breaks ties DETERMINISTICALLY on the game id, ascending", () => {
    const { wallet } = seedGames({
      snake: { lastPlayedAt: 100 },
      math: { lastPlayedAt: 100 },
      coloring: { lastPlayedAt: 100 },
      n2048: { lastPlayedAt: 200 },
    });
    // Newest first, then id ascending among the three that tie.
    expect(wallet.recentlyPlayed()).toEqual(["n2048", "coloring", "math", "snake"]);
  });

  it("gives the same answer regardless of the order the keys were written in", () => {
    const forward = seedGames({ a: { lastPlayedAt: 100 }, b: { lastPlayedAt: 100 } }).wallet;
    const reverse = seedGames({ b: { lastPlayedAt: 100 }, a: { lastPlayedAt: 100 } }).wallet;
    expect(forward.recentlyPlayed()).toEqual(reverse.recentlyPlayed());
    expect(forward.recentlyPlayed()).toEqual(["a", "b"]);
  });

  it("honours a limit, taking the newest", () => {
    const { wallet } = seedGames({
      a: { lastPlayedAt: 100 },
      b: { lastPlayedAt: 200 },
      c: { lastPlayedAt: 300 },
    });
    expect(wallet.recentlyPlayed(2)).toEqual(["c", "b"]);
    expect(wallet.recentlyPlayed(99)).toEqual(["c", "b", "a"]);
  });

  it("fails CLOSED on a nonsense limit - shows nothing, never everything", () => {
    const { wallet } = seedGames({ a: { lastPlayedAt: 100 }, b: { lastPlayedAt: 200 } });
    expect(wallet.recentlyPlayed(0)).toEqual([]);
    expect(wallet.recentlyPlayed(-3)).toEqual([]);
    expect(wallet.recentlyPlayed(NaN)).toEqual([]);
    expect(wallet.recentlyPlayed(Infinity)).toEqual([]);
    expect(wallet.recentlyPlayed(1.9)).toEqual(["b"]);
  });

  it("ignores an empty or non-string game id instead of writing a junk key", () => {
    const { wallet } = freshWallet();
    wallet.markPlayed("");
    wallet.markPlayed(undefined as unknown as string);
    wallet.markPlayed(null as unknown as string);
    expect(wallet.recentlyPlayed()).toEqual([]);
    expect(wallet.snapshot().games).toEqual({});
  });

  it("PERSISTS through the backend, so a reload still knows what was played", () => {
    const { backend, wallet } = freshWallet();
    wallet.markPlayed("snake");

    const stored = migrateProfile(backend.read(PROFILE_KEY));
    expect(typeof stored.games.snake.lastPlayedAt).toBe("number");

    expect(createWallet(backend).recentlyPlayed()).toEqual(["snake"]);
  });

  it("NOTIFIES subscribers, the same as every other wallet mutation", () => {
    const { wallet } = freshWallet();
    let fired = 0;
    const off = wallet.subscribe(() => fired++);
    wallet.markPlayed("snake");
    expect(fired).toBe(1);
    off();
    wallet.markPlayed("math");
    expect(fired).toBe(1);
  });

  it("does not fire for an ignored game id", () => {
    const { wallet } = freshWallet();
    let fired = 0;
    wallet.subscribe(() => fired++);
    wallet.markPlayed("");
    expect(fired).toBe(0);
  });

  it("never touches coins or stars - opening a game is not a win", () => {
    const { wallet } = freshWallet({ [PROFILE_KEY]: '{"v":1,"coins":40,"stars":6}' });
    wallet.markPlayed("snake");
    expect(wallet.coins).toBe(40);
    expect(wallet.stars).toBe(6);
    expect(wallet.snapshot().games.snake).toEqual({
      wins: 0,
      stars: 0,
      lastPlayedAt: wallet.snapshot().games.snake.lastPlayedAt,
    });
  });

  it("preserves the game's existing wins and stars", () => {
    const { wallet } = seedGames({ snake: { wins: 4, stars: 3 } });
    wallet.markPlayed("snake");
    const record = wallet.snapshot().games.snake;
    expect(record.wins).toBe(4);
    expect(record.stars).toBe(3);
    expect(record.lastPlayedAt).toBeGreaterThan(0);
  });

  it("a win after an open keeps the stamp", () => {
    const { wallet } = freshWallet();
    wallet.markPlayed("snake");
    const at = wallet.snapshot().games.snake.lastPlayedAt;
    wallet.createRewardsPort("snake").grant({ reason: "level_complete", tier: "easy" });
    expect(wallet.snapshot().games.snake.lastPlayedAt).toBe(at);
    expect(wallet.recentlyPlayed()).toEqual(["snake"]);
  });

  it("a snapshot cannot be used to rewrite the stamp", () => {
    const { wallet } = freshWallet();
    wallet.markPlayed("snake");
    const snap = wallet.snapshot();
    snap.games.snake.lastPlayedAt = 1;
    expect(wallet.snapshot().games.snake.lastPlayedAt).toBeGreaterThan(1);
  });
});

describe("corrupt storage", () => {
  it("starts from an empty profile rather than throwing", () => {
    const { wallet } = freshWallet({ [PROFILE_KEY]: "{not json" });
    expect(wallet.coins).toBe(0);
    expect(wallet.stars).toBe(0);
    expect(() =>
      wallet.createRewardsPort("snake").grant({ reason: "level_complete", tier: "easy" }),
    ).not.toThrow();
    expect(wallet.coins).toBe(TIER_COINS.easy);
  });
});

describe("the player's name", () => {
  it("starts absent — a child who never opens the World needs no name", () => {
    const { backend, wallet } = freshWallet();
    expect(wallet.name).toBeUndefined();
    // And nothing was written just by asking.
    expect(backend.read(PROFILE_KEY)).toBeNull();
  });

  it("picks and persists one on first ensure, then never changes it", () => {
    const { backend, wallet } = freshWallet();
    const first = wallet.ensureName(mulberry32(4));

    expect(resolveName(first)).toBeDefined();
    expect(migrateProfile(backend.read(PROFILE_KEY)).name).toEqual(first);

    // A different rng must NOT produce a different name — it is already chosen.
    expect(wallet.ensureName(mulberry32(999))).toEqual(first);
    expect(createWallet(backend).name).toEqual(first);
  });

  it("keeps a name this build cannot render rather than overwriting it", () => {
    // The realistic source is a profile written by a NEWER build, met by a
    // stale tab. Renaming the child there would be a worse bug than showing
    // them the reroll button.
    const stored = JSON.stringify({ v: 1, name: { adj: "purple", noun: "dragon" } });
    const { wallet } = freshWallet({ [PROFILE_KEY]: stored });

    expect(renderName(wallet.name, "he")).toBeUndefined();
    expect(wallet.ensureName(mulberry32(1))).toEqual({ adj: "purple", noun: "dragon" });
  });

  it("rerolls to something different, and persists it", () => {
    const { backend, wallet } = freshWallet();
    const rng = mulberry32(12);
    let current = wallet.ensureName(rng);

    for (let i = 0; i < 50; i++) {
      const next = wallet.rerollName(rng);
      expect(next).not.toEqual(current);
      expect(migrateProfile(backend.read(PROFILE_KEY)).name).toEqual(next);
      current = next;
    }
  });

  it("rerolls from nothing without an ensure first", () => {
    const { wallet } = freshWallet();
    expect(resolveName(wallet.rerollName(mulberry32(2)))).toBeDefined();
  });

  it("still answers with a name when storage refuses the write", () => {
    // A name is not a balance: a coin that did not persist must be reported as
    // zero, but a name that did not persist can still be shown for the session.
    const backend: KeyValueBackend = { read: () => null, write: () => false };
    const wallet = createWallet(backend);

    const name = wallet.ensureName(mulberry32(8));
    expect(resolveName(name)).toBeDefined();
    // Rolled back in memory, so the next call picks again rather than lying
    // about a stored value.
    expect(wallet.name).toBeUndefined();
  });

  it("survives junk in the name slot without losing the rest of the profile", () => {
    for (const junk of ['"tiger"', "42", "null", '{"adj":"swift"}', '{"adj":"","noun":"x"}']) {
      const stored = `{"v":1,"coins":9,"stars":2,"name":${junk}}`;
      const { wallet } = freshWallet({ [PROFILE_KEY]: stored });
      expect(wallet.name, junk).toBeUndefined();
      expect(wallet.coins, junk).toBe(9);
      expect(wallet.stars, junk).toBe(2);
    }
  });

  it("hands out a defensive copy, like every other snapshot", () => {
    const { wallet } = freshWallet();
    const name = wallet.ensureName(mulberry32(6));
    name.adj = "tampered";
    expect(wallet.name!.adj).not.toBe("tampered");

    const snap = wallet.snapshot();
    snap.name!.noun = "tampered";
    expect(wallet.name!.noun).not.toBe("tampered");
  });
});
