import type { GameMeta } from "../sdk/types";
import type { Locale } from "../content/types";
import { SITE, homeCopy } from "../content/site";
import { AUTONYM } from "../i18n/locales";
import { html, raw, toHtml, type RawHtml } from "./html";
import { renderDocument } from "./layout";
import { stage } from "./gamePage";
import { LOCALES, boardsPath, gamePath, homePath, href, worldPath } from "./routes";
import { homeGraph, worldGraph } from "./schema";
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
        ${games.map(
          (m) =>
            html`<li>
              <a href="${href(gamePath(m.id, locale), base)}">${m.title[locale]}</a>
            </li>`,
        )}
      </ul>
      ${copy.body.map((p) => html`<p>${p}</p>`)}
      <p><a href="${href(worldPath(locale), base)}">${site.worldPage.h1}</a></p>
      <p><a href="${href(boardsPath(locale), base)}">${site.boardsPage.h1}</a></p>
      ${otherHomeLinks(locale, base)}
    </div>
  `);
}

/**
 * The other languages' home pages, as real links a crawler can follow.
 *
 * The AUTONYM, never a flag and never a translated language name - the same
 * rule `LanguagePicker` and the emitted footer already follow. This replaces a
 * hardcoded `English` link that only ever existed on the Hebrew home, and it is
 * derived, so a fourth page language joins every home page with no edit here.
 */
function otherHomeLinks(locale: Locale, base: string): RawHtml {
  return html`${LOCALES.filter((l) => l !== locale).map(
    (l) =>
      html`<p>
        <a href="${href(homePath(l), base)}" hreflang="${l}" lang="${l}">${AUTONYM[l]}</a>
      </p>`,
  )}`;
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
  });
}
