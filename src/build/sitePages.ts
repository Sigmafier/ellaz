import type { GameMeta } from "../sdk/types";
import type { Locale } from "../content/types";
import { SITE } from "../content/site";
import { html } from "./html";
import { renderDocument } from "./layout";
import { gameCards, stage } from "./gamePage";
import { homePath, href, worldPath } from "./routes";
import { homeGraph, worldGraph } from "./schema";
import type { HeadAssets } from "./assets";

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
  const copy = site.homePage;

  const body = html`
    <h1>${copy.h1}</h1>
    <p class="lede">${copy.lede}</p>
    <ul class="facts">
      ${site.facts.map((f) => html`<li>${f}</li>`)}
    </ul>
    ${gameCards(opts.games, locale, base)}
    ${copy.body.map((p) => html`<p>${p}</p>`)}
    <p><a href="${href(worldPath(locale), base)}">${site.worldPage.h1}</a></p>
  `;

  return renderDocument({
    locale,
    title: copy.title,
    description: copy.description,
    path: homePath(locale),
    alternates: [
      { locale: "he", path: homePath("he") },
      { locale: "en", path: homePath("en") },
    ],
    schema: homeGraph(locale, opts.games, copy),
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
    <nav class="bc"><a href="${href(homePath(locale), base)}">${site.home}</a> › ${copy.h1}</nav>
    ${stage("🏠", site, true)}
    <h1>${copy.h1}</h1>
    <p class="lede">${copy.lede}</p>
    ${copy.body.map((p) => html`<p>${p}</p>`)}
  `;

  return renderDocument({
    locale,
    title: copy.title,
    description: copy.description,
    path: worldPath(locale),
    alternates: [
      { locale: "he", path: worldPath("he") },
      { locale: "en", path: worldPath("en") },
    ],
    schema: worldGraph(locale, copy),
    body,
    base,
    indexable: opts.indexable,
    headAssets: opts.headAssets,
    bodyData: { page: "world", locale },
    // No wallet slot here: the room screen shows its own chip, and two of them
    // in one viewport reads as a bug rather than as emphasis.
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
