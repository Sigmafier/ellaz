// Palette builders - how a refined UI sound is actually made.
//
// Four things separate designed UI sound from a beep, and only one of them is
// the note. In rough order of how much they matter:
//
//   1. HIGH PARTIALS DECAY FASTER THAN THE FUNDAMENTAL. Strike anything real and
//      its bright modes die first; that is why a struck object sounds struck.
//      Giving every partial one shared envelope - which the first palette did -
//      produces an organ tone, and the ear hears "synthesiser" instantly.
//      `struck()` below damps each partial by ratio^damp. This is the big one.
//   2. IT HAPPENS SOMEWHERE. A dry note has no room, and no room reads as cheap
//      however good the pitch is. Every voice here carries a little `space`.
//   3. INHARMONICITY. A bell is not 1:2:3. Real partial ratios (1 : 2.76 : 5.4)
//      are what make metal sound like metal instead of like a sine stack.
//   4. RESTRAINT. Short, quiet, and no top-end glare. The warmth shelf exists
//      because "bright" and "expensive" are opposites above about 9kHz.

import type { LayerSpec, VoiceSpec } from "../specs";

/** Equal-temperament ratio for a semitone offset. */
export const semi = (n: number) => Math.pow(2, n / 12);

export interface Character {
  id: string;
  /** Revealed only after a favourite is chosen. */
  name: string;
  blurb: { he: string; en: string };
  spec: VoiceSpec;
}

export const ch = (
  id: string,
  name: string,
  he: string,
  en: string,
  spec: VoiceSpec,
): Character => ({ id, name, blurb: { he, en }, spec });

// Notes, so the character files read as music rather than as decimals.
export const C4 = 261.63;
export const G4 = 392.0;
export const A4 = 440;
export const C5 = 523.25;
export const D5 = 587.33;
export const E5 = 659.25;
export const G5 = 783.99;
export const A5 = 880;
export const B5 = 987.77;
export const C6 = 1046.5;
export const E6 = 1318.51;
export const G6 = 1567.98;

/**
 * Partial sets, measured from the physics rather than invented.
 * Each entry is [frequency ratio, relative amplitude].
 */
export const MODES = {
  /** Thin struck glass / crystal. Bright, inharmonic, dies fast up top. */
  glass: [
    [1, 1],
    [2.71, 0.3],
    [5.15, 0.1],
    [8.4, 0.04],
  ],
  /** A bell. The classic inharmonic series. */
  bell: [
    [1, 1],
    [2.76, 0.28],
    [5.4, 0.12],
    [8.93, 0.05],
  ],
  /** A struck wooden bar - marimba, xylophone. */
  bar: [
    [1, 1],
    [3.9, 0.2],
    [10.1, 0.045],
  ],
  /** A metal tine - kalimba, electric piano. Warm, nearly harmonic. */
  tine: [
    [1, 1],
    [2.0, 0.16],
    [3.01, 0.05],
  ],
  /** A wooden block. Almost no sustain, barely pitched. */
  wood: [
    [1, 1],
    [2.4, 0.13],
  ],
  /** A soft mallet on something dense. Fundamental-heavy, dark. */
  soft: [
    [1, 1],
    [2.02, 0.07],
  ],
} as const satisfies Record<string, readonly (readonly [number, number])[]>;

export type ModeName = keyof typeof MODES;

export interface StruckOptions {
  /** Peak amplitude of the fundamental. */
  gain?: number;
  /** How much faster high partials die. 0 = all together, 1 = strongly damped. */
  damp?: number;
  jitter?: number;
  /** Reverb send, 0..1. */
  space?: number;
  /** Reverb length in seconds. */
  tail?: number;
  /** Lowpass across the voice. */
  warmth?: number;
  /** Amplitude of the strike transient. 0 for none. */
  mallet?: number;
  /** Centre frequency of that transient - hard mallet is high, soft is low. */
  malletHz?: number;
  /** Pitch glide in semitones across the note. */
  glide?: number;
}

/** A few ms of bandpassed noise: the sound of the striker, not the object. */
export function mallet(gain: number, ms: number, centre: number): LayerSpec {
  return {
    wave: "noise",
    gain,
    ms,
    env: { a: 0.0008, d: ms / 1000 / 1.6, s: 0, r: 0.008 },
    filter: { type: "bandpass", cutoff: centre, q: 1.1 },
  };
}

/**
 * A struck object. The heart of the palette.
 *
 * `ms` is the fundamental's life; every partial above it gets a proportionally
 * SHORTER one (`ms / ratio^damp`), which is the damping law that makes this
 * sound like something being hit rather than a chord being held.
 */
