import { describe, it, expect } from "vitest";
import { mulberry32, seedFrom } from "@shared/rng";
import {
  DIFFICULTY_CONFIG,
  isCorrect,
  newRound,
  type Difficulty,
  type ShadowRound,
} from "./logic";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

// Enough seeds that a property holding "by luck" on one draw cannot pass. Each
// is a real generator, so these exercise the same code path the game does.
const SEEDS = [1, 2, 3, 7, 11, 42, 99, 1234, 20260802, 654321];

function rounds(difficulty: Difficulty): ShadowRound[] {
  return SEEDS.map((s) => newRound(difficulty, mulberry32(s)));
}

describe("shadow-match logic", () => {
  describe.each(DIFFICULTIES)("difficulty %s", (difficulty) => {
    const cfg = DIFFICULTY_CONFIG[difficulty];

    it(`offers exactly ${cfg.choices} choices`, () => {
      for (const r of rounds(difficulty)) expect(r.choices.length).toBe(cfg.choices);
    });

    it("has EXACTLY ONE choice matching the shadow", () => {
      for (const r of rounds(difficulty)) {
        const matches = r.choices.filter((c) => c.id === r.answerId);
        expect(matches.length).toBe(1);
        // The silhouette drawn on screen is that choice's glyph — otherwise the
        // round would be unwinnable, and nothing else in the game checks it.
        expect(matches[0].emoji).toBe(r.answerEmoji);
      }
    });

    it("has all-distinct choices (ids AND glyphs)", () => {
      for (const r of rounds(difficulty)) {
        expect(new Set(r.choices.map((c) => c.id)).size).toBe(cfg.choices);
        // Glyph distinctness is the one that matters to a child: two identical
        // pictures would make the round genuinely unanswerable.
        expect(new Set(r.choices.map((c) => c.emoji)).size).toBe(cfg.choices);
      }
    });

    it(cfg.sameTheme ? "draws every choice from ONE theme" : "draws each choice from a DIFFERENT theme", () => {
      for (const r of rounds(difficulty)) {
        const themes = new Set(r.choices.map((c) => c.theme));
        expect(themes.size).toBe(cfg.sameTheme ? 1 : cfg.choices);
      }
    });

    it("accepts only the answer id", () => {
      for (const r of rounds(difficulty)) {
        expect(isCorrect(r, r.answerId)).toBe(true);
        for (const c of r.choices) {
          if (c.id !== r.answerId) expect(isCorrect(r, c.id)).toBe(false);
        }
        expect(isCorrect(r, "not-a-real-id")).toBe(false);
      }
    });

    it("is deterministic for a given seed", () => {
      for (const s of SEEDS) {
        expect(newRound(difficulty, mulberry32(s))).toEqual(newRound(difficulty, mulberry32(s)));
      }
    });

    it("varies across seeds (the round is not a constant)", () => {
      const shadows = new Set(rounds(difficulty).map((r) => r.answerEmoji));
      expect(shadows.size).toBeGreaterThan(1);
    });

    it("does not always put the answer in the same slot", () => {
      // A child who learns "it is always the middle one" has learned nothing.
      // Widen the sample here: 10 seeds can legitimately miss a slot by chance.
      const slots = new Set(
        Array.from({ length: 60 }, (_, i) =>
          newRound(difficulty, mulberry32(seedFrom(`slot-${difficulty}-${i}`))),
        ).map((r) => r.choices.findIndex((c) => c.id === r.answerId)),
      );
      expect(slots.size).toBeGreaterThan(1);
    });
  });

  it("hard is the harder ladder: same theme, more choices than easy", () => {
    expect(DIFFICULTY_CONFIG.hard.sameTheme).toBe(true);
    expect(DIFFICULTY_CONFIG.easy.sameTheme).toBe(false);
    expect(DIFFICULTY_CONFIG.hard.choices).toBeGreaterThan(DIFFICULTY_CONFIG.easy.choices);
  });

  it("defaults its rng, so a caller may omit it", () => {
    const r = newRound("easy");
    expect(r.choices.length).toBe(3);
    expect(r.choices.some((c) => c.id === r.answerId)).toBe(true);
  });

  it("names every choice in both languages", () => {
    // The renderer uses these for the per-choice aria-label, so an empty one is
    // a silent accessibility hole rather than a visible bug.
    for (const difficulty of DIFFICULTIES) {
      for (const r of rounds(difficulty)) {
        for (const c of r.choices) {
          expect(c.he.length).toBeGreaterThan(0);
          expect(c.en.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
