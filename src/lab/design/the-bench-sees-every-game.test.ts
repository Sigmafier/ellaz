import { describe, it, expect } from "vitest";
import { ROSTER_IDS } from "../../portal/shellRoster";
import { GAMES as BUTTONS_GAMES } from "./Buttons";
import { GAMES as COMPARE_GAMES } from "./Compare";

/**
 * The bench must see the WHOLE catalogue, and this is the assertion that makes
 * a failure loud instead of plausible.
 *
 * Both screens read the roster ONCE, at module scope, into a plain array:
 *
 *   const GAMES = ROSTER.map((g) => g.id);
 *
 * That is correct while `games.ts` exports all 33 statically, and it is one
 * commit from not being. The roster split of 2026-08-21 already turned
 * `catalog` from a const into a function for exactly this reason - `Boards`
 * had captured `CATALOG.map(...)` at module scope and would have frozen at the
 * 15 games above the fold, showing a player less than half their own records
 * and looking complete while it did it.
 *
 * The bench has the worse version of that failure. The wall's own button reads
 * "scan all N games" off this array, so a halved roster does not look wrong -
 * it scans 15, says it scanned 15, fills its grid, and reports a clean sweep
 * over a catalogue it never opened. Every number the wall prints (distinct
 * sizes, how many buttons are under the tap floor) would then be true of a
 * population nobody chose, which is the one shape this bench exists to end.
 *
 * `ROSTER_IDS` is the right thing to compare against rather than `GAMES.length`
 * from the same import: it is the one list that is all 33 by definition, it
 * lives on the far side of the split, and `roster-split.test.ts` already pins
 * the two halves to it.
 */
describe("the design bench sees every game", () => {
  it("has a roster to check at all", () => {
    // The positive control. Every expectation below is satisfied by two empty
    // arrays, which is exactly what a broken import would hand it.
    expect(ROSTER_IDS.length).toBeGreaterThan(20);
  });

  it("the buttons bench walks the whole catalogue", () => {
    expect(BUTTONS_GAMES.length, "the wall would scan a subset and say so").toBe(
      ROSTER_IDS.length,
    );
  });

  it("the compare bench offers the whole catalogue", () => {
    expect(COMPARE_GAMES.length).toBe(ROSTER_IDS.length);
  });

  it("in the roster's own order, not sorted or deduped on the way", () => {
    // Order matters less than membership here, but an order that silently
    // changed would mean something re-derived the list rather than read it,
    // and that is the same defect one step earlier.
    expect(BUTTONS_GAMES).toEqual([...ROSTER_IDS]);
    expect(COMPARE_GAMES).toEqual([...ROSTER_IDS]);
  });
});
