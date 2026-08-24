/**
 * The record is written every turn, and the reward is paid once per run.
 *
 * WHY THIS EXISTS. `isOver` is bag-empty AND rack-empty, and a tile leaves the
 * rack only by being placed on the board. With more tiles in the bag than
 * squares on the board, some tiles can never be placed, so `isOver` is false
 * for ever - and it used to be the ONLY path that reported a score. The game
 * kept no record at all and showed "Best -" whatever anybody did.
 *
 * Every assertion here is a SOURCE read, because this repo has no DOM harness
 * for a game renderer. A source read is weaker than driving the component, so
 * each matcher is proved able to fire before its absence is allowed to mean
 * anything - a regex that quietly stops matching reports a clean sweep over
 * code it never looked at.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SIZE, TOTAL_TILES, BAG } from "./logic";

const SRC = readFileSync(new URL("./Lettercross.tsx", import.meta.url), "utf8");

/**
 * The body of the `play` handler, comments stripped.
 *
 * Comments are stripped because this file's own prose says the word `isOver`
 * several times explaining why it is not used - and a check that reads its own
 * explanation as the thing it forbids is a check that can never pass.
 */
function playBody(): string {
  const from = SRC.indexOf("const play = useCallback(");
  const to = SRC.indexOf("}, [ctx, level, pending, state]);", from);
  if (from < 0 || to < 0) return "";
  return SRC.slice(from, to).replace(/\/\/[^\n]*/g, "");
}

const hasEndGate = (body: string) => /\bisOver\b/.test(body);

describe("the arithmetic that forced this", () => {
  it("cannot empty the bag onto the board, so the run has no end", () => {
    const squares = SIZE * SIZE;
    expect(BAG.length).toBe(TOTAL_TILES);
    expect(
      TOTAL_TILES,
      `${TOTAL_TILES} tiles and ${squares} squares. If this has become <= squares, the ` +
        `run CAN end again and somebody should decide whether the end-of-run ` +
        `celebration comes back - see the comment on the report in play().`,
    ).toBeGreaterThan(squares);
  });
});

describe("the record", () => {
  it("is reported through the score port, not kept by the game", () => {
    expect(SRC).toContain("ctx.score?.report(");
    // score-contract-convention.md: a game must never hold its own `best`.
    expect(SRC).not.toMatch(/storage\.(get|set)\(\s*["']best["']/);
  });

  it("is NOT gated on the run being over, in ANY spelling", () => {
    // The first version of this test matched `if (isOver(next))` - the exact
    // shape the defect had - and a mutation restoring the gate as a TERNARY
    // walked past it and the suite reported clean. A matcher built from one
    // spelling of a bug can only ever find that spelling.
    //
    // So the assertion is about the WHOLE handler: `isOver` does not appear
    // inside `play` at all. It has two legitimate homes - the `over` flag that
    // drives the session's liveness and the UI - and neither is in here.
    const body = playBody();
    expect(body.length, "could not slice the play handler - the matcher is blind").toBeGreaterThan(400);
    // Positive control: the same check on the same body with the gate planted
    // back, in a spelling the original test could not see.
    expect(hasEndGate(body.replace("const scored =", "const scored = isOver(next) &&"))).toBe(true);
    expect(hasEndGate(body), "the score is behind an end-of-run gate that can never open").toBe(false);
  });
});

describe("the reward", () => {
  it("is latched, so a beaten record pays once and not once per word", () => {
    expect(SRC).toMatch(/scored\?\.isPersonalBest\s*&&\s*!bestFiredRef\.current/);
    expect(SRC).toContain("bestFiredRef.current = true;");
  });

  it("is a milestone inside a run, so it draws no confetti", () => {
    expect(SRC).toMatch(/confetti:\s*false/);
  });

  it("clears its latch when a new run starts", () => {
    expect(SRC).toContain("bestFiredRef.current = false;");
  });
});

describe("the latch survives leaving the game", () => {
  it("rides the snapshot", () => {
    expect(SRC).toContain("bestFired: bestFiredRef.current");
    expect(SRC).toMatch(/bestFiredRef\s*=\s*useRef\(resume\?\.bestFired\s*\?\?\s*false\)/);
  });

  it("is refused when the stored snapshot does not carry it", () => {
    expect(SRC).toMatch(/typeof s\.bestFired !== ["']boolean["']/);
  });

  it("bumped the snapshot version, because the shape changed", () => {
    const v = SRC.match(/version:\s*(\d+)/);
    expect(v, "no SESSION version found - the matcher is blind").not.toBeNull();
    expect(Number(v![1])).toBeGreaterThanOrEqual(2);
  });
});
