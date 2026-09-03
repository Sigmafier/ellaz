import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * The crash card sizes ITSELF.
 *
 * Measured 2026-09-03 on the built artifact, with `memory` forced to throw
 * during render: the card shipped as `position:absolute; inset:0` inside the
 * game's mount node, and that node is 0px tall when the game never rendered -
 * the GAME is what gives the stage its height. So `inset:0` resolved to a
 * zero-height box and `place-items:center` centred the content ABOUT that line.
 * Half the card overflowed UPWARD, off the top of the page:
 *
 *   before   the 😵 at y=22, behind the fixed top bar; the heading sliced by
 *            the breadcrumb row
 *   after    the 😵 at y=158, and `elementFromPoint` at its centre returns the
 *            face itself - nothing over it
 *
 * The one screen whose entire job is to reassure a child that their game did
 * not break because of them, with its face cut off.
 *
 * This is a SOURCE assertion because `vitest.config.ts` runs the node
 * environment over `*.test.ts` - nothing here can lay a component out. It is
 * therefore a guard on the SHAPE of the fix, not on the pixels; the pixels are
 * held by `scripts/repro/shoot-report-screens.mjs --crash`, which photographs
 * this card on a build where a game really throws.
 */

const SRC = readFileSync(new URL("./GameBoundary.tsx", import.meta.url), "utf8");

/**
 * COMMENTS OUT FIRST, and the first version of this file did not.
 *
 * The fix's own comment explains the bug by naming `inset:0`, so the very
 * assertion forbidding that declaration matched the sentence describing why it
 * is forbidden - a red test over correct code, pointing at the right file for
 * the wrong reason. `.claude/rules/a-diagnostic-that-truncates-what-it-compares.md`
 * already collects this one: a scan that cannot tell a string from the prose
 * about it. Block comments and line comments both, in that order, because a
 * `//` inside a block comment is not a line comment.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

// The card's own style object, so a `position:absolute` somewhere else in the
// file (there is none today) cannot make this pass or fail by accident.
const CARD = code(SRC).slice(code(SRC).indexOf("render(): ReactNode"));

describe("the crash card", () => {
  it("does not position itself against a parent that may have collapsed", () => {
    expect(CARD).not.toMatch(/position:\s*"absolute"/);
    expect(CARD).not.toMatch(/inset:\s*0/);
  });

  it("carries a height floor that survives a zero-height parent", () => {
    // `max(320px, 100%)` is the whole trick: a percentage min-height against an
    // auto-height parent resolves to nothing, so the floor wins exactly when
    // the stage collapsed - and the parent's height wins whenever there is one.
    const m = /minHeight:\s*"max\((\d+)px,\s*100%\)"/.exec(CARD);
    expect(m, "minHeight must be a max() of a px floor and 100%").toBeTruthy();
    // Tall enough for a face, a heading, a note and two buttons. Measured: the
    // rendered card is ~250px at 390px wide, so this has real margin over it
    // rather than being tuned to today's copy.
    expect(Number(m![1])).toBeGreaterThanOrEqual(280);
  });

  it("still centres its content, which is the part the fix must not lose", () => {
    expect(CARD).toMatch(/placeItems:\s*"center"/);
    expect(CARD).toMatch(/alignContent:\s*"center"/);
  });
});
