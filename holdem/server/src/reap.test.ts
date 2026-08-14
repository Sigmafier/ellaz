import { describe as group, expect, it } from "vitest";
import {
  HEARTBEAT_MS,
  idleMs,
  LIST_STALE_MS,
  presentNow,
  PRESENCE_TTL_MS,
  nextCheckAt,
  reapAfterMs,
  REAP_FRESH_MS,
  REAP_LEAGUE_MS,
  REAP_UNPLAYED_MS,
  shouldList,
  type TableSnapshot,
  verdict,
} from "./reap";

const NOW = 1_700_000_000_000;

function table(over: Partial<TableSnapshot> = {}): TableSnapshot {
  return {
    connected: 0,
    // A day before `lastSeenAt`, because that is the only ordering real data
    // can have — you cannot connect to a room before it is created. A fixture
    // with `createdAt: NOW` and `lastSeenAt` in the past describes a table
    // nothing could produce, and it made seven of these tests lie.
    createdAt: NOW - day(1),
    lastSeenAt: NOW,
    // Fresh by default, so the presence expiry only comes into play in the
    // tests that deliberately age it. A snapshot the table just took of
    // itself always has this value.
    reportedAt: NOW,
    handsPlayed: 12,
    chipsMode: "fresh",
    ...over,
  };
}

const min = (n: number) => n * 60_000;
const hour = (n: number) => n * 60 * 60_000;
const day = (n: number) => n * 24 * 60 * 60_000;

group("a table with somebody in it is never touched", () => {
  it("keeps a busy table however old it is", () => {
    const t = table({ connected: 1, createdAt: NOW - day(400), lastSeenAt: NOW - day(400) });
    expect(verdict(t, NOW)).toBe("keep");
    expect(idleMs(t, NOW)).toBe(0);
  });

  it("asks for a heartbeat while anyone is connected", () => {
    // This test used to assert `toBeNull()` — "a Durable Object has ONE alarm
    // and the action timer needs it, so the reaper must not ask for one while
    // people are here". The reasoning was sound and the conclusion was the
    // bug: silence is indistinguishable from a table that has stopped
    // existing, so a room that died while occupied stayed in the lobby
    // forever. Sharing the slot is handled by `Math.min` in armNext, which is
    // what makes asking for one safe.
    expect(nextCheckAt(table({ connected: 1 }), NOW)).toBe(NOW + HEARTBEAT_MS);
    expect(nextCheckAt(table({ connected: 9 }), NOW)).toBe(NOW + HEARTBEAT_MS);
  });
});

group("delisting is early, because it is reversible", () => {
  it("lists an empty table for the first five minutes", () => {
    const t = table({ lastSeenAt: NOW - min(4) });
    expect(verdict(t, NOW)).toBe("keep");
    expect(shouldList(t, NOW, false)).toBe(true);
  });

  it("unlists it once five minutes have passed, and no more than that", () => {
    const t = table({ lastSeenAt: NOW - LIST_STALE_MS });
    expect(verdict(t, NOW)).toBe("unlist");
    expect(shouldList(t, NOW, false)).toBe(false);
  });

  it("unlisting is not deletion — the code still works", () => {
    // The distinction this whole module exists for. An hour of silence takes a
    // fresh table out of the lobby and leaves it completely intact, so a group
    // that walked off to eat comes back to their seats and their stacks.
    expect(verdict(table({ lastSeenAt: NOW - hour(1) }), NOW)).toBe("unlist");
  });
});

