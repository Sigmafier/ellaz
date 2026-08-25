/**
 * "The same letter is missing from these words" - BONUS's two-word and
 * three-word bonus screens.
 *
 * The rule is pure and lives in `sharedLetter.ts`, so this runs the real
 * generator rather than reading a renderer's source for it. What it is really
 * guarding is FAIRNESS: a puzzle whose answer is not unique is one the player
 * can be right about and marked wrong for, and nothing about that is visible
 * from the screen - it renders perfectly and simply refuses a correct letter.
 */
import { describe, it, expect } from "vitest";
import { mulberry32 } from "@shared/rng";
import { CHOICES, SHARED_MS, makeShared, sharedQuality, solvers } from "./sharedLetter";
import { PUZZLE_WORDS } from "./puzzleWords";
import { WORDS } from "./words";
import { HARD_Q, MEDIUM_Q, tierOf } from "./bonus";

const seeds = (n: number) => Array.from({ length: n }, (_, i) => mulberry32(i + 1));

describe("the generator answers at all", () => {
  /**
   * THE CONTROL. Every assertion below is a property of a puzzle, and a
   * generator that returned `undefined` for everything would satisfy all of
   * them vacuously. `undefined` is documented as unreachable with the shipped
   * pool; this is what makes that a measurement rather than a claim.
   */
  it("makes a puzzle on every one of 300 seeds, for both sizes", () => {
    for (const count of [2, 3]) {
      const misses = seeds(300).filter((rng) => makeShared(count, rng) === undefined).length;
      expect(misses, `${misses} of 300 seeds produced no ${count}-word puzzle`).toBe(0);
    }
  });

  it("can tell an ambiguous set from a settled one", () => {
    // Without this, `solvers` returning one letter for everything would make
    // every uniqueness assertion below pass over puzzles that are not unique.
    expect(solvers(["_at"]).length, "_at is wide open").toBeGreaterThan(5);
    expect(solvers(["_at", "_ow"]).length, "_at + _ow is a guess, not a puzzle").toBeGreaterThan(3);
    expect(solvers(["_at", "_amel"])).toEqual(["c"]);
  });
});

describe("a puzzle is fair", () => {
  const made = (count: number) => seeds(120).map((rng) => makeShared(count, rng)!).filter(Boolean);

  it("has EXACTLY ONE answer, judged against the whole dictionary", () => {
    for (const count of [2, 3]) {
      for (const p of made(count)) {
        const only = solvers(p.patterns);
        expect(only, `${p.patterns.join(" + ")} has ${only.length} answers`).toEqual([p.answer]);
      }
    }
  });

  it("shows the number of words it says it will", () => {
    for (const count of [2, 3]) {
      for (const p of made(count)) {
        expect(p.patterns).toHaveLength(count);
        expect(p.words).toHaveLength(count);
      }
    }
  });

  /** Two blanks of one word is one word twice - fewer lines than it claims. */
  it("never shows the same word twice", () => {
    for (const count of [2, 3]) {
      for (const p of made(count)) expect(new Set(p.words).size).toBe(count);
    }
  });

  it("blanks exactly one letter per word, and it is the answer", () => {
    for (const count of [2, 3]) {
      for (const p of made(count)) {
        p.patterns.forEach((pat, i) => {
          expect(pat.split("_")).toHaveLength(2);
          expect(pat.replace("_", p.answer)).toBe(p.words[i]);
        });
      }
    }
  });
});

describe("what it may show", () => {
  /**
   * THE RULE THIS WHOLE ARC TURNS ON. Every word on the screen comes from the
   * authored allowlist; nothing comes from the dictionary. A generator that
   * drew from `words.ts` would pass every other test in this file.
   */
  it("only ever shows a word from the authored pool", () => {
    const pool = new Set(PUZZLE_WORDS);
    for (const count of [2, 3]) {
      for (const rng of seeds(200)) {
        for (const w of makeShared(count, rng)!.words) {
          expect(pool.has(w), `"${w}" is not in puzzleWords.ts`).toBe(true);
        }
      }
    }
  });

  it("checks the answer against the dictionary, which is bigger", () => {
    // The two lists must not be the same list, or the paragraph above is moot.
    expect(WORDS.size).toBeGreaterThan(PUZZLE_WORDS.length * 20);
    // ...and a word the pool has never heard of still settles a puzzle.
    expect(WORDS.has("camel")).toBe(true);
    expect(solvers(["_amel"])).toEqual(["c"]);
  });
});

