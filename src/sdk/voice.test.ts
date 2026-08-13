import { describe, it, expect } from "vitest";
import {
  COIN,
  FAIL,
  FLIP,
  POP,
  STAR,
  STREAK,
  SUCCESS,
  TAP,
  WIN,
  jitterRatio,
  mallet,
  run,
  struck,
  voiceDurationMs,
  type VoiceSpec,
} from "./voice";

/**
 * A voice that fails to synthesise makes NO SOUND AND THROWS NOTHING. There is
 * no type error, no console warning and no failing render - the app carries on
 * perfectly and is simply mute for that event. Nothing else in this repo can
 * see that, which is why these are asserted as data rather than trusted.
 *
 * The specs are pure (no WebAudio, no DOM), so all of this runs in node.
 */

const NAMED: [string, VoiceSpec][] = [
  ["tap", TAP],
  ["success", SUCCESS],
  ["win", WIN],
  ["fail", FAIL],
  ["coin", COIN],
  ["star", STAR],
  ["flip", FLIP],
  ["pop", POP],
  // `streak` was missing from this list until 2026-08-13 - a shipped voice
  // outside the playability check, which is exactly the population gap that
  // makes a green suite mean less than it reads.
  ["streak", STREAK],
];

/** Every property a layer needs to make a sound at all. */
function faults(spec: VoiceSpec): string[] {
  const bad: string[] = [];
  if (spec.layers.length === 0) bad.push("no layers");
  if (!Number.isFinite(spec.freq) || spec.freq <= 0)
    bad.push(`freq ${spec.freq}`);
  if (!Number.isFinite(spec.ms) || spec.ms <= 0) bad.push(`ms ${spec.ms}`);
  spec.layers.forEach((l, i) => {
    if (!Number.isFinite(l.gain) || l.gain <= 0)
      bad.push(`layer ${i} gain ${l.gain}`);
    const ms = l.ms ?? spec.ms;
    if (!Number.isFinite(ms) || ms <= 0) bad.push(`layer ${i} ms ${ms}`);
    for (const k of ["a", "d", "s", "r"] as const) {
      const v = l.env[k];
      if (!Number.isFinite(v) || v < 0) bad.push(`layer ${i} env.${k} ${v}`);
    }
    if (l.ratio !== undefined && (!Number.isFinite(l.ratio) || l.ratio <= 0)) {
      bad.push(`layer ${i} ratio ${l.ratio}`);
    }
    if (
      l.filter &&
      (!Number.isFinite(l.filter.cutoff) || l.filter.cutoff <= 0)
    ) {
      bad.push(`layer ${i} cutoff ${l.filter.cutoff}`);
    }
  });
  return bad;
}

describe("every shipped voice can actually make a sound", () => {
  it.each(NAMED)("%s is playable", (name, spec) => {
    expect(faults(spec), `${name}: ${faults(spec).join(", ")}`).toEqual([]);
  });

  it.each(NAMED)(
    "%s occupies a finite, non-zero span of time",
    (_name, spec) => {
      const ms = voiceDurationMs(spec);
      expect(Number.isFinite(ms)).toBe(true);
      expect(ms).toBeGreaterThan(0);
      // Nothing in a UI palette should ring for more than a few seconds; a voice
      // that does is almost always a mistyped tail, and it would talk over the
      // next thing the child does.
      expect(ms).toBeLessThan(5000);
    },
  );

  it("the fault detector fires - a planted silent layer is caught", () => {
    // Without this, every assertion above would pass over an empty list and
    // report success while measuring nothing.
    const silent: VoiceSpec = {
      ...TAP,
      layers: [{ ...TAP.layers[0], gain: 0 }],
    };
    expect(faults(silent)).toContain("layer 0 gain 0");
    const noLayers: VoiceSpec = { ...TAP, layers: [] };
    expect(faults(noLayers)).toContain("no layers");
  });
});

