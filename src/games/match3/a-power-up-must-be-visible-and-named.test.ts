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
