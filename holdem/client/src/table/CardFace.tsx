import type { Card } from "@shared/engine/cards";
import { rankOf, suitOf } from "@shared/engine/cards";
import { SUIT_ICON } from "../ui/icons";

const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

/**
 * For the DOM only. The suit is drawn as SVG (`SUIT_ICON`); this is what
 * `data-card-suit` carries so a test can read a card without pixels.
 *
 * It used to be what the card RENDERED, and that was the single worst emoji in
 * this app: `♠` and `♣` are text characters, `♥` and `♦` have emoji
 * presentations, and several Android builds promote all four to full-colour
 * cartoons. The same card was a black spade on one phone and a glossy blue
 * pictogram on the next — at a poker table, where the suit is half of what a
 * card says.
 */
const SUIT_CHAR = ["♣", "♦", "♥", "♠"];

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
 * EVERY PART IS RENDERED, AND look.css DECIDES WHICH ARE SHOWN. Two of the
 * four corner indices and the big centre rank are display:none by default and
 * belong to other arms of the `cardface` axis. That costs four empty spans and
 * buys a card whose whole layout is restylable from one attribute on <html> —
 * where the alternative is a `variant` prop threaded through Table, Seat and
 * WinMoment, and a second copy of "what a card looks like" in TypeScript.
 *
 * Size, shape, corner radius, suit colour and the dealing animation are all
 * CSS now, driven by `--card-w`. Only that one number comes from JS, because
 * only that one number depends on the measured felt (see table/scale.ts).
 *
 * `dir="ltr"` on the card, always. A rank belongs at the top-LEFT corner in
 * every language — a Hebrew page must not mirror the deck.
 */
export function CardFace({ card, size = 44, delay = 0 }: { card: Card; size?: number; delay?: number }) {
  const suit = suitOf(card);
  const rank = RANKS[rankOf(card)];
  const pip = SUIT_CHAR[suit];
  const Suit = SUIT_ICON[suit];

  // The corner index scales with the card, with a floor: below about 9px a
  // "10" stops being two readable digits and becomes a smudge, and the hole
  // cards render at size 34. The floor is what keeps them legible there.
  const indexSize = Math.max(9, Math.round(size * 0.3));
  const pad = Math.max(2, Math.round(size * 0.07));

  const index = (
    <span
      className="hm-card-idx"
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
      <Suit size={Math.round(indexSize * 0.72)} />
    </span>
  );

  return (
    <div
      className="hm-card"
      dir="ltr"
      data-card-rank={rank}
      data-card-suit={pip}
      data-suit={suit}
      style={{
        position: "relative",
        // The ONE number from JS. Height, radius, colour and the deal
        // animation are all derived from it in look.css.
        ["--card-w" as string]: `${size}px`,
        background: "var(--card-face)",
        boxShadow: "0 2px 6px rgba(0,0,0,.45)",
        overflow: "hidden",
        // 380ms, up from 240. A card turning over is the single most-watched
        // thing on this screen and it was arriving faster than the eye tracks
        // it — the operator's word for the whole felt was "too fast". The
        // duration itself now lives in look.css so the `pace` axis can scale
        // every animation on the table with one number.
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="hm-card-idx-1" style={{ position: "absolute", top: pad, left: pad }}>
        {index}
      </div>
      {/* The same corner, rotated — which is what the real card does, and why
          a card is readable whichever way up it is picked up. */}
      <div
        className="hm-card-idx-2"
        style={{ position: "absolute", bottom: pad, right: pad, transform: "rotate(180deg)" }}
      >
        {index}
      </div>
      {/* The other two corners. Hidden unless the `quad` arm is picked. */}
      <div className="hm-card-idx-3" style={{ position: "absolute", top: pad, right: pad }}>
        {index}
      </div>
      <div
        className="hm-card-idx-4"
        style={{ position: "absolute", bottom: pad, left: pad, transform: "rotate(180deg)" }}
      >
        {index}
      </div>
      {/* The big centre rank — what the card leads with since 2026-08-15.
          Its SIZE is in look.css as a multiple of `--card-w`, not here: `clean`
          wants a bigger rank than `big` does (nothing is sharing the card with
          it), and a number written inline cannot be told apart by an arm. */}
      <span
        className="hm-card-rank"
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: rank === "10" ? "-0.08em" : undefined,
        }}
      >
        {rank}
      </span>
      <span
        className="hm-card-pip"
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
          lineHeight: 1,
        }}
      >
        <Suit size={Math.round(size * 0.72)} />
      </span>
    </div>
  );
}

/**
 * The back of a card.
 *
 * The pattern is in look.css, not here. It was three hardcoded colours in this
 * function, and that made it the one surface on the whole table a palette
 * could not reach — every alternative skin rendered with the same maroon
 * backs, which read as unfinished for a reason that had nothing to do with the
 * skin being tried.
 */
export function CardBack({ size = 34 }: { size?: number }) {
  return (
    <div
      className="hm-card-back"
      style={{
        ["--card-w" as string]: `${size}px`,
        boxShadow: "0 1px 4px rgba(0,0,0,.4)",
      }}
    />
  );
}
