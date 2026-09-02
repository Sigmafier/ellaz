import type { Plugin } from "vite";
import { CONTENT } from "../content/index";
import { homeCopy } from "../content/site";
import { GAMES, metaFor } from "../portal/games";
import {
  APP_LOCALES,
  CANONICAL_LOCALE,
  DEFAULT_LOCALE,
  OG_LOCALE,
  PAGE_LOCALES,
  SCRIPT,
  dirOf,
  type PageLocale,
} from "../i18n/locales";
import { analyticsTag } from "./analytics";
import { consentBar } from "./consent";
import { artFiles } from "./artFiles";
import {
  LOCALES,
  ROUTES,
  canonicalUrl,
  gamePath,
  gamesIn,
  homePath,
  localesOf,
  type Route,
} from "./routes";
import { gamePage } from "./gamePage";
import { embedPage } from "./embedPage";
import {
  boardsPage,
  categoryPage,
  homePage,
  homeShellBody,
  notFoundPage,
  worldPage,
} from "./sitePages";
import { homeGraph } from "./schema";
import { jsonLd, toHtml } from "./html";
import { lastmodByPath } from "./lastmod";
import { OG_HEIGHT, OG_WIDTH, ogImagePath } from "./ogCard";
import { ensureOgCard, renderOgImages } from "./ogImages";
import { indexNowKeyFile, INDEXNOW_KEY, llmsTxt, robotsTxt, sitemapXml } from "./siteFiles";
import {
  DEV_HEAD_ASSETS,
  extractHeadAssets,
  resolveLazyChunks,
  type HeadAssets,
} from "./assets";

/**
 * The Vite plugin that turns the route table into real files.
 *
 * WHY A PLUGIN AND NOT AN npm SCRIPT
 * `npm run build` is the only command both deploy workflows run. A separate
 * `npm run pages` is a step somebody eventually forgets, and the failure is a
 * site that quietly stops gaining pages while every build stays green. Inside
 * `generateBundle` there is nothing to forget.
 *
 * `configureServer` installs the same renderer as dev middleware, so
 * `npm run dev` and production cannot disagree about what a page contains.
 */

/** True on the primary host, false on the GitHub Pages duplicate. */
function isPrimaryHost(base: string): boolean {
  return base === "/";
}

export function renderRoute(route: Route, base: string, headAssets?: HeadAssets): string {
  const indexable = route.indexable && isPrimaryHost(base);

  // The 404 is the one pure document left. It is served for URLs that do not
  // exist, where booting an app would be a download nobody asked for.
  if (route.kind === "notFound") return notFoundPage(base);
  // A home page IS the app, in every language. `/` is head-enhanced in place
  // (see `transformIndexHtml`); `/en/` and `/es/` are emitted here as the same
  // shape - the home page as markup, an empty `#root` beside it, and the app's
  // own head tags so they boot the identical bundle.
  if (route.kind === "home") {
    return homePage({ locale: route.locale, games: GAMES, base, indexable, headAssets });
  }
  if (route.kind === "world") {
    return worldPage({ locale: route.locale, games: GAMES, base, indexable, headAssets });
  }
  if (route.kind === "boards") {
    return boardsPage({ locale: route.locale, games: GAMES, base, indexable, headAssets });
  }
  // A category page is an ARTICLE about a group, not a screen in the app, so
  // it gets no `headAssets` and boots nothing. `gamesIn` rather than a filter
  // written here: the count in the copy, the ItemList in the JSON-LD and the
  // cards on the page must all come from one answer to "which games are in
  // this group", and that answer lives beside the route table that decided
  // the page was worth emitting at all.
  if (route.kind === "category") {
    return categoryPage({
      locale: route.locale,
      category: route.category!,
      games: gamesIn(route.category!),
      base,
      indexable,
    });
  }

  const meta = metaFor(route.id!);
  if (!meta) throw new Error(`page emitter: no game named "${route.id}" in portal/games.ts`);
  // The game alone, for a stranger's iframe. Emitted in the canonical locale
  // and no other - see `embedPath` - so it never reaches the content lookup
  // below, which is per page locale.
  if (route.kind === "embed") return embedPage({ meta, base, headAssets });
  const copy = CONTENT[meta.id]?.copy[route.locale];
  if (!copy) {
    throw new Error(
      `page emitter: no ${route.locale} content for "${meta.id}". ` +
        `Every catalogued game needs src/content/games/${meta.id}.ts - see content.test.ts.`,
    );
  }
  return gamePage({ meta, copy, locale: route.locale, all: GAMES, base, indexable, headAssets });
}