export function struck(
  freq: number,
  ms: number,
  mode: ModeName,
  o: StruckOptions = {},
): VoiceSpec {
  const gain = o.gain ?? 0.22;
  const damp = o.damp ?? 0.85;
  const layers: LayerSpec[] = [];

  if (o.mallet) layers.push(mallet(o.mallet, Math.min(7, ms / 8), o.malletHz ?? 3200));

  for (const [ratio, amp] of MODES[mode]) {
    const life = ms / Math.pow(ratio, damp);
    const s = life / 1000;
    layers.push({
      wave: "sine",
      ratio,
      gain: gain * amp,
      ms: life,
      glide: o.glide,
      // Attack softens very slightly for upper partials so they bloom in rather
      // than all snapping on at the same instant.
      env: { a: 0.0012 + Math.log2(ratio) * 0.0006, d: s * 0.7, s: 0.02, r: s * 0.55 },
    });
  }

  return {
    freq,
    ms,
    jitter: o.jitter,
    space: o.space ?? 0.16,
    tail: o.tail ?? 0.9,
    warmth: o.warmth ?? 9000,
    layers,
  };
}

/** A pitch sweep - bubbles, whooshes, rises. */
export function sweep(
  freq: number,
  semitones: number,
  ms: number,
  o: { gain?: number; wave?: LayerSpec["wave"]; q?: number; space?: number; tail?: number; jitter?: number; harmonic?: number } = {},
): VoiceSpec {
  const gain = o.gain ?? 0.2;
  const layers: LayerSpec[] = [
    {
      wave: o.wave ?? "sine",
      gain,
      ms,
      glide: semitones,
      env: { a: 0.004, d: (ms / 1000) * 0.7, s: 0.05, r: (ms / 1000) * 0.5 },
      filter: o.q ? { cutoff: freq * 4, cutoffEnd: freq * 1.2, q: o.q } : undefined,
    },
  ];
  if (o.harmonic) {
    layers.push({
      wave: "sine",
      ratio: 2,
      gain: gain * o.harmonic,
      ms: ms * 0.7,
      glide: semitones,
      env: { a: 0.004, d: (ms / 1000) * 0.4, s: 0, r: (ms / 1000) * 0.3 },
    });
  }
  return { freq, ms, jitter: o.jitter, space: o.space ?? 0.14, tail: o.tail ?? 0.6, warmth: 9500, layers };
}

/** A dry noise tick - keyboard clicks, detents, shutters. */
export function tick(
  centre: number,
  ms: number,
  o: { gain?: number; body?: number; bodyHz?: number; highpass?: number; space?: number } = {},
): VoiceSpec {
  const layers: LayerSpec[] = [
    {
      wave: "noise",
      gain: o.gain ?? 0.14,
      ms,
      env: { a: 0.0005, d: ms / 1000 / 2, s: 0, r: 0.006 },
      filter: o.highpass
        ? { type: "highpass", cutoff: o.highpass }
        : { type: "bandpass", cutoff: centre, q: 1 },
    },
  ];
  if (o.body) {
    layers.push({
      wave: "sine",
      ratio: (o.bodyHz ?? 900) / centre,
      gain: o.body,
      ms: ms * 1.6,
      env: { a: 0.001, d: (ms / 1000) * 0.9, s: 0, r: 0.02 },
    });
  }
  return { freq: centre, ms, space: o.space ?? 0.08, tail: 0.35, warmth: 11000, layers };
}

/**
 * Play a timbre as a run of notes - arpeggios, glisses, tri-tones.
 * Gains scale by 1/sqrt(n) so a longer run does not simply get louder; the
 * notes are staggered in time anyway, so this stays well clear of clipping.
 */
export function run(base: VoiceSpec, semitones: number[], gap: number): VoiceSpec {
  const scale = 1 / Math.sqrt(semitones.length);
  const layers: LayerSpec[] = [];
  semitones.forEach((s, i) => {
    const r = semi(s);
    for (const l of base.layers) {
      layers.push({
        ...l,
        // A noise transient has no pitch, so only pitched layers transpose.
        ratio: l.wave === "noise" ? l.ratio : (l.ratio ?? 1) * r,
        gain: l.gain * scale,
        delay: (l.delay ?? 0) + i * gap,
      });
    }
  });
  return { ...base, layers };
}

/** Several notes struck at once rather than in sequence. */
export function chord(base: VoiceSpec, semitones: number[], spreadMs = 0): VoiceSpec {
  return run(base, semitones, spreadMs / 1000);
}

/** A slow swell rather than a strike - blooms, magic rises. */
export function bloom(
  freq: number,
  ms: number,
  o: { gain?: number; semitones?: number[]; openTo?: number; space?: number; tail?: number } = {},
): VoiceSpec {
  const gain = o.gain ?? 0.09;
  const notes = o.semitones ?? [0, 7];
  const layers: LayerSpec[] = notes.map((s, i) => ({
    wave: "sawtooth",
    ratio: semi(s),
    gain: gain / Math.sqrt(notes.length),
    ms,
    delay: i * 0.02,
    env: { a: 0.07 + i * 0.02, d: (ms / 1000) * 0.45, s: 0.25, r: (ms / 1000) * 0.5 },
    filter: { cutoff: 420, cutoffEnd: o.openTo ?? 6000, q: 2.4 },
  }));
  return { freq, ms, space: o.space ?? 0.3, tail: o.tail ?? 1.5, warmth: 8500, layers };
}
