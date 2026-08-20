import type { Category, GameMeta } from "../sdk/types";
import { gameName } from "./gameName";
import type { FaqItem, GameCopy, Locale } from "../content/types";
import { ORIGIN, SITE } from "../content/site";
import { PAGED_CATEGORIES, canonicalUrl, categoryPath, gamePath, homePath } from "./routes";

/**
 * The JSON-LD each page carries.
 *
 * Every value here is DERIVED - from `meta.ts`, from the route table, or from
 * prose the author already wrote for humans. Nothing in this file is a second
 * place to state a fact, which is the only way twenty-one pages of structured
 * data stay true to twenty-one games.
 *
 * On FAQPage: Google restricted FAQ rich results in 2023, so this is not a SERP
 * play. It stays because answer engines parse it cleanly, and because the
 * questions were written as real queries either way.
 */

/**
 * The one node that says WHO published this, and the only one with a stable id.
 *
 * Until 2026-08-11 the publisher was a bare `{name, url}` stub inlined twice per
 * page, with no `@id`, no `logo` and no `sameAs`. That is enough for a human and
 * not enough for a machine: an answer engine deciding whether two pages come
 * from the same publisher, or whether this publisher is the same entity as a
 * GitHub org, has nothing to join on. `@id` is that join, and `sameAs` is what
 * points it at an identity that already exists elsewhere.
 *
 * `logo` is `icon.svg` - the PWA icon, already published and already crawlable.
 * Google's logo guidance asks for a crawlable image of at least 112x112 that
 * reads correctly on a white background, in a format Google Images supports;
 * that list is "BMP, GIF, JPEG, PNG, WebP, SVG, and AVIF", so the SVG qualifies
 * and we do not have to invent a raster nobody else needs.
 *
 * There is deliberately no `aggregateRating` here and there must never be one.
 * We collect nothing about a player, so we have no ratings - and inventing them
 * is both fabrication and a structured-data policy violation.
 */
const ORG_ID = `${ORIGIN}/#org`;

const ORGANIZATION = {
  "@type": "Organization",
  "@id": ORG_ID,
  name: "Ellaz",
  url: `${ORIGIN}/`,
  logo: `${ORIGIN}/icon.svg`,
  description: SITE.en.tagline,
  sameAs: ["https://github.com/Sigmafier/ellaz"],
};

/**
 * What every `publisher` field carries: a reference, not a second copy.
 *
 * Restating the organisation inline is how two descriptions of one entity drift
 * apart - the same reason this file derives everything else instead of letting
 * an author type it. The full node ships once per graph, next to this reference.
 */
const PUBLISHER = { "@id": ORG_ID };

/** Schema genre terms per category. Derived from `meta.category`, never authored. */
const GENRE: Record<string, string[]> = {
  kids: ["Casual", "Educational"],
  learn: ["Educational", "Casual"],
  think: ["Puzzle", "Strategy"],
  speed: ["Action", "Casual"],
  create: ["Casual", "Creative"],
  classics: ["Puzzle", "Board Game"],
};

/** Derived from the declared age band, so a page cannot claim an age the catalog does not. */
function ageRange(meta: GameMeta): string {
  return meta.ageBand === "kids" ? "3-10" : "5-99";
}

function breadcrumb(locale: Locale, meta: GameMeta) {
  const site = SITE[locale];
  // The GROUP is the middle step whenever it has a page of its own, because
  // the visible breadcrumb says so and Google requires the markup to match
  // what a reader sees. Skipped for a group with no page: a `ListItem` whose
  // `item` is a URL this build never wrote is a broken node in the graph, and
  // an item with no `item` at all is worse than one step fewer.
  const items: unknown[] = [
    { "@type": "ListItem", position: 1, name: site.home, item: canonicalUrl(homePath(locale)) },
  ];
  if (PAGED_CATEGORIES.includes(meta.category))
    items.push({
      "@type": "ListItem",
      position: 2,
      name: site.categories[meta.category] ?? "",
      item: canonicalUrl(categoryPath(meta.category, locale)),
    });
  items.push({
    "@type": "ListItem",
    position: items.length + 1,
    name: gameName(meta.id, locale),
    item: canonicalUrl(gamePath(meta.id, locale)),
  });
  return { "@type": "BreadcrumbList", itemListElement: items };
}

