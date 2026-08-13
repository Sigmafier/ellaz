import type { PublicSeatView } from "@shared/engine/view";
import type { Card } from "@shared/engine/cards";
import { CardBack, CardFace } from "./CardFace";
import { TimerBar } from "./TimerBar";
import { useApp } from "../state/store";
import type { Locale } from "../i18n";
import { makeT } from "../i18n";

export function Seat({
  seat,
  x,
  y,
  isMe,
  locale,
  onSitHere,
}: {
  seat: PublicSeatView;
  x: number;
  y: number;
  isMe: boolean;
  locale: Locale;
  onSitHere: (() => void) | null;
}) {
  const { view, you, reveals, lastAction, winners } = useApp();
  const t = makeT(locale);
  const hand = view?.hand ?? null;
  const isButton = view?.buttonSeat === seat.seat;
  const toAct = hand?.toAct === seat.seat;
  const revealed = reveals[seat.seat];
  const won = winners.includes(seat.seat);

  const box: React.CSSProperties = {
    position: "absolute",
    left: `${x}%`,
    top: `${y}%`,
    transform: "translate(-50%, -50%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    minWidth: 76,
  };

  if (seat.status === "empty") {
    if (!onSitHere) return <div id={`seat-${seat.seat}`} style={box} />;
    return (
      <div id={`seat-${seat.seat}`} style={box}>
        <button
          className="btn ghost"
          style={{ minHeight: 40, fontSize: 13, padding: "0 12px", opacity: 0.8 }}
          onClick={onSitHere}
        >
          {t("sitHere")}
        </button>
      </div>
    );
  }

  const dim = seat.folded || seat.sittingOut;
  return (
    <div id={`seat-${seat.seat}`} style={{ ...box, opacity: dim ? 0.45 : 1 }}>
      {/* cards */}
      <div style={{ display: "flex", gap: 3, minHeight: 40, alignItems: "flex-end" }}>
        {hand && seat.inHand && !seat.folded ? (
          isMe && you?.hole ? (
            <>
              <CardFace card={you.hole[0]} size={38} />
              <CardFace card={you.hole[1]} size={38} delay={80} />
            </>
          ) : revealed && revealed !== "muck" ? (
            <>
              <CardFace card={revealed[0] as Card} size={38} />
              <CardFace card={revealed[1] as Card} size={38} delay={80} />
            </>
          ) : (
            <>
              <CardBack size={30} />
              <CardBack size={30} />
            </>
          )
        ) : null}
      </div>

      {/* nameplate */}
      <div
        style={{
          background: toAct ? "var(--seat-active)" : "var(--seat-bg)",
          border: won ? "2px solid var(--gold)" : "1px solid var(--line)",
          borderRadius: "var(--radius-1)",
          padding: "4px 10px",
          textAlign: "center",
          minWidth: 76,
          animation: toAct ? "holdem-pulse 1.6s infinite" : undefined,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis" }}>
          <bdi>{seat.name}</bdi> {isMe ? `(${t("you")})` : ""}
        </div>
        <div style={{ fontSize: 13, color: "var(--gold)", fontWeight: 800 }}>{seat.stack}</div>
        {seat.allIn && <div style={{ fontSize: 11, color: "var(--danger)", fontWeight: 800 }}>{t("allIn")}</div>}
        {revealed === "muck" && <div style={{ fontSize: 11, color: "var(--ink-dim)" }}>{t("mucked")}</div>}
        {!seat.allIn && lastAction[seat.seat] && !toAct && (
          <div style={{ fontSize: 11, color: "var(--ink-dim)" }}>{actionLabel(lastAction[seat.seat], locale)}</div>
        )}
      </div>

      <TimerBar seatIdx={seat.seat} />

      {/* committed chips in front of the seat */}
      {seat.committed > 0 && (
        <div
          style={{
            background: "rgba(0,0,0,.4)",
            borderRadius: "var(--radius-pill)",
            padding: "2px 9px",
            fontSize: 12,
            fontWeight: 800,
            color: "var(--chip)",
          }}
        >
          ● {seat.committed}
        </div>
      )}

      {isButton && (
        <div
          style={{
            position: "absolute",
            insetInlineEnd: -10,
            top: "38%",
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#fff",
            color: "#222",
            fontSize: 11,
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
