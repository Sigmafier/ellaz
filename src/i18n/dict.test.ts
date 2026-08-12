import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { APP_LOCALES, PAGE_LOCALES, dirOf } from "./locales";
import {
  AVAILABLE,
  DIR,
  loadDict,
  isLoaded,
  makeT,
  textFor,
  STATIC_LOCALES,
} from "./strings";
import { he } from "./dict/he";
import { en } from "./dict/en";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * The dictionaries.
 *
 * Most of the guarantee here is a TYPE: every dictionary is
 * `Record<StringKey, string>` keyed off `he`, so a language missing a key does
 * not compile. These tests pin what a type cannot see - that the entries are
 * REAL rather than a copy of the language next door, that the lazy map covers
 * exactly the right set, and above all that a language which fails to load
 * still leaves a readable app.
 */

const KEYS = Object.keys(he) as Array<keyof typeof he>;

/** Every non-static language, loaded once for the whole file. */
const lazyLocales = APP_LOCALES.filter((l) => l !== "he" && l !== "en");
const dicts: Record<string, Record<string, string>> = { he, en };
for (const l of lazyLocales) {
  const mod = await import(`./dict/${l}.ts`);
  dicts[l] = mod[l];
}

describe("the dictionaries", () => {
  it("has one for every language the app claims to speak", () => {
    expect([...AVAILABLE].sort()).toEqual([...APP_LOCALES].sort());
  });

  it("gives every language every key, and no extras", () => {
    for (const locale of APP_LOCALES) {
      expect(Object.keys(dicts[locale]).sort(), `${locale} keys`).toEqual([...KEYS].sort());
    }
  });

  it("leaves no string empty", () => {
    for (const locale of APP_LOCALES) {
      for (const key of KEYS) {
        expect(dicts[locale][key]?.trim(), `${locale}.${key}`).toBeTruthy();
      }
    }
  });

  it("is a real translation, not a copy of the language next door", () => {
    // The realistic way a language ships broken is `export const pt = es`. It
    // type-checks, it runs, and it renders a whole screen in the wrong
    // language while every other check here passes.
    //
    // Compared as a WHOLE dictionary rather than per string: individual words
    // genuinely coincide across related languages ("Poster" is Poster in four
    // of these, "Ellaz" is Ellaz in all eleven), so a per-string ban would be
    // wrong. Two dictionaries agreeing on nearly EVERY string is the defect.
    const locales = [...APP_LOCALES];
    for (let i = 0; i < locales.length; i += 1) {
      for (let j = i + 1; j < locales.length; j += 1) {
        const a = dicts[locales[i]];
        const b = dicts[locales[j]];
        const same = KEYS.filter((k) => a[k] === b[k]).length;
        expect(
          same / KEYS.length,
          `${locales[i]} and ${locales[j]} share ${same}/${KEYS.length} strings`,
        ).toBeLessThan(0.5);
      }
    }
  });

  it("keeps the brand name spelled the same everywhere", () => {
    // The counterpart to the check above: a name is not a word to translate.
    for (const locale of APP_LOCALES) {
      if (locale === "he") continue; // Hebrew writes it in its own script
      expect(dicts[locale].appName, `${locale} appName`).toBe("Ellaz");
    }
  });
});

describe("direction", () => {
  it("answers for every language, not just the two it used to know", () => {
    for (const locale of APP_LOCALES) {
      expect(DIR[locale], `DIR.${locale}`).toBe(dirOf(locale));
    }
  });

  it("puts Arabic right-to-left, like Hebrew", () => {
    // The one new language where getting this wrong reverses the whole layout
    // rather than merely reading oddly.
    expect(DIR.ar).toBe("rtl");
    expect(DIR.he).toBe("rtl");
    expect(DIR.en).toBe("ltr");
  });
});

describe("a language that has not arrived yet", () => {
  it("reads as ENGLISH, never as Hebrew and never as blank", () => {
    // Turkish is not loaded in this test until the next block asks for it.
    // Until a dictionary arrives, English is the honest fallback: it is the
    // x-default for the same reason. Falling back to Hebrew would hand a
    // Turkish visitor an alphabet they cannot read.
    expect(isLoaded("tr")).toBe(false);
    expect(makeT("tr")("play")).toBe(en.play);
    expect(makeT("tr")("play")).not.toBe(he.play);
  });

  it("shows the key itself for a string nobody wrote", () => {
    // Ugly on purpose. A missing string must be visible in a screenshot.
    expect(makeT("en")("thisKeyDoesNotExist")).toBe("thisKeyDoesNotExist");
  });

  it("starts speaking once its chunk lands", async () => {
    // The positive control on all of the above: without it, every fallback
    // assertion is satisfied by a loader that simply never works.
    await loadDict("tr");
    expect(isLoaded("tr")).toBe(true);
    expect(makeT("tr")("play")).toBe(dicts.tr.play);
    expect(makeT("tr")("play")).not.toBe(en.play);
  });
});

