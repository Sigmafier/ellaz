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
// which is the mechanical half of the same rule.
//
// Everything is built through the shell's own `struck` / `run`, so a candidate
// is damped by the same law the shipped voices are. A candidate that reached
// the engine through a second copy of the physics would be judged against a
// palette it is not actually part of.

import { type Partials, run, struck, type VoiceSpec } from "../audio/voice";
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

// ---------------------------------------------------------------------------

const chipClack: Candidate[] = [
  {
    id: "chip-current",
    name: "Clay",
    blurb: "What you hear now. Two dense chips landing on each other.",
    current: true,
    // LITERAL copy of CHIP_CLACK as it stands. See the header.
    spec: run(
      struck(2400, 64, CLAY, { gain: 0.2, damp: 1.25, mallet: 0.5, malletHz: 4600, space: 0.1, tail: 0.5, jitter: 1.2 }),
      [0, -2],
      0.048,
    ),
  },
  {
    id: "chip-ceramic",
    name: "Ceramic",
    blurb: "Brighter and ringier. The cheap-casino chip rather than the heavy one.",
    spec: run(
      struck(2900, 70, CERAMIC, { gain: 0.18, damp: 1.1, mallet: 0.45, malletHz: 5200, space: 0.12, tail: 0.6, jitter: 1.2 }),
      [0, -2],
      0.05,
    ),
  },
  {
    id: "chip-single",
    name: "One chip",
    blurb: "A single chip, not a pair. Quieter, and it gets out of the way faster.",
    spec: struck(2400, 58, CLAY, { gain: 0.22, damp: 1.3, mallet: 0.5, malletHz: 4600, space: 0.09, tail: 0.4, jitter: 1.4 }),
  },
  {
    id: "chip-handful",
    name: "Handful",
    blurb: "Four chips at once. Reads as a bigger bet even when it is not.",
    spec: run(
      struck(2300, 60, CLAY, { gain: 0.16, damp: 1.25, mallet: 0.4, malletHz: 4400, space: 0.11, tail: 0.55, jitter: 1.8 }),
      [0, -2, 1, -3],
      0.036,
    ),
  },
  {
    id: "chip-wood",
    name: "Wooden",
    blurb: "Dry and low, like a draughts piece. No ring at all.",
    spec: run(
      struck(1500, 55, WOOD, { gain: 0.24, damp: 1.4, mallet: 0.4, malletHz: 3000, space: 0.08, tail: 0.35, jitter: 1.0 }),
      [0, -2],
      0.05,
    ),
  },
];

const potSlide: Candidate[] = [
  {
    id: "pot-current",
    name: "Cascade",
    blurb: "What you hear now. Five clacks tumbling into the middle.",
    current: true,
    spec: run(
      struck(2200, 58, CLAY, { gain: 0.14, damp: 1.25, mallet: 0.35, malletHz: 4200, space: 0.12, tail: 0.55, jitter: 1.5 }),
      [0, -1, 1, -3, 0],
      0.052,
    ),
  },
  {
    id: "pot-long",
    name: "Long slide",
    blurb: "Eight chips, closer together. A bigger pot arriving.",
    spec: run(
      struck(2200, 52, CLAY, { gain: 0.11, damp: 1.25, mallet: 0.3, malletHz: 4200, space: 0.14, tail: 0.7, jitter: 1.8 }),
      [0, -1, 1, -3, 0, 2, -2, 1],
      0.038,
    ),
  },
  {
    id: "pot-two",
    name: "Two stacks",
    blurb: "Shorter and firmer. Three chips, deliberately placed.",
    spec: run(
      struck(2100, 66, CLAY, { gain: 0.19, damp: 1.2, mallet: 0.42, malletHz: 4000, space: 0.1, tail: 0.5, jitter: 1.0 }),
      [0, -2, 1],
      0.07,
    ),
  },
  {
    id: "pot-rake",
    name: "Rake",
    blurb: "A dealer sweeping the pot across felt, with the chips underneath.",
    spec: {
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
        ...run(
          struck(2100, 48, CLAY, { gain: 0.1, damp: 1.3, space: 0.1, tail: 0.4 }),
          [0, -2, 1],
          0.09,
        ).layers.map((l) => ({ ...l, delay: (l.delay ?? 0) + 0.06 })),
      ],
    },
  },
  {
    id: "pot-soft",
    name: "Soft push",
    blurb: "Barely there. For when the chip sounds are the loud part of the table.",
    spec: run(
      struck(1400, 70, SOFT, { gain: 0.15, damp: 1.1, mallet: 0.2, malletHz: 2000, space: 0.14, tail: 0.5, jitter: 0.8 }),
      [0, -2, 1],
      0.06,
    ),
  },
];

