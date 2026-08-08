// The sound design, as pure data. No WebAudio, no DOM - so it unit-tests without
// a browser, the same split every game uses for its logic.ts.
//
// These six voices are not a taste call. They won a blind tournament: 45
// synthesised characters across 6 events, judged by the operator on 2026-08-02
// with the incumbent included unlabelled in every event, so "the new one wins"
// was a claim that could come back false. Two of them did come back as the
// control arm. See docs/juice-lab.md.
//
// WHAT MAKES THESE SOUND DESIGNED RATHER THAN SYNTHESISED, in order of how much
// it matters - and only one of the four is the note:
//
//   1. HIGH PARTIALS DECAY FASTER THAN THE FUNDAMENTAL. Strike anything real and
//      its bright modes die first; that is why a struck object sounds struck.
//      One shared envelope across every partial produces an organ tone and the
//      ear hears "synthesiser" instantly. `struck()` damps each partial by
//      ratio^damp. This is the big one - the first palette was rejected without
//      it and accepted with it, on the same notes.
//   2. IT HAPPENS SOMEWHERE. A dry note has no room, and no room reads as cheap
//      however good the pitch is. Every voice carries a little `space`.
//   3. INHARMONICITY. A bell is not 1:2:3. Real partial ratios are what make
//      metal sound like metal rather than like a stack of sines.
//   4. RESTRAINT. Short, quiet, no top-end glare. "Bright" and "expensive" are
//      opposites above about 9kHz, which is what `warmth` exists for.

export type Wave = "sine" | "triangle" | "square" | "sawtooth" | "noise";

/** Attack / decay / sustain-level / release. Seconds, except `s` which is 0..1. */
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
   * off a noise burst to leave a crisp mechanical tick, and bandpass turns flat
   * white noise into a struck-mallet transient.
   */
  type?: "lowpass" | "highpass" | "bandpass";
  /** Cutoff in Hz at note start. */
  cutoff: number;
  /** Cutoff at note end; omit for a static filter. */
  cutoffEnd?: number;
  /** Resonance. Above ~4 the filter starts to sing. */
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
}

