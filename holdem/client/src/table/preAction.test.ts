import { describe as group, expect, it } from "vitest";
import { computeLegal } from "@shared/engine/betting";
import { apply } from "@shared/engine/table";
import { type Command, createTable, DEFAULT_CONFIG, type TableState } from "@shared/engine/types";
import { mulberry32, seedFrom } from "@shared/engine/rng";
import { canArmPreAction, preActionMove, stillArmed } from "./preAction";

// The fixtures are REAL ENGINE STATES, not hand-written LegalActions.
//
// The whole question this module answers is "does the street cost me
// anything", and the engine is the only thing that knows. A test built from
// objects I typed myself would agree with whatever I believed while typing
// them and keep agreeing after the engine changed its mind — which is the one
// failure that costs a player the pot they were still in.
//
// testkit.ts is deliberately out of the client's tsconfig (both client and
// server exclude it), so the six lines it would have saved are written here.
function seatedTable(stacks: number[]): TableState {
  let s = createTable({ code: "TEST1", ...DEFAULT_CONFIG, maxSeats: stacks.length, minBuyIn: 1 });
  stacks.forEach((stack, i) => {
    s = apply(s, { type: "sit", seat: i, playerId: `p${i}`, name: `n${i}`, buyIn: stack }).state;
  });
  return apply(s, { type: "startHand" }, mulberry32(seedFrom("preaction"))).state;
}

const act = (s: TableState, seat: number, action: Extract<Command, { type: "act" }>["action"]) =>
  apply(s, { type: "act", seat, actionSeq: s.hand!.actionSeq, action }).state;

const moveFor = (s: TableState) => preActionMove(computeLegal(s, s.hand!.toAct));

group("preActionMove", () => {
  it("folds the seat that is facing a bet, and only that seat", () => {
    // Preflop, three-handed: the first to act owes the big blind, so an armed
    // box gives up the hand rather than paying to see a flop nobody asked for.
    const s = seatedTable([200, 200, 200]);
    expect(moveFor(s)).toBe("fold");
  });

  it("checks the big blind when the pot is only limped to it", () => {
    let s = seatedTable([200, 200, 200]);
    const bb = s.bigBlindSeat;
    // Everyone calls round to the blind, which now owes nothing.
    while (s.hand!.toAct !== bb) s = act(s, s.hand!.toAct, { kind: "call" });
    expect(s.hand!.toAct).toBe(bb);
    expect(moveFor(s)).toBe("check");
  });

  it("checks a free street and folds the same street once somebody bets", () => {
    let s = seatedTable([200, 200, 200]);
    const bb = s.bigBlindSeat;
    while (s.hand!.toAct !== bb) s = act(s, s.hand!.toAct, { kind: "call" });
    s = act(s, bb, { kind: "check" });
    expect(s.hand!.street).toBe("flop");

    // Nobody has bet the flop yet.
    expect(moveFor(s)).toBe("check");

    // The same street, one bet later.
    s = act(s, s.hand!.toAct, { kind: "bet", to: s.hand!.betTo + DEFAULT_CONFIG.bb });
    expect(moveFor(s)).toBe("fold");
  });

  it("does nothing at all when it is not this seat's turn", () => {
    // computeLegal returns null for every seat but the one to act, which is
    // the ordinary case: the box is armed for a turn that has not arrived.
    const s = seatedTable([200, 200, 200]);
    const other = (s.hand!.toAct + 1) % 3;
    expect(computeLegal(s, other)).toBeNull();
    expect(preActionMove(computeLegal(s, other))).toBeNull();
  });

  it("sends nothing rather than guessing when neither check nor fold is legal", () => {
    // Not a state the engine produces — it is what a future one, or a torn
    // frame off the wire, would look like. The answer is to leave the decision
    // to the player.
    expect(preActionMove({ actions: [] })).toBeNull();
    expect(preActionMove({ actions: ["call", "raise"], callAmount: 5 })).toBeNull();
  });

  it("prefers the check even when raising is also legal", () => {
    // The ordering is the behaviour: a free street is checked, never opened.
    expect(preActionMove({ actions: ["check", "bet"], minBetTo: 2, maxBetTo: 200 })).toBe("check");
    expect(preActionMove({ actions: ["fold", "call", "raise"], callAmount: 2 })).toBe("fold");
  });
});

group("canArmPreAction", () => {
  const seat = { inHand: true, folded: false, allIn: false, sittingOut: false };
  const base = { seatIdx: 2, handLive: true, yourTurn: false, seat };

  it("offers the box to a seated player with a decision still coming", () => {
    expect(canArmPreAction(base)).toBe(true);
  });

  it("never offers it to a spectator, between hands, or on your own turn", () => {
    expect(canArmPreAction({ ...base, seatIdx: -1 })).toBe(false);
    expect(canArmPreAction({ ...base, handLive: false })).toBe(false);
    // The turn is not a pre-action. The real buttons own it.
    expect(canArmPreAction({ ...base, yourTurn: true })).toBe(false);
  });

  it("never offers it to a seat with nothing left to decide", () => {
    expect(canArmPreAction({ ...base, seat: { ...seat, folded: true } })).toBe(false);
    expect(canArmPreAction({ ...base, seat: { ...seat, allIn: true } })).toBe(false);
    expect(canArmPreAction({ ...base, seat: { ...seat, inHand: false } })).toBe(false);
    expect(canArmPreAction({ ...base, seat: { ...seat, sittingOut: true } })).toBe(false);
    // A seat the view has not caught up with yet.
    expect(canArmPreAction({ ...base, seat: null })).toBe(false);
  });
});

group("stillArmed", () => {
  it("holds for the hand it was armed in", () => {
    expect(stillArmed(7, 7)).toBe(true);
  });

  it("lets go the moment the hand number moves", () => {
    // THE ONE THAT COSTS ACES. A latch that survives its hand folds the next
    // one, unasked, from a box the player ticked while bored two minutes ago.
    expect(stillArmed(7, 8)).toBe(false);
    // -1 is what `you.handNo` carries between hands (tableDO.youFor).
    expect(stillArmed(7, -1)).toBe(false);
    expect(stillArmed(7, null)).toBe(false);
    expect(stillArmed(7, undefined)).toBe(false);
    expect(stillArmed(null, 7)).toBe(false);
    // Never armed "for hand -1", however that got written down.
    expect(stillArmed(-1, -1)).toBe(false);
  });
});
