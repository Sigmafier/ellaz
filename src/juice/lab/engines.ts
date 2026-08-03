// Juice Lab - the two audio engines under test.
//
//   RealtimeEngine  (Arm A) builds the oscillator graph live, per note. Cheap to
//                   start, costs CPU on every hit, and cannot afford unison
//                   stacks or convolution reverb on a low-end phone.
//   OfflineEngine   (Arm B) renders each voice ONCE through OfflineAudioContext
//                   at unlock time and replays AudioBuffers. Pitch jitter becomes
//                   a free `playbackRate` change, and the render can afford the
//                   reverb tails and detune stacks the realtime arm skips.
//
// LOUDNESS IS LEVEL-MATCHED, ON PURPOSE. In a blind test the louder arm wins
// almost regardless of what it sounds like, so both engines render every voice
// offline once purely to MEASURE its peak, then apply a trim so every arm hits
// the same target. Arm A uses the offline context as an instrument even though
// it plays live. Without this the tournament would be measuring gain staging.

import { audioPort } from "@sdk/index";
import { jitterRatio, semitonesToRatio, voiceDurationMs, type LayerSpec, type VoiceSpec } from "./specs";

/**
 * Everything is trimmed to this peak, so no arm can win by being louder.
 * Deliberately gentle: refined UI sound sits UNDER the content, and a palette
 * normalised hot reads as toy-like however good the individual voices are.
 */
const TARGET_PEAK = 0.34;

/** Guard against a degenerate render (silence) producing an infinite trim. */
const MAX_TRIM = 8;

export interface PlayOptions {
  /** Transpose the whole voice. Used by chords and by the streak ladder. */
  semitones?: number;
  /** Absolute AudioContext time. Defaults to "now". */
  at?: number;
  /** Extra gain multiplier on top of the level-match trim. */
  gain?: number;
  /** Override the per-play pitch jitter with a fixed ratio (for tests). */
  rate?: number;
}

export interface JuiceEngine {
  readonly name: string;
  /** Prepare buffers / measure levels. Safe to call repeatedly. */
  warm(spec: readonly VoiceSpec[]): Promise<void>;
  play(spec: VoiceSpec, opts?: PlayOptions): void;
  /** AudioContext clock in seconds, or 0 when audio is unavailable. */
  now(): number;
}

// ---------------------------------------------------------------------------
// Context plumbing
// ---------------------------------------------------------------------------

type Ctor = typeof AudioContext;
type OfflineCtor = typeof OfflineAudioContext;

let live: AudioContext | null = null;

function liveCtx(): AudioContext | null {
  if (live) return live;
  try {
    const C =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext;
    if (!C) return null;
    live = new C();
  } catch {
    live = null;
  }
  return live;
}

function offlineCtor(): OfflineCtor | null {
  try {
    return (
      window.OfflineAudioContext ??
      (window as unknown as { webkitOfflineAudioContext?: OfflineCtor }).webkitOfflineAudioContext ??
      null
    );
  } catch {
    return null;
  }
}

/** Resume the shared context. Must be called from inside a user gesture on iOS. */
export function unlockLab(): void {
  const ctx = liveCtx();
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

// ---------------------------------------------------------------------------
// Shared graph construction - the ONE place a VoiceSpec becomes sound
// ---------------------------------------------------------------------------

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();

function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const cached = noiseCache.get(ctx);
  if (cached) return cached;
  const len = Math.max(1, Math.floor(ctx.sampleRate * 2));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  // Deterministic white noise. A fixed sequence means two renders of the same
  // voice are byte-identical, which is what makes the level measurement stable.
  let seed = 0x9e3779b9;
  for (let i = 0; i < len; i++) {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    data[i] = (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  }
  noiseCache.set(ctx, buf);
  return buf;
}

/** An exponentially decaying noise burst - a serviceable room, generated free. */
function impulseResponse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    let seed = 0x85ebca6b ^ (ch * 0x27d4eb2f);
    for (let i = 0; i < len; i++) {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      const white = (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
      data[i] = white * Math.pow(1 - i / len, 3.2);
    }
  }
  return buf;
}

interface BuildOptions {
  rate: number;
  gain: number;
  /** Unison stacks - the offline engine only (N oscillators per note). */
  rich: boolean;
}

// One convolver per distinct tail length, shared by every note that wants that
// room. This is what makes reverb affordable in the realtime arm: the expensive
// object is the impulse response, and it is built once.
const roomCache = new Map<string, ConvolverNode>();

function sharedRoom(ctx: AudioContext, tail: number): ConvolverNode | null {
  const key = tail.toFixed(2);
  const hit = roomCache.get(key);
  if (hit) return hit;
  try {
    const conv = ctx.createConvolver();
    conv.buffer = impulseResponse(ctx, tail);
    conv.connect(ctx.destination);
    roomCache.set(key, conv);
    return conv;
  } catch {
    return null;
  }
}

/**
 * The destination a voice plays into: a dry path plus, when the voice asks for
 * it, a send into a shared room and a warmth shelf across the whole thing.
 * Returns the node layers should connect to.
 */
