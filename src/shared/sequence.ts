// The repeat-the-pattern state machine (Simon-style), shared by `echo` and by
// the pattern games that come after it.
//
// PURE: no React, no DOM, no timers, no audio. The renderer owns WHEN the
// pattern is shown and WHAT a pad looks and sounds like; this file owns only
// what the pattern IS and whether the player got it right. That split is what
// makes the rules unit-testable in the node environment, and what lets a DOM
// game and a Phaser game share one brain.
//
// Every function is NON-MUTATING: it returns a new state, or the SAME state
// object when the input should be ignored (which a renderer can use as a cheap
// "nothing changed" check).
import { randInt } from "./rng";

export type Phase = "idle" | "showing" | "input" | "won" | "lost";

export interface SeqState {
  /** Pad indexes, in the order they must be repeated. */
  pattern: number[];
  phase: Phase;
  /** How many pads of `pattern` the player has correctly entered this round. */
  cursor: number;
  /** 1 for the first round. `pattern.length` equals `round`. */
  round: number;
}

/** The one state before any round has started. */
export const IDLE: SeqState = Object.freeze({ pattern: [], phase: "idle", cursor: 0, round: 0 });

/**
 * Start the next round: APPENDS one random step to the previous pattern.
 *
 * Pass `null` (or `IDLE`) to begin a fresh run. Note it appends to whatever it
 * is given, including a `lost` state — a game that wants "try again from one
 * pad" passes `null`, and a game that wants "retry this same length" keeps its
 * own copy. Returns `phase: "showing"`; call `beginInput` when the playback
 * animation finishes.
 */
export function startRound(
  prev: SeqState | null,
  padCount: number,
  rng: () => number = Math.random,
): SeqState {
  if (!Number.isInteger(padCount) || padCount < 1) {
    throw new Error(`[ellaz] padCount must be a positive integer, got ${padCount}`);
  }
  const base = prev ?? IDLE;
  return {
    pattern: [...base.pattern, randInt(0, padCount - 1, rng)],
    phase: "showing",
    cursor: 0,
    round: base.round + 1,
  };
}

/**
 * Playback finished — the player may now tap. No-op (same state) unless we are
 * in `showing`, so a late timer firing after a loss cannot re-open input.
 */
export function beginInput(s: SeqState): SeqState {
  if (s.phase !== "showing") return s;
  return { ...s, phase: "input" };
}

/**
 * The player tapped a pad.
 *
 * Wrong pad -> `lost`. Last correct pad -> `won`. Any press while not in
 * `input` is IGNORED and returns the identical state object, so a mistap during
 * playback (or after the round is already decided) costs nothing.
 */
export function pressPad(s: SeqState, pad: number): SeqState {
  if (s.phase !== "input") return s;
  if (pad !== s.pattern[s.cursor]) return { ...s, phase: "lost" };
  const cursor = s.cursor + 1;
  return { ...s, cursor, phase: cursor >= s.pattern.length ? "won" : "input" };
}

/** Has the whole pattern been entered correctly? */
export function isComplete(s: SeqState): boolean {
  return s.pattern.length > 0 && s.cursor >= s.pattern.length;
}
