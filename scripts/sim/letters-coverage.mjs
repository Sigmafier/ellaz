// Coverage figures for the "First Letter" game, derived from its real picture
// pools rather than typed into the page by hand.
//
// The game shows a picture and asks which letter its word begins with, so the
// numbers a parent actually wants are: how many pictures there are (easy alone,
// and the full pool), and how many DIFFERENT starting letters they cover in each
// language. A pool that only ever starts words with five letters would teach
// five letters; this reports the real spread. Node built-ins only; parses the
// two source lists with a regex the same way scripts/sim/memory-moves.mjs
// parses Memory.tsx.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");

// The languages are READ from the list that owns them, not restated here.
//
// This file had `he`, `en`, `es` written into the ITEM regex itself AND into a
// `langs` literal below - two copies of a list that lives somewhere else. The
// regex copy is the dangerous one: a fourth key added to those objects makes
// the pattern match NOTHING, and every count under it then reports zero over a
// full pool. A matcher that silently stops matching is the failure this repo
// keeps writing rules about.
const LOCALES_SRC = readFileSync(join(ROOT, "src/i18n/locales.ts"), "utf8");
const SHIPPED = [...(/SHIPPED_LOCALES = \[([^\]]+)\]/.exec(LOCALES_SRC)?.[1] ?? "").matchAll(/"([a-z]{2})"/g)].map(
  (m) => m[1],
);
if (SHIPPED.length === 0) {
  throw new Error(
    "could not read SHIPPED_LOCALES out of src/i18n/locales.ts - the shape changed. " +
      "Refusing to guess: every count below would be silently wrong.",
  );
}

// { emoji: "🐘", he: "פיל", en: "elephant", es: "elefante" }
//
// Two passes, and the split is the point: find the OBJECT, then pull each key
// out of it by name. A single regex listing the keys in order is order-DEPENDENT,
// and the order of `SHIPPED_LOCALES` has nothing to do with the order somebody
// typed the fields in - measured, the list reads `en, he, es` while these
// objects read `he, en, es`, so an ordered pattern matches zero of them. Keyed
// extraction cannot care.
const OBJECT = /\{\s*emoji:\s*"[^"]+"[^}]*\}/g;
const FIELD = (key) => new RegExp(`\\b${key}:\\s*"([^"]+)"`);

const parse = (rel) => {
  const src = readFileSync(join(ROOT, rel), "utf8");
  const items = [];
  for (const block of src.match(OBJECT) ?? []) {
    const item = { emoji: FIELD("emoji").exec(block)?.[1] };
    let complete = Boolean(item.emoji);
    for (const l of SHIPPED) {
      const hit = FIELD(l).exec(block)?.[1];
      if (!hit) complete = false;
      item[l] = hit;
    }
    // An object missing a language is the finding, not something to skip past:
    // it is a word this pool cannot show a reader of that language.
    if (complete) items.push(item);
  }
  // A parse of nothing is not a small pool, it is a broken matcher - and it
  // would otherwise print a confident "0 distinct starting letters".
  if (items.length === 0) throw new Error(`${rel}: matched 0 items - the ITEM shape changed.`);
  return items;
};

const simple = parse("src/games/letters/words.ts"); // easy mode
const cast = parse("src/shared/cast.ts");

// hard pool = SIMPLE first, then cast, deduped by emoji - the same union the game
// builds in poolFor().
const seen = new Set();
const hard = [];
for (const item of [...simple, ...cast]) {
  if (!seen.has(item.emoji)) {
    seen.add(item.emoji);
    hard.push(item);
  }
}

// The same derivation the game uses (see src/games/letters/logic.ts).
const firstLetter = (word, lang) => {
  const first = [...word.trim()][0] ?? "";
  if (lang === "he") return first;
  return first
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase();
};

const langs = SHIPPED;

console.log(`easy pool (simple words): ${simple.length}`);
console.log(`full pool (all pictures): ${hard.length}`);
for (const lang of langs) {
  const letters = new Set(hard.map((it) => firstLetter(it[lang], lang)));
  console.log(
    `${lang}: ${letters.size} distinct starting letters -> ${[...letters].sort().join(" ")}`,
  );
}
