import { CONTENT } from "../content/index";
import { GAMES, metaFor } from "../portal/games";
import { directionFor } from "../sdk/score";
import type { GameMeta } from "../sdk/types";

/**
 * Everything true about a game, in no language at all.
 * ===========================================================================
 *
 * WHY THIS EXISTS, and it is the whole method rather than a convenience.
 *
 * A page in a new language must never be written from the English page. Two
 * reasons, and the second is the one that decides whether this site is allowed
 * to have eleven languages:
 *
 *   1. Google counts a locale page whose main content is not genuinely
 *      translated as a DUPLICATE. Writing from a source page produces prose
 *      that carries the source language's rhythm and sentence order - which is
 *      exactly what reads as machine-made, and exactly what that rule names.
 *   2. Translation drift lives in the gap between a source sentence and a
 *      target sentence. Remove the source sentence and the gap does not exist.
 *      Two pages written from the same FACTS share facts; two pages written
 *      from each other share structure, and structure is what a duplicate is.
 *
 * So this module is the input a writer is handed instead. It carries the
 * numbers, the levels, the units and the platform promises - every claim a
 * page could get WRONG - and not one sentence of prose in any language.
 *
 * It is the same doctrine `game-content-template.md` already states, moved one
 * step earlier: authors write prose, code supplies facts. Until now "code
 * supplies facts" happened at RENDER time, so a writer could still invent a
 * claim in their own words and only the provenance rule caught it. Generating
 * from this means the facts arrive before the first sentence does.
 *
 * WHAT IT DELIBERATELY DOES NOT CARRY: the English lede, the English body, any
 * example, any joke, any section order. A generator handed those would produce
 * a translation no matter what it was told.
 */

/** A number the prose is allowed to quote, and the script that derives it. */
export interface FactClaim {
  claim: string;
  source: string;
}

export interface FactSheet {
  id: string;
  emoji: string;
  /** "kids" games must be tap-completable and need no reading. */
  ageBand: GameMeta["ageBand"];
  category: GameMeta["category"];
  orientation: GameMeta["orientation"];
  /** Whether a record is kept, what it measures, and which way is better. */
  record: { unit: GameMeta["scoreUnit"]; better: "higher" | "lower" } | null;
  /**
   * The derived statistics, verbatim from `provenance`.
   *
   * Shared across every language on purpose. A statistic is the one part of a
   * page that is genuinely ours rather than a description of a common game, it
   * is what an answer engine lifts, and it must be the SAME number in French
   * as in English - so it is a fact here rather than something each writer
   * reaches for independently.
   */
  claims: readonly FactClaim[];
  /** True of every game, stated once so no page has to remember them. */
  platform: readonly string[];
}

/**
 * The promises this site makes, in one place.
 *
 * Written as neutral English NOTES for a writer to express in their own
 * language, never as sentences to translate. "no account" is a fact; "You
 * never need an account" is prose, and prose here would come back as the same
 * sentence in eleven languages.
 */
const PLATFORM: readonly string[] = [
  "free, and free of charge permanently",
  "runs in the browser, nothing to download or install",
  "no account, no sign-up, no email",
  "no ads",
  "nothing is collected about a child",
  "works offline after the first visit",
  "plays on a phone, a tablet and a computer",
  "the record is kept on the device itself",
];

export function factSheetFor(id: string): FactSheet {
  const meta = metaFor(id);
  if (!meta) throw new Error(`factSheetFor: "${id}" is not in the roster`);
  const content = CONTENT[id];
  if (!content) throw new Error(`factSheetFor: "${id}" has no content module`);

  return {
    id: meta.id,
    emoji: meta.emoji,
    ageBand: meta.ageBand,
    category: meta.category,
    orientation: meta.orientation,
    // Read through `directionFor` rather than restated, so a page can never
    // claim that a slow time is a good one. `score.ts` owns that answer and
    // deliberately takes no `direction` argument from anybody.
    record: meta.scoreUnit
      ? { unit: meta.scoreUnit, better: directionFor(meta.scoreUnit) === "high" ? "higher" : "lower" }
      : null,
    claims: content.provenance,
    platform: PLATFORM,
  };
}

/** Every game, in roster order. */
export function allFactSheets(): FactSheet[] {
  return GAMES.map((m) => factSheetFor(m.id));
}

/**
 * The fact sheet as a writer's brief.
 *
 * Plain text and English LABELS, because it is addressed to whoever or whatever
 * is composing the page - not to a reader. The labels being English is the
 * point at which somebody will be tempted to also put English PROSE here, and
 * that is the line: a label names a field, a sentence supplies a rhythm.
 */
export function renderFactSheet(sheet: FactSheet): string {
  const lines = [
    `GAME: ${sheet.id}  ${sheet.emoji}`,
    `audience: ${sheet.ageBand === "kids" ? "young children - no reading required, tap-completable" : "all ages"}`,
    `category: ${sheet.category}`,
    `orientation: ${sheet.orientation}`,
    sheet.record
      ? `record: ${sheet.record.unit}, ${sheet.record.better} is better`
      : `record: none is kept for this game`,
    "",
    "NUMBERS THIS PAGE MAY QUOTE (and nothing else):",
    ...(sheet.claims.length
      ? sheet.claims.map((c) => `  - ${c.claim}   [${c.source}]`)
      : ["  - none derived yet; quote no statistic"]),
    "",
    "ALWAYS TRUE, express in your own words:",
    ...sheet.platform.map((p) => `  - ${p}`),
  ];
  return lines.join("\n");
}
