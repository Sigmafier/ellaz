// The gate on a sound picked in the lab.
//
// It decides what a synthesiser does next to somebody's ear, so the bar here
// is "would I let a hand-edited localStorage value through this", not "does it
// parse".

import { afterEach, describe as group, expect, it } from "vitest";
import { POKER_VOICES } from "./pokerVoices";
import type { VoiceSpec } from "./voice";
import { clearOverrides, loadOverrides, setOverride, validateSpec } from "./voiceOverride";

const ok: VoiceSpec = {
  freq: 440,
  ms: 200,
  jitter: 0.5,
  tail: 0.8,
  space: 0.2,
  warmth: 9000,
  layers: [{ wave: "sine", gain: 0.2, env: { a: 0.01, d: 0.1, s: 0.1, r: 0.05 } }],
};

/** The test environment is `node`, so storage is ours to provide. */
function fakeStorage(): void {
  const map = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}
afterEach(() => {
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

group("what it lets through", () => {
  it("accepts every voice the app already ships", () => {
    // If the gate refuses a shipped voice, the gate is wrong — not the voice.
    for (const [name, spec] of Object.entries(POKER_VOICES)) {
      expect(validateSpec(JSON.parse(JSON.stringify(spec))), name).not.toBeNull();
    }
  });

  it("keeps every field it was given", () => {
    const out = validateSpec(ok)!;
    expect(out).toEqual(ok);
  });

  it("accepts a spec with only the required fields", () => {
    const bare = { freq: 440, ms: 100, layers: [{ wave: "noise", gain: 0.1, env: { a: 0, d: 0.05, s: 0, r: 0.01 } }] };
    expect(validateSpec(bare)).not.toBeNull();
  });
});

group("what it refuses", () => {
  const bad: [string, unknown][] = [
    ["null", null],
    ["a string", "chipClack"],
    ["a number", 7],
    ["an array", []],
    ["no freq", { ms: 100, layers: ok.layers }],
    ["no layers", { freq: 440, ms: 100 }],
    ["empty layers", { freq: 440, ms: 100, layers: [] }],
    ["freq NaN", { ...ok, freq: NaN }],
    ["freq Infinity", { ...ok, freq: Infinity }],
    ["freq below hearing", { ...ok, freq: 0 }],
    ["ms of zero", { ...ok, ms: 0 }],
    ["ms absurd", { ...ok, ms: 60_000 }],
    ["an unknown wave", { ...ok, layers: [{ ...ok.layers[0], wave: "vocoder" }] }],
    ["a negative gain", { ...ok, layers: [{ ...ok.layers[0], gain: -1 }] }],
    ["no envelope", { ...ok, layers: [{ wave: "sine", gain: 0.2 }] }],
    ["an envelope with a string", { ...ok, layers: [{ ...ok.layers[0], env: { a: "0.01", d: 0.1, s: 0, r: 0 } }] }],
    ["an envelope release of Infinity", { ...ok, layers: [{ ...ok.layers[0], env: { a: 0, d: 0.1, s: 0, r: Infinity } }] }],
    ["a sustain above 1", { ...ok, layers: [{ ...ok.layers[0], env: { a: 0, d: 0.1, s: 4, r: 0 } }] }],
    ["an unknown filter type", { ...ok, layers: [{ ...ok.layers[0], filter: { type: "comb", cutoff: 900 } }] }],
    ["a filter with no cutoff", { ...ok, layers: [{ ...ok.layers[0], filter: { type: "lowpass" } }] }],
    ["a cutoff past Nyquist", { ...ok, layers: [{ ...ok.layers[0], filter: { cutoff: 1e9 } }] }],
    ["too many layers", { ...ok, layers: Array.from({ length: 65 }, () => ok.layers[0]) }],
    ["a layer far past any authored gain", { ...ok, layers: [{ ...ok.layers[0], gain: 900 }] }],
    ["a delay of a minute", { ...ok, layers: [{ ...ok.layers[0], delay: 60 }] }],
    ["jitter of an octave", { ...ok, jitter: 60 }],
  ];
  for (const [why, v] of bad) {
    it(`refuses ${why}`, () => expect(validateSpec(v)).toBeNull());
  }

  it("refuses rather than repairs", () => {
    // The load-bearing distinction. A spec that is 90% right is a spec
    // something wrote half of, and half a sound is not a sound.
    const nearly = { ...ok, layers: [ok.layers[0], { wave: "sine", gain: 0.2 }] };
    expect(validateSpec(nearly)).toBeNull();
  });
});

group("loudness is the one thing it coerces", () => {
  it("scales a loud voice down instead of dropping it", () => {
    const loud = { ...ok, layers: [{ ...ok.layers[0], gain: 2 }, { ...ok.layers[0], gain: 1 }] };
    const out = validateSpec(loud)!;
    expect(out).not.toBeNull();
    expect(Math.max(...out.layers.map((l) => l.gain))).toBeCloseTo(1, 6);
    // Scaled as a WHOLE — the balance between layers IS the timbre, so
    // clamping each layer separately would hand back a different instrument.
    expect(out.layers[0].gain / out.layers[1].gain).toBeCloseTo(2, 6);
  });

  it("leaves a quiet voice exactly alone", () => {
    const out = validateSpec(ok)!;
    expect(out.layers[0].gain).toBe(ok.layers[0].gain);
  });

  it("does not touch a long run whose gains SUM past one", () => {
    // The bug this file caught before the lab shipped. The first version of
    // the gate budgeted the SUM of layer gains at 1.2 — but `run()` staggers
    // its notes in time, so the sum of a 25-layer cascade is not a loudness,
    // and shipped potSlide sums to 1.287. That gate quietly attenuated a
    // sound the app already plays, so a lab pick would have been quieter than
    // the identical sound played by the table.
    const shipped = JSON.parse(JSON.stringify(POKER_VOICES.potSlide)) as VoiceSpec;
    const sum = shipped.layers.reduce((a, l) => a + l.gain, 0);
    expect(sum, "fixture no longer exercises the case").toBeGreaterThan(1.2);
    expect(validateSpec(shipped)).toEqual(shipped);
  });

  it("refuses a gain no person authored rather than silently taming it", () => {
    // Between the two thresholds is "a loud voice"; above ACCEPT it is not a
    // voice at all, and turning 900 into 1 would report success over
    // something nobody picked.
    expect(validateSpec({ ...ok, layers: [{ ...ok.layers[0], gain: 900 }] })).toBeNull();
  });
});

group("reading storage", () => {
  it("answers with nothing when there is no storage at all", () => {
    // Incognito, or a node test. Must not throw — sound is never load-bearing.
    expect(loadOverrides()).toEqual({});
  });

  it("keeps a valid pick and drops an invalid one in the same blob", () => {
    fakeStorage();
    localStorage.setItem(
      "holdem:voice:v1",
      JSON.stringify({ chipClack: ok, win: { freq: "loud" } }),
    );
    const out = loadOverrides();
    expect(out.chipClack).not.toBeUndefined();
    expect(out.win).toBeUndefined();
  });

  it("ignores a key that is not a sound this app plays", () => {
    fakeStorage();
    localStorage.setItem("holdem:voice:v1", JSON.stringify({ chipClack: ok, __proto__zzz: ok, doorbell: ok }));
    expect(Object.keys(loadOverrides())).toEqual(["chipClack"]);
  });

  it("survives garbage", () => {
    fakeStorage();
    localStorage.setItem("holdem:voice:v1", "{not json");
    expect(loadOverrides()).toEqual({});
    localStorage.setItem("holdem:voice:v1", "[1,2,3]");
    expect(loadOverrides()).toEqual({});
    localStorage.setItem("holdem:voice:v1", "null");
    expect(loadOverrides()).toEqual({});
  });

  it("round-trips a pick, and clearing puts it back to the built-in", () => {
    fakeStorage();
    setOverride("chipClack", ok);
    expect(loadOverrides().chipClack).toEqual(ok);
    setOverride("chipClack", null);
    expect(loadOverrides().chipClack).toBeUndefined();
    setOverride("win", ok);
    clearOverrides();
    expect(loadOverrides()).toEqual({});
  });
});
