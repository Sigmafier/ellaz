import { describe, it, expect } from "vitest";
import { GAMES, metaFor } from "../portal/games";
import { CANONICAL_LOCALE, PAGE_LOCALES } from "../i18n/locales";
import { GA_MEASUREMENT_ID } from "./analytics";
import { EMBED_HEIGHT, embedCredit, embedSnippet, snippetAttr, snippetText } from "./gamePage";
import { EMBED_CSS, EMBED_ROW_HEIGHT, embedPage } from "./embedPage";
import { allEmittedFiles, renderRoute } from "./pages";
import {
  LOCALES,
  OG_ROUTES,
  PRINT_KINDS,
  PRINT_LOCALE,
  ROUTES,
  embedPath,
  gamePath,
  localesOf,
} from "./routes";
import { gameName } from "./gameName";
import { SITE } from "../content/site";

/**
 * The embed lane: one frame per game, the snippet a stranger pastes, and the
 * three promises the frame makes - no analytics, no third-party asset, no
 * per-language twin.
 *
 * `embed.test.ts` rather than lines in `build.test.ts`: the emitter's tests
 * enumerate page kinds in several places, and this file is where the new
 * kind's contract lives, next to the code that made it.
 */

const ASSETS = {
  tags: [
    '<script type="module" src="/assets/index-abc.js"></script>',
    '<link rel="stylesheet" href="/assets/index-abc.css">',
  ],
  scripts: ['<script type="module" src="/assets/index-abc.js"></script>'],
};

const snake = metaFor("snake")!;
const n2048 = metaFor("2048")!;

/** What a browser hands `textContent` for the bytes inside a `<pre>`. */
function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

