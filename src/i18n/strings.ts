// Ellaz UI strings — the portal-shell chrome, in every language the app speaks.
//
// The strings themselves live one-language-per-file in `dict/`. This file is
// the resolver, and it keeps the API it has always had (`makeT`, `STRINGS`,
// `DIR`, `LOCALES`) so nothing that renders had to change when the shape did.
//
// WHY ONE FILE PER LANGUAGE
// The old shape was `key -> { he, en }`, which reads beautifully and cannot be
// code-split: every language is interleaved with every other, so a bundler has
// to ship all of them or none. Eleven interleaved dictionaries in the shell
// would land on a child's first visit, and the first visit has ~3 KB of room.
// Keyed by LANGUAGE first, each one is a module Rollup can put in its own
// chunk.
//
// `he` and `en` are STATIC. They are the two the shell has always carried, so
// the split costs the first visit nothing, and English — the default since
// 2026-08-14 — must render on the first frame with nothing to await. Hebrew
// stays static beside it: it is the other language with pages, and it was the
// default long enough that most returning players still have it stored. Every
// other language is a
// `locale-<xx>` chunk fetched only by somebody who asked for it, PAGE
// LANGUAGES INCLUDED: see the note on `STATIC_LOCALES` for why that stopped
// being "make it static" and became "make the page fetch it".
//
// Until that chunk arrives, a string resolves through ENGLISH rather than
// through Hebrew: English is the x-default and the root for exactly this
// reason. A Turkish visitor seeing English for 200ms is reading a language
// they may know; seeing Hebrew is reading an alphabet they do not.
import type { AppLocale, PageLocale } from "./locales";
import { APP_LOCALES, DEFAULT_LOCALE, dirOf } from "./locales";
import { he } from "./dict/he";
import { en } from "./dict/en";
import type { StringKey } from "./dict/he";

export type { StringKey };

/**
 * `Locale` STAYS `"he" | "en"`, and that is a decision worth reading twice.
 *
 * It is the type of AUTHORED TEXT — a game's title, a difficulty label, the
 * name of an animal a game reads aloud. Widening it to all eleven app languages
 * was tried first and the compiler answered with 200+ errors demanding a
 * Spanish name for every balloon, which is the right answer to the wrong
 * question: those strings are written by a person, exactly like page prose, and
 * `PageLocale` is the type that already means "somebody wrote this".
 *
 * It would also have been a payload disaster. `meta.ts` is imported STATICALLY
 * by the roster so the home grid can render without pulling in game code, so
 * eleven titles per game is 23 x 9 extra strings in the SHELL — against 3 KB of
 * headroom.
 *
 * So there are two types and they mean different things:
 *   `AppLocale`  — the language the INTERFACE is speaking (11). `t()`, `DIR`.
 *   `Locale`     — the language a HUMAN WROTE this string in (2, = PageLocale).
 *
 * A component that renders a title in the app's language resolves through
 * `textFor()` below, which falls back to English rather than pretending.
 */
export type { AppLocale };
export type Locale = PageLocale;

/** Every language the interface speaks. Was the two-entry list, before. */
export const LOCALES: readonly AppLocale[] = APP_LOCALES;

/**
 * Read a piece of AUTHORED text in the app's current language.
 *
 * `meta.title[locale]` cannot work once the app speaks more languages than
 * anybody has written titles in, and the failure would be `undefined` rendered
 * as a blank game card. This is the one place that mismatch is resolved, so a
 * new app language can never blank a screen: it falls back to English, which is
 * the same thing `x-default` promises a crawler.
 */
export function textFor<T>(authored: Record<PageLocale, T>, locale: AppLocale): T {
  return authored[locale as PageLocale] ?? authored[DEFAULT_LOCALE];
}

/**
 * Text direction. A lookup that answers for every language the app speaks,
 * rather than the old two-entry map that would have silently returned
 * `undefined` for Arabic — the one new language where getting this wrong
 * reverses the entire layout.
 */
export const DIR: Record<AppLocale, "rtl" | "ltr"> = Object.fromEntries(
  APP_LOCALES.map((l) => [l, dirOf(l)]),
) as Record<AppLocale, "rtl" | "ltr">;

/**
 * The glyph on a "go back" control. A DIRECTION question, never a language one.
 *
 * Five screens each wrote `locale === "he" ? "→" : "←"`, which is right for the
 * two languages that existed and wrong for the reason it is right: it reads the
 * LANGUAGE to answer a question about the LAYOUT. Arabic is RTL and is not
 * Hebrew, so every one of those five would point an Arabic reader's back button
 * the wrong way — and Spanish would have to be handed a "translation" of an
 * arrow to keep them compiling.
 *
 * Keyed on direction it is correct for every language there will ever be, and
 * it never needs translating. `←` is the literal glyph in both cases: arrows do
 * not bidi-mirror (`Bidi_Mirrored=0`), so `dir="rtl"` renders them as drawn.
 */
export function backArrow(locale: AppLocale): string {
  return DIR[locale] === "rtl" ? "→" : "←";
}

