import { describe, it, expect } from "vitest";
import { mulberry32, seedFrom } from "@shared/rng";
import { SPAWN_DIFFICULTIES, isSustainable, steadyStateAlive } from "@shared/spawn.pure";
import type { Locale } from "@i18n/index";
import { SHIPPED_LOCALES } from "@i18n/locales";
import {
  CONFUSION_GROUPS,
  DIFFICULTY_CONFIG,
  FINAL_FORMS,
  LANES,
  MAX_DRY_SPELL,
  TARGET_CHANCE,
  areConfusable,
  catchTarget,
  confusionKey,
  contentPool,
  drawKind,
  isRoundComplete,
  newRound,
  specFor,
  type Difficulty,
  type Round,
} from "./logic";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
// See evolve/skin.test.ts: derived, because a literal here skipped Spanish
// from the day it shipped and would skip every language added after.
const LOCALES: readonly Locale[] = SHIPPED_LOCALES;

/**
 * Ten digits plus that language's alphabet.
 *
 * A RECORD and not a ternary, which is the whole point of this edit. It used to
 * read `locale === "he" ? 32 : 36` beside a hardcoded `["he", "en"]`, so when
 * Spanish shipped it was not merely unmeasured - the else-branch was WRONG for
 * it. Spanish keeps Ñ as a letter of its own, so its pool is 37 and the ternary
 * claimed 36. Nothing failed, because the population never included Spanish.
 *
 * A record cannot have an else-branch: a new shipped language reds this line by
 * name instead of quietly inheriting English's count.
 */
const POOL_SIZE: Record<Locale, number> = { he: 32, en: 36, es: 37 };

// Enough seeds that a property holding "by luck" on one draw cannot pass. Fixed
// values, so every assertion below is deterministic — never flaky.
const SEEDS = [1, 2, 3, 7, 11, 42, 99, 1234, 20260802, 654321];

function rounds(difficulty: Difficulty, locale: Locale, n = 40): Round[] {
  return Array.from({ length: n }, (_, i) =>
    newRound(difficulty, locale, null, mulberry32(seedFrom(`${difficulty}-${locale}-${i}`))),
  );
}

/** Every distractor in a round that a child could mistake for the target. */
function confusablesIn(round: Round, locale: Locale): string[] {
  return round.pool.filter((c) => areConfusable(locale, round.target, c));
}

describe("the alphabet a bubble can carry", () => {
  it.each(LOCALES)("%s: digits plus letters, every entry a single distinct character", (locale) => {
    const pool = contentPool(locale);
    expect(new Set(pool).size).toBe(pool.length);
    for (const ch of pool) expect([...ch].length).toBe(1);
    for (const d of "0123456789") expect(pool).toContain(d);
    expect(pool.length).toBe(POOL_SIZE[locale]);
  });

  it("leaves the Hebrew final (sofit) forms OUT", () => {
    // A sofit is the SAME letter in a different position, not a different
    // letter. Floating a ם past a child told to catch the מ teaches a
    // distinction that does not exist — see the comment in logic.ts.
    const pool = contentPool("he");
    for (const f of FINAL_FORMS) expect(pool).not.toContain(f);
    // Positive control: the base forms of those same letters ARE present, so
    // the assertion above is about sofits and not about an empty pool.
    for (const base of ["כ", "מ", "נ", "פ", "צ"]) expect(pool).toContain(base);
  });

  it("English uses one case only, so A and a are never the same question", () => {
    const pool = contentPool("en");
    for (const ch of pool) expect(ch).toBe(ch.toUpperCase());
  });
});

