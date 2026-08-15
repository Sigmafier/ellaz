// The table strips, second wave. Check, Your turn, You win.
//
// These three are the ones that are allowed to be MUSIC, and the first wave
// treated that as licence to write more arpeggios. Two of them are not really
// music at all:
//
//   Check     is a hand on wood. It has been a struck bar with no table under
//             it, which is why it read as a woodblock in a percussion library
//             rather than as somebody knocking twice.
//   Your turn plays every single time the action reaches you - dozens of times
//             an hour - so the thing it has to survive is repetition, and the
//             options here that win on the first listen are usually the ones
//             that lose by the twentieth. There are deliberately several very
//             small ones.
//   You win   is the one place a fanfare is correct, and even here the best
//             arms tend to be the short ones.

import { MODES, run } from "../../audio/voice";
import type { Candidate } from "../candidates";
import { BELL, CERAMIC, METAL, SOFT, STACK, WOOD } from "../modes";
import { body, bounce, chirp, knock, mix, scatter, struck, tick } from "./kit";

/**
 * A table with air under it - a longer, looser body than a solid one.
 *
 * Declared above the arms rather than beside the one that uses it: these arrays
 * are built at module load, so a partial set written below them is still in its
 * temporal dead zone when the first arm reaches for it.
 */
const TABLE_HOLLOW = [
  [1, 1],
  [1.51, 0.24],
  [2.38, 0.1],
  [3.6, 0.03],
] as const satisfies readonly (readonly [number, number])[];

// ---------------------------------------------------------------------------
// Check - somebody knocks the table. Twice, usually. It is a HAND, not a bar.
// ---------------------------------------------------------------------------

export const checkKnock: Candidate[] = [
  {
    id: "check-knuckle",
    name: "Knuckles",
    blurb: "Two knocks with the table answering underneath. What a check sounds like.",
    spec: bounce(knock(760, 190, 0.11, WOOD), 2, 0.115, { decay: 0.86, tighten: 1, pitchDrop: -0.8 }),
  },
  {
    id: "check-palm",
    name: "Flat palm",
    blurb: "The whole hand rather than a knuckle. Lower, softer, more table.",
    spec: mix(
      struck(420, 90, SOFT, { gain: 0.11, damp: 1.2, mallet: 0.35, malletHz: 1600, space: 0.12, tail: 0.5 }),
      chirp(struck(140, 240, "thud", { gain: 0.2, damp: 1.0, space: 0.12, tail: 0.6 }), -2),
    ),
  },
  {
    id: "check-hollow",
    name: "Hollow table",
    blurb: "A folding table with nothing under it. Boomier, and slightly comic.",
    spec: mix(
      struck(680, 80, WOOD, { gain: 0.1, damp: 1.15, mallet: 0.4, malletHz: 2400, space: 0.16, tail: 0.7 }),
      struck(118, 340, TABLE_HOLLOW, { gain: 0.24, damp: 0.95, space: 0.18, tail: 0.9 }),
    ),
  },
  {
    id: "check-rail",
    name: "On the rail",
    blurb: "Knocking the padded edge rather than the felt. Dull and close.",
    spec: mix(
      struck(340, 110, SOFT, { gain: 0.13, damp: 1.25, mallet: 0.3, malletHz: 1400, space: 0.1, tail: 0.4 }),
      struck(165, 190, "thud", { gain: 0.16, damp: 1.1, space: 0.09, tail: 0.45 }),
    ),
  },
  {
    id: "check-three-real",
    name: "Three quick",
    blurb: "Three knocks getting faster, the way an impatient player does it.",
    spec: bounce(knock(800, 200, 0.095, WOOD), 3, 0.1, { decay: 0.78, tighten: 0.8, pitchDrop: -0.7 }),
  },
  {
    id: "check-chip-tap",
    name: "With a chip",
    blurb: "Tapped with a chip in the hand instead of a bare knuckle. Brighter.",
    spec: mix(
      struck(2400, 60, CERAMIC, { gain: 0.1, damp: 1.25, mallet: 0.45, malletHz: 4200, space: 0.12, tail: 0.5, jitter: 1.4 }),
      struck(175, 200, TABLE_HOLLOW, { gain: 0.17, damp: 1.05, space: 0.11, tail: 0.55 }),
    ),
  },
  {
    id: "check-far-real",
    name: "Down the table",
    blurb: "Somebody else's check, three seats away. More room, less knuckle.",
    spec: mix(
      struck(700, 90, WOOD, { gain: 0.07, damp: 1.2, mallet: 0.3, malletHz: 2200, space: 0.42, tail: 1.4 }),
      struck(185, 210, "thud", { gain: 0.1, damp: 1.05, space: 0.4, tail: 1.4 }),
    ),
  },
  {
    id: "check-single-real",
    name: "One knock",
    blurb: "Just the one. The most restrained check here, and the least distracting.",
    spec: knock(720, 190, 0.12, WOOD),
  },
  {
    id: "check-soft-real",
    name: "Barely a tap",
    blurb: "Two fingers, quietly. For a table where the sounds should stay small.",
    spec: bounce(knock(820, 220, 0.075, WOOD), 2, 0.1, { decay: 0.8, tighten: 1 }),
  },
  {
    id: "check-metal-real",
    name: "On metal",
    blurb: "A rail with something metal in it. A short ring after each knock.",
    spec: mix(
      struck(1500, 200, METAL, { gain: 0.07, damp: 0.85, mallet: 0.35, malletHz: 3800, space: 0.18, tail: 0.9 }),
      struck(170, 200, "thud", { gain: 0.16, damp: 1.05, space: 0.12, tail: 0.55 }),
    ),
  },
];

