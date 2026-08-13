// Cards are numbers 0..51, RANK-MAJOR: card = rank * 4 + suit.
// rank 0 = deuce … rank 12 = ace. suit 0=♣ 1=♦ 2=♥ 3=♠ (alphabetical cdhs).
// Rank-major means `rankOf` is a divide and comparing ranks never touches suit.

import { shuffle } from "./rng";

export type Card = number;

export const RANK_CHARS = "23456789TJQKA" as const;
export const SUIT_CHARS = "cdhs" as const;

export function rankOf(c: Card): number {
  return (c / 4) | 0;
}

export function suitOf(c: Card): number {
  return c % 4;
}

export function makeCard(rank: number, suit: number): Card {
  return rank * 4 + suit;
}

/** "As" → 51, "2c" → 0. Throws on garbage — cards never come from users. */
export function cardFromCode(code: string): Card {
  const r = RANK_CHARS.indexOf(code[0]);
  const s = SUIT_CHARS.indexOf(code[1]);
  if (r < 0 || s < 0 || code.length !== 2) throw new Error(`bad card code: ${code}`);
  return makeCard(r, s);
}

export function cardCode(c: Card): string {
  return RANK_CHARS[rankOf(c)] + SUIT_CHARS[suitOf(c)];
}

/** Convenience for tests: "As Kd 7c" or ["As","Kd"] → Card[]. */
export function cards(spec: string | readonly string[]): Card[] {
  const parts = typeof spec === "string" ? spec.trim().split(/\s+/) : spec;
  return parts.map(cardFromCode);
}

export function freshDeck(): Card[] {
  return Array.from({ length: 52 }, (_, i) => i);
}

export function shuffledDeck(rng: () => number): Card[] {
  return shuffle(freshDeck(), rng);
}
