/**
 * Which languages exist, and in what capacity. Two lists, and the difference
 * between them is the whole point.
 *
 * A leaf module: it imports NOTHING, which is what lets the app, the build-time
 * page emitter and `src/content` all read the same answer. Two lists that
 * disagree about which languages have pages is the failure this file exists to
 * make impossible.
 *
 * ---------------------------------------------------------------------------
 * WHY THERE ARE TWO
 *
 * Google's own documentation, verbatim:
 *
 *   "Localized versions of a page are only considered duplicates if the main
 *    content of the page remains untranslated."
 *
 * and, under things to avoid:
 *
 *   "Translating only the boilerplate text of your pages while keeping the bulk
 *    of your content in a single language."
 *
 * So a language that has our BUTTONS but not our ARTICLES must emit no
 * document at all. Emitting `/de/games/snake/` with a German header and an
 * English body is not a smaller version of a German page - it is the named
 * anti-pattern, once per game, on a site that currently has none of it.
 *
 * `APP_LOCALES` is what the interface speaks. `PAGE_LOCALES` is what has prose.
 * `ROUTES` is derived from PAGE_LOCALES, so adding a language to the app emits
 * exactly zero documents and cannot cost us anything.
 *
 * ---------------------------------------------------------------------------
 * HOW A LANGUAGE GETS PROMOTED
 *
 * `GameContent.copy` is `Record<PageLocale, GameCopy>` and `SITE` is
 * `Record<PageLocale, SiteCopy>`. So adding a locale to PAGE_LOCALES before its
 * prose exists is a RED BUILD in all 22 content files plus site.ts - not a
 * lint warning, not a convention someone can forget, and not a script that can
 * be wrong about what it scanned. The compiler refuses.
 *
 * That is deliberate: every other guard in this repo is a script reading
 * `dist/`, and the lesson of 2026-08-08 is that a script can be confidently
 * wrong about what it is looking at. A type cannot.
 *
 * Promotion is therefore always two commits, in this order:
 *   1. write `<locale>` prose into all 22 content files and site.ts
 *   2. add `"<locale>"` here
 * Doing them the other way round fails the build, which is the gate working.
 */

/**
 * Every language the interface speaks.
 *
 * Order is display order in the picker: Hebrew and English first because they
 * are ours, then the rest by rough audience size. Adding one here costs the
 * translation of ~341 strings and NOTHING else - no route, no page, no sitemap
 * entry, no share card.
 */
export const APP_LOCALES = [
  "he",
  "en",
  "es",
  "pt",
  "fr",
  "de",
  "ar",
  "it",
  "ru",
  "tr",
  "id",
] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

/**
 * The languages that have written pages. A STRICT SUBSET of APP_LOCALES.
 *
 * Read the file header before adding to this list. The short version: prose
 * first, this list second, or the build goes red.
 */
export const PAGE_LOCALES = ["he", "en", "es"] as const;

export type PageLocale = (typeof PAGE_LOCALES)[number];

/**
 * Compile-time proof that PAGE_LOCALES really is a subset of APP_LOCALES.
 *
 * Without this, a typo (`"pt-br"`, `"esp"`) would give `PageLocale` a value the
 * app has no dictionary for, and the first symptom would be an untranslated
 * page rather than an error. The assignment is erased at build time and costs
 * nothing at runtime.
 */
const _pageLocalesAreAppLocales: readonly AppLocale[] = PAGE_LOCALES;
void _pageLocalesAreAppLocales;

/**
 * Which page a visitor reading the app in `locale` should be sent to.
 *
 * The app speaks eleven languages; pages exist in two. So a Spanish-speaking
 * player tapping a game card goes to the ENGLISH page, because the Spanish one
 * does not exist and will not until somebody writes it.
 *
 * That is not a compromise, it is the same answer `x-default` gives a crawler,
 * and making it a function rather than an inline `?:` is what stops it drifting:
 * the day Spanish is promoted to a PAGE locale this returns `"es"` on its own,
 * with no call site to find.
 *
 * The alternative - emitting a Spanish route because the app has a Spanish
 * dictionary - is the exact duplicate-content anti-pattern the two locale sets
 * exist to prevent. A translated BUTTON is not a translated ARTICLE.
 */
export function pageLocaleFor(locale: string): PageLocale {
  return (PAGE_LOCALES as readonly string[]).includes(locale)
    ? (locale as PageLocale)
    : DEFAULT_LOCALE;
}

/** Whether a language reads right-to-left. Arabic joins Hebrew; nothing else does. */
export const RTL: ReadonlySet<string> = new Set<AppLocale>(["he", "ar"]);

export function dirOf(locale: string): "rtl" | "ltr" {
  return RTL.has(locale) ? "rtl" : "ltr";
}

