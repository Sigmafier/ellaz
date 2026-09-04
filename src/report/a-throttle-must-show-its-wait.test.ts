/**
 * A throttled report tells the player HOW LONG, not just "later".
 *
 * The doc id is the current minute and `firestore.rules` checks it against
 * `request.time`, so a second report inside one minute is a 409 and the sheet
 * said "You just sent one. Give it a minute." with no button and no number.
 * The operator, sending four reports in four minutes on 2026-09-04: "Sending
 * more than 1 flag items, show and error of wait. Let user see a countdown or
 * something to their second message" (issue #26).
 *
 * TWO PROPERTIES, and the second is the one worth the file:
 *
 *   1. the wait is a DURATION measured entirely in server time, so a phone
 *      with a wrong clock still counts down the right number of seconds;
 *   2. `retry` stays FALSE while the wait is running. The retry button was
 *      removed from this screen deliberately - see
 *      `a-retry-that-cannot-work-is-a-lie.test.ts` - and a countdown must not
 *      quietly put a non-working button back. The sheet re-offers it only once
 *      the wait has actually elapsed, which is a different condition.
 *
 * The component itself cannot be rendered here: vitest runs the node
 * environment over `src/**\/*.test.ts` with no DOM. So the tick is held as a
 * SOURCE assertion, which is the weaker instrument and is written as such.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lookFor } from "./outcome";

const SHEET = readFileSync(new URL("./ReportSheet.tsx", import.meta.url), "utf8");

describe("a throttled report shows how long", () => {
  it("carries a wait, and only the throttle does", () => {
    expect(lookFor({ ok: false, why: "throttled", waitMs: 34_000 }).waitFor).toBe(34_000);
    expect(lookFor({ ok: true, id: "x" }).waitFor).toBeNull();
    expect(lookFor({ ok: false, why: "refused" }).waitFor).toBeNull();
    expect(lookFor({ ok: false, why: "failed" }).waitFor).toBeNull();
    expect(lookFor(null).waitFor).toBeNull();
  });

  it("still withholds the retry button while the wait is running", () => {
    // The property the countdown must not break.
    expect(lookFor({ ok: false, why: "throttled", waitMs: 34_000 }).retry).toBe(false);
  });

  it("clamps a wait that crossed a network and came back nonsense", () => {
    // Every one of these would render as a broken countdown - a negative
    // number, a blank, or a wait longer than the throttle can possibly be.
    for (const waitMs of [0, -1, 60_001, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(lookFor({ ok: false, why: "throttled", waitMs }).waitFor).toBe(60_000);
    }
  });

  it("keeps a real wait exactly as measured", () => {
    // The clamp must not swallow the ordinary case, which is the failure mode
    // of every guard written the other way round.
    for (const waitMs of [1, 12_500, 59_999, 60_000]) {
      expect(lookFor({ ok: false, why: "throttled", waitMs }).waitFor).toBe(waitMs);
    }
  });

  it("counts elapsed time, never a deadline off this device's clock", () => {
    // A deadline would be `waitFor + Date.now()`, which mixes the server's
    // clock with the phone's. The source must subtract a locally captured
    // start instead. This is a shape check and can only refuse a shape.
    expect(SHEET).toMatch(/Date\.now\(\)\s*-\s*startedAt/);
    expect(SHEET).not.toMatch(/waitFor\s*\+\s*Date\.now\(\)/);
  });

  it("offers the retry once the wait has actually elapsed", () => {
    expect(SHEET).toMatch(/canRetry/);
    expect(SHEET).toMatch(/look\.retry \|\| \(look\.waitFor !== null && !waiting\)/);
  });

  it("does not announce every tick to a screen reader", () => {
    // The paragraph is role=status; an un-hidden number inside it would be
    // read aloud four times a second.
    expect(SHEET).toMatch(/aria-hidden="true"[^>]*>\s*\{Math\.ceil\(left \/ 1000\)\}s/s);
  });
});
