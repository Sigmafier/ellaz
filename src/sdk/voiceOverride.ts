// The operator's sound picks, and the gate that decides whether to trust one.
//
// A pick made in the lab is stored here as a whole VoiceSpec rather than as a
// candidate id, and that is the only shape that works: the candidate specs live
// in the lab's own lazy chunk, which a child's device never downloads. Storing
// the spec means `audio.ts` can play the picked voice with no knowledge of the
// lab at all.
//
// WHICH MAKES THIS AN UNTRUSTED INPUT, and the strictest one in the app. Every
// other stored blob decides what a screen SHOWS; this one decides what a
// synthesiser DOES, next to a child's ear. `migrateProfile` coerces junk into a
// usable profile because a broken profile costs a room; a broken voice spec can
// cost hearing. So this validates rather than coerces, and anything it does not
// fully like is DROPPED - falling back to the built-in voice, which is the same
// answer as "nothing was ever picked".
//
// Gain is clamped rather than rejected, on purpose. Rejecting a slightly-loud
// spec would silently ignore a pick and read as the lab being broken; clamping
// keeps the pick and makes it safe. Only shapes that cannot be made safe are
// dropped.

import type { SfxName } from "./types";
import type { LayerSpec, VoiceSpec, Wave } from "./voice";

/**
 * Exported because `audio.ts` reads this key RAW, to decide whether anything
 * changed before paying for a parse. One name, one file - two copies of a
 * storage key is a drift nobody notices until picks silently stop applying.
 */
export const VOICE_PICKS_KEY = "ellaz:voice:v1";
const KEY = VOICE_PICKS_KEY;

/** Hard ceilings. A spec breaching a countable one is dropped, not trimmed. */
const MAX_LAYERS = 40;
const MAX_TAIL_S = 4;
const MAX_MS = 4000;
/** Summed layer gain. The loudest shipped voice sits near 0.5; 1.0 clips. */
const MAX_TOTAL_GAIN = 0.9;

const WAVES: readonly string[] = ["sine", "triangle", "square", "sawtooth", "noise"];

const num = (v: unknown, lo: number, hi: number): boolean =>
  typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;

function validLayer(l: unknown): l is LayerSpec {
  if (!l || typeof l !== "object") return false;
  const o = l as Record<string, unknown>;
  if (!WAVES.includes(o.wave as string)) return false;
  if (!num(o.gain, 0, MAX_TOTAL_GAIN)) return false;
  if (o.ratio !== undefined && !num(o.ratio, 0.01, 64)) return false;
  if (o.delay !== undefined && !num(o.delay, 0, MAX_TAIL_S)) return false;
  if (o.ms !== undefined && !num(o.ms, 1, MAX_MS)) return false;
  if (o.glide !== undefined && !num(o.glide, -48, 48)) return false;
  if (o.detune !== undefined && !num(o.detune, -2400, 2400)) return false;
  const e = o.env as Record<string, unknown> | undefined;
  if (!e || typeof e !== "object") return false;
  // A zero attack is a click, not a note - the engine's own ramps need a
  // non-zero floor, and 2 seconds of attack on a tap is not a UI sound.
  if (!num(e.a, 0.0001, 2) || !num(e.d, 0, 4) || !num(e.s, 0, 1) || !num(e.r, 0, 4)) return false;
  const f = o.filter as Record<string, unknown> | undefined;
  if (f !== undefined) {
    if (typeof f !== "object" || f === null) return false;
    if (!num(f.cutoff, 20, 22050)) return false;
    if (f.cutoffEnd !== undefined && !num(f.cutoffEnd, 20, 22050)) return false;
    // Resonance is the one number that can make a filter scream. 12 is well
    // inside what the shipped voices use (max 1.6) and short of self-oscillation.
    if (f.q !== undefined && !num(f.q, 0.0001, 12)) return false;
    if (f.type !== undefined && !["lowpass", "highpass", "bandpass"].includes(f.type as string))
      return false;
  }
  return true;
}

/**
 * A stored spec, made safe, or `undefined`.
 *
 * Exported for the lab and for tests: the lab runs a pick through this before
 * saving it, so a candidate that could not survive the round trip is refused at
 * the moment it is chosen rather than silently ignored on the next game.
 */
export function sanitizeVoice(raw: unknown): VoiceSpec | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  if (!num(o.freq, 1, 22050) || !num(o.ms, 1, MAX_MS)) return undefined;
  if (!Array.isArray(o.layers) || o.layers.length === 0 || o.layers.length > MAX_LAYERS)
    return undefined;
  if (!o.layers.every(validLayer)) return undefined;
  if (o.jitter !== undefined && !num(o.jitter, 0, 12)) return undefined;
  if (o.tail !== undefined && !num(o.tail, 0, MAX_TAIL_S)) return undefined;
  if (o.space !== undefined && !num(o.space, 0, 1)) return undefined;
  if (o.warmth !== undefined && !num(o.warmth, 100, 22050)) return undefined;

  const layers = o.layers as LayerSpec[];
  const total = layers.reduce((t, l) => t + l.gain, 0);
  // Scale the whole voice down together rather than clipping the loudest layer,
  // so a too-loud pick keeps its balance instead of turning into a different
  // sound at the volume it was judged to be wrong at.
  const k = total > MAX_TOTAL_GAIN ? MAX_TOTAL_GAIN / total : 1;

  return {
    freq: o.freq as number,
    ms: o.ms as number,
    jitter: o.jitter as number | undefined,
    tail: o.tail as number | undefined,
    space: o.space as number | undefined,
    warmth: o.warmth as number | undefined,
    layers: layers.map((l) => ({ ...l, wave: l.wave as Wave, gain: l.gain * k })),
  };
}

export type VoicePicks = Partial<Record<SfxName, VoiceSpec>>;

/**
 * Read every stored pick. One bad entry drops ITSELF and nothing else - a
 * corrupt `pop` must not cost the player their `win`.
 *
 * Not cached: the lab writes this while the app is open, and re-reading a small
 * key on the gesture that unlocks audio costs nothing measurable.
 */
export function loadVoicePicks(): VoicePicks {
  let parsed: unknown;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object") return {};
  const out: VoicePicks = {};
  for (const [name, spec] of Object.entries(parsed as Record<string, unknown>)) {
    const safe = sanitizeVoice(spec);
    if (safe) out[name as SfxName] = safe;
  }
  return out;
}

/**
 * Persist one pick, or clear it when `spec` is EXACTLY `undefined`.
 *
 * The distinction is load-bearing and it was not obvious. A plain truthiness
 * check treats `null` - the likeliest corruption there is - as "clear this",
 * and then returns true. The caller is told its pick was saved, the pick is
 * gone, and the sound reverts with nothing anywhere saying why. Only the
 * literal absence of an argument clears; every other unusable value is refused.
 */
export function saveVoicePick(name: SfxName, spec: VoiceSpec | undefined): boolean {
  try {
    const current = loadVoicePicks();
    if (spec === undefined) {
      delete current[name];
    } else {
      const safe = sanitizeVoice(spec);
      if (!safe) return false;
      current[name] = safe;
    }
    localStorage.setItem(KEY, JSON.stringify(current));
    return true;
  } catch {
    return false;
  }
}

/** Forget every pick. The lab's "back to the shipped sounds" button. */
export function clearVoicePicks(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
