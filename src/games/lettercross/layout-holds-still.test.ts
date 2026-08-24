import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The board and the buttons do not move while you play.
 *
 * Reported by the operator on 2026-08-24: "i see the game keeps shrikning and
 * growing as i play". Measured on the built artifact at 1440x900, and it is not
 * the board - the board is fixed at 430px and never moved once. It is the ROW
 * BELOW it:
 *
 *   clean board, no note        panel 661   Play button at y=715
 *   Play -> refused, note shows panel 695   Play button at y=749
 *   took it back, note clears   panel 661   Play button at y=715
 *
 * 34px, every single turn, on the button you are aiming at. A `flexShrink: 0`
 * fix the day before had stopped the board being SQUEEZED - a different defect
 * with the same symptom - and left this untouched, which is why the complaint
 * came back after it was called fixed.
 *
 * Proven in both directions by rebuilding with the pre-fix shape restored: the
 * jump returns at exactly 34px, and goes to 0 with the row reserved.
 */
const SRC = readFileSync(join(__dirname, "Lettercross.tsx"), "utf8");

describe("nothing below the board moves", () => {
  it("is reading the renderer", () => {
    expect(SRC.length).toBeGreaterThan(8000);
    expect(SRC).toContain("export function Lettercross");
  });

  it("keeps the message row in the layout whether or not there is a message", () => {
    // The row must NOT be behind a `&&`. That is the whole defect: a row that
    // appears and disappears is a row that pushes everything under it.
    expect(SRC, "the message row is conditionally rendered again").not.toMatch(
      /\{\s*\(?\s*(note|over)[^}]*&&\s*\(\s*\n?\s*<div/,
    );
    // ...and it must have a FIXED height, not a minHeight that grows with text.
    const row = SRC.slice(SRC.indexOf('aria-live="polite"'), SRC.indexOf('aria-live="polite"') + 320);
    expect(row, "the message row was not found").toContain("{over ? T.over : note}");
    expect(row, "a fixed height is what reserves the space").toMatch(/height:\s*20/);
  });

  it("floats the 26-letter wild picker instead of pushing the column down", () => {
    // Twenty-six buttons arriving in flow is the biggest reflow on this screen.
    const picker = SRC.slice(SRC.indexOf("{asking !== null && ("), SRC.indexOf("{asking !== null && (") + 420);
    expect(picker, "the picker block was not found").toContain("asking !== null");
    expect(picker, "the picker is in flow again and will shove the page").toContain("position: \"absolute\"");
  });
});
