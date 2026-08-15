// Button and blind movement — the DEAD BUTTON rule, heads-up, and joiners.
//
// The anchor is the BIG BLIND: it always advances exactly one occupied,
// eligible seat per hand, so nobody is skipped and nobody posts it twice.
// The SB POSITION is the seat that posted BB last hand — if that player is
// gone, the SB is dead (position rests on the seat, nothing posted). The
// BUTTON POSITION is the seat that held the SB position last hand — it may
// rest on an empty seat (dead button). Positions are SEAT indices, players
// optional.
//
// Heads-up: the button IS the small blind, acts first preflop, last postflop.
// With exactly two eligible players the BB still advances one seat and the
// other player takes button+SB, which alternates correctly and handles the
// 3->2 transition without anyone posting BB twice where avoidable.
//
// Joiners/returners (`owesBB`): dealt in immediately by posting a live BB —
// except in the zone from the button (inclusive) to the BB (exclusive), the
// would-be SB/button seats, where they must wait. If the advancing BB lands on
// their own seat they simply post the BB naturally. Heads-up clears the debt:
// both players post every hand anyway.

import type { SeatState, TableState } from "./types";

export interface HandPositions {
  buttonSeat: number;
  /** Where the SB position rests (a seat index, possibly vacated). */
  smallBlindSeat: number;
  sbPosted: boolean;
  bigBlindSeat: number;
  /** Every seat dealt into this hand, in seat order. */
  dealtSeats: number[];
  /** Subset of dealtSeats that must post a live BB (joiners), excluding the natural BB. */
  livePostSeats: number[];
}

export function isEligible(seat: SeatState): boolean {
  return seat.status === "active" && seat.stack > 0;
}

/** Next seat index strictly after `from` (clockwise) satisfying pred, or -1. */
export function nextSeatWhere(
  seats: readonly SeatState[],
  from: number,
  pred: (s: SeatState, idx: number) => boolean,
): number {
  const n = seats.length;
  for (let k = 1; k <= n; k++) {
    const idx = (from + k) % n;
    if (pred(seats[idx], idx)) return idx;
  }
  return -1;
}

/** Seats reached walking clockwise from `from` (inclusive) before hitting `to`. */
function zoneSeats(from: number, to: number, n: number): Set<number> {
  const zone = new Set<number>();
  let s = ((from % n) + n) % n;
  while (s !== to) {
    zone.add(s);
    s = (s + 1) % n;
    if (zone.size > n) break; // degenerate guard
  }
  return zone;
}

/**
 * Compute the next hand's positions, or null if fewer than 2 players can be
 * dealt. Does not mutate state. `rng` is used only for the very first hand's
 * button draw.
 */
export function computePositions(state: TableState, rng: () => number): HandPositions | null {
  const seats = state.seats;
  const n = seats.length;
  const eligibleIdx: number[] = [];
  for (let i = 0; i < n; i++) if (isEligible(seats[i])) eligibleIdx.push(i);
  if (eligibleIdx.length < 2) return null;

  const headsUp = eligibleIdx.length === 2;

  let buttonSeat: number;
  let smallBlindSeat: number;
  let bigBlindSeat: number;

  if (state.bigBlindSeat < 0) {
    // First hand ever: draw the button among eligible seats.
    const btn = eligibleIdx[Math.floor(rng() * eligibleIdx.length)];
    if (headsUp) {
      buttonSeat = btn;
      smallBlindSeat = btn;
      bigBlindSeat = eligibleIdx.find((i) => i !== btn)!;
    } else {
      buttonSeat = btn;
      smallBlindSeat = nextSeatWhere(seats, btn, isEligible);
      bigBlindSeat = nextSeatWhere(seats, smallBlindSeat, isEligible);
    }
  } else {
    bigBlindSeat = nextSeatWhere(seats, state.bigBlindSeat, isEligible);
    if (headsUp) {
      buttonSeat = eligibleIdx.find((i) => i !== bigBlindSeat)!;
      smallBlindSeat = buttonSeat;
    } else {
      smallBlindSeat = state.bigBlindSeat;
      buttonSeat = state.smallBlindSeat >= 0 ? state.smallBlindSeat : smallBlindSeat;
    }
  }

  // Who is dealt in: every eligible seat, minus joiners stuck in the
  // button..BB zone (they wait). Heads-up ignores the zone entirely.
  const zone = headsUp ? new Set<number>() : zoneSeats(buttonSeat, bigBlindSeat, n);

  function deal(withZone: ReadonlySet<number>): { dealtSeats: number[]; livePostSeats: number[] } {
    const dealtSeats: number[] = [];
    const livePostSeats: number[] = [];
    for (const i of eligibleIdx) {
      const owes = seats[i].owesBB && !headsUp && i !== bigBlindSeat;
      if (owes && withZone.has(i)) continue; // must wait for the BB to reach them
      dealtSeats.push(i);
      if (owes) livePostSeats.push(i);
    }
    return { dealtSeats, livePostSeats };
  }

  let { dealtSeats, livePostSeats } = deal(zone);

  // THE ZONE YIELDS RATHER THAN STARVING THE TABLE.
  //
  // Waiting for the blind to reach you protects the players who have ALREADY
  // paid one, from somebody buying a late position for free. When every
  // eligible seat is a joiner there is nobody in that set: the rule excludes
  // everyone except the big blind, `dealtSeats` comes back with one member,
  // and this function returns null.
  //
  // That is not a pause. `owesBB` is cleared in exactly one place - being
  // dealt in - and the big blind only advances when a hand is dealt, so a
  // table in this state can never leave it. Measured on the live practice
  // table 2026-08-15: five funded players, phase pinned at "waiting", the
  // inter-hand alarm firing every 6.5 s and committing an EMPTY event list,
  // for as long as anyone cared to watch.
  //
  // And it is the NORMAL path there, not an exotic one. `sleepBots()` sits
  // every bot out when the last human leaves (which is what keeps that table
  // free) and `wakeBots()` sits them all back in on the next visit, so every
  // visit after the first makes the whole table owe a blind at the same
  // instant. Whether it wedges then comes down to where the button happens to
  // be: the zone runs from the previous SB to the new BB, so it is two seats
  // wide on a lucky day and five on an unlucky one.
  //
  // So when the zone would leave fewer than two players, it gives way and
  // everyone eligible is dealt. Nobody joins free - every one of them lands in
  // `livePostSeats` and posts a live blind, which is the fair outcome rather
  // than a waiver, and is exactly what the rule asks of an unzoned joiner
  // already.
  if (dealtSeats.length < 2) {
    ({ dealtSeats, livePostSeats } = deal(new Set()));
  }
  if (dealtSeats.length < 2) return null;

  // The SB is posted only when the seat holding the SB POSITION is actually
  // dealt into this hand. That covers both the dead SB (player busted or sat
  // out) and the subtler case of a brand-new player sitting in the exact seat
  // the previous BB vacated — eligible, but a zoned joiner, so not dealt and
  // not posting SB.
  const sbPosted = dealtSeats.includes(smallBlindSeat);

  // BB is always dealt (eligible and never zoned). SB/button positions may
  // rest on non-dealt seats — that is the dead button working as intended.
  return { buttonSeat, smallBlindSeat, sbPosted, bigBlindSeat, dealtSeats, livePostSeats };
}
