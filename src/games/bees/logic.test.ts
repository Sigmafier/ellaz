import { describe, it, expect } from "vitest";
import { mulberry32, seedFrom } from "@shared/rng";
import { isSustainable } from "@shared/spawn.pure";
import {
  DIFFICULTIES,
  GOOD_AT,
  GREAT_AT,
  LANES,
  LEVELS,
  MAX_RUN,
  ROUND_MS,
  TARGET,
  countExpire,
  countTap,
  emptyScore,
  expectedBees,
  isRoundOver,
  nextCreature,
  other,
  praiseFor,
  realisedBeeShare,
  remainingMs,
  secondsLeft,
  type Creature,
  type Difficulty,
} from "./logic";

/** A long deterministic stream of creatures at one difficulty. */
function stream(difficulty: Difficulty, seed: number, n: number): Creature[] {
  const rng = mulberry32(seed);
  const ratio = LEVELS[difficulty].beeRatio;
  const out: Creature[] = [];
  for (let i = 0; i < n; i++) out.push(nextCreature(out, ratio, rng));
  return out;
}

function share(list: readonly Creature[], kind: Creature): number {
  return list.filter((c) => c === kind).length / list.length;
}

/** The longest run of one creature anywhere in the stream. */
function longestRun(list: readonly Creature[]): number {
  let best = 0;
  let run = 0;
  for (let i = 0; i < list.length; i++) {
    run = i > 0 && list[i] === list[i - 1] ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

describe("bees-only logic", () => {
  describe("the bee-to-butterfly ratio (the whole design, pinned)", () => {
    // These three numbers ARE the game. Too many bees and there is no restraint
    // to practise — the child settles into tapping everything and never looks.
    // Too few and a four-year-old sits watching an empty sky in a timed round.
    // The ladder runs the other way from most games: harder means FEWER bees,
    // because the skill being trained is discrimination, not speed.
    it("is pinned per difficulty", () => {
      expect(LEVELS.easy.beeRatio).toBe(0.65);
      expect(LEVELS.medium.beeRatio).toBe(0.6);
      expect(LEVELS.hard.beeRatio).toBe(0.5);
    });

    it("keeps every tier inside the playable band", () => {
      for (const d of DIFFICULTIES) {
        // Below 0.5 the child waits more than they act; above 0.7 a butterfly
        // is rare enough to become a gotcha, which is punishment by surprise.
        expect(LEVELS[d].beeRatio).toBeGreaterThanOrEqual(0.5);
        expect(LEVELS[d].beeRatio).toBeLessThanOrEqual(0.7);
      }
    });

    it("gets harder by adding butterflies, never by removing them", () => {
      expect(LEVELS.easy.beeRatio).toBeGreaterThan(LEVELS.medium.beeRatio);
      expect(LEVELS.medium.beeRatio).toBeGreaterThan(LEVELS.hard.beeRatio);
    });

    it("still puts enough bees in a round to be worth playing", () => {
      // A round the child finishes having caught three things is not a round.
      for (const d of DIFFICULTIES) expect(expectedBees(d)).toBeGreaterThanOrEqual(15);
    });
  });

  describe("realisedBeeShare — the draw weight is NOT what the child meets", () => {
    // The run cap forces a switch after MAX_RUN, and it can only ever cost the
    // MAJORITY creature its longest runs. So the share a child actually sees is
    // pulled toward even, and quoting `beeRatio` as the on-screen mix would
    // overstate the bees by several points. Closed form, checked against the
    // real generator below.
    it("predicts what the generator actually produces", () => {
      for (const d of DIFFICULTIES) {
        const predicted = realisedBeeShare(LEVELS[d].beeRatio);
        const observed = share(stream(d, seedFrom(`realised-${d}`), 6000), "bee");
        expect(observed).toBeGreaterThan(predicted - 0.025);
        expect(observed).toBeLessThan(predicted + 0.025);
      }
    });

    it("is pinned, and always pulled toward even but never past it", () => {
      expect(realisedBeeShare(0.65)).toBeCloseTo(0.5846, 3);
      expect(realisedBeeShare(0.6)).toBeCloseTo(0.5568, 3);
      expect(realisedBeeShare(0.5)).toBe(0.5);
      for (const d of DIFFICULTIES) {
        const r = LEVELS[d].beeRatio;
        expect(realisedBeeShare(r)).toBeLessThanOrEqual(r + 1e-9);
        expect(realisedBeeShare(r)).toBeGreaterThanOrEqual(0.5 - 1e-9);
      }
    });

    it("stays sane at the extremes", () => {
      // Even a config demanding nothing but bees yields butterflies, because
      // the cap outranks the weight. That is the point of the cap.
      expect(realisedBeeShare(1)).toBeCloseTo(MAX_RUN / (MAX_RUN + 1), 6);
      expect(realisedBeeShare(0)).toBeCloseTo(1 / (MAX_RUN + 1), 6);
      expect(realisedBeeShare(Number.NaN)).toBe(0.5);
    });

    it("always produces both creatures, at every difficulty", () => {
      for (const d of DIFFICULTIES) {
        const s = stream(d, seedFrom(`both-${d}`), 200);
        expect(s).toContain("bee");
        expect(s).toContain("butterfly");
      }
    });
  });

  describe("nextCreature", () => {
    it("never lets one creature run longer than MAX_RUN", () => {
      // A long run of butterflies is dead air; a long run of bees teaches
      // "tap everything". The cap is what keeps the round honest.
      for (const d of DIFFICULTIES) {
        for (const seed of [1, 7, 42, 1234, 20260802]) {
          expect(longestRun(stream(d, seed, 3000))).toBeLessThanOrEqual(MAX_RUN);
        }
      }
    });

    it("breaks a run even when the rng insists otherwise", () => {
      // rng() === 0 is below every ratio, so the weighted draw would say "bee"
      // forever. The cap must override it — and the same in reverse.
      const allBee: Creature[] = [];
      for (let i = 0; i < 12; i++) allBee.push(nextCreature(allBee, 0.65, () => 0));
      expect(longestRun(allBee)).toBe(MAX_RUN);
      expect(allBee).toContain("butterfly");

      const allFly: Creature[] = [];
      for (let i = 0; i < 12; i++) allFly.push(nextCreature(allFly, 0.65, () => 0.999));
      expect(longestRun(allFly)).toBe(MAX_RUN);
      expect(allFly).toContain("bee");
    });

    it("reads only the tail, so a caller may pass a short history", () => {
      expect(nextCreature([], 1, () => 0)).toBe("bee");
      expect(nextCreature(["bee"], 1, () => 0)).toBe("bee");
      expect(nextCreature(["bee", "bee"], 1, () => 0)).toBe("bee");
      expect(nextCreature(["bee", "bee", "bee"], 1, () => 0)).toBe("butterfly");
      // A run further back does not count — only the run touching the end.
      expect(nextCreature(["bee", "bee", "bee", "butterfly"], 1, () => 0)).toBe("bee");
    });

    it("is deterministic for a given seed", () => {
      for (const d of DIFFICULTIES) {
        expect(stream(d, 99, 300)).toEqual(stream(d, 99, 300));
      }
    });

    it("survives a nonsense ratio instead of throwing", () => {
      // A broken config must degrade to a playable coin-flip, never to a black
      // screen or a stream of one creature.
      const nan: Creature[] = [];
      for (let i = 0; i < 400; i++) nan.push(nextCreature(nan, Number.NaN, mulberry32(i + 1)));
      expect(nan).toContain("bee");
      expect(nan).toContain("butterfly");
      expect(nextCreature([], -5, () => 0.5)).toBe("butterfly");
      expect(nextCreature([], 99, () => 0.5)).toBe("bee");
    });

    it("defaults its rng, so a caller may omit it", () => {
      expect(["bee", "butterfly"]).toContain(nextCreature([], 0.6));
    });
  });

  it("other() is a total involution", () => {
    expect(other("bee")).toBe("butterfly");
    expect(other("butterfly")).toBe("bee");
    expect(other(other("bee"))).toBe("bee");
  });

  it("asks for the bee — the target is never the pretty one", () => {
    expect(TARGET).toBe("bee");
  });

  describe("the board fits the spawner", () => {
    it("has at least one lane per simultaneous creature", () => {
      // `pickLane` answers null when every lane is taken, and `spawn` then
      // returns null — so fewer lanes than `maxAlive` silently starves the
      // spawner and the screen never fills. Nothing errors.
      for (const d of DIFFICULTIES) expect(LANES).toBeGreaterThanOrEqual(LEVELS[d].spec.maxAlive);
    });

    it("uses a spec whose own cap does not throttle it", () => {
      for (const d of DIFFICULTIES) expect(isSustainable(LEVELS[d].spec)).toBe(true);
    });

    it("leaves a small child over a second to see, decide and reach", () => {
      for (const d of DIFFICULTIES) expect(LEVELS[d].spec.lifeMs).toBeGreaterThan(1500);
    });
  });

  describe("scoring", () => {
    it("starts at nothing", () => {
      expect(emptyScore()).toEqual({ caught: 0, fluttered: 0, escaped: 0, freed: 0 });
    });

    it("counts a tapped bee as caught and a tapped butterfly as fluttered", () => {
      const a = countTap(emptyScore(), "bee");
      expect(a).toEqual({ caught: 1, fluttered: 0, escaped: 0, freed: 0 });
      const b = countTap(a, "butterfly");
      expect(b).toEqual({ caught: 1, fluttered: 1, escaped: 0, freed: 0 });
    });

    it("counts an untapped bee as escaped and an untapped butterfly as freed", () => {
      // Neither is a failure. A missed bee just flew away, and a butterfly left
      // in peace is the thing the game is actually about.
      const a = countExpire(emptyScore(), "bee");
      expect(a).toEqual({ caught: 0, fluttered: 0, escaped: 1, freed: 0 });
      expect(countExpire(a, "butterfly")).toEqual({
        caught: 0,
        fluttered: 0,
        escaped: 1,
        freed: 1,
      });
    });

    it("never mutates the score it is handed", () => {
      const start = emptyScore();
      countTap(start, "bee");
      countTap(start, "butterfly");
      countExpire(start, "bee");
      countExpire(start, "butterfly");
      expect(start).toEqual(emptyScore());
    });

    it("cannot subtract — nothing a child does takes a point away", () => {
      let s = emptyScore();
      for (const c of stream("hard", 5, 200)) s = countTap(s, c);
      for (const c of stream("hard", 6, 200)) s = countExpire(s, c);
      expect(s.caught).toBeGreaterThan(0);
      expect(s.fluttered).toBeGreaterThan(0);
      expect(s.caught + s.fluttered).toBe(200);
      expect(s.escaped + s.freed).toBe(200);
    });
  });

  describe("the round clock", () => {
    it("is a span a four-year-old sits through", () => {
      expect(ROUND_MS).toBeGreaterThanOrEqual(20_000);
      expect(ROUND_MS).toBeLessThanOrEqual(60_000);
    });

    it("counts down and stops at zero", () => {
      expect(remainingMs(0)).toBe(ROUND_MS);
      expect(remainingMs(ROUND_MS / 2)).toBe(ROUND_MS / 2);
      expect(remainingMs(ROUND_MS)).toBe(0);
      expect(remainingMs(ROUND_MS * 10)).toBe(0);
    });

    it("treats a broken clock as a full round, never as an ended one", () => {
      // Fail toward "keep playing": ending a round early because a clock read
      // NaN would take a round away from a child mid-play.
      expect(remainingMs(Number.NaN)).toBe(ROUND_MS);
      expect(remainingMs(-1)).toBe(ROUND_MS);
      expect(isRoundOver(Number.NaN)).toBe(false);
    });

    it("ends exactly at the boundary", () => {
      expect(isRoundOver(ROUND_MS - 1)).toBe(false);
      expect(isRoundOver(ROUND_MS)).toBe(true);
      expect(isRoundOver(ROUND_MS + 1)).toBe(true);
    });

    it("shows whole seconds, and never a negative one", () => {
      expect(secondsLeft(0)).toBe(ROUND_MS / 1000);
      expect(secondsLeft(ROUND_MS - 1)).toBe(1);
      expect(secondsLeft(ROUND_MS)).toBe(0);
      expect(secondsLeft(ROUND_MS * 3)).toBe(0);
    });
  });

  describe("praise", () => {
    it("has a kind word for a round that caught nothing", () => {
      expect(praiseFor(0)).toBe("start");
      expect(praiseFor(-1)).toBe("start");
      expect(praiseFor(Number.NaN)).toBe("start");
    });

    it("is pinned at its thresholds", () => {
      expect(praiseFor(GOOD_AT - 1)).toBe("start");
      expect(praiseFor(GOOD_AT)).toBe("good");
      expect(praiseFor(GREAT_AT - 1)).toBe("good");
      expect(praiseFor(GREAT_AT)).toBe("great");
      expect(praiseFor(999)).toBe("great");
    });

    it("is reachable in one round at every difficulty", () => {
      // A band nobody can reach is not praise, it is a locked door.
      for (const d of DIFFICULTIES) expect(expectedBees(d)).toBeGreaterThanOrEqual(GREAT_AT);
    });
  });
});
