import type { Locale } from "../content/types";
import { SITE } from "../content/site";
import { html, raw, jsonLd, toHtml, type RawHtml } from "./html";
import type { HeadAssets } from "./assets";
import { canonicalUrl, homePath, href, OG_ROUTES } from "./routes";
import { OG_HEIGHT, OG_WIDTH, ogImagePath } from "./ogCard";
// themes.ts imports nothing, which is what lets both the Vite config and this
// build-time renderer read the same theme list. See src/ui/themes.ts.
import { DEFAULT_THEME, themeBootScript, themeById } from "../ui/themes";

/**
 * The document shell every emitted page shares: head, header, footer.
 *
 * WHY THE STYLES ARE INLINE AND NOT THE APP'S STYLESHEET
 * Two reasons, and the second is the load-bearing one.
 *
 * 1. The app's `global.css` sets `body { overflow: hidden }`. It is an
 *    application shell, not a document - a page of prose under that rule has
 *    everything below the fold unreachable by scroll, while a crawler reads it
 *    perfectly. Silent, human-only, and exactly the kind of failure this
 *    project keeps shipping.
 * 2. A `<link href="assets/shell-<hash>.css">` couples all 46 emitted pages to
 *    a build hash. Inline means a page is one file with no second request, no
 *    cache dependency, and no way to render unstyled because an asset moved.
 *
 * The cost is ~2 KB per page, uncompressed, and these pages are not precached.
 */

const FONTS =
  "https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;800&family=Fredoka:wght@500;600&display=swap";

/**
 * The document stylesheet. Logical properties throughout (`margin-inline`,
 * `padding-inline-start`, `text-align: start`) so one sheet serves the RTL
 * Hebrew tree and the LTR English tree with no mirroring work.
 */
