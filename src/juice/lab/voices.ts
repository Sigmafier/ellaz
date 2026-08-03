// Juice Lab - the sound design, as pure data.
//
// Three sets, one shape:
//
//   CONTROL - today's src/sdk/audio.ts, transcribed note-for-note. It is in the
//             tournament as an unlabelled arm so "the new one wins" is a claim
//             that can actually come back false.
//   LEAN    - Arm A. Layered, but everything is cheap enough to synthesise per
//             note in realtime: a filtered-noise transient, a body, a harmonic,
//             a sub, and per-play pitch jitter so the 200th tap is not a byte
//             copy of the first.
//   RICH    - Arm B. Same voices plus the two things that are ruinous per note
//             and free once: `tail` (convolution reverb) and `voices`/`spread`
//             (unison detune stacks). The offline engine renders these once at
//             unlock and replays buffers thereafter.
//
// If LEAN wins anyway, that is a real finding: the extra DSP is not buying
// anything, and the cheaper engine ships.

import type { VoiceSpec } from "./specs";

/** The events every arm set must provide, so brackets can swap sets freely. */
export type JuiceEvent = "tap" | "correct" | "win" | "coin" | "wrong" | "star";

export type VoiceSet = Record<JuiceEvent, VoiceSpec>;

// ---------------------------------------------------------------------------
// CONTROL - today's audio.ts, transcribed
// ---------------------------------------------------------------------------

/**
 * audio.ts ramps 0.0001 -> peak over ATTACK (8ms), then back to 0.0001 across
 * the note. That is a decay to silence with no sustain, so `s` is 0 and `d`
 * carries the whole note. `r` is the 20ms stop() pad the same file adds.
 */
function legacyEnv(ms: number) {
  return { a: 0.008, d: ms / 1000, s: 0, r: 0.02 };
}

export const CONTROL: VoiceSet = {
  // VOICES.tap
  tap: {
    freq: 440,
    ms: 60,
    layers: [{ wave: "sine", gain: 0.2, env: legacyEnv(60) }],
  },
  // VOICES.success - two sine notes, second delayed by 85% of the first's length
  correct: {
    freq: 660,
    ms: 90,
    layers: [
      { wave: "sine", gain: 0.2, ms: 90, env: legacyEnv(90) },
      { wave: "sine", ratio: 880 / 660, gain: 0.2, ms: 110, delay: 0.0765, env: legacyEnv(110) },
    ],
  },
  // VOICES.win - 523 / 659 / 784, the same 15% overlap
  win: {
    freq: 523,
    ms: 120,
    layers: [
      { wave: "sine", gain: 0.2, ms: 120, env: legacyEnv(120) },
      { wave: "sine", ratio: 659 / 523, gain: 0.2, ms: 120, delay: 0.102, env: legacyEnv(120) },
      { wave: "sine", ratio: 784 / 523, gain: 0.2, ms: 180, delay: 0.204, env: legacyEnv(180) },
    ],
  },
  // There is no coin voice today - the coin flight is silent. VOICES.pop is the
  // nearest thing the app has, so that is what the control arm honestly plays.
  coin: {
    freq: 320,
    ms: 90,
    layers: [{ wave: "square", gain: 0.15, env: legacyEnv(90) }],
  },
  // VOICES.fail
  wrong: {
    freq: 180,
    ms: 180,
    layers: [{ wave: "sawtooth", gain: 0.12, env: legacyEnv(180) }],
  },
  // No star voice today either; VOICES.flip is the closest existing sound.
  star: {
    freq: 600,
    ms: 70,
    layers: [{ wave: "triangle", gain: 0.2, env: legacyEnv(70) }],
  },
};

// ---------------------------------------------------------------------------
// LEAN - Arm A, realtime-synthesisable
// ---------------------------------------------------------------------------