describe("the voices are the ones the operator actually chose", () => {
  /**
   * WHAT THIS BLOCK DEFENDS AGAINST, and it has already happened once.
   *
   * On 2026-08-08 a recorded verdict said coin and wrong "were won by the
   * sounds already shipped". The obvious reading was to leave `fail` as its
   * 180 Hz sawtooth and wire coin to `pop`'s 320 Hz square, and both were
   * wrong - the palette's control characters were the lab's own unshipped arm.
   * A verdict recorded as "the control won" is unreadable without knowing what
   * the control WAS.
   *
   * That risk is now larger, not smaller. On 2026-08-13 all nine voices were
   * re-picked with the names showing, and SIX of them overrode a blind-round
   * winner from 2026-08-02. So there are two true and contradictory-sounding
   * sentences in the record - "Shutter won the tournament" and "tap is Tick" -
   * and only the second one describes what ships. If someone restores a
   * predecessor on the strength of the first, these fail and say which.
   *
   * The predecessors are all preserved verbatim in `src/lab/previous.ts`, so
   * nothing here is asserting a sound out of existence - only out of the app.
   */
  it("tap is the bare tick, NOT the Shutter double-click", () => {
    // Shutter's signature was TWO noise transients, the second delayed. Tick
    // has exactly one, and it is a highpass rather than the mallet's bandpass.
    const noise = TAP.layers.filter((l) => l.wave === "noise");
    expect(noise).toHaveLength(1);
    expect(noise[0].filter?.type).toBe("highpass");
    expect(noise[0].delay).toBeUndefined();
    expect(TAP.ms).toBeLessThan(60);
  });

  it("pop is Pock, NOT Cork and NOT the 320Hz square", () => {
    expect(POP.layers.some((l) => l.wave === "square")).toBe(false);
    // Cork had two layers and a 9-semitone rise; Pock has three and a full
    // octave, and the third is the resonant cavity Cork never had.
    expect(POP.layers).toHaveLength(3);
    expect(POP.layers.some((l) => l.glide === 12)).toBe(true);
    const cavity = POP.layers.find((l) => l.filter?.type === "bandpass");
    expect(cavity?.filter?.q).toBe(6);
  });

  it("flip moves, instead of being one triangle wave", () => {
    // The whole point of replacing it: a card turning should travel and land.
    expect(FLIP.layers.length).toBeGreaterThan(1);
    const sweep = FLIP.layers.find((l) => l.wave === "noise");
    expect(sweep?.filter?.cutoffEnd).toBeGreaterThan(
      sweep?.filter?.cutoff ?? 0,
    );
    const landing = FLIP.layers.find((l) => l.wave === "sine");
    expect(landing?.delay).toBeGreaterThan(0);
  });

  it("fail is two discrete steps down, NOT the old glide or a sawtooth", () => {
    expect(FAIL.layers.some((l) => l.wave === "sawtooth")).toBe(false);
    // Soft thud fell inside ONE note by gliding -1.5. Two steps down is two
    // separate sines, the second a whole tone below and delayed.
    expect(FAIL.layers.every((l) => l.glide === undefined)).toBe(true);
    expect(FAIL.layers).toHaveLength(2);
    expect(FAIL.layers[1].ratio).toBe(0.84);
    expect(FAIL.layers[1].delay).toBeGreaterThan(0);
  });

  it("coin is the jar drop, NOT two triangles at B5", () => {
    expect(COIN.freq).toBeCloseTo(1046.5, 2);
    expect(COIN.layers.some((l) => l.wave === "square")).toBe(false);
    // Four events in sequence rather than two notes: strike, coin, fifth, rest.
    expect(COIN.layers).toHaveLength(4);
    const delays = COIN.layers.map((l) => l.delay ?? 0);
    expect(delays.filter((d) => d > 0)).toHaveLength(2);
  });

  it("correct, win and star are all tuned wood now", () => {
    // `run` copies the base timbre once per note, so layer count is a multiple
    // of the mode's partial count - which is how you can tell the mode from the
    // outside. `bar` has three partials; `tine` also has three, so the note
    // COUNT is what separates correct from its predecessor.
    const bar = struck(523.25, 220, "bar").layers.length;
    expect(SUCCESS.layers).toHaveLength(bar * 3); // was five, on tine
    expect(WIN.layers).toHaveLength(bar * 6); // was a sweep plus a glass triad
    expect(WIN.layers.some((l) => l.wave === "noise")).toBe(false);
    expect(STAR.layers).toHaveLength(bar * 3); // was glass, with a mallet
    expect(STAR.layers.some((l) => l.wave === "noise")).toBe(false);
  });

  it("streak is glass, and it is the one voice that must survive transposing", () => {
    // Picked at the TOP rung, not at the bottom - it is the only voice in the
    // app heard transposed, up to 21 semitones above its own base.
    const glass = struck(523.25, 240, "glass").layers.length;
    expect(STREAK.layers).toHaveLength(glass);
    expect(STREAK.jitter).toBeGreaterThan(0);
  });
});

