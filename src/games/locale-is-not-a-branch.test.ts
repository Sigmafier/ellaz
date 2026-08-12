import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

// A game may not decide anything by comparing the locale to a literal.
//
// `ctx.locale === "he" ? "שלב" : "Level"` is correct for two languages and
// silently wrong for the third. The reason it is worth a tree scan rather than
// a convention is that a boolean ternary COMPILES: the type gate that reds 80
// files on promotion cannot see one of these, so the game keeps its Spanish
// prose, its Spanish difficulty pills and its English instructions, with
// nothing thrown and nothing logged. That is the same class as the four
// `voice.ts` ternaries closed in Phase 1.4 - a third language joins the ELSE
// arm and is measured against the wrong language's rules.
//
// The replacements, in order of preference:
//
//   1. `ctx.t("stage")`      - chrome, and the dictionary already speaks 11.
//   2. `ctx.dir`             - a DIRECTION question (a back arrow, `dir=`).
//                              Keyed on language it is wrong for Arabic, and
//                              it would need a "translation" of an arrow.
//   3. `textFor({ he, en })` - this game's own words. A locale RECORD, so
//                              promoting a language reds it by name.
//
// Same shape as logic-is-pure.test.ts and score-is-single-sourced.test.ts:
// scan the tree, not a list, so a game added tomorrow is covered the moment it
// exists.

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

/** `locale === "he"`, `ctx.locale === "en"`, `this.ctx.locale !== "he"`. */
const LOCALE_BRANCH = /\blocale\s*[!=]==?\s*["'`](?:he|en)["'`]/;

/**
 * Where a locale literal is legitimate: the i18n module IS the thing that
 * knows what a locale is, and the build emitter writes per-locale documents.
 * Everything else - games, the shell, shared UI - must go through a lookup.
 */
const ALLOWED = ["i18n", "build", "content"];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (ALLOWED.includes(entry)) continue;
      out.push(...sourceFiles(full));
      continue;
    }
    if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/** Strip comments, so prose ABOUT the pattern does not read as the pattern. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("no screen decides anything by comparing the locale to a literal", () => {
  const files = sourceFiles(ROOT);

  it("scans a real tree", () => {
    // The control every scanning test needs: a matcher that silently found
    // nothing passes every assertion under it and reports success.
    expect(files.length).toBeGreaterThan(60);
    expect(files.some((f) => f.endsWith("BeesGame.tsx"))).toBe(true);
  });

  it("finds no locale branch outside i18n", () => {
    const offenders = files
      .filter((f) => LOCALE_BRANCH.test(code(readFileSync(f, "utf8"))))
      .map((f) => relative(ROOT, f));
    expect(
      offenders,
      `these compare the locale to a literal - use ctx.t(), ctx.dir, or ` +
        `textFor({ he, en }) instead:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });

  it("and the matcher fires on the pattern it bans", () => {
    // Planted, in every spelling the tree has actually used.
    for (const line of [
      'const he = ctx.locale === "he";',
      'label: ctx.locale === "he" ? "שלב" : "Level"',
      'const he = this.ctx.locale === "he";',
      'if (locale !== "en") return;',
    ]) {
      expect(LOCALE_BRANCH.test(line), line).toBe(true);
    }
    // And does NOT fire on the things that legitimately name a locale.
    for (const line of [
      'textFor({ he: "שלב", en: "Level" }, ctx.locale)',
      'const dir = DIR[locale];',
      'authored[locale as PageLocale]',
    ]) {
      expect(LOCALE_BRANCH.test(line), line).toBe(false);
    }
  });
});
