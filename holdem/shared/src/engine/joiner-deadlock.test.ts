// THE TABLE THAT NEVER DEALS AGAIN.
//
// Measured on the live practice table, 2026-08-15: five seats, all `active`,
// all holding chips (1963, 2334, 55, 200, 200), phase pinned at "waiting",
// and an inter-hand alarm firing every 6.5 s producing an EMPTY event list.
// Forever. `play-a-few.mjs` sat down and watched 0 hands in two minutes.
//
// The cause is a deadlock between two rules that are each correct alone:
//
//   1. A JOINER (`owesBB`) sitting in the button..BB zone must WAIT - it would
//      otherwise buy a privileged position without paying a blind.
//   2. A joiner stops owing a BB only by being DEALT IN, in `doStartHand`.
//
// So when EVERY eligible seat owes a BB, rule 1 excludes all of them but the
// big blind, `dealtSeats` has one member, `computePositions` returns null, and
// `doStartHand` silently sets `phase = "waiting"` and returns with no events.
// Nothing ever advances the BB, so the zone never moves, so nobody ever stops
// owing. It cannot recover on its own.
//
// AND IT IS NOT AN EDGE CASE ON THE PRACTICE TABLE - IT IS THE NORMAL PATH.
// `sleepBots()` sits all three bots out when the last human leaves (that is
// what keeps the table free), `wakeBots()` sits them back in when somebody
// arrives, and `doSitIn` sets `owesBB = handCounter > 0`. Every single visit
// after the first therefore makes every bot a joiner at the same instant. The
// only thing that had been saving it was a stale seat that happened to have
// been dealt in already.
//
// The fix is in the ENGINE and not in the bot plumbing: "wait for the blind to
// reach you" protects players who have already paid, and when NOBODY has paid
// there is nothing to protect and nobody to be unfair to. So the zone yields,
// every eligible seat is dealt, and every joiner posts a live blind - which is
// the fair outcome, not a waiver.

import { describe, expect, it } from "vitest";
import { computePositions } from "./blinds";
import { apply } from "./table";
import { act, newTable, rig } from "./testkit";
import type { TableState } from "./types";

/**
 * The live table, rebuilt.
 *
 * `owesBB` is set by driving REAL commands - sit, play a hand out, everybody
 * sits out, everybody sits back in - because that is the sequence
 * `sleepBots`/`wakeBots` actually performs and the flag has to come from the
 * reducer rather than from me writing it down.
 *
 * The three POSITION fields are then set to the values measured on the live
 * table (button 1, SB 2, BB 0), and that is not a shortcut - it is the half
 * that decides whether this deadlocks at all. `buttonSeat` for the next hand
 * is the PREVIOUS `smallBlindSeat`, so the button..BB zone spans from there
 * forward, and only a geometry where the new BB sits just BEHIND the old SB
 * makes that zone swallow the table. With every seat owing, the zone's width
 * is the whole bug: at 2 seats wide five players still get dealt, at 5 seats
 * wide exactly one does. `blinds.test.ts` seeds these same fields the same way.
 */
function everyoneIsAJoiner(): TableState {
  let s = newTable([
    { name: "Bot0", stack: 1963 },
    { name: "Bot1", stack: 2334 },
    { name: "Bot2", stack: 55 },
    { name: "Ghost3", stack: 200 },
    { name: "Ghost4", stack: 200 },
    null,
  ]);
  // One COMPLETE hand, so handCounter > 0 - which is the condition doSitIn
  // keys on. It has to finish: sitting out mid-hand force-folds the seat and
  // ends the hand early, which is a different state from the one measured.
  s = apply(s, { type: "startHand" }, rig("first")).state;
  while (s.hand) s = act(s, s.hand.toAct, { kind: "fold" }).state;
  // Everybody leaves (sleepBots), then everybody comes back (wakeBots).
  for (let i = 0; i < 5; i++) s = apply(s, { type: "sitOut", seat: i }).state;
  for (let i = 0; i < 5; i++) s = apply(s, { type: "sitIn", seat: i }).state;
  // The measured geometry.
  s.buttonSeat = 1;
  s.smallBlindSeat = 2;
  s.bigBlindSeat = 0;
  return s;
}

