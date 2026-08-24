import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { sweepAt, tierAt, SWEEP_MS, HARD_HALF, MEDIUM_HALF, BONUS_ZONES, BONUS_ART } from "./bonus";
import { BOXES } from "./boxes";

describe("the marker's sweep", () => {
  /**
   * THE CONTROL, first. Every assertion below is a bound, and a `sweepAt` that
   * returned a constant would satisfy all of them - "always within 0..1" is
   * exactly what a broken sweep says too.
   */
  it("actually moves", () => {
    const seen = new Set(Array.from({ length: 40 }, (_, i) => sweepAt(i * 37).toFixed(3)));
    expect(seen.size, "the marker never moved").toBeGreaterThan(20);
  });

  it("starts at one edge, reaches the other, and comes back", () => {
    expect(sweepAt(0)).toBeCloseTo(0, 6);
    expect(sweepAt(SWEEP_MS)).toBeCloseTo(1, 6);
    expect(sweepAt(SWEEP_MS * 2)).toBeCloseTo(0, 6);
    expect(sweepAt(SWEEP_MS * 3)).toBeCloseTo(1, 6);
  });

  it("never leaves the band, however long it runs", () => {
    for (let ms = 0; ms < SWEEP_MS * 9; ms += 7) {
      const p = sweepAt(ms);
      expect(p, `at ${ms}ms`).toBeGreaterThanOrEqual(0);
      expect(p, `at ${ms}ms`).toBeLessThanOrEqual(1);
    }
  });

  /**
   * The half-period is the middle of the band. A sweep whose midpoint is not
   * the middle makes the top tier reachable only on one direction of travel -
   * the same aim paying differently coming and going.
   */
  it("passes the middle halfway through each pass", () => {
    expect(sweepAt(SWEEP_MS / 2)).toBeCloseTo(0.5, 6);
    expect(sweepAt(SWEEP_MS * 1.5)).toBeCloseTo(0.5, 6);
  });

  /**
   * IT IS A FUNCTION OF WALL-CLOCK TIME, so it cannot run at the display's
   * speed. Two "frame rates" sampling the same instant must agree - which is
   * the property a per-frame accumulator does not have, and the one that makes
   * this game the same game on a 120Hz laptop and a 60Hz phone.
   */
  it("reads the same at 60Hz and at 120Hz", () => {
    for (let f = 0; f < 60; f++) {
      const ms = f * (1000 / 60);
      expect(sweepAt(ms), `frame ${f}`).toBeCloseTo(sweepAt(ms), 10);
      expect(sweepAt(ms)).toBeCloseTo(sweepAt(2 * f * (1000 / 120)), 10);
    }
  });

  it("is slow enough for the middle zone to be aimed at", () => {
    // The top zone's width in MILLISECONDS of travel, which is what a player
    // actually has. Below ~150ms it stops being a skill.
    const windowMs = HARD_HALF * 2 * SWEEP_MS;
    expect(windowMs).toBeGreaterThan(150);
  });
});

describe("what a stop is worth", () => {
  it("pays the top tier dead in the middle", () => {
    expect(tierAt(0.5)).toBe("hard");
  });

  /** NEVER NOTHING. Reaching the box with a real word already earned something. */
  it("pays something at either edge", () => {
    expect(tierAt(0)).toBe("easy");
    expect(tierAt(1)).toBe("easy");
  });

  /**
   * Symmetric EXCEPT within a float hair of a zone edge, and that exception is
   * a property of the numbers rather than a hole in the test. `0.5 - d` and
   * `0.5 + d` are not equidistant from 0.5 in IEEE754: at d = 0.08 the two
   * distances come back 0.07999999999999996 and 0.08000000000000007, which
   * straddle HARD_HALF. No implementation of `tierAt` can fix that, because its
   * two INPUTS genuinely differ - so asserting it would be asserting something
   * false and the code would get bent to satisfy it.
   *
   * It still catches the real thing. A rule written `pos - 0.5` without the
   * `abs` calls everything below the middle "hard", which fails at nearly every
   * d rather than at three of them.
   */
  it("is symmetric about the middle", () => {
    const EDGE = 1e-9;
    const onAnEdge = (d: number) =>
      Math.abs(d - HARD_HALF) < EDGE || Math.abs(d - MEDIUM_HALF) < EDGE;
    let compared = 0;
    for (let d = 0; d <= 0.5; d += 0.005) {
      if (onAnEdge(d)) continue;
      expect(tierAt(0.5 - d), `d=${d.toFixed(3)}`).toBe(tierAt(0.5 + d));
      compared++;
    }
    // The control: skipping is allowed, skipping everything is not.
    expect(compared, "the loop compared nothing").toBeGreaterThan(90);
  });

  it("moves through all three tiers, outer to inner", () => {
    expect(tierAt(0.5 - MEDIUM_HALF - 0.01)).toBe("easy");
    expect(tierAt(0.5 - MEDIUM_HALF + 0.01)).toBe("medium");
    expect(tierAt(0.5 - HARD_HALF + 0.01)).toBe("hard");
  });

  it("clamps rather than falling through on a bad position", () => {
    expect(tierAt(-4)).toBe("easy");
    expect(tierAt(9)).toBe("easy");
    expect(tierAt(Number.NaN)).toBe("easy");
  });

  /**
   * The DRAWN band and the SCORED band are one decision. Two lists would agree
   * on the day they were written and diverge the first time a zone moves - a
   * player aiming at a stripe that pays something else, with nothing to see.
   */
  it("draws exactly the zones it scores", () => {
    expect(BONUS_ZONES[0].from).toBe(0);
    expect(BONUS_ZONES[BONUS_ZONES.length - 1].to).toBe(1);
    for (let i = 1; i < BONUS_ZONES.length; i++) {
      expect(BONUS_ZONES[i].from, `zone ${i} leaves a hole`).toBeCloseTo(BONUS_ZONES[i - 1].to, 10);
    }
    for (const z of BONUS_ZONES) {
      const mid = (z.from + z.to) / 2;
      expect(tierAt(mid), `zone drawn ${z.tier} at ${mid.toFixed(3)}`).toBe(z.tier);
    }
  });
});

