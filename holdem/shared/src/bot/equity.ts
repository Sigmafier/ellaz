// How good is this hand, right now, against N unknown opponents?
//
// Monte Carlo over the REAL evaluator. That choice is the whole point of this
// file: a bot needs a number for "how strong am I", and the two ways to get one
// are a hand-written chart plus postflop heuristics, or dealing the rest of the
// deck a few hundred times and counting. The chart is more code, is wrong in
// ways nobody notices, needs a separate preflop and postflop brain, and — worst
// — is a SECOND opinion about what beats what. This has one opinion, the
// engine's own, so a bot can never disagree with the pot it is playing for.
//
// It also values draws for free. A flush draw on the flop is not a made hand
// and every made-hand heuristic rates it as nothing; simulating the turn and
// river rates it at roughly a third of the pot, which is what it is.
//
// NOT a solver, and not trying to be. It assumes every opponent holds two
// uniformly random cards, which is false at any real table and especially false
// facing a raise — a raiser's range is far better than random, so this
// systematically OVERRATES the hero when facing aggression. The policy layer
// compensates with a per-personality bar rather than pretending otherwise.

import type { Card } from "../engine/cards";
import { evaluate } from "../engine/evaluator";

/**
 * Win probability in [0, 1], counting a k-way tie as 1/k of a win.
 *
 * `rng` is required and has no default, the same discipline the engine uses for
 * dealing: the caller must decide whether this run is reproducible. Tests pass
 * `mulberry32(seedFrom(...))`; a live bot passes `Math.random`.
 *
 * `iters` trades noise for time. The standard error of a proportion is
 * sqrt(p(1-p)/n), so 300 iterations carry about +/- 3 points and 20,000 about
 * +/- 0.35. A bot deciding whether to call is choosing between actions whose
 * boundaries are tens of points apart, so 300 is plenty at the table and the
 * tests use far more because they are asserting against known numbers.
 */
export function equity(
  hole: readonly [Card, Card],
  board: readonly Card[],
  opponents: number,
  iters: number,
  rng: () => number,
): number {
  if (opponents <= 0) return 1;

  const dead = new Set<Card>([hole[0], hole[1], ...board]);
  const deck: Card[] = [];
  for (let c = 0; c < 52; c++) if (!dead.has(c)) deck.push(c);

  // Two cards per opponent, plus whatever is left to come.
  const runoutLen = 5 - board.length;
  const need = opponents * 2 + runoutLen;
  if (need > deck.length) return 1; // more players than cards; not reachable at a real table

  // Both hands are ALWAYS exactly 7 cards (2 hole + 5 board), which is the
  // evaluator's precomputed fast path. Allocated once and overwritten rather
  // than rebuilt, because this runs a few hundred thousand times a minute.
  const hero: Card[] = new Array(7);
  const vill: Card[] = new Array(7);
  hero[0] = hole[0];
  hero[1] = hole[1];
  for (let i = 0; i < board.length; i++) {
    hero[2 + i] = board[i];
    vill[2 + i] = board[i];
  }

  let won = 0;

  for (let it = 0; it < iters; it++) {
    // Partial Fisher-Yates: shuffle only the prefix we are about to read.
    // Drawing without replacement matters — two opponents cannot hold the same
    // card, and a with-replacement shortcut would quietly inflate flushes.
    for (let i = 0; i < need; i++) {
      const j = i + Math.floor(rng() * (deck.length - i));
      const t = deck[i];
      deck[i] = deck[j];
      deck[j] = t;
    }

    // The runout sits after the opponents' hole cards in that prefix.
    for (let i = 0; i < runoutLen; i++) {
      const c = deck[opponents * 2 + i];
      hero[2 + board.length + i] = c;
      vill[2 + board.length + i] = c;
    }

    const mine = evaluate(hero);

    let best = -1;
    let tied = 0;
    for (let v = 0; v < opponents; v++) {
      vill[0] = deck[v * 2];
      vill[1] = deck[v * 2 + 1];
      const s = evaluate(vill);
      if (s > best) {
        best = s;
        tied = 1;
      } else if (s === best) {
        tied++;
      }
    }

    if (mine > best) won += 1;
    else if (mine === best) won += 1 / (tied + 1);
  }

  return won / iters;
}