export const DOCUMENT_CSS = `
/* Every custom property here is --doc-*, and that prefix is load-bearing.
   A page that boots the app also links tokens.css, so a bare --bg or --ink
   declared here would collide with an app token. Never reuse an app name.

   THE VALUES DERIVE FROM THE THEME, with a literal fallback.

   Custom properties resolve at computed-value time, AFTER every stylesheet
   has parsed - so var(--text) here picks up tokens.css even though this block
   is inlined above the app's <link>. On a page that carries no app runtime
   (the 404, the English index) the fallback applies instead, which is why
   every one of these has one.

   NO BACKTICKS IN THIS COMMENT. It lives inside a JS template literal, and a
   backtick closes the string - the file then fails to parse somewhere far
   below with an error naming a CSS word as an undefined variable. FOURTH time
   in this repo, most recently in the full-screen block at the bottom of this
   same stylesheet, so the warning applies to every comment in here and not
   just this one.

   Before this, a game page was a white article with a navy rectangle punched
   into it: the app was dark, the document was light, and they were two
   products on one screen. */
*,*::before,*::after{box-sizing:border-box}
:root{
  --doc-ink:var(--text,#1b1b2b);
  --doc-soft:var(--text-dim,#5a5a72);
  --doc-line:var(--line,#e4e2ef);
  --doc-bg:var(--bg,#fdfcff);
  --doc-card:var(--surface,#ffffff);
  --doc-brand:var(--brand-ink,#6c5ce7);
  --doc-sun:var(--yellow,#ffc730);
  --doc-stage:var(--stage-bg,#12142b);
}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--doc-bg);color:var(--doc-ink);
  font:400 17px/1.7 Heebo,Assistant,Rubik,system-ui,-apple-system,sans-serif}
main{max-width:44rem;margin-inline:auto;padding:0 20px 72px}
h1,h2,h3{font-family:Fredoka,Heebo,system-ui,sans-serif;line-height:1.25;margin:0;
  color:var(--doc-ink)}
h1{font-size:2rem;font-weight:600;margin-block:8px 12px}
h2{font-size:1.35rem;font-weight:600;margin-block:44px 12px}
h3{font-size:1.05rem;font-weight:600;margin-block:22px 4px}
p{margin-block:0 14px}
a{color:var(--doc-brand)}
.top{border-block-end:1px solid var(--doc-line);background:var(--doc-card)}
.top .in{max-width:44rem;margin-inline:auto;padding:12px 20px;display:flex;
  align-items:center;gap:12px}
.brand{font-family:Fredoka,system-ui,sans-serif;font-size:1.15rem;font-weight:600;
  color:var(--doc-ink);text-decoration:none}
.tagline{color:var(--doc-soft);font-size:.82rem;flex:1}
#wallet-slot{flex:0 0 auto}
.bc{font-size:.82rem;font-weight:600;color:var(--doc-soft);margin-block:18px 0}
.bc a{text-decoration:none}
.lede{font-size:1.12rem;color:var(--doc-ink)}
.facts{list-style:none;display:flex;flex-wrap:wrap;gap:8px;padding:0;margin:18px 0 0}
.facts li{border:1px solid var(--doc-line);background:var(--doc-card);border-radius:999px;
  padding:5px 13px;font-size:.82rem;font-weight:600;color:var(--doc-soft)}
.cta{display:flex;flex-wrap:wrap;align-items:center;gap:14px;margin:26px 0 8px}
.play{display:inline-flex;align-items:center;justify-content:center;min-height:76px;
  padding:0 40px;border:none;border-radius:22px;background:var(--doc-sun);
  color:var(--doc-ink);text-decoration:none;font-family:Fredoka,system-ui,sans-serif;
  font-size:1.3rem;font-weight:600;box-shadow:0 4px 0 var(--doc-line);cursor:pointer}
.cta .note{color:var(--doc-soft);font-size:.86rem;flex:1 1 12rem}
ol,ul.steps{padding-inline-start:1.3em}
ol li,ul.steps li{margin-block-end:8px}
table{border-collapse:collapse;width:100%;margin-block:14px;font-size:.95rem}
th,td{border:1px solid var(--doc-line);padding:8px 12px;text-align:start}
th{background:var(--doc-card);font-weight:600}
.grid{list-style:none;padding:0;margin:20px 0 0;display:grid;gap:12px;
  grid-template-columns:repeat(auto-fill,minmax(9.5rem,1fr))}
.grid a{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--doc-card);
  border:1px solid var(--doc-line);border-radius:16px;text-decoration:none;
  color:var(--doc-ink);font-weight:600}
.grid .em{font-size:1.5rem;line-height:1}
.grid .cat{display:block;font-size:.75rem;font-weight:400;color:var(--doc-soft)}
footer{border-block-start:1px solid var(--doc-line);margin-block-start:56px;
  padding:22px 20px 40px;color:var(--doc-soft);font-size:.85rem}
footer .in{max-width:44rem;margin-inline:auto;display:flex;flex-wrap:wrap;gap:14px}

/* --- the stage: the poster, then the game ---------------------------------
   Two SIBLINGS, never nested. React owns the children of #game-frame and of
   #wallet-slot and of nothing else on this page; the poster is ours, emitted
   here and hidden by the runtime once the game is up. Nesting the poster
   inside the frame would put a node React does not know about inside a tree
   it reconciles, which is the nested-root teardown bug wearing a hat. */
/* The stage breaks out of main's gutter on a phone. Games size themselves
   against the VIEWPORT (min(90vw, 60vh, ...)), not against their container, so
   a frame inset by 20px each side is a frame the game was never measured for.
   Giving it the full width is cheaper and more honest than teaching 21 games a
   new sizing rule. */
.stage{position:relative;margin-block:14px 6px;margin-inline:-20px}
@media (min-width:720px){.stage{margin-inline:0}}
/* MIN-height, not height, and that is the whole fix for the frame.

   A fixed height makes the box a viewport the game has to fit inside, and it
   cannot: a game sizes its board against the WINDOW (min(94vw, 60vh, ...))
   and then stacks its own stats, difficulty row and keypad on top, so the
   total exceeds a frame that is only a FRACTION of that window. Sudoku wanted
   778px inside 508px and answered with an inner scrollbar - a second one, in
   the same axis as the page's, which is what reads as broken rather than
   merely tall.

   Min-height instead: the box fills the window down to the fold (145px is the
   header, breadcrumb and margin above it) and GROWS for a game that needs
   more. Nothing is cut off, and there is only ever one scrollbar - the page's,
   which every visitor already understands. dvh, not vh, so a phone's
   collapsing address bar does not leave a gap.

   It also has to be min-height rather than height because the poster is
   absolutely positioned and contributes no height of its own: before the game
   mounts, this is the only thing holding the box open. */
.stage .box{position:relative;border-radius:22px;overflow:hidden;
  background:var(--doc-stage);box-shadow:0 5px 0 var(--doc-line);
  min-height:clamp(420px,calc(100dvh - 145px),860px);display:flex;flex-direction:column}
/* The room is a composed scene - a character, a wall, a floor, eight slots -
   so it wants the height a game wants and then some. Its own rule, restored:
   folding it into the line above was fine for the room and wrong for what
   came next. */
.stage.room .box{min-height:clamp(460px,calc(100dvh - 120px),880px)}
/* The BOARDS are a short column: three pickers and a handful of rows. Given a
   viewport-sized box they sit in the top third of a large empty rectangle,
   with the page's own heading stranded far below it. Sized to content instead,
   with a floor so a player holding one record still gets a real panel rather
   than a strip. */
.stage.boards .box{min-height:clamp(300px,46dvh,560px)}
#game-frame{flex:1;min-height:0;display:flex;flex-direction:column}
#game-poster{position:absolute;inset:0;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:18px;text-align:center;padding:24px;
  color:var(--doc-ink);transition:opacity .25s ease}
#game-poster[hidden]{display:none}
#game-poster .em{font-size:64px;line-height:1}
#game-poster .msg{font-size:.95rem;opacity:.75;max-width:22ch}
.stage .noscript{position:absolute;inset-inline:0;bottom:0;padding:12px;
  background:var(--badge-fill,rgba(0,0,0,.55));color:var(--on-brand,#fff);font-size:.85rem;text-align:center}
@media (max-width:719px){.stage .box{border-radius:0;box-shadow:none;
  border-block:1px solid var(--doc-line)}}

/* --- the game gets the whole first screen --------------------------------

   Measured on a 1536x638 window: 2048's own content wants 680px and the
   header plus breadcrumb cost another 127px above it, so 169px of the game
   sat below the fold. The game is TALLER THAN THE WINDOW on its own, so no
   amount of tightening the page around it can make it fit - the only two
   levers are giving it the 127px back and scaling what is left.

   This does both. The header and breadcrumb float OVER the stage instead of
   sitting above it, and fitStage scales the mounted game to whatever is
   left. The measured effect on that window: 2048 goes from 169px past the
   fold to none, at 92% of its natural size instead of the 74% it would need
   if the header still cost its 127px.

   NOT 100vw. That unit includes the vertical scrollbar (1536) while the
   container excludes it (1521), so a 100vw bleed overhangs by half the
   scrollbar and the page really does scroll sideways by 8px - measured, and
   invisible unless you look for it. Instead main drops its own width limit
   on these pages and hands it to each prose child, which makes the stage
   full-bleed by construction with no viewport unit anywhere.

   Scoped to the two pages that hold a playable screen. The boards are a short
   column and the home index and 404 have no stage at all; all three keep the
   ordinary document layout, which is why every rule here is behind a
   [data-page] attribute rather than applied to .stage. */
body[data-page="game"] main,body[data-page="world"] main{max-width:none;padding-inline:0}
body[data-page="game"] main>:not(.stage),
body[data-page="world"] main>:not(.stage){max-width:44rem;margin-inline:auto;
  padding-inline:20px}
body[data-page="game"] .top,body[data-page="world"] .top{position:absolute;
  inset-inline:0;top:0;z-index:6;background:transparent;border-block-end:0;
  pointer-events:none}
/* The bar itself stops catching clicks so the game beneath stays playable to
   its full width; the row inside it takes them back, because the mute button
   and the wallet chip both live there. */
body[data-page="game"] .top .in,body[data-page="world"] .top .in{pointer-events:auto}
body[data-page="game"] .bc,body[data-page="world"] .bc{position:absolute;z-index:7;
  top:72px;inset-inline-start:20px;margin:0;padding:5px 14px;border-radius:999px;
  background:var(--badge-fill,rgba(0,0,0,.55))}
body[data-page="game"] .bc,body[data-page="game"] .bc a,
body[data-page="world"] .bc,body[data-page="world"] .bc a{color:var(--on-brand,#fff)}
body[data-page="game"] .stage,body[data-page="world"] .stage{margin-block:0;
  margin-inline:0}
body[data-page="game"] .stage .box,body[data-page="world"] .stage .box{
  height:100dvh;min-height:0;border-radius:0;box-shadow:none;border:0;
  justify-content:center}
/* Content-sized rather than flex:1, so fitStage can read the game's NATURAL
   height. A frame that stretches to fill the box reports the box's height back
   and the scale factor comes out as 1 every time. */
body[data-page="game"] #game-frame,body[data-page="world"] #game-frame{flex:0 0 auto}
@media (max-width:480px){body{font-size:16px}h1{font-size:1.6rem}.play{width:100%}
  .stage .box{min-height:clamp(420px,calc(100dvh - 120px),860px)}
  .tagline{display:none}}
`.trim();

