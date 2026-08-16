#!/usr/bin/env node
/**
 * The brief for writing one game page in one language.
 *
 *   node scripts/brief.mjs <locale> [gameId]
 *   node scripts/brief.mjs fr snake
 *   node scripts/brief.mjs fr            # every game, in roster order
 *
 * This is the whole authoring pipeline in one command, and what it withholds
 * matters as much as what it prints.
 *
 * IT NEVER SHOWS THE ENGLISH PAGE. Not the lede, not the body, not a section,
 * not an example. A writer handed the English page produces a translation no
 * matter what they are told, and Google counts a locale page whose main content
 * is not genuinely translated as a DUPLICATE - which is the one outcome that
 * would make eleven languages actively harmful rather than merely expensive.
 *
 * So the brief is: the FACTS (language-neutral, from `factSheet.ts`), the LOCKED
 * VOCABULARY (from `glossary.ts`), and the VOICE RULES that will be measured
 * (from `voice.ts`). Two pages written from this share facts. Two pages written
 * from each other share structure, and structure is what a duplicate is.
 *
 * Node ESM through the alias hooks, like `render-pilots.mjs`, so it reads the
 * REAL modules rather than a copy that can drift.
 */

import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./sim/alias-hooks.mjs", import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const [locale, only] = process.argv.slice(2);
if (!locale) throw new Error("usage: brief.mjs <locale> [gameId]");

const { allFactSheets, factSheetFor, renderFactSheet } = await import(join(ROOT, "src/build/factSheet.ts"));
const { GLOSSARY } = await import(join(ROOT, "src/content/glossary.ts"));
const { VOICE, PENDING_VOICE, MIN_WORDS, MAX_WORDS, MIN_SHORT_SENTENCES, MIN_DIGIT_FACTS, MAX_RULE_OF_THREE } =
  await import(join(ROOT, "src/content/voice.ts"));

const glossary = GLOSSARY[locale];
const voice = VOICE[locale] ?? PENDING_VOICE[locale];

// Refuse rather than print a partial brief. A brief with no glossary produces
// prose with no locked vocabulary, and the whole reason this exists for an
// unreviewed language is that the recurring words are the ones we can be sure
// of. Silently omitting them would leave exactly the words that matter to luck.
if (!glossary) throw new Error(`no glossary for "${locale}" - write src/content/glossary.ts first`);
if (!voice) throw new Error(`no voice rules for "${locale}" - write them in src/content/voice.ts first`);

const sheets = only ? [factSheetFor(only)] : allFactSheets();

console.log(`# Writing brief - locale "${locale}" - ${sheets.length} game(s)`);
console.log(`
## How to use this

Write each page NATIVELY in ${locale}, from the facts below. Do not translate,
and do not read another language's page for this game - a translation carries
the source language's rhythm, and that rhythm is what reads as machine-made.

The versions in different languages MAY use different examples, a different
opener and a different joke. They must agree on the facts and on nothing else.
`);

console.log(`## Locked vocabulary - use these exact words, every time\n`);
for (const t of glossary) {
  const avoid = t.avoid?.length ? `   (never: ${t.avoid.join(", ")})` : "";
  console.log(`  ${t.concept.padEnd(34)} ${t.term}${avoid}`);
}

console.log(`\n## What will be MEASURED (src/content/voice.ts)\n`);
console.log(`  length            ${MIN_WORDS}-${MAX_WORDS} words of prose`);
console.log(`  paragraph spread  uneven on purpose - one well under 30 words, one well over 70`);
console.log(`  short sentences   at least ${MIN_SHORT_SENTENCES} under six words. Fragments are allowed.`);
console.log(`  digits            at least ${MIN_DIGIT_FACTS} numerals - "9.2", never "nine point two"`);
console.log(`  rule of three     at most ${MAX_RULE_OF_THREE} per page`);
console.log(`  dashes            zero. Use a comma or a full stop.`);
console.log(`  banned phrases    ${voice.banned.length} tells, listed below`);
console.log(`\n  never write:      ${voice.banned.join(" / ")}`);
console.log(`
  one admission     name a real limit of this game, honestly. Nothing reads
                    more human than a stated limit, and it is also the
                    Experience in E-E-A-T.
`);

for (const sheet of sheets) {
  console.log(`\n${"=".repeat(74)}\n`);
  console.log(renderFactSheet(sheet));
}