// ---------------------------------------------------------------------------
// Your turn - dozens of times an hour. Repetition is the whole design problem.
// ---------------------------------------------------------------------------

export const yourTurn: Candidate[] = [
  {
    id: "turn-tick-real",
    name: "One tick",
    blurb: "The smallest possible nudge. Nothing to get tired of.",
    spec: struck(1400, 90, MODES.tine, { gain: 0.11, damp: 1.1, space: 0.14, tail: 0.5, jitter: 0.4 }),
  },
  {
    id: "turn-up",
    name: "Bends up",
    blurb: "One note that lifts a tone as it plays. Reads as a question.",
    spec: chirp(struck(587.33, 260, MODES.tine, { gain: 0.13, damp: 0.95, space: 0.2, tail: 0.9, jitter: 0 }), 2),
  },
  {
    id: "turn-fifth-up",
    name: "Two, upward",
    blurb: "Low then high. The clearest 'you' without being loud about it.",
    spec: run(struck(523.25, 220, MODES.tine, { gain: 0.12, damp: 1.0, space: 0.18, tail: 0.8, jitter: 0 }), [0, 7], 0.075),
  },
  {
    id: "turn-fifth-down",
    name: "Two, downward",
    blurb: "The same pair the other way round. Calmer, and less like an alarm.",
    spec: run(struck(783.99, 220, MODES.tine, { gain: 0.12, damp: 1.0, space: 0.18, tail: 0.8, jitter: 0 }), [0, -7], 0.075),
  },
  {
    id: "turn-breath",
    name: "Breath",
    blurb: "No pitch at all - a soft swell of air. The least musical option here.",
    spec: {
      freq: 400,
      ms: 300,
      jitter: 0,
      space: 0.3,
      tail: 1.0,
      warmth: 5200,
      layers: [
        { wave: "noise", gain: 0.075, ms: 300, env: { a: 0.09, d: 0.14, s: 0.3, r: 0.12 }, filter: { type: "bandpass", cutoff: 700, cutoffEnd: 1500, q: 1.2 } },
      ],
    },
  },
  {
    id: "turn-chip-real",
    name: "A chip",
    blurb: "Not music - one chip set down in front of you. Fits the table exactly.",
    spec: mix(tick(0.13, 2600), body(230, 160, 0.16)),
  },
  {
    id: "turn-bell-far",
    name: "Distant bell",
    blurb: "A bell in a large room. Present for a long time without ever being loud.",
    spec: struck(880, 700, BELL, { gain: 0.07, damp: 0.72, mallet: 0.22, malletHz: 3200, space: 0.42, tail: 2.2, jitter: 0 }),
  },
  {
    id: "turn-stack-real",
    name: "Stack settling",
    blurb: "The column of chips in front of you shifting. Almost subliminal.",
    spec: struck(300, 300, STACK, { gain: 0.12, damp: 1.1, space: 0.18, tail: 0.8, jitter: 0.6 }),
  },
  {
    id: "turn-three-real",
    name: "Three notes",
    blurb: "A short rising figure. The most attention-getting option, use with care.",
    spec: run(struck(523.25, 240, MODES.bar, { gain: 0.11, damp: 0.9, mallet: 0.32, malletHz: 2800, space: 0.22, tail: 1.0, jitter: 0 }), [0, 4, 7], 0.062),
  },
  {
    id: "turn-knock-real",
    name: "Somebody knocks",
    blurb: "The table nudging you rather than a note. Fits with everything else here.",
    spec: knock(640, 180, 0.1, WOOD),
  },
];

