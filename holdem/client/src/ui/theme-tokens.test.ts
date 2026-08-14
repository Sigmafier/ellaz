import { describe as group, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { THEMES, type ThemeId } from "./themes";

/**
 * The three theme blocks must declare an IDENTICAL set of keys.
 *
 * A key present in one theme and missing from another does not fail, does not
 * warn, and does not render wrong everywhere. It resolves to the DEFAULT
 * theme's value, silently, for that one property, in that one theme — a green
 * build and a table that is subtly the wrong colour in exactly one place.
 *
 * The gate reads the CSS itself rather than a list somebody maintains beside
 * it, because a list beside it is the same defect one level up.
 */
/**
 * COMMENTS ARE STRIPPED FIRST, and that is not tidiness.
 *
 * The first version of this gate located a block with `CSS.indexOf(selector)`
 * and matched the selector inside this file's own header comment — which lists
 * every selector by name. It then read from there to the next `}`, found no
 * declarations, and reported that two themes were missing all 22 keys.
 *
 * That is the same defect as the purity gate whose comment stripper was
 * anchored to the start of a line (see
 * .claude/rules/a-diagnostic-that-truncates-what-it-compares.md): an instrument
 * measuring its own documentation instead of the artifact. It failed loudly
 * here, which is the lucky direction — the same mistake pointed the other way
 * is a gate that silently matches nothing and passes.
 */
const CSS = readFileSync(join(__dirname, "tokens.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** The declarations inside one rule's `{ … }`. */
function blockOf(selector: string): string {
  // Anchored at the start of a line and followed by `{`, so a selector named
  // anywhere else can never be mistaken for the rule that declares it.
  const re = new RegExp(`^${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{`, "m");
  const m = re.exec(CSS);
  if (!m) throw new Error(`no such rule in tokens.css: ${selector}`);
  const open = m.index + m[0].length;
  const close = CSS.indexOf("}", open);
  if (close < 0) throw new Error(`unterminated block for ${selector}`);
  return CSS.slice(open, close);
}

/** Custom properties declared inside one rule, in source order. */
function keysOf(selector: string): string[] {
  return [...blockOf(selector).matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)].map((m) => m[1]);
}

const DEFAULT_BLOCK = ':root,\n:root[data-theme="felt"]';
const themeBlocks: Record<ThemeId, string> = {
  felt: DEFAULT_BLOCK,
  daylight: ':root[data-theme="daylight"]',
  slate: ':root[data-theme="slate"]',
};

group("theme tokens", () => {
  it("finds a block for every theme the app can select", () => {
    // The control: if this extractor silently matched nothing, every
    // set-equality assertion below would compare two empty sets and pass.
    for (const id of Object.keys(themeBlocks) as ThemeId[]) {
      expect(keysOf(themeBlocks[id]).length, id).toBeGreaterThan(15);
    }
    expect(Object.keys(themeBlocks).sort()).toEqual(THEMES.map((t) => t.id).sort());
  });

  it("declares an identical key set in all three", () => {
    const base = [...keysOf(themeBlocks.felt)].sort();
    for (const id of ["daylight", "slate"] as ThemeId[]) {
      const got = [...keysOf(themeBlocks[id])].sort();
      const missing = base.filter((k) => !got.includes(k));
      const extra = got.filter((k) => !base.includes(k));
      expect(missing, `${id} is missing`).toEqual([]);
      expect(extra, `${id} has extra`).toEqual([]);
    }
  });

  it("declares no theme colour in the neutral block, where it would leak into every theme", () => {
    // The neutral block is space/radius/font/easing only. A COLOUR there is
    // overridable in principle, and leaks into any theme that forgets to
    // redeclare it — the silent-fallback failure above wearing another hat.
    for (const [, key] of blockOf(":root").matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)) {
      expect(key, "colour token in the neutral block").not.toMatch(
        /^--(bg|surface|felt|rail|line|ink|gold|accent|danger|card|seat|chip|pot|confetti)/,
      );
    }
  });

  it("gives every theme a real value for each key — no empty declarations", () => {
    for (const id of Object.keys(themeBlocks) as ThemeId[]) {
      for (const [, key, value] of blockOf(themeBlocks[id]).matchAll(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]*);/gim)) {
        expect(value.trim(), `${id} ${key}`).not.toBe("");
        // A stray word where a colour belongs (`#4a3venue` shipped for about a
        // minute) parses as an invalid declaration the browser DROPS, so the
        // property falls back to the default theme — invisible in two themes
        // out of three.
        if (/^--(bg|surface|felt|rail|line|ink|gold|accent|danger|card|seat|chip)/.test(key)) {
          // The hex branch is anchored at BOTH ends, and that is the whole
          // check. Unanchored, `#[0-9a-f]{3,8}` matches the leading `#4a3` of
          // `#4a3venue` and reports it as a colour — which is precisely the
          // value that shipped here, and precisely what this assertion exists
          // to catch. Measured: the first version of this line let it through.
          expect(value.trim(), `${id} ${key} is not a colour`).toMatch(
            /^(#[0-9a-f]{3}|#[0-9a-f]{4}|#[0-9a-f]{6}|#[0-9a-f]{8})$|^(rgba?|hsla?|var|oklch|color-mix)\(/i,
          );
        }
      }
    }
  });
});