export interface DocumentOptions {
  locale: Locale;
  /** `<title>`. */
  title: string;
  description: string;
  /** Base-free canonical path, e.g. "/games/memory/". */
  path: string;
  /** The same page in the other language, if there is one. */
  alternates?: Array<{ locale: Locale; path: string }>;
  /** The JSON-LD `@graph`, already assembled. */
  schema?: unknown;
  /** Emitted into `<body>`, between the header and the footer. */
  body: RawHtml;
  base: string;
  /**
   * False on the GitHub Pages duplicate and on the 404, where an indexable body
   * would compete with the primary host or register as a soft 404.
   */
  indexable: boolean;
  /**
   * The app's own head tags, lifted verbatim off `index.html` (see `assets.ts`).
   * A page that carries them boots the same bundle the app does; a page that
   * does not - the 404, and the English index - stays a pure document.
   */
  headAssets?: HeadAssets;
  /**
   * `<link rel="modulepreload">` for the chunks THIS page will go on to fetch
   * by itself - the content-page runtime, and on a game page that one game.
   *
   * Kept separate from `headAssets.tags` on purpose: those are lifted verbatim
   * off `index.html` and must stay byte-identical across every page, while
   * these differ per page and are the whole point of the split. Built by
   * `lazyPreloadTags` in `assets.ts`, empty when there is no bundle.
   */
  preloads?: string[];
  /**
   * `data-*` on `<body>`. This is how the runtime learns what page it is on
   * without re-deriving the base from `location.pathname` at runtime.
   */
  bodyData?: Record<string, string>;
  /**
   * Rendered inside the header, on the trailing edge. The wallet chip's mount
   * point on pages that boot the app.
   */
  headerSlot?: RawHtml;
}

