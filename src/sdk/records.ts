// Personal bests, as the thing that TRAVELS between a player's devices.
//
// WHY THIS EXISTS
// A player's progress lives in two unrelated places. The profile — coins,
// stars, the room — is one localStorage key, `ellaz:profile:v1`, and cloud
// backup carries it. Every personal best lives somewhere else entirely, at
// `ellaz:<gameId>:score:<board>`, written by each game's own SaveStore.
//
// So the backup shipped saying "this code brings it back" and brought back the
// coins, the stars and the room while silently dropping every record the child
// had set. Nobody would see an error; they would see a fresh save file with
// their room in it. This module is the missing half.
//
// WHY ONLY RECORDS, AND NOT EVERYTHING A GAME SAVED
// `ctx.storage` lets a game persist anything under its own namespace, and some
// of it is large — a coloring drawing is a data URL. Records are small, bounded,
// and the thing a player would actually mourn. Sweeping every key would put an
// unbounded blob into a document with a 1 MiB ceiling, so the line is drawn at
// `:score:` and drawn deliberately.
//
// WHY THE KEY SHAPE IS CHECKED ON THE WAY IN
// An incoming record set arrived over the network from a document identified by
// a code a stranger could in principle type. If it could name its own storage
// keys it could write `ellaz:cloud:v1` — this device's anonymous IDENTITY — or
// `ellaz:profile:v1`, the balance. `isRecordKey` is what stops that, and it is
// the reason adoption validates keys rather than trusting the sender.
import { isRankable } from "./score";

/** Storage key -> the number stored there. Keys are full, unparsed, on purpose. */
export type Records = Record<string, number>;

/** The records an adoption replaced, kept so it can be taken back. */
export const RECORDS_UNDO_KEY = "ellaz:records:undo:v1";

/**
 * A ceiling on how many records one adoption may write.
 *
 * 21 games with a handful of boards each is comfortably under a hundred, so
 * this is not a product limit — it is the bound that stops a crafted document
 * from writing until the disk is full.
 */
export const MAX_RECORDS = 200;

/**
 * `ellaz:<gameId>:score:<board>` and nothing else.
 *
 * Anchored at both ends, and with `:` excluded from both captures, so no key
 * can carry an extra segment to reach somewhere it should not. `ellaz:profile:v1`
 * and `ellaz:cloud:v1` fail on the missing `:score:` infix, which is the point.
 */
const RECORD_KEY = /^ellaz:[A-Za-z0-9-]+:score:[A-Za-z0-9_-]+$/;

export function isRecordKey(key: string): boolean {
  return typeof key === "string" && RECORD_KEY.test(key);
}

/**
 * `ellaz:snake:score:hard` -> `{ game: "snake", board: "hard" }`, or null.
 *
 * The leaderboards read this to find out which boards a player actually HAS a
 * record on, which is the only place that knowledge exists: a game scopes its
 * record per difficulty inside its own renderer, and the catalog can never
 * import a renderer. Splitting a key the regex already validated is safe by
 * construction — it has exactly four segments and neither capture can hold a
 * colon.
 */
/**
 * The inverse: `("snake", "hard")` -> `ellaz:snake:score:hard`, or null.
 *
 * Exists so no caller hand-builds the format. The boards screen needs to look
 * up one specific record, and a screen assembling `ellaz:${game}:score:${board}`
 * itself is a second definition of a shape this file validates with a regex —
 * they drift, and the drift reads as "this player has no record".
 *
 * Returns null rather than a malformed key when the parts would not survive
 * `isRecordKey`, so a bad id can never produce a lookup that silently misses.
 */
export function recordKey(game: string, board: string): string | null {
  const key = `ellaz:${game}:score:${board}`;
  return isRecordKey(key) ? key : null;
}

export function parseRecordKey(key: string): { game: string; board: string } | null {
  if (!isRecordKey(key)) return null;
  const [, game, , board] = key.split(":");
  return { game, board };
}

