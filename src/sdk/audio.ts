import type { AudioPort, SfxName, ToneOptions } from "./types";

// Wave-1 audio: a tiny WebAudio synth for crisp, offline, zero-asset SFX.
// (Howler + audio sprites is the documented upgrade for sampled sound.)
// The AudioContext starts suspended on iOS and is resumed on the first user
// gesture via unlock().
type Tone = { freq: number; dur: number; type: OscillatorType; gain?: number };

const VOICES: Record<SfxName, Tone[]> = {
  tap: [{ freq: 440, dur: 0.06, type: "sine" }],
  flip: [{ freq: 600, dur: 0.07, type: "triangle" }],
  pop: [{ freq: 320, dur: 0.09, type: "square", gain: 0.15 }],
  success: [
    { freq: 660, dur: 0.09, type: "sine" },
    { freq: 880, dur: 0.11, type: "sine" },
  ],
  win: [
    { freq: 523, dur: 0.12, type: "sine" },
    { freq: 659, dur: 0.12, type: "sine" },
    { freq: 784, dur: 0.18, type: "sine" },
  ],
  fail: [{ freq: 180, dur: 0.18, type: "sawtooth", gain: 0.12 }],
};

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
    if (ctx && ctx.state === "suspended") void ctx.resume();
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
    // Schedule the voice's tones against one absolute start so the arpeggio
    // timing is identical whether or not the clock ticks between iterations.
    let when = ctx.currentTime;
    for (const t of VOICES[name]) {
      this.tone({ freq: t.freq, ms: t.dur * 1000, type: t.type, gain: t.gain, at: when });
      when += t.dur * 0.85; // 15% overlap — the tail of one note rings into the next
    }
  }
}

// One shared audio port for the whole app (mute state is global).
export const audioPort: AudioPort = new WebAudioPort();