group("deletion waits, and waits longest for the tables that hold real money", () => {
  it("throws away a room where no hand was ever dealt after fifteen minutes", () => {
    const made = table({ handsPlayed: 0, lastSeenAt: 0, createdAt: NOW - REAP_UNPLAYED_MS });
    expect(verdict(made, NOW)).toBe("delete");
    expect(verdict({ ...made, createdAt: NOW - min(14) }, NOW)).toBe("unlist");
  });

  it("measures a never-joined room from its creation, not from the epoch", () => {
    // lastSeenAt is 0 for a room nobody ever opened a socket to. Measuring
    // idleness from that would make every new room 56 years stale and delete
    // it the instant it was made — the code would come back 500 on first join.
    const fresh = table({ handsPlayed: 0, lastSeenAt: 0, createdAt: NOW });
    expect(idleMs(fresh, NOW)).toBe(0);
    expect(verdict(fresh, NOW)).toBe("keep");
  });

  it("gives a played fresh-chips game two hours", () => {
    expect(verdict(table({ lastSeenAt: NOW - hour(2) + 1 }), NOW)).toBe("unlist");
    expect(verdict(table({ lastSeenAt: NOW - REAP_FRESH_MS }), NOW)).toBe("delete");
  });

  it("gives a league game a month, because its bankrolls outlive the session", () => {
    const league = table({ chipsMode: "league" });
    // Two hours would have deleted a fresh table. A league table is untouched.
    expect(verdict({ ...league, lastSeenAt: NOW - hour(2) }, NOW)).toBe("unlist");
    expect(verdict({ ...league, lastSeenAt: NOW - day(29) }, NOW)).toBe("unlist");
    expect(verdict({ ...league, lastSeenAt: NOW - REAP_LEAGUE_MS }, NOW)).toBe("delete");
  });

  it("does not protect a league room that never dealt a card", () => {
    // Nothing was banked, so there is no bankroll to lose. Unplayed wins.
    const empty = table({ chipsMode: "league", handsPlayed: 0 });
    expect(reapAfterMs(empty)).toBe(REAP_UNPLAYED_MS);
    expect(verdict({ ...empty, lastSeenAt: NOW - min(20) }, NOW)).toBe("delete");
  });

  it("orders the three clocks the way the comments claim", () => {
    // A ratchet. Reordering these silently changes which games get destroyed.
    expect(LIST_STALE_MS).toBeLessThan(REAP_UNPLAYED_MS);
    expect(REAP_UNPLAYED_MS).toBeLessThan(REAP_FRESH_MS);
    expect(REAP_FRESH_MS).toBeLessThan(REAP_LEAGUE_MS);
  });

  it("never deletes before it delists", () => {
    // Every table must pass through "unlist" on its way to "delete", at every
    // combination of mode and history. If a clock were ever reordered, a table
    // would vanish from a lobby it was still being shown in.
    for (const chipsMode of ["fresh", "league"] as const) {
      for (const handsPlayed of [0, 1, 500]) {
        const t = table({ chipsMode, handsPlayed });
        const limit = reapAfterMs(t);
        expect(verdict({ ...t, lastSeenAt: NOW - limit + 1 }, NOW), `${chipsMode}/${handsPlayed}`).toBe(
          "unlist",
        );
      }
    }
  });
});

group("privacy is a listing choice, never a lifetime", () => {
  it("hides a private table from the lobby while it is perfectly alive", () => {
    const t = table({ connected: 3 });
    expect(shouldList(t, NOW, false)).toBe(true);
    expect(shouldList(t, NOW, true)).toBe(false);
  });

  it("reaps a private table on exactly the same clock as a listed one", () => {
    // Being unlisted must not become a way to live forever.
    //
    // The first version of this test asserted `verdict(t) === verdict(t)`,
    // which is true of every function ever written. A planted mutation that
    // made `verdict` return "keep" for private tables SURVIVED it. What
    // follows is what that tautology was pretending to check.
    const dead = table({ lastSeenAt: NOW - REAP_FRESH_MS });
    expect(shouldList(dead, NOW, true)).toBe(false);
    expect(verdict(dead, NOW)).toBe("delete");

    // The structural half is that `TableSnapshot` carries no privacy field, so
    // `verdict` cannot consult one. That is enforced by the type, not here.
    expect(Object.keys(table())).not.toContain("isPrivate");

    // What is NOT provable from this file: that the Durable Object actually
    // arms a reaper for an unlisted table. Skipping the reaper for private
    // rooms is a caller-side bug and no test in a pure module can see it —
    // tableDO's own "an unlisted table is still reaped" case covers that.
    //
    // A `verdict.length === 2` guard was tried here and is worth not
    // re-adding: Function.length stops counting at the first defaulted
    // parameter, so `(s, now, isPrivate = false)` still reads as 2. The
    // instrument could not represent the failure it was aimed at.
  });

  it("still delists a table it is about to delete", () => {
    // The two answers must not contradict: whatever the lobby is told, a
    // reaped table is never simultaneously advertised as joinable.
    for (const idle of [min(1), min(30), hour(3), day(40)]) {
      const t = table({ lastSeenAt: NOW - idle });
      if (verdict(t, NOW) !== "keep") expect(shouldList(t, NOW, false)).toBe(false);
    }
  });
});