/** The seam. Tests drive a Map; the app drives localStorage. */
export interface RecordStore {
  keys(): string[];
  get(key: string): string | null;
  set(key: string, value: string): boolean;
}

export function localRecordStore(): RecordStore {
  return {
    keys() {
      try {
        return Object.keys(localStorage);
      } catch {
        return [];
      }
    },
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    },
  };
}

/** A number a score could actually be, or undefined. Never throws. */
function rankableFrom(raw: string | null): number | undefined {
  if (raw === null) return undefined;
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === "number" && isRankable(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Every personal best on this device. Total: a broken store yields `{}`. */
export function readRecords(store: RecordStore = localRecordStore()): Records {
  const out: Records = {};
  let keys: string[];
  try {
    keys = store.keys();
  } catch {
    return out;
  }
  for (const key of keys) {
    if (!isRecordKey(key)) continue;
    const value = rankableFrom(store.get(key));
    if (value !== undefined) out[key] = value;
  }
  return out;
}

/**
 * Write another device's records onto this one, keeping what it replaced.
 *
 * UNIONS rather than replaces. A board this device holds and the incoming set
 * does not is left alone, because `ctx.score` has no `clear()` and this must not
 * become one by the back door — a record can be beaten, never taken away.
 *
 * It also cannot MERGE by picking the better of the two, and that is a real
 * limitation rather than an oversight: only the number is persisted, not the
 * unit, so nothing here can tell whether 12,750 beats 9,100 or loses to it.
 * Deciding would need the unit stored beside every best, which is a change to
 * the score contract rather than to this file.
 *
 * Returns how many records were actually applied.
 */
export function adoptRecords(incoming: unknown, store: RecordStore = localRecordStore()): number {
  if (typeof incoming !== "object" || incoming === null || Array.isArray(incoming)) return 0;

  // Snapshot BEFORE writing anything, so an undo has somewhere to go back to.
  // A refused snapshot does not block the adoption the player asked for; it
  // only means `canUndoRecords` will honestly answer false.
  try {
    store.set(RECORDS_UNDO_KEY, JSON.stringify(readRecords(store)));
  } catch {
    /* no undo, and the caller finds out by asking rather than by being told */
  }

  let applied = 0;
  for (const [key, value] of Object.entries(incoming as Record<string, unknown>)) {
    if (applied >= MAX_RECORDS) break;
    if (!isRecordKey(key)) continue;
    if (typeof value !== "number" || !isRankable(value)) continue;
    if (store.set(key, JSON.stringify(value))) applied++;
  }
  return applied;
}

export function canUndoRecords(store: RecordStore = localRecordStore()): boolean {
  const raw = store.get(RECORDS_UNDO_KEY);
  return raw !== null && raw !== "";
}

/**
 * Put back the records the last adoption overwrote.
 *
 * Records the adoption ADDED are left in place, for the same reason adopting
 * unions in the first place. Undo returns what was taken; it does not confiscate
 * what was given.
 */
export function undoRecords(store: RecordStore = localRecordStore()): boolean {
  const raw = store.get(RECORDS_UNDO_KEY);
  if (raw === null || raw === "") return false;

  let snapshot: unknown;
  try {
    snapshot = JSON.parse(raw);
  } catch {
    // A corrupt snapshot is nothing to go back to, but it is still spent —
    // leaving it would offer the same dead undo on every future tap.
    store.set(RECORDS_UNDO_KEY, "");
    return false;
  }

  let restored = false;
  if (typeof snapshot === "object" && snapshot !== null && !Array.isArray(snapshot)) {
    for (const [key, value] of Object.entries(snapshot as Record<string, unknown>)) {
      if (!isRecordKey(key)) continue;
      if (typeof value !== "number" || !isRankable(value)) continue;
      if (store.set(key, JSON.stringify(value))) restored = true;
    }
  }
  store.set(RECORDS_UNDO_KEY, "");
  return restored;
}
