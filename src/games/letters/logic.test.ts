import { describe, it, expect } from "vitest";
import { CAST, CAST_THEMES } from "@shared/cast";
import { mulberry32, seedFrom } from "@shared/rng";
import { PAGE_LOCALES } from "@i18n/locales";
import {
  ALPHABETS,
  LEVELS,
  buildRound,
  contentLangOptions,
  firstLetter,
  isMilestoneRound,
  levelById,
  nextChallenge,
  pickItem,
  poolFor,
} from "./logic";

const seeded = (label: string) => mulberry32(seedFrom(label));

describe("firstLetter", () => {
  it("uppercases the initial for Latin scripts", () => {
    expect(firstLetter("banana", "en")).toBe("B");
    expect(firstLetter("fire truck", "en")).toBe("F");
    expect(firstLetter("ice cream", "en")).toBe("I");
  });

  it("folds Spanish accents onto the base letter", () => {
    expect(firstLetter("árbol", "es")).toBe("A");
    expect(firstLetter("avión", "es")).toBe("A");
    expect(firstLetter("élite", "es")).toBe("E");
  });

  it("takes the written first letter in Hebrew, never a final form", () => {
    expect(firstLetter("בננה", "he")).toBe("ב");
    expect(firstLetter("אריה", "he")).toBe("א");
    // geresh sits AFTER the first letter, so [0] is still a base letter.
    expect(firstLetter("ג'ירפה", "he")).toBe("ג");
  });

  it("derives a real alphabet letter for EVERY cast word in EVERY language", () => {
    // The load-bearing invariant: a picture whose first letter is not in the
    // pool could never be answered, and the correct choice would look foreign.
    for (const theme of CAST_THEMES) {
      for (const item of CAST[theme]) {
        for (const lang of PAGE_LOCALES) {
          const letter = firstLetter(item[lang], lang);
          expect(
            ALPHABETS[lang].includes(letter),
            `${item[lang]} (${lang}) -> "${letter}" not in the ${lang} alphabet`,
          ).toBe(true);
        }
      }
    }
  });
});

describe("ALPHABETS", () => {
  it("excludes the five Hebrew final forms", () => {
    for (const final of ["ך", "ם", "ן", "ף", "ץ"]) {
      expect(ALPHABETS.he.includes(final)).toBe(false);
    }
    expect(ALPHABETS.he.length).toBe(22);
  });

  it("keeps Ñ as its own Spanish letter and no accented vowels", () => {
    expect(ALPHABETS.es.includes("Ñ")).toBe(true);
    expect(ALPHABETS.es.some((l) => "ÁÉÍÓÚ".includes(l))).toBe(false);
  });
});

describe("buildRound", () => {
  const item = { emoji: "🍌", he: "בננה", en: "banana", es: "plátano" };

  it("always includes the correct letter, exactly once, with no duplicates", () => {
    for (const lang of PAGE_LOCALES) {
      for (const choices of [2, 3, 4]) {
        const round = buildRound(lang, item, choices, seeded(`${lang}-${choices}`));
        expect(round.options).toHaveLength(choices);
        expect(round.options).toContain(round.correct);
        expect(new Set(round.options).size).toBe(choices);
        // The correct letter is never ALSO one of the distractors.
        expect(round.options.filter((l) => l === round.correct)).toHaveLength(1);
        // Every option is a real letter of that alphabet.
        for (const opt of round.options) expect(ALPHABETS[lang].includes(opt)).toBe(true);
      }
    }
  });

  it("is deterministic under a seeded rng", () => {
    const a = buildRound("en", item, 4, seeded("same"));
    const b = buildRound("en", item, 4, seeded("same"));
    expect(a).toEqual(b);
  });
});

describe("levels and pools", () => {
  it("resolves each level id and ramps choices 2 -> 3 -> 4", () => {
    expect(LEVELS.map((l) => l.id)).toEqual(["easy", "medium", "hard"]);
    expect(LEVELS.map((l) => l.choices)).toEqual([2, 3, 4]);
    expect(() => levelById("easy")).not.toThrow();
  });

  it("hard draws from every theme, easy from the two familiar ones", () => {
    expect(poolFor(levelById("hard")).length).toBe(poolFor(levelById("hard")).length);
    expect(new Set(levelById("hard").themes)).toEqual(new Set(CAST_THEMES));
    expect(levelById("easy").themes).toEqual(["animals", "fruit"]);
    expect(poolFor(levelById("hard")).length).toBeGreaterThan(poolFor(levelById("easy")).length);
  });

  it("pickItem avoids the previous picture when it can", () => {
    const pool = poolFor(levelById("hard"));
    for (let i = 0; i < 40; i++) {
      const prev = pool[i % pool.length].emoji;
      expect(pickItem(pool, seeded(`pick-${i}`), prev).emoji).not.toBe(prev);
    }
  });
});

describe("nextChallenge", () => {
  it("returns a picture with matching, correct letter choices", () => {
    const level = levelById("medium");
    const c = nextChallenge(level, "en", seeded("chal"));
    expect(c.options).toHaveLength(level.choices);
    expect(c.options).toContain(c.correct);
    expect(c.correct).toBe(firstLetter(c.item.en, "en"));
  });
});

describe("contentLangOptions", () => {
  it("offers all three to Hebrew and the two Latin ones elsewhere, self first", () => {
    expect(contentLangOptions("he")).toEqual(["he", "en", "es"]);
    expect(contentLangOptions("en")).toEqual(["en", "es"]);
    expect(contentLangOptions("es")).toEqual(["es", "en"]);
  });
});

describe("isMilestoneRound", () => {
  it("is true every fifth round and never at zero", () => {
    expect(isMilestoneRound(0)).toBe(false);
    expect(isMilestoneRound(5)).toBe(true);
    expect(isMilestoneRound(7)).toBe(false);
    expect(isMilestoneRound(10)).toBe(true);
  });
});
