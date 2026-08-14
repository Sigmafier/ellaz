import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  DAILY_KEY,
  advance,
  createDailyPort,
  createDailyStore,
  dailyPick,
  dailyRng,
  dailySeed,
  dayDiff,
  dueMilestone,
  emptyDaily,
  isDateKey,
  localDateKey,
  markPaid,
  migrateDaily,
  milestoneFor,
  shiftDateKey,
  STREAK_MILESTONES,
} from "./daily";
import type { DailyStateV1, DailyStore } from "./daily";
import { memoryBackend, type KeyValueBackend } from "./profile";
import { mulberry32 } from "@shared/rng";

// The exact keys the state carries. Named here rather than inline so the
// "no punishment field" test below reads as the product rule it is.
const STATE_KEYS = ["v", "current", "longest", "days", "last", "paid"];

/**
 * Run a describe under a real timezone, and put the process back afterwards.
 *
 * `process.env.TZ = original` is WRONG when nothing was set: assigning
 * undefined stores the literal string "undefined", Node silently falls back to
 * UTC, and every later test in this worker runs under a bogus zone that happens
 * to look correct. Measured — the ambient TZ here is unset, so that is the live
 * case, not the edge one.
 */
function underTimezone(tz: string): void {
  let original: string | undefined;
  beforeAll(() => {
    original = process.env.TZ;
    process.env.TZ = tz;
  });
  afterAll(() => {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  });
}

describe("dailySeed", () => {
  it("gives the same seed for the same day and game, every time", () => {
    const a = dailySeed("2026-08-13", "snake");
    for (let i = 0; i < 50; i++) expect(dailySeed("2026-08-13", "snake")).toBe(a);
  });

  it("is pinned FOREVER — changing these numbers re-rolls every past daily puzzle", () => {
    // Derived from `seedFrom` in @shared/rng, which is stable across runs and
    // platforms. A child on a phone and a child on a PC must open the same
    // puzzle, and a child re-opening yesterday must see yesterday's, so these
    // literals are a contract with every device that has ever run the app —
    // not a snapshot of today's implementation.
    expect(dailySeed("2026-08-13", "snake")).toBe(1151337594);
    expect(dailySeed("2026-08-13", "sudoku")).toBe(373333549);
    expect(dailySeed("2026-08-14", "snake")).toBe(458631004);
  });

  it("gives different games different puzzles on the same day", () => {
    const day = "2026-08-13";
    const seeds = new Set(
      ["snake", "sudoku", "memory", "n2048", "wordguess", "minesweeper"].map((g) =>
        dailySeed(day, g),
      ),
    );
    expect(seeds.size).toBe(6);
  });

  it("gives the same game a different puzzle each day", () => {
    const seeds = new Set<number>();
    for (let d = 1; d <= 31; d++) {
      seeds.add(dailySeed(`2026-08-${String(d).padStart(2, "0")}`, "snake"));
    }
    expect(seeds.size).toBe(31);
  });

  it("cannot be confused by a date and a game id running together", () => {
    // Without a separator that can appear in NEITHER argument, ("2026-01-01",
    // "1x") and ("2026-01-011", "x") hash the same string and two different
    // days share a puzzle.
    expect(dailySeed("2026-01-01", "1x")).not.toBe(dailySeed("2026-01-011", "x"));
  });

  it("is a 32-bit unsigned integer, ready for mulberry32", () => {
    for (const g of ["snake", "sudoku", ""]) {
      const seed = dailySeed("2026-08-13", g);
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(0xffffffff);
    }
  });
});

describe("dailyRng", () => {
  it("replays the same sequence for the same day and game", () => {
    const draw = (rng: () => number) => Array.from({ length: 20 }, () => rng());
    expect(draw(dailyRng("2026-08-13", "snake"))).toEqual(
      draw(dailyRng("2026-08-13", "snake")),
    );
  });

  it("is exactly mulberry32 over the seed — no private generator", () => {
    expect(Array.from({ length: 10 }, dailyRng("2026-08-13", "snake"))).toEqual(
      Array.from({ length: 10 }, mulberry32(dailySeed("2026-08-13", "snake"))),
    );
  });

  it("gives two games two different sequences on the same day", () => {
    expect(dailyRng("2026-08-13", "snake")()).not.toBe(dailyRng("2026-08-13", "sudoku")());
  });
});

describe("localDateKey", () => {
  it("renders a zero-padded YYYY-MM-DD", () => {
    expect(localDateKey(new Date(2026, 0, 5, 12, 0, 0))).toBe("2026-01-05");
    expect(localDateKey(new Date(2026, 11, 31, 23, 59, 59))).toBe("2026-12-31");
  });

  it("answers the empty key for an unusable Date rather than NaN-NaN-NaN", () => {
    expect(localDateKey(new Date(Number.NaN))).toBe("");
  });

  it("produces keys the rest of the module accepts", () => {
    for (let i = 0; i < 400; i++) {
      const d = new Date(2026, 0, 1 + i, 13, 0, 0);
      expect(isDateKey(localDateKey(d))).toBe(true);
    }
  });
});

// Israel runs UTC+2/+3, so between midnight and 02:00 local the UTC date is
// still YESTERDAY. `toISOString()` would hand a child in Tel Aviv at 01:00 the
// previous day's puzzle and then refuse to count their streak.
describe("localDateKey is LOCAL, never UTC", () => {
  underTimezone("Asia/Jerusalem");

  it("keeps a child playing at 01:00 on the day they think it is", () => {
    const lateNight = new Date(2026, 7, 13, 1, 0, 0);
    expect(localDateKey(lateNight)).toBe("2026-08-13");
    // The control: the naive implementation, proven to disagree here.
    expect(lateNight.toISOString().slice(0, 10)).toBe("2026-08-12");
  });

  it("still agrees with UTC in the middle of the day", () => {
    const noon = new Date(2026, 7, 13, 12, 0, 0);
    expect(localDateKey(noon)).toBe("2026-08-13");
    expect(noon.toISOString().slice(0, 10)).toBe("2026-08-13");
  });
});

