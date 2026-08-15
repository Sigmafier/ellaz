// The chip strips, second wave. Chips, Raise, Pot, All-in.
//
// Read `kit.ts` first for why these exist. In one line: the first ninety-eight
// arms were all one impact, and an impact is not what most of these events
// actually are. A call PLACES a chip. A raise PUSHES a stack. A pot SLIDES.
// Somebody going all-in TOPPLES a column of them. Four different physical
// gestures that were all being played as "a chip, but louder".

import type { Candidate } from "../candidates";
import { CERAMIC, METAL, PLASTIC, STACK, WOOD } from "../modes";
import { body, bounce, chip, chirp, CLAY, dropped, friction, inRoom, mix, riffle, scatter, struck, tick } from "./kit";

/**
 * The table under a shove - lower and looser than a chip's own body.
 *
 * A local literal rather than an import of `TABLE`, and it has to be declared
 * up here rather than beside the arm that uses it: these arrays are built at
 * module load, so a partial set declared below them is still in its temporal
 * dead zone when the first arm reaches for it.
 */
const TABLE_LOW = [
  [1, 1],
  [1.44, 0.18],
  [2.28, 0.06],
] as const satisfies readonly (readonly [number, number])[];

// ---------------------------------------------------------------------------
// Chips - every call and every blind. The most-played sound at this table.
// ---------------------------------------------------------------------------

export const chipClack: Candidate[] = [
  {
    id: "chip-drop",
    name: "Dropped",
    blurb: "Lands, bounces twice, settles. One chip actually arriving rather than appearing.",
    spec: dropped(3, 0.052),
  },
  {
    id: "chip-bounce",
    name: "Bouncy",
    blurb: "The same, on a harder table. Four quick bounces, tighter each time.",
    spec: dropped(4, 0.044, { tighten: 0.55, gain: 0.13 }),
  },
  {
    id: "chip-fall",
    name: "Falls in pitch",
    blurb: "One chip, but the tone drops as it settles. Small change, hard to unhear.",
    spec: chirp(chip(CLAY, 2800, 235, 0.22, 0.16), -2.4),
  },
  {
    id: "chip-plastic",
    name: "Plastic",
    blurb: "The home set. Sharp, hollow, cheap in a friendly way.",
    spec: chip(PLASTIC, 3050, 250, 0.16, 0.15),
  },
  {
    id: "chip-metal",
    name: "Metal token",
    blurb: "A coin rather than a chip. Rings on a little after it lands.",
    spec: struck(2450, 130, METAL, { gain: 0.11, damp: 0.72, mallet: 0.4, malletHz: 5000, space: 0.16, tail: 0.8, jitter: 1.2 }),
  },
  {
    id: "chip-stack",
    name: "Onto a stack",
    blurb: "Not onto the felt - onto the chips already there. Lower and woodier.",
    spec: mix(
      struck(2500, 46, CLAY, { gain: 0.13, damp: 1.35, mallet: 0.4, malletHz: 3800, space: 0.1, tail: 0.4, jitter: 1.2 }),
      struck(300, 200, STACK, { gain: 0.15, damp: 1.05, space: 0.12, tail: 0.6 }),
    ),
  },
  {
    id: "chip-two",
    name: "Two chips",
    blurb: "A call is rarely one chip. Two, a few milliseconds apart, not quite together.",
    spec: mix(
      bounce(tick(0.13), 2, 0.028, { decay: 0.85, tighten: 1, pitchDrop: -1.1 }),
      body(230, 150, 0.19),
    ),
  },
  {
    id: "chip-slide",
    name: "Slid forward",
    blurb: "Pushed across the felt instead of tossed. Friction, then it stops.",
    spec: mix(
      { freq: 300, ms: 130, jitter: 1.4, space: 0.1, tail: 0.4, warmth: 9000, layers: [friction(0.06, 130, 1400, 3400, { q: 1.1 })] },
      struck(240, 150, "thud", { gain: 0.17, damp: 1.05, space: 0.09, tail: 0.45 }),
    ),
  },
  {
    id: "chip-thumb",
    name: "Thumbed",
    blurb: "Flicked off the top of a stack. A tiny scrape before the landing.",
    // Chip first, scrape second. `mix` expresses every later spec's partials
    // relative to the FIRST one's frequency, and 300 Hz under a 2900 Hz chip
    // puts clay's top partial at a ratio of 67 - past the gate's cap of 64, so
    // the arm is refused and silently plays the built-in instead.
    spec: mix(
      chip(CLAY, 2900, 240, 0.18, 0.13),
      { freq: 2900, ms: 40, jitter: 1.6, space: 0.08, tail: 0.35, warmth: 9500, layers: [friction(0.05, 34, 5200, 3000, { q: 2.4, attack: 0.002 })] },
    ),
  },
  {
    id: "chip-heavy-clay",
    name: "Heavy clay",
    blurb: "A real casino chip - 14 grams of it. Dense, dark, almost no ring.",
    spec: chirp(chip(CLAY, 2200, 185, 0.3, 0.11), -1.6),
  },
];

