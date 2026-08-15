// The poker voice set — new specs authored against the copied ellaz builders
// (struck / run / mallet, the damping law and the level-matching engine).
// Zero audio files; everything is synthesized data.
//
// REBUILT 2026-08-15, after the operator's verdict on the first set: "the
// sounds are horrible". That is not a taste report to argue with — it is a
// symptom, and the cause turned out to be nameable and the same in all four
// chip and card voices.
//
// THE DEFECT: EVERY IMPACT WAS ALL CLICK AND NO BODY.
//
// `CHIP_CLACK` was `struck(2400, …, CLAY)`, and CLAY's partials start at ratio
// 1 — so its lowest component was 2400 Hz and everything else sat at 5568,
// 9840 and 16560. There was literally no energy below 2.4 kHz anywhere in the
// sound. `CARD_SLIDE` was one bandpass of noise, 700 → 3000 Hz, with no
// landing transient at all.
//
// Measured acoustics for a clay chip landing on a chip on felt: a body around
// 180–300 Hz decaying over 120–300 ms, and a click at 2.5–4.5 kHz decaying in
// 20–80 ms. Both, together. The named signature of a synthetic chip sound is
// "too much single-shot brightness around 3–10 kHz, too little midrange body,
// and decay envelopes that are too simple" — which is a description of the
// voice above it, arrived at independently.
//
// So every impact here is now a `mix()` of a bright strike and a low `thud`,
// and every multi-hit voice is a `scatter()` rather than a `run()`, because a
// perfectly periodic burst train is the difference between chips and a drum
// machine playing chips.
//
// HOW MUCH BODY IS A CHOICE, NOT A CONSTANT. The right ratio depends on the
// speaker and on the room, and neither is in front of whoever writes this
// file — a phone speaker reproduces almost nothing at 230 Hz. The values below
// are the middle of a range the lab offers as a whole strip (see
// `lab/candidates.ts` § chipClack), which is the honest way to ship a number
// nobody in this process can hear.

import { mix, type Partials, run, scatter, struck, type VoiceSpec } from "./voice";

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

/**
 * ONE CHIP LANDING — the unit every chip sound here is built from.
 *
 * The click and the body are separate voices because they are separate
 * objects: the chip, and the felt-over-table it lands on. `body` is the gain
 * of the low half, and it is the one number worth turning first if this
 * palette ever sounds wrong again.
 */
function chipHit(body = 0.22, click = 0.16): VoiceSpec {
  return mix(
    struck(2800, 52, CHIP, {
      gain: click,
      damp: 1.3,
      mallet: 0.45,
      malletHz: 4200,
      space: 0.1,
      tail: 0.45,
      jitter: 1.2,
    }),
    struck(235, 140, "thud", { gain: body, damp: 1.05, space: 0.08, tail: 0.4 }),
  );
}

/** Two chips landing on each other — the every-bet sound. */
export const CHIP_CLACK: VoiceSpec = scatter(chipHit(), 2, 0.052, { seed: "chip-clack" });

/** A raise — more chips, pushed out with intent. Bigger than a call. */
export const CHIP_RAISE: VoiceSpec = scatter(chipHit(0.26, 0.15), 5, 0.042, {
  seed: "chip-raise",
  spread: 0.5,
});

/**
 * A CASCADE of chips — one light click each, over a SINGLE low body.
 *
 * Not `chipHit` repeated, and the reason is physical rather than economical: a
 * dozen chips tumbling into a pot do not make a dozen separate table thumps.
 * They make a dozen clicks and one continuous low rumble, because the table
 * under them is one object being excited repeatedly. Stacking a full body per
 * chip is both wrong and, at eight layers a hit, over the 64-layer ceiling the
 * override gate enforces — which is how the modelling error surfaced.
 */
const CHIP_LITE: Partials = [
  [1, 1],
  [2.32, 0.4],
];

function chipTick(gain = 0.13): VoiceSpec {
  return struck(2800, 44, CHIP_LITE, {
    gain,
    damp: 1.35,
    mallet: 0.4,
    malletHz: 4200,
    space: 0.1,
    tail: 0.4,
    jitter: 1.2,
  });
}

function chipCascade(hits: number, gap: number, seed: string, body = 0.2): VoiceSpec {
  return mix(
    scatter(chipTick(), hits, gap, { seed, spread: 0.55, gainVar: 0.45 }),
    struck(205, 300, "thud", { gain: body, damp: 1.0, space: 0.1, tail: 0.55 }),
  );
}

/** A stack sliding into the pot: a longer, looser cascade. */
export const POT_SLIDE: VoiceSpec = chipCascade(8, 0.05, "pot-slide");