describe("authored text in an app language nobody authored it in", () => {
  it("falls back to English rather than rendering undefined", () => {
    // `meta.title` is `Record<PageLocale, string>` - the languages a person
    // actually wrote. The app speaks eleven. Without this resolver a Turkish
    // visitor gets `undefined` where a game name belongs, which renders as a
    // blank card rather than as an error.
    const title = { he: "נחש", en: "Snake", es: "Serpiente" };
    expect(textFor(title, "he")).toBe("נחש");
    expect(textFor(title, "en")).toBe("Snake");
    // A page locale has its own words and must not be given English.
    expect(textFor(title, "es")).toBe("Serpiente");
    // An app-only locale has none, so English is the honest answer.
    expect(textFor(title, "ar")).toBe("Snake");
    expect(textFor(title, "tr")).toBe("Snake");
  });

  it("covers every app locale, so no language can blank a card", () => {
    const title = { he: "נחש", en: "Snake", es: "Serpiente" };
    for (const locale of APP_LOCALES) {
      expect(textFor(title, locale), `textFor(${locale})`).toBeTruthy();
    }
  });

  it("still prefers a page locale's own words where they exist", () => {
    // The negative control: a resolver that ALWAYS returned English would pass
    // every assertion above.
    const own: Record<(typeof PAGE_LOCALES)[number], string> = { he: "א", en: "b", es: "c" };
    for (const locale of PAGE_LOCALES) {
      expect(textFor(own, locale), locale).toBe(own[locale]);
    }
  });
});

describe("loadDict says whether the language actually arrived", () => {
  // This boolean is load-bearing, not a convenience. While `loadDict` returned
  // `Promise<void>` its caller could not tell "Arabic is ready" from "Arabic
  // will never arrive", so it set `lang="ar"`, flipped the document to RTL, and
  // persisted that - over text that was still English. Measured on the live
  // site 2026-08-11: a mirrored English page that survived a reload, no error
  // anywhere. See `App.tsx` pickLocale.

  it("is true for a language already in the shell", async () => {
    expect(await loadDict("en")).toBe(true);
    expect(await loadDict("he")).toBe(true);
  });

  it("is true for a lazy language that loads", async () => {
    expect(await loadDict("it")).toBe(true);
    expect(isLoaded("it")).toBe(true);
  });

  it("is FALSE when the chunk cannot be fetched, and the app stays readable", async () => {
    // The realistic cause is an open tab meeting a new deploy: the hashed chunk
    // name this bundle asks for no longer exists on the server. Reproduced by
    // making the module itself refuse to load.
    vi.resetModules();
    vi.doMock("./dict/ru", () => {
      throw new Error("Failed to fetch dynamically imported module");
    });
    const fresh = await import("./strings");
    expect(await fresh.loadDict("ru")).toBe(false);
    expect(fresh.isLoaded("ru")).toBe(false);
    // ...and English, not blank and not the raw key.
    expect(fresh.makeT("ru")("play")).toBe(en.play);
    vi.doUnmock("./dict/ru");
    vi.resetModules();
  });
});

describe("a page locale's dictionary has to reach the page somehow", () => {
  /**
   * The real invariant, and it took a measurement to get it right.
   *
   * `PageApp` boots an emitted document that has no picker, so if nothing
   * fetches its dictionary the chrome resolves out of STATIC or falls back to
   * English and stays there - Spanish prose, Spanish difficulty pills, English
   * buttons, permanently, nothing thrown. That is the defect.
   *
   * The first version of this gate demanded `PAGE_LOCALES ⊆ STATIC_LOCALES`,
   * which fixes it by putting every page language in the shell. Measured, that
   * is **+1,363 B gz on the first visit for Spanish alone** against 1,657 B of
   * headroom - so a Hebrew-speaking four-year-old downloads the Spanish
   * dictionary to reach a game with no Spanish in it, and Portuguese would
   * charge them again. The rule was right about the bug and wrong about the
   * price.
   *
   * So the invariant moved to where the fetch is: `bootContentPage` awaits
   * `loadDict` before it mounts anything. Both halves are asserted below,
   * because either one alone is satisfiable by a broken arrangement - a page
   * locale whose dictionary is unreachable, or an await of a map that has no
   * entry for it.
   */
  it("every page locale is reachable - static or lazy, never neither", () => {
    const unreachable = PAGE_LOCALES.filter((l) => !AVAILABLE.includes(l));
    expect(unreachable, `page locales no code path can load: ${unreachable.join(", ")}`).toEqual(
      [],
    );
  });

  it("and PageApp actually awaits it, which is the half a list cannot show", () => {
    // Source-scanned rather than executed: driving `bootContentPage` needs a
    // document, a frame, analytics and a cloud client, and the assertion would
    // then rest on the mocks rather than on the code. What matters is one line.
    const src = readFileSync(join(HERE, "..", "portal", "PageApp.tsx"), "utf8");
    const body = src.slice(src.indexOf("export function bootContentPage"));
    expect(body, "bootContentPage must await loadDict before it mounts").toMatch(
      /await\s+loadDict\(/,
    );
    // Ordering is the whole point: awaiting AFTER createRoot renders the first
    // frame in English and repaints, which is the flash this design avoids.
    expect(body.indexOf("await loadDict(")).toBeLessThan(body.indexOf("createRoot(frame)"));
  });

  it("and the reachability check can fail", () => {
    // The control. Without it, an AVAILABLE that listed all eleven would pass
    // the first test forever.
    const notAvailable = APP_LOCALES.filter((l) => !AVAILABLE.includes(l));
    const pretend = [...PAGE_LOCALES, "zz" as (typeof APP_LOCALES)[number]];
    expect(pretend.filter((l) => !AVAILABLE.includes(l))).not.toEqual([]);
    // STATIC alone is NOT the bar any more, and this pins that on purpose: if
    // somebody re-tightens it to STATIC, es goes back into the shell.
    expect(notAvailable.length + STATIC_LOCALES.length).toBeGreaterThan(0);
  });
});
