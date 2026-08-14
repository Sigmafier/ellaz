// "First Letter" (אות פותחת) - pure logic.
//
// The game shows a PICTURE and asks which letter its word begins with. The word
// is never shown as text - that would hand over the answer - so the only thing
// language-specific here is which language's word we read the first letter FROM,
// and which alphabet the wrong answers are drawn from.
//
// PURE: no DOM, no React, no timers. Imports go to the DIRECT shared modules
// (`@shared/cast`, `@shared/rng`) and the i18n LEAF (`@i18n/locales`, which
// imports nothing), never the `@shared` barrel and never `@ui`/`@juice`.
import { CAST_THEMES, castOf, type CastItem, type CastTheme } from "@shared/cast";
import { pick, shuffle } from "@shared/rng";
import type { PageLocale } from "@i18n/locales";

/** Level ids double as reward tiers - the union is identical by design. */
export type LevelId = "easy" | "medium" | "hard";

export interface Level {
  id: LevelId;
  /** How many letters the child chooses between. The brief's example is medium's 3. */
  choices: number;
  /** Which cast themes the pictures are drawn from. Wider = harder, by vocabulary. */
  themes: readonly CastTheme[];
}

/**
 * Difficulty ramps BOTH axes the operator asked for: the number of letter
 * choices (2 -> 3 -> 4, so the odds of a lucky tap fall) and the breadth of
 * vocabulary (the two most familiar themes -> four -> all six).
 */
export const LEVELS: readonly Level[] = [
  { id: "easy", choices: 2, themes: ["animals", "fruit"] },
  { id: "medium", choices: 3, themes: ["animals", "fruit", "vehicles", "toys"] },
  { id: "hard", choices: 4, themes: CAST_THEMES },
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

// --- Alphabets -------------------------------------------------------------
//
// `Record<PageLocale, ...>` on purpose: the day a fourth language is promoted,
// this record stops compiling until it is given an alphabet - the same gate
// `cast.ts` and the content files carry, rather than a silent English fallback
// for a language that has real letters of its own.
//
// A first letter is NEVER a Hebrew FINAL form (ך ם ן ף ץ), so those are absent -
// a wrong answer must still be a real letter a child recognises, and a final
// form offered mid-word reads as subtly off. Spanish keeps Ñ as its own letter
// and folds accented vowels onto their base (see `firstLetter`), so the pool is
// A-Z plus Ñ and no accented forms.
export const ALPHABETS: Record<PageLocale, readonly string[]> = {
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
 *   None of the cast words begin with a Spanish digraph (ch/ll); if one is ever
 *   added it still resolves to its first letter, which is the honest, learnable
 *   answer for a child.
 * - Hebrew: the first character as written. Cast words carry no nikud and the
 *   geresh in ג'ירפה / צ'יפס sits AFTER the first letter, so `[0]` is a base letter.
 */
function latinInitial(first: string): string {
  return first.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase();
}

const DERIVE: Record<PageLocale, (first: string) => string> = {
  he: (first) => first,
  en: latinInitial,
  es: latinInitial,
};

export function firstLetter(word: string, lang: PageLocale): string {
  const first = [...word.trim()][0] ?? "";
  return DERIVE[lang](first);
}

// --- Which languages the in-game toggle offers -----------------------------
//
// The operator's rule: a Hebrew interface can practise all three scripts, every
// other interface gets the two Latin ones. Games only ever receive a locale
// narrowed to a page locale (he/en/es), so "the interface is Hebrew" is exactly
// "the page locale is he". Data-driven, so it reds on promotion and never reads
// as a translation branch.
const EXTRA_CONTENT: Record<PageLocale, readonly PageLocale[]> = {
  he: ["en", "es"],
  en: ["es"],
  es: ["en"],
};

/** The content languages to offer, the player's own first (the default). */
export function contentLangOptions(current: PageLocale): readonly PageLocale[] {
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
  lang: PageLocale,
  item: CastItem,
  choices: number,
  rng: () => number = Math.random,
): Round {
  const correct = firstLetter(item[lang], lang);
  const pool = ALPHABETS[lang].filter((l) => l !== correct);
  const distractors = shuffle(pool, rng).slice(0, Math.max(0, choices - 1));
  return { correct, options: shuffle([correct, ...distractors], rng) };
}

/** Every picture a level can draw, across all of its themes. */
export function poolFor(level: Level): readonly CastItem[] {
  return level.themes.flatMap((theme) => castOf(theme));
}

/**
 * A picture from the pool. `avoidEmoji` keeps the same picture from appearing
 * twice in a row; if it happens to be the whole (one-item) pool it is ignored
 * rather than looping forever - a repeat beats a hang.
 */
export function pickItem(
  pool: readonly CastItem[],
  rng: () => number = Math.random,
  avoidEmoji?: string,
): CastItem {
  const eligible = avoidEmoji ? pool.filter((i) => i.emoji !== avoidEmoji) : pool;
  return pick(eligible.length > 0 ? eligible : pool, rng);
}

export interface Challenge extends Round {
  item: CastItem;
}

/** One whole turn: a picture plus its letter choices. */
export function nextChallenge(
  level: Level,
  lang: PageLocale,
  rng: () => number = Math.random,
  avoidEmoji?: string,
): Challenge {
  const item = pickItem(poolFor(level), rng, avoidEmoji);
  return { item, ...buildRound(lang, item, level.choices, rng) };
}
