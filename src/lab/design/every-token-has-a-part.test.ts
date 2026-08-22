import { describe, it, expect } from "vitest";
import { PARTS } from "./Screen";
import { CHROME_TOKENS } from "./Buttons";
import { PANEL_TOKENS } from "./panelStyles";

/**
 * Every token the bench knows about belongs to a part you can point at.
 *
 * This is the one thing the tap inspector can lose that the sliders could not.
 * The old screens rendered `CHROME_TOKENS.map(...)`, so a token added to the
 * list appeared by construction. Here a token is reached through a PART, and a
 * part is a hand-written list of names - so adding `--gc-something` to
 * `panelStyles.ts` and forgetting to name it in `PARTS` leaves a knob that
 * exists, is pinned by its own test, is read by the component, and cannot be
 * turned by anybody. Nothing else would notice: the bench renders, the part
 * renders, and the number is simply absent.
 *
 * The reverse direction matters too. A part naming a token that no list
 * defines is silently dropped by `knobsOf`, so the part quietly offers fewer
 * knobs than its author thought it did.
 */
const NAMED = new Set(PARTS.flatMap((p) => [...p.chrome, ...p.panel]));
const KNOWN = new Set([...CHROME_TOKENS, ...PANEL_TOKENS].map((t) => t.name));

describe("every knob the bench knows is reachable from a part", () => {
  it("has both lists to compare at all", () => {
    // The positive control. Every expectation below is satisfied by two empty
    // sets, which is exactly what a broken import would hand it.
    expect(KNOWN.size).toBeGreaterThan(15);
    expect(NAMED.size).toBeGreaterThan(10);
  });

  it("no token is orphaned from every part", () => {
    const orphans = [...KNOWN].filter((n) => !NAMED.has(n));
    expect(orphans, "these are knobs nobody can turn").toEqual([]);
  });

  it("no part names a token that does not exist", () => {
    const ghosts = [...NAMED].filter((n) => !KNOWN.has(n));
    expect(ghosts, "knobsOf drops these in silence").toEqual([]);
  });

  it("every part has something to offer", () => {
    // A part with no knobs and no shapes is a thing you can tap that then
    // shows you nothing, which reads as a broken screen rather than as an
    // empty one.
    for (const p of PARTS) {
      const has = p.chrome.length + p.panel.length > 0 || p.styles === true;
      expect(has, `${p.id} offers nothing`).toBe(true);
    }
  });
});
