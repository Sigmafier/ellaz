/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  JUICE_SHIPPED,
  JUICE_TUNING_KEY,
  clearTuning,
  loadTuning,
  sanitizeTuning,
  saveTuning,
  tuning,
} from "./tuning";

beforeEach(() => {
  localStorage.clear();
  clearTuning();
});

describe("the effect tuning store", () => {
  it("starts at the shipped values, so an untouched device is unchanged", () => {
    expect(loadTuning()).toEqual(JUICE_SHIPPED);
    expect(tuning()).toEqual(JUICE_SHIPPED);
  });

  it("keeps a pick, and the effects read it without touching storage again", () => {
    saveTuning({ confetti: 24 });
    expect(tuning().confetti).toBe(24);
    // Everything else survives - a patch is a patch, not a replacement.
    expect(tuning().shakePx).toBe(JUICE_SHIPPED.shakePx);
  });

  it("survives a reload", () => {
    saveTuning({ shakePx: 13, shakeMs: 420 });
    clearTuning(); // wipes memory, not the disk...
    localStorage.setItem(
      JUICE_TUNING_KEY,
      JSON.stringify({ shakePx: 13, shakeMs: 420 }),
    );
    expect(loadTuning().shakePx).toBe(13);
    expect(tuning().shakeMs).toBe(420);
  });

  it("clamps rather than refusing, because a wrong number is not dangerous here", () => {
    // The deliberate difference from `voiceOverride`, which DROPS what it does
    // not like. The worst a bad number here can do is draw odd confetti; the
    // worst a bad voice can do is play something loud next to a child's ear.
    expect(sanitizeTuning({ confetti: 99999 }).confetti).toBe(240);
    expect(sanitizeTuning({ confetti: -40 }).confetti).toBe(0);
    expect(sanitizeTuning({ shakePx: 500 }).shakePx).toBe(16);
    expect(sanitizeTuning({ shakeMs: 1 }).shakeMs).toBe(60);
  });

  it("rejects values that are numbers but not usable ones", () => {
    // NaN and Infinity both pass `typeof === "number"` and both clamp to
    // something arbitrary, which is why the guard is `Number.isFinite`.
    expect(sanitizeTuning({ confetti: Number.NaN }).confetti).toBe(
      JUICE_SHIPPED.confetti,
    );
    expect(sanitizeTuning({ shakePx: Number.POSITIVE_INFINITY }).shakePx).toBe(
      JUICE_SHIPPED.shakePx,
    );
  });

  it("salvages the good fields out of a partly-bad object", () => {
    const out = sanitizeTuning({ confetti: 30, shakePx: "loud", nonsense: 1 });
    expect(out.confetti).toBe(30);
    expect(out.shakePx).toBe(JUICE_SHIPPED.shakePx);
  });

  it("falls back whole on junk, rather than throwing into a game", () => {
    for (const junk of [null, undefined, 42, "x", []]) {
      expect(sanitizeTuning(junk)).toEqual(JUICE_SHIPPED);
    }
    localStorage.setItem(JUICE_TUNING_KEY, "{not json");
    expect(loadTuning()).toEqual(JUICE_SHIPPED);
  });

  it("goes back to shipped on clear", () => {
    // THE PICK MUST NOT BE THE SHIPPED VALUE, or this test proves nothing.
    //
    // It used to save `confetti: 140` - which was a fine control until
    // 2026-08-13, when 140 BECAME the shipped default. From that moment the
    // save was a no-op and `toEqual(JUICE_SHIPPED)` passed whether or not
    // `clearTuning` did anything at all: a green test over an untested
    // function, with nothing in the diff of either file to show it.
    //
    // So assert the setup actually changed something before asserting the
    // teardown undid it, and derive the value from the shipped one rather
    // than hardcoding a second number that can collide again.
    const other = JUICE_SHIPPED.confetti === 40 ? 80 : 40;
    saveTuning({ confetti: other });
    expect(tuning().confetti, "the control never left shipped").not.toBe(
      JUICE_SHIPPED.confetti,
    );

    clearTuning();
    expect(tuning()).toEqual(JUICE_SHIPPED);
    expect(localStorage.getItem(JUICE_TUNING_KEY)).toBeNull();
  });

  it("still applies the pick this session when the device refuses the write", () => {
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error("quota");
    };
    try {
      expect(saveTuning({ confetti: 90 }).confetti).toBe(90);
      expect(tuning().confetti).toBe(90);
    } finally {
      Storage.prototype.setItem = real;
    }
  });
});
