// Side pots, dead money, refunds, odd chips, and chip conservation.

import { describe, expect, it } from "vitest";
import { buildPots, splitPot } from "./pots";
import { apply } from "./table";
import { act, eventOfType, newTable, rig, rigCards, totalChips } from "./testkit";
import type { TableState } from "./types";

function startFixed(state: TableState, seed = "hand"): { state: TableState; events: ReturnType<typeof apply>["events"] } {
  const s = structuredClone(state) as TableState;
  s.smallBlindSeat = 0;
  s.bigBlindSeat = 1;
  return apply(s, { type: "startHand" }, rig(seed));
}

describe("buildPots", () => {
  it("layers by live totals with folded dead money flowing into the layers it reaches", () => {
    const pots = buildPots({
      totalCommitted: [100, 40, 100, 30],
      inHand: [true, true, true, true],
      folded: [false, false, false, true],
    });
    expect(pots).toEqual([
      { amount: 150, eligible: [0, 1, 2] }, // 40+40+40+30
      { amount: 120, eligible: [0, 2] }, // 60+60
    ]);
  });

  it("opens no layer for a folded total", () => {
    const pots = buildPots({
      totalCommitted: [100, 100, 55],
      inHand: [true, true, true],
      folded: [false, false, true],
    });
    expect(pots).toHaveLength(1);
    expect(pots[0]).toEqual({ amount: 255, eligible: [0, 1] });
  });
});

describe("splitPot", () => {
  it("gives odd chips to winners nearest clockwise from left of the button", () => {
    // 9 seats, button 4, winners 2 and 7 splitting 15: 7 is reached first.
    expect(splitPot(15, [2, 7], 4, 9)).toEqual({ 7: 8, 2: 7 });
    // three-way split of 100: 33 each + 1 odd to the first winner after the button
    expect(splitPot(100, [0, 3, 6], 8, 9)).toEqual({ 0: 34, 3: 33, 6: 33 });
  });
});

