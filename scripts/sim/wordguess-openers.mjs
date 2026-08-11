#!/usr/bin/env node
/**
 * Derives the opening-word statistics the Word Guess page quotes.
 *
 *   node scripts/sim/wordguess-openers.mjs [--top 5] [--json]
 *
 * WHY THIS FILE EXISTS. `src/content/types.ts` requires every number in a game
 * page to name a script that reproduces it, because a statistic you cannot
 * re-derive is a fabrication with a decimal point. This is that script for
 * `src/content/games/wordguess.ts`.
 *
 * WHAT IT MEASURES. For every word in a list, treat it as the opening guess
 * against every possible answer in that same list, mark it by the game's real
 * two-pass rule, and group the answers by the pattern that comes back. A
 * pattern that 12 answers share leaves you 12 candidates; one that a single
 * answer produces leaves you 1. The score is the EXPECTED number of candidates
 * still standing after that first guess:
 *
 *     E = sum over patterns of (n / N) * n
 *
 * which is the size of the group you land in, weighted by the chance of
 * landing in it. Lower is better. It is the honest measure of an opener
 * because it is what the player actually faces on row two.
 *
 * The alternative - counting how many of the answer's letters the opener hits
 * on average - rewards a word that shares letters with everything and tells
 * you nothing about how much it SPLITS the list. Those are different questions
 * and only one of them helps.
 *
 * GROUNDED IN THE REAL LISTS AND THE REAL MARKING RULE. The words are parsed
 * out of `src/games/wordguess/words.ts` and the two-pass mark is reimplemented
 * here from `logic.ts`, so a changed list moves these numbers and a changed
 * list that no longer parses fails loudly rather than quietly describing a
 * game we no longer ship.
 *
 * It is a pure Node script: no imports from the app, no TypeScript, no deps.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const WORDS_SRC = join(ROOT, "src", "games", "wordguess", "words.ts");

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(args[i + 1]);
};
const TOP = flag("top", 5);
const JSON_OUT = args.includes("--json");

/* --- the lists, parsed out of the real source -------------------------- */

const FINAL_TO_PLAIN = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
const normalize = (w) => [...w].map((c) => FINAL_TO_PLAIN[c] ?? c);

/**
 * Pull one `Record<WordLength, readonly string[]>` literal out of words.ts.
 *
 * Brace-counted rather than regex-matched to the closing `}`, because a lazy
 * regex stops at the first `},` - which here is the end of the FOUR-letter
 * array, not the end of the table. That silently yields one length instead of
 * three and every number below would be computed over a third of the data.
 */
function parseTable(src, name) {
  const start = src.indexOf(`export const ${name}:`);
  if (start === -1) throw new Error(`wordguess-openers: no export named ${name} in words.ts`);
  const open = src.indexOf("{", start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) throw new Error(`wordguess-openers: unbalanced braces in ${name}`);
  const body = src.slice(open, end + 1);

  const table = {};
  for (const m of body.matchAll(/(\d+):\s*\[([\s\S]*?)\]/g)) {
    const length = Number(m[1]);
    const words = [...m[2].matchAll(/"([^"]+)"/g)].map((w) => w[1]);
    if (words.length === 0) throw new Error(`wordguess-openers: ${name}[${length}] parsed empty`);
    const wrong = words.filter((w) => [...w].length !== length);
    if (wrong.length) {
      throw new Error(`wordguess-openers: ${name}[${length}] holds wrong-length words: ${wrong}`);
    }
    table[length] = words;
  }
  if (Object.keys(table).length !== 3) {
    throw new Error(`wordguess-openers: expected 3 lengths in ${name}, got ${Object.keys(table)}`);
  }
  return table;
}

const src = readFileSync(WORDS_SRC, "utf8");
const LISTS = { he: parseTable(src, "HE"), en: parseTable(src, "EN") };

/* --- the game's own marking rule, reimplemented ------------------------ */

/** Two passes: exact hits claim their letters first, then nears from what is left. */
function markKey(target, guess) {
  const marks = new Array(guess.length).fill(0); // 0 miss, 1 near, 2 hit
  const pool = new Map();
  for (let i = 0; i < target.length; i++) {
    if (guess[i] === target[i]) marks[i] = 2;
    else pool.set(target[i], (pool.get(target[i]) ?? 0) + 1);
  }
  for (let i = 0; i < guess.length; i++) {
    if (marks[i] === 2) continue;
    const left = pool.get(guess[i]) ?? 0;
    if (left > 0) {
      marks[i] = 1;
      pool.set(guess[i], left - 1);
    }
  }
  return marks.join("");
}

/** Expected candidates still standing after opening with `guess`. */
function expectedRemaining(guess, answers) {
  const groups = new Map();
  for (const a of answers) {
    const k = markKey(a, guess);
    groups.set(k, (groups.get(k) ?? 0) + 1);
  }
  let e = 0;
  for (const n of groups.values()) e += (n / answers.length) * n;
  return e;
}

/* --- run --------------------------------------------------------------- */

const report = {};
for (const [locale, table] of Object.entries(LISTS)) {
  report[locale] = {};
  for (const length of Object.keys(table).map(Number).sort()) {
    const words = table[length];
    const answers = words.map(normalize);
    const scored = words
      .map((w, i) => ({ word: w, expected: expectedRemaining(answers[i], answers) }))
      .sort((a, b) => a.expected - b.expected);

    const mean = scored.reduce((s, r) => s + r.expected, 0) / scored.length;
    report[locale][length] = {
      words: words.length,
      best: scored.slice(0, TOP).map((r) => ({ word: r.word, expected: +r.expected.toFixed(2) })),
      worst: scored[scored.length - 1].word,
      worstExpected: +scored[scored.length - 1].expected.toFixed(2),
      meanExpected: +mean.toFixed(2),
    };
  }
}

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2));
} else {
  for (const [locale, byLength] of Object.entries(report)) {
    console.log(`\n${locale.toUpperCase()}`);
    for (const [length, r] of Object.entries(byLength)) {
      console.log(
        `  ${length} letters  ${String(r.words).padStart(3)} words  ` +
          `mean ${String(r.meanExpected).padStart(6)} left after one guess`,
      );
      console.log(
        `    best  ${r.best.map((b) => `${b.word} (${b.expected})`).join("  ")}`,
      );
      console.log(`    worst ${r.worst} (${r.worstExpected})`);
    }
  }
  console.log();
}
