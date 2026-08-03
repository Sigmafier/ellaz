import type { GameMeta } from "../sdk/types";
import type { GameCopy, Locale } from "../content/types";
import { ORIGIN, SITE } from "../content/site";
import { canonicalUrl, gamePath, homePath } from "./routes";

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

const PUBLISHER = {
  "@type": "Organization",
  name: "Ellaz",
  url: `${ORIGIN}/`,
};

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
  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: site.home, item: canonicalUrl(homePath(locale)) },
      {
        "@type": "ListItem",
        position: 2,
        name: meta.title[locale],
        item: canonicalUrl(gamePath(meta.id, locale)),
      },
    ],
  };
}

export function gameGraph(meta: GameMeta, copy: GameCopy, locale: Locale) {
  const url = canonicalUrl(gamePath(meta.id, locale));
  const graph: unknown[] = [
    {
      "@type": "VideoGame",
      "@id": `${url}#game`,
      name: meta.title[locale],
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
          name: meta.title[locale],
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
    ],
  };
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
      },
    ],
  };
}
