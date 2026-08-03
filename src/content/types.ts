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
 * This module imports nothing. It is data, not code, and
 * `no-app-imports.test.ts` keeps the app from importing it back - which is what
 * keeps ~200 KB of prose out of the precached shell.
 */

export type Locale = "he" | "en";

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
  /** Hebrew is canonical and is written first. */
  he: GameCopy;
  /**
   * English, written NATIVELY rather than translated. A translation carries the
   * source language's rhythm, and that rhythm is exactly what reads as machine
   * made - so the two pages may use different examples and a different joke.
   */
  en: GameCopy;
  /** Every statistic the prose quotes, and the script that derives it. */
  provenance: Provenance[];
}
