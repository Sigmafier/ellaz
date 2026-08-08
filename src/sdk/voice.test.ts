import { describe, it, expect } from "vitest";
import {
  COIN,
  FAIL,
  FLIP,
  POP,
  STAR,
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
];

/** Every property a layer needs to make a sound at all. */
function faults(spec: VoiceSpec): string[] {
  const bad: string[] = [];
  if (spec.layers.length === 0) bad.push("no layers");
  if (!Number.isFinite(spec.freq) || spec.freq <= 0) bad.push(`freq ${spec.freq}`);
  if (!Number.isFinite(spec.ms) || spec.ms <= 0) bad.push(`ms ${spec.ms}`);
  spec.layers.forEach((l, i) => {
    if (!Number.isFinite(l.gain) || l.gain <= 0) bad.push(`layer ${i} gain ${l.gain}`);
    const ms = l.ms ?? spec.ms;
    if (!Number.isFinite(ms) || ms <= 0) bad.push(`layer ${i} ms ${ms}`);
    for (const k of ["a", "d", "s", "r"] as const) {
      const v = l.env[k];
      if (!Number.isFinite(v) || v < 0) bad.push(`layer ${i} env.${k} ${v}`);
    }
    if (l.ratio !== undefined && (!Number.isFinite(l.ratio) || l.ratio <= 0)) {
      bad.push(`layer ${i} ratio ${l.ratio}`);
    }
    if (l.filter && (!Number.isFinite(l.filter.cutoff) || l.filter.cutoff <= 0)) {
      bad.push(`layer ${i} cutoff ${l.filter.cutoff}`);
    }
  });
  return bad;
}

describe("every shipped voice can actually make a sound", () => {
  it.each(NAMED)("%s is playable", (name, spec) => {
    expect(faults(spec), `${name}: ${faults(spec).join(", ")}`).toEqual([]);
  });

  it.each(NAMED)("%s occupies a finite, non-zero span of time", (_name, spec) => {
    const ms = voiceDurationMs(spec);
    expect(Number.isFinite(ms)).toBe(true);
    expect(ms).toBeGreaterThan(0);
    // Nothing in a UI palette should ring for more than a few seconds; a voice
    // that does is almost always a mistyped tail, and it would talk over the
    // next thing the child does.
    expect(ms).toBeLessThan(5000);
  });

  it("the fault detector fires - a planted silent layer is caught", () => {
    // Without this, every assertion above would pass over an empty list and
    // report success while measuring nothing.
    const silent: VoiceSpec = { ...TAP, layers: [{ ...TAP.layers[0], gain: 0 }] };
    expect(faults(silent)).toContain("layer 0 gain 0");
    const noLayers: VoiceSpec = { ...TAP, layers: [] };
    expect(faults(noLayers)).toContain("no layers");
  });
});

describe("the winners are the ones the operator actually chose", () => {
  /**
   * These pin the 2026-08-08 correction. The recorded verdict said coin and
   * wrong "were won by the sounds already shipped", so the obvious reading was
   * to leave `fail` as its 180Hz sawtooth and wire coin to `pop`'s 320Hz
   * square. Both were wrong: the palette's control characters were the lab's
   * LEAN arm, which had never shipped. If someone "restores" the old sounds on
   * the strength of that note, these fail and say why.
   */
  it("fail is the soft falling thud, NOT the old 180Hz sawtooth", () => {
    expect(FAIL.freq).toBe(196);
    expect(FAIL.layers.some((l) => l.wave === "sawtooth")).toBe(false);
    // The falling sine is the whole character: "not that one", never "you failed".
    expect(FAIL.layers.some((l) => l.wave === "sine" && l.glide === -1.5)).toBe(true);
  });

  it("coin is two triangles a fifth apart, NOT pop's square", () => {
    expect(COIN.freq).toBeCloseTo(987.77, 2);
    const triangles = COIN.layers.filter((l) => l.wave === "triangle");
    expect(triangles).toHaveLength(2);
    // A fifth is 7 semitones, ratio 1.5.
    expect(triangles[1].ratio).toBe(1.5);
    expect(COIN.layers.some((l) => l.wave === "square")).toBe(false);
  });

  it("tap is the shutter double-click", () => {
    // Two noise transients, the second delayed - that IS the double click.
    const noise = TAP.layers.filter((l) => l.wave === "noise");
    expect(noise).toHaveLength(2);
    expect(noise[1].delay).toBeGreaterThan(0);
  });

  it("success is five pentatonic notes and star is three", () => {
    // `run` copies the base timbre once per note, so layer count is a multiple.
    const tine = struck(523.25, 280, "tine").layers.length;
    expect(SUCCESS.layers).toHaveLength(tine * 5);
    const glass = struck(1318.51, 420, "glass", { mallet: 0.03 }).layers.length;
    expect(STAR.layers).toHaveLength(glass * 3);
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
