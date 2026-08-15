// The strips: for every sound the table plays, the alternatives to pick from.
//
// THE "AS IT IS NOW" ARM IS ALWAYS A LITERAL, NEVER AN IMPORT.
//
// That is the one rule here and it is not stylistic. Write the incumbent arm as
// `spec: CHIP_CLACK` and it stops being a control the moment somebody picks a
// new chipClack: the shipped constant moves, the "current" button follows it,
// and the strip quietly contains two buttons that play the same sound - one of
// them labelled with the old name. Every test still passes, because a duplicate
// spec is a valid spec. Ellaz shipped exactly that and only noticed because all
// nine voices moved on the same day. So these are hand-copied, and when a pick
// lands the copy stays as it was and gets relabelled.
//
// `candidates.test.ts` fails on any two arms in one strip being byte-identical,
// AND on a control that has drifted from what pokerVoices.ts actually exports,
// which is the mechanical half of the same rule in both directions.
//
// Everything is built through the shell's own `struck` / `run` / `mix` /
// `scatter`, so a candidate is damped by the same law the shipped voices are. A
// candidate that reached the engine through a second copy of the physics would
// be judged against a palette it is not actually part of.
//
// REBUILT 2026-08-15 - eight strips of five became eleven strips of nine. The
// three new ones (shuffle, chipRaise, reveal) are sounds the table did not make
// at all, which is a bigger change than any option below: a hand began with no
// shuffle, a raise sounded exactly like a call, and turning a hand over at
// showdown was silent. The reason the old palette read as thin is written at
// the top of pokerVoices.ts and every strip here now offers both sides of it.

import { mix, type Partials, run, scatter, struck, type VoiceSpec } from "../audio/voice";
import type { SfxName } from "../audio/pokerVoices";
import { BELL, CERAMIC, CLAY, SOFT, WOOD } from "./modes";

export interface Candidate {
  /** Stable across renames - it is what a pick is recorded against. */
  id: string;
  name: string;
  /** One line, in the operator's terms. Not a description of the synthesis. */
  blurb: string;
  spec: VoiceSpec;
  /** True for the arm that is what the table plays today. */
  current?: boolean;
}

const KNOCK: Partials = [
  [1, 1],
  [2.4, 0.18],
  [4.9, 0.05],
];

/**
 * One chip landing, as a bright strike over a low body.
 *
 * A hand-copy of the helper in pokerVoices.ts, on purpose - see the header.
 * `candidates.test.ts` compares each control arm byte-for-byte against what
 * actually ships, so this copy cannot drift silently; it can only go red.
 */
