#!/usr/bin/env node
/**
 * The GitHub repository description, DERIVED from the roster - and checked.
 *
 * WHY. It is the About box on the page every outreach link points at, it is the
 * one sentence a list maintainer reads before deciding, and it lives in a vendor
 * panel that no gate in this repository can reach. It said "in Hebrew and English"
 * for weeks while the site served four written languages and eleven interface
 * languages, and every audit that checked the LINK passed - homepage, topics and
 * licence were all correct the whole time.
 *
 * A HAND-TYPED COUNT IS THE SAME BUG ONE LEVEL OUT. Writing "33 games" there fixes
 * today and re-breaks on the next game, silently, in public, with nothing able to
 * see it - which is exactly what happened to docs/outreach/ and why
 * `assert-outreach.mjs` exists. So the sentence is generated from the roster and
 * PAGE_LOCALES, never typed, and `--check` compares the live description against
 * what the tree says it should be.
 *
 * Usage:
 *   node scripts/reach/repo-about.mjs            # print the derived sentence
 *   node scripts/reach/repo-about.mjs --check    # compare against the live repo (exit 1 on drift)
 *   node scripts/reach/repo-about.mjs --apply    # write it, after showing before/after
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SLUG = "Sigmafier/ellaz";
const LIMIT = 350; // GitHub's own cap on the description field.

/** How many games the roster holds. The same source the sitemap and llms.txt read. */
export function gameCount(repo = REPO) {
  const src = readFileSync(join(repo, "src/portal/games.ts"), "utf8");
  const block = src.match(/export const GAMES[^=]*=\s*\[([\s\S]*?)\n\]/);
  if (!block) throw new Error("repo-about: could not find the GAMES array in src/portal/games.ts");
  // Each row is a bare identifier, one per line. Count them rather than commas: a
  // trailing comma or a wrapped line would otherwise move the number silently.
  const n = block[1].split("\n").map((l) => l.trim().replace(/,$/, ""))
    .filter((l) => /^[A-Za-z_$][\w$]*$/.test(l)).length;
  if (n === 0) throw new Error("repo-about: the GAMES array parsed as empty - refusing to publish a count of zero");
  return n;
}

/** How many languages have written pages. */
export function pageLocaleCount(repo = REPO) {
  const src = readFileSync(join(repo, "src/i18n/locales.ts"), "utf8");
  const m = src.match(/export const PAGE_LOCALES\s*=\s*\[([^\]]*)\]/);
  if (!m) throw new Error("repo-about: could not find PAGE_LOCALES in src/i18n/locales.ts");
  const n = (m[1].match(/"[a-z-]+"/g) ?? []).length;
  if (n === 0) throw new Error("repo-about: PAGE_LOCALES parsed as empty");
  return n;
}

export function describe(repo = REPO) {
  const games = gameCount(repo);
  const locales = pageLocaleCount(repo);
  return `Free browser games for kids and grown-ups. ${games} games, ${locales} languages, `
       + "no ads, no account, works offline.";
}

function live() {
  return execFileSync("gh", ["api", `repos/${SLUG}`, "--jq", ".description"],
    { encoding: "utf8" }).trim();
}

const want = describe();
if (want.length > LIMIT) {
  console.error(`repo-about: ${want.length} chars, over GitHub's ${LIMIT} cap.`);
  process.exit(1);
}

const mode = process.argv[2];
if (!mode) { console.log(want); process.exit(0); }

if (mode === "--check" || mode === "--apply") {
  const have = live();
  if (have === want) { console.log(`OK  the About box matches the roster.\n    ${want}`); process.exit(0); }
  console.log(`before: ${have}`);
  console.log(`after:  ${want}`);
  if (mode === "--check") {
    console.log("\nDRIFT  the About box disagrees with the roster. Run with --apply.");
    process.exit(1);
  }
  execFileSync("gh", ["api", `repos/${SLUG}`, "-X", "PATCH", "-f", `description=${want}`],
    { stdio: ["ignore", "ignore", "inherit"] });
  const now = live();
  // Read it BACK. A PATCH that reports success and a field that changed are two
  // different claims, and only the second one is the point.
  console.log(now === want ? "\nOK  written and read back." : `\nFAILED  the live value is now: ${now}`);
  process.exit(now === want ? 0 : 1);
}
console.error(`repo-about: unknown mode ${mode}`);
process.exit(1);