/**
 * The head tags injected into the APPLICATION's own `index.html`.
 *
 * `/` is the CANONICAL locale's home page - English since 2026-08-14 - and it is
 * also the app, so it is the one page the emitter appends to rather than writes.
 * It gets the title, the description, the canonical, the language alternates and
 * the `ItemList` of the whole roster, which is how a crawler landing on `/`
 * discovers the game pages.
 *
 * The `<title>` is NOT in this list, and that is not an oversight - it is the one
 * tag that already exists in the file, so it is REPLACED by `replaceTitle` below
 * rather than appended. Appending would emit two, and the browser keeps the first.
 */
const HOME_CANONICAL = ROUTES.find((r) => r.kind === "home" && r.locale === CANONICAL_LOCALE)!;

/**
 * The `<title>` for `/`.
 *
 * Read from the same `homeCopy` that `og:title` and the JSON-LD graph already
 * use, so the three cannot disagree. They did: until 2026-08-16 `/` shipped the
 * hardcoded `Ellaz — Games / משחקים` from index.html - a bilingual literal that
 * nothing owned - beside an English `og:title`, an English description and
 * `lang="en"`. It survived because no gate in this repo read a title at all.
 */
export function indexTitle(): string {
  return homeCopy(CANONICAL_LOCALE, GAMES.length).title;
}