export function gameGraph(meta: GameMeta, copy: GameCopy, locale: Locale) {
  const url = canonicalUrl(gamePath(meta.id, locale));
  const graph: unknown[] = [
    {
      "@type": "VideoGame",
      "@id": `${url}#game`,
      name: gameName(meta.id, locale),
      url,
      description: copy.lede,
      inLanguage: locale,
      gamePlatform: ["Web Browser", "Mobile", "Tablet", "Desktop"],
      playMode: "SinglePlayer",
      applicationCategory: "GameApplication",
      operatingSystem: "Any",
      isAccessibleForFree: true,
      isFamilyFriendly: true,
      typicalAgeRange: ageRange(meta),
      genre: GENRE[meta.category] ?? ["Casual"],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "ILS",
        availability: "https://schema.org/InStock",
      },
      publisher: PUBLISHER,
    },
    breadcrumb(locale, meta),
    {
      "@type": "HowTo",
      name: SITE[locale].headings.howToPlay,
      inLanguage: locale,
      step: copy.howToPlay.map((s, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: s.title,
        text: s.body,
      })),
    },
    {
      "@type": "FAQPage",
      inLanguage: locale,
      mainEntity: copy.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    // Last, so the game stays the first node in the graph - but present, because
    // a `publisher: {"@id": ...}` pointing at a node no parser can find in the
    // same document is a dangling reference, which is worse than the inline stub
    // it replaced.
    ORGANIZATION,
  ];
  return { "@context": "https://schema.org", "@graph": graph };
}

export function homeGraph(
  locale: Locale,
  games: ReadonlyArray<GameMeta>,
  copy: { title: string; description: string },
) {
  const url = canonicalUrl(homePath(locale));
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${ORIGIN}/#website`,
        name: "Ellaz",
        url: `${ORIGIN}/`,
        description: copy.description,
        inLanguage: locale,
        publisher: PUBLISHER,
      },
      {
        "@type": "ItemList",
        name: copy.title,
        numberOfItems: games.length,
        itemListElement: games.map((meta, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: gameName(meta.id, locale),
          url: canonicalUrl(gamePath(meta.id, locale)),
        })),
      },
      {
        "@type": "CollectionPage",
        "@id": `${url}#page`,
        url,
        name: copy.title,
        inLanguage: locale,
      },
      ORGANIZATION,
    ],
  };
}

/**
 * A category page: a CollectionPage whose ItemList is the games in the group,
 * plus the FAQ, plus a two-step breadcrumb.
 *
 * Every value comes from the roster or from the copy record - nothing here
 * restates a fact a page could get wrong. `numberOfItems` in particular is
 * `games.length` rather than a number an author typed, which is the same rule
 * that took the roster count off the home page's meta description after it
 * spent a day contradicting the ItemList on its own document.
 */
export function categoryGraph(
  category: Category,
  locale: Locale,
  games: ReadonlyArray<GameMeta>,
  copy: { metaTitle: string; metaDescription: string; h1: string; faq: FaqItem[] },
) {
  const site = SITE[locale];
  const url = canonicalUrl(categoryPath(category, locale));
  const graph: unknown[] = [
    {
      "@type": "CollectionPage",
      "@id": `${url}#page`,
      url,
      name: copy.metaTitle,
      description: copy.metaDescription,
      inLanguage: locale,
      isPartOf: { "@id": `${ORIGIN}/#website` },
      publisher: PUBLISHER,
    },
    {
      "@type": "ItemList",
      name: copy.h1,
      numberOfItems: games.length,
      itemListElement: games.map((meta, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: gameName(meta.id, locale),
        url: canonicalUrl(gamePath(meta.id, locale)),
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: site.home, item: canonicalUrl(homePath(locale)) },
        { "@type": "ListItem", position: 2, name: copy.h1, item: url },
      ],
    },
  ];
  if (copy.faq.length)
    graph.push({
      "@type": "FAQPage",
      mainEntity: copy.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  graph.push(ORGANIZATION);
  return { "@context": "https://schema.org", "@graph": graph };
}

export function worldGraph(locale: Locale, copy: { title: string; description: string }) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: copy.title,
        description: copy.description,
        inLanguage: locale,
        isPartOf: { "@id": `${ORIGIN}/#website` },
        publisher: PUBLISHER,
      },
      // `isPartOf` above stays a deliberate cross-document reference - the
      // `WebSite` node lives on the two home pages and there is no reason to
      // restate it here. The organisation is different: it is what an answer
      // engine attributes a quote to, so every page carries it in full.
      ORGANIZATION,
    ],
  };
}
