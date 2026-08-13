// Button and blind movement: heads-up, 3->2 transitions, the dead button,
// joiners posting live BB or waiting out the zone, and sit-outs in the blinds.

import { describe, expect, it } from "vitest";
import { apply } from "./table";
import { act, eventOfType, newTable, rig, rigCards, totalChips } from "./testkit";
import type { EngineEvent, TableState } from "./types";

function startFixed(
  state: TableState,
  seed = "hand",
): { state: TableState; events: EngineEvent[] } {
  const s = structuredClone(state) as TableState;
  if (s.bigBlindSeat < 0) {
    s.smallBlindSeat = 0;
    s.bigBlindSeat = 1;
  }
  return apply(s, { type: "startHand" }, rig(seed));
}

/** Everyone folds to the BB, ending the hand instantly. */
function foldOut(state: TableState): TableState {
  let s = state;
  while (s.hand) {
    s = act(s, s.hand.toAct, { kind: "fold" }).state;
  }
  return s;
}

function handStarted(events: EngineEvent[]) {
  return eventOfType(events, "HandStarted")[0];
}

describe("heads-up", () => {
  it("button is the SB, acts first preflop and last postflop, and alternates", () => {
    let s = newTable(
      [
        { name: "A", stack: 100 },
        { name: "B", stack: 100 },
      ],
      { sb: 1, bb: 2 },
    );
    let r = startFixed(s); // anchors: prevBB=1 → BB seat 0, button/SB seat 1
    s = r.state;
    let hs = handStarted(r.events);
    expect(hs.buttonSeat).toBe(1);
    expect(hs.smallBlindSeat).toBe(1);
    expect(hs.bigBlindSeat).toBe(0);
    expect(s.hand!.toAct).toBe(1); // button first preflop

    s = act(s, 1, { kind: "call" }).state;
    s = act(s, 0, { kind: "check" }).state;
    expect(s.hand!.street).toBe("flop");
    expect(s.hand!.toAct).toBe(0); // BB first postflop

    s = foldOut(s);
    r = startFixed(s);
    hs = handStarted(r.events);
    expect(hs.buttonSeat).toBe(0); // alternated
    expect(hs.bigBlindSeat).toBe(1);
  });
});

describe("3 -> 2 transitions", () => {
  function threeWithShortStack(shortSeat: number): TableState {
    const stacks = [200, 200, 200];
    stacks[shortSeat] = 10;
    return newTable(
      stacks.map((stack, i) => ({ name: `P${i}`, stack })),
      { sb: 1, bb: 2 },
    );
  }

  /** Bust `victim` heads-up against seat `winner` with rigged cards. */
  function bust(state: TableState, victim: number, winner: number): TableState {
    let s = state;
    const holes: Record<number, string> = {};
    holes[victim] = "2s 7d";
    holes[winner] = "As Ah";
    s = rigCards(s, holes, "Ac Kd 9h 5c 3s");
    while (s.hand) {
      const toAct = s.hand.toAct;
      if (toAct === victim) {
        s = act(s, toAct, { kind: "raise", to: 10 }).state; // all-in
      } else if (toAct === winner) {
        s = act(s, toAct, { kind: s.seats[toAct].committed < s.hand.betTo ? "call" : "check" }).state;
      } else {
        s = act(s, toAct, { kind: "fold" }).state;
      }
    }
    expect(s.seats[victim].stack).toBe(0);
    return s;
  }

  it("after the BB busts, nobody posts BB twice in a row", () => {
    let s = threeWithShortStack(2); // btn 0, sb 1, bb 2
    let r = startFixed(s);
    s = bust(r.state, 2, 0);
    r = startFixed(s);
    const hs = handStarted(r.events);
    // heads-up now: BB advances one eligible seat past seat 2 → seat 0.
    expect(hs.bigBlindSeat).toBe(0);
    expect(hs.buttonSeat).toBe(1);
    expect(hs.smallBlindSeat).toBe(1);
  });

  it("after the SB busts, the BB still advances exactly one seat", () => {
    let s = threeWithShortStack(1);
    let r = startFixed(s);
    s = bust(r.state, 1, 2);
    r = startFixed(s);
    const hs = handStarted(r.events);
    expect(hs.bigBlindSeat).toBe(0); // advanced from 2 → 0
    expect(hs.buttonSeat).toBe(2);
  });
});

