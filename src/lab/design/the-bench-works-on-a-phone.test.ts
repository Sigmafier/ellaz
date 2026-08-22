import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The bench, on the phone it is dogfooded from.
 *
 * Both defects pinned here were reported as one sentence - "the lab doesn't do
 * anything, I tried moving stuff around" - and both were measured on the live
 * bench at 390x844 before anything was written:
 *
 *   a wheel over the preview scrolled the lab by    0px
 *   the same wheel 40px lower scrolled it by     1146px
 *   a full drag of a knob changed the frame after ~500ms, and nothing during
 *
 * The preview spanned two thirds of the screen, so the knobs were below the
 * fold behind a dead zone, and the ones that could be reached did nothing
 * until you let go. Neither is visible from a desktop, which is why they are
 * assertions rather than something to remember.
 */

const DIR = join(process.cwd(), "src/lab/design");
const read = (f: string) => readFileSync(join(DIR, f), "utf8");
const TSX = readdirSync(DIR).filter((f) => f.endsWith(".tsx"));

/** The off-screen scanner in `Buttons.tsx` - never seen, never swiped over. */
const isHiddenScanner = (block: string) => /position:\s*"absolute"/.test(block) && /-9999/.test(block);

/** Every `<iframe` in the file, with enough of what follows to judge it. */
function frames(src: string): string[] {
  return [...src.matchAll(/<iframe[\s\S]{0,400}?\/>/g)].map((m) => m[0]);
}

