import type { Card } from "@shared/engine/cards";
import { rankOf, suitOf } from "@shared/engine/cards";

const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const SUITS = ["♣", "♦", "♥", "♠"];

export function CardFace({ card, size = 44, delay = 0 }: { card: Card; size?: number; delay?: number }) {
  const suit = suitOf(card);
  const red = suit === 1 || suit === 2;
  return (
    <div
      style={{
        width: size,
        height: size * 1.4,
        borderRadius: size * 0.14,
        background: "var(--card-face)",
        color: red ? "var(--card-red)" : "var(--card-black)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: size * 0.42,
        lineHeight: 1,
        boxShadow: "0 2px 6px rgba(0,0,0,.45)",
        animation: `holdem-flip-in 240ms var(--ease) both`,
        animationDelay: `${delay}ms`,
      }}
    >
      <span>{RANKS[rankOf(card)]}</span>
      <span style={{ fontSize: size * 0.42 }}>{SUITS[suit]}</span>
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
