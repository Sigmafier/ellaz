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

// { emoji: "🐘", he: "פיל", en: "elephant", es: "elefante" }
const ITEM = /\{\s*emoji:\s*"([^"]+)",\s*he:\s*"([^"]+)",\s*en:\s*"([^"]+)",\s*es:\s*"([^"]+)"\s*\}/g;
const parse = (rel) =>
  [...readFileSync(join(ROOT, rel), "utf8").matchAll(ITEM)].map((m) => ({
    emoji: m[1],
    he: m[2],
    en: m[3],
    es: m[4],
  }));

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

const langs = ["he", "en", "es"];

console.log(`easy pool (simple words): ${simple.length}`);
console.log(`full pool (all pictures): ${hard.length}`);
for (const lang of langs) {
  const letters = new Set(hard.map((it) => firstLetter(it[lang], lang)));
  console.log(
    `${lang}: ${letters.size} distinct starting letters -> ${[...letters].sort().join(" ")}`,
  );
}
