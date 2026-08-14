// A seat holding nothing does not sit at the table.

import { describe as group, expect, it } from "vitest";
import { bustedSeats, type BustedSeatView } from "./busted";
import { botId, isBot } from "./botSeats";
import { computeLegal } from "../../shared/src/engine/betting";
import { mulberry32, seedFrom } from "../../shared/src/engine/rng";
import { apply } from "../../shared/src/engine/table";
import { newTable, start } from "../../shared/src/engine/testkit";

const seat = (o: Partial<BustedSeatView> = {}): BustedSeatView => ({
  playerId: "2f1c8f8e-1b3a-4c9d-9f22-7a1b0c5d6e7f",
  stack: 200,
  pendingRebuy: 0,
  ...o,
});

const sweep = (seats: BustedSeatView[], handInProgress = false) =>
  bustedSeats(seats, { handInProgress, isBot });

group("who gets cleared", () => {
  it("leaves a table where everybody has chips completely alone", () => {
    expect(sweep([seat(), seat({ playerId: botId(0) }), seat()])).toEqual([]);
  });

  it("restakes the house and stands a person up", () => {
    expect(
      sweep([
        seat({ playerId: botId(0), stack: 0 }),
        seat({ stack: 0 }),
        seat({ playerId: botId(1), stack: 195 }),
      ]),
    ).toEqual([
      { seat: 0, action: "rebuy" },
      { seat: 1, action: "standUp" },
    ]);
  });

  it("ignores an empty seat", () => {
    // An empty seat has no chips either, and clearing it would be a leave
    // command aimed at nobody.
    expect(sweep([seat({ playerId: null, stack: 0 })])).toEqual([]);
  });

  it("leaves a seat whose rebuy is still in flight", () => {
    // `pendingRebuy` lands when the hand ends. Standing this player up
    // between the request and the landing throws away chips they have already
    // committed to bringing back.
    expect(sweep([seat({ stack: 0, pendingRebuy: 200 })])).toEqual([]);
    expect(sweep([seat({ playerId: botId(0), stack: 0, pendingRebuy: 200 })])).toEqual([]);
  });

  it("says nothing at all while a hand is running", () => {
    // The load-bearing one. Clearing mid-hand would pull somebody out of a
    // pot they are still contesting.
    const busted = [seat({ stack: 0 }), seat({ playerId: botId(0), stack: 0 })];
    expect(sweep(busted, true)).toEqual([]);
    // ...and the same seats DO get cleared once it is over — without this the
    // assertion above passes for a function that never returns anything.
    expect(sweep(busted, false)).toHaveLength(2);
  });

  it("reports seats in seat order", () => {
    const fixes = sweep([seat(), seat({ stack: 0 }), seat(), seat({ playerId: botId(2), stack: 0 })]);
    expect(fixes.map((f) => f.seat)).toEqual([1, 3]);
  });

  it("treats a negative stack the same as an empty one", () => {
    // The engine should never produce one. If it ever does, the seat is
    // certainly not playable, and `> 0` is what makes that true by reading
    // rather than by hoping.
    expect(sweep([seat({ stack: -5 })])).toEqual([{ seat: 0, action: "standUp" }]);
  });
});

group("against a real engine table", () => {
  it("catches the seat an all-in actually busted", () => {
    // The unit tests above are hand-built states. This drives the engine
    // until somebody really runs out of chips, so the field names and the
    // moment they are read are the engine's, not mine.
    // A short stack that calls off does not ALWAYS bust — sometimes it wins
    // the hand. Seeds are tried until one produces a real bust rather than
    // one seed being asserted to, which would be a test that passes on a
    // coin flip.
    let s = null as null | ReturnType<typeof start>["state"];
    for (const seedName of ["bust", "a", "b", "c", "d", "e", "f", "g"]) {
      const rng = mulberry32(seedFrom(seedName));
      let t = start(
        // 5/10 against a stack of 10, so the short stack is all-in on the
        // blind. At the default 1/2 it simply calls small amounts forever and
        // never busts — which is how the first version of this test came back
        // green over a fixture that could not produce the state it asserted.
        newTable(
          [
            { name: "Short", stack: 10 },
            { name: "Deep", stack: 400 },
            { name: "Deep Two", stack: 400 },
          ],
          { sb: 5, bb: 10 },
        ),
        seedName,
      ).state;
      for (let i = 0; i < 400 && t.hand && t.hand.toAct >= 0; i++) {
        const legal = computeLegal(t, t.hand.toAct)!;
        const kind = legal.actions.includes("call") ? "call" : "check";
        t = apply(
          t,
          { type: "act", seat: t.hand.toAct, actionSeq: t.hand.actionSeq, action: { kind } },
          rng,
        ).state;
      }
      if (t.hand === null && t.seats.some((x) => x.playerId && x.stack === 0)) {
        s = t;
        break;
      }
    }

    expect(s, "no seed produced a bust — the fixture stopped working").not.toBeNull();
    s = s!;
    expect(s.hand).toBeNull();

    const fixes = bustedSeats(s.seats, { handInProgress: s.hand !== null, isBot });
    expect(fixes.map((f) => f.seat)).toEqual(
      s.seats.map((x, i) => [x, i] as const).filter(([x]) => x.playerId && x.stack === 0).map(([, i]) => i),
    );
  });
});
