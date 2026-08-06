import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * The two themes must be the same SHAPE.
 *
 * A token declared in one theme and forgotten in the other does not fail. It
 * falls back to the default's value, for that one property, in that one theme
 * - so the page looks 95% right and one border stays midnight blue on a cream
 * card. No error, no console warning, and no way to notice except by looking
 * at the right pixel.
 *
 * So the key sets are asserted equal rather than reviewed.
 */

const CSS = readFileSync(fileURLToPath(new URL("./tokens.css", import.meta.url)), "utf8");

/**
 * Blocks are located by their `data-theme` ATTRIBUTE, never by a full selector
 * string. Which block also carries the bare `:root` is exactly what the theme
 * flip changes, so a hardcoded selector would make every assertion here break
 * on the one edit it most needs to survive.
 */
export function blockFor(css: string, selector: string): string {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const at = stripped.indexOf(selector);
  if (at === -1) throw new Error(`selector not found: ${selector}`);
  const open = stripped.indexOf("{", at);
  const close = stripped.indexOf("}", open);
  return stripped.slice(open + 1, close);
}

/** The full selector list a theme's rule is written with. */
export function selectorFor(css: string, theme: string): string {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const at = stripped.indexOf(`[data-theme="${theme}"]`);
  if (at === -1) throw new Error(`no rule for theme ${theme}`);
  const open = stripped.indexOf("{", at);
  // Walk back to the end of the previous rule (or the start of the file).
  const prev = Math.max(stripped.lastIndexOf("}", at), -1);
  return stripped.slice(prev + 1, open).trim();
}

export function keysIn(block: string): string[] {
  return [...block.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]).sort();
}

const NIGHT = blockFor(CSS, '[data-theme="night"]');
const MARKET = blockFor(CSS, '[data-theme="market"]');
const NEUTRAL = blockFor(CSS, ":root {");

describe("theme tokens", () => {
  it("reads a real stylesheet with all three blocks", () => {
    expect(keysIn(NEUTRAL).length).toBeGreaterThan(10);
    expect(keysIn(NIGHT).length).toBeGreaterThan(20);
    expect(keysIn(MARKET).length).toBeGreaterThan(20);
  });

  it("declares an identical key set in both themes", () => {
    expect(keysIn(MARKET)).toEqual(keysIn(NIGHT));
  });

  it("keeps neutral tokens out of the theme blocks", () => {
    // A spacing or font token duplicated into a theme is a value that can
    // drift between themes without anyone deciding it should.
    const overlap = keysIn(NEUTRAL).filter((k) => keysIn(NIGHT).includes(k));
    expect(overlap).toEqual([]);
  });

  it("gives the bare :root selector to exactly one theme", () => {
    // The 46 emitted documents carry no data-theme until the boot script runs,
    // so bare `:root` is what a cold page paints. Two themes claiming it would
    // make the default depend on source order; none claiming it would paint an
    // unstyled page. Which one owns it is asserted in theme-sync.test.ts,
    // against themes.ts, so the two can never disagree.
    const owners = (["night", "market"] as const).filter((t) =>
      /(^|,)\s*:root\s*(,|$)/.test(selectorFor(CSS, t)),
    );
    expect(owners).toHaveLength(1);
  });

  it("gives Bright Marketplace no gradients and no blurred shadows", () => {
    // The look is flat fills and hard ink offsets. Asserting it on the FILE
    // makes that a property rather than a promise in a comment.
    expect(MARKET).not.toMatch(/gradient/);
    // A hard offset has a zero blur radius: `0 3px 0 <colour>`.
    const shadows = [...MARKET.matchAll(/--shadow-\d+:\s*([^;]+);/g)].map((m) => m[1]);
    expect(shadows.length).toBeGreaterThan(0);
    for (const s of shadows) expect(s).toMatch(/^0 \d+px 0 /);
  });

  it("still lets night carry its gradient", () => {
    // The inverse control: had the split emptied night, the assertion above
    // would pass on a stylesheet describing no look at all.
    expect(NIGHT).toMatch(/--brand-fill:\s*linear-gradient/);
  });

  // NEGATIVE CONTROLS - a scanner nobody has watched fail is not a gate.
  it("fires when a theme drops a key", () => {
    const broken =
      ':root[data-theme="night"] { --a: 1; --b: 2; }\n:root[data-theme="market"] { --a: 9; }';
    expect(keysIn(blockFor(broken, '[data-theme="market"]'))).not.toEqual(
      keysIn(blockFor(broken, '[data-theme="night"]')),
    );
  });

  it("fires on a gradient planted in the market block", () => {
    const planted = ':root[data-theme="market"] { --x: linear-gradient(red, blue); }';
    expect(blockFor(planted, '[data-theme="market"]')).toMatch(/gradient/);
  });

  it("fires on a blurred shadow planted in the market block", () => {
    const planted = ':root[data-theme="market"] { --shadow-1: 0 4px 16px rgba(0,0,0,.28); }';
    const shadows = [
      ...blockFor(planted, '[data-theme="market"]').matchAll(/--shadow-\d+:\s*([^;]+);/g),
    ];
    expect(shadows[0][1]).not.toMatch(/^0 \d+px 0 /);
  });

  it("fires when both themes claim the bare :root", () => {
    const planted =
      ':root,\n:root[data-theme="night"] { --a: 1; }\n:root,\n:root[data-theme="market"] { --a: 2; }';
    const owners = (["night", "market"] as const).filter((t) =>
      /(^|,)\s*:root\s*(,|$)/.test(selectorFor(planted, t)),
    );
    expect(owners).toHaveLength(2);
  });
});
