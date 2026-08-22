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
  const KNOBBED = ["Panel.tsx", "Buttons.tsx"];

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
