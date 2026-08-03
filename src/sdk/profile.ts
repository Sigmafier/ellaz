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

import { isPlayerName, type PlayerName } from "./names";

/** Bump the suffix when the shape changes incompatibly; v1 data then stays untouched. */
export const PROFILE_KEY = "ellaz:profile:v1";

/**
 * The profile a restore REPLACED, kept so the replacement can be taken back.
 *
 * Restoring from a backup code is the only action in this app that destroys a
 * child's progress, and the person tapping the button is a parent who may be
 * holding the wrong tablet. An in-memory undo would be gone by the time anyone
 * notices, because the realistic moment of discovery is a child opening the app
 * later and finding their room empty — so it lives on disk.
 *
 * Nothing may ever adopt this automatically. It is written by a restore, read
 * only when someone asks to undo one, and cleared the moment it is used.
 */
export const RESTORE_UNDO_KEY = "ellaz:profile:undo:v1";

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
  /**
   * The player's display name, held as two WORD IDS rather than a rendered
   * string so it re-renders in whichever language the app is currently in.
   *
   * Optional and ADDITIVE, exactly like `lastPlayedAt`: every profile written
   * before names existed simply has no key, so `ellaz:profile:v1` stays v1.
   * Absent means "not named yet", which is a real state — a child who has never
   * opened the World has no name and does not need one.
   */
  name?: PlayerName;
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

  // Shape-checked, NOT vocabulary-checked, and never defaulted to a picked
  // name. Junk drops the key entirely and leaves the honest "not named yet"
  // state; minting a name here would hand one to a child who never opened the
  // World, and would silently REPLACE the name of anyone whose profile was
  // written by a build with a word this one doesn't know.
  const name = isPlayerName(value.name) ? { adj: value.name.adj, noun: value.name.noun } : undefined;

  return {
    v: 1,
    ...(name ? { name } : {}),
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
  /**
   * TRUE only if the value is actually stored.
   *
   * This returns a boolean rather than `void` because a write that fails
   * silently is worse than one that throws: the caller keeps its in-memory
   * change, the child watches coins land in the wallet, and the reward is gone
   * on the next reload with nothing anywhere having reported a problem. A
   * caller cannot honour what it cannot observe.
   */
  write(key: string, value: string): boolean;
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
    write(key: string, value: string): boolean {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch {
        // Quota exhausted, storage disabled by device policy, or Safari private
        // mode (which throws on the FIRST setItem). Still never rethrown at a
        // game — but the caller is now told, so it can decline to claim the
        // reward stuck rather than showing a coin it cannot keep.
        return false;
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
      return true;
    },
  };
}
