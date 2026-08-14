import { useEffect, useMemo, useState } from "react";
import { socket } from "../net/socket";
import { useApp } from "../state/store";
import { RAIL_W, type Shape } from "./scale";
import type { Locale } from "../i18n";
import { makeT } from "../i18n";

/**
 * The controls. Fully authoritative: after sending an action the bar disables
 * until the next `you` arrives with a new actionSeq — there is no optimistic
 * state to roll back.
 *
 * TWO SHAPES, and the wide one is the operator's own call (2026-08-14): they
 * play on a phone held sideways, where a full-width strip across the bottom
 * takes height from the one dimension a landscape phone has none of. Wide puts
 * the controls in a column at the inline end, and the felt takes the rest.
 *
 * `tall` keeps the bottom strip, which is right for a portrait phone: the
 * thumb rests at the bottom, not at the side.
 */
export function ActionBar({ locale, scale, shape }: { locale: Locale; scale: number; shape: Shape }) {
  const { you, view } = useApp();
  const t = makeT(locale);
  const [sentSeq, setSentSeq] = useState(-1);
  const [raiseTo, setRaiseTo] = useState(0);
  const [raiseOpen, setRaiseOpen] = useState(false);

  const legal = you?.legal ?? null;
  const mySeatIdx = you?.seatIdx ?? -1;
  const waiting = sentSeq >= 0 && you?.actionSeq === sentSeq;
  const wide = shape === "wide";

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

  // The rail must hold its width even when it is not this player's turn.
  // Collapsing it would resize the felt every time the action moved — the
  // whole table jumping a hundred pixels sideways twice a hand.
  if (!legal || mySeatIdx < 0) return wide ? <div style={{ width: RAIL_W, flex: "0 0 auto" }} /> : null;

  const send = (action: "fold" | "check" | "call" | "bet" | "raise", amount?: number) => {
    setSentSeq(you!.actionSeq);
    socket.act(action, amount);
  };

  const u = (n: number) => Math.round(n * scale);
  const pot = view?.hand?.potTotal ?? 0;
  const callAmt = legal.callAmount ?? 0;

  const presets = bounds
    ? [
        { label: "MIN", value: bounds.min },
        { label: "½", value: Math.min(bounds.max, Math.max(bounds.min, Math.round(pot / 2))) },
        { label: "POT", value: Math.min(bounds.max, Math.max(bounds.min, pot)) },
        { label: t("allIn"), value: bounds.max },
      ]
    : [];

  // Buttons never shrink below a 48px tap target, whatever the scale says.
  const tap = Math.max(48, u(46));
  const btn: React.CSSProperties = wide
    ? { width: "100%", minHeight: tap, fontSize: u(15) }
    : { flex: 1, minHeight: tap, fontSize: u(15) };

  const raisePanel = raiseOpen && bounds && (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-2)",
        padding: u(10),
        display: "flex",
        flexDirection: "column",
        gap: u(7),
      }}
    >
      <div style={{ display: "flex", gap: 6, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: u(22), fontWeight: 900, color: "var(--gold)" }}>{raiseTo}</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {presets.map((p) => (
            <button
              key={p.label}
              className="btn ghost"
              style={{ minHeight: Math.max(36, u(34)), padding: `0 ${u(10)}px`, fontSize: u(13) }}
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
  );

  const buttons = (
    <>
      <button className="btn danger" style={btn} disabled={waiting} onClick={() => send("fold")}>
        {t("fold")}
      </button>
      {legal.actions.includes("check") ? (
        <button className="btn" style={btn} disabled={waiting} onClick={() => send("check")}>
          {t("check")}
        </button>
      ) : legal.actions.includes("call") ? (
        <button className="btn" style={btn} disabled={waiting} onClick={() => send("call")}>
          {t("call")} {callAmt}
        </button>
      ) : null}
      {bounds &&
        (raiseOpen ? (
          <button className="btn primary" style={btn} disabled={waiting} onClick={() => send(bounds.kind, raiseTo)}>
            {t(bounds.kind === "bet" ? "bet" : "raise")} {raiseTo}
          </button>
        ) : (
          <button className="btn primary" style={btn} disabled={waiting} onClick={() => setRaiseOpen(true)}>
            {t(bounds.kind === "bet" ? "bet" : "raise")}
          </button>
        ))}
      {/* NO TIME-BANK BUTTON. There was an hourglass here and the operator
          could not tell what it did — which is the correct reaction to a
          control that asks you, mid-decision, to notice a clock and spend a
          reserve you were never told you had. The reserve still exists; the
          server spends it for you at the only moment it is worth spending
          (see the alarm branch in tableDO.ts), and the timer bar just grows.
          Fewer buttons at the exact moment the player is trying to think. */}
    </>
  );

  if (wide) {
    return (
      <div
        dir="ltr"
        style={{
          width: RAIL_W,
          flex: "0 0 auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: u(7),
          padding: `${u(8)}px ${u(8)}px calc(${u(8)}px + env(safe-area-inset-bottom))`,
          background: "linear-gradient(to left, rgba(0,0,0,.55), transparent)",
          zIndex: 30,
        }}
      >
        {/* The raise panel is wider than the rail, so it floats out over the
            felt rather than squeezing a slider into 100px. */}
        {raiseOpen && bounds && (
          <div style={{ position: "absolute", insetInlineEnd: RAIL_W + 8, bottom: 12, width: Math.min(300, u(280)), zIndex: 31 }}>
            {raisePanel}
          </div>
        )}
        {buttons}
      </div>
    );
  }

  return (
    <div
      dir="ltr"
      style={{
        position: "fixed",
        bottom: 0,
        insetInline: 0,
        padding: `${u(10)}px ${u(12)}px calc(${u(10)}px + env(safe-area-inset-bottom))`,
        background: "linear-gradient(transparent, rgba(0,0,0,.72) 30%)",
        display: "flex",
        flexDirection: "column",
        gap: u(8),
        zIndex: 30,
      }}
    >
      {raisePanel}
      <div style={{ display: "flex", gap: u(8) }}>{buttons}</div>
    </div>
  );
}
