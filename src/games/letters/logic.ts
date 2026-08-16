// "First Letter" (אות פותחת) - pure logic.
//
// The game shows a PICTURE and asks which letter its word begins with. The word
// is never shown as text - that would hand over the answer - so the only thing
// language-specific here is which language's word we read the first letter FROM,
// and which alphabet the wrong answers are drawn from.
//
// PURE: no DOM, no React, no timers. Imports go to the DIRECT shared modules
// (`@shared/cast`, `@shared/rng`) and the game's own pure `./words`, never the
// `@shared` barrel and never `@ui`/`@juice`.
import { CAST, type CastItem } from "@shared/cast";
import { shuffle } from "@shared/rng";
import type { ShippedLocale } from "@i18n/locales";
import { SIMPLE } from "./words";

/** Level ids double as reward tiers - the union is identical by design. */
export type LevelId = "easy" | "medium" | "hard";

export interface Level {
  id: LevelId;
  /** How many letters the child chooses between. The brief's example is medium's 3. */
  choices: number;
}

/**
 * Difficulty ramps BOTH axes: the number of letter choices (2 -> 3 -> 4, so the
 * odds of a lucky tap fall) and the breadth of vocabulary (see `poolFor` - the
 * simplest everyday words alone, then broader, then everything).
 */
export const LEVELS: readonly Level[] = [
  { id: "easy", choices: 2 },
  { id: "medium", choices: 3 },
  { id: "hard", choices: 4 },
] as const;

export function levelById(id: LevelId): Level {
  const found = LEVELS.find((l) => l.id === id);
  if (!found) throw new Error(`[ellaz] unknown level ${id}`);
  return found;
}

/** How often an endless run pays a milestone coin. Every fifth correct answer. */
export const MILESTONE_EVERY = 5;

export function isMilestoneRound(round: number): boolean {
  return round > 0 && round % MILESTONE_EVERY === 0;
}

// --- The picture pools, by level ------------------------------------------
//
// Easy is the game's own list of the simplest everyday words (dog, cat, home,
// car, ball). Harder levels add the shared `cast.ts` pictures on top for
// breadth, DEDUPED BY EMOJI so a word that appears in both (ball, apple,
// banana, tree, star) is one picture, not two - and `SIMPLE` goes first, so the
// familiar name/spelling is the one kept.

function unionByEmoji(...lists: readonly (readonly CastItem[])[]): CastItem[] {
  const seen = new Set<string>();
  const out: CastItem[] = [];
  for (const list of lists) {
    for (const item of list) {
      if (!seen.has(item.emoji)) {
        seen.add(item.emoji);
        out.push(item);
      }
    }
  }
  return out;
}

/** Every picture a level can draw. */
export function poolFor(level: Level): readonly CastItem[] {
  if (level.id === "easy") return SIMPLE;
  if (level.id === "medium") {
    return unionByEmoji(SIMPLE, CAST.animals, CAST.fruit, CAST.vehicles, CAST.toys);
  }
  return unionByEmoji(SIMPLE, ...Object.values(CAST));
}

// --- The shuffle bag -------------------------------------------------------
//
// The old selection picked a random picture every round (with replacement, only
// avoiding the immediately-previous one), so the same word recurred constantly.
// Instead the renderer shuffles the whole pool once and deals through it in
// order, so no word repeats until every one has been shown. `refillBag` builds
// each shuffle; the renderer holds the position and calls it again when the bag
// runs out.

/**
 * A freshly shuffled copy of `pool`. When `avoidEmoji` is given (the last
 * picture shown before this reshuffle), the first card is swapped with the
 * second if it would repeat it - so the seam between two passes is never a
 * back-to-back repeat. Non-mutating; `pool` is untouched.
 */
export function refillBag(
  pool: readonly CastItem[],
  rng: () => number = Math.random,
  avoidEmoji?: string,
): CastItem[] {
  const bag = shuffle(pool, rng);
  if (bag.length > 1 && avoidEmoji !== undefined && bag[0].emoji === avoidEmoji) {
    [bag[0], bag[1]] = [bag[1], bag[0]];
  }
  return bag;
}