// ---------------------------------------------------------------------------
// Raise - a bet or a raise. Has to read as MORE than a call, not just louder.
// ---------------------------------------------------------------------------

export const chipRaise: Candidate[] = [
  {
    id: "raise-push",
    name: "Pushed in",
    blurb: "A stack slid forward as one piece, then set down. The tournament gesture.",
    spec: mix(
      { freq: 300, ms: 250, jitter: 1.2, space: 0.12, tail: 0.55, warmth: 9000, layers: [friction(0.07, 250, 900, 2600, { q: 1.0 })] },
      struck(255, 320, STACK, { gain: 0.2, damp: 1.0, space: 0.14, tail: 0.7 }),
    ),
  },
  {
    id: "raise-drop-stack",
    name: "Stack dropped",
    blurb: "Picked up and dropped, not slid. Lands once and the column rings.",
    spec: mix(
      bounce(tick(0.12), 3, 0.03, { decay: 0.6, tighten: 0.7, pitchDrop: -1 }),
      struck(260, 340, STACK, { gain: 0.22, damp: 1.0, space: 0.14, tail: 0.75 }),
    ),
  },
  {
    id: "raise-spill",
    name: "Spilled",
    blurb: "The stack does not hold. Chips going everywhere for a third of a second.",
    spec: mix(
      scatter(tick(0.095), 9, 0.036, { seed: "raise-spill", spread: 0.75, gainVar: 0.6, pitchVar: 3 }),
      body(215, 380, 0.2),
    ),
  },
  {
    id: "raise-double",
    name: "Two stacks",
    blurb: "Two columns set down one after the other. Reads as a number, not a gesture.",
    spec: mix(
      bounce(tick(0.12), 2, 0.13, { decay: 0.95, tighten: 1, pitchDrop: -0.6 }),
      struck(250, 420, STACK, { gain: 0.19, damp: 1.05, space: 0.15, tail: 0.8 }),
    ),
  },
  {
    id: "raise-riffle",
    name: "Riffled first",
    blurb: "Counted out loud, then bet. A dealer's sound rather than a player's.",
    spec: mix(
      riffle(8, 0.026, "raise-riffle", { gain: 0.085 }),
      { freq: 240, ms: 300, jitter: 0, space: 0.12, tail: 0.6, warmth: 9000, layers: [friction(0.05, 170, 1100, 2400, { q: 1.1, delay: 0.13 })] },
    ),
  },
  {
    id: "raise-plastic",
    name: "Plastic stack",
    blurb: "The same push on a home set. Brighter and more rattly.",
    spec: mix(
      scatter(tick(0.1, 3200, PLASTIC), 6, 0.032, { seed: "raise-plastic", spread: 0.6, gainVar: 0.5 }),
      body(235, 300, 0.17),
    ),
  },
  {
    id: "raise-thump",
    name: "One thump",
    blurb: "No chips at all - the whole stack going down as a single low knock.",
    spec: chirp(struck(150, 300, "thud", { gain: 0.32, damp: 1.0, mallet: 0.3, malletHz: 1400, space: 0.14, tail: 0.7 }), -2.8),
  },
  {
    id: "raise-ceramic",
    name: "Ceramic push",
    blurb: "The casino set. Ringier, and the ring is what tells you the size.",
    spec: mix(
      scatter(tick(0.09, 3400, CERAMIC), 7, 0.03, { seed: "raise-ceramic", spread: 0.55, gainVar: 0.45 }),
      struck(270, 340, STACK, { gain: 0.16, damp: 1.05, space: 0.16, tail: 0.8 }),
    ),
  },
  {
    id: "raise-long",
    name: "Long push",
    blurb: "Half a second of chips travelling. The biggest gesture short of all-in.",
    spec: mix(
      { freq: 300, ms: 420, jitter: 1.1, space: 0.14, tail: 0.7, warmth: 8800, layers: [friction(0.075, 420, 800, 3000, { q: 0.9 })] },
      struck(240, 460, STACK, { gain: 0.19, damp: 1.0, space: 0.16, tail: 0.85 }),
    ),
  },
  {
    id: "raise-quiet",
    name: "Quiet raise",
    blurb: "Barely more than a call. For a table where the sound should stay out of the way.",
    spec: mix(
      bounce(tick(0.1), 2, 0.035, { decay: 0.8, tighten: 0.9, pitchDrop: -0.8 }),
      body(245, 200, 0.14),
    ),
  },
];

