import type { GameMeta } from "../sdk/types";
import { gameName } from "./gameName";
import { ORIGIN } from "../content/site";
import { DEFAULT_LOCALE, ENGLISH_NAME, localePrefix } from "../i18n/locales";
import type { PageLocale } from "../i18n/locales";
import { LOCALES, ROUTES, canonicalUrl, gamePath, homePath } from "./routes";
import { escapeHtml } from "./html";
import { artPath } from "./artFiles";

/**
 * `robots.txt`, `sitemap.xml` and `llms.txt`.
 *
 * These are EMITTED rather than dropped in `public/`, because `public/` ships
 * verbatim to both hosts and the two hosts need opposite files: Hostinger is
 * the real site, and the GitHub Pages copy is a duplicate that must ask not to
 * be indexed at all. One `public/robots.txt` would be wrong on one of them.
 */

/**
 * Crawlers that fetch a page in order to CITE it in an answer.
 *
 * Each vendor ships TWO: an indexer that crawls ahead of time, and a
 * user-triggered fetcher that goes and reads a page because somebody asked
 * about it right now. Both are named, per vendor, because omitting one is
 * invisible - the file still looks complete, and the gap is only findable by
 * reading the three vendors side by side. `ChatGPT-User` was missing for
 * exactly that reason while its Anthropic and Perplexity equivalents were
 * both listed.
 */
/**
 * A route's path with its locale prefix removed - the thing two pages share
 * when they are the same page in two languages. `/he/games/snake/` and
 * `/games/snake/` are both `/games/snake/`.
 */
function familyOf(path: string): string {
  for (const l of LOCALES) {
    const p = localePrefix(l as PageLocale);
    if (p && (path === p || path.startsWith(`${p}/`))) return path.slice(p.length) || "/";
  }
  return path;
}

const CITATION_BOTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
];

/**
 * Crawlers that fetch a page to TRAIN on it. A separate decision from the
 * citation bots above, and the operator's rather than mine.
 *
 * Listing them explicitly with `Allow` changes nothing technically - absent a
 * rule, a crawler is already allowed - but it puts the decision in the file
 * where it can be seen and reversed, instead of leaving it implied by silence.
 * Flip this to `Disallow` and the next deploy carries it.
 */
const TRAINING_BOTS = ["GPTBot", "Google-Extended", "CCBot"];
const TRAINING_RULE = "Allow: /";

export function robotsTxt(base: string): string {
  if (base !== "/") {
    return [
      "# The GitHub Pages copy of this site is a build duplicate.",
      "# The real site is https://ellaz.fun/ and it is the one that should be indexed.",
      "User-agent: *",
      "Disallow: /",
      "",
    ].join("\n");
  }

  return [
    "# https://ellaz.fun - free browser games for kids and grown-ups.",
    "# Everything here is public. There is no account, no user data and nothing to gate.",
    "",
    "User-agent: *",
    "Allow: /",
    "",
    "# Answer engines that cite their sources. Explicitly welcome.",
    ...CITATION_BOTS.flatMap((bot) => [`User-agent: ${bot}`, "Allow: /", ""]),
    "# Training crawlers. A separate decision from the citation bots above.",
    ...TRAINING_BOTS.flatMap((bot) => [`User-agent: ${bot}`, TRAINING_RULE, ""]),
    `Sitemap: ${ORIGIN}/sitemap.xml`,
    "",
  ].join("\n");
}

/** XML text escaping. `&` and `<` are the two that actually break a sitemap. */
function xml(value: string): string {
  return escapeHtml(value);
}

