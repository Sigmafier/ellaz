// Test helpers — NOT exported to server or client.
//
// Betting tests drive real commands through apply(); showdown tests that need
// known cards use rigCards() to overwrite the dealt holes and stack the deck
// so the flop/turn/river come out as written. States are plain data, so a
// test may edit a clone the same way the reducer does.

import { cards, freshDeck } from "./cards";
import type { Card } from "./cards";
import { mulberry32, seedFrom } from "./rng";
import { apply } from "./table";
import {
  type Command,
  createTable,
  DEFAULT_CONFIG,
  type EngineEvent,
  type TableConfig,
  type TableState,
} from "./types";

export interface TestPlayer {
  name: string;
  stack: number;
}

export function rig(seed = "test"): () => number {
  return mulberry32(seedFrom(seed));
}

export function newTable(
  players: (TestPlayer | null)[],
  config: Partial<Omit<TableConfig, "code">> = {},
): TableState {
  const maxSeats = config.maxSeats ?? Math.max(players.length, 2);
  let state = createTable({
    code: "TEST1",
    ...DEFAULT_CONFIG,
    minBuyIn: 1,
    maxBuyIn: 1_000_000,
    ...config,
    maxSeats,
  });
  players.forEach((p, i) => {
    if (!p) return;
    state = apply(state, {
      type: "sit",
      seat: i,
      playerId: `p${i}`,
      name: p.name,
      buyIn: p.stack,
    }).state;
  });
  return state;
}

export function start(state: TableState, seed = "hand"): { state: TableState; events: EngineEvent[] } {
  return apply(state, { type: "startHand" }, rig(seed));
}

/** Convenience: read the live actionSeq so tests never send a stale one. */
export function act(
  state: TableState,
  seat: number,
  action: Extract<Command, { type: "act" }>["action"],
): { state: TableState; events: EngineEvent[] } {
  return apply(state, { type: "act", seat, actionSeq: state.hand!.actionSeq, action });
}

/**
 * Overwrite the dealt cards mid-hand. `holes` maps seat index to a two-card
 * spec ("As Kd"); `board` is up to five cards dealt in street order. The deck
 * is restacked so upcoming streets deal exactly the given board.
 */
export function rigCards(
  state: TableState,
  holes: Record<number, string>,
  board = "",
): TableState {
  const s = structuredClone(state) as TableState;
  const hand = s.hand!;
  const used = new Set<Card>();
  for (const [seatStr, spec] of Object.entries(holes)) {
    const two = cards(spec);
    if (two.length !== 2) throw new Error(`need 2 hole cards for seat ${seatStr}`);
    hand.holes[Number(seatStr)] = [two[0], two[1]] as const;
  }
  for (const h of hand.holes) if (h) h.forEach((c) => used.add(c));
  const boardCards = board ? cards(board) : [];
  boardCards.forEach((c) => {
    if (used.has(c)) throw new Error("board card collides with a hole card");
    used.add(c);
  });
  const already = hand.board.length;
  const toCome = boardCards.slice(already);
  hand.board.forEach((c, i) => {
    if (boardCards[i] !== undefined && boardCards[i] !== c)
      throw new Error("board spec disagrees with cards already dealt");
  });
  const junk = freshDeck().filter((c) => !used.has(c) && !hand.board.includes(c));
  // dealStreet pops from the END: stack the remaining board in reverse.
  s.hand!.deck = [...junk, ...toCome.slice().reverse()];
  return s;
}

/** Sum of every seated player's chips (stack + committed) — the conservation probe. */
export function totalChips(state: TableState): number {
  return state.seats.reduce(
    (a, seat) => a + seat.stack + seat.totalCommitted + seat.pendingRebuy,
    0,
  );
}

export function eventOfType<T extends EngineEvent["type"]>(
  events: EngineEvent[],
  type: T,
): Extract<EngineEvent, { type: T }>[] {
  return events.filter((e) => e.type === type) as Extract<EngineEvent, { type: T }>[];
}
