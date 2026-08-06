import type { Plugin } from "vite";
import { CONTENT } from "../content/index";
import { SITE } from "../content/site";
import { GAMES, metaFor } from "../portal/games";
import { ROUTES, canonicalUrl, gamePath, homePath, type Route } from "./routes";
import { gamePage } from "./gamePage";
import { boardsPage, homePage, notFoundPage, worldPage } from "./sitePages";
import { homeGraph } from "./schema";
import { jsonLd, toHtml } from "./html";
import { llmsTxt, robotsTxt, sitemapXml } from "./siteFiles";
import { DEV_HEAD_ASSETS, extractHeadAssets, type HeadAssets } from "./assets";

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

  // The 404 and the English home index are pure documents. They carry no
  // runtime because there is nothing on them to run - and the 404 in
  // particular is served for URLs that do not exist, where booting an app
  // would be a download nobody asked for.
  if (route.kind === "notFound") return notFoundPage(base);
  if (route.kind === "home") {
    return homePage({ locale: route.locale, games: GAMES, base, indexable });
  }
  if (route.kind === "world") {
    return worldPage({ locale: route.locale, games: GAMES, base, indexable, headAssets });
  }
  if (route.kind === "boards") {
    return boardsPage({ locale: route.locale, games: GAMES, base, indexable, headAssets });
  }

  const meta = metaFor(route.id!);
  if (!meta) throw new Error(`page emitter: no game named "${route.id}" in portal/games.ts`);
  const copy = CONTENT[meta.id]?.[route.locale];
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
 * `/` is the Hebrew home page and it is also the app, so it is the one page the
 * emitter must not overwrite. It gets the description, the canonical, the
 * language alternates and the `ItemList` of all 21 games instead - which is how
 * a crawler that lands on `/` discovers the game pages, since the home grid's
 * cards are still buttons until Phase 5 turns them into links.
 */
export function indexHeadTags(base: string): string {
  const copy = SITE.he.homePage;
  const indexable = isPrimaryHost(base);
  const tags = [
    `<meta name="description" content="${escapeAttr(copy.description)}" />`,
    `<link rel="canonical" href="${canonicalUrl(homePath("he"))}" />`,
    `<link rel="alternate" hreflang="he" href="${canonicalUrl(homePath("he"))}" />`,
    `<link rel="alternate" hreflang="en" href="${canonicalUrl(homePath("en"))}" />`,
    `<link rel="alternate" hreflang="x-default" href="${canonicalUrl(homePath("he"))}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Ellaz" />`,
    `<meta property="og:locale" content="he_IL" />`,
    `<meta property="og:title" content="${escapeAttr(copy.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(copy.description)}" />`,
    `<meta property="og:url" content="${canonicalUrl(homePath("he"))}" />`,
    `<meta name="twitter:card" content="summary" />`,
  ];
  if (!indexable) tags.push(`<meta name="robots" content="noindex, follow" />`);
  tags.push(
    `<script type="application/ld+json">${toHtml(jsonLd(homeGraph("he", GAMES, copy)))}</script>`,
  );
  return tags.join("\n    ");
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

export interface EmittedFile {
  fileName: string;
  source: string;
}

/** Everything this plugin writes, as data. Pure, so the gate's tests can read it. */
export function allEmittedFiles(base: string, headAssets?: HeadAssets): EmittedFile[] {
  const files: EmittedFile[] = ROUTES.filter((r) => r.emit).map((r) => ({
    fileName: r.file,
    source: renderRoute(r, base, headAssets),
  }));

  files.push({ fileName: "robots.txt", source: robotsTxt(base) });
  files.push({ fileName: "llms.txt", source: llmsTxt(GAMES) });
  // The sitemap advertises ellaz.fun URLs, so it belongs only to the host that
  // serves them. Emitting it from the Pages duplicate would invite a crawler to
  // index the primary site from a copy that says noindex.
  if (isPrimaryHost(base)) files.push({ fileName: "sitemap.xml", source: sitemapXml() });

  // The route table's own manifest, written on every build. "Which pages exist"
  // is then a question answered from the artifact rather than by inference.
  files.push({
    fileName: "pages.json",
    source:
      JSON.stringify(
        {
          base,
          count: files.filter((f) => f.fileName.endsWith(".html")).length,
          pages: ROUTES.map((r) => ({
            path: r.path,
            file: r.file,
            locale: r.locale,
            kind: r.kind,
            emitted: r.emit,
            canonical: canonicalUrl(r.path),
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

    transformIndexHtml(html) {
      return html.replace("</head>", `  ${indexHeadTags(base)}\n  </head>`);
    },

    generateBundle(_options, bundle) {
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
      const headAssets = extractHeadAssets(String(index.source));
      const files = allEmittedFiles(base, headAssets);

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
