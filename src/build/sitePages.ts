import type { GameMeta } from "../sdk/types";
import { gameName } from "./gameName";
import type { Locale } from "../content/types";
import { SITE, homeCopy } from "../content/site";
import { AUTONYM } from "../i18n/locales";
import { html, raw, toHtml, type RawHtml } from "./html";
import { renderDocument, utilityRow } from "./layout";
import { stage } from "./gamePage";
// Build-time only, and the same palette every game's ground comes from, so the
// room and the boards are tinted out of the app's own colours rather than out
// of two literals nobody would ever find again.
import { PAL } from "../ui/gameArt";
import {
  LOCALES,
  PAGED_CATEGORIES,
  PRINTABLE_KINDS,
  PRINT_LOCALE,
  boardsPath,
  categoryPath,
  gamePath,
  homePath,
  href,
  printPath,
  worldPath,
} from "./routes";
import { PRINT_CHROME, PRINT_COPY } from "../content/print/copy";
import { categoryGraph, homeGraph, worldGraph } from "./schema";
import { CATEGORY_CHROME, categoryCopy } from "../content/categories";
import { gameCards } from "./gamePage";
import type { Category } from "../sdk/types";
import { lazyPreloadTags, type HeadAssets } from "./assets";

/**
 * The three pages that are not about one game: the home index, the room, and
 * the 404.
 *
 * EVERY home page is the application. `/` is the Hebrew one - Vite emits that
 * file and the page plugin only enhances its head, because overwriting it with
 * a document would delete the app - and `/en/` and `/es/` are emitted app
 * shells built here. All three carry the same arrangement: the home page as
 * real markup inside `#home-doc`, then an empty `#root` beside it, and the
 * runtime removes the markup once React has mounted the grid over it.
 */

export interface SitePageOptions {
  locale: Locale;
  games: ReadonlyArray<GameMeta>;
  base: string;
  indexable: boolean;
  /** The app's own head tags. Absent only on the 404, which boots nothing. */
  headAssets?: HeadAssets;
}

/**
 * A home page in a language that is not the canonical one.
 *
 * WHY THIS IS AN APP SHELL AND NOT A DOCUMENT
 * It was a document until 2026-08-13, and the symptom was reported by a person
 * rather than by any gate here: every "back" and wordmark link on an English
 * page - the header of all 25 English game pages, the room, the boards, and
 * `exitTo`'s floor in `PageApp` - lands on `/en/`, and what arrived was a
 * static article. No grid, no wallet, no world, no daily, nothing to tap but a
 * list of links. A player calls that broken and they are right: it is the home
 * screen's URL serving something that is not the home screen.
 *
 * The Hebrew home has been both a document AND the app since the AI-crawler fix
 * (`a-spa-shell-is-invisible-to-ai-crawlers.md`); there was never a reason for
 * the other languages to be only the first half. So this emits the same shape
 * `transformIndexHtml` gives `/`, in this page's language.
 *
 * NOT A LOSS OF PROSE. `homeShellBody` carries the whole home page - heading,
 * lede, facts, every game link, the body paragraphs, the room and the boards -
 * so a crawler reads exactly what it read before. What goes is the document
 * chrome around it, which is what the app draws for itself.
 */
export function homePage(opts: SitePageOptions): string {
  const { locale, base } = opts;
  const copy = homeCopy(locale, opts.games.length);

  return renderDocument({
    locale,
    title: copy.title,
    description: copy.description,
    path: homePath(locale),
    alternates: LOCALES.map((l) => ({ locale: l, path: homePath(l) })),
    schema: homeGraph(locale, opts.games, copy),
    // The document first, `#root` beside it. SIBLINGS, in that order, for the
    // reason `main.tsx` and `#game-poster` both spell out: a node React does
    // not know about, inside a tree it reconciles, is the nested-root teardown
    // crash wearing a different hat.
    body: raw(`${homeShellBody(locale, opts.games, base)}\n    <div id="root"></div>`),
    base,
    indexable: opts.indexable,
    headAssets: opts.headAssets,
    shell: true,
    // `data-locale` and nothing else is what tells the runtime this shell has a
    // language of its own. `/` deliberately carries none, so it keeps using the
    // player's stored preference - see `readPageContext`.
    bodyData: { page: "app", locale },
  });
}

