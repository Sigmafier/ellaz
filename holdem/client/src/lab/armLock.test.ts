// A settled pick is matched back to its arm BY VALUE. So an arm's spec is
// frozen once it has shipped.
//
// THE FAILURE THIS EXISTS FOR
//
// Picking a sound stores the whole `VoiceSpec` under `holdem:voices:v1` - not
// the arm's id. That is the right call for the AUDIO (the pick keeps playing
// exactly what was picked, even if this file is rewritten under it) and it
// leaves the LABEL with nothing to hold on to. `pickedSounds()` in Studio.tsx
// recovers the name by comparing the stored spec against every candidate with
// `JSON.stringify`, so:
//
//   change one digit of a shipped arm
//     -> the stored spec matches nothing
//     -> the strip shows no selection and the settled row reads back the
//        DEFAULT's name
//     -> while the audio still plays their pick
//
// The screen then disagrees with the speakers, in the one place whose whole
// job is to tell somebody what they chose, and nothing errors. The operator's
// word for what they want here was "locked", and this is the mechanism: arms
// are APPEND-ONLY. Add as many as you like. Never edit one.
//
// WHAT IS DELIBERATELY NOT LOCKED
//
// The `current` arm of each strip - the "as it is now" control. Picking it
// stores nothing at all (`setOverride(name, null)`), so nobody's pick can be
// orphaned by it, and it is PINNED to the shipped voice by candidates.test.ts
// instead. Moving a shipped voice is a decision; it must move its control with
// it, and the two tests together say exactly that.

import { readFileSync, writeFileSync } from "node:fs";
import { describe as group, expect, it } from "vitest";
import { STRIPS } from "./candidates";

const LOCK = new URL("./arms.lock.json", import.meta.url);

/** FNV-1a over the exact string the studio compares. Short, stable, enough. */
function fingerprint(spec: unknown): string {
  const s = JSON.stringify(spec);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  // The LENGTH as well as the hash. Two specs of different length cannot
  // collide however the hash lands, and length is the thing an edit almost
  // always changes.
  return `${s.length}-${(h >>> 0).toString(36)}`;
}

function live(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const strip of STRIPS) {
    for (const arm of strip.arms) {
      if (arm.current) continue;
      out[`${strip.name}/${arm.id}`] = fingerprint(arm.spec);
    }
  }
  return out;
}

group("shipped arms are frozen", () => {
  it("plays exactly what it played when somebody settled it", () => {
    const now = live();

    // Regenerating is one env var, and it is deliberately spelled out rather
    // than wired to `vitest -u`: `-u` is what somebody types to make a snapshot
    // stop complaining, and this is not a snapshot. It is a promise.
    if (process.env.UPDATE_ARM_LOCK === "1") {
      writeFileSync(LOCK, `${JSON.stringify(now, null, 2)}\n`);
      console.warn(`arms.lock.json rewritten with ${Object.keys(now).length} arms`);
      return;
    }

    const locked: Record<string, string> = JSON.parse(readFileSync(LOCK, "utf8"));

    // ADDED is fine, and is the whole point - a wave of new candidates must not
    // need a ceremony. It is reported so a reviewer can see the count move.
    const added = Object.keys(now).filter((k) => !(k in locked));

    const changed = Object.keys(locked).filter((k) => k in now && locked[k] !== now[k]);
    const removed = Object.keys(locked).filter((k) => !(k in now));

    expect(
      changed,
      "these arms have been EDITED. Anybody who settled one now sees the default's name over their own sound. Add a new arm instead, or set UPDATE_ARM_LOCK=1 if you have decided to unlabel those picks",
    ).toEqual([]);
    expect(
      removed,
      "these arms are GONE. A settled pick that names one has nothing to match, so it reads back as unset",
    ).toEqual([]);
    expect(added.length, `${added.length} new arms - fine, run UPDATE_ARM_LOCK=1 to record them`).toBe(0);
  });

  it("locks a real number of arms, not an empty file", () => {
    // The positive control. Every assertion above passes vacuously over an
    // empty lock, and an empty lock is exactly what a broken reader produces.
    const locked = JSON.parse(readFileSync(LOCK, "utf8"));
    expect(Object.keys(locked).length).toBeGreaterThan(150);
  });

  it("fingerprints two different specs differently", () => {
    // The other control. A fingerprint that returned a constant would report
    // every arm unchanged forever, which is the same green as correctness.
    const a = STRIPS[0].arms[0].spec;
    const b = STRIPS[0].arms[1].spec;
    expect(fingerprint(a)).not.toBe(fingerprint(b));
    expect(fingerprint(a)).toBe(fingerprint(JSON.parse(JSON.stringify(a))));
  });
});
