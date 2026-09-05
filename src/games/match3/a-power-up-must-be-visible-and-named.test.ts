/**
 * The power-up a child can SEE, and the one a screen reader can SAY.
 *
 * `a-power-up-is-made-by-a-shape.test.ts` holds the rules. This file holds the
 * two things the rules cannot: that the mark is legible on every gem it can
 * land on, and that the renderer draws it from the array it is replaying.
 *
 * ONE CELL HERE IS A REAL MEASUREMENT and the rest are source assertions.
 * Vitest runs the node environment over `src/**\/*.test.ts`, so `Match3Game.tsx`
 * cannot be rendered and read back - a source assertion can refuse a shape and
 * never prove a pixel, and it is named as the weaker instrument wherever it is
 * used. The contrast cell is different: it parses the real fills out of the
 * real file and computes the real ratio, so it reds on a seventh gem colour
 * nobody checked the mark against.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@ui/ink";
import { SHIPPED_LOCALES } from "@i18n/index";
import { KINDS, PLAIN } from "./logic";

const GAME = readFileSync(new URL("./Match3Game.tsx", import.meta.url), "utf8");

/** Every `fill:` in the GEMS table, which is where the marks actually sit. */
function gemFills(): string[] {
  const table = GAME.slice(GAME.indexOf("const GEMS"), GAME.indexOf("const CASCADE_STEPS"));
  const found = [...table.matchAll(/fill:\s*"(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1]);
  return found;
}

/**
 * The four `if (kind === X)` blocks of `KindMark`, one string each.
 *
 * A BALANCED-BRACE walk, and it took two wrong instruments to get here - both
 * of which reported four distinct branches on a file where the rainbow had
 * been mutated to draw the burst's exact markup:
 *
 *   split on the `if` and keep the chunk   -> every chunk begins with its own
 *                                             KIND NAME, so no two can collide
 *   ...and slice from the first `{` to the
 *   chunk's last `}`                       -> the LAST branch's chunk runs to
 *                                             the end of the function, so it
 *                                             carries `return null; }` and the
 *                                             one before it does not
 *
 * Both are the same defect: an instrument that cannot express the failure it
 * exists to report (a-diagnostic-that-truncates-what-it-compares.md). Only the
 * planted mutation found either.
 */
function branchBodies(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/if \(kind === \w+\) /g)) {
    const start = src.indexOf("{", m.index);
    let depth = 0;
    let end = start;
    for (; end < src.length; end += 1) {
      if (src[end] === "{") depth += 1;
      else if (src[end] === "}" && --depth === 0) break;
    }
    out.push(src.slice(start, end + 1).replace(/\s+/g, " ").trim());
  }
  return out;
}

/**
 * The extent of a path built from straight segments, in viewBox units.
 *
 * Straight segments ONLY - M/m/L/l/H/h/V/v/Z. It refuses a path carrying any
 * other command rather than guessing, because a curve or an arc BULGES past
 * the coordinates it names and a walker that ignores that reports a box too
 * small. The one arc in the table is pinned separately, by its own geometry,
 * and a cell below asserts there is still only one - so a new curved gem reds
 * here instead of quietly falling outside the population.
 *
 * The first version of this measurement approximated an arc as its endpoints
 * expanded by twice the radii, and reported the perfectly-fine circle gem as
 * -29.9..130.1. A conservative over-estimate is not a safe default: it is a
 * false positive with a confident number attached.
 */
function straightExtent(d: string): { minX: number; maxX: number; minY: number; maxY: number } {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+/g) ?? [];
  let x = 0, y = 0, sx = 0, sy = 0, cmd = "M", i = 0;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const see = () => {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  };
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) {
      cmd = tokens[i++];
      if (/[Zz]/.test(cmd)) { x = sx; y = sy; continue; }
      if (!/[MmLlHhVv]/.test(cmd)) throw new Error(`straightExtent cannot measure "${cmd}"`);
    }
    if (cmd === "M") { x = +tokens[i++]; y = +tokens[i++]; sx = x; sy = y; }
    else if (cmd === "m") { x += +tokens[i++]; y += +tokens[i++]; sx = x; sy = y; }
    else if (cmd === "L") { x = +tokens[i++]; y = +tokens[i++]; }
    else if (cmd === "l") { x += +tokens[i++]; y += +tokens[i++]; }
    else if (cmd === "H") { x = +tokens[i++]; }
    else if (cmd === "h") { x += +tokens[i++]; }
    else if (cmd === "V") { y = +tokens[i++]; }
    else { y += +tokens[i++]; }
    see();
  }
  return { minX, maxX, minY, maxY };
}

