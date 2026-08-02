import { describe, it, expect } from "vitest";
import { mulberry32 } from "@shared/rng";
import {
  FAMILIES,
  FAMILY_IDS,
  PERIOD,
  SEQ_COLORS,
  colorHex,
  fullSequence,
  isCorrect,
  itemKey,
  newRound,
  sameItem,
  type Difficulty,
  type FamilyId,
  type Round,
  type SeqItem,
} from "./logic";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const CHOICES_FOR: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 4 };

/** A deterministic round, so a failure is reproducible from its seed. */
function roundAt(difficulty: Difficulty, seed: number): Round {
  return newRound(difficulty, mulberry32(seed));
}

/** Sweep enough seeds that every family in a difficulty is exercised. */
function sweep(difficulty: Difficulty, seeds = 120): Round[] {
  return Array.from({ length: seeds }, (_, s) => roundAt(difficulty, s));
}

// --- Independent verification of "the answer continues the pattern" -----------
// These re-derive NOTHING from the generator: they characterise each family by
// a property the full sequence (visible row PLUS the answer) must satisfy. A
// generator that picked the wrong answer would break the property.

function assertPeriodic(full: SeqItem[], period: number): void {
  expect(full.length).toBeGreaterThan(period);
  for (let i = period; i < full.length; i++) {
    expect(itemKey(full[i])).toBe(itemKey(full[i - period]));
  }
  // A "pattern" of one repeated item is not a pattern.
  expect(new Set(full.map(itemKey)).size).toBeGreaterThan(1);
}

function assertGrowing(full: SeqItem[]): void {
  const a = full[0];
  const runs: number[] = [];
  for (const item of full) {
    if (sameItem(item, a)) runs.push(0);
    else runs[runs.length - 1] += 1;
  }
  // Exactly two distinct items, and every non-A is the same B.
  expect(new Set(full.map(itemKey)).size).toBe(2);
  // Every COMPLETE run holds one more B than the run before it: 1, 2, 3, ...
  for (let i = 0; i < runs.length - 1; i++) expect(runs[i]).toBe(i + 1);
  // The trailing run may be cut short by the row length, never overrun.
  expect(runs[runs.length - 1]).toBeLessThanOrEqual(runs.length);
}

function assertArithmetic(full: SeqItem[]): void {
  const values = full.map((i) => {
    expect(i.kind).toBe("number");
    return i.kind === "number" ? i.value : NaN;
  });
  const step = values[1] - values[0];
  expect(step).toBeGreaterThan(0);
  for (let i = 1; i < values.length; i++) expect(values[i] - values[i - 1]).toBe(step);
  expect(values.every((v) => v > 0)).toBe(true);
}

function assertContinues(round: Round): void {
  const full = fullSequence(round);
  const period = PERIOD[round.family];
  if (period > 0) assertPeriodic(full, period);
  else if (round.family === "GROW") assertGrowing(full);
  else if (round.family === "NUMBER") assertArithmetic(full);
  else throw new Error(`no continuation check for family ${round.family}`);
}

