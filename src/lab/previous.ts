// What each sound used to be, held here so every strip keeps a real control arm.
//
// THE RULE THIS FILE EXISTS FOR: a candidate that IMPORTS the shipped constant
// stops being a control the instant the shipped constant changes. On 2026-08-13
// nine voices were replaced at once, and every "was" arm in `voices.ts` pointed
// at exactly the constant that moved - so without this file the gallery would
// have shipped nine strips each containing the new voice twice, one copy
// labelled with the old name, and no test able to tell the difference because
// both would still be perfectly valid specs.
//
// That is the precise ambiguity the deleted Juice Lab recorded as "the control
// won", which took a week to become unreadable. A control arm is only evidence
// if it is pinned to a literal.
//
// These are TRANSCRIPTIONS, byte-for-byte, of what `@sdk/voice` exported before
// that date. The builders come from `@sdk/voice` on purpose - `struck` and
// `run` are the shared physics, not the shipped voices, so importing them
// cannot drift and re-implementing them here would be a second copy of the
// damping law. Nothing below may import TAP / POP / SUCCESS / any of the nine.
//
// This whole file lives in the lab's lazy chunk. A child's first visit pays
// nothing for the history.

import { mallet, run, struck, type VoiceSpec } from "@sdk/voice";
import { C5, E6 } from "./modes";

/** tap, until 2026-08-13. "Shutter" - a mechanical double-click. Blind winner 2026-08-02. */
export const PREV_TAP: VoiceSpec = {
  freq: 2400,
  ms: 60,
  jitter: 0.7,
  space: 0.07,
  tail: 0.35,
  warmth: 10000,
  layers: [
    mallet(0.13, 5, 2800),
    { ...mallet(0.1, 6, 1900), delay: 0.032 },
    {
      wave: "sine",
      ratio: 0.3,
      gain: 0.07,
      ms: 45,
      env: { a: 0.001, d: 0.03, s: 0, r: 0.02 },
    },
  ],
};

/**
 * pop, for a few hours on 2026-08-13. "Cork" - a sharp pock that jumps upward.
 *
 * The shortest-lived shipped voice in the app: picked in the morning over the
 * square wave, replaced the same day by Pock, which is the same idea derived
 * from the measured recipe rather than dialled in. Kept because a strip that
 * drops the arm you preferred an hour ago cannot show you changed your mind.
 */
export const PREV_POP: VoiceSpec = {
  freq: 300,
  ms: 90,
  jitter: 1.2,
  space: 0.1,
  tail: 0.3,
  warmth: 7000,
  layers: [
    mallet(0.12, 6, 1500),
    {
      wave: "sine",
      gain: 0.2,
      ms: 60,
      glide: 9,
      env: { a: 0.001, d: 0.035, s: 0, r: 0.03 },
    },
  ],
};

/** flip, until 2026-08-13. One triangle wave, from before the tournament. Never judged. */
export const PREV_FLIP: VoiceSpec = {
  freq: 600,
  ms: 70,
  layers: [
    {
      wave: "triangle",
      gain: 0.2,
      env: { a: 0.008, d: 0.05, s: 0.01, r: 0.012 },
    },
  ],
};

/** success, until 2026-08-13. "Harp gliss" - five pentatonic notes on metal. Blind winner. */
export const PREV_SUCCESS: VoiceSpec = run(
  struck(C5, 280, "tine", { gain: 0.2, damp: 0.8, space: 0.24, tail: 1.1 }),
  [0, 2, 4, 7, 9],
  0.045,
);

/** win, until 2026-08-13. "Sweep and land" - a rise landing on a chord. Blind winner. */
export const PREV_WIN: VoiceSpec = {
  freq: C5,
  ms: 700,
  space: 0.34,
  tail: 1.8,
  warmth: 9000,
  layers: [
    {
      wave: "noise",
      gain: 0.06,
      ms: 340,
      env: { a: 0.2, d: 0.12, s: 0.1, r: 0.12 },
      filter: { type: "bandpass", cutoff: 600, cutoffEnd: 6500, q: 1.6 },
    },
    // The landing, held back until the sweep has almost finished rising.
    ...run(
      struck(C5, 460, "glass", { gain: 0.19, damp: 0.85, space: 0 }),
      [0, 7, 12],
      0.05,
    ).layers.map((l) => ({ ...l, delay: (l.delay ?? 0) + 0.3 })),
  ],
};

/** fail, until 2026-08-13. A soft thud falling a tone and a half. Blind winner. */
export const PREV_FAIL: VoiceSpec = {
  freq: 196,
  ms: 200,
  jitter: 0.5,
  layers: [
    {
      wave: "noise",
      gain: 0.07,
      ms: 40,
      env: { a: 0.002, d: 0.034, s: 0, r: 0.02 },
      filter: { cutoff: 800, cutoffEnd: 200 },
    },
    {
      wave: "sine",
      gain: 0.16,
      glide: -1.5,
      env: { a: 0.004, d: 0.12, s: 0.1, r: 0.12 },
    },
    {
      wave: "triangle",
      ratio: 2,
      gain: 0.04,
      ms: 140,
      env: { a: 0.005, d: 0.1, s: 0.05, r: 0.1 },
    },
  ],
};

/** coin, until 2026-08-13. Two triangles a fifth apart. Blind winner. */
export const PREV_COIN: VoiceSpec = {
  freq: 987.77,
  ms: 110,
  jitter: 1,
  layers: [
    {
      wave: "triangle",
      gain: 0.13,
      ms: 45,
      env: { a: 0.001, d: 0.035, s: 0, r: 0.03 },
    },
    {
      wave: "triangle",
      ratio: 1.5,
      gain: 0.12,
      ms: 90,
      delay: 0.045,
      env: { a: 0.001, d: 0.07, s: 0.05, r: 0.06 },
    },
    {
      wave: "sine",
      ratio: 3,
      gain: 0.03,
      ms: 60,
      delay: 0.045,
      env: { a: 0.001, d: 0.05, s: 0, r: 0.04 },
    },
  ],
};

/** star, until 2026-08-13. "Crystal sparkle" - three high crystal notes. Blind winner. */
export const PREV_STAR: VoiceSpec = run(
  struck(E6, 420, "glass", {
    gain: 0.19,
    damp: 0.9,
    mallet: 0.03,
    malletHz: 7500,
    space: 0.38,
    tail: 2,
  }),
  [0, 7, 12],
  0.075,
);

/**
 * streak, for a few hours on 2026-08-13. Warm metal tine.
 *
 * Never shipped to a player - the ladder was built and wired to nothing on the
 * same day it was re-voiced. It is here as the strip's control arm, which is
 * the one job it has ever had.
 */
export const PREV_STREAK: VoiceSpec = struck(C5, 230, "tine", {
  gain: 0.19,
  damp: 0.82,
  jitter: 0.25,
  space: 0.2,
  tail: 0.8,
  mallet: 0.04,
  malletHz: 2400,
});
