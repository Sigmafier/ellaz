import type { Locale } from "../content/types";
import { ORIGIN } from "../content/site";
import { GAMES } from "../portal/games";

/**
 * The route table: every document this site emits, in one list.
 *
 * The table is DERIVED from the game roster, so a game added to
 * `portal/games.ts` gets its two URLs, its two sitemap rows and its two gate
 * assertions with no edit here. `routes.test.ts` pins the shape.
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

function localePrefix(locale: Locale): string {
  return locale === "he" ? "" : "/en";
}

export function gamePath(gameId: string, locale: Locale): string {
  return `${localePrefix(locale)}/games/${slugFor(gameId)}/`;
}

export function homePath(locale: Locale): string {
  return locale === "he" ? "/" : "/en/";
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

export const LOCALES: Locale[] = ["he", "en"];

export const ROUTES: Route[] = [
  ...LOCALES.map(
    (locale): Route => ({
      kind: "home",
      locale,
      path: homePath(locale),
      file: locale === "he" ? "index.html" : "en/index.html",
      emit: locale !== "he",
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
    locale: "he",
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
