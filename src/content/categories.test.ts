import { describe, it, expect } from "vitest";
import {
  CATEGORY_CHROME,
  CATEGORY_CONTENT,
  MIN_GAMES_FOR_A_PAGE,
  categoryCopy,
} from "./categories";
import { CATEGORY_IDS, PAGED_CATEGORIES, gamesIn } from "../build/routes";
import { analyse, violations } from "./voice";
import { CATEGORY_ORDER } from "../portal/catalog";
import { GAMES } from "../portal/games";
import { PAGE_LOCALES } from "../i18n/locales";
import type { GameCopy, Locale } from "./types";

const LOCALES: Locale[] = [...PAGE_LOCALES];
const PAGES = LOCALES.flatMap((l) =>
  CATEGORY_IDS.map((c) => [l, c, CATEGORY_CONTENT[l][c]] as const),
);

/**
 * A category page's own floor and ceiling, deliberately not the game page's.
 *
 * A game page is a manual and runs 600-1400 words. A landing page is an
 * ANSWER: somebody searched for a group, and the useful part of the page is
 * the list of games directly under the lede. Padding one to 600 words is how a
 * landing page turns into the thin-content-with-more-words shape Google's
 * guidance actually names.
 *
 * 150 rather than 250 because Hebrew says the same thing in about two thirds
 * of the words - measured here at 176-197 against English's 246-280 on prose
 * written natively in each. A single floor tuned against English would red a
 * correct Hebrew page, and a floor per language is a number nobody maintains.
 * The distance this floor has to see is empty-versus-real, and that gap is a
 * chasm at any value in this range.
 */
const MIN_WORDS = 150;
const MAX_WORDS = 700;

/**
 * `analyse` measures a game page, and a category page is a strict subset of
 * one - lede, body and FAQ, with no how-to, tips, teaches, ages or together.
 * Filling the absent sections with empty arrays runs the SAME analyser rather
 * than a second copy of its rules, which is what stops the two drifting the
 * first time a banned phrase is added to one and not the other.
 */
const asGameCopy = (c: (typeof PAGES)[number][2]): GameCopy =>
  ({
    name: "",
    metaTitle: c.metaTitle,
    metaDescription: c.metaDescription,
    lede: c.lede,
    body: c.body,
    howToPlay: [],
    tips: [],
    teaches: [],
    ages: [],
    accessibility: "",
    together: [],
    faq: c.faq,
    keywords: [],
  }) as GameCopy;