/**
 * A home page as a DOCUMENT, for the pages that are also the application.
 *
 * WHY THIS EXISTS
 * `/` is `index.html`, and until 2026-08-11 it shipped a 29-byte body:
 * `<div id="root"></div>`. Googlebot renders JavaScript so it eventually saw the
 * React grid - but no AI crawler does. GPTBot, ClaudeBot and PerplexityBot fetch
 * raw HTML, take what is there, and move on; Anthropic's own docs say the fetch
 * tool does not support JavaScript-rendered sites. So the canonical entry of a
 * Hebrew-first site, and the `x-default` target, was a blank page to every
 * answer engine, while `/en/` - a real emitted document - was not.
 *
 * It is the same shape as the other outages written up in this repo: correct
 * everywhere you look, wrong for a population you are not in.
 *
 * WHY IT IS PLAIN MARKUP
 * `DOCUMENT_CSS` is ~300 lines, and `/` is the one page that IS the first
 * visit, so it does not carry it and must not start. This emits the same
 * CONTENT as plain semantic markup instead: same copy, same games, same links,
 * same order, styled by the handful of `#home-doc` rules in `global.css`.
 *
 * WHY IT TAKES A LOCALE
 * Because all three home pages are the app, and all three therefore need this
 * body. It was hardcoded to Hebrew while `/en/` and `/es/` were documents; the
 * moment they became shells too, one hardcoded language here would have
 * emitted the Hebrew home under `lang="en"` - a page that renders, passes the
 * word floor, and is in the wrong language. The script gate in
 * `assert-pages.mjs` is the control that would catch it.
 *
 * NOT CLOAKING. Everything here is what the app renders once it boots, in the
 * same language and the same order. It is progressive enhancement, which is
 * what Google's JavaScript SEO guidance asks for - and it is why the runtime
 * REMOVES this block rather than hiding it behind CSS.
 */
export function homeShellBody(
  locale: Locale,
  games: ReadonlyArray<GameMeta>,
  base: string,
): string {
  const site = SITE[locale];
  const copy = homeCopy(locale, games.length);

  return toHtml(html`
    <div id="home-doc">
      <h1>${copy.h1}</h1>
      <p>${copy.lede}</p>
      <ul>
        ${site.facts.map((f) => html`<li>${f}</li>`)}
      </ul>
      <ul>
        ${homeGameLinks(games, locale, base)}
      </ul>
      ${copy.body.map((p) => html`<p>${p}</p>`)}
      <p><a href="${href(worldPath(locale), base)}">${site.worldPage.h1}</a></p>
      <p><a href="${href(boardsPath(locale), base)}">${site.boardsPage.h1}</a></p>
      ${printPackLinks(locale, base)}
      ${otherHomeLinks(locale, base)}
    </div>
  `);
}

/**
 * How many games the emitted `/` will list ONE BY ONE before it starts linking
 * GROUPS instead.
 *
 * Every link here is 29.5 B gz on the first visit - measured, and the single
 * largest per-game term left after the metadata and the loaders both split off.
 * At 38 games that is ~1.1 KB and it is worth every byte: a flat list is the
 * strongest thing this page can do for a crawler at this size, and the category
 * pages are one hop further away.
 *
 * At 200 games it is 5.9 KB of a ~90 KB budget for a list no reader scrolls,
 * and the same crawl is served by six group links plus the pages behind them.
 * So the switch exists now and FIRES ITSELF later.
 *
 * 60 AND NOT 38. It must not fire today: the flat list is the better page at
 * this size, and a threshold set at the current roster is a threshold that
 * changes behaviour in the same commit that adds it, with nothing to compare
 * against. 60 leaves 22 games of room and still trips long before the byte cost
 * matters.
 */
export const MAX_FLAT_HOME_LINKS = 60;

/**
 * The game links on the emitted home document.
 *
 * Under the threshold: every game, in roster order, exactly as before.
 *
 * Over it: one link per CATEGORY page, plus every game whose category has no
 * page of its own. That second half is not a nicety - `PAGED_CATEGORIES` only
 * holds groups with `MIN_GAMES_FOR_A_PAGE` games or more, so a game in a
 * one-game category (`create` held exactly that for weeks) would otherwise be
 * reachable from NO emitted page at all. Every game stays at most two hops from
 * `/`, and `build.test.ts` asserts that rather than trusting this comment.
 */
