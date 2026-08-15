// The card strips, second wave. Deal, Shuffle, Showdown, Fold.
//
// A card is almost ALL friction. It has barely any body of its own - two weak
// modes and they are gone in 40 ms - so what you actually hear is cloth.
//
// The first wave got that half right and stopped there: `card-current` and
// `card-old` both sweep their filter, by hand, inside one layer array. What
// none of them do is give the sweep a real ATTACK, and none of them is more
// than a single gesture - a card travelling, landing, and lying down is three
// things and every arm above played one.
//
// So what separates these is `friction()` plus `bounce()`: a slide that takes
// 10-30 ms to reach full contact, and a landing that settles rather than stops.
// The sweeps are not the new part; being able to reuse one is.

import type { Candidate } from "../candidates";
import { BELL, CERAMIC, PAPER, SOFT, WOOD } from "../modes";
import { body, bounce, card, chirp, friction, mix, scatter, struck, tick, type VoiceSpec } from "./kit";

/** A bare sweep with no landing - the raw material of every arm here. */
function slide(gain: number, ms: number, from: number, to: number, q = 1.3): VoiceSpec {
  return { freq: 320, ms, jitter: 1.6, space: 0.09, tail: 0.4, warmth: 9500, layers: [friction(gain, ms, from, to, { q })] };
}

// ---------------------------------------------------------------------------
// Deal - once per card. The busiest sound here, so it has to survive the
// thousandth repetition rather than the first.
// ---------------------------------------------------------------------------

export const cardSlide: Candidate[] = [
  {
    id: "card-sweep",
    name: "Swept",
    blurb: "The card actually travelling - the sound moves up as it goes.",
    spec: card({ ms: 105, from: 2400, to: 5400, slide: 0.07, tap: 0.05 }),
  },
  {
    id: "card-sweep-down",
    name: "Swept down",
    blurb: "The same movement the other way. Softer, and it settles rather than arrives.",
    spec: card({ ms: 115, from: 5200, to: 2300, slide: 0.065, tap: 0.04, thump: 0.06 }),
  },
  {
    id: "card-skim",
    name: "Skimmed",
    blurb: "Fast and flat across the felt. The dealer is in a hurry and so is this.",
    spec: card({ ms: 62, from: 3200, to: 6200, slide: 0.075, tap: 0.055, q: 1.7 }),
  },
  {
    id: "card-land",
    name: "Lands and settles",
    blurb: "It arrives, lifts a fraction, and lies down. Two tiny taps, not one.",
    spec: mix(
      slide(0.055, 80, 2600, 4800),
      bounce(struck(1900, 22, PAPER, { gain: 0.06, damp: 1.4, mallet: 0.3, malletHz: 3600, space: 0.08, tail: 0.3 }), 2, 0.035, {
        decay: 0.45,
        tighten: 0.7,
      }),
    ),
  },
  {
    id: "card-felt",
    name: "Thick felt",
    blurb: "A well-used table. Duller, lower, almost no top end at all.",
    spec: mix(slide(0.07, 130, 1500, 2900, 1.0), struck(280, 90, SOFT, { gain: 0.07, damp: 1.2, space: 0.08, tail: 0.4 })),
  },
  {
    id: "card-plastic-table",
    name: "Bare table",
    blurb: "No cloth. Brighter, harder, with a real click where it stops.",
    spec: card({ ms: 70, from: 3400, to: 7000, slide: 0.06, tap: 0.075, q: 1.9, thump: 0.05 }),
  },
  {
    id: "card-two",
    name: "Both at once",
    blurb: "Your two hole cards arriving together rather than one at a time.",
    spec: mix(slide(0.06, 95, 2500, 5200), slide(0.045, 80, 3000, 5800, 1.6)),
  },
  {
    id: "card-pitch",
    name: "Pitched",
    blurb: "Thrown, not slid. A short spin through the air and then it lands.",
    spec: mix(
      slide(0.05, 130, 900, 2600, 0.8),
      struck(2100, 26, PAPER, { gain: 0.075, damp: 1.4, mallet: 0.4, malletHz: 4200, space: 0.09, tail: 0.35 }),
    ),
  },
  {
    id: "card-soft-deal",
    name: "Barely there",
    blurb: "The quietest option. Five of these in a row should not be five events.",
    spec: card({ ms: 90, from: 2200, to: 4200, slide: 0.04, q: 1.1 }),
  },
  {
    id: "card-crisp",
    name: "New deck",
    blurb: "Stiff cards straight out of the box. Sharper, with more edge to them.",
    spec: mix(card({ ms: 68, from: 3600, to: 6800, slide: 0.06, tap: 0.06, q: 2.1 }), struck(340, 55, PAPER, { gain: 0.05, damp: 1.3, space: 0.07, tail: 0.3 })),
  },
];

