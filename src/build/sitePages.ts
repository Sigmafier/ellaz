import type { GameMeta } from "../sdk/types";
import type { Locale } from "../content/types";
import { SITE, homeCopy } from "../content/site";
import { html, toHtml } from "./html";
import { renderDocument } from "./layout";
import { gameCards, stage } from "./gamePage";
import { LOCALES, boardsPath, gamePath, homePath, href, worldPath } from "./routes";
import { homeGraph, worldGraph } from "./schema";
import { lazyPreloadTags, type HeadAssets } from "./assets";

/**
 * The three pages that are not about one game: the home index, the room, and
 * the 404.
 *
 * Only the ENGLISH home is emitted as a document. The Hebrew home is `/`, which
 * is the application itself - Vite emits that file and the page plugin only
 * enhances its head. Overwriting it with a document would delete the app.
 */

export interface SitePageOptions {
  locale: Locale;
  games: ReadonlyArray<GameMeta>;
  base: string;
  indexable: boolean;
  /** Only the world page boots the app. The home index and the 404 are documents. */
  headAssets?: HeadAssets;
}

export function homePage(opts: SitePageOptions): string {
  const { locale, base } = opts;
  const site = SITE[locale];
  // Not `site.homePage` - that still carries the `{games}` token. The count is
  // filled from the roster we were handed, so the copy cannot contradict the
  // `ItemList` built from the same array a few lines below.
  const copy = homeCopy(locale, opts.games.length);

  const body = html`
    <h1>${copy.h1}</h1>
    <p class="lede">${copy.lede}</p>
    <ul class="facts">
      ${site.facts.map((f) => html`<li>${f}</li>`)}
    </ul>
    ${gameCards(opts.games, locale, base)}
    ${copy.body.map((p) => html`<p>${p}</p>`)}
    <p><a href="${href(worldPath(locale), base)}">${site.worldPage.h1}</a></p>
    <p><a href="${href(boardsPath(locale), base)}">${site.boardsPage.h1}</a></p>
  `;

  return renderDocument({
    locale,
    title: copy.title,
    description: copy.description,
    path: homePath(locale),
    alternates: LOCALES.map((l) => ({ locale: l, path: homePath(l) })),
    schema: homeGraph(locale, opts.games, copy),
    body,
    base,
    indexable: opts.indexable,
  });
}

/**
 * The Hebrew home, as a DOCUMENT, for the one page that is also the application.
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
 * WHY IT IS NOT `homePage()`
 * That builds a full document whose card markup is styled by `DOCUMENT_CSS`,
 * which `/` does not carry and must not start carrying - it is ~300 lines of
 * CSS on the one page that IS the first visit. This emits the same CONTENT as
 * plain semantic markup instead: same copy, same games, same links, same order.
 *
 * Two implementations of one page is a real risk, so `sitePages.test.ts` pins
 * them - the two must link to exactly the same set of game URLs. That is the
 * same arrangement `paths.ts` and `routes.ts` already live under.
 *
 * NOT CLOAKING. Everything here is what the app renders once it boots, in the
 * same language and the same order. It is progressive enhancement, which is
 * what Google's JavaScript SEO guidance asks for - and it is why the runtime
 * REMOVES this block rather than hiding it behind CSS.
 */
export function homeShellBody(games: ReadonlyArray<GameMeta>, base: string): string {
  const site = SITE.he;
  const copy = homeCopy("he", games.length);

  return toHtml(html`
    <div id="home-doc">
      <h1>${copy.h1}</h1>
      <p>${copy.lede}</p>
      <ul>
        ${site.facts.map((f) => html`<li>${f}</li>`)}
      </ul>
      <ul>
        ${games.map(
          (m) =>
            html`<li>
              <a href="${href(gamePath(m.id, "he"), base)}">${m.title.he}</a>
            </li>`,
        )}
      </ul>
      ${copy.body.map((p) => html`<p>${p}</p>`)}
      <p><a href="${href(worldPath("he"), base)}">${site.worldPage.h1}</a></p>
      <p><a href="${href(boardsPath("he"), base)}">${site.boardsPage.h1}</a></p>
      <p><a href="${href(homePath("en"), base)}">English</a></p>
    </div>
  `);
}

export function worldPage(opts: SitePageOptions): string {
  const { locale, base } = opts;
  const site = SITE[locale];
  const copy = site.worldPage;

  const body = html`
    <nav class="bc"><a href="${href(homePath(locale), base)}">${site.home}</a> › ${copy.h1}</nav>
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
    // No wallet slot here: the room screen shows its own chip, and two of them
    // in one viewport reads as a bug rather than as emphasis.
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
    <nav class="bc"><a href="${href(homePath(locale), base)}">${site.home}</a> › ${copy.h1}</nav>
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

  const body = html`
    <h1>${he.notFound.h1}</h1>
    <p class="lede">${he.notFound.body}</p>
    <p><a href="${href(homePath("he"), base)}">${he.notFound.back}</a></p>
    <hr />
    <div dir="ltr" lang="en">
      <h2>${en.notFound.h1}</h2>
      <p>${en.notFound.body}</p>
      <p><a href="${href(homePath("en"), base)}">${en.notFound.back}</a></p>
    </div>
  `;

  return renderDocument({
    locale: "he",
    title: he.notFound.title,
    description: he.notFound.body,
    path: "/404.html",
    schema: undefined,
    body,
    base,
    indexable: false,
  });
}
