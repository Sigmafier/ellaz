// Music Box - pure logic for the tap-a-square, hear-a-tune toy.
//
// WHAT THIS IS, AND WHAT IT IS NOT. There is already a game in this catalogue
// that makes musical notes - `echo`, the repeat-after-me one - and this is
// deliberately its opposite in every mechanic that matters:
//
//   echo                              music
//   ----                              -----
//   the app plays, you copy           you play, and nothing is ever wrong
//   a pattern to get RIGHT            a tune to MAKE
//   the notes are the question        the notes are the answer
//   the run ends when you miss        there is no run and no ending
//   it tests memory                   it tests nothing
//
// It is the first game in the `create` section, which has been declared in
// `CATEGORY_ORDER` and empty since the catalogue was written.
//
// THE RECORD MEASURES SIZE, NEVER QUALITY. `coloring` is the one game here with
// no record at all, because ranking a child's drawing is the opposite of this
// platform's premise - and a tune is a drawing. So what is counted is how many
// notes are in the biggest thing they have built, which is a fact about the
// making rather than a judgement of the made. Same shape as `pet`, whose record
// is only ever how big the creature grew.
//
// EVERY TAP SOUNDS GOOD. The scale is `PENTATONIC` from `@shared/notes`, which
// has no semitone and no tritone in it - so any handful of these notes, in any
// order, is consonant. That is why chords are allowed and why nothing here
// needs a rule about which note may follow which. The scale does the work a
// grown-up would otherwise have to.
//
// NOTHING HERE KNOWS WHAT A SOUND IS. This file deals in row indices and
// frequencies; which oscillator plays them, how loudly and how fast is the
// renderer's business, and `voice` is an ID rather than a waveform for exactly
// that reason.
//
// NOTHING HERE CAN ONLY BE LEFT BY A TIMER, which is what makes the whole state
// safe to write to disk: whether the tune is PLAYING, and where the playhead
// is, live in the renderer and never reach `TuneState`. See
// session-snapshot-convention.md for the memory bug that rule was written from.
//
// PURE: no DOM, no React, no Phaser. The `rng` parameter goes LAST and defaults
// to `Math.random`. Imports are DIRECT module paths rather than the `@shared`
// barrel, which re-exports React components.
import { PENTATONIC } from "@shared/notes";
import { randInt } from "@shared/rng";

/* ------------------------------------------------------------------- notes */

/** One row per note the shared scale offers. The grid IS the scale. */
export const ROWS = PENTATONIC.length;

/**
 * The note a row plays. Row 0 is the TOP row and the HIGHEST note.
 *
 * Upside down is the one way this could be wrong and still work: every square
 * would make a sound, every test about counting notes would pass, and the only
 * symptom would be that the picture disagrees with the music. So it is pinned.
 */
export function pitchFor(row: number): number {
  if (!Number.isInteger(row) || row < 0 || row >= ROWS) {
    throw new Error(`music: no note for row ${row}`);
  }
  return PENTATONIC[ROWS - 1 - row];
}

/* ------------------------------------------------------------------ voices */

/**
 * What the tune is played WITH, as an id.
 *
 * Three, because three is what fits across the bottom of a phone as buttons big
 * enough for a four-year-old. The renderer maps each to a waveform and a
 * loudness; nothing here knows or cares what a waveform is.
 */
export type Voice = "round" | "soft" | "bright";

export const VOICES: readonly Voice[] = ["round", "soft", "bright"];

export function isVoice(value: unknown): value is Voice {
  return typeof value === "string" && (VOICES as readonly string[]).includes(value);
}

/* ------------------------------------------------------------------ length */

export type Length = "short" | "medium" | "long";

export const LENGTHS: readonly Length[] = ["short", "medium", "long"];

/**
 * How many beats long a tune is.
 *
 * THE LEVER IS LENGTH, and there is nothing else to turn: this game has no
 * difficulty because it has no way to be wrong. Eight is the ceiling because
 * eight columns across a 390px phone leaves squares a small finger can hit;
 * sixteen would be a nicer phrase and a worse toy.
 */
export const STEPS: Record<Length, number> = { short: 4, medium: 6, long: 8 };

/* ------------------------------------------------------------------- state */

export interface TuneState {
  level: Length;
  /** Columns. Always `STEPS[level]`; carried so nothing has to look it up. */
  steps: number;
  /** Row-major, `ROWS * steps` long. */
  cells: boolean[];
  voice: Voice;
}

export type ToggleOutcome =
  | { kind: "ignored" }
  | { kind: "on"; row: number; col: number }
  | { kind: "off"; row: number; col: number };

