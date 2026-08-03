import { describe, it, expect } from "vitest";
import { boardId, isSafeId, windowsFor } from "./board";

describe("which day, week and month a run belongs to", () => {
  const at = (iso: string) => Date.parse(iso);

  it("buckets by UTC, not by the player's clock", () => {
    // Two children in different timezones must land on the SAME board. If the
    // key came from local time, one player's "today" would be a different
    // document from another's and the board would quietly fragment in two.
    expect(windowsFor(at("2026-08-03T23:30:00Z")).d).toBe("2026-08-03");
    expect(windowsFor(at("2026-08-04T00:30:00Z")).d).toBe("2026-08-04");
  });

  it("zero-pads, so the keys sort as strings", () => {
    const w = windowsFor(at("2026-01-05T12:00:00Z"));
    expect(w.d).toBe("2026-01-05");
    expect(w.m).toBe("2026-01");
  });

  it("uses ISO weeks, including the ones that belong to the other year", () => {
    // The trap the ISO rule exists for: a week is owned by the year containing
    // its Thursday. 1 Jan 2027 is a Friday, so it is still 2026's week 53 —
    // naming it 2027-W01 would put it in a bucket that also holds 4 Jan, and a
    // child's Friday score would compete against the following week.
    expect(windowsFor(at("2027-01-01T12:00:00Z")).w).toBe("2026-W53");
    expect(windowsFor(at("2027-01-04T12:00:00Z")).w).toBe("2027-W01");

    // ...and the mirror case: 1 Jan 2026 is a Thursday, so it opens 2026-W01,
    // and the Monday before it in December belongs to 2026 too.
    expect(windowsFor(at("2026-01-01T12:00:00Z")).w).toBe("2026-W01");
    expect(windowsFor(at("2025-12-29T12:00:00Z")).w).toBe("2026-W01");
  });

  it("pads the week number", () => {
    expect(windowsFor(at("2026-03-02T12:00:00Z")).w).toBe("2026-W10");
    expect(windowsFor(at("2026-01-05T12:00:00Z")).w).toBe("2026-W02");
  });

  it("falls back to the epoch's day rather than throwing on a junk stamp", () => {
    // `at` reaches here from a win handler. A NaN must not take out the win.
    for (const junk of [Number.NaN, Number.POSITIVE_INFINITY, -1]) {
      expect(() => windowsFor(junk)).not.toThrow();
      expect(windowsFor(junk).d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("the board a game and difficulty share", () => {
  it("joins the game and the board", () => {
    expect(boardId("snake", "default")).toBe("snake__default");
    expect(boardId("memory", "level-2")).toBe("memory__level-2");
  });

  it("refuses ids that would escape their document", () => {
    // A document id containing a slash is a different PATH, not a different
    // document. These all come from our own catalog today, which is exactly why
    // the check has to live somewhere that a future game cannot forget.
    expect(boardId("sn/ake", "default")).toBeNull();
    expect(boardId("snake", "de/fault")).toBeNull();
    expect(boardId("", "default")).toBeNull();
    expect(boardId("snake", "")).toBeNull();
    expect(boardId(".", "default")).toBeNull();
    expect(boardId("..", "default")).toBeNull();
    expect(boardId("__proto__", "default")).toBeNull();
  });

  it("agrees with the id check it is built on", () => {
    expect(isSafeId("snake")).toBe(true);
    expect(isSafeId("level-2")).toBe(true);
    expect(isSafeId("reach_2048")).toBe(true);
    expect(isSafeId("a".repeat(64))).toBe(true);
    expect(isSafeId("a".repeat(65))).toBe(false);
    expect(isSafeId("has space")).toBe(false);
    expect(isSafeId("__both__")).toBe(false);
  });
});
