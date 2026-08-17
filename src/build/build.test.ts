import { readFileSync } from "node:fs";
import { gameName } from "./gameName";
import { describe, it, expect } from "vitest";
import { CONTENT } from "../content/index";
import { SITE } from "../content/site";
import { GAMES } from "../portal/games";
import { CATALOG } from "../portal/catalog";
import { escapeHtml, html, jsonLd, raw, toHtml } from "./html";
import { CANONICAL_LOCALE, DEFAULT_LOCALE, ENGLISH_NAME, dirOf } from "../i18n/locales";
import { LOCALES, ROUTES, canonicalUrl, gamePath, homePath, href } from "./routes";
import {
  allEmittedFiles,
  indexHeadTags,
  indexTitle,
  pagesPlugin,
  renderRoute,
  replaceHtmlLangDir,
  replaceTitle,
} from "./pages";
import { headingFor, relatedTo } from "./gamePage";
import { llmsTxt, robotsTxt, sitemapXml } from "./siteFiles";
import { DEV_HEAD_ASSETS, chunkNameFor, resolveLazyChunks, type HeadAssets } from "./assets";
import { DOCUMENT_CSS } from "./layout";

/**
 * `src/build/**` is pure string functions with no filesystem and no Vite, which
 * is what lets it be tested here rather than only through a build. The gate in
 * `scripts/assert-pages.mjs` checks the ARTIFACT; this checks the generator.
 */

const BASES = ["/", "/ellaz/"];

describe("the escaper", () => {
  it("escapes what would otherwise close a tag or an attribute", () => {
    expect(escapeHtml(`a & b < c > d " e ' f`)).toBe(
      "a &amp; b &lt; c &gt; d &quot; e &#39; f",
    );
  });

  it("escapes interpolations but not the template itself", () => {
    expect(toHtml(html`<p>${"<script>"}</p>`)).toBe("<p>&lt;script&gt;</p>");
  });

  it("lets raw() through, and only raw()", () => {
    expect(toHtml(html`${raw("<b>x</b>")}${"<b>y</b>"}`)).toBe("<b>x</b>&lt;b&gt;y&lt;/b&gt;");
  });

  it("joins arrays and drops nullish", () => {
    expect(toHtml(html`${[1, 2, 3]}${null}${undefined}${false}`)).toBe("123");
  });

  it("neutralises a </script> inside JSON-LD without corrupting the data", () => {
    // HTML-escaping is not available inside a JSON payload - `&lt;` would land
    // in the string as literal text - so the escape has to be a JSON one.
    const out = toHtml(jsonLd({ name: "a </script> b" }));
    expect(out).not.toContain("</script>");
    expect(JSON.parse(out).name).toBe("a </script> b");
  });
});

