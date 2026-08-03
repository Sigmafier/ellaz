import { describe, expect, it } from "vitest";
import { mulberry32 } from "@shared/index";
import {
  LADDER_CAP,
  LADDER_IDLE,
  advanceLadder,
  armToSlot,
  easeAnticipateOvershoot,
  easeInBack,
  easeOutBack,
  easeOutCubic,
  easeOutElastic,
  jitterRatio,
  ladderSemitones,
  semitonesToRatio,
  transpose,
  voiceDurationMs,
  voiceNoteMs,
  winIntensity,
  type VoiceSpec,
} from "./specs";
import { CONTROL, LEAN, RICH, VOICE_SETS, type JuiceEvent } from "./voices";
import { PALETTE, PALETTE_EVENTS, PALETTE_SPECS } from "./palette";

const EVENTS: JuiceEvent[] = ["tap", "correct", "win", "coin", "wrong", "star"];

describe("pitch maths", () => {
  it("an octave is exactly double", () => {
    expect(semitonesToRatio(12)).toBeCloseTo(2, 10);
    expect(semitonesToRatio(-12)).toBeCloseTo(0.5, 10);
    expect(semitonesToRatio(0)).toBe(1);
  });

  it("jitter of zero (or absent) leaves pitch untouched", () => {
    const flat: VoiceSpec = { freq: 440, ms: 50, layers: [] };
    expect(jitterRatio(flat, () => 0.99)).toBe(1);
    expect(jitterRatio({ ...flat, jitter: 0 }, () => 0.99)).toBe(1);
  });

  it("jitter stays inside its declared semitone band", () => {
    const spec: VoiceSpec = { freq: 440, ms: 50, jitter: 2, layers: [] };
    const rng = mulberry32(7);
    const lo = semitonesToRatio(-2);
    const hi = semitonesToRatio(2);
    for (let i = 0; i < 500; i++) {
      const r = jitterRatio(spec, rng);
      expect(r).toBeGreaterThanOrEqual(lo);
      expect(r).toBeLessThanOrEqual(hi);
    }
  });

  it("transpose is pure and leaves a zero shift as the same object", () => {
    const spec: VoiceSpec = { freq: 440, ms: 50, layers: [] };
    expect(transpose(spec, 0)).toBe(spec);
    const up = transpose(spec, 12);
    expect(up.freq).toBeCloseTo(880, 6);
    expect(spec.freq).toBe(440); // input untouched
  });
});

describe("voiceDurationMs", () => {
  it("takes the longest layer, counting its delay and release", () => {
    const spec: VoiceSpec = {
      freq: 440,
      ms: 100,
      layers: [
        { wave: "sine", gain: 0.1, env: { a: 0, d: 0, s: 0, r: 0.05 } }, // 100 + 50
        { wave: "sine", gain: 0.1, delay: 0.2, ms: 40, env: { a: 0, d: 0, s: 0, r: 0.01 } }, // 200+40+10
      ],
    };
    expect(voiceDurationMs(spec)).toBe(250);
  });

  it("adds the reverb tail on top", () => {
    const base: VoiceSpec = {
      freq: 440,
      ms: 100,
      layers: [{ wave: "sine", gain: 0.1, env: { a: 0, d: 0, s: 0, r: 0 } }],
    };
    expect(voiceDurationMs(base)).toBe(100);
    expect(voiceDurationMs({ ...base, tail: 1.5 })).toBe(1600);
  });

  it("every shipped voice has a positive, finite duration", () => {
    for (const set of Object.values(VOICE_SETS)) {
      for (const event of EVENTS) {
        const ms = voiceDurationMs(set[event]);
        expect(Number.isFinite(ms)).toBe(true);
        expect(ms).toBeGreaterThan(0);
      }
    }
  });
});

