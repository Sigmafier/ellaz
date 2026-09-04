/**
 * A document-only page must obey the theme the boot script sets on it.
 *
 * Every emitted page carries `themeBootScript()`, which writes
 * `data-theme="night"` on `<html>` from `ellaz:theme`. A page that BOOTS THE
 * APP also links the shell stylesheet, so `--text` and friends are defined and
 * the `var(--text, <market literal>)` declarations in DOCUMENT_CSS resolve to
 * the real night tokens. A document-only page - a category listing, the 404, a
 * printable - deliberately links no shell stylesheet, so those vars are
 * UNDEFINED and the market fallback is the only value it ever had.
 *
 * Measured 2026-09-04, same browser, same `ellaz:theme=night`, this tree:
 *
 *   /games/think/    data-theme=night  no shell css  body background #fdfcff
 *   /games/match3/   data-theme=night  shell css     body background #0f1226
 *
 * Reported as "the category breadcrumb leads to an unstyled page" (issue #25).
 * It is neither the breadcrumb nor unstyled - it is one theme arm missing.
 *
 * THIS IS A SOURCE ASSERTION AND IT IS THE WEAKER INSTRUMENT. vitest runs the
 * node environment over `src/**\/*.test.ts` with no DOM and no CSS engine, so
 * nothing here can compute a background colour. It can only hold the shape: the
 * two arms declare the same tokens, and the two that decide light-vs-dark
 * really differ. The picture is the pair in the Visual Hall batch
 * `20260904-214442-issue25-category-page`.
 */
import { describe, expect, it } from "vitest";
import { DOCUMENT_CSS } from "./layout";

/** The declarations inside one selector's block, as name -> value. */
function tokensIn(css: string, selector: string): Record<string, string> {
  // The selector, optional whitespace, then everything to the first `}`. The
  // doc token blocks contain no nested braces, which is why this is safe here
  // and would not be on an arbitrary stylesheet.
  const at = css.indexOf(selector);
  if (at === -1) return {};
  const open = css.indexOf("{", at);
  const close = css.indexOf("}", open);
  const body = css.slice(open + 1, close);
  const out: Record<string, string> = {};
  for (const decl of body.split(";")) {
    const m = /^\s*(--doc-[a-z-]+)\s*:\s*(.+?)\s*$/.exec(decl);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

describe("a document-only page has a night arm", () => {
  const light = tokensIn(DOCUMENT_CSS, ":root{");
  const night = tokensIn(DOCUMENT_CSS, ':root[data-theme="night"]{');

  it("the instrument can see the light arm at all", () => {
    // Without this the two comparisons below pass vacuously on {} vs {} if the
    // parser ever stops matching - the empty-set trap this repo keeps hitting.
    expect(Object.keys(light).length).toBeGreaterThanOrEqual(8);
  });

  it("declares a night arm", () => {
    expect(Object.keys(night).length).toBeGreaterThanOrEqual(8);
  });

  it("both arms declare exactly the same tokens", () => {
    // A token added to one arm and not the other is the hand-kept-mirror
    // defect: the page half-changes theme and looks broken in a new way.
    expect(Object.keys(night).sort()).toEqual(Object.keys(light).sort());
  });

  it("the two tokens that decide light-vs-dark actually differ", () => {
    // Not every token: --doc-stage is the same dark value in both arms on
    // purpose, because a game's stage is dark under either theme.
    for (const token of ["--doc-bg", "--doc-ink"]) {
      // Both halves present FIRST. `undefined !== "#fdfcff"` is true, so
      // without these two lines this cell passes when the night arm is missing
      // entirely - which is exactly what it happened to do the first time it
      // was run against a deleted arm.
      expect(light[token], `${token} missing from the light arm`).toBeTruthy();
      expect(night[token], `${token} missing from the night arm`).toBeTruthy();
      expect(night[token], `${token} must differ between the arms`).not.toBe(light[token]);
    }
  });

  it("the night arm still derives from the app tokens when they exist", () => {
    // The literal is the FALLBACK, never the whole value - so a page that does
    // boot the app keeps taking its colour from tokens.css and the two can
    // never disagree on such a page.
    for (const [token, value] of Object.entries(night)) {
      expect(value, `${token} must be var(--app-token, <night literal>)`).toMatch(/^var\(--[a-z-]+,\s*#[0-9a-f]{3,8}\)$/i);
    }
  });

  it("the night arm wins over the bare :root arm", () => {
    // Specificity 0,2,0 beats 0,1,0, but only if it comes from an attribute
    // selector AND is not overridden later in the sheet. Order is the half a
    // specificity argument forgets.
    expect(DOCUMENT_CSS.indexOf(':root[data-theme="night"]{')).toBeGreaterThan(DOCUMENT_CSS.indexOf(":root{"));
  });
});