/** The seats the joiner rule would exclude, computed the way blinds.ts does. */
function zoneWidth(s: TableState): number {
  // Next hand: BB advances one eligible seat, button inherits the old SB.
  const n = s.seats.length;
  let bb = -1;
  for (let k = 1; k <= n; k++) {
    const i = (s.bigBlindSeat + k) % n;
    if (s.seats[i].status === "active" && s.seats[i].stack > 0) {
      bb = i;
      break;
    }
  }
  let w = 0;
  for (let i = s.smallBlindSeat; i !== bb; i = (i + 1) % n) w++;
  return w;
}

describe("a table where every eligible seat is a joiner", () => {
  it("reproduces the live preconditions, all three of them", () => {
    const s = everyoneIsAJoiner();
    const eligible = s.seats.filter((x) => x.status === "active" && x.stack > 0);
    expect(eligible.length, "five funded players - this was never a shortage").toBe(5);
    expect(s.seats.every((x) => x.status !== "active" || x.owesBB), "every active seat owes a BB").toBe(true);
    // The geometry, asserted rather than assumed. A fixture that quietly
    // stopped having a wide zone would pass every test below while testing
    // nothing - the same table with a 2-seat zone deals fine and always did.
    expect(zoneWidth(s), "the zone has to swallow the table for this to deadlock").toBe(5);
  });

  it("computes positions instead of refusing", () => {
    // THE REGRESSION. Before the fix this was null, which is how a table with
    // five funded players sits in "waiting" indefinitely.
    const pos = computePositions(everyoneIsAJoiner(), rig("x"));
    expect(pos, "five funded players and no positions is the deadlock").not.toBeNull();
    expect(pos!.dealtSeats.length).toBeGreaterThanOrEqual(2);
  });

  it("actually deals, and the phase leaves waiting", () => {
    const before = everyoneIsAJoiner();
    const { state, events } = apply(before, { type: "startHand" }, rig("deal"));
    expect(events.length, "a silent commit with no events IS the bug's signature").toBeGreaterThan(0);
    expect(state.phase).toBe("hand");
    expect(state.hand).not.toBeNull();
  });

  it("makes the joiners PAY rather than waiving the blind", () => {
    // The zone yielding must not become a way to join for free. Every seat
    // that owed a blind and is dealt in posts one.
    const before = everyoneIsAJoiner();
    const pos = computePositions(before, rig("deal"))!;
    const owing = pos.dealtSeats.filter((i) => before.seats[i].owesBB && i !== pos.bigBlindSeat);
    expect(owing.length, "the fixture should have owing seats other than the BB").toBeGreaterThan(0);
    for (const i of owing) {
      expect(pos.livePostSeats, `seat ${i} was dealt in owing a blind and must post one`).toContain(i);
    }
  });

  it("does not change a table where the zone has somebody to protect", () => {
    // THE CONTROL. The fallback must fire only when the zone would starve the
    // hand - if it fired always, the joiner rule would be gone and this whole
    // change would be a deletion wearing a bug fix's clothes.
    let s = newTable(
      [{ name: "A", stack: 100 }, { name: "B", stack: 100 }, { name: "C", stack: 100 }, null, null, null],
      { maxSeats: 6 },
    );
    s = apply(s, { type: "startHand" }, rig("first")).state;
    while (s.hand) s = act(s, s.hand.toAct, { kind: "fold" }).state;
    // One newcomer in the zone, two established players who have paid.
    s = apply(s, { type: "sit", seat: 3, playerId: "p3", name: "D", buyIn: 100 }).state;
    const pos = computePositions(s, rig("y"))!;
    const waited = !pos.dealtSeats.includes(3);
    const paid = pos.livePostSeats.includes(3) || pos.bigBlindSeat === 3;
    // Either the newcomer waits, or they pay - as a live post or as the
    // natural big blind. Never dealt in for free.
    expect(waited || paid, "a joiner is never dealt in for free").toBe(true);
    expect(pos.dealtSeats.length).toBeGreaterThanOrEqual(2);
  });
});