function homeGameLinks(
  games: ReadonlyArray<GameMeta>,
  locale: Locale,
  base: string,
): RawHtml {
  const link = (path: string, label: string) =>
    html`<li><a href="${href(path, base)}">${label}</a></li>`;

  if (games.length <= MAX_FLAT_HOME_LINKS) {
    return html`${games.map((m) => link(gamePath(m.id, locale), gameName(m.id, locale)))}`;
  }

  const orphans = games.filter((m) => !PAGED_CATEGORIES.includes(m.category));
  return html`${PAGED_CATEGORIES.map((c) =>
    link(categoryPath(c, locale), categoryCopy(locale, c, 0).h1),
  )}${orphans.map((m) => link(gamePath(m.id, locale), gameName(m.id, locale)))}`;
}

/**
 * The other languages' home pages, as real links a crawler can follow.
 *
 * The AUTONYM, never a flag and never a translated language name - the same
 * rule `LanguagePicker` and the emitted footer already follow. This replaces a
 * hardcoded `English` link that only ever existed on the Hebrew home, and it is
 * derived, so a fourth page language joins every home page with no edit here.
 */
/**
 * The four printable packs, on the Hebrew home document and nowhere else.
 *
 * WHY THIS EXISTS. The packs shipped on 2026-09-03 and were ORPHANS: measured
 * on the live site the same week, `/he/` served 47 anchors and `/he/games/kids/`
 * served 23, and not one of the 70 pointed at a print page - `printPath` was
 * called only inside `printPage.ts` and the route table. Four documents that
 * return 200, that a teacher would bookmark, that no path on our own site
 * reaches. Google could find them through the sitemap; a person could not.
 *
 * It is the same defect the /boards/ link above is annotated for, and the same
 * fix: this block is the only inbound link a crawler or a no-JavaScript visitor
 * can follow, because the runtime removes `#home-doc` once React mounts. The
 * app draws its own row (`Home.tsx`), so REMOVING EITHER HALF RE-ORPHANS THE
 * PACKS FOR HALF THE AUDIENCE.
 *
 * HEBREW ONLY, and it asks the route table rather than deciding for itself -
 * `PRINT_LOCALE` is where that content decision is written down.
 *
 * `PRINTABLE_KINDS` AND NOT `PRINT_KINDS`. The derived list is the one that
 * gets documents written for it: a pack whose game has left the roster is not
 * emitted, and linking it would be a 404 in our own markup. `assert-slope.mjs`
 * builds an arm with the last eight games cut and the wordsearch pack has
 * already killed that arm once, so this is a live population, not a formality.
 *
 * THE ANCHOR TEXT IS THE PACK'S OWN H1, not a game name. "סודוקו" says what the
 * game is; "סודוקו להדפסה לילדים - דפי עבודה חינם" says what the page is, in the
 * words somebody actually searches for, and anchor text is the one part of a
 * link a crawler reads as a description of its target.
 */
function printPackLinks(locale: Locale, base: string): RawHtml {
  if (locale !== PRINT_LOCALE || PRINTABLE_KINDS.length === 0) return raw("");
  return html`
    <p>${PRINT_CHROME.section}</p>
    <ul>
      ${PRINTABLE_KINDS.map(
        (kind) =>
          html`<li>
            <a href="${href(printPath(kind), base)}">${PRINT_COPY[kind].h1}</a>
          </li>`,
      )}
    </ul>
  `;
}

function otherHomeLinks(locale: Locale, base: string): RawHtml {
  return html`${LOCALES.filter((l) => l !== locale).map(
    (l) =>
      html`<p>
        <a href="${href(homePath(l), base)}" hreflang="${l}" lang="${l}">${AUTONYM[l]}</a>
      </p>`,
  )}`;
}

