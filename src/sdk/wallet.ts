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
  /**
   * `unsaved` means the purchase was legal and affordable but the device
   * refused to store it, so it was rolled back rather than shown as owned. It
   * is a distinct reason because the World screen's answer is the same gentle
   * shake, but the CAUSE is not the child's balance and mislabelling it
   * `unaffordable` would send anyone debugging it to the wrong place.
   */
  reason?: "unaffordable" | "invalid" | "unsaved";
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
  /**
   * Record that a game was OPENED (not won). Persists and notifies exactly like
   * every other wallet mutation, so the home screen and the wallet chip both
   * re-render off the same subscription.
   */
  markPlayed(gameId: string): void;
  /**
   * Game ids, most-recently-played FIRST, and ONLY games actually opened.
   *
   * Total and safe: a profile with no plays returns `[]`, a game with no
   * `lastPlayedAt` is excluded rather than sorted as 0, and equal stamps break
   * on the game id ascending so the order never depends on sort stability.
   *
   * It does NOT know the catalog, and cannot: the SDK is the neutral contract
   * below the portal. A game that has since been REMOVED is still returned, so
   * the CALLER must filter against the catalog. Filter first, then slice -
   * passing `limit` here can hand back fewer live ids than expected.
   */
  recentlyPlayed(limit?: number): string[];
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

  /**
   * Apply a change, persist it, and ROLL IT BACK if the store refused it.
   * Returns whether the change actually stuck.
   *
   * The rollback is the point. Without it the in-memory profile and storage
   * disagree, and they disagree in the worst direction: the wallet chip counts
   * up, coins fly across the screen, and the next reload silently returns the
   * child to where they were. A reward that is not saved must not be shown as
   * earned — so on failure we restore the previous profile and let the caller
   * report zero, which is disappointing but true.
   *
   * Listeners are notified AFTER the rollback decision, never before, so no
   * subscriber can ever render a balance that storage rejected.
   */
  private mutate(apply: () => void): boolean {
    const before = clone(this.profile);
    apply();
    this.profile.updatedAt = Date.now();

    let stored = false;
    try {
      stored = this.backend.write(PROFILE_KEY, JSON.stringify(this.profile));
    } catch {
      // A backend that throws despite the contract, or a value JSON cannot
      // serialise. Same outcome as a refusal: nothing was saved.
      stored = false;
    }
    if (!stored) this.profile = before;

    const snap = this.snapshot();
    for (const cb of [...this.listeners]) {
      try {
        cb(snap);
      } catch {
        /* one bad listener must not stop the others, or the game */
      }
    }
    return stored;
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

    const stored = this.mutate(() => {
      this.profile.coins -= Math.floor(price);
      this.profile.owned.push(itemId);
    });
    // Rolled back. Reporting `ok` here would show the item placed in the room
    // and the coins spent, both of which vanish on reload.
    if (!stored) {
      return { ok: false, alreadyOwned: false, coins: this.profile.coins, reason: "unsaved" };
    }
    analytics.track("shop_buy", { item: itemId, category, price: Math.floor(price) });
    return { ok: true, alreadyOwned: false, coins: this.profile.coins };
  }

  equip(category: string, itemId: string): boolean {
    // Fail closed: you can only place something you actually own.
    if (!this.owns(itemId)) return false;
    return this.mutate(() => {
      this.profile.equipped[category] = itemId;
    });
  }

  markPlayed(gameId: string): void {
    if (typeof gameId !== "string" || gameId === "") return;
    this.mutate(() => {
      // Reuse the existing record so a game's wins and stars survive an open.
      const record = this.profile.games[gameId] ?? { wins: 0, stars: 0 };
      record.lastPlayedAt = Date.now();
      this.profile.games[gameId] = record;
    });
  }

  recentlyPlayed(limit?: number): string[] {
    const played: Array<[string, number]> = [];
    for (const [gameId, record] of Object.entries(this.profile.games)) {
      const at = record.lastPlayedAt;
      // Absent means never opened, which is NOT the same as opened long ago.
      if (typeof at !== "number" || !Number.isFinite(at)) continue;
      played.push([gameId, at]);
    }
    // Newest first; identical stamps (two opens inside one millisecond, or a
    // hand-edited profile) fall back to the id so the order is a pure function
    // of the profile rather than of the engine's sort stability.
    played.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    const ids = played.map(([gameId]) => gameId);

    if (limit === undefined) return ids;
    // Fail closed on a nonsense limit: show nothing rather than everything.
    if (!Number.isFinite(limit) || limit <= 0) return [];
    return ids.slice(0, Math.floor(limit));
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

        // Persisted before this function returns, per the port contract — and
        // rolled back if the device refused, so the numbers reported below are
        // what a reload will actually show.
        const persisted = wallet.mutate(() => {
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
        });

        // Charge the session budget ONLY for coins that actually stuck.
        // Counting a rolled-back payout would let a failing device burn through
        // the cap and then refuse real rewards once storage recovered.
        if (persisted) spentThisSession += coins;

        // Nothing was banked, so report nothing. `winMoment` already skips the
        // coin flight when `coins` is 0, which means the animation disappears
        // for free rather than lying about where the coins went.
        if (!persisted) {
          return {
            coins: 0,
            stars: 0,
            totalCoins: wallet.profile.coins,
            totalStars: wallet.profile.stars,
            capped: false,
            persisted: false,
          };
        }

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
          persisted: true,
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
