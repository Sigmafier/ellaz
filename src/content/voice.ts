/**
 * The voice gate: the measurable half of "does this read like a person".
 *
 * Written after auditing our own first draft, which was accurate, unpadded, had
 * zero stock connectors, and still read as machine-made. The reason was not
 * vocabulary. Its five body paragraphs were 57, 53, 50, 56 and 54 words long -
 * a 5% spread, where human prose runs 30 to 60. Uniformity is the tell, and
 * uniformity is a number, so it can be a build gate.
 *
 * What this file CANNOT check, and never will: whether the admission is true,
 * whether a statistic was derived or invented, and whether the thing actually
 * sounds like us. Those stay a human read on every pilot. The gate exists to
 * stop the failures a human read reliably misses - and it does miss them: the
 * rewrite that produced this file broke its own rule-of-three limit three times
 * while I was actively trying to follow it.
 *
 * Pure functions, no imports beyond the types. Runs in node, in vitest, and at
 * build time.
 */

import type { GameCopy, Locale, PageLocale } from "./types";

/* ------------------------------------------------------------------ limits */

/**
 * Standard deviation over mean of body-paragraph word counts. Our failing draft
 * measured 0.05; the rewrite measures 0.40. 0.25 is a floor, not a target -
 * clearing it by an inch still reads even.
 */
export const MIN_PARAGRAPH_SPREAD = 0.25;

/** A sentence this short is a fragment, and prose without any reads assembled. */
export const SHORT_SENTENCE_WORDS = 6;
export const MIN_SHORT_SENTENCES = 3;

/** One rule-of-three per page is rhetoric. Three is a rhythm, and it is audible. */
export const MAX_RULE_OF_THREE = 1;

/** An answer engine lifts "9.2" and drops "nine point two". */
export const MIN_DIGIT_FACTS = 4;

export const MIN_WORDS = 600;
export const MAX_WORDS = 1400;

/* ------------------------------------------------------------ banned lists */

/**
 * Hebrew: the connectors an Israeli reader flags as templated, plus the stock
 * marketing phrases. Matched as plain substrings - Hebrew letters are not `\w`
 * in JavaScript, so `\b` does not mean what it appears to mean and would
 * silently match nothing.
 */
export const BANNED_HE = [
  "בנוסף לכך",
  "יתרה מזאת",
  "יתרה מכך",
  "לסיכום",
  "חשוב לציין",
  "יש לציין",
  "בנקודה זו",
  "כמו כן",
  "בסופו של דבר",
  "בעולם של היום",
  "בעידן הדיגיטלי",
  "אין ספק ש",
  "חוויה בלתי נשכחת",
  "פתרון מושלם",
  "מגוון רחב",
  "ברמה הגבוהה ביותר",
  "כלי חיוני",
] as const;

/**
 * English: the 2026 tell vocabulary, plus GOV.UK's banned list where it is
 * plausible in game copy. GOV.UK mandates a replacement for each of its own -
 * utilise becomes use, facilitate becomes a specific verb - which is the reason
 * their list works: it is arguable, and a list you can argue with is a list
 * people follow.
 */
export const BANNED_EN = [
  "delve",
  "tapestry",
  "testament to",
  "elevate",
  "leverage",
  "utilise",
  "utilize",
  "facilitate",
  "seamless",
  "robust",
  "comprehensive",
  "harness",
  "realm",
  "beacon",
  "in today's",
  "in a world where",
  "it is important to note",
  "it's important to note",
  "moreover",
  "furthermore",
  "in conclusion",
  "at its core",
  "dive in",
  "navigate the complexities",
  "something for everyone",
  "whether you're a beginner",
  "game-changing",
  "unleash",
  "supercharge",
  "transformative",
] as const;