/**
 * A category landing page: one group of games, the article that group deserves,
 * and every game in it as a link.
 *
 * WHY THIS PAGE KIND EXISTS
 * Search Console, 2026-08-20: "memory games for kids" was in the top ten
 * queries reaching this site. That is a CATEGORY query, and there were 144
 * pages here of which not one was written to answer it - every impression it
 * earned landed on `/games/memory/`, a page about one game rather than a page
 * about a group. `seo-doctrine` SEO16 is the clause it ratified.
 *
 * WHY IT IS A PURE DOCUMENT AND BOOTS NOTHING
 * The home page, the room and the boards are all SCREENS in the app, and an
 * emitted document served at a screen's own URL is the defect written up in
 * `homePage` above - a person calls it broken and they are right. A category
 * page is not a screen: there is no `#/games/kids` in this app, nothing is
 * missing from it, and every link on it goes somewhere that does boot. So it
 * carries no `headAssets`, fetches no chunk, and costs a first visit nothing.
 *
 * The measurement tag is the one exception, and it is deliberate: these are
 * the pages the whole exercise exists to measure, so a document that is
 * indexable carries it while the 404 still does not. `assert-pages.mjs` allows
 * exactly that one script on a non-booting page and nothing else.
 *
 * THE LIST COMES FIRST, ON PURPOSE. Somebody arriving from a search for
 * "puzzle games for kids" wants the games, not our prose about them. The
 * article sits under the list, where it is still read by a crawler in full and
 * ignored by a visitor in a hurry, which is the correct order for both.
 */
export function categoryPage(
  opts: SitePageOptions & { category: Category },
): string {
  const { locale, base, category } = opts;
  const site = SITE[locale];
  const chrome = CATEGORY_CHROME[locale];
  // `opts.games` is ALREADY this group's games - the caller filters, so the
  // count in the copy and the list on the page cannot come from two different
  // answers to "which games are in this group".
  const games = opts.games;
  const copy = categoryCopy(locale, category, games.length);

  const body = html`
    ${utilityRow(
      html`<nav class="bc">
        <a href="${href(homePath(locale), base)}">${site.home}</a> › ${copy.h1}
      </nav>`,
    )}
    <h1>${copy.h1}</h1>
    <p class="lede">${copy.lede}</p>

    <h2>${chrome.games}</h2>
    ${gameCards(games, locale, base)}

    ${copy.body.map((p) => html`<p>${p}</p>`)}

    <h2>${site.headings.faq}</h2>
    ${copy.faq.map((f) => html`<h3>${f.q}</h3>
      <p>${f.a}</p>`)}

    <h2>${chrome.more}</h2>
    <ul>
      ${PAGED_CATEGORIES.filter((c) => c !== category).map(
        (c) =>
          html`<li>
            <a href="${href(categoryPath(c, locale), base)}"
              >${categoryCopy(locale, c, 0).h1}</a
            >
          </li>`,
      )}
    </ul>
    <p><a href="${href(homePath(locale), base)}">${site.chrome.back}</a></p>
  `;

  return renderDocument({
    locale,
    title: copy.metaTitle,
    description: copy.metaDescription,
    path: categoryPath(category, locale),
    alternates: LOCALES.map((l) => ({ locale: l, path: categoryPath(category, l) })),
    schema: categoryGraph(category, locale, games, copy),
    body,
    base,
    indexable: opts.indexable,
  });
}

export function worldPage(opts: SitePageOptions): string {
  const { locale, base } = opts;
  const site = SITE[locale];
  const copy = site.worldPage;

  const body = html`
    ${utilityRow(
      html`<nav class="bc">
        <a href="${href(homePath(locale), base)}">${site.home}</a> › ${copy.h1}
      </nav>`,
      // The room passes no `tools` - it has no game control - and still gets
      // the same full-screen button at the same edge as a game page. That is
      // the point of emitting it here rather than per screen.
      { fullLabel: site.chrome.fullScreen, reportLabel: site.chrome.report },
    )}
    ${stage("🏠", site, "room")}
    <h1>${copy.h1}</h1>
    <p class="lede">${copy.lede}</p>
    ${copy.body.map((p) => html`<p>${p}</p>`)}
  `;

  return renderDocument({
    locale,
    title: copy.title,
    description: copy.description,
    path: worldPath(locale),
    alternates: LOCALES.map((l) => ({ locale: l, path: worldPath(l) })),
    schema: worldGraph(locale, copy),
    body,
    base,
    indexable: opts.indexable,
    headAssets: opts.headAssets,
    // The room is the content-page runtime and nothing else - no game chunk,
    // because no game mounts here.
    preloads: lazyPreloadTags(opts.headAssets, base),
    bodyData: { page: "world", locale },
    // The wallet lives in the HEADER now, the way it does on a game page. The
    // room used to draw its own chip and its own back arrow inside the scene,
    // so the answer to "where are my coins" and "how do I leave" moved when
    // you moved between screens. Both are gone from `World.tsx`; two of either
    // in one viewport reads as a bug rather than as emphasis.
    headerSlot: html`<span id="wallet-slot"></span>`,
    headerChrome: {
      ground: PAL.lagoon,
      title: copy.h1,
      backLabel: site.chrome.back,
      soundLabel: site.chrome.sound,
      fullLabel: site.chrome.fullScreen,
    },
  });
}

