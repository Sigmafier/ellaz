import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The shared level row must WRAP, because its item count is decided by whoever
// calls it and at least one caller passes a data-driven list.
//
// This is a source scan rather than a render test on purpose: the defect it
// guards is invisible to a rendered-width check. Flex items shrink before they
// overflow, so a row of six pills reports the same width as its container, no
// element is "wider than the frame", and the text is clipped INSIDE each pill.
// Measured on the built artifact at 390px before the fix: `Expert` rendered as
// `Exper` (48px box, 58px needed) and both `Animals N×N` pills lost their last
// glyph. `scrollWidth > clientWidth` on the ROW was 0 the whole time.
//
// Sudoku already knew. `Sudoku.tsx` splits its own six levels across two rows
// with the comment "it overflows a phone" — the boards screen put all six back
// onto one.

const SRC = new URL("./DifficultySelector.tsx", import.meta.url);

describe("the shared level row", () => {
  it("wraps, because its length is the caller's decision", () => {
    const src = readFileSync(SRC, "utf8");
    expect(src).toMatch(/flexWrap:\s*"wrap"/);
  });

  it("gives wrapped rows their own vertical gap", () => {
    // `gap` alone would work, but naming rowGap is what makes a second row read
    // as a second row rather than as two pills that drifted.
    const src = readFileSync(SRC, "utf8");
    expect(src).toMatch(/rowGap:/);
  });
});
