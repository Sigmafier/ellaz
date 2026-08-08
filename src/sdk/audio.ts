import type { AudioPort, SfxName, ToneOptions } from "./types";
import { COIN, FAIL, FLIP, POP, STAR, SUCCESS, TAP, WIN, type VoiceSpec } from "./voice";
import { playVoice, warmVoices } from "./voiceEngine";

// Zero-asset, offline, synthesised SFX. The AudioContext starts suspended on
// iOS and is resumed on the first user gesture via unlock().
//
// Each name maps to a layered VoiceSpec that won a blind round of the Juice Lab
// tournament (see voice.ts). Before that this table held single oscillators -
// one sine for a tap, one sawtooth for a failure - and the whole difference
// between a beep and a designed sound is what the specs now carry: per-partial
// damping, a room, and restraint at the top end.

const VOICES: Record<SfxName, VoiceSpec> = {
  tap: TAP,
  success: SUCCESS,
  win: WIN,
  fail: FAIL,
  coin: COIN,
  star: STAR,
  flip: FLIP,
  pop: POP,
};

/** Every voice, for the one-time level-match. */
const ALL_VOICES = Object.values(VOICES);

const MUTE_KEY = "ellaz:muted";

// Envelope constants — shared by the named SFX table above and by any game
// calling tone() directly, so everything the app plays has one attack shape.
const DEFAULT_MS = 120;
const DEFAULT_GAIN = 0.2;
const ATTACK = 0.008;

class WebAudioPort implements AudioPort {
  private ctx: AudioContext | null = null;
  private _muted: boolean;
  private listeners = new Set<(m: boolean) => void>();
  private warmed = false;

  constructor() {
    let saved = false;
    try {
      saved = localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      /* ignore */
    }
    this._muted = saved;
  }

  get muted() {
    return this._muted;
  }

  private ensureCtx(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  unlock(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    // Level-match the palette, once, off the back of the gesture that unlocked
    // audio. Fire-and-forget on purpose: awaiting it would delay the very tap
    // that triggered it, and an unwarmed voice plays at trim 1 rather than not
    // at all. `warmVoices` is idempotent, so calling unlock() repeatedly (every
    // game does, on every pointerdown) costs one Map lookup per voice.
    if (!this.warmed) {
      this.warmed = true;
      void warmVoices(ctx, ALL_VOICES);
    }
  }

  toggleMute(): void {
    this._muted = !this._muted;
    try {
      localStorage.setItem(MUTE_KEY, this._muted ? "1" : "0");
    } catch {
      /* ignore */
    }
    this.listeners.forEach((cb) => cb(this._muted));
  }

  onMuteChange(cb: (m: boolean) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  time(): number {
    const ctx = this.ensureCtx();
    return ctx ? ctx.currentTime : 0;
  }

  /**
   * The ONE code path that makes sound. `play()` is a table of calls to this, so
   * a change to the envelope moves the named SFX and a game's own scale together.
   */
  tone(opts: ToneOptions): void {
    if (this._muted) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const dur = (opts.ms ?? DEFAULT_MS) / 1000;
    const when = opts.at ?? ctx.currentTime;
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = opts.type ?? "sine";
      osc.frequency.value = opts.freq;
      const peak = opts.gain ?? DEFAULT_GAIN;
      // exponential ramps can never touch 0 — 0.0001 is the conventional floor.
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(peak, when + ATTACK);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      osc.connect(g).connect(ctx.destination);
      osc.start(when);
      osc.stop(when + dur + 0.02);
    } catch {
      /* ignore a single failed tone */
    }
  }

  play(name: SfxName): void {
    if (this._muted) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    // Every layer's timing lives inside the spec as a `delay`, so the whole
    // voice is scheduled against one absolute start. That is what makes a
    // five-note gliss land identically whether or not the clock ticks between
    // layers - the old table stepped `when` forward per note and could drift.
    playVoice(ctx, VOICES[name]);
  }
}

// One shared audio port for the whole app (mute state is global).
export const audioPort: AudioPort = new WebAudioPort();