export function sitemapXml(lastmods?: ReadonlyMap<string, string>): string {
  const indexable = ROUTES.filter((r) => r.indexable);
  const rows = indexable.map((r) => {
    // Every page declares both languages, including itself. That self-reference
    // is required by the spec, not an oversight.
    //
    // The sibling is LOOKED UP in the route table, never re-derived from the
    // kind. This was a ternary chain - game, then home, then a hand-written
    // `/world/` literal as the ELSE - so when `boards` arrived it matched no
    // branch and fell into the else, and both boards pages declared the ROOM as
    // their Hebrew and English alternate. Live for as long as the boards have
    // existed. The pages' own `<link rel="alternate">` tags were correct
    // throughout, so the two artifacts simply disagreed and only the one nobody
    // opens was wrong.
    //
    // A lookup cannot go stale when a page kind is added: an unmatched sibling
    // emits no alternate at all, rather than a confidently wrong one.
    //
    // The key is the page FAMILY - its path with the locale prefix removed -
    // and not a list of discriminator fields. `kind` + `id` was the list, and
    // it was correct until a route kind arrived carrying NEITHER: a category
    // route has no `id`, so `o.id === r.id` was `undefined === undefined` for
    // every category in the locale and `find` returned whichever came first.
    // 16 of 20 category pages named `kids` as their twin in every language,
    // while their own tags were perfect. A field list must be extended by hand
    // each time the route type grows; a path family cannot fall behind it.
    const siblings: { locale: string; path: string }[] = [];
    for (const locale of LOCALES) {
      const sibling = ROUTES.find(
        (o) => familyOf(o.path) === familyOf(r.path) && o.locale === locale && o.indexable,
      );
      if (sibling) siblings.push({ locale, path: sibling.path });
    }
    const alternates = siblings.map(
      (s) =>
        `    <xhtml:link rel="alternate" hreflang="${s.locale}" href="${xml(canonicalUrl(s.path))}"/>`,
    );

    // ...and `x-default`, which answers "we have no page in your language".
    //
    // Google reads the sitemap's cluster and the page's own `<link>` tags as
    // two statements about the same thing, so they must not disagree - and
    // `renderDocument` has always emitted x-default while this did not. It is
    // derived HERE from the same lookup and the same DEFAULT_LOCALE that
    // `renderDocument` uses, rather than pointed at a literal, for the reason
    // the comment above gives about the alternates: a lookup cannot go stale
    // when a page kind or a locale is added, and a page with no default-locale
    // sibling emits nothing rather than something confidently wrong.
    const xDefault = siblings.find((s) => s.locale === DEFAULT_LOCALE);
    if (xDefault) {
      alternates.push(
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${xml(canonicalUrl(xDefault.path))}"/>`,
      );
    }
    // Present only when git could answer honestly. `lastmod.ts` returns an
    // empty map rather than a guess, and an absent field is valid; a field
    // that says every page changed today is a lie Google stops trusting.
    const lastmod = lastmods?.get(r.path);

    // The image extension, for game pages only - they are the pages that have
    // a picture. Google's own guidance is that a sitemap is how it DISCOVERS
    // images it might otherwise miss; it does not promise one will be shown.
    //
    // Keyed on `r.id` and not on the kind alone. A category route is also a
    // route with no `id`, and `art/undefined.svg` is a row that validates, a
    // file that does not exist, and a 404 advertised to every crawler.
    const art = r.kind === "game" && r.id ? [r.id] : [];
    const images = art.map((id) =>
      ["    <image:image>", `      <image:loc>${xml(ORIGIN + artPath(id))}</image:loc>`, "    </image:image>"].join(
        "\n",
      ),
    );

    return [
      "  <url>",
      `    <loc>${xml(canonicalUrl(r.path))}</loc>`,
      ...(lastmod ? [`    <lastmod>${xml(lastmod)}</lastmod>`] : []),
      ...alternates,
      ...images,
      "  </url>",
    ].join("\n");
  });

  // THE PROTOCOL'S OWN CEILINGS, and this is a tripwire rather than a feature.
  //
  // A single sitemap may carry at most 50,000 URLs and 50 MB uncompressed; past
  // either, Google reads the file up to the limit and IGNORES the rest - no
  // error, no warning, and a page count that quietly stops growing. Which is
  // exactly the shape this repo keeps meeting: correct everywhere you look,
  // wrong for a population you are not in.
  //
  // At 4 page locales and 4 rows per game the cliff is around 12,490 games, so
  // nothing here is close. It is written down now because the fix is a sitemap
  // INDEX - several files plus one that lists them - and that is a change worth
  // making deliberately, not the morning somebody notices the index has been
  // flat for a month. When this throws, that is what it is asking for.
  const MAX_URLS = 50_000;
  const MAX_BYTES = 50 * 1024 * 1024;
  if (rows.length > MAX_URLS) {
    throw new Error(
      `sitemap: ${rows.length} URLs, over the ${MAX_URLS} protocol limit. Google reads the ` +
        "first 50,000 and silently ignores the rest - split into a sitemap index.",
    );
  }

  const xmlOut = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" ' +
      'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...rows,
    "</urlset>",
    "",
  ].join("\n");

  const bytes = Buffer.byteLength(xmlOut, "utf8");
  if (bytes > MAX_BYTES) {
    throw new Error(
      `sitemap: ${bytes} B, over the ${MAX_BYTES} B protocol limit - split into a sitemap index.`,
    );
  }
  return xmlOut;
}