describe("which characters a child can mistake for one another", () => {
  it.each(LOCALES)("%s: the groups are DISJOINT, so a character has one group", (locale) => {
    const seen = new Set<string>();
    for (const group of CONFUSION_GROUPS[locale]) {
      for (const ch of group) {
        expect(seen.has(ch)).toBe(false);
        seen.add(ch);
      }
    }
  });

  it.each(LOCALES)("%s: every grouped character can actually spawn", (locale) => {
    const pool = new Set(contentPool(locale));
    for (const group of CONFUSION_GROUPS[locale]) {
      expect(group.length).toBeGreaterThan(1);
      for (const ch of group) expect(pool.has(ch)).toBe(true);
    }
  });

  it("knows the pairs that actually trip a Hebrew learner", () => {
    expect(areConfusable("he", "ב", "כ")).toBe(true);
    expect(areConfusable("he", "ד", "ר")).toBe(true);
    expect(areConfusable("he", "ה", "ח")).toBe(true);
    // ...and does not invent confusion where there is none.
    expect(areConfusable("he", "ב", "א")).toBe(false);
    expect(areConfusable("he", "ל", "ש")).toBe(false);
  });

  it("knows the English ones, including the letter/digit crossovers", () => {
    expect(areConfusable("en", "M", "N")).toBe(true);
    expect(areConfusable("en", "O", "0")).toBe(true);
    expect(areConfusable("en", "S", "5")).toBe(true);
    expect(areConfusable("en", "A", "H")).toBe(false);
  });

  it("never calls a character confusable with ITSELF", () => {
    // The target is excluded from its own distractor list by identity, so a
    // self-match here would make the easy-level filter drop the target's group
    // for the wrong reason.
    for (const locale of LOCALES) {
      for (const ch of contentPool(locale)) expect(areConfusable(locale, ch, ch)).toBe(false);
    }
  });

  it("gives an ungrouped character a group of its own", () => {
    expect(confusionKey("he", "א")).not.toBe(confusionKey("he", "ל"));
  });
});

describe("the difficulty ladder is built around confusable characters", () => {
  it("EASY never floats a look-alike of the target — not once, on any seed", () => {
    // The whole point of the easy level: a child still learning ב and כ is
    // never asked to tell them apart. This is the pin.
    for (const locale of LOCALES) {
      for (const round of rounds("easy", locale, 120)) {
        expect(confusablesIn(round, locale)).toEqual([]);
      }
    }
  });

  it("MEDIUM does float them (the control that proves EASY's zero is real)", () => {
    // Without this, a broken `areConfusable` returning false for everything
    // would make the assertion above pass while teaching nothing.
    for (const locale of LOCALES) {
      const withLookalikes = rounds("medium", locale, 120).filter(
        (r) => confusablesIn(r, locale).length > 0,
      );
      expect(withLookalikes.length).toBeGreaterThan(0);
    }
  });

  it("HARD deliberately seeds one whenever the target has any", () => {
    for (const locale of LOCALES) {
      for (const round of rounds("hard", locale, 120)) {
        const exists = contentPool(locale).some((c) => areConfusable(locale, round.target, c));
        if (exists) expect(confusablesIn(round, locale).length).toBeGreaterThan(0);
      }
    }
  });

  it.each(DIFFICULTIES)("%s: the pool holds the target plus distinct distractors", (difficulty) => {
    const cfg = DIFFICULTY_CONFIG[difficulty];
    for (const locale of LOCALES) {
      for (const round of rounds(difficulty, locale)) {
        expect(round.pool).toContain(round.target);
        expect(round.pool.length).toBe(cfg.poolSize);
        expect(new Set(round.pool).size).toBe(cfg.poolSize);
        expect(round.needed).toBe(cfg.needed);
        expect(round.caught).toBe(0);
      }
    }
  });

  it("asks for more catches as it gets harder", () => {
    expect(DIFFICULTY_CONFIG.medium.needed).toBeGreaterThan(DIFFICULTY_CONFIG.easy.needed);
    expect(DIFFICULTY_CONFIG.hard.needed).toBeGreaterThan(DIFFICULTY_CONFIG.medium.needed);
  });
});

describe("the spawn spec each level runs on", () => {
  it("never asks for more bubbles at once than there are lanes to hold them", () => {
    // pickLane returns null on a full board, so a maxAlive above LANES is a
    // cap that can never be reached — the spec would be quietly a lie.
    for (const d of SPAWN_DIFFICULTIES) expect(specFor(d).maxAlive).toBeLessThanOrEqual(LANES);
  });

  it("stays sustainable after the lane cap (the cap must not throttle it)", () => {
    for (const d of SPAWN_DIFFICULTIES) {
      const spec = specFor(d);
      expect(isSustainable(spec)).toBe(true);
      expect(steadyStateAlive(spec)).toBeLessThanOrEqual(spec.maxAlive);
    }
  });

  it("leaves a five-year-old time to see, decide and reach every bubble", () => {
    for (const d of SPAWN_DIFFICULTIES) expect(specFor(d).lifeMs).toBeGreaterThanOrEqual(1500);
  });

  it("gets harder in one direction", () => {
    for (let i = 1; i < SPAWN_DIFFICULTIES.length; i++) {
      expect(specFor(SPAWN_DIFFICULTIES[i]).everyMs).toBeLessThan(
        specFor(SPAWN_DIFFICULTIES[i - 1]).everyMs,
      );
    }
  });
});