describe("which box opens it", () => {
  /** ONE mini-game behind ONE box - and the art is what makes that true. */
  it("is carried by exactly one box", () => {
    expect(BOXES.filter((b) => b.art === BONUS_ART)).toHaveLength(1);
  });

  /** And that box is not a padlock, which is shut until step 4. */
  it("is not a padlock", () => {
    expect(BONUS_ART).not.toBe("lock");
  });
});

/**
 * AND THE GAME HAS TO OPEN IT. Every test above passes on a build where the
 * bell box pays a flat coin like all the others and `BonusRound` is a file
 * nothing imports - which is what it was ten minutes before this was written.
 */
describe("the game actually opens it", () => {
  const SRC = readFileSync(new URL("./Lettercross.tsx", import.meta.url), "utf8");
  const ROUND = readFileSync(new URL("./BonusRound.tsx", import.meta.url), "utf8");

  it("can read both files at all", () => {
    expect(SRC.length, "Lettercross.tsx - the matcher is blind").toBeGreaterThan(4000);
    expect(ROUND.length, "BonusRound.tsx - the matcher is blind").toBeGreaterThan(1500);
  });

  it("splits the one bonus box out of the boxes that pay a coin", () => {
    expect(SRC).toMatch(/round\s*=\s*opened\.find\(\s*\(n\)\s*=>\s*BOXES\[n\]\.art === BONUS_ART\s*\)/);
    expect(SRC).toMatch(/prize\s*=\s*opened\.filter\(\s*\(n\)\s*=>\s*n !== round\s*\)/);
    expect(SRC).toMatch(/if \(round !== undefined\) setBonus\(round\)/);
  });

  /**
   * The round reports a TIER and the game hands it on. A `tier:` hardcoded here
   * would make every round pay the same and quietly delete the skill.
   */
  it("pays the round at the tier the round came back with", () => {
    const fin = SRC.slice(SRC.indexOf("const finishBonus = useCallback"), SRC.indexOf("const cell ="));
    expect(fin.length, "could not slice finishBonus - the matcher is blind").toBeGreaterThan(200);
    expect(fin).toMatch(/reason:\s*"level_complete"/);
    expect(fin).toMatch(/\btier,/);
    expect(fin).not.toMatch(/tier:\s*"/);
    expect(fin).not.toMatch(/coins\s*:/);
  });

  /** Leaving mid-round is a PAUSE, not a lost prize. */
  it("carries the open round in the snapshot and clears it on a restart", () => {
    expect(SRC).toMatch(/useGameSession\([\s\S]{0,220}?\bbonus\b/);
    const reset = SRC.slice(SRC.indexOf("const reset = useCallback("), SRC.indexOf("\n  }, [", SRC.indexOf("const reset = useCallback(")));
    expect(reset).toMatch(/setBonus\(null\)/);
  });

  /**
   * The overlay covers the board and the rack. It does NOT cover Play and Take
   * back - those live in the chrome's footer, outside this column - so they are
   * disabled instead, and that is the half a screenshot cannot show.
   */
  it("stops the footer buttons firing behind the round", () => {
    const guards = [...SRC.matchAll(/disabled=\{pending\.length === 0 \|\| bonus !== null\}/g)];
    expect(guards, "both footer buttons must be guarded").toHaveLength(2);
  });

  /**
   * THE LOOP IS A WAY OF ASKING, NOT A CLOCK. A position accumulated per frame
   * sweeps twice as fast on a 120Hz screen, so the same tap is a different game
   * on a different display - and nothing on a 60Hz machine can see it.
   * See .claude/rules/fixed-timestep-must-match-display.md.
   */
  it("derives the marker from wall-clock time, never from a frame count", () => {
    expect(ROUND).toMatch(/sweepAt\(now - t0\)/);
    expect(ROUND).not.toMatch(/pos\s*\+=|setPos\(\s*\(p\)\s*=>/);
    expect(ROUND).not.toMatch(/1000\s*\/\s*60/);
  });

  /** It DRAWS the band it is scored against - two lists would drift apart. */
  it("draws the same zones bonus.ts scores", () => {
    expect(ROUND).toMatch(/BONUS_ZONES\.map/);
    expect(ROUND).toMatch(/tierAt\(p\)/);
    expect(ROUND).not.toMatch(/0\.30|0\.08/);
  });
});
