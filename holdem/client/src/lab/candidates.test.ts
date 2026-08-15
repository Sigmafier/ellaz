// The strips.
//
// The one that matters is "no two arms in a strip are byte-identical". That is
// the mechanical half of the rule at the top of candidates.ts: write the
// incumbent arm as an IMPORT of the shipped constant and it silently becomes a
// second copy of whatever replaces it, giving you two buttons that play the
// same sound and every test still green.

import { describe as group, expect, it } from "vitest";
import { POKER_VOICES, type SfxName } from "../audio/pokerVoices";
import { validateSpec } from "../audio/voiceOverride";
import { STRIPS } from "./candidates";

group("the strips cover the app", () => {
  it("has a strip for every sound the table plays, and no others", () => {
    const named = STRIPS.map((s) => s.name).sort();
    const real = (Object.keys(POKER_VOICES) as SfxName[]).sort();
    expect(named).toEqual(real);
  });

  it("names each strip once", () => {
    expect(new Set(STRIPS.map((s) => s.name)).size).toBe(STRIPS.length);
  });
});

group("every arm is playable", () => {
  it("passes the gate that guards playback", () => {
    // A candidate the override gate refuses is a button that changes the
    // highlight and then plays the built-in — indistinguishable from a pick
    // that did not take, and impossible to notice by ear.
    // COLLECT, then assert once. An `expect` inside the loop throws on the
    // first bad arm and hides every one after it, so a wave of new candidates
    // gets fixed one run at a time - which is how a five-minute pass becomes an
    // afternoon. The failure message is the whole list.
    const refused: string[] = [];
    for (const strip of STRIPS) {
      for (const arm of strip.arms) {
        // Through JSON first: this is the shape it will be in when it comes
        // back off the disk, which is the only shape the gate ever sees in
        // production.
        const roundTripped = JSON.parse(JSON.stringify(arm.spec));
        if (validateSpec(roundTripped) === null) refused.push(`${strip.name}/${arm.id}`);
      }
    }
    expect(refused, "the override gate refuses these, so they would silently play the built-in").toEqual([]);
  });

  it("says something useful about each one", () => {
    for (const strip of STRIPS) {
      expect(strip.arms.length, strip.name).toBeGreaterThanOrEqual(3);
      for (const arm of strip.arms) {
        expect(arm.name.length, arm.id).toBeGreaterThan(0);
        // A blurb in the operator's terms, not a description of the synthesis.
        expect(arm.blurb.length, arm.id).toBeGreaterThan(15);
      }
    }
  });
});

group("the control arm is a real control", () => {
  it("has exactly one 'as it is now' per strip", () => {
    for (const strip of STRIPS) {
      const current = strip.arms.filter((a) => a.current);
      expect(current.length, strip.name).toBe(1);
    }
  });

  it("never repeats a sound inside a strip", () => {
    // THE ONE THAT MATTERS. Two identical specs in a strip is what an
    // imported control arm degrades into the moment the shipped voice moves.
    for (const strip of STRIPS) {
      const seen = new Map<string, string>();
      for (const arm of strip.arms) {
        const sig = JSON.stringify(arm.spec);
        const twin = seen.get(sig);
        expect(twin, `${strip.name}: ${arm.id} plays exactly the same sound as ${twin}`).toBeUndefined();
        seen.set(sig, arm.id);
      }
    }
  });

  it("matches what actually ships today", () => {
    // The control arm is a hand-written copy, so it can drift from the shipped
    // voice — and a drifted control is a strip whose "now" button does not
    // sound like now. Caught here rather than by ear.
    for (const strip of STRIPS) {
      const current = strip.arms.find((a) => a.current)!;
      expect(JSON.stringify(current.spec), `${strip.name} control has drifted from pokerVoices.ts`).toBe(
        JSON.stringify(POKER_VOICES[strip.name]),
      );
    }
  });

  it("gives every arm a unique id across the whole lab", () => {
    // Ids are what a pick is recorded against, so a collision would show one
    // strip's choice as another strip's.
    const ids = STRIPS.flatMap((s) => s.arms.map((a) => a.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