const cardSlide: Candidate[] = [
  {
    id: "card-current",
    name: "Slide",
    blurb: "What you hear now. A card leaving the deck across felt.",
    current: true,
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
    name: "Riffle",
    blurb: "Faster and higher. A card flicked rather than pushed.",
    spec: {
      freq: 1200,
      ms: 62,
      jitter: 1.0,
      space: 0.06,
      tail: 0.28,
      warmth: 11000,
      layers: [
        {
          wave: "noise",
          gain: 0.32,
          ms: 62,
          env: { a: 0.004, d: 0.04, s: 0.08, r: 0.02 },
          filter: { type: "bandpass", cutoff: 1600, cutoffEnd: 5200, q: 1.1 },
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
      warmth: 7000,
      layers: [
        {
          wave: "noise",
          gain: 0.3,
          ms: 130,
          env: { a: 0.02, d: 0.08, s: 0.16, r: 0.05 },
          filter: { type: "bandpass", cutoff: 420, cutoffEnd: 1700, q: 0.8 },
        },
      ],
    },
  },
  {
    id: "card-snap",
    name: "Snap",
    blurb: "A crisp click as it lands. The most audible of the five.",
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
          gain: 0.2,
          ms: 20,
          env: { a: 0.0008, d: 0.012, s: 0, r: 0.006 },
          filter: { type: "highpass", cutoff: 4200, q: 0.8 },
        },
        {
          wave: "noise",
          gain: 0.22,
          ms: 55,
          env: { a: 0.008, d: 0.035, s: 0.08, r: 0.02 },
          filter: { type: "bandpass", cutoff: 1100, cutoffEnd: 3400, q: 1.0 },
        },
      ],
    },
  },
  {
    id: "card-whisper",
    name: "Whisper",
    blurb: "Almost silent. Nine of these play on every deal, so this is the quiet option.",
    spec: {
      freq: 800,
      ms: 80,
      jitter: 0.7,
      space: 0.09,
      tail: 0.3,
      warmth: 6500,
      layers: [
        {
          wave: "noise",
          gain: 0.16,
          ms: 80,
          env: { a: 0.014, d: 0.05, s: 0.1, r: 0.03 },
          filter: { type: "bandpass", cutoff: 600, cutoffEnd: 1900, q: 0.7 },
        },
      ],
    },
  },
];