function chipHit(body = 0.22, click = 0.16): VoiceSpec {
  return mix(
    struck(2800, 52, CLAY, {
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

/**
 * A CASCADE — one light click per chip over a SINGLE low body.
 *
 * A dozen chips tumbling into a pot do not make a dozen table thumps; they make
 * a dozen clicks and one rumble. Hand-copied from pokerVoices.ts, same as
 * `chipHit` and for the same reason.
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

/** The same, in another material. */
function chipHitOf(mode: Partials, hz: number, bodyHz: number, body: number, click: number): VoiceSpec {
  return mix(
    struck(hz, 52, mode, {
      gain: click,
      damp: 1.3,
      mallet: 0.45,
      malletHz: 4400,
      space: 0.1,
      tail: 0.45,
      jitter: 1.2,
    }),
    struck(bodyHz, 140, "thud", { gain: body, damp: 1.05, space: 0.08, tail: 0.4 }),
  );
}

// ---------------------------------------------------------------------------

const chipClack: Candidate[] = [
  {
    id: "chip-current",
    name: "Clay",
    blurb: "What you hear now. Two dense chips, with the table under them.",
    current: true,
    spec: scatter(chipHit(), 2, 0.052, { seed: "chip-clack" }),
  },
  {
    id: "chip-dry",
    name: "No body",
    blurb: "The click on its own, with nothing underneath. What this table played until today.",
    spec: scatter(
      struck(2800, 52, CLAY, {
        gain: 0.16,
        damp: 1.3,
        mallet: 0.45,
        malletHz: 4200,
        space: 0.1,
        tail: 0.45,
        jitter: 1.2,
      }),
      2,
      0.052,
      { seed: "chip-dry" },
    ),
  },
  {
    id: "chip-deep",
    name: "Heavy",
    blurb: "More table, less click. The most expensive-sounding chip here.",
    spec: scatter(chipHit(0.36, 0.13), 2, 0.052, { seed: "chip-deep" }),
  },
  {
    id: "chip-ceramic",
    name: "Ceramic",
    blurb: "Brighter and ringier. The cheap-casino chip rather than the heavy one.",
    spec: scatter(chipHitOf(CERAMIC, 3100, 260, 0.16, 0.16), 2, 0.05, { seed: "chip-ceramic" }),
  },
  {
    id: "chip-single",
    name: "One chip",
    blurb: "A single chip, not a pair. Quieter, and it gets out of the way faster.",
    spec: chipHit(0.24, 0.18),
  },
  {
    id: "chip-handful",
    name: "Handful",
    blurb: "Four at once. Reads as a bigger bet even when it is not.",
    spec: scatter(chipHit(0.18, 0.13), 4, 0.036, { seed: "chip-handful", spread: 0.55 }),
  },
  {
    id: "chip-wood",
    name: "Wooden",
    blurb: "Dry and low, like a draughts piece. Almost no ring at all.",
    spec: scatter(chipHitOf(WOOD, 1500, 190, 0.24, 0.2), 2, 0.05, { seed: "chip-wood" }),
  },
  {
    id: "chip-felt",
    name: "Thick felt",
    blurb: "Landing on a soft table. Damped, close, and much quieter.",
    spec: scatter(chipHitOf(SOFT, 1100, 175, 0.28, 0.12), 2, 0.056, { seed: "chip-felt" }),
  },
  {
    id: "chip-close",
    name: "In the room",
    blurb: "Almost no echo. Sounds like it happened on your desk, not in a hall.",
    spec: scatter(
      mix(
        struck(2800, 52, CLAY, { gain: 0.17, damp: 1.35, mallet: 0.5, malletHz: 4200, space: 0.02, tail: 0.18, jitter: 1.2 }),
        struck(235, 120, "thud", { gain: 0.22, damp: 1.05, space: 0.02, tail: 0.18 }),
      ),
      2,
      0.05,
      { seed: "chip-close" },
    ),
  },
  {
    id: "chip-tight",
    name: "Together",
    blurb: "Both chips at almost the same instant. One event rather than two.",
    spec: scatter(chipHit(0.22, 0.15), 2, 0.018, { seed: "chip-tight", spread: 0.2 }),
  },
];

const chipRaise: Candidate[] = [
  {
    id: "raise-current",
    name: "Five chips",
    blurb: "What you hear now. More chips than a call, pushed out with intent.",
    current: true,
    spec: scatter(chipHit(0.26, 0.15), 5, 0.042, { seed: "chip-raise", spread: 0.5 }),
  },
  {
    id: "raise-same",
    name: "Same as a call",
    blurb: "No difference at all. Pick this if the table sounds too busy.",
    spec: scatter(chipHit(0.22, 0.16), 2, 0.053, { seed: "raise-same" }),
  },
  {
    id: "raise-shove",
    name: "A big push",
    blurb: "Nine chips, loose and wide. Hard to mistake for a call.",
    spec: chipCascade(9, 0.036, "raise-shove", 0.26),
  },
  {
    id: "raise-three",
    name: "Three, placed",
    blurb: "Deliberate rather than thrown. Tighter spacing, firmer hits.",
    spec: scatter(chipHit(0.26, 0.17), 3, 0.075, { seed: "raise-three", spread: 0.15 }),
  },
  {
    id: "raise-stack",
    name: "A stack",
    blurb: "A whole column set down at once, then settling.",
    spec: scatter(chipHit(0.3, 0.11), 7, 0.022, { seed: "raise-stack", spread: 0.75, gainVar: 0.55 }),
  },
  {
    id: "raise-slide",
    name: "Pushed forward",
    blurb: "Chips travelling across the felt before they land.",
    spec: mix(
      {
        freq: 700,
        ms: 260,
        jitter: 0.3,
        space: 0.14,
        tail: 0.6,
        warmth: 8000,
        layers: [
          {
            wave: "noise",
            gain: 0.15,
            ms: 240,
            env: { a: 0.04, d: 0.12, s: 0.2, r: 0.1 },
            filter: { type: "bandpass", cutoff: 800, cutoffEnd: 2600, q: 0.7 },
          },
        ],
      },
      scatter(chipHit(0.22, 0.12), 4, 0.04, { seed: "raise-slide", spread: 0.5 }),
    ),
  },
  {
    id: "raise-crisp",
    name: "Ceramic",
    blurb: "Brighter chips, five of them. Cuts through a noisy room.",
    spec: scatter(chipHitOf(CERAMIC, 3100, 260, 0.18, 0.15), 5, 0.04, { seed: "raise-crisp", spread: 0.45 }),
  },
  {
    id: "raise-heavy",
    name: "Heavy",
    blurb: "All body. Sounds like real weight arriving in the middle.",
    spec: scatter(chipHit(0.4, 0.1), 5, 0.046, { seed: "raise-heavy", spread: 0.5 }),
  },
];

const cardSlide: Candidate[] = [
  {
    id: "card-current",
    name: "Slide and tap",
    blurb: "What you hear now. A card across felt, then meeting the table.",
    current: true,
    spec: {
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
        { wave: "sine", ratio: 0.378, gain: 0.1, ms: 60, delay: 0.072, env: { a: 0.002, d: 0.04, s: 0, r: 0.02 } },
      ],
    },
  },
  {
    id: "card-old",
    name: "Cloth",
    blurb: "Darker, with no landing at all. What this table played until today.",
    spec: {
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
    },
  },
  {
    id: "card-riffle",
    name: "Flicked",
    blurb: "Faster and higher. A card thrown rather than pushed.",
    spec: {
      freq: 1200,
      ms: 62,
      jitter: 1.0,
      space: 0.06,
      tail: 0.28,
      warmth: 12000,
      layers: [
        {
          wave: "noise",
          gain: 0.32,
          ms: 62,
          env: { a: 0.004, d: 0.04, s: 0.08, r: 0.02 },
          filter: { type: "bandpass", cutoff: 2400, cutoffEnd: 6400, q: 1.1 },
        },
      ],
    },
  },
  {
    id: "card-heavy",
    name: "Heavy stock",
    blurb: "A thicker, more expensive card. Lower and slower.",
    spec: {
      freq: 600,
      ms: 130,
      jitter: 0.6,
      space: 0.1,
      tail: 0.45,
      warmth: 8000,
      layers: [
        {
          wave: "noise",
          gain: 0.28,
          ms: 130,
          env: { a: 0.02, d: 0.08, s: 0.16, r: 0.05 },
          filter: { type: "bandpass", cutoff: 1100, cutoffEnd: 3200, q: 0.8 },
        },
        { wave: "sine", ratio: 0.5, gain: 0.12, ms: 80, delay: 0.09, env: { a: 0.003, d: 0.05, s: 0, r: 0.03 } },
      ],
    },
  },
  {
    id: "card-snap",
    name: "Snap",
    blurb: "Mostly the landing. The most audible option on this strip.",
    spec: {
      freq: 1400,
      ms: 55,
      jitter: 0.9,
      space: 0.05,
      tail: 0.25,
      warmth: 12000,
      layers: [
        {
          wave: "noise",
          gain: 0.22,
          ms: 18,
          env: { a: 0.0008, d: 0.011, s: 0, r: 0.006 },
          filter: { type: "highpass", cutoff: 4200, q: 0.8 },
        },
        {
          wave: "noise",
          gain: 0.16,
          ms: 55,
          env: { a: 0.008, d: 0.03, s: 0.06, r: 0.02 },
          filter: { type: "bandpass", cutoff: 2200, cutoffEnd: 4600, q: 1.0 },
        },
      ],
    },
  },
  {
    id: "card-whisper",
    name: "Whisper",
    blurb: "Almost silent. Nine of these play on every deal, so this is the quiet one.",
    spec: {
      freq: 800,
      ms: 80,
      jitter: 0.7,
      space: 0.09,
      tail: 0.3,
      warmth: 7500,
      layers: [
        {
          wave: "noise",
          gain: 0.15,
          ms: 80,
          env: { a: 0.014, d: 0.05, s: 0.1, r: 0.03 },
          filter: { type: "bandpass", cutoff: 1600, cutoffEnd: 3600, q: 0.7 },
        },
      ],
    },
  },
  {
    id: "card-glide",
    name: "Long glide",
    blurb: "A slower travel with no tap at the end. Smooth and unhurried.",
    spec: {
      freq: 900,
      ms: 165,
      jitter: 0.5,
      space: 0.12,
      tail: 0.4,
      warmth: 10000,
      layers: [
        {
          wave: "noise",
          gain: 0.24,
          ms: 165,
          env: { a: 0.03, d: 0.09, s: 0.18, r: 0.06 },
          filter: { type: "bandpass", cutoff: 1500, cutoffEnd: 4800, q: 0.8 },
        },
      ],
    },
  },
  {
    id: "card-tap",
    name: "Just the tap",
    blurb: "No travel. The card is simply there, with a small knock.",
    spec: mix(
      {
        freq: 1400,
        ms: 30,
        jitter: 0.7,
        space: 0.1,
        tail: 0.35,
        warmth: 11000,
        layers: [
          {
            wave: "noise",
            gain: 0.2,
            ms: 24,
            env: { a: 0.001, d: 0.015, s: 0, r: 0.008 },
            filter: { type: "bandpass", cutoff: 3000, q: 1.3 },
          },
        ],
      },
      struck(320, 90, "thud", { gain: 0.14, damp: 1.1, space: 0.1, tail: 0.4 }),
    ),
  },
  {
    id: "card-paper",
    name: "Papery",
    blurb: "Thin card on soft cloth. More rustle than scrape.",
    spec: {
      freq: 900,
      ms: 110,
      jitter: 0.9,
      space: 0.1,
      tail: 0.34,
      warmth: 9000,
      layers: [
        {
          wave: "noise",
          gain: 0.26,
          ms: 110,
          env: { a: 0.018, d: 0.07, s: 0.14, r: 0.04 },
          filter: { type: "bandpass", cutoff: 2600, cutoffEnd: 3400, q: 0.5 },
        },
      ],
    },
  },
];

/** One tick of a riffle - the unit the shuffle strip is built from. */
function riffleTick(hz: number, gain: number, q: number): VoiceSpec {
  return {
    freq: hz,
    ms: 16,
    jitter: 0,
    space: 0.1,
    tail: 0.4,
    warmth: 9000,
    layers: [
      {
        wave: "noise",
        gain,
        ms: 14,
        env: { a: 0.0008, d: 0.008, s: 0, r: 0.005 },
        filter: { type: "bandpass", cutoff: hz, q },
      },
    ],
  };
}

const shuffle: Candidate[] = [
  {
    id: "shuf-current",
    name: "Riffle",
    blurb: "What you hear now. A deck riffled together before the deal.",
    current: true,
    spec: scatter(riffleTick(2600, 0.22, 1.4), 22, 0.011, {
      seed: "riffle",
      spread: 0.6,
      gainVar: 0.5,
      pitchVar: 3,
    }),
  },
  {
    id: "shuf-short",
    name: "Short riffle",
    blurb: "Half as many cards. Over before the first hole card lands.",
    spec: scatter(riffleTick(2600, 0.24, 1.4), 10, 0.012, {
      seed: "riffle-short",
      spread: 0.55,
      gainVar: 0.45,
      pitchVar: 3,
    }),
  },
  {
    id: "shuf-long",
    name: "Full deck",
    blurb: "Thirty-four separations. The longest and most obviously a shuffle.",
    spec: scatter(riffleTick(2600, 0.19, 1.4), 34, 0.0105, {
      seed: "riffle-long",
      spread: 0.6,
      gainVar: 0.5,
      pitchVar: 3,
    }),
  },
  {
    id: "shuf-fast",
    name: "Quick",
    blurb: "The same cards in half the time. Brisk and professional.",
    spec: scatter(riffleTick(2900, 0.2, 1.5), 20, 0.0062, {
      seed: "riffle-fast",
      spread: 0.5,
      gainVar: 0.45,
      pitchVar: 3,
    }),
  },
  {
    id: "shuf-soft",
    name: "Soft",
    blurb: "Quiet and low. Present without announcing itself every hand.",
    spec: scatter(riffleTick(1500, 0.14, 0.9), 18, 0.012, {
      seed: "riffle-soft",
      spread: 0.6,
      gainVar: 0.5,
      pitchVar: 2,
    }),
  },
  {
    id: "shuf-bridge",
    name: "Bridge",
    blurb: "The riffle, then the cascade as the deck springs back together.",
    spec: mix(
      scatter(riffleTick(2600, 0.2, 1.4), 14, 0.012, { seed: "bridge-a", spread: 0.5, pitchVar: 3 }),
      scatter(
        { ...riffleTick(3400, 0.13, 1.6), layers: riffleTick(3400, 0.13, 1.6).layers.map((l) => ({ ...l, delay: 0.2 })) },
        16,
        0.0055,
        { seed: "bridge-b", spread: 0.35, pitchVar: 4 },
      ),
    ),
  },
  {
    id: "shuf-cut",
    name: "A cut",
    blurb: "No riffle at all. One half of the deck set down on the other.",
    spec: mix(
      {
        freq: 2200,
        ms: 40,
        jitter: 0.4,
        space: 0.12,
        tail: 0.45,
        warmth: 9000,
        layers: [
          {
            wave: "noise",
            gain: 0.2,
            ms: 34,
            env: { a: 0.004, d: 0.02, s: 0.05, r: 0.012 },
            filter: { type: "bandpass", cutoff: 2200, cutoffEnd: 1200, q: 0.8 },
          },
        ],
      },
      struck(260, 130, "thud", { gain: 0.2, damp: 1.0, space: 0.1, tail: 0.45 }),
    ),
  },
  {
    id: "shuf-wash",
    name: "Wash",
    blurb: "Cards spread and swirled on the felt. A smooth rush, not ticks.",
    spec: {
      freq: 1200,
      ms: 420,
      jitter: 0.2,
      space: 0.14,
      tail: 0.6,
      warmth: 8500,
      layers: [
        {
          wave: "noise",
          gain: 0.18,
          ms: 420,
          env: { a: 0.09, d: 0.16, s: 0.3, r: 0.14 },
          filter: { type: "bandpass", cutoff: 1200, cutoffEnd: 3800, q: 0.6 },
        },
      ],
    },
  },
];

const reveal: Candidate[] = [
  {
    id: "rev-current",
    name: "Snap over",
    blurb: "What you hear now. A card flicked face up onto the table.",
    current: true,
    spec: mix(
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
    ),
  },
  {
    id: "rev-soft",
    name: "Turned over",
    blurb: "Gently laid face up rather than snapped. Understated.",
    spec: mix(
      {
        freq: 1100,
        ms: 90,
        jitter: 0.5,
        space: 0.14,
        tail: 0.45,
        warmth: 9000,
        layers: [
          {
            wave: "noise",
            gain: 0.15,
            ms: 70,
            env: { a: 0.012, d: 0.04, s: 0.08, r: 0.02 },
            filter: { type: "bandpass", cutoff: 1900, cutoffEnd: 3000, q: 0.7 },
          },
        ],
      },
      struck(250, 100, "thud", { gain: 0.11, damp: 1.1, space: 0.1, tail: 0.42 }),
    ),
  },
  {
    id: "rev-slap",
    name: "Slapped down",
    blurb: "Hard onto the table. The showdown as a statement.",
    spec: mix(
      {
        freq: 1600,
        ms: 60,
        jitter: 0.5,
        space: 0.16,
        tail: 0.6,
        warmth: 11000,
        layers: [
          {
            wave: "noise",
            gain: 0.3,
            ms: 20,
            env: { a: 0.0006, d: 0.012, s: 0, r: 0.006 },
            filter: { type: "highpass", cutoff: 2800, q: 0.8 },
          },
        ],
      },
      struck(180, 190, "thud", { gain: 0.3, damp: 0.95, space: 0.14, tail: 0.7 }),
    ),
  },
  {
    id: "rev-double",
    name: "Both cards",
    blurb: "Two cards, a moment apart. It is a hand, not a card.",
    spec: scatter(
      mix(
        {
          freq: 1400,
          ms: 50,
          jitter: 0.6,
          space: 0.14,
          tail: 0.5,
          warmth: 11000,
          layers: [
            {
              wave: "noise",
              gain: 0.18,
              ms: 20,
              env: { a: 0.0008, d: 0.013, s: 0, r: 0.007 },
              filter: { type: "highpass", cutoff: 3400, q: 0.8 },
            },
          ],
        },
        struck(300, 100, "thud", { gain: 0.12, damp: 1.1, space: 0.12, tail: 0.5 }),
      ),
      2,
      0.13,
      { seed: "rev-double", spread: 0.25 },
    ),
  },
  {
    id: "rev-chime",
    name: "With a note",
    blurb: "The snap, and a small bright note over it. The most dramatic here.",
    spec: mix(
      {
        freq: 1400,
        ms: 60,
        jitter: 0.4,
        space: 0.2,
        tail: 0.9,
        warmth: 11000,
        layers: [
          {
            wave: "noise",
            gain: 0.2,
            ms: 20,
            env: { a: 0.0008, d: 0.013, s: 0, r: 0.007 },
            filter: { type: "highpass", cutoff: 3400, q: 0.8 },
          },
        ],
      },
      struck(1318.51, 260, "glass", { gain: 0.12, damp: 0.9, space: 0.3, tail: 1.2 }),
    ),
  },
  {
    id: "rev-wood",
    name: "On wood",
    blurb: "Landing on a bare table rather than on cloth. Drier, harder.",
    spec: mix(
      {
        freq: 1500,
        ms: 55,
        jitter: 0.6,
        space: 0.1,
        tail: 0.35,
        warmth: 11000,
        layers: [
          {
            wave: "noise",
            gain: 0.22,
            ms: 18,
            env: { a: 0.0006, d: 0.011, s: 0, r: 0.005 },
            filter: { type: "highpass", cutoff: 3800, q: 0.8 },
          },
        ],
      },
      struck(420, 90, WOOD, { gain: 0.16, damp: 1.2, space: 0.08, tail: 0.35 }),
    ),
  },
  {
    id: "rev-quiet",
    name: "Barely there",
    blurb: "A small rustle. For a table where the showdown speaks for itself.",
    spec: {
      freq: 1200,
      ms: 70,
      jitter: 0.7,
      space: 0.1,
      tail: 0.35,
      warmth: 9500,
      layers: [
        {
          wave: "noise",
          gain: 0.12,
          ms: 60,
          env: { a: 0.01, d: 0.035, s: 0.06, r: 0.02 },
          filter: { type: "bandpass", cutoff: 2400, cutoffEnd: 3600, q: 0.8 },
        },
      ],
    },
  },
  {
    id: "rev-fan",
    name: "Fanned",
    blurb: "Several cards spread face up at once. Busier and looser.",
    spec: scatter(riffleTick(2400, 0.18, 1.2), 6, 0.045, {
      seed: "rev-fan",
      spread: 0.5,
      gainVar: 0.4,
      pitchVar: 3,
    }),
  },
];

const checkKnock: Candidate[] = [
  {
    id: "check-current",
    name: "Knuckle",
    blurb: "What you hear now. One knuckle on a felt table.",
    current: true,
    spec: struck(190, 140, KNOCK, { gain: 0.3, damp: 0.9, mallet: 0.55, malletHz: 1400, space: 0.14, tail: 0.6, jitter: 0.6 }),
  },
  {
    id: "check-old",
    name: "Higher knuckle",
    blurb: "A little higher and shorter. What this table played until today.",
    spec: struck(210, 130, KNOCK, { gain: 0.3, damp: 0.9, mallet: 0.55, malletHz: 1400, space: 0.14, tail: 0.6, jitter: 0.6 }),
  },
  {
    id: "check-double",
    name: "Two knuckles",
    blurb: "The real gesture at a real table - people knock twice.",
    spec: run(
      struck(190, 110, KNOCK, { gain: 0.26, damp: 0.9, mallet: 0.5, malletHz: 1400, space: 0.14, tail: 0.55, jitter: 0.5 }),
      [0, 0],
      0.115,
    ),
  },
  {
    id: "check-triple",
    name: "A quick rap",
    blurb: "Three fast knocks. Impatient, and unmistakably a check.",
    spec: scatter(
      struck(200, 80, KNOCK, { gain: 0.22, damp: 0.95, mallet: 0.5, malletHz: 1500, space: 0.12, tail: 0.5 }),
      3,
      0.085,
      { seed: "check-triple", spread: 0.2, pitchVar: 0.8 },
    ),
  },
  {
    id: "check-thud",
    name: "Palm",
    blurb: "Lower and rounder. A flat hand rather than a knuckle.",
    spec: struck(120, 170, SOFT, { gain: 0.34, damp: 0.8, mallet: 0.35, malletHz: 700, space: 0.16, tail: 0.7, jitter: 0.5 }),
  },
  {
    id: "check-rap",
    name: "Sharp",
    blurb: "Higher and harder. Cuts through a noisy room.",
    spec: struck(330, 90, WOOD, { gain: 0.26, damp: 1.1, mallet: 0.6, malletHz: 2600, space: 0.1, tail: 0.4, jitter: 0.7 }),
  },
  {
    id: "check-felt",
    name: "Felt tap",
    blurb: "Nearly nothing. A check is the least eventful thing anyone does.",
    spec: struck(180, 90, SOFT, { gain: 0.18, damp: 1.0, mallet: 0.22, malletHz: 900, space: 0.12, tail: 0.4, jitter: 0.5 }),
  },
  {
    id: "check-deep",
    name: "Hollow table",
    blurb: "A big empty table under the knock. Lots of low end.",
    spec: struck(85, 220, SOFT, { gain: 0.36, damp: 0.75, mallet: 0.3, malletHz: 520, space: 0.2, tail: 0.9, jitter: 0.4 }),
  },
  {
    id: "check-ring",
    name: "Ringed",
    blurb: "A knuckle with a ring on it. A small bright edge on the knock.",
    // Bright voice FIRST — see the note on `mix`. The other way round this
    // resolved to ratio 122 and the override gate refused the whole thing.
    spec: mix(
      struck(2600, 60, CERAMIC, { gain: 0.06, damp: 1.4, space: 0.14, tail: 0.6, jitter: 0.5 }),
      struck(190, 130, KNOCK, { gain: 0.26, damp: 0.9, mallet: 0.45, malletHz: 1400, space: 0.14, tail: 0.6 }),
    ),
  },
];

const fold: Candidate[] = [
  {
    id: "fold-current",
    name: "Pushed away",
    blurb: "What you hear now. A short swish onto a soft landing.",
    current: true,
    spec: {
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
    },
  },
  {
    id: "fold-old",
    name: "Down-glide",
    blurb: "A small falling note with air under it. What this table played before.",
    spec: {
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
    },
  },
  {
    id: "fold-muck",
    name: "Muck",
    blurb: "Cards sliding away into the middle. No note at all.",
    spec: {
      freq: 700,
      ms: 150,
      jitter: 0.6,
      space: 0.09,
      tail: 0.35,
      warmth: 7000,
      layers: [
        {
          wave: "noise",
          gain: 0.22,
          ms: 150,
          env: { a: 0.02, d: 0.09, s: 0.1, r: 0.05 },
          filter: { type: "bandpass", cutoff: 2200, cutoffEnd: 600, q: 0.7 },
        },
      ],
    },
  },
  {
    id: "fold-flick",
    name: "Flicked in",
    blurb: "Two cards thrown at the muck. Quick and a bit dismissive.",
    spec: scatter(
      {
        freq: 900,
        ms: 70,
        jitter: 0.6,
        space: 0.08,
        tail: 0.3,
        warmth: 9000,
        layers: [
          {
            wave: "noise",
            gain: 0.16,
            ms: 60,
            env: { a: 0.006, d: 0.035, s: 0.05, r: 0.02 },
            filter: { type: "bandpass", cutoff: 2600, cutoffEnd: 1100, q: 0.9 },
          },
        ],
      },
      2,
      0.075,
      { seed: "fold-flick", spread: 0.3 },
    ),
  },
  {
    id: "fold-sigh",
    name: "Sigh",
    blurb: "A longer fall. Slightly comic, and you will hear it a lot.",
    spec: {
      freq: 620,
      ms: 220,
      jitter: 0.4,
      space: 0.12,
      tail: 0.5,
      warmth: 5000,
      layers: [{ wave: "triangle", gain: 0.13, glide: -9, env: { a: 0.006, d: 0.15, s: 0.05, r: 0.07 } }],
    },
  },
  {
    id: "fold-tick",
    name: "Barely there",
    blurb: "One quiet tick. Folds are most of what happens at a table.",
    spec: {
      freq: 900,
      ms: 45,
      jitter: 0.6,
      space: 0.06,
      tail: 0.25,
      warmth: 8000,
      layers: [
        {
          wave: "noise",
          gain: 0.13,
          ms: 22,
          env: { a: 0.001, d: 0.014, s: 0, r: 0.008 },
          filter: { type: "highpass", cutoff: 2600, q: 0.7 },
        },
      ],
    },
  },
  {
    id: "fold-drop",
    name: "Dropped",
    blurb: "The cards simply fall. A soft landing with no travel.",
    spec: mix(
      {
        freq: 800,
        ms: 40,
        jitter: 0.5,
        space: 0.1,
        tail: 0.4,
        warmth: 7000,
        layers: [
          {
            wave: "noise",
            gain: 0.12,
            ms: 30,
            env: { a: 0.003, d: 0.018, s: 0, r: 0.012 },
            filter: { type: "bandpass", cutoff: 1800, q: 0.9 },
          },
        ],
      },
      struck(210, 120, "thud", { gain: 0.16, damp: 1.05, space: 0.1, tail: 0.45 }),
    ),
  },
  {
    id: "fold-slide",
    name: "Long slide",
    blurb: "Pushed a long way across the felt. Unhurried, and clearly a fold.",
    spec: {
      freq: 600,
      ms: 260,
      jitter: 0.4,
      space: 0.12,
      tail: 0.5,
      warmth: 6500,
      layers: [
        {
          wave: "noise",
          gain: 0.16,
          ms: 260,
          env: { a: 0.05, d: 0.12, s: 0.2, r: 0.09 },
          filter: { type: "bandpass", cutoff: 2200, cutoffEnd: 700, q: 0.7 },
        },
      ],
    },
  },
  {
    id: "fold-mine",
    name: "A low note",
    blurb: "One quiet low tone under the swish. Reads as a small loss.",
    spec: mix(
      {
        freq: 520,
        ms: 130,
        jitter: 0.4,
        space: 0.12,
        tail: 0.55,
        warmth: 6500,
        layers: [
          {
            wave: "noise",
            gain: 0.12,
            ms: 100,
            env: { a: 0.01, d: 0.06, s: 0.06, r: 0.03 },
            filter: { type: "bandpass", cutoff: 2000, cutoffEnd: 800, q: 0.8 },
          },
        ],
      },
      struck(196, 300, "tine", { gain: 0.1, damp: 0.9, space: 0.24, tail: 0.9 }),
    ),
  },
];

const yourTurn: Candidate[] = [
  {
    id: "turn-current",
    name: "Tine",
    blurb: "What you hear now. One soft note, audible from a pocket.",
    current: true,
    spec: struck(1046.5, 320, "tine", { gain: 0.26, space: 0.22, tail: 1.0, jitter: 0 }),
  },
  {
    id: "turn-two",
    name: "Two notes",
    blurb: "A rising pair. Harder to miss, harder to ignore.",
    spec: run(struck(880, 300, "tine", { gain: 0.22, space: 0.22, tail: 1.0, jitter: 0 }), [0, 7], 0.1),
  },
  {
    id: "turn-glass",
    name: "Glass",
    blurb: "Brighter and colder. A chime rather than a tine.",
    spec: struck(1174.7, 300, "glass", { gain: 0.2, space: 0.26, tail: 1.2, jitter: 0 }),
  },
  {
    id: "turn-low",
    name: "Low tine",
    blurb: "An octave down. Warmer, and it does not startle.",
    spec: struck(523.25, 380, "tine", { gain: 0.3, space: 0.2, tail: 1.0, jitter: 0 }),
  },
  {
    id: "turn-bell",
    name: "Bell",
    blurb: "A small struck bell with a hum after it. The most insistent option.",
    spec: struck(784, 420, BELL, { gain: 0.18, damp: 0.75, mallet: 0.3, malletHz: 3200, space: 0.3, tail: 1.6, jitter: 0 }),
  },
  {
    id: "turn-wood",
    name: "Wood block",
    blurb: "A dry tap instead of a note. Nothing musical about it.",
    spec: struck(660, 150, WOOD, { gain: 0.26, damp: 1.1, mallet: 0.45, malletHz: 2600, space: 0.14, tail: 0.5, jitter: 0 }),
  },
  {
    id: "turn-third",
    name: "Falling third",
    blurb: "Two notes going down rather than up. Calmer, less like an alarm.",
    spec: run(struck(1046.5, 300, "tine", { gain: 0.22, space: 0.22, tail: 1.0, jitter: 0 }), [0, -4], 0.11),
  },
  {
    id: "turn-marimba",
    name: "Marimba",
    blurb: "Warm struck wood. Sits under the room instead of over it.",
    spec: struck(659.25, 340, "bar", { gain: 0.24, damp: 0.85, mallet: 0.38, malletHz: 2400, space: 0.24, tail: 1.2, jitter: 0 }),
  },
  {
    id: "turn-soft",
    name: "Very soft",
    blurb: "Quiet enough to sit beside a conversation. Easiest to live with.",
    spec: struck(880, 300, "tine", { gain: 0.14, space: 0.26, tail: 1.1, jitter: 0 }),
  },
  {
    id: "turn-double",
    name: "Knock knock",
    blurb: "Two quick low taps. The table asking rather than a bell ringing.",
    spec: run(
      struck(330, 120, KNOCK, { gain: 0.28, damp: 0.95, mallet: 0.5, malletHz: 1800, space: 0.16, tail: 0.6, jitter: 0 }),
      [0, 0],
      0.13,
    ),
  },
];

const potSlide: Candidate[] = [
  {
    id: "pot-current",
    name: "Cascade",
    blurb: "What you hear now. Eight chips tumbling toward the winner.",
    current: true,
    spec: chipCascade(8, 0.05, "pot-slide"),
  },
  {
    id: "pot-long",
    name: "Big pot",
    blurb: "Fourteen chips, closer together. A pot worth watching arrive.",
    spec: chipCascade(14, 0.038, "pot-long", 0.24),
  },
  {
    id: "pot-short",
    name: "Small pot",
    blurb: "Three chips, quickly. Right for a table that folds a lot.",
    spec: scatter(chipHit(0.24, 0.15), 3, 0.07, { seed: "pot-short", spread: 0.35 }),
  },
  {
    id: "pot-rake",
    name: "Raked across",
    blurb: "A dealer sweeping the pot over felt, with the chips underneath.",
    spec: mix(
      {
        freq: 700,
        ms: 340,
        jitter: 0.4,
        space: 0.16,
        tail: 0.7,
        warmth: 7000,
        layers: [
          {
            wave: "noise",
            gain: 0.16,
            ms: 320,
            env: { a: 0.05, d: 0.16, s: 0.25, r: 0.12 },
            filter: { type: "bandpass", cutoff: 900, cutoffEnd: 2600, q: 0.7 },
          },
        ],
      },
      scatter(chipHit(0.16, 0.1), 5, 0.06, { seed: "pot-rake", spread: 0.5 }),
    ),
  },
  {
    id: "pot-soft",
    name: "Soft push",
    blurb: "Barely there. For when the chip sounds are the loud part of the table.",
    spec: scatter(chipHitOf(SOFT, 1100, 175, 0.2, 0.09), 5, 0.06, { seed: "pot-soft", spread: 0.5 }),
  },
  {
    id: "pot-heavy",
    name: "Heavy",
    blurb: "All body, very little click. Sounds like real weight moving.",
    spec: scatter(chipHit(0.4, 0.08), 7, 0.052, { seed: "pot-heavy", spread: 0.55 }),
  },
  {
    id: "pot-topple",
    name: "Toppling",
    blurb: "A stack falling over as it arrives. Loose and slightly chaotic.",
    spec: mix(
      scatter(chipTick(), 12, 0.028, { seed: "pot-topple", spread: 0.85, gainVar: 0.6 }),
      struck(205, 320, "thud", { gain: 0.22, damp: 1.0, space: 0.1, tail: 0.6 }),
    ),
  },
  {
    id: "pot-ceramic",
    name: "Ceramic",
    blurb: "Brighter chips. The pot arrives with a bit of a rattle.",
    spec: scatter(chipHitOf(CERAMIC, 3100, 260, 0.14, 0.12), 7, 0.048, { seed: "pot-ceramic", spread: 0.55 }),
  },
];

const allIn: Candidate[] = [
  {
    id: "allin-current",
    name: "Two-note rise",
    blurb: "What you hear now. A rising pair over a swell.",
    current: true,
    spec: {
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
    },
  },
  {
    id: "allin-three",
    name: "Three-note rise",
    blurb: "One more step up. More ceremony.",
    spec: {
      freq: 523.25,
      ms: 560,
      jitter: 0,
      space: 0.26,
      tail: 1.5,
      warmth: 8000,
      layers: [
        { wave: "triangle", ratio: 1, gain: 0.13, ms: 220, env: { a: 0.01, d: 0.14, s: 0.1, r: 0.1 } },
        { wave: "triangle", ratio: 1.2599, gain: 0.14, ms: 240, delay: 0.13, env: { a: 0.01, d: 0.16, s: 0.1, r: 0.11 } },
        { wave: "triangle", ratio: 1.4983, gain: 0.16, ms: 320, delay: 0.26, env: { a: 0.01, d: 0.22, s: 0.1, r: 0.16 } },
        {
          wave: "noise",
          gain: 0.08,
          ms: 560,
          env: { a: 0.3, d: 0.16, s: 0.25, r: 0.16 },
          filter: { type: "lowpass", cutoff: 800, cutoffEnd: 3600, q: 0.7 },
        },
      ],
    },
  },
  {
    id: "allin-drum",
    name: "Drum",
    blurb: "A low hit and a swell. Weight instead of pitch.",
    spec: {
      freq: 80,
      ms: 420,
      jitter: 0,
      space: 0.22,
      tail: 1.3,
      warmth: 4000,
      layers: [
        ...struck(80, 380, SOFT, { gain: 0.4, damp: 0.7, mallet: 0.3, malletHz: 500, space: 0.2, tail: 1.2 }).layers,
        {
          wave: "noise",
          gain: 0.08,
          ms: 420,
          env: { a: 0.22, d: 0.16, s: 0.2, r: 0.14 },
          filter: { type: "lowpass", cutoff: 600, cutoffEnd: 2400, q: 0.7 },
        },
      ],
    },
  },
  {
    id: "allin-bell",
    name: "Bell toll",
    blurb: "One struck bell with a long hum. The most serious of the set.",
    spec: struck(392, 620, BELL, { gain: 0.2, damp: 0.7, mallet: 0.4, malletHz: 2800, space: 0.34, tail: 2.2, jitter: 0 }),
  },
  {
    id: "allin-glass",
    name: "Rising glass",
    blurb: "A bright run upward. Excitement rather than menace.",
    spec: run(struck(659.25, 300, "glass", { gain: 0.16, damp: 0.9, space: 0.28, tail: 1.4, jitter: 0 }), [0, 4, 7], 0.08),
  },
  {
    id: "allin-chips",
    name: "Everything in",
    blurb: "No note at all - just a great many chips arriving at once.",
    spec: mix(
      scatter(chipTick(0.12), 18, 0.026, { seed: "allin-chips", spread: 0.7, gainVar: 0.55 }),
      struck(190, 480, "thud", { gain: 0.3, damp: 0.9, space: 0.16, tail: 0.9 }),
    ),
  },
  {
    id: "allin-fall",
    name: "Falling",
    blurb: "Two notes going down instead of up. Ominous rather than exciting.",
    spec: {
      freq: 523.25,
      ms: 460,
      jitter: 0,
      space: 0.26,
      tail: 1.6,
      warmth: 7000,
      layers: [
        { wave: "triangle", ratio: 1, gain: 0.16, ms: 240, env: { a: 0.01, d: 0.16, s: 0.1, r: 0.1 } },
        { wave: "triangle", ratio: 0.7492, gain: 0.2, ms: 340, delay: 0.17, env: { a: 0.01, d: 0.22, s: 0.1, r: 0.16 } },
        {
          wave: "noise",
          gain: 0.09,
          ms: 460,
          env: { a: 0.26, d: 0.14, s: 0.25, r: 0.16 },
          filter: { type: "lowpass", cutoff: 1200, cutoffEnd: 500, q: 0.7 },
        },
      ],
    },
  },
  {
    id: "allin-swell",
    name: "Just the swell",
    blurb: "Only the rush underneath, with no melody over it. Tense and plain.",
    spec: {
      freq: 400,
      ms: 620,
      jitter: 0,
      space: 0.3,
      tail: 1.6,
      warmth: 6000,
      layers: [
        {
          wave: "noise",
          gain: 0.16,
          ms: 620,
          env: { a: 0.36, d: 0.18, s: 0.3, r: 0.2 },
          filter: { type: "lowpass", cutoff: 500, cutoffEnd: 3000, q: 0.9 },
        },
      ],
    },
  },
  {
    id: "allin-quiet",
    name: "Understated",
    blurb: "One low note and nothing else. Lets the table do the reacting.",
    spec: struck(261.63, 520, "tine", { gain: 0.22, damp: 0.85, space: 0.3, tail: 1.6, jitter: 0 }),
  },
];

const win: Candidate[] = [
  {
    id: "win-current",
    name: "Marimba run",
    blurb: "What you hear now. Four wooden notes climbing.",
    current: true,
    spec: run(
      struck(392, 420, "bar", { gain: 0.2, damp: 0.8, mallet: 0.4, malletHz: 2600, space: 0.24, tail: 1.6, jitter: 0 }),
      [0, 4, 7, 12],
      0.085,
    ),
  },
  {
    id: "win-big",
    name: "Big run",
    blurb: "Five notes and further up. For when the pot deserves it.",
    spec: run(
      struck(392, 420, "bar", { gain: 0.19, damp: 0.8, mallet: 0.38, malletHz: 2600, space: 0.28, tail: 1.9, jitter: 0 }),
      [0, 4, 7, 12, 16],
      0.078,
    ),
  },
  {
    id: "win-two",
    name: "Two notes",
    blurb: "Short and understated. You win a lot of small pots.",
    spec: run(
      struck(440, 380, "bar", { gain: 0.24, damp: 0.8, mallet: 0.42, malletHz: 2600, space: 0.22, tail: 1.3, jitter: 0 }),
      [0, 7],
      0.1,
    ),
  },
  {
    id: "win-bell",
    name: "Bell",
    blurb: "One bell instead of a run. Rings on after the chips land.",
    spec: struck(523.25, 560, BELL, { gain: 0.19, damp: 0.72, mallet: 0.38, malletHz: 3000, space: 0.34, tail: 2.2, jitter: 0 }),
  },
  {
    id: "win-glass",
    name: "Glass cascade",
    blurb: "Bright and quick, falling rather than rising.",
    spec: run(
      struck(1046.5, 300, "glass", { gain: 0.15, damp: 0.9, space: 0.3, tail: 1.6, jitter: 0 }),
      [12, 7, 4, 0],
      0.07,
    ),
  },
  {
    id: "win-chord",
    name: "One chord",
    blurb: "All the notes together instead of a climb. Warm and immediate.",
    spec: run(
      struck(392, 460, "bar", { gain: 0.16, damp: 0.8, mallet: 0.35, malletHz: 2600, space: 0.28, tail: 1.8, jitter: 0 }),
      [0, 4, 7, 12],
      0.012,
    ),
  },
  {
    id: "win-tine",
    name: "Tines",
    blurb: "The same climb on a softer, sweeter timbre. Less percussive.",
    spec: run(
      struck(392, 420, "tine", { gain: 0.2, damp: 0.85, space: 0.26, tail: 1.6, jitter: 0 }),
      [0, 4, 7, 12],
      0.085,
    ),
  },
  {
    id: "win-low",
    name: "Low and warm",
    blurb: "An octave down. Satisfied rather than triumphant.",
    spec: run(
      struck(196, 520, "bar", { gain: 0.24, damp: 0.78, mallet: 0.4, malletHz: 1800, space: 0.28, tail: 1.9, jitter: 0 }),
      [0, 4, 7, 12],
      0.095,
    ),
  },
  {
    id: "win-chips",
    name: "Just chips",
    blurb: "No music at all - a big pile of chips arriving in front of you.",
    spec: mix(
      scatter(chipTick(0.13), 16, 0.03, { seed: "win-chips", spread: 0.7, gainVar: 0.55 }),
      struck(195, 520, "thud", { gain: 0.28, damp: 0.9, space: 0.18, tail: 1.0 }),
    ),
  },
  {
    id: "win-fanfare",
    name: "Fanfare",
    blurb: "Six notes, up and up. The loudest celebration here.",
    spec: run(
      struck(392, 400, "bar", { gain: 0.18, damp: 0.8, mallet: 0.4, malletHz: 2600, space: 0.3, tail: 2.0, jitter: 0 }),
      [0, 4, 7, 12, 16, 19],
      0.072,
    ),
  },
];

/** Every strip, in the order the lab shows them: loudest and most frequent first. */
export const STRIPS: { name: SfxName; label: string; when: string; arms: Candidate[] }[] = [
  { name: "chipClack", label: "Chips", when: "every call and every blind", arms: chipClack },
  { name: "chipRaise", label: "Raise", when: "a bet or a raise - bigger than a call", arms: chipRaise },
  { name: "cardSlide", label: "Deal", when: "once per card - the busiest sound here", arms: cardSlide },
  { name: "shuffle", label: "Shuffle", when: "the start of every hand", arms: shuffle },
  { name: "checkKnock", label: "Check", when: "somebody knocks the table", arms: checkKnock },
  { name: "fold", label: "Fold", when: "somebody gives up the hand", arms: fold },
  { name: "yourTurn", label: "Your turn", when: "the action reaches you", arms: yourTurn },
  { name: "reveal", label: "Showdown", when: "a hand is turned face up", arms: reveal },
  { name: "potSlide", label: "Pot", when: "the pot slides to the winner", arms: potSlide },
  { name: "allIn", label: "All-in", when: "somebody puts it all in", arms: allIn },
  { name: "win", label: "You win", when: "you take the pot", arms: win },
];

/** Total arms, for the studio's own header. Derived, so it cannot go stale. */
export const SOUND_COUNT = STRIPS.reduce((a, s) => a + s.arms.length, 0);