describe("isDateKey", () => {
  it("accepts a real calendar day", () => {
    for (const k of ["2026-08-13", "2026-01-01", "2026-12-31", "2028-02-29"]) {
      expect(isDateKey(k)).toBe(true);
    }
  });

  it("rejects a day that does not exist", () => {
    // Date.UTC silently ROLLS these over (Feb 30 becomes Mar 2), so a length
    // check alone accepts them and the streak arithmetic then runs on a day
    // nobody played.
    for (const k of ["2026-02-30", "2026-13-01", "2026-00-10", "2026-02-29", "2026-04-31"]) {
      expect(isDateKey(k)).toBe(false);
    }
  });

  it("rejects anything that is not a padded key", () => {
    for (const k of ["2026-8-13", "26-08-13", "20260813", "2026-08-13T00:00", "", " "]) {
      expect(isDateKey(k)).toBe(false);
    }
  });

  it("rejects a non-string, whatever it looks like", () => {
    for (const v of [null, undefined, 20260813, {}, [], new Date(), Number.NaN]) {
      expect(isDateKey(v)).toBe(false);
    }
  });
});

describe("dayDiff", () => {
  it("counts one day across a month boundary", () => {
    expect(dayDiff("2026-01-31", "2026-02-01")).toBe(1);
    expect(dayDiff("2026-04-30", "2026-05-01")).toBe(1);
  });

  it("counts one day across a year boundary", () => {
    expect(dayDiff("2025-12-31", "2026-01-01")).toBe(1);
  });

  it("counts one day across a leap day", () => {
    expect(dayDiff("2028-02-28", "2028-02-29")).toBe(1);
    expect(dayDiff("2028-02-29", "2028-03-01")).toBe(1);
    expect(dayDiff("2026-02-28", "2026-03-01")).toBe(1);
  });

  it("counts backwards and across gaps", () => {
    expect(dayDiff("2026-08-13", "2026-08-13")).toBe(0);
    expect(dayDiff("2026-08-13", "2026-08-12")).toBe(-1);
    expect(dayDiff("2026-08-13", "2026-09-13")).toBe(31);
    expect(dayDiff("2026-01-01", "2027-01-01")).toBe(365);
  });

  it("answers undefined rather than NaN for a key it cannot read", () => {
    expect(dayDiff("2026-02-30", "2026-03-01")).toBeUndefined();
    expect(dayDiff("2026-03-01", "junk")).toBeUndefined();
    expect(dayDiff("", "")).toBeUndefined();
  });

  it("stays exactly 1 for every consecutive pair of a whole year", () => {
    let d = new Date(Date.UTC(2026, 0, 1));
    for (let i = 0; i < 365; i++) {
      const from = d.toISOString().slice(0, 10);
      d = new Date(d.getTime() + 86_400_000);
      expect(dayDiff(from, d.toISOString().slice(0, 10))).toBe(1);
    }
  });
});

// A DST shift makes a LOCAL day 23 or 25 hours long, so `(b - a) / 86400000`
// over two local Dates floors to 0 across the spring shift — the streak
// silently stops counting for everyone in that timezone, one day a year.
describe("dayDiff survives a DST shift", () => {
  underTimezone("Asia/Jerusalem");

  it("is a genuine control — the local day really is short here", () => {
    const before = new Date(2026, 2, 27, 0, 0, 0);
    const after = new Date(2026, 2, 28, 0, 0, 0);
    expect((after.getTime() - before.getTime()) / 3_600_000).toBe(23);
  });

  it("counts one day across the spring forward", () => {
    expect(dayDiff("2026-03-27", "2026-03-28")).toBe(1);
    expect(advance(advance(emptyDaily(), "2026-03-27"), "2026-03-28").current).toBe(2);
  });

  it("counts one day across the autumn back", () => {
    expect(dayDiff("2026-10-24", "2026-10-25")).toBe(1);
    expect(advance(advance(emptyDaily(), "2026-10-24"), "2026-10-25").current).toBe(2);
  });
});

describe("advance — the first play", () => {
  it("starts a streak of one", () => {
    expect(advance(emptyDaily(), "2026-08-13")).toEqual({
      v: 1,
      current: 1,
      longest: 1,
      days: 1,
      last: "2026-08-13",
      paid: 0,
    });
  });

  it("carries no field a screen could shame a child with", () => {
    const played = advance(advance(emptyDaily(), "2026-08-13"), "2026-08-20");
    expect(Object.keys(played).sort()).toEqual([...STATE_KEYS].sort());
  });
});

describe("advance — consecutive days", () => {
  it("climbs one per day", () => {
    let s = emptyDaily();
    for (let d = 1; d <= 10; d++) {
      s = advance(s, `2026-08-${String(d).padStart(2, "0")}`);
      expect(s.current).toBe(d);
      expect(s.longest).toBe(d);
      expect(s.days).toBe(d);
    }
  });

  it("climbs across a month and a year boundary", () => {
    let s = advance(emptyDaily(), "2025-12-30");
    for (const k of ["2025-12-31", "2026-01-01", "2026-01-02"]) s = advance(s, k);
    expect(s.current).toBe(4);
    expect(s.last).toBe("2026-01-02");
  });
});

describe("advance — playing twice in one day", () => {
  it("advances nothing, ten times over", () => {
    const first = advance(emptyDaily(), "2026-08-13");
    let s = first;
    for (let i = 0; i < 10; i++) s = advance(s, "2026-08-13");
    expect(s).toEqual(first);
    expect(s).toBe(first);
  });

  it("advances nothing mid-streak either", () => {
    const s = advance(advance(advance(emptyDaily(), "2026-08-11"), "2026-08-12"), "2026-08-13");
    expect(advance(s, "2026-08-13")).toBe(s);
    expect(s.current).toBe(3);
  });
});