describe("the letters it offers", () => {
  it("always offers the same number, and the answer is among them", () => {
    for (const count of [2, 3]) {
      for (const rng of seeds(120)) {
        const p = makeShared(count, rng)!;
        expect(p.choices).toHaveLength(CHOICES);
        expect(new Set(p.choices).size, "a letter is offered twice").toBe(CHOICES);
        expect(p.choices, `${p.answer} is not offered`).toContain(p.answer);
      }
    }
  });

  /**
   * AND THE WRONG ONES ARE NEAR MISSES. Eight random letters would let a player
   * who reads only the first line get it right most of the time, which is not
   * the question the round is asking.
   *
   * Measured 2026-08-25 across 300 seeds per size: 2,100 of 2,100 decoys solve
   * at least one line, for both sizes. The floor is 0.9 rather than 1.0 because
   * `makeShared` is allowed to loosen when a letter cannot supply seven near
   * misses - that path is real and must not red the build when it fires.
   */
  it("offers decoys that each solve at least one of the words", () => {
    for (const count of [2, 3]) {
      let near = 0, total = 0;
      for (const rng of seeds(120)) {
        const p = makeShared(count, rng)!;
        for (const c of p.choices) {
          if (c === p.answer) continue;
          total++;
          if (p.patterns.some((pat) => WORDS.has(pat.replace("_", c)))) near++;
        }
      }
      expect(near / total, `${count}-word: only ${near}/${total} decoys are near misses`).toBeGreaterThan(0.9);
    }
  });
});

describe("no line gives the answer away", () => {
  /**
   * THE PROPERTY THAT MAKES IT A PUZZLE. A pattern only one letter can complete
   * - `_amel`, `co_oa` - is not a clue, it is the answer written out; paired with
   * anything it makes a set that is technically unique and takes no thinking.
   *
   * This is the assertion that changed the generator. The first version searched
   * only for uniqueness and produced exactly that shape: measured, 46% of the
   * offered decoys were padding rather than near misses, because a tight line
   * leaves nothing to draw them from. Both symptoms have one cause and one fix.
   *
   * Measured after the fix: 0 of 300 seeds carry a giveaway line, at either size.
   */
  it("gives every line at least two answers of its own", () => {
    for (const count of [2, 3]) {
      const bad: string[] = [];
      for (const rng of seeds(300)) {
        const p = makeShared(count, rng)!;
        for (const pat of p.patterns) {
          if (solvers([pat]).length < 2) bad.push(`${pat} (only ${p.answer})`);
        }
      }
      expect(bad.slice(0, 5), `${count}-word: ${bad.length} giveaway lines`).toEqual([]);
    }
  });

  /**
   * The control, and it is the one that stops the test above being vacuous: a
   * `solvers` that always returned two letters would pass it over every puzzle.
   * `_amel` really is a giveaway and the checker must say so.
   */
  it("can see a giveaway line when there is one", () => {
    expect(solvers(["_amel"])).toHaveLength(1);
    expect(solvers(["s_y"]).length).toBeGreaterThan(1);
  });
});

describe("what it is worth", () => {
  /**
   * BONUS paid a FLAT bonus - 40 for two words, 100 for three - so this round
   * reports which puzzle was solved, never how fast. The weights are `bonus.ts`'s
   * own thresholds rather than numbers of their own, which is what stops a round
   * being quietly re-priced when a threshold moves.
   */
  it("pays the three-word screen more than the two-word one", () => {
    expect(tierOf(sharedQuality(3, true))).toBe("hard");
    expect(tierOf(sharedQuality(2, true))).toBe("medium");
    expect(sharedQuality(3, true)).toBeGreaterThan(sharedQuality(2, true));
  });

  it("pays the floor rather than nothing when the clock wins", () => {
    for (const count of [2, 3]) {
      expect(sharedQuality(count, false)).toBe(0);
      expect(tierOf(sharedQuality(count, false))).toBe("easy");
    }
  });

  it("reads its weights from bonus.ts instead of keeping its own", () => {
    expect(sharedQuality(3, true)).toBe(HARD_Q);
    expect(sharedQuality(2, true)).toBe(MEDIUM_Q);
  });

  /** BONUS's own clocks: 20 seconds for two words, 30 for three. */
  it("keeps the original's clocks", () => {
    expect(SHARED_MS[2]).toBe(20_000);
    expect(SHARED_MS[3]).toBe(30_000);
  });
});
