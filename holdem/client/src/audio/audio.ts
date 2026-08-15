// The thin audio port: one shared AudioContext, mute persisted, unlock inside
// a user gesture (iOS), voices level-matched by warmVoices on unlock. The
// ellaz WebAudioPort pattern with the lab/override machinery removed.

import { POKER_VOICES, type SfxName } from "./pokerVoices";
import { loadOverrides } from "./voiceOverride";
import { isWarm, playVoice, warmVoices } from "./voiceEngine";

const MUTE_KEY = "holdem:muted";

let ctx: AudioContext | null = null;
let muted = loadMuted();
let warmed = false;

function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(v: boolean): void {
  muted = v;
  try {
    localStorage.setItem(MUTE_KEY, v ? "1" : "0");
  } catch {
    /* incognito */
  }
  // Mute means mute. The unsilencer is inaudible, but a page that holds an
  // audio session open is a page the phone shows as playing something — and
  // being listed as playing media by an app you have just muted is its own
  // small betrayal.
  if (v) unsilencer?.pause();
  else unsilence();
}

function ensureCtx(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch {
    return null;
  }
  return ctx;
}

/**
 * A short piece of silence, as a real media file.
 *
 * ON iOS, WEBAUDIO PLAYS THROUGH THE RINGER CHANNEL, so the hardware side
 * switch silences the whole game while every line of code reports success:
 * the context is `running`, every node connects, `onended` fires on time, and
 * nothing anywhere is in an error state. It is undetectable from JavaScript
 * and it is the single most likely reason a phone hears nothing.
 *
 * An `<audio>` element that is actually playing moves the page's audio session
 * to media playback, and WebAudio follows it there. So this is a few hundred
 * bytes of nothing, on a loop, whose only job is to change which volume
 * control the game answers to.
 *
 * Built rather than pasted: a base64 WAV is 1.1 KB of a literal nobody can
 * read or check, and this is a header a person can follow.
 */
function silentWavUrl(): string {
  const n = 800; // 0.1s at 8kHz, 8-bit mono — the smallest thing every browser decodes
  const buf = new ArrayBuffer(44 + n);
  const v = new DataView(buf);
  const ascii = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(at + i, s.charCodeAt(i));
  };
  ascii(0, "RIFF");
  v.setUint32(4, 36 + n, true);
  ascii(8, "WAVEfmt ");
  v.setUint32(16, 16, true); // fmt chunk size
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, 8000, true); // sample rate
  v.setUint32(28, 8000, true); // byte rate
  v.setUint16(32, 1, true); // block align
  v.setUint16(34, 8, true); // bits
  ascii(36, "data");
  v.setUint32(40, n, true);
  // 128 is silence for unsigned 8-bit, not 0. Zero is a full-scale click.
  new Uint8Array(buf, 44).fill(128);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

let unsilencer: HTMLAudioElement | null = null;

function unsilence(): void {
  if (muted) return;
  try {
    if (!unsilencer) {
      unsilencer = new Audio(silentWavUrl());
      unsilencer.loop = true;
      unsilencer.volume = 0.001;
      // Without this an iPhone takes the page full-screen for the "video".
      unsilencer.setAttribute("playsinline", "");
    }
    if (unsilencer.paused) void unsilencer.play().catch(() => {});
  } catch {
    /* nothing here is allowed to cost a hand */
  }
}

/** Must be called from inside a user gesture at least once (iOS unlock). */
export function unlock(): void {
  const c = ensureCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  unsilence();
  if (!warmed) {
    warmed = true;
    // The picked voices are warmed alongside the built-ins rather than after
    // them, so a session that opens on a lab pick is level-matched from its
    // first sound instead of its second.
    const picked = Object.values(loadOverrides());
    void warmVoices(c, [...Object.values(POKER_VOICES), ...picked]).catch(() => {
      /* level matching is best-effort */
    });
  }
}

/**
 * What the audio layer is actually doing, for a screen to show.
 *
 * There is no way to ask a browser "will the next sound be audible", and on a
 * phone that is exactly the question. This answers the part that IS knowable,
 * so a report from a device nobody here can hold says something checkable
 * instead of "no sound".
 */
export function audioState(): { ctx: "none" | "suspended" | "running" | "closed"; unsilenced: boolean; muted: boolean } {
  return {
    ctx: ctx ? (ctx.state as "suspended" | "running" | "closed") : "none",
    unsilenced: Boolean(unsilencer && !unsilencer.paused),
    muted,
  };
}

/**
 * Keep the audio alive, rather than unlocking it once and hoping.
 *
 * THIS USED TO REMOVE ITSELF after the first tap, and that is why a phone goes
 * quiet halfway through an evening. iOS suspends the context whenever the app
 * is backgrounded — a call, a glance at a message, the screen locking — and
 * nothing resumed it, so every sound after that was dropped by the
 * `state !== "running"` guard in `play()` for the rest of the session. It was
 * not one missing sound; it was all of them, permanently, after an ordinary
 * interruption.
 *
 * Resuming an already-running context is a no-op, so the cost of asking on
 * every gesture is nothing and the cost of asking once was the feature.
 */
export function attachUnlockOnFirstGesture(): void {
  const wake = () => unlock();
  window.addEventListener("pointerdown", wake, { passive: true });
  window.addEventListener("keydown", wake);
  // `touchend` as well as `pointerdown`: older iOS Safari does not treat a
  // pointer event as the gesture that permits audio, and it is the platform
  // this whole function exists for.
  window.addEventListener("touchend", wake, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") wake();
  });
}

export interface PlayOptions {
  semitones?: number;
  gain?: number;
}

export function play(name: SfxName, opts: PlayOptions = {}): void {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  if (c.state !== "running") {
    // This sound is lost either way — a suspended context schedules into a
    // clock that is not running. But ASKING here is what gets the next one
    // back, on a phone that came out of the background without a tap to wake
    // it. Silently returning is how one interruption became a silent evening.
    void c.resume();
    return;
  }
  try {
    // A voice picked in the lab plays HERE, through the same call every game
    // event makes. That is the whole point of the lab: what you hear while
    // choosing is what the table will play, not a preview that can disagree
    // with it.
    const spec = loadOverrides()[name] ?? POKER_VOICES[name];
    // A picked voice has never been through the level-matcher, so it would
    // play at trim 1 against a palette that has been trimmed - which is
    // exactly the comparison the lab exists to make. Warm it once, in the
    // background; until it resolves it plays untrimmed, same as the very first
    // sound of any session.
    if (!isWarm(spec)) void warmVoices(c, [spec]).catch(() => {});
    playVoice(c, spec, opts);
  } catch {
    /* a failed sound must never break gameplay */
  }
}

export type { SfxName };
