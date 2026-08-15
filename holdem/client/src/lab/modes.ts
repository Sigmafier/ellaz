// Partial sets the SHIPPED voices do not use.
//
// They live in the lab's chunk rather than in `audio/voice.ts` for the reason
// stated there: a mode nothing plays yet must not be paid for by a player who
// only wants to play poker. `struck()` takes a partial set directly as well as
// a name from the shipped MODES table, which is what lets the lab reach the
// SAME damping law instead of keeping a second copy of the physics.
//
// The shipped table (glass, tine, bar) is RE-EXPORTED below rather than copied.
// Two tables of the same physics is how a control arm quietly stops being one.

import { MODES, type Partials } from "../audio/voice";

export { MODES };

/** A struck bell: dense, wildly inharmonic, a long hum under a bright strike. */
export const BELL: Partials = [
  [1, 1],
  [2.0, 0.42],
  [3.01, 0.28],
  [4.17, 0.18],
  [5.43, 0.11],
  [6.79, 0.06],
];

/** A wooden block. Almost no partials at all, which is why it reads as dry. */
export const WOOD: Partials = [
  [1, 1],
  [3.2, 0.14],
  [6.1, 0.03],
];

/** A soft mallet on something heavy - felt on a drum head. Rounded, thumpy. */
export const SOFT: Partials = [
  [1, 1],
  [1.59, 0.12],
  [2.14, 0.04],
];

/** Clay poker chips: tight, dense, dead fast. The house set. */
export const CLAY: Partials = [
  [1, 1],
  [2.32, 0.42],
  [4.1, 0.14],
  [6.9, 0.05],
];

/** Ceramic chips - brighter and ringier than clay, the cheap casino sound. */
export const CERAMIC: Partials = [
  [1, 1],
  [2.78, 0.5],
  [5.2, 0.22],
  [8.9, 0.08],
];

// ---------------------------------------------------------------------------
// Added 2026-08-15, because the palette read as thin and only had two materials
// ---------------------------------------------------------------------------
//
// Every chip on this table was clay or ceramic, which are the same material to
// two decimal places. A strip whose options differ by a parameter offers one
// sound at nine settings; a strip whose options differ by what the object IS
// offers nine sounds. These are the second kind.

/** Plastic dice-chips - the home set. Sharp, hollow, gone almost instantly. */
export const PLASTIC: Partials = [
  [1, 1],
  [3.42, 0.6],
  [6.8, 0.3],
  [11.2, 0.12],
];

/**
 * A metal token or a coin. The odd one here: the high partials RING rather
 * than dying, so it wants a low `damp` or it stops being metal.
 */
export const METAL: Partials = [
  [1, 1],
  [2.76, 0.55],
  [5.4, 0.4],
  [8.93, 0.28],
  [13.3, 0.16],
];

/**
 * A COLUMN of chips, not one chip.
 *
 * This is the mode that matters most and it is the one nothing here had. A
 * stack of twenty chips is a coupled resonator: lower than a single chip,
 * longer, and with a close pair of partials that beat against each other. It
 * is where the sound of a riffle actually comes from - the individual chips
 * only supply the transients.
 */
export const STACK: Partials = [
  [1, 1],
  [1.18, 0.55],
  [2.44, 0.3],
  [4.05, 0.12],
];

/** The table itself under a hand or a shove. Lower and looser than `thud`. */
export const TABLE: Partials = [
  [1, 1],
  [1.44, 0.18],
  [2.28, 0.06],
];

/** A playing card's own body. Almost nothing - a card is mostly its friction. */
export const PAPER: Partials = [
  [1, 1],
  [2.9, 0.06],
];
