import { describe, it, expect } from "vitest";
import { CAST, CAST_THEMES, castOf } from "@shared/cast";
import { mulberry32 } from "@shared/rng";
import {
  COVER_MS,
  DIFFICULTIES,
  LEVELS,
  MAX_ITEMS,
  MIN_MS_PER_ITEM,
  MIN_STUDY_MS,
  OPTION_COUNT,
  PHASES,
  isCorrectChoice,
  newRound,
  nextPhase,
  revealedItems,
  vanishedItem,
  type Difficulty,
} from "./logic";

// A spread of seeds, so every property below is checked against ~200 real
// rounds rather than one lucky draw. Cheap: a round is three array ops.
const SEEDS = Array.from({ length: 200 }, (_, i) => i);

function roundsFor(d: Difficulty) {
  return SEEDS.map((s) => newRound(d, mulberry32(s)));
}

describe("vanish - the difficulty ladder", () => {
  it.each(DIFFICULTIES)("puts the declared number of characters on the board (%s)", (d) => {
    for (const round of roundsFor(d)) {
      expect(round.items.length).toBe(LEVELS[d].count);
    }
  });

  it("ramps 3 -> 4 -> 6 characters", () => {
    expect(DIFFICULTIES.map((d) => LEVELS[d].count)).toEqual([3, 4, 6]);
  });

  // The honest-lever guarantee. Item count is what makes a level hard; the
  // study window is only ever the second lever, and it has a floor. A future
  // "make hard harder" that shortens the clock past these bounds turns a memory
  // game into a reaction game, which is the one thing this ladder must not do.
  it.each(DIFFICULTIES)("never studies below the five-year-old floor (%s)", (d) => {
    const { count, studyMs } = LEVELS[d];
    expect(studyMs).toBeGreaterThanOrEqual(MIN_STUDY_MS);
    expect(studyMs / count).toBeGreaterThanOrEqual(MIN_MS_PER_ITEM);
  });

  it("shrinks the per-item budget while growing the total window", () => {
    const perItem = DIFFICULTIES.map((d) => LEVELS[d].studyMs / LEVELS[d].count);
    const total = DIFFICULTIES.map((d) => LEVELS[d].studyMs);
    for (let i = 1; i < DIFFICULTIES.length; i++) {
      expect(perItem[i]).toBeLessThan(perItem[i - 1]);
      expect(total[i]).toBeGreaterThan(total[i - 1]);
    }
  });

  it("fills complete rows at every level", () => {
    for (const d of DIFFICULTIES) {
      const { count, columns } = LEVELS[d];
      expect(columns).toBeGreaterThan(0);
      expect(columns).toBeLessThanOrEqual(count);
      expect(count % columns).toBe(0);
    }
  });

  it("carries the level's study window and columns onto the round", () => {
    for (const d of DIFFICULTIES) {
      const round = newRound(d, mulberry32(1));
      expect(round.studyMs).toBe(LEVELS[d].studyMs);
      expect(round.columns).toBe(LEVELS[d].columns);
      expect(round.difficulty).toBe(d);
    }
  });
});

