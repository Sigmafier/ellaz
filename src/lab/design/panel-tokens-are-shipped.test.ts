import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PANEL_STYLES, PANEL_TOKENS } from "./panelStyles";
import { tokensOf } from "./panelRead";

/**
 * The panel bench claims, beside every knob, what the component draws today.
 *
 * That claim is TYPED, so it is one edit away from being a confident lie: move
 * `--gc-value`'s fallback in `GameChrome.tsx` and the bench goes on reporting
 * 18, marks a dialled 18 as "unchanged", and prints a paste block that reverts
 * the very change somebody just made. Nothing renders differently, which is
 * why nobody would find it.
 *
 * So each `shipped` is read back out of the component's own source.
 */
const SRC = readFileSync(new URL("../../ui/GameChrome.tsx", import.meta.url), "utf8");
const TOKENS_CSS = readFileSync(new URL("../../ui/tokens.css", import.meta.url), "utf8");

/**
 * A fallback comes in three shapes, and only one of them is a number.
 *
 * `var(--gc-value, 18px)` is the easy case. `var(--gc-tap, ${TAP}px)` hides the
 * number in a constant, and `var(--gc-cell-radius, var(--radius-2))` hides it
 * one file away in `tokens.css`. All three are legitimate; a check that only
 * understands the first reports "this token is not read anywhere" about a token
 * the component reads on every render - which is a gate pointing at the wrong
 * file, and the reader goes and fixes something that was never broken.
 */
function fallbackOf(name: string): string | undefined {
  // A paren SCANNER, not a regex. The fallback may itself be a `var(...)`, and
  // a regex stopping at the first `)` returns half of it - which parses as
  // nothing and reports "this token is not read anywhere" about a token read on
  // every render. That sends the reader to fix a component that is correct.
  const at = SRC.indexOf("var(" + name + ",");
  if (at < 0) return undefined;
  let depth = 0;
  for (let k = at + 3; k < SRC.length; k++) {
    if (SRC[k] === "(") depth++;
    else if (SRC[k] === ")" && --depth === 0) {
      return SRC.slice(SRC.indexOf(",", at) + 1, k).trim();
    }
  }
  return undefined;
}

function shippedInSource(name: string): number | undefined {
  const fallback = fallbackOf(name);
  if (fallback === undefined) return undefined;
  const px = /^([\d.]+)px$/.exec(fallback);
  if (px) return Number(px[1]);
  // `${TAP}px` - the number is a const in the same file.
  const tpl = /^\$\{([A-Z_]+)\}px$/.exec(fallback);
  if (tpl) {
    const c = new RegExp("const " + tpl[1] + " = ([\\d.]+);").exec(SRC);
    return c ? Number(c[1]) : undefined;
  }
  // `var(--radius-2)` - the number lives in tokens.css.
  const via = /^var\(\s*(--[a-z\d-]+)\s*\)$/.exec(fallback);
  if (via) {
    const d = new RegExp(via[1] + ":\\s*([\\d.]+)px").exec(TOKENS_CSS);
    return d ? Number(d[1]) : undefined;
  }
  return undefined;
}

/**
 * Read by the component, deliberately absent from the knob panel.
 *
 * BY NAME rather than by prefix, the way `token-hygiene.test.ts` exempts the
 * `--gc-*` family: a prefix exemption waves through a typo, and a typo'd token
 * is a knob that turns nothing. Two of these are COLOURS and one is a
 * four-value shorthand, so none can be a slider - a style sets them instead.
 */
