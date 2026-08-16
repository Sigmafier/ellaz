/**
 * The locked vocabulary of a language, and the words it must never use.
 * ===========================================================================
 *
 * WHY THIS IS THE FIRST THING A NEW LANGUAGE GETS.
 *
 * There is no native reviewer for the languages arriving after Spanish. That is
 * a stated constraint rather than an oversight, and it changes what "careful"
 * means: the goal stops being "verify 31,000 words" - which nobody here can do -
 * and becomes "make the words that appear HUNDREDS of times certainly right".
 *
 * Across 29 pages the same forty-odd terms recur on every one: game, free,
 * level, record, browser, offline, no account, tap, phone, child. Get those
 * right and the most-repeated, most-visible vocabulary on the whole site is
 * correct even if some sentence somewhere is stiff. Forty terms can be checked
 * against a dictionary by somebody who does not speak the language. Thirty-one
 * thousand words cannot.
 *
 * So this file is deliberately small, deliberately boring, and deliberately the
 * only part of a new language that gets human-grade scrutiny.
 *
 * `avoid` is the half that does the work. A generator reaching for a synonym is
 * not making an error a fluency check would catch - "navigateur" and "browser"
 * are both intelligible - it is drifting, and drift across 29 pages is what
 * makes a site read as machine-assembled. Anglicisms are listed first because
 * they are what an English-trained generator produces when it is tired.
 *
 * KEYED BY A PLAIN STRING, not by `PageLocale`, and that is the staging this
 * whole approach needs: a language's glossary must exist BEFORE the language is
 * promoted, because it is the input its prose is written against. Keyed by
 * `PageLocale` it could not be written until the day it was already needed.
 */

export interface Term {
  /** What the concept is, for the writer's brief. Never emitted. */
  concept: string;
  /** The one word this language uses for it, everywhere. */
  term: string;
  /** Words that must never appear instead. Anglicisms and near-synonyms. */
  avoid?: readonly string[];
}

export type Glossary = readonly Term[];

/**
 * French.
 *
 * Chosen as the first unreviewed language because it is the lowest-risk of the
 * eight: enormous training representation, no new script, no shaping, and the
 * card rasteriser already covers its diacritics. If the method does not hold
 * here it holds nowhere, which is the point of going first.
 */