describe("vanish - a fair round", () => {
  // Two similar-looking animals do not make a round harder, they make it
  // unfair: the child remembers correctly and still cannot answer. `drawCast`
  // draws distinct members by construction, but this is a correctness property
  // of THIS game, so it is asserted here rather than assumed upstream.
  it.each(DIFFICULTIES)("shows visually distinct characters (%s)", (d) => {
    for (const round of roundsFor(d)) {
      const emoji = new Set(round.items.map((i) => i.emoji));
      const he = new Set(round.items.map((i) => i.he));
      const en = new Set(round.items.map((i) => i.en));
      expect(emoji.size).toBe(round.items.length);
      expect(he.size).toBe(round.items.length);
      expect(en.size).toBe(round.items.length);
    }
  });

  it("draws every character from one theme", () => {
    for (const round of roundsFor("hard")) {
      const themeEmoji = new Set(castOf(round.theme).map((i) => i.emoji));
      for (const item of round.items) expect(themeEmoji.has(item.emoji)).toBe(true);
    }
  });

  // Guards the clamp in `newRound`: a theme smaller than the hardest board
  // would silently shrink the round instead of failing a test.
  it("has enough characters in every theme for the biggest board", () => {
    for (const theme of CAST_THEMES) {
      expect(castOf(theme).length).toBeGreaterThanOrEqual(MAX_ITEMS);
    }
  });

  it("vanishes a character that was actually on the board", () => {
    for (const d of DIFFICULTIES) {
      for (const round of roundsFor(d)) {
        expect(round.vanished).toBeGreaterThanOrEqual(0);
        expect(round.vanished).toBeLessThan(round.items.length);
        expect(round.items).toContain(vanishedItem(round));
      }
    }
  });

  it("removes exactly one character on reveal, leaving the rest in place", () => {
    for (const d of DIFFICULTIES) {
      for (const round of roundsFor(d)) {
        const shown = revealedItems(round);
        expect(shown.length).toBe(round.items.length);
        expect(shown.filter((s) => s === null).length).toBe(1);
        expect(shown[round.vanished]).toBeNull();
        shown.forEach((s, i) => {
          if (i !== round.vanished) expect(s).toBe(round.items[i]);
        });
      }
    }
  });

  it("offers the vanished character plus fresh decoys, never the board set", () => {
    for (const d of DIFFICULTIES) {
      for (const round of roundsFor(d)) {
        // The row is the answer plus decoys, capped by OPTION_COUNT.
        expect(round.choices.length).toBeGreaterThanOrEqual(3);
        expect(round.choices.length).toBeLessThanOrEqual(OPTION_COUNT[d]);
        // All choices distinct.
        const keys = round.choices.map((c) => c.emoji);
        expect(new Set(keys).size).toBe(keys.length);
        // Every choice EXCEPT the vanished one is a decoy that was NOT on the
        // board — the whole point of the fix.
        const gone = vanishedItem(round).emoji;
        const onBoard = new Set(round.items.map((i) => i.emoji));
        for (const c of round.choices) {
          if (c.emoji === gone) continue;
          expect(onBoard.has(c.emoji), `${c.emoji} is on the board`).toBe(false);
        }
        // Decoys stay on-theme (same cast).
        const themeEmojis = new Set(CAST[round.theme].map((c) => c.emoji));
        for (const c of round.choices) expect(themeEmojis.has(c.emoji)).toBe(true);
      }
    }
  });

  it("puts the vanished character among the choices exactly once", () => {
    for (const d of DIFFICULTIES) {
      for (const round of roundsFor(d)) {
        const gone = vanishedItem(round);
        const hits = round.choices.filter((c) => c.emoji === gone.emoji);
        expect(hits.length).toBe(1);
        const correct = round.choices.findIndex((c) => c.emoji === gone.emoji);
        expect(isCorrectChoice(round, correct)).toBe(true);
      }
    }
  });

  it("varies its decoys across the corpus", () => {
    // The decoy set should not be constant — across many hard rounds the row
    // draws a spread of characters, not the same three every time.
    const seen = new Set(
      roundsFor("hard").flatMap((r) => r.choices.map((c) => c.emoji)),
    );
    expect(seen.size).toBeGreaterThan(OPTION_COUNT.hard);
  });
});

describe("vanish - answering", () => {
  it("accepts the vanished character and refuses the others", () => {
    for (const round of roundsFor("medium")) {
      const gone = vanishedItem(round);
      round.choices.forEach((c, i) => {
        expect(isCorrectChoice(round, i)).toBe(c.emoji === gone.emoji);
      });
    }
  });

  it("returns false for an out-of-range choice rather than throwing", () => {
    const round = newRound("easy", mulberry32(3));
    expect(isCorrectChoice(round, -1)).toBe(false);
    expect(isCorrectChoice(round, round.choices.length)).toBe(false);
    expect(isCorrectChoice(round, 999)).toBe(false);
  });

  // The no-dead-end property: a wrong tap must leave the round exactly as
  // answerable as it was. There is no attempt counter to exhaust and no state
  // to corrupt, and this test is what keeps it that way.
  it("stays answerable after every wrong tap", () => {
    for (const round of roundsFor("hard")) {
      const before = JSON.stringify(round);
      const gone = vanishedItem(round);
      const correct = round.choices.findIndex((c) => c.emoji === gone.emoji);

      // Tap every wrong answer, twice over, in both directions.
      for (let pass = 0; pass < 2; pass++) {
        round.choices.forEach((_, i) => {
          if (i !== correct) expect(isCorrectChoice(round, i)).toBe(false);
        });
      }

      // The round is untouched, and the right answer still wins.
      expect(JSON.stringify(round)).toBe(before);
      expect(isCorrectChoice(round, correct)).toBe(true);
    }
  });
});

describe("vanish - beats", () => {
  it("runs study -> cover -> reveal and stops there", () => {
    expect(PHASES).toEqual(["study", "cover", "reveal"]);
    expect(nextPhase("study")).toBe("cover");
    expect(nextPhase("cover")).toBe("reveal");
    expect(nextPhase("reveal")).toBe("reveal");
  });

  it("holds the blanket down long enough to read as a disappearance", () => {
    // A jump cut is not a disappearance - the beat has to be visible.
    expect(COVER_MS).toBeGreaterThanOrEqual(600);
    expect(COVER_MS).toBeLessThanOrEqual(2000);
  });
});

describe("vanish - determinism", () => {
  it.each(DIFFICULTIES)("replays the same round from the same seed (%s)", (d) => {
    for (const seed of [0, 7, 42, 1234]) {
      expect(newRound(d, mulberry32(seed))).toEqual(newRound(d, mulberry32(seed)));
    }
  });

  it("draws different rounds from different seeds", () => {
    const signatures = new Set(
      roundsFor("hard").map((r) => `${r.theme}|${r.items.map((i) => i.emoji).join("")}|${r.vanished}`),
    );
    expect(signatures.size).toBeGreaterThan(SEEDS.length / 2);
  });

  it("defaults to Math.random when no rng is passed", () => {
    const round = newRound("easy");
    expect(round.items.length).toBe(LEVELS.easy.count);
    expect(round.items).toContain(vanishedItem(round));
  });
});
