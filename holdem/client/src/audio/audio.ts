// The thin audio port: one shared AudioContext, mute persisted, unlock inside
// a user gesture (iOS), voices level-matched by warmVoices on unlock. The
// ellaz WebAudioPort pattern with the lab/override machinery removed.

import { POKER_VOICES, type SfxName } from "./pokerVoices";
import { playVoice, warmVoices } from "./voiceEngine";

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

/** Must be called from inside a user gesture at least once (iOS unlock). */
export function unlock(): void {
  const c = ensureCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  if (!warmed) {
    warmed = true;
    void warmVoices(c, Object.values(POKER_VOICES)).catch(() => {
      /* level matching is best-effort */
    });
  }
}

export function attachUnlockOnFirstGesture(): void {
  const once = () => {
    unlock();
    window.removeEventListener("pointerdown", once);
    window.removeEventListener("keydown", once);
  };
  window.addEventListener("pointerdown", once);
  window.addEventListener("keydown", once);
}

export interface PlayOptions {
  semitones?: number;
  gain?: number;
}

export function play(name: SfxName, opts: PlayOptions = {}): void {
  if (muted) return;
  const c = ensureCtx();
  if (!c || c.state !== "running") return;
  try {
    playVoice(c, POKER_VOICES[name], opts);
  } catch {
    /* a failed sound must never break gameplay */
  }
}

export type { SfxName };