describe("sequence logic", () => {
  describe("item identity", () => {
    it("distinguishes every axis that matters", () => {
      expect(sameItem({ kind: "color", color: "red" }, { kind: "color", color: "red" })).toBe(true);
      expect(sameItem({ kind: "color", color: "red" }, { kind: "color", color: "blue" })).toBe(false);
      // Same shape, different colour — and same colour, different shape.
      const star = { kind: "shape", shape: "star", color: "red" } as const;
      expect(sameItem(star, { kind: "shape", shape: "star", color: "blue" })).toBe(false);
      expect(sameItem(star, { kind: "shape", shape: "heart", color: "red" })).toBe(false);
      // Size is part of a glyph's identity — that is the whole SIZE family.
      const big = { kind: "glyph", emoji: "🐘", scale: "big" } as const;
      expect(sameItem(big, { kind: "glyph", emoji: "🐘", scale: "small" })).toBe(false);
      expect(sameItem({ kind: "number", value: 6 }, { kind: "number", value: 8 })).toBe(false);
      // A colour and a number are never the same thing.
      expect(sameItem({ kind: "color", color: "red" }, { kind: "number", value: 1 })).toBe(false);
    });

    it("resolves every palette colour to a hex, and refuses an unknown one", () => {
      for (const c of SEQ_COLORS) expect(colorHex(c.id)).toMatch(/^#[0-9a-f]{6}$/i);
      // Palette entries must be visually distinct, not two shades of one colour.
      expect(new Set(SEQ_COLORS.map((c) => c.hex)).size).toBe(SEQ_COLORS.length);
      expect(() => colorHex("chartreuse" as never)).toThrow();
    });
  });

  describe.each(DIFFICULTIES)("difficulty %s", (difficulty) => {
    const rounds = sweep(difficulty);

    it("generates a well-formed round from every seed", () => {
      for (const r of rounds) {
        expect(FAMILIES[difficulty]).toContain(r.family);
        expect(r.difficulty).toBe(difficulty);
        // 5-6 visible items plus the blank: legible without counting.
        expect(r.shown.length).toBeGreaterThanOrEqual(5);
        expect(r.shown.length).toBeLessThanOrEqual(6);
        expect(r.choices.length).toBe(CHOICES_FOR[difficulty]);
        expect(r.answerIndex).toBeGreaterThanOrEqual(0);
        expect(r.answerIndex).toBeLessThan(r.choices.length);
      }
    });

    it("picks an answer that genuinely continues the pattern", () => {
      for (const r of rounds) assertContinues(r);
    });

    it("offers exactly one correct choice", () => {
      for (const r of rounds) {
        const correct = r.choices.filter((c) => sameItem(c, r.answer));
        expect(correct.length).toBe(1);
        expect(sameItem(r.choices[r.answerIndex], r.answer)).toBe(true);
        expect(isCorrect(r, r.answerIndex)).toBe(true);
        for (let i = 0; i < r.choices.length; i++) {
          if (i !== r.answerIndex) expect(isCorrect(r, i)).toBe(false);
        }
      }
    });

    it("never repeats a choice, so no distractor can equal the answer", () => {
      for (const r of rounds) {
        const keys = r.choices.map(itemKey);
        expect(new Set(keys).size).toBe(keys.length);
        const distractors = r.choices.filter((_, i) => i !== r.answerIndex);
        for (const d of distractors) expect(sameItem(d, r.answer)).toBe(false);
      }
    });

    it("keeps every distractor plausible — same visual family as the answer", () => {
      for (const r of rounds) {
        for (const c of r.choices) {
          expect(c.kind).toBe(r.answer.kind);
          // A shape round is about SHAPE: every option shares the row's colour,
          // so the child cannot shortcut it by picking the odd colour out.
          if (c.kind === "shape" && r.answer.kind === "shape") {
            expect(c.color).toBe(r.answer.color);
          }
        }
      }
    });

    it("always offers a wrong choice drawn from the pattern itself", () => {
      for (const r of rounds) {
        const shownKeys = new Set(r.shown.map(itemKey));
        const distractors = r.choices.filter((_, i) => i !== r.answerIndex);
        // The classic near-miss: an element that IS in the row, at the wrong
        // point in the cycle. Without it the odd-one-out gives the game away.
        expect(distractors.some((d) => shownKeys.has(itemKey(d)))).toBe(true);
      }
    });

    it("replays identically for the same seed and differs across seeds", () => {
      expect(roundAt(difficulty, 7)).toEqual(roundAt(difficulty, 7));
      const keys = sweep(difficulty, 40).map((r) => r.shown.map(itemKey).join("|"));
      expect(new Set(keys).size).toBeGreaterThan(1);
    });

    it("exercises every family in its ladder — none is dead code", () => {
      const seen = new Set(rounds.map((r) => r.family));
      expect([...seen].sort()).toEqual([...FAMILIES[difficulty]].sort());
    });
  });

  it("assigns every declared family to exactly one difficulty", () => {
    const assigned = DIFFICULTIES.flatMap((d) => [...FAMILIES[d]]);
    expect(assigned.sort()).toEqual([...FAMILY_IDS].sort());
    expect(new Set(assigned).size).toBe(assigned.length);
  });

  it("declares a period for every family", () => {
    for (const f of FAMILY_IDS) expect(typeof PERIOD[f]).toBe("number");
    // The two non-repeating families are the only zeroes.
    const zero = FAMILY_IDS.filter((f) => PERIOD[f] === 0);
    expect(zero.sort()).toEqual((["GROW", "NUMBER"] as FamilyId[]).sort());
  });

  it("keeps the hard number rows countable for a five-year-old", () => {
    const rows = sweep("hard", 200).filter((r) => r.family === "NUMBER");
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      for (const item of fullSequence(r)) {
        if (item.kind !== "number") throw new Error("number round held a non-number");
        expect(item.value).toBeGreaterThan(0);
        expect(item.value).toBeLessThanOrEqual(40);
      }
    }
  });
});
