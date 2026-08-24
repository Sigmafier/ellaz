import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The sounds this game makes, pinned by reading the renderer's own source.
 *
 * There is no DOM test harness in this repo - renderers are pinned the way
 * `variant-is-shipped.test.ts` and `score-unit-declared.test.ts` pin theirs, by
 * reading the file and asserting the wiring is present. That is weaker than
 * driving a browser and it is the instrument that actually exists here; what it
 * CAN catch is the failure that already happened once, which is a game shipping
 * with no sound at all while every other gate stays green.
 *
 * Lettercross was one of those. Measured 2026-08-24, before this landed: zero
 * `ctx.audio.play()` calls in a 34-game catalogue where 30 games call it, and a
 * single `winMoment` firing only at `isOver` - so a forty-turn game made one
 * noise, and that noise was the game saying NO.
 */
const SRC = readFileSync(join(__dirname, "Lettercross.tsx"), "utf8");

describe("lettercross speaks", () => {
  // The positive control. Every assertion below is a substring test, and a
  // substring test over an empty or mis-read file passes nothing and fails
  // loudly - but one over a file that merely CHANGED SHAPE can pass vacuously.
  // Assert the file is the file before asserting anything about it.
  it("is reading the renderer, not an empty string", () => {
    expect(SRC.length, "Lettercross.tsx is suspiciously small").toBeGreaterThan(8000);
    expect(SRC, "not the renderer").toContain("export function Lettercross");
  });

  it("gives every turn action a sound", () => {
    const wanted: [string, string][] = [
      ["tap", "picking a tile up off the rack"],
      ["pop", "setting a tile on the board"],
      ["flip", "taking a tile back"],
      ["success", "a word accepted, below the streak floor"],
      ["fail", "a word refused"],
      ["streak", "a word accepted, on the ladder"],
    ];
    for (const [sfx, when] of wanted) {
      expect(SRC, `no sound for ${when}`).toContain(`ctx.audio.play("${sfx}"`);
    }
  });

  it("reports a run length and never picks a pitch", () => {
    // The whole point of `sdk/streak.ts`: a game says how many in a row and
    // this file alone turns that into a semitone. A literal transpose here
    // would be this game inventing its own escalation.
    expect(SRC).toContain('import { streakStep } from "@sdk/streak"');
    expect(SRC).toContain("streakStep(streakRef.current)");
    expect(SRC, "a hand-rolled ladder").not.toMatch(/semitones:\s*\d/);
  });

  it("treats 'too short for a rung' as undefined, never as falsy", () => {
    // `streakStep` returns `undefined` rather than 0 precisely because rung 0
    // is a REAL note - the ladder's own bottom. A truthiness check would play
    // `success` on the third word forever and the ladder would never start.
    expect(SRC, "a truthiness check would swallow rung 0").toContain("step === undefined");
  });

  it("resets the run on a refusal and on a restart", () => {
    // A run is of GOOD words, not of attempts.
    const refusal = SRC.slice(SRC.indexOf("if (!v.ok)"), SRC.indexOf("const next = apply"));
    expect(refusal, "the refusal branch was not found").toContain("haptic.fail()");
    expect(refusal, "a refused word must end the run").toContain("streakRef.current = 0");

    const reset = SRC.slice(SRC.indexOf("const reset = useCallback"), SRC.indexOf("/** The board as it looks"));
    expect(reset, "the reset callback was not found").toContain("setPending([])");
    expect(reset, "a restart must end the run").toContain("streakRef.current = 0");
  });
});