export interface VoiceSpec {
  /** Base frequency in Hz. */
  freq: number;
  /** Note length in ms, before release tails. */
  ms: number;
  layers: LayerSpec[];
  /** Per-play random pitch wobble, +/- this many semitones, so the 200th tap is
   *  not a byte copy of the first. */
  jitter?: number;
  /** Reverb tail length in seconds. Sized to the sound: a UI tick wants 0.3s of
   *  room, a win chord wants 1.8s of hall. */
  tail?: number;
  /** How much of that room you hear, 0..1. See note 2 at the top of this file. */
  space?: number;
  /** Gentle lowpass across the whole voice, in Hz. Omit for no shelf. */
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

/**
 * How long the voice occupies the audio graph, in ms - the longest layer
 * (delay + length + release) plus any reverb tail. Used to size the offline
 * render buffer that measures the voice's peak.
 */
export function voiceDurationMs(spec: VoiceSpec): number {
  let longest = 0;
  for (const l of spec.layers) {
    const end = (l.delay ?? 0) * 1000 + (l.ms ?? spec.ms) + l.env.r * 1000;
    if (end > longest) longest = end;
  }
  return longest + (spec.tail ?? 0) * 1000;
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

const semi = semitonesToRatio;

// Notes, so the voices below read as music rather than as decimals.
const C5 = 523.25;
const E6 = 1318.51;

/**
 * Partial sets, measured from the physics rather than invented. Each entry is
 * [frequency ratio, relative amplitude].
 *
 * Only the two the shipped voices use are kept. The full table - bell, bar,
 * wood, soft - lived in the Juice Lab and is in git history at the commit that
 * deleted `src/juice/lab/`; recovering one is cheaper than re-deriving it.
 */
export const MODES = {
  /** Thin struck glass / crystal. Bright, inharmonic, dies fast up top. */
  glass: [
    [1, 1],
    [2.71, 0.3],
    [5.15, 0.1],
    [8.4, 0.04],
  ],
  /** A metal tine - kalimba, electric piano. Warm, nearly harmonic. */
  tine: [
    [1, 1],
    [2.0, 0.16],
    [3.01, 0.05],
  ],
} as const satisfies Record<string, readonly (readonly [number, number])[]>;

export type ModeName = keyof typeof MODES;

/** A few ms of bandpassed noise: the sound of the striker, not of the object. */
export function mallet(gain: number, ms: number, centre: number): LayerSpec {
  return {
    wave: "noise",
    gain,
    ms,
    env: { a: 0.0008, d: ms / 1000 / 1.6, s: 0, r: 0.008 },
    filter: { type: "bandpass", cutoff: centre, q: 1.1 },
  };
}

export interface StruckOptions {
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
  /** Amplitude of the strike transient. Omit for none. */
  mallet?: number;
  /** Centre frequency of that transient - a hard mallet is high, a soft one low. */
  malletHz?: number;
}

/**
 * A struck object. The heart of the palette.
 *
 * `ms` is the FUNDAMENTAL's life; every partial above it gets a proportionally
 * shorter one (`ms / ratio^damp`). That damping law is what makes this sound
 * like something being hit rather than a chord being held, and it is the single
 * change that turned a rejected palette into an accepted one.
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

/**
 * Play a timbre as a run of notes - arpeggios, glisses, cascades.
 *
 * Gains scale by 1/sqrt(n) so a longer run does not simply get louder; the notes
 * are staggered in time anyway, so this stays well clear of clipping.
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

// ---------------------------------------------------------------------------
// The six winners
// ---------------------------------------------------------------------------
//
// Do not retune these by ear. Each won a blind round against 4-5 alternatives,
// and the two that read as "the old sound" (coin, wrong) are NOT the old sound -
// they are the Juice Lab's Arm A, which had never shipped. `brackets.ts` said it
// outright: "the palette deliberately reuses the LEAN specs as its control
// characters". A verdict recorded as "the control won" means nothing without
// knowing what the control was.

/**
 * tap - "Shutter". A mechanical double-click, like a camera shutter.
 *
 * The strongest personality in the tap round, and the most-played sound in the
 * app by a wide margin. Chosen on a second listen, in context on the real Home
 * screen rather than in isolation. If it wears out over a long session the
 * revert is this one entry, not the engine.
 */
export const TAP: VoiceSpec = {
  freq: 2400,
  ms: 60,
  jitter: 0.7,
  space: 0.07,
  tail: 0.35,
  warmth: 10000,
  layers: [
    mallet(0.13, 5, 2800),
    { ...mallet(0.1, 6, 1900), delay: 0.032 },
    { wave: "sine", ratio: 0.3, gain: 0.07, ms: 45, env: { a: 0.001, d: 0.03, s: 0, r: 0.02 } },
  ],
};

/** success - "Harp gliss". Five pentatonic notes on a warm metal tine. */
export const SUCCESS: VoiceSpec = run(
  struck(C5, 280, "tine", { gain: 0.2, damp: 0.8, space: 0.24, tail: 1.1 }),
  [0, 2, 4, 7, 9],
  0.045,
);

/** win - "Sweep and land". A rising sweep that lands on a chord. */
export const WIN: VoiceSpec = {
  freq: C5,
  ms: 700,
  space: 0.34,
  tail: 1.8,
  warmth: 9000,
  layers: [
    {
      wave: "noise",
      gain: 0.06,
      ms: 340,
      env: { a: 0.2, d: 0.12, s: 0.1, r: 0.12 },
      filter: { type: "bandpass", cutoff: 600, cutoffEnd: 6500, q: 1.6 },
    },
    // The landing, held back until the sweep has almost finished rising.
    ...run(struck(C5, 460, "glass", { gain: 0.19, damp: 0.85, space: 0 }), [0, 7, 12], 0.05).layers.map(
      (l) => ({ ...l, delay: (l.delay ?? 0) + 0.3 }),
    ),
  ],
};

/** star - "Crystal sparkle". Three high crystal notes in a big room. */
export const STAR: VoiceSpec = run(
  struck(E6, 420, "glass", { gain: 0.19, damp: 0.9, mallet: 0.03, malletHz: 7500, space: 0.38, tail: 2 }),
  [0, 7, 12],
  0.075,
);

/**
 * coin - two triangles a fifth apart.
 *
 * The coin flight was SILENT before this; there was no coin voice in the app at
 * all. The nearest shipped thing was `pop`, one 320Hz square, which is not this.
 */
export const COIN: VoiceSpec = {
  freq: 987.77,
  ms: 110,
  jitter: 1,
  layers: [
    { wave: "triangle", gain: 0.13, ms: 45, env: { a: 0.001, d: 0.035, s: 0, r: 0.03 } },
    {
      wave: "triangle",
      ratio: 1.5,
      gain: 0.12,
      ms: 90,
      delay: 0.045,
      env: { a: 0.001, d: 0.07, s: 0.05, r: 0.06 },
    },
    { wave: "sine", ratio: 3, gain: 0.03, ms: 60, delay: 0.045, env: { a: 0.001, d: 0.05, s: 0, r: 0.04 } },
  ],
};

/**
 * fail - a soft falling thud.
 *
 * The shipped sound was a single 180Hz sawtooth, which buzzes. This one is a
 * noise transient plus a sine that falls a tone and a half: "not that one",
 * never "you failed". Wrong answers in kids games are gentle by rule.
 */
export const FAIL: VoiceSpec = {
  freq: 196,
  ms: 200,
  jitter: 0.5,
  layers: [
    {
      wave: "noise",
      gain: 0.07,
      ms: 40,
      env: { a: 0.002, d: 0.034, s: 0, r: 0.02 },
      filter: { cutoff: 800, cutoffEnd: 200 },
    },
    { wave: "sine", gain: 0.16, glide: -1.5, env: { a: 0.004, d: 0.12, s: 0.1, r: 0.12 } },
    { wave: "triangle", ratio: 2, gain: 0.04, ms: 140, env: { a: 0.005, d: 0.1, s: 0.05, r: 0.1 } },
  ],
};

/**
 * flip and pop never entered the tournament - no round was run for them. They
 * keep their pre-tournament voices, transcribed into the new shape so there is
 * ONE renderer rather than two code paths. Changing them is a new blind round,
 * not an edit.
 */
export const FLIP: VoiceSpec = {
  freq: 600,
  ms: 70,
  layers: [{ wave: "triangle", gain: 0.2, env: { a: 0.008, d: 0.05, s: 0.01, r: 0.012 } }],
};

export const POP: VoiceSpec = {
  freq: 320,
  ms: 90,
  layers: [{ wave: "square", gain: 0.15, env: { a: 0.008, d: 0.065, s: 0.01, r: 0.017 } }],
};
