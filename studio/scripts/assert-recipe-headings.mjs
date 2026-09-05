#!/usr/bin/env node
// Every style has a recipe, and every recipe has the same nine H2 headings in
// the same order. That is what makes two styles comparable: read them side by
// side and the difference is the style, never the document's shape.
//
//   node scripts/assert-recipe-headings.mjs             # the real tree
//   node scripts/assert-recipe-headings.mjs --control   # plant each defect
//
// The population is the STYLE DIRECTORIES plus the registry rows, checked in
// both directions - a directory with no row is invisible to every other gate,
// a row with no directory is a broken import. The headings list is read from
// art/styles/recipe-contract.json, the same file the vitest test reads.

import { existsSync, readFileSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { runControls, report } from "./lib/control.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const STUDIO = resolve(HERE, "..");

export function contract(stylesDir) {
  return JSON.parse(readFileSync(join(stylesDir, "recipe-contract.json"), "utf8"));
}

/** id -> tier, parsed from registry.ts rows `{ id: "x", ..., tier: "full" ... }`. */
export function registryTiers(stylesDir) {
  const src = readFileSync(join(stylesDir, "registry.ts"), "utf8");
  const out = new Map();
  for (const m of src.matchAll(/\{\s*id:\s*"([a-z0-9]+)"[^}]*?tier:\s*"(full|card)"/g)) out.set(m[1], m[2]);
  if (out.size === 0) throw new Error("registryTiers: parsed zero rows from registry.ts - the row shape changed, fix the matcher before trusting anything");
  return out;
}

/** The H2 headings of a markdown file, in order, and the word count under each. */
export function sections(md) {
  const out = [];
  let cur = null;
  for (const line of md.split("\n")) {
    const h2 = line.match(/^## (.+?)\s*$/);
    if (h2) { cur = { heading: h2[1], words: 0 }; out.push(cur); continue; }
    if (cur && !/^#/.test(line)) cur.words += line.split(/\s+/).filter(Boolean).length;
  }
  return out;
}

export function checkRecipe(id, md, tier, c) {
  const out = [];
  if (!/^# .+/m.test(md)) out.push(`${id}: recipe has no H1`);
  const tierLine = md.match(/\*\*Tier\*\*:\s*(full|card)/);
  if (!tierLine) out.push(`${id}: recipe has no "**Tier**: full|card" line`);
  else if (tierLine[1] !== tier) out.push(`${id}: recipe says tier ${tierLine[1]} but registry.ts says ${tier}`);
  const got = sections(md);
  const gotNames = got.map((s) => s.heading);
  if (JSON.stringify(gotNames) !== JSON.stringify(c.headings)) {
    out.push(`${id}: H2 headings are [${gotNames.join(" | ")}] - expected exactly [${c.headings.join(" | ")}]`);
  }
  const min = c.minWordsPerSection[tier];
  for (const s of got) {
    if (c.headings.includes(s.heading) && s.words < min) out.push(`${id}: section "${s.heading}" has ${s.words} words, ${tier} tier needs at least ${min}`);
  }
  return out;
}

export function scan(stylesDir) {
  const c = contract(stylesDir);
  const tiers = registryTiers(stylesDir);
  const dirs = readdirSync(stylesDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const out = [];
  for (const id of tiers.keys()) if (!dirs.includes(id)) out.push(`registry row "${id}" has no directory`);
  for (const id of dirs) {
    if (!tiers.has(id)) { out.push(`directory "${id}" has no registry row`); continue; }
    const file = join(stylesDir, id, "recipe.md");
    if (!existsSync(file)) { out.push(`${id}: no recipe.md`); continue; }
    out.push(...checkRecipe(id, readFileSync(file, "utf8"), tiers.get(id), c));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Controls: a copy of the real styles dir with one defect planted each.
// ---------------------------------------------------------------------------
const REAL = join(STUDIO, "art", "styles");

function withCopy(mutate) {
  const root = mkdtempSync(join(tmpdir(), "studio-recipes-"));
  try {
    cpSync(REAL, root, { recursive: true });
    mutate(root);
    return scan(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
const edit = (root, id, fn) => {
  const f = join(root, id, "recipe.md");
  const before = readFileSync(f, "utf8");
  const after = fn(before);
  if (after === before) throw new Error(`control mutation on ${id} changed nothing`);
  writeFileSync(f, after);
};

function controls() {
  return [
    { name: "the real tree (positive control: must be clean to mean anything below)", expect: "PASS", run: () => scan(REAL) },
    { name: "recipe missing", expect: "FIRE", run: () => withCopy((r) => rmSync(join(r, "flat", "recipe.md"))) },
    { name: "heading renamed", expect: "FIRE", run: () => withCopy((r) => edit(r, "paper", (s) => s.replace("## Outline", "## Outlines"))) },
    { name: "headings out of order", expect: "FIRE", run: () => withCopy((r) => edit(r, "crayon", (s) => s.replace("## Look", "## Look-tmp").replace("## Palette", "## Look").replace("## Look-tmp", "## Palette"))) },
    { name: "extra heading", expect: "FIRE", run: () => withCopy((r) => edit(r, "snes16", (s) => s + "\n## Notes\n\nsome extra words here for the section\n")) },
    { name: "a section emptied", expect: "FIRE", run: () => withCopy((r) => edit(r, "snes16", (s) => s.replace(/## Avoid\n[\s\S]*?(?=\n## Sample)/, "## Avoid\n"))) },
    { name: "tier line disagrees with registry", expect: "FIRE", run: () => withCopy((r) => edit(r, "flat", (s) => s.replace("**Tier**: full", "**Tier**: card"))) },
    { name: "a style directory with no registry row", expect: "FIRE", run: () => withCopy((r) => { mkdirSync(join(r, "zzz")); writeFileSync(join(r, "zzz", "render.ts"), "export const render = () => null;\n"); }) },
    // The LAST registry row, read from the copy, never a name written here: "mosaic" was
    // written here once, and the day that style was deleted the control threw instead of firing.
    { name: "a registry row with no directory", expect: "FIRE", run: () => withCopy((r) => rmSync(join(r, [...registryTiers(r).keys()].pop()), { recursive: true })) },
  ];
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.argv.includes("--control")) process.exit(runControls("assert-recipe-headings", controls()) ? 0 : 1);
  const tiers = registryTiers(REAL);
  process.exit(report("assert-recipe-headings", `${tiers.size} styles in registry.ts · ${readdirSync(REAL, { withFileTypes: true }).filter((d) => d.isDirectory()).length} style directories`, scan(REAL)));
}
