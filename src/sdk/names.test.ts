import { describe, it, expect } from "vitest";
import { SHIPPED_LOCALES } from "@i18n/locales";
import {
  ADJECTIVES,
  NOUNS,
  NAME_COMBINATIONS,
  isPlayerName,
  nameEmoji,
  pickName,
  renderName,
  rerollName,
  resolveName,
  type PlayerName,
} from "./names";
import { mulberry32 } from "@shared/rng";

describe("the word lists", () => {
  it("gives every adjective both Hebrew genders and an English form", () => {
    for (const adj of ADJECTIVES) {
      expect(adj.id, `adjective ${JSON.stringify(adj)}`).toMatch(/^[a-z][a-z-]*$/);
      expect(adj.en.length).toBeGreaterThan(0);
      expect(adj.he.m.length, `${adj.id} masculine`).toBeGreaterThan(0);
      expect(adj.he.f.length, `${adj.id} feminine`).toBeGreaterThan(0);
      // A copy-pasted row is the realistic way this breaks, and it breaks
      // silently: half the pool then reads as wrong-gender Hebrew with every
      // other test still green.
      expect(adj.he.m, `${adj.id} has identical gender forms`).not.toBe(adj.he.f);
    }
  });

  it("declares a gender per language for every noun, because they disagree", () => {
    for (const noun of NOUNS) {
      expect(noun.id, `noun ${JSON.stringify(noun)}`).toMatch(/^[a-z][a-z-]*$/);
      expect(noun.en.length).toBeGreaterThan(0);
      expect(noun.he.length).toBeGreaterThan(0);
      expect(noun.es.length).toBeGreaterThan(0);
      expect(["m", "f"], `${noun.id} he`).toContain(noun.gender.he);
      expect(["m", "f"], `${noun.id} es`).toContain(noun.gender.es);
      expect(noun.emoji.length).toBeGreaterThan(0);
    }
  });

  // The whole argument for a per-language column is that a shared one would be
  // WRONG, so this asserts the disagreement is real rather than theoretical. If
  // it ever drops to zero, one column would do and this design is overbuilt.
  it("has nouns whose Hebrew and Spanish genders disagree", () => {
    const split = NOUNS.filter((n) => n.gender.he !== n.gender.es);
    expect(split.map((n) => n.id)).toEqual(["turtle", "butterfly", "squirrel", "whale", "panda"]);
  });

  it("has both genders represented in each language, or half the forms are unreachable", () => {
    for (const lang of ["he", "es"] as const) {
      const genders = new Set(NOUNS.map((n) => n.gender[lang]));
      expect(genders.has("m"), `${lang} masculine`).toBe(true);
      expect(genders.has("f"), `${lang} feminine`).toBe(true);
    }
  });

  it("keeps every id unique — a duplicate would make one word unaddressable", () => {
    expect(new Set(ADJECTIVES.map((a) => a.id)).size).toBe(ADJECTIVES.length);
    expect(new Set(NOUNS.map((n) => n.id)).size).toBe(NOUNS.length);
  });

  // A ratchet, like catalog.test.ts. Shrinking the pool is allowed to fail
  // loudly: ids are persisted in profiles forever, so words are added, never
  // removed, and a drop here means someone's stored name just stopped resolving.
  it("offers at least 300 combinations", () => {
    expect(NAME_COMBINATIONS).toBe(ADJECTIVES.length * NOUNS.length);
    expect(NAME_COMBINATIONS).toBeGreaterThanOrEqual(300);
  });
});

