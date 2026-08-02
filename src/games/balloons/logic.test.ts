import { describe, it, expect } from "vitest";
import { mulberry32, seedFrom } from "@shared/rng";
import { isSustainable } from "@shared/spawn.pure";
import {
  BALLOON_COLORS,
  FORCE_TARGET_AFTER,
  PALETTE_SIZE,
  ROUND_GOAL,
  TARGET_RATE,
  colorOf,
  isRoundComplete,
  newRound,
  nextBalloon,
  paletteFor,
  specFor,
  type ColorId,
  type Difficulty,
} from "./logic";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

// Enough seeds that a property holding "by luck" on one draw cannot pass.
const SEEDS = [1, 2, 3, 7, 11, 42, 99, 1234, 20260802, 654321];

/**
 * Fold `nextBalloon` exactly the way the renderer folds it — carry `sinceTarget`
 * from each draw into the next. Written against the SAME function the game
 * calls, so these properties describe the shipped behaviour rather than a
 * test-only re-implementation of it.
 */
function stream(difficulty: Difficulty, target: ColorId, seed: number, n: number): ColorId[] {
  const rng = mulberry32(seed);
  const palette = paletteFor(difficulty);
  const out: ColorId[] = [];
  let since = 0;
  for (let i = 0; i < n; i++) {
    const draw = nextBalloon(palette, target, since, rng);
    since = draw.sinceTarget;
    out.push(draw.color);
  }
  return out;
}

/** Longest run of consecutive balloons that were NOT the target colour. */
function longestGap(colors: readonly ColorId[], target: ColorId): number {
  let worst = 0;
  let run = 0;
  for (const c of colors) {
    run = c === target ? 0 : run + 1;
    if (run > worst) worst = run;
  }
  return worst;
}

describe("balloons palette", () => {
  it("has enough colours for the hardest ladder", () => {
    expect(BALLOON_COLORS.length).toBeGreaterThanOrEqual(Math.max(...Object.values(PALETTE_SIZE)));
  });

  it("gives every colour a distinct id, hex AND cue", () => {
    // The CUE is the one that matters most: colour is the whole mechanic, so a
    // child who cannot separate red from green plays entirely by the shape mark
    // on the balloon. Two colours sharing a cue would make the game unplayable
    // for them while looking perfectly fine to everyone else.
    expect(new Set(BALLOON_COLORS.map((c) => c.id)).size).toBe(BALLOON_COLORS.length);
    expect(new Set(BALLOON_COLORS.map((c) => c.hex)).size).toBe(BALLOON_COLORS.length);
    expect(new Set(BALLOON_COLORS.map((c) => c.cue)).size).toBe(BALLOON_COLORS.length);
  });

  it("names every colour in both languages", () => {
    // These reach the child as the spoken prompt, so an empty one is a silent
    // hole rather than a visible bug.
    for (const c of BALLOON_COLORS) {
      expect(c.he.length).toBeGreaterThan(0);
      expect(c.en.length).toBeGreaterThan(0);
    }
  });

  it("resolves a colour by id, and never throws on an unknown one", () => {
    for (const c of BALLOON_COLORS) expect(colorOf(c.id)).toEqual(c);
    // A junk id must answer with a real colour rather than `undefined`: this
    // feeds a fill attribute, and `fill="undefined"` is an invisible balloon.
    expect(colorOf("chartreuse" as ColorId)).toEqual(BALLOON_COLORS[0]);
  });
});

