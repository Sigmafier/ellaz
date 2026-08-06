import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * The app stylesheet may not restyle a document.
 *
 * `renderDocument` inlines the document's own stylesheet into <head> and
 * appends the app's `<link rel="stylesheet">` AFTER it. At equal specificity
 * the later sheet wins, so a bare element selector in `global.css` - `body`,
 * `h1`, `p`, `a` - silently repaints all 46 emitted pages.
 *
 * That is not a hypothetical. It shipped: `body { color: var(--text) }` put
 * #f5f6ff prose on a #fdfcff page, and `h1,h2,h3 { margin: 0 }` flattened
 * every heading. Both were invisible to a word count, a link check, a JSON-LD
 * parse and a scroll assertion - every gate this project owns - because all of
 * them read the markup and none of them read a colour.
 *
 * So the rule is structural rather than a review habit: an element-level
 * selector in this file must be scoped to an app REGION (`.app-shell` or
 * `#game-frame`), or listed below with a reason.
 */

const CSS = readFileSync(fileURLToPath(new URL("./global.css", import.meta.url)), "utf8");

/**
 * Selectors that legitimately apply everywhere.
 *
 * Each is here because it is a RESET or an inherit-fixer - it makes elements
 * behave, and carries no document-visible colour, spacing or typography that
 * the document stylesheet might have wanted to own.
 */
const ALLOWED = new Map<string, string>([
  ["*", "box-sizing + tap highlight; a reset, no visual opinion"],
  ["html", "margin only, paired with body below"],
  ["body", "margin only - anything else about <body> must be scoped"],
  ["button", "font-family:inherit + cursor; corrects a UA default, sets no colour"],
]);

/** Bare type selectors: `body`, `h1`, `a`, but not `.x`, `#y`, `body.app-shell`. */
const BARE_TYPE = /^[a-z][a-z0-9]*$/;

interface Rule {
  selector: string;
  body: string;
  line: number;
}

/**
 * A deliberately small CSS reader: top-level rules only. It skips at-rule
 * blocks (`@media`, `@keyframes`) wholesale, which is correct here - a rule
 * inside `@media` still carries its own selector and gets read when we recurse
 * one level, and `@keyframes` steps are not selectors at all.
 */
export function topLevelRules(css: string): Rule[] {
  const out: Rule[] = [];
  let i = 0;
  let lineOf = (idx: number) => css.slice(0, idx).split("\n").length;

  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open === -1) break;
    const prelude = css.slice(i, open).replace(/\/\*[\s\S]*?\*\//g, "").trim();

    // Walk to the matching close brace, so a nested block cannot end the rule early.
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
      j++;
    }
    const inner = css.slice(open + 1, j - 1);

    if (prelude.startsWith("@")) {
      // Recurse one level: rules inside @media are still document-visible.
      if (/^@(media|supports|layer)/.test(prelude)) {
        for (const r of topLevelRules(inner)) {
          out.push({ ...r, line: lineOf(open) + r.line - 1 });
        }
      }
    } else if (prelude) {
      out.push({ selector: prelude, body: inner, line: lineOf(open) });
    }
    i = j;
  }
  return out;
}

/** Every comma-separated part must name an app region, or be an allowed reset. */
export function unscopedSelectors(css: string): Array<{ part: string; line: number }> {
  const bad: Array<{ part: string; line: number }> = [];
  for (const rule of topLevelRules(css)) {
    for (const raw of rule.selector.split(",")) {
      const part = raw.trim();
      if (!part) continue;
      if (/\.app-shell|#game-frame|\.ellaz-|@/.test(part)) continue;
      if (part.startsWith(".") || part.startsWith("#") || part.startsWith(":")) continue;
      // A compound like `body.app-shell` was caught above; what is left that
      // starts with a bare type name is a document-wide element rule.
      const head = part.split(/[\s>+~]/)[0];
      if (BARE_TYPE.test(head) && !ALLOWED.has(head)) bad.push({ part, line: rule.line });
      if (BARE_TYPE.test(head) && ALLOWED.has(head) && head === "body") {
        // `body` is allowed ONLY for the margin reset. Anything else is the bug.
        const props = rule.body
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .split(";")
          .map((d) => d.split(":")[0].trim())
          .filter(Boolean);
        const extra = props.filter((p) => p !== "margin");
        if (extra.length > 0) bad.push({ part: `${part} { ${extra.join(", ")} }`, line: rule.line });
      }
    }
  }
  return bad;
}

describe("global.css must not restyle the emitted documents", () => {
  it("visits a real stylesheet", () => {
    expect(CSS.length).toBeGreaterThan(500);
    expect(topLevelRules(CSS).length).toBeGreaterThan(5);
  });

  it("has no unscoped element selector", () => {
    expect(unscopedSelectors(CSS)).toEqual([]);
  });

  it("still styles the app itself", () => {
    // The inverse check: scoping must not have deleted the app's typography.
    // Without this, emptying the file passes the assertion above.
    expect(CSS).toMatch(/body\.app-shell[\s\S]*?color:\s*var\(--text\)/);
    expect(CSS).toMatch(/#game-frame/);
  });

  // NEGATIVE CONTROLS. A scanner nobody has watched fail is not a gate, and
  // both historical defects are planted here verbatim.
  it("fires on the colour leak that shipped", () => {
    const found = unscopedSelectors("body { color: var(--text); }");
    expect(found).toHaveLength(1);
    expect(found[0].part).toContain("color");
  });

  it("fires on the heading-margin leak that shipped", () => {
    expect(unscopedSelectors("h1,\nh2,\nh3 { margin: 0; }")).toHaveLength(3);
  });

  it("fires on a leak hidden inside a media query", () => {
    expect(unscopedSelectors("@media (min-width:700px){ p { color: red } }")).toHaveLength(1);
  });

  it("does not fire on a properly scoped rule", () => {
    expect(unscopedSelectors("body.app-shell h1 { margin: 0 }")).toEqual([]);
    expect(unscopedSelectors("#game-frame p { color: var(--text) }")).toEqual([]);
    expect(unscopedSelectors(".ellaz-rail { scrollbar-width: none }")).toEqual([]);
  });

  it("does not fire on the body margin reset", () => {
    expect(unscopedSelectors("html,\nbody { margin: 0; }")).toEqual([]);
  });
});