export const FR: Glossary = [
  // --- the platform promises, which every page repeats -------------------
  { concept: "game", term: "jeu" },
  { concept: "games (plural)", term: "jeux" },
  { concept: "free of charge", term: "gratuit", avoid: ["free", "sans frais"] },
  { concept: "browser", term: "navigateur", avoid: ["browser"] },
  { concept: "in the browser", term: "dans le navigateur" },
  { concept: "offline", term: "hors ligne", avoid: ["offline", "hors-ligne"] },
  { concept: "no account", term: "sans compte", avoid: ["sans inscription"] },
  { concept: "no download", term: "sans téléchargement", avoid: ["sans download"] },
  { concept: "advertising", term: "publicité", avoid: ["pub", "annonces", "ads"] },
  { concept: "device", term: "appareil", avoid: ["device"] },
  // The noun forms only. Bare "mobile" is an ordinary French adjective - "une
  // cible mobile" is correct prose about a moving target, and forbidding it
  // reds a good page for a word that has nothing to do with telephones. Same
  // shape as the "le monde" / "tout le monde" collision this file already
  // dropped once: a forbidden phrase must be one that cannot occur innocently.
  { concept: "phone", term: "téléphone", avoid: ["un mobile", "le mobile", "son mobile", "smartphone"] },
  { concept: "tablet", term: "tablette" },
  { concept: "computer", term: "ordinateur", avoid: ["PC"] },
  { concept: "screen", term: "écran" },

  // --- who is playing ----------------------------------------------------
  { concept: "child", term: "enfant", avoid: ["kid", "gamin"] },
  { concept: "children", term: "enfants", avoid: ["kids"] },
  { concept: "player", term: "joueur" },
  { concept: "grown-up / adult", term: "adulte" },

  // --- the chrome every game shares --------------------------------------
  { concept: "level (difficulty tier)", term: "niveau", avoid: ["level"] },
  { concept: "difficulty", term: "difficulté" },
  { concept: "easy", term: "facile" },
  { concept: "medium", term: "moyen" },
  { concept: "hard", term: "difficile" },
  { concept: "personal best / record", term: "record", avoid: ["meilleur score", "high score"] },
  { concept: "score", term: "score" },
  { concept: "time (as a measurement)", term: "temps" },
  { concept: "move (a single play)", term: "coup", avoid: ["mouvement"] },
  { concept: "turn", term: "tour" },
  { concept: "to win", term: "gagner" },
  { concept: "to play", term: "jouer" },
  { concept: "to tap / press", term: "appuyer", avoid: ["taper", "cliquer sur l'écran"] },
  { concept: "to drag", term: "faire glisser", avoid: ["draguer", "drag"] },

  // --- the furniture of the games themselves -----------------------------
  { concept: "board / grid", term: "grille", avoid: ["board", "tableau"] },
  { concept: "card", term: "carte" },
  // "case" and not "pièce": `pièce` is already the coin below, and it is also
  // the ordinary French word for a room. One syllable serving three concepts
  // is exactly the ambiguity a locked vocabulary exists to remove.
  { concept: "tile / grid cell", term: "case", avoid: ["tuile"] },
  { concept: "colour", term: "couleur" },
  { concept: "letter", term: "lettre" },
  { concept: "number (digit)", term: "chiffre" },
  { concept: "shape", term: "forme" },
  { concept: "animal", term: "animal" },

  // --- the rewards economy ----------------------------------------------
  // No `avoid` here, and that is the deliberate half. The obvious entry is
  // `avoid: ["coin"]`, and it was here until 29 pages existed to test it
  // against: "coin" is the ordinary French word for a CORNER, which every
  // grid game's tips reach for ("gardez la plus grosse case dans un coin").
  // An English "coin" leaking into French prose is close to unheard of, so
  // the rule reds correct pages far more often than it catches anything, and
  // a gate that reds correct pages is a gate somebody switches off. Third
  // instance of this in this file after "le monde" and "mobile": a forbidden
  // phrase must be one that cannot occur innocently. The locked term still
  // does its job - it tells a writer to say "pièce d'or" rather than "pièce".
  { concept: "coin", term: "pièce d'or" },
  { concept: "star", term: "étoile" },
  // No `avoid` here, and that is a finding rather than a gap. It forbade
  // "le monde", which collides with "tout le monde" - "everyone" - one of the
  // most common phrases in French. Every page mentioning everybody would have
  // failed. A forbidden phrase has to be one that cannot occur innocently, and
  // a two-word fragment of ordinary speech never is.
  { concept: "the room (the World screen)", term: "chambre" },
];

/**
 * Every language with a locked vocabulary, promoted or not.
 *
 * A plain record so a glossary can land before its language does - the prose is
 * written AGAINST this, so it has to exist first.
 */
export const GLOSSARY: Record<string, Glossary> = { fr: FR };

/** Word-boundary match, so "coin" does not fire inside "rejoindre". */
function usesWord(haystack: string, word: string): boolean {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}])${esc}([^\\p{L}]|$)`, "iu").test(haystack);
}

/**
 * Which forbidden words this text uses, and what to use instead.
 *
 * Lives beside the data rather than in the test, so the authoring brief, the
 * page gate and the unit tests all ask the same function. A second matcher is
 * how a page passes one check and fails another for no visible reason.
 */
export function violations(text: string, glossary: Glossary): string[] {
  const out: string[] = [];
  for (const t of glossary) {
    for (const bad of t.avoid ?? []) {
      if (usesWord(text, bad)) out.push(`"${bad}" -> use "${t.term}" (${t.concept})`);
    }
  }
  return out;
}