export const LEAN: VoiceSet = {
  tap: {
    freq: 523.25,
    ms: 90,
    jitter: 1.5,
    layers: [
      // The click. Almost all of what makes a tap read as "solid" lives in the
      // first 25ms, and none of it is pitched.
      {
        wave: "noise",
        gain: 0.1,
        ms: 26,
        env: { a: 0.001, d: 0.022, s: 0, r: 0.01 },
        filter: { cutoff: 6000, cutoffEnd: 1600, q: 0.8 },
      },
      { wave: "sine", gain: 0.18, env: { a: 0.002, d: 0.05, s: 0.12, r: 0.05 } },
      // Deliberately 2.01 rather than 2.0 - a hair inharmonic reads as a real
      // object rather than a synthesiser.
      { wave: "sine", ratio: 2.01, gain: 0.05, ms: 50, env: { a: 0.001, d: 0.04, s: 0, r: 0.02 } },
      { wave: "sine", ratio: 0.5, gain: 0.09, ms: 70, env: { a: 0.003, d: 0.06, s: 0, r: 0.04 } },
    ],
  },

  correct: {
    freq: 659.25,
    ms: 150,
    jitter: 0.8,
    layers: [
      {
        wave: "noise",
        gain: 0.06,
        ms: 14,
        env: { a: 0.001, d: 0.012, s: 0, r: 0.008 },
        filter: { cutoff: 8000, cutoffEnd: 3000 },
      },
      { wave: "sine", gain: 0.18, glide: 0.3, env: { a: 0.003, d: 0.09, s: 0.2, r: 0.12 } },
      { wave: "sine", ratio: 1.5, gain: 0.09, env: { a: 0.004, d: 0.08, s: 0.1, r: 0.1 } },
      {
        wave: "triangle",
        ratio: 2,
        gain: 0.05,
        delay: 0.02,
        ms: 110,
        env: { a: 0.002, d: 0.07, s: 0.05, r: 0.08 },
      },
    ],
  },

  win: {
    freq: 523.25,
    ms: 420,
    layers: [
      { wave: "sine", gain: 0.16, env: { a: 0.006, d: 0.22, s: 0.25, r: 0.35 } },
      { wave: "triangle", ratio: 2, gain: 0.06, env: { a: 0.008, d: 0.18, s: 0.15, r: 0.3 } },
      { wave: "sine", ratio: 3, gain: 0.03, ms: 260, env: { a: 0.01, d: 0.14, s: 0.1, r: 0.24 } },
      // A breath of filtered noise swelling upward under the chord. Costs
      // nothing and stops the chord sounding like a ringtone.
      {
        wave: "noise",
        gain: 0.035,
        ms: 240,
        env: { a: 0.05, d: 0.16, s: 0.05, r: 0.2 },
        filter: { cutoff: 700, cutoffEnd: 5200, q: 1.2 },
      },
    ],
  },

  coin: {
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
  },

  wrong: {
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
      // Falls a tone and a half - "not that one", never "you failed".
      { wave: "sine", gain: 0.16, glide: -1.5, env: { a: 0.004, d: 0.12, s: 0.1, r: 0.12 } },
      { wave: "triangle", ratio: 2, gain: 0.04, ms: 140, env: { a: 0.005, d: 0.1, s: 0.05, r: 0.1 } },
    ],
  },

  star: {
    freq: 1318.51,
    ms: 320,
    jitter: 0.6,
    layers: [
      { wave: "sine", gain: 0.11, env: { a: 0.004, d: 0.16, s: 0.2, r: 0.28 } },
      {
        wave: "sine",
        ratio: 1.5,
        gain: 0.07,
        delay: 0.05,
        ms: 270,
        env: { a: 0.004, d: 0.14, s: 0.15, r: 0.26 },
      },
      {
        wave: "sine",
        ratio: 2,
        gain: 0.05,
        delay: 0.1,
        ms: 220,
        env: { a: 0.004, d: 0.12, s: 0.1, r: 0.24 },
      },
      {
        wave: "noise",
        gain: 0.03,
        ms: 300,
        env: { a: 0.02, d: 0.2, s: 0.08, r: 0.24 },
        filter: { cutoff: 3000, cutoffEnd: 11000, q: 2 },
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// RICH - Arm B, offline-rendered
// ---------------------------------------------------------------------------

/** Add a reverb tail and a unison stack to the layer at `index` of a lean voice. */
function enrich(
  spec: VoiceSpec,
  tail: number,
  stack: { index: number; voices: number; spread: number },
): VoiceSpec {
  return {
    ...spec,
    tail,
    layers: spec.layers.map((l, i) =>
      i === stack.index ? { ...l, voices: stack.voices, spread: stack.spread } : l,
    ),
  };
}

export const RICH: VoiceSet = {
  tap: enrich(LEAN.tap, 0.45, { index: 1, voices: 3, spread: 9 }),
  correct: enrich(LEAN.correct, 0.9, { index: 1, voices: 3, spread: 7 }),
  win: enrich(LEAN.win, 1.6, { index: 0, voices: 4, spread: 11 }),
  coin: enrich(LEAN.coin, 0.5, { index: 1, voices: 2, spread: 6 }),
  wrong: enrich(LEAN.wrong, 0.5, { index: 1, voices: 2, spread: 5 }),
  star: enrich(LEAN.star, 1.8, { index: 0, voices: 3, spread: 10 }),
};

export const VOICE_SETS = { CONTROL, LEAN, RICH } as const;
export type VoiceSetName = keyof typeof VOICE_SETS;
