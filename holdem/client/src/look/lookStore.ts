// The look store — what the SHELL knows about the art lab.
//
// This file and look.css are the only parts of the look system a player who
// never opens the lab downloads. The registry with every arm's name and blurb
// (axes.ts) and the lab screen itself live in the lab-* chunk, which is not
// precached and not referenced by index.html.
//
// THE SPLIT IS THE WHOLE DESIGN. A pick is stored as two short strings — an
// axis key and an arm id — and applied by writing a data attribute onto
// <html>. Everything a look actually DOES is static CSS keyed on that
// attribute. So the shell needs no arm data, no style strings from storage,
// and nothing to interpret: an unknown arm id matches no rule and the table
// renders exactly as it ships.
//
// That "fails to the default" property is doing real work. voiceOverride.ts
// has to validate hard because a stored blob decides what a synthesiser does
// next to somebody's ear; here the worst a corrupt value can do is select no
// CSS rule at all. Same discipline, much cheaper — which is why the gate below
// is six lines rather than a hundred and eighty.

/**
 * Every axis, in the order the lab shows them. Adding one means adding a key
 * here, a block in look.css, and a strip in axes.ts.
 *
 * KEYS ARE PERSISTED FOREVER. Renaming one silently drops that player's pick
 * back to the default — the same rule the shop item ids and the name-pool word
 * ids carry in ellaz.
 */
export const LOOK_KEYS = [
  "table",
  "cloth",
  "rail",
  "cardface",
  "deck",
  "cardback",
  "cardshape",
  "seat",
  "turn",
  "chips",
  "deal",
  "fold",
  "award",
  "pace",
] as const;

export type LookKey = (typeof LOOK_KEYS)[number];

export type LookPicks = Partial<Record<LookKey, string>>;

const STORAGE_KEY = "holdem:look:v1";

/** An arm id is a short kebab token. Anything else is not one of ours. */
const ARM_RE = /^[a-z0-9][a-z0-9-]{0,23}$/;

const KEYS = new Set<string>(LOOK_KEYS);

/**
 * Read the picks. Never throws: incognito, a quota error, a hand-edited value,
 * a blob written by a future build — all of them answer with the picks this
 * build can understand and silently drop the rest.
 */
export function loadLook(): LookPicks {
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
  const out: LookPicks = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    // Both halves checked. A known key with a junk value would write junk into
    // an attribute; an unknown key with a good value would write an attribute
    // nothing reads, and then survive every future release as invisible cruft.
    if (!KEYS.has(k)) continue;
    if (typeof v !== "string" || !ARM_RE.test(v)) continue;
    out[k as LookKey] = v;
  }
  return out;
}

function save(picks: LookPicks): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(picks));
  } catch {
    /* a refused write costs a pick, never a crash */
  }
}

/**
 * Apply picks to the document. `null` for an arm means "the one that ships",
 * which is spelled by REMOVING the attribute rather than by naming a default
 * arm — so the shipped look is whatever the plain CSS says, and there is no
 * second place for it to be written down and drift.
 */
export function applyLook(picks: LookPicks): void {
  const el = document.documentElement;
  for (const key of LOOK_KEYS) {
    const arm = picks[key];
    if (arm) el.setAttribute(`data-look-${key}`, arm);
    else el.removeAttribute(`data-look-${key}`);
  }
}

/** Boot: paint the player's picks before React mounts. */
export function applyStoredLook(): void {
  applyLook(loadLook());
}

export function setLook(key: LookKey, arm: string | null): LookPicks {
  const picks = loadLook();
  if (arm === null) delete picks[key];
  else picks[key] = arm;
  save(picks);
  applyLook(picks);
  return picks;
}

export function clearLook(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to do */
  }
  applyLook({});
}
