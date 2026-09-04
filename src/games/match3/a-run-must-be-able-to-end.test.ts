/**
 * Match Three has to be able to FINISH, and a finished round is not a finish.
 *
 * Reported 2026-09-04: "the play again / share should show only upon completion
 * and not in continuous plays" (issue #27). The offer was gated correctly -
 * `GameHost` shows it on `runEnded`, and `winMoment` derived that from
 * `reason === "level_complete"`. Match Three simply reported `level_complete`
 * on every round and then carried on, so the gate was told the truth about the
 * reason and a falsehood about the run. And underneath that: the game had no
 * ending at all, so there was no moment the offer COULD have belonged to.
 *
 * WHAT THIS FILE HOLDS, and each cell is a thing that was wrong or could be:
 *
 *   1. a run ends - the budget drains and `isOver` becomes true;
 *   2. a completed round hands moves BACK, so finishing one is a reprieve;
 *   3. a refused swap is free, because looking is not playing;
 *   4. a finished run refuses input, so nobody scores under the game-over card;
 *   5. the round win says `runEnded: false` while still paying `level_complete`
 *      - the payout and the finish are two different questions;
 *   6. the end of the run is NOT a winMoment, so failing earns nothing.
 *
 * 5 and 6 are SOURCE assertions: vitest runs the node environment over
 * `src/**\/*.test.ts` with no DOM, so `Match3Game.tsx` cannot be rendered and
 * read back. They can refuse a shape and never prove a pixel.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEVELS, isOver, newGame, swapAt, type Difficulty, type Match3State } from "./logic";

const GAME = readFileSync(new URL("./Match3Game.tsx", import.meta.url), "utf8");

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Play a whole run out, uniformly at random. Returns where it stopped. */
function playOut(level: Difficulty, seed: number) {
  const rng = mulberry32(seed);
  let state: Match3State = newGame(level, rng);
  let swaps = 0;
  let rounds = 0;
  for (let guard = 0; guard < 20_000 && !isOver(state); guard += 1) {
    let played = false;
    for (let i = 0; i < state.size * state.size && !played; i += 1) {
      for (const j of [i + 1, i + state.size]) {
        const next = swapAt(state, i, j, rng);
        if (next.outcome.kind === "matched") {
          if (next.outcome.roundUp > 0) rounds += 1;
          state = next.state;
          swaps += 1;
          played = true;
          break;
        }
      }
    }
    if (!played) break;
  }
  return { state, swaps, rounds };
}

describe("a Match Three run ends", () => {
  it("drains the budget and finishes, on every level", () => {
    for (const level of ["easy", "medium", "hard"] as const) {
      const { state, swaps } = playOut(level, 4242);
      expect(isOver(state), `${level} never ended`).toBe(true);
      // Not INSTANTLY, either - a run that ends in three swaps is as broken as
      // one that never ends, and only one of those two looks like a bug.
      expect(swaps, `${level} ended after only ${swaps} swaps`).toBeGreaterThan(30);
    }
  });

  it("hands moves back for a completed round, so a round is a reprieve", () => {
    const { state, rounds } = playOut("easy", 4242);
    expect(rounds).toBeGreaterThan(1);
    // The budget outlived its starting value, which is only possible if the
    // bonus was actually paid. Without the refund a run would be exactly
    // `moves` swaps long and this would be false.
    expect(state.moves).toBeGreaterThan(LEVELS.easy.moves);
  });

  it("charges nothing for a swap that does not match", () => {
    const rng = mulberry32(7);
    const start = newGame("easy", rng);
    // Every adjacent pair, until one is refused. A refused swap must leave the
    // budget alone: a child trying something that turns out not to work has
    // looked, not played.
    let sawRejection = false;
    for (let i = 0; i < start.size * start.size && !sawRejection; i += 1) {
      for (const j of [i + 1, i + start.size]) {
        const next = swapAt(start, i, j, rng);
        if (next.outcome.kind === "rejected") {
          expect(next.state.movesLeft).toBe(start.movesLeft);
          sawRejection = true;
          break;
        }
      }
    }
    // The instrument must have actually seen one, or this cell passes on a
    // board that happened to have no refusable pair.
    expect(sawRejection, "no rejected swap on this board - the cell proved nothing").toBe(true);
  });

  it("refuses every swap once the run is over", () => {
    const { state } = playOut("hard", 99);
    expect(isOver(state)).toBe(true);
    const before = state.score;
    for (let i = 0; i < state.size * state.size; i += 1) {
      for (const j of [i + 1, i + state.size]) {
        expect(swapAt(state, i, j, mulberry32(1)).outcome.kind).toBe("ignored");
      }
    }
    expect(state.score).toBe(before);
  });

  it("pays a round as level_complete but does NOT call it the end of the run", () => {
    // Both halves matter. Downgrading the reason to `milestone` would have
    // fixed the button and cut the reward from 8 coins to 1 (economy.ts).
    expect(GAME).toMatch(/reason: "level_complete"/);
    expect(GAME).toMatch(/runEnded: false/);
  });

  it("does not pay coins for running out of moves", () => {
    // The game-over branch records the score and announces the chip. A
    // `winMoment` there would grant a reward for failing.
    const branch = GAME.slice(GAME.indexOf("if (outcome.over)"));
    const end = branch.indexOf("\n    },");
    const body = branch.slice(0, end === -1 ? 800 : end);
    expect(body).toMatch(/announceWinShare/);
    expect(body).toMatch(/runEnded: true/);
    expect(body).not.toMatch(/winMoment/);
  });

  it("does not save a finished run as a resumable position", () => {
    expect(GAME).toMatch(/isOver\(state\) \? null : \{ state \}/);
  });
});
