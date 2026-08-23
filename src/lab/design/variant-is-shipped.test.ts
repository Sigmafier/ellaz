import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { SHIPPED, VARIANTS, type ChromeSpec } from "./spec";

/**
 * THE PIN.
 *
 * A layout gets approved as a picture and then quietly drifts, because the
 * approval lives in a chat message and the numbers live in two files nobody
 * diffs. This reads those two files and requires them to equal `SHIPPED`.
 *
 * It reads SOURCE rather than a built artifact on purpose: the failure it
 * exists for is somebody editing a literal, and that is visible in the source
 * the moment it happens, without a build. `assert-pages.mjs` already reads
 * `dist/`, and this is the layer above it.
 */

const LAYOUT = readFileSync(new URL("../../build/layout.ts", import.meta.url), "utf8");
const CHROME = readFileSync(new URL("../../ui/GameChrome.tsx", import.meta.url), "utf8");

/** `--hh:60px` inside the wide `body.screen{...}` block. */
function emittedToken(name: string, arm: "wide" | "narrow"): number {
  // The wide block declares --tap; the narrow override is the one that does not.
  const blocks = [...LAYOUT.matchAll(/body\.screen\{([^}]*)\}/g)].map((m) => m[1]);
  expect(blocks.length, "layout.ts must declare body.screen tokens in two arms").toBeGreaterThan(1);
  const block = blocks.find((b) => (arm === "wide" ? b.includes("--tap") : !b.includes("--tap")));
  expect(block, `no ${arm} body.screen block`).toBeTruthy();
  const m = new RegExp(`${name}:\\s*(\\d+)px`).exec(block as string);
  expect(m, `${name} missing from the ${arm} arm`).toBeTruthy();
  return Number((m as RegExpExecArray)[1]);
}

/** A `const NAME = 56;`-shaped literal in GameChrome. */
function chromeConst(name: string): number {
  const m = new RegExp(`const ${name}\\s*=\\s*(\\d+)`).exec(CHROME);
  expect(m, `${name} missing from GameChrome.tsx`).toBeTruthy();
  return Number((m as RegExpExecArray)[1]);
}

/**
 * The px fallback inside a `var(--gc-x, 56px)` read.
 *
 * The fallback may be written as a template placeholder (`${TAP}px`), which is
 * the shape that keeps ONE literal in the file rather than two that can
 * disagree - so a placeholder is resolved against the const it names. Reading
 * only a bare digit would report "no fallback" on the better-written of the
 * two shapes, which is a matcher failing over the thing it is measuring.
 */
function chromeFallback(token: string): number {
  const m = new RegExp(`var\\(${token},\\s*(?:\\$\\{(\\w+)\\}|(\\d+))px\\)`).exec(CHROME);
  expect(m, `${token} is not read with a px fallback in GameChrome.tsx`).toBeTruthy();
  const [, name, digits] = m as RegExpExecArray;
  return digits ? Number(digits) : chromeConst(name);
}

/** What the two source files ACTUALLY say, right now. */
function readShipped(): Pick<
  ChromeSpec,
  "hh" | "hhNarrow" | "uh" | "uhNarrow" | "headerTap" | "panelTap" | "breadcrumb"
> {
  return {
    hh: emittedToken("--hh", "wide"),
    hhNarrow: emittedToken("--hh", "narrow"),
    uh: emittedToken("--uh", "wide"),
    uhNarrow: emittedToken("--uh", "narrow"),
    headerTap: emittedToken("--tap", "wide"),
    panelTap: chromeFallback("--gc-tap"),
    breadcrumb: crumbShape(LAYOUT),
  };
}

/**
 * Pill or plain, read off a stylesheet.
 *
 * Extracted from `readShipped` so the control below can hand it CSS that is
 * NOT this tree's. It used to be inline, and the control asserted that the two
 * variants differ - which was a real control only while they did. They stopped
 * differing the moment the operator picked plain and the tree matched the
 * approval, i.e. exactly when the bench had done its job, and the assertion
 * would then have been satisfied by the two readers going blind together.
 */
export function crumbShape(css: string): "pill" | "plain" {
  return /\.urow\s*\.bc\{[^}]*border-radius:\s*99px/s.test(css) ? "pill" : "plain";
}

describe("the shipped chrome matches the variant that says it is shipped", () => {
  it("agrees on every emitted token", () => {
    const live = readShipped();
    expect(live.hh).toBe(SHIPPED.hh);
    expect(live.hhNarrow).toBe(SHIPPED.hhNarrow);
    expect(live.uh).toBe(SHIPPED.uh);
    expect(live.uhNarrow).toBe(SHIPPED.uhNarrow);
    expect(live.headerTap).toBe(SHIPPED.headerTap);
  });

  it("agrees on every panel number", () => {
    const live = readShipped();
    expect(live.panelTap).toBe(SHIPPED.panelTap);
  });

  it("agrees on the breadcrumb shape", () => {
    expect(readShipped().breadcrumb).toBe(SHIPPED.breadcrumb);
  });

  /**
   * The positive control, and it is deliberately NOT "the two variants
   * differ".
   *
   * It was that until 2026-08-23, when the operator picked plain and shipped
   * became byte-equal to `g1`. A control phrased as a difference between two
   * records goes vacuous precisely when the work SUCCEEDS - the bench exists
   * to make those two agree - and a reader that had quietly stopped matching
   * anything would then pass it too, since both sides would read `plain`.
   *
   * So the control proves the READER can express both answers, by handing it
   * two stylesheets it did not come from. That holds whether or not the tree
   * and the record agree.
   */
  it("can tell a pill from a plain crumb", () => {
    const pill = "body.screen .urow .bc{margin:0;padding:7px 16px;border-radius:99px}";
    const plain = "body.screen .urow .bc{margin:0;white-space:nowrap}";
    expect(crumbShape(pill)).toBe("pill");
    expect(crumbShape(plain)).toBe("plain");
    // ...and it is reading OUR rule, not any rounded thing on the page.
    expect(crumbShape("body.screen .urow .tools{border-radius:99px}")).toBe("plain");
  });

  /**
   * Where the two records stand. Written as an assertion rather than left to
   * the reader, because "shipped == approved" is the whole verdict of the
   * bench and it should break loudly if anything reopens it.
   */
  it("has shipped everything g1 asked for", () => {
    expect(VARIANTS.shipped).toEqual(VARIANTS.g1);
  });

  /** A number nobody can read is a number nobody can pin. */
  it("finds a real literal for the panel cell, not a default", () => {
    expect(() => chromeConst("DOT_MAX")).not.toThrow();
    expect(chromeConst("DOT_MAX")).toBeGreaterThan(0);
  });
});
