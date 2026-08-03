import type { GameMeta } from "../sdk/types";
import { ORIGIN } from "../content/site";
import { ROUTES, canonicalUrl, gamePath, homePath } from "./routes";
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

export function sitemapXml(): string {
  const indexable = ROUTES.filter((r) => r.indexable);
  const rows = indexable.map((r) => {
    // Every page declares both languages, including itself. That self-reference
    // is required by the spec, not an oversight.
    const alternates =
      r.kind === "notFound"
        ? []
        : (["he", "en"] as const).map((locale) => {
            const path =
              r.kind === "game" && r.id
                ? gamePath(r.id, locale)
                : r.kind === "home"
                  ? homePath(locale)
                  : `${locale === "he" ? "" : "/en"}/world/`;
            return `    <xhtml:link rel="alternate" hreflang="${locale}" href="${xml(canonicalUrl(path))}"/>`;
          });
    return [
      "  <url>",
      `    <loc>${xml(canonicalUrl(r.path))}</loc>`,
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
  return [
    "# Ellaz",
    "",
    "> Free browser games for kids and grown-ups, in Hebrew and English. No download,",
    "> no account, no ads, and nothing collected about a child. Every game runs in the",
    "> browser and keeps working offline after one visit.",
    "",
    "## Games",
    "",
    ...games.map((m) => `- [${m.title.en}](${canonicalUrl(gamePath(m.id, "en"))}): ${m.title.he}`),
    "",
    "## Pages",
    "",
    `- [Home, Hebrew](${canonicalUrl(homePath("he"))})`,
    `- [Home, English](${canonicalUrl(homePath("en"))})`,
    "",
  ].join("\n");
}
