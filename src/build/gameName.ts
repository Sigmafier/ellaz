import { CONTENT } from "../content/index";
import type { PageLocale } from "../i18n/locales";

/**
 * A game's name, in the language of the page being written.
 *
 * ONE function, because ten call sites reading the same fact ten ways is how a
 * breadcrumb, an `h1` and a share card end up disagreeing about what a game is
 * called. The heading, the crumb, the header bar, the related-game cards, three
 * JSON-LD nodes, the share card, the home grid and llms.txt all come through
 * here.
 *
 * WHY NOT `meta.title[locale]`, which is where all ten used to read it.
 *
 * Because `meta.ts` is imported STATICALLY by the roster so the home grid can
 * render without pulling in game code - so every name on it ships to every
 * child on their first visit. Keyed by page language, a new page language cost
 * the bundle 29 more strings before a word of prose was written: measured at
 * +3,351 B gz to reach eleven languages, against ~600 B of headroom.
 *
 * `src/content` is build-time only and `no-app-imports.test.ts` keeps it that
 * way, so a name read here is shipped to nobody. That is precisely what lets a
 * PAGE exist in a language the BUNDLE has never heard of, which is the whole
 * point of the 2026-08-16 split.
 *
 * It THROWS rather than falling back to English or to the id. A page is emitted
 * once, by a build that could have stopped: the alternative to stopping is a
 * French page whose heading silently reads "Snake" in English, or "undefined",
 * and nothing downstream can tell either from a real name. `content.test.ts`
 * already refuses a game with no page at all, so reaching this throw means the
 * prose exists and the name inside it does not.
 */
export function gameName(id: string, locale: PageLocale): string {
  const content = CONTENT[id];
  if (!content) {
    throw new Error(
      `gameName: no content for "${id}". Every catalogued game needs ` +
        `src/content/games/${id}.ts - see content.test.ts.`,
    );
  }
  const name = content.copy[locale]?.name;
  if (!name) {
    throw new Error(
      `gameName: "${id}" has no name in "${locale}". Add \`name\` to its ${locale} copy - ` +
        `it is the noun a heading, a breadcrumb and a share card all use, and there is no ` +
        `honest way to derive it from metaTitle.`,
    );
  }
  return name;
}
