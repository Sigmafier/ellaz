// The sound design, as pure data. No WebAudio, no DOM - so it unit-tests without
// a browser, the same split every game uses for its logic.ts.
//
// THE NINE VOICES BELOW WERE ALL PICKED ON 2026-08-13, in the sound lab, with
// the names showing. Six of them replaced a winner of the blind tournament held
// on 2026-08-02 (45 synthesised characters across 6 events, the incumbent
// included unlabelled in every one). Both facts are true and they sound like
// they contradict each other, so keep them straight: a blind round asks which
// sounds better with nothing else to go on, a named pick asks which one belongs
// in this app, and the second question is the one that ships.
//
// `src/lab/voices.ts` records which is which (`VERDICT`, `OVERRODE_BLIND`) and
// `src/lab/previous.ts` holds every superseded spec verbatim. Nothing was lost,
// so nothing needs reconstructing from memory - which is the whole lesson of
// the earlier verdict recorded as "the control won" without saying what the
// control was. See docs/juice-map.md and docs/juice-lab.md.
//
// WHAT MAKES THESE SOUND DESIGNED RATHER THAN SYNTHESISED, in order of how much
// it matters - and only one of the four is the note:
//
//   1. HIGH PARTIALS DECAY FASTER THAN THE FUNDAMENTAL. Strike anything real and
//      its bright modes die first; that is why a struck object sounds struck.
//      One shared envelope across every partial produces an organ tone and the
//      ear hears "synthesiser" instantly. `struck()` damps each partial by
//      ratio^damp. This is the big one - the first palette was rejected without
//      it and accepted with it, on the same notes.
//   2. IT HAPPENS SOMEWHERE. A dry note has no room, and no room reads as cheap
//      however good the pitch is. Every voice carries a little `space`.
//   3. INHARMONICITY. A bell is not 1:2:3. Real partial ratios are what make
//      metal sound like metal rather than like a stack of sines.
//   4. RESTRAINT. Short, quiet, no top-end glare. "Bright" and "expensive" are
//      opposites above about 9kHz, which is what `warmth` exists for.

export type Wave = "sine" | "triangle" | "square" | "sawtooth" | "noise";

/** Attack / decay / sustain-level / release. Seconds, except `s` which is 0..1. */
export interface Envelope {
  a: number;
  d: number;
  s: number;
  r: number;
}

export interface FilterSpec {
  /**
   * Lowpass is the default because most voices want their top end tamed. The
   * other two earn their keep on specific characters: highpass strips the body
   * off a noise burst to leave a crisp mechanical tick, and bandpass turns flat
   * white noise into a struck-mallet transient.
   */
  type?: "lowpass" | "highpass" | "bandpass";
  /** Cutoff in Hz at note start. */
  cutoff: number;
  /** Cutoff at note end; omit for a static filter. */
  cutoffEnd?: number;
  /** Resonance. Above ~4 the filter starts to sing. */
  q?: number;
}

export interface LayerSpec {
  wave: Wave;
  /** Frequency multiplier on the voice's base freq. Ignored for noise. */
  ratio?: number;
  /** Detune in cents. Ignored for noise. */
  detune?: number;
  gain: number;
  env: Envelope;
  /** Seconds to wait before this layer starts. */
  delay?: number;
  /** This layer's own length in ms; defaults to the voice's `ms`. */
  ms?: number;
  /** Pitch glide in semitones across the layer's life (+ up, - down). */
  glide?: number;
  filter?: FilterSpec;
}

export interface VoiceSpec {
  /** Base frequency in Hz. */
  freq: number;
  /** Note length in ms, before release tails. */
  ms: number;
  layers: LayerSpec[];
  /** Per-play random pitch wobble, +/- this many semitones, so the 200th tap is
   *  not a byte copy of the first. */
  jitter?: number;
  /** Reverb tail length in seconds. Sized to the sound: a UI tick wants 0.3s of
   *  room, a win chord wants 1.8s of hall. */
  tail?: number;
  /** How much of that room you hear, 0..1. See note 2 at the top of this file. */
  space?: number;
  /** Gentle lowpass across the whole voice, in Hz. Omit for no shelf. */
  warmth?: number;
}

// ---------------------------------------------------------------------------
// Pitch maths
// ---------------------------------------------------------------------------

/** Equal-temperament frequency ratio for a semitone offset. */
export function semitonesToRatio(semitones: number): number {
  return Math.pow(2, semitones / 12);
}

