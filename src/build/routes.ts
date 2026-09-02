import type { Locale } from "../content/types";
import type { Category } from "../sdk/types";
import { PAGE_LOCALES, CANONICAL_LOCALE, localePrefix } from "../i18n/locales";
import { ORIGIN } from "../content/site";
import { CATEGORY_CONTENT, MIN_GAMES_FOR_A_PAGE } from "../content/categories";
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

export type PageKind = "home" | "game" | "category" | "world" | "boards" | "embed" | "notFound";

export interface Route {
  kind: PageKind;
  locale: Locale;
  /** Game id, for `kind === "game"` only. */
  id?: string;
  /** The group, for `kind === "category"` only. */
  category?: Category;
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
  /**
   * The languages THIS page exists in - its hreflang cluster, and the set
   * `assert-pages.mjs` demands of it, read off `pages.json`.
   *
   * ABSENT means every page locale: the ordinary case, one document per
   * language. An EMPTY list means "this page has no per-language twin at
   * all" - the 404, which is one document for the whole site, and the embed
   * page, which is one document per GAME that takes its language from
   * `?lang=` at runtime. The gate reads this field rather than assuming
   * PAGE_LOCALES, so a page kind with no twins is a declared shape rather
   * than an exemption somebody has to remember to keep in a script.
   */
  locales?: Locale[];
  /**
   * Where `<link rel="canonical">` points when it is NOT this page.
   *
   * Set on the embed page alone: it is the game, framed, so its canonical is
   * the game page in the canonical locale - the URL that should earn whatever
   * a crawler makes of the frame. Absent means "this page is its own
   * canonical", which is every other route. `pages.json` publishes the
   * resolved value so the gate can hold the document to it.
   */
  canonicalPath?: string;
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

/**
 * Every category, in reading order, taken from the copy record rather than
 * from a second list.
 *
 * `CATEGORY_CONTENT` is `Record<Category, ...>`, so this cannot omit a
 * category the SDK declares and cannot invent one it does not. The KEY ORDER
 * of that record is the reading order, and `categories.test.ts` pins it
 * against `CATEGORY_ORDER` in the catalog - the build must not import the
 * catalog itself, because its lazy loaders name every game and a stray
 * evaluation at config time would pull Phaser into `vite.config.ts`.
 */
export const CATEGORY_IDS = Object.keys(
  CATEGORY_CONTENT[CANONICAL_LOCALE],
) as Category[];

/** The games in one group, in roster order. */
export function gamesIn(category: Category): typeof GAMES {
  return GAMES.filter((m) => m.category === category);
}

/**
 * The groups big enough to deserve a page, measured against the LIVE roster.
 *
 * Derived rather than listed, so a group crossing the threshold gets its
 * pages, its sitemap rows and its share cards on the next build with no edit
 * anywhere - and a group falling below it loses them the same way rather than
 * leaving four documents about two games. See `MIN_GAMES_FOR_A_PAGE`.
 */
export const PAGED_CATEGORIES: Category[] = CATEGORY_IDS.filter(
  (c) => gamesIn(c).length >= MIN_GAMES_FOR_A_PAGE,
);

/**
 * `/games/kids/`, deliberately sharing the `/games/` prefix with the game
 * pages themselves.
 *
 * It is the URL a person would guess and the one a search result reads best,
 * and the collision it invites - a game whose id equals a category id - is a
 * red test rather than a silent overwrite (`categories.test.ts`). Nothing in
 * this build routes by path shape: every gate keys on `kind` out of
 * `pages.json`, so `/games/kids/` and `/games/snake/` are told apart by the
 * manifest and never by a regex over the URL.
 */
export function categoryPath(category: Category, locale: Locale): string {
  return `${localePrefix(locale)}/games/${category}/`;
}

export function worldPath(locale: Locale): string {
  return `${localePrefix(locale)}/world/`;
}

export function boardsPath(locale: Locale): string {
  return `${localePrefix(locale)}/boards/`;
}

/**
 * `/embed/<id>/` - the game alone, for a stranger's iframe.
 *
 * NO locale prefix, on purpose. There is one embed document per game and it
 * takes its language from `?lang=xx` at runtime, so a per-locale twin would
 * be forty more documents saying the same thing. The slug follows `slugFor`:
 * the game whose directory is `n2048` embeds at `/embed/2048/`.
 */
export function embedPath(gameId: string): string {
  return `/embed/${slugFor(gameId)}/`;
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
  ...LOCALES.flatMap((locale) =>
    PAGED_CATEGORIES.map(
      (category): Route => ({
        kind: "category",
        locale,
        category,
        path: categoryPath(category, locale),
        file: fileFor(categoryPath(category, locale)),
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
  // ONE PER GAME, NOT ONE PER LOCALE - see `embedPath`. Emitted in the
  // canonical locale; the runtime reads `?lang=`. `noindex` and out of the
  // sitemap: the frame is not a destination, the game page is, and that is
  // where `canonicalPath` sends every crawler that finds one.
  ...GAMES.map(
    (meta): Route => ({
      kind: "embed",
      locale: CANONICAL_LOCALE,
      id: meta.id,
      path: embedPath(meta.id),
      file: fileFor(embedPath(meta.id)),
      emit: true,
      indexable: false,
      locales: [],
      canonicalPath: gamePath(meta.id, CANONICAL_LOCALE),
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
    // One document for the whole site, so no per-language twin. Declared
    // here rather than known by the gate.
    locales: [],
  },
];

/** The languages a route exists in: its own declared set, or every page locale. */
export function localesOf(route: Route): Locale[] {
  return route.locales ?? LOCALES;
}

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
 *
 * Minus the embed pages too. An embed page's canonical IS its game page, so
 * `renderDocument` finds that page's card by path and the frame shares it - a
 * link to `/embed/snake/` previews as Snake. A card of its own would be the
 * same picture under a second name, which the distinctness gate refuses.
 */
export const OG_ROUTES: Route[] = ROUTES.filter((r) => r.kind !== "notFound" && r.kind !== "embed");
