// The win-screen share chip must not be painted over a control.
//
// WHY THIS TEST EXISTS, AND WHY IT READS SOURCE RATHER THAN A RENDER
// The chip shipped for one afternoon as `position: absolute` anchored to
// `bottom: max(12px, ...)` of the GameHost container, centred, at zIndex 20.
// That is precisely where every DirectionPad game puts its steering and where
// `memory` puts its "Two players" button. Measured in a browser on the built
// bundle (2026-09-03): the pill covered memory's "Two players" (chip 526-556
// against button 512-549) and maze's DOWN arrow (chip 443-495 against arrow
// 432-492).
//
// Nothing in the suite could see it. A button covering another button mounts,
// renders, type-checks and passes every assertion anyone had written - the
// defect is geometric, and it only exists once a real layout is on a real
// screen. A jsdom render would not have caught it either: jsdom has no layout,
// so every rect it reports is 0x0 and no two elements ever overlap.
//
// So this guards the DECISION rather than the pixels: the chip lives in normal
// flow, reserving its own strip, and does not get an absolute/fixed position or
// a stacking order that would let it sit on top of something. If a future
// change wants it floating again, that change has to come with a real
// measurement against a DirectionPad game - and deleting this test is how it
// says so.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SRC = readFileSync(new URL("./GameHost.tsx", import.meta.url), "utf8");

/** The JSX block that renders the chip, from its guard to the close of its wrapper. */
function chipBlock(src: string): string {
  const start = src.indexOf("{share && !share.open && (");
  expect(start, "the chip's render guard has moved or been renamed").toBeGreaterThan(-1);
  const end = src.indexOf("{share?.open && shareSheetMod && (", start);
  expect(end, "the sheet block that used to follow the chip has moved").toBeGreaterThan(start);
  return src.slice(start, end);
}

describe("the win-screen share chip", () => {
  const block = chipBlock(SRC);

  it("is in normal flow, so it reserves space instead of covering a control", () => {
    expect(block).not.toMatch(/position:\s*["']absolute["']/);
    expect(block).not.toMatch(/position:\s*["']fixed["']/);
  });

  it("carries no stacking order, because nothing it could stack above is its to cover", () => {
    expect(block).not.toMatch(/zIndex/);
  });

  it("is not anchored to an edge of the play area", () => {
    // `bottom` / `insetBlockEnd` are what pinned it over the direction pad.
    expect(block).not.toMatch(/\bbottom:/);
    expect(block).not.toMatch(/insetBlockEnd/);
  });

  it("still renders a real button carrying the share label", () => {
    expect(block).toMatch(/<Button/);
    expect(block).toMatch(/t\("shareResult"\)/);
  });

  it("the block this test reads is the chip's, and not something else", () => {
    // A vacuity guard: if `chipBlock` ever returns the wrong slice, the four
    // assertions above pass by accident on markup that never mentions a chip.
    expect(block).toMatch(/Icon name="share"/);
    expect(block.length).toBeGreaterThan(120);
  });
});
