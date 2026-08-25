/**
 * "Build a word from ALL the letters in front of you" - BONUS's fifth bonus
 * screen, and the only one it priced by SIZE rather than flat.
 *
 * The rule is pure and lives in `anagram.ts`, so this runs the real generator.
 * What it guards is different from the other screens': this one cannot be
 * UNFAIR in the uniqueness sense, because every real word using every tile
 * wins. What it can be is ALREADY SOLVED - a scramble that happens to spell a
 * word is a round that is over before the clock starts, and it does not read as
 * a bug. It reads as a child being quick.
 */
import { describe, it, expect } from "vitest";
import { mulberry32 } from "@shared/rng";
import {
  ANAGRAM_MS, MAX_LEN, MIN_LEN, anagramQuality, answersFor, isAnswer, makeAnagram, scramble,
} from "./anagram";
import { PUZZLE_WORDS } from "./puzzleWords";
import { WORDS } from "./words";
import { HARD_Q, MEDIUM_Q, tierOf } from "./bonus";

const seeds = (n: number) => Array.from({ length: n }, (_, i) => mulberry32(i + 1));
const POOL = new Set(PUZZLE_WORDS);
const IN_RANGE = PUZZLE_WORDS.filter((w) => w.length >= MIN_LEN && w.length <= MAX_LEN);

describe("the generator answers at all", () => {
  /** THE CONTROL - every property below is vacuous on a generator that returns nothing. */
  it("makes a puzzle on every one of 300 seeds", () => {
    const misses = seeds(300).filter((rng) => makeAnagram(rng) === undefined).length;
    expect(misses, `${misses} of 300 seeds produced no puzzle`).toBe(0);
  });

  /**
   * ASKED OF EVERY WORD, NOT OF SEEDS. "Can this word be laid out so it is not
   * a word" is a question about the WORD, so it can be asked of all of them
   * rather than sampled - which makes `undefined` mean "no such ordering
   * exists" rather than "the shuffle was unlucky".
   */
  it("can scramble every word in range, all of them", () => {
    const stuck = IN_RANGE.filter((w) => scramble(w) === undefined);
    expect(stuck, `no non-word ordering exists for: ${stuck.join(" ")}`).toEqual([]);
    expect(IN_RANGE.length, "nothing was in range - the matcher is blind").toBeGreaterThan(200);
  });

  it("reaches most of the supply rather than a corner of it", () => {
    const words = new Set(seeds(600).map((rng) => makeAnagram(rng)!.word));
    expect(words.size, `only ${words.size} distinct words`).toBeGreaterThan(120);
  });
});

describe("a puzzle is not already solved", () => {
  /** The whole failure mode this round has. */
  it("never lays the letters out as a word", () => {
    for (const rng of seeds(400)) {
      const p = makeAnagram(rng)!;
      const shown = p.letters.join("");
      expect(WORDS.has(shown), `${shown} is already an answer`).toBe(false);
      expect(shown, "the letters are the word itself").not.toBe(p.word);
    }
  });

  it("hands over every letter of the word and no others", () => {
    for (const rng of seeds(300)) {
      const p = makeAnagram(rng)!;
      expect([...p.letters].sort()).toEqual([...p.word].sort());
    }
  });

  it("stays inside the lengths it declares", () => {
    for (const rng of seeds(300)) {
      const p = makeAnagram(rng)!;
      expect(p.word.length).toBeGreaterThanOrEqual(MIN_LEN);
      expect(p.word.length).toBeLessThanOrEqual(MAX_LEN);
    }
  });

  /**
   * THREE-LETTER WORDS ARE OUT, and not for being easy. 55 of the pool's 94
   * of them share their letters with another word, so a shuffle of `cat` lands
   * on `act` about as often as not.
   */
  it("leaves out the length that opens on its own answer", () => {
    expect(MIN_LEN).toBeGreaterThan(3);
    const three = PUZZLE_WORDS.filter((w) => w.length === 3);
    const twins = three.filter((w) => answersFor([...w]).length > 1).length;
    expect(three.length, "no three-letter words - the matcher is blind").toBeGreaterThan(50);
    expect(twins / three.length, "three-letter words are not actually twinned")
      .toBeGreaterThan(0.4);
  });
});