describe("the streak ladder", () => {
  it("starts at the root and climbs the pentatonic", () => {
    expect(ladderSemitones(0)).toBe(0);
    expect(ladderSemitones(1)).toBe(2);
    expect(ladderSemitones(2)).toBe(4);
    expect(ladderSemitones(3)).toBe(7);
    expect(ladderSemitones(4)).toBe(9);
  });

  it("rolls into the next octave every five rungs", () => {
    expect(ladderSemitones(5)).toBe(12);
    expect(ladderSemitones(6)).toBe(14);
    expect(ladderSemitones(10)).toBe(24);
  });

  it("never descends as the streak grows", () => {
    let prev = -1;
    for (let step = 0; step < 60; step++) {
      const s = ladderSemitones(step);
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
  });

  it("plateaus at the cap so a long streak cannot reach dog-whistle", () => {
    const top = ladderSemitones(LADDER_CAP);
    expect(ladderSemitones(LADDER_CAP + 1)).toBe(top);
    expect(ladderSemitones(9999)).toBe(top);
    // Three octaves is the ceiling we are asserting is musical, not painful.
    expect(top).toBeLessThanOrEqual(36);
  });

  it("clamps nonsense input rather than producing a negative pitch", () => {
    expect(ladderSemitones(-5)).toBe(0);
    expect(ladderSemitones(2.9)).toBe(ladderSemitones(2));
  });

  it("a miss resets to the bottom, it does not decay gently", () => {
    let s = LADDER_IDLE;
    for (let i = 0; i < 6; i++) s = advanceLadder(s, true);
    expect(s.step).toBe(6);
    expect(advanceLadder(s, false)).toEqual(LADDER_IDLE);
  });

  it("advancing is pure - the previous state is not mutated", () => {
    const before = { step: 3 };
    advanceLadder(before, true);
    expect(before.step).toBe(3);
  });
});

describe("win tiers", () => {
  it("escalates monotonically across every dimension", () => {
    const e = winIntensity("easy");
    const m = winIntensity("medium");
    const h = winIntensity("hard");
    for (const key of ["anticipateMs", "hitStopMs", "shake", "confetti", "burst"] as const) {
      expect(m[key]).toBeGreaterThanOrEqual(e[key]);
      expect(h[key]).toBeGreaterThan(m[key]);
    }
    expect(h.chord.length).toBeGreaterThan(e.chord.length);
  });

  it("an undeclared tier reads as easy, matching economy.ts", () => {
    expect(winIntensity(undefined)).toEqual(winIntensity("easy"));
  });

  it("keeps hit-stop inside the 60-200ms band practitioners use", () => {
    for (const tier of ["easy", "medium", "hard"] as const) {
      const i = winIntensity(tier);
      expect(i.hitStopMs).toBeGreaterThanOrEqual(60);
      expect(i.hitStopMs).toBeLessThanOrEqual(200);
    }
  });
});

describe("easing", () => {
  const curves = {
    easeOutCubic,
    easeInBack,
    easeOutBack,
    easeOutElastic,
    easeAnticipateOvershoot,
  };

  it("every curve lands exactly on 0 and 1 at the ends", () => {
    for (const [name, fn] of Object.entries(curves)) {
      expect(fn(0), `${name}(0)`).toBeCloseTo(0, 10);
      expect(fn(1), `${name}(1)`).toBeCloseTo(1, 10);
    }
  });

  it("anticipation actually goes backwards before going forwards", () => {
    // The whole point of the curve: if it never dips below zero it is just
    // an ease, and the squash-stretch reads as a plain scale-up.
    expect(easeInBack(0.2)).toBeLessThan(0);
    expect(easeAnticipateOvershoot(0.1)).toBeLessThan(0);
  });

  it("overshoot actually exceeds the target before settling", () => {
    expect(easeOutBack(0.7)).toBeGreaterThan(1);
    expect(easeAnticipateOvershoot(0.75)).toBeGreaterThan(1);
  });

  it("stays inside sane bounds so a tween cannot fling an element offscreen", () => {
    for (const [name, fn] of Object.entries(curves)) {
      for (let t = 0; t <= 1; t += 0.01) {
        const v = fn(t);
        expect(v, `${name}(${t.toFixed(2)})`).toBeGreaterThan(-0.6);
        expect(v, `${name}(${t.toFixed(2)})`).toBeLessThan(1.6);
      }
    }
  });
});

describe("blind arm ordering", () => {
  it("armToSlot inverts a permutation", () => {
    // Button 0 plays arm 2, button 1 plays arm 0, button 2 plays arm 1.
    expect(armToSlot([2, 0, 1])).toEqual([1, 2, 0]);
  });

  it("round-trips for every permutation of three arms", () => {
    const perms = [
      [0, 1, 2],
      [0, 2, 1],
      [1, 0, 2],
      [1, 2, 0],
      [2, 0, 1],
      [2, 1, 0],
    ];
    for (const p of perms) {
      const inv = armToSlot(p);
      p.forEach((arm, slot) => expect(inv[arm]).toBe(slot));
    }
  });
});

describe("the voice sets themselves", () => {
  it("all three sets cover every event, so brackets can swap sets freely", () => {
    for (const [name, set] of Object.entries(VOICE_SETS)) {
      for (const event of EVENTS) {
        expect(set[event], `${name}.${event}`).toBeDefined();
        expect(set[event].layers.length, `${name}.${event} layers`).toBeGreaterThan(0);
      }
    }
  });

  it("CONTROL is a faithful transcription of today's audio.ts", () => {
    // If someone retunes sdk/audio.ts, the control arm must move with it or the
    // tournament is scoring a strawman.
    expect(CONTROL.tap.freq).toBe(440);
    expect(CONTROL.tap.ms).toBe(60);
    expect(CONTROL.wrong.freq).toBe(180);
    expect(CONTROL.wrong.layers[0].wave).toBe("sawtooth");
    expect(CONTROL.win.layers).toHaveLength(3);
  });

  it("CONTROL uses no feature that only exists to flatter the new arms", () => {
    for (const event of EVENTS) {
      const spec = CONTROL[event];
      expect(spec.jitter ?? 0, `${event} jitter`).toBe(0);
      expect(spec.tail ?? 0, `${event} tail`).toBe(0);
      for (const l of spec.layers) {
        expect(l.voices ?? 1, `${event} voices`).toBe(1);
        expect(l.wave).not.toBe("noise");
      }
    }
  });

  it("RICH differs from LEAN ONLY by tail and unison, never by tuning", () => {
    // The two engine arms must be the same sound design, otherwise the verdict
    // is about the notes rather than about the render strategy.
    for (const event of EVENTS) {
      expect(RICH[event].freq, `${event} freq`).toBe(LEAN[event].freq);
      expect(RICH[event].ms, `${event} ms`).toBe(LEAN[event].ms);
      expect(RICH[event].jitter, `${event} jitter`).toBe(LEAN[event].jitter);
      expect(RICH[event].layers).toHaveLength(LEAN[event].layers.length);
      RICH[event].layers.forEach((rl, i) => {
        const ll = LEAN[event].layers[i];
        expect(rl.wave).toBe(ll.wave);
        expect(rl.ratio).toBe(ll.ratio);
        expect(rl.gain).toBe(ll.gain);
        expect(rl.env).toEqual(ll.env);
      });
      expect(RICH[event].tail ?? 0).toBeGreaterThan(0);
    }
  });

  it("LEAN declares nothing the realtime engine is meant to skip", () => {
    for (const event of EVENTS) {
      expect(LEAN[event].tail ?? 0, `${event} tail`).toBe(0);
      for (const l of LEAN[event].layers) {
        expect(l.voices ?? 1, `${event} voices`).toBe(1);
      }
    }
  });

  it("no layer can clip on its own, and no voice sums past unity", () => {
    for (const [name, set] of Object.entries(VOICE_SETS)) {
      for (const event of EVENTS) {
        const total = set[event].layers.reduce((sum, l) => sum + l.gain * (l.voices ?? 1), 0);
        expect(total, `${name}.${event} summed gain`).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("the sound palette", () => {
  it("covers every event with a real choice to make", () => {
    for (const event of PALETTE_EVENTS) {
      expect(PALETTE[event].length, `${event} characters`).toBeGreaterThanOrEqual(3);
    }
  });

  it("every event's palette opens with the control, so today's sound competes", () => {
    // The lab shuffles these, but the control must EXIST in every palette or the
    // question degrades from "is this better?" to "which new one?".
    for (const event of PALETTE_EVENTS) {
      const controls = PALETTE[event].filter((c) => c.spec === LEAN[event]);
      expect(controls, `${event} control`).toHaveLength(1);
      expect(PALETTE[event][0].id, `${event} control position`).toBe(controls[0].id);
    }
  });

  it("gives every character a unique id and a bilingual blurb", () => {
    const seen = new Set<string>();
    for (const event of PALETTE_EVENTS) {
      for (const c of PALETTE[event]) {
        expect(seen.has(c.id), `duplicate id ${c.id}`).toBe(false);
        seen.add(c.id);
        expect(c.name.length).toBeGreaterThan(0);
        expect(c.blurb.he.length, `${c.id} he`).toBeGreaterThan(0);
        expect(c.blurb.en.length, `${c.id} en`).toBeGreaterThan(0);
      }
    }
  });

  it("no character clips", () => {
    for (const event of PALETTE_EVENTS) {
      for (const c of PALETTE[event]) {
        const total = c.spec.layers.reduce((s, l) => s + l.gain * (l.voices ?? 1), 0);
        expect(total, `${c.id} summed gain`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("keeps TAP characters short enough to survive hundreds of repeats", () => {
    // A tap is heard 300 times a session, so its NOTE must be short. Measured
    // without the reverb tail on purpose: the tail is a quiet decay the ear
    // reads as the room, and counting it would fail every voice for the crime
    // of being placed somewhere.
    for (const c of PALETTE.tap) {
      expect(voiceNoteMs(c.spec), `${c.id} note length`).toBeLessThanOrEqual(520);
    }
  });

  it("every character sits in a room - the thing that stops it sounding cheap", () => {
    // A bone-dry note is the single most common reason synthesised UI audio
    // reads as a beep. If a future edit drops `space`, this is the guard.
    for (const event of PALETTE_EVENTS) {
      for (const c of PALETTE[event]) {
        // The controls are the OLD dry voices, and are in the palette precisely
        // so the difference is audible. Everything else must have a space.
        if (c.id.endsWith("-current")) continue;
        expect(c.spec.space ?? 0, `${c.id} space`).toBeGreaterThan(0);
        expect(c.spec.tail ?? 0, `${c.id} tail`).toBeGreaterThan(0);
      }
    }
  });

  it("damps high partials faster than the fundamental", () => {
    // The realism cue that matters most. Within a struck voice, a partial an
    // octave up must not outlive the fundamental.
    for (const event of PALETTE_EVENTS) {
      for (const c of PALETTE[event]) {
        if (c.id.endsWith("-current")) continue;
        const pitched = c.spec.layers.filter((l) => l.wave !== "noise" && (l.ratio ?? 1) >= 1);
        if (pitched.length < 2) continue;
        const fundamental = pitched.reduce((a, b) => ((a.ratio ?? 1) <= (b.ratio ?? 1) ? a : b));
        const top = pitched.reduce((a, b) => ((a.ratio ?? 1) >= (b.ratio ?? 1) ? a : b));
        if ((top.ratio ?? 1) <= (fundamental.ratio ?? 1)) continue;
        const life = (l: (typeof pitched)[number]) => (l.ms ?? c.spec.ms) + l.env.r * 1000;
        expect(life(top), `${c.id} top partial outlives fundamental`).toBeLessThanOrEqual(
          life(fundamental),
        );
      }
    }
  });

  it("every character has a positive, finite duration and at least one layer", () => {
    for (const spec of PALETTE_SPECS) {
      expect(spec.layers.length).toBeGreaterThan(0);
      const ms = voiceDurationMs(spec);
      expect(Number.isFinite(ms)).toBe(true);
      expect(ms).toBeGreaterThan(0);
    }
  });

  it("only ever uses filter types the engine actually implements", () => {
    const supported = new Set(["lowpass", "highpass", "bandpass", undefined]);
    for (const spec of PALETTE_SPECS) {
      for (const l of spec.layers) {
        expect(supported.has(l.filter?.type), `${l.filter?.type}`).toBe(true);
      }
    }
  });
});
