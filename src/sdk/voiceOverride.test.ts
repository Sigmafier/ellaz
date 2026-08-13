/**
 * @vitest-environment jsdom
 *
 * The suite default is node, for speed. This file needs a real `localStorage`
 * because the thing under test IS the boundary between stored bytes and a
 * synthesiser - stubbing that boundary would test the stub.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { POP, TAP, type VoiceSpec } from "./voice";
import {
  VOICE_PICKS_KEY,
  clearVoicePicks,
  loadVoicePicks,
  sanitizeVoice,
  saveVoicePick,
} from "./voiceOverride";

const write = (v: unknown) => localStorage.setItem(VOICE_PICKS_KEY, JSON.stringify(v));

beforeEach(() => {
  localStorage.clear();
});

describe("a stored voice", () => {
  it("survives the round trip when it is one of ours", () => {
    expect(saveVoicePick("pop", TAP)).toBe(true);
    expect(loadVoicePicks().pop).toEqual(sanitizeVoice(TAP));
  });

  it("is dropped, not repaired, when its shape is wrong", () => {
    // Each of these is a plausible corruption, and every one of them would
    // reach a synthesiser next to a child's ear if this gate coerced instead
    // of refusing. `undefined` means "play the built-in", which is the same
    // answer as "nothing was ever picked" - one code path for both.
    const bad: [string, unknown][] = [
      ["not an object", "pop"],
      ["null", null],
      ["no layers", { freq: 440, ms: 60, layers: [] }],
      ["missing env", { freq: 440, ms: 60, layers: [{ wave: "sine", gain: 0.2 }] }],
      [
        "unknown wave",
        { freq: 440, ms: 60, layers: [{ wave: "evil", gain: 0.2, env: { a: 0.01, d: 0.05, s: 0, r: 0.02 } }] },
      ],
      [
        "NaN gain",
        { freq: 440, ms: 60, layers: [{ wave: "sine", gain: NaN, env: { a: 0.01, d: 0.05, s: 0, r: 0.02 } }] },
      ],
      [
        "infinite frequency",
        { freq: Infinity, ms: 60, layers: [{ wave: "sine", gain: 0.2, env: { a: 0.01, d: 0.05, s: 0, r: 0.02 } }] },
      ],
      [
        "a five minute note",
        { freq: 440, ms: 300000, layers: [{ wave: "sine", gain: 0.2, env: { a: 0.01, d: 0.05, s: 0, r: 0.02 } }] },
      ],
      [
        "a screaming filter",
        {
          freq: 440,
          ms: 60,
          layers: [
            {
              wave: "sawtooth",
              gain: 0.2,
              env: { a: 0.01, d: 0.05, s: 0, r: 0.02 },
              filter: { cutoff: 800, q: 400 },
            },
          ],
        },
      ],
      [
        "a thousand layers",
        {
          freq: 440,
          ms: 60,
          layers: Array.from({ length: 1000 }, () => ({
            wave: "sine",
            gain: 0.2,
            env: { a: 0.01, d: 0.05, s: 0, r: 0.02 },
          })),
        },
      ],
    ];
    for (const [why, spec] of bad) {
      expect(sanitizeVoice(spec), why).toBeUndefined();
      expect(saveVoicePick("pop", spec as VoiceSpec), `save ${why}`).toBe(false);
    }
  });

  it("is turned down rather than refused when it is merely too loud", () => {
    // Clamping instead of dropping is deliberate: a refused pick reads as the
    // lab being broken, while a scaled one keeps the choice and is safe.
    const loud: VoiceSpec = {
      freq: 440,
      ms: 60,
      layers: [
        { wave: "sine", gain: 0.8, env: { a: 0.01, d: 0.05, s: 0, r: 0.02 } },
        { wave: "sine", ratio: 2, gain: 0.8, env: { a: 0.01, d: 0.05, s: 0, r: 0.02 } },
      ],
    };
    const safe = sanitizeVoice(loud)!;
    const total = safe.layers.reduce((t, l) => t + l.gain, 0);
    expect(total).toBeLessThanOrEqual(0.9);
    // Scaled together, so the voice keeps its balance instead of becoming a
    // different sound at a safe volume.
    expect(safe.layers[0].gain).toBeCloseTo(safe.layers[1].gain, 10);
  });
});

describe("the stored map", () => {
  it("is empty when nothing was ever picked", () => {
    expect(loadVoicePicks()).toEqual({});
  });

  it("survives junk in the key rather than throwing", () => {
    localStorage.setItem(VOICE_PICKS_KEY, "}{ not json");
    expect(loadVoicePicks()).toEqual({});
  });

  it("drops only the bad entry, never its neighbours", () => {
    // The property that matters most here: a corrupt `pop` must not cost a
    // child the `win` sound they still have a perfectly good pick for.
    write({ pop: { freq: 440, ms: 60, layers: [] }, win: POP });
    const picks = loadVoicePicks();
    expect(picks.pop).toBeUndefined();
    expect(picks.win).toEqual(sanitizeVoice(POP));
  });

  it("ignores a key that is not a sound this app plays", () => {
    write({ nonsense: POP });
    // It is stored under a name `play()` can never be called with, so it can
    // never be reached - the union type is the gate, and nothing looks it up.
    expect(Object.keys(loadVoicePicks())).toEqual(["nonsense"]);
  });

  it("forgets everything on clear", () => {
    saveVoicePick("pop", TAP);
    clearVoicePicks();
    expect(loadVoicePicks()).toEqual({});
  });

  it("clears one pick without touching the rest", () => {
    saveVoicePick("pop", TAP);
    saveVoicePick("flip", POP);
    saveVoicePick("pop", undefined);
    const picks = loadVoicePicks();
    expect(picks.pop).toBeUndefined();
    expect(picks.flip).toBeDefined();
  });
});