describe("what each bubble carries", () => {
  const round = newRound("medium", "he", null, mulberry32(7));

  it("only ever carries something from this round's pool", () => {
    let since = 0;
    for (const seed of SEEDS) {
      const rng = mulberry32(seed);
      for (let i = 0; i < 50; i++) {
        const d = drawKind(round, since, rng);
        expect(round.pool).toContain(d.kind);
        since = d.sinceTarget;
      }
    }
  });

  it("never lets the target go missing for long", () => {
    // A child staring at a screen with nothing to catch is the failure this
    // guards. rng pinned above TARGET_CHANCE, so ONLY the dry-spell rule can
    // produce a target here.
    const never = () => 0.999;
    let since = 0;
    let run = 0;
    let longest = 0;
    for (let i = 0; i < 200; i++) {
      const d = drawKind(round, since, never);
      since = d.sinceTarget;
      run = d.kind === round.target ? 0 : run + 1;
      longest = Math.max(longest, run);
    }
    expect(longest).toBe(MAX_DRY_SPELL);
  });

  it("resets the dry counter on a target and advances it otherwise", () => {
    const always = () => 0;
    expect(drawKind(round, 0, always)).toEqual({ kind: round.target, sinceTarget: 0 });
    const miss = drawKind(round, 0, () => 0.999);
    expect(miss.kind).not.toBe(round.target);
    expect(miss.sinceTarget).toBe(1);
  });

  it("forces a target rather than trusting a broken counter", () => {
    // NaN must fail toward "something to catch", not toward an empty screen.
    expect(drawKind(round, Number.NaN, () => 0.999).kind).toBe(round.target);
  });

  it("draws the target often enough to feel catchable", () => {
    expect(TARGET_CHANCE).toBeGreaterThan(0.25);
    const rng = mulberry32(20260802);
    let since = 0;
    let hits = 0;
    for (let i = 0; i < 600; i++) {
      const d = drawKind(round, since, rng);
      since = d.sinceTarget;
      if (d.kind === round.target) hits++;
    }
    expect(hits / 600).toBeGreaterThan(0.4);
  });

  it("still answers when the pool is nothing but the target", () => {
    const solo: Round = { target: "5", pool: ["5"], caught: 0, needed: 3 };
    expect(drawKind(solo, 0, () => 0.999).kind).toBe("5");
  });
});

describe("round progress", () => {
  const base = newRound("easy", "he", null, mulberry32(3));

  it("counts a catch without mutating what it was given", () => {
    const next = catchTarget(base);
    expect(next.caught).toBe(1);
    expect(base.caught).toBe(0);
    expect(next.target).toBe(base.target);
  });

  it("is complete only once the last catch lands", () => {
    let r = base;
    for (let i = 0; i < base.needed; i++) {
      expect(isRoundComplete(r)).toBe(false);
      r = catchTarget(r);
    }
    expect(isRoundComplete(r)).toBe(true);
  });

  it("cannot be pushed past its own target count", () => {
    let r = base;
    for (let i = 0; i < base.needed + 5; i++) r = catchTarget(r);
    expect(r.caught).toBe(r.needed);
  });

  it("does not ask for the same character twice in a row", () => {
    for (const locale of LOCALES) {
      let prev: string | null = null;
      for (let i = 0; i < 80; i++) {
        const r = newRound("medium", locale, prev, mulberry32(seedFrom(`chain-${locale}-${i}`)));
        expect(r.target).not.toBe(prev);
        prev = r.target;
      }
    }
  });

  it("does not always ask for the same character (the round is not a constant)", () => {
    for (const locale of LOCALES) {
      expect(new Set(rounds("easy", locale).map((r) => r.target)).size).toBeGreaterThan(1);
    }
  });

  it("is deterministic for a given seed", () => {
    for (const seed of SEEDS) {
      expect(newRound("hard", "he", null, mulberry32(seed))).toEqual(
        newRound("hard", "he", null, mulberry32(seed)),
      );
    }
  });

  it("defaults its rng, so a caller may omit it", () => {
    const r = newRound("easy", "he");
    expect(r.pool.length).toBe(DIFFICULTY_CONFIG.easy.poolSize);
    expect(r.pool).toContain(r.target);
  });
});