/** `data-page="game" data-game="2048"`, escaped, or nothing at all. */
function bodyAttrs(data: Record<string, string> | undefined): string {
  if (!data) return "";
  return Object.entries(data)
    .map(([k, v]) => ` data-${k}="${escapeAttribute(v)}"`)
    .join("");
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

export function renderDocument(opts: DocumentOptions): string {
  const { locale, base } = opts;
  const site = SITE[locale];
  const dir = locale === "he" ? "rtl" : "ltr";
  const canonical = canonicalUrl(opts.path);
  // The share card, found by PATH rather than passed down. Every caller
  // already knows its own path and the route table already knows every card,
  // so threading an extra argument through five page builders would be a
  // second place for the two to disagree.
  //
  // ABSOLUTE, and pointing at ellaz.fun on both hosts - the same rule the
  // canonical follows. A scraper is handed a URL with no page context, so a
  // base-relative one is unusable, and the Pages duplicate is noindex anyway.
  // OG_ROUTES, not ROUTES: the 404 deliberately has no card, because a
  // "not found" page is never deliberately shared and a picture for it
  // would promise content that does not exist. Looking it up in the full
  // route table instead advertises a file the build never writes.
  const ogRoute = OG_ROUTES.find((r) => r.path === opts.path);
  const ogImage = ogRoute ? canonicalUrl(ogImagePath(ogRoute)) : "";
  const alternates = opts.alternates ?? [];

  return (
    "<!doctype html>\n" +
    toHtml(html`<html lang="${locale}" dir="${dir}">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <!-- FIRST, and synchronous. data-theme is deliberately never baked into
             these documents - they are cached and it would be wrong for whoever
             chose the other theme - so this is what sets it before the first
             paint. A module import runs far too late and the page visibly
             flashes the other theme. Generated from themes.ts, never written
             out here, so adding a theme cannot leave it behind. -->
        <script>
          ${raw(themeBootScript())}
        </script>
        <meta name="theme-color" content="${themeById(DEFAULT_THEME).browserChrome}" />
        <title>${opts.title}</title>
        <meta name="description" content="${opts.description}" />
        <link rel="canonical" href="${canonical}" />
        ${alternates.map(
          (a) =>
            html`<link rel="alternate" hreflang="${a.locale}" href="${canonicalUrl(a.path)}" />`,
        )}
        ${alternates.length > 0 &&
        html`<link rel="alternate" hreflang="x-default" href="${canonicalUrl(homePath("he"))}" />`}
        ${!opts.indexable && html`<meta name="robots" content="noindex, follow" />`}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="${site.brand}" />
        <meta property="og:locale" content="${locale === "he" ? "he_IL" : "en_US"}" />
        <meta property="og:title" content="${opts.title}" />
        <meta property="og:description" content="${opts.description}" />
        <meta property="og:url" content="${canonical}" />
        ${ogImage &&
        html`<meta property="og:image" content="${ogImage}" />
          <meta property="og:image:width" content="${String(OG_WIDTH)}" />
          <meta property="og:image:height" content="${String(OG_HEIGHT)}" />
          <meta property="og:image:alt" content="${opts.title}" />
          <meta name="twitter:image" content="${ogImage}" />`}
        <meta name="twitter:card" content="${ogImage ? "summary_large_image" : "summary"}" />
        <link rel="icon" type="image/svg+xml" href="${base}favicon.svg" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link rel="stylesheet" href="${FONTS}" />
        <style>
          ${raw(DOCUMENT_CSS)}
        </style>
        ${opts.schema &&
        html`<script type="application/ld+json">
          ${jsonLd(opts.schema)}
        </script>`}
        ${(opts.headAssets?.tags ?? []).map((t) => raw(t))}
        ${(opts.preloads ?? []).map((t) => raw(t))}
      </head>
      <body ${raw(bodyAttrs(opts.bodyData))}>
        <header class="top">
          <div class="in">
            <a class="brand" href="${href(homePath(locale), base)}">${site.brand}</a>
            <span class="tagline">${site.tagline}</span>
            ${opts.headerSlot}
          </div>
        </header>
        <main>${opts.body}</main>
        <footer>
          <div class="in">
            <span>${site.footer}</span>
            <a href="${href(homePath(locale === "he" ? "en" : "he"), base)}">${locale === "he" ? "English" : "עברית"}</a>
          </div>
        </footer>
      </body>
    </html>`)
  );
}