describe("what counts as right", () => {
  it("accepts the word the letters came from", () => {
    for (const rng of seeds(300)) {
      const p = makeAnagram(rng)!;
      expect(isAnswer(p.letters, p.word), `${p.word} was refused`).toBe(true);
    }
  });

  /**
   * AND ACCEPTS ANY OTHER REAL WORD USING EVERY TILE. Measured on the pool:
   * more than a third of these letter sets spell something else too, so a rule
   * that only accepted our own word would be refusing real answers regularly
   * rather than in a corner case.
   */
  it("accepts a different real word made of the same letters", () => {
    const twinned = IN_RANGE.filter((w) => answersFor([...w]).length > 1);
    expect(twinned.length, "nothing is twinned - the matcher is blind").toBeGreaterThan(50);
    for (const w of twinned.slice(0, 40)) {
      const other = answersFor([...w]).find((x) => x !== w)!;
      expect(isAnswer([...w], other), `${other} was refused for ${w}`).toBe(true);
    }
  });

  it("refuses a word that leaves a tile out, or is not a word", () => {
    const p = makeAnagram(mulberry32(7))!;
    expect(isAnswer(p.letters, p.word.slice(0, -1)), "a short word was accepted").toBe(false);
    expect(isAnswer(p.letters, p.word + p.word[0]), "an extra letter was accepted").toBe(false);
    expect(isAnswer(p.letters, p.letters.join("")), "the scramble was accepted").toBe(false);
    // right length, right letters-ish, not a word
    expect(isAnswer(["z", "q", "x", "j"], "zqxj"), "nonsense was accepted").toBe(false);
    // right letters in a set sense but the wrong multiset
    expect(isAnswer(["a", "a", "b", "c"], "abcc"), "the wrong multiset was accepted").toBe(false);
  });
});

describe("what it may show", () => {
  /**
   * THE REVEAL COMES FROM THE POOL. Nothing is on the screen while the round
   * runs but loose letters, so this round shows a word only at the very end -
   * and that word is still `puzzleWords.ts`'s to choose, never the
   * dictionary's (NOTICE.md).
   */
  it("only ever names a word from the authored pool", () => {
    for (const rng of seeds(400)) {
      expect(POOL.has(makeAnagram(rng)!.word)).toBe(true);
    }
    expect(WORDS.size).toBeGreaterThan(POOL.size * 50);
  });
});

describe("what it is worth", () => {
  /**
   * BONUS PAID 30-100 BY LENGTH, so length is the axis here because the record
   * says so - the one screen whose gradient is not a guess. Three tiers, one of
   * which is the floor a LOST round already pays, so the gradient lands on the
   * two that are left.
   */
  it("pays more for a longer word", () => {
    expect(tierOf(anagramQuality(4, true))).toBe("medium");
    expect(tierOf(anagramQuality(5, true))).toBe("hard");
    expect(tierOf(anagramQuality(6, true))).toBe("hard");
    expect(anagramQuality(6, true)).toBe(HARD_Q);
    expect(anagramQuality(4, true)).toBe(MEDIUM_Q);
    expect(anagramQuality(4, true), "the gradient is flat").toBeLessThan(anagramQuality(5, true));
  });

  /** Losing gives nothing and never takes anything away - and never outpays a win. */
  it("pays the floor when the clock wins, rather than nothing", () => {
    for (const n of [MIN_LEN, MAX_LEN]) {
      expect(anagramQuality(n, false)).toBe(0);
      expect(tierOf(anagramQuality(n, false)), "a bonus that can pay nothing is a trap").toBe("easy");
      expect(anagramQuality(n, false)).toBeLessThan(anagramQuality(n, true));
    }
  });
});

describe("the clock", () => {
  /** Borrowed from the three-word screen - the other one whose top price is 100. */
  it("is the thirty seconds the original gave the screen it shares a ceiling with", () => {
    expect(ANAGRAM_MS).toBe(30_000);
  });
});
