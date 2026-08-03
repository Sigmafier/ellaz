import type { GameMeta } from "../sdk/types";
import type { GameCopy, Locale, Titled } from "../content/types";
import { SITE } from "../content/site";
import { html, raw, type RawHtml } from "./html";
import { renderDocument } from "./layout";
import { gamePath, homePath, href, playHref } from "./routes";
import { gameGraph } from "./schema";

/**
 * One game's page.
 *
 * The AUTHORED half is `copy` - prose a person wrote. The DERIVED half is
 * `meta` plus `SITE` - the title, the emoji, the age band, the section
 * headings, the platform facts. A writer never types "free" or "works offline"
 * into a content file, so no page can claim something the platform does not do.
 *
 * There is no React here and no runtime on the page at all. A visitor with
 * JavaScript switched off reads every word and can still reach the game; the
 * play button is a plain link into the app. Phase 5 turns that link into an
 * in-place mount, and that is the ONLY thing about this page that changes.
 */

/** `title - body` pairs, as an ordered list. Used for the how-to-play steps. */
function steps(items: Titled[]): RawHtml {
  return html`<ol>
    ${items.map((s) => html`<li><b>${s.title}</b> - ${s.body}</li>`)}
  </ol>`;
}

/** `title` as an h3, `body` as the paragraph under it. */
function sections(items: Titled[]): RawHtml {
  return html`${items.map((s) => html`<h3>${s.title}</h3>
    <p>${s.body}</p>`)}`;
}

/**
 * Up to six other games worth a click, nearest first.
 *
 * Same category, then the same age band, then whatever is left - so the list is
 * never short even for a category of one, and never random. Deriving it means a
 * new game joins every relevant page's related list on the build that adds it.
 */
export function relatedTo(
  meta: GameMeta,
  all: ReadonlyArray<GameMeta>,
  limit = 6,
): ReadonlyArray<GameMeta> {
  const others = all.filter((m) => m.id !== meta.id);
  const rank = (m: GameMeta) =>
    m.category === meta.category ? 0 : m.ageBand === meta.ageBand ? 1 : 2;
  return [...others].sort((a, b) => rank(a) - rank(b)).slice(0, limit);
}

export function gameCards(
  games: ReadonlyArray<GameMeta>,
  locale: Locale,
  base: string,
): RawHtml {
  const site = SITE[locale];
  return html`<ul class="grid">
    ${games.map(
      (m) => html`<li>
        <a href="${href(gamePath(m.id, locale), base)}">
          <span class="em" aria-hidden="true">${m.emoji}</span>
          <span>${m.title[locale]}<span class="cat">${site.categories[m.category] ?? ""}</span></span>
        </a>
      </li>`,
    )}
  </ul>`;
}

/** The H1. Derived, so no content file can disagree with the catalog. */
export function headingFor(meta: GameMeta, locale: Locale): string {
  return locale === "he" ? `משחק ${meta.title.he}` : meta.title.en;
}

export interface GamePageOptions {
  meta: GameMeta;
  copy: GameCopy;
  locale: Locale;
  all: ReadonlyArray<GameMeta>;
  base: string;
  indexable: boolean;
}

export function gamePage(opts: GamePageOptions): string {
  const { meta, copy, locale, base } = opts;
  const site = SITE[locale];
  const h = site.headings;
  const related = relatedTo(meta, opts.all);

  const body = html`
    <nav class="bc">
      <a href="${href(homePath(locale), base)}">${site.home}</a> ›
      ${site.categories[meta.category] ?? ""} › ${meta.title[locale]}
    </nav>

    <h1>${headingFor(meta, locale)}</h1>
    <p class="lede">${copy.lede}</p>
    <ul class="facts">
      ${site.facts.map((f) => html`<li>${f}</li>`)}
    </ul>

    <p class="cta">
      <a class="play" href="${playHref(meta.id, base)}">${site.play} ${raw("&nbsp;")}${meta.emoji}</a>
      <span class="note">${site.playNote}</span>
    </p>

    <h2>${h.howToPlay}</h2>
    ${steps(copy.howToPlay)}

    <h2>${h.about}</h2>
    ${copy.body.map((p) => html`<p>${p}</p>`)}

    <h2>${h.teaches}</h2>
    ${sections(copy.teaches)}

    <h2>${h.tips}</h2>
    ${sections(copy.tips)}

    <h2>${h.ages}</h2>
    ${sections(copy.ages)}

    <h2>${h.accessibility}</h2>
    <p>${copy.accessibility}</p>

    <h2>${h.together}</h2>
    ${sections(copy.together)}

    <h2>${h.faq}</h2>
    ${copy.faq.map((f) => html`<h3>${f.q}</h3>
      <p>${f.a}</p>`)}

    <h2>${h.related}</h2>
    ${gameCards(related, locale, base)}
  `;

  return renderDocument({
    locale,
    title: copy.metaTitle,
    description: copy.metaDescription,
    path: gamePath(meta.id, locale),
    alternates: [
      { locale: "he", path: gamePath(meta.id, "he") },
      { locale: "en", path: gamePath(meta.id, "en") },
    ],
    schema: gameGraph(meta, copy, locale),
    body,
    base,
    indexable: opts.indexable,
  });
}
