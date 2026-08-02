// The wallet — one observable, persisted balance for the whole app.
//
// Follows the audioPort precedent in audio.ts: a class with the behaviour, and
// a single module-level instance everyone shares. Mute state is global; so is
// the coin balance. `createWallet(backend)` exists so tests (and, later, a
// profile-switcher) can drive an isolated instance.
//
// Read/write asymmetry, restated because it is the point of this module:
//   - GAMES get a RewardsPort. It can only ADD.
//   - The portal's World screen holds the wallet itself. Only it can SPEND.
import { analytics } from "./analytics";
import {
  PROFILE_KEY,
  localStorageBackend,
  migrateProfile,
  type KeyValueBackend,
  type ProfileV1,
} from "./profile";
import { SESSION_COIN_CAP, coinsFor, starsFor } from "./economy";
import type { RewardGrant, RewardResult, RewardsPort } from "./types";

export interface BuyResult {
  ok: boolean;
  /** True when the item was already owned, so nothing was charged. */
  alreadyOwned: boolean;
  /** The balance after the call — unchanged on a rejection. */
  coins: number;
  reason?: "unaffordable" | "invalid";
}

export interface Wallet {
  readonly coins: number;
  readonly stars: number;
  /** A defensive copy — mutating it cannot reach the wallet. */
  snapshot(): ProfileV1;
  /** Re-render hook for UI. Returns an unsubscribe function. */
  subscribe(cb: (profile: ProfileV1) => void): () => void;
  canAfford(price: number): boolean;
  owns(itemId: string): boolean;
  equipped(category: string): string | undefined;
  /** Spend. Idempotent: buying an owned item is a no-op, never a second charge. */
  buy(itemId: string, price: number, category: string): BuyResult;
  equip(category: string, itemId: string): boolean;
  /** One port per game MOUNT — it carries that mount's session coin budget. */
  createRewardsPort(gameId: string): RewardsPort;
}

function clone(profile: ProfileV1): ProfileV1 {
  return {
    ...profile,
    owned: [...profile.owned],
    equipped: { ...profile.equipped },
    games: Object.fromEntries(Object.entries(profile.games).map(([id, r]) => [id, { ...r }])),
  };
}

class EllazWallet implements Wallet {
  private profile: ProfileV1;
  private listeners = new Set<(p: ProfileV1) => void>();

  constructor(private backend: KeyValueBackend) {
    // Corrupt, absent, or future-shaped storage all resolve to a usable profile.
    this.profile = migrateProfile(backend.read(PROFILE_KEY));
  }

  get coins(): number {
    return this.profile.coins;
  }

  get stars(): number {
    return this.profile.stars;
  }

  snapshot(): ProfileV1 {
    return clone(this.profile);
  }

  subscribe(cb: (p: ProfileV1) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** Persist first, then notify — a listener must never read a stale balance. */
  private commit(): void {
    this.profile.updatedAt = Date.now();
    try {
      this.backend.write(PROFILE_KEY, JSON.stringify(this.profile));
    } catch {
      /* serialisation/quota failure must not break the run */
    }
    const snap = this.snapshot();
    for (const cb of [...this.listeners]) {
      try {
        cb(snap);
      } catch {
        /* one bad listener must not stop the others, or the game */
      }
    }
  }

  canAfford(price: number): boolean {
    return Number.isFinite(price) && price >= 0 && this.profile.coins >= price;
  }

  owns(itemId: string): boolean {
    return this.profile.owned.includes(itemId);
  }

  equipped(category: string): string | undefined {
    return this.profile.equipped[category];
  }

  buy(itemId: string, price: number, category: string): BuyResult {
    if (typeof itemId !== "string" || itemId === "") {
      return { ok: false, alreadyOwned: false, coins: this.profile.coins, reason: "invalid" };
    }
    // A negative or non-finite price would MINT coins — reject before any maths.
    if (!Number.isFinite(price) || price < 0) {
      return { ok: false, alreadyOwned: false, coins: this.profile.coins, reason: "invalid" };
    }
    // Idempotency: a double tap on the shop button reaches here twice. The
    // second call must be a successful no-op, not a second charge.
    if (this.owns(itemId)) {
      return { ok: true, alreadyOwned: true, coins: this.profile.coins };
    }
    if (!this.canAfford(price)) {
      return { ok: false, alreadyOwned: false, coins: this.profile.coins, reason: "unaffordable" };
    }

    this.profile.coins -= Math.floor(price);
    this.profile.owned.push(itemId);
    this.commit();
    analytics.track("shop_buy", { item: itemId, category, price: Math.floor(price) });
    return { ok: true, alreadyOwned: false, coins: this.profile.coins };
  }

  equip(category: string, itemId: string): boolean {
    // Fail closed: you can only place something you actually own.
    if (!this.owns(itemId)) return false;
    this.profile.equipped[category] = itemId;
    this.commit();
    return true;
  }

  createRewardsPort(gameId: string): RewardsPort {
    // The session budget lives in this closure, so it is scoped to the mount
    // that asked for the port. Remounting the game starts a fresh budget.
    let spentThisSession = 0;
    const wallet = this;

    return {
      get coins() {
        return wallet.coins;
      },
      get stars() {
        return wallet.stars;
      },
      grant(g: RewardGrant): RewardResult {
        // Payout comes from economy.ts, never from anything the caller passed.
        const wantedCoins = Math.max(0, coinsFor(g));
        const stars = Math.max(0, starsFor(g));

        const budgetLeft = Math.max(0, SESSION_COIN_CAP - spentThisSession);
        const coins = Math.min(wantedCoins, budgetLeft);
        const capped = coins < wantedCoins;
        spentThisSession += coins;

        wallet.profile.coins += coins;
        // The cap throttles CURRENCY only. Stars are the trophy record and are
        // always awarded in full — nothing in the SDK ever reduces them.
        wallet.profile.stars += stars;

        const record = wallet.profile.games[gameId] ?? { wins: 0, stars: 0 };
        // A milestone is a mid-run ping, not a win, so it must not inflate the
        // win count. Star-bearing reasons are the real completions.
        if (stars > 0) record.wins += 1;
        record.stars += stars;
        wallet.profile.games[gameId] = record;

        // Persisted before this function returns, per the port contract.
        wallet.commit();

        // Anonymous + kid-safe: a game id and a reason, no PII, never identify().
        analytics.track("reward_grant", {
          game: gameId,
          reason: g.reason,
          tier: g.tier ?? "easy",
          level: g.level,
          coins,
          stars,
          capped,
        });

        return {
          coins,
          stars,
          totalCoins: wallet.profile.coins,
          totalStars: wallet.profile.stars,
          capped,
        };
      },
    };
  }
}

/** Build an isolated wallet. Tests pass a memoryBackend; the app uses the default. */
export function createWallet(backend: KeyValueBackend = localStorageBackend()): Wallet {
  return new EllazWallet(backend);
}

/** The one wallet the app shares (module-singleton, like audioPort). */
export const wallet: Wallet = createWallet();

/** Per-mount rewards port bound to the shared wallet. Used by createContext. */
export function createRewardsPort(gameId: string): RewardsPort {
  return wallet.createRewardsPort(gameId);
}