// ---------------------------------------------------------------------------
// You win - the one place a fanfare is allowed, and still usually too much.
// ---------------------------------------------------------------------------

export const win: Candidate[] = [
  {
    id: "win-chips-first",
    name: "Chips, then a note",
    blurb: "The pot arriving, and one warm note behind it. Money before music.",
    spec: mix(
      scatter(tick(0.1), 11, 0.03, { seed: "win-chips-first", spread: 0.7, gainVar: 0.55 }),
      run(struck(392, 440, MODES.bar, { gain: 0.13, damp: 0.8, mallet: 0.3, malletHz: 2600, space: 0.3, tail: 1.8, jitter: 0 }), [0, 7], 0.11),
      body(190, 520, 0.2),
    ),
  },
  {
    id: "win-rise-real",
    name: "One note, rising",
    blurb: "A single note that bends upward and rings out. Quiet and very effective.",
    spec: chirp(struck(392, 700, MODES.bar, { gain: 0.2, damp: 0.78, mallet: 0.35, malletHz: 2400, space: 0.32, tail: 2.0, jitter: 0 }), 5),
  },
  {
    id: "win-two-bells",
    name: "Two bells",
    blurb: "A fifth apart, ringing over each other. Ceremonial without a whole run.",
    spec: run(struck(523.25, 620, BELL, { gain: 0.15, damp: 0.7, mallet: 0.3, malletHz: 3200, space: 0.36, tail: 2.4, jitter: 0 }), [0, 7], 0.13),
  },
  {
    id: "win-warm-chord",
    name: "Warm chord",
    blurb: "Three notes together, low and soft. Satisfied rather than triumphant.",
    spec: run(struck(261.63, 620, SOFT, { gain: 0.17, damp: 0.85, space: 0.3, tail: 2.0, jitter: 0 }), [0, 4, 7], 0.018),
  },
  {
    id: "win-cascade-down",
    name: "Falling glass",
    blurb: "Bright notes falling rather than climbing. Lighter than any run here.",
    spec: run(struck(1174.66, 280, MODES.glass, { gain: 0.12, damp: 0.92, space: 0.32, tail: 1.7, jitter: 0 }), [12, 9, 5, 0, -3], 0.058),
  },
  {
    id: "win-metal-ring",
    name: "Metal ring",
    blurb: "One long metallic tone under the chips. A jackpot without a jackpot.",
    spec: mix(
      struck(1046.5, 1100, METAL, { gain: 0.1, damp: 0.58, mallet: 0.3, malletHz: 4200, space: 0.36, tail: 2.4, jitter: 0 }),
      scatter(tick(0.085), 9, 0.034, { seed: "win-metal-ring", spread: 0.7, gainVar: 0.55 }),
    ),
  },
  {
    id: "win-stack-real",
    name: "Stacking up",
    blurb: "No music - three columns of chips being built in front of you.",
    spec: mix(
      bounce(tick(0.12), 3, 0.16, { decay: 0.92, tighten: 1, pitchDrop: -1.3 }),
      struck(255, 700, STACK, { gain: 0.2, damp: 1.05, space: 0.2, tail: 1.1 }),
    ),
  },
  {
    id: "win-short-real",
    name: "Very short",
    blurb: "Two notes and out, in under a fifth of a second. You win a lot of pots.",
    spec: run(struck(587.33, 200, MODES.tine, { gain: 0.18, damp: 1.0, space: 0.2, tail: 0.9, jitter: 0 }), [0, 12], 0.06),
  },
  {
    id: "win-ceramic-real",
    name: "Ceramic run",
    blurb: "The climb on chip-coloured timbre, so it belongs to this table.",
    spec: run(struck(523.25, 340, CERAMIC, { gain: 0.11, damp: 0.9, mallet: 0.3, malletHz: 4200, space: 0.28, tail: 1.6, jitter: 0 }), [0, 4, 7, 12], 0.08),
  },
  {
    id: "win-hall-real",
    name: "Big room",
    blurb: "The same four notes, much further away. Grand instead of close.",
    spec: run(struck(392, 460, MODES.bar, { gain: 0.15, damp: 0.8, mallet: 0.32, malletHz: 2600, space: 0.55, tail: 3.0, jitter: 0 }), [0, 4, 7, 12], 0.09),
  },
];