describe("dead button", () => {
  it("keeps the sequence when the SB busts at a 4-handed table", () => {
    let s = newTable(
      [
        { name: "P0", stack: 200 },
        { name: "P1", stack: 10 },
        { name: "P2", stack: 200 },
        { name: "P3", stack: 200 },
      ],
      { sb: 1, bb: 2 },
    );
    const before = totalChips(s);
    // Hand 1: btn 0, sb 1, bb 2. Bust seat 1 against seat 3.
    let r = startFixed(s);
    s = r.state;
    s = rigCards(s, { 1: "2s 7d", 3: "As Ah" }, "Ac Kd 9h 5c 3s");
    s = act(s, 3, { kind: "raise", to: 10 }).state;
    s = act(s, 0, { kind: "fold" }).state;
    s = act(s, 1, { kind: "call" }).state; // all-in for 10 total
    s = act(s, 2, { kind: "fold" }).state;
    expect(s.hand).toBeNull();
    expect(s.seats[1].stack).toBe(0);

    // Hand 2: BB advances 2→3; SB position rests on 2 (posted); the BUTTON
    // rests on seat 1 — a busted seat. Dead button.
    r = startFixed(s);
    s = r.state;
    let hs = handStarted(r.events);
    expect(hs.bigBlindSeat).toBe(3);
    expect(hs.smallBlindSeat).toBe(2);
    expect(hs.sbPosted).toBe(true);
    expect(hs.buttonSeat).toBe(1);
    expect(hs.dealtSeats).toEqual([0, 2, 3]);
    // Preflop action: next after BB(3) → seat 0.
    expect(s.hand!.toAct).toBe(0);
    s = foldOut(s);

    // Hand 3: BB 3→0, SB position 3 (posted), button rests on 2.
    r = startFixed(s);
    hs = handStarted(r.events);
    expect(hs.bigBlindSeat).toBe(0);
    expect(hs.smallBlindSeat).toBe(3);
    expect(hs.buttonSeat).toBe(2);
    expect(totalChips(r.state)).toBe(before);
  });

  it("posts no SB when the previous BB player is gone (dead small blind)", () => {
    let s = newTable(
      [
        { name: "P0", stack: 200 },
        { name: "P1", stack: 200 },
        { name: "P2", stack: 200 },
        { name: "P3", stack: 200 },
      ],
      { sb: 1, bb: 2 },
    );
    let r = startFixed(s); // btn 0, sb 1, bb 2
    s = foldOut(r.state);
    // The BB player (seat 2) leaves before the next hand.
    s = apply(s, { type: "leave", seat: 2 }).state;
    r = startFixed(s);
    const hs = handStarted(r.events);
    // BB advances 2→3. SB position rests on the vacated seat 2: DEAD.
    expect(hs.bigBlindSeat).toBe(3);
    expect(hs.smallBlindSeat).toBe(2);
    expect(hs.sbPosted).toBe(false);
    const sbPosts = eventOfType(r.events, "BlindPosted").filter((e) => e.kind === "sb");
    expect(sbPosts).toHaveLength(0);
  });
});