function voiceBus(ctx: AudioContext, spec: VoiceSpec): AudioNode {
  const bus = ctx.createGain();
  bus.gain.value = 1;

  let out: AudioNode = bus;
  if (spec.warmth) {
    const shelf = ctx.createBiquadFilter();
    shelf.type = "lowpass";
    shelf.frequency.value = spec.warmth;
    shelf.Q.value = 0.7;
    bus.connect(shelf);
    out = shelf;
  }
  out.connect(ctx.destination);

  const space = spec.space ?? 0;
  if (space > 0) {
    const room = sharedRoom(ctx, spec.tail ?? 0.8);
    if (room) {
      const send = ctx.createGain();
      send.gain.value = space;
      out.connect(send);
      send.connect(room);
    }
  }
  return bus;
}

function applyEnvelope(
  g: GainNode,
  layer: LayerSpec,
  when: number,
  lengthS: number,
  peak: number,
): void {
  const { a, d, s, r } = layer.env;
  const floor = 0.0001;
  const sustain = Math.max(floor, peak * s);
  const attackEnd = when + a;
  const decayEnd = attackEnd + d;
  const end = when + lengthS;

  g.gain.setValueAtTime(floor, when);
  g.gain.exponentialRampToValueAtTime(Math.max(floor, peak), attackEnd);
  if (decayEnd < end) {
    g.gain.exponentialRampToValueAtTime(sustain, decayEnd);
    g.gain.setValueAtTime(sustain, end);
  } else {
    g.gain.exponentialRampToValueAtTime(sustain, end);
  }
  g.gain.exponentialRampToValueAtTime(floor, end + Math.max(0.001, r));
}

/**
 * Schedule one voice into `dest`. Shared by both engines so the ONLY differences
 * between Arm A and Arm B are the `rich` flag and when the work happens.
 */
function buildVoice(
  ctx: BaseAudioContext,
  dest: AudioNode,
  spec: VoiceSpec,
  when: number,
  opts: BuildOptions,
): void {
  const baseFreq = spec.freq * opts.rate;

  for (const layer of spec.layers) {
    const start = when + (layer.delay ?? 0);
    const lengthS = (layer.ms ?? spec.ms) / 1000;
    const stopAt = start + lengthS + Math.max(0.001, layer.env.r) + 0.02;

    // Unison: N detuned copies sharing the layer's gain budget, so a stack is
    // WIDER, never LOUDER. Widening is the effect under test; loudness is not.
    const unison = opts.rich ? Math.max(1, Math.round(layer.voices ?? 1)) : 1;
    const spread = layer.spread ?? 0;
    const perVoiceGain = (layer.gain * opts.gain) / unison;

    for (let v = 0; v < unison; v++) {
      const g = ctx.createGain();
      let tail: AudioNode = g;

      if (layer.filter) {
        const f = ctx.createBiquadFilter();
        f.type = layer.filter.type ?? "lowpass";
        f.Q.value = layer.filter.q ?? 1;
        f.frequency.setValueAtTime(layer.filter.cutoff, start);
        if (layer.filter.cutoffEnd !== undefined) {
          f.frequency.exponentialRampToValueAtTime(
            Math.max(20, layer.filter.cutoffEnd),
            start + lengthS,
          );
        }
        g.connect(f);
        tail = f;
      }
      tail.connect(dest);

      applyEnvelope(g, layer, start, lengthS, perVoiceGain);

      if (layer.wave === "noise") {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer(ctx);
        src.loop = true;
        src.connect(g);
        src.start(start);
        src.stop(stopAt);
        // A noise layer has no pitch, so unison would just be N copies of the
        // same samples. One is correct; break rather than stack.
        break;
      }

      const osc = ctx.createOscillator();
      osc.type = layer.wave;
      const freq = baseFreq * (layer.ratio ?? 1);
      osc.frequency.setValueAtTime(freq, start);
      if (layer.glide) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(20, freq * semitonesToRatio(layer.glide)),
          start + lengthS,
        );
      }
      // Spread the stack evenly either side of centre: -spread .. +spread.
      const offset = unison === 1 ? 0 : (v / (unison - 1) - 0.5) * 2 * spread;
      osc.detune.setValueAtTime((layer.detune ?? 0) + offset, start);
      osc.connect(g);
      osc.start(start);
      osc.stop(stopAt);
    }
  }
}

// ---------------------------------------------------------------------------
// Offline render + level measurement
// ---------------------------------------------------------------------------

/**
 * Render a voice offline. Used two ways: by the offline engine to build the
 * buffer it actually plays, and by the realtime engine purely to MEASURE peak
 * so both arms can be level-matched. `rich` (unison stacks) is the only thing
 * that differs between them - space and warmth apply to both, because they are
 * properties of the SOUND, not of the render strategy.
 */