describe.each(DIFFICULTIES)("balloons difficulty %s", (difficulty) => {
  const palette = paletteFor(difficulty);

  it(`offers ${PALETTE_SIZE[difficulty]} colours`, () => {
    expect(palette.length).toBe(PALETTE_SIZE[difficulty]);
    expect(palette.length).toBeGreaterThanOrEqual(2); // a one-colour round has no wrong answer
  });

  it("keeps the spawn spec playable for a five-year-old", () => {
    const spec = specFor(difficulty);
    // Sustainable: the cap shapes the screen without ever throttling the
    // spawner into "wait for something to pop".
    expect(isSustainable(spec)).toBe(true);
    // Long enough to see, decide and reach. A four-year-old is nowhere near an
    // adult's ~250ms.
    expect(spec.lifeMs).toBeGreaterThanOrEqual(2000);
    // More balloons may share the screen than the forced-target gap, so a
    // target balloon is always among the ones currently up.
    expect(spec.maxAlive).toBeGreaterThan(FORCE_TARGET_AFTER);
  });

  it("sets a goal that is reachable and worth reaching", () => {
    expect(ROUND_GOAL[difficulty]).toBeGreaterThanOrEqual(3);
    expect(isRoundComplete(ROUND_GOAL[difficulty] - 1, difficulty)).toBe(false);
    expect(isRoundComplete(ROUND_GOAL[difficulty], difficulty)).toBe(true);
    // Overshooting still counts as complete — two fast taps must not skip the win.
    expect(isRoundComplete(ROUND_GOAL[difficulty] + 3, difficulty)).toBe(true);
  });

  it("picks a target that is actually in the palette", () => {
    for (const s of SEEDS) {
      const round = newRound(difficulty, null, mulberry32(s));
      expect(palette.some((c) => c.id === round.target)).toBe(true);
      expect(round.goal).toBe(ROUND_GOAL[difficulty]);
    }
  });

  it("never repeats the previous round's colour", () => {
    // Two rounds in a row asking for red reads as "nothing happened" — the
    // child pops on, never learns a new colour, and the level feels stuck.
    for (const s of SEEDS) {
      for (const prev of palette) {
        expect(newRound(difficulty, prev.id, mulberry32(s)).target).not.toBe(prev.id);
      }
    }
  });

  it("is deterministic for a given seed", () => {
    for (const s of SEEDS) {
      expect(newRound(difficulty, null, mulberry32(s))).toEqual(
        newRound(difficulty, null, mulberry32(s)),
      );
      expect(stream(difficulty, palette[0].id, s, 40)).toEqual(
        stream(difficulty, palette[0].id, s, 40),
      );
    }
  });

  it("varies the target across seeds (the round is not a constant)", () => {
    const targets = new Set(
      Array.from({ length: 40 }, (_, i) =>
        newRound(difficulty, null, mulberry32(seedFrom(`target-${difficulty}-${i}`))).target),
    );
    expect(targets.size).toBeGreaterThan(1);
  });

  describe("the colour stream", () => {
    const target = palette[0].id;

    it("only ever spawns a colour from this difficulty's palette", () => {
      const ids = new Set(palette.map((c) => c.id));
      for (const s of SEEDS) {
        for (const c of stream(difficulty, target, s, 200)) expect(ids.has(c)).toBe(true);
      }
    });

    it(`NEVER goes more than ${FORCE_TARGET_AFTER} balloons without the target`, () => {
      // THE load-bearing property of this game. A child who is told "pop the
      // red ones" and gets a screen with no red balloon has nothing to do, and
      // at four years old that reads as a broken game, not as patience.
      // A statistical rate cannot promise this — a fair coin runs cold — so the
      // stream FORCES the target after a bounded gap, and this pins that.
      for (const s of SEEDS) {
        expect(longestGap(stream(difficulty, target, s, 500), target)).toBeLessThanOrEqual(
          FORCE_TARGET_AFTER,
        );
      }
    });

    it("spawns the target roughly TARGET_RATE of the time, or more", () => {
      // The forcing above can only ADD targets, so the floor is the rate itself.
      for (const s of SEEDS) {
        const drawn = stream(difficulty, target, s, 1000);
        const share = drawn.filter((c) => c === target).length / drawn.length;
        expect(share).toBeGreaterThanOrEqual(TARGET_RATE - 0.05);
        // ...and not SO dominant that the wrong colours stop appearing. A
        // screen of nothing but the target is not a colour game.
        expect(share).toBeLessThanOrEqual(0.9);
      }
    });

    it("shows every other colour in the palette, not just one distractor", () => {
      const seen = new Set(stream(difficulty, target, 2026, 600));
      for (const c of palette) expect(seen.has(c.id)).toBe(true);
    });

    it("resets sinceTarget on the target and increments it otherwise", () => {
      const rng = mulberry32(9090);
      let since = 0;
      for (let i = 0; i < 300; i++) {
        const before = since;
        const draw = nextBalloon(palette, target, since, rng);
        expect(draw.sinceTarget).toBe(draw.color === target ? 0 : before + 1);
        since = draw.sinceTarget;
      }
    });

    it("forces the target once the gap is used up, whatever the rng says", () => {
      // `() => 0.999` never clears TARGET_RATE, so only the forcing can answer.
      expect(nextBalloon(palette, target, FORCE_TARGET_AFTER, () => 0.999).color).toBe(target);
      // A junk counter must fail TOWARDS the target (more to pop), not away.
      expect(nextBalloon(palette, target, Number.NaN, () => 0.999).color).toBe(target);
    });
  });
});

describe("balloons ladder", () => {
  it("gets harder in the two ways a child feels", () => {
    // More colours to tell apart, and more pops before the round is done.
    expect(PALETTE_SIZE.easy).toBeLessThan(PALETTE_SIZE.hard);
    expect(ROUND_GOAL.easy).toBeLessThan(ROUND_GOAL.hard);
    // ...and balloons arrive faster and leave sooner.
    expect(specFor("hard").everyMs).toBeLessThan(specFor("easy").everyMs);
    expect(specFor("hard").lifeMs).toBeLessThan(specFor("easy").lifeMs);
  });

  it("defaults its rng, so a caller may omit it", () => {
    const round = newRound("easy");
    expect(paletteFor("easy").some((c) => c.id === round.target)).toBe(true);
    const draw = nextBalloon(paletteFor("easy"), round.target, 0);
    expect(paletteFor("easy").some((c) => c.id === draw.color)).toBe(true);
  });

  it("survives a palette with nothing but the target", () => {
    // Not reachable from the ladder above, but `nextBalloon` is exported and a
    // future difficulty could hand it one colour. It must answer, not hang or
    // return undefined.
    const only = [colorOf("red")];
    expect(nextBalloon(only, "red", 0, () => 0.999)).toEqual({ color: "red", sinceTarget: 0 });
  });
});
