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
    breadcrumb: /\.urow\s*\.bc\{[^}]*border-radius:\s*99px/s.test(LAYOUT) ? "pill" : "plain",
  };
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
   * The positive control. Every assertion above passes vacuously if the two
   * readers quietly stop matching and return the same wrong thing, so one
   * variant must DISAGREE - `g1` predates the pill, and if it stops
   * disagreeing the readers have gone blind rather than the tree having
   * changed.
   */
  it("can tell two variants apart", () => {
    expect(VARIANTS.g1.breadcrumb).not.toBe(VARIANTS.shipped.breadcrumb);
    expect(readShipped().breadcrumb).not.toBe(VARIANTS.g1.breadcrumb);
  });

  /** A number nobody can read is a number nobody can pin. */
  it("finds a real literal for the panel cell, not a default", () => {
    expect(() => chromeConst("DOT_MAX")).not.toThrow();
    expect(chromeConst("DOT_MAX")).toBeGreaterThan(0);
  });
});
