import type { GameMeta } from "../sdk/types";
import { gameName } from "./gameName";
import { ORIGIN } from "../content/site";
import { ENGLISH_NAME } from "../i18n/locales";
import { LOCALES, ROUTES, canonicalUrl, gamePath, homePath } from "./routes";
import { escapeHtml } from "./html";

/**
 * `robots.txt`, `sitemap.xml` and `llms.txt`.
 *
 * These are EMITTED rather than dropped in `public/`, because `public/` ships
 * verbatim to both hosts and the two hosts need opposite files: Hostinger is
 * the real site, and the GitHub Pages copy is a duplicate that must ask not to
 * be indexed at all. One `public/robots.txt` would be wrong on one of them.
 */

/** Crawlers that fetch a page in order to CITE it in an answer. */
const CITATION_BOTS = [
  "OAI-SearchBot",
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
    const alternates = LOCALES
      .map((locale) => {
        const sibling = ROUTES.find(
          (o) => o.kind === r.kind && o.id === r.id && o.locale === locale && o.indexable,
        );
        if (!sibling) return null;
        return `    <xhtml:link rel="alternate" hreflang="${locale}" href="${xml(canonicalUrl(sibling.path))}"/>`;
      })
      .filter((line): line is string => line !== null);
    // Present only when git could answer honestly. `lastmod.ts` returns an
    // empty map rather than a guess, and an absent field is valid; a field
    // that says every page changed today is a lie Google stops trusting.
    const lastmod = lastmods?.get(r.path);
    return [
      "  <url>",
      `    <loc>${xml(canonicalUrl(r.path))}</loc>`,
      ...(lastmod ? [`    <lastmod>${xml(lastmod)}</lastmod>`] : []),
      ...alternates,
      "  </url>",
    ].join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...rows,
    "</urlset>",
    "",
  ].join("\n");
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
