import { describe, it, expect } from "vitest";
import { generateProblem, isCorrect, LEVELS, type MathLevel } from "./logic";
import { CAST, type CastTheme } from "@shared/cast";

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const LEVEL_IDS: MathLevel[] = ["up5", "up10", "up20", "mult"];
// The three pre-arithmetic modes for 4-5 year olds: count a group, match a
// numeral to a group, and add/subtract two groups you can see.
const PRE_LEVEL_IDS: MathLevel[] = ["count", "match", "visual"];

describe("math quiz logic", () => {
  for (const level of LEVEL_IDS) {
    const { min, max, kind } = LEVELS[level];

    it(`[${level}] operands, answer, and choices all stay within ${min}..${max}`, () => {
      const rng = lcg(level.length * 7 + 1);
      for (let i = 0; i < 500; i++) {
        const p = generateProblem(level, rng);
        expect(p.level).toBe(level);
        // Answer in range.
        expect(p.answer).toBeGreaterThanOrEqual(min);
        expect(p.answer).toBeLessThanOrEqual(max);
        // Arithmetic is consistent with the operator.
        if (p.op === "+") expect(p.a + p.b).toBe(p.answer);
        else if (p.op === "-") expect(p.a - p.b).toBe(p.answer);
        else expect(p.a * p.b).toBe(p.answer);
        // Choices: include the answer, unique, in range.
        expect(p.choices).toContain(p.answer);
        expect(new Set(p.choices).size).toBe(p.choices.length);
        expect(p.choices.length).toBe(3);
        for (const c of p.choices) {
          expect(c).toBeGreaterThanOrEqual(min);
          expect(c).toBeLessThanOrEqual(max);
        }
      }
    });

    it(`[${level}] uses only the ${kind === "mult" ? "× operator" : "+ and - operators"}`, () => {
      const rng = lcg(level.length * 13 + 3);
      const ops = new Set<string>();
      for (let i = 0; i < 200; i++) ops.add(generateProblem(level, rng).op);
      if (kind === "mult") {
        expect([...ops]).toEqual(["×"]);
      } else {
        expect(ops.has("+")).toBe(true);
        expect(ops.has("-")).toBe(true);
        expect(ops.has("×")).toBe(false);
      }
    });
  }

  it("mult keeps operands within 1..5", () => {
    const rng = lcg(99);
    for (let i = 0; i < 300; i++) {
      const p = generateProblem("mult", rng);
      expect(p.a).toBeGreaterThanOrEqual(1);
      expect(p.a).toBeLessThanOrEqual(5);
      expect(p.b).toBeGreaterThanOrEqual(1);
      expect(p.b).toBeLessThanOrEqual(5);
    }
  });

  it("defaults to up10 when no level is given", () => {
    const p = generateProblem(undefined, lcg(5));
    expect(p.level).toBe("up10");
  });

  it("isCorrect matches only the answer", () => {
    const p = generateProblem("up10", lcg(3));
    expect(isCorrect(p, p.answer)).toBe(true);
    const wrong = p.choices.find((c) => c !== p.answer)!;
    expect(isCorrect(p, wrong)).toBe(false);
  });

  // The four arithmetic levels predate the pre-arithmetic modes. Widening the
  // Problem shape must not perturb a single draw: these are the exact strings
  // the pre-widening logic emitted for seed 2026, captured before any edit.
  // If one of these moves, the arithmetic levels are no longer byte-identical.
  it("legacy levels are byte-identical to their pre-widening output", () => {
    const golden: Record<string, string[]> = {
      up5: ["0+0=0[0,2,1]", "5+0=5[5,3,4]", "0-0=0[1,2,0]", "2-0=2[4,2,1]", "5+0=5[4,3,5]", "2+1=3[3,1,4]"],
      up10: ["0+0=0[2,1,0]", "6+4=10[8,10,9]", "7+0=7[5,7,6]", "3+3=6[4,6,7]", "0+1=1[0,3,1]", "6-2=4[4,6,5]"],
      up20: ["0+0=0[1,0,2]", "18-7=11[13,11,10]", "12+6=18[16,18,17]", "15+2=17[18,16,17]", "4-3=1[0,3,1]", "19-15=4[2,4,5]"],
      mult: ["1×1=1[3,1,2]", "2×4=8[10,8,7]", "1×1=1[1,2,3]", "5×3=15[15,16,13]", "5×3=15[13,16,15]", "4×1=4[4,6,5]"],
    };
    for (const level of LEVEL_IDS) {
      const rng = lcg(2026);
      const rows: string[] = [];
      for (let i = 0; i < 6; i++) {
        const p = generateProblem(level, rng);
        rows.push(`${p.a}${p.op}${p.b}=${p.answer}[${p.choices.join(",")}]`);
      }
      expect(rows, `level ${level} drifted`).toEqual(golden[level]);
    }
  });

  it("arithmetic levels carry mode 'arith', numeric choices, and nothing to draw", () => {
    for (const level of LEVEL_IDS) {
      const p = generateProblem(level, lcg(17));
      expect(p.mode).toBe("arith");
      expect(p.choiceKind).toBe("number");
      expect(p.groups).toEqual([]);
      expect(p.glyph).toBeUndefined();
    }
  });
});

