// Fetching, decoding and playing the recorded bank.
//
// Everything here is best-effort. A missing file, a refused decode, a browser
// with no Opus - each one falls back to the synth voice for that hit rather
// than producing silence, because a silent table is a worse bug than a
// synthesised one and neither is worth losing a hand over.

import { SAMPLE_ARMS, SAMPLE_GAIN, sampleUrl } from "./samples";

/** Decoded, keyed by file name. Decode once, play many. */
const buffers = new Map<string, AudioBuffer>();
/** In flight, so twenty taps do not start twenty fetches of one file. */
const inflight = new Map<string, Promise<void>>();
/** Files that failed. Never retried in this session - a 404 stays a 404. */
const dead = new Set<string>();

/**
 * Load a file if it is not already here. Fire-and-forget.
 *
 * `decodeAudioData` needs a COMPLETE file, resamples to the context's rate
 * (a 48 kHz source is not 48 kHz in a 44.1 kHz context), and hands back a
 * Float32 buffer whose memory is `duration x rate x channels x 4` - unrelated
 * to the download size. A 3 KB Opus one-shot is roughly 40 KB decoded, which
 * is why this bank is thirty-six short files and not a single long sprite.
 */
export function ensureSample(ctx: AudioContext, file: string): void {
  if (buffers.has(file) || inflight.has(file) || dead.has(file)) return;
  const p = (async () => {
    try {
      const res = await fetch(sampleUrl(file));
      if (!res.ok) throw new Error(String(res.status));
      const bytes = await res.arrayBuffer();
      const buf = await ctx.decodeAudioData(bytes);
      buffers.set(file, buf);
    } catch {
      // A successful fetch does not guarantee a successful decode, and this
      // is where a browser without Opus shows up. Mark it dead and let the
      // synth carry that sound.
      dead.add(file);
    } finally {
      inflight.delete(file);
    }
  })();
  inflight.set(file, p);
}

/** Warm every variant of an arm. Called when an arm is picked or auditioned. */
export function ensureArm(ctx: AudioContext, armId: string): void {
  const arm = SAMPLE_ARMS[armId];
  if (!arm) return;
  for (const f of arm.files) ensureSample(ctx, f);
}

/** How much of an arm is ready, for a screen that wants to say so. */
export function armReady(armId: string): { ready: number; total: number } {
  const arm = SAMPLE_ARMS[armId];
  if (!arm) return { ready: 0, total: 0 };
  return { ready: arm.files.filter((f) => buffers.has(f)).length, total: arm.files.length };
}

/** Last variant played per arm, so the same take never lands twice running. */
const lastPlayed = new Map<string, string>();

function pickVariant(armId: string, files: readonly string[]): string | null {
  const ready = files.filter((f) => buffers.has(f));
  if (ready.length === 0) return null;
  if (ready.length === 1) return ready[0];
  // Not `Math.random()` alone: an immediate repeat is the most audible failure
  // a variant system has, and at four takes a naive draw repeats a quarter of
  // the time. Draw from everything EXCEPT the last one.
  //
  // Keyed by FILE NAME rather than by index, because `ready` grows as the
  // bank decodes - an index stored against a three-file `ready` means a
  // different take once the fourth arrives, which is a stale-key bug that
  // shows up only as the occasional repeat nobody can reproduce.
  const last = lastPlayed.get(armId);
  const pool = ready.filter((f) => f !== last);
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  lastPlayed.set(armId, chosen);
  return chosen;
}

export interface SamplePlayOptions {
  /** Extra gain on top of the level-matching gain. */
  gain?: number;
  /** Extra pitch offset in semitones, on top of the per-play wobble. */
  semitones?: number;
}

/**
 * Play one variant of an arm. Returns false if nothing was ready, so the
 * caller can fall back to the synth voice for THIS hit instead of dropping it.
 *
 * The pitch wobble is not decoration either. Middleware does exactly this for
 * exactly this reason: even with six takes, an unvaried playback rate makes a
 * card slide read as a sample being retriggered. +/- 0.9 semitones is small
 * enough that a chip still sounds like the same chip.
 */
export function playSample(ctx: AudioContext, armId: string, o: SamplePlayOptions = {}): boolean {
  const arm = SAMPLE_ARMS[armId];
  if (!arm) return false;
  const file = pickVariant(armId, arm.files);
  if (!file) {
    // Nothing decoded yet - start it, and let the synth cover this one.
    ensureArm(ctx, armId);
    return false;
  }
  try {
    const buf = buffers.get(file);
    if (!buf) return false;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const wobble = (Math.random() * 2 - 1) * 0.9 + (o.semitones ?? 0);
    src.playbackRate.value = 2 ** (wobble / 12);
    const g = ctx.createGain();
    // The measured level-match, so a recorded arm and a synth arm in the same
    // strip are a comparison of CHARACTER and not of loudness.
    g.gain.value = (SAMPLE_GAIN[file] ?? 1) * (o.gain ?? 1);
    src.connect(g);
    // Straight to the destination, dry. These recordings already have a room
    // in them; sending them through the synth reverb would put the table in
    // two rooms at once.
    g.connect(ctx.destination);
    src.start();
    src.onended = () => {
      try {
        src.disconnect();
        g.disconnect();
      } catch {
        /* already gone */
      }
    };
    return true;
  } catch {
    return false;
  }
}
