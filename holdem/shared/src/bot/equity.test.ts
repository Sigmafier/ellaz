// The bot's only opinion about how strong a hand is, checked against numbers
// that exist outside this repo.
//
// Published all-in preflop equities (2 players, hero vs one uniformly random
// hand) are stable to a tenth of a point across every solver that computes
// them, so they are a real external control rather than a snapshot of whatever
// this file happened to return the first time it ran.
//
// They are also the duplicate-card control. Drawing WITH replacement — or
// forgetting to remove the hero's own cards from the deck — still returns a
// perfectly plausible number, and there is no way to see it from the result.
// But it cannot return 85.2 for aces, because an opponent who can be dealt one
// of the hero's aces is playing a different game.

import { describe, expect, it } from "vitest";
import { cardFromCode, type Card } from "../engine/cards";
import { mulberry32, seedFrom } from "../engine/rng";
import { equity } from "./equity";

const hand = (a: string, b: string): readonly [Card, Card] => [cardFromCode(a), cardFromCode(b)];
const cards = (...codes: string[]): Card[] => codes.map(cardFromCode);
const rngFor = (name: string) => mulberry32(seedFrom(name));

// 6,000 samples put the standard error near half a point, so a 2-point window
// is four sigma — and the seeds are FIXED, so these are pinned values rather
// than a coin flip that usually lands. The window states the intent: it is
// wide enough that a legitimate change to the sampler is not a failure, and
// narrow enough that a wrong evaluator or a wrong deal cannot fit inside it.
//
// The number is also a budget. At 20,000 this file alone took 18 seconds of
// `npm test`, which is how a suite stops being run.
const N = 6_000;
const TOL = 0.02;

const near = (actual: number, expected: number) => {
  expect(actual).toBeGreaterThan(expected - TOL);
  expect(actual).toBeLessThan(expected + TOL);
};

describe("equity — against published preflop numbers", () => {
  it("rates aces at 85.2% against one random hand", () => {
    near(equity(hand("As", "Ah"), [], 1, N, rngFor("aa-1")), 0.852);
  });

  it("rates aces at 63.9% against three random hands", () => {
    // Every extra opponent is another chance to be outdrawn, and the drop from
    // 85 to 64 is why a bot's bar has to move with the size of the field
    // rather than being one number.
    near(equity(hand("As", "Ah"), [], 3, N, rngFor("aa-3")), 0.639);
  });

  it("rates seven-deuce offsuit at 34.6% against one random hand", () => {
    // The control that matters: a function returning a plausible high number
    // for everything passes every aces test ever written.
    near(equity(hand("7c", "2d"), [], 1, N, rngFor("72o")), 0.346);
  });

  it("orders aces above kings above seven-deuce", () => {
    const aa = equity(hand("As", "Ah"), [], 1, N, rngFor("ord"));
    const kk = equity(hand("Ks", "Kh"), [], 1, N, rngFor("ord"));
    const junk = equity(hand("7c", "2d"), [], 1, N, rngFor("ord"));
    expect(aa).toBeGreaterThan(kk);
    expect(kk).toBeGreaterThan(junk);
  });
});

describe("equity — certainties, where Monte Carlo must be exact", () => {
  it("is 1 for a hand nothing can beat", () => {
    // Hero holds the royal. Nothing left to come, no opponent holding is
    // better, so this is not an estimate and the tolerance is zero.
    expect(equity(hand("As", "Ts"), cards("Ks", "Qs", "Js", "2c", "3d"), 3, 500, rngFor("nuts"))).toBe(1);
  });

  it("splits a board everyone plays", () => {
    // The royal IS the board: every player has the identical hand, so a
    // two-handed pot is worth exactly half and a four-handed one a quarter.
    // The only assertion that exercises the tie arithmetic — and a bot scoring
    // a chop as a win would call off its stack on every paired board.
    const board = cards("As", "Ks", "Qs", "Js", "Ts");
    expect(equity(hand("2c", "3d"), board, 1, 400, rngFor("chop-1"))).toBe(0.5);
    expect(equity(hand("2c", "3d"), board, 3, 400, rngFor("chop-3"))).toBe(0.25);
  });

  it("rates a busted hand on the river low", () => {
    // Nothing but a nine-high board to play: any pair, any ten, any spade
    // draw already home — all of it is ahead.
    expect(equity(hand("2c", "3d"), cards("As", "Ks", "Qs", "Jh", "9d"), 2, N, rngFor("busted"))).toBeLessThan(0.2);
  });
});

describe("equity — the mechanics", () => {
  it("replays exactly on the same seed", () => {
    const a = equity(hand("9c", "9d"), cards("2h", "7s", "Kd"), 2, 1_000, rngFor("replay"));
    const b = equity(hand("9c", "9d"), cards("2h", "7s", "Kd"), 2, 1_000, rngFor("replay"));
    expect(a).toBe(b);
  });

  it("values a draw well above the nothing it currently holds", () => {
    // As 5s on Ks 7s 2d has not made a hand — five high, no pair. A made-hand
    // heuristic scores it as air and folds. Simulating the turn and river
    // prices the nut flush draw at roughly what it is worth, which is the
    // whole reason this is a simulation rather than a chart.
    const drawing = equity(hand("As", "5s"), cards("Ks", "7s", "2d"), 1, N, rngFor("draw"));
    const air = equity(hand("Ac", "5d"), cards("Ks", "7s", "2d"), 1, N, rngFor("draw"));
    expect(drawing).toBeGreaterThan(air + 0.1);
  });

  it("is worth less the more opponents are in the pot", () => {
    const heads = equity(hand("Kd", "Kc"), cards("9h", "4s", "2d"), 1, N, rngFor("many"));
    const four = equity(hand("Kd", "Kc"), cards("9h", "4s", "2d"), 4, N, rngFor("many"));
    expect(heads).toBeGreaterThan(four + 0.2);
  });
});