describe("joiners", () => {
  it("a joiner in the button/SB zone waits, then posts a live BB once clear", () => {
    // 4 seats, players at 0, 2, 3 — seat 1 empty.
    let s = newTable(
      [
        { name: "P0", stack: 200 },
        null,
        { name: "P2", stack: 200 },
        { name: "P3", stack: 200 },
      ],
      { sb: 1, bb: 2, maxSeats: 4 },
    );
    // Hand 1 with anchors sb=0/bb=1(empty): BB → 2, SB dead on 1, button 0.
    let r = startFixed(s);
    s = foldOut(r.state);

    // A new player takes seat 1 mid-game.
    s = apply(s, { type: "sit", seat: 1, playerId: "new", name: "New", buyIn: 200 }).state;
    expect(s.seats[1].owesBB).toBe(true);

    // Hand 2: BB 2→3, SB position 2, button on seat 1 — the joiner sits
    // exactly in the zone (button seat) and must wait.
    r = startFixed(s);
    s = r.state;
    let hs = handStarted(r.events);
    expect(hs.bigBlindSeat).toBe(3);
    expect(hs.buttonSeat).toBe(1);
    expect(hs.dealtSeats).toEqual([0, 2, 3]);
    s = foldOut(s);

    // Hand 3: BB 3→0, SB 3, button 2. Zone is {2, 3}; seat 1 is clear and
    // posts a live BB to be dealt in.
    r = startFixed(s);
    s = r.state;
    hs = handStarted(r.events);
    expect(hs.bigBlindSeat).toBe(0);
    expect(hs.dealtSeats).toEqual([0, 1, 2, 3]);
    const posts = eventOfType(r.events, "BlindPosted").filter((e) => e.kind === "post");
    expect(posts).toEqual([
      { type: "BlindPosted", seat: 1, kind: "post", amount: 2, allIn: false },
    ]);
    expect(s.seats[1].owesBB).toBe(false);

    // The live post is live: seat 1 keeps its option if unraised.
    // (Preflop action: next after BB seat 0 → seat 1... folded around.)
  });

  it("a returning sitter owes a blind and the natural BB clears it", () => {
    let s = newTable(
      [
        { name: "P0", stack: 200 },
        { name: "P1", stack: 200 },
        { name: "P2", stack: 200 },
        { name: "P3", stack: 200 },
      ],
      { sb: 1, bb: 2 },
    );
    let r = startFixed(s); // btn 0, sb 1, bb 2
    s = foldOut(r.state);

    // Seat 3 sits out through hand 2 (they would have been the BB).
    s = apply(s, { type: "sitOut", seat: 3 }).state;
    r = startFixed(s);
    s = r.state;
    let hs = handStarted(r.events);
    // BB advances past the sitting-out seat 3 → seat 0.
    expect(hs.bigBlindSeat).toBe(0);
    expect(hs.dealtSeats).toEqual([0, 1, 2]);
    s = foldOut(s);

    // They return: they owe a BB.
    s = apply(s, { type: "sitIn", seat: 3 }).state;
    expect(s.seats[3].owesBB).toBe(true);

    // Hand 3: BB advances 0→1, button rests on 2 — so the zone (button up to
    // the BB) is {2, 3, 0} and the returning seat 3 sits BEHIND the button:
    // it must wait one more hand rather than sneak in without blinds.
    r = startFixed(s);
    s = r.state;
    hs = handStarted(r.events);
    expect(hs.bigBlindSeat).toBe(1);
    expect(hs.buttonSeat).toBe(2);
    expect(hs.dealtSeats).toEqual([0, 1, 2]);
    expect(eventOfType(r.events, "BlindPosted").every((e) => e.kind !== "post")).toBe(true);
    s = foldOut(s);

    // Hand 4: BB 1→2, button 0, zone {0, 1} — seat 3 is clear and posts.
    r = startFixed(s);
    s = r.state;
    hs = handStarted(r.events);
    expect(hs.bigBlindSeat).toBe(2);
    expect(hs.dealtSeats).toContain(3);
    const posts = eventOfType(r.events, "BlindPosted").filter((e) => e.kind === "post");
    expect(posts).toHaveLength(1);
    expect(posts[0].seat).toBe(3);
    expect(s.seats[3].owesBB).toBe(false);
  });
});
