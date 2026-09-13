// The campaign save: one localStorage key per campaign, versioned, device-local
// (a phone and a tablet are two players, as the ellaz app's own saves are).
// Every read and write sits under try/catch - a private window, a full quota
// or a blocked origin reads as a fresh save and never throws into the page -
// and a record of the wrong version or the wrong shape is discarded, never
// migrated: a save is worth a few stages of play, migration code for it is a
// second copy of the rules nothing keeps in sync.

import { freshSave, SAVE_VERSION } from "./flow";
import type { Save } from "./flow";

export { SAVE_VERSION };

/** the two calls of localStorage this file uses, so a node test can hand over a map */
export interface Storage { getItem(key: string): string | null; setItem(key: string, value: string): void }

const keyOf = (campaignId: string): string => `toybox:campaign:${campaignId}`;

const whole = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;

/** the shape check: version, cleared worlds and cleared levels as strings, a purse of three whole numbers with level >= 1, bests as whole numbers */
function isSave(raw: unknown): raw is Save {
  const s = raw as Save;
  if (!s || typeof s !== "object" || s.version !== SAVE_VERSION) return false;
  const strings = (xs: unknown): boolean => Array.isArray(xs) && xs.every((c) => typeof c === "string");
  if (!strings(s.cleared) || !strings(s.levels)) return false;
  const p = s.purse;
  if (!p || typeof p !== "object" || !whole(p.coins) || !whole(p.xp) || !whole(p.level) || p.level < 1) return false;
  if (!s.best || typeof s.best !== "object" || Array.isArray(s.best) || !Object.values(s.best).every(whole)) return false;
  return true;
}

function browserStorage(): Storage {
  return (globalThis as unknown as { localStorage: Storage }).localStorage;
}

/** the save for `campaignId`, or a fresh one when nothing usable is stored */
export function load(campaignId: string, storage: Storage = browserStorage()): Save {
  try {
    const text = storage.getItem(keyOf(campaignId));
    if (text === null) return freshSave();
    const raw: unknown = JSON.parse(text);
    return isSave(raw) ? { version: raw.version, cleared: [...raw.cleared], levels: [...raw.levels], purse: { ...raw.purse }, best: { ...raw.best } } : freshSave();
  } catch {
    return freshSave();
  }
}

/** write the save; a storage that refuses is a save not kept, never a page that broke */
export function store(campaignId: string, save: Save, storage: Storage = browserStorage()): void {
  try {
    storage.setItem(keyOf(campaignId), JSON.stringify({ ...save, version: SAVE_VERSION }));
  } catch {
    // the ellaz law: localStorage failure is a fact about the device, not an error of the page
  }
}
