// Which recorded arm is picked for which sound.
//
// A SEPARATE STORE FROM `voiceOverride`, ON PURPOSE.
//
// The obvious move is to widen the existing `holdem:voice:v1` store to hold
// either a VoiceSpec or a sample id. That store already holds every settled
// pick on the operator's devices, and its reader validates a VoiceSpec shape -
// so widening it means either a migration or a validator that accepts two
// shapes, and either one risks a settled pick coming back unrecognised. The
// operator's standing ask is that settled things stay settled.
//
// So this is additive and cannot touch them: a new key, an id per sound, and
// a precedence rule.
//
//   a recorded pick WINS over a synth pick for that sound
//   picking a synth arm CLEARS the recorded pick for that sound
//
// The second half matters. Without it, picking a synth arm would change the
// highlight and play the recording, which is the exact class of bug the arm
// lock exists to prevent - a screen disagreeing with the speakers.

import { SAMPLE_ARMS } from "./samples";
import type { SfxName } from "./pokerVoices";
import { POKER_VOICES } from "./pokerVoices";

const KEY = "holdem:sfxsample:v1";

/**
 * Anchored, and short. An id from this store is used to index `SAMPLE_ARMS`
 * and to build a URL, so a crafted value is a path. Nothing here is trusted:
 * the id must match the pattern AND name an arm that actually exists.
 */
const ID_RE = /^rec-[a-z][a-z0-9-]{0,23}$/;

export function loadSamplePicks(): Partial<Record<SfxName, string>> {
  let raw: unknown;
  try {
    const s = localStorage.getItem(KEY);
    if (!s) return {};
    raw = JSON.parse(s);
  } catch {
    return {};
  }
  if (!raw || typeof raw !== "object") return {};
  const out: Partial<Record<SfxName, string>> = {};
  for (const [name, id] of Object.entries(raw as Record<string, unknown>)) {
    if (!(name in POKER_VOICES)) continue;
    if (typeof id !== "string" || !ID_RE.test(id)) continue;
    const arm = SAMPLE_ARMS[id];
    // ...and the arm must be FOR this sound. Otherwise a hand-edited store
    // could put a three-second shuffle on every chip.
    if (!arm || arm.sfx !== name) continue;
    out[name as SfxName] = id;
  }
  return out;
}

export function setSamplePick(name: SfxName, armId: string | null): void {
  const all = loadSamplePicks();
  if (armId) all[name] = armId;
  else delete all[name];
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* incognito - the pick lasts for this session and no longer */
  }
}

export function clearSamplePicks(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
