import { describe, it, expect } from "vitest";
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

  it("declares a gender for every noun, because Hebrew adjectives must agree", () => {
    for (const noun of NOUNS) {
      expect(noun.id, `noun ${JSON.stringify(noun)}`).toMatch(/^[a-z][a-z-]*$/);
      expect(noun.en.length).toBeGreaterThan(0);
      expect(noun.he.length).toBeGreaterThan(0);
      expect(["m", "f"]).toContain(noun.gender);
      expect(noun.emoji.length).toBeGreaterThan(0);
    }
  });

  it("has both genders represented, or half the adjective forms are unreachable", () => {
    const genders = new Set(NOUNS.map((n) => n.gender));
    expect(genders.has("m")).toBe(true);
    expect(genders.has("f")).toBe(true);
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
    const masc = NOUNS.find((n) => n.gender === "m")!;
    const fem = NOUNS.find((n) => n.gender === "f")!;

    expect(renderName({ adj: adj.id, noun: masc.id }, "he")).toBe(`${masc.he} ${adj.he.m}`);
    expect(renderName({ adj: adj.id, noun: fem.id }, "he")).toBe(`${fem.he} ${adj.he.f}`);
    // The two forms must actually differ, or the test would pass on a pool that
    // ignored gender entirely.
    expect(adj.he.m).not.toBe(adj.he.f);
  });

  it("renders every combination in both languages without a gap", () => {
    for (const adj of ADJECTIVES) {
      for (const noun of NOUNS) {
        const name = { adj: adj.id, noun: noun.id };
        for (const locale of ["he", "en"] as const) {
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
