import { describe, it, expect } from "vitest";
import {
  APP_LOCALES,
  PAGE_LOCALES,
  AUTONYM,
  ENGLISH_NAME,
  OG_LOCALE,
  RTL,
  DEFAULT_LOCALE,
  CANONICAL_LOCALE,
  dirOf,
  isAppLocale,
  isPageLocale,
  localePrefix,
} from "./locales";

describe("the two locale lists", () => {
  it("has no duplicates in either list", () => {
    expect(new Set(APP_LOCALES).size).toBe(APP_LOCALES.length);
    expect(new Set(PAGE_LOCALES).size).toBe(PAGE_LOCALES.length);
  });

  // The type system already proves this, but only for a list written as a
  // literal. This catches the runtime shape too, which is what every gate
  // script reads.
  it("PAGE_LOCALES is a subset of APP_LOCALES", () => {
    for (const l of PAGE_LOCALES) expect(APP_LOCALES).toContain(l);
  });

  it("has strictly fewer page languages than app languages, or equal - never more", () => {
    expect(PAGE_LOCALES.length).toBeLessThanOrEqual(APP_LOCALES.length);
  });

  it("both defaults are languages that actually have pages", () => {
    expect(isPageLocale(DEFAULT_LOCALE)).toBe(true);
    expect(isPageLocale(CANONICAL_LOCALE)).toBe(true);
  });

  it("x-default is NOT the canonical language", () => {
    // If these were the same, x-default would be answering "we have no page in
    // your language" with Hebrew, which is the wrong answer for everyone on
    // earth except Hebrew speakers - and they are matched by hreflang first.
    expect(DEFAULT_LOCALE).not.toBe(CANONICAL_LOCALE);
  });
});

describe("every language is fully described", () => {
  it.each(APP_LOCALES)("%s has an autonym, an English name and an og:locale", (locale) => {
    expect(AUTONYM[locale]?.length).toBeGreaterThan(0);
    expect(ENGLISH_NAME[locale]?.length).toBeGreaterThan(0);
    expect(OG_LOCALE[locale]).toMatch(/^[a-z]{2}_[A-Z]{2}$/);
  });

  it("RTL names only real languages", () => {
    for (const l of RTL) expect(isAppLocale(l)).toBe(true);
  });
});

describe("the autonyms are really written in their own script", () => {
  // The realistic failure is a copy-paste that leaves the English name where
  // the autonym belongs - "Russian" instead of "Русский". It type-checks, it
  // renders, and it defeats the entire reason autonyms exist, which is that
  // somebody who cannot read the current language still has to find their own.
  const SCRIPT: Partial<Record<string, RegExp>> = {
    he: /[֐-׿]/,
    ar: /[؀-ۿ]/,
    ru: /[Ѐ-ӿ]/,
  };

  it.each(Object.keys(SCRIPT))("%s is not written in Latin letters", (locale) => {
    const pattern = SCRIPT[locale]!;
    expect(pattern.test(AUTONYM[locale as never])).toBe(true);
    expect(/^[\x20-\x7F]+$/.test(AUTONYM[locale as never])).toBe(false);
  });

  it("the Latin-script languages are NOT written in Hebrew or Arabic", () => {
    for (const l of ["en", "es", "pt", "fr", "de", "it", "tr", "id"] as const) {
      expect(/[֐-׿؀-ۿ]/.test(AUTONYM[l])).toBe(false);
    }
  });

  it("carries no flag and no emoji", () => {
    // Two reasons, and the second is the load-bearing one. A flag is a country
    // and not a language. And this repo's standing rule is SVG only in product
    // output - a flag emoji renders differently on every platform and is simply
    // absent on some.
    const EMOJI = /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    for (const l of APP_LOCALES) {
      expect(EMOJI.test(AUTONYM[l]), `${l} autonym`).toBe(false);
      expect(EMOJI.test(ENGLISH_NAME[l]), `${l} English name`).toBe(false);
    }
  });
});

describe("direction", () => {
  it("Hebrew and Arabic are RTL, everything else is LTR", () => {
    expect(dirOf("he")).toBe("rtl");
    expect(dirOf("ar")).toBe("rtl");
    for (const l of APP_LOCALES) {
      if (l !== "he" && l !== "ar") expect(dirOf(l), l).toBe("ltr");
    }
  });

  it("an unknown language reads left-to-right rather than throwing", () => {
    // dirOf is called on a value read back from localStorage and from a DOM
    // attribute, both of which a user can edit. Guessing LTR is a shrug; an
    // exception is a blank screen.
    expect(dirOf("zz")).toBe("ltr");
  });
});

describe("guards", () => {
  it("accept real languages and reject everything else", () => {
    expect(isAppLocale("de")).toBe(true);
    expect(isPageLocale("de")).toBe(false); // German has no pages, and that is the point
    expect(isAppLocale("de-DE")).toBe(false);
    expect(isAppLocale("")).toBe(false);
    expect(isAppLocale(undefined)).toBe(false);
    expect(isAppLocale(null)).toBe(false);
    expect(isAppLocale(2)).toBe(false);
  });
});

describe("URL prefixes", () => {
  it("Hebrew is bare and every other language has a directory", () => {
    expect(localePrefix("he")).toBe("");
    for (const l of PAGE_LOCALES) {
      if (l === CANONICAL_LOCALE) continue;
      expect(localePrefix(l)).toBe(`/${l}`);
    }
  });

  it("never emits a trailing slash, so callers can concatenate freely", () => {
    for (const l of PAGE_LOCALES) expect(localePrefix(l).endsWith("/")).toBe(false);
  });
});