/**
 * Spanish: the tell vocabulary of Spanish machine prose, authored FOR Spanish.
 *
 * Not the English list translated. `delve` translates to `profundizar`, which
 * is an ordinary Spanish verb no reader would blink at, while `sumérgete en` -
 * the actual Spanish tell - has no English entry to have come from. A
 * translated list would police words nobody writes and miss the ones everybody
 * does, which is the failure this whole record exists to prevent.
 *
 * `sin duda` earns its place for a reason worth stating: it is perfectly good
 * Spanish, and that is exactly the problem. It is the phrase a model reaches
 * for when it has nothing to say, so it appears in machine prose at a rate no
 * person writing about a memory game would produce.
 */
export const BANNED_ES = [
  "sumérgete",
  "sumergirse en",
  "cabe destacar",
  "es importante destacar",
  "es importante señalar",
  "en el mundo de hoy",
  "en la era digital",
  "hoy en día",
  "sin duda",
  "una experiencia inolvidable",
  "la solución perfecta",
  "una amplia variedad",
  "al siguiente nivel",
  "el mundo de",
  "adéntrate",
  "descubre el fascinante",
  "no solo eso",
  "en definitiva",
  "en resumen",
  "además de esto",
  "por otro lado",
  "herramienta esencial",
  "potenciar",
  "revolucionario",
] as const;

/**
 * French. The connectors and marketing phrases a French reader flags as
 * templated, plus the ones a model reaches for when producing French out of
 * English habits.
 *
 * AUTHORED, NOT TRANSLATED, and the difference shows in the list itself.
 * "plongez dans" happens to be the twin of Spanish "sumergete" - but "de nos
 * jours", "force est de constater" and "il convient de noter" have no
 * counterpart in the other three lists, and English "dive into" has no useful
 * French translation to ban. A list produced by translating BANNED_EN would
 * have missed every one of those and carried phrases no French writer types.
 *
 * `voice.test.ts` asserts the banned lists are DISJOINT across languages, which
 * is what stops `fr: VOICE.es` - an assignment that type-checks, runs, and
 * silently measures French prose against Spanish tells.
 */
export const BANNED_FR = [
  "plongez dans",
  "plonger dans",
  "immergez-vous",
  "il convient de noter",
  "il est important de noter",
  "il est a noter",
  "force est de constater",
  "de nos jours",
  "a l'ere du numerique",
  "dans le monde d'aujourd'hui",
  "sans aucun doute",
  "une experience inoubliable",
  "la solution ideale",
  "une large gamme",
  "au niveau superieur",
  "le monde fascinant",
  "decouvrez le monde",
  "en resume",
  "pour conclure",
  "en conclusion",
  "par ailleurs",
  "outil indispensable",
  "n'hesitez pas a",
];

/**
 * The dash family. Every one of these reads as a machine tell to the operator,
 * and the plain hyphen reads identically, so there is no cost to the rule.
 * Written as escapes so this source file does not itself contain one - showing
 * a model the character is how it learns to emit it.
 */
const DASHES = /[—–―]/g;

/** "no X, no Y and no Z" in Hebrew, and its English twin. */
const RULE_OF_THREE_HE = /(אין|לא)\s+\S+,\s*(אין|לא)\s+\S+\s+ו?(אין|לא)/g;
const RULE_OF_THREE_EN = /\bno\s+\S+,\s*no\s+\S+,?\s+(and|or)\s+no\b/gi;
/**
 * Spanish negates with `sin` before a noun, so its rule-of-three is
 * `sin X, sin Y y sin Z` — a different word from the English `no` and a
 * different word from the Hebrew `אין`. Translating either pattern would have
 * produced a regex that never fires.
 */
const RULE_OF_THREE_ES = /\bsin\s+\S+,\s*sin\s+\S+,?\s+(y|ni|o)\s+sin\b/gi;

/**
 * French negates a noun with `sans`, so its rule-of-three is
 * `sans X, sans Y et sans Z`. The same SHAPE as the Spanish `sin` and a
 * different word; the Hebrew and English patterns would both match nothing.
 */
const RULE_OF_THREE_FR = /\bsans\s+\S+,\s*sans\s+\S+,?\s+(et|ni|ou)\s+sans\b/gi;

