/**
 * "Fill the missing letters in the word in front of you" - BONUS's fourth
 * bonus screen.
 *
 * The rule is pure and lives in `fillGaps.ts`, so this runs the real generator
 * rather than reading a renderer's source for it. What it is really guarding is
 * FAIRNESS, exactly as `shared-letter.test.ts` does: a puzzle with a second
 * answer is one the player can be right about and marked wrong for, and nothing
 * about that is visible from the screen - it renders perfectly and simply
 * refuses a real word.
 */
import { describe, it, expect } from "vitest";
import { mulberry32 } from "@shared/rng";
import { CHOICES, FILL_MS, GAPS, answersFor, fillQuality, makeFill } from "./fillGaps";
import { PUZZLE_WORDS } from "./puzzleWords";
import { WORDS } from "./words";
import { HARD_Q, MEDIUM_Q, tierOf } from "./bonus";

const seeds = (n: number) => Array.from({ length: n }, (_, i) => mulberry32(i + 1));
const POOL = new Set(PUZZLE_WORDS);

describe("the generator answers at all", () => {
  /**
   * THE CONTROL. Every assertion below is a property of a puzzle, and a
   * generator returning `undefined` for everything would satisfy all of them
   * vacuously.
   */
  it("makes a puzzle on every one of 300 seeds", () => {
    const misses = seeds(300).filter((rng) => makeFill(rng) === undefined).length;
    expect(misses, `${misses} of 300 seeds produced no puzzle`).toBe(0);
  });

  it("can tell a settled pattern from an open one", () => {
    // Without this, `answersFor` returning one word for everything would make
    // every uniqueness assertion below pass over puzzles that are not unique.
    expect(answersFor("c_t").length, "c_t is wide open").toBeGreaterThan(2);
    expect(answersFor("_o_t").length, "_o_t is wide open").toBeGreaterThan(5);
    expect(answersFor("me_d_w")).toEqual(["meadow"]);
  });

  it("reaches the whole supply rather than a corner of it", () => {
    const patterns = new Set<string>();
    for (const rng of seeds(600)) patterns.add(makeFill(rng)!.pattern);
    // Measured: the pool holds 275 patterns with exactly one answer. A
    // generator stuck on a handful would pass every fairness test below.
    expect(patterns.size, `only ${patterns.size} distinct puzzles`).toBeGreaterThan(120);
  });
});

describe("a puzzle is fair", () => {
  it("has exactly one real word that fits", () => {
    for (const rng of seeds(300)) {
      const p = makeFill(rng)!;
      const answers = answersFor(p.pattern);
      expect(answers, `${p.pattern} has ${answers.length} answers`).toEqual([p.word]);
    }
  });

  it("takes out exactly the number of letters it says it does", () => {
    for (const rng of seeds(200)) {
      const p = makeFill(rng)!;
      expect(p.gaps).toHaveLength(GAPS);
      expect([...p.pattern].filter((c) => c === "_")).toHaveLength(GAPS);
      expect([...p.gaps].sort((a, b) => a - b), "the gaps are out of order").toEqual([...p.gaps]);
      // and the pattern really is the word with those positions removed
      const rebuilt = [...p.word].map((c, i) => (p.gaps.includes(i) ? "_" : c)).join("");
      expect(rebuilt).toBe(p.pattern);
    }
  });

  /**
   * NOTHING SHORT ENOUGH TO BE A COIN FLIP. Two letters out of a four-letter
   * word cannot single one out, so the uniqueness test excludes short words on
   * its own - this asserts the consequence rather than a separate rule, which
   * is why there is no minimum-length check in the generator to go stale.
   */
  it("never asks about a word too short to be settled", () => {
    for (const rng of seeds(200)) {
      expect(makeFill(rng)!.word.length).toBeGreaterThanOrEqual(GAPS + 3);
    }
  });
});

describe("what it may show", () => {
  /**
   * THE WORD ON THE SCREEN COMES FROM THE POOL, NEVER THE DICTIONARY.
   * `words.ts` is ENABLE1 behind a blocklist, and a blocklist is not provably
   * complete - the first generated build still carried four slurs after
   * filtering (NOTICE.md). It is safe to JUDGE with and never to SHOW from.
   */
  it("only ever shows a word from the authored pool", () => {
    for (const rng of seeds(400)) {
      const p = makeFill(rng)!;
      expect(POOL.has(p.word), `${p.word} is not in puzzleWords.ts`).toBe(true);
    }
    // The control: the dictionary is much bigger, so "it came from the pool"
    // is a real constraint rather than a tautology.
    expect(WORDS.size).toBeGreaterThan(POOL.size * 50);
  });
});

