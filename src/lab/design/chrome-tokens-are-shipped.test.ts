import { describe, it, expect } from "vitest";
import { DOCUMENT_CSS } from "../../build/layout";
import { CHROME_TOKENS, shippedFor } from "./Buttons";

/**
 * The editor's `shipped` column is TYPED, and a typed number about the code is
 * a number that goes stale.
 *
 * The panel shows "was 60" beside every knob and prints a `body.screen{...}`
 * block for the operator to paste. Both are claims about `layout.ts`. Nothing
 * else checks them, so the day someone changes `--uh` in the stylesheet the
 * bench starts quietly reporting a change that is not a change - and this is
 * the one screen whose whole job is to say what would actually be different.
 *
 * So: read the real declarations and compare. Both arms, because the chrome
 * branches at 719px and a panel that only knew the desktop values told the
 * operator a phone header was 60px while the phone drew 58.
 */

/** The declarations of one `body.screen{...}` block, as name -> px number. */
function block(css: string, from: number): Record<string, number> {
  const open = css.indexOf("{", from);
  const body = css.slice(open + 1, css.indexOf("}", open));
  const out: Record<string, number> = {};
  for (const decl of body.split(";")) {
    const m = /^\s*(--[a-z-]+)\s*:\s*(\d+(?:\.\d+)?)px\s*$/.exec(decl);
    if (m) out[m[1]] = Number(m[2]);
  }
  return out;
}

// Comments are stripped first: every token name below also appears in the
// prose explaining it, and a matcher that cannot tell those apart either
// fails on its own documentation or passes on the real thing.
const css = DOCUMENT_CSS.replace(/\/\*[\s\S]*?\*\//g, "");
const wideAt = css.indexOf("body.screen{--hh");
// Anchored on the WHOLE opener, not on the media query alone. There are two
// `@media (max-width:719px)` blocks in this stylesheet and the first one is a
// `.stage .box` rule 180 lines earlier - searching forward from it landed back
// on the BASE block, so every phone-arm assertion was silently comparing the
// desktop values against the phone ones and failing for the wrong reason.
const NARROW_OPENER = "@media (max-width:719px){body.screen";
const narrowAt = css.indexOf(NARROW_OPENER) + NARROW_OPENER.length - "body.screen".length;

describe("the bench's shipped column is what layout.ts really sets", () => {
  it("finds both declaration blocks", () => {
    // The positive control. Every expectation below passes vacuously on an
    // empty object, which is exactly what a renamed selector would hand it.
    expect(wideAt, "the base body.screen block is missing").toBeGreaterThan(-1);
    expect(css.indexOf(NARROW_OPENER), "the max-width:719px body.screen block is missing").toBeGreaterThan(-1);
    expect(Object.keys(block(css, wideAt)).length).toBeGreaterThanOrEqual(9);
    expect(Object.keys(block(css, narrowAt)).length).toBeGreaterThanOrEqual(4);
  });

  const wide = () => block(css, wideAt);
  const narrow = () => ({ ...block(css, wideAt), ...block(css, narrowAt) });

  for (const t of CHROME_TOKENS) {
    it(`${t.name} on the desktop arm`, () => {
      expect(wide()[t.name], `${t.name} is not declared in body.screen`).toBeDefined();
      expect(wide()[t.name]).toBe(shippedFor(t, true));
    });

    it(`${t.name} on the phone arm`, () => {
      // The narrow arm re-declares only what it changes, so the phone value is
      // the base block with the media block laid over it - which is how the
      // cascade resolves it, rather than a second hand-kept list.
      expect(narrow()[t.name]).toBe(shippedFor(t, false));
    });
  }

  it("every token the bench offers is one the stylesheet actually declares", () => {
    // The other direction. A knob for a property nothing reads is a knob that
    // answers "yes, previewed" to everyone who turns it, and the bench caught
    // exactly that in its own first hour.
    const declared = new Set(Object.keys(wide()));
    for (const t of CHROME_TOKENS) expect(declared.has(t.name), `${t.name} is invented`).toBe(true);
  });
});
