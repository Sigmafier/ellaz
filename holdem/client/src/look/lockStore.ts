// Which decisions are SETTLED.
//
// The operator, after a session of picking: "let me lock my choices, so i dont
// need to do again and again. what we decided is locked, the rest are still
// open."
//
// There are two different complaints inside that sentence and they have two
// different fixes, which is worth keeping straight because only one of them
// lives in this file.
//
//   1. "I have to pick these again on my other device." That is not a lock, it
//      is a DEFAULT: a pick lives in this browser's localStorage, so a phone
//      and a PC were always two different tables. The fix was to ship the six
//      decisions as what the table actually is (see the note at the top of
//      look.css and the `current: true` arms in axes.ts), which needs no
//      storage at all and reaches a device that has never been here.
//   2. "I have to scroll past twenty-five settled decisions to find the three
//      I still care about." THAT is this file. A locked strip collapses to one
//      line and drops below the open ones.
//
// A lock is therefore a VIEW preference and nothing else. It cannot change what
// the table looks like or sounds like, it never blocks a change, and losing it
// costs a scroll. That is deliberate: a control that silently prevented a pick
// from applying would be indistinguishable, from the outside, from a pick that
// did not work.

/** `look:<axis>` or `sound:<strip>` — namespaced so the two lists cannot collide. */
export type LockKey = string;

const STORAGE_KEY = "holdem:locks:v1";

/**
 * Settled on 2026-08-15, and shipped locked because they ARE settled — these
 * are the six the operator decided, and a studio that opened on them again
 * would be asking a question that has an answer.
 *
 * Being a default rather than a stored value means it reaches a device that has
 * never opened the studio, which is the whole point. Unlocking any of them
 * writes an explicit `false` that survives, so this list can never re-lock
 * something somebody deliberately reopened.
 */
export const SETTLED: readonly LockKey[] = [
  "look:table",
  "look:cardface",
  "look:cardshape",
  "look:seat",
  "look:pace",
];

const DEFAULTS = new Set<LockKey>(SETTLED);

/** A key we would accept back off the disk. Short, namespaced, no surprises. */
const KEY_RE = /^(look|sound):[a-zA-Z][a-zA-Z0-9]{0,23}$/;

type Stored = Record<string, boolean>;

/**
 * Read the explicit choices. Never throws — incognito, a quota error, a
 * hand-edited value and a blob from a future build all answer with an empty
 * map, which resolves to the shipped defaults.
 */
function load(): Stored {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return {};
  }
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const out: Stored = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof v !== "boolean") continue;
    if (!KEY_RE.test(k)) continue;
    out[k] = v;
  }
  return out;
}

function save(s: Stored): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* a refused write costs a collapsed row, never a crash */
  }
}

/**
 * Is this decision settled?
 *
 * An explicit choice wins over the shipped default in BOTH directions — that
 * is why the store holds booleans rather than a list of locked keys. A bare
 * list cannot say "I deliberately reopened one of the six", so the next release
 * would quietly close it again.
 */
export function isLocked(key: LockKey, stored: Stored = load()): boolean {
  const explicit = stored[key];
  return explicit === undefined ? DEFAULTS.has(key) : explicit;
}

/** Every key's current state, for a screen that has to sort by it. */
export function loadLocks(keys: readonly LockKey[]): Record<LockKey, boolean> {
  const stored = load();
  const out: Record<LockKey, boolean> = {};
  for (const k of keys) out[k] = isLocked(k, stored);
  return out;
}

export function setLocked(key: LockKey, locked: boolean): void {
  if (!KEY_RE.test(key)) return;
  const s = load();
  s[key] = locked;
  save(s);
}

/** Reopen everything on this tab — the "show me all of it again" escape. */
export function unlockAll(keys: readonly LockKey[]): void {
  const s = load();
  for (const k of keys) if (KEY_RE.test(k)) s[k] = false;
  save(s);
}
