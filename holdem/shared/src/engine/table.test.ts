// Reducer behaviours above raw betting: showdown reveal order and mucking,
// runout reveals, the timeout policy, the once-per-hand time bank, and
// mid-hand rebuys landing only after the hand.

import { describe, expect, it } from "vitest";
import { apply } from "./table";
import { act, eventOfType, newTable, rig, rigCards } from "./testkit";
import type { TableState } from "./types";

function startFixed(state: TableState, seed = "hand") {
  const s = structuredClone(state) as TableState;
  s.smallBlindSeat = 0;
  s.bigBlindSeat = 1;
  return apply(s, { type: "startHand" }, rig(seed));
}

function threeHanded(): TableState {
  return newTable(
    [
      { name: "A", stack: 200 },
      { name: "B", stack: 200 },
      { name: "C", stack: 200 },
    ],
    { sb: 1, bb: 2 },
  );
}

describe("showdown reveals", () => {
  it("shows the river aggressor first and mucks a beaten caller whose cards never appear", () => {
    let s = startFixed(threeHanded()).state; // btn 0, sb 1, bb 2
    s = rigCards(s, { 0: "As Ah", 1: "Ks Kd", 2: "8c 8d" }, "2c 7d 9h Jc 3s");
    s = act(s, 0, { kind: "call" }).state;
    s = act(s, 1, { kind: "call" }).state;
    s = act(s, 2, { kind: "check" }).state;
    // flop / turn: everyone checks (order 1, 2, 0)
    for (let i = 0; i < 2; i++) {
      s = act(s, 1, { kind: "check" }).state;
      s = act(s, 2, { kind: "check" }).state;
      s = act(s, 0, { kind: "check" }).state;
    }
    // river: seat 1 bets (the aggressor), 2 and 0 call
    s = act(s, 1, { kind: "bet", to: 20 }).state;
    s = act(s, 2, { kind: "call" }).state;
    const fin = act(s, 0, { kind: "call" });

    const reveals = eventOfType(fin.events, "ShowdownReveal");
    expect(reveals.map((r) => r.seat)).toEqual([1, 2, 0]); // aggressor 1 first
    expect(reveals[0].mucked).toBe(false); // KK shows first
    expect(reveals[1].mucked).toBe(true); // 88 is beaten — mucks
    expect(reveals[1].cards).toBeUndefined(); // and its cards are never emitted
    expect(reveals[2].mucked).toBe(false); // AA wins, shows
  });

  it("shows first live seat left of the button when the river checks through", () => {
    let s = startFixed(threeHanded()).state;
    s = rigCards(s, { 0: "As Ah", 1: "Ks Kd", 2: "8c 8d" }, "2c 7d 9h Jc 3s");
    s = act(s, 0, { kind: "call" }).state;
    s = act(s, 1, { kind: "call" }).state;
    s = act(s, 2, { kind: "check" }).state;
    let fin;
    for (let i = 0; i < 3; i++) {
      s = act(s, 1, { kind: "check" }).state;
      s = act(s, 2, { kind: "check" }).state;
      fin = act(s, 0, { kind: "check" });
      s = fin.state;
    }
    const reveals = eventOfType(fin!.events, "ShowdownReveal");
    expect(reveals.map((r) => r.seat)).toEqual([1, 2, 0]); // seat 1 is left of button 0
  });

  it("reveals every live hand on an all-in runout", () => {
    let s = startFixed(threeHanded()).state;
    s = rigCards(s, { 0: "As Ah", 1: "Ks Kd", 2: "8c 8d" }, "2c 7d 9h Jc 3s");
    s = act(s, 0, { kind: "raise", to: 200 }).state;
    s = act(s, 1, { kind: "call" }).state;
    const fin = act(s, 2, { kind: "call" });
    const reveals = eventOfType(fin.events, "ShowdownReveal");
    expect(reveals).toHaveLength(3);
    expect(reveals.every((r) => !r.mucked && r.cards)).toBe(true);
    // Board runs out in three separate street events for the client to pace.
    expect(eventOfType(fin.events, "StreetDealt").map((e) => e.street)).toEqual([
      "flop",
      "turn",
      "river",
    ]);
  });

  it("reveals a worse hand that still wins a side pot it is eligible for", () => {
    // Short stack AA all-in preflop; two bigger stacks bet a side pot the
    // WORSE of them wins — that winner must show, not muck.
    let s = newTable(
      [
        { name: "Short", stack: 20 },
        { name: "Mid", stack: 200 },
        { name: "Big", stack: 200 },
      ],
      { sb: 1, bb: 2 },
    );
    s = startFixed(s).state; // btn 0, sb 1, bb 2
    s = rigCards(s, { 0: "As Ah", 1: "8c 8d", 2: "Ks Kd" }, "2c 7d 9h Jc 3s");
    s = act(s, 0, { kind: "raise", to: 20 }).state; // short all-in… full raise (18 >= 2)
    s = act(s, 1, { kind: "call" }).state;
    s = act(s, 2, { kind: "call" }).state;
    // side-pot betting between 1 and 2
    s = act(s, 1, { kind: "bet", to: 50 }).state;
    let fin = act(s, 2, { kind: "call" });
    s = fin.state;
    for (let street = 0; street < 2 && s.hand; street++) {
      s = act(s, 1, { kind: "check" }).state;
      fin = act(s, 2, { kind: "check" });
      s = fin.state;
    }
    const reveals = eventOfType(fin.events, "ShowdownReveal");
    const bySeat = new Map(reveals.map((r) => [r.seat, r]));
    expect(bySeat.get(0)!.mucked).toBe(false); // AA wins main
    expect(bySeat.get(2)!.mucked).toBe(false); // KK wins the side pot
    const pots = eventOfType(fin.events, "PotAwarded");
    expect(pots[0].winners).toEqual([0]);
    expect(pots[1].winners).toEqual([2]);
  });
});