describe("pre-arithmetic modes", () => {
  for (const level of PRE_LEVEL_IDS) {
    const { min, max } = LEVELS[level];

    it(`[${level}] answer and choices all stay within ${min}..${max}`, () => {
      const rng = lcg(level.length * 11 + 5);
      for (let i = 0; i < 500; i++) {
        const p = generateProblem(level, rng);
        expect(p.level).toBe(level);
        expect(p.answer).toBeGreaterThanOrEqual(min);
        expect(p.answer).toBeLessThanOrEqual(max);
        expect(p.choices).toContain(p.answer);
        expect(new Set(p.choices).size).toBe(p.choices.length);
        expect(p.choices.length).toBe(3);
        for (const c of p.choices) {
          expect(c).toBeGreaterThanOrEqual(min);
          expect(c).toBeLessThanOrEqual(max);
        }
      }
    });

    it(`[${level}] hands the renderer a glyph it never has to choose itself`, () => {
      const rng = lcg(level.length * 23 + 7);
      const seen = new Set<string>();
      for (let i = 0; i < 200; i++) {
        const p = generateProblem(level, rng);
        expect(typeof p.glyph).toBe("string");
        expect(p.glyph!.length).toBeGreaterThan(0);
        seen.add(p.glyph!);
      }
      // Not pinned to one emoji forever - the pool is meant to vary.
      expect(seen.size).toBeGreaterThan(1);
    });

    it(`[${level}] every group is countable at a glance (1..10 items)`, () => {
      const rng = lcg(level.length * 31 + 9);
      for (let i = 0; i < 300; i++) {
        const p = generateProblem(level, rng);
        for (const g of p.groups) {
          expect(Number.isInteger(g)).toBe(true);
          expect(g).toBeGreaterThanOrEqual(1);
          expect(g).toBeLessThanOrEqual(10);
        }
      }
    });

    it(`[${level}] isCorrect still accepts only the answer`, () => {
      const p = generateProblem(level, lcg(level.length * 41 + 2));
      expect(isCorrect(p, p.answer)).toBe(true);
      const wrong = p.choices.find((c) => c !== p.answer)!;
      expect(isCorrect(p, wrong)).toBe(false);
    });

    it(`[${level}] is deterministic for a given seed`, () => {
      const a = generateProblem(level, lcg(777));
      const b = generateProblem(level, lcg(777));
      expect(a).toEqual(b);
    });
  }

  it("[count] shows exactly one group whose size IS the answer", () => {
    const rng = lcg(101);
    for (let i = 0; i < 300; i++) {
      const p = generateProblem("count", rng);
      expect(p.mode).toBe("count");
      expect(p.groups.length).toBe(1);
      expect(p.groups[0]).toBe(p.answer);
      // The child counts pictures and taps a NUMBER.
      expect(p.choiceKind).toBe("number");
    }
  });

  it("[match] shows a numeral and offers GROUPS as the choices", () => {
    const rng = lcg(202);
    for (let i = 0; i < 300; i++) {
      const p = generateProblem("match", rng);
      expect(p.mode).toBe("match");
      // The question is the numeral itself, so there is nothing to draw above it.
      expect(p.groups).toEqual([]);
      // Each choice is rendered as a group of that many glyphs.
      expect(p.choiceKind).toBe("group");
      // A group of 7+ is not distinguishable at a glance from 8 for a 4-year-old.
      for (const c of p.choices) expect(c).toBeLessThanOrEqual(6);
    }
  });

  it("[visual] shows two non-empty groups that combine to the answer", () => {
    const rng = lcg(303);
    const ops = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const p = generateProblem("visual", rng);
      expect(p.mode).toBe("visual");
      expect(p.choiceKind).toBe("number");
      expect(p.groups).toEqual([p.a, p.b]);
      // Both groups must be drawable - an empty group is not a picture.
      expect(p.a).toBeGreaterThanOrEqual(1);
      expect(p.b).toBeGreaterThanOrEqual(1);
      if (p.op === "+") expect(p.a + p.b).toBe(p.answer);
      else expect(p.a - p.b).toBe(p.answer);
      ops.add(p.op);
    }
    // Both operations appear, and never multiplication.
    expect(ops.has("+")).toBe(true);
    expect(ops.has("-")).toBe(true);
    expect(ops.has("×")).toBe(false);
  });

  it("[visual] the total never exceeds 10 and the answer is never negative", () => {
    const rng = lcg(404);
    for (let i = 0; i < 500; i++) {
      const p = generateProblem("visual", rng);
      expect(p.a).toBeLessThanOrEqual(10);
      expect(p.b).toBeLessThanOrEqual(10);
      if (p.op === "+") expect(p.a + p.b).toBeLessThanOrEqual(10);
      expect(p.answer).toBeGreaterThanOrEqual(1);
    }
  });

  it("[count] tops out at 10 so a group is still countable", () => {
    expect(LEVELS.count.max).toBeLessThanOrEqual(10);
    expect(LEVELS.count.min).toBeGreaterThanOrEqual(1);
  });

  // "How many 🌊?" is not a question a five-year-old can answer - you cannot
  // point at each one. Every glyph must be a discrete, countable object, which
  // means it comes from one of the eligible shared-cast themes and never from
  // `nature` (waves, fire, clouds, snow).
  it("only ever draws discrete, countable objects from the shared cast", () => {
    const countable = new Set(
      (["fruit", "toys", "food", "animals"] as CastTheme[]).flatMap((t) =>
        CAST[t].map((i) => i.emoji),
      ),
    );
    const massNouns = new Set(CAST.nature.map((i) => i.emoji));
    for (const level of PRE_LEVEL_IDS) {
      const rng = lcg(level.length * 53 + 11);
      for (let i = 0; i < 400; i++) {
        const g = generateProblem(level, rng).glyph!;
        expect(countable.has(g), `${g} is not a countable cast object`).toBe(true);
        expect(massNouns.has(g), `${g} is a mass noun`).toBe(false);
      }
    }
  });
});
