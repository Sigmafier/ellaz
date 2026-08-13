// The privacy boundary: hole cards reach only their own seat, the deck reaches
// nobody, and mucked cards stay hidden in the history replay too.

import { describe, expect, it } from "vitest";
import { apply } from "./table";
import { act, eventOfType, newTable, rig, rigCards } from "./testkit";
import type { EngineEvent, TableState } from "./types";
import { publicView, redactEvent, redactHistory } from "./view";

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

describe("redactEvent", () => {
  it("delivers HoleCardsDealt only to its own seat, and never to spectators", () => {
    const r = startFixed(threeHanded());
    const deals = eventOfType(r.events, "HoleCardsDealt");
    expect(deals).toHaveLength(3);
    for (const deal of deals) {
      expect(redactEvent(deal, deal.seat)).toBe(deal);
      expect(redactEvent(deal, (deal.seat + 1) % 3)).toBeNull();
      expect(redactEvent(deal, -1)).toBeNull(); // spectator
    }
  });

  it("passes public events through untouched", () => {
    const r = startFixed(threeHanded());
    const started = eventOfType(r.events, "HandStarted")[0];
    expect(redactEvent(started, -1)).toBe(started);
  });
});

describe("publicView", () => {
  it("contains no deck and no hole cards anywhere", () => {
    const r = startFixed(threeHanded());
    const view = publicView(r.state);
    const json = JSON.stringify(view);
    expect(json).not.toContain("deck");
    expect(json).not.toContain("holes");
    expect(view.hand!.potTotal).toBe(3); // sb 1 + bb 2
    expect(view.hand!.toAct).toBe(0);
  });
});

describe("redactHistory", () => {
  it("keeps shown-down cards, strips mucked cards forever, keeps your own", () => {
    // Build a full hand where seat 2 mucks at showdown. The history is the
    // FULL event list including the HoleCardsDealt from the hand start.
    const started = startFixed(threeHanded());
    let s = rigCards(started.state, { 0: "As Ah", 1: "Ks Kd", 2: "8c 8d" }, "2c 7d 9h Jc 3s");
    const all: EngineEvent[] = [...started.events];
    const record = (events: EngineEvent[]) => all.push(...events);
    let r;
    r = act(s, 0, { kind: "call" });
    record(r.events);
    s = r.state;
    r = act(s, 1, { kind: "call" });
    record(r.events);
    s = r.state;
    r = act(s, 2, { kind: "check" });
    record(r.events);
    s = r.state;
    for (let i = 0; i < 2; i++) {
      for (const seat of [1, 2, 0]) {
        r = act(s, seat, { kind: "check" });
        record(r.events);
        s = r.state;
      }
    }
    r = act(s, 1, { kind: "bet", to: 20 });
    record(r.events);
    s = r.state;
    r = act(s, 2, { kind: "call" });
    record(r.events);
    s = r.state;
    r = act(s, 0, { kind: "call" });
    record(r.events);
    s = r.state;
    expect(s.hand).toBeNull();

    const reveals = eventOfType(all, "ShowdownReveal");
    expect(reveals.find((x) => x.seat === 2)!.mucked).toBe(true);

    // A stranger's replay: sees 0 and 1's hole cards (they showed), never 2's.
    const forOther = redactHistory(all, -1);
    const dealsSeen = eventOfType(forOther, "HoleCardsDealt").map((e) => e.seat);
    expect(dealsSeen.sort()).toEqual([0, 1]);

    // Seat 2's own replay still shows seat 2 their own cards.
    const forSelf = redactHistory(all, 2);
    const ownDeals = eventOfType(forSelf, "HoleCardsDealt").map((e) => e.seat);
    expect(ownDeals.sort()).toEqual([0, 1, 2]);
  });
});
