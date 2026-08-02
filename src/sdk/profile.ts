// Player profile — the single persisted record behind the rewards economy.
//
// One key holds everything: the coin balance, the star trophy count, what the
// player owns and has equipped in their room, and per-game totals. Every game
// on the platform reads and writes this same record through the wallet, so the
// schema is deliberately small and boring.
//
// Storage access goes through an injectable KeyValueBackend rather than
// touching localStorage directly. That keeps the wallet's logic testable in the
// node vitest environment (where there is no localStorage at all) and mirrors
// the try/catch discipline in storage.ts — a player in incognito, or with
// storage disabled, must still be able to play.

/** Bump the suffix when the shape changes incompatibly; v1 data then stays untouched. */
export const PROFILE_KEY = "ellaz:profile:v1";

export interface GameRecord {
  wins: number;
  stars: number;
  /**
   * Epoch ms of the last time this game was OPENED, or absent if it never was.
   *
   * Optional and ADDITIVE on purpose: a record written before this field
   * existed simply has no key, so `ellaz:profile:v1` stays v1 and older
   * records stay readable. The absence is meaningful - "never opened" is not
   * "opened at the epoch" - so nothing may default it to 0.
   */
  lastPlayedAt?: number;
}

export interface ProfileV1 {
  v: 1;
  /** Spendable currency. */
  coins: number;
  /** Trophy count — NEVER spent, never lost. Nothing in the SDK decrements it. */
  stars: number;
  /** Shop item ids the player has bought. */
  owned: string[];
  /** category -> item id currently placed in the room. */
  equipped: Record<string, string>;
  games: Record<string, GameRecord>;
  updatedAt: number;
}

export function emptyProfile(): ProfileV1 {
  return {
    v: 1,
    coins: 0,
    stars: 0,
    owned: [],
    equipped: {},
    games: {},
    updatedAt: Date.now(),
  };
}

/** A non-negative whole number, or 0 for anything that isn't one. */
function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

/**
 * A usable epoch-ms stamp, or `undefined` for anything that isn't one.
 *
 * Deliberately NOT `count()`: that coerces junk to 0, and a 0 here would read
 * as "opened at the epoch" and sort ahead of nothing forever. Anything we
 * cannot trust is DROPPED, which puts the game back into the honest "never
 * opened" state. Strings, NaN, Infinity, negatives, objects and 0 all land
 * there; a fractional value is floored, since it is still a real instant.
 */
function timestamp(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const ms = Math.floor(value);
  return ms > 0 ? ms : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeOwned(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry === "string" && entry !== "") seen.add(entry);
  }
  return [...seen];
}

function sanitizeEquipped(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!isRecord(value)) return out;
  for (const [category, itemId] of Object.entries(value)) {
    if (typeof itemId === "string" && itemId !== "") out[category] = itemId;
  }
  return out;
}

function sanitizeGames(value: unknown): Record<string, GameRecord> {
  const out: Record<string, GameRecord> = {};
  if (!isRecord(value)) return out;
  for (const [gameId, record] of Object.entries(value)) {
    if (!isRecord(record)) continue;
    const sanitized: GameRecord = { wins: count(record.wins), stars: count(record.stars) };
    // Only ever WRITE the key when it survived coercion, so an unusable value
    // leaves no trace at all rather than an explicit `undefined` that would
    // round-trip differently through JSON.
    const played = timestamp(record.lastPlayedAt);
    if (played !== undefined) sanitized.lastPlayedAt = played;
    out[gameId] = sanitized;
  }
  return out;
}

/**
 * Coerce ANY stored value into a usable ProfileV1. MUST NEVER THROW.
 *
 * The input is whatever came back out of storage, which in practice includes a
 * missing key (null), a truncated write, a hand-edited value, a profile written
 * by a future version of the app, or plain junk. Every one of those has to end
 * with the player able to keep playing, so this salvages the fields it
 * recognises — by name, regardless of the declared `v` — and defaults the rest.
 * Losing a balance is bad; a crash on boot is worse.
 */
export function migrateProfile(raw: unknown): ProfileV1 {
  let value: unknown = raw;

  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return emptyProfile();
    }
  }

  if (!isRecord(value)) return emptyProfile();

  return {
    v: 1,
    coins: count(value.coins),
    stars: count(value.stars),
    owned: sanitizeOwned(value.owned),
    equipped: sanitizeEquipped(value.equipped),
    games: sanitizeGames(value.games),
    updatedAt: count(value.updatedAt) || Date.now(),
  };
}

/** The seam that lets the wallet be driven by a real store or a fake one. */
export interface KeyValueBackend {
  read(key: string): string | null;
  write(key: string, value: string): void;
}

/**
 * The production backend. Every access is try/catch-wrapped: incognito Safari
 * throws on write, storage can be disabled entirely, and quota can be full.
 * None of that may reach a game.
 */
export function localStorageBackend(): KeyValueBackend {
  return {
    read(key: string): string | null {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    write(key: string, value: string): void {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* storage unavailable — the session simply won't persist */
      }
    },
  };
}

/** An in-memory backend for tests (the vitest env has no localStorage). */
export function memoryBackend(seed?: Record<string, string>): KeyValueBackend {
  const store = new Map<string, string>(Object.entries(seed ?? {}));
  return {
    read: (key) => store.get(key) ?? null,
    write: (key, value) => {
      store.set(key, value);
    },
  };
}