const checkKnock: Candidate[] = [
  {
    id: "check-current",
    name: "Knuckle",
    blurb: "What you hear now. One knuckle on a felt table.",
    current: true,
    spec: struck(210, 130, KNOCK, { gain: 0.3, damp: 0.9, mallet: 0.55, malletHz: 1400, space: 0.14, tail: 0.6, jitter: 0.6 }),
  },
  {
    id: "check-double",
    name: "Two knuckles",
    blurb: "The real gesture at a real table - people knock twice.",
    spec: run(
      struck(210, 110, KNOCK, { gain: 0.26, damp: 0.9, mallet: 0.5, malletHz: 1400, space: 0.14, tail: 0.55, jitter: 0.5 }),
      [0, 0],
      0.115,
    ),
  },
  {
    id: "check-thud",
    name: "Table thud",
    blurb: "Lower and rounder. A palm rather than a knuckle.",
    spec: struck(120, 170, SOFT, { gain: 0.34, damp: 0.8, mallet: 0.35, malletHz: 700, space: 0.16, tail: 0.7, jitter: 0.5 }),
  },
  {
    id: "check-rap",
    name: "Sharp rap",
    blurb: "Higher and harder. Cuts through a noisy room.",
    spec: struck(330, 90, WOOD, { gain: 0.26, damp: 1.1, mallet: 0.6, malletHz: 2600, space: 0.1, tail: 0.4, jitter: 0.7 }),
  },
  {
    id: "check-felt",
    name: "Felt tap",
    blurb: "Nearly nothing. A check is the least eventful thing anyone does.",
    spec: struck(180, 90, SOFT, { gain: 0.18, damp: 1.0, mallet: 0.22, malletHz: 900, space: 0.12, tail: 0.4, jitter: 0.5 }),
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
    blurb: "A small struck bell, with a hum after it. The most insistent option.",
    spec: struck(784, 420, BELL, { gain: 0.18, damp: 0.75, mallet: 0.3, malletHz: 3200, space: 0.3, tail: 1.6, jitter: 0 }),
  },
];

const fold: Candidate[] = [
  {
    id: "fold-current",
    name: "Down-glide",
    blurb: "What you hear now. A small falling note with air under it.",
    current: true,
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
    blurb: "Cards sliding away. No note at all - just the movement.",
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
    id: "fold-down",
    name: "Cards down",
    blurb: "A short swish and a soft landing. The most physical of the five.",
    spec: {
      freq: 300,
      ms: 140,
      jitter: 0.5,
      space: 0.1,
      tail: 0.45,
      warmth: 5200,
      layers: [
        {
          wave: "noise",
          gain: 0.16,
          ms: 70,
          env: { a: 0.008, d: 0.04, s: 0, r: 0.02 },
          filter: { type: "bandpass", cutoff: 1800, cutoffEnd: 800, q: 0.8 },
        },
        { wave: "sine", ratio: 1, gain: 0.16, ms: 120, delay: 0.05, env: { a: 0.003, d: 0.08, s: 0, r: 0.05 } },
      ],
    },
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
      layers: [
        { wave: "triangle", gain: 0.13, glide: -9, env: { a: 0.006, d: 0.15, s: 0.05, r: 0.07 } },
      ],
    },
  },
  {
    id: "fold-tick",
    name: "Barely there",
    blurb: "One quiet tick. Folds are most of what happens, so this is the restrained one.",
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
    blurb: "One struck bell with a long hum. The most serious of the five.",
    spec: struck(392, 620, BELL, { gain: 0.2, damp: 0.7, mallet: 0.4, malletHz: 2800, space: 0.34, tail: 2.2, jitter: 0 }),
  },
  {
    id: "allin-glass",
    name: "Rising glass",
    blurb: "A bright run upward. Excitement rather than menace.",
    spec: run(
      struck(659.25, 300, "glass", { gain: 0.16, damp: 0.9, space: 0.28, tail: 1.4, jitter: 0 }),
      [0, 4, 7],
      0.08,
    ),
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
];

/** Every strip, in the order the lab shows them: loudest and most frequent first. */
export const STRIPS: { name: SfxName; label: string; when: string; arms: Candidate[] }[] = [
  { name: "chipClack", label: "Chips", when: "every bet, call and raise", arms: chipClack },
  { name: "cardSlide", label: "Deal", when: "once per card - the busiest sound here", arms: cardSlide },
  { name: "checkKnock", label: "Check", when: "somebody knocks the table", arms: checkKnock },
  { name: "fold", label: "Fold", when: "somebody gives up the hand", arms: fold },
  { name: "yourTurn", label: "Your turn", when: "the action reaches you", arms: yourTurn },
  { name: "potSlide", label: "Pot", when: "the pot slides to the winner", arms: potSlide },
  { name: "allIn", label: "All-in", when: "somebody puts it all in", arms: allIn },
  { name: "win", label: "You win", when: "you take the pot", arms: win },
];