describe("nothing shipped is inaudible", () => {
  // `voiceEngine` drops any partial that spends its whole life above Nyquist -
  // `star`'s top partial asks for 26,634 Hz at the octave, which no sample rate
  // can represent. That guard is correct and it is also a silencer if a retune
  // ever pushes a voice ENTIRELY up there: the app would go quiet for that
  // event with no error anywhere, which is the failure this whole file exists
  // to catch. So assert every voice keeps something a person can actually hear.
  const AUDIBLE_CEILING = 20000;

  it.each(NAMED)("%s keeps at least one layer under 20 kHz", (_name, spec) => {
    const heard = spec.layers.filter((l) => {
      if (l.wave === "noise") return true; // a filtered burst, not a partial
      return spec.freq * (l.ratio ?? 1) < AUDIBLE_CEILING;
    });
    expect(heard.length).toBeGreaterThan(0);
  });

  it("the ceiling check fires - a voice pitched into the ultrasound is caught", () => {
    // Without this the assertion above passes over any list and proves nothing.
    const ultrasonic: VoiceSpec = { ...STREAK, freq: 30000 };
    const heard = ultrasonic.layers.filter(
      (l) =>
        l.wave === "noise" ||
        ultrasonic.freq * (l.ratio ?? 1) < AUDIBLE_CEILING,
    );
    expect(heard).toHaveLength(0);
  });
});

describe("the builders", () => {
  it("struck damps high partials harder than the fundamental", () => {
    // The single change that turned a rejected palette into an accepted one:
    // strike something real and its bright modes die first.
    const s = struck(440, 400, "glass", { damp: 0.85 });
    const lives = s.layers.map((l) => l.ms ?? s.ms);
    for (let i = 1; i < lives.length; i++) {
      expect(lives[i]).toBeLessThan(lives[i - 1]);
    }
  });

  it("struck with damp 0 gives every partial the same life", () => {
    const s = struck(440, 400, "glass", { damp: 0 });
    const lives = s.layers.map((l) => l.ms ?? s.ms);
    expect(new Set(lives).size).toBe(1);
  });

  it("run staggers the notes and does not let a long run get louder", () => {
    const base = struck(440, 200, "tine");
    const r = run(base, [0, 4, 7], 0.05);
    expect(r.layers).toHaveLength(base.layers.length * 3);
    // Gains scale by 1/sqrt(n), so total energy grows sub-linearly.
    const sum = (s: VoiceSpec) => s.layers.reduce((a, l) => a + l.gain, 0);
    expect(sum(r)).toBeLessThan(sum(base) * 3);
    expect(sum(r)).toBeGreaterThan(sum(base));
    // The last note starts after the first.
    expect(Math.max(...r.layers.map((l) => l.delay ?? 0))).toBeCloseTo(0.1, 5);
  });

  it("run transposes pitched layers but never the noise transient", () => {
    const base = struck(440, 200, "glass", { mallet: 0.05 });
    const r = run(base, [12], 0);
    const noiseIn = base.layers.find((l) => l.wave === "noise");
    const noiseOut = r.layers.find((l) => l.wave === "noise");
    expect(noiseOut?.ratio).toBe(noiseIn?.ratio);
    const pitched = r.layers.filter((l) => l.wave !== "noise");
    // An octave up doubles every pitched ratio.
    expect(pitched[0].ratio).toBeCloseTo(2, 5);
  });

  it("mallet is a bandpassed burst, not a pitch", () => {
    const m = mallet(0.1, 6, 2800);
    expect(m.wave).toBe("noise");
    expect(m.filter?.type).toBe("bandpass");
    expect(m.filter?.cutoff).toBe(2800);
  });

  it("jitter is exactly 1 when a voice declares none, so fixed pitch stays fixed", () => {
    expect(jitterRatio({ ...TAP, jitter: undefined })).toBe(1);
    expect(jitterRatio({ ...TAP, jitter: 0 })).toBe(1);
    // And it actually varies when asked to.
    const lo = jitterRatio({ ...TAP, jitter: 1 }, () => 0);
    const hi = jitterRatio({ ...TAP, jitter: 1 }, () => 1);
    expect(lo).toBeLessThan(1);
    expect(hi).toBeGreaterThan(1);
  });
});