async function renderOffline(spec: VoiceSpec, rich: boolean): Promise<AudioBuffer | null> {
  const OAC = offlineCtor();
  const ctx = liveCtx();
  if (!OAC || !ctx) return null;
  const space = spec.space ?? 0;
  const tail = space > 0 ? (spec.tail ?? 0.8) : 0;
  const seconds = voiceDurationMs({ ...spec, tail }) / 1000 + 0.15;
  try {
    const off = new OAC(2, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    const bus = off.createGain();
    bus.gain.value = 1;

    let out: AudioNode = bus;
    if (spec.warmth) {
      const shelf = off.createBiquadFilter();
      shelf.type = "lowpass";
      shelf.frequency.value = spec.warmth;
      shelf.Q.value = 0.7;
      bus.connect(shelf);
      out = shelf;
    }
    out.connect(off.destination);

    if (tail > 0) {
      const conv = off.createConvolver();
      conv.buffer = impulseResponse(off, tail);
      const send = off.createGain();
      send.gain.value = space;
      out.connect(send);
      send.connect(conv);
      conv.connect(off.destination);
    }

    buildVoice(off, bus, spec, 0, { rate: 1, gain: 1, rich });
    return await off.startRendering();
  } catch {
    return null;
  }
}

function peakOf(buffer: AudioBuffer): number {
  let peak = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      const v = Math.abs(data[i]);
      if (v > peak) peak = v;
    }
  }
  return peak;
}

/** The multiplier that brings this render up (or down) to the shared target. */
function trimFor(peak: number): number {
  if (!Number.isFinite(peak) || peak <= 0.0001) return 1;
  return Math.min(MAX_TRIM, TARGET_PEAK / peak);
}

function scaleBuffer(buffer: AudioBuffer, factor: number): void {
  if (factor === 1) return;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) data[i] *= factor;
  }
}

// ---------------------------------------------------------------------------
// Arm A - realtime layered synth
// ---------------------------------------------------------------------------

class RealtimeEngine implements JuiceEngine {
  readonly name = "realtime";
  private trims = new Map<VoiceSpec, number>();

  now(): number {
    return liveCtx()?.currentTime ?? 0;
  }

  /**
   * Renders each voice offline ONCE purely to measure its peak. Nothing from
   * that render is played - it is a ruler, not a source.
   */
  async warm(specs: readonly VoiceSpec[]): Promise<void> {
    for (const spec of specs) {
      if (this.trims.has(spec)) continue;
      const buf = await renderOffline(spec, false);
      this.trims.set(spec, buf ? trimFor(peakOf(buf)) : 1);
    }
  }

  play(spec: VoiceSpec, opts: PlayOptions = {}): void {
    if (audioPort.muted) return;
    const ctx = liveCtx();
    if (!ctx) return;
    const when = opts.at ?? ctx.currentTime;
    const rate = (opts.rate ?? jitterRatio(spec)) * semitonesToRatio(opts.semitones ?? 0);
    try {
      // Into the voice's own bus (warmth shelf + shared room send), never
      // straight at the destination. A dry note is the main reason synthesised
      // UI sound reads as a beep rather than as an object in a place.
      buildVoice(ctx, voiceBus(ctx, spec), spec, when, {
        rate,
        gain: (this.trims.get(spec) ?? 1) * (opts.gain ?? 1),
        rich: false,
      });
    } catch {
      /* one dropped note is never worth throwing over */
    }
  }
}

// ---------------------------------------------------------------------------
// Arm B - offline-rendered buffers
// ---------------------------------------------------------------------------

class OfflineEngine implements JuiceEngine {
  readonly name = "offline";
  private buffers = new Map<VoiceSpec, AudioBuffer | null>();
  /** Falls back to the realtime arm when OfflineAudioContext is unavailable. */
  private fallback = new RealtimeEngine();

  now(): number {
    return liveCtx()?.currentTime ?? 0;
  }

  async warm(specs: readonly VoiceSpec[]): Promise<void> {
    const missing = specs.filter((s) => !this.buffers.has(s));
    if (missing.length === 0) return;
    for (const spec of missing) {
      const buf = await renderOffline(spec, true);
      if (buf) scaleBuffer(buf, trimFor(peakOf(buf)));
      this.buffers.set(spec, buf);
    }
    // Anything that failed to render still has to make a noise.
    const failed = missing.filter((s) => !this.buffers.get(s));
    if (failed.length > 0) await this.fallback.warm(failed);
  }

  play(spec: VoiceSpec, opts: PlayOptions = {}): void {
    if (audioPort.muted) return;
    const ctx = liveCtx();
    const buf = this.buffers.get(spec);
    if (!ctx || !buf) {
      this.fallback.play(spec, opts);
      return;
    }
    try {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      // Pitch jitter and transposition are one cheap playbackRate change - the
      // structural advantage of having rendered ahead of time.
      src.playbackRate.value =
        (opts.rate ?? jitterRatio(spec)) * semitonesToRatio(opts.semitones ?? 0);
      const g = ctx.createGain();
      g.gain.value = opts.gain ?? 1;
      src.connect(g).connect(ctx.destination);
      src.start(opts.at ?? ctx.currentTime);
    } catch {
      /* ignore a single failed note */
    }
  }
}

export const realtimeEngine: JuiceEngine = new RealtimeEngine();
export const offlineEngine: JuiceEngine = new OfflineEngine();

/** True when the browser can render Arm B at all. Surfaced in the lab header. */
export function offlineSupported(): boolean {
  return offlineCtor() !== null;
}
