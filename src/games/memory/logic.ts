// Memory match — pure logic. Kid-friendly: tap a card, tap another; matches stay
// face-up. No drag. Deterministic given a RNG (for tests + replay).
import { shuffle } from "@shared/rng";

// Re-exported: this module was the original home of `shuffle`, and callers
// (including logic.test.ts) still import it from here.
export { shuffle };

export interface Card {
  id: number; // unique per card instance
  face: string; // the emoji/symbol; pairs share the same face
  flipped: boolean;
  matched: boolean;
}

export interface MemoryState {
  cards: Card[];
  firstPick: number | null; // index into cards
  lock: boolean; // true while a mismatched pair is shown
  moves: number;
  matchedPairs: number;
  totalPairs: number;
}

export function newGame(faces: string[], rng: () => number = Math.random): MemoryState {
  const deck = shuffle([...faces, ...faces], rng).map((face, id) => ({
    id,
    face,
    flipped: false,
    matched: false,
  }));
  return {
    cards: deck,
    firstPick: null,
    lock: false,
    moves: 0,
    matchedPairs: 0,
    totalPairs: faces.length,
  };
}

export type FlipOutcome =
  | { kind: "ignored" }
  | { kind: "revealed"; index: number }
  | { kind: "matched"; a: number; b: number }
  | { kind: "mismatch"; a: number; b: number };

// Attempt to flip the card at `index`. Returns the new state and what happened,
// so the renderer can play the right sound/juice. A mismatch leaves both cards
// flipped + sets lock; the caller resolves it with resolveMismatch() after a delay.
export function flip(state: MemoryState, index: number): { state: MemoryState; outcome: FlipOutcome } {
  const card = state.cards[index];
  if (state.lock || card.flipped || card.matched) {
    return { state, outcome: { kind: "ignored" } };
  }
  const cards = state.cards.map((c, i) => (i === index ? { ...c, flipped: true } : c));

  if (state.firstPick === null) {
    return { state: { ...state, cards, firstPick: index }, outcome: { kind: "revealed", index } };
  }

  const a = state.firstPick;
  const b = index;
  const moves = state.moves + 1;
  if (cards[a].face === cards[b].face) {
    const matchedCards = cards.map((c, i) =>
      i === a || i === b ? { ...c, matched: true } : c,
    );
    const matchedPairs = state.matchedPairs + 1;
    return {
      state: { ...state, cards: matchedCards, firstPick: null, moves, matchedPairs },
      outcome: { kind: "matched", a, b },
    };
  }
  return {
    state: { ...state, cards, firstPick: null, lock: true, moves },
    outcome: { kind: "mismatch", a, b },
  };
}

// Flip the mismatched pair back down and release the lock.
export function resolveMismatch(state: MemoryState, a: number, b: number): MemoryState {
  const cards = state.cards.map((c, i) =>
    i === a || i === b ? { ...c, flipped: false } : c,
  );
  return { ...state, cards, lock: false };
}

export function isWon(state: MemoryState): boolean {
  return state.matchedPairs === state.totalPairs;
}