describe("the route table", () => {
  it("covers every game in every language that has pages", () => {
    // Counted off LOCALES rather than a literal 2. The literal was correct
    // for he/en and is the same defect as every other two-language constant
    // in this lane: promoting Spanish reds a test that is measuring nothing
    // wrong. LOCALES derives from PAGE_LOCALES, so this cannot drift again.
    const games = ROUTES.filter((r) => r.kind === "game");
    expect(games).toHaveLength(GAMES.length * LOCALES.length);
    for (const meta of GAMES) {
      for (const locale of LOCALES) {
        expect(games.some((r) => r.id === meta.id && r.locale === locale)).toBe(true);
      }
    }
  });

  it("uses the game's own id as the slug, not its directory name", () => {
    // The trap: src/games/n2048/ has meta.id "2048". A hand-written
    // /games/n2048/ is a 404 nothing else would catch.
    // The canonical language, so the assertion stays about the SLUG rather
    // than about which language holds the bare URL.
    expect(gamePath("2048", CANONICAL_LOCALE)).toBe("/games/2048/");
    expect(ROUTES.some((r) => r.path.includes("n2048"))).toBe(false);
  });

  it("has one file per path, and no duplicates", () => {
    const files = ROUTES.map((r) => r.file);
    expect(new Set(files).size).toBe(files.length);
    const paths = ROUTES.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("does not emit over the application", () => {
    // `/` is the app shell. The emitter enhances its head; overwriting it with
    // a document would delete the app.
    const home = ROUTES.find((r) => r.kind === "home" && r.locale === CANONICAL_LOCALE)!;
    expect(home.file).toBe("index.html");
    expect(home.emit).toBe(false);
    // And exactly one home is exempt. Two would mean two routes claiming
    // `index.html`, which the duplicate-file check above would catch - but
    // ZERO would mean the emitter writes a document over the application, and
    // nothing else here is looking for that.
    expect(ROUTES.filter((r) => r.kind === "home" && !r.emit)).toHaveLength(1);
  });

  it("keeps the canonical free of the base on every host", () => {
    for (const r of ROUTES) {
      expect(canonicalUrl(r.path)).toBe(`https://ellaz.fun${r.path}`);
      expect(canonicalUrl(r.path)).not.toContain("/ellaz/");
    }
  });

  it("puts the base on every internal href", () => {
    expect(href("/games/2048/", "/ellaz/")).toBe("/ellaz/games/2048/");
    expect(href("/", "/ellaz/")).toBe("/ellaz/");
  });
});

describe("the roster the emitter reads", () => {
  it("is the same roster the app plays, in the same order", () => {
    // Two consumers, one list. If these drift, a page exists for a game the
    // home grid cannot open, or the reverse.
    expect(CATALOG.map((e) => e.meta.id)).toEqual(GAMES.map((m) => m.id));
  });

  it("gives every game a loader", () => {
    for (const e of CATALOG) expect(typeof e.load, `no loader for ${e.meta.id}`).toBe("function");
  });
});

describe("related games", () => {
  it("never lists the game itself, and prefers its own category", () => {
    for (const meta of GAMES) {
      const related = relatedTo(meta, GAMES);
      expect(related.some((m) => m.id === meta.id)).toBe(false);
      expect(related.length).toBe(6);
      const sameCategory = GAMES.filter(
        (m) => m.id !== meta.id && m.category === meta.category,
      ).length;
      const got = related.filter((m) => m.category === meta.category).length;
      expect(got).toBe(Math.min(6, sameCategory));
    }
  });
});

describe("every page renders", () => {
  /**
   * The emitted app shells, by filename, off the route table itself.
   *
   * NOT `fileName.split("/").length === 2`, which was the first version and
   * matched `world/index.html` as well - a predicate that is right about `en/`
   * and `es/` and wrong about the two pages that sit beside them. Asking the
   * route table which pages are homes cannot be wrong about it.
   */
  const HOME_FILES = new Set(ROUTES.filter((r) => r.kind === "home" && r.emit).map((r) => r.file));

  it.each(BASES)("base %s: all 48 documents, and none of them empty", (base) => {
    const files = allEmittedFiles(base);
    const pages = files.filter((f) => f.fileName.endsWith(".html"));
    expect(pages).toHaveLength(ROUTES.filter((r) => r.emit).length);
    for (const f of pages) {
      expect(f.source.startsWith("<!doctype html>"), f.fileName).toBe(true);
      expect(f.source.length, f.fileName).toBeGreaterThan(2000);
    }
  });

  it.each(BASES)("base %s: only a home page carries #root", (base) => {
    // #root is the app SHELL's mount point. On a content page it would boot the
    // full-viewport application straight over the prose. On a HOME page it is
    // the whole point: every home page is the app, so `/en/` and `/es/` carry
    // it exactly the way `/` does.
    let shells = 0;
    for (const f of allEmittedFiles(base).filter((x) => x.fileName.endsWith(".html"))) {
      const isHome = HOME_FILES.has(f.fileName);
      expect(f.source.includes('id="root"'), f.fileName).toBe(isHome);
      if (isHome) shells += 1;
    }
    // A count, not just a per-file assertion: `isHome` matching nothing would
    // turn the line above into "no page carries #root" and pass in silence.
    expect(shells, "one emitted shell per non-canonical page locale").toBe(LOCALES.length - 1);
  });

  it("gives the runtime only the two elements it is allowed to own", () => {
    const assets = {
      tags: ['<script type="module" src="/assets/index-abc.js"></script>'],
      scripts: ['<script type="module" src="/assets/index-abc.js"></script>'],
    };
    for (const f of allEmittedFiles("/", assets).filter((x) => x.fileName.endsWith(".html"))) {
      const shell = HOME_FILES.has(f.fileName);
      const boots =
        shell ||
        /(^|\/)games\//.test(f.fileName) ||
        f.fileName.includes("world/") ||
        f.fileName.includes("boards/");
      expect(f.source.includes("/assets/index-abc.js"), f.fileName).toBe(boots);
      if (!boots) continue;
      if (shell) {
        // A home page is the app shell, not a content page: it mounts the grid
        // into #root over its own emitted document and owns no game host.
        expect(f.source, f.fileName).toContain('<div id="root"></div>');
        expect(f.source, f.fileName).toContain('id="home-doc"');
        expect(f.source.indexOf('id="home-doc"')).toBeLessThan(f.source.indexOf('id="root"'));
        expect(f.source, f.fileName).toMatch(/<body[^>]*class="app-shell"/);
        expect(f.source, f.fileName).not.toContain('id="game-frame"');
        continue;
      }
      // The frame is emitted EMPTY. Markup inside it would be a node React does
      // not know about, inside a tree it reconciles.
      expect(f.source, f.fileName).toContain('<div id="game-frame"></div>');
      expect(f.source, f.fileName).toContain('id="game-poster"');
      expect(f.source, f.fileName).toMatch(/<body[^>]+data-page="(game|world|boards)"/);
    }
  });

  it("stamps its own language on every emitted shell", () => {
    // `data-locale` is the ONLY thing that tells the runtime an app shell has a
    // language of its own - `readPageContext` deliberately ignores
    // `documentElement.lang` on the app branch, because `index.html` has said
    // `lang="he"` since before any of this and reading it would pin `/` to
    // Hebrew over every player's stored choice. So without this attribute
    // `/en/` opens in whatever they last picked: the Hebrew home under an
    // English URL, with correct English prose underneath it for one frame.
    let seen = 0;
    for (const base of BASES) {
      for (const f of allEmittedFiles(base)) {
        if (!HOME_FILES.has(f.fileName)) continue;
        const locale = ROUTES.find((r) => r.file === f.fileName)!.locale;
        expect(f.source, f.fileName).toContain(`data-locale="${locale}"`);
        expect(f.source, f.fileName).toContain(`<html lang="${locale}"`);
        seen += 1;
      }
    }
    expect(seen).toBe(BASES.length * (LOCALES.length - 1));
  });

  it("writes each shell's home in its OWN language", () => {
    // `homeShellBody` was hardcoded to Hebrew for as long as it only served
    // `/`. Handed a locale it now serves all three, and the failure mode of
    // getting that wrong is a page that renders, links correctly, clears every
    // word floor, and is in the wrong language.
    for (const locale of LOCALES) {
      const route = ROUTES.find((r) => r.kind === "home" && r.locale === locale && r.emit);
      if (!route) continue;
      const out = renderRoute(route, "/");
      expect(out, locale).toContain(href(gamePath(GAMES[0].id, locale), "/"));
      expect(out, locale).toContain(SITE[locale].worldPage.h1);
      for (const other of LOCALES.filter((l) => l !== locale)) {
        expect(out, `${locale} should not carry ${other} home copy`).not.toContain(
          SITE[other].worldPage.h1,
        );
      }
    }
  });

  it("stamps the game id and the language on the body, for the runtime to read", () => {
    const route = ROUTES.find((r) => r.kind === "game" && r.id === "2048" && r.locale === "en")!;
    const page = renderRoute(route, "/ellaz/");
    // Read from the DOCUMENT, never re-derived from a pathname - the site ships
    // under two bases and a runtime that parses the URL is wrong on one host.
    expect(page).toContain('data-page="game"');
    expect(page).toContain('data-game="2048"');
    expect(page).toContain('data-locale="en"');
  });

  it("marks the Pages duplicate noindex and the primary host indexable", () => {
    const onPages = allEmittedFiles("/ellaz/").filter((f) => f.fileName.endsWith(".html"));
    for (const f of onPages) expect(f.source, f.fileName).toContain('content="noindex');

    const onPrimary = allEmittedFiles("/").filter(
      (f) => f.fileName.endsWith(".html") && f.fileName !== "404.html",
    );
    for (const f of onPrimary) expect(f.source, f.fileName).not.toContain('content="noindex');
  });

  it("emits a sitemap only from the host whose URLs it advertises", () => {
    expect(allEmittedFiles("/").some((f) => f.fileName === "sitemap.xml")).toBe(true);
    expect(allEmittedFiles("/ellaz/").some((f) => f.fileName === "sitemap.xml")).toBe(false);
  });

  it("puts every word of the content file on the page", () => {
    const meta = GAMES.find((m) => m.id === "memory")!;
    const route = ROUTES.find((r) => r.kind === "game" && r.id === "memory" && r.locale === "he")!;
    const page = renderRoute(route, "/");
    const copy = CONTENT.memory.copy.he;
    for (const paragraph of copy.body) {
      expect(page).toContain(escapeHtml(paragraph));
    }
    for (const f of copy.faq) expect(page).toContain(escapeHtml(f.q));
    expect(page).toContain(escapeHtml(copy.lede));
    expect(page).toContain(headingFor(meta, "he"));
  });

  // Every emitted document offers every OTHER language, and links to itself in
  // that language rather than to that language's home page.
  //
  // This exists because the 404 lost its language link during the Phase 1.3
  // generalisation and nothing noticed: 1802 tests green, `tsc` clean, the page
  // rendering perfectly with an empty gap where the link had been. It was found
  // by diffing two real builds, which is not something anyone does twice. The
  // 404 is the interesting one - it is the only document with no per-language
  // twin, so it is the only one that takes the fallback path.
  it("every emitted document offers the other languages, pointing at itself", () => {
    const others = LOCALES.length - 1;
    const offenders: string[] = [];
    for (const f of allEmittedFiles("/").filter((x) => x.fileName.endsWith(".html"))) {
      // The footer on a document; `#home-doc` on an app shell, which has no
      // emitted footer because the app draws its own. Same links, same rule -
      // they just belong to the page's content rather than to its chrome.
      const block = HOME_FILES.has(f.fileName)
        ? (f.source.match(/<div id="home-doc">[\s\S]*?<\/div>\s*<div id="root"/)?.[0] ?? "")
        : (f.source.match(/<footer>[\s\S]*?<\/footer>/)?.[0] ?? "");
      const links = [...block.matchAll(/<a href="([^"]+)"[^>]*hreflang="([^"]+)"/g)];
      if (links.length !== others) {
        offenders.push(`${f.fileName}: ${links.length} language links, want ${others}`);
        continue;
      }
      const route = ROUTES.find((r) => r.file === f.fileName);
      for (const [, target, lang] of links) {
        if (lang === route?.locale) offenders.push(`${f.fileName}: links to its own language`);
        // The 404 is the sanctioned exception: one document for the whole
        // site, so the only honest target is that language's home.
        const sibling = ROUTES.find(
          (r) => r.kind === route?.kind && r.id === route?.id && r.locale === lang,
        );
        const want = sibling ? sibling.path : homePath(lang as (typeof LOCALES)[number]);
        if (target !== want) offenders.push(`${f.fileName}: ${lang} -> ${target}, want ${want}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  // The positive control for the `gameHeading` exemption in content.test.ts.
  // That test allows a `{title}` token in SITE because something fills it;
  // this is the something. Without an assertion here, the exemption is a
  // promise rather than a fact, and an H1 reading "משחק {title}" would ship
  // green - it is the page's only H1 and its most quoted line.
  it.each(LOCALES)("the %s H1 fills its token and names the game", (locale) => {
    for (const meta of GAMES) {
      const h1 = headingFor(meta, locale);
      expect(h1, `${meta.id}: H1 still carries a raw token`).not.toMatch(/[{}]/);
      expect(h1, `${meta.id}: H1 does not contain the game's own name`).toContain(
        gameName(meta.id, locale),
      );
    }
  });

  it("states the platform facts from one place, never from a content file", () => {
    const page = renderRoute(ROUTES.find((r) => r.kind === "game" && r.locale === "he")!, "/");
    for (const fact of SITE.he.facts) expect(page).toContain(escapeHtml(fact));
  });
});

describe("the lazy chunks a page preloads", () => {
  /**
   * A game page used to load in three SERIAL stages: the entry, then `page-*`
   * (a dynamic import the entry has to execute first), then `game-<id>-*` (a
   * dynamic import fired from a React effect, so it waits for a mount too).
   * Measured with 80 ms of latency per request, the game chunk could not begin
   * before 216 ms; named up front, all three start together at 97 ms.
   *
   * What can go wrong is invisible in a browser that is fast enough: a preload
   * for a chunk that does not exist is a 404 nobody watches, and a preload for
   * the WRONG game is a silent download of code the page can never run, on all
   * 42 game pages at once.
   */

  /**
   * The id -> directory map, read from the loader the APP actually calls.
   *
   * `manualChunks` names a game chunk after its directory, and `src/games/n2048/`
   * publishes as `/games/2048/`. Every other list in this repo is keyed by id,
   * so this is the one place the two vocabularies meet - and a future game whose
   * directory differs from its id would otherwise lose its preload in silence.
   */
  const CATALOG_SOURCE = readFileSync(new URL("../portal/catalog.ts", import.meta.url), "utf8");
  const LOADER_DIRS = new Map<string, string>(
    [
      ...CATALOG_SOURCE.matchAll(
        /"?([\w-]+)"?:\s*\(\)\s*=>\s*import\("\.\.\/games\/([\w-]+)\/index"\)/g,
      ),
    ].map((m) => [m[1], m[2]] as const),
  );

  const GAME_IDS = GAMES.map((m) => m.id);

  /**
   * A bundle shaped like a real one. The hashes carry `-` and `_` on purpose:
   * Rollup's alphabet is base64url and `page-Ch10E-pb.js` and
   * `game-sudoku-DICSW--A.js` are both real names, so anything that splits on
   * the last dash is wrong on a real build and right on a tidy fixture.
   */
  const FAKE_BUNDLE = [
    "index.html",
    "assets/index-DM8yLdSi.js",
    "assets/shell-SChm5E3U.js",
    "assets/shell-B7-ykA1n.css",
    "assets/vendor-react-Bt4lNSbZ.js",
    "assets/page-Ch10E-pb.js",
    ...[...LOADER_DIRS.values()].map((dir, i) => `assets/game-${dir}-B${i}q-Z_1.js`),
  ];

  /**
   * The app's verbatim head tags carry the base already - they are lifted off
   * an `index.html` Vite wrote for that host - so the fixture does too, or the
   * "every href carries the base" property would be testing the fixture.
   */
  function bootAssets(base = "/", files: readonly string[] = FAKE_BUNDLE): HeadAssets {
    const script = `<script type="module" crossorigin src="${base}assets/index-DM8yLdSi.js"></script>`;
    return {
      tags: [script, `<link rel="modulepreload" crossorigin href="${base}assets/vendor-react-Bt4lNSbZ.js">`],
      scripts: [script],
      lazy: resolveLazyChunks(files, GAME_IDS),
    };
  }

  function preloadHrefs(html: string): string[] {
    return [...html.matchAll(/<link rel="modulepreload"[^>]+href="([^"]+)"/g)].map((m) => m[1]);
  }

  const routeFor = new Map(ROUTES.map((r) => [r.file, r] as const));

  it("names the directory the app's own loader imports, for every game", () => {
    // A parse that matched nothing would make every assertion below vacuous.
    expect(LOADER_DIRS.size).toBe(GAMES.length);
    for (const meta of GAMES) {
      const dir = LOADER_DIRS.get(meta.id);
      expect(dir, `catalog.ts has no loader for ${meta.id}`).toBeDefined();
      expect(chunkNameFor(meta.id), `chunk name for ${meta.id}`).toBe(`game-${dir}`);
    }
  });

  it.each(BASES)("base %s: every game page preloads the runtime AND its own game", (base) => {
    const assets = bootAssets(base);
    let checked = 0;
    for (const f of allEmittedFiles(base, assets).filter((x) => x.fileName.endsWith(".html"))) {
      const route = routeFor.get(f.fileName)!;
      if (route.kind !== "game") continue;
      const hrefs = preloadHrefs(f.source);
      expect(hrefs, f.fileName).toContain(`${base}${assets.lazy!.page}`);
      expect(hrefs, f.fileName).toContain(`${base}${assets.lazy!.games[route.id!]}`);
      checked += 1;
    }
    expect(checked).toBe(GAMES.length * LOCALES.length);
  });

  it.each(BASES)("base %s: a game page carries no OTHER game's chunk", (base) => {
    const assets = bootAssets(base);
    for (const f of allEmittedFiles(base, assets).filter((x) => x.fileName.endsWith(".html"))) {
      const route = routeFor.get(f.fileName)!;
      if (route.kind !== "game") continue;
      const games = preloadHrefs(f.source).filter((h) => h.includes("/game-"));
      expect(games, f.fileName).toEqual([`${base}${assets.lazy!.games[route.id!]}`]);
    }
  });

  it.each(BASES)("base %s: the room and the boards preload the runtime and no game", (base) => {
    const assets = bootAssets(base);
    let checked = 0;
    for (const f of allEmittedFiles(base, assets).filter((x) => x.fileName.endsWith(".html"))) {
      const route = routeFor.get(f.fileName)!;
      if (route.kind !== "world" && route.kind !== "boards") continue;
      const hrefs = preloadHrefs(f.source);
      expect(hrefs, f.fileName).toContain(`${base}${assets.lazy!.page}`);
      expect(hrefs.filter((h) => h.includes("/game-")), f.fileName).toEqual([]);
      checked += 1;
    }
    // Two page kinds - the room and the boards - once per page language.
    expect(checked).toBe(2 * LOCALES.length);
  });

  it.each(BASES)("base %s: every preload href carries the base", (base) => {
    const assets = bootAssets(base);
    let checked = 0;
    for (const f of allEmittedFiles(base, assets).filter((x) => x.fileName.endsWith(".html"))) {
      for (const href of preloadHrefs(f.source)) {
        expect(href.startsWith(base), `${f.fileName}: ${href}`).toBe(true);
        // A base-free href is a 404 on GitHub Pages only, which is the arm no
        // local check ever looks at.
        expect(href, f.fileName).toBe(`${base}${href.slice(base.length)}`);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("gives the application's own head neither chunk", () => {
    // `/` is the home screen. It mounts no game and no room, so both chunks
    // would be bytes on a first visit and a payload-gate failure.
    for (const base of BASES) {
      const tags = indexHeadTags(base);
      expect(tags).not.toContain("modulepreload");
      expect(tags).not.toMatch(/assets\/(page|game)-/);
    }
  });

  it("emits no preload in dev, where there is no bundle to hash", () => {
    for (const base of BASES) {
      for (const f of allEmittedFiles(base, DEV_HEAD_ASSETS).filter((x) =>
        x.fileName.endsWith(".html"),
      )) {
        expect(preloadHrefs(f.source), f.fileName).toEqual([]);
      }
    }
  });

  it("refuses a bundle with no page chunk", () => {
    const without = FAKE_BUNDLE.filter((f) => !f.startsWith("assets/page-"));
    expect(() => resolveLazyChunks(without, GAME_IDS)).toThrow(/no `page-\*` chunk/);
  });

  it("refuses a bundle missing one game's chunk", () => {
    // Not a soft skip: every game directory produces a chunk by construction,
    // so a miss means the id -> directory derivation went stale and that game's
    // page would stay three round trips slow behind a green build.
    const without = FAKE_BUNDLE.filter((f) => !f.startsWith("assets/game-n2048-"));
    expect(() => resolveLazyChunks(without, GAME_IDS)).toThrow(/no "game-n2048" chunk/);
  });

  it("refuses two chunks answering to one name", () => {
    expect(() => resolveLazyChunks([...FAKE_BUNDLE, "assets/page-Other_1.js"], GAME_IDS)).toThrow(
      /2 chunks answer to "page"/,
    );
  });
});

describe("the dev middleware", () => {
  /**
   * Serving a page STRAIGHT out of the renderer is the version that looks
   * right and boots nothing: `@vitejs/plugin-react` injects a react-refresh
   * preamble into every html it transforms, and its generated modules throw
   * "can't detect preamble" without it. Dev only, content pages only, so `/`
   * stays perfect while every game, the room and the boards sit on their
   * no-JavaScript poster - which is exactly how it was found, by a person
   * opening one.
   */
  function driveMiddleware(url: string) {
    const plugin = pagesPlugin("/");
    let middleware: ((req: unknown, res: unknown, next: () => void) => void) | undefined;
    const transformed: string[] = [];
    const server = {
      middlewares: {
        use(fn: (req: unknown, res: unknown, next: () => void) => void) {
          middleware = fn;
        },
      },
      transformIndexHtml: (_url: string, html: string) => {
        transformed.push(html);
        return Promise.resolve(`<!--transformed-->${html}`);
      },
    };
    (plugin.configureServer as (s: unknown) => void).call(plugin, server);

    let sent: string | undefined;
    let nexted = false;
    const done = new Promise<void>((resolve) => {
      middleware!(
        { url, originalUrl: url },
        {
          setHeader() {},
          end(body: string) {
            sent = body;
            resolve();
          },
        },
        () => {
          nexted = true;
          resolve();
        },
      );
    });
    return done.then(() => ({ sent, nexted, transformed }));
  }

  it("hands every page through Vite's own html pipeline", async () => {
    for (const url of ["/boards/", "/world/", "/games/2048/"]) {
      const { sent, transformed } = await driveMiddleware(url);
      expect(transformed, `${url} was served without transformIndexHtml`).toHaveLength(1);
      expect(sent, `${url} sent something other than the transformed html`).toBe(
        `<!--transformed-->${transformed[0]}`,
      );
    }
  });

  it("leaves the application and unknown paths alone", async () => {
    for (const url of ["/", "/not-a-page/"]) {
      const { nexted, transformed } = await driveMiddleware(url);
      expect(nexted, `${url} should fall through to Vite`).toBe(true);
      expect(transformed).toHaveLength(0);
    }
  });
});

describe("robots, sitemap and llms", () => {
  it("asks the Pages duplicate not to be indexed at all", () => {
    expect(robotsTxt("/ellaz/")).toMatch(/^Disallow: \/$/m);
    expect(robotsTxt("/ellaz/")).not.toContain("Sitemap:");
  });

  it("names the citation crawlers on the primary host and points at the sitemap", () => {
    const txt = robotsTxt("/");
    for (const bot of ["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot"]) {
      expect(txt).toContain(`User-agent: ${bot}`);
    }
    expect(txt).toContain("Sitemap: https://ellaz.fun/sitemap.xml");
  });

  it("lists every indexable route in the sitemap, and nothing else", () => {
    const xml = sitemapXml();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const expected = ROUTES.filter((r) => r.indexable).map((r) => canonicalUrl(r.path));
    expect(new Set(locs)).toEqual(new Set(expected));
    expect(locs).not.toContain(canonicalUrl("/404.html"));
  });

  // The bug this pins was live for as long as the boards existed: the alternates
  // were a ternary chain ending in a hand-written `/world/` literal, so `boards`
  // matched no branch, fell into the else, and both boards rows declared the ROOM
  // as their Hebrew and English alternate.
  //
  // Nothing caught it. The row count was right, every URL was real and on-domain,
  // the XML parsed, and the pages' own `<link rel="alternate">` tags were correct
  // throughout - so the only artifact that was wrong is the one no human opens.
  // Assert the PROPERTY instead: an alternate is a translation of its own page.
  it("points every sitemap alternate at the same page in the other language", () => {
    const xml = sitemapXml();
    const byUrl = new Map(ROUTES.map((r) => [canonicalUrl(r.path), r] as const));
    const rows = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
    expect(rows.length).toBeGreaterThan(0);

    let checked = 0;
    let defaults = 0;
    for (const row of rows) {
      const self = byUrl.get(/<loc>([^<]+)<\/loc>/.exec(row)![1])!;
      for (const [, locale, href] of row.matchAll(
        /hreflang="([^"]+)" href="([^"]+)"/g,
      )) {
        const target = byUrl.get(href);
        expect(target, `${href} is not a route this site emits`).toBeDefined();
        expect(target!.kind, `${self.path} claims ${href} as its ${locale}`).toBe(self.kind);
        expect(target!.id).toBe(self.id);
        // x-default is the one entry that is not a language: it says "we have
        // no page in yours", so it must point at THIS page in DEFAULT_LOCALE.
        // Counted separately rather than skipped - an exemption nobody counts
        // is how a row stops being checked at all.
        if (locale === "x-default") {
          expect(target!.locale, `${self.path}'s x-default`).toBe(DEFAULT_LOCALE);
          defaults += 1;
        } else {
          expect(target!.locale).toBe(locale);
          checked += 1;
        }
      }
    }
    // A property test over zero alternates passes vacuously, which is exactly the
    // shape of the bug it replaces.
    expect(checked).toBe(rows.length * LOCALES.length);
    // And every row carries exactly one x-default, because the sitemap's cluster
    // and the page's own <link> tags are two statements about the same thing.
    // The sitemap had none of these until 2026-08-17 while every page head had
    // one, so the two artifacts disagreed - quietly, in the direction nobody
    // opens, which is this test's whole subject.
    expect(defaults).toBe(rows.length);
  });

  it("lists every game in llms.txt, in every page language", () => {
    // Widened from English-only on 2026-08-16. The old assertion was true of a
    // file that named a third of the site: it walked GAMES but pinned the
    // locale to "en", so the population it checked could never have included a
    // Hebrew or Spanish URL. The same "which pages are in its population" hole
    // that hid the roster-count gate's blindness to `juegos`.
    const txt = llmsTxt(GAMES);
    let checked = 0;
    for (const l of LOCALES) {
      for (const meta of GAMES) {
        expect(txt, `llms.txt has no ${l} link for ${meta.id}`).toContain(
          canonicalUrl(gamePath(meta.id, l)),
        );
        // The title is the DESCRIPTION of that link, and it must be the one in
        // the link's own language. It used to be `m.title.he` beside an English
        // URL for every row in the file.
        expect(txt, `llms.txt does not name ${meta.id} in ${l}`).toContain(gameName(meta.id, l));
        checked++;
      }
    }
    expect(checked).toBe(GAMES.length * LOCALES.length);
  });

  it("names every page language in llms.txt, and links each home", () => {
    // 2026-08-12, found by auditing the LIVE site rather than dist/. This file
    // said "in Hebrew and English" and linked two homes for a day after Spanish
    // shipped - the one artifact whose entire job is telling an answer engine
    // what this site IS, under-reporting it. It is prose, so no type could red,
    // and every other gate was busy proving the PAGES were right, which they were.
    const txt = llmsTxt(GAMES);
    for (const l of LOCALES) {
      expect(txt, `llms.txt never names ${l}`).toContain(ENGLISH_NAME[l]);
      expect(txt, `llms.txt has no home link for ${l}`).toContain(canonicalUrl(homePath(l)));
    }
    // ...and reads as a sentence rather than a list joined by commas.
    expect(txt).toMatch(/in [A-Z][a-z]+(, [A-Z][a-z]+)* and [A-Z][a-z]+\./);
  });
});

describe("the head injected into the application's own index.html", () => {
  it("carries a canonical, both alternates and the list of every game", () => {
    const tags = indexHeadTags("/");
    expect(tags).toContain(
      `<link rel="canonical" href="${canonicalUrl(homePath(CANONICAL_LOCALE))}" />`,
    );
    // Every page language advertised, and x-default pointing at the bare URL.
    for (const l of LOCALES) expect(tags).toContain(`hreflang="${l}"`);
    expect(tags).toContain(`<link rel="alternate" hreflang="x-default" href="https://ellaz.fun/" />`);
    const graph = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(tags)![1]);
    const list = graph["@graph"].find((n: { "@type": string }) => n["@type"] === "ItemList");
    expect(list.numberOfItems).toBe(GAMES.length);
    expect(list.itemListElement.map((i: { url: string }) => i.url)).toContain(
      canonicalUrl(gamePath("2048", CANONICAL_LOCALE)),
    );
  });

  it("is noindex on the Pages duplicate only", () => {
    expect(indexHeadTags("/ellaz/")).toContain('content="noindex');
    expect(indexHeadTags("/")).not.toContain('content="noindex');
  });
});

describe("the bare-URL home is a document, not an empty shell", () => {
  // 2026-08-11. `/` served `<div id="root"></div>` and nothing else: 29 bytes,
  // zero words, zero headings, zero links. Googlebot renders JavaScript so it
  // saw the grid eventually; GPTBot, ClaudeBot and PerplexityBot do not render,
  // so the site's canonical entry and x-default target was a blank page to every
  // answer engine. `/en/`, an emitted document, was fine the whole time - which
  // is why nothing caught it.

  /**
   * The app shell as Vite hands it over: a mount point and nothing else.
   *
   * Deliberately stamped with the WRONG language - `he`/`rtl`, what the real
   * file said before 2026-08-14. A fixture already carrying `en`/`ltr` would
   * pass whether or not the emitter rewrites anything, which is the whole
   * failure this fixture exists to make impossible.
   */
  // The fixture goes in WRONG on purpose, in both of the two head literals
  // index.html carries that nothing else can own: `he`/`rtl` for a root that is
  // English, and the bilingual title that really shipped until 2026-08-16. A
  // fixture that already agreed with the answer would pass whether or not the
  // rewrite ran at all.
  const SHELL = `<!doctype html><html lang="he" dir="rtl"><head>
    <title>Ellaz — Games / משחקים</title></head>
    <body class="app-shell"><div id="root"></div>
    <script type="module" src="/src/main.tsx"></script></body></html>`;

  // The plugin declares `transformIndexHtml` as a plain function; Vite's type
  // also allows the object form, which is why this narrows before calling.
  const runTransform = (base: string, html: string, path = "/index.html"): string => {
    const hook = pagesPlugin(base).transformIndexHtml;
    const fn =
      typeof hook === "function"
        ? hook
        : hook && "handler" in hook
          ? hook.handler
          : hook?.transform;
    if (typeof fn !== "function") throw new Error("transformIndexHtml is not a function");
    return String(fn.call(null as never, html, { path, filename: path.slice(1) }));
  };

  const transform = (base: string): string => runTransform(base, SHELL);

  it("stamps the shell's lang and dir from CANONICAL_LOCALE", () => {
    // index.html cannot import anything, so its `lang`/`dir` were a literal
    // only a person could keep in step with the root's language - and a stale
    // one is a document whose prose is English, whose `lang` says Hebrew, and
    // whose layout is mirrored. It renders perfectly and is wrong in three
    // ways at once, which is why this is rewritten rather than reviewed.
    const out = transform("/");
    expect(out).toContain(`<html lang="${CANONICAL_LOCALE}" dir="${dirOf(CANONICAL_LOCALE)}">`);
    // The fixture went in as he/rtl, so this proves a REWRITE rather than a
    // fixture that already agreed.
    expect(out).not.toContain('lang="he" dir="rtl"');
  });

  it("refuses a shell with no <html> tag rather than emitting the old language", () => {
    // The only way the rewrite can silently no-op is if it stops matching, and
    // a no-op leaves a valid document carrying the previous language - exactly
    // the defect. So it throws, and this is the control proving it does.
    expect(() => replaceHtmlLangDir("<body><div id=\"root\"></div></body>", "en")).toThrow(
      /no <html> opening tag/,
    );
  });

  it("stamps the opening tag only, never a later mention of <html", () => {
    // `[^>]*` cannot cross a `>`, so the match is bounded to one tag. Without
    // that the replacement could run away across the document - a corruption
    // that would still parse, and so would still look fine.
    const out = replaceHtmlLangDir(
      `<html lang="he" dir="rtl"><head></head><body><!-- <html lang="zz"> --></body></html>`,
      "en",
    );
    expect(out).toContain(`<html lang="en" dir="ltr"><head>`);
    expect(out).toContain(`<!-- <html lang="zz"> -->`);
  });

  it("carries an h1 and every game as a real link", () => {
    const out = transform("/");
    expect(out.match(/<h1/g) ?? []).toHaveLength(1);
    const linked = new Set([...out.matchAll(/href="(\/games\/[^"]+)"/g)].map((m) => m[1]));
    expect(linked.size).toBe(GAMES.length);
  });

  it("says something - a link list alone is not a page", () => {
    const text = transform("/")
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    expect(text.split(" ").length).toBeGreaterThan(120);
  });

  it("puts the document BEFORE #root and never inside it", () => {
    // The invariant that matters. A node React does not know about, inside the
    // container it reconciles, is the nested-root teardown crash in a different
    // costume - `#game-poster` sits beside `#game-frame` for exactly this reason.
    const out = transform("/");
    // Present FIRST. Without this line `indexOf` returns -1 when the document is
    // missing entirely, -1 is less than any real index, and the assertion below
    // reports green over the exact absence this block exists to catch. Caught by
    // planting the pre-fix emitter: three siblings went red and this one did not.
    expect(out).toContain('id="home-doc"');
    expect(out.indexOf('id="home-doc"')).toBeLessThan(out.indexOf('id="root"'));
    expect(out).not.toMatch(/<div id="root"[^>]*>\s*<div id="home-doc"/);
    // ...and #root is still an empty mount point when React arrives.
    expect(out).toContain('<div id="root"></div>');
  });

  it("links to the base it was built for, on both hosts", () => {
    // Half the failures in this repo are base-dependent and each workflow only
    // ever sees one arm, so both are asserted here rather than in one CI job.
    expect(transform("/")).toContain('href="/games/snake/"');
    expect(transform("/ellaz/")).toContain('href="/ellaz/games/snake/"');
    expect(transform("/ellaz/")).not.toContain('href="/games/snake/"');
  });

  it("leaves an emitted page alone - dev sends those through this same hook", () => {
    // 2026-08-12: it did not, and every content page in dev was a 500. The dev
    // middleware must run the emitted pages through Vite's html pipeline (the
    // react-refresh preamble), so this hook is handed 78 documents that have no
    // `#root` - and the mount-point guard below fired on all of them. Nothing in
    // production could see it: at build time the hook runs once, for index.html.
    const page = renderRoute(
      ROUTES.find((r) => r.kind === "game" && r.locale === "es")!,
      "/",
      DEV_HEAD_ASSETS,
    );
    const out = runTransform("/", page, "/es/games/snake/");
    expect(out).toBe(page);
    expect(out).not.toContain('id="home-doc"');
    // And specifically its TITLE, which is the newest way this can go wrong.
    // `replaceTitle` matches any single `<title>`, and a game page has exactly
    // one - its own `metaTitle` - so moving the call one line ABOVE the
    // `ctx.path` guard would rewrite all 96 dev pages to the home title.
    // Production would stay perfect (the hook runs once there, for index.html)
    // and nothing would throw. Only the guard prevents it, so the guard is what
    // this asserts.
    const titleOf = (html: string) => /<title>([^<]*)<\/title>/.exec(html)?.[1];
    expect(titleOf(page), "the fixture must HAVE a title, or the next line is vacuous").toBeTruthy();
    expect(titleOf(out)).toBe(titleOf(page));
    expect(titleOf(out)).not.toBe(indexTitle());
  });

  it("refuses to emit silently if the mount point moves", () => {
    // Without this the marker could stop matching and the home document would
    // vanish from `/` with a green build - which is the exact failure this whole
    // block exists to prevent, arriving by a different door.
    expect(() =>
      runTransform("/", `<html><head><title>x</title></head><body><div id="app"></div></body></html>`),
    ).toThrow(/mount point/i);
  });

  it("gives `/` the canonical locale's own title, and replaces rather than appends", () => {
    // The bug this whole pair of helpers exists for. `/` shipped
    // `Ellaz — Games / משחקים` - a bilingual literal nothing owned - as the
    // title of the site's canonical entry and x-default target, beside an
    // English og:title, an English description and lang="en". No gate here read
    // a title, so it survived the 2026-08-14 flip that changed everything else.
    const out = transform("/");
    expect(out).toContain(`<title>${indexTitle()}</title>`);
    // The fixture's title went in bilingual, so this proves a REWRITE.
    expect(out).not.toContain("Ellaz — Games / משחקים");
    // EXACTLY one. A second <title> is legal HTML and the browser keeps the
    // FIRST, so an append would emit the right string into a document that goes
    // on showing the wrong one - green build, unchanged defect.
    expect(out.match(/<title>/g)).toHaveLength(1);
    // And it agrees with the og:title beside it, which is the disagreement that
    // made the defect visible in the first place.
    expect(out).toContain(`<meta property="og:title" content="${indexTitle()}" />`);
  });

  it("refuses a shell with no <title> rather than leaving an unowned one", () => {
    // The control for the throw. A no-op here leaves a perfectly valid document
    // carrying whatever literal was in the file - which is precisely the defect,
    // so silence is the one thing this must not do.
    expect(() => replaceTitle("<html><head></head><body></body></html>", "Ellaz")).toThrow(
      /no <title>/i,
    );
  });

  it("escapes text in the title rather than emitting markup", () => {
    // `<title>` is #PCDATA: no child elements, so `&` and `<` are the surface.
    expect(replaceTitle("<head><title>x</title></head>", "A & B <c>")).toContain(
      "<title>A &amp; B &lt;c&gt;</title>",
    );
  });
});

describe("the structured data parses", () => {
  it.each(ROUTES.filter((r) => r.emit).map((r) => [r.file, r] as const))(
    "%s has valid JSON-LD",
    (_file, route) => {
      const page = renderRoute(route, "/");
      const blocks = [...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
      // The 404 deliberately carries none; every other page must.
      if (route.kind !== "notFound") expect(blocks.length).toBeGreaterThan(0);
      for (const b of blocks) expect(() => JSON.parse(b[1])).not.toThrow();
    },
  );
});

describe("the game gets the whole first screen", () => {
  /**
   * Declarations only. Both mentions of the forbidden unit below live in a
   * comment explaining why it is forbidden, and a check that cannot tell those
   * apart either fails on its own documentation or passes on the real thing.
   */
  const declarations = DOCUMENT_CSS.replace(/\/\*[\s\S]*?\*\//g, "");

  it("never bleeds with 100vw, which scrolls the page sideways", () => {
    // 100vw counts the vertical scrollbar (1536px) while the container does
    // not (1521px), so a 100vw bleed overhangs by half the scrollbar and the
    // page really does scroll sideways by 8px. Measured on the live artifact
    // 2026-08-07, and invisible unless you go looking for it.
    expect(declarations).not.toContain("100vw");
  });

  it("hands main's width limit to each prose child so the stage is full-bleed", () => {
    for (const page of ["game", "world"]) {
      expect(declarations).toContain(`body[data-page="${page}"] main`);
    }
    expect(declarations).toMatch(/main>:not\(\.stage\)/);
  });

  it("floats the room's header over the stage, and the game's no longer", () => {
    // The room still floats: it is a composed scene with its own margins and
    // nothing in it reaches the top edge.
    expect(declarations).toMatch(/body\[data-page="world"\] \.top[^{]*\{[^}]*position:absolute/);

    // The game does NOT, and this is the deliberate reversal. A game that
    // fitStage has scaled to fill its box reaches the top edge every time, so
    // a floating bar sits on the board - which is the complaint the header
    // tournament started from. In flow, overlap is impossible by construction
    // rather than avoided by arithmetic.
    const top = /body\[data-page="game"\] \.top\{([^}]*)\}/.exec(declarations);
    expect(top, "the game's own header rule is missing").not.toBeNull();
    expect(top![1]).toContain("position:relative");
    expect(top![1]).toContain("height:var(--hh)");

    // The breadcrumb still floats over the stage on both, because it is a
    // small badge that costs nothing and would otherwise push the game down.
    expect(declarations).toMatch(/body\[data-page="game"\] \.bc[^{]*\{[^}]*position:absolute/);
  });

  it("gives the room the whole screen and the game the screen minus its bar", () => {
    const room = /body\[data-page="world"\] \.stage \.box\{([^}]*)\}/.exec(declarations);
    expect(room, "the room's full-screen box rule is missing").not.toBeNull();
    expect(room![1]).toContain("height:100dvh");

    const game = /body\[data-page="game"\] \.stage \.box\{([^}]*)\}/.exec(declarations);
    expect(game, "the game's box rule is missing").not.toBeNull();
    expect(game![1]).toContain("height:calc(100dvh - var(--hh))");
    for (const box of [room![1], game![1]]) {
      expect(box).toContain("border-radius:0");
      expect(box).toContain("min-height:0");
    }
  });

  it("measures the bar, the box and the breadcrumb from ONE variable", () => {
    // The three have to agree or the chrome sits on the board again, and they
    // are in three separate rules. Written against --hh in all three, so a
    // density change moves them together instead of moving one and leaving a
    // gap nobody looks for. --hh is declared exactly once per breakpoint.
    const decl = declarations.match(/--hh:\s*\d+px/g) ?? [];
    expect(decl.length, "--hh should be declared for the base and one breakpoint").toBe(2);
    expect(declarations).toMatch(/body\[data-page="game"\] \.bc\{top:calc\(var\(--hh\)/);
    expect(declarations).toContain("height:calc(100dvh - var(--hh))");
  });

  it("leaves the boards, the home index and the 404 as ordinary documents", () => {
    // The boards are a short column of records. Given a screen-sized box they
    // sit in the top third of a large empty rectangle with the page's own
    // heading stranded below, which is the bug the boards rule already fixes.
    expect(declarations).not.toContain('body[data-page="boards"]');
    expect(declarations).toContain(".stage.boards .box{min-height:clamp(");
  });

  it("keeps the frame content-sized so its natural height can be measured", () => {
    // A frame that stretches to fill the box reports the box's height back,
    // and fitStage's scale comes out as 1 every time.
    expect(declarations).toMatch(
      /body\[data-page="game"\] #game-frame,body\[data-page="world"\] #game-frame\{flex:0 0 auto\}/,
    );
  });
});