/**
 * The per-play pitch multiplier for a voice. Returns exactly 1 when the voice
 * declares no jitter, so a deliberately fixed-pitch voice stays fixed.
 */
export function jitterRatio(
  spec: VoiceSpec,
  rng: () => number = Math.random,
): number {
  const j = spec.jitter ?? 0;
  if (j === 0) return 1;
  return semitonesToRatio((rng() * 2 - 1) * j);
}

/**
 * How long the voice occupies the audio graph, in ms - the longest layer
 * (delay + length + release) plus any reverb tail. Used to size the offline
 * render buffer that measures the voice's peak.
 */
export function voiceDurationMs(spec: VoiceSpec): number {
  let longest = 0;
  for (const l of spec.layers) {
    const end = (l.delay ?? 0) * 1000 + (l.ms ?? spec.ms) + l.env.r * 1000;
    if (end > longest) longest = end;
  }
  return longest + (spec.tail ?? 0) * 1000;
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

const semi = semitonesToRatio;

// Notes, so the voices below read as music rather than as decimals.
const C5 = 523.25;
const C6 = 1046.5;
const E6 = 1318.51;

/** A partial set: [frequency ratio, relative amplitude] per mode. */
export type Partials = readonly (readonly [number, number])[];

/**
 * Partial sets, measured from the physics rather than invented. Each entry is
 * [frequency ratio, relative amplitude].
 *
 * Only the modes the SHIPPED voices use are kept here, in the shell. The rest -
 * bell, wood, soft - lives in `src/lab/modes.ts`, inside the lab's own lazy
 * chunk, because a mode nothing plays yet must not be paid for by a child's
 * first visit. `struck()` takes either a name from this table or a partial set
 * directly, which is what lets the lab reach the SAME damping law rather than
 * keeping a second copy of the physics.
 *
 * `bar` moved DOWN here on 2026-08-13, when correct, win and star were all
 * re-voiced onto tuned wood. A mode three shipped voices play is not lab
 * furniture. The lab re-exports this one rather than keeping its own copy -
 * two tables of the same physics is how a control arm quietly stops being one.
 */
export const MODES = {
  /** Thin struck glass / crystal. Bright, inharmonic, dies fast up top. */
  glass: [
    [1, 1],
    [2.71, 0.3],
    [5.15, 0.1],
    [8.4, 0.04],
  ],
  /** A metal tine - kalimba, electric piano. Warm, nearly harmonic. */
  tine: [
    [1, 1],
    [2.0, 0.16],
    [3.01, 0.05],
  ],
  /** A struck wooden bar - marimba, xylophone. Round, wide-spaced partials. */
  bar: [
    [1, 1],
    [3.9, 0.2],
    [10.1, 0.045],
  ],
  /**
   * The BODY of an impact - the table and the felt under it, not the object.
   *
   * Nearly modeless on purpose: one strong fundamental and two weak, closely
   * spaced neighbours, which is what a damped mass on a soft surface does. It
   * is never played alone. It goes UNDER a bright strike, at 180-300 Hz, and
   * it is the single thing every chip voice on this table was missing - see
   * the note above CHIP_LAND in pokerVoices.ts.
   */
  thud: [
    [1, 1],
    [1.72, 0.1],
    [2.61, 0.03],
  ],
} as const satisfies Record<string, readonly (readonly [number, number])[]>;

export type ModeName = keyof typeof MODES;

/** A few ms of bandpassed noise: the sound of the striker, not of the object. */
export function mallet(gain: number, ms: number, centre: number): LayerSpec {
  return {
    wave: "noise",
    gain,
    ms,
    env: { a: 0.0008, d: ms / 1000 / 1.6, s: 0, r: 0.008 },
    filter: { type: "bandpass", cutoff: centre, q: 1.1 },
  };
}

export interface StruckOptions {
  gain?: number;
  /** How much faster high partials die. 0 = all together, 1 = strongly damped. */
  damp?: number;
  jitter?: number;
  /** Reverb send, 0..1. */
  space?: number;
  /** Reverb length in seconds. */
  tail?: number;
  /** Lowpass across the voice. */
  warmth?: number;
  /** Amplitude of the strike transient. Omit for none. */
  mallet?: number;
  /** Centre frequency of that transient - a hard mallet is high, a soft one low. */
  malletHz?: number;
}

/**
 * A struck object. The heart of the palette.
 *
 * `ms` is the FUNDAMENTAL's life; every partial above it gets a proportionally
 * shorter one (`ms / ratio^damp`). That damping law is what makes this sound
 * like something being hit rather than a chord being held, and it is the single
 * change that turned a rejected palette into an accepted one.
 */
export function struck(
  freq: number,
  ms: number,
  mode: ModeName | Partials,
  o: StruckOptions = {},
): VoiceSpec {
  const gain = o.gain ?? 0.22;
  const damp = o.damp ?? 0.85;
  const layers: LayerSpec[] = [];
  // A name indexes the shell's table; an array IS the table. The lab passes
  // arrays, so a candidate voice built there is damped by this function and not
  // by a copy of it that could drift.
  const partials: Partials = typeof mode === "string" ? MODES[mode] : mode;

  if (o.mallet)
    layers.push(mallet(o.mallet, Math.min(7, ms / 8), o.malletHz ?? 3200));

  for (const [ratio, amp] of partials) {
    const life = ms / Math.pow(ratio, damp);
    const s = life / 1000;
    layers.push({
      wave: "sine",
      ratio,
      gain: gain * amp,
      ms: life,
      // Attack softens very slightly for upper partials so they bloom in rather
      // than all snapping on at the same instant.
      env: {
        a: 0.0012 + Math.log2(ratio) * 0.0006,
        d: s * 0.7,
        s: 0.02,
        r: s * 0.55,
      },
    });
  }

  return {
    freq,
    ms,
    jitter: o.jitter,
    space: o.space ?? 0.16,
    tail: o.tail ?? 0.9,
    warmth: o.warmth ?? 9000,
    layers,
  };
}

/**
 * Play a timbre as a run of notes - arpeggios, glisses, cascades.
 *
 * Gains scale by 1/sqrt(n) so a longer run does not simply get louder; the notes
 * are staggered in time anyway, so this stays well clear of clipping.
 */
export function run(
  base: VoiceSpec,
  semitones: number[],
  gap: number,
): VoiceSpec {
  const scale = 1 / Math.sqrt(semitones.length);
  const layers: LayerSpec[] = [];
  semitones.forEach((s, i) => {
    const r = semi(s);
    for (const l of base.layers) {
      layers.push({
        ...l,
        // A noise transient has no pitch, so only pitched layers transpose.
        ratio: l.wave === "noise" ? l.ratio : (l.ratio ?? 1) * r,
        gain: l.gain * scale,
        delay: (l.delay ?? 0) + i * gap,
      });
    }
  });
  return { ...base, layers };
}

/**
 * Layer whole voices into one — a bright strike over a low body, a noise
 * texture under a pitched tail.
 *
 * `struck()` builds partials from ONE fundamental, so it can only ever make an
 * object that resonates in one register. A real impact is two things at once:
 * the object (high, fast) and what it landed on (low, slower). That is not a
 * partial of the first sound, it is a second sound, which is why this exists
 * rather than another entry in the partial table.
 *
 * Each extra voice's pitched layers are RESCALED to the first voice's `freq`,
 * because a layer's `ratio` is relative to the voice it belongs to and the
 * result has only one. Noise layers have no pitch and pass through untouched.
 * The first voice's room (`space`, `tail`, `warmth`) wins for all of them —
 * two rooms in one sound is exactly the artificial smear this palette avoids.
 *
 * PUT THE BRIGHTEST VOICE FIRST. Rescaling divides by the base's `freq`, so a
 * 2.6 kHz strike mixed into a 190 Hz base lands at ratio 13.7 before its own
 * partials multiply it — and the override gate refuses any ratio above 64,
 * which is the whole voice silently falling back to the built-in. Bright first
 * makes every added ratio a fraction instead, and it is the ordering every
 * impact in pokerVoices.ts uses. (Learned the other way round, from a knuckle
 * with a ring on it that the gate rejected at ratio 122.)
 */
export function mix(...specs: VoiceSpec[]): VoiceSpec {
  const [base, ...rest] = specs;
  const layers: LayerSpec[] = [...base.layers];
  for (const s of rest) {
    const k = s.freq / base.freq;
    for (const l of s.layers) {
      layers.push({ ...l, ratio: l.wave === "noise" ? l.ratio : (l.ratio ?? 1) * k });
    }
  }
  return { ...base, ms: Math.max(...specs.map((s) => s.ms)), layers };
}

// A tiny seeded PRNG, so a scattered voice is DATA and not a dice roll. Specs
// are compared by value (the studio matches a stored override against the arm
// that produced it) and stored as JSON, so a voice that rebuilt itself
// differently each import would stop being pickable. Per-PLAY variation is a
// different mechanism and already exists: `jitter`.
function mulberry32(a: number): () => number {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFrom(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * A run of hits that is NOT evenly spaced — chips tumbling, a riffle, a stack
 * settling.
 *
 * `run()` puts every note on an exact grid at an exact interval, and the ear
 * is very good at hearing that grid: a perfectly periodic burst train is the
 * difference between "chips" and "a drum machine playing chips". Real contact
 * is messy, so the gap, the gain and the pitch of every hit wobble here — by
 * default +/-45% on timing, which is far more than sounds reasonable written
 * down and is roughly what a handful of chips actually does.
 *
 * `seed` is what makes two arms of the same shape different sounds rather than
 * duplicates, and it is why every scattered candidate names one.
 */
export function scatter(
  base: VoiceSpec,
  hits: number,
  gap: number,
  o: { seed?: string; spread?: number; gainVar?: number; pitchVar?: number } = {},
): VoiceSpec {
  const rnd = mulberry32(seedFrom(o.seed ?? "scatter"));
  const spread = o.spread ?? 0.45;
  const gainVar = o.gainVar ?? 0.35;
  const pitchVar = o.pitchVar ?? 1.5;
  const scale = 1 / Math.sqrt(hits);
  const layers: LayerSpec[] = [];
  let t = 0;
  for (let i = 0; i < hits; i++) {
    const r = semi((rnd() * 2 - 1) * pitchVar);
    const g = scale * (1 + (rnd() * 2 - 1) * gainVar);
    for (const l of base.layers) {
      layers.push({
        ...l,
        ratio: l.wave === "noise" ? l.ratio : (l.ratio ?? 1) * r,
        gain: l.gain * g,
        delay: (l.delay ?? 0) + t,
      });
    }
    t += gap * (1 + (rnd() * 2 - 1) * spread);
  }
  return { ...base, layers };
}

// bounce / chirp / friction USED TO LIVE HERE and were moved into the lab's own
// chunk on 2026-08-15, before they ever shipped. Same reason `modes.ts` holds
// the partial sets nothing plays: they are used only by lab candidates, and a
// composer in this file is a composer the lab imports ACROSS a chunk boundary,
// which pins it to the shell. Measured: 278 B gz on every first visit, for
// three functions no child's device will ever call.
//
// Promoting a picked arm to a shipped voice is what brings one back here, and
// that is the moment to pay for it.

// ---------------------------------------------------------------------------
// The nine, all PICKED - 2026-08-13, in the lab, with the names showing
// ---------------------------------------------------------------------------
//
// Every voice below was chosen by the operator from its own strip of 5-8
// alternatives, each played through this exact engine at matched loudness. The
// shipped arm was in every strip as an ordinary entry, so "keep what we have"
// was always available and was never taken.
//
// SIX OF THESE REPLACED A BLIND-ROUND WINNER. tap, correct, wrong, win, coin
// and star each won a hidden-name tournament on 2026-08-02 and were overridden
// here with the names showing. That is worth stating plainly rather than
// quietly overwriting, because the earlier result is real and somebody will
// eventually cite it: a blind round answers "which sounds better with nothing
// else to go on", and a named pick answers "which do I want in my app". The
// second question is the one that ships, and it is allowed to disagree.
//
// `src/lab/previous.ts` holds all nine superseded specs verbatim, so every
// strip still carries the sound it beat as a real arm rather than as a memory.
// Do not point those at the constants below - a control arm that follows the
// shipped voice is not a control arm.

/**
 * tap - "Tick". A tiny hard click, 30 ms.
 *
 * The most-played sound in the app by a wide margin, so it is the one that has
 * to survive the thousandth repetition rather than the first. That is the whole
 * case for it over Shutter, the blind winner it replaced: a mechanical
 * double-click has real personality and personality is what wears out.
 *
 * A 3 ms noise burst above 5.2 kHz - the striker alone, no body - over a sine
 * that lifts a fourth and is gone in 26 ms. Nothing rings.
 */
export const TAP: VoiceSpec = {
  freq: 1800,
  ms: 34,
  jitter: 1,
  space: 0.05,
  tail: 0.22,
  warmth: 12000,
  layers: [
    {
      wave: "noise",
      gain: 0.11,
      ms: 3,
      env: { a: 0.0004, d: 0.002, s: 0, r: 0.003 },
      filter: { type: "highpass", cutoff: 5200 },
    },
    {
      wave: "sine",
      gain: 0.08,
      ms: 26,
      glide: 5,
      env: { a: 0.0006, d: 0.014, s: 0, r: 0.012 },
    },
  ],
};

/**
 * success - "Wood run". Three rising wooden notes, a major triad.
 *
 * Replaced Harp gliss, the blind winner - five pentatonic notes on metal. This
 * fires on a correct answer in 11 games, so it is heard far more often than a
 * win is, and three notes of tuned wood say the same thing in half the time
 * without the gliss's small flourish.
 */
export const SUCCESS: VoiceSpec = run(
  struck(C5, 220, "bar", { gain: 0.2, damp: 0.85, space: 0.2, tail: 0.8 }),
  [0, 4, 7],
  0.055,
);

/**
 * win - "Ladder". Six notes climbing a pentatonic scale to the octave.
 *
 * Replaced Sweep and land, the blind winner. Both are arrivals; this one is a
 * climb rather than a landing, which reads as "look how far you got" instead of
 * "that's done". It is the same shape the streak ladder uses, an octave wide
 * and played at once, so a long streak and a win are audibly relatives.
 */
export const WIN: VoiceSpec = run(
  struck(C5, 420, "bar", { gain: 0.19, damp: 0.85, space: 0.3, tail: 1.6 }),
  [0, 2, 4, 7, 9, 12],
  0.062,
);

/**
 * star - "High bar". High tuned wood, three notes, less glassy.
 *
 * Replaced Crystal sparkle, the blind winner. A star lands 620 ms into the win
 * moment, on top of the win chord and the coin - and glass at E6 competed with
 * the chord's own top end for the same air. Wood sits under it.
 *
 * Its top partial asks for 26,634 Hz on the octave note, which no sample rate
 * can represent; `voiceEngine` drops any partial that spends its whole life
 * above Nyquist rather than letting the browser clamp it and log about it.
 */
export const STAR: VoiceSpec = run(
  struck(E6, 300, "bar", { gain: 0.16, damp: 0.9, space: 0.34, tail: 1.6 }),
  [0, 7, 12],
  0.07,
);

/**
 * coin - "Drop in". A coin dropping into a jar.
 *
 * Replaced Two triangles, the blind winner. It is a small narrative rather than
 * an interval: a 4 ms strike above 5.5 kHz, then the coin's own note, then the
 * fifth as it settles, then one faint third partial as it comes to rest. Coins
 * arrive with the confetti and the win chord already sounding, and a story
 * survives that crowd better than a two-note figure does.
 */
export const COIN: VoiceSpec = {
  freq: C6,
  ms: 160,
  jitter: 1.3,
  space: 0.24,
  tail: 0.8,
  warmth: 10000,
  layers: [
    {
      wave: "noise",
      gain: 0.07,
      ms: 4,
      env: { a: 0.0004, d: 0.0025, s: 0, r: 0.004 },
      filter: { type: "highpass", cutoff: 5500 },
    },
    {
      wave: "triangle",
      gain: 0.13,
      ms: 60,
      env: { a: 0.001, d: 0.04, s: 0, r: 0.035 },
    },
    {
      wave: "triangle",
      ratio: 1.51,
      gain: 0.1,
      ms: 90,
      delay: 0.05,
      env: { a: 0.001, d: 0.06, s: 0.04, r: 0.05 },
    },
    {
      wave: "sine",
      ratio: 2.98,
      gain: 0.035,
      ms: 70,
      delay: 0.098,
      env: { a: 0.001, d: 0.045, s: 0, r: 0.04 },
    },
  ],
};

/**
 * fail - "Two steps down". Two soft notes stepping down.
 *
 * Replaced Soft thud, the blind winner - which glided a tone and a half inside
 * a single note. Two discrete steps read as an answer rather than as a
 * deflation, and there is no noise transient at all, so nothing about it
 * strikes. Wrong answers in kids games are gentle by rule, and the rule means
 * "not that one", never "you failed".
 *
 * The second note is `ratio: 0.84`, a whole tone below - not a semitone, which
 * is the interval every horror soundtrack uses.
 */
export const FAIL: VoiceSpec = {
  freq: 330,
  ms: 260,
  jitter: 0.3,
  space: 0.16,
  tail: 0.6,
  warmth: 5000,
  layers: [
    {
      wave: "sine",
      gain: 0.15,
      ms: 110,
      env: { a: 0.004, d: 0.07, s: 0.05, r: 0.06 },
    },
    {
      wave: "sine",
      ratio: 0.84,
      gain: 0.15,
      ms: 150,
      delay: 0.1,
      env: { a: 0.004, d: 0.1, s: 0.05, r: 0.08 },
    },
  ],
};

/**
 * flip - "Whoosh". A short spin, then a soft landing.
 *
 * The FIRST verdict this sound has ever had. It was one 600 Hz triangle from
 * before the tournament, and no round was ever run for it - a card turning in
 * Memory made a beep, with nothing in it that moved.
 *
 * A bandpassed noise sweep climbing 700 -> 4200 Hz is the card travelling; a
 * sine 85 ms behind, falling three semitones, is it landing. The motion is the
 * whole point and a single oscillator has no way to express it.
 */
export const FLIP: VoiceSpec = {
  freq: 440,
  ms: 170,
  jitter: 0.5,
  space: 0.14,
  tail: 0.45,
  warmth: 8500,
  layers: [
    {
      wave: "noise",
      gain: 0.08,
      ms: 110,
      env: { a: 0.014, d: 0.055, s: 0.12, r: 0.04 },
      filter: { type: "bandpass", cutoff: 700, cutoffEnd: 4200, q: 1.4 },
    },
    {
      wave: "sine",
      gain: 0.14,
      ms: 70,
      delay: 0.085,
      glide: -3,
      env: { a: 0.002, d: 0.04, s: 0.03, r: 0.035 },
    },
  ],
};

/**
 * pop - "Pock". A high hard click over a small ringing cavity.
 *
 * The balloon, the bee, the line, the brush, the frog, the flag and every shop
 * purchase - the second most-played sound there is, and until 2026-08-13 it was
 * one 320 Hz square wave that had never been compared to anything.
 *
 * It was briefly Cork earlier the same day, which is worth recording because
 * both are in the strip and one of them is now history: Cork was the first
 * thing that was clearly better than a square, and Pock is the same idea built
 * from the measured recipe rather than dialled in by ear. Three parts, none of
 * which the square had: a 4 ms click living above 4.2 kHz (the striker, not the
 * object), a sine gliding UP a full octave, and a resonant bandpass at Q 6
 * sweeping 760 -> 1500 Hz, which is the small cavity releasing.
 */
export const POP: VoiceSpec = {
  freq: 380,
  ms: 95,
  jitter: 1.1,
  space: 0.09,
  tail: 0.28,
  warmth: 9000,
  layers: [
    {
      wave: "noise",
      gain: 0.1,
      ms: 4,
      env: { a: 0.0005, d: 0.0025, s: 0, r: 0.004 },
      filter: { type: "highpass", cutoff: 4200 },
    },
    {
      wave: "sine",
      gain: 0.21,
      ms: 55,
      glide: 12,
      env: { a: 0.0008, d: 0.03, s: 0, r: 0.028 },
    },
    {
      wave: "noise",
      gain: 0.05,
      ms: 60,
      env: { a: 0.001, d: 0.035, s: 0, r: 0.03 },
      filter: { type: "bandpass", cutoff: 760, cutoffEnd: 1500, q: 6 },
    },
  ],
};

/**
 * streak - one rung of the ladder, and the ladder is NOT in here.
 *
 * This is a single warm tine note. `src/sdk/streak.ts` alone decides which
 * SEMITONE it plays at for a given run of correct answers, exactly the way
 * `economy.ts` decides what a reason is worth and `score.ts` decides which
 * direction a unit ranks. A game reports how many in a row; it never picks a
 * pitch, so thirty games cannot invent thirty different ladders.
 *
 * It transposes rather than re-synthesising, which is not an optimisation - it
 * is what keeps the level-match trim valid. A fresh spec per rung would mint a
 * new object every note, miss the trim cache, and play the ladder unmatched
 * against the palette it is supposed to sit inside.
 *
 * "Glass", picked 2026-08-13 over four alternatives INCLUDING at the top rung,
 * which is the only way this one can honestly be chosen. It is the single voice
 * in the app heard transposed - up 21 semitones, a seventh above two octaves -
 * and the lab's streak row exists so a timbre that is lovely at C5 and shrill
 * at A6 gets caught before it ships rather than after. The strip called this
 * arm "the riskiest high up" and it won there anyway.
 *
 * Its top partial reaches 14.8 kHz at the cap, comfortably representable, so
 * unlike `star` this one needs nothing from the Nyquist guard.
 */
export const STREAK: VoiceSpec = struck(C5, 240, "glass", {
  gain: 0.15,
  damp: 0.95,
  jitter: 0.2,
  space: 0.32,
  tail: 1.2,
});
