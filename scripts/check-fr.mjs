#!/usr/bin/env node
/**
 * Every French page written so far, against every gate it will face.
 *
 * One command over the whole set rather than one per page, because the failure
 * that matters at volume is not a bad page - it is a bad page nobody re-ran.
 */
import { register } from "node:module";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
register("./sim/alias-hooks.mjs", import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const v = await import(join(ROOT, "src/content/voice.ts"));
const g = await import(join(ROOT, "src/content/glossary.ts"));
const { CONTENT } = await import(join(ROOT, "src/content/index.ts"));
const { GAMES } = await import(join(ROOT, "src/portal/games.ts"));

// Before promotion, `fr` lives in PENDING_VOICE and the analyser has never
// heard of it; after promotion it is in VOICE like any other page locale. Lend
// the pending rules only while they exist, so this script keeps working on
// BOTH sides of the flip rather than becoming a tool that ran once.
v.VOICE.fr ??= v.PENDING_VOICE.fr;

const DIR = join(ROOT, "src/content/games/fr");
const files = readdirSync(DIR).filter((f) => f.endsWith(".ts")).sort();
const norm = (t) => t.replace(/\s+/g, " ").trim().toLowerCase();
const longSent = (parts) =>
  parts.flatMap((p) => norm(p).split(/(?<=[.!?])\s/)).map((s) => s.trim())
       .filter((s) => s.split(" ").filter(Boolean).length >= 5);

let bad = 0;
const seenTitles = new Map(), seenDescs = new Map();
for (const f of files) {
  const id = f.replace(/\.ts$/, "");
  const copy = Object.values(await import(join(DIR, f)))[0];
  const problems = [];

  const r = v.analyse(copy, "fr");
  problems.push(...v.violations(r));

  const flat = v.proseOf(copy).join(" ");
  problems.push(...g.violations(flat, g.GLOSSARY.fr));

  if (copy.metaTitle.length > 60) problems.push(`metaTitle ${copy.metaTitle.length} > 60`);
  const d = copy.metaDescription.length;
  if (d < 50 || d > 160) problems.push(`metaDescription ${d} outside 50-160`);
  if (!copy.name?.trim()) problems.push("no name");

  // uniqueness across the set - Google's own duplicate-title finding
  if (seenTitles.has(copy.metaTitle)) problems.push(`title duplicates ${seenTitles.get(copy.metaTitle)}`);
  seenTitles.set(copy.metaTitle, id);
  if (seenDescs.has(copy.metaDescription)) problems.push(`description duplicates ${seenDescs.get(copy.metaDescription)}`);
  seenDescs.set(copy.metaDescription, id);

  // not a translation of any sibling
  const frS = new Set(longSent(v.proseOf(copy)));
  for (const other of ["en", "he", "es"]) {
    const oS = longSent(v.proseOf(CONTENT[id].copy[other]));
    const share = oS.length ? oS.filter((s) => frS.has(s)).length / oS.length : 0;
    if (share > 0.2) problems.push(`${Math.round(share * 100)}% shared sentences with ${other}`);
  }

  if (problems.length) { bad++; console.log(`FAIL ${id}\n      ${problems.join("\n      ")}`); }
  else console.log(`ok   ${id.padEnd(12)} ${String(r.words).padStart(4)}w spread ${r.paragraphSpread.toFixed(2)} short ${r.shortSentences} digits ${r.digitFacts}`);
}

const missing = GAMES.map((m) => m.id).filter((id) => !files.includes(`${id}.ts`));
console.log(`\n${files.length}/${GAMES.length} games written` + (missing.length ? `; still to write: ${missing.join(", ")}` : ""));
if (bad) { console.error(`\n${bad} page(s) failed`); process.exit(1); }
console.log(bad === 0 && !missing.length ? "\nOK  every French page passes every gate" : "");
