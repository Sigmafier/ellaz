import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dailyGameId, todayKey, todaysGame } from "./dailyRotation";
import { dailyPick, isDateKey, shiftDateKey } from "@sdk/daily";
import { GAMES } from "./games";
import { CATALOG } from "./catalog";

/**
 * The binding between the pure rotation and the real roster.
 *
 * `daily.test.ts` proves the RULE — deterministic, stable as the catalogue
 * grows, a different game each day. This file proves the WIRING: that the rule
 * is fed the actual roster, that what it returns is a game the home screen can
 * link to, and that there is exactly one derivation of it.
 */

const YEAR = Array.from({ length: 365 }, (_, i) => shiftDateKey("2026-01-01", i));

describe("today's puzzle", () => {
  it("is always a game that is really in the catalogue", () => {
    const ids = new Set(CATALOG.map((e) => e.meta.id));
    for (const day of YEAR) {
      const id = dailyGameId(day);
      expect(id, day).toBeDefined();
      expect(ids.has(id as string), `${day} -> ${id}`).toBe(true);
    }
  });

  it("hands back the same game as a meta, so a card can be drawn from it", () => {
    for (const day of YEAR.slice(0, 60)) {
      expect(todaysGame(day)?.id, day).toBe(dailyGameId(day));
    }
  });

  it("is fed the WHOLE roster, not a slice of it", () => {
    // The control on the wiring: if this were bound to, say, the first five
    // games, every assertion above would still pass.
    const seen = new Set(YEAR.map((d) => dailyGameId(d)));
    expect(seen.size).toBe(GAMES.length);
  });

  it("is exactly `dailyPick` over the roster — no second rule living here", () => {
    const ids = GAMES.map((m) => m.id);
    for (const day of YEAR.slice(0, 120)) {
      expect(dailyGameId(day), day).toBe(dailyPick(ids, day));
    }
  });

  it("refuses a day it cannot read rather than guessing one", () => {
    for (const junk of ["", "junk", "2026-02-30", "2026-1-1"]) {
      expect(dailyGameId(junk), junk).toBeUndefined();
      expect(todaysGame(junk), junk).toBeUndefined();
    }
  });

  it("is a different game from yesterday, essentially every day", () => {
    // A BOUND rather than "never", deliberately. The no-repeat guard looks back
    // exactly one day, which is what keeps a new game from perturbing the whole
    // calendar; the price is a repeat roughly once every n² days. Asserting
    // "never" would be a landmine that goes red when game 26 ships, for a
    // reason that has nothing to do with anything being wrong.
    const repeats = YEAR.filter((d, i) => i > 0 && dailyGameId(d) === dailyGameId(YEAR[i - 1]));
    expect(repeats.length, `repeated on: ${repeats.join(", ")}`).toBeLessThanOrEqual(1);
  });
});

describe("todayKey", () => {
  it("answers a real calendar day for the machine's own clock", () => {
    expect(isDateKey(todayKey())).toBe(true);
  });

  it("is LOCAL, so a child playing after midnight gets the day they think it is", () => {
    const original = process.env.TZ;
    process.env.TZ = "Asia/Jerusalem";
    try {
      const lateNight = new Date(2026, 7, 13, 1, 0, 0);
      expect(todayKey(lateNight)).toBe("2026-08-13");
      expect(lateNight.toISOString().slice(0, 10)).toBe("2026-08-12"); // the control
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });

  it("gives today's puzzle without being told the date", () => {
    expect(todaysGame()?.id).toBe(dailyGameId(todayKey()));
  });
});

describe("there is only one derivation of the rotation", () => {
  /**
   * A grep rather than a behavioural check, because the failure it guards is a
   * SECOND correct implementation. Two callers each computing `dailyPick(...)`
   * from the roster would agree today and disagree the moment either one
   * changed — the same argument as `firstBoard()` in `boardsView.ts`.
   */
  it("nothing outside this module calls dailyPick", () => {
    const offenders = ["Home.tsx", "PageApp.tsx", "DailyChip.tsx", "GameHost.tsx"]
      .map((f) => [f, readFileSync(fileURLToPath(new URL(`./${f}`, import.meta.url)), "utf8")])
      .filter(([, src]) => src.includes("dailyPick("))
      .map(([f]) => f);
    expect(offenders, `these compute the rotation themselves: ${offenders.join(", ")}`).toEqual(
      [],
    );
  });

  it("and the SDK reaches it through this module rather than the roster", () => {
    // `createContext` must not import `portal/games` directly: that would be a
    // second binding of the rule to the roster, one layer down, with nothing
    // keeping the two in step.
    const src = readFileSync(
      fileURLToPath(new URL("../sdk/createContext.ts", import.meta.url)),
      "utf8",
    );
    expect(src).toMatch(/dailyGameId/);
    expect(src).not.toMatch(/from "\.\.\/portal\/games"/);
  });
});
