// The rest of the partial table, recovered verbatim from the deleted Juice Lab
// (`git show ae4df64^:src/juice/lab/palette/builders.ts`).
//
// These live HERE rather than in `@sdk/voice` on purpose. A mode nothing plays
// yet is dead weight in the shell, and the shell has single-digit kilobytes of
// room. `struck()` accepts a partial set directly, so a candidate built from
// one of these is damped by the SAME function the shipped voices use - there is
// no second copy of the physics to drift.
//
// Each entry is [frequency ratio, relative amplitude], measured from the
// instrument rather than invented. That inharmonicity is the third of the four
// things `voice.ts` names as the difference between designed and synthesised.

import { MODES, type Partials } from "@sdk/voice";

/** A bell. The classic inharmonic series. */
export const BELL: Partials = [
  [1, 1],
  [2.76, 0.28],
  [5.4, 0.12],
  [8.93, 0.05],
];

/**
 * A struck wooden bar - marimba, xylophone. RE-EXPORTED, not redeclared.
 *
 * It moved into `@sdk/voice` on 2026-08-13 when correct, win and star were all
 * re-voiced onto it. Keeping a second literal here would give the lab and the
 * app two tables of the same physics, and the whole point of a candidate strip
 * is that its arms are comparable to the shipped one - which they stop being
 * the moment a partial ratio drifts by a decimal in one copy.
 */
export const BAR: Partials = MODES.bar;

/** A wooden block. Almost no sustain, barely pitched. */
export const WOOD: Partials = [
  [1, 1],
  [2.4, 0.13],
];

/** A soft mallet on something dense. Fundamental-heavy, dark. */
export const SOFT: Partials = [
  [1, 1],
  [2.02, 0.07],
];

// Notes, so the candidate voices read as music rather than as decimals.
export const C4 = 261.63;
export const G4 = 392.0;
export const A4 = 440;
export const C5 = 523.25;
export const E5 = 659.25;
export const G5 = 783.99;
export const B5 = 987.77;
export const C6 = 1046.5;
export const E6 = 1318.51;