/**
 * `llms.txt`.
 *
 * Kept deliberately small and honest. The probe that preceded this work found
 * it is still a proposal that no vendor commits to reading and that crawlers
 * almost never fetch, so it was demoted from a deliverable to twenty lines of
 * plain text. It costs nothing and it is a real index of the site.
 */
export function llmsTxt(games: ReadonlyArray<GameMeta>): string {
  // Both language lines are DERIVED from LOCALES, and that is the whole point of
  // this edit. They were the literals "in Hebrew and English" plus exactly two
  // home links - correct when written, and silently wrong the day Spanish
  // shipped: the one file whose entire job is telling an answer engine what this
  // site IS went on claiming two languages while serving three, and named no
  // Spanish page at all. Nothing could have caught it. It is prose, not a type,
  // so promoting the locale did not red a build, and every gate in this repo was
  // busy asserting that the pages themselves were correct - which they were.
  //
  // Same class as the six two-language constants Spanish killed, arriving one
  // layer further out: a STRING that describes the system rather than a value
  // the system reads back.
  const names = LOCALES.map((l) => ENGLISH_NAME[l]);
  const languages =
    names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];

  return [
    "# Ellaz",
    "",
    `> Free browser games for kids and grown-ups, in ${languages}. No download,`,
    "> no account, no ads, and nothing collected about a child. Every game runs in the",
    "> browser and keeps working offline after one visit.",
    "",
    // One section per language, rather than one English list.
    //
    // It used to be a single list of English URLs, each described by the game's
    // HEBREW title - so the file advertised a third of the site, and described
    // that third in a language the link was not in. Same class as the "in Hebrew
    // and English" sentence above: prose describing the system, going stale
    // silently because no type reads it back.
    //
    // Derived from LOCALES, so a promoted language brings its own section with
    // no edit here. The link text is the game's name IN THAT LANGUAGE, read
    // through `gameName()` from the page prose rather than from `meta.title` -
    // which is what lets this file name a game in a language the bundle does
    // not carry.
    ...LOCALES.flatMap((l) => [
      `## Games (${ENGLISH_NAME[l]})`,
      "",
      ...games.map((m) => `- [${gameName(m.id, l)}](${canonicalUrl(gamePath(m.id, l))})`),
      "",
    ]),
    "## Pages",
    "",
    ...LOCALES.map((l) => `- [Home, ${ENGLISH_NAME[l]}](${canonicalUrl(homePath(l))})`),
    "",
  ].join("\n");
}

/**
 * The IndexNow ownership file.
 *
 * IndexNow verifies write access to the docroot by fetching
 * `https://<host>/<key>.txt` and checking it contains the key. It is public by
 * design - a proof of control, not a secret - so it is emitted like robots.txt
 * rather than hidden. Primary host only: the Pages duplicate is noindex and
 * submits nothing, so a key file there would claim ownership of a site it does
 * not represent.
 */
export const INDEXNOW_KEY = "92410e02f1e99deb9f7c751db9e59068";
export function indexNowKeyFile(): string {
  return `${INDEXNOW_KEY}\n`;
}
