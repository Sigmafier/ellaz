import { describe, it, expect } from "vitest";
import { CONTENT } from "../content/index";
import { SITE } from "../content/site";
import { GAMES } from "../portal/games";
import { CATALOG } from "../portal/catalog";
import { escapeHtml, html, jsonLd, raw, toHtml } from "./html";
import { ROUTES, canonicalUrl, gamePath, homePath, href } from "./routes";
import { allEmittedFiles, indexHeadTags, renderRoute } from "./pages";
import { headingFor, relatedTo } from "./gamePage";
import { llmsTxt, robotsTxt, sitemapXml } from "./siteFiles";

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
  it("covers every game in both languages", () => {
    const games = ROUTES.filter((r) => r.kind === "game");
    expect(games).toHaveLength(GAMES.length * 2);
    for (const meta of GAMES) {
      for (const locale of ["he", "en"] as const) {
        expect(games.some((r) => r.id === meta.id && r.locale === locale)).toBe(true);
      }
    }
  });

  it("uses the game's own id as the slug, not its directory name", () => {
    // The trap: src/games/n2048/ has meta.id "2048". A hand-written
    // /games/n2048/ is a 404 nothing else would catch.
    expect(gamePath("2048", "he")).toBe("/games/2048/");
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
    const home = ROUTES.find((r) => r.kind === "home" && r.locale === "he")!;
    expect(home.file).toBe("index.html");
    expect(home.emit).toBe(false);
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
  it.each(BASES)("base %s: all 48 documents, and none of them empty", (base) => {
    const files = allEmittedFiles(base);
    const pages = files.filter((f) => f.fileName.endsWith(".html"));
    expect(pages).toHaveLength(ROUTES.filter((r) => r.emit).length);
    for (const f of pages) {
      expect(f.source.startsWith("<!doctype html>"), f.fileName).toBe(true);
      expect(f.source.length, f.fileName).toBeGreaterThan(2000);
    }
  });

  it.each(BASES)("base %s: no page carries #root", (base) => {
    // #root is the app SHELL's mount point. On a content page it would boot the
    // full-viewport application straight over the prose.
    for (const f of allEmittedFiles(base).filter((x) => x.fileName.endsWith(".html"))) {
      expect(f.source.includes('id="root"'), f.fileName).toBe(false);
    }
  });

  it("gives the runtime only the two elements it is allowed to own", () => {
    const assets = {
      tags: ['<script type="module" src="/assets/index-abc.js"></script>'],
      scripts: ['<script type="module" src="/assets/index-abc.js"></script>'],
    };
    for (const f of allEmittedFiles("/", assets).filter((x) => x.fileName.endsWith(".html"))) {
      const boots =
        /(^|\/)games\//.test(f.fileName) ||
        f.fileName.includes("world/") ||
        f.fileName.includes("boards/");
      expect(f.source.includes("/assets/index-abc.js"), f.fileName).toBe(boots);
      if (!boots) continue;
      // The frame is emitted EMPTY. Markup inside it would be a node React does
      // not know about, inside a tree it reconciles.
      expect(f.source, f.fileName).toContain('<div id="game-frame"></div>');
      expect(f.source, f.fileName).toContain('id="game-poster"');
      expect(f.source, f.fileName).toMatch(/<body[^>]+data-page="(game|world|boards)"/);
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
    const copy = CONTENT.memory.he;
    for (const paragraph of copy.body) {
      expect(page).toContain(escapeHtml(paragraph));
    }
    for (const f of copy.faq) expect(page).toContain(escapeHtml(f.q));
    expect(page).toContain(escapeHtml(copy.lede));
    expect(page).toContain(headingFor(meta, "he"));
  });

  it("states the platform facts from one place, never from a content file", () => {
    const page = renderRoute(ROUTES.find((r) => r.kind === "game" && r.locale === "he")!, "/");
    for (const fact of SITE.he.facts) expect(page).toContain(escapeHtml(fact));
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

  it("lists every game in llms.txt", () => {
    const txt = llmsTxt(GAMES);
    for (const meta of GAMES) expect(txt).toContain(canonicalUrl(gamePath(meta.id, "en")));
  });
});

describe("the head injected into the application's own index.html", () => {
  it("carries a canonical, both alternates and the list of every game", () => {
    const tags = indexHeadTags("/");
    expect(tags).toContain(`<link rel="canonical" href="${canonicalUrl(homePath("he"))}" />`);
    expect(tags).toContain(`hreflang="en"`);
    const graph = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(tags)![1]);
    const list = graph["@graph"].find((n: { "@type": string }) => n["@type"] === "ItemList");
    expect(list.numberOfItems).toBe(GAMES.length);
    expect(list.itemListElement.map((i: { url: string }) => i.url)).toContain(
      canonicalUrl(gamePath("2048", "he")),
    );
  });

  it("is noindex on the Pages duplicate only", () => {
    expect(indexHeadTags("/ellaz/")).toContain('content="noindex');
    expect(indexHeadTags("/")).not.toContain('content="noindex');
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
