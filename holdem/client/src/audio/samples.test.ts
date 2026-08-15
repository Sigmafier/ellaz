// The recorded bank cannot name a file that is not there.
//
// A missing sample is the quietest failure in this app: `ensureSample` marks
// it dead, `playSample` returns false, and `play()` falls through to the synth
// voice — so a typo in a file name is a strip whose recorded arm silently
// plays the synthesised sound it was picked INSTEAD OF. Every signal says it
// worked. The tap highlights, a sound comes out, no error is logged anywhere.
//
// That fall-through is the right runtime behaviour (a card must make a sound)
// and it is exactly why the check has to be here instead.

import { existsSync, readdirSync } from "node:fs";
import { describe as group, expect, it } from "vitest";
import { POKER_VOICES, type SfxName } from "./pokerVoices";
import { SAMPLE_GAIN } from "./sampleGain.gen";
import { NO_RECORDING, SAMPLE_ARMS } from "./samples";

const DIR = new URL("../../public/sfx/v1/", import.meta.url).pathname;
const used = [...new Set(Object.values(SAMPLE_ARMS).flatMap((a) => a.files))];

group("the recorded bank", () => {
  it("ships every file it names", () => {
    const missing = used.filter((f) => !existsSync(`${DIR}${f}.opus`));
    expect(missing, "named in samples.ts, absent from public/sfx/v1 — these arms would silently play the synth").toEqual([]);
  });

  it("names every file it ships", () => {
    // The other direction. An orphan is bytes in the deploy that nothing can
    // ever play, which is the same defect wearing the opposite sign.
    const onDisk = readdirSync(DIR)
      .filter((f) => f.endsWith(".opus"))
      .map((f) => f.replace(/\.opus$/, ""));
    expect(onDisk.filter((f) => !used.includes(f)), "shipped but unreachable").toEqual([]);
  });

  it("has a measured level for every file", () => {
    // Without a gain a sample plays at 1.0 against a level-matched palette,
    // which turns the strip into a loudness contest and makes the recorded
    // arm win for the wrong reason.
    expect(used.filter((f) => !(f in SAMPLE_GAIN)), "no entry in sampleGain.gen.ts").toEqual([]);
    for (const f of used) expect(SAMPLE_GAIN[f], f).toBeGreaterThan(0);
    for (const f of used) expect(SAMPLE_GAIN[f], f).toBeLessThanOrEqual(4);
  });

  it("points every arm at a real sound", () => {
    const names = Object.keys(POKER_VOICES) as SfxName[];
    for (const [id, arm] of Object.entries(SAMPLE_ARMS)) {
      expect(names, `${id} names a sound the table does not play`).toContain(arm.sfx);
      expect(arm.files.length, `${id} has no takes`).toBeGreaterThan(0);
    }
  });

  it("gives the two busiest sounds more than one take", () => {
    // cardSlide fires 5+ times a hand and chipClack on every call and blind.
    // One take at that rate is the repetition fatigue the whole bank exists
    // to fix, so this is a real requirement rather than a nicety.
    for (const busy of ["cardSlide", "chipClack"] as SfxName[]) {
      const arms = Object.values(SAMPLE_ARMS).filter((a) => a.sfx === busy);
      expect(arms.length, busy).toBeGreaterThan(0);
      expect(Math.max(...arms.map((a) => a.files.length)), `${busy} needs variants`).toBeGreaterThanOrEqual(3);
    }
  });

  it("says out loud which sounds have no recording", () => {
    // NO_RECORDING is what the studio shows instead of an empty group. If an
    // arm is ever added for one of them, this fails rather than leaving the
    // screen telling somebody there is nothing to hear.
    for (const sfx of NO_RECORDING) {
      expect(Object.values(SAMPLE_ARMS).some((a) => a.sfx === sfx), `${sfx} is listed as having no recording`).toBe(false);
    }
  });

  it("keeps recorded ids in their own namespace", () => {
    // The two stores are separate and a collision would make one pick read as
    // the other. `rec-` is also what samplePick.ts validates against.
    for (const id of Object.keys(SAMPLE_ARMS)) expect(id, id).toMatch(/^rec-[a-z][a-z0-9-]{0,23}$/);
  });
});
