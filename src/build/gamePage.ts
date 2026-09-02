import { ART_HEIGHT, ART_WIDTH, artHref } from "./artFiles";
import type { GameMeta } from "../sdk/types";
import { gameName } from "./gameName";
import type { GameCopy, Locale, Titled } from "../content/types";
import { ORIGIN, SITE, type SiteCopy } from "../content/site";
import { html, raw, type RawHtml } from "./html";
import { betaBadge, icon, renderDocument, utilityRow } from "./layout";
import {
  LOCALES,
  PAGED_CATEGORIES,
  categoryPath,
  embedPath,
  gamePath,
  homePath,
  href,
} from "./routes";
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
          <span>${gameName(m.id, locale)}<span class="cat">${site.categories[m.category] ?? ""}</span></span>
        </a>
      </li>`,
    )}
  </ul>`;
}

/**
 * The middle step of the breadcrumb, as a LINK when that group has a page.
 *
 * This is where the category pages get their inbound links, and the choice of
 * place was made on a measurement rather than on taste. The obvious home is
 * the home page - but the home body is emitted into `index.html`, so five
 * links there cost the FIRST VISIT 81 B gz (two arms, one tree, 2026-08-21)
 * against 63 B of headroom. Here they cost it nothing: a game page is an
 * emitted document that no child downloads before choosing a game, and there
 * are 33 of them in each of four languages rather than one.
 *
 * It is also the better link. A breadcrumb is contextual, it is where a reader
 * expects to find the group, and it already carried the group's NAME as plain
 * text - so this adds an href and no words at all.
 *
 * Plain text when the group has no page. `create` holds one game today, and a
 * breadcrumb linking to a page the build did not emit is exactly the internal
 * 404 that `assert-pages.mjs` fails on - which is the gate working, and a
 * reason to ask `PAGED_CATEGORIES` rather than to assume.
 */
function categoryCrumb(meta: GameMeta, locale: Locale, base: string): RawHtml {
  const label = SITE[locale].categories[meta.category] ?? "";
  if (!PAGED_CATEGORIES.includes(meta.category)) return html`${label}`;
  return html`<a href="${href(categoryPath(meta.category, locale), base)}">${label}</a>`;
}

/**
 * The H1. Derived, so no content file can disagree with the catalog.
 *
 * The word around the title is COPY and lives in `SITE`, which is keyed by
 * `PageLocale` - so a language arrives with its own answer or the build refuses
 * it. The renderer no longer knows that Hebrew is the one with a word in front.
 */
