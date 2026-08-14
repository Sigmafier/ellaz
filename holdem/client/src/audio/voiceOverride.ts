// The gate on a sound picked in the lab.
//
// This is the strictest reader in the app, and deliberately so. Every other
// stored blob decides what a SCREEN SHOWS; this one decides what a synthesiser
// DOES next to somebody's ear. So it VALIDATES rather than coerces - anything
// it does not fully like is DROPPED, and the built-in plays instead, which is
// the same answer as "nothing was ever picked". There is no partial acceptance
// and no repair: a spec that is 90% right is a spec somebody's browser wrote
// half of.
//
// GAIN IS THE ONE EXCEPTION. A pick that is slightly too loud is scaled down as
// a whole rather than refused, because refusing it would silently discard a
// deliberate choice over a number the lab itself could have clamped. Everything
// else is a shape question, and a wrong shape is not a loud sound - it is an
// unknown one.
//
// It is also why the candidate specs live in the lab's own chunk rather than
// here: what persists is the whole VoiceSpec, so a device that has never
// downloaded the lab can still play a sound picked on another device.

import type { Envelope, FilterSpec, LayerSpec, VoiceSpec, Wave } from "./voice";
import { POKER_VOICES, type SfxName } from "./pokerVoices";

const KEY = "holdem:voice:v1";

/**
 * The loudest any ONE layer may be, and how many layers a voice may have.
 *
 * MEASURED against the tree that shipped these, 2026-08-15: across the 8
 * shipped voices and all 40 lab candidates, the largest single layer is 0.600
 * and the most layers in one voice is 40 (`pot-long`, an eight-note run).
 * Shipped `potSlide` is 25 layers.
 *
 * The first version of this budgeted the SUM of layer gains at 1.2, and that
 * was wrong twice over. Wrong on the number — shipped potSlide sums to 1.287,
 * so the gate would have silently scaled down a sound the app already plays,
 * making a lab pick quieter than the identical sound played by the table.
 * And wrong on the QUANTITY: `run()` staggers its notes in time, so summing
 * the gains of a 40-layer cascade measures nothing anybody can hear.
 *
 * Loudness is already handled properly one layer down. `warmVoices` renders
 * each voice offline and trims it to a common measured peak — a real
 * measurement of the real graph. So this gate polices SHAPE and COST, and
 * leaves loudness to the thing that can actually measure it.
 */
const MAX_LAYER_GAIN = 1.0;
/**
 * Louder than this is refused rather than scaled.
 *
 * Two thresholds and not one, because they answer different questions. Between
 * MAX and ACCEPT is "somebody authored a loud voice" — scale it and keep the
 * pick. Above ACCEPT is "this number did not come from a person choosing a
 * sound", and quietly turning a 900 into a 1 would hand back something nobody
 * picked while reporting success.
 *
 * They also have to differ or the coercion is dead code: with one threshold,
 * the per-layer check refuses everything the whole-voice scaler exists to fix.
 */
const ACCEPT_LAYER_GAIN = 4.0;
const MAX_LAYERS = 64;

const WAVES: readonly Wave[] = ["sine", "triangle", "square", "sawtooth", "noise"];
const FILTERS = ["lowpass", "highpass", "bandpass"] as const;

