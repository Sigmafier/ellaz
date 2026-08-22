import { describe, it, expect } from "vitest";
import { stripCssComments } from "./css";
import { DOCUMENT_CSS } from "./layout";

describe("stripCssComments", () => {
  it("removes a comment and keeps the rules on both sides", () => {
    expect(stripCssComments("a{color:red}/* gone */b{color:blue}")).toBe("a{color:red}b{color:blue}");
  });

  it("does NOT treat a comment as a token separator", () => {
    // The CSS tokenizer removes comments outright, so `.a/*x*/.b` is `.a.b` -
    // one element with two classes. Replacing the comment with a SPACE would
    // silently turn it into a descendant selector, which matches different
    // elements and renders a plausible wrong page.
    expect(stripCssComments(".a/*x*/.b{color:red}")).toBe(".a.b{color:red}");
  });

  it("leaves a comment opener that lives INSIDE a string alone", () => {
    // The naive regex `/\/\*[\s\S]*?\*\//g` eats from inside the string to the
    // next `*/` and takes real declarations with it. The page still renders,
    // just missing rules - a silent failure with no error anywhere.
    const css = `a::after{content:"/*"}b{color:red}/* real */c{color:blue}`;
    const out = stripCssComments(css);
    expect(out).toContain(`content:"/*"`);
    expect(out).toContain("b{color:red}");
    expect(out).toContain("c{color:blue}");
    expect(out).not.toContain("real");
  });

  it("handles an escaped quote inside a string", () => {
    const css = `a::after{content:"say \\" /* not a comment */"}b{color:red}`;
    expect(stripCssComments(css)).toContain("not a comment");
    expect(stripCssComments(css)).toContain("b{color:red}");
  });

  it("REFUSES an unterminated comment rather than swallowing the file", () => {
    // Returning the truncated string would emit a page missing most of its
    // rules, which reads as a design regression rather than a build one.
    expect(() => stripCssComments("a{color:red}/* oops\nb{color:blue}")).toThrow(/unterminated comment/);
  });

  it("REFUSES an unterminated string", () => {
    expect(() => stripCssComments(`a::after{content:"oops}`)).toThrow(/unterminated/);
  });

  it("is idempotent", () => {
    const once = stripCssComments(DOCUMENT_CSS);
    expect(stripCssComments(once)).toBe(once);
  });

  it("removes every comment from the real stylesheet and keeps every rule", () => {
    const out = stripCssComments(DOCUMENT_CSS);
    expect(out).not.toContain("/*");
    // The population, asserted. A stripper that returned its input unchanged
    // would pass "no comments" only if there were none to begin with - so the
    // count of what it REMOVED is the control.
    const blocks = [...DOCUMENT_CSS.matchAll(/\/\*[\s\S]*?\*\//g)].length;
    expect(blocks, "the source stylesheet carries no comments at all - this test proves nothing").toBeGreaterThan(10);
    // Every selector still present. Counting braces is the cheapest whole-file
    // check that a rule was not eaten along with a comment.
    const braces = (s: string) => (s.match(/\{/g) ?? []).length;
    expect(braces(out)).toBe(braces(DOCUMENT_CSS.replace(/\/\*[\s\S]*?\*\//g, "")));
    expect(out.length).toBeLessThan(DOCUMENT_CSS.length * 0.5);
  });
});
