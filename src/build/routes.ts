import type { Locale } from "../content/types";
import { PAGE_LOCALES, CANONICAL_LOCALE, localePrefix } from "../i18n/locales";
import { ORIGIN } from "../content/site";
import { GAMES } from "../portal/games";

/**
 * The route table: every document this site emits, in one list.
 *
 * The table is DERIVED from two lists and nothing else - the game roster in
 * `portal/games.ts` and `PAGE_LOCALES` in `i18n/locales.ts`. A game added
 * there gets its URLs, its sitemap rows and its gate assertions with no edit
 * here, and a language added there gets a whole set of documents the same way.
 * `routes.test.ts` pins the shape.
 *
 * Deriving from PAGE_LOCALES rather than APP_LOCALES is the anti-penalty
 * guarantee stated structurally: teaching the interface a new language emits
 * exactly zero documents, so it can never produce a page whose body is not
 * translated. See `.claude/rules/a-locale-page-without-a-translated-body-is-a-duplicate.md`.
 */

export type PageKind = "home" | "game" | "world" | "boards" | "notFound";

export interface Route {
  kind: PageKind;
  locale: Locale;
  /** Game id, for `kind === "game"` only. */
  id?: string;
  /**
   * The canonical path, ALWAYS base-free and always what appears after
   * `https://ellaz.fun`. The base belongs to a host, not to an identity.
   */
  path: string;
  /** Where the file lands under `dist/`. */
  file: string;
  /**
   * False for the Hebrew home page. `/` is the app shell that Vite already
   * emits as `index.html`; the page emitter enhances its HEAD in place rather
   * than overwriting the application with a document.
   */
  emit: boolean;
  /** In the sitemap, and allowed to be indexed by the primary host. */
  indexable: boolean;
}

/**
 * The slug is the game's OWN id, never its directory name.
 *
 * The trap this exists to name: the game whose directory is `n2048` has
 * `meta.id === "2048"`, so its URL is `/games/2048/`. A hand-written
 * `/games/n2048/` is a 404 that no type and no test outside the link checker
 * would ever see.
 */
export function slugFor(gameId: string): string {
  return gameId;
}

export function gamePath(gameId: string, locale: Locale): string {
  return `${localePrefix(locale)}/games/${slugFor(gameId)}/`;
}

export function homePath(locale: Locale): string {
  return `${localePrefix(locale)}/`;
}

export function worldPath(locale: Locale): string {
  return `${localePrefix(locale)}/world/`;
}

export function boardsPath(locale: Locale): string {
  return `${localePrefix(locale)}/boards/`;
}

/** `dist/`-relative file for a directory-style path. `/games/x/` -> `games/x/index.html`. */
function fileFor(path: string): string {
  return `${path.slice(1)}index.html`;
}

/**
 * The languages that get documents. A copy of `PAGE_LOCALES`, not a second
 * list: spread rather than re-typed, so the two cannot drift.
 */
export const LOCALES: Locale[] = [...PAGE_LOCALES];

export const ROUTES: Route[] = [
  ...LOCALES.map(
    (locale): Route => ({
      kind: "home",
      locale,
      path: homePath(locale),
      file: fileFor(homePath(locale)),
      emit: locale !== CANONICAL_LOCALE,
      indexable: true,
    }),
  ),
  ...LOCALES.flatMap((locale) =>
    GAMES.map(
      (meta): Route => ({
        kind: "game",
        locale,
        id: meta.id,
        path: gamePath(meta.id, locale),
        file: fileFor(gamePath(meta.id, locale)),
        emit: true,
        indexable: true,
      }),
    ),
  ),
  ...LOCALES.map(
    (locale): Route => ({
      kind: "world",
      locale,
      path: worldPath(locale),
      file: fileFor(worldPath(locale)),
      emit: true,
      indexable: true,
    }),
  ),
  ...LOCALES.map(
    (locale): Route => ({
      kind: "boards",
      locale,
      path: boardsPath(locale),
      file: fileFor(boardsPath(locale)),
      emit: true,
      indexable: true,
    }),
  ),
  {
    kind: "notFound",
    locale: CANONICAL_LOCALE,
    path: "/404.html",
    file: "404.html",
    emit: true,
    // A 404 body that can be indexed is a soft 404, which is worse for search
    // than the missing page it replaces.
    indexable: false,
  },
];

/**
 * The absolute canonical URL. Deliberately ignores the base.
 *
 * A base-derived canonical on the GitHub Pages build reads
 * `https://ellaz.fun/ellaz/games/snake/` - a URL that has never existed on
 * either host. The gate asserts no emitted canonical contains the base.
 */
export function canonicalUrl(path: string): string {
  return `${ORIGIN}${path}`;
}

/**
 * A same-site href, WITH the base. `base` is "/" on Hostinger and "/ellaz/" on
 * GitHub Pages, and every internal link has to carry it or the Pages build is a
 * site of 404s.
 */
export function href(path: string, base: string): string {
  return `${base}${path.slice(1)}`;
}

/**
 * The pages that get a share card.
 *
 * `ROUTES` minus the 404: a "not found" page is never deliberately shared, and
 * a card for it would be a picture promising content that does not exist. The
 * Hebrew home page IS included even though it does not `emit` - it is the app
 * shell, and it is the single most-shared URL on the site.
 */
export const OG_ROUTES: Route[] = ROUTES.filter((r) => r.kind !== "notFound");
