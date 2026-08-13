import { useEffect, useMemo, useState } from "react";
import { socket } from "../net/socket";
import { useApp } from "../state/store";
import type { Locale } from "../i18n";
import { makeT } from "../i18n";

/**
 * The bottom control strip. Fully authoritative: after sending an action the
 * bar disables until the next `you` arrives with a new actionSeq — there is
 * no optimistic state to roll back.
 */
export function ActionBar({ locale }: { locale: Locale }) {
  const { you, view, timer } = useApp();
  const t = makeT(locale);
  const [sentSeq, setSentSeq] = useState(-1);
  const [raiseTo, setRaiseTo] = useState(0);
  const [raiseOpen, setRaiseOpen] = useState(false);

  const legal = you?.legal ?? null;
  const mySeatIdx = you?.seatIdx ?? -1;
  const waiting = sentSeq >= 0 && you?.actionSeq === sentSeq;

  const bounds = useMemo(() => {
    if (!legal) return null;
    if (legal.actions.includes("raise")) return { min: legal.minRaiseTo!, max: legal.maxRaiseTo!, kind: "raise" as const };
    if (legal.actions.includes("bet")) return { min: legal.minBetTo!, max: legal.maxBetTo!, kind: "bet" as const };
    return null;
  }, [legal]);

  useEffect(() => {
    if (bounds) setRaiseTo(bounds.min);
    setRaiseOpen(false);
  }, [bounds?.min, bounds?.max]);

  useEffect(() => {
    // A fresh decision arrived — re-enable.
    setSentSeq(-1);
  }, [you?.actionSeq, you?.handNo]);

  if (!legal || mySeatIdx < 0) return null;

  const send = (action: "fold" | "check" | "call" | "bet" | "raise", amount?: number) => {
    setSentSeq(you!.actionSeq);
    socket.act(action, amount);
  };

  const pot = view?.hand?.potTotal ?? 0;
  const callAmt = legal.callAmount ?? 0;
  const canTimeBank = you!.timeBankAvailable && timer && !timer.timeBank && timer.seatIdx === mySeatIdx;

  const presets = bounds
    ? [
        { label: "MIN", value: bounds.min },
        { label: "½", value: Math.min(bounds.max, Math.max(bounds.min, Math.round(pot / 2))) },
        { label: "POT", value: Math.min(bounds.max, Math.max(bounds.min, pot)) },
        { label: t("allIn"), value: bounds.max },
      ]
    : [];

  return (
    <div
      dir="ltr"
      style={{
        position: "fixed",
        bottom: 0,
        insetInline: 0,
        padding: "10px 12px calc(10px + env(safe-area-inset-bottom))",
        background: "linear-gradient(transparent, rgba(0,0,0,.72) 30%)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 30,
      }}
    >
      {raiseOpen && bounds && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-2)",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", gap: 6, justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: "var(--gold)" }}>{raiseTo}</span>
            <div style={{ display: "flex", gap: 6 }}>
              {presets.map((p) => (
                <button
                  key={p.label}
                  className="btn ghost"
                  style={{ minHeight: 36, padding: "0 10px", fontSize: 13 }}
                  onClick={() => setRaiseTo(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <input
            type="range"
            min={bounds.min}
            max={bounds.max}
            value={raiseTo}
            onChange={(e) => setRaiseTo(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--gold)" }}
          />
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn danger" style={{ flex: 1 }} disabled={waiting} onClick={() => send("fold")}>
          {t("fold")}
        </button>
        {legal.actions.includes("check") ? (
          <button className="btn" style={{ flex: 1.2 }} disabled={waiting} onClick={() => send("check")}>
            {t("check")}
          </button>
        ) : legal.actions.includes("call") ? (
          <button className="btn" style={{ flex: 1.2 }} disabled={waiting} onClick={() => send("call")}>
            {t("call")} {callAmt}
          </button>
        ) : null}
        {bounds &&
          (raiseOpen ? (
            <button
              className="btn primary"
              style={{ flex: 1.4 }}
              disabled={waiting}
              onClick={() => send(bounds.kind, raiseTo)}
            >
              {t(bounds.kind === "bet" ? "bet" : "raise")} {raiseTo}
            </button>
          ) : (
            <button className="btn primary" style={{ flex: 1.4 }} disabled={waiting} onClick={() => setRaiseOpen(true)}>
              {t(bounds.kind === "bet" ? "bet" : "raise")}
            </button>
          ))}
        {canTimeBank && (
          <button className="btn ghost" style={{ minWidth: 56 }} onClick={() => socket.useTimeBank()}>
            ⏳
          </button>
        )}
      </div>
    </div>
  );
}
