import { describe, it, expect } from "vitest";
import { mulberry32, seedFrom } from "@shared/rng";
import {
  ANTICIPATION_MS,
  DIFFICULTIES,
  GOOD_AT,
  LEVELS,
  LIGHTNING_AT,
  MILESTONE_EVERY,
  MIN_SPREAD_MS,
  NO_BEST,
  QUICK_AT,
  READY,
  REARM_MIN_MS,
  STALE_MS,
  TAP_TIME_SLACK_MS,
  WAIT_CEIL_MS,
  WAIT_FLOOR_MS,
  armAttempt,
  bestOf,
  goLive,
  isMilestone,
  isNewBest,
  isPlausible,
  praiseFor,
  readTapTime,
  rearmWaitMs,
  seconds,
  tapEarly,
  tapGo,
  waitMs,
  type Attempt,
  type Difficulty,
} from "./logic";

/** A deterministic stream of armed waits at one difficulty. */
function waits(d: Difficulty, seed: number, n: number): number[] {
  const rng = mulberry32(seed);
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(waitMs(d, rng));
  return out;
}

describe("green-light logic", () => {
  describe("the wait band (the whole game, pinned)", () => {
    // These six numbers ARE the game. A wait the child can ANTICIPATE turns the
    // measurement into nonsense — they start moving before the light changes and
    // the number stops being a reaction time at all. A wait that is merely LONG
    // is a different failure: a four-year-old will not sit through eight seconds
    // of nothing, and a game they abandon measures nothing either.
    it("is pinned per difficulty", () => {
      expect(LEVELS.easy).toEqual({ minWaitMs: 1000, maxWaitMs: 2600 });
      expect(LEVELS.medium).toEqual({ minWaitMs: 1100, maxWaitMs: 3800 });
      expect(LEVELS.hard).toEqual({ minWaitMs: 1200, maxWaitMs: 5000 });
    });

    it("never asks a small child to wait longer than the ceiling", () => {
      for (const d of DIFFICULTIES) {
        expect(LEVELS[d].minWaitMs).toBeGreaterThanOrEqual(WAIT_FLOOR_MS);
        expect(LEVELS[d].maxWaitMs).toBeLessThanOrEqual(WAIT_CEIL_MS);
      }
      // Five seconds is already a long time to a four-year-old. Anything past
      // this and they look away, which is not a reaction test.
      expect(WAIT_CEIL_MS).toBeLessThanOrEqual(5000);
    });

    it("always leaves enough spread that the wait cannot be learned", () => {
      // A band narrower than this and a child can count to it. The whole
      // measurement rests on the child NOT knowing when green arrives.
      for (const d of DIFFICULTIES) {
        expect(LEVELS[d].maxWaitMs - LEVELS[d].minWaitMs).toBeGreaterThanOrEqual(MIN_SPREAD_MS);
      }
    });

    it("gets harder by widening the band, never by shortening it", () => {
      // Harder means LESS predictable (and so more chance to jump the gun), not
      // faster: nothing about a reaction time depends on how long you waited.
      const spread = (d: Difficulty) => LEVELS[d].maxWaitMs - LEVELS[d].minWaitMs;
      expect(spread("easy")).toBeLessThan(spread("medium"));
      expect(spread("medium")).toBeLessThan(spread("hard"));
    });

    it("keeps the re-arm floor inside every band, so the floor actually bites", () => {
      // The re-arm floor is only a guard if it is longer than the band's own
      // minimum (else it never binds) and shorter than its maximum (else every
      // re-arm collapses onto one predictable value).
      for (const d of DIFFICULTIES) {
        expect(REARM_MIN_MS).toBeGreaterThan(LEVELS[d].minWaitMs);
        expect(REARM_MIN_MS).toBeLessThan(LEVELS[d].maxWaitMs);
      }
    });
  });

  describe("waitMs", () => {
    it("stays inside the band at every difficulty, over many draws", () => {
      for (const d of DIFFICULTIES) {
        const sample = waits(d, seedFrom(`band-${d}`), 4000);
        expect(Math.min(...sample)).toBeGreaterThanOrEqual(LEVELS[d].minWaitMs);
        expect(Math.max(...sample)).toBeLessThanOrEqual(LEVELS[d].maxWaitMs);
      }
    });

    it("reaches both ends of the band", () => {
      for (const d of DIFFICULTIES) {
        expect(waitMs(d, () => 0)).toBe(LEVELS[d].minWaitMs);
        expect(waitMs(d, () => 1)).toBe(LEVELS[d].maxWaitMs);
      }
    });

    it("is genuinely unpredictable — it fills the band rather than hugging a value", () => {
      // The property that matters: a child who assumes "about two seconds" is
      // wrong often enough that assuming stops paying. Both outer thirds of the
      // band must show up, and the draws must not collapse onto a few values.
      for (const d of DIFFICULTIES) {
        const { minWaitMs, maxWaitMs } = LEVELS[d];
        const third = (maxWaitMs - minWaitMs) / 3;
        const sample = waits(d, seedFrom(`spread-${d}`), 600);
        expect(sample.some((w) => w < minWaitMs + third)).toBe(true);
        expect(sample.some((w) => w > maxWaitMs - third)).toBe(true);
        expect(new Set(sample).size).toBeGreaterThan(200);
      }
    });

    it("is deterministic for a given seed", () => {
      for (const d of DIFFICULTIES) expect(waits(d, 99, 200)).toEqual(waits(d, 99, 200));
    });

    it("survives a broken rng instead of throwing or escaping the band", () => {
      // A nonsense draw must degrade to a playable wait, never to an instant
      // green (which reads as a broken game) or a minute of nothing.
      for (const d of DIFFICULTIES) {
        expect(waitMs(d, () => Number.NaN)).toBe(LEVELS[d].minWaitMs);
        expect(waitMs(d, () => -5)).toBe(LEVELS[d].minWaitMs);
        expect(waitMs(d, () => 99)).toBe(LEVELS[d].maxWaitMs);
        // Infinity is not a draw at all, so it lands at the low end with every
        // other unusable value rather than at the eight-second-feeling top.
        expect(waitMs(d, () => Number.POSITIVE_INFINITY)).toBe(LEVELS[d].minWaitMs);
      }
    });

    it("falls back to the easiest band for an unknown difficulty", () => {
      const bogus = "impossible" as Difficulty;
      expect(waitMs(bogus, () => 0)).toBe(LEVELS.easy.minWaitMs);
      expect(waitMs(bogus, () => 1)).toBe(LEVELS.easy.maxWaitMs);
    });

    it("defaults its rng, so a caller may omit it", () => {
      const w = waitMs("easy");
      expect(w).toBeGreaterThanOrEqual(LEVELS.easy.minWaitMs);
      expect(w).toBeLessThanOrEqual(LEVELS.easy.maxWaitMs);
    });
  });

  describe("rearmWaitMs — the early-tap rule", () => {
    it("never re-arms shorter than the floor", () => {
      // A child who is mashing must not be able to land a tap that happens to
      // arrive just after a very short re-armed wait — that reads as a reaction
      // time and is really a lucky mash. The floor buys them a fresh look.
      for (const d of DIFFICULTIES) {
        const rng = mulberry32(seedFrom(`rearm-${d}`));
        const sample = Array.from({ length: 4000 }, () => rearmWaitMs(d, rng));
        expect(Math.min(...sample)).toBeGreaterThanOrEqual(REARM_MIN_MS);
        expect(Math.max(...sample)).toBeLessThanOrEqual(LEVELS[d].maxWaitMs);
      }
    });

    it("still fills the band above the floor rather than pinning to it", () => {
      for (const d of DIFFICULTIES) {
        const rng = mulberry32(seedFrom(`rearm-spread-${d}`));
        const sample = Array.from({ length: 600 }, () => rearmWaitMs(d, rng));
        expect(new Set(sample).size).toBeGreaterThan(200);
        expect(Math.max(...sample)).toBeGreaterThan(REARM_MIN_MS + 200);
      }
    });

    it("survives a broken rng", () => {
      for (const d of DIFFICULTIES) {
        expect(rearmWaitMs(d, () => Number.NaN)).toBe(REARM_MIN_MS);
        expect(rearmWaitMs(d, () => 1)).toBe(LEVELS[d].maxWaitMs);
      }
    });
  });

  describe("the attempt — an early tap is never a loss", () => {
    const arm = (): Attempt => armAttempt("easy", () => 0);

    it("starts ready, holding nothing", () => {
      expect(READY).toEqual({ phase: "ready", waitMs: 0, earlyTaps: 0, reactionMs: 0 });
    });

    it("arms into a wait", () => {
      const a = arm();
      expect(a.phase).toBe("waiting");
      expect(a.waitMs).toBe(LEVELS.easy.minWaitMs);
      expect(a.earlyTaps).toBe(0);
    });

    it("keeps waiting after an early tap, with a NEW wait and one more count", () => {
      // The single most important property in this file. Tapping while the light
      // is still red does not end the attempt, does not score, does not fail,
      // and does not scold. It re-arms.
      let a = arm();
      for (let i = 1; i <= 5; i++) {
        a = tapEarly(a, "easy", () => 1);
        expect(a.phase).toBe("waiting");
        expect(a.earlyTaps).toBe(i);
        expect(a.reactionMs).toBe(0);
        expect(a.waitMs).toBe(LEVELS.easy.maxWaitMs);
      }
      // Never a "lost" or "failed" phase — there is no such phase to reach.
      expect(["ready", "waiting", "go", "result"]).toContain(a.phase);
    });

    it("re-arms with a wait the child could not have been counting toward", () => {
      // The re-armed wait is drawn fresh, so a mash does not shorten the round
      // to something a mashing finger lands on by accident.
      const a = tapEarly(arm(), "easy", () => 0);
      expect(a.waitMs).toBeGreaterThanOrEqual(REARM_MIN_MS);
    });

    it("goes live, then records a tap on green", () => {
      const live = goLive(arm());
      expect(live.phase).toBe("go");
      const done = tapGo(live, 412.7);
      expect(done.phase).toBe("result");
      expect(done.reactionMs).toBe(413);
      // The wait and the early-tap count survive into the result screen.
      expect(done.earlyTaps).toBe(0);
      expect(done.waitMs).toBe(LEVELS.easy.minWaitMs);
    });

    it("is total — every transition from a wrong phase is a no-op", () => {
      // A late tap, a double tap, a stray pointer event during the result
      // screen: all of them must land somewhere harmless rather than corrupting
      // the attempt.
      const ready = READY;
      expect(tapEarly(ready, "easy", () => 0)).toBe(ready);
      expect(goLive(ready)).toBe(ready);
      expect(tapGo(ready, 300)).toBe(ready);

      const live = goLive(arm());
      expect(tapEarly(live, "easy", () => 0)).toBe(live);
      expect(goLive(live)).toBe(live);

      const done = tapGo(live, 300);
      expect(tapGo(done, 100)).toBe(done);
      expect(goLive(done)).toBe(done);
      expect(tapEarly(done, "easy", () => 0)).toBe(done);
    });

    it("never mutates the attempt it is handed", () => {
      const a = arm();
      const snapshot = { ...a };
      tapEarly(a, "hard", () => 0.5);
      goLive(a);
      tapGo(goLive(a), 250);
      expect(a).toEqual(snapshot);
    });

    it("refuses to record an unreadable reaction as a fast one", () => {
      // A NaN or negative reading is a measurement bug, not a superhuman child.
      // It must land at zero, which `isPlausible` then rejects for the record.
      const live = goLive(arm());
      expect(tapGo(live, Number.NaN).reactionMs).toBe(0);
      expect(tapGo(live, -40).reactionMs).toBe(0);
      expect(tapGo(live, Number.POSITIVE_INFINITY).reactionMs).toBe(0);
      expect(isPlausible(tapGo(live, Number.NaN).reactionMs)).toBe(false);
    });
  });

  describe("praise", () => {
    it("has a warm word for every possible time", () => {
      for (const ms of [0, 1, 120, 349, 350, 549, 550, 899, 900, 5000, 60_000]) {
        expect(["steady", "good", "quick", "lightning"]).toContain(praiseFor(ms));
      }
    });

    it("is pinned at its thresholds", () => {
      expect(praiseFor(LIGHTNING_AT - 1)).toBe("lightning");
      expect(praiseFor(LIGHTNING_AT)).toBe("quick");
      expect(praiseFor(QUICK_AT - 1)).toBe("quick");
      expect(praiseFor(QUICK_AT)).toBe("good");
      expect(praiseFor(GOOD_AT - 1)).toBe("good");
      expect(praiseFor(GOOD_AT)).toBe("steady");
      expect(praiseFor(30_000)).toBe("steady");
    });

    it("sends an unreadable clock to the gentlest band, never the flashiest", () => {
      // Written so NaN lands here: a broken measurement must not read as the
      // fastest tap of the child's life.
      expect(praiseFor(Number.NaN)).toBe("steady");
      expect(praiseFor(0)).toBe("steady");
      expect(praiseFor(-1)).toBe("steady");
      expect(praiseFor(Number.POSITIVE_INFINITY)).toBe("steady");
    });

    it("puts the bands in a plausible order for a small child", () => {
      // A five-year-old's simple visual reaction is nowhere near an adult's
      // ~250 ms. "lightning" has to be reachable but rare; "steady" is the
      // ordinary case and is still praise.
      expect(LIGHTNING_AT).toBeLessThan(QUICK_AT);
      expect(QUICK_AT).toBeLessThan(GOOD_AT);
      expect(LIGHTNING_AT).toBeGreaterThan(ANTICIPATION_MS);
    });
  });

  describe("isPlausible — what may become a record", () => {
    it("rejects anything faster than a human can be", () => {
      // Below this, the child moved BEFORE seeing green (or two taps merged).
      // Banking it would mint a record nobody, including them, can ever beat.
      expect(isPlausible(ANTICIPATION_MS - 1)).toBe(false);
      expect(isPlausible(ANTICIPATION_MS)).toBe(true);
      expect(isPlausible(0)).toBe(false);
      expect(isPlausible(-10)).toBe(false);
    });

    it("rejects a reading the child was not present for", () => {
      // Backgrounded tab, walked away, phone call. The elapsed time is real and
      // means nothing.
      expect(isPlausible(STALE_MS)).toBe(true);
      expect(isPlausible(STALE_MS + 1)).toBe(false);
      expect(isPlausible(120_000)).toBe(false);
    });

    it("rejects an unreadable number", () => {
      expect(isPlausible(Number.NaN)).toBe(false);
      expect(isPlausible(Number.POSITIVE_INFINITY)).toBe(false);
    });
  });

  describe("the best time — lower wins, and only a real reading counts", () => {
    it("treats a missing record as beatable by any plausible time", () => {
      expect(isNewBest(NO_BEST, 500)).toBe(true);
      expect(bestOf(NO_BEST, 500)).toBe(500);
    });

    it("treats a CORRUPT record as missing rather than throwing", () => {
      // `SaveStore.get<T>` casts unvalidated JSON, so a hand-edited or truncated
      // save can put anything here.
      for (const junk of [Number.NaN, -1, Number.POSITIVE_INFINITY]) {
        expect(isNewBest(junk, 500)).toBe(true);
        expect(bestOf(junk, 500)).toBe(500);
      }
      expect(bestOf(Number.NaN, 5)).toBe(NO_BEST);
    });

    it("only beats a record by being strictly faster", () => {
      expect(isNewBest(400, 399)).toBe(true);
      expect(isNewBest(400, 400)).toBe(false);
      expect(isNewBest(400, 401)).toBe(false);
      expect(bestOf(400, 401)).toBe(400);
      expect(bestOf(400, 399)).toBe(399);
    });

    it("never banks an implausible time as a record", () => {
      // The unbeatable-3ms-record bug, pinned shut.
      expect(isNewBest(400, ANTICIPATION_MS - 1)).toBe(false);
      expect(bestOf(400, 1)).toBe(400);
      expect(bestOf(NO_BEST, 1)).toBe(NO_BEST);
      expect(bestOf(400, STALE_MS + 1)).toBe(400);
    });

    it("rounds what it stores, so the record is a whole millisecond", () => {
      expect(bestOf(NO_BEST, 412.6)).toBe(413);
    });
  });

  describe("readTapTime — trust the event's own clock, but only when it is one", () => {
    it("prefers the event timestamp when it sits on the performance timebase", () => {
      // The handler runs AFTER dispatch and queueing, so `performance.now()`
      // inside it is already late. The event's own stamp is the earlier, truer
      // number.
      expect(readTapTime(9_000, 9_012)).toBe(9_000);
      expect(readTapTime(9_012, 9_012)).toBe(9_012);
    });

    it("falls back to now for an epoch-shaped timestamp", () => {
      // Some engines stamp events with Date.now() instead. Subtracting a paint
      // time on the performance timebase from 1.7e12 yields a "reaction time"
      // of about fifty-four years.
      expect(readTapTime(1_760_000_000_000, 9_012)).toBe(9_012);
    });

    it("falls back to now for anything unusable", () => {
      expect(readTapTime(Number.NaN, 9_012)).toBe(9_012);
      expect(readTapTime(0, 9_012)).toBe(9_012);
      expect(readTapTime(-3, 9_012)).toBe(9_012);
      expect(readTapTime(Number.POSITIVE_INFINITY, 9_012)).toBe(9_012);
    });

    it("falls back to now for a stamp too far in the past to be this tap", () => {
      expect(readTapTime(9_012 - TAP_TIME_SLACK_MS - 1, 9_012)).toBe(9_012);
      expect(readTapTime(9_012 - TAP_TIME_SLACK_MS + 1, 9_012)).toBe(9_012 - TAP_TIME_SLACK_MS + 1);
    });

    it("survives an unreadable `now`", () => {
      expect(readTapTime(9_000, Number.NaN)).toBe(9_000);
      expect(readTapTime(Number.NaN, Number.NaN)).toBe(0);
    });
  });

  describe("milestones", () => {
    it("drips every few successes, never on every one", () => {
      // A coin on every single tap turns a three-second loop into a slot
      // machine and burns the session cap in under two minutes.
      expect(MILESTONE_EVERY).toBeGreaterThanOrEqual(3);
      for (let n = 1; n <= 30; n++) {
        expect(isMilestone(n)).toBe(n % MILESTONE_EVERY === 0);
      }
    });

    it("never fires on zero or on nonsense", () => {
      expect(isMilestone(0)).toBe(false);
      expect(isMilestone(-3)).toBe(false);
      expect(isMilestone(Number.NaN)).toBe(false);
      expect(isMilestone(Number.POSITIVE_INFINITY)).toBe(false);
    });
  });

  describe("seconds — what the child is shown", () => {
    it("reads as a short decimal, not a four-digit millisecond count", () => {
      expect(seconds(412)).toBe("0.41");
      expect(seconds(1_250)).toBe("1.25");
      expect(seconds(60)).toBe("0.06");
    });

    it("never shows a negative or an unreadable number", () => {
      expect(seconds(-5)).toBe("0.00");
      expect(seconds(Number.NaN)).toBe("0.00");
      expect(seconds(Number.POSITIVE_INFINITY)).toBe("0.00");
    });
  });
});
