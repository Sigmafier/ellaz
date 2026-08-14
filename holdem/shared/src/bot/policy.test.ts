// What the bots must never do, and what they must sometimes do.
//
// The first half is the one that keeps a test run alive: an amount outside the
// legal bounds, or an action that was never offered, is rejected by the server
// with an `err` the bot has no handler for — so it sits there until the clock
// folds it, every hand, and the table looks broken in a way that has nothing to
// do with the code being tested.
//
// The second half is the point of the whole exercise. Bots that only check and
// call produce no pots, no shoves and no run-outs, which is the same as having
// no bots at all.

import { describe, expect, it } from "vitest";
import type { LegalActions } from "../engine/betting";
import { mulberry32, seedFrom } from "../engine/rng";
import { decide, JAM_AT, PERSONAS, type Persona, type Spot } from "./policy";

const byId = (id: string): Persona => {
  const p = PERSONAS.find((x) => x.id === id);
  if (!p) throw new Error(`no persona ${id}`);
  return p;
};

const station = byId("station");
const nit = byId("nit");
const maniac = byId("maniac");

/** An unbet street: check or bet. */
const unbet = (bb: number, stack: number): LegalActions => ({
  actions: ["check", "bet"],
  minBetTo: bb,
  maxBetTo: stack,
});

/** Facing a bet, with room to raise. */
const facing = (call: number, minRaiseTo: number, maxRaiseTo: number): LegalActions => ({
  actions: ["fold", "call", "raise"],
  callAmount: call,
  minRaiseTo,
  maxRaiseTo,
});

/** Facing a bet with no raise available — a shove, or the per-wager rule. */
const facingCapped = (call: number): LegalActions => ({
  actions: ["fold", "call"],
  callAmount: call,
});

describe("policy — the invariants that keep a table moving", () => {
  it("never names an action it was not offered, and never sizes outside the bounds", () => {
    const rng = mulberry32(seedFrom("bounds"));
    let bets = 0;
    for (let i = 0; i < 4_000; i++) {
      const bb = 2;
      const stack = 20 + Math.floor(rng() * 400);
      const pot = 2 + Math.floor(rng() * 300);
      const shape = rng();
      let legal: LegalActions;
      let betTo: number;
      if (shape < 0.4) {
        legal = unbet(bb, stack);
        betTo = 0;
      } else if (shape < 0.8) {
        const call = 1 + Math.floor(rng() * Math.min(stack, 120));
        betTo = call;
        legal = facing(call, call * 2, stack);
        // A raise band is only offered when it is real.
        if ((legal.minRaiseTo ?? 0) > (legal.maxRaiseTo ?? 0)) legal = facingCapped(call);
      } else {
        const call = 1 + Math.floor(rng() * stack);
        betTo = call;
        legal = facingCapped(call);
      }

      const spot: Spot = { legal, eq: rng(), pot, betTo };
      const persona = PERSONAS[Math.floor(rng() * PERSONAS.length)];
      const d = decide(spot, persona, rng());

      expect(legal.actions).toContain(d.action);

      if (d.action === "bet" || d.action === "raise") {
        bets++;
        const lo = (d.action === "raise" ? legal.minRaiseTo : legal.minBetTo) ?? 0;
        const hi = (d.action === "raise" ? legal.maxRaiseTo : legal.maxBetTo) ?? 0;
        expect(d.amount).toBeGreaterThanOrEqual(lo);
        expect(d.amount).toBeLessThanOrEqual(hi);
        expect(Number.isInteger(d.amount)).toBe(true);
      } else {
        expect(d.amount).toBeUndefined();
      }
    }
    // A positive control on the sweep itself: a run where nothing ever bet
    // would satisfy every bounds assertion above by vacuum.
    expect(bets).toBeGreaterThan(200);
  });

  it("never folds a free card", () => {
    const rng = mulberry32(seedFrom("free"));
    for (let i = 0; i < 500; i++) {
      for (const p of PERSONAS) {
        const d = decide({ legal: unbet(2, 200), eq: rng(), pot: 10, betTo: 0 }, p, rng());
        expect(d.action).not.toBe("fold");
      }
    }
  });

  it("folds rather than calling with nothing at a terrible price", () => {
    // 3% equity, paying 100 into a pot of 20. Nobody calls this.
    for (const p of PERSONAS) {
      const d = decide({ legal: facingCapped(100), eq: 0.03, pot: 20, betTo: 100 }, p, 0.5);
      expect(d.action).toBe("fold");
    }
  });
});