describe("advance — a missed day", () => {
  it("starts a new streak and takes nothing away", () => {
    let s = emptyDaily();
    for (const k of ["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04"]) s = advance(s, k);
    expect(s.current).toBe(4);

    const after = advance(s, "2026-08-06");
    expect(after.current).toBe(1);
    expect(after.longest).toBe(4);
    expect(after.days).toBe(5);
  });

  it("never reduces the longest, however long the gap", () => {
    let s = emptyDaily();
    for (const k of ["2026-01-01", "2026-01-02", "2026-01-03"]) s = advance(s, k);
    expect(s.longest).toBe(3);
    for (const k of ["2027-06-01", "2029-01-01", "2030-12-25"]) {
      s = advance(s, k);
      expect(s.longest).toBe(3);
      expect(s.current).toBe(1);
    }
  });

  it("raises the longest only when the new streak actually beats it", () => {
    let s = emptyDaily();
    for (const k of ["2026-02-01", "2026-02-02"]) s = advance(s, k);
    s = advance(s, "2026-03-01");
    for (const k of ["2026-03-02", "2026-03-03"]) s = advance(s, k);
    expect(s.current).toBe(3);
    expect(s.longest).toBe(3);
  });
});

describe("advance — a tampered clock", () => {
  // A real streak first, so the "nothing is zeroed" assertions have something
  // to protect: two days in a row, then a play stamped years ahead.
  const future = () => {
    let s = emptyDaily();
    for (const k of ["2026-08-11", "2026-08-12", "2030-01-01"]) s = advance(s, k);
    return s;
  };

  it("does not throw, and zeroes nothing, when the stamp is in the future", () => {
    const ahead = future();
    expect(ahead.current).toBe(1);
    expect(ahead.longest).toBe(2);
    expect(ahead.last).toBe("2030-01-01");

    const back = advance(ahead, "2026-08-13");
    expect(back.current).toBe(ahead.current);
    expect(back.longest).toBe(ahead.longest);
    expect(back.days).toBe(ahead.days);
  });

  it("re-anchors on the real day so tomorrow still counts", () => {
    const back = advance(future(), "2026-08-13");
    expect(back.last).toBe("2026-08-13");
    expect(advance(back, "2026-08-14").current).toBe(back.current + 1);
  });

  it("ignores a dateKey it cannot read at all", () => {
    const s = advance(emptyDaily(), "2026-08-13");
    for (const junk of ["", "junk", "2026-02-30", "2026-8-13"]) {
      expect(advance(s, junk)).toBe(s);
    }
  });
});

describe("advance — the platform law, over random play", () => {
  it("never deducts anything and never lets longest fall", () => {
    const rng = mulberry32(20260813);
    for (let run = 0; run < 200; run++) {
      let s = emptyDaily();
      let day = new Date(Date.UTC(2026, 0, 1));
      let peak = 0;
      for (let step = 0; step < 40; step++) {
        const before = s;
        s = advance(s, day.toISOString().slice(0, 10));
        expect(s.longest).toBeGreaterThanOrEqual(before.longest);
        expect(s.days).toBeGreaterThanOrEqual(before.days);
        expect(s.current).toBeGreaterThanOrEqual(1);
        expect(s.longest).toBeGreaterThanOrEqual(s.current);
        expect(s.days).toBeGreaterThanOrEqual(s.longest);
        peak = Math.max(peak, s.current);
        expect(s.longest).toBe(peak);
        // 0-3 days later: sometimes the same day, sometimes a lapse.
        day = new Date(day.getTime() + Math.floor(rng() * 4) * 86_400_000);
      }
    }
  });
});

