import { describe, it, expect } from "vitest";
import { mulberry32, seedFrom } from "@shared/rng";
import { isSustainable } from "@shared/spawn.pure";
import {
  ABSOLUTE_FLOOR_MS,
  DIFFICULTIES,
  DWELL_FLOOR,
  DWELL_START,
  DWELL_STEP,
  HOP_GAP_MS,
  HOP_MS,
  LEVEL_HEADSTART,
  MIN_PAD_GAP_X,
  MIN_PAD_GAP_Y,
  MIN_SIT_MS,
  PAD_COUNT,
  PAD_SPOTS,
  ROUND_GOAL,
  dwellMs,
  hopOffsetForLevel,
  hopsToFloor,
  isRoundComplete,
  nextHop,
  padsFor,
  sitMs,
  specFor,
  type Difficulty,
} from "./logic";

/** A long deterministic chain of hops, each starting where the last one landed. */
function chain(padCount: number, seed: number, n: number): number[] {
  const rng = mulberry32(seed);
  const out: number[] = [];
  let from: number | null = null;
  for (let i = 0; i < n; i++) {
    const hop = nextHop(from, padCount, rng);
    out.push(hop.pad);
    from = hop.pad;
  }
  return out;
}

describe("catch-the-frog logic", () => {
  // ---------------------------------------------------------------------------
  // The dwell floor. This is the single most important number in the game: it is
  // how long the frog SITS before hopping on its own, and the whole difficulty
  // design is the curve that shrinks it. A floor below a small child's
  // see-decide-reach time does not make the game "hard", it makes the round
  // UNFINISHABLE — the round ends on N catches, so a frog nobody can ever catch
  // leaves a four-year-old tapping forever with no way out. Missing costs
  // nothing; never catching costs everything.
  // ---------------------------------------------------------------------------
  describe("the dwell floor (the whole difficulty design)", () => {
    it("is the hop flight plus the time a small child needs to reach", () => {
      // Stated as a SUM, not a magic constant, so the two halves can be argued
      // about separately: the frog is in the air for HOP_MS of its own dwell,
      // and only the remainder is time to see it, decide, and land a finger.
      expect(ABSOLUTE_FLOOR_MS).toBe(HOP_MS + MIN_SIT_MS);
      expect(MIN_SIT_MS).toBeGreaterThanOrEqual(1000);
      expect(HOP_MS).toBeLessThanOrEqual(400);
    });

    it("is never crossed, at any difficulty, at any hop count", () => {
      // Violations are COLLECTED rather than asserted per iteration: one expect
      // per loop turn costs seconds here, and a bare "expected 1240 >= 1260"
      // would not say which tier or which hop broke it.
      const under: string[] = [];
      for (const d of DIFFICULTIES) {
        for (let hops = 0; hops <= 2000; hops++) {
          const ms = dwellMs(d, hops);
          if (ms < ABSOLUTE_FLOOR_MS) under.push(`${d}@${hops}=${ms}`);
        }
      }
      expect(under).toEqual([]);
    });

    it("leaves the frog SITTING still for long enough, not merely alive", () => {
      // A dwell that is all flight is not reachable time. `sitMs` is the number
      // a child actually gets.
      const under: string[] = [];
      for (const d of DIFFICULTIES) {
        for (let hops = 0; hops <= 500; hops++) {
          const ms = sitMs(d, hops);
          if (ms < MIN_SIT_MS) under.push(`${d}@${hops}=${ms}`);
        }
      }
      expect(under).toEqual([]);
    });

    it("declares a per-tier floor that never sits under the absolute one", () => {
      for (const d of DIFFICULTIES) {
        expect(DWELL_FLOOR[d]).toBeGreaterThanOrEqual(ABSOLUTE_FLOOR_MS);
        expect(dwellMs(d, 10_000)).toBe(DWELL_FLOOR[d]);
      }
    });

    it("still floors a level-999 head start", () => {
      // The head start is the one input that grows without bound in real play.
      for (const d of DIFFICULTIES) {
        expect(dwellMs(d, hopOffsetForLevel(999) + 40)).toBe(DWELL_FLOOR[d]);
      }
    });
  });

  describe("the dwell curve", () => {
    it("starts at the tier's opening dwell", () => {
      for (const d of DIFFICULTIES) expect(dwellMs(d, 0)).toBe(DWELL_START[d]);
    });

    it("only ever shrinks", () => {
      for (const d of DIFFICULTIES) {
        for (let hops = 1; hops <= 300; hops++) {
          expect(dwellMs(d, hops)).toBeLessThanOrEqual(dwellMs(d, hops - 1));
        }
      }
    });

    it("shrinks by exactly one step per hop until it lands on the floor", () => {
      for (const d of DIFFICULTIES) {
        const n = hopsToFloor(d);
        expect(dwellMs(d, n - 1)).toBeGreaterThan(DWELL_FLOOR[d]);
        expect(dwellMs(d, n)).toBe(DWELL_FLOOR[d]);
        expect(dwellMs(d, 1)).toBe(DWELL_START[d] - DWELL_STEP[d]);
      }
    });

    it("gets harder as the tier goes up, at every point on the curve", () => {
      for (let hops = 0; hops <= 60; hops++) {
        expect(dwellMs("easy", hops)).toBeGreaterThanOrEqual(dwellMs("medium", hops));
        expect(dwellMs("medium", hops)).toBeGreaterThanOrEqual(dwellMs("hard", hops));
      }
      // ...and strictly so where it matters, or the three buttons are a lie.
      expect(dwellMs("easy", 0)).toBeGreaterThan(dwellMs("hard", 0));
      expect(DWELL_FLOOR.easy).toBeGreaterThan(DWELL_FLOOR.hard);
    });

    it("speeds up noticeably inside a single round, without hitting the floor early", () => {
      for (const d of DIFFICULTIES) {
        // Felt: by the end of a clean round the frog is meaningfully quicker.
        expect(dwellMs(d, ROUND_GOAL[d])).toBeLessThanOrEqual(DWELL_START[d] - 400);
        // But not so quick that the tier's whole range is spent in four hops —
        // then the curve is a cliff and the difficulty button does the work.
        expect(hopsToFloor(d)).toBeGreaterThanOrEqual(5);
      }
    });

    it("fails toward the SLOWEST frog when handed a broken hop count", () => {
      // The safe direction is "easier". A NaN counter must never be read as a
      // huge number and snap the frog to its floor for a child mid-round.
      for (const d of DIFFICULTIES) {
        expect(dwellMs(d, Number.NaN)).toBe(DWELL_START[d]);
        expect(dwellMs(d, -50)).toBe(DWELL_START[d]);
        expect(dwellMs(d, Number.POSITIVE_INFINITY)).toBe(DWELL_START[d]);
        expect(dwellMs(d, 2.7)).toBe(dwellMs(d, 2));
      }
    });

    it("survives an unknown difficulty instead of returning NaN", () => {
      // A renamed tier or junk out of storage indexes to `undefined`, and a NaN
      // lifeMs makes the spawner treat every frog as never-alive: an empty pond
      // that throws nothing. Answer with the gentlest legal dwell instead.
      const junk = "banana" as Difficulty;
      expect(dwellMs(junk, 0)).toBe(DWELL_START.easy);
      expect(dwellMs(junk, 999)).toBe(DWELL_START.easy);
      expect(sitMs(junk, 5)).toBeGreaterThanOrEqual(MIN_SIT_MS);
    });
  });

  // ---------------------------------------------------------------------------
  // Where the frog goes. A frog that "hops" onto the pad it is already sitting
  // on does not read as a hop — it reads as a broken game, because the child
  // watched an animation and nothing changed.
  // ---------------------------------------------------------------------------
  describe("nextHop — never the same pad twice in a row", () => {
    it("never lands on the pad it came from", () => {
      // Collected, not asserted per hop — 75k expects cost ~13 seconds, and the
      // failure message is more useful naming the pond and the hop index.
      const repeats: string[] = [];
      for (const count of [2, 3, 4, 5, 6]) {
        for (const seed of [1, 7, 42, 1234, 20260802]) {
          const pads = chain(count, seed, 3000);
          for (let i = 1; i < pads.length; i++) {
            if (pads[i] === pads[i - 1]) repeats.push(`pads=${count} seed=${seed} hop=${i}`);
          }
        }
      }
      expect(repeats).toEqual([]);
    });

    it("holds even when the rng insists on the pad it just left", () => {
      // rng() === 0 always picks the first candidate; the candidate LIST is what
      // enforces the rule, so a degenerate rng cannot break it.
      expect(nextHop(0, 4, () => 0).pad).not.toBe(0);
      expect(nextHop(0, 4, () => 0.999).pad).not.toBe(0);
      for (let from = 0; from < 6; from++) {
        expect(nextHop(from, 6, () => 0).pad).not.toBe(from);
        expect(nextHop(from, 6, () => 0.999).pad).not.toBe(from);
      }
    });

    it("can still reach every pad, so none of them is dead", () => {
      for (const d of DIFFICULTIES) {
        const seen = new Set(chain(PAD_COUNT[d], seedFrom(`reach-${d}`), 4000));
        expect(seen.size).toBe(PAD_COUNT[d]);
        for (const p of seen) expect(p).toBeLessThan(PAD_COUNT[d]);
      }
    });

    it("carries the pad it came from, so the renderer can draw the arc", () => {
      const hop = nextHop(2, 5, mulberry32(9));
      expect(hop.from).toBe(2);
      expect(hop.pad).not.toBe(2);
    });

    it("appears in place on the first hop of a round", () => {
      // `from === pad` means zero travel: the frog simply lands, rather than
      // flying in from an off-board pad nobody saw it leave.
      const hop = nextHop(null, 4, mulberry32(3));
      expect(hop.from).toBe(hop.pad);
    });

    it("treats an out-of-range previous pad as a fresh start", () => {
      // Real path: the player switches hard (6 pads) → easy (4) while the frog
      // sits on pad 5. Pad 5 is not on the board any more.
      const hop = nextHop(5, 4, mulberry32(11));
      expect(hop.pad).toBeLessThan(4);
      expect(hop.from).toBe(hop.pad);
      expect(nextHop(-3, 4, mulberry32(2)).from).toBe(nextHop(-3, 4, mulberry32(2)).pad);
      expect(nextHop(1.5, 4, mulberry32(2)).pad).toBeLessThan(4);
    });

    it("cannot move on a one-pad pond, and says so instead of looping", () => {
      // The no-repeat rule is unsatisfiable here. Returning the only pad is the
      // honest answer; spinning until a different pad appears is a hang.
      const hop = nextHop(0, 1, () => 0.5);
      expect(hop).toEqual({ pad: 0, from: 0 });
    });

    it("survives a nonsense pad count", () => {
      for (const count of [0, -4, Number.NaN, Number.POSITIVE_INFINITY]) {
        expect(nextHop(0, count, () => 0.5)).toEqual({ pad: 0, from: 0 });
      }
    });

    it("is deterministic for a given seed", () => {
      expect(chain(6, 99, 200)).toEqual(chain(6, 99, 200));
    });

    it("defaults its rng, so a caller may omit it", () => {
      expect(nextHop(0, 4).pad).toBeGreaterThanOrEqual(1);
    });
  });

  // ---------------------------------------------------------------------------
  // The pond. Pad positions are pure data (percentages of the surface), so the
  // one thing that can go wrong with them — two pads drawn on top of each other,
  // making a hop invisible — is checkable without a browser.
  // ---------------------------------------------------------------------------
  describe("the pond layout", () => {
    it("keeps every pad clear of every other one", () => {
      // Two overlapping pads make a hop between them read as "nothing moved",
      // which is the exact failure the no-repeat rule exists to prevent.
      for (let i = 0; i < PAD_SPOTS.length; i++) {
        for (let j = i + 1; j < PAD_SPOTS.length; j++) {
          const dx = Math.abs(PAD_SPOTS[i].x - PAD_SPOTS[j].x);
          const dy = Math.abs(PAD_SPOTS[i].y - PAD_SPOTS[j].y);
          expect(dx >= MIN_PAD_GAP_X || dy >= MIN_PAD_GAP_Y).toBe(true);
        }
      }
    });

    it("keeps every pad fully inside the pond", () => {
      for (const spot of PAD_SPOTS) {
        expect(spot.x).toBeGreaterThanOrEqual(14);
        expect(spot.x).toBeLessThanOrEqual(86);
        expect(spot.y).toBeGreaterThanOrEqual(20);
        expect(spot.y).toBeLessThanOrEqual(80);
      }
    });

    it("gives every tier enough pads to make finding the frog a real question", () => {
      for (const d of DIFFICULTIES) {
        // Three is the floor: on two pads the frog alternates, and a child stops
        // looking and just taps back and forth.
        expect(PAD_COUNT[d]).toBeGreaterThanOrEqual(3);
        expect(PAD_COUNT[d]).toBeLessThanOrEqual(PAD_SPOTS.length);
        expect(padsFor(d)).toEqual(PAD_SPOTS.slice(0, PAD_COUNT[d]));
      }
      expect(PAD_COUNT.easy).toBeLessThan(PAD_COUNT.medium);
      expect(PAD_COUNT.medium).toBeLessThan(PAD_COUNT.hard);
    });

    it("spreads the easy pond over the whole pond, not one corner of it", () => {
      // `padsFor` takes a PREFIX, so the array order decides what "easy" looks
      // like. The first four must be the four corners, or easy is a lopsided
      // board with an unused half.
      const easy = padsFor("easy");
      expect(easy.filter((p) => p.y < 50)).toHaveLength(2);
      expect(easy.filter((p) => p.y > 50)).toHaveLength(2);
      expect(easy.filter((p) => p.x < 50)).toHaveLength(2);
      expect(easy.filter((p) => p.x > 50)).toHaveLength(2);
    });
  });

  describe("the spawn spec", () => {
    it("puts exactly one frog on the pond, at every tier and every hop", () => {
      // ONE frog is the game. Two would make "tap it and it hops" ambiguous and
      // would break the no-repeat rule's premise (which pad did THAT one leave?).
      for (const d of DIFFICULTIES) {
        for (const hops of [0, 1, 7, 99]) expect(specFor(d, hops).maxAlive).toBe(1);
      }
    });

    it("hands the dwell curve straight to the spawner as the prop lifetime", () => {
      for (const d of DIFFICULTIES) {
        for (const hops of [0, 3, 25]) expect(specFor(d, hops).lifeMs).toBe(dwellMs(d, hops));
      }
    });

    it("puts a small floor under how fast two frogs can follow each other", () => {
      // Only bites when the child catches a frog almost instantly; without it a
      // fast tap teleports the frog with no beat in between.
      for (const d of DIFFICULTIES) expect(specFor(d, 0).everyMs).toBe(HOP_GAP_MS);
      expect(HOP_GAP_MS).toBeGreaterThan(0);
      expect(HOP_GAP_MS).toBeLessThan(MIN_SIT_MS);
    });

    it("is DELIBERATELY not `isSustainable`, and that is the mechanic", () => {
      // `isSustainable` asks "does the cap throttle the spawner?" — for most
      // games the answer must be no. Here it must be YES: the cap of one frog IS
      // the game, so the spawn interval is permanently overdue and a new frog
      // appears the instant the last one leaves. Pinned so nobody "fixes" it by
      // raising `maxAlive` and putting a second frog on the pond.
      for (const d of DIFFICULTIES) expect(isSustainable(specFor(d, 0))).toBe(false);
    });
  });

  describe("finishing a round", () => {
    it("needs more catches as the tier goes up", () => {
      expect(ROUND_GOAL.easy).toBeLessThan(ROUND_GOAL.medium);
      expect(ROUND_GOAL.medium).toBeLessThan(ROUND_GOAL.hard);
    });

    it("stays inside one sitting for a four-year-old", () => {
      for (const d of DIFFICULTIES) {
        expect(ROUND_GOAL[d]).toBeGreaterThanOrEqual(4);
        expect(ROUND_GOAL[d]).toBeLessThanOrEqual(12);
        // Even a child who catches every frog first time is under ~40s.
        expect(ROUND_GOAL[d] * DWELL_START[d]).toBeLessThanOrEqual(45_000);
      }
    });

    it("completes on `>=`, so two taps in one tick cannot step over the goal", () => {
      for (const d of DIFFICULTIES) {
        expect(isRoundComplete(ROUND_GOAL[d] - 1, d)).toBe(false);
        expect(isRoundComplete(ROUND_GOAL[d], d)).toBe(true);
        expect(isRoundComplete(ROUND_GOAL[d] + 3, d)).toBe(true);
      }
    });

    it("never reports a round complete on a broken count", () => {
      for (const d of DIFFICULTIES) {
        expect(isRoundComplete(Number.NaN, d)).toBe(false);
        expect(isRoundComplete(-1, d)).toBe(false);
      }
    });
  });

  describe("the per-level head start", () => {
    it("starts level 1 at the top of the curve", () => {
      expect(hopOffsetForLevel(1)).toBe(0);
    });

    it("gives each level a little more speed than the last", () => {
      expect(hopOffsetForLevel(2)).toBe(LEVEL_HEADSTART);
      expect(hopOffsetForLevel(5)).toBe(LEVEL_HEADSTART * 4);
      for (let level = 2; level <= 50; level++) {
        expect(hopOffsetForLevel(level)).toBeGreaterThan(hopOffsetForLevel(level - 1));
      }
    });

    it("is never negative, whatever it is handed", () => {
      for (const level of [0, -3, Number.NaN, Number.POSITIVE_INFINITY]) {
        expect(hopOffsetForLevel(level)).toBe(0);
      }
    });
  });
});