// ---------------------------------------------------------------------------
// Shuffle - the start of every hand. Long enough to be a moment.
// ---------------------------------------------------------------------------

export const shuffle: Candidate[] = [
  {
    id: "shuf-riffle-real",
    name: "Real riffle",
    blurb: "Two halves interleaving - dense at the start, thinning out at the end.",
    spec: mix(
      scatter(tick(0.055, 3400), 16, 0.017, { seed: "shuf-riffle-real", spread: 0.55, gainVar: 0.5, pitchVar: 2.5 }),
      slide(0.045, 300, 2000, 3600, 1.0),
    ),
  },
  {
    id: "shuf-bridge-real",
    name: "Riffle and bridge",
    blurb: "The riffle, then the cards springing back down into one deck.",
    spec: mix(
      scatter(tick(0.05, 3400), 13, 0.018, { seed: "shuf-bridge-real", spread: 0.5, gainVar: 0.45 }),
      slide(0.06, 190, 4400, 1800, 1.1),
      struck(300, 120, PAPER, { gain: 0.07, damp: 1.2, space: 0.1, tail: 0.5 }),
    ),
  },
  {
    id: "shuf-overhand",
    name: "Overhand",
    blurb: "Not a riffle at all - chunks dropped off the top, five or six of them.",
    spec: mix(
      bounce(tick(0.085, 2600), 6, 0.075, { decay: 0.92, tighten: 1.02, pitchDrop: -0.4 }),
      body(260, 420, 0.09, PAPER),
    ),
  },
  {
    id: "shuf-wash-real",
    name: "Washed",
    blurb: "Cards spread flat and stirred around. Broad, low, and unhurried.",
    spec: mix(slide(0.075, 620, 1600, 3400, 0.75), slide(0.05, 520, 3600, 2000, 0.9)),
  },
  {
    id: "shuf-strip",
    name: "Stripped",
    blurb: "Pulled off the top in packets, six times, faster and faster.",
    spec: mix(
      bounce(tick(0.08, 3000), 6, 0.09, { decay: 0.88, tighten: 0.86, pitchDrop: -0.5 }),
      slide(0.04, 380, 2200, 3200, 1.0),
    ),
  },
  {
    id: "shuf-two-riffles",
    name: "Twice",
    blurb: "Two riffles with a beat between them. What a real dealer does.",
    spec: mix(
      scatter(tick(0.05, 3400), 9, 0.017, { seed: "shuf-two-a", spread: 0.5, gainVar: 0.45 }),
      scatter(tick(0.05, 3200), 9, 0.017, { seed: "shuf-two-b", spread: 0.5, gainVar: 0.45 }),
      slide(0.04, 200, 2000, 3400, 1.0),
    ),
  },
  {
    id: "shuf-machine",
    name: "Shuffler",
    blurb: "The machine in the table doing it. Even, mechanical, over in a moment.",
    spec: mix(
      scatter(tick(0.045, 3800), 14, 0.014, { seed: "shuf-machine", spread: 0.12, gainVar: 0.12, pitchVar: 0.4 }),
      body(420, 240, 0.05, PAPER),
    ),
  },
  {
    id: "shuf-quiet-real",
    name: "Under the talk",
    blurb: "Shuffling while the table is still chatting. Present, not announced.",
    spec: mix(scatter(tick(0.035, 3000), 12, 0.019, { seed: "shuf-quiet-real", spread: 0.6, gainVar: 0.5 }), slide(0.03, 280, 1800, 3000, 0.9)),
  },
  {
    id: "shuf-cut-real",
    name: "Just the cut",
    blurb: "No shuffle - the deck cut once and set down. Two sounds and done.",
    spec: mix(
      slide(0.06, 120, 2600, 1700, 1.2),
      bounce(struck(560, 90, PAPER, { gain: 0.09, damp: 1.2, mallet: 0.3, malletHz: 2400, space: 0.1, tail: 0.45 }), 2, 0.09, { decay: 0.7, tighten: 1 }),
    ),
  },
  {
    id: "shuf-long-real",
    name: "The full routine",
    blurb: "Riffle, riffle, bridge, cut. The longest sound in this whole studio.",
    spec: mix(
      scatter(tick(0.045, 3400), 10, 0.017, { seed: "shuf-long-a", spread: 0.5, gainVar: 0.45 }),
      scatter(tick(0.045, 3200), 10, 0.016, { seed: "shuf-long-b", spread: 0.5, gainVar: 0.45 }),
      slide(0.055, 260, 4200, 1900, 1.1),
      body(280, 620, 0.07, PAPER),
    ),
  },
];