// ---------------------------------------------------------------------------
// Pot - the pot sliding to whoever won it. Long, once a hand.
// ---------------------------------------------------------------------------

export const potSlide: Candidate[] = [
  {
    id: "pot-sweep",
    name: "Swept",
    blurb: "An arm across the felt gathering everything, then the pile arriving.",
    spec: mix(
      { freq: 280, ms: 520, jitter: 0.8, space: 0.16, tail: 0.9, warmth: 8600, layers: [friction(0.08, 380, 700, 2800, { q: 0.85 })] },
      scatter(tick(0.085), 10, 0.028, { seed: "pot-sweep", spread: 0.7, gainVar: 0.6 }),
    ),
  },
  {
    id: "pot-tumble",
    name: "Tumbling in",
    blurb: "Chips falling over each other for most of a second. Messy on purpose.",
    spec: mix(
      scatter(tick(0.08), 12, 0.042, { seed: "pot-tumble", spread: 0.85, gainVar: 0.65, pitchVar: 3.5 }),
      body(195, 620, 0.22),
    ),
  },
  {
    id: "pot-two-stage",
    name: "Two stages",
    blurb: "It slides, pauses, and then settles. The pause is what makes it read as arriving.",
    spec: mix(
      { freq: 280, ms: 640, jitter: 0, space: 0.16, tail: 0.9, warmth: 8800, layers: [friction(0.07, 260, 900, 2600, { q: 1.0 })] },
      scatter(tick(0.09), 7, 0.03, { seed: "pot-two-stage", spread: 0.6, gainVar: 0.5 }),
      body(205, 540, 0.2),
    ),
  },
  {
    id: "pot-cascade",
    name: "Cascade",
    blurb: "Fast and dense, then nothing. Like a bucket being emptied.",
    spec: mix(
      scatter(tick(0.075), 14, 0.021, { seed: "pot-cascade", spread: 0.6, gainVar: 0.55 }),
      body(210, 420, 0.19),
    ),
  },
  {
    id: "pot-stack-drop",
    name: "Stacked up",
    blurb: "Not a pile - three columns set down in front of you, one at a time.",
    spec: mix(
      bounce(tick(0.11), 3, 0.15, { decay: 0.9, tighten: 1, pitchDrop: -1.2 }),
      struck(250, 620, STACK, { gain: 0.19, damp: 1.05, space: 0.18, tail: 1.0 }),
    ),
  },
  {
    id: "pot-slow",
    name: "Slow slide",
    blurb: "Taking its time. The longest sound here, for a pot that deserves it.",
    spec: mix(
      { freq: 260, ms: 820, jitter: 0.6, space: 0.2, tail: 1.1, warmth: 8400, layers: [friction(0.075, 700, 600, 2400, { q: 0.8 })] },
      body(190, 800, 0.2),
    ),
  },
  {
    id: "pot-plastic",
    name: "Plastic pile",
    blurb: "A home game. Lighter, rattlier, less money.",
    spec: mix(
      scatter(tick(0.085, 3200, PLASTIC), 11, 0.03, { seed: "pot-plastic", spread: 0.7, gainVar: 0.6 }),
      body(230, 460, 0.16),
    ),
  },
  {
    id: "pot-drum",
    name: "One low roll",
    blurb: "Almost no chips - mostly the table itself. Understated and cinematic.",
    spec: chirp(struck(120, 700, "thud", { gain: 0.3, damp: 0.95, mallet: 0.25, malletHz: 900, space: 0.2, tail: 1.2 }), -3.5),
  },
  {
    id: "pot-metal",
    name: "Metal in it",
    blurb: "Something in the pot is not a chip. A little ring under the pile.",
    spec: mix(
      struck(2300, 220, METAL, { gain: 0.07, damp: 0.75, mallet: 0.3, malletHz: 4600, space: 0.2, tail: 1.0 }),
      scatter(tick(0.08), 9, 0.032, { seed: "pot-metal", spread: 0.65, gainVar: 0.55 }),
      body(205, 480, 0.19),
    ),
  },
  {
    id: "pot-hush",
    name: "Hushed",
    blurb: "The quietest option. Chips you can hear, over almost no table.",
    spec: mix(
      scatter(tick(0.07), 8, 0.035, { seed: "pot-hush", spread: 0.6, gainVar: 0.5 }),
      body(230, 380, 0.1),
    ),
  },
];

