// Turning a VoiceSpec into sound. The ONE place that touches WebAudio nodes.
//
// This never creates an AudioContext - `audio.ts` owns the single shared one and
// passes it in. Two contexts in one app is its own bug: they have separate
// clocks, so `time()` stops lining up with when a scheduled note actually plays,
// and iOS counts them both against a per-page limit.
//
// The lab shipped two engines because it was comparing them (realtime graph vs
// pre-rendered buffers). Only the realtime path survives: it plays every winning
// voice, including their reverb, because the expensive object in a convolution
// is the impulse response and that is built once per tail length and shared.

import {
  jitterRatio,
  semitonesToRatio,
  voiceDurationMs,
  type LayerSpec,
  type VoiceSpec,
} from "./voice";

/**
 * Every voice is trimmed to this peak.
 *
 * NOT a tournament artefact, though that is where it came from. The operator
 * judged all six voices at matched loudness, so shipping them untrimmed would
 * ship a palette whose relative balance nobody has ever heard - a long reverbed
 * star against a 60ms tap is a ~4x peak difference from the raw specs alone.
 *
 * Deliberately gentle: UI sound sits UNDER the content, and a palette normalised
 * hot reads as toy-like however good the individual voices are.
 */
const TARGET_PEAK = 0.34;

/** Guard against a degenerate render (silence) producing an infinite trim. */
const MAX_TRIM = 8;

export interface PlayVoiceOptions {
  /** Transpose the whole voice, in semitones. */
  semitones?: number;
  /** Absolute AudioContext time. Defaults to now. */
  at?: number;
  /** Extra gain multiplier on top of the level-match trim. */
  gain?: number;
  /** Override the per-play pitch jitter with a fixed ratio. Tests only. */
  rate?: number;
}

// ---------------------------------------------------------------------------
// Shared, cached graph pieces
// ---------------------------------------------------------------------------

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();

function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const cached = noiseCache.get(ctx);
  if (cached) return cached;
  const len = Math.max(1, Math.floor(ctx.sampleRate * 2));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  // Deterministic white noise. A fixed sequence means two renders of the same
  // voice are byte-identical, which is what makes the peak measurement stable -
  // otherwise the trim would wobble per session and so would the balance.
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

// One convolver per distinct tail length per context, shared by every note that
// wants that room. This is what makes reverb affordable at all: a convolver per
// note would be ruinous, a convolver per tail length is four nodes for the whole
// app.
const roomCache = new WeakMap<AudioContext, Map<string, ConvolverNode>>();

function sharedRoom(ctx: AudioContext, tail: number): ConvolverNode | null {
  let rooms = roomCache.get(ctx);
  if (!rooms) {
    rooms = new Map();
    roomCache.set(ctx, rooms);
  }
  const key = tail.toFixed(2);
  const hit = rooms.get(key);
  if (hit) return hit;
  try {
    const conv = ctx.createConvolver();
    conv.buffer = impulseResponse(ctx, tail);
    conv.connect(ctx.destination);
    rooms.set(key, conv);
    return conv;
  } catch {
    return null;
  }
}

/**
 * The destination a voice plays into: a dry path, a warmth shelf across the
 * whole thing, and - when the voice asks for it - a send into the shared room.
 * Returns the node the layers should connect to.
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
  // Exponential ramps can never touch 0 - 0.0001 is the conventional floor.
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

/** Schedule one voice into `dest`. Shared by live playback and the peak render. */
function buildVoice(
  ctx: BaseAudioContext,
  dest: AudioNode,
  spec: VoiceSpec,
  when: number,
  rate: number,
  gain: number,
): void {
  const baseFreq = spec.freq * rate;

  for (const layer of spec.layers) {
    const start = when + (layer.delay ?? 0);
    const lengthS = (layer.ms ?? spec.ms) / 1000;
    const stopAt = start + lengthS + Math.max(0.001, layer.env.r) + 0.02;

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

    applyEnvelope(g, layer, start, lengthS, layer.gain * gain);

    if (layer.wave === "noise") {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx);
      src.loop = true;
      src.connect(g);
      src.start(start);
      src.stop(stopAt);
      continue;
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
    osc.detune.setValueAtTime(layer.detune ?? 0, start);
    osc.connect(g);
    osc.start(start);
    osc.stop(stopAt);
  }
}

// ---------------------------------------------------------------------------
// Level matching
// ---------------------------------------------------------------------------

const trims = new WeakMap<VoiceSpec, number>();

function offlineCtor(): typeof OfflineAudioContext | null {
  try {
    return (
      window.OfflineAudioContext ??
      (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
        .webkitOfflineAudioContext ??
      null
    );
  } catch {
    return null;
  }
}

/**
 * Render a voice offline purely to MEASURE it. Nothing from this render is ever
 * played - it is a ruler, not a source.
 */
async function measurePeak(ctx: AudioContext, spec: VoiceSpec): Promise<number> {
  const OAC = offlineCtor();
  if (!OAC) return 0;
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

    buildVoice(off, bus, spec, 0, 1, 1);
    const buffer = await off.startRendering();

    let peak = 0;
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const v = Math.abs(data[i]);
        if (v > peak) peak = v;
      }
    }
    return peak;
  } catch {
    return 0;
  }
}

/**
 * Measure every voice once so the palette is level-matched. Fire-and-forget from
 * `unlock()`: until it resolves each voice plays at trim 1, which is the right
 * failure - slightly uneven for the first few hundred ms beats silent, and beats
 * blocking the gesture that unlocked audio in the first place.
 */
export async function warmVoices(ctx: AudioContext, specs: readonly VoiceSpec[]): Promise<void> {
  for (const spec of specs) {
    if (trims.has(spec)) continue;
    const peak = await measurePeak(ctx, spec);
    const trim =
      !Number.isFinite(peak) || peak <= 0.0001 ? 1 : Math.min(MAX_TRIM, TARGET_PEAK / peak);
    trims.set(spec, trim);
  }
}

/** True once this voice has been measured. Exposed so tests can assert warming. */
export function isWarm(spec: VoiceSpec): boolean {
  return trims.has(spec);
}

export function playVoice(ctx: AudioContext, spec: VoiceSpec, opts: PlayVoiceOptions = {}): void {
  const when = opts.at ?? ctx.currentTime;
  const rate = (opts.rate ?? jitterRatio(spec)) * semitonesToRatio(opts.semitones ?? 0);
  try {
    // Into the voice's own bus (warmth shelf + room send), never straight at the
    // destination. A dry note is the main reason synthesised UI sound reads as a
    // beep rather than as an object in a place.
    buildVoice(ctx, voiceBus(ctx, spec), spec, when, rate, (trims.get(spec) ?? 1) * (opts.gain ?? 1));
  } catch {
    /* one dropped note is never worth throwing over */
  }
}