export function headingFor(meta: GameMeta, locale: Locale): string {
  return SITE[locale].gameHeading.replace("{title}", gameName(meta.id, locale));
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

/**
 * HTML the STRANGER pastes - text and attribute positions in a document we do
 * not control. `&`, `<`, `>` and `"` are the whole surface; `'` is left alone
 * because `&#39;` in a game's name reads as a defect to the person copying
 * it, and inside a double-quoted attribute an apostrophe is a plain character.
 */
export function snippetText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function snippetAttr(value: string): string {
  return snippetText(value).replace(/"/g, "&quot;");
}

/**
 * The frame's height, and the one number in the snippet a stranger will edit.
 *
 * 940 RATHER THAN THE MOCK'S 600, and the difference is a game a child cannot
 * finish. Measured 2026-09-02 on the built bundle, loaded fresh at each size in
 * a real iframe on a real host page (`maze`, the tallest of the roster's DOM
 * games):
 *
 *     720 x 600   box 554, game 873  ->  319 px CUT, and NOTHING scrolls
 *     720 x 940   box 894, game 881  ->  nothing cut, link row ends at 928
 *
 * The 600 row is the dangerous one: `.stage .box` clips, so neither the
 * document nor the stage reports a scrollbar. A third of the board is simply
 * not there, and the page looks perfectly composed - which is why this number
 * had to be measured rather than chosen.
 *
 * KNOWN RESIDUE, stated rather than discovered later: at 360 px wide - a phone,
 * or a narrow column on somebody's site - maze re-lays out to 942 px and 48 px
 * is still cut at this height. Raising the default to ~1000 fixes that and
 * gives every desktop host 60 px of empty ground; nobody has ruled on the
 * trade, so the measured shortfall is written here instead of being smoothed
 * over. `fitStage` does not rescue it - it does not scale inside the frame
 * (transform stays `none` at every size measured).
 *
 * The preview on our own page uses this same figure, so what a stranger sees
 * here is what they get.
 */
export const EMBED_HEIGHT = 940;

/**
 * The credit line under the frame: the game's name and the site's name, each
 * a real link, in this language's word order.
 *
 * THIS IS THE WHOLE POINT OF THE LANE. A link inside the frame is on our own
 * domain and earns nothing; only the anchor a stranger pastes into THEIR page
 * is theirs. So the `<p>` is not optional decoration under the iframe - it is
 * the artifact, and the iframe is the reason they paste it.
 *
 * Absolute URLs, always ellaz.fun, on both hosts: this text is going into a
 * document whose base we will never know.
 */
export function embedCredit(meta: GameMeta, locale: Locale): string {
  const [before, between, after] = SITE[locale].embed.credit;
  const name = gameName(meta.id, locale);
  return (
    `<p>${snippetText(before)}<a href="${ORIGIN}${gamePath(meta.id, locale)}">${snippetText(name)}</a>` +
    `${snippetText(between)}<a href="${ORIGIN}/">ellaz.fun</a>${snippetText(after)}</p>`
  );
}

/**
 * The exact bytes a stranger copies. Pure, so `embed.test.ts` can pin them.
 *
 * `?lang=` carries the PAGE's language: somebody who read the Hebrew page gets
 * a frame that plays in Hebrew and a credit line written in Hebrew. The
 * runtime validates the value (`requestedLocale`), so a hand-edited `?lang=`
 * falls back rather than breaking. `allow="fullscreen"` is what lets the
 * frame's own full-screen button work at all - a frame without it gets a
 * refusal the player cannot see.
 */
export function embedSnippet(meta: GameMeta, locale: Locale): string {
  const name = gameName(meta.id, locale);
  const src = `${ORIGIN}${embedPath(meta.id)}?lang=${locale}`;
  return (
    `<iframe src="${src}" width="100%" height="${EMBED_HEIGHT}" ` +
    `style="border:0;border-radius:12px" allow="fullscreen" ` +
    `title="${snippetAttr(`${name} - ellaz.fun`)}"></iframe>\n` +
    embedCredit(meta, locale)
  );
}

/**
 * The section at the end of a game page that hands the snippet over.
 *
 * A live preview - the embed page itself, in an iframe, LAZY so the page's
 * ~900 words and its own game are not competing with a second copy of the app
 * before anyone has scrolled to it - then the credit line exactly as their
 * page will render it, then the code in a `<pre>`, then the copy button.
 *
 * The `<pre>` holds the snippet as TEXT: the tagged template escapes it, the
 * browser decodes it, and `textContent` hands the runtime the raw bytes back.
 * That is the copy path (`wireEmbedCopy` in `PageApp.tsx`) - `textContent`,
 * never `innerHTML`, which would copy the escaped display and hand a stranger
 * `&lt;iframe`. `embed.test.ts` decodes the emitted `<pre>` and requires it to
 * equal `embedSnippet` byte for byte.
 *
 * The button is emitted `hidden` like every other control the runtime owns:
 * without a script it does nothing, and a button that does nothing is worse
 * than none. The `<pre>` stays selectable by hand either way.
 *
 * The preview's src carries the BASE, the snippet's does not: the preview is
 * our own page loading our own document on whichever host we are on; the
 * snippet is going somewhere we will never know.
 */
function embedSection(meta: GameMeta, locale: Locale, base: string): RawHtml {
  const e = SITE[locale].embed;
  const name = gameName(meta.id, locale);
  return html`<section class="embed" id="embed">
    <h2>${e.heading}</h2>
    <p>${e.lede}</p>
    <iframe
      src="${href(embedPath(meta.id), base)}?lang=${locale}"
      width="100%"
      height="${String(EMBED_HEIGHT)}"
      style="border:0;border-radius:12px;background:var(--doc-stage)"
      allow="fullscreen"
      loading="lazy"
      title="${`${name} - ellaz.fun`}"
    ></iframe>
    <p class="embed-credit">${raw(embedCredit(meta, locale))}</p>
    <pre
      class="embed-code"
      data-embed-code
      dir="ltr"
      style="white-space:pre-wrap;word-break:break-all;padding:14px;border-radius:12px;background:var(--doc-card);border:1px solid var(--doc-line);font-size:.85rem"
    >${embedSnippet(meta, locale)}</pre>
    <button
      type="button"
      class="play"
      data-embed-copy
      data-label-copied="${e.copied}"
      data-label-select="${e.select}"
      hidden
    >${e.copy}</button>
  </section>`;
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

  // The BREADCRUMB and the RESTART share the utility row, above the stage.
  //
  // That row floated over the stage as a dark pill once, which is what put a
  // 44px band of buttons on top of the board. The fix was to put it in FLOW
  // and make the box pay for its height - not to delete it. Deleting it sent
  // restart into the game panel, where a fourth 56px cell wrapped the panel's
  // one row onto two lines in 25 of 33 games and clipped snake's difficulty
  // label to "Nor...".
  //
  // Full screen came down here TOO, on 2026-08-21, and for a DIFFERENT reason
  // than restart - the difference is what stops this being read as one rule.
  // Restart is a GAME control and could never have been in the header. Full
  // screen is PLATFORM chrome that changed rows: `utilityRow` emits it on all
  // three screens, so it is still in exactly one place everywhere, which is
  // the thing the rule actually protects. The operator acked that arrangement
  // in `mockups/mobile-header.html`, where the page row carries expand.
  // See .claude/rules/game-controls-and-platform-chrome-never-share-a-bar.md
  const body = html`
    ${utilityRow(
      html`<nav class="bc">
        <a href="${href(homePath(locale), base)}">${site.home}</a> ›
        ${categoryCrumb(meta, locale, base)} › ${gameName(meta.id, locale)}
      </nav>`,
      {
        // Both emitted `hidden`, like the sound and full-screen buttons and for
        // the same reason: the build cannot know whether a game ever mounts, and
        // a restart that restarts nothing is worse than no restart at all. The
        // runtime reveals each one when a game fills its slot.
        //
        // PAUSE first, then RESTART, because pause is the one a player reaches
        // for mid-run and restart is the one they must not hit by accident.
        // Pause stays hidden on the 31 games that never pass one - a turn-based
        // game already pauses itself when a hand leaves the screen.
        //
        // SHARE last of the three, and on the GAME page alone. It is a game
        // control by the one test that decides the question - "would this still
        // mean anything on the room or the boards?" - so it is emitted here
        // rather than in `screenChrome`, which serves all three screens.
        // Operator, 2026-08-25: "the share card in homepage shouldmove from
        // here. we should add per game share options instead."
        //
        // Emitted `hidden` like its two neighbours, and for a third reason of
        // its own: the sheet is a lazy chunk and the abilities behind it
        // (`navigator.share`, the clipboard) are the browser's, so the build
        // cannot know whether this device can do anything with a tap.
        //
        // The NAME AND GLYPH ride on `data-` attributes rather than being
        // looked up at runtime, exactly as the pause button's two labels do.
        // The alternative is `metaFor(id)` in `PageApp`, which imports the FULL
        // roster - `no-app-imports.test.ts` refuses that by name, and it is
        // right to: this page already knows which game it is, so shipping 33
        // metas to find out again is a lookup the build already did. It also
        // gets the name in the PAGE's language for free, which `meta.title`
        // could not - that record only carries the two SHIPPED locales.
        tools: html`<button
            type="button"
            class="ubtn"
            data-pause
            data-label-pause="${site.chrome.pause}"
            data-label-resume="${site.chrome.resume}"
            aria-label="${site.chrome.pause}"
            hidden
          >
            ${icon("pause")}
          </button>
          <button type="button" class="ubtn" data-restart aria-label="${site.chrome.restart}" hidden>
            ${icon("redo")}
          </button>
          <button
            type="button"
            class="ubtn"
            data-share
            data-share-title="${gameName(meta.id, locale)}"
            data-share-emoji="${meta.emoji}"
            aria-label="${site.chrome.share}"
            hidden
          >
            ${icon("share")}
          </button>`,
        // LAST in the row, at the far edge. `utilityRow` appends it after
        // whatever is in `tools`, so the order is decided in one place
        // rather than by whichever screen happened to pass what.
        fullLabel: site.chrome.fullScreen,
        reportLabel: site.chrome.report,
        // BESIDE THE GAME'S NAME, on the one screen where the player has
        // already committed. It is derived from `meta.beta`, the same field
        // the home card reads, so the badge on the card and the badge here
        // cannot disagree about which game is unfinished.
        badge: meta.beta ? betaBadge(site) : undefined,
      },
    )}
    ${stage(meta.emoji, site)}

    <h1>${headingFor(meta, locale)}</h1>
    <p class="lede">${copy.lede}</p>

    <!--
      The page's own picture, and the first image in the article body.

      Google chooses the thumbnail beside a text result from images embedded on
      the page. Until 2026-08-22 there were none: the stage above draws the
      emoji as TEXT and the art everywhere else is inline <svg>, which has no
      URL and cannot be indexed as an image. So the result was permanently
      pictureless with nothing failing anywhere.

      width/height are the SVG's own declared box, so the browser reserves
      the space from the attributes and this adds nothing to the layout shift.
      loading is EAGER on purpose - it is the main image, above most of the
      prose, and a lazy main image is one Google may not see.

      The alt is one template per language with the game's name filled in.
      It was the page's own H1 for an hour, which reads as "Snake" and "2048"
      in three of the four languages - a name, not a description of a picture.
    -->
    <img
      class="art"
      src="${artHref(base, meta.id)}"
      alt="${site.artAlt.replace("{title}", gameName(meta.id, locale))}"
      width="${ART_WIDTH}"
      height="${ART_HEIGHT}"
      decoding="async"
    />
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

    ${embedSection(meta, locale, base)}
  `;

  return renderDocument({
    locale,
    title: copy.metaTitle,
    description: copy.metaDescription,
    path: gamePath(meta.id, locale),
    alternates: LOCALES.map((l) => ({ locale: l, path: gamePath(meta.id, l) })),
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
      title: gameName(meta.id, locale),
      cat: site.categories[meta.category],
      backLabel: site.chrome.back,
      soundLabel: site.chrome.sound,
      fullLabel: site.chrome.fullScreen,
    },
  });
}