/**
 * The leaderboards.
 *
 * Emitted exactly like the room, and for the same reason: the screen is a real
 * destination, so it gets a real address rather than a fragment. What a visitor
 * with no JavaScript reads here is the honest half - what the boards measure,
 * and the rule that nobody is shown as last - because the standings themselves
 * are a network read that only the runtime can make.
 */
export function boardsPage(opts: SitePageOptions): string {
  const { locale, base } = opts;
  const site = SITE[locale];
  const copy = site.boardsPage;

  const body = html`
    ${utilityRow(
      html`<nav class="bc">
        <a href="${href(homePath(locale), base)}">${site.home}</a> › ${copy.h1}
      </nav>`,
      { fullLabel: site.chrome.fullScreen, reportLabel: site.chrome.report },
    )}
    ${stage("🏆", site, "boards")}
    <h1>${copy.h1}</h1>
    <p class="lede">${copy.lede}</p>
    ${copy.body.map((p) => html`<p>${p}</p>`)}
    <p><a href="${href(worldPath(locale), base)}">${site.worldPage.h1}</a></p>
  `;

  return renderDocument({
    locale,
    title: copy.title,
    description: copy.description,
    path: boardsPath(locale),
    alternates: LOCALES.map((l) => ({ locale: l, path: boardsPath(l) })),
    schema: worldGraph(locale, copy),
    body,
    base,
    indexable: opts.indexable,
    headAssets: opts.headAssets,
    // Same as the room: the boards screen is part of the page runtime, and no
    // game chunk belongs on it.
    preloads: lazyPreloadTags(opts.headAssets, base),
    bodyData: { page: "boards", locale },
    // The same bar the room and every game wear. The boards' stage stays a
    // short card inside the document gutter - it is a list, not a scene - but
    // the CHROME above it is the platform's, and the platform is one thing.
    headerSlot: html`<span id="wallet-slot"></span>`,
    headerChrome: {
      ground: PAL.sunflower,
      title: copy.h1,
      backLabel: site.chrome.back,
      soundLabel: site.chrome.sound,
      fullLabel: site.chrome.fullScreen,
    },
    // Same call as the room: the boards screen carries the wallet in its own
    // header, and two chips in one viewport reads as a bug.
  });
}

/**
 * The 404.
 *
 * Bilingual on purpose: nobody arriving here has told us which language they
 * read, and a wrong guess on the one page whose job is "you are lost" is worse
 * than two short lines.
 *
 * Never indexable. A 404 body a crawler can index is a soft 404, which search
 * engines treat worse than the missing page it replaced.
 */
export function notFoundPage(base: string): string {
  const he = SITE.he;
  const en = SITE.en;

  // English on top and Hebrew in the sub-block, mirroring which language holds
  // the root. The nested block carries its OWN `dir` and `lang`, so the one
  // that flips is always the inner one - the document's direction belongs to
  // its own language and the second language is the guest.
  const body = html`
    <h1>${en.notFound.h1}</h1>
    <p class="lede">${en.notFound.body}</p>
    <p><a href="${href(homePath("en"), base)}">${en.notFound.back}</a></p>
    <hr />
    <div dir="rtl" lang="he">
      <h2>${he.notFound.h1}</h2>
      <p>${he.notFound.body}</p>
      <p><a href="${href(homePath("he"), base)}">${he.notFound.back}</a></p>
    </div>
  `;

  return renderDocument({
    locale: "en",
    title: en.notFound.title,
    description: en.notFound.body,
    path: "/404.html",
    schema: undefined,
    body,
    base,
    indexable: false,
    // A 404 fetches nothing eagerly, tag included - see `analytics` in layout.ts.
    analytics: false,
  });
}
