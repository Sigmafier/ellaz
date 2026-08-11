import type { Locale } from "@i18n/index";
import { localePrefix } from "@i18n/locales";

/**
 * Where things live, as URLs the browser can navigate to.
 *
 * These mirror `src/build/routes.ts` exactly, and they have to: the emitter
 * writes the files and this generates the links to them. The duplication is
 * deliberate rather than shared, because `src/build/**` must never be importable
 * from the app - it reads `src/content`, and one import would put every word of
 * every page into the precached shell. `paths.test.ts` asserts the two agree on
 * every game, so the copy cannot drift silently.
 *
 * BASE_URL is Vite's own build constant: "/" on Hostinger, "/ellaz/" on GitHub
 * Pages. Every href here carries it; nothing that identifies a page does.
 */

const BASE = import.meta.env.BASE_URL;

/**
 * The same answer `src/build/routes.ts` gives, in the form this file needs.
 *
 * `localePrefix` returns "" or "/en" because a canonical path starts with a
 * slash; every href here is appended to BASE, which already ends with one. So
 * the leading slash comes off and a trailing one goes on. Reading it from
 * `i18n/locales.ts` rather than restating the rule is what stops the app's
 * links and the emitter's filenames from drifting apart - the duplication
 * `paths.test.ts` exists to catch is in the URL SHAPES, and it should not
 * extend to which languages have pages at all.
 */
function prefix(locale: Locale): string {
  const p = localePrefix(locale);
  return p ? `${p.slice(1)}/` : "";
}

export function homeHref(locale: Locale): string {
  return `${BASE}${prefix(locale)}`;
}

/**
 * The slug is the game's OWN id. `src/games/n2048/` publishes at
 * `/games/2048/`, because its `meta.id` is "2048".
 */
export function gameHref(id: string, locale: Locale): string {
  return `${BASE}${prefix(locale)}games/${encodeURIComponent(id)}/`;
}

export function worldHref(locale: Locale): string {
  return `${BASE}${prefix(locale)}world/`;
}

export function boardsHref(locale: Locale): string {
  return `${BASE}${prefix(locale)}boards/`;
}