describe("policy — the aggression that makes a table worth watching", () => {
  it("gets every persona all in with the nuts", () => {
    for (const p of PERSONAS) {
      const d = decide({ legal: facing(20, 40, 400), eq: 1, pot: 60, betTo: 20 }, p, 0.5);
      expect(d.action).toBe("raise");
      expect(d.why).toBe("jam");
      expect(d.amount).toBe(400); // the whole stack, not a sized raise
    }
  });

  it("jams at the threshold and merely value-raises just below it", () => {
    const spot = (eq: number): Spot => ({ legal: facing(20, 40, 400), eq, pot: 60, betTo: 20 });
    expect(decide(spot(JAM_AT), station, 0.5).why).toBe("jam");
    expect(decide(spot(JAM_AT - 0.01), station, 0.5).why).toBe("value");
  });

  it("bets a strong hand into an unbet pot", () => {
    // 0.82 clears the station's own raiseAt of 0.80 and stays under JAM_AT.
    // The first version of this test used 0.75 and asserted a bet — it got a
    // check, because 0.75 is below that bar. The code was right and the test
    // was wrong, which is worth leaving a note about: every one of these
    // numbers has to be read against the persona it is handed to.
    const d = decide({ legal: unbet(2, 200), eq: 0.82, pot: 40, betTo: 0 }, station, 0.9);
    expect(d.action).toBe("bet");
    expect(d.why).toBe("value");
    expect(d.amount).toBe(20); // half of a 40 pot
  });

  it("sizes by the pot, not by the minimum", () => {
    const big = decide({ legal: unbet(2, 500), eq: 0.75, pot: 200, betTo: 0 }, maniac, 0.9);
    const small = decide({ legal: unbet(2, 500), eq: 0.75, pot: 20, betTo: 0 }, maniac, 0.9);
    expect(big.amount).toBe(200);
    expect(small.amount).toBe(20);
  });
});

describe("policy — the personas are actually different people", () => {
  const marginal: Spot = { legal: facingCapped(30), eq: 0.3, pot: 60, betTo: 30 };

  it("has the station call what the nit folds", () => {
    // Break-even here is 30/90 = 33%, so 30% equity is a thin fold at the bar
    // and a call for anyone paying less attention.
    expect(decide(marginal, station, 0.5).action).toBe("call");
    expect(decide(marginal, nit, 0.5).action).toBe("fold");
  });

  it("has the maniac raise what the nit checks behind", () => {
    const spot: Spot = { legal: unbet(2, 200), eq: 0.6, pot: 30, betTo: 0 };
    expect(decide(spot, maniac, 0.99).action).toBe("bet");
    expect(decide(spot, nit, 0.99).action).toBe("check");
  });

  it("bluffs as a maniac and never as a nit", () => {
    const air: Spot = { legal: unbet(2, 200), eq: 0.15, pot: 30, betTo: 0 };
    // The roll is the bluff draw: below the persona's frequency it fires.
    expect(decide(air, maniac, 0.01).action).toBe("bet");
    expect(decide(air, maniac, 0.01).why).toBe("bluff");
    expect(decide(air, maniac, 0.99).action).toBe("check");
    expect(decide(air, nit, 0.0001).action).toBe("check");
  });

  it("never bluff-raises a bet, only an unbet pot", () => {
    // Same air, but somebody has already bet. Bluff-raising at random reads as
    // a broken bot rather than a loose one, and it is expensive.
    const air: Spot = { legal: facing(25, 50, 300), eq: 0.15, pot: 50, betTo: 25 };
    for (const p of PERSONAS) {
      expect(decide(air, p, 0.0001).action).not.toBe("raise");
    }
  });
});
