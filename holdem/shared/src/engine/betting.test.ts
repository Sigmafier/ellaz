// Betting-round rules — min-raise, the per-wager incomplete-raise rule, the
// BB option, calls for less, and stale-action rejection.
//
// Fixed positions via presetting the blind anchors: with 3+ players this
// yields button=0, SB=1, BB=2, so preflop action starts at seat 3 (or seat 0
// when only three sit), and the flop opens on seat 1.

import { expect, it, describe } from "vitest";
import { computeLegal } from "./betting";
import { apply } from "./table";
import { act, newTable, rig } from "./testkit";
import { EngineError, type TableState } from "./types";

function startFixed(state: TableState, seed = "hand"): TableState {
  const s = structuredClone(state) as TableState;
  s.smallBlindSeat = 0;
  s.bigBlindSeat = 1;
  return apply(s, { type: "startHand" }, rig(seed)).state;
}

/** 3 players to a flop where seat1 opens the betting: everyone calls preflop. */
function toFlop(stacks: [number, number, number]): TableState {
  let s = newTable(
    stacks.map((stack, i) => ({ name: "ABC"[i], stack })),
    { sb: 1, bb: 2 },
  );
  s = startFixed(s);
  expect(s.hand!.toAct).toBe(0); // button acts first 3-handed preflop
  s = act(s, 0, { kind: "call" }).state;
  s = act(s, 1, { kind: "call" }).state;
  s = act(s, 2, { kind: "check" }).state;
  expect(s.hand!.street).toBe("flop");
  expect(s.hand!.toAct).toBe(1); // SB opens postflop
  return s;
}

describe("incomplete all-in raises (the per-wager rule)", () => {
  it("a short all-in raise does not reopen the action for the original bettor", () => {
    // A(seat1) bets 100, B(seat2) all-in 150 — a raise of 50 < 100.
    let s = toFlop([1000, 1000, 152]); // seat2 posted BB 2 → 150 behind
    s = act(s, 1, { kind: "bet", to: 100 }).state;
    s = act(s, 2, { kind: "raise", to: 150 }).state;
    expect(s.seats[2].allIn).toBe(true);
    expect(s.hand!.betTo).toBe(150);
    s = act(s, 0, { kind: "call" }).state;

    const legal = computeLegal(s, 1)!;
    expect(legal.actions).toContain("call");
    expect(legal.actions).toContain("fold");
    expect(legal.actions).not.toContain("raise");
    expect(legal.callAmount).toBe(50);
    expect(() => act(s, 1, { kind: "raise", to: 300 })).toThrowError(EngineError);
  });

  it("a full all-in raise reopens the action with the right minimum", () => {
    // A bets 100, B all-in 250 — a raise of 150 >= 100 reopens.
    let s = toFlop([1000, 1000, 252]);
    s = act(s, 1, { kind: "bet", to: 100 }).state;
    s = act(s, 2, { kind: "raise", to: 250 }).state;
    s = act(s, 0, { kind: "fold" }).state;

    const legal = computeLegal(s, 1)!;
    expect(legal.actions).toContain("raise");
    expect(legal.minRaiseTo).toBe(400); // 250 + the 150 full-raise size
  });

  it("two cumulative short all-ins still do not reopen (per-wager, not TDA-cumulative)", () => {
    // A bets 100, B all-in 150 (+50), C all-in 190 (+40): 90 cumulative, but
    // neither wager alone was a full raise — A may only call or fold.
    let s = toFlop([192, 1000, 152]); // seat0=C 190 behind, seat2=B 150 behind
    s = act(s, 1, { kind: "bet", to: 100 }).state;
    s = act(s, 2, { kind: "raise", to: 150 }).state;
    s = act(s, 0, { kind: "raise", to: 190 }).state; // all-in short again
    expect(s.hand!.betTo).toBe(190);

    const legal = computeLegal(s, 1)!;
    expect(legal.actions).not.toContain("raise");
    expect(legal.callAmount).toBe(90);
  });

  it("rejects a below-minimum raise that is not all-in", () => {
    let s = toFlop([1000, 1000, 1000]);
    s = act(s, 1, { kind: "bet", to: 100 }).state;
    expect(() => act(s, 2, { kind: "raise", to: 150 })).toThrowError(/all-in|outside/);
  });
});