/**
 * The writing system each language's prose is in.
 *
 * This exists so a gate can catch the one mistake that is invisible in every
 * other check: a page emitted under the wrong locale's route. `/es/games/snake/`
 * carrying the English body is a valid document with a correct canonical, a
 * correct hreflang cluster and 900 words of prose - and it is the named
 * duplicate-content anti-pattern. Comparing the SCRIPT of what was emitted
 * against the script the locale is written in is the cheapest signal that
 * separates "translated" from "copied", and it needs no threshold at all for
 * the cross-script pairs.
 *
 * It cannot see es-vs-pt or en-vs-de, which share the Latin alphabet. That is
 * what the cross-locale body-difference gate is for; the two are complementary
 * and neither is sufficient.
 *
 * Turkish and Indonesian are `latin` despite their diacritics - the check is
 * about which BLOCK the letters come from, and `ı`, `ş`, `ğ` are all Latin.
 */
export type Script = "hebrew" | "arabic" | "cyrillic" | "latin";

export const SCRIPT: Record<AppLocale, Script> = {
  he: "hebrew",
  ar: "arabic",
  ru: "cyrillic",
  en: "latin",
  es: "latin",
  pt: "latin",
  fr: "latin",
  de: "latin",
  it: "latin",
  tr: "latin",
  id: "latin",
};

/**
 * `og:locale`, which wants a full language_TERRITORY tag rather than a bare
 * language code.
 *
 * The territories are opinions and are chosen for the audience we are actually
 * addressing, not for the language's country of origin: `pt_BR` because Brazil
 * is the reason Portuguese is on this list at all, and `es_ES` only because
 * Spanish has no single dominant market and the neutral form is the honest one.
 */
export const OG_LOCALE: Record<AppLocale, string> = {
  he: "he_IL",
  en: "en_US",
  es: "es_ES",
  pt: "pt_BR",
  fr: "fr_FR",
  de: "de_DE",
  ar: "ar_AR",
  it: "it_IT",
  ru: "ru_RU",
  tr: "tr_TR",
  id: "id_ID",
};

/**
 * Each language written in ITSELF. This is what the picker shows, and it is not
 * a style preference: somebody who cannot read the current language still has
 * to be able to find their own, and "Spanish" is unreadable to exactly the
 * person who needs it most.
 *
 * There are no flags here and there must never be. A flag is a country, not a
 * language - Spanish is not Spain, Portuguese is mostly not Portugal, and
 * Arabic is spoken across twenty-odd states. On this site specifically, putting
 * an Israeli flag next to an Arabic one would be a political statement a
 * children's game platform has no business making.
 */
export const AUTONYM: Record<AppLocale, string> = {
  he: "עברית",
  en: "English",
  es: "Español",
  pt: "Português",
  fr: "Français",
  de: "Deutsch",
  ar: "العربية",
  it: "Italiano",
  ru: "Русский",
  tr: "Türkçe",
  id: "Bahasa Indonesia",
};

/**
 * The same list in English, shown small under the autonym.
 *
 * It is for the adult holding the phone. A four-year-old picks their language
 * by recognising the shape of their own writing; a parent setting the device up
 * for them may be looking for the word "Arabic".
 */
export const ENGLISH_NAME: Record<AppLocale, string> = {
  he: "Hebrew",
  en: "English",
  es: "Spanish",
  pt: "Portuguese",
  fr: "French",
  de: "German",
  ar: "Arabic",
  it: "Italian",
  ru: "Russian",
  tr: "Turkish",
  id: "Indonesian",
};

/**
 * The language a visitor gets when nothing matches theirs - `x-default`, and
 * the fallback the picker offers.
 *
 * ENGLISH, not Hebrew, and that is a change from what this site shipped for
 * months. `/` is still the Hebrew home and still ranks as Hebrew; x-default is
 * a different question, and it asks what to serve a Turkish speaker we have no
 * Turkish page for. English is a better answer than Hebrew for everyone on
 * earth except Hebrew speakers, who are matched by hreflang before x-default is
 * ever consulted.
 */
export const DEFAULT_LOCALE: PageLocale = "en";

/** The language `/` itself is written in. Hebrew is canonical and always has been. */
export const CANONICAL_LOCALE: PageLocale = "he";

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (APP_LOCALES as readonly string[]).includes(value);
}

export function isPageLocale(value: unknown): value is PageLocale {
  return typeof value === "string" && (PAGE_LOCALES as readonly string[]).includes(value);
}

/**
 * The URL prefix for a language. Hebrew is bare because `/` is the Hebrew home;
 * everything else lives under its own directory.
 *
 * Subdirectories rather than subdomains or country domains, deliberately: they
 * inherit the domain's authority, they need no extra DNS or certificate, and
 * Search Console reports coverage per directory - which is the measurement
 * Phase 5 of this work depends on being able to take.
 */
export function localePrefix(locale: PageLocale): string {
  return locale === CANONICAL_LOCALE ? "" : `/${locale}`;
}
