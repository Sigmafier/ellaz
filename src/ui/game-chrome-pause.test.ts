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

describe("the level toggle survives a fourth button", () => {
  it("has a shrink FLOOR, not zero", () => {
    // The mutation this exists for is one character: `minWidth: 0`. It
    // type-checks, renders, passes every width assertion, and clips the level
    // name inside its own card on a 390px phone.
    // The floor is a TOKEN now (`--gc-level-min`, declared in tokens.css so the
    // Design Bench can turn it), so this reads the fallback the component
    // carries. Both shapes are accepted deliberately: reverting to a bare
    // literal is a legitimate state of the file, and a matcher that refused it
    // would fail over the thing it is measuring rather than over the defect.
    const floor =
      /minWidth: "var\(--gc-level-min,\s*(\d+)px\)",/.exec(SRC) ??
      /minWidth: (\d+),\n\s*border: "none"/.exec(SRC);
    expect(floor, "the level toggle no longer declares a minWidth").toBeTruthy();
    expect(Number(floor![1])).toBeGreaterThanOrEqual(120);
  });

  it("is allowed to keep that floor, rather than being basis-zero", () => {
    // `flex: "1 1 0"` sets the basis to zero, which lets the item shrink past
    // `minWidth` in the same way `minWidth: 0` does. Both halves are needed:
    // fixing one and leaving the other clips exactly as before.
    // BASIS 0, not auto - changed 2026-08-20 with a measurement behind it.
    // The floor is what makes the row wrap instead of shrinking; the basis
    // never was. On `auto` the card's basis is its own content, so it grows
    // past the floor and starves the cells beside it: snake's difficulty took
    // 184px on the built artifact and left the score cell 60, which rendered
    // its record as "Be...". What this test is really pinning is the FLOOR
    // above, which is unchanged.
    expect(SRC).toContain("flex: \"1 1 0\"");
  });

  it("sits in a row that wraps, which is what the floor makes use of", () => {
    // Without `flexWrap` a floor that cannot be met overflows the container
    // instead - and this container clips rather than scrolls, so the toggle
    // would be sliced off at the edge rather than moved to its own line.
    // The gap is a token now (`GAP`), so this pins the property rather than the
    // literal 8 - which is the part that matters and the part a restyle must
    // not be able to remove. The 8 itself is pinned by the panel bench's test,
    // against the fallback in the component.
    expect(SRC).toMatch(/gap: GAP,\s*\n\s*flexWrap: "wrap"/);
  });
});