group("nextCheckAt schedules exactly the boundaries", () => {
  it("wakes at the delist boundary first", () => {
    const t = table({ lastSeenAt: NOW });
    expect(nextCheckAt(t, NOW)).toBe(NOW + LIST_STALE_MS);
  });

  it("wakes at the delete boundary once delisting is behind it", () => {
    const t = table({ lastSeenAt: NOW - min(10) });
    expect(nextCheckAt(t, NOW)).toBe(NOW - min(10) + REAP_FRESH_MS);
  });

  it("asks for nothing when both boundaries are already past", () => {
    // The caller is meant to be deleting at this point, not scheduling. A
    // non-null answer here would arm an alarm that fires immediately, forever.
    expect(nextCheckAt(table({ lastSeenAt: NOW - day(60) }), NOW)).toBeNull();
  });

  it("never returns a time in the past", () => {
    for (const idle of [0, min(1), min(5), min(16), hour(1), hour(2), day(31)]) {
      for (const chipsMode of ["fresh", "league"] as const) {
        for (const handsPlayed of [0, 3]) {
          const at = nextCheckAt(table({ lastSeenAt: NOW - idle, chipsMode, handsPlayed }), NOW);
          if (at !== null) expect(at, `${idle}/${chipsMode}/${handsPlayed}`).toBeGreaterThan(NOW);
        }
      }
    }
  });

  it("the scheduled wake-up is the moment the verdict actually changes", () => {
    // The control that ties the two functions together: if they disagreed, a
    // table would wake up, decide nothing had changed, and re-arm forever.
    const t = table({ lastSeenAt: NOW - min(1) });
    const at = nextCheckAt(t, NOW)!;
    expect(verdict(t, at - 1)).toBe("keep");
    expect(verdict(t, at)).toBe("unlist");
  });
});

group("presence expires — the bug that advertised dead rooms", () => {
  // The live failure, 2026-08-14: a table sat in the lobby for forty minutes
  // after the last browser closed, saying "4/6". The lobby decides staleness
  // at read time and its own comment claims that check "cannot be missed" —
  // and it was missed by one line, `if (s.connected > 0) return "keep"`.
  //
  // `connected` is not a fact the lobby can observe. It is the last thing the
  // TABLE said, and a table that stops waking up stops correcting it. So the
  // one state that pins a row in the lobby permanently is the one state a
  // dead table is most likely to be frozen in.

  it("believes a fresh report that says somebody is here", () => {
    const t = table({ connected: 2, reportedAt: NOW, lastSeenAt: NOW });
    expect(presentNow(t, NOW)).toBe(true);
    expect(verdict(t, NOW)).toBe("keep");
    expect(shouldList(t, NOW, false)).toBe(true);
  });

  it("stops believing it once the report is older than the TTL", () => {
    // Nothing about this row changed. Only the clock moved.
    const t = table({ connected: 2, reportedAt: NOW, lastSeenAt: NOW });
    const later = NOW + PRESENCE_TTL_MS + min(1);
    expect(presentNow(t, later)).toBe(false);
    expect(shouldList(t, later, false)).toBe(false);
  });

  it("delists a dead table, and would not have before this", () => {
    // The exact shape of HF1BV: last word "2 connected", then silence.
    const dead = table({ connected: 2, reportedAt: NOW, lastSeenAt: NOW, handsPlayed: 3 });
    const fortyMinutesLater = NOW + min(40);

    expect(shouldList(dead, fortyMinutesLater, false)).toBe(false);
    // The pre-fix predicate, spelled out, so the difference is on the record
    // rather than in a commit message.
    expect(dead.connected > 0).toBe(true);
  });

  it("a heartbeat inside the TTL keeps a quiet-but-occupied table listed", () => {
    // Six people between hands emit nothing at all. Expiring presence without
    // a renewal would delist them, which is why HEARTBEAT_MS exists and why
    // it has to be comfortably under the TTL.
    expect(HEARTBEAT_MS).toBeLessThan(PRESENCE_TTL_MS);
    const beat = table({ connected: 6, reportedAt: NOW, lastSeenAt: NOW });
    // Two missed beats is still fine; it takes real silence.
    const after = NOW + HEARTBEAT_MS * 2;
    expect(presentNow(beat, after)).toBe(true);
    expect(shouldList(beat, after, false)).toBe(true);
  });

  it("schedules the heartbeat, rather than nothing, while occupied", () => {
    // This used to return null — "the game clock governs while anyone is
    // here" — which is true right up until the game clock is not running,
    // and a table between hands has no game clock at all.
    const t = table({ connected: 3, reportedAt: NOW });
    expect(nextCheckAt(t, NOW)).toBe(NOW + HEARTBEAT_MS);
  });

  it("an expired report does not make a table deletable any sooner", () => {
    // Presence expiring must only ever cost a LISTING. The delete clock is
    // measured from lastSeenAt and is generous on purpose; a stale report
    // must not shorten it, or a busy table whose heartbeats were dropped
    // could be collected out from under the people sitting at it.
    const t = table({ connected: 4, reportedAt: NOW, lastSeenAt: NOW, handsPlayed: 9 });
    const justPastTtl = NOW + PRESENCE_TTL_MS + 1;
    expect(verdict(t, justPastTtl)).toBe("unlist");
    expect(idleMs(t, justPastTtl)).toBeLessThan(REAP_FRESH_MS);
  });
});
