/**
 * The form every game page fills in, once per language.
 *
 * The split that makes this safe is AUTHORED vs DERIVED. Everything in here is
 * authored prose. Everything a page could get WRONG about the game - the
 * difficulty tiers, what the record measures, whether it works offline - is
 * read from `meta.ts`, the game's own `DifficultySelector` options and
 * `sdk/score.ts` at render time, so a writer cannot claim something the game
 * does not do. See `.claude/rules/game-content-template.md`.
 *
 * This module imports one thing, and only one: the list of languages that have
 * prose. `no-app-imports.test.ts` keeps the app from importing this module
 * back - which is what keeps ~200 KB of prose out of the precached shell. The
 * arrow the other way is safe and deliberate: `src/i18n/locales.ts` is a leaf
 * with zero imports of its own, so reading it here cannot pull anything into
 * the build-time graph, and it means the compiler enforces one answer to
 * "which languages have pages" instead of two lists that can disagree.
 */

import type { PageLocale } from "../i18n/locales";

export type { PageLocale };

/**
 * The old name for `PageLocale`, kept while the build-time modules still say
 * `Locale`. It is an ALIAS, not a second type: promoting a language widens
 * both at once, so a stale name cannot become a stale definition.
 */
export type Locale = PageLocale;

/** A question phrased the way somebody would actually type it into a search box. */
export interface FaqItem {
  q: string;
  a: string;
}

/** A heading plus its paragraph. Used by tips, teaches, ages, together, howToPlay. */
export interface Titled {
  title: string;
  body: string;
}

/**
 * Where a number in the prose came from.
 *
 * GEO research says statistics are one of the two biggest levers for getting
 * quoted by an answer engine. `quality/no-mock-data.md` says never invent one.
 * Both hold only if every quoted figure names a script that reproduces it, so
 * `source` is a repo-relative path and `content.test.ts` asserts the file is
 * really there. A statistic you cannot re-derive is a fabrication with a
 * decimal point.
 *
 * The first draft of the memory page said "ten pairs in under twenty-eight
 * moves is already something". Nothing produced that number. This field exists
 * so the next one cannot happen quietly.
 */
export interface Provenance {
  /** The claim as it appears in the copy, near enough to grep for. */
  claim: string;
  /** Repo-relative path to the script that derives it, e.g. "scripts/sim/memory-moves.mjs". */
  source: string;
}

/** One game's prose, in one language. */
export interface GameCopy {
  /** <= 60 chars. Becomes <title> and og:title. */
  metaTitle: string;
  /** 50-160 chars. Becomes the meta description. */
  metaDescription: string;
  /**
   * The answer, first, in one or two sentences. This is the paragraph under the
   * H1, the og:description, and the thing an answer engine lifts, so it has to
   * survive being read completely alone.
   */
  lede: string;
  /** The article. Deliberately uneven - see `voice.ts`. */
  body: string[];
  howToPlay: Titled[];
  /** Strategy, peer to peer. The only section that is ours rather than a fact about the game. */
  tips: Titled[];
  /** Parent-facing: what playing this actually practises. */
  teaches: Titled[];
  ages: Titled[];
  accessibility: string;
  /** Ways to play it with a grown-up. */
  together: Titled[];
  faq: FaqItem[];
  /** Internal use only - picks related games. Never emitted as a meta keywords tag. */
  keywords: string[];
}

export interface GameContent {
  /** Must match a `meta.id` in the catalog. */
  id: string;
  /**
   * One `GameCopy` per language that HAS PAGES - and the `Record` is the whole
   * anti-penalty guarantee, not a formatting choice.
   *
   * Google counts a locale page whose body is not translated as a DUPLICATE:
   * "Localized versions of a page are only considered duplicates if the main
   * content of the page remains untranslated." So a language must arrive with
   * its prose or not arrive at all. Keyed this way, adding one to
   * `PAGE_LOCALES` before somebody has written it is a red build in all 23
   * content files - not a lint warning, not a convention a reviewer can miss,
   * and not a script that can be wrong about what it scanned.
   *
   * Hebrew is canonical and is written first. Everything after it is written
   * NATIVELY rather than translated: a translation carries the source
   * language's rhythm, and that rhythm is exactly what reads as machine-made,
   * so the versions may use different examples and a different joke.
   *
   * NESTED under `copy` rather than sitting at the top level beside `id`,
   * which looks like ceremony and is not. Intersecting the metadata with
   * `Record<PageLocale, GameCopy>` would give the same guarantee today and
   * detonate the day somebody promotes INDONESIAN - its locale code is `id`,
   * which collides with the `id` field above and reds all 23 files with an
   * error about `string & GameCopy` that names neither language nor locale.
   * A namespace cannot collide with a locale code, so it never has to.
   */
  copy: Record<PageLocale, GameCopy>;
  /** Every statistic the prose quotes, and the script that derives it. */
  provenance: Provenance[];
}