// --- Alphabets -------------------------------------------------------------
//
// `Record<ShippedLocale, ...>` on purpose: the day a language joins the SHIPPED
// set, this record stops compiling until it is given an alphabet - the same gate
// `cast.ts` carries, rather than a silent English fallback for a language that
// has real letters of its own.
//
// SHIPPED, not PAGE, since 2026-08-16. An alphabet is data a child's device
// downloads; a page is prose nobody downloads. Adding French PAGES demands
// nothing here, and it should not - a French article about this game does not
// imply a French alphabet mode inside it. Adding French to SHIPPED_LOCALES
// does, and reds this line by name.
//
// A first letter is NEVER a Hebrew FINAL form (ך ם ן ף ץ), so those are absent -
// a wrong answer must still be a real letter a child recognises, and a final
// form offered mid-word reads as subtly off. Spanish keeps Ñ as its own letter
// and folds accented vowels onto their base (see `firstLetter`), so the pool is
// A-Z plus Ñ and no accented forms.
export const ALPHABETS: Record<ShippedLocale, readonly string[]> = {
  he: "אבגדהוזחטיכלמנסעפצקרשת".split(""),
  en: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  es: "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split(""),
};

/**
 * How a word's first letter is derived, per script. Data-driven rather than a
 * `locale === "he"` branch, so it reds on a promoted language by name and never
 * measures a new script against the wrong rule.
 *
 * - Latin (en/es): the first character, diacritic stripped (NFD) and uppercased,
 *   so "árbol" and "avión" both resolve to A - the letter the pool actually holds.
 *   None of the words begin with a Spanish digraph (ch/ll) other than "llave",
 *   which resolves to its first letter L - the honest, learnable answer for a child.
 * - Hebrew: the first character as written. The words carry no nikud, so `[0]` is
 *   always a base letter.
 */
function latinInitial(first: string): string {
  return first.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase();
}

const DERIVE: Record<ShippedLocale, (first: string) => string> = {
  he: (first) => first,
  en: latinInitial,
  es: latinInitial,
};

export function firstLetter(word: string, lang: ShippedLocale): string {
  const first = [...word.trim()][0] ?? "";
  return DERIVE[lang](first);
}

// --- Which languages the in-game toggle offers -----------------------------
//
// The operator's rule: a Hebrew interface can practise all three scripts, every
// other interface gets the two Latin ones. Games only ever receive a locale
// narrowed to a shipped locale (he/en/es), so "the interface is Hebrew" is
// exactly "the shipped locale is he". Data-driven, so it reds when the shipped
// set grows and never reads as a translation branch.
const EXTRA_CONTENT: Record<ShippedLocale, readonly ShippedLocale[]> = {
  he: ["en", "es"],
  en: ["es"],
  es: ["en"],
};

/** The content languages to offer, the player's own first (the default). */
export function contentLangOptions(current: ShippedLocale): readonly ShippedLocale[] {
  return [current, ...EXTRA_CONTENT[current]];
}

// --- Building a round ------------------------------------------------------

export interface Round {
  /** The correct first letter, in `lang`'s alphabet. */
  correct: string;
  /** The correct letter plus `choices - 1` distractors, shuffled. */
  options: string[];
}

/**
 * The letters shown for one picture. The correct letter is always present, the
 * distractors are distinct real letters of the same alphabet, and it never
 * appears among them.
 */
export function buildRound(
  lang: ShippedLocale,
  item: CastItem,
  choices: number,
  rng: () => number = Math.random,
): Round {
  const correct = firstLetter(item[lang], lang);
  const pool = ALPHABETS[lang].filter((l) => l !== correct);
  const distractors = shuffle(pool, rng).slice(0, Math.max(0, choices - 1));
  return { correct, options: shuffle([correct, ...distractors], rng) };
}
