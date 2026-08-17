// Pool and difficulty figures for the "Spell It" game, derived from its real
// word list and its real level table rather than typed into the page by hand.
//
// What a parent wants to know about a spelling game is whether it covers the
// alphabet or loops over the same eight words, and how much harder the levels
// really get. Both are questions about data the game already owns, so both are
// read out of it here:
//
//   - how many pictures each level can ask for, IN EACH LANGUAGE (the pool is
//     filtered by the length of the word in the language being spelled, so the
//     three counts are genuinely different numbers)
//   - how many distinct letters those words are built from
//   - how long the words run
//   - and how far a child gets by tapping at random, which is what says whether
//     "easy" is a puzzle or a coin toss
//
// Node built-ins only, and every constant is PARSED from the source that owns
// it - `MIN_LETTERS` and the level table from `logic.ts`, the words from
// `words.ts`, the languages from `locales.ts`. Restating any of them here is
// how this file would go on printing confident numbers about a game that had
// moved underneath it. Same technique as scripts/sim/letters-coverage.mjs.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

/* ------------------------------------------------------ the languages */

const LOCALES_SRC = read("src/i18n/locales.ts");
const SHIPPED = [
  ...(/SHIPPED_LOCALES = \[([^\]]+)\]/.exec(LOCALES_SRC)?.[1] ?? "").matchAll(/"([a-z]{2})"/g),
].map((m) => m[1]);
if (SHIPPED.length === 0) {
  throw new Error(
    "could not read SHIPPED_LOCALES out of src/i18n/locales.ts - the shape changed. " +
      "Refusing to guess: every count below would be silently wrong.",
  );
}

/* ------------------------------------------------------ the level table */

const LOGIC_SRC = read("src/games/spell/logic.ts");

const MIN_LETTERS = Number(/MIN_LETTERS\s*=\s*(\d+)/.exec(LOGIC_SRC)?.[1]);
if (!Number.isFinite(MIN_LETTERS)) {
  throw new Error("could not read MIN_LETTERS out of logic.ts - refusing to guess a floor.");
}

const LEVELS = [
  ...LOGIC_SRC.matchAll(/\{\s*id:\s*"(\w+)",\s*maxLetters:\s*(\d+),\s*decoys:\s*(\d+)\s*\}/g),
].map((m) => ({ id: m[1], maxLetters: Number(m[2]), decoys: Number(m[3]) }));
if (LEVELS.length === 0) {
  throw new Error("matched 0 levels in logic.ts - the LEVELS shape changed.");
}

// The decoy alphabets, so the random-tapper simulation below draws from the
// same letters the game does.
const ALPHABETS = {};
for (const m of LOGIC_SRC.matchAll(/^\s{2}(he|en|es):\s*"([^"]+)"\.split\(""\)/gm)) {
  ALPHABETS[m[1]] = [...m[2]];
}

/* ------------------------------------------------------------ the words */

// Two passes on purpose: find the OBJECT, then pull each key out of it BY NAME.
// A single regex listing the keys in order is order-dependent, and the order of
// SHIPPED_LOCALES has nothing to do with the order somebody typed the fields.
const OBJECT = /\{\s*emoji:\s*"[^"]+"[^}]*\}/g;
const FIELD = (key) => new RegExp(`\\b${key}:\\s*"([^"]+)"`);

const WORDS_SRC = read("src/games/spell/words.ts");
const words = [];
for (const block of WORDS_SRC.match(OBJECT) ?? []) {
  const item = { emoji: FIELD("emoji").exec(block)?.[1] };
  let complete = Boolean(item.emoji);
  for (const l of SHIPPED) {
    const hit = FIELD(l).exec(block)?.[1];
    if (!hit) complete = false;
    item[l] = hit;
  }
  // A word missing a language is the finding, not something to skip past: it is
  // a picture that language's readers can never be asked to spell.
  if (complete) words.push(item);
}
// A parse of nothing is not a small list, it is a broken matcher - and it would
// otherwise print a confident "0 words" over a full file.
if (words.length === 0) throw new Error("matched 0 words in words.ts - the item shape changed.");

/* ------------------------------------------------------- the derivation */

// The same derivation the game uses (see `lettersOf` in logic.ts).
const lettersOf = (word, lang) => {
  const raw = [...word.trim()];
  return lang === "he" ? raw : raw.map((c) => c.toUpperCase());
};

const HEBREW_FINALS = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
const baseLetter = (l) => HEBREW_FINALS[l] ?? l;

const poolFor = (level, lang) =>
  words.filter((w) => {
    const n = lettersOf(w[lang], lang).length;
    return n >= MIN_LETTERS && n <= level.maxLetters;
  });

/**
 * How many taps a child needs if they tap at RANDOM.
 *
 * The point of the measurement: at `easy` the tray holds only the word's own
 * letters, so this says whether that is a puzzle or a coin toss. A random
 * tapper never places a wrong tile (the game refuses it) but does spend a tap
 * finding out, and tiles already ruled out at the current slot are not tapped
 * again - which is exactly what a child does, so it is the honest baseline.
 *
 * Deterministic: a fixed seed, so re-running this prints the same figure.
 */
function randomTaps(level, lang, trials = 20000) {
  let seed = 20260817;
  const rnd = () => {
    // mulberry32, the same generator the games use.
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const pool = poolFor(level, lang);
  let taps = 0;
  for (let i = 0; i < trials; i++) {
    const word = lettersOf(pool[Math.floor(rnd() * pool.length)][lang], lang);
    const used = new Set(word.map(baseLetter));
    const decoys = ALPHABETS[lang].filter((l) => !used.has(baseLetter(l))).slice(0, level.decoys);
    const tray = [...word, ...decoys].map((letter, id) => ({ id, letter }));

    const spent = new Set();
    for (const want of word) {
      const out = new Set();
      for (;;) {
        const live = tray.filter((t) => !spent.has(t.id) && !out.has(t.id));
        const tile = live[Math.floor(rnd() * live.length)];
        taps++;
        if (tile.letter === want) {
          spent.add(tile.id);
          break;
        }
        out.add(tile.id);
      }
    }
  }
  return taps / trials;
}

/* ------------------------------------------------------------- the report */

console.log(`pictures in the list: ${words.length}`);
console.log(`shortest word a pool will offer: ${MIN_LETTERS} letters`);
console.log("");

for (const lang of SHIPPED) {
  const all = poolFor(LEVELS[LEVELS.length - 1], lang);
  const lengths = all.map((w) => lettersOf(w[lang], lang).length);
  const letters = new Set(all.flatMap((w) => lettersOf(w[lang], lang).map(baseLetter)));
  const sizes = LEVELS.map((l) => `${l.id} ${poolFor(l, lang).length}`).join(", ");
  const mean = (lengths.reduce((a, b) => a + b, 0) / lengths.length).toFixed(2);

  console.log(`${lang}: pool by level -> ${sizes}`);
  console.log(
    `${lang}: ${mean} letters on average, longest ${Math.max(...lengths)}, ` +
      `${letters.size} distinct letters used`,
  );
  console.log(
    `${lang}: taps to spell one word at random -> ` +
      LEVELS.map((l) => `${l.id} ${randomTaps(l, lang).toFixed(1)}`).join(", "),
  );
  console.log("");
}

console.log(
  `tray size = the word's letters plus ` +
    LEVELS.map((l) => `${l.decoys} at ${l.id}`).join(", "),
);