/** "sounds like X but it isn't" / "it's not just X, it's Y" - the same crutch, twice. */
const CONTRAST_HE = /נשמע כמו[^.]{0,40}אבל|זה לא רק \S+ אלא|הצד השני של אותו מטבע/g;
const CONTRAST_EN = /\b(it'?s|this is)\s+not\s+just\s+[^,.]{1,40},?\s+(it'?s|it is)\b/gi;
/** `no es solo X, es Y` / `no es (solo) un X sino Y` — the same crutch in Spanish. */
const CONTRAST_ES = /\bno\s+es\s+(solo|sólo|únicamente)\s+[^,.]{1,40}[,]?\s+(es|sino)\b/gi;
/** `ce n'est pas juste X, c'est Y` / `pas seulement X mais Y` - the same crutch. */
const CONTRAST_FR = /\b(ce\s+n'?est|il\s+ne\s+s'?agit)\s+pas\s+(juste|seulement|uniquement)\s+[^,.]{1,40}[,]?\s+(c'?est|mais)\b/gi;

/**
 * Everything this file knows about ONE language, in one place.
 *
 * Keyed by `PageLocale`, which is the same guarantee the content files carry:
 * promoting a language before somebody has written its tell vocabulary is a RED
 * BUILD, not a silently weaker check. That distinction is the whole point. The
 * shape this replaced was four `locale === "he" ? … : …` ternaries inside
 * `analyse`, and a third language would have joined the ELSE arm of all four -
 * so Spanish prose would have been measured against the ENGLISH banned list,
 * passed, and reported as clean. A gate that answers confidently for a language
 * it has never heard of is worse than no gate, because somebody trusts it.
 *
 * Every banned phrase is authored in LOWERCASE and matched against a lowercased
 * page. (A future Turkish list needs care here and only here: `İ`.toLowerCase()
 * is `i` plus a combining dot in JavaScript, so a phrase authored with a capital
 * would stop matching itself.)
 */
export interface VoiceRules {
  banned: readonly string[];
  ruleOfThree: RegExp;
  contrast: RegExp;
}

export const VOICE: Record<PageLocale, VoiceRules> = {
  he: { banned: BANNED_HE, ruleOfThree: RULE_OF_THREE_HE, contrast: CONTRAST_HE },
  en: { banned: BANNED_EN, ruleOfThree: RULE_OF_THREE_EN, contrast: CONTRAST_EN },
  es: { banned: BANNED_ES, ruleOfThree: RULE_OF_THREE_ES, contrast: CONTRAST_ES },
};

/**
 * Languages whose rules are WRITTEN but whose prose is not finished.
 *
 * Keyed by a plain string, exactly like `GLOSSARY`, and separate from `VOICE`
 * on purpose. `VOICE` stays `Record<PageLocale, VoiceRules>` because that type
 * is the guarantee: promoting a language before somebody has written its tell
 * vocabulary must be a RED BUILD. Deriving `VOICE` from a string-keyed record
 * would make it compile and quietly measure the new language against nothing.
 *
 * So a language is authored HERE first, its prose is written against it, and on
 * promotion the entry MOVES into `VOICE` above. Forgetting to move it is the
 * red build; forgetting to write it is impossible, because the prose could not
 * have been checked without it.
 */
export const PENDING_VOICE: Record<string, VoiceRules> = {
  fr: { banned: BANNED_FR, ruleOfThree: RULE_OF_THREE_FR, contrast: CONTRAST_FR },
};

/* --------------------------------------------------------------- analysers */

const words = (t: string): number => (t.trim() ? t.trim().split(/\s+/).length : 0);

/** Split on sentence enders. Hebrew and English share `.`, `?` and `!`. */
const sentences = (t: string): string[] =>
  t
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);

/** Every authored string on the page, in reading order. */
export function proseOf(copy: GameCopy): string[] {
  return [
    copy.lede,
    ...copy.body,
    ...copy.howToPlay.map((s) => s.body),
    ...copy.tips.map((t) => t.body),
    ...copy.teaches.map((t) => t.body),
    ...copy.ages.map((a) => a.body),
    copy.accessibility,
    ...copy.together.map((t) => t.body),
    ...copy.faq.flatMap((f) => [f.q, f.a]),
  ];
}

