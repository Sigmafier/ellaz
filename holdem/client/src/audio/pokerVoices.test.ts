// The defect that made the first palette sound cheap, written as an assertion.
//
// The operator's verdict was "the sounds are horrible", which is not something
// a test can hold. What IS testable is the cause: every impact voice was built
// from `struck(2400+, …)` with partials starting at ratio 1, so the sound had
// no component at all below 2.4 kHz. All click, no body — which is the named
// signature of a synthetic impact, and the thing a real chip landing on a felt
// table has plenty of (a body around 180–300 Hz under a click at 2.5–4.5 kHz).
//
// So this gate does not ask whether anything sounds good. It asks whether the
// sound is capable of sounding like an object hitting a table, which is a
// property of its spectrum and is arithmetic.

import { describe as group, expect, it } from "vitest";
import { CARD_SLIDE, CHIP_CLACK, CHIP_RAISE, POKER_VOICES, POT_SLIDE, type SfxName } from "./pokerVoices";
import type { VoiceSpec } from "./voice";

/**
 * Every absolute frequency a voice puts energy at, in Hz.
 *
 * A pitched layer sits at `freq * ratio`. A noise layer has no pitch, so its
 * band is where its filter puts it — and a noise layer with NO filter is
 * broadband, which genuinely does reach the bottom; it is reported as 20 Hz
 * rather than skipped, because skipping it would let a voice pass this gate by
 * having no low content and no way to say so.
 */
function frequencies(spec: VoiceSpec): number[] {
  const out: number[] = [];
  for (const l of spec.layers) {
    if (l.wave === "noise") {
      if (!l.filter) out.push(20);
      else if (l.filter.type === "highpass") out.push(l.filter.cutoff);
      else out.push(Math.min(l.filter.cutoff, l.filter.cutoffEnd ?? l.filter.cutoff));
    } else {
      out.push(spec.freq * (l.ratio ?? 1));
    }
  }
  return out;
}

const lowest = (spec: VoiceSpec) => Math.min(...frequencies(spec));

group("the spectrum reaches the bottom", () => {
  // Every voice that is an OBJECT HITTING SOMETHING. Not the melodic ones —
  // `yourTurn` is a tine and `win` is a marimba run, and neither is supposed to
  // have a table underneath it.
  const IMPACTS: SfxName[] = ["chipClack", "chipRaise", "potSlide", "cardSlide", "reveal", "checkKnock"];

  for (const name of IMPACTS) {
    it(`${name} has body under 600 Hz`, () => {
      expect(lowest(POKER_VOICES[name]), `${name} lowest component`).toBeLessThan(600);
    });
  }

  // And the chip voices specifically, at the measured band for a clay chip on
  // felt. 600 would pass on a voice whose lowest component is a mid; this is
  // the number the acoustics actually name.
  for (const [name, spec] of [
    ["chipClack", CHIP_CLACK],
    ["chipRaise", CHIP_RAISE],
    ["potSlide", POT_SLIDE],
  ] as const) {
    it(`${name} has a body in the 150-350 Hz band`, () => {
      const inBand = frequencies(spec).filter((f) => f >= 150 && f <= 350);
      expect(inBand.length, `${name} components in band`).toBeGreaterThan(0);
    });
  }

  // The card is friction, not an impact, so it is checked at its own measured
  // band instead: card-on-felt lives at 2-6 kHz and the first version swept
  // 700-3000, which is dark enough to read as cloth rather than as card.
  it("the card slide sits in the card band, not the cloth band", () => {
    const bands = CARD_SLIDE.layers
      .filter((l) => l.wave === "noise" && l.filter)
      .map((l) => l.filter!.cutoffEnd ?? l.filter!.cutoff);
    expect(Math.max(...bands), "top of the card's noise sweep").toBeGreaterThanOrEqual(4000);
  });
});

group("the palette is complete", () => {
  it("gives every named sound a spec", () => {
    for (const [name, spec] of Object.entries(POKER_VOICES)) {
      expect(spec.layers.length, name).toBeGreaterThan(0);
      expect(spec.ms, name).toBeGreaterThan(0);
    }
  });

  // The three added on 2026-08-15. Named individually rather than counted, so
  // deleting one is a red test that says which, instead of an off-by-one.
  it("has the three sounds the table used to be silent for", () => {
    const names = Object.keys(POKER_VOICES);
    expect(names).toContain("shuffle");
    expect(names).toContain("chipRaise");
    expect(names).toContain("reveal");
  });

  // The positive control. `frequencies` returning [] would make every
  // `toBeLessThan` above pass on Infinity... and every one fail, so that
  // direction is safe. The dangerous direction is a `lowest` of 0 or NaN
  // passing everything silently.
  it("the frequency reader returns real numbers", () => {
    for (const [name, spec] of Object.entries(POKER_VOICES)) {
      const f = frequencies(spec);
      expect(f.length, name).toBeGreaterThan(0);
      for (const hz of f) expect(Number.isFinite(hz) && hz > 0, `${name}: ${hz}`).toBe(true);
    }
  });
});