describe("timeouts and the time bank", () => {
  it("times out to a check when free, a fold when facing a bet, and sits out after two", () => {
    let s = startFixed(threeHanded()).state;
    // Preflop: seat 0 times out facing the BB → folds.
    let r = apply(s, { type: "timeout", seat: 0 });
    s = r.state;
    const first = eventOfType(r.events, "ActionTaken")[0];
    expect(first.kind).toBe("fold");
    expect(s.seats[0].timeouts).toBe(1);

    // SB calls, BB checks → flop. BB checks, SB times out → CHECK (free).
    s = act(s, 1, { kind: "call" }).state;
    s = act(s, 2, { kind: "check" }).state;
    r = apply(s, { type: "timeout", seat: 1 });
    s = r.state;
    expect(eventOfType(r.events, "ActionTaken")[0].kind).toBe("check");
    expect(s.seats[1].timeouts).toBe(1);

    // Seat 1 times out twice more across streets → auto sit-out at hand end.
    s = act(s, 2, { kind: "check" }).state; // flop closes? no: order flop = 1 then 2
    // (seat 1 checked via timeout, then seat 2 checks → turn)
    r = apply(s, { type: "timeout", seat: 1 });
    s = r.state;
    expect(s.seats[1].timeouts).toBe(2);
    s = act(s, 2, { kind: "check" }).state; // → river
    r = apply(s, { type: "timeout", seat: 1 });
    s = r.state;
    const last = act(s, 2, { kind: "check" });
    s = last.state;
    expect(s.hand).toBeNull();
    expect(s.seats[1].status).toBe("sittingOut");
    expect(
      eventOfType(last.events, "SeatChanged").some((e) => e.change === "autoSitOut" && e.seat === 1),
    ).toBe(true);
  });

  it("a voluntary action resets the consecutive timeout counter", () => {
    let s = startFixed(threeHanded()).state;
    let r = apply(s, { type: "timeout", seat: 0 });
    s = r.state;
    expect(s.seats[0].timeouts).toBe(1);
    s = act(s, 1, { kind: "call" }).state;
    s = act(s, 2, { kind: "check" }).state;
    // seat 1 acts voluntarily on the flop
    s = act(s, 1, { kind: "check" }).state;
    expect(s.seats[1].timeouts).toBe(0);
  });

  it("grants the time bank once per hand", () => {
    let s = startFixed(threeHanded()).state;
    const r = apply(s, { type: "useTimeBank", seat: 0 });
    s = r.state;
    expect(eventOfType(r.events, "TimeBankUsed")).toHaveLength(1);
    expect(() => apply(s, { type: "useTimeBank", seat: 0 })).toThrowError(/time bank/i);
  });
});

describe("rebuys", () => {
  it("defers a mid-hand rebuy to the end of the hand", () => {
    let s = startFixed(threeHanded()).state;
    s = apply(s, { type: "rebuy", seat: 0, amount: 100 }).state;
    expect(s.seats[0].stack).toBe(200); // unchanged mid-hand
    expect(s.seats[0].pendingRebuy).toBe(100);
    // fold the hand out
    while (s.hand) s = act(s, s.hand.toAct, { kind: "fold" }).state;
    expect(s.seats[0].pendingRebuy).toBe(0);
    expect(s.seats[0].stack).toBe(300 - s.config.bb * 0); // 200 + 100, no blind for btn
  });
});
