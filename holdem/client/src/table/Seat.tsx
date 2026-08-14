import type { PublicSeatView } from "@shared/engine/view";
import type { Card } from "@shared/engine/cards";
import { CardBack, CardFace } from "./CardFace";
import { ChipStack } from "./ChipStack";
import { TimerBar } from "./TimerBar";
import { nameEmoji } from "@shared/names";
import { useApp } from "../state/store";
import type { Shape } from "./scale";
import type { Locale } from "../i18n";
import { makeT } from "../i18n";

export function Seat({
  seat,
  x,
  y,
  isMe,
  locale,
  scale,
  shape,
  onSitHere,
}: {
  seat: PublicSeatView;
  x: number;
  y: number;
  isMe: boolean;
  locale: Locale;
  /** One multiplier for every authored size. See scale.ts. */
  scale: number;
  shape: Shape;
  onSitHere: (() => void) | null;
}) {
  const { view, you, reveals, lastAction, winners, seatNames } = useApp();
  const t = makeT(locale);
  const hand = view?.hand ?? null;
  const isButton = view?.buttonSeat === seat.seat;
  const toAct = hand?.toAct === seat.seat;
  const revealed = reveals[seat.seat];
  const won = winners.includes(seat.seat);

  const u = (n: number) => Math.round(n * scale);

  /**
   * Wide lays the seat out as a ROW — cards beside the nameplate rather than
   * stacked above it. That is not a cosmetic preference: it takes a seat box
   * from ~115px tall to ~56, and on a landscape phone (roughly 235px of felt
   * height) the stacked version does not fit twice over plus a board. The
   * height reclaimed here is what lets everything else get bigger.
   */
  const wide = shape === "wide";

  const box: React.CSSProperties = {
    position: "absolute",
    left: `${x}%`,
    top: `${y}%`,
    transform: "translate(-50%, -50%)",
    display: "flex",
    flexDirection: wide ? "row" : "column",
    alignItems: "center",
    gap: u(4),
    minWidth: u(76),
  };

  if (seat.status === "empty") {
    if (!onSitHere) return <div id={`seat-${seat.seat}`} style={box} />;
    return (
      <div id={`seat-${seat.seat}`} style={box}>
        <button
          className="btn ghost"
          style={{ minHeight: Math.max(44, u(40)), fontSize: u(13), padding: `0 ${u(12)}px`, opacity: 0.8 }}
          onClick={onSitHere}
        >
          {t("sitHere")}
        </button>
      </div>
    );
  }

  const dim = seat.folded || seat.sittingOut;
  const holeSize = u(38);
  const backSize = u(30);

  return (
    <div id={`seat-${seat.seat}`} style={{ ...box, opacity: dim ? 0.45 : 1 }}>
      {/* cards */}
      <div style={{ display: "flex", gap: u(3), minHeight: u(40), alignItems: "flex-end" }}>
        {/* A REVEAL OUTLIVES THE HAND, and is therefore tested first.
            `view.hand` goes null the instant the pot is awarded, so gating
            every card on it meant the cards a player turned over were on
            screen for one frame and then gone — at an all-in, where the
            showdown and the end of the hand arrive in the same batch, nobody
            ever saw an opponent's hand at all. The reveal is cleared by the
            next HandStarted, so a shown hand stays up for the whole pause. */}
        {revealed && revealed !== "muck" ? (
          <>
            <CardFace card={revealed[0] as Card} size={holeSize} />
            <CardFace card={revealed[1] as Card} size={holeSize} delay={80} />
          </>
        ) : hand && seat.inHand && !seat.folded ? (
          isMe && you?.hole ? (
            <>
              <CardFace card={you.hole[0]} size={holeSize} />
              <CardFace card={you.hole[1]} size={holeSize} delay={80} />
            </>
          ) : (
            <>
              <CardBack size={backSize} />
              <CardBack size={backSize} />
            </>
          )
        ) : null}
      </div>

      {/* Nameplate and timer travel together as a COLUMN, whichever way the
          outer box runs. Left as siblings of the cards, the row layout put the
          64px timer bar out to the side of the nameplate, where it read as a
          gold wire connecting the seat to the dealer button. */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: u(3) }}>
      <div
        style={{
          background: toAct ? "var(--seat-active)" : "var(--seat-bg)",
          border: won ? `${Math.max(2, u(2))}px solid var(--gold)` : "1px solid var(--line)",
          borderRadius: "var(--radius-1)",
          padding: `${u(4)}px ${u(10)}px`,
          textAlign: "center",
          minWidth: u(76),
          animation: toAct ? "holdem-pulse 1.6s infinite" : undefined,
          // The chips landing. `won` is set by PotAwarded and cleared by the
          // next HandStarted, so this runs exactly once per hand won and needs
          // no timer of its own to take it away.
          boxShadow: won ? `0 0 ${u(18)}px var(--glow)` : undefined,
        }}
      >
        <div
          style={{
            fontSize: u(13),
            fontWeight: 700,
            whiteSpace: "nowrap",
            // Names come from a pool of 16 adjectives x 20 animals, so the
            // longest is fixed and knowable — "Cheerful Elephant" plus an emoji
            // and a "(you)" marker. 110 truncated the median name, not an
            // outlier: "Bold Badger (you)" came out as "Bold Badg…".
            maxWidth: u(160),
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {/* The animal is the seat's face. It comes from `names` beside the
              view, never from the engine's seat label — the engine holds an
              opaque string and must not learn about the word pool. */}
          <span aria-hidden>{nameEmoji(seatNames[seat.seat])}</span>{" "}
          <bdi>{seat.name}</bdi>
          {isMe && (
            <span style={{ opacity: 0.6, fontWeight: 600 }}> ({t("you")})</span>
          )}
        </div>
        <div
          style={{
            fontSize: u(14),
            color: "var(--gold)",
            fontWeight: 800,
            // A won stack pops once, so the number the player cares about is
            // the thing that moves rather than a border they have to notice.
            animation: won ? "holdem-pop 420ms var(--ease) both" : undefined,
          }}
        >
          {seat.stack}
        </div>
        {seat.allIn && <div style={{ fontSize: u(11), color: "var(--danger)", fontWeight: 800 }}>{t("allIn")}</div>}
        {revealed === "muck" && <div style={{ fontSize: u(11), color: "var(--ink-dim)" }}>{t("mucked")}</div>}
        {!seat.allIn && lastAction[seat.seat] && !toAct && (
          <div style={{ fontSize: u(11), color: "var(--ink-dim)" }}>{actionLabel(lastAction[seat.seat], locale)}</div>
        )}
      </div>
        <TimerBar seatIdx={seat.seat} width={u(64)} />
      </div>

      {/* Committed chips, always BELOW the box in both layouts. In the row
          layout they would otherwise be pushed out to the side, away from the
          pot they are travelling towards. */}
      {seat.committed > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginTop: u(3),
            whiteSpace: "nowrap",
            filter: "drop-shadow(0 2px 3px rgba(0,0,0,.6))",
          }}
        >
          {/* No pill here either — a bet in front of a seat is chips on the
              cloth. Two columns and three high, because this sits between a
              seat and the board and every pixel of height is contended.
              The exact number rides beside it. */}
          <ChipStack amount={seat.committed} scale={scale} size={11} maxColumns={2} maxPerColumn={3} />
        </div>
      )}

      {isButton && (
        <div
          style={{
            position: "absolute",
            insetInlineEnd: u(-10),
            top: "38%",
            width: u(20),
            height: u(20),
            borderRadius: "50%",
            background: "#fff",
            color: "#222",
            fontSize: u(11),
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,.5)",
          }}
        >
          D
        </div>
      )}
    </div>
  );
}

function actionLabel(kind: string, locale: Locale): string {
  const t = makeT(locale);
  switch (kind) {
    case "fold":
      return t("fold");
    case "check":
      return t("check");
    case "call":
      return t("call");
    case "bet":
      return t("bet");
    case "raise":
      return t("raise");
    default:
      return kind;
  }
}
