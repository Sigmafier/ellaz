import type { Locale } from "../content/types";
import { SITE } from "../content/site";
import { html, raw, jsonLd, toHtml, type RawHtml } from "./html";
import type { HeadAssets } from "./assets";
import { canonicalUrl, homePath, href } from "./routes";

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
   A page that boots the app links tokens.css BEFORE this block, so a bare
   --bg or --ink declared here would WIN and repaint every game component
   inside the frame with document colours. Never reuse an app token name. */
*,*::before,*::after{box-sizing:border-box}
:root{--doc-ink:#1b1b2b;--doc-soft:#5a5a72;--doc-line:#e4e2ef;--doc-bg:#fdfcff;
  --doc-brand:#6c5ce7;--doc-sun:#ffc730}
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
.top{border-block-end:1px solid var(--doc-line);background:#fff}
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
.facts li{border:1px solid var(--doc-line);background:#fff;border-radius:999px;
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
th{background:#fff;font-weight:600}
.grid{list-style:none;padding:0;margin:20px 0 0;display:grid;gap:12px;
  grid-template-columns:repeat(auto-fill,minmax(9.5rem,1fr))}
.grid a{display:flex;align-items:center;gap:10px;padding:12px 14px;background:#fff;
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
.stage .box{position:relative;border-radius:22px;overflow:hidden;
  background:#12142b;box-shadow:0 5px 0 var(--doc-line);
  height:min(74vh,620px);display:flex;flex-direction:column}
.stage.room .box{height:min(88vh,860px)}
#game-frame{flex:1;min-height:0;display:flex;flex-direction:column}
#game-poster{position:absolute;inset:0;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:18px;text-align:center;padding:24px;
  color:#fff;transition:opacity .25s ease}
#game-poster[hidden]{display:none}
#game-poster .em{font-size:64px;line-height:1}
#game-poster .msg{font-size:.95rem;opacity:.75;max-width:22ch}
.stage .noscript{position:absolute;inset-inline:0;bottom:0;padding:12px;
  background:rgba(0,0,0,.55);color:#fff;font-size:.85rem;text-align:center}
@media (max-width:719px){.stage .box{border-radius:0;box-shadow:none;
  border-block:1px solid var(--doc-line)}}
@media (max-width:480px){body{font-size:16px}h1{font-size:1.6rem}.play{width:100%}
  .stage .box{height:min(76vh,600px)}.stage.room .box{height:min(86vh,760px)}
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
  const alternates = opts.alternates ?? [];

  return (
    "<!doctype html>\n" +
    toHtml(html`<html lang="${locale}" dir="${dir}">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#6c5ce7" />
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
        <meta name="twitter:card" content="summary" />
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
