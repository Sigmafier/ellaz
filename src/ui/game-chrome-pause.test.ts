import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The pause control in `GameChrome`, pinned as SOURCE rather than as a render.
 *
 * Two of the three properties below are invisible to a rendered-DOM check, and
 * that is why they are here:
 *
 *  - the level toggle's shrink floor. Flex items shrink before they overflow,
 *    so a fourth nav button squeezing the toggle produces a row whose scroll
 *    width equals its client width, no element wider than its frame, and the
 *    only symptom a missing glyph INSIDE the card. Measured before this floor
 *    existed: `Expert` rendered as `Exper` in the boards' copy of the same
 *    defect. See a-row-that-grows-with-the-catalog-must-wrap.md.
 *  - the cover being opaque rather than a scrim. A see-through pause renders
 *    perfectly and is simply the cheapest strategy in a falling-block game.
 *
 * vitest runs `environment: "node"` here and collects only `*.test.ts`, so a
 * component cannot be mounted in this suite at all - which is the same reason
 * `difficulty-row-must-wrap.test.ts` next door reads its file.
 */

const SRC = readFileSync(new URL("./GameChrome.tsx", import.meta.url), "utf8");

/** The `<button>` the cover draws, from its `position: "absolute"` to its close. */
function coverBlock(): string {
  const start = SRC.indexOf("{paused && onPaused && (");
  expect(start, "the cover block moved - this whole file is reading the wrong text").toBeGreaterThan(
    0,
  );
  return SRC.slice(start, SRC.indexOf("</button>", start));
}

describe("the pause control", () => {
  it("is an optional PAIR, so neither half can ship alone", () => {
    // `paused` without `onPaused` is a cover nobody can dismiss; `onPaused`
    // without `paused` is a button that never reflects what it did. Both the
    // button and the cover are gated on the CALLBACK, which is the half that
    // cannot be inferred.
    //
    // The BUTTON is normally drawn by the page, in the utility row above the
    // stage - `hasPause` is what hands this game's state to it, and the
    // fallback below it only fires in the standalone bundle, which has no
    // emitted chrome at all. The COVER is always this component's.
    expect(SRC).toContain("const hasPause = onPaused !== undefined;");
    expect(SRC).toContain("onPaused &&");
    expect(SRC).toContain("{paused && onPaused && (");
  });

  it("draws two different glyphs, not one that never changes", () => {
    // A pause button stuck on the pause icon is the single most likely way for
    // this to look broken: the state is correct, the game really is stopped,
    // and the control says it is not.
    expect(SRC).toMatch(/navBtn\(paused \? "play" : "pause"/);
    expect(SRC).toMatch(/paused \? t\("resume"\) : t\("pause"\)/);
  });

  it("covers the board rather than dimming it", () => {
    const cover = coverBlock();
    expect(cover).toContain("position: \"absolute\"");
    expect(cover).toContain("inset: 0");
    // An OPAQUE token. Anything with an alpha channel is a scrim, and a scrim
    // is a pause you can read the board through.
    expect(cover).toMatch(/background: "var\(--bg\)"/);
    expect(cover, "the cover is translucent - the board is readable through it").not.toMatch(
      /background:[^\n]*(rgba|hsla|transparent|opacity)/,
    );
  });

  it("gives the cover its own colour instead of inheriting one", () => {
    // `--text` is near-black on the light theme. An overlay that inherits it
    // over a dark ground is legible in exactly one theme - the trap blocks'
    // own game-over sheet carries a comment about.
    expect(coverBlock()).toContain("color: \"var(--text)\"");
  });
});

describe("the row is three fixed tracks, so it cannot wrap", () => {
  it("is a grid, not a flex row", () => {
    // The mechanism CHANGED on 2026-08-21 and this test changed with it. Flex
    // sized each cell from its own content, which is what produced 25
    // different row shapes across 33 games; tracks make every game's row the
    // same row by construction. Pinning the old floors here would now be
    // pinning a mechanism the component no longer uses.
    expect(SRC).toMatch(/display: "grid",\s*\n\s*gridTemplateColumns: COLS,/);
  });

  it("declares exactly three tracks", () => {
    // Two tracks and a game's second number has nowhere to go; four and the
    // dash slots stop lining up with the cells beside them. The count is the
    // whole standard, so it is pinned as a COUNT rather than as a string.
    const m = /const COLS = "var\(--gc-cols, ([^"]*)\)";/.exec(SRC);
    expect(m, "COLS is no longer a --gc-cols read").toBeTruthy();
    expect(m![1].match(/minmax\(/g)?.length).toBe(3);
  });

  it("gives every cell a zero floor, because a floor overflows a track", () => {
    // The mutation this exists for is the OPPOSITE of the one it used to
    // guard: restoring `minWidth: "var(--gc-level-min, 132px)"`. Under flex a
    // floor made the row wrap; under a grid it makes the item wider than its
    // track and the row overflows a container that clips rather than scrolls,
    // so the cell is sliced off at the edge with nothing to measure.
    expect(SRC).not.toMatch(/minWidth: "var\(--gc-level-min/);
    expect(SRC).not.toMatch(/minWidth: s\.compact \? 0 :/);
    // Three cells declare it: the level, the stat, the dash slot.
    expect(SRC.match(/minWidth: 0,/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("keeps the nav buttons OUT of the grid, so a track is never spent on an icon", () => {
    // The defect, measured on the built 2048 bundle at 390px: the restart icon
    // is 56px and was sitting in the 1.25fr track at 142.9px - 87px of the
    // widest track spent on an icon - while the difficulty was pushed into the
    // 1fr track and rendered "Cla...". Snake in play carries TWO navs.
    //
    // Pinned as ORDER in the source, because that is the whole mechanism: the
    // navBtn calls have to close before the element that declares the grid
    // opens. A render test cannot see it - both arrangements lay out, and the
    // only symptom is three lost letters inside a card that never overflows.
    const navs = SRC.indexOf('navBtn("redo"');
    const grid = SRC.indexOf('className="gc-row"');
    expect(navs, "the restart nav button is gone").toBeGreaterThan(-1);
    expect(grid, "the .gc-row grid is gone").toBeGreaterThan(-1);
    expect(navs, "a nav button is inside .gc-row again - it will eat a track").toBeLessThan(grid);
  });

  it("gives the difficulty the widest track, since it is the only cell with a word", () => {
    // Not the exact number - that is a measurement and it will move again. What
    // must hold is the ORDER: widest first. The ratio was 1.25/1/0.85 while a
    // nav sat in track one, so the widest track was never the difficulty's.
    const m = /const COLS = "var\(--gc-cols, ([^"]*)\)";/.exec(SRC)!;
    const fr = [...m[1].matchAll(/minmax\(0,([\d.]+)fr\)/g)].map((x) => Number(x[1]));
    expect(fr).toHaveLength(3);
    expect(fr[0]).toBeGreaterThan(fr[1]);
    expect(fr[1]).toBeGreaterThan(fr[2]);
  });

  it("draws the dash slot rather than hiding it", () => {
    // `none` here is the pre-2026-08-21 default and renders a row that
    // collapses to whatever a game happens to have - which is the thing the
    // operator asked to end. It is still a token so the bench can compare.
    expect(SRC).toMatch(/EMPTY_DISPLAY = "var\(--gc-empty-display, flex\)"/);
  });
});
