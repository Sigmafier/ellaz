// The soak test: thousands of hands of seeded random agents with joins,
// leaves, sit-outs, rebuys and timeouts, asserting after every command that
// chips are conserved, no stack goes negative, and every hand terminates.
//
// Chip conservation is bookkept externally: buy-ins and rebuys add to the
// expected total, cash-outs (SeatChanged leave, which carries the stack that
// walked away) subtract. totalChips(state) must equal the expectation after
// EVERY apply — not just at hand end — which is what catches a leak inside a
// street rather than three hands later.

import { describe, expect, it } from "vitest";
import { computeLegal } from "./betting";
import { mulberry32, seedFrom } from "./rng";
import { apply } from "./table";
import { eventOfType, totalChips } from "./testkit";
import { type Command, createTable, DEFAULT_CONFIG, type EngineEvent } from "./types";

const HANDS = Number(process.env.SOAK_HANDS ?? 2000);
const SEEDS = ["soak-1", "soak-2", "soak-3"];

function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

describe("random-agent soak", () => {
  for (const seed of SEEDS) {
    it(`conserves chips over ${HANDS} hands (seed ${seed})`, () => {
      const rng = mulberry32(seedFrom(seed));
      let state = createTable({
        code: "SOAK1",
        ...DEFAULT_CONFIG,
        maxSeats: 9,
        sb: 1,
        bb: 2,
        minBuyIn: 40,
        maxBuyIn: 400,
      });
      let expected = 0;
      let nextPlayer = 0;
      const ctx = () => `seed=${seed} hand=${state.handCounter} phase=${state.phase}`;

      const run = (cmd: Command): EngineEvent[] => {
        const r = apply(state, cmd, rng);
        state = r.state;
        for (const e of eventOfType(r.events, "SeatChanged")) {
          if (e.change === "leave") expected -= e.stack ?? 0;
        }
        expect(totalChips(state), `conservation after ${cmd.type} (${ctx()})`).toBe(expected);
        for (const seat of state.seats) {
          expect(seat.stack, `negative stack (${ctx()})`).toBeGreaterThanOrEqual(0);
        }
        return r.events;
      };

      const sitSomeone = () => {
        const empty = state.seats.map((s, i) => (s.status === "empty" ? i : -1)).filter((i) => i >= 0);
        if (empty.length === 0) return;
        const seat = empty[randInt(rng, 0, empty.length - 1)];
        const buyIn = randInt(rng, 40, 400);
        expected += buyIn; // before run() — its assertion sees the new total
        run({ type: "sit", seat, playerId: `pl-${nextPlayer++}`, name: `P${seat}`, buyIn });
      };

      // Seed the table.
      for (let i = 0; i < 5; i++) sitSomeone();

      let hands = 0;
      let safety = 0;
      while (hands < HANDS && safety++ < HANDS * 600) {
        if (!state.hand) {
          // Between hands: random table churn.
          const roll = rng();
          if (roll < 0.08) sitSomeone();
          else if (roll < 0.12) {
            const occupied = state.seats
              .map((s, i) => (s.status !== "empty" && !s.pendingLeave ? i : -1))
              .filter((i) => i >= 0);
            if (occupied.length > 2) run({ type: "leave", seat: occupied[randInt(rng, 0, occupied.length - 1)] });
          } else if (roll < 0.16) {
            const active = state.seats.map((s, i) => (s.status === "active" ? i : -1)).filter((i) => i >= 0);
            if (active.length > 2) run({ type: "sitOut", seat: active[randInt(rng, 0, active.length - 1)] });
          } else if (roll < 0.22) {
            const out = state.seats.map((s, i) => (s.status === "sittingOut" ? i : -1)).filter((i) => i >= 0);
            if (out.length > 0) run({ type: "sitIn", seat: out[randInt(rng, 0, out.length - 1)] });
          }
          // Busted players top up (or eventually leave).
          for (let i = 0; i < state.seats.length; i++) {
            const seat = state.seats[i];
            if (seat.status === "active" && seat.stack === 0) {
              if (rng() < 0.8) {
                const amount = randInt(rng, 40, 200);
                expected += amount;
                run({ type: "rebuy", seat: i, amount });
              } else {
                run({ type: "leave", seat: i });
              }
            }
          }
          const before = state.handCounter;
          run({ type: "startHand" });
          if (state.handCounter === before) {
            // Not enough players — force reinforcements.
            sitSomeone();
            sitSomeone();
            continue;
          }
          hands += 1;
          continue;
        }

        // In a hand: the seat to act picks a weighted random legal action.
        const toAct = state.hand.toAct;
        expect(toAct, `hand with nobody to act (${ctx()})`).toBeGreaterThanOrEqual(0);
        const legal = computeLegal(state, toAct);
        expect(legal, `no legal actions for toAct (${ctx()})`).toBeTruthy();

        const roll = rng();
        if (roll < 0.04) {
          run({ type: "timeout", seat: toAct });
          continue;
        }
        if (roll < 0.06 && !state.hand.timeBankUsed[toAct]) {
          run({ type: "useTimeBank", seat: toAct });
          continue;
        }
        if (roll < 0.08 && state.seats[toAct].stack > 0) {
          const amount = randInt(rng, 10, 100);
          if (
            state.config.chipsMode !== "fresh" ||
            state.seats[toAct].stack + state.seats[toAct].pendingRebuy + amount <= state.config.maxBuyIn
          ) {
            expected += amount;
            run({ type: "rebuy", seat: toAct, amount });
          }
          continue;
        }

        const acts = legal!;
        let action: Extract<Command, { type: "act" }>["action"];
        const canCheck = acts.actions.includes("check");
        const canCall = acts.actions.includes("call");
        const canBet = acts.actions.includes("bet");
        const canRaise = acts.actions.includes("raise");
        const r2 = rng();
        if (canCheck && r2 < 0.5) action = { kind: "check" };
        else if (canCall && r2 < 0.6) action = { kind: "call" };
        else if (canBet && r2 < 0.75) {
          const to = rng() < 0.15 ? acts.maxBetTo! : randInt(rng, acts.minBetTo!, Math.min(acts.maxBetTo!, acts.minBetTo! + 40));
          action = { kind: "bet", to };
        } else if (canRaise && r2 < 0.82) {
          const to = rng() < 0.15 ? acts.maxRaiseTo! : randInt(rng, acts.minRaiseTo!, Math.min(acts.maxRaiseTo!, acts.minRaiseTo! + 40));
          action = { kind: "raise", to };
        } else if (canCall && r2 < 0.93) action = { kind: "call" };
        else if (canCheck) action = { kind: "check" };
        else action = { kind: "fold" };

        run({ type: "act", seat: toAct, actionSeq: state.hand.actionSeq, action });
      }

      expect(hands, `soak stalled: only ${hands} hands (${ctx()})`).toBe(HANDS);
    });
  }
});