// ---------------------------------------------------------------------------
// Showdown - a hand turned face up. Once a hand at most, and it is the moment
// everybody is looking at, so it is allowed to be a sound rather than a click.
// ---------------------------------------------------------------------------

export const reveal: Candidate[] = [
  {
    id: "rev-flip-real",
    name: "Turned over",
    blurb: "The card lifting off the felt, rotating, and slapping back down.",
    spec: mix(
      slide(0.055, 150, 1800, 4600, 1.0),
      struck(1500, 45, PAPER, { gain: 0.11, damp: 1.3, mallet: 0.45, malletHz: 3400, space: 0.12, tail: 0.5 }),
    ),
  },
  {
    id: "rev-two-cards",
    name: "Both cards",
    blurb: "Two hands turned over, a moment apart. Reads as a showdown, not a card.",
    spec: mix(
      bounce(
        mix(
          slide(0.05, 110, 2000, 4400, 1.1),
          struck(1600, 40, PAPER, { gain: 0.1, damp: 1.3, mallet: 0.4, malletHz: 3400, space: 0.12, tail: 0.5 }),
        ),
        2,
        0.19,
        { decay: 0.85, tighten: 1, pitchDrop: -1 },
      ),
    ),
  },
  {
    id: "rev-snap-real",
    name: "Snapped",
    blurb: "Flipped hard, the way somebody does when they know they have won.",
    spec: mix(
      slide(0.06, 70, 2600, 7000, 1.8),
      chirp(struck(1900, 55, PAPER, { gain: 0.14, damp: 1.25, mallet: 0.5, malletHz: 4400, space: 0.14, tail: 0.6 }), -3),
    ),
  },
  {
    id: "rev-slow-real",
    name: "Slow roll",
    blurb: "Turned over deliberately slowly. Long, quiet, and slightly rude.",
    spec: mix(slide(0.045, 380, 1400, 3600, 0.85), struck(1100, 70, PAPER, { gain: 0.07, damp: 1.2, space: 0.16, tail: 0.8 })),
  },
  {
    id: "rev-ceramic-chime",
    name: "With a chime",
    blurb: "The flip, and a small bright note over it. Says 'look' without a fanfare.",
    spec: mix(
      slide(0.05, 120, 2000, 4600, 1.1),
      struck(1318.51, 320, CERAMIC, { gain: 0.075, damp: 0.85, mallet: 0.3, malletHz: 4600, space: 0.28, tail: 1.4, jitter: 0 }),
    ),
  },
  {
    id: "rev-bell-real",
    name: "One bell",
    blurb: "A single bell under the card. The most ceremonial option here.",
    spec: mix(
      slide(0.04, 110, 2200, 4400, 1.1),
      struck(880, 620, BELL, { gain: 0.08, damp: 0.7, mallet: 0.28, malletHz: 3400, space: 0.32, tail: 2.0, jitter: 0 }),
    ),
  },
  {
    id: "rev-wood-real",
    name: "Wooden knock",
    blurb: "The card, and a knuckle on the rail. Somebody saying 'go on then'.",
    spec: mix(slide(0.05, 100, 2200, 4600, 1.1), struck(420, 170, WOOD, { gain: 0.12, damp: 1.1, mallet: 0.4, malletHz: 2400, space: 0.14, tail: 0.7 })),
  },
  {
    id: "rev-fanned",
    name: "Fanned out",
    blurb: "Five cards spread in one movement. Wide and continuous rather than sharp.",
    spec: mix(
      scatter(tick(0.05, 2600), 5, 0.038, { seed: "rev-fan-2", spread: 0.4, gainVar: 0.35, pitchVar: 2 }),
      slide(0.05, 240, 1900, 4200, 0.95),
    ),
  },
  {
    id: "rev-rise",
    name: "Rising note",
    blurb: "A tone bending upward under the flip. Suspense rather than triumph.",
    spec: mix(slide(0.045, 130, 2000, 4400, 1.1), chirp(struck(392, 420, SOFT, { gain: 0.1, damp: 0.95, space: 0.26, tail: 1.3, jitter: 0 }), 5)),
  },
  {
    id: "rev-nothing",
    name: "Card only",
    blurb: "No music of any kind. Just paper leaving cloth, close up.",
    spec: card({ ms: 160, from: 1700, to: 4800, slide: 0.075, tap: 0.06, thump: 0.055, q: 1.15 }),
  },
];

