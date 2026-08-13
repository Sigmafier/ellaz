// The poker voice set — new specs authored against the copied ellaz builders
// (struck / run / mallet, the damping law and the level-matching engine).
// Zero audio files; everything is synthesized data.

import { type Partials, run, struck, type VoiceSpec } from "./voice";

// Clay chips are denser than glass: tight inharmonic partials, dead fast.
const CHIP: Partials = [
  [1, 1],
  [2.32, 0.42],
  [4.1, 0.14],
  [6.9, 0.05],
];

// A knuckle on a felt-covered table: low, round, one-and-a-half partials.
const KNOCK: Partials = [
  [1, 1],
  [2.4, 0.18],
  [4.9, 0.05],
];

/** Two chips landing on each other — the every-bet sound. */
export const CHIP_CLACK: VoiceSpec = run(
  struck(2400, 64, CHIP, { gain: 0.2, damp: 1.25, mallet: 0.5, malletHz: 4600, space: 0.1, tail: 0.5, jitter: 1.2 }),
  [0, -2],
  0.048,
);

/** A stack sliding into the pot: a little cascade of clacks. */
export const POT_SLIDE: VoiceSpec = run(
  struck(2200, 58, CHIP, { gain: 0.14, damp: 1.25, mallet: 0.35, malletHz: 4200, space: 0.12, tail: 0.55, jitter: 1.5 }),
  [0, -1, 1, -3, 0],
  0.052,
);

/** A card leaving the deck: filtered noise sweeping up, no pitched landing. */
export const CARD_SLIDE: VoiceSpec = {
  freq: 900,
  ms: 95,
  jitter: 0.8,
  space: 0.07,
  tail: 0.35,
  warmth: 9500,
  layers: [
    {
      wave: "noise",
      gain: 0.34,
      ms: 95,
      env: { a: 0.012, d: 0.06, s: 0.12, r: 0.03 },
      filter: { type: "bandpass", cutoff: 700, cutoffEnd: 3000, q: 0.9 },
    },
  ],
};

/** Check — a knuckle knock on the table. */
export const CHECK_KNOCK: VoiceSpec = struck(210, 130, KNOCK, {
  gain: 0.3,
  damp: 0.9,
  mallet: 0.55,
  malletHz: 1400,
  space: 0.14,
  tail: 0.6,
  jitter: 0.6,
});

/** Your turn — one soft tine note, polite but audible from a pocket. */
export const YOUR_TURN: VoiceSpec = struck(1046.5, 320, "tine", {
  gain: 0.26,
  space: 0.22,
  tail: 1.0,
  jitter: 0,
});

/** Fold — a small down-glide, barely there. */
export const FOLD_SWISH: VoiceSpec = {
  freq: 520,
  ms: 110,
  jitter: 0.5,
  space: 0.08,
  tail: 0.4,
  warmth: 6000,
  layers: [
    { wave: "sine", gain: 0.12, glide: -5, env: { a: 0.004, d: 0.07, s: 0, r: 0.04 } },
    {
      wave: "noise",
      gain: 0.1,
      ms: 80,
      env: { a: 0.006, d: 0.05, s: 0, r: 0.03 },
      filter: { type: "bandpass", cutoff: 1600, cutoffEnd: 900, q: 0.8 },
    },
  ],
};

/** All-in — a two-note rise over a noise swell. Drama, not alarm. */
export const ALL_IN: VoiceSpec = {
  freq: 523.25,
  ms: 460,
  jitter: 0,
  space: 0.24,
  tail: 1.4,
  warmth: 8000,
  layers: [
    { wave: "triangle", ratio: 1, gain: 0.16, ms: 240, env: { a: 0.01, d: 0.16, s: 0.1, r: 0.1 } },
    { wave: "triangle", ratio: 1.4983, gain: 0.18, ms: 300, delay: 0.16, env: { a: 0.01, d: 0.2, s: 0.1, r: 0.14 } },
    {
      wave: "noise",
      gain: 0.09,
      ms: 460,
      env: { a: 0.24, d: 0.14, s: 0.25, r: 0.14 },
      filter: { type: "lowpass", cutoff: 900, cutoffEnd: 3400, q: 0.7 },
    },
  ],
};

/** Winning the pot — a warm marimba run up the pentatonic, lower than ellaz's WIN. */
export const WIN_POT: VoiceSpec = run(
  struck(392, 420, "bar", { gain: 0.2, damp: 0.8, mallet: 0.4, malletHz: 2600, space: 0.24, tail: 1.6, jitter: 0 }),
  [0, 4, 7, 12],
  0.085,
);

export const POKER_VOICES = {
  chipClack: CHIP_CLACK,
  potSlide: POT_SLIDE,
  cardSlide: CARD_SLIDE,
  checkKnock: CHECK_KNOCK,
  yourTurn: YOUR_TURN,
  fold: FOLD_SWISH,
  allIn: ALL_IN,
  win: WIN_POT,
} as const;

export type SfxName = keyof typeof POKER_VOICES;
