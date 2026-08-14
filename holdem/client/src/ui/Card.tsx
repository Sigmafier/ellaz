// A playing card.
//
// Original: rank and pip drawn from the Unicode suit characters on a plain
// face. No trademarked deck design, no imported artwork, nothing to license —
// the same "original art and names only" line ellaz draws.

import { type Card as CardId, rankOf, RANK_CHARS, suitOf } from "@shared/engine/cards";

// Engine suit order is alphabetical: 0=c 1=d 2=h 3=s.
const PIPS = ["♣", "♦", "♥", "♠"] as const;
const RED = new Set([1, 2]);

export function Card({ card, mine = false }: { card: CardId; mine?: boolean }) {
  const suit = suitOf(card);
  const rank = RANK_CHARS[rankOf(card)];
  return (
    <div
      className={`card${RED.has(suit) ? " red" : ""}${mine ? " mine" : ""}`}
      // Screen readers and anyone who cannot tell the pips apart at 44px.
      aria-label={`${rank} of ${["clubs", "diamonds", "hearts", "spades"][suit]}`}
      role="img"
    >
      <span className="rank">{rank}</span>
      <span className="suit">{PIPS[suit]}</span>
    </div>
  );
}

/** A face-down card — someone else's hole cards. */
export function CardBack({ mine = false }: { mine?: boolean }) {
  return <div className={`card back${mine ? " mine" : ""}`} aria-label="face down card" role="img" />;
}