/**
 * A card leaving the deck: friction across felt, then a small landing tap.
 *
 * The band moved up from 700–3000 to 1800–5200 Hz — card-on-felt lives at
 * 2–6 kHz, and the old sweep was dark enough to read as cloth rather than as
 * card. The tap at the end is new: nine of these play on a deal, and without a
 * transient they were a wash rather than nine events.
 */
export const CARD_SLIDE: VoiceSpec = {
  freq: 900,
  ms: 100,
  jitter: 0.8,
  space: 0.08,
  tail: 0.32,
  warmth: 11000,
  layers: [
    {
      wave: "noise",
      gain: 0.3,
      ms: 88,
      env: { a: 0.01, d: 0.05, s: 0.1, r: 0.03 },
      filter: { type: "bandpass", cutoff: 1800, cutoffEnd: 5200, q: 0.9 },
    },
    {
      wave: "noise",
      gain: 0.14,
      ms: 26,
      delay: 0.072,
      env: { a: 0.001, d: 0.016, s: 0, r: 0.008 },
      filter: { type: "bandpass", cutoff: 3200, q: 1.2 },
    },
    // The little thump of the card meeting the table. 340 Hz, almost inaudible
    // alone, and the reason the tap reads as contact rather than as a tick.
    { wave: "sine", ratio: 0.378, gain: 0.1, ms: 60, delay: 0.072, env: { a: 0.002, d: 0.04, s: 0, r: 0.02 } },
  ],
};

/**
 * THE SHUFFLE — new on 2026-08-15, and the most recognisable poker sound
 * there is. The table had none: a hand simply began.
 *
 * A riffle is not one noise, it is a dense train of many tiny separations with
 * partially correlated timing. Twenty-two scattered ticks at ~11 ms is what
 * makes it read as a shuffle rather than as static — the texture is the
 * signature, not any frequency in it.
 */
export const SHUFFLE: VoiceSpec = scatter(
  {
    freq: 2600,
    ms: 16,
    jitter: 0,
    space: 0.1,
    tail: 0.4,
    warmth: 9000,
    layers: [
      {
        wave: "noise",
        gain: 0.22,
        ms: 14,
        env: { a: 0.0008, d: 0.008, s: 0, r: 0.005 },
        filter: { type: "bandpass", cutoff: 2600, q: 1.4 },
      },
    ],
  },
  22,
  0.011,
  { seed: "riffle", spread: 0.6, gainVar: 0.5, pitchVar: 3 },
);

/** A card turned face up at showdown — new. A snap, not a slide. */
export const CARD_REVEAL: VoiceSpec = mix(
  {
    freq: 1400,
    ms: 60,
    jitter: 0.6,
    space: 0.14,
    tail: 0.5,
    warmth: 11000,
    layers: [
      {
        wave: "noise",
        gain: 0.24,
        ms: 22,
        env: { a: 0.0008, d: 0.014, s: 0, r: 0.007 },
        filter: { type: "highpass", cutoff: 3400, q: 0.8 },
      },
    ],
  },
  struck(300, 110, "thud", { gain: 0.16, damp: 1.1, space: 0.12, tail: 0.5 }),
);

/** Check — a knuckle knock on the table. */
export const CHECK_KNOCK: VoiceSpec = struck(190, 140, KNOCK, {
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

/** Fold — cards pushed away. A short swish onto a soft landing. */
export const FOLD_SWISH: VoiceSpec = {
  freq: 520,
  ms: 150,
  jitter: 0.5,
  space: 0.1,
  tail: 0.45,
  warmth: 7000,
  layers: [
    {
      wave: "noise",
      gain: 0.18,
      ms: 120,
      env: { a: 0.012, d: 0.07, s: 0.08, r: 0.04 },
      filter: { type: "bandpass", cutoff: 2400, cutoffEnd: 800, q: 0.8 },
    },
    { wave: "sine", ratio: 0.55, gain: 0.13, ms: 90, delay: 0.06, env: { a: 0.003, d: 0.06, s: 0, r: 0.03 } },
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

/** Winning the pot — a warm marimba run up the pentatonic. */
export const WIN_POT: VoiceSpec = run(
  struck(392, 420, "bar", { gain: 0.2, damp: 0.8, mallet: 0.4, malletHz: 2600, space: 0.24, tail: 1.6, jitter: 0 }),
  [0, 4, 7, 12],
  0.085,
);

export const POKER_VOICES = {
  chipClack: CHIP_CLACK,
  chipRaise: CHIP_RAISE,
  cardSlide: CARD_SLIDE,
  shuffle: SHUFFLE,
  reveal: CARD_REVEAL,
  checkKnock: CHECK_KNOCK,
  yourTurn: YOUR_TURN,
  fold: FOLD_SWISH,
  potSlide: POT_SLIDE,
  allIn: ALL_IN,
  win: WIN_POT,
} as const;

export type SfxName = keyof typeof POKER_VOICES;
