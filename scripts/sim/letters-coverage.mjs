// Coverage figures for the "First Letter" game, derived from the real picture
// pool in src/shared/cast.ts rather than typed into the page by hand.
//
// The game shows a picture and asks which letter its word begins with, so the
// numbers a parent actually wants are: how many pictures there are, and how many
// DIFFERENT starting letters they cover in each language. A pool that only ever
// starts words with five letters would teach five letters; this reports the real
// spread. Node built-ins only, parses the source with a regex the same way
// scripts/sim/memory-moves.mjs parses Memory.tsx.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(HERE, "..", "..", "src", "shared", "cast.ts"), "utf8");

// { emoji: "🐘", he: "פיל", en: "elephant", es: "elefante" }
const items = [
  ...src.matchAll(
    /\{\s*emoji:\s*"([^"]+)",\s*he:\s*"([^"]+)",\s*en:\s*"([^"]+)",\s*es:\s*"([^"]+)"\s*\}/g,
  ),
].map((m) => ({ emoji: m[1], he: m[2], en: m[3], es: m[4] }));

const themes = [...src.matchAll(/^\s{2}(\w+):\s*\[/gm)].map((m) => m[1]);

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

console.log(`pictures: ${items.length}`);
console.log(`themes: ${themes.length} (${themes.join(", ")})`);
for (const lang of langs) {
  const letters = new Set(items.map((it) => firstLetter(it[lang], lang)));
  console.log(
    `${lang}: ${letters.size} distinct starting letters -> ${[...letters].sort().join(" ")}`,
  );
}
