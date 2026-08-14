import { useEffect, useState } from "react";
import { cardCode } from "@shared/engine/cards";
import type { EngineEvent } from "@shared/engine/types";
import { socket } from "../net/socket";
import { useApp } from "../state/store";
import { Sheet } from "./RoomScreen";
import type { Locale } from "../i18n";
import { makeT } from "../i18n";
import { SuitClub, SuitDiamond, SuitHeart, SuitSpade } from "../ui/icons";

const SUIT_CHAR: Record<string, string> = { c: "♣", d: "♦", h: "♥", s: "♠" };
const SUIT_EL: Record<string, () => JSX.Element> = {
  "♣": () => <SuitClub size={11} />,
  "♦": () => <SuitDiamond size={11} />,
  "♥": () => <SuitHeart size={11} />,
  "♠": () => <SuitSpade size={11} />,
};

const pretty = (c: number) => {
  const code = cardCode(c);
  return code[0].replace("T", "10") + SUIT_CHAR[code[1]];
};

/**
 * Swap the suit characters in a finished line for drawn ones.
 *
 * The log is built as STRINGS because every line is an i18n template with
 * names and amounts interpolated into it, and that is the right shape for
 * translated prose. So the substitution happens at render time instead of
 * turning six `push` sites into JSX — the pipeline keeps its strings and the
 * suits still stop being a font the phone chose.
 */
function withSuits(text: string) {
  const parts = text.split(/([♣♦♥♠])/);
  return parts.map((part, i) => {
    const El = SUIT_EL[part];
    return El ? (
      <span key={i} style={{ display: "inline-flex", verticalAlign: "-1px" }}>
        <El />
      </span>
    ) : (
      part
    );
  });
}

export function HistoryPanel({ locale, onClose }: { locale: Locale; onClose: () => void }) {
  const { history, replay } = useApp();
  const t = makeT(locale);
  const [openHand, setOpenHand] = useState<number | null>(null);

  useEffect(() => {
    socket.getHistory();
  }, []);

  useEffect(() => {
    if (openHand !== null) socket.getHand(openHand);
  }, [openHand]);

  return (
    <Sheet onClose={onClose}>
      <strong style={{ fontSize: 18 }}>{t("history")}</strong>
      <div style={{ maxHeight: "60vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {(history ?? []).map((h) => (
          <div key={h.handNo} style={{ background: "var(--surface-2)", borderRadius: "var(--radius-1)", padding: 10 }}>
            <button
              style={{ width: "100%", background: "none", color: "inherit", textAlign: "start", padding: 0 }}
              onClick={() => setOpenHand(openHand === h.handNo ? null : h.handNo)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <span>
                  {t("handNo")} #{h.handNo} · {t("pot")} {h.potTotal}
                </span>
                <span style={{ color: "var(--gold)", fontWeight: 700 }}>
                  {h.winners.map((w) => h.names[w]).join(", ")}
                </span>
              </div>
              <div dir="ltr" style={{ fontSize: 13, color: "var(--ink-dim)", textAlign: "left" }}>
                {withSuits(h.board.map(pretty).join(" "))}
              </div>
            </button>
            {openHand === h.handNo && replay?.handNo === h.handNo && (
              <ReplayLines events={replay.events} names={h.names} locale={locale} />
            )}
          </div>
        ))}
        {(history ?? []).length === 0 && <span style={{ color: "var(--ink-dim)" }}>—</span>}
      </div>
    </Sheet>
  );
}

function ReplayLines({ events, names, locale }: { events: EngineEvent[]; names: Record<number, string>; locale: Locale }) {
  const t = makeT(locale);
  const name = (seat: number) => names[seat] ?? `#${seat}`;
  const lines: string[] = [];
  for (const e of events) {
    switch (e.type) {
      case "BlindPosted":
        lines.push(`${name(e.seat)} — ${e.kind === "sb" ? t("blindPostSb") : e.kind === "bb" ? t("blindPostBb") : t("blindPostLive")} ${e.amount}`);
        break;
      case "HoleCardsDealt":
        lines.push(`${name(e.seat)}: ${e.cards.map(pretty).join(" ")}`);
        break;
      case "ActionTaken":
        lines.push(`${name(e.seat)} — ${t(e.kind as "fold")}${e.to ? ` ${e.to}` : ""}`);
        break;
      case "StreetDealt":
        lines.push(`${t(`street_${e.street}` as "street_flop")}: ${e.cards.map(pretty).join(" ")}`);
        break;
      case "ShowdownReveal":
        lines.push(e.mucked ? `${name(e.seat)} — ${t("mucked")}` : `${name(e.seat)}: ${e.cards!.map(pretty).join(" ")}`);
        break;
      case "PotAwarded":
        lines.push(`${t("pot")} ${e.amount} → ${e.winners.map(name).join(", ")}`);
        break;
      case "Refund":
        lines.push(`${name(e.seat)} — ${t("refund")} ${e.amount}`);
        break;
    }
  }
  return (
    <div style={{ marginTop: 8, borderTop: "1px solid var(--line)", paddingTop: 8, fontSize: 13, display: "flex", flexDirection: "column", gap: 3 }}>
      {lines.map((l, i) => (
        <div key={i}>
          <bdi>{withSuits(l)}</bdi>
        </div>
      ))}
    </div>
  );
}
