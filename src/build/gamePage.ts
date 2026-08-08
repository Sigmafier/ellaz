import type { GameMeta } from "../sdk/types";
import type { GameCopy, Locale, Titled } from "../content/types";
import { SITE, type SiteCopy } from "../content/site";
import { html, type RawHtml } from "./html";
import { renderDocument } from "./layout";
import { gamePath, homePath, href } from "./routes";
import { gameGraph } from "./schema";
import { lazyPreloadTags, type HeadAssets } from "./assets";
// Build-time only, and the same module the share cards read. `src/build` may
// read `src/ui`; nothing in the app may read `src/build`.
import { artGround } from "../ui/gameArt";

/**
 * One game's page.
 *
 * The AUTHORED half is `copy` - prose a person wrote. The DERIVED half is
 * `meta` plus `SITE` - the title, the emoji, the age band, the section
 * headings, the platform facts. A writer never types "free" or "works offline"
 * into a content file, so no page can claim something the platform does not do.
 *
 * There is no React in this file. The page carries the app's own head tags, so
 * the same bundle boots here as at `/`, and it mounts into exactly two elements:
 * `#game-frame` and `#wallet-slot`. Everything else on the page - every word of
 * it - is emitted once and never reconciled, which is what makes hydration
 * mismatch structurally impossible rather than merely unlikely.
 *
 * The poster is a SIBLING of the frame, not a child. A node React does not know
 * about, sitting inside a tree it reconciles, is the nested-root teardown bug in
 * a different costume (see `.claude/rules/react-nested-root-teardown.md`).
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

/**
 * Which kind of screen the stage is holding, because they do not want the same
 * box. A GAME sizes its board against the viewport and needs the room; the ROOM
 * is a scene with a fixed composition; the BOARDS are a short list of pickers
 * and rows and look abandoned inside a full-height frame.
 *
 * Absent means a game — the default, and the only one that needs the tallest box.
 */
export type StageVariant = "room" | "boards";

/**
 * The stage: a poster that paints immediately, and the empty box the game
 * mounts into.
 *
 * The three poster strings ride on `data-` attributes rather than being
 * duplicated into `@i18n`, because the runtime may not import `src/content`
 * (that would put every word of every page into the precached shell) and a
 * second copy of a string is a second chance for it to drift.
 *
 * The poster's DEFAULT state is the honest one - a real button and a line
 * saying the game needs JavaScript. The runtime rewrites both on boot: it
 * hides the button and says the game is loading by itself, unless the visitor
 * has data saver on, in which case the button stays and waits for their tap.
 *
 * Emitting the optimistic state instead ("loading...") would be a lie to
 * anyone with JavaScript off, and they are exactly the visitor who cannot be
 * told otherwise later.
 */
export function stage(emoji: string, site: SiteCopy, variant?: StageVariant): RawHtml {
  return html`<div class="stage${variant ? ` ${variant}` : ""}">
    <div class="box">
      <div id="game-frame"></div>
      <div
        id="game-poster"
        data-loading="${site.loading}"
        data-saver="${site.dataSaver}"
      >
        <span class="em" aria-hidden="true">${emoji}</span>
        <button class="play" id="game-play" type="button">${site.play}</button>
        <span class="msg" id="game-msg">${site.noScript}</span>
      </div>
    </div>
  </div>`;
}

export interface GamePageOptions {
  meta: GameMeta;
  copy: GameCopy;
  locale: Locale;
  all: ReadonlyArray<GameMeta>;
  base: string;
  indexable: boolean;
  headAssets?: HeadAssets;
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

    ${stage(meta.emoji, site)}

    <h1>${headingFor(meta, locale)}</h1>
    <p class="lede">${copy.lede}</p>
    <ul class="facts">
      ${site.facts.map((f) => html`<li>${f}</li>`)}
    </ul>

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
    headAssets: opts.headAssets,
    // This page's own game, and only this page's own game. The id is the same
    // one the runtime reads off `data-game`, so the preload and the fetch can
    // never name different chunks.
    preloads: lazyPreloadTags(opts.headAssets, base, meta.id),
    bodyData: { page: "game", game: meta.id, locale },
    headerSlot: html`<span id="wallet-slot"></span>`,
    // The header's own chrome. `ground` is the same colour the key art paints
    // behind this game, so the bar is a deep tone of what the page already
    // shows rather than of the brand colour - which is a real distinction:
    // reading the brand instead produced a dusty rose bar over a yellow page,
    // correct CSS pointed at the wrong variable, and nothing could flag it.
    headerChrome: {
      ground: artGround(meta.id),
      title: meta.title[locale],
      cat: site.categories[meta.category],
      backLabel: site.chrome.back,
      fullLabel: site.chrome.fullScreen,
    },
  });
}