export interface VoiceReport {
  words: number;
  paragraphWords: number[];
  /** sd / mean over body paragraphs. 0 means every paragraph is the same length. */
  paragraphSpread: number;
  shortSentences: number;
  bannedPhrases: string[];
  dashes: number;
  ruleOfThree: number;
  contrastFormula: number;
  digitFacts: number;
}

export function analyse(copy: GameCopy, locale: Locale): VoiceReport {
  const prose = proseOf(copy).join("\n");
  const paragraphWords = copy.body.map(words);

  const mean = paragraphWords.reduce((a, b) => a + b, 0) / (paragraphWords.length || 1);
  const variance =
    paragraphWords.reduce((a, b) => a + (b - mean) ** 2, 0) / (paragraphWords.length || 1);
  const spread = mean ? Math.sqrt(variance) / mean : 0;

  // No `locale === "he"` anywhere below. A language arrives with its own rules
  // or the build refuses it - see VOICE.
  const rules = VOICE[locale];
  const haystack = prose.toLowerCase();

  return {
    words: words(prose),
    paragraphWords,
    paragraphSpread: Number(spread.toFixed(3)),
    shortSentences: copy.body
      .flatMap(sentences)
      .filter((s) => words(s) < SHORT_SENTENCE_WORDS).length,
    bannedPhrases: rules.banned.filter((p) => haystack.includes(p.toLowerCase())),
    dashes: (prose.match(DASHES) ?? []).length,
    ruleOfThree: (prose.match(rules.ruleOfThree) ?? []).length,
    contrastFormula: (prose.match(rules.contrast) ?? []).length,
    // A digit run, not a lone numeral, so "9.2" and "20,000" each count once.
    digitFacts: (prose.match(/\d[\d.,]*/g) ?? []).length,
  };
}

/**
 * Human-readable failures, empty when the page passes. Returned rather than
 * thrown so a caller can report every problem in one run instead of the first.
 */
export function violations(r: VoiceReport): string[] {
  const out: string[] = [];

  if (r.paragraphSpread < MIN_PARAGRAPH_SPREAD)
    out.push(
      `paragraph spread ${r.paragraphSpread} < ${MIN_PARAGRAPH_SPREAD} ` +
        `(lengths ${r.paragraphWords.join(", ")}). Evenly-sized paragraphs are the ` +
        `strongest machine tell there is. Cut one to a fragment, let another run long.`,
    );

  if (r.shortSentences < MIN_SHORT_SENTENCES)
    out.push(
      `${r.shortSentences} sentences under ${SHORT_SENTENCE_WORDS} words, need ` +
        `${MIN_SHORT_SENTENCES}. Prose with no short sentence in it reads assembled.`,
    );

  if (r.bannedPhrases.length)
    out.push(`banned phrases: ${r.bannedPhrases.join(", ")}`);

  if (r.dashes)
    out.push(
      `${r.dashes} em/en dash characters. Customer-facing copy uses a plain hyphen; ` +
        `the operator reads the long dash as a tell that text was machine-written.`,
    );

  if (r.ruleOfThree > MAX_RULE_OF_THREE)
    out.push(
      `${r.ruleOfThree} rule-of-three constructions, max ${MAX_RULE_OF_THREE}. ` +
        `One is rhetoric. Three is a rhythm, and a reader hears it.`,
    );

  if (r.contrastFormula)
    out.push(
      `${r.contrastFormula} "it's not just X, it's Y" constructions. This is the single ` +
        `most recognisable AI crutch. Say the thing.`,
    );

  if (r.digitFacts < MIN_DIGIT_FACTS)
    out.push(
      `${r.digitFacts} digit-bearing facts, need ${MIN_DIGIT_FACTS}. Specifics are what ` +
        `both a human reader and an answer engine reward, and they must be derived - ` +
        `every one needs a provenance row.`,
    );

  if (r.words < MIN_WORDS || r.words > MAX_WORDS)
    out.push(`${r.words} words, want ${MIN_WORDS}-${MAX_WORDS}.`);

  return out;
}
