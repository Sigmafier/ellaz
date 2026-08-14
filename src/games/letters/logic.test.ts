import { describe, it, expect } from "vitest";
import { CAST } from "@shared/cast";
import { mulberry32, seedFrom } from "@shared/rng";
import { PAGE_LOCALES } from "@i18n/locales";
import { SIMPLE } from "./words";
import {
  ALPHABETS,
  LEVELS,
  buildRound,
  contentLangOptions,
  firstLetter,
  isMilestoneRound,
  levelById,
  poolFor,
  refillBag,
} from "./logic";

const seeded = (label: string) => mulberry32(seedFrom(label));
const ALL_PICTURES = [...SIMPLE, ...Object.values(CAST).flat()];

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

  it("derives a real alphabet letter for EVERY picture (SIMPLE + cast) in every language", () => {
    // The load-bearing invariant: a picture whose first letter is not in the
    // pool could never be answered, and the correct choice would look foreign.
    for (const item of ALL_PICTURES) {
      for (const lang of PAGE_LOCALES) {
        const letter = firstLetter(item[lang], lang);
        expect(
          ALPHABETS[lang].includes(letter),
          `${item[lang]} (${lang}) -> "${letter}" not in the ${lang} alphabet`,
        ).toBe(true);
      }
    }
  });
});

describe("the simple word list", () => {
  it("has no duplicate picture", () => {
    expect(new Set(SIMPLE.map((i) => i.emoji)).size).toBe(SIMPLE.length);
  });

  it("holds the everyday words easy mode wants", () => {
    for (const en of ["dog", "cat", "home", "car", "ball"]) {
      expect(SIMPLE.some((i) => i.en === en), `SIMPLE is missing ${en}`).toBe(true);
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
        expect(round.options.filter((l) => l === round.correct)).toHaveLength(1);
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

  it("easy is the simple list; the pools widen and each holds no duplicate picture", () => {
    const easy = poolFor(levelById("easy"));
    const medium = poolFor(levelById("medium"));
    const hard = poolFor(levelById("hard"));

    expect(easy).toBe(SIMPLE);
    expect(easy.length).toBeLessThan(medium.length);
    expect(medium.length).toBeLessThan(hard.length);

    for (const [name, pool] of [
      ["easy", easy],
      ["medium", medium],
      ["hard", hard],
    ] as const) {
      expect(new Set(pool.map((i) => i.emoji)).size, `${name} has a duplicate picture`).toBe(
        pool.length,
      );
    }
  });
});

describe("refillBag - the shuffle bag", () => {
  const pool = poolFor(levelById("hard"));

  it("is a permutation: a full pass shows every picture exactly once", () => {
    const bag = refillBag(pool, seeded("bag"));
    expect(bag).toHaveLength(pool.length);
    expect(new Set(bag.map((i) => i.emoji)).size).toBe(pool.length);
    expect(new Set(bag.map((i) => i.emoji))).toEqual(new Set(pool.map((i) => i.emoji)));
  });

  it("never repeats the last-shown picture across a reshuffle seam", () => {
    for (let i = 0; i < 40; i++) {
      const avoid = pool[i % pool.length].emoji;
      expect(refillBag(pool, seeded(`seam-${i}`), avoid)[0].emoji).not.toBe(avoid);
    }
  });

  it("does not mutate the pool", () => {
    const before = pool.map((i) => i.emoji);
    refillBag(pool, seeded("nomutate"));
    expect(pool.map((i) => i.emoji)).toEqual(before);
  });

  it("is deterministic under a seeded rng", () => {
    expect(refillBag(pool, seeded("s"))).toEqual(refillBag(pool, seeded("s")));
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