describe("the snippet a stranger pastes", () => {
  it("is the approved shape, byte for byte", () => {
    // Pinned as a literal on purpose. This is the artifact of the whole lane -
    // the anchor OUTSIDE the frame is the only link that is theirs - and a
    // refactor that reorders an attribute or loses the `<p>` must fail here
    // by name rather than ship a different snippet to every game page.
    expect(embedSnippet(snake, "en")).toBe(
      '<iframe src="https://ellaz.fun/embed/snake/?lang=en" width="100%" height="940" ' +
        'style="border:0;border-radius:12px" allow="fullscreen" title="Snake - ellaz.fun"></iframe>\n' +
        '<p>Play <a href="https://ellaz.fun/games/snake/">Snake</a> and more free games at ' +
        '<a href="https://ellaz.fun/">ellaz.fun</a></p>',
    );
    // 940, and the number is measured - the comment on EMBED_HEIGHT carries
    // both readings. What is pinned here is that it clears the tallest game
    // measured (maze, 881 px at 720 px wide) plus the link row the frame lays
    // out inside itself, because `.stage .box` CLIPS rather than scrolls.
    expect(EMBED_HEIGHT).toBe(940);
    expect(EMBED_HEIGHT).toBeGreaterThanOrEqual(881 + EMBED_ROW_HEIGHT);
  });

  it("uses the game's id as the slug and the page's locale as the frame's language", () => {
    // The trap this repo names: `src/games/n2048/` has meta.id "2048".
    const he = embedSnippet(n2048, "he");
    expect(he).toContain('src="https://ellaz.fun/embed/2048/?lang=he"');
    expect(he).not.toContain("n2048");
    // The credit line points at the HEBREW page, so the reader who pasted
    // from the Hebrew page sends their visitors to the page they read.
    expect(he).toContain('<a href="https://ellaz.fun/he/games/2048/">');
    expect(he).toContain(gameName("2048", "he"));
  });

  it.each(LOCALES)("in %s, carries the two anchors in that language's word order", (locale) => {
    for (const meta of GAMES) {
      const credit = embedCredit(meta, locale);
      const [before, between, after] = SITE[locale].embed.credit;
      const name = gameName(meta.id, locale);
      // Two anchors, always: the game and the site. Neither is optional.
      expect(credit.match(/<a href="https:\/\/ellaz\.fun\//g)?.length, `${meta.id} ${locale}`).toBe(2);
      expect(credit).toContain(`<a href="https://ellaz.fun${gamePath(meta.id, locale)}">`);
      expect(credit).toContain('<a href="https://ellaz.fun/">ellaz.fun</a>');
      expect(credit.startsWith(`<p>${before}`), `${meta.id} ${locale}`).toBe(true);
      expect(credit).toContain(`</a>${between}<a`);
      expect(credit.endsWith(`</a>${after}</p>`), `${meta.id} ${locale}`).toBe(true);
      // The name is HTML-escaped where it is text. `Fusion d'animaux` keeps
      // its apostrophe - a stranger reading `&#39;` in a name sees a defect.
      expect(credit).not.toContain("&#39;");
      if (!/[&<>]/.test(name)) expect(credit).toContain(`>${name}</a>`);
    }
  });

  it("escapes a name that would break the stranger's markup, in text and in an attribute", () => {
    // `gameName` reads the content files, so a hostile name cannot be injected
    // through a meta; the two escapers the snippet is built from are tested
    // directly. The control is the apostrophe: it must survive, because a
    // stranger reading `&#39;` in a game's name sees a defect.
    const hostile = `Tom & Jerry <b>bold</b> "quoted" d'animaux`;
    expect(snippetText(hostile)).toBe(`Tom &amp; Jerry &lt;b&gt;bold&lt;/b&gt; "quoted" d'animaux`);
    expect(snippetAttr(hostile)).toBe(`Tom &amp; Jerry &lt;b&gt;bold&lt;/b&gt; &quot;quoted&quot; d'animaux`);
  });
});

describe("the section on a game page that hands it over", () => {
  const route = ROUTES.find((r) => r.kind === "game" && r.id === "snake" && r.locale === "en")!;
  const page = renderRoute(route, "/", ASSETS);

  it("puts the RAW snippet in the <pre>, escaped, so textContent hands it back byte for byte", () => {
    // The copy path reads `textContent`. What the browser decodes from the
    // emitted bytes must be exactly `embedSnippet`, or the stranger gets
    // `&lt;iframe` - the reach board's copy control shipped that once.
    const pre = /<pre[^>]*data-embed-code[^>]*>([\s\S]*?)<\/pre>/.exec(page)?.[1];
    expect(pre, "no <pre data-embed-code> on the page").toBeDefined();
    expect(pre).toContain("&lt;iframe");
    expect(pre).not.toContain("<iframe");
    expect(decodeEntities(pre!)).toBe(embedSnippet(snake, "en"));
  });

  it("boots NO second game: the emitted page carries no iframe at all", () => {
    // The measurement this replaced a `loading="lazy"` iframe over. On the
    // built /games/match3/ on 2026-09-05 that frame had ALREADY booted on
    // load - two 64-cell boards in one 7,624 px document - and being
    // same-origin it shared `ellaz:match3:session` with the game above it,
    // reloading to the player's own `Score 30 / Moves 24`. Lazy is a hint
    // about WHEN, never a promise of WHETHER.
    //
    // `<pre>` holds the snippet ESCAPED, so a literal `<iframe` anywhere in
    // these bytes is a real frame, which is exactly what must not be here.
    expect(page).not.toContain("<iframe");
    expect(page).toContain("&lt;iframe");
  });

  it("hands the runtime the frame to build, from this host's base, in this page's language", () => {
    const slot = /<div[^>]*data-embed-preview[\s\S]*?<\/div>/.exec(page)?.[0] ?? "";
    expect(slot, "no [data-embed-preview] on the page").not.toBe("");
    expect(slot).toContain('data-src="/embed/snake/?lang=en"');
    expect(slot).toContain(`data-height="${EMBED_HEIGHT}"`);
    expect(slot).toContain('data-title="Snake - ellaz.fun"');
    // The poster, so the section is a picture and the code without script.
    expect(slot).toContain("<img");
    const mirror = renderRoute(route, "/ellaz/", ASSETS);
    expect(/<div[^>]*data-embed-preview[\s\S]*?<\/div>/.exec(mirror)?.[0]).toContain(
      'data-src="/ellaz/embed/snake/?lang=en"',
    );
  });

  it("emits the button hidden, like every other control the runtime owns", () => {
    expect(page).toMatch(/<button[^>]*data-embed-play[^>]*hidden/);
  });

  it("renders the credit line as the stranger's page will, with absolute links", () => {
    expect(page).toContain(`<p class="embed-credit">${embedCredit(snake, "en")}</p>`);
  });

  it("emits the copy button hidden, with both runtime labels on it", () => {
    const button = /<button[^>]*data-embed-copy[\s\S]*?<\/button>/.exec(page)?.[0] ?? "";
    expect(button).toMatch(/\bhidden\b/);
    expect(button).toContain(`data-label-copied="${SITE.en.embed.copied}"`);
    expect(button).toContain(`data-label-select="${SITE.en.embed.select}"`);
    expect(button).toContain(`>${SITE.en.embed.copy}</button>`);
  });

  it.each(LOCALES)("says in %s, in one sentence, that only the pasted link is theirs", (locale) => {
    const e = SITE[locale].embed;
    expect(e.lede).toContain("ellaz.fun");
    // Plain hyphens only, in every string a stranger reads.
    for (const s of [e.heading, e.lede, e.copy, e.copied, e.select, e.playMore, ...e.credit]) {
      expect(s, `${locale}: "${s}"`).not.toMatch(/[–—―]/);
    }
  });
});

describe("the embed route table", () => {
  const embeds = ROUTES.filter((r) => r.kind === "embed");

  it("has exactly one embed page per game, and no locale twins", () => {
    expect(embeds).toHaveLength(GAMES.length);
    for (const meta of GAMES) {
      const own = embeds.filter((r) => r.id === meta.id);
      expect(own, meta.id).toHaveLength(1);
      expect(own[0].locale).toBe(CANONICAL_LOCALE);
      expect(own[0].path).toBe(embedPath(meta.id));
      expect(own[0].file).toBe(`embed/${meta.id}/index.html`);
      expect(own[0].emit).toBe(true);
      expect(own[0].indexable).toBe(false);
      expect(localesOf(own[0])).toEqual([]);
      expect(own[0].canonicalPath).toBe(gamePath(meta.id, CANONICAL_LOCALE));
    }
    expect(embedPath("2048")).toBe("/embed/2048/");
    expect(embeds.some((r) => r.path.includes("n2048"))).toBe(false);
  });

  it("declares the full page set on every ordinary route, and its own set on the three that have one", () => {
    // THREE SHAPES, not two, since the printable packs landed. `[]` means "no
    // per-language twin at all" (the 404, every embed frame); `["he"]` means
    // "this page exists in one language, on purpose" (the print packs); the
    // full set is everything else. Written as a lookup rather than a chain of
    // `||`, so a fourth shape has to be answered here rather than falling into
    // whichever arm happens to be last.
    const WANT: Record<string, string[]> = {
      embed: [],
      notFound: [],
      print: [PRINT_LOCALE],
    };
    for (const r of ROUTES) {
      expect(localesOf(r), r.path).toEqual(WANT[r.kind] ?? [...PAGE_LOCALES]);
    }
    // The population, so a route table that lost a kind cannot pass by vacuum.
    expect(ROUTES.filter((r) => r.kind === "print")).toHaveLength(PRINT_KINDS.length);
  });

  it("gets no share card of its own - it shares its game page's", () => {
    expect(OG_ROUTES.some((r) => r.kind === "embed")).toBe(false);
    // The positive control: the game pages still have theirs.
    //
    // Plus one BORROWED entry per printable pack. Those carry the print page's
    // PATH and the game route's identity, which is how `renderDocument` finds a
    // card by path and hands the pack its game's picture without drawing a
    // second one - so they count as `kind: "game"` here, deliberately.
    expect(OG_ROUTES.filter((r) => r.kind === "game")).toHaveLength(
      GAMES.length * LOCALES.length + PRINT_KINDS.length,
    );
    expect(OG_ROUTES.filter((r) => r.path.includes("/print/"))).toHaveLength(PRINT_KINDS.length);
  });

  it("publishes the locale set, the indexable flag and the resolved canonical in pages.json", () => {
    const manifest = JSON.parse(
      allEmittedFiles("/", ASSETS).find((f) => f.fileName === "pages.json")!.source,
    ) as { pages: Array<{ kind: string; id?: string; locales: string[]; indexable: boolean; canonical: string; path: string }> };
    const embed = manifest.pages.find((p) => p.kind === "embed" && p.id === "snake")!;
    expect(embed.locales).toEqual([]);
    expect(embed.indexable).toBe(false);
    expect(embed.path).toBe("/embed/snake/");
    expect(embed.canonical).toBe("https://ellaz.fun/games/snake/");
    const game = manifest.pages.find((p) => p.kind === "game" && p.id === "snake" && p.canonical.endsWith("/games/snake/"))!;
    expect(game.locales).toEqual([...PAGE_LOCALES]);
    expect(game.indexable).toBe(true);
    expect(manifest.pages.find((p) => p.kind === "notFound")!.locales).toEqual([]);
    expect(manifest.pages.every((p) => typeof p.indexable === "boolean")).toBe(true);
  });
});

describe("the embed document", () => {
  const route = ROUTES.find((r) => r.kind === "embed" && r.id === "snake")!;
  const primary = renderRoute(route, "/", ASSETS);
  const mirror = renderRoute(route, "/ellaz/", ASSETS);

  it("carries no analytics tag on either host, and no consent bar", () => {
    for (const html of [primary, mirror]) {
      expect(html).not.toContain(GA_MEASUREMENT_ID);
      expect(html).not.toContain("googletagmanager");
      expect(html).not.toContain("consent");
    }
    // The positive control: the same emitter DOES tag a game page on the
    // primary host, so an absent tag here is a decision and not a broken tag.
    const game = ROUTES.find((r) => r.kind === "game" && r.id === "snake" && r.locale === "en")!;
    expect(renderRoute(game, "/", ASSETS)).toContain(GA_MEASUREMENT_ID);
  });

  it("fetches nothing eagerly from a third party", () => {
    // Every script and preload the document names, on the primary host where
    // the tag WOULD be emitted if the document allowed it.
    const eager = [
      ...primary.matchAll(/<script[^>]+src="([^"]+)"/g),
      ...primary.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g),
    ].map((m) => m[1]);
    expect(eager.length).toBeGreaterThan(0);
    expect(eager.filter((u) => /^https?:/i.test(u))).toEqual([]);
  });

  it("boots the app's own bundle and preloads its one game", () => {
    expect(primary).toContain("/assets/index-abc.js");
    expect(primary).toContain('<div id="game-frame"></div>');
    expect(primary).toContain('id="game-poster"');
    expect(primary).toMatch(/<body[^>]*class="app-shell"[^>]*data-page="embed"[^>]*data-game="snake"/);
    expect(primary).not.toContain('id="root"');
  });

  it("is noindex on both hosts, canonical to the game page, with no alternates", () => {
    for (const html of [primary, mirror]) {
      expect(html).toContain('<meta name="robots" content="noindex, follow" />');
      expect(html).toContain('<link rel="canonical" href="https://ellaz.fun/games/snake/" />');
      expect(html).not.toContain('rel="alternate"');
    }
  });

  it("lays the link row out INSIDE the frame, at a fixed height, so the document never grows", () => {
    expect(EMBED_CSS).toContain("body.app-shell{display:flex;flex-direction:column}");
    expect(EMBED_CSS).toContain(`.embed-home{flex:0 0 ${EMBED_ROW_HEIGHT}px;`);
    expect(EMBED_CSS).toContain(".stage{flex:1 1 auto;min-height:0;");
    expect(primary).toContain(`<style>${EMBED_CSS}</style>`);
  });

  it("has no header, no breadcrumb, no prose and no footer - one game and one way out", () => {
    expect(primary).not.toMatch(/<header\b/);
    expect(primary).not.toMatch(/<footer\b/);
    expect(primary).not.toMatch(/<nav\b/);
    expect(primary).not.toMatch(/<h1[\s>]/);
    const home = /<a\b[^>]*\bid="embed-home"[^>]*>/.exec(primary)?.[0] ?? "";
    expect(home).toContain('target="_top"');
    expect(home).toContain('href="/games/snake/"');
    for (const l of LOCALES) {
      expect(home).toContain(`data-say-${l}="${SITE[l].embed.playMore}"`);
      expect(home).toContain(`data-to-${l}="${gamePath("snake", l)}"`);
    }
    expect(/<a\b[^>]*\bid="embed-home"[^>]*>/.exec(mirror)?.[0]).toContain('href="/ellaz/games/snake/"');
  });

  it("titles and describes itself with the game's name, uniquely per game", () => {
    const titles = new Set(GAMES.map((m) => /<title>([^<]*)<\/title>/.exec(embedPage({ meta: m, base: "/" }))?.[1]));
    expect(titles.size).toBe(GAMES.length);
    expect(primary).toContain(`<title>Snake${SITE.en.embed.docTitle[1]}</title>`);
  });
});