export function indexHeadTags(base: string): string {
  const copy = homeCopy(CANONICAL_LOCALE, GAMES.length);
  const indexable = isPrimaryHost(base);
  const tags = [
    `<meta name="description" content="${escapeAttr(copy.description)}" />`,
    `<link rel="canonical" href="${canonicalUrl(homePath(CANONICAL_LOCALE))}" />`,
    // Derived from LOCALES rather than written out, because `/` must advertise
    // exactly the same sibling set every other page does. Two hand-written
    // lists of languages is how one page ends up claiming a Spanish sibling
    // that another page has never heard of.
    ...LOCALES.map(
      (l) => `<link rel="alternate" hreflang="${l}" href="${canonicalUrl(homePath(l))}" />`,
    ),
    // English. x-default answers "we have no page in your language", and since
    // 2026-08-14 that is also the canonical locale, so this line and the
    // canonical above now point at the same URL. Legal and correct - Google's
    // own examples do it - and the two constants stay separate because they
    // answer different questions and were different for months.
    `<link rel="alternate" hreflang="x-default" href="${canonicalUrl(homePath(DEFAULT_LOCALE))}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Ellaz" />`,
    `<meta property="og:locale" content="${OG_LOCALE[CANONICAL_LOCALE]}" />`,
    // Every OTHER language this page has a sibling in. Derived from LOCALES for
    // the same reason the hreflang cluster above is: one list, so `/` can never
    // advertise a language set the emitted pages have never heard of.
    ...LOCALES.filter((l) => l !== CANONICAL_LOCALE).map(
      (l) => `<meta property="og:locale:alternate" content="${OG_LOCALE[l]}" />`,
    ),
    `<meta property="og:title" content="${escapeAttr(copy.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(copy.description)}" />`,
    `<meta property="og:url" content="${canonicalUrl(homePath(CANONICAL_LOCALE))}" />`,
    // `/` is the app shell, so it never goes through `renderDocument` and has
    // to repeat the share-card tags here. The card itself is the same file the
    // route table names, so the two cannot drift apart.
    `<meta property="og:image" content="${canonicalUrl(ogImagePath(HOME_CANONICAL))}" />`,
    `<meta property="og:image:width" content="${OG_WIDTH}" />`,
    `<meta property="og:image:height" content="${OG_HEIGHT}" />`,
    `<meta property="og:image:alt" content="${escapeAttr(copy.title)}" />`,
    `<meta name="twitter:image" content="${canonicalUrl(ogImagePath(HOME_CANONICAL))}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    // Measurement. Empty string on any non-primary base, so the noindex GitHub
    // Pages mirror never reports - its traffic is not the product and counting
    // it would pollute the one measurement this project has. The reasoning for
    // the config, and what it deliberately gives up, is in `analytics.ts`.
    analyticsTag(base),
  ].filter(Boolean);
  if (!indexable) tags.push(`<meta name="robots" content="noindex, follow" />`);
  tags.push(
    `<script type="application/ld+json">${toHtml(jsonLd(homeGraph(CANONICAL_LOCALE, GAMES, copy)))}</script>`,
  );
  return tags.join("\n    ");
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

/**
 * Stamp the app shell's `<html>` with the canonical language and its direction.
 *
 * Exported so `build.test.ts` can drive it on the real `index.html` and on the
 * shapes that must throw. It matches the OPENING TAG ONLY - `[^>]*` cannot
 * cross a `>`, so a stray `<html` inside a comment further down the file is
 * unreachable and the replacement cannot run away with the document.
 *
 * It THROWS rather than returning the input unchanged, because the failure it
 * is guarding against is silent by nature: a no-op leaves a perfectly valid
 * document carrying the previous language, which is the exact defect. A build
 * that stops is recoverable in a minute; a page that ranks in the wrong
 * language is not noticed for weeks.
 */
export function replaceHtmlLangDir(html: string, locale: PageLocale): string {
  const open = /<html\b[^>]*>/i;
  if (!open.test(html)) {
    throw new Error(
      "page emitter: index.html has no <html> opening tag to stamp lang/dir on. " +
        "The shell's shape changed - update replaceHtmlLangDir and build.test.ts together.",
    );
  }
  return html.replace(open, `<html lang="${locale}" dir="${dirOf(locale)}">`);
}

/**
 * Replace the app shell's `<title>` with the canonical locale's own.
 *
 * The exact sibling of `replaceHtmlLangDir` above, for the exact same reason and
 * with the same throw. index.html cannot import anything, so its title was a
 * literal only a person could keep in step with CANONICAL_LOCALE - and when the
 * root changed language on 2026-08-14 it kept the old one. What it kept was
 * worse than stale: `Ellaz — Games / משחקים`, a bilingual string belonging to
 * neither language, on the site's canonical entry and `x-default` target, while
 * `og:title`, the description and the JSON-LD graph beside it were all English.
 *
 * REPLACED rather than appended. A second `<title>` is not an error in HTML -
 * the browser takes the first and ignores the rest - so appending would emit the
 * correct title into a document that goes on showing the wrong one.
 *
 * The match is non-greedy and cannot cross a `<`, so it takes the first title
 * element and can never swallow the document hunting a second `</title>`.
 */
export function replaceTitle(html: string, title: string): string {
  const tag = /<title>[^<]*<\/title>/gi;
  const found = html.match(tag) ?? [];
  if (found.length === 0) {
    throw new Error(
      "page emitter: index.html has no <title> to replace. The shell's shape changed - " +
        "update replaceTitle and build.test.ts together. A missing title is not something " +
        "to paper over: `/` is the canonical entry and x-default target for the whole site.",
    );
  }
  // Two is not a shrug. HTML says the FIRST title wins, so a document carrying
  // two has already decided which one is real - and it is not necessarily the
  // one this function is about to write. Refuse rather than pick.
  if (found.length > 1) {
    throw new Error(
      `page emitter: index.html has ${found.length} <title> elements (${found.join(", ")}). ` +
        "The browser keeps the first, so rewriting one of them is not enough to decide what " +
        "the page is called. Remove the extra before this can be correct.",
    );
  }
  // A REPLACER FUNCTION, never a replacement string. `String.replace` expands
  // `$&`, `` $` ``, `$'` and `$1` inside a replacement STRING, and this one
  // carries authored copy in three languages - a title containing `$` would be
  // silently rewritten into something nobody wrote. A function's return value
  // is used verbatim.
  return html.replace(tag, () => `<title>${escapeHtmlText(title)}</title>`);
}

/**
 * Text escaping for `<title>`, which is `#PCDATA` - it has no attributes and no
 * child elements, so `&`, `<` and `>` are the whole surface. `escapeAttr` above
 * is the wrong tool: it escapes `"`, which inside a title is a literal quote a
 * copywriter may legitimately want, and it leaves `>` alone.
 */
function escapeHtmlText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export interface EmittedFile {
  fileName: string;
  source: string;
}

/** Everything this plugin writes, as data. Pure, so the gate's tests can read it. */
export function allEmittedFiles(
  base: string,
  headAssets?: HeadAssets,
  lastmods?: ReadonlyMap<string, string>,
): EmittedFile[] {
  const files: EmittedFile[] = ROUTES.filter((r) => r.emit).map((r) => ({
    fileName: r.file,
    source: renderRoute(r, base, headAssets),
  }));

  // The art, one SVG per game. Here rather than beside the share cards because
  // it is pure, synchronous and string-only, which is the property that lets
  // the gate's tests read this function without a rasteriser.
  files.push(...artFiles());

  files.push({ fileName: "robots.txt", source: robotsTxt(base) });
  files.push({ fileName: "llms.txt", source: llmsTxt(GAMES) });
  // The sitemap advertises ellaz.fun URLs, so it belongs only to the host that
  // serves them. Emitting it from the Pages duplicate would invite a crawler to
  // index the primary site from a copy that says noindex.
  if (isPrimaryHost(base)) {
    files.push({ fileName: "sitemap.xml", source: sitemapXml(lastmods) });
    files.push({ fileName: `${INDEXNOW_KEY}.txt`, source: indexNowKeyFile() });
  }

  // The route table's own manifest, written on every build. "Which pages exist"
  // is then a question answered from the artifact rather than by inference.
  //
  // It also carries the two locale lists, and that is not padding. The gates in
  // `scripts/` are .mjs and cannot import a .ts module, so without this they
  // would each need their OWN copy of "which languages have pages" - a second
  // list, in a second language, that drifts from this one silently and reports
  // green while it drifts. Publishing the lists into the artifact keeps one
  // source of truth and lets the gate read it the same way it reads everything
  // else here: off the thing that was actually built.
  files.push({
    fileName: "pages.json",
    source:
      JSON.stringify(
        {
          base,
          count: files.filter((f) => f.fileName.endsWith(".html")).length,
          locales: {
            app: APP_LOCALES,
            page: PAGE_LOCALES,
            canonical: CANONICAL_LOCALE,
            xDefault: DEFAULT_LOCALE,
            dir: Object.fromEntries(APP_LOCALES.map((l) => [l, dirOf(l)])),
            script: SCRIPT,
          },
          pages: ROUTES.map((r) => ({
            path: r.path,
            file: r.file,
            locale: r.locale,
            kind: r.kind,
            // Present so a gate can group a page's rows BY GAME without
            // re-deriving the id from the path. A derived key is the trap that
            // put `kids` in 16 category pages' sitemap rows: correct until the
            // deriving fields stop discriminating, and then `undefined ===
            // undefined` matches everything. Absent on a route with no id,
            // which is the honest value and the one a gate must key off.
            id: r.id,
            emitted: r.emit,
            // Resolved, so the gate holds the document to what the route
            // table decided rather than re-deriving it: the embed page's
            // canonical is its GAME page, and `r.path` would say otherwise.
            canonical: canonicalUrl(r.canonicalPath ?? r.path),
            // The route's OWN locale set, always present. `[]` on the 404 and
            // on every embed page; the full page list everywhere else. Gate 5
            // in `assert-pages.mjs` demands exactly this set of a page's
            // hreflang cluster, so a page with no twins is a declared shape
            // and not a `kind !==` somebody has to keep in a script.
            locales: localesOf(r),
            // Published so the sitemap bijection reads the same flag the
            // sitemap was built from, not a kind list of its own.
            indexable: r.indexable,
          })),
        },
        null,
        2,
      ) + "\n",
  });

  return files;
}

export function pagesPlugin(base: string): Plugin {
  return {
    name: "ellaz:pages",
    // After VitePWA, so its own head injections are already in place when the
    // home page's tags go in.
    enforce: "post",
    apply: () => true,

    async transformIndexHtml(html, ctx) {
      // ONLY the app's own index.html. In dev the 78 emitted pages are handed
      // to this very pipeline on purpose - they need `@vitejs/plugin-react`'s
      // refresh preamble or nothing boots (see `configureServer` below, and
      // `dev-pages-must-go-through-vites-html-pipeline.md`) - so this hook is
      // called with documents that are NOT the shell and have no `#root`. The
      // marker guard then fired on every one of them: measured 2026-08-12,
      // every game page, the room and the boards answered 500 in dev while
      // production was perfectly correct, because at build time this hook is
      // called exactly once and only for index.html.
      //
      // `/index.html` is the path in BOTH environments - measured, not assumed:
      // dev normalises `/` to it, and the build reports it under either base.
      if (ctx.path !== "/index.html") return html;
      // `lang` and `dir` DERIVED, never trusted from the file.
      //
      // index.html cannot import anything, so its two attributes were a
      // literal that only a person could keep in step with CANONICAL_LOCALE -
      // and the day the root changed language they would have kept claiming
      // the old one. That is a document whose prose is English and whose
      // `lang` says Hebrew: it renders perfectly, ranks in the wrong language,
      // and reverses the layout of a page nobody thought to look at. The same
      // class of drift as the theme-color literal beside them, which needed
      // its own test for exactly this reason.
      //
      // Rewritten rather than asserted, so there is one owner instead of two
      // that agree. The throw covers the only way this can silently no-op.
      // THIS PAGE'S SHARE CARD FIRST, and ONLY this page's.
      //
      // `indexHeadTags` below writes the shell's own `og:image`, and a card's
      // name carries the hash of its own bytes - so the bytes have to exist
      // before the tag can name them. This hook runs before `generateBundle`,
      // so it is the earlier of the two that must ask.
      //
      // ONE card rather than all 184: `ensureOgCard` is memoized per route, so
      // `generateBundle` reuses this one and pays for the rest. The whole set
      // here would put the rasteriser inside every unit test that reads a
      // `<title>` off this hook.
      //
      // Without this line `/` shipped an `og:image` pointing at `-unhashed`, a
      // name no card is written under - on the site's canonical entry and its
      // `x-default` target, which is exactly where this repo's blind spots keep
      // landing. `assert-pages.mjs` refuses it, which is how it was caught.
      await ensureOgCard(HOME_CANONICAL);

      const withLang = replaceHtmlLangDir(html, CANONICAL_LOCALE);
      // The title is REPLACED, not appended - see `replaceTitle`. It rides here
      // beside the lang/dir stamp because they are the same defect class: the
      // two head literals index.html carries that nothing else can own.
      const withTitle = replaceTitle(withLang, indexTitle());
      const withHead = withTitle.replace("</head>", `  ${indexHeadTags(base)}\n  </head>`);
      // The canonical language's home, as a document, ahead of the app's mount
      // point.
      //
      // SIBLING, never a child. A node React does not know about, inside a tree
      // it reconciles, is the nested-root teardown crash in a different costume -
      // and `#game-poster` has been sitting beside `#game-frame` for exactly
      // this reason on 44 pages. `build.test.ts` pins the arrangement.
      //
      // The runtime REMOVES it once the app mounts, so this is what a crawler
      // and a no-JavaScript visitor get, not a second permanent copy of the
      // home screen.
      const marker = '<div id="root"></div>';
      if (!withHead.includes(marker)) {
        throw new Error(
          `page emitter: index.html has no ${marker} to place the home document before. ` +
            "The app's mount point moved - update this marker and build.test.ts together.",
        );
      }
      // The consent bar rides along with the home document rather than being a
      // second injection: `index.html` is the one page not written from the
      // route table, and every gate here has been blind to it at least once
      // (the 29-byte body, the title, the hreflang cluster). One insertion
      // point is one thing to remember.
      return withHead.replace(
        marker,
        `${homeShellBody(CANONICAL_LOCALE, GAMES, base)}\n    ${((b) => (b === "" ? "" : toHtml(b)))(consentBar(base, CANONICAL_LOCALE))}\n    ${marker}`,
      );
    },

    async generateBundle(_options, bundle) {
      // The app's head tags, lifted off the index.html Vite just wrote. Reading
      // them from the bundle rather than reconstructing them is what stops the
      // pages and the app ever loading different code: the names carry a
      // content hash, and anything that guesses at it is a second, wrong
      // implementation of Rollup's naming.
      const index = bundle["index.html"];
      if (!index || index.type !== "asset") {
        throw new Error(
          "page emitter: index.html is not in the bundle. This plugin must run AFTER " +
            "Vite's html plugin - check that it is registered with enforce: \"post\".",
        );
      }
      // The lazy half, from the same place and for the same reason. A game page
      // knows which single game it is for, so it can say so in its head instead
      // of discovering it two round trips later. `Object.keys(bundle)` is the
      // only honest source for these names - they carry a content hash, and the
      // one under `/ellaz/` is a different string from the one under `/`.
      const headAssets: HeadAssets = {
        ...extractHeadAssets(String(index.source)),
        lazy: resolveLazyChunks(Object.keys(bundle), GAMES.map((m) => m.id)),
      };
      // THE SHARE CARDS ARE RENDERED FIRST, AND THAT ORDER IS LOAD-BEARING.
      //
      // Each card is written under a name carrying the hash of its own bytes,
      // so the bytes must exist before any page can reference one. `renderOgImages`
      // publishes every hash to `ogImageFile`; `allEmittedFiles` below then reads
      // them while building the head tags, the JSON-LD and the sitemap.
      //
      // Swap these two lines and every page references `-unhashed`, which is a
      // name no card is written under - so the build does not silently ship 184
      // broken previews, `assert-pages.mjs` reds naming the page. That refusal
      // is the whole reason the fallback is a marker rather than the bare name.
      //
      // They are still emitted separately from `allEmittedFiles`, because they
      // are BINARY and ASYNC and that function is pure, synchronous and
      // string-only so the gate's tests can read it without a rasteriser.
      const cards = await renderOgImages();

      // Git is consulted once per build, here, rather than inside the pure
      // `allEmittedFiles` - which the gate's tests call, and which must stay
      // free of side effects and of a dependency on repository history.
      const files = allEmittedFiles(base, headAssets, lastmodByPath());

      // A page count that silently drops to zero is the shape every gate in this
      // repo exists to catch, so the emitter refuses to produce one.
      const expected = ROUTES.filter((r) => r.emit).length;
      const html = files.filter((f) => f.fileName.endsWith(".html"));
      if (html.length !== expected) {
        throw new Error(
          `page emitter: rendered ${html.length} pages, route table declares ${expected}.`,
        );
      }

      for (const f of files) {
        this.emitFile({ type: "asset", fileName: f.fileName, source: f.source });
      }

      for (const { fileName, png } of cards) {
        this.emitFile({ type: "asset", fileName, source: png });
      }
    },

    configureServer(server) {
      // Registered directly (not deferred), so these paths are answered before
      // Vite's SPA fallback hands every unknown URL the app shell. Anything not
      // in the route table falls through untouched, which is how `/` stays the
      // application in dev exactly as in production.
      const byPath = new Map(ROUTES.filter((r) => r.emit).map((r) => [r.path, r]));
      const extras = new Map<string, [string, string]>([
        ["/robots.txt", ["text/plain; charset=utf-8", robotsTxt(base)]],
        ["/llms.txt", ["text/plain; charset=utf-8", llmsTxt(GAMES)]],
        ["/sitemap.xml", ["application/xml; charset=utf-8", sitemapXml()]],
        // Without these the page image is a broken icon in DEV only - the one
        // environment where anybody looks at the page while writing it.
        ...artFiles().map(
          (f) =>
            [`/${f.fileName}`, ["image/svg+xml; charset=utf-8", f.source]] as [
              string,
              [string, string],
            ],
        ),
      ]);

      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? "/").split("?")[0];
        const path = url.startsWith(base) ? `/${url.slice(base.length)}` : url;

        const extra = extras.get(path);
        if (extra) {
          res.setHeader("Content-Type", extra[0]);
          res.end(extra[1]);
          return;
        }

        const route = byPath.get(path) ?? byPath.get(`${path}/`);
        if (!route) return next();

        // Through Vite's OWN html pipeline, which is not optional and is not
        // about HMR. `@vitejs/plugin-react` injects a react-refresh PREAMBLE
        // into every html it transforms, and its generated modules assert that
        // preamble is present - so a page served straight out of this renderer
        // throws "can't detect preamble" on the first component it evaluates
        // and NOTHING boots. In dev only, and only on these pages, so `/` looked
        // perfect while every game, the room and the boards sat on their
        // no-JavaScript poster. Production is unaffected: there is no preamble
        // in a built bundle, which is exactly why this hid for so long.
        //
        // Calling the pipeline rather than pasting the preamble in is the point
        // - the preamble is a plugin's private detail and a copy of it here
        // would be a second implementation to keep in step.
        void server
          .transformIndexHtml(req.originalUrl ?? url, renderRoute(route, base, DEV_HEAD_ASSETS))
          .then((html) => {
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.end(html);
          }, next);
      });
    },
  };
}

export { gamePath, ROUTES };
