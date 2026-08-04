import type { Locale } from "@i18n/index";

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

function prefix(locale: Locale): string {
  return locale === "he" ? "" : "en/";
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
