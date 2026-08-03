// Juice Lab - the PURE half. No DOM, no WebAudio, no React.
//
// Everything a tournament arm needs to DECIDE what to play or draw lives here:
// the voice specs, the easing curves, the streak pitch-ladder state machine and
// the win-magnitude tiers. The engines in `engines.ts` and `visuals.ts` are thin
// shells that execute these - same split the games already use for logic.ts.
//
// TOURNAMENT-ONLY CODE. When a winner is picked, the winning pieces fold into
// sdk/audio.ts + juice/effects.ts + shared/winMoment.ts and this whole directory
// is deleted in the same pass. Two competing juice implementations must never be
// alive at once (see .claude/rules, no-half-migrated-duplicate-systems).

export type Wave = "sine" | "triangle" | "square" | "sawtooth" | "noise";

/** Attack / decay / sustain-level / release. Seconds, except `s` (0..1). */
export interface Envelope {
  a: number;
  d: number;
  s: number;
  r: number;
}

export interface FilterSpec {
  /**
   * Lowpass is the default because most voices want their top end tamed. The
   * other two earn their keep on specific characters: highpass strips the body
   * off a noise burst to leave the crisp mechanical tick of a keyboard, and
   * bandpass turns flat white noise into a struck-mallet transient.
   */
  type?: "lowpass" | "highpass" | "bandpass";
  /** Cutoff in Hz at note start. */
  cutoff: number;
  /** Cutoff at note end; omit for a static filter. */
  cutoffEnd?: number;
  /** Resonance. Above ~4 the filter starts to sing, which is what makes a
   *  droplet sound wet rather than merely quiet. */
  q?: number;
}

export interface LayerSpec {
  wave: Wave;
  /** Frequency multiplier on the voice's base freq. Ignored for noise. */
  ratio?: number;
  /** Detune in cents. Ignored for noise. */
  detune?: number;
  gain: number;
  env: Envelope;
  /** Seconds to wait before this layer starts. */
  delay?: number;
  /** This layer's own length in ms; defaults to the voice's `ms`. */
  ms?: number;
  /** Pitch glide in semitones across the layer's life (+ up, - down). */
  glide?: number;
  filter?: FilterSpec;
  /**
   * Unison voices detuned +/- `spread` cents around the layer pitch.
   * OFFLINE ENGINE ONLY - N oscillators per note is precisely the per-note cost
   * the realtime engine exists to avoid, so the realtime arm renders 1 voice.
   */
  voices?: number;
  spread?: number;
}

export interface VoiceSpec {
  /** Base frequency in Hz. */
  freq: number;
  /** Note length in ms (before release tails). */
  ms: number;
  layers: LayerSpec[];
  /** Per-play random pitch wobble, +/- this many semitones. */
  jitter?: number;
  /**
   * Reverb tail length in seconds. Sized to the sound: a UI tick wants 0.3s of
   * room, a win chord wants 1.6s of hall.
   */
  tail?: number;
  /**
   * How much of that room you hear, 0..1. This is the single biggest difference
   * between a sound that feels designed and one that feels like a beep: real
   * objects are struck IN a place. A bone-dry note has no place, and the ear
   * reads that as cheap even when the pitch and envelope are right.
   *
   * Honoured by BOTH engines. The realtime engine shares one convolver per tail
   * length, so the cost is a single node, not per note.
   */
  space?: number;
  /**
   * Gentle lowpass across the whole voice, in Hz. Refined UI sound is never
   * bright at the very top; a little air taken off is what separates "warm" from
   * "tinny". Omit for no shelf.
   */
  warmth?: number;
}

// ---------------------------------------------------------------------------
// Pitch maths
// ---------------------------------------------------------------------------

/** Equal-temperament frequency ratio for a semitone offset. */
export function semitonesToRatio(semitones: number): number {
  return Math.pow(2, semitones / 12);
}

/**
 * The per-play pitch multiplier for a voice. Returns exactly 1 when the voice
 * declares no jitter, so a deliberately fixed-pitch voice stays fixed.
 */
export function jitterRatio(spec: VoiceSpec, rng: () => number = Math.random): number {
  const j = spec.jitter ?? 0;
  if (j === 0) return 1;
  return semitonesToRatio((rng() * 2 - 1) * j);
}

/** A copy of `spec` transposed by `semitones`. Pure - the input is untouched. */
export function transpose(spec: VoiceSpec, semitones: number): VoiceSpec {
  if (semitones === 0) return spec;
  return { ...spec, freq: spec.freq * semitonesToRatio(semitones) };
}

/**
 * How long the voice occupies the audio graph, in ms - the longest layer
 * (delay + length + release) plus any reverb tail. Both engines need this: the
 * offline one to size its render buffer, the realtime one to schedule teardown.
 */
export function voiceDurationMs(spec: VoiceSpec): number {
  return voiceNoteMs(spec) + (spec.tail ?? 0) * 1000;
}

/**
 * The NOTE's length, excluding any reverb tail.
 *
 * This is the number that matters for "will this get annoying": a reverb tail
 * is a quiet decay the ear reads as the room, not as the sound still going, so
 * counting it would condemn every well-placed voice for having a space to sit
 * in. `voiceDurationMs` (which does count it) is for sizing buffers and
 * scheduling teardown - a different question with a different answer.
 */
export function voiceNoteMs(spec: VoiceSpec): number {
  let longest = 0;
  for (const l of spec.layers) {
    const end = (l.delay ?? 0) * 1000 + (l.ms ?? spec.ms) + l.env.r * 1000;
    if (end > longest) longest = end;
  }
  return longest;
}

