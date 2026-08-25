/**
 * THE RULE BEING RIGHT SAYS NOTHING ABOUT THE GAME CALLING IT.
 *
 * `shared-letter.test.ts` runs the generator directly and every one of its
 * assertions passes on a build where no box ever opens the round. These read
 * `bonus.ts`, `SharedLetterRound.tsx` and `Lettercross.tsx` instead - the same
 * way `reaching-a-box-collects-it.test.ts` does - because the alternative is
 * mounting React to prove a wire exists.
 */
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { BONUS_ARTS, ROUND_OF, type BonusArt } from "./bonus";
import { BOXES } from "./boxes";

const read = (f: string) => readFileSync(new URL(`./${f}`, import.meta.url), "utf8");
const ROUND = read("SharedLetterRound.tsx");
const GAME = read("Lettercross.tsx");

describe("every art opens something, and always the same thing", () => {
  it("gives every prize art a round", () => {
    const orphans = BONUS_ARTS.filter((a) => !(a in ROUND_OF));
    expect(orphans, `arts with no round: ${orphans.join(" ")}`).toEqual([]);
    // The control: the map must not be answering for things that are not arts.
    expect(Object.keys(ROUND_OF).sort()).toEqual([...BONUS_ARTS].sort());
  });

  it("names only rounds that exist", () => {
    const kinds = new Set(Object.values(ROUND_OF));
    for (const k of kinds) expect(["crossword", "shared2", "shared3"]).toContain(k);
    // ...and it must actually use the new ones, or this file is guarding nothing.
    expect([...kinds].sort()).toContain("shared2");
    expect([...kinds].sort()).toContain("shared3");
  });

  /**
   * The comment in `bonus.ts` argues its mapping from how OFTEN each art is on
   * the board - the bell's round can be played at most once a game because the
   * bell is on the board once. That is a claim about `boxes.ts`, so it is read
   * off `boxes.ts` rather than restated.
   */
  it("puts the once-only round on the once-only art", () => {
    const times = (a: BonusArt) => BOXES.filter((b) => b.art === a).length;
    const shared2 = (Object.keys(ROUND_OF) as BonusArt[]).filter((a) => ROUND_OF[a] === "shared2");
    expect(shared2, "more than one art opens the two-word round").toHaveLength(1);
    expect(times(shared2[0]), `${shared2[0]} is not the once-only art`).toBe(1);
    const shared3 = (Object.keys(ROUND_OF) as BonusArt[]).filter((a) => ROUND_OF[a] === "shared3");
    expect(times(shared3[0]), `${shared3[0]} should be reachable more than once`).toBeGreaterThan(1);
  });
});

describe("the game opens it", () => {
  /** The control. Every assertion below is about a string being present. */
  it("can read the renderer at all", () => {
    expect(GAME.length).toBeGreaterThan(8000);
    expect(ROUND.length).toBeGreaterThan(3000);
    expect(GAME).toContain("export function Lettercross");
  });

  it("mounts the round", () => {
    expect(GAME).toMatch(/import \{ SharedLetterRound \} from "\.\/SharedLetterRound"/);
    expect(GAME).toMatch(/<SharedLetterRound/);
  });

  /**
   * ...and picks it from `ROUND_OF`, never from an art name written out here. A
   * hardcoded `art === "star"` is correct today and silently stops agreeing with
   * `bonus.ts` the first time that table moves.
   */
  it("asks bonus.ts which round, instead of naming an art", () => {
    expect(GAME).toMatch(/ROUND_OF\[/);
    const block = GAME.slice(GAME.indexOf("{rounds.length > 0 &&"), GAME.indexOf("{asking !== null && ("));
    expect(block.length, "could not slice the round switch - the matcher is blind").toBeGreaterThan(300);
    for (const art of BONUS_ARTS) {
      expect(block, `the switch names the art "${art}" directly`).not.toContain(`"${art}"`);
    }
  });

  it("hands the round's own count in, rather than two components", () => {
    expect(GAME).toMatch(/count=\{count\}/);
    expect(GAME).toMatch(/kind === "shared3" \? 3 : 2/);
  });

  it("carries the strings in every locale it ships", () => {
    for (const key of ["letters:", "shared2:", "shared3:", "got:", "missed:"]) {
      const n = (GAME.match(new RegExp(key.replace(":", "\\s*:"), "g")) ?? []).length;
      expect(n, `${key} appears ${n} times - it needs one per locale`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("the round itself", () => {
  /**
   * WALL-CLOCK, NEVER A FRAME COUNTER. A 20-second round driven by a per-frame
   * accumulator is 10 seconds on a 120Hz display, and the whole difficulty of
   * this screen is its clock.
   * See .claude/rules/fixed-timestep-must-match-display.md
   */
  it("runs its clock off the wall clock", () => {
    expect(ROUND).toMatch(/performance\.now\(\) - t0/);
    expect(ROUND, "a frame counter is back").not.toMatch(/frames\s*\+\+|\+\+\s*frames/);
  });

  /** One place turns "how it went" into a payout, and it is not this file. */
  it("reports a quality and never a payout", () => {
    expect((ROUND.match(/tierOf\(/g) ?? []).length).toBe(1);
    expect(ROUND).toMatch(/tierOf\(sharedQuality\(count, won\)\)/);
    expect(ROUND, "the round names a coin amount").not.toMatch(/coins\s*:/);
  });

  /**
   * A WRONG LETTER MUST NOT END THE ROUND. This platform does not punish, and
   * a bonus that can be lost on the first tap is a trap wearing a prize's
   * clothes. The guess handler may only finish on the ANSWER.
   */
  it("does not end the round on a wrong letter", () => {
    const guess = ROUND.slice(ROUND.indexOf("const guess = "), ROUND.indexOf("const secs = "));
    expect(guess.length, "could not slice the guess handler - the matcher is blind").toBeGreaterThan(150);
    expect(guess).toMatch(/if \(c === puzzle\.answer\) \{ finish\(true\); return; \}/);
    expect((guess.match(/finish\(/g) ?? []).length, "finish is called on a wrong letter too").toBe(1);
  });

  /** The words are English in every locale, so the line must not mirror. */
  it("pins the words LTR", () => {
    expect(ROUND).toMatch(/dir="ltr"/);
  });

  /** A round that ends with the blanks still blank teaches nothing. */
  it("fills the blanks in when it is over", () => {
    expect(ROUND).toMatch(/const reveal = phase === "done"/);
    expect(ROUND).toMatch(/pattern\.replace\("_", puzzle\.answer\)/);
  });

  /** It holds the result before handing back, like the crossword round does. */
  it("holds the outcome on screen before it closes", () => {
    expect(ROUND).toMatch(/setTimeout\(\s*\(\) => onStop/);
    expect(ROUND).toMatch(/DWELL_MS/);
  });
});