export type Dictionary = Record<StringKey, string>;

/** The dictionaries that are in the shell already and need no fetch. */
const STATIC: Partial<Record<AppLocale, Dictionary>> = { he, en };

/**
 * Which languages need no fetch.
 *
 * THIS IS NOT THE SET OF LANGUAGES THAT MAY HAVE PAGES, and the difference cost
 * a measurement to find. The real defect is that an emitted page mounts straight
 * into a document with no picker, so if nothing calls `loadDict` its chrome
 * resolves out of `STATIC` or falls back to English and stays there — Spanish
 * prose wrapped in English buttons, permanently, nothing thrown.
 *
 * The obvious repair is to make every page locale static. It works, and it bills
 * every child on earth for it: Spanish alone measured **+1,363 B gz** on the
 * first visit against 1,657 B of headroom, and a Hebrew-speaking four-year-old
 * in Tel Aviv would download the Spanish dictionary to reach a game that has no
 * Spanish in it. The next page language would do the same again.
 *
 * So `bootContentPage` AWAITS its locale's dictionary instead, and it does so
 * while the poster is still up — a page has not mounted anything yet, so there
 * is no flash to trade for the bytes. `page-loads-its-dictionary.test.ts` pins
 * that await; without it this is exactly the silent-English-buttons bug again.
 */
export const STATIC_LOCALES = Object.keys(STATIC) as readonly AppLocale[];

/** Loaded lazily and kept. A language is fetched once per session, not per render. */
const loaded = new Map<AppLocale, Dictionary>(
  Object.entries(STATIC) as [AppLocale, Dictionary][],
);

/**
 * The lazy half.
 *
 * Written as a literal object of literal `import()` calls on purpose: Rollup
 * only sees a chunk boundary when the specifier is static, so a computed
 * `import(\`./dict/${locale}\`)` would either fail or pull every dictionary
 * into one chunk — which is the whole thing this file exists to avoid.
 * `dict-chunks.test.ts` pins that this map covers exactly the app locales that
 * are not static.
 */
const LAZY: Partial<Record<AppLocale, () => Promise<{ default: Dictionary }>>> = {
  es: () => import("./dict/es").then((m) => ({ default: m.es })),
  pt: () => import("./dict/pt").then((m) => ({ default: m.pt })),
  fr: () => import("./dict/fr").then((m) => ({ default: m.fr })),
  de: () => import("./dict/de").then((m) => ({ default: m.de })),
  ar: () => import("./dict/ar").then((m) => ({ default: m.ar })),
  it: () => import("./dict/it").then((m) => ({ default: m.it })),
  ru: () => import("./dict/ru").then((m) => ({ default: m.ru })),
  tr: () => import("./dict/tr").then((m) => ({ default: m.tr })),
  id: () => import("./dict/id").then((m) => ({ default: m.id })),
};

/** Which languages this build can actually speak. Used by the picker. */
export const AVAILABLE: readonly AppLocale[] = APP_LOCALES.filter(
  (l) => l in STATIC || l in LAZY,
);

/**
 * Fetch a language's strings, if they are not already here.
 *
 * Never rejects. A failed chunk fetch — an open tab meeting a new deploy is the
 * common cause — leaves the language resolving through English, which is a
 * readable app rather than an error screen. Same discipline as analytics: a
 * best-effort enrichment must not be able to break the thing it enriches.
 *
 * RETURNS WHETHER THE LANGUAGE IS ACTUALLY AVAILABLE NOW, and that boolean is
 * load-bearing rather than a convenience. This function swallowing its own
 * failure into a `Promise<void>` meant the caller could not tell "Arabic is
 * ready" from "Arabic will never arrive" — so it set `lang="ar"` and flipped
 * the document to RTL over text that was still English, and persisted that.
 * Measured on the live site 2026-08-11: a mirrored English page that survived a
 * reload, with no error anywhere. A caller that changes what the DOCUMENT
 * claims must know whether the strings behind that claim exist.
 */
export async function loadDict(locale: AppLocale): Promise<boolean> {
  if (loaded.has(locale)) return true;
  const get = LAZY[locale];
  if (!get) return false;
  try {
    const mod = await get();
    loaded.set(locale, mod.default);
    return true;
  } catch {
    return false; // stays on English
  }
}

/** Whether this language's strings are in memory right now. */
export function isLoaded(locale: AppLocale): boolean {
  return loaded.has(locale);
}

/**
 * The translator. Unchanged signature, unchanged fallback-to-the-key behaviour.
 *
 * Resolution order is the language, then English, then the key itself. The key
 * is a deliberate last resort: it is ugly on screen, which is the point — a
 * missing string should be visible in a screenshot rather than blank.
 */
export function makeT(locale: AppLocale) {
  return (key: string): string => {
    const dict = loaded.get(locale);
    return dict?.[key as StringKey] ?? en[key as StringKey] ?? key;
  };
}

export { DEFAULT_LOCALE };