/** Every `path:` in the GEMS table, in order, 1-based like the colours. */
function gemPaths(): string[] {
  const table = GAME.slice(GAME.indexOf("const GEMS"), GAME.indexOf("const CASCADE_STEPS"));
  return [...table.matchAll(/path:\s*"([^"]*)"/g)].map((m) => m[1]).filter((d) => d.length > 0);
}

function markInk(): string {
  const m = GAME.match(/const MARK_INK = "(#[0-9A-Fa-f]{6})"/);
  if (!m) throw new Error("MARK_INK is gone - this file measures the wrong thing now");
  return m[1];
}

describe("the mark is legible on every gem it can land on", () => {
  it("found the real fills to measure, and there are six of them", () => {
    // The instrument first. A regex that matched nothing would make every
    // assertion below pass over an empty list, which is the shape this repo
    // keeps catching: a green run from a probe that could not fire.
    expect(gemFills().length).toBe(6);
    expect(markInk()).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("clears the 3:1 floor a graphical object needs, on all six", () => {
    const ink = markInk();
    for (const fill of gemFills()) {
      expect(contrastRatio(ink, fill), `mark on ${fill}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("and WHITE would not, which is why the ink is dark", () => {
    // The negative half. Without it this file passes on any ink at all and
    // says nothing about why this one was chosen - and white is the obvious
    // choice, the one that looks best on the gem anybody would test first.
    const failing = gemFills().filter((f) => contrastRatio("#FFFFFF", f) < 3);
    expect(failing.length).toBeGreaterThanOrEqual(4);
  });

  it("gives every power-up a mark of its own", () => {
    // Source assertion. Four branches, four different `d` attributes: two
    // kinds sharing a path is a power-up a child cannot tell from another.
    const mark = GAME.slice(GAME.indexOf("function KindMark"), GAME.indexOf("const CASCADE_STEPS"));
    for (const kind of ["STRIPE_ROW", "STRIPE_COL", "BURST", "RAINBOW"]) {
      expect(mark, `no branch for ${kind}`).toContain(`kind === ${kind}`);
    }
    // The four branches must render four DIFFERENT things, compared as whole
    // branch bodies rather than as `d` attributes: the rainbow deliberately
    // draws one path twice, rotated 45 degrees, so counting distinct paths
    // reports a collision that is not one. What matters is that no two KINDS
    // produce the same markup.
    const bodies = branchBodies(mark);
    expect(bodies.length).toBe(4);
    expect(new Set(bodies).size).toBe(4);
    // And an ordinary gem draws nothing at all.
    expect(mark).toMatch(/return null;/);
  });
});

describe("a gem is drawn inside the box it is drawn in", () => {
  // The defect this block exists for, found 2026-09-05 and shipped since the
  // game did: the purple star's path ran to x=112 and y=132 in a 0..100
  // viewBox. SVG simply CLIPS what falls outside, so the right and bottom
  // points were cut off and the gem rendered as a lopsided blob - centred at
  // (59,70), taller than it was wide. No error, no warning, and every test in
  // the repo green over it, because nothing had ever asked where a path goes.

  it("found six paths to measure", () => {
    expect(gemPaths().length).toBe(6);
  });

  it("uses exactly one curved path, which this measurement cannot walk", () => {
    // The population statement. `straightExtent` refuses anything but straight
    // segments, so a second curved gem would silently leave the cell below
    // measuring five of seven rather than six of six.
    const curved = gemPaths().filter((d) => /[AaCcSsQqTt]/.test(d));
    expect(curved.length).toBe(1);
    // And it is the circle, pinned by its own geometry rather than walked:
    // a radius-40 arc starting at y=10 spans 10..90 about (50,50).
    expect(curved[0]).toBe("M50 10a40 40 0 1 0 .1 0Z");
  });

  it("keeps every straight gem inside 0..100, with a margin", () => {
    for (const d of gemPaths()) {
      if (/[AaCcSsQqTt]/.test(d)) continue;
      const b = straightExtent(d);
      expect(b.minX, `left edge of ${d}`).toBeGreaterThanOrEqual(0);
      expect(b.minY, `top edge of ${d}`).toBeGreaterThanOrEqual(0);
      expect(b.maxX, `right edge of ${d}`).toBeLessThanOrEqual(100);
      expect(b.maxY, `bottom edge of ${d}`).toBeLessThanOrEqual(100);
    }
  });

  it("centres every straight gem, and gives it real size", () => {
    // A path can fit the box and still be wrong: the broken star was off
    // centre as well as too big, and containment alone would not have said so.
    // The triangle sits at (50,47) by design - a triangle's visual middle is
    // below its bounding box's - so the tolerance is 6, not 1.
    for (const d of gemPaths()) {
      if (/[AaCcSsQqTt]/.test(d)) continue;
      const b = straightExtent(d);
      expect(Math.abs((b.minX + b.maxX) / 2 - 50), `x centre of ${d}`).toBeLessThanOrEqual(6);
      expect(Math.abs((b.minY + b.maxY) / 2 - 50), `y centre of ${d}`).toBeLessThanOrEqual(6);
      expect(b.maxX - b.minX, `width of ${d}`).toBeGreaterThanOrEqual(60);
      expect(b.maxY - b.minY, `height of ${d}`).toBeGreaterThanOrEqual(60);
    }
  });

  it("would have caught the star as it shipped, and clears the circle", () => {
    // The control. Without it this block passes on a walker that returns
    // 0..100 for everything, and a walker that flags the circle - which an
    // arc-approximating first draft really did, at -29.9..130.1.
    const broken = "M50 8 68 26h26v26l18 18-18 18v26H68l-18 18-18-18H24V88L6 70l18-18V26h26Z";
    const b = straightExtent(broken);
    expect(b.maxX).toBeGreaterThan(100);
    expect(b.maxY).toBeGreaterThan(100);
    expect(() => straightExtent("M50 10a40 40 0 1 0 .1 0Z")).toThrow(/cannot measure/);
  });
});

describe("the power-up is named, not merely drawn", () => {
  it("has a word in every shipped locale", () => {
    // A missing arm does not compile, so this cell is about a locale that was
    // added and left with an empty string - which renders as a gem announced
    // with a trailing space and no power-up at all.
    for (const locale of SHIPPED_LOCALES) {
      const arm = GAME.slice(GAME.indexOf(`  ${locale}: {`));
      const kinds = arm.slice(arm.indexOf("kind: {"), arm.indexOf("},", arm.indexOf("kind: {")));
      for (const k of KINDS) {
        if (k === PLAIN) continue;
        expect(kinds, `${locale} has no word for kind ${k}`).toMatch(
          new RegExp(`${k}:\\s*"[^"]+"`),
        );
      }
    }
  });

  it("puts that word in the cell's own label", () => {
    expect(GAME).toMatch(/aria-label=\{`\$\{T\.gem\(cell\)\}\$\{kind === PLAIN \? "" : /);
  });
});

describe("the marks are replayed WITH the board, never read past it", () => {
  it("draws from viewKinds, not from the settled state", () => {
    // The defect this cell exists for: drawing the marks from `state.kinds`
    // while the colours replay the cascade puts every power-up on the wrong
    // gem for the length of the animation.
    expect(GAME).toMatch(/const kind = viewKinds\[i\] \?\? PLAIN;/);
    expect(GAME).toMatch(/<KindMark kind=\{kind\} \/>/);
    const boardBlock = GAME.slice(GAME.indexOf("{view.map((cell, i) =>"));
    expect(boardBlock).not.toMatch(/state\.kinds/);
  });

  it("sets both view arrays at every single place either one is set", () => {
    // The pairing is the whole thing, and it is the one that drifts silently:
    // a new branch that sets `setView` and forgets `setViewKinds` leaves the
    // marks one frame behind, on a board that otherwise looks completely
    // normal. Counted rather than described, so a fifth call site has to
    // come with its partner.
    const views = [...GAME.matchAll(/setView\(/g)].length;
    const kinds = [...GAME.matchAll(/setViewKinds\(/g)].length;
    expect(kinds).toBe(views);
    expect(views).toBeGreaterThanOrEqual(4);
  });

  it("sparkles at the square the gem LANDED on", () => {
    // `spawned` is reported after gravity for exactly this reason. Deriving
    // the square from `step.cleared` or from the run would draw it on empty
    // air - see `settle` in logic.ts.
    expect(GAME).toMatch(/for \(const made of step\.spawned\)/);
    expect(GAME).toMatch(/\[data-cell="\$\{made\.index\}"\]/);
  });

  it("makes a power-up sound different from a match, once per step", () => {
    expect(GAME).toMatch(/const bang = step\.fired\.length > 0;/);
    expect(GAME).toMatch(/ctx\.audio\.play\(bang \? "star" : "pop"/);
    // One call, not two: a chain of five specials must not stack five noises.
    const play = GAME.slice(GAME.indexOf("const play = useCallback"));
    const body = play.slice(0, play.indexOf("/**"));
    expect([...body.matchAll(/ctx\.audio\.play\(/g)].length).toBe(1);
  });
});

describe("the snapshot knows the shape changed", () => {
  it("is version 2, so a board written without kinds is discarded", () => {
    expect(GAME).toMatch(/version: 2,/);
  });

  it("refuses a kinds array of the wrong length, or holding a kind that is not one", () => {
    const spec = GAME.slice(GAME.indexOf("const SESSION"), GAME.indexOf("export function Match3Game"));
    expect(spec).toMatch(/Array\.isArray\(g\.kinds\)/);
    expect(spec).toMatch(/g\.kinds\.length !== cfg\.size \* cfg\.size/);
    expect(spec).toMatch(/KINDS as readonly number\[\]\)\.includes/);
  });
});

/**
 * What a power-up going off LOOKS like, per kind.
 *
 * Source assertions again, and named as such - the node environment cannot
 * render `Blast` and read a pixel back. What they CAN do is refuse the two
 * failures that have real consequences: two kinds drawing the same shape, so
 * the effect stops telling a child which power fired; and the overlay's
 * geometry disagreeing with the board it is drawn over.
 */
describe("a power-up that fires draws the shape it cleared", () => {
  const BLAST = GAME.slice(GAME.indexOf("function Blast("), GAME.indexOf("export function Match3Game"));

  it("was found in the file at all - the control for every cell below", () => {
    expect(BLAST.length).toBeGreaterThan(500);
    expect(BLAST).toContain("prefersReducedMotion");
  });

  it("has an arm for each of the four kinds, and none for a plain gem", () => {
    for (const name of ["STRIPE_ROW", "STRIPE_COL", "BURST", "RAINBOW"]) {
      expect(BLAST, `no arm for ${name}`).toContain(name);
    }
    // Four kinds plus PLAIN is the whole union; a plain gem never fires.
    expect(KINDS.length).toBe(5);
    expect(BLAST).not.toContain("PLAIN");
  });

  it("draws a row beam and a column beam that are NOT the same shape", () => {
    // The stripes share one arm, so the difference is a ternary rather than two
    // blocks: the row spans the full inner width and one cell of height, the
    // column the reverse. A single `row ?` deciding both is what makes them
    // impossible to collapse into each other by accident.
    const arm = BLAST.slice(BLAST.indexOf("STRIPE_ROW || kind === STRIPE_COL"), BLAST.indexOf("if (kind === BURST)"));
    expect(arm).toContain("const row = kind === STRIPE_ROW");
    expect(arm).toMatch(/width:\s*row \?/);
    expect(arm).toMatch(/height:\s*row \?/);
    expect(arm).toContain("scaleX(0.12)");
    expect(arm).toContain("scaleY(0.12)");
  });

  it("draws the burst as a ring three cells across, which is what it clears", () => {
    const arm = BLAST.slice(BLAST.indexOf("if (kind === BURST)"), BLAST.indexOf("if (kind === RAINBOW)"));
    expect(arm).toContain('borderRadius: "50%"');
    expect(arm).toContain("span(3)");
    expect(arm).toContain("from(c - 1)");
    expect(arm).toContain("from(r - 1)");
  });

  it("draws the rainbow over the whole board, which is also what it clears", () => {
    const arm = BLAST.slice(BLAST.indexOf("if (kind === RAINBOW)"));
    expect(arm).toContain("inset:");
    expect(arm).toContain("radial-gradient");
    expect(arm).not.toContain("span(3)");
  });

  it("renders nothing for somebody who asked for less motion", () => {
    expect(BLAST).toMatch(/if \(prefersReducedMotion\(\)\) return null;/);
  });

  it("is drawn from what FIRED, never from what cleared", () => {
    // `cleared` cannot say which power sent those gems - by then they are gone,
    // which is why `CascadeStep` carries `fired` at all.
    expect(GAME).toMatch(/setBlasts\(\s*step\.fired\.map/);
    expect(GAME).not.toMatch(/setBlasts\(\s*step\.cleared/);
    // ...and taken away again when the step ends, or the last blast of a run
    // would sit on the settled board.
    expect(GAME).toContain("setBlasts([]);");
  });

  it("carries a fresh key per blast, so two identical ones in a row both animate", () => {
    expect(GAME).toContain("blastKey.current += 1;");
  });

  it("is actually RENDERED, which every cell above would have missed", () => {
    // Written after the fact, and it is the sharpest thing in this file. Every
    // assertion above passed on a build where `Blast` existed, was correct, was
    // wired to `setBlasts` - and was never put on the screen, because nothing
    // rendered it. Source assertions read the file; they cannot notice that the
    // file's own JSX never mentions the component. `tsc` caught it, with
    // "'Blast' is declared but its value is never read", which is luck rather
    // than a gate: one more reference anywhere would have silenced it.
    expect(GAME).toMatch(/\{blasts\.map\(/);
    expect(GAME).toMatch(/<Blast\b/);
    // ...and INSIDE the board element, not merely somewhere after it. The
    // overlay's `left`/`top` are percentages of the board, so a blast rendered
    // as a sibling is positioned against the page instead and lands nowhere
    // near the gem. The first version of this cell sliced to `</GameChrome>`,
    // which contains the board's own closing tag - so moving the blasts out of
    // the board and in beside it passed. Ordering is the assertion, not
    // membership of a region.
    const region = GAME.slice(GAME.indexOf("ref={boardRef}"), GAME.indexOf("</GameChrome>"));
    expect(region.indexOf("<Blast"), "no <Blast> anywhere near the board").toBeGreaterThan(-1);
    expect(
      region.indexOf("<Blast"),
      "the blasts are rendered outside the board they measure against",
    ).toBeLessThan(region.lastIndexOf("</div>"));
  });

  it("measures its geometry against the padding the board actually has", () => {
    // The one number two places must agree on. A board whose padding moved
    // without this constant moving smears every blast by that many pixels, and
    // nothing but looking at it would show that.
    const pad = /const BOARD_PAD = (\d+);/.exec(GAME)?.[1];
    expect(pad, "no BOARD_PAD constant").toBeDefined();
    const boardStyle = GAME.slice(GAME.indexOf('width: "min(92vw'), GAME.indexOf("touchAction"));
    expect(boardStyle, "the board's own padding disagrees with BOARD_PAD").toContain(`padding: ${pad},`);
  });
});