describe("the letters it offers", () => {
  it("always offers the same number, with no repeats", () => {
    for (const rng of seeds(200)) {
      const p = makeFill(rng)!;
      expect(p.choices).toHaveLength(CHOICES);
      expect(new Set(p.choices).size, "the row repeats a letter").toBe(CHOICES);
    }
  });

  it("includes every letter the answer needs", () => {
    for (const rng of seeds(300)) {
      const p = makeFill(rng)!;
      for (const i of p.gaps) {
        expect(p.choices, `${p.word} needs ${p.word[i]} and it is not offered`).toContain(p.word[i]);
      }
    }
  });

  /**
   * THERE IS NO SUCH THING AS A NEAR MISS HERE, and this is the assertion that
   * says so - it is the reason `fillGaps.ts` does not try to build one.
   *
   * A letter that completes ONE gap with the other already correct would give a
   * real word matching the whole pattern, so it would be a second answer, and
   * the pattern was chosen to have one. The set is empty by construction. It
   * was measured before being believed, and it is measured again here, because
   * the tempting "improvement" to this round is to go looking for decoys that
   * cannot exist.
   */
  it("cannot offer a letter that nearly works, because none exists", () => {
    let checked = 0, alternatives = 0;
    for (const rng of seeds(200)) {
      const p = makeFill(rng)!;
      for (const g of p.gaps) {
        const one = [...p.pattern]
          .map((ch, k) => (ch === "_" && k !== g ? p.word[k] : ch)).join("");
        checked++;
        alternatives += answersFor(one).filter((w) => w !== p.word).length;
      }
    }
    expect(checked, "no completions were examined - the matcher is blind").toBeGreaterThan(300);
    expect(alternatives, "a near miss exists after all - re-read the row's design").toBe(0);
  });

  /**
   * SO THE ROW MUST NOT NARROW ITSELF. Eight letters drawn uniformly from the
   * alphabet carry `q`, `x` or `z` about a third of the time, and a row with
   * three impossible letters in it has told the player something. Every letter
   * offered stands at one of the gap positions in some real word of that
   * length.
   */
  it("offers only letters that belong at those positions", () => {
    let odd = 0, total = 0;
    for (const rng of seeds(200)) {
      const p = makeFill(rng)!;
      const ok = new Set<string>();
      for (const i of p.gaps) {
        for (const w of PUZZLE_WORDS) if (w.length === p.word.length) ok.add(w[i]);
      }
      for (const c of p.choices) { total++; if (!ok.has(c)) odd++; }
    }
    expect(total, "no letters were examined - the matcher is blind").toBeGreaterThan(1000);
    // Topped up from the alphabet only when a position is too narrow to fill
    // the row, so the row's SIZE never leaks how tight the puzzle is.
    expect(odd / total, `${Math.round((odd / total) * 100)}% of the row could not belong`)
      .toBeLessThan(0.1);
  });
});

describe("what it is worth", () => {
  /**
   * BONUS PRICED THIS SCREEN NOWHERE, so it takes the smaller of the two prices
   * it did record. Guessing UP would hand a child coins the original never
   * promised and quietly re-tune an economy `economy.ts` owns.
   */
  it("pays the middle tier for a solve and never the top one", () => {
    expect(tierOf(fillQuality(true))).toBe("medium");
    expect(fillQuality(true)).toBe(MEDIUM_Q);
    expect(fillQuality(true), "it drifted up to the top price").toBeLessThan(HARD_Q);
  });

  /** Losing gives nothing and never takes anything away. */
  it("pays the floor when the clock wins, rather than nothing", () => {
    expect(fillQuality(false)).toBe(0);
    expect(tierOf(fillQuality(false)), "a bonus that can pay nothing is a trap").toBe("easy");
  });
});

describe("the clock", () => {
  /** Borrowed from the two-word screen, which is BONUS's own 20 seconds. */
  it("is the twenty seconds the original gave the screen it resembles", () => {
    expect(FILL_MS).toBe(20_000);
  });
});