describe("migrateDaily — never throws", () => {
  it("answers an empty state for anything it cannot read", () => {
    for (const junk of [
      undefined,
      null,
      "",
      "not json",
      '{"current":',
      0,
      42,
      true,
      [],
      [1, 2, 3],
      Number.NaN,
      () => 1,
      Symbol("x"),
    ]) {
      expect(migrateDaily(junk)).toEqual(emptyDaily());
    }
  });

  it("survives a value whose own getters throw", () => {
    const hostile = {
      get current(): number {
        throw new Error("hand-edited");
      },
    };
    expect(() => migrateDaily(hostile)).not.toThrow();
    expect(migrateDaily(hostile)).toEqual(emptyDaily());
  });

  it("always returns something advance can use", () => {
    for (const junk of [undefined, "{}", { last: "nope" }, { current: -5 }]) {
      const s = migrateDaily(junk);
      expect(() => advance(s, "2026-08-13")).not.toThrow();
      expect(advance(s, "2026-08-13").current).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("migrateDaily — salvage", () => {
  it("reads a serialised state back unchanged", () => {
    let s = emptyDaily();
    for (const k of ["2026-08-01", "2026-08-02", "2026-08-04"]) s = advance(s, k);
    expect(migrateDaily(JSON.stringify(s))).toEqual(s);
    expect(migrateDaily(s)).toEqual(s);
  });

  it("salvages by name from a shape a future build wrote", () => {
    expect(
      migrateDaily({ v: 9, current: 4, longest: 11, days: 30, last: "2026-08-13", theme: "gold" }),
    ).toEqual({ v: 1, current: 4, longest: 11, days: 30, last: "2026-08-13", paid: 7 });
  });

  it("coerces a count that cannot be one", () => {
    const s = migrateDaily({
      current: -5,
      longest: Number.NaN,
      days: Number.POSITIVE_INFINITY,
      last: "2026-08-13",
    });
    expect(s.current).toBe(0);
    expect(s.longest).toBe(0);
    expect(s.days).toBe(1);
  });

  it("floors a fractional count rather than dropping it", () => {
    const s = migrateDaily({ current: 3.9, longest: 7.2, days: 12.6, last: "2026-08-13" });
    expect(s.current).toBe(3);
    expect(s.longest).toBe(7);
    expect(s.days).toBe(12);
  });

  it("drops a running streak that has no day behind it", () => {
    // With no anchor date nothing can extend the streak, so `current` is not a
    // streak — but the record it implies is real, so it survives as `longest`.
    const s = migrateDaily({ current: 40, longest: 2, days: 0, last: "yesterday" });
    expect(s.last).toBe("");
    expect(s.current).toBe(0);
    expect(s.longest).toBe(40);
  });

  it("repairs a longest that is somehow below the current streak", () => {
    const s = migrateDaily({ current: 9, longest: 2, days: 9, last: "2026-08-13" });
    expect(s.longest).toBe(9);
  });

  it("never claims fewer days played than the longest streak", () => {
    const s = migrateDaily({ current: 1, longest: 30, days: 0, last: "2026-08-13" });
    expect(s.days).toBeGreaterThanOrEqual(30);
  });
});

describe("the record itself", () => {
  it("starts empty", () => {
    expect(emptyDaily()).toEqual({ v: 1, current: 0, longest: 0, days: 0, last: "", paid: 0 });
  });

  it("is a fresh object every time, so no two callers share one", () => {
    expect(emptyDaily()).not.toBe(emptyDaily());
  });

  it("lives under a key no cloud restore can name", () => {
    // `records.ts` only ever writes keys matching `ellaz:<game>:score:<board>`,
    // so a streak is a fact about THIS device — exactly like a session snapshot.
    expect(DAILY_KEY).toBe("ellaz:daily:v1");
    expect(/^ellaz:[a-z0-9]+:score:[a-z0-9-]+$/.test(DAILY_KEY)).toBe(false);
  });

  it("is JSON-round-trippable, which is how it reaches the disk", () => {
    const s: DailyStateV1 = advance(emptyDaily(), "2026-08-13");
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Which game — the rotation
// ───────────────────────────────────────────────────────────────────────────

/** A roster the size of the real one, so the probabilities below are the real ones. */
const ROSTER = [
  "memory", "evolve", "coloring", "finddiff", "hidden", "math", "2048", "tictactoe",
  "minesweeper", "sudoku", "snake", "blocks", "wordguess", "sequence",
  "vanish", "shadows", "echo", "balloons", "bubbles", "bees", "frog", "reaction",
  "sort", "merge",
];

/** `days` consecutive date keys starting at `from`. */
function calendar(from: string, days: number): string[] {
  return Array.from({ length: days }, (_, i) => shiftDateKey(from, i));
}

describe("shiftDateKey", () => {
  it("steps a day forward and back", () => {
    expect(shiftDateKey("2026-08-13", 1)).toBe("2026-08-14");
    expect(shiftDateKey("2026-08-13", -1)).toBe("2026-08-12");
    expect(shiftDateKey("2026-08-13", 0)).toBe("2026-08-13");
  });

  it("crosses months, years and a leap day", () => {
    expect(shiftDateKey("2026-01-31", 1)).toBe("2026-02-01");
    expect(shiftDateKey("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftDateKey("2028-02-28", 1)).toBe("2028-02-29");
    expect(shiftDateKey("2028-03-01", -1)).toBe("2028-02-29");
    expect(shiftDateKey("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("answers the empty key rather than a bogus day", () => {
    for (const junk of ["", "junk", "2026-02-30", "2026-8-13"]) {
      expect(shiftDateKey(junk, 1)).toBe("");
    }
    expect(shiftDateKey("2026-08-13", Number.NaN)).toBe("");
    expect(shiftDateKey("2026-08-13", Number.POSITIVE_INFINITY)).toBe("");
  });

  it("agrees with dayDiff, which is the arithmetic it has to match", () => {
    for (let n = -400; n <= 400; n += 37) {
      const to = shiftDateKey("2026-08-13", n);
      expect(dayDiff("2026-08-13", to)).toBe(n);
    }
  });

  it("is immune to a DST shift, which is why it works in UTC", () => {
    // Asia/Jerusalem springs forward on 2026-03-27. Local-Date arithmetic
    // would return the same day here.
    const original = process.env.TZ;
    process.env.TZ = "Asia/Jerusalem";
    try {
      expect(shiftDateKey("2026-03-27", 1)).toBe("2026-03-28");
      expect(shiftDateKey("2026-10-25", -1)).toBe("2026-10-24");
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });
});

describe("dailyPick — the basics", () => {
  it("gives the same answer for the same day, every time", () => {
    const first = dailyPick(ROSTER, "2026-08-13");
    expect(first).toBeDefined();
    for (let i = 0; i < 50; i++) expect(dailyPick(ROSTER, "2026-08-13")).toBe(first);
  });

  it("always picks a game that is actually in the roster", () => {
    for (const day of calendar("2026-01-01", 365)) {
      expect(ROSTER).toContain(dailyPick(ROSTER, day));
    }
  });

  it("refuses a day it cannot read, and an empty roster", () => {
    for (const junk of ["", "junk", "2026-02-30", "2026-8-13"]) {
      expect(dailyPick(ROSTER, junk)).toBeUndefined();
    }
    expect(dailyPick([], "2026-08-13")).toBeUndefined();
    expect(dailyPick(["", "  "].slice(0, 1), "2026-08-13")).toBeUndefined();
  });

  it("answers the only game when there is only one", () => {
    expect(dailyPick(["snake"], "2026-08-13")).toBe("snake");
    // ...on every day, since there is nothing else to alternate with.
    for (const day of calendar("2026-01-01", 10)) {
      expect(dailyPick(["snake"], day)).toBe("snake");
    }
  });

  it("uses the whole roster over a year rather than favouring a few", () => {
    const seen = new Set(calendar("2026-01-01", 365).map((d) => dailyPick(ROSTER, d)));
    expect(seen.size).toBe(ROSTER.length);
  });
});

describe("dailyPick — the catalogue order must not matter", () => {
  it("gives the same answer whatever order the roster is listed in", () => {
    // Reordering the home grid is a design decision. It must not re-roll days
    // that already happened, so ties break on the ID rather than on position.
    const reversed = [...ROSTER].reverse();
    const shuffled = [...ROSTER].sort();
    for (const day of calendar("2026-01-01", 200)) {
      const a = dailyPick(ROSTER, day);
      expect(dailyPick(reversed, day), day).toBe(a);
      expect(dailyPick(shuffled, day), day).toBe(a);
    }
  });

  it("ignores a duplicate rather than picking it twice as often", () => {
    const doubled = [...ROSTER, "snake"];
    for (const day of calendar("2026-01-01", 120)) {
      expect(dailyPick(doubled, day), day).toBe(dailyPick(ROSTER, day));
    }
  });
});

describe("dailyPick — a growing roster must not reshuffle history", () => {
  const YEAR = calendar("2026-01-01", 365);

  /** How many days change their game when the roster goes from `a` to `b`. */
  function moved(a: readonly string[], b: readonly string[]): number {
    return YEAR.filter((d) => dailyPick(a, d) !== dailyPick(b, d)).length;
  }

  it("moves only a handful of days when a 26th game ships", () => {
    // The whole reason this is rendezvous hashing. A new game wins about one
    // day in 26, and the no-repeat guard can carry a change into the day after
    // one of those — so a little over 2/26 of the year, and never a wholesale
    // re-point between two games that both already existed.
    const grown = [...ROSTER, "jigsaw"];
    const changed = moved(ROSTER, grown);
    expect(changed).toBeGreaterThan(0); // the new game does get days
    expect(changed / YEAR.length).toBeLessThan(0.2);
  });

  it("stays stable across five games arriving one at a time", () => {
    let roster = [...ROSTER];
    for (const id of ["jigsaw", "shapefit", "buildhouse", "buildword", "trace"]) {
      const grown = [...roster, id];
      expect(moved(roster, grown) / YEAR.length, `adding ${id}`).toBeLessThan(0.2);
      roster = grown;
    }
  });

  it("is the CONTROL for the two obvious implementations, which reshuffle everything", () => {
    // Without this, "stable under growth" is satisfied by any function at all
    // — including one that ignores the roster. Both of these are the natural
    // things to write, and both re-roll essentially the whole calendar when a
    // single game ships.
    const byIndex = (ids: readonly string[], day: string) =>
      ids[(dayDiff("1970-01-01", day) ?? 0) % ids.length];
    const byHash = (ids: readonly string[], day: string) => ids[dailySeed(day, "") % ids.length];
    const grown = [...ROSTER, "jigsaw"];

    for (const impl of [byIndex, byHash]) {
      const changed = YEAR.filter((d) => impl(ROSTER, d) !== impl(grown, d)).length;
      expect(changed / YEAR.length).toBeGreaterThan(0.8);
    }
  });
});

describe("dailyPick — a different game each day", () => {
  it("almost never repeats two days running", () => {
    // Rendezvous hashing on its own repeats about one day in 25, which a child
    // reads as the app being stuck. The no-repeat pass drops that to ~1/n².
    const days = calendar("2026-01-01", 365 * 3);
    let repeats = 0;
    for (let i = 1; i < days.length; i++) {
      if (dailyPick(ROSTER, days[i]) === dailyPick(ROSTER, days[i - 1])) repeats += 1;
    }
    expect(repeats / days.length).toBeLessThan(0.01);
  });

  it("is the CONTROL — without the guard the repeats are ~25x more common", () => {
    const days = calendar("2026-01-01", 365 * 3);
    const naive = (day: string) =>
      [...ROSTER].sort((a, b) => dailySeed(day, b) - dailySeed(day, a))[0];
    let repeats = 0;
    for (let i = 1; i < days.length; i++) {
      if (naive(days[i]) === naive(days[i - 1])) repeats += 1;
    }
    expect(repeats).toBeGreaterThan(20);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// The store — the thin layer that remembers
// ───────────────────────────────────────────────────────────────────────────

/** A backend that refuses every write, the way a full disk or Safari private mode does. */
function refusingBackend(seed?: Record<string, string>): KeyValueBackend {
  const inner = memoryBackend(seed);
  return { read: (k) => inner.read(k), write: () => false };
}

/** A backend that throws on write, which `localStorageBackend` already guards but this does not. */
function throwingBackend(): KeyValueBackend {
  return {
    read: () => null,
    write: () => {
      throw new Error("quota");
    },
  };
}

describe("createDailyStore", () => {
  it("starts from whatever was on the disk", () => {
    const stored: DailyStateV1 = {
      v: 1,
      current: 4,
      longest: 9,
      days: 30,
      last: "2026-08-12",
      paid: 7,
    };
    const store = createDailyStore(memoryBackend({ [DAILY_KEY]: JSON.stringify(stored) }));
    expect(store.read()).toEqual(stored);
  });

  it("starts empty when there is nothing, and when there is junk", () => {
    expect(createDailyStore(memoryBackend()).read()).toEqual(emptyDaily());
    expect(createDailyStore(memoryBackend({ [DAILY_KEY]: "{oh no" })).read()).toEqual(emptyDaily());
  });

  it("counts a day and writes it through", () => {
    const backend = memoryBackend();
    const store = createDailyStore(backend);
    const { state, persisted } = store.complete("2026-08-13");
    expect(state.current).toBe(1);
    expect(persisted).toBe(true);
    expect(JSON.parse(backend.read(DAILY_KEY) ?? "null")).toEqual(state);
  });

  it("counts a second day in a row", () => {
    const store = createDailyStore(memoryBackend());
    store.complete("2026-08-13");
    expect(store.complete("2026-08-14").state.current).toBe(2);
  });

  it("counts the same day only once, however many times a game reports it", () => {
    const backend = memoryBackend();
    const store = createDailyStore(backend);
    store.complete("2026-08-13");
    const after = backend.read(DAILY_KEY);
    for (let i = 0; i < 10; i++) store.complete("2026-08-13");
    expect(store.read().days).toBe(1);
    expect(store.read().current).toBe(1);
    // ...and it does not even re-write, because `advance` returned the same object.
    expect(backend.read(DAILY_KEY)).toBe(after);
  });

  it("ignores a day key it cannot read", () => {
    const store = createDailyStore(memoryBackend());
    const before = store.read();
    for (const junk of ["", "junk", "2026-02-30"]) {
      expect(store.complete(junk).state).toBe(before);
    }
    expect(store.read()).toEqual(emptyDaily());
  });

  it("still counts today when the disk refuses, and SAYS the write failed", () => {
    // The scoreboard's answer, not the wallet's: a day the child genuinely
    // played is a fact about today. `persisted` is how a caller can tell.
    const store = createDailyStore(refusingBackend());
    const { state, persisted } = store.complete("2026-08-13");
    expect(state.current).toBe(1);
    expect(persisted).toBe(false);
    expect(store.read().current).toBe(1);
  });

  it("never throws, even when the backend does", () => {
    const store = createDailyStore(throwingBackend());
    expect(() => store.complete("2026-08-13")).not.toThrow();
    expect(store.complete("2026-08-14").persisted).toBe(false);
  });

  it("tells its subscribers, once per real change", () => {
    const store = createDailyStore(memoryBackend());
    const seen: number[] = [];
    const off = store.subscribe((s) => seen.push(s.current));
    store.complete("2026-08-13");
    store.complete("2026-08-13"); // same day, no change, no call
    store.complete("2026-08-14");
    off();
    store.complete("2026-08-15");
    expect(seen).toEqual([1, 2]);
  });

  it("survives a subscriber that throws, and keeps telling the next one", () => {
    const store = createDailyStore(memoryBackend());
    store.subscribe(() => {
      throw new Error("a screen blew up");
    });
    const seen: number[] = [];
    store.subscribe((s) => seen.push(s.current));
    expect(() => store.complete("2026-08-13")).not.toThrow();
    expect(seen).toEqual([1]);
    expect(store.read().current).toBe(1);
  });

  it("is ADD-ONLY — there is no clear, no reset and no setter on it", () => {
    const store: DailyStore = createDailyStore(memoryBackend());
    expect(Object.keys(store).sort()).toEqual(["claim", "complete", "read", "subscribe"]);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// The port — what a game actually gets
// ───────────────────────────────────────────────────────────────────────────

const DAY = "2026-08-13";

/**
 * Midday LOCAL on a date key.
 *
 * Built from local components rather than parsed from an ISO string with a `Z`:
 * this machine's ambient zone is not UTC, so `new Date("2026-08-13T23:59:00Z")`
 * is a different calendar day here than the string reads as — which is the
 * exact confusion `localDateKey` exists to prevent, reproduced in a fixture.
 */
function localNoon(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

/** A port for `gameId`, with the clock and the rotation both pinned. */
function portFor(
  gameId: string,
  opts: { daily?: string; on?: string; store?: DailyStore } = {},
) {
  const store = opts.store ?? createDailyStore(memoryBackend());
  const on = opts.on ?? DAY;
  const day = localNoon(on);
  return {
    store,
    port: createDailyPort(gameId, {
      store,
      now: () => day,
      pick: () => opts.daily ?? "snake",
    }),
  };
}

describe("createDailyPort — a game cannot claim to be the daily", () => {
  it("has no way to name a day, a count, or itself", () => {
    const { port } = portFor("snake");
    // `complete` takes NO arguments. That is the whole guarantee: there is no
    // parameter a game could pass to say "today counts" or "count it three
    // times", exactly as `grant()` has no parameter for a coin amount.
    expect(port.complete.length).toBe(0);
    expect(Object.keys(port).sort()).toEqual([
      "complete",
      "isToday",
      "read",
      "rng",
      "seed",
      "today",
    ]);
  });

  it("counts the day when this game IS today's puzzle", () => {
    const { port } = portFor("snake", { daily: "snake" });
    expect(port.isToday).toBe(true);
    const after = port.complete();
    expect(after.streak).toBe(1);
    expect(after.done).toBe(true);
    expect(after.days).toBe(1);
  });

  it("does NOTHING when this game is not today's puzzle", () => {
    const { port, store } = portFor("sudoku", { daily: "snake" });
    expect(port.isToday).toBe(false);
    const after = port.complete();
    expect(after.streak).toBe(0);
    expect(after.done).toBe(false);
    expect(store.read()).toEqual(emptyDaily());
  });

  it("counts one day however many times the daily game reports a win", () => {
    const { port, store } = portFor("snake", { daily: "snake" });
    for (let i = 0; i < 20; i++) port.complete();
    expect(store.read()).toMatchObject({ current: 1, days: 1, longest: 1 });
  });

  it("cannot reduce anything — there is no clear and no setter", () => {
    const store = createDailyStore(memoryBackend());
    const { port } = portFor("snake", { daily: "snake", store });
    port.complete();
    const before = store.read();
    // Every method on the port, called every way it can be called.
    port.read();
    port.seed();
    port.rng();
    port.complete();
    expect(store.read()).toEqual(before);
    expect("clear" in port).toBe(false);
    expect("reset" in port).toBe(false);
  });
});

describe("createDailyPort — the streak across days", () => {
  it("climbs when the daily game is finished each day", () => {
    const store = createDailyStore(memoryBackend());
    for (const [i, day] of calendar("2026-08-01", 5).entries()) {
      const { port } = portFor("snake", { daily: "snake", on: day, store });
      expect(port.complete().streak).toBe(i + 1);
    }
  });

  it("only the day's OWN puzzle can extend it", () => {
    const store = createDailyStore(memoryBackend());
    const days = calendar("2026-08-01", 4);
    // Day 1 and 3 the player finishes the daily; day 2 they finish something else.
    portFor("snake", { daily: "snake", on: days[0], store }).port.complete();
    portFor("sudoku", { daily: "memory", on: days[1], store }).port.complete();
    const third = portFor("memory", { daily: "memory", on: days[2], store }).port.complete();
    // Two distinct days played, and the run restarted because day 2 never counted.
    expect(third.days).toBe(2);
    expect(third.streak).toBe(1);
    expect(third.longest).toBe(1);
  });

  it("reads the clock fresh, so a session left open over midnight moves on", () => {
    let clock = new Date(2026, 7, 13, 23, 59, 0);
    const store = createDailyStore(memoryBackend());
    const port = createDailyPort("snake", {
      store,
      now: () => clock,
      pick: () => "snake",
    });
    expect(port.today).toBe("2026-08-13");
    port.complete();
    clock = new Date(2026, 7, 14, 0, 1, 0);
    expect(port.today).toBe("2026-08-14");
    expect(port.read().done).toBe(false);
    expect(port.complete().streak).toBe(2);
  });
});

describe("createDailyPort — the puzzle it hands the game", () => {
  it("is exactly today's seed for this game", () => {
    const { port } = portFor("snake");
    expect(port.seed()).toBe(dailySeed(DAY, "snake"));
    expect(Array.from({ length: 8 }, port.rng())).toEqual(
      Array.from({ length: 8 }, dailyRng(DAY, "snake")),
    );
  });

  it("gives two games two different puzzles on one day", () => {
    expect(portFor("snake").port.seed()).not.toBe(portFor("sudoku").port.seed());
  });

  it("reports today in the DEVICE's timezone", () => {
    const original = process.env.TZ;
    process.env.TZ = "Asia/Jerusalem";
    try {
      const lateNight = new Date(2026, 7, 13, 1, 0, 0);
      const port = createDailyPort("snake", {
        store: createDailyStore(memoryBackend()),
        now: () => lateNight,
      });
      expect(port.today).toBe("2026-08-13");
      expect(lateNight.toISOString().slice(0, 10)).toBe("2026-08-12"); // the control
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });
});

describe("createDailyPort — nothing it is handed may reach a game", () => {
  it("treats a rotation that throws as 'not today's puzzle'", () => {
    // `pick` is portal code called from inside a game's context. Same
    // discipline as `SessionSpec.validate`: it must not take a win down.
    const store = createDailyStore(memoryBackend());
    const port = createDailyPort("snake", {
      store,
      now: () => localNoon(DAY),
      pick: () => {
        throw new Error("the catalogue exploded");
      },
    });
    expect(() => port.isToday).not.toThrow();
    expect(port.isToday).toBe(false);
    expect(() => port.complete()).not.toThrow();
    expect(store.read()).toEqual(emptyDaily());
  });

  it("survives an unusable clock", () => {
    const store = createDailyStore(memoryBackend());
    const port = createDailyPort("snake", {
      store,
      now: () => new Date(Number.NaN),
      pick: () => "snake",
    });
    expect(port.today).toBe("");
    expect(port.isToday).toBe(false);
    expect(port.complete().streak).toBe(0);
    expect(store.read()).toEqual(emptyDaily());
  });

  it("is inert rather than wrong when nobody told it what the rotation is", () => {
    // The default answers "nothing is today's puzzle". A port built without a
    // rotation must never count a day it should not have.
    const store = createDailyStore(memoryBackend());
    const port = createDailyPort("snake", { store, now: () => localNoon(DAY) });
    expect(port.isToday).toBe(false);
    expect(port.complete().streak).toBe(0);
    expect(store.read()).toEqual(emptyDaily());
  });

  it("reports a refused write without losing the day", () => {
    const store = createDailyStore(refusingBackend());
    const port = createDailyPort("snake", {
      store,
      now: () => localNoon(DAY),
      pick: () => "snake",
    });
    const after = port.complete();
    expect(after.streak).toBe(1);
    expect(after.persisted).toBe(false);
    // A plain read makes no claim about a write it did not attempt.
    expect(port.read().persisted).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// The streak PAYOFF — the ladder, and the latch that makes it payable once
// ───────────────────────────────────────────────────────────────────────────

describe("milestoneFor — the ladder", () => {
  it("pays nothing before the first rung", () => {
    for (const n of [0, 1, 2]) expect(milestoneFor(n)).toBe(0);
  });

  it("answers the highest rung reached, not the next one", () => {
    expect(milestoneFor(3)).toBe(3);
    expect(milestoneFor(6)).toBe(3);
    expect(milestoneFor(7)).toBe(7);
    expect(milestoneFor(13)).toBe(7);
    expect(milestoneFor(14)).toBe(14);
    expect(milestoneFor(29)).toBe(14);
  });

  it("continues every 30 days once the explicit rungs run out", () => {
    expect(milestoneFor(30)).toBe(30);
    expect(milestoneFor(59)).toBe(30);
    expect(milestoneFor(60)).toBe(60);
    expect(milestoneFor(365)).toBe(360);
  });

  it("never falls as the streak grows", () => {
    let seen = 0;
    for (let n = 0; n <= 400; n++) {
      const m = milestoneFor(n);
      expect(m).toBeGreaterThanOrEqual(seen);
      expect(m).toBeLessThanOrEqual(n);
      seen = m;
    }
  });

  it("under-pays rather than over-pays on junk", () => {
    for (const junk of [Number.NaN, Number.POSITIVE_INFINITY, -5, "7" as unknown as number]) {
      expect(milestoneFor(junk)).toBe(0);
    }
    // A fraction is floored, so 6.9 days is not 7 days.
    expect(milestoneFor(6.9)).toBe(3);
  });

  it("is exactly the ladder the shop shelf is gated on", () => {
    // `items.test.ts` checks the other direction. Both exist because the two
    // lists answer different questions and are allowed to drift apart only
    // deliberately.
    for (const rung of STREAK_MILESTONES) expect(milestoneFor(rung)).toBe(rung);
  });
});

describe("dueMilestone / markPaid — pure", () => {
  const at = (current: number, paid: number): DailyStateV1 => ({
    ...emptyDaily(),
    current,
    longest: Math.max(current, paid),
    days: current,
    last: "2026-08-13",
    paid,
  });

  it("owes the rung a fresh streak just reached", () => {
    expect(dueMilestone(at(3, 0))).toBe(3);
    expect(dueMilestone(at(7, 3))).toBe(7);
  });

  it("owes nothing between rungs, or for a rung already bought", () => {
    expect(dueMilestone(at(2, 0))).toBe(0);
    expect(dueMilestone(at(5, 3))).toBe(0);
    expect(dueMilestone(at(3, 3))).toBe(0);
    expect(dueMilestone(at(7, 7))).toBe(0);
  });

  it("owes nothing to a streak rebuilt to a length already paid for", () => {
    // Reached 7, lapsed, climbed back to 7. `paid` never fell, so nothing is
    // owed — and nothing was taken away either.
    expect(dueMilestone(at(7, 14))).toBe(0);
    expect(dueMilestone(at(1, 14))).toBe(0);
  });

  it("markPaid only ever raises, and returns the same object otherwise", () => {
    const s = at(7, 7);
    expect(markPaid(s, 3)).toBe(s);
    expect(markPaid(s, 7)).toBe(s);
    expect(markPaid(s, Number.NaN)).toBe(s);
    expect(markPaid(s, 14).paid).toBe(14);
    // Pure: the original is untouched.
    expect(s.paid).toBe(7);
  });
});

describe("migrateDaily — the paid latch", () => {
  it("seeds an ABSENT latch from longest, so nothing is back-paid", () => {
    // A record written before the payoff existed. This child already has 40
    // days; they must not be handed every rung up to 30 at once.
    const s = migrateDaily({ current: 40, longest: 40, days: 40, last: "2026-08-13" });
    expect(s.paid).toBe(30);
    expect(dueMilestone(s)).toBe(0);
  });

  it("honours a PRESENT latch exactly, even below its own longest", () => {
    // The live window between `advance` writing day 7 and `claim` latching it.
    // Seeding over it here would swallow the day-7 payout on a reload.
    const s = migrateDaily({ current: 7, longest: 7, days: 7, last: "2026-08-13", paid: 3 });
    expect(s.paid).toBe(3);
    expect(dueMilestone(s)).toBe(7);
  });

  it("honours a present zero on a brand-new record", () => {
    const s = migrateDaily({ current: 3, longest: 3, days: 3, last: "2026-08-13", paid: 0 });
    expect(s.paid).toBe(0);
    expect(dueMilestone(s)).toBe(3);
  });

  it("fails CLOSED on a tampered latch — it can cost rewards, never mint them", () => {
    const s = migrateDaily({ current: 40, longest: 40, days: 40, last: "2026-08-13", paid: 9999 });
    expect(s.paid).toBe(9999);
    expect(dueMilestone(s)).toBe(0);
  });

  it("coerces a latch that cannot be a count", () => {
    for (const junk of [Number.NaN, -12, "seven", null]) {
      expect(migrateDaily({ last: "2026-08-13", current: 3, paid: junk }).paid).toBe(0);
    }
  });

  it("round-trips the latch through JSON, which is how it reaches the disk", () => {
    const s = markPaid(advance(emptyDaily(), "2026-08-13"), 3);
    expect(migrateDaily(JSON.stringify(s))).toEqual(s);
  });
});

describe("DailyStore.claim — pays each milestone exactly once, ever", () => {
  /** Play `days` consecutive days from 2026-08-01 through a store. */
  function playRun(store: DailyStore, days: number): void {
    for (const key of calendar("2026-08-01", days)) store.complete(key);
  }

  it("pays nothing until the first rung", () => {
    const store = createDailyStore(memoryBackend());
    playRun(store, 2);
    expect(store.claim().milestone).toBe(0);
  });

  it("pays day 3 once, and then never again however hard it is asked", () => {
    const store = createDailyStore(memoryBackend());
    playRun(store, 3);
    expect(store.claim().milestone).toBe(3);
    // THE PROPERTY. Without the latch every one of these pays 3 again.
    for (let i = 0; i < 50; i++) expect(store.claim().milestone).toBe(0);
  });

  it("pays each rung of a long run once, in order", () => {
    const backend = memoryBackend();
    const store = createDailyStore(backend);
    const paid: number[] = [];
    for (const key of calendar("2026-08-01", 40)) {
      store.complete(key);
      // Claimed after EVERY day, the way a screen would.
      const { milestone } = store.claim();
      if (milestone > 0) paid.push(milestone);
      expect(store.claim().milestone).toBe(0);
    }
    expect(paid).toEqual([3, 7, 14, 30]);
  });

  it("SURVIVES A RELOAD — a fresh store off the same disk owes nothing", () => {
    // The reason `paid` is on the disk rather than in a ref. A latch a reload
    // can clear is not a latch: this is 2048's `won` flag, with a day on the
    // clock instead of a board on the screen.
    const backend = memoryBackend();
    const first = createDailyStore(backend);
    playRun(first, 3);
    expect(first.claim().milestone).toBe(3);

    for (let reload = 0; reload < 5; reload++) {
      const later = createDailyStore(backend);
      expect(later.claim().milestone).toBe(0);
    }
  });

  it("does not re-open a rung when a streak breaks and is rebuilt", () => {
    const backend = memoryBackend();
    const store = createDailyStore(backend);
    playRun(store, 3);
    expect(store.claim().milestone).toBe(3);

    // A week off, then three more days in a row.
    for (const key of calendar("2026-08-12", 3)) store.complete(key);
    expect(store.read().current).toBe(3);
    expect(store.claim().milestone).toBe(0);
    // And nothing was taken away: the record still stands.
    expect(store.read().longest).toBe(3);
    expect(store.read().paid).toBe(3);
  });

  it("REFUSES TO PAY when the latch cannot be stored", () => {
    // Latch first, pay second. A device that cannot keep the latch is told
    // nothing is owed, because paying it would re-pay on every reload forever.
    const store = createDailyStore(refusingBackend());
    playRun(store, 3);
    expect(store.read().current).toBe(3);
    expect(store.claim().milestone).toBe(0);
    expect(store.read().paid).toBe(0);
  });

  it("never throws, even when the backend does", () => {
    const store = createDailyStore(throwingBackend());
    playRun(store, 3);
    expect(() => store.claim()).not.toThrow();
    expect(store.claim().milestone).toBe(0);
  });

  it("tells its subscribers when a claim lands, and not when it does not", () => {
    const store = createDailyStore(memoryBackend());
    playRun(store, 3);
    const seen: number[] = [];
    store.subscribe((s) => seen.push(s.paid));
    store.claim();
    store.claim();
    store.claim();
    expect(seen).toEqual([3]);
  });

  it("is a pure read when nothing is owed — no write, no new object", () => {
    const backend = memoryBackend();
    const store = createDailyStore(backend);
    playRun(store, 2);
    const before = backend.read(DAILY_KEY);
    const { state } = store.claim();
    expect(state).toBe(store.read());
    expect(backend.read(DAILY_KEY)).toBe(before);
  });
});
