import { describe, it, expect, afterEach } from "vitest";
import { decideAbility } from "./ShareSheet";

// `.test.ts`, NOT `.test.tsx`, and that is load-bearing rather than a style
// choice: vitest's `include` in this repo covers only `.test.ts`, so a `.tsx`
// test file is collected by nothing and reports nothing. This file was written
// as `.tsx` first and vitest answered "No test files found" - which, run as
// part of a full suite rather than on its own, would simply have been a green
// run over a file nobody executed. There are no other `.test.tsx` files in the
// tree, so this is a trap waiting for whoever writes the first one.
//
// (The note above was itself a block comment for five minutes, and the glob it
// quoted contains the character pair that CLOSES one. Line comments here.)

/**
 * The button's LABEL is a promise, and this is the function that decides which
 * promise it is allowed to make.
 *
 * `.claude/rules/destructive-actions-show-both-sides.md`: never present a
 * promise the platform has not made. One button labelled "Share" that silently
 * does something different on every device is the shape that rule exists to
 * refuse - and the label has to be right BEFORE the tap, which is why the card
 * is rasterised when the sheet opens rather than when the button is pressed.
 */

const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");

function withNavigator(value: unknown) {
  Object.defineProperty(globalThis, "navigator", { value, configurable: true, writable: true });
}

afterEach(() => {
  if (original) Object.defineProperty(globalThis, "navigator", original);
});

const file = () => ({ name: "ellaz-2026-08-13.png", type: "image/png" }) as unknown as File;

describe("what this device can actually do", () => {
  it("promises the picture only when the device accepts THIS file", () => {
    // Asked with the real file rather than a probe object. `canShare` answers
    // per payload - a browser that shares text happily can refuse a PNG - so
    // asking with anything else is asking a different question.
    withNavigator({ share: () => {}, canShare: (d: ShareData) => Array.isArray(d.files) });
    expect(decideAbility(file())).toBe("share-with-picture");
  });

  it("drops to link-only when the device refuses the file, and says so", () => {
    withNavigator({ share: () => {}, canShare: () => false });
    expect(decideAbility(file())).toBe("share-link-only");
  });

  it("drops to link-only when the card could not be drawn at all", () => {
    // The rasteriser answers null for a tainted canvas, a decode that never
    // settles, or a browser with no canvas. The link still travels.
    withNavigator({ share: () => {}, canShare: () => true });
    expect(decideAbility(null)).toBe("share-link-only");
  });

  it("does not assume canShare exists just because share does", () => {
    // Older WebViews ship `share` without `canShare`. Calling the missing one
    // would throw inside a click handler.
    withNavigator({ share: () => {} });
    expect(decideAbility(file())).toBe("share-link-only");
  });

  it("says COPY LINK, not Share, on a device with no share sheet", () => {
    withNavigator({ clipboard: { writeText: async () => {} } });
    expect(decideAbility(file())).toBe("copy");
  });

  it("promises nothing at all when there is nothing to promise", () => {
    // The message is on screen and selectable; the button is inert rather than
    // lying about what pressing it does.
    withNavigator({});
    expect(decideAbility(file())).toBe("show");
    withNavigator(undefined);
    expect(decideAbility(file())).toBe("show");
  });

  it("does not treat a clipboard-shaped object with no writeText as usable", () => {
    withNavigator({ clipboard: {} });
    expect(decideAbility(file())).toBe("show");
  });
});