describe("settlement through the reducer", () => {
  it("three-way with two all-in levels: short stack wins the main pot only", () => {
    // Seats: 0=C(100), 1=B(40, all-in short), 2=A(100). btn=0 sb=1 bb=2.
    let s = newTable(
      [
        { name: "C", stack: 100 },
        { name: "B", stack: 40 },
        { name: "A", stack: 100 },
      ],
      { sb: 1, bb: 2 },
    );
    const before = totalChips(s);
    s = startFixed(s).state;
    s = rigCards(s, { 0: "Ks Kd", 1: "As Ah", 2: "2s 2d" }, "3c 7d 9h Jc Qd");
    s = act(s, 0, { kind: "raise", to: 100 }).state; // all-in
    s = act(s, 1, { kind: "call" }).state; // all-in for 40
    const fin = act(s, 2, { kind: "call" });
    s = fin.state;

    const pots = eventOfType(fin.events, "PotAwarded");
    expect(pots).toHaveLength(2);
    expect(pots[0]).toMatchObject({ amount: 120, winners: [1] }); // AA wins main
    expect(pots[1]).toMatchObject({ amount: 120, winners: [0] }); // KK wins side
    expect(s.seats.map((x) => x.stack)).toEqual([120, 120, 0]);
    expect(totalChips(s)).toBe(before);
  });

  it("puts a folded caller's dead money into the right layers", () => {
    // Seats: 0=D(200,btn), 1=A(50,sb), 2=B(200,bb), 3=C(200,utg).
    let s = newTable(
      [
        { name: "D", stack: 200 },
        { name: "A", stack: 50 },
        { name: "B", stack: 200 },
        { name: "C", stack: 200 },
      ],
      { sb: 1, bb: 2 },
    );
    const before = totalChips(s);
    s = startFixed(s).state;
    s = rigCards(s, { 1: "As Ah", 2: "Ks Kd", 3: "Qs Qd" }, "3c 7d 9h Jc 2d");
    s = act(s, 3, { kind: "raise", to: 10 }).state;
    s = act(s, 0, { kind: "call" }).state; // D in for 10
    s = act(s, 1, { kind: "raise", to: 50 }).state; // A all-in (full raise: +40)
    s = act(s, 2, { kind: "raise", to: 100 }).state; // B re-raises
    s = act(s, 3, { kind: "call" }).state;
    s = act(s, 0, { kind: "fold" }).state; // D abandons 10
    // B and C check it down: flop, turn, river — B (seat 2) first each street.
    for (let street = 0; street < 2; street++) {
      s = act(s, 2, { kind: "check" }).state;
      s = act(s, 3, { kind: "check" }).state;
    }
    s = act(s, 2, { kind: "check" }).state;
    const fin = act(s, 3, { kind: "check" });
    const st = fin.state;

    const pots = eventOfType(fin.events, "PotAwarded");
    expect(pots).toHaveLength(2);
    expect(pots[0]).toMatchObject({ amount: 160, winners: [1] }); // 50*3 + 10 dead
    expect(pots[1]).toMatchObject({ amount: 100, winners: [2] }); // 50+50 → KK
    expect(st.seats.map((x) => x.stack)).toEqual([190, 160, 200, 100]);
    expect(totalChips(st)).toBe(before);
  });

  it("five players all-in preflop with four stack sizes make four pots, chips conserved", () => {
    // Seats: 0=60(btn), 1=40(sb), 2=20(bb), 3=80, 4=80.
    let s = newTable(
      [
        { name: "P0", stack: 60 },
        { name: "P1", stack: 40 },
        { name: "P2", stack: 20 },
        { name: "P3", stack: 80 },
        { name: "P4", stack: 80 },
      ],
      { sb: 1, bb: 2 },
    );
    const before = totalChips(s);
    s = startFixed(s).state;
    s = rigCards(
      s,
      { 0: "Qs Qd", 1: "Ks Kd", 2: "As Ah", 3: "Js Jd", 4: "Ts Td" },
      "2c 3d 7h 8s 4c",
    );
    s = act(s, 3, { kind: "raise", to: 80 }).state;
    s = act(s, 4, { kind: "call" }).state;
    s = act(s, 0, { kind: "call" }).state; // all-in 60
    s = act(s, 1, { kind: "call" }).state; // all-in 40
    const fin = act(s, 2, { kind: "call" }); // all-in 20 → runout
    const pots = eventOfType(fin.events, "PotAwarded");
    expect(pots.map((p) => ({ amount: p.amount, winners: p.winners }))).toEqual([
      { amount: 100, winners: [2] }, // 20 x 5 → AA
      { amount: 80, winners: [1] }, // 20 x 4 → KK
      { amount: 60, winners: [0] }, // 20 x 3 → QQ
      { amount: 40, winners: [3] }, // 20 x 2 → JJ
    ]);
    expect(fin.state.seats.map((x) => x.stack)).toEqual([60, 80, 100, 40, 0]);
    expect(totalChips(fin.state)).toBe(before);
  });

  it("a blind all-in below the BB builds the right micro pot and refunds the caller", () => {
    // HU with sb 5 / bb 10; BB has only 3. Anchors → BB seat 0, button/SB seat 1.
    let s = newTable(
      [
        { name: "Shorty", stack: 3 },
        { name: "Big", stack: 100 },
      ],
      { sb: 5, bb: 10 },
    );
    const before = totalChips(s);
    const started = startFixed(s);
    s = started.state;
    expect(s.seats[0].allIn).toBe(true);
    expect(s.seats[0].committed).toBe(3);
    expect(s.hand!.betTo).toBe(10);

    s = rigCards(s, { 0: "As Ah", 1: "Ks Kd" }, "2c 7d 9h Jc 3s");
    const fin = act(s, 1, { kind: "call" }); // to 10, refund 7 at settle
    const refunds = eventOfType(fin.events, "Refund");
    expect(refunds).toEqual([{ type: "Refund", seat: 1, amount: 7 }]);
    const pots = eventOfType(fin.events, "PotAwarded");
    expect(pots).toHaveLength(1);
    expect(pots[0]).toMatchObject({ amount: 6, winners: [0] });
    expect(fin.state.seats.map((x) => x.stack)).toEqual([6, 97]);
    expect(totalChips(fin.state)).toBe(before);
  });

  it("splits a pot with the odd chip going left of the button", () => {
    // 3 players: SB folds (dead 1), seats 0 and 2 tie on a board that plays.
    let s = newTable(
      [
        { name: "A", stack: 100 },
        { name: "B", stack: 100 },
        { name: "C", stack: 100 },
      ],
      { sb: 1, bb: 2 },
    );
    const before = totalChips(s);
    s = startFixed(s).state;
    s = rigCards(s, { 0: "2s 3d", 2: "2d 3s" }, "Ah Kh Qh Jh Th");
    s = act(s, 0, { kind: "call" }).state;
    s = act(s, 1, { kind: "fold" }).state;
    s = act(s, 2, { kind: "check" }).state;
    // check it down: flop, turn, river (seat2 first, button seat0 last)
    for (let i = 0; i < 3; i++) {
      s = act(s, 2, { kind: "check" }).state;
      const r = act(s, 0, { kind: "check" });
      s = r.state;
      if (!s.hand) {
        const pots = eventOfType(r.events, "PotAwarded");
        expect(pots).toHaveLength(1);
        expect(pots[0].amount).toBe(5);
        expect(pots[0].shares).toEqual({ 2: 3, 0: 2 }); // seat2 is left of button 0
      }
    }
    expect(s.hand).toBeNull();
    expect(s.seats.map((x) => x.stack)).toEqual([100, 99, 101]);
    expect(totalChips(s)).toBe(before);
  });

  it("refunds an uncalled bet when everyone folds, with no showdown reveal", () => {
    let s = newTable(
      [
        { name: "A", stack: 100 },
        { name: "B", stack: 100 },
        { name: "C", stack: 100 },
      ],
      { sb: 1, bb: 2 },
    );
    const before = totalChips(s);
    s = startFixed(s).state;
    s = act(s, 0, { kind: "raise", to: 10 }).state;
    s = act(s, 1, { kind: "fold" }).state;
    const fin = act(s, 2, { kind: "fold" });

    expect(eventOfType(fin.events, "Refund")).toEqual([{ type: "Refund", seat: 0, amount: 8 }]);
    expect(eventOfType(fin.events, "ShowdownReveal")).toHaveLength(0);
    const pots = eventOfType(fin.events, "PotAwarded");
    expect(pots).toHaveLength(1);
    expect(pots[0]).toMatchObject({ amount: 5, winners: [0] }); // 2+1+2 blind money
    expect(fin.state.seats.map((x) => x.stack)).toEqual([103, 99, 98]);
    expect(totalChips(fin.state)).toBe(before);
  });
});
