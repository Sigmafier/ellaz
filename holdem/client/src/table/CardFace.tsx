import type { Card } from "@shared/engine/cards";
import { rankOf, suitOf } from "@shared/engine/cards";

const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const SUITS = ["♣", "♦", "♥", "♠"];

/**
 * A playing card.
 *
 * The layout is the real one and not a stylistic choice: a corner INDEX (rank
 * over a small suit) at the top-left, the same thing rotated 180° at the
 * bottom-right, and a large suit in the middle. That arrangement exists so a
 * card can be read from a fanned hand where only its corner shows, and it is
 * what makes a rectangle read as a playing card rather than as a tile with a
 * letter on it.
 *
 * `dir="ltr"` on the card, always. A rank belongs at the top-LEFT corner in
 * every language — a Hebrew page must not mirror the deck.
 */
export function CardFace({ card, size = 44, delay = 0 }: { card: Card; size?: number; delay?: number }) {
  const suit = suitOf(card);
  const red = suit === 1 || suit === 2;
  const rank = RANKS[rankOf(card)];
  const pip = SUITS[suit];

  // The corner index scales with the card, with a floor: below about 9px a
  // "10" stops being two readable digits and becomes a smudge, and the hole
  // cards render at size 34. The floor is what keeps them legible there.
  const indexSize = Math.max(9, Math.round(size * 0.3));
  const pad = Math.max(2, Math.round(size * 0.07));

  const index = (
    <span
      aria-hidden
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        lineHeight: 0.95,
        fontSize: indexSize,
        fontWeight: 900,
        // "10" is twice as wide as every other rank and would otherwise push
        // the corner out of shape. Tightening only the digits keeps one
        // consistent corner width across all thirteen.
        letterSpacing: rank === "10" ? "-0.06em" : undefined,
      }}
    >
      <span>{rank}</span>
      <span style={{ fontSize: indexSize * 0.78 }}>{pip}</span>
    </span>
  );

  return (
    <div
      dir="ltr"
      data-card-rank={rank}
      data-card-suit={pip}
      style={{
        position: "relative",
        width: size,
        height: size * 1.4,
        borderRadius: size * 0.14,
        background: "var(--card-face)",
        color: red ? "var(--card-red)" : "var(--card-black)",
        boxShadow: "0 2px 6px rgba(0,0,0,.45)",
        overflow: "hidden",
        animation: `holdem-flip-in 240ms var(--ease) both`,
        animationDelay: `${delay}ms`,
      }}
    >
      <div style={{ position: "absolute", top: pad, left: pad }}>{index}</div>
      {/* The same corner, rotated — which is what the real card does, and why
          a card is readable whichever way up it is picked up. */}
      <div style={{ position: "absolute", bottom: pad, right: pad, transform: "rotate(180deg)" }}>
        {index}
      </div>
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // Big, and faded. At full strength it competes with the indices for
          // a glance that is only ever trying to read the corner; at this
          // weight it carries the suit as colour and shape from across a room.
          fontSize: size * 0.72,
          lineHeight: 1,
          opacity: 0.22,
        }}
      >
        {pip}
      </span>
    </div>
  );
}

export function CardBack({ size = 34 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size * 1.4,
        borderRadius: size * 0.14,
        background:
          "repeating-linear-gradient(45deg, #7a2c34 0 4px, #93414a 4px 8px)",
        border: "2px solid #5b1e25",
        boxShadow: "0 1px 4px rgba(0,0,0,.4)",
      }}
    />
  );
}