describe("rendering a name", () => {
  const swiftTiger = (): PlayerName => ({ adj: "swift", noun: "tiger" });

  it("puts the adjective first in English", () => {
    expect(renderName(swiftTiger(), "en")).toBe("Swift Tiger");
  });

  it("puts the noun first in Hebrew, which is the order Hebrew actually uses", () => {
    const he = renderName(swiftTiger(), "he")!;
    const noun = NOUNS.find((n) => n.id === "tiger")!;
    expect(he.startsWith(noun.he)).toBe(true);
  });

  it("agrees the Hebrew adjective with the noun's gender", () => {
    const adj = ADJECTIVES.find((a) => a.id === "swift")!;
    const masc = NOUNS.find((n) => n.gender.he === "m")!;
    const fem = NOUNS.find((n) => n.gender.he === "f")!;

    expect(renderName({ adj: adj.id, noun: masc.id }, "he")).toBe(`${masc.he} ${adj.he.m}`);
    expect(renderName({ adj: adj.id, noun: fem.id }, "he")).toBe(`${fem.he} ${adj.he.f}`);
    // The two forms must actually differ, or the test would pass on a pool that
    // ignored gender entirely.
    expect(adj.he.m).not.toBe(adj.he.f);
  });

  it("agrees the Spanish adjective with the SPANISH gender, not the Hebrew one", () => {
    // "mariposa" is feminine in Spanish and פרפר is masculine in Hebrew. Reading
    // the wrong column renders "mariposa rápido", which is the exact defect the
    // per-language map exists to prevent — so the control uses a noun where the
    // two disagree. Against a shared column this line goes red.
    const swift = ADJECTIVES.find((a) => a.id === "swift")!;
    const butterfly = NOUNS.find((n) => n.id === "butterfly")!;
    expect(butterfly.gender.he).toBe("m");
    expect(butterfly.gender.es).toBe("f");
    expect(renderName({ adj: "swift", noun: "butterfly" }, "es")).toBe(`mariposa ${swift.es.f}`);
    expect(renderName({ adj: "swift", noun: "tiger" }, "es")).toBe(`tigre ${swift.es.m}`);
    expect(swift.es.m).not.toBe(swift.es.f);
  });

  it("puts the noun first in Spanish too, which is where Spanish puts it", () => {
    const es = renderName(swiftTiger(), "es")!;
    expect(es.startsWith("tigre")).toBe(true);
  });

  it("renders every combination in every page language without a gap", () => {
    for (const adj of ADJECTIVES) {
      for (const noun of NOUNS) {
        const name = { adj: adj.id, noun: noun.id };
        for (const locale of SHIPPED_LOCALES) {
          const rendered = renderName(name, locale);
          expect(rendered, `${adj.id}/${noun.id}/${locale}`).toBeTruthy();
          expect(rendered).not.toContain("undefined");
        }
      }
    }
  });

  it("answers undefined for an unknown word rather than inventing one", () => {
    expect(renderName({ adj: "swift", noun: "dragon" }, "en")).toBeUndefined();
    expect(renderName({ adj: "purple", noun: "tiger" }, "en")).toBeUndefined();
    expect(renderName(undefined, "en")).toBeUndefined();
    expect(resolveName({ adj: "swift", noun: "dragon" })).toBeUndefined();
  });

  it("carries the noun's emoji so a name can have a face", () => {
    const tiger = NOUNS.find((n) => n.id === "tiger")!;
    expect(nameEmoji(swiftTiger())).toBe(tiger.emoji);
    expect(nameEmoji({ adj: "swift", noun: "dragon" })).toBeUndefined();
  });
});

describe("shape validation", () => {
  it("accepts a well-formed pair", () => {
    expect(isPlayerName({ adj: "swift", noun: "tiger" })).toBe(true);
  });

  it("accepts ids that are not in the pool — words are added over time", () => {
    // Deliberate: a profile written by a NEWER build carries words this build
    // has never heard of. Rejecting it at the shape gate would delete the
    // child's name on every downgrade or stale tab.
    expect(isPlayerName({ adj: "swift", noun: "dragon" })).toBe(true);
  });

  it("rejects anything that is not two non-empty strings", () => {
    for (const bad of [
      null,
      undefined,
      "swift tiger",
      42,
      [],
      {},
      { adj: "swift" },
      { noun: "tiger" },
      { adj: "", noun: "tiger" },
      { adj: "swift", noun: "" },
      { adj: 1, noun: 2 },
    ]) {
      expect(isPlayerName(bad), JSON.stringify(bad)).toBe(false);
    }
  });
});

