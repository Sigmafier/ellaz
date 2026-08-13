import { describe, expect, it } from "vitest";
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
  voiceDurationMs,
} from "@sdk/voice";
import type { SfxName } from "@sdk/types";
import {
  EVENT_TITLES,
  EVENT_WHERE,
  GALLERY,
  GALLERY_ORDER,
  OVERRODE_BLIND,
  VERDICT,
  shippedCandidate,
} from "./voices";

const NAMES = Object.keys(GALLERY) as SfxName[];

describe("the gallery", () => {
  it("offers a choice for every sound the app can play", () => {
    for (const n of NAMES) {
      expect(GALLERY[n].length, `${n} has nothing to compare`).toBeGreaterThan(
        1,
      );
    }
  });

  it("leads with the sounds heard in the most places", () => {
    // The old rationale was "least decided first" and it died on 2026-08-13,
    // when the last unjudged sound got a verdict. Order is now blast radius,
    // so a re-listen starts where a mistake costs most: `tap` is the home
    // screen, the boards and 16 games; `streak` currently plays nowhere.
    expect(GALLERY_ORDER[0]).toBe("tap");
    expect(GALLERY_ORDER[1]).toBe("pop");
    expect(GALLERY_ORDER[GALLERY_ORDER.length - 1]).toBe("streak");
  });

  it("records a verdict for every sound, and none of them is a blind result", () => {
    // The distinction is the whole point of the table. Every sound was chosen
    // from a strip with the NAMES SHOWING, which is a preference; six of them
    // additionally beat a blind-round winner, which is a result being
    // overridden. Collapsing the two is how a preference gets remembered as
    // evidence - the exact mistake docs/juice-lab.md records.
    for (const n of NAMES) {
      expect(VERDICT[n], `${n} has no verdict`).toBeDefined();
      expect(
        VERDICT[n],
        `${n} was never blind-judged in its current voice`,
      ).toBe("picked");
    }
  });

  it("remembers which picks overrode a blind-round winner", () => {
    // "But Shutter won the tournament" is a true sentence, and it stays
    // answerable only while this list exists. Losing it would make six
    // overrides look like they had never happened.
    expect([...OVERRODE_BLIND].sort()).toEqual([
      "coin",
      "fail",
      "star",
      "success",
      "tap",
      "win",
    ]);
    // pop replaced Cork, itself a pick; flip and streak had no prior round.
    for (const n of ["pop", "flip", "streak"] as SfxName[]) {
      expect(
        OVERRODE_BLIND,
        `${n} had no blind winner to override`,
      ).not.toContain(n);
    }
    for (const n of OVERRODE_BLIND) {
      expect(NAMES, `${n} is not a real sound`).toContain(n);
    }
  });

  it("lists every sound exactly once, so none is unreachable", () => {
    expect([...GALLERY_ORDER].sort()).toEqual([...NAMES].sort());
  });

  it("names and locates every sound in both languages", () => {
    for (const n of NAMES) {
      for (const table of [EVENT_TITLES, EVENT_WHERE]) {
        expect(table[n].he.length, `${n} he`).toBeGreaterThan(0);
        expect(table[n].en.length, `${n} en`).toBeGreaterThan(0);
      }
    }
  });
});

describe("the control arm", () => {
  // The old lab recorded a verdict as "the control won" and left WHAT the
  // control was to a comment in another file. A week later that turned out to
  // be ambiguous enough to nearly re-ship two sounds nobody had chosen. So the
  // shipped arm is not a label here - it is asserted to be the very object
  // `audio.ts` plays.
  const SHIPPED: Record<SfxName, unknown> = {
    tap: TAP,
    pop: POP,
    flip: FLIP,
    success: SUCCESS,
    fail: FAIL,
    win: WIN,
    coin: COIN,
    star: STAR,
    streak: STREAK,
  };

  it("is the actual shipped spec, not a transcription of it", () => {
    for (const n of NAMES) {
      expect(shippedCandidate(n).spec, `${n}`).toBe(SHIPPED[n]);
    }
  });

  it("is exactly one entry per sound", () => {
    for (const n of NAMES) {
      expect(GALLERY[n].filter((x) => x.shipped).length, `${n}`).toBe(1);
    }
  });

  it("leads its strip, so the first button is what the app plays now", () => {
    for (const n of NAMES) {
      expect(GALLERY[n][0].shipped, `${n} buries its shipped arm`).toBe(true);
    }
  });

  it("is not secretly duplicated by the arm it replaced", () => {
    // THE GUARD THAT WOULD HAVE CAUGHT 2026-08-13, and did not exist before it.
    //
    // Every "was" arm used to be written as the SHIPPED CONSTANT - `TAP`,
    // `SUCCESS`, `WIN` and six more. That is correct exactly until the shipped
    // constant moves. When all nine were re-voiced at once, each of those arms
    // would have silently become a second copy of its own replacement: two
    // buttons in one strip playing an identical sound, one of them labelled
    // with the old name, and every other test in this file still green,
    // because a duplicate spec is a perfectly valid spec.
    //
    // Deep equality and not object identity: `struck()` mints a fresh object
    // every call, so identity can never collide and would prove nothing. What
    // has to be true is that no two arms in a strip SOUND the same.
    for (const n of NAMES) {
      const seen = new Map<string, string>();
      for (const x of GALLERY[n]) {
        const fingerprint = JSON.stringify(x.spec);
        const twin = seen.get(fingerprint);
        expect(
          twin,
          `${n}: ${x.id} is byte-identical to ${twin}`,
        ).toBeUndefined();
        seen.set(fingerprint, x.id);
      }
    }
  });
});

describe("every candidate", () => {
  const all = NAMES.flatMap((n) => GALLERY[n].map((x) => ({ n, x })));

  it("has an id unique across the whole gallery", () => {
    // Ids are PERSISTED in the operator's pick. A collision across two sounds
    // would silently resolve one pick to the other's voice.
    const ids = all.map(({ x }) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is described in both languages", () => {
    for (const { n, x } of all) {
      expect(x.name.he.length, `${n}/${x.id}`).toBeGreaterThan(0);
      expect(x.name.en.length, `${n}/${x.id}`).toBeGreaterThan(0);
      expect(x.blurb.he.length, `${n}/${x.id}`).toBeGreaterThan(0);
      expect(x.blurb.en.length, `${n}/${x.id}`).toBeGreaterThan(0);
    }
  });

  it("stays quiet enough for a child holding a phone to their ear", () => {
    // Summed layer gain, which is the worst case if every layer peaks at once.
    // The loudest shipped voice sits near 0.5; 1.0 is the clipping point and
    // this is the one property in the file where being wrong hurts somebody.
    for (const { n, x } of all) {
      const sum = x.spec.layers.reduce((t, l) => t + l.gain, 0);
      expect(sum, `${n}/${x.id} sums to ${sum.toFixed(2)}`).toBeLessThan(1);
    }
  });

  it("is short enough to be a UI sound and not a jingle", () => {
    for (const { n, x } of all) {
      expect(voiceDurationMs(x.spec), `${n}/${x.id}`).toBeLessThan(4000);
    }
  });

  it("declares at least one layer", () => {
    for (const { n, x } of all) {
      expect(x.spec.layers.length, `${n}/${x.id}`).toBeGreaterThan(0);
    }
  });
});