describe("category copy", () => {
  it("has something to measure", () => {
    // The positive control. Every assertion below iterates PAGES, and an empty
    // PAGES satisfies all of them in silence - the shape that has produced a
    // false clean sweep in this repo twice, once over 23 unmeasured Spanish
    // pages and once over a matcher that found nothing.
    expect(PAGES.length).toBe(LOCALES.length * CATEGORY_IDS.length);
    expect(PAGES.length).toBeGreaterThan(20);
  });

  it.each(PAGES)("%s/%s reads like a person wrote it", (locale, _category, copy) => {
    const report = analyse(asGameCopy(copy), locale);
    // Drop the two thresholds a landing page does not share with a manual: the
    // word band (see above) and the derived-digits floor, which asks a game
    // page for four statistics it has scripts for. A category page states no
    // number of its own except the group size, and that one is filled in by
    // the emitter rather than authored.
    const problems = violations(report).filter(
      (v) => !/^\d+ words, want/.test(v) && !/digit-bearing facts/.test(v),
    );
    expect(problems, problems.join("\n")).toEqual([]);
    expect(report.words).toBeGreaterThanOrEqual(MIN_WORDS);
    expect(report.words).toBeLessThanOrEqual(MAX_WORDS);
  });

  it.each(PAGES)("%s/%s fits a search result", (_locale, _category, copy) => {
    expect(copy.metaTitle.length).toBeLessThanOrEqual(60);
    expect(copy.metaDescription.length).toBeGreaterThanOrEqual(50);
    expect(copy.metaDescription.length).toBeLessThanOrEqual(160);
  });

  it.each(CATEGORY_IDS)("%s is written differently in every language", (category) => {
    // A copied file that was never rewritten is the realistic way a language
    // arrives half-done, and it type-checks perfectly. Compared on SENTENCES
    // of five words or more, because a heading and a game's name are identical
    // across languages by design.
    const long = (l: Locale) =>
      new Set(
        CATEGORY_CONTENT[l][category].body
          .flatMap((p) => p.split(/(?<=[.!?])\s+/))
          .map((s) => s.trim())
          .filter((s) => s.split(/\s+/).length >= 5),
      );
    for (const a of LOCALES)
      for (const b of LOCALES) {
        if (a >= b) continue;
        const shared = [...long(a)].filter((s) => long(b).has(s));
        expect(shared, `${category}: ${a} and ${b} share ${shared.length} sentences`).toEqual([]);
      }
  });

  it("never types the size of a group", () => {
    // The one derived number a category page may quote is `{games}`, and it is
    // a TOKEN because a word goes stale in silence: the home page shipped
    // "twenty-one" beside an ItemList of 22 for a day, and prose reads as
    // prose to every gate here. A literal digit next to the word for "games"
    // is the shape that would reintroduce it.
    const COUNT = /(?<![\d,.])\d{1,3}(?![\d,.])\s+(?:free\s+|juegos\s+)?(?:games|משחקים|juegos|jeux)/i;
    expect(COUNT.test("33 games in the browser"), "the matcher can fire").toBe(true);
    expect(COUNT.test("{games} games in the browser"), "and not on the token").toBe(false);
    for (const [locale, category, copy] of PAGES) {
      const prose = [copy.metaTitle, copy.metaDescription, copy.h1, copy.lede, ...copy.body]
        .concat(copy.faq.flatMap((f) => [f.q, f.a]))
        .join("\n");
      expect(COUNT.test(prose), `${locale}/${category} states a roster count`).toBe(false);
    }
  });

  it("fills the token, everywhere it appears", () => {
    for (const [locale, category] of PAGES) {
      const filled = categoryCopy(locale, category, 7);
      const all = [filled.metaTitle, filled.metaDescription, filled.h1, filled.lede]
        .concat(filled.body, filled.faq.flatMap((f) => [f.q, f.a]))
        .join("\n");
      expect(all, `${locale}/${category} leaks the token`).not.toContain("{games}");
    }
    // The control: a field the filler forgot would be invisible above, because
    // most fields never carry the token in the first place.
    expect(categoryCopy("en", "kids", 9).lede).toContain("9 games");
  });

  it("names its chrome in every language", () => {
    for (const l of LOCALES) {
      expect(CATEGORY_CHROME[l].games.length).toBeGreaterThan(2);
      expect(CATEGORY_CHROME[l].more.length).toBeGreaterThan(2);
    }
    // Distinct per language, or one of them is another's copy.
    expect(new Set(LOCALES.map((l) => CATEGORY_CHROME[l].games)).size).toBe(LOCALES.length);
  });
});

describe("which categories get a page", () => {
  it("reads the same list, in the same order, as the home screen", () => {
    // Two lists, one order. `CATEGORY_IDS` comes off the copy record because
    // the build must not import the catalog - its lazy loaders name every
    // game, and evaluating that inside `vite.config.ts` is how Phaser ends up
    // in the config. This test may import both, so it is the one place the
    // two can be compared.
    expect(CATEGORY_IDS).toEqual(CATEGORY_ORDER.map((c) => c.category));
  });

  it("emits a page only for a group big enough to be a group", () => {
    for (const c of CATEGORY_IDS) {
      const n = gamesIn(c).length;
      expect(PAGED_CATEGORIES.includes(c), `${c} has ${n} games`).toBe(
        n >= MIN_GAMES_FOR_A_PAGE,
      );
    }
  });

  it("is a filter that can actually exclude something", () => {
    // Without this, a threshold of 0 - or a filter that silently matched
    // everything - would pass every assertion above. Today `create` holds one
    // game and is the excluded one; the day it grows, this asserts that SOME
    // category is still below the line or that all of them cleared it, and
    // says which.
    const below = CATEGORY_IDS.filter((c) => gamesIn(c).length < MIN_GAMES_FOR_A_PAGE);
    expect(PAGED_CATEGORIES.length + below.length).toBe(CATEGORY_IDS.length);
    expect(MIN_GAMES_FOR_A_PAGE).toBeGreaterThan(1);
  });

  it("keeps a category page and a game page from claiming one URL", () => {
    // `/games/kids/` shares its prefix with `/games/snake/`, which is the URL
    // a person would guess and the one a search result reads best. The price
    // is this: a game whose id equals a category id would overwrite that
    // category's page in every language, silently, because both resolve to the
    // same file. A red test is a cheap price; a rename is a cheap fix.
    const ids = new Set(GAMES.map((g) => g.id));
    for (const c of CATEGORY_IDS)
      expect(ids.has(c), `a game is called "${c}", which is also a category`).toBe(false);
  });
});