// ---------------------------------------------------------------------------
// The streak pitch ladder
// ---------------------------------------------------------------------------

/** Major pentatonic degrees. Any subset of these sounds consonant in any order. */
export const PENTATONIC_STEPS = [0, 2, 4, 7, 9] as const;

/** Steps beyond this stop climbing, so a 90-streak does not reach dog-whistle. */
export const LADDER_CAP = 14;

/**
 * The semitone offset for the Nth consecutive success. Climbs the pentatonic,
 * rolling into the next octave every 5 steps, and flattens at `cap` so a long
 * streak plateaus at a pleasant height instead of running off the keyboard.
 */
export function ladderSemitones(step: number, cap: number = LADDER_CAP): number {
  const i = Math.max(0, Math.min(Math.floor(step), cap));
  const octave = Math.floor(i / PENTATONIC_STEPS.length);
  const degree = i % PENTATONIC_STEPS.length;
  return octave * 12 + PENTATONIC_STEPS[degree];
}

export interface LadderState {
  /** How many consecutive successes have landed. 0 = nothing yet this run. */
  step: number;
}

export const LADDER_IDLE: LadderState = { step: 0 };

/**
 * Advance the ladder. A success climbs one rung; ANY miss drops straight back
 * to the bottom - a ladder that decays gently would reward a miss, and the
 * whole point of the rising pitch is that it means "unbroken".
 */
export function advanceLadder(state: LadderState, hit: boolean): LadderState {
  return hit ? { step: state.step + 1 } : LADDER_IDLE;
}

// ---------------------------------------------------------------------------
// Win magnitude tiers
// ---------------------------------------------------------------------------

export type WinTier = "easy" | "medium" | "hard";

export interface WinIntensity {
  /** Anticipation hold before the payoff. 0 = fire immediately. */
  anticipateMs: number;
  /** Freeze-frame on impact. The single highest-value trick for weight. */
  hitStopMs: number;
  /** Screen-shake amplitude in px. 0 = no shake. */
  shake: number;
  /** Full-screen confetti pieces. 0 = none. */
  confetti: number;
  /** Particles in the local burst at the win point. */
  burst: number;
  /** Chord played on the payoff, as semitone offsets from the voice's root. */
  chord: number[];
}

const WIN_TIERS: Record<WinTier, WinIntensity> = {
  // A quick easy win should feel like a nod, not a parade - if every win is a
  // parade then no win is.
  easy: { anticipateMs: 70, hitStopMs: 60, shake: 0, confetti: 28, burst: 12, chord: [0, 7] },
  medium: { anticipateMs: 100, hitStopMs: 90, shake: 4, confetti: 48, burst: 18, chord: [0, 4, 7] },
  hard: {
    anticipateMs: 130,
    hitStopMs: 130,
    shake: 7,
    confetti: 80,
    burst: 26,
    chord: [0, 4, 7, 12],
  },
};

/**
 * The shape of a win. A missing tier reads as `easy` for exactly the reason
 * economy.ts treats it that way: under-celebrating is a smaller mistake than
 * over-celebrating, and it keeps the two files telling the same story.
 */
export function winIntensity(tier: WinTier | undefined): WinIntensity {
  return WIN_TIERS[tier ?? "easy"];
}

// ---------------------------------------------------------------------------
// Easing
// ---------------------------------------------------------------------------

/** The app's existing default. Included so the control arm is honestly itself. */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Pulls BACK before moving forward - the anticipation half of squash-stretch. */
export function easeInBack(t: number, overshoot = 1.70158): number {
  return t * t * ((overshoot + 1) * t - overshoot);
}

/** Overshoots the target then settles back onto it. */
export function easeOutBack(t: number, overshoot = 1.70158): number {
  const u = t - 1;
  return 1 + u * u * ((overshoot + 1) * u + overshoot);
}

/** Springy settle. Exact 0 and 1 at the ends so it always lands on target. */
export function easeOutElastic(t: number): number {
  if (t === 0 || t === 1) return t;
  const period = 0.3;
  return Math.pow(2, -10 * t) * Math.sin(((t - period / 4) * (2 * Math.PI)) / period) + 1;
}

/**
 * Anticipate, then overshoot, then settle - the full arc in one curve. The
 * first `pullback` of the timeline dips below zero, the rest springs past 1 and
 * comes home.
 */
export function easeAnticipateOvershoot(t: number, pullback = 0.25): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  if (t < pullback) {
    // Dip backwards, scaled so the deepest point is a readable -8%.
    return -0.08 * Math.sin((t / pullback) * Math.PI);
  }
  return easeOutBack((t - pullback) / (1 - pullback));
}

// ---------------------------------------------------------------------------
// Blind arm ordering
// ---------------------------------------------------------------------------

/**
 * Which arm sits behind each visible slot, given a shuffled permutation.
 * `slotToArm[i]` is the index into the bracket's arm list that button `i`
 * actually plays. Kept pure so the reveal can be unit-tested rather than
 * eyeballed - a mislabelled reveal would silently invert a verdict.
 */
export function revealMap(slotToArm: readonly number[]): number[] {
  return slotToArm.slice();
}

/**
 * Invert a slot->arm permutation into arm->slot. Used by the reveal to say
 * "the control was button 2" rather than making the operator do the algebra.
 */
export function armToSlot(slotToArm: readonly number[]): number[] {
  const out = new Array<number>(slotToArm.length).fill(-1);
  slotToArm.forEach((arm, slot) => {
    out[arm] = slot;
  });
  return out;
}
