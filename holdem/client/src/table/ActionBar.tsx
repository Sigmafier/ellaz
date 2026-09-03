import { useEffect, useMemo, useState } from "react";
import { socket } from "../net/socket";
import { useApp } from "../state/store";
import { canArmPreAction, preActionMove, stillArmed } from "./preAction";
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
 *
 * THE SAME BAR HOLDS THE PRE-ACTION, and that is the point of putting it here
 * rather than in the menu beside Sit out. Check/fold is a decision about the
 * hand in front of the player, taken with their thumb already resting where
 * the buttons are; the menu is platform chrome, and a control that belongs to
 * the game never moves into it (CLAUDE.md § What a child touches — the same
 * law, and this repo's other site is where it was written down).
 */
export function ActionBar({ locale, scale, shape }: { locale: Locale; scale: number; shape: Shape }) {
  const { you, view } = useApp();
  const t = makeT(locale);
  const [sentSeq, setSentSeq] = useState(-1);
  const [raiseTo, setRaiseTo] = useState(0);
  const [raiseOpen, setRaiseOpen] = useState(false);
  /**
   * The HAND the check/fold box was armed for, never a boolean.
   *
   * A boolean is a latch somebody has to remember to clear, and the hand it
   * survives into is the one the player was dealt aces in. Holding the hand
   * number makes "still armed" a comparison — see stillArmed() — so the
   * inter-hand pause (handNo -1) disarms it with no effect and no cleanup.
   */
  const [armedFor, setArmedFor] = useState<number | null>(null);

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

  const u = (n: number) => Math.round(n * scale);

  const send = (action: "fold" | "check" | "call" | "bet" | "raise", amount?: number) => {
    setSentSeq(you!.actionSeq);
    socket.act(action, amount);
  };

  // ---- the pre-action ------------------------------------------------------
  //
  // `legal` is non-null ONLY on this seat's turn (computeLegal says so), which
  // makes it both halves of the question: the box is offered while it is null
  // and fires the moment it is not.
  const armed = stillArmed(armedFor, you?.handNo);
  const autoMove = armed ? preActionMove(legal) : null;
  const canArm = canArmPreAction({
    seatIdx: mySeatIdx,
    handLive: !!view?.hand,
    yourTurn: legal !== null,
    seat: view?.seats[mySeatIdx],
  });

  useEffect(() => {
    if (!autoMove || waiting) return;
    // UNTICK FIRST, then act. The box does one thing and stops being armed, the
    // way a pre-action box unticks itself in every poker client — a player who
    // gave up on the flop has not also given up on the turn. Between this and
    // `armedFor` holding a hand number rather than a boolean, there is no path
    // by which one tick folds two decisions.
    setArmedFor(null);
    send(autoMove);
  }, [autoMove, waiting]);

  // The rail must hold its width even when it is not this player's turn.
  // Collapsing it would resize the felt every time the action moved — the
  // whole table jumping a hundred pixels sideways twice a hand.
  if (mySeatIdx < 0 || (!legal && !canArm)) return wide ? <div style={{ width: RAIL_W, flex: "0 0 auto" }} /> : null;
  const pot = view?.hand?.potTotal ?? 0;
  const callAmt = legal?.callAmount ?? 0;

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
      {legal?.actions.includes("check") ? (
        <button className="btn" style={btn} disabled={waiting} onClick={() => send("check")}>
          {t("check")}
        </button>
      ) : legal?.actions.includes("call") ? (
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

  /**
   * The check/fold box.
   *
   * A BUTTON, not a checkbox: it is a control that carries an instruction, and
   * a control the player is told to press has to answer a press with a finger
   * anywhere on it — a 12px tickbox is not that. Its state is the fill plus
   * `aria-pressed`, and the lamp beside the label is DRAWN (a div), never a
   * glyph: emoji live in exactly one place in this app and it is the emote
   * tray.
   *
   * Never `disabled`. It is only rendered when it can be armed, and a control
   * that cannot be pressed has no business being visible here.
   */
  const preActionBox = canArm && (
    <button
      // `btn`, not `btn ghost`, for the unarmed half: a transparent pill over a
      // dark felt reads as floating text rather than as a control, which is the
      // exact defect a-control-that-carries-an-imperative-must-be-a-control.md
      // is about (screenshot, 400x860, 2026-09-03). Off is the same neutral
      // surface CHECK wears; on is the gold primary.
      className={armed ? "btn primary" : "btn"}
      aria-pressed={armed}
      // A HOOK THAT IS NOT PROSE. scripts/repro/pre-action.mjs drives this
      // button, and a probe bound to a caption fails the day the caption is
      // reworded — indistinguishable, from the outside, from the feature being
      // broken. See a-threshold-tuned-against-todays-tree-goes-stale.md § a
      // SELECTOR.
      data-preaction="checkFold"
      data-armed={armed ? "1" : "0"}
      style={{
        // CAPPED NARROW so the label wraps to two lines instead of reaching the
        // player's own hole cards, which sit centred at the bottom of the felt
        // and are the thing this corner is closest to (screenshot, 400x860,
        // 2026-09-03: uncapped it covered the left card).
        ...(wide ? { width: "100%" } : { flex: "0 0 auto", maxWidth: Math.max(112, u(116)) }),
        minHeight: Math.max(40, u(38)),
        fontSize: u(13),
        lineHeight: 1.15,
        padding: `${u(6)}px ${u(12)}px`,
        whiteSpace: "normal",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: u(7),
        pointerEvents: "auto",
      }}
      onClick={() => setArmedFor(armed ? null : (you?.handNo ?? null))}
    >
      <span
        aria-hidden="true"
        style={{
          width: u(11),
          height: u(11),
          minWidth: 9,
          minHeight: 9,
          borderRadius: "50%",
          flex: "0 0 auto",
          background: armed ? "currentColor" : "transparent",
          border: "2px solid currentColor",
          opacity: armed ? 1 : 0.65,
        }}
      />
      {t("autoCheckFold")}
    </button>
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
          // The box sits at the TOP of the rail and the buttons in the middle,
          // deliberately not in the same place. A tap aimed at the box a frame
          // after the turn lands would otherwise hit FOLD, which is the one
          // way this feature could cost somebody a hand they meant to play.
          justifyContent: legal ? "center" : "flex-start",
          gap: u(7),
          padding: `${u(8)}px ${u(8)}px calc(${u(8)}px + env(safe-area-inset-bottom))`,
          background: legal ? "linear-gradient(to left, rgba(0,0,0,.55), transparent)" : "transparent",
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
        {legal ? buttons : preActionBox}
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
        // While it is only the box, the strip floats it a button's height clear
        // of the bottom edge and pushes it to the inline START. Both halves are
        // measured rather than tasteful: floated, the buttons arrive BELOW where
        // it was, so a tap a frame late lands on felt rather than on FOLD;
        // centred at that height it sat squarely on the player's OWN seat plate,
        // which is the one thing at the bottom of the felt that is always there
        // (screenshot, 400x860, 2026-09-03). The corner is empty in both shapes,
        // and it is the corner the emote tray does not use.
        padding: legal
          ? `${u(10)}px ${u(12)}px calc(${u(10)}px + env(safe-area-inset-bottom))`
          : `${u(10)}px ${u(12)}px calc(${u(22)}px + ${Math.round(tap * 1.9)}px + env(safe-area-inset-bottom))`,
        background: legal ? "linear-gradient(transparent, rgba(0,0,0,.72) 30%)" : "transparent",
        pointerEvents: legal ? "auto" : "none",
        display: "flex",
        flexDirection: "column",
        alignItems: legal ? "stretch" : "flex-start",
        gap: u(8),
        zIndex: 30,
      }}
    >
      {legal ? (
        <>
          {raisePanel}
          <div style={{ display: "flex", gap: u(8) }}>{buttons}</div>
        </>
      ) : (
        preActionBox
      )}
    </div>
  );
}