describe("blind mechanics preflop", () => {
  it("gives the BB its option on a limped pot and lets a BB check close the street", () => {
    let s = newTable(
      [
        { name: "A", stack: 200 },
        { name: "B", stack: 200 },
        { name: "C", stack: 200 },
      ],
      { sb: 1, bb: 2 },
    );
    s = startFixed(s);
    s = act(s, 0, { kind: "call" }).state;
    s = act(s, 1, { kind: "call" }).state;

    const legal = computeLegal(s, 2)!;
    expect(legal.actions).toContain("check");
    expect(legal.actions).toContain("raise"); // the option
    expect(legal.minRaiseTo).toBe(4); // BB 2 + initial raise size BB

    const after = act(s, 2, { kind: "raise", to: 6 }).state;
    expect(after.hand!.street).toBe("preflop");
    expect(after.hand!.toAct).toBe(0); // action reopened

    const checked = act(s, 2, { kind: "check" }).state;
    expect(checked.hand!.street).toBe("flop");
  });

  it("uses the full BB as the preflop min-raise base", () => {
    let s = newTable(
      [
        { name: "A", stack: 200 },
        { name: "B", stack: 200 },
        { name: "C", stack: 200 },
      ],
      { sb: 1, bb: 2 },
    );
    s = startFixed(s);
    const legal = computeLegal(s, 0)!;
    expect(legal.minRaiseTo).toBe(4);
    expect(legal.callAmount).toBe(2);
  });
});

describe("street resets and calls for less", () => {
  it("resets the min-raise to the BB each street: bet 60 makes min raise 120", () => {
    let s = toFlop([1000, 1000, 1000]);
    s = act(s, 1, { kind: "bet", to: 60 }).state;
    const legal = computeLegal(s, 2)!;
    expect(legal.minRaiseTo).toBe(120);
  });

  it("enforces the min opening bet of one BB", () => {
    const s = toFlop([1000, 1000, 1000]);
    const legal = computeLegal(s, 1)!;
    expect(legal.minBetTo).toBe(2);
    expect(() => act(s, 1, { kind: "bet", to: 1 })).toThrowError(EngineError);
  });

  it("an all-in call for less changes neither betTo nor anyone's raise rights", () => {
    let s = toFlop([1000, 1000, 42]); // seat2 has 40 behind on the flop
    s = act(s, 1, { kind: "bet", to: 100 }).state;
    s = act(s, 2, { kind: "call" }).state; // all-in for 40
    expect(s.seats[2].allIn).toBe(true);
    expect(s.seats[2].committed).toBe(40);
    expect(s.hand!.betTo).toBe(100);

    const legal = computeLegal(s, 0)!;
    expect(legal.actions).toContain("raise"); // seat0 never acted — full rights
    expect(legal.callAmount).toBe(100);
  });
});

describe("action hygiene", () => {
  it("rejects a stale actionSeq and an out-of-turn action", () => {
    const s = startFixed(
      newTable(
        [
          { name: "A", stack: 200 },
          { name: "B", stack: 200 },
          { name: "C", stack: 200 },
        ],
        { sb: 1, bb: 2 },
      ),
    );
    expect(() =>
      apply(s, { type: "act", seat: 0, actionSeq: s.hand!.actionSeq + 1, action: { kind: "call" } }),
    ).toThrowError(/stale/i);
    expect(() =>
      apply(s, { type: "act", seat: 1, actionSeq: s.hand!.actionSeq, action: { kind: "call" } }),
    ).toThrowError(/not to act/i);
  });

  it("rejects a check when facing a bet", () => {
    let s = toFlop([1000, 1000, 1000]);
    s = act(s, 1, { kind: "bet", to: 50 }).state;
    expect(() => act(s, 2, { kind: "check" })).toThrowError(EngineError);
  });
});
