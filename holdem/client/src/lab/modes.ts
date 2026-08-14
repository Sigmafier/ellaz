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