const num = (v: unknown, lo: number, hi: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;

const optNum = (v: unknown, lo: number, hi: number): boolean => v === undefined || num(v, lo, hi);

function validEnv(v: unknown): v is Envelope {
  if (!v || typeof v !== "object") return false;
  const e = v as Record<string, unknown>;
  // Ten seconds is far past any sound this app plays and still finite, which
  // is the property that matters: an envelope of Infinity is a note that never
  // stops.
  return num(e.a, 0, 10) && num(e.d, 0, 10) && num(e.s, 0, 1) && num(e.r, 0, 10);
}

function validFilter(v: unknown): v is FilterSpec {
  if (v === undefined) return true;
  if (!v || typeof v !== "object") return false;
  const f = v as Record<string, unknown>;
  if (f.type !== undefined && !FILTERS.includes(f.type as (typeof FILTERS)[number])) return false;
  // 20 Hz to 22.05 kHz - the audible band. Above Nyquist the engine skips the
  // layer anyway, but a cutoff of 1e9 is a spec nobody authored.
  return num(f.cutoff, 20, 22_050) && optNum(f.cutoffEnd, 20, 22_050) && optNum(f.q, 0.0001, 40);
}

function validLayer(v: unknown): v is LayerSpec {
  if (!v || typeof v !== "object") return false;
  const l = v as Record<string, unknown>;
  if (!WAVES.includes(l.wave as Wave)) return false;
  if (!validEnv(l.env)) return false;
  if (!num(l.gain, 0, ACCEPT_LAYER_GAIN)) return false;
  if (!validFilter(l.filter)) return false;
  return (
    optNum(l.ratio, 0.0001, 64) &&
    optNum(l.detune, -4800, 4800) &&
    optNum(l.delay, 0, 5) &&
    optNum(l.ms, 1, 10_000) &&
    optNum(l.glide, -48, 48)
  );
}

/**
 * A stored spec, or null.
 *
 * Exported so the lab's own tests can drive it with the same specs the lab
 * offers - a candidate the gate would refuse is a button that silently does
 * nothing, which is worse than a candidate that sounds wrong.
 */
export function validateSpec(v: unknown): VoiceSpec | null {
  if (!v || typeof v !== "object") return null;
  const s = v as Record<string, unknown>;
  if (!num(s.freq, 20, 22_050) || !num(s.ms, 1, 10_000)) return null;
  if (!optNum(s.jitter, 0, 12) || !optNum(s.tail, 0, 8)) return null;
  if (!optNum(s.space, 0, 1) || !optNum(s.warmth, 100, 22_050)) return null;
  if (!Array.isArray(s.layers) || s.layers.length < 1 || s.layers.length > MAX_LAYERS) return null;
  if (!s.layers.every(validLayer)) return null;

  const layers = s.layers as LayerSpec[];
  const loudest = layers.reduce((a, l) => Math.max(a, l.gain), 0);
  // The one place this coerces instead of refusing, and it scales the voice as
  // a WHOLE — the balance between layers IS the timbre, so clamping each layer
  // separately would quietly hand back a different instrument.
  const scale = loudest > MAX_LAYER_GAIN ? MAX_LAYER_GAIN / loudest : 1;

  return {
    freq: s.freq as number,
    ms: s.ms as number,
    jitter: s.jitter as number | undefined,
    tail: s.tail as number | undefined,
    space: s.space as number | undefined,
    warmth: s.warmth as number | undefined,
    layers: scale === 1 ? layers : layers.map((l) => ({ ...l, gain: l.gain * scale })),
  };
}

/**
 * Every picked voice, keyed by sound.
 *
 * Read once per call rather than cached, because the lab writes this and the
 * table plays it, and a cache would mean a pick that only takes effect after a
 * reload - which reads as "the lab does not work".
 */
export function loadOverrides(): Partial<Record<SfxName, VoiceSpec>> {
  let raw: unknown;
  try {
    const s = localStorage.getItem(KEY);
    if (!s) return {};
    raw = JSON.parse(s);
  } catch {
    return {};
  }
  if (!raw || typeof raw !== "object") return {};
  const out: Partial<Record<SfxName, VoiceSpec>> = {};
  for (const [name, spec] of Object.entries(raw as Record<string, unknown>)) {
    // A key that is not one of ours is not a sound this app can play, so there
    // is nothing to validate and nothing to keep.
    if (!(name in POKER_VOICES)) continue;
    const ok = validateSpec(spec);
    if (ok) out[name as SfxName] = ok;
  }
  return out;
}

/** Pick a voice. Passing null puts that sound back to its built-in. */
export function setOverride(name: SfxName, spec: VoiceSpec | null): void {
  const all = loadOverrides();
  if (spec) all[name] = spec;
  else delete all[name];
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* incognito - the pick lasts for this session and no longer */
  }
}

/** Put every sound back to its built-in. */
export function clearOverrides(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