export function cellIndex(row: number, col: number, steps: number): number {
  return row * steps + col;
}

export function newTune(level: Length = "medium", voice: Voice = "round"): TuneState {
  return {
    level,
    steps: STEPS[level],
    cells: Array(ROWS * STEPS[level]).fill(false),
    voice,
  };
}

export function noteCount(state: TuneState): number {
  return state.cells.reduce((n, on) => (on ? n + 1 : n), 0);
}

/** Turn one square on, or off again. Nothing else in the tune moves. */
export function toggleCell(
  state: TuneState,
  index: number,
): { state: TuneState; outcome: ToggleOutcome } {
  if (!Number.isInteger(index) || index < 0 || index >= state.cells.length) {
    return { state, outcome: { kind: "ignored" } };
  }
  const cells = [...state.cells];
  cells[index] = !cells[index];
  return {
    state: { ...state, cells },
    outcome: {
      kind: cells[index] ? "on" : "off",
      row: Math.floor(index / state.steps),
      col: index % state.steps,
    },
  };
}

/**
 * Which rows ring on this beat, TOP FIRST.
 *
 * The order is fixed rather than incidental so a chord always arrives at the
 * speakers the same way round - two runs of the same tune that differ in the
 * order their notes are scheduled do not sound identical, and a toy that plays
 * slightly differently each time reads as broken.
 */
export function columnRows(state: TuneState, col: number): number[] {
  if (!Number.isInteger(col) || col < 0 || col >= state.steps) return [];
  const out: number[] = [];
  for (let row = 0; row < ROWS; row++) {
    if (state.cells[cellIndex(row, col, state.steps)]) out.push(row);
  }
  return out;
}

/**
 * Make the tune longer or shorter, KEEPING every note that still fits.
 *
 * Every other game in this catalogue treats a level change as a fresh start,
 * and that is right for a puzzle. It is wrong here: the tune is the thing a
 * child made, and throwing it away to add two beats is the same mistake as
 * ranking their drawing. Notes past the new end are dropped, which is the only
 * honest thing to do with them.
 */
export function resize(state: TuneState, level: Length): TuneState {
  const steps = STEPS[level];
  if (steps === state.steps) return { ...state, level };
  const cells = Array(ROWS * steps).fill(false);
  const keep = Math.min(steps, state.steps);
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < keep; col++) {
      cells[cellIndex(row, col, steps)] = state.cells[cellIndex(row, col, state.steps)];
    }
  }
  return { ...state, level, steps, cells };
}

export function clearTune(state: TuneState): TuneState {
  return { ...state, cells: Array(state.cells.length).fill(false) };
}

export function setVoice(state: TuneState, voice: Voice): TuneState {
  if (!isVoice(voice) || voice === state.voice) return state;
  return { ...state, voice };
}

/**
 * Scatter a tune to start from: exactly one note in every column.
 *
 * The blank-page problem, and it is a real one for somebody who is four - an
 * empty grid is not an invitation, it is a shrug. One note per column is a
 * MELODY rather than a texture, which is the shape a child can then hear
 * themselves changing. It REPLACES rather than adds, so tapping it twice is
 * two fresh tunes and never a slowly filling grid.
 */
export function surprise(state: TuneState, rng: () => number = Math.random): TuneState {
  const cells = Array(state.cells.length).fill(false);
  for (let col = 0; col < state.steps; col++) {
    cells[cellIndex(randInt(0, ROWS - 1, rng), col, state.steps)] = true;
  }
  return { ...state, cells };
}

/* -------------------------------------------------------------- reporting */

/** A coin every this many notes. See `milestoneStep`. */
export const MILESTONE_EVERY = 6;

/**
 * Which milestone a tune of `notes` notes has reached.
 *
 * A pure function of the count, and the count can go DOWN - erasing four notes
 * walks it back. So this is NOT a ledger of what has been paid for, and a
 * caller that treated it as one would pay again for every note re-added after
 * an erase. The renderer keeps the highest step it has ever paid and persists
 * it, which is the only place that fact can safely live.
 */
export function milestoneStep(notes: number): number {
  return Math.floor(notes / MILESTONE_EVERY);
}

/**
 * What this tune's record MEASURES, in the shape `ctx.score` wants.
 *
 * A VALUE and a UNIT and never a direction - `src/sdk/score.ts` decides that
 * points rank high, so a game cannot order its own board backwards. `board`
 * scopes it to a length, because filling four beats and filling eight are not
 * the same achievement.
 */
export function scoreReport(
  state: TuneState,
  board: Length,
): { value: number; unit: "points"; board: string } {
  return { value: noteCount(state), unit: "points", board };
}