describe("a preview is a thing you look at, not a thing that eats your swipe", () => {
  it("every visible preview goes through Preview, which shields it", () => {
    const loose: string[] = [];
    for (const f of TSX) {
      if (f === "Preview.tsx") continue;
      for (const block of frames(read(f))) {
        if (!isHiddenScanner(block)) loose.push(`${f}: ${block.slice(0, 60).replace(/\s+/g, " ")}`);
      }
    }
    expect(loose).toEqual([]);
  });

  it("- and the check can see a raw one (control)", () => {
    const planted = `<iframe ref={frame} title="x" src={u} style={{ width: 390, height: 844 }} />`;
    expect(frames(planted).length).toBe(1);
    expect(isHiddenScanner(frames(planted)[0])).toBe(false);
  });

  it("the shield covers the whole frame and is lifted only on purpose", () => {
    const src = read("Preview.tsx");
    // Covering is the entire mechanism: a sheet that is not `inset: 0` leaves a
    // strip of live iframe, and a swipe that starts in the strip is eaten
    // exactly as before.
    expect(src).toMatch(/SHIELD[^=]*=\s*{[^}]*position:\s*"absolute"[^}]*inset:\s*0/);
    expect(src).toMatch(/\{live \? null : <div style=\{SHIELD\}/);
    // And it can be lifted, or the preview would be a picture.
    expect(src).toMatch(/setLive\(/);
  });

  it("the pin sits on the flex ITEM, and the frame carries no border", () => {
    const src = read("Preview.tsx");
    // Measured, two arms and one variable: `sticky` on a div INSIDE the column
    // put the frame at top -594 after a 700px scroll, and on the flex item at
    // top 0. A sticky box is clamped to its containing block, and a column
    // exactly as tall as its preview offers nowhere to travel - so the wrong
    // one scrolls away looking exactly like no support for sticky at all.
    const col = /<div\s+ref=\{box\}[\s\S]{0,600}?>/.exec(src)?.[0] ?? "";
    expect(col).toContain('flex: "1 1 320px"');
    expect(col).toContain('position: "sticky"');
    // `* { box-sizing: border-box }` is in the app's own reset, so a 1px border
    // on a 390px frame previews a 388px viewport - and this bench argues about
    // rows that fit or wrap by ONE pixel.
    expect(src).toMatch(/border:\s*"none"/);
    expect(src).toMatch(/boxShadow:\s*`0 0 0 1px/);
  });

  it("the frame is SCALED, never narrowed - the measurement depends on it", () => {
    const src = read("Preview.tsx");
    // A narrowed frame lays out as a narrower viewport, so every number read
    // off it would be a number no phone produces.
    expect(src).toMatch(/transform:\s*`scale\(\$\{scale\}\)`/);
    expect(src).toMatch(/transformOrigin:\s*"top left"/);
    expect(src).toMatch(/width:\s*w,/);
  });
});

describe("a knob lands at once", () => {
  const KNOBBED = ["Screen.tsx", "Buttons.tsx"];

  it("neither knobbed screen rebuilds a timer around apply", () => {
    for (const f of KNOBBED) {
      const src = read(f);
      expect(src, `${f} still polls apply`).not.toMatch(/setInterval\(\s*(apply|\(\)\s*=>\s*{?\s*apply)/);
      expect(src, `${f} does not use the hook`).toContain("useLiveApply(apply");
    }
  });

  it("- and the check can see a poll (control)", () => {
    const planted = "const t = setInterval(apply, 600);";
    expect(planted).toMatch(/setInterval\(\s*(apply|\(\)\s*=>\s*{?\s*apply)/);
    const planted2 = "const t = setInterval(() => { apply(); }, 500);";
    expect(planted2).toMatch(/setInterval\(\s*(apply|\(\)\s*=>\s*{?\s*apply)/);
  });

  it("the hook applies on every change and polls only on the frame", () => {
    const src = readFileSync(join(DIR, "useLiveApply.ts"), "utf8");
    // The whole fix is these two dependency arrays being DIFFERENT. Keying the
    // poll on `apply` is what let a drag reset the clock faster than it ticked.
    expect(src).toMatch(/apply\(\);\s*}\s*,\s*\[apply\]\)/);
    expect(src).toMatch(/}\s*,\s*\[frameKey\]\)/);
    expect(src).not.toMatch(/setInterval[\s\S]{0,200}\[\s*apply\s*\]/);
  });
});

/**
 * A lab screen that does not declare a scroller is CLIPPED, not scrollable.
 *
 * `body.app-shell{overflow:hidden;height:100%}` is correct for an application
 * that manages its own scroll regions, and it means the shell clips anything a
 * lab route renders past the fold. `Buttons.tsx` and `Compare.tsx` scroll by
 * ACCIDENT - they set `overflowX: hidden` to stop a 390px preview pushing the
 * page sideways, and a block with a clipped x-axis computes `overflow-y` to
 * `auto` whether or not anybody meant it.
 *
 * Measured on the inspector at 390x844 the first time it ran, before it declared
 * one: 1403px of content in an 844px box, `scrollTop` stuck at 0, and no
 * scroller anywhere in the chain up to `<html>`. Same sentence as the two
 * defects above - the lab does not do anything - from a third cause.
 *
 * So: every lab root either clips its x-axis (and gets a scroller as a side
 * effect) or says `overflowY` outright. The rule is written as "one of the
 * two" rather than "both", because retrofitting the older screens to be
 * explicit is a change to files this test is meant to be watching.
 */
describe("a lab screen is its own scroller, because the app shell clips", () => {
  const ROOTS = ["Buttons.tsx", "Compare.tsx", "Screen.tsx"];

  it("every lab root declares one", () => {
    const bad: string[] = [];
    for (const f of ROOTS) {
      const src = read(f);
      if (!/overflowX:\s*"hidden"/.test(src) && !/overflowY:\s*"auto"/.test(src)) bad.push(f);
    }
    expect(bad, "these render past the fold inside a body that clips").toEqual([]);
  });

  it("the two that were measured say both axes rather than leaning on the side effect", () => {
    // `Compare.tsx` was found by the test above, not by a person: it declared
    // neither, and a wheel over its preview at 390x844 moved it 0px while
    // `#/lab/buttons` moved 788. It moves 900 now.
    for (const f of ["Screen.tsx", "Compare.tsx"]) {
      expect(read(f), `${f} names overflowY`).toMatch(/overflowY:\s*"auto"/);
      expect(read(f), `${f} names overflowX`).toMatch(/overflowX:\s*"hidden"/);
    }
  });

  it("the control that proves the matcher can fail", () => {
    // Buttons.tsx is the positive control for the FIRST test and the negative
    // control for the second: it clips x and never names overflowY, so a
    // matcher that reported "both axes" on it would be matching nothing.
    expect(read("Buttons.tsx")).not.toMatch(/overflowY:\s*"auto"/);
  });
});

/**
 * A knob below the fold is a knob that does not exist.
 *
 * Reported as "the mobile exp is bad i uave to scroll down to see", and
 * measured on the live bench at 390x844 before the shell was written: 275px of
 * heading and prose above the preview, a 520px preview under it, and the first
 * slider at y=1094 - 290px below an 844px fold. Every word above the picture
 * was being paid for by the thing the picture is for.
 *
 * The shell answers it structurally rather than by trimming: exactly one
 * viewport tall, `overflow: hidden` so the PAGE cannot scroll at all, and the
 * only scroller on the screen is the sheet holding the knobs. There is no
 * fold to be below.
 */
describe("on a small screen the page does not scroll, because there is no fold", () => {
  const SRC = read("Screen.tsx");

  it("the shell is one viewport tall and clips", () => {
    const m = /const SHELL: CSSProperties = \{([\s\S]*?)\};/.exec(SRC);
    expect(m, "SHELL is gone or renamed").toBeTruthy();
    const body = (m as RegExpExecArray)[1];
    expect(body, "the shell must be exactly one viewport").toMatch(/height:\s*"100dvh"/);
    expect(body, "the page itself must not scroll").toMatch(/overflow:\s*"hidden"/);
  });

  it("the sheet is the one scroller", () => {
    const m = /const SHEET: CSSProperties = \{([\s\S]*?)\};/.exec(SRC);
    expect(m, "SHEET is gone or renamed").toBeTruthy();
    expect((m as RegExpExecArray)[1]).toMatch(/overflowY:\s*"auto"/);
    expect((m as RegExpExecArray)[1]).toMatch(/minHeight:\s*0/);
  });

  it("it is chosen on EITHER axis, so a phone on its side gets it too", () => {
    // Keyed on width alone, 844x390 falls to the two-column desktop layout,
    // which needs more than 390px of height - measured, that arm scrolled the
    // page 460px, the same defect arriving through the one branch nobody
    // thought to check.
    const m = /const isSmall = \(\) =>([^;]*);/.exec(SRC);
    expect(m, "isSmall is gone or renamed").toBeTruthy();
    const body = (m as RegExpExecArray)[1];
    expect(body, "must consider the width").toMatch(/innerWidth\s*</);
    expect(body, "must consider the height").toMatch(/innerHeight\s*</);
    expect(body, "either one is enough").toContain("||");
  });

  it("the control that proves those matchers can fail", () => {
    // Every assertion above passes vacuously on a body that never matched.
    // Buttons.tsx has no shell, so the same matchers must find nothing there.
    expect(/const SHELL: CSSProperties/.test(read("Buttons.tsx"))).toBe(false);
    expect(/const isSmall = \(\) =>/.test(read("Buttons.tsx"))).toBe(false);
  });
});