/** Source with `//` and block comments removed - trailing ones included. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

const NOT_A_KNOB = new Set([
  "--gc-radius", // the panel's own corner - the chrome bench owns it
  "--gc-cell-bg",
  "--gc-cell-shadow",
  "--gc-head-pad",
  // The same-slots switch. Not numbers, so no knob shows them - a style sets
  // them, and `the panel bench > declares only tokens the bench lists` would
  // otherwise refuse the style that does.
  "--gc-empty-display",
  "--gc-cols",
  // Not a number either: the glyph is on or off, and a style flips it.
  "--gc-icon-display",
  // A number, and deliberately NOT a knob. Its shipped value is the output of
  // a measurement - the 390px sweep recorded in GameChrome.tsx, which put the
  // clipping threshold between rowW 257 and 277 - so a slider here would be a
  // slider for un-measuring it, and the next person to drag it would have no
  // way to know what the number meant.
  "--gc-row-min",
]);

describe("the panel bench knows what ships", () => {
  it.each(PANEL_TOKENS)("$name falls back to $shipped in GameChrome", (t) => {
    const found = shippedInSource(t.name);
    expect(found, `${t.name} is not read anywhere in GameChrome.tsx`).toBeDefined();
    expect(found).toBe(t.shipped);
  });

  // The reverse. Without it the list above passes on a bench that simply omits
  // the token somebody just added, and an unlisted token is a decision the
  // operator cannot see - which is the whole thing this bench exists to end.
  it("lists every --gc- token the component reads", () => {
    const inSrc = [...SRC.matchAll(/var\(\s*(--gc-[a-z-]+)\s*,/g)].map((m) => m[1]);
    const listed = new Set(PANEL_TOKENS.map((t) => t.name));
    expect(inSrc.filter((n) => !listed.has(n) && !NOT_A_KNOB.has(n))).toEqual([]);
  });

  // The positive control. Every assertion above passes vacuously if the regex
  // silently stops matching - an empty set has no unlisted members, and
  // `it.each` over an empty list runs nothing at all.
  it("can see the tokens at all", () => {
    expect(PANEL_TOKENS.length).toBeGreaterThan(6);
    expect(shippedInSource("--gc-value")).toBe(18);
    expect(shippedInSource("--gc-tap")).toBe(56); // via the TAP const
    expect(shippedInSource("--gc-cell-radius")).toBe(14); // via tokens.css
    expect(shippedInSource("--gc-nonsense")).toBeUndefined();
  });
});

describe("the candidate styles", () => {
  it("opens on a control that changes nothing", () => {
    expect(PANEL_STYLES[0].id).toBe("shipped");
    expect(PANEL_STYLES[0].css).toBe("");
  });

  // A style writes its own token values into `:root`, and the knob panel reads
  // them back so a knob compares against the STYLE rather than against the
  // shipped literal. Two parsers of one format, so they get to disagree.
  it("declares only tokens the bench lists", () => {
    const listed = new Set(PANEL_TOKENS.map((t) => t.name));
    for (const s of PANEL_STYLES) {
      for (const name of Object.keys(tokensOf(s.css))) {
        expect(
          listed.has(name) || NOT_A_KNOB.has(name),
          `${s.id} sets ${name}, which no knob shows and nothing exempts`,
        ).toBe(true);
      }
    }
  });

  it("reads a style's own numbers back", () => {
    // The control for the parser: a style that sets nothing must return {}, and
    // one that sets something must not.
    expect(tokensOf("")).toEqual({});
    expect(tokensOf(":root{--gc-value:22px;--gc-label:9.5px}")).toEqual({
      "--gc-value": 22,
      "--gc-label": 9.5,
    });
  });

  it("never ships an !important out of the lab", () => {
    // `!important` is how a stylesheet overrides an inline style from outside,
    // which is right for a bench and wrong for the component. A picked style is
    // baked into GameChrome; this asserts nobody pasted one straight in.
    //
    // COMMENTS STRIPPED FIRST. A gate scanning raw source fires on the word in
    // a comment ABOUT the rule - which is a false positive that announces
    // itself, and the same matcher pointed the other way is a gate that goes
    // quietly blind. The holdem purity gate did exactly this on 2026-08-14;
    // see .claude/rules/a-diagnostic-that-truncates-what-it-compares.md.
    expect(stripComments(SRC)).not.toContain("!important");
  });

  it("the comment stripper can still see a real one", () => {
    // The control. Without it, a stripper that eats everything passes the
    // assertion above over a component full of overrides.
    expect(stripComments('const a = "x !important";')).toContain("!important");
    expect(stripComments("// a !important in a line comment\nconst a = 1;")).not.toContain(
      "!important",
    );
    expect(stripComments("const a = 1; // trailing !important")).not.toContain("!important");
    expect(stripComments("/* a !important in a block */")).not.toContain("!important");
  });
});
