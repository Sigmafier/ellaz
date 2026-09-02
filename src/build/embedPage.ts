import type { GameMeta } from "../sdk/types";
import { SITE } from "../content/site";
import { CANONICAL_LOCALE } from "../i18n/locales";
import { lazyPreloadTags, type HeadAssets } from "./assets";
import { gameName } from "./gameName";
import { stage } from "./gamePage";
import { html, raw } from "./html";
import { renderDocument } from "./layout";
import { LOCALES, gamePath, href } from "./routes";

/**
 * The embed document: one game, full-viewport, for a stranger's iframe.
 *
 * WHAT IT IS. An EMITTED DOCUMENT like a game page - it carries the same
 * `headAssets` and preloads and boots the same bundle - and not a second
 * Vite entry. That is what keeps `assert:first-visit`, `assert:payload` and
 * the precache list untouched by its existence: the shell a child downloads
 * does not know this page exists.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. No header, no breadcrumb, no prose, no
 * footer, no analytics tag, no consent bar, no alternates, no share card of
 * its own. It runs inside a third party's page, so `analytics: false` here
 * and the three skipped calls in `bootContentPage` are the same decision
 * `src/standalone.tsx` spells out in its header: a frame that phones home
 * from somebody else's site is the one thing that makes a game un-listable.
 *
 * ONE PER GAME. Emitted in the canonical locale; `?lang=xx` is read at
 * runtime (`requestedLocale`), so the link at the bottom carries its label
 * and its target for every page locale on `data-` attributes and the runtime
 * picks one - the same arrangement as the poster's three strings, and for
 * the same reason: the runtime may not import `src/content`.
 *
 * `shell: true` because this page IS an application with one screen, exactly
 * like `standalone.html` - it wants `class="app-shell"` (the app tokens, the
 * full-viewport rules) and none of the ~300 lines of DOCUMENT_CSS that style
 * a header, a footer and a card grid it does not have. The few rules it does
 * need are below.
 *
 * The canonical is the GAME PAGE. `renderDocument` derives the canonical and
 * the share card from `path`, so the game page's path is what goes in - the
 * frame is not a destination, the game page is, and a link to the frame
 * previews as the game. The route table says the same thing in
 * `canonicalPath`, and `pages.json` publishes it for the gate.
 */

export interface EmbedPageOptions {
  meta: GameMeta;
  base: string;
  headAssets?: HeadAssets;
}

/**
 * Everything the frame needs that `global.css` does not give `body.app-shell`.
 *
 * `body` is a flex column the height of the frame: the stage takes the room,
 * the one link takes a FIXED 46px row INSIDE that column - never appended
 * below the stage, so the document never grows past the iframe and nothing
 * scrolls. `EMBED_HEIGHT` in `gamePage.ts` is sized against exactly this row.
 *
 * `#game-frame` is CONTENT-SIZED (`flex:0 0 auto`), exactly as on a game page.
 *
 * WHAT HAPPENS WHEN THE FRAME IS TOO SHORT, measured rather than assumed
 * (2026-09-02, built bundle, fresh load in a real iframe): `.stage .box` CLIPS.
 * At 720x600 maze is 873 px in a 554 px box and 319 px is cut, while
 * `stage.scrollHeight === stage.clientHeight` and the document reports no
 * overflow either - so nothing anywhere says a third of the board is missing.
 * `overflow:auto` on the stage does not save it (an overflowing flex item does
 * not grow an ancestor's scroll area) and neither does `fitStage`, which
 * applied no transform at any size measured here.
 *
 * So the frame's HEIGHT is the whole defence, and that is why `EMBED_HEIGHT`
 * in `gamePage.ts` carries its measurement instead of a round number.
 */
export const EMBED_ROW_HEIGHT = 46;

export const EMBED_CSS =
  "body.app-shell{display:flex;flex-direction:column}" +
  ".stage{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;overflow:auto}" +
  ".stage .box{position:relative;flex:1 1 auto;min-height:0;display:flex;flex-direction:column;" +
  "justify-content:flex-start;overflow:hidden}" +
  "#game-frame{flex:0 0 auto;display:flex;flex-direction:column}" +
  "#game-poster{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;" +
  "justify-content:center;gap:18px;text-align:center;padding:24px}" +
  "#game-poster[hidden]{display:none}" +
  "#game-poster .em{font-size:64px;line-height:1}" +
  "#game-poster .msg{font-size:.95rem;opacity:.75;max-width:22ch}" +
  ".play{min-height:56px;padding:0 28px;border:0;border-radius:999px;font:inherit;font-weight:700;" +
  "font-size:1.1rem;background:var(--brand,#ff4d8d);color:var(--on-brand,#fff)}" +
  `.embed-home{flex:0 0 ${EMBED_ROW_HEIGHT}px;box-sizing:border-box;margin:0;padding:0 12px;` +
  "display:flex;align-items:center;justify-content:center;text-align:center;font-size:.85rem}" +
  ".embed-home a{color:inherit;text-decoration:underline}";

export function embedPage(opts: EmbedPageOptions): string {
  const { meta, base } = opts;
  const locale = CANONICAL_LOCALE;
  const site = SITE[locale];
  const name = gameName(meta.id, locale);
  const [tBefore, tAfter] = site.embed.docTitle;
  const [dBefore, dAfter] = site.embed.docDescription;

  // The one way out. `target="_top"` is the whole point: a link that
  // navigates the FRAME leaves the visitor on the host page looking at our
  // game page squeezed into 600px, with no way back. `_top` takes the tab.
  //
  // One anchor, every page locale on it. `data-say-*` and `data-to-*` rather
  // than `data-href-*`: a gate here reads `<a[^>]+href="` and must not be
  // handed a second attribute that ends in `href="`.
  const homeLink = html`<a
    id="embed-home"
    href="${href(gamePath(meta.id, locale), base)}"
    target="_top"
    rel="noopener"
    ${LOCALES.map(
      (l) =>
        html` data-say-${l}="${SITE[l].embed.playMore}" data-to-${l}="${href(gamePath(meta.id, l), base)}"`,
    )}
  >${site.embed.playMore}</a>`;

  const body = html`
    <style>${raw(EMBED_CSS)}</style>
    ${stage(meta.emoji, site)}
    <p class="embed-home">${homeLink}</p>
  `;

  return renderDocument({
    locale,
    title: `${tBefore}${name}${tAfter}`,
    description: `${dBefore}${name}${dAfter}`,
    // The GAME page's path, on purpose - see the module comment. The embed's
    // own address is `embedPath(meta.id)`, and the route table carries it.
    path: gamePath(meta.id, locale),
    alternates: [],
    schema: undefined,
    body,
    base,
    indexable: false,
    analytics: false,
    shell: true,
    headAssets: opts.headAssets,
    preloads: lazyPreloadTags(opts.headAssets, base, meta.id),
    // Three, and every one has a reader: `page` routes `readPageContext`,
    // `game` is the id `GameHost` mounts, `locale` is the document's own
    // language. A fourth carrying the embed's own path was emitted here for
    // one revision and nothing read it - a field with no consumer reads as
    // supported and is not.
    bodyData: { page: "embed", game: meta.id, locale },
  });
}
