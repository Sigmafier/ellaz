// "Follow Me" - pure logic.
//
// The repeat-the-pattern BRAIN is `@shared/sequence`, which already owns what
// the pattern IS and whether the player got it right, and is tested there. This
// file owns only what that machine deliberately leaves to a game: how many pads
// a level has, what a pad looks and sounds like, and the playback schedule as
// DATA the renderer merely plays back.
//
// PURE: no DOM, no React, no timers, no audio. Imports go to the DIRECT shared
// modules, never the `@shared` barrel, because the barrel re-exports React
// components and a pure logic module must not reach them.
import { PENTATONIC } from "@shared/notes";
import type { Locale } from "@i18n/index";

/** Level ids double as reward tiers - the union is identical by design. */
export type LevelId = "easy" | "medium" | "hard";

export interface Level {
  id: LevelId;
  /** How many pads are on the board. */
  pads: number;
  /** Grid columns. 5 pads on 3 columns leaves one gap in the last row. */
  cols: number;
}

export const LEVELS: readonly Level[] = [
  { id: "easy", pads: 4, cols: 2 },
  { id: "medium", pads: 5, cols: 3 },
  { id: "hard", pads: 6, cols: 3 },
] as const;

export function levelById(id: LevelId): Level {
  const found = LEVELS.find((l) => l.id === id);
  if (!found) throw new Error(`[ellaz] unknown level ${id}`);
  return found;
}

export interface Pad {
  /** Fill colour. NEVER the only cue - see `glyph`. */
  color: string;
  /**
   * A shape drawn on the pad. Load-bearing, not decoration: this is a
   * colour-matching game, and a colour-blind child must still be able to tell
   * two pads apart. Shape plus fixed grid position give two non-colour cues.
   */
  glyph: string;
  /** Spoken/read label, so the aria-label never says "button 3". */
  name: Record<Locale, string>;
}

/**
 * Six pads, ordered. A level takes the first N, so pad 0 is the same pad at
 * every difficulty and a child who learns "top-left is the star" keeps that.
 */
export const PADS: readonly Pad[] = [
  { color: "#e17055", glyph: "★", name: { he: "כוכב", en: "star" } },
  { color: "#0984e3", glyph: "●", name: { he: "עיגול", en: "circle" } },
  { color: "#00b894", glyph: "▲", name: { he: "משולש", en: "triangle" } },
  { color: "#fdcb6e", glyph: "■", name: { he: "ריבוע", en: "square" } },
  { color: "#a29bfe", glyph: "◆", name: { he: "יהלום", en: "diamond" } },
  { color: "#fd79a8", glyph: "♥", name: { he: "לב", en: "heart" } },
] as const;

/**
 * The pitch a pad sings, in Hz.
 *
 * Straight off the pentatonic scale, index-aligned with `PADS`: a pentatonic
 * has no semitone and no tritone, so a child mashing pads in any order still
 * sounds musical and no press can be "the wrong note".
 */
export function padTone(pad: number): number {
  if (!Number.isInteger(pad) || pad < 0 || pad >= PENTATONIC.length) {
    throw new Error(`[ellaz] no tone for pad ${pad}`);
  }
  return PENTATONIC[pad];
}

/**
 * The sound of a miss: low, soft, and deliberately NOT part of the scale used
 * for the pads, so it reads as "that one was different" rather than as a buzzer.
 * This platform has no losing, so nothing here is a punishment sound.
 */
export const MISS_FREQ = 155.56; // Eb3

/** How often an endless run pays a milestone. Every third round cleared. */
export const MILESTONE_EVERY = 3;

export function isMilestoneRound(round: number): boolean {
  return round > 0 && round % MILESTONE_EVERY === 0;
}

// --- Playback schedule -----------------------------------------------------
//
// All in milliseconds, all relative to "the moment playback started". The
// renderer turns these into timeouts; nothing here touches a clock, so the
// schedule is inspectable and testable as plain data.

/** Quiet beat before the first flash, so the child is looking when it starts. */
export const LEAD_IN_MS = 550;
/** Flash length at round 1. */
export const FLASH_MAX_MS = 460;
/** Flash length never drops below this, however long the pattern gets. */
export const FLASH_MIN_MS = 260;
/** Dark gap between two flashes - what makes "pad 2 twice" readable as two. */
export const GAP_MS = 170;
/**
 * The beat between the last flash and the first accepted press. Without it the
 * child's own first tap lands while the machine's last flash is still fading,
 * and the two read as one event.
 */
export const SETTLE_MS = 450;
/** How long the child's own press lights its pad. */
export const PRESS_FLASH_MS = 220;
/** Pause after a cleared round before the next, longer pattern plays. */
export const ROUND_GAP_MS = 800;

/**
 * Flashes shorten as the pattern grows, so round 12 does not take half a
 * minute to watch - but never below `FLASH_MIN_MS`, which is the floor at which
 * a flash is still comfortably visible.
 */
export function flashMsFor(round: number): number {
  const shrunk = FLASH_MAX_MS - Math.max(0, round - 1) * 18;
  return Math.min(FLASH_MAX_MS, Math.max(FLASH_MIN_MS, shrunk));
}

export interface FlashStep {
  pad: number;
  /** When to light it, ms after playback started. */
  atMs: number;
  /** How long it stays lit. */
  ms: number;
  /** The pitch to play with it. Sound is a SECOND channel, never the only one. */
  freq: number;
}

export interface Playback {
  steps: FlashStep[];
  /** When the last flash goes dark. */
  endsAtMs: number;
  /** When presses start being accepted - one settle beat after the last flash. */
  inputAtMs: number;
}

/**
 * Turn a pattern into a schedule. Steps are strictly ordered and never overlap:
 * step i+1 starts a full `GAP_MS` after step i went dark.
 */
export function buildPlayback(pattern: readonly number[], round = pattern.length): Playback {
  const ms = flashMsFor(round);
  const stride = ms + GAP_MS;
  const steps: FlashStep[] = pattern.map((pad, i) => ({
    pad,
    atMs: LEAD_IN_MS + i * stride,
    ms,
    freq: padTone(pad),
  }));
  const last = steps[steps.length - 1];
  const endsAtMs = last ? last.atMs + last.ms : LEAD_IN_MS;
  return { steps, endsAtMs, inputAtMs: endsAtMs + SETTLE_MS };
}
