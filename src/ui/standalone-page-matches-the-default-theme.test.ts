import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { DEFAULT_THEME } from "./themes";

/**
 * THE STANDALONE PAGE PAINTS ITSELF BEFORE ANY OF OUR CSS EXISTS, so its two
 * page colours are literals in an inline `<style>` - and a literal copied out
 * of a token file is a copy that can go stale in silence.
 *
 * It went stale in exactly that way. `standalone.html` carried night's
 * `#10121a` / `#f4f4f8` while the app boots `DEFAULT_THEME`, which is `market`
 * and is cream. Nothing errored and nothing rendered wrong: the game drew its
 * own cream cards, and every string with no colour of its own inherited
 * near-white from <body>. Measured 2026-08-29 in a 390px viewport, the Score
 * value read `#F4F4F8` on a `#FFFDF8` card - 1.05:1 - so the numbers were
 * simply absent. A screenshot found it; no gate in this repo could.
 *
 * Same arrangement as `src/build/beta-is-declared.test.ts`: duplicate the
 * literal where it has to be duplicated, then make the two copies unable to
 * disagree.
 */
const HTML = readFileSync(new URL("../../standalone.html", import.meta.url), "utf8");
const TOKENS = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

/**
 * The block selected by BARE `:root` is the default theme's - `theme.ts`
 * removes `data-theme` entirely for `DEFAULT_THEME`, so the bare block is what
 * an unstamped document gets. Located by the selector rather than by the theme
 * name, because the name is exactly what would be wrong if someone changed
 * which theme is default.
 */
function defaultThemeBlock(css: string): string {
  const at = css.search(/^:root,\s*$/m);
  expect(at, "tokens.css should hold a block selected by bare `:root,`").toBeGreaterThan(-1);
  const end = css.indexOf("\n}", at);
  expect(end).toBeGreaterThan(at);
  return css.slice(at, end);
}

function tokenIn(block: string, name: string): string {
  const m = new RegExp(`--${name}:\\s*([^;]+);`).exec(block);
  expect(m, `--${name} should be declared in the default-theme block`).not.toBeNull();
  return m![1].trim();
}

/** The two literals the inline `<style>` paints the page with. */
function inlinePalette(html: string): { background: string; color: string } {
  const style = /<style>([\s\S]*?)<\/style>/.exec(html);
  expect(style, "standalone.html should carry an inline <style>").not.toBeNull();
  const rule = /html,\s*body\s*\{([\s\S]*?)\}/.exec(style![1]);
  expect(rule, "the inline <style> should paint `html, body`").not.toBeNull();
  const background = /background:\s*([^;]+);/.exec(rule![1]);
  const color = /(?:^|[\s;{])color:\s*([^;]+);/.exec(rule![1]);
  expect(background, "`html, body` should set a background").not.toBeNull();
  expect(color, "`html, body` should set a color").not.toBeNull();
  return { background: background![1].trim(), color: color![1].trim() };
}

describe("the standalone page agrees with the theme the app actually boots", () => {
  const block = defaultThemeBlock(TOKENS);

  it("paints the page in DEFAULT_THEME's --bg and --text, not another theme's", () => {
    const { background, color } = inlinePalette(HTML);
    expect(background.toLowerCase()).toBe(tokenIn(block, "bg").toLowerCase());
    expect(color.toLowerCase()).toBe(tokenIn(block, "text").toLowerCase());
  });

  it("carries `app-shell`, which is what makes the app tokens reach this page", () => {
    // `global.css` hangs `color: var(--text)` and `background: var(--page-bg)`
    // off `body.app-shell`. Without the class the page keeps whatever the
    // inline literals say and never follows the theme at all.
    expect(HTML).toMatch(/<body[^>]*\bclass="[^"]*\bapp-shell\b/);
    expect(readFileSync(new URL("./global.css", import.meta.url), "utf8")).toMatch(
      /body\.app-shell[^{]*\{[^}]*color:\s*var\(--text\)/,
    );
  });

  it("would fail if the literal drifted back to another theme", () => {
    // The control. Both assertions above pass on a file nobody has touched, so
    // this plants the exact regression that shipped and proves they can fire.
    const planted = HTML.replace(/background:\s*#[0-9a-f]{6};/i, "background: #10121a;");
    expect(planted).not.toBe(HTML);
    expect(inlinePalette(planted).background.toLowerCase()).not.toBe(
      tokenIn(block, "bg").toLowerCase(),
    );
  });

  it("is checking the block that belongs to the theme with no attribute", () => {
    // If someone makes another theme the default, `theme.ts` starts stripping
    // `data-theme` for THAT one and the bare `:root` block has to move with it.
    // Named here so the failure says so rather than reading as a colour drift.
    expect(block).toContain(`:root[data-theme="${DEFAULT_THEME}"]`);
  });
});