// ---------------------------------------------------------------------------
// All-in - once a session, and it is allowed to be the biggest sound here.
// ---------------------------------------------------------------------------

export const allIn: Candidate[] = [
  {
    id: "allin-shove",
    name: "The shove",
    blurb: "Both hands, everything forward at once. Long friction and a wall of chips.",
    spec: mix(
      { freq: 260, ms: 700, jitter: 0.6, space: 0.2, tail: 1.2, warmth: 8400, layers: [friction(0.09, 430, 700, 3000, { q: 0.85 })] },
      scatter(tick(0.1), 12, 0.032, { seed: "allin-shove", spread: 0.8, gainVar: 0.6, pitchVar: 3 }),
      struck(150, 620, TABLE_LOW, { gain: 0.26, damp: 1.0, space: 0.2, tail: 1.3 }),
    ),
  },
  {
    id: "allin-topple",
    name: "Toppled",
    blurb: "The column goes over. Chips scattering for a full second and no music.",
    spec: mix(
      scatter(tick(0.095), 14, 0.048, { seed: "allin-topple", spread: 0.9, gainVar: 0.7, pitchVar: 4 }),
      struck(180, 780, STACK, { gain: 0.22, damp: 1.0, space: 0.2, tail: 1.3 }),
    ),
  },
  {
    id: "allin-heartbeat",
    name: "Two beats",
    blurb: "Two low thumps under the chips, like a pulse. Tense rather than loud.",
    // Chips first for the ratio cap (see `chip-thumb`), room restored after -
    // written the other way round the 96 Hz pulse is legal and arrives in a
    // chip's small room, which is the opposite of what a heartbeat wants.
    spec: inRoom(
      mix(
        scatter(tick(0.075), 7, 0.035, { seed: "allin-heartbeat", spread: 0.7, gainVar: 0.5 }),
        bounce(struck(96, 300, "thud", { gain: 0.3, damp: 1.0, space: 0.18, tail: 1.1 }), 2, 0.29, { decay: 0.8, tighten: 1, pitchDrop: -1.5 }),
      ),
      0.2,
      1.3,
    ),
  },
  {
    id: "allin-rise",
    name: "Rising",
    blurb: "A low tone bending upward under the chips. The only sound here that goes UP.",
    spec: mix(
      chirp(struck(110, 620, "thud", { gain: 0.26, damp: 0.9, space: 0.22, tail: 1.4 }), 7),
      scatter(tick(0.08), 9, 0.04, { seed: "allin-rise", spread: 0.75, gainVar: 0.55 }),
    ),
  },
  {
    id: "allin-drop",
    name: "Dropped flat",
    blurb: "Lifted and dropped from a height. One enormous landing, then silence.",
    spec: mix(
      bounce(tick(0.13), 4, 0.038, { decay: 0.45, tighten: 0.5, pitchDrop: -1.4 }),
      chirp(struck(130, 700, TABLE_LOW, { gain: 0.3, damp: 1.0, space: 0.2, tail: 1.4 }), -3),
    ),
  },
  {
    id: "allin-metal",
    name: "Metal ring",
    blurb: "A long metallic ring over the chips. Reads as a bell without being one.",
    spec: mix(
      struck(1760, 900, METAL, { gain: 0.085, damp: 0.6, mallet: 0.3, malletHz: 4200, space: 0.3, tail: 2.0 }),
      scatter(tick(0.075), 8, 0.038, { seed: "allin-metal", spread: 0.7, gainVar: 0.55 }),
      body(170, 640, 0.2),
    ),
  },
  {
    id: "allin-riffle",
    name: "Counted, then gone",
    blurb: "A riffle, a beat of nothing, and then the whole stack moving.",
    spec: mix(
      riffle(9, 0.024, "allin-riffle", { gain: 0.08 }),
      { freq: 240, ms: 640, jitter: 0, space: 0.18, tail: 1.1, warmth: 8600, layers: [friction(0.08, 340, 750, 2800, { q: 0.9, delay: 0.28 })] },
    ),
  },
  {
    id: "allin-wood",
    name: "Wooden knock",
    blurb: "A knuckle on the rail as the chips go in. Somebody committing to it.",
    spec: mix(
      struck(340, 260, WOOD, { gain: 0.16, damp: 1.1, mallet: 0.4, malletHz: 2200, space: 0.16, tail: 0.9 }),
      scatter(tick(0.085), 10, 0.036, { seed: "allin-wood", spread: 0.75, gainVar: 0.6 }),
      body(165, 560, 0.2),
    ),
  },
  {
    id: "allin-hall",
    name: "Big room",
    blurb: "The same chips in a much larger room. Everything else here is close-miked.",
    spec: mix(
      scatter(
        struck(2800, 44, CLAY, { gain: 0.085, damp: 1.35, mallet: 0.35, malletHz: 4200, space: 0.5, tail: 2.4, jitter: 1.2 }),
        10,
        0.04,
        { seed: "allin-hall", spread: 0.8, gainVar: 0.6 },
      ),
      struck(160, 700, "thud", { gain: 0.22, damp: 1.0, space: 0.45, tail: 2.6 }),
    ),
  },
  {
    id: "allin-silence",
    name: "Almost nothing",
    blurb: "One quiet low note and three chips. The table going quiet is the drama.",
    spec: mix(
      chirp(struck(104, 560, "thud", { gain: 0.2, damp: 1.05, space: 0.24, tail: 1.5 }), -2),
      bounce(tick(0.07), 3, 0.055, { decay: 0.6, tighten: 0.75, pitchDrop: -1 }),
    ),
  },
];