describe("picking a name", () => {
  it("is deterministic for a seeded rng", () => {
    expect(pickName(mulberry32(7))).toEqual(pickName(mulberry32(7)));
  });

  it("only ever picks words that resolve", () => {
    const rng = mulberry32(99);
    for (let i = 0; i < 500; i++) {
      expect(resolveName(pickName(rng))).toBeDefined();
    }
  });

  it("reaches every word given enough draws", () => {
    const rng = mulberry32(3);
    const adjs = new Set<string>();
    const nouns = new Set<string>();
    for (let i = 0; i < 20000; i++) {
      const name = pickName(rng);
      adjs.add(name.adj);
      nouns.add(name.noun);
    }
    expect(adjs.size).toBe(ADJECTIVES.length);
    expect(nouns.size).toBe(NOUNS.length);
  });

  it("never rerolls to the name you already had", () => {
    // The whole point of the button is that something changes. A reroll that
    // can return the current name reads as a broken button, and at 1-in-320 it
    // would be rare enough to never show up in manual testing.
    const rng = mulberry32(11);
    let current = pickName(rng);
    for (let i = 0; i < 2000; i++) {
      const next = rerollName(current, rng);
      expect(next).not.toEqual(current);
      current = next;
    }
  });

  it("rerolls from nothing without needing a previous name", () => {
    expect(resolveName(rerollName(undefined, mulberry32(5)))).toBeDefined();
  });

  it("rerolls away from an unresolvable name too", () => {
    const junk = { adj: "purple", noun: "dragon" };
    const next = rerollName(junk, mulberry32(5));
    expect(resolveName(next)).toBeDefined();
  });

  it("defaults to Math.random when handed no rng", () => {
    expect(resolveName(pickName())).toBeDefined();
  });
});

describe("promoting a language must not silently leave names in English", () => {
  // `cast.ts` is `Record<PageLocale, string>`, so promoting Spanish reds all 58
  // of its entries at COMPILE time. This file cannot take that shape: an
  // adjective carries `he: { m, f }` and an English `string`, so the per-locale
  // value is heterogeneous, and a `Noun` already has an `id` field - which is
  // also Indonesian's locale code, the collision that made `GameContent` nest
  // its languages under `copy` (see `src/content/types.ts`).
  //
  // So the gate is a TEST rather than a type. It is not a lesser gate for being
  // one - it names the file and fails the build the same way.
  //
  // It made the morphology gap loud, and Spanish is the answer to it: names DO
  // get the machinery, per language rather than per pool. Spanish shares
  // Hebrew's shape (noun first, adjective agreeing) and not its data, because
  // the two assign gender differently — so `gender` became a map. Russian's
  // three genders and German's declension will each need their own column and
  // their own `RENDER` row; neither can reuse this one.
  it("has every page locale's form for every adjective and noun", () => {
    for (const locale of SHIPPED_LOCALES) {
      for (const a of ADJECTIVES) {
        const form = (a as unknown as Record<string, unknown>)[locale];
        expect(form, `adjective "${a.id}" has no ${locale} form`).toBeDefined();
      }
      for (const n of NOUNS) {
        const form = (n as unknown as Record<string, unknown>)[locale];
        expect(form, `noun "${n.id}" has no ${locale} form`).toBeDefined();
      }
    }
  });

  it("renders a name in every page locale, never undefined", () => {
    // The positive control: without this, the check above is satisfied by a
    // pool nobody can actually render from.
    const name = { adj: ADJECTIVES[0].id, noun: NOUNS[0].id };
    for (const locale of SHIPPED_LOCALES) {
      const rendered = renderName(name, locale);
      expect(rendered, `renderName in ${locale}`).toBeTruthy();
      expect(rendered).not.toContain("undefined");
    }
  });
});
