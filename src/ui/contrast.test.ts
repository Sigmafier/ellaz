import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { GAMES } from "../portal/games";
import { contrastRatio, inkFor, inkContrast, INK_DARK, INK_LIGHT } from "./ink";

/**
 * Every readable pairing this app renders, measured rather than eyeballed.
 *
 * This test failed the day it was written, which is the point: minesweeper's
 * slate read 3.23:1 and sequence's violet 3.49:1 under the single hardcoded
 * ink the name strips used to carry, and sudoku's blue failed BOTH inks at
 * 4.38 and 3.87 - so it needed its colour nudged, not its ink chosen better.
 *
 * WCAG 2.2 AA: 4.5:1 for normal text, 3:1 for large text and UI components.
 * The name strip is bold 13.5-14px, which is not "large" by the spec's
 * definition (18.66px bold), so the floor here is 4.5.
 */

const FLOOR = 4.5;

const TOKENS = readFileSync(fileURLToPath(new URL("./tokens.css", import.meta.url)), "utf8");

/** Resolve a token to its literal value inside one theme block. */
function tokenValue(theme: "night" | "market", name: string): string {
  const stripped = TOKENS.replace(/\/\*[\s\S]*?\*\//g, "");
  // By attribute, never by full selector: which theme also carries the bare
  // `:root` is what the flip changes, and this lookup must survive it.
  const at = stripped.indexOf(`[data-theme="${theme}"]`);
  const open = stripped.indexOf("{", at);
  const block = stripped.slice(open + 1, stripped.indexOf("}", open));
  const m = new RegExp(`${name}:\\s*([^;]+);`).exec(block);
  if (!m) throw new Error(`token ${name} not found in ${theme}`);
  const raw = m[1].trim();
  // One level of indirection is enough here: night's ink siblings alias their
  // bright value, and nothing else in these blocks chains further.
  const ref = /^var\((--[a-z0-9-]+)\)$/.exec(raw);
  return ref ? tokenValue(theme, ref[1]) : raw;
}

describe("game name strips are readable on every accent", () => {
  it("covers the whole roster", () => {
    // Without this the suite passes vacuously if GAMES ever comes back empty.
    expect(GAMES.length).toBeGreaterThanOrEqual(21);
  });

  it.each(GAMES.map((g) => [g.id, g.color] as const))(
    "%s (%s) clears 4.5:1 with the ink inkFor picks",
    (_id, color) => {
      expect(inkContrast(color)).toBeGreaterThanOrEqual(FLOOR);
    },
  );

  it("actually exercises both inks", () => {
    // A roster where every colour happens to want the dark ink would pass the
    // assertions above while proving nothing about the light branch. Two games
    // (minesweeper, sequence) are the reason inkFor exists.
    const picks = new Set(GAMES.map((g) => inkFor(g.color)));
    expect(picks).toContain(INK_DARK);
    expect(picks).toContain(INK_LIGHT);
  });

  it("pins the three strips that failed under the old single ink", () => {
    // Literal historical colours, not today's meta - one of the three has
    // since been nudged, so reading it from GAMES would quietly stop testing
    // the thing this pins. Had the old hardcoded dark ink been fine, none of
    // this machinery would be justified.
    const before = { minesweeper: "#636e72", sequence: "#6c5ce7", sudoku: "#0984e3" };
    for (const [, color] of Object.entries(before)) {
      expect(contrastRatio(color, INK_DARK)).toBeLessThan(FLOOR);
    }
    // Choosing the better ink rescues two of the three...
    expect(inkContrast(before.minesweeper)).toBeGreaterThanOrEqual(FLOOR);
    expect(inkContrast(before.sequence)).toBeGreaterThanOrEqual(FLOOR);
    // ...and cannot rescue the third, which is why sudoku's colour moved.
    // 4.38 dark, 3.87 light: no ink sits on that blue.
    expect(inkContrast(before.sudoku)).toBeLessThan(FLOOR);
  });
});

describe("theme text tokens are readable on their own surfaces", () => {
  for (const theme of ["night", "market"] as const) {
    it(`${theme}: body text on the surface`, () => {
      expect(
        contrastRatio(tokenValue(theme, "--text"), tokenValue(theme, "--surface")),
      ).toBeGreaterThanOrEqual(FLOOR);
    });

    it(`${theme}: dimmed text on the surface`, () => {
      // --text-dim labels stat captions at 12px, so it gets the same floor.
      expect(
        contrastRatio(tokenValue(theme, "--text-dim"), tokenValue(theme, "--surface")),
      ).toBeGreaterThanOrEqual(FLOOR);
    });

    it(`${theme}: text on the page background`, () => {
      const page = tokenValue(theme, "--bg");
      expect(contrastRatio(tokenValue(theme, "--text"), page)).toBeGreaterThanOrEqual(FLOOR);
    });

    it(`${theme}: on-brand label on the brand fill`, () => {
      expect(
        contrastRatio(tokenValue(theme, "--on-brand"), tokenValue(theme, "--brand")),
      ).toBeGreaterThanOrEqual(3);
    });

    // The ink siblings exist to be used as TEXT. Night aliases them to the
    // bright accents, which is only safe because night's surface is dark - so
    // this assertion is a real constraint in both themes, not a formality.
    for (const accent of [
      "--brand-ink",
      "--brand-2-ink",
      "--teal-ink",
      "--yellow-ink",
      "--red-ink",
      "--green-ink",
      "--pink-ink",
      "--orange-ink",
    ]) {
      it(`${theme}: ${accent} on the surface`, () => {
        expect(
          contrastRatio(tokenValue(theme, accent), tokenValue(theme, "--surface")),
        ).toBeGreaterThanOrEqual(FLOOR);
      });
    }
  }
});

/**
 * LABEL PAIRINGS - the pairs a component actually declares, at the 4.5 floor.
 *
 * This block exists because the assertion above it was green over a real
 * defect for months, and it was green for two separate reasons worth naming.
 *
 * 1. IT USED THE WRONG FLOOR. "on-brand label on the brand fill" asserts >= 3.
 *    3:1 is the floor for a UI COMPONENT or a graphic - the chip's fill
 *    against the card behind it. The label ON that fill is text, and text is
 *    4.5. --on-brand on market's --brand measures 3.14, so the one assertion
 *    covering the brand button passed a pairing that fails for its own label.
 *
 * 2. IT ASSERTED A PAIR NOTHING RENDERED. The pair in the test is
 *    (--on-brand, --brand). The pair `Button`, `ReportSheet` and `Lab` all
 *    shipped is (--text, --brand-fill), which the test never names. A
 *    contrast suite built from a hand-kept list of token pairs measures the
 *    list, not the app - the same shape as
 *    `.claude/rules/a-path-filter-is-a-hand-kept-mirror-of-an-import-graph.md`.
 *
 * Measured on RENDERED PIXELS 2026-09-02, not on the CSS, because a gradient
 * only has a ratio once something paints it:
 *
 *     pairing                            market   night
 *     --text      on --brand-fill         5.34     2.53
 *     --on-brand  on --brand              3.14     4.86
 *     --on-brand  on --brand-strong       5.87     4.86   <- the only one that
 *                                                            clears in both
 */
describe("a label's fill clears the TEXT floor, in both themes", () => {
  for (const theme of ["night", "market"] as const) {
    it(`${theme}: --on-brand on --brand-strong`, () => {
      expect(
        contrastRatio(tokenValue(theme, "--on-brand"), tokenValue(theme, "--brand-strong")),
      ).toBeGreaterThanOrEqual(FLOOR);
    });
  }

  /**
   * A gradient has no contrast ratio - it has a worst stop, and the worst stop
   * governs. Night's --brand-fill runs --brand-2 -> --brand, and NO ink clears
   * 4.5 across it: white reads 2.43 on the light stop, --text reads 2.25.
   *
   * So this is not "pick a better ink"; it is "text never sits on this token".
   * The assertion is the reason --brand-strong exists, and it fails the day
   * somebody flattens the gradient - at which point delete it, do not widen it.
   */
  it("night's --brand-fill cannot carry a label at all, which is why it never does", () => {
    const stops = [tokenValue("night", "--brand-2"), tokenValue("night", "--brand")];
    for (const ink of [tokenValue("night", "--on-brand"), tokenValue("night", "--text")]) {
      const worst = Math.min(...stops.map((s) => contrastRatio(ink, s)));
      expect(worst).toBeLessThan(FLOOR);
    }
  });

  /**
   * The defect this block was written from, pinned so it cannot be quietly
   * re-introduced or quietly fixed. --on-brand on market's --brand is 3.14,
   * and it ships today in `ShareSheet`'s primary button and two `Boards`
   * labels. Fixing those to --brand-strong REDS this test, which is the point:
   * the fix should delete this assertion, not edit it.
   */
  it("market's --brand still cannot carry a white label (known, 2 call sites)", () => {
    const r = contrastRatio(tokenValue("market", "--on-brand"), tokenValue("market", "--brand"));
    expect(r).toBeLessThan(FLOOR);
    expect(r).toBeGreaterThanOrEqual(3);
  });
});