// ---------------------------------------------------------------------------
// Fold - somebody gives up the hand. Should be small. It happens constantly.
// ---------------------------------------------------------------------------

export const fold: Candidate[] = [
  {
    id: "fold-push-real",
    name: "Pushed away",
    blurb: "Two cards slid forward into the muck and left there.",
    spec: mix(slide(0.055, 170, 2200, 3400, 1.0), body(300, 130, 0.06, PAPER)),
  },
  {
    id: "fold-flick-real",
    name: "Flicked",
    blurb: "A quick wrist. Short, upward, and gone before you have registered it.",
    spec: mix(slide(0.06, 70, 2400, 6000, 1.7), struck(1700, 30, PAPER, { gain: 0.07, damp: 1.35, mallet: 0.35, malletHz: 4000, space: 0.09, tail: 0.35 })),
  },
  {
    id: "fold-tumble",
    name: "Tumbles over",
    blurb: "They land badly and one flips. A little more sound than intended.",
    spec: mix(
      slide(0.05, 110, 2400, 4000, 1.2),
      bounce(struck(1500, 26, PAPER, { gain: 0.07, damp: 1.4, mallet: 0.3, malletHz: 3600, space: 0.09, tail: 0.35 }), 3, 0.042, {
        decay: 0.55,
        tighten: 0.65,
        pitchDrop: -1.5,
      }),
    ),
  },
  {
    id: "fold-sigh-real",
    name: "Resigned",
    blurb: "The cards, and a low note that falls. Not sad, just finished.",
    spec: mix(slide(0.05, 150, 2000, 3200, 1.0), chirp(struck(196, 300, SOFT, { gain: 0.09, damp: 1.0, space: 0.2, tail: 0.9, jitter: 0 }), -4)),
  },
  {
    id: "fold-muck-real",
    name: "Into the muck",
    blurb: "Onto a pile of cards rather than onto felt. Duller, with paper under it.",
    spec: mix(slide(0.05, 130, 1600, 2800, 0.9), struck(250, 110, PAPER, { gain: 0.09, damp: 1.15, space: 0.1, tail: 0.45 })),
  },
  {
    id: "fold-tap-real",
    name: "Tapped first",
    blurb: "A knuckle on the table, then the cards go. Polite, and very common.",
    spec: mix(
      struck(520, 90, WOOD, { gain: 0.09, damp: 1.15, mallet: 0.35, malletHz: 2200, space: 0.1, tail: 0.45 }),
      slide(0.045, 120, 2200, 3400, 1.0),
    ),
  },
  {
    id: "fold-quiet-real",
    name: "Almost silent",
    blurb: "The smallest sound in the studio. A fold should not be an event.",
    spec: slide(0.032, 95, 2000, 3000, 1.0),
  },
  {
    id: "fold-far",
    name: "Across the table",
    blurb: "Somebody else's fold, further away. Quieter, and with more room around it.",
    spec: {
      freq: 320,
      ms: 150,
      jitter: 1.6,
      space: 0.4,
      tail: 1.1,
      warmth: 7200,
      layers: [friction(0.045, 150, 1800, 3000, { q: 1.0 })],
    },
  },
  {
    id: "fold-double-real",
    name: "One then the other",
    blurb: "Two cards, separately. Somebody thinking about it right up to the end.",
    spec: bounce(slide(0.045, 90, 2200, 3600, 1.1), 2, 0.13, { decay: 0.8, tighten: 1 }),
  },
  {
    id: "fold-crisp-real",
    name: "Crisp",
    blurb: "New cards, hard felt. The most audible fold here without being loud.",
    spec: mix(slide(0.05, 80, 3000, 5400, 1.6), struck(1900, 26, PAPER, { gain: 0.06, damp: 1.4, mallet: 0.32, malletHz: 4400, space: 0.09, tail: 0.3 })),
  },
];
