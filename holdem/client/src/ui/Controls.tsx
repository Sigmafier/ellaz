// The betting controls.
//
// Two rules run through all of it. The server re-validates every amount, so
// nothing here is a security boundary — but it IS the thing that decides
// whether a player can act in the two seconds they have, so it must never
// offer an action that will be refused, and never make a raise take more than
// one tap when a common size will do.

import { useEffect, useState } from "react";
import type { LegalActions } from "@shared/engine/betting";

export interface ControlsProps {
  legal: LegalActions;
  /** Chips already in front of this player this street. */
  committed: number;
  stack: number;
  potTotal: number;
  bigBlind: number;
  disabled: boolean;
  onAct: (action: "fold" | "check" | "call" | "bet" | "raise", amount?: number) => void;
}

export function Controls({
  legal,
  committed,
  stack,
  potTotal,
  bigBlind,
  disabled,
  onAct,
}: ControlsProps) {
  const canBet = legal.actions.includes("bet");
  const canRaise = legal.actions.includes("raise");
  const sizing = canBet || canRaise;

  const min = (canBet ? legal.minBetTo : legal.minRaiseTo) ?? 0;
  const max = (canBet ? legal.maxBetTo : legal.maxRaiseTo) ?? 0;

  const [amount, setAmount] = useState(min);
  const [open, setOpen] = useState(false);

  // A new decision is a new slider. Without this the amount from the previous
  // street survives, so the first tap of a raise commits a number the player
  // chose for a different situation.
  useEffect(() => {
    setAmount(min);
    setOpen(false);
  }, [min, max, legal.actions.join(",")]);

  const clamp = (v: number) => Math.max(min, Math.min(max, Math.round(v)));

  // Pot-relative sizes, the shorthand every poker player already thinks in.
  // Only offered when they land inside the legal band — a greyed-out button is
  // better than one that produces a refusal.
  const presets: { label: string; to: number }[] = [
    { label: "min", to: min },
    { label: "½ pot", to: clamp(committed + (potTotal + (legal.callAmount ?? 0)) * 0.5) },
    { label: "pot", to: clamp(committed + potTotal + (legal.callAmount ?? 0)) },
    { label: "all in", to: max },
  ].filter((p, i, all) => p.to >= min && p.to <= max && all.findIndex((q) => q.to === p.to) === i);

  const act = (a: "fold" | "check" | "call" | "bet" | "raise", n?: number) => {
    setOpen(false);
    onAct(a, n);
  };

  return (
    <div className="controls">
      {open && sizing && (
        <div className="stack">
          <div className="row">
            <span className="grow tiny dim">
              {canBet ? "bet to" : "raise to"} {amount}
              {amount === max ? " (all in)" : ""}
            </span>
            <span className="tiny dim">stack {stack}</span>
          </div>

          <input
            type="range"
            min={min}
            max={max}
            step={1}
            value={amount}
            disabled={disabled}
            onChange={(e) => setAmount(clamp(Number(e.target.value)))}
            style={{ padding: 0 }}
            aria-label={canBet ? "bet size" : "raise size"}
          />

          <div className="row">
            {presets.map((p) => (
              <button
                key={p.label}
                className="grow"
                disabled={disabled}
                onClick={() => setAmount(p.to)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="actions">
            <button className="grow" disabled={disabled} onClick={() => setOpen(false)}>
              back
            </button>
            <button
              className="grow btn-primary"
              disabled={disabled}
              onClick={() => act(canBet ? "bet" : "raise", amount)}
            >
              {canBet ? "bet" : "raise to"} {amount}
            </button>
          </div>
        </div>
      )}

      {!open && (
        <div className="actions">
          {legal.actions.includes("fold") && (
            <button className="btn-fold" disabled={disabled} onClick={() => act("fold")}>
              fold
            </button>
          )}
          {legal.actions.includes("check") && (
            <button className="btn-call" disabled={disabled} onClick={() => act("check")}>
              check
            </button>
          )}
          {legal.actions.includes("call") && (
            <button className="btn-call" disabled={disabled} onClick={() => act("call")}>
              call {legal.callAmount ?? 0}
              {(legal.callAmount ?? 0) >= stack ? " (all in)" : ""}
            </button>
          )}
          {sizing && (
            <button
              className="btn-raise"
              disabled={disabled}
              onClick={() => (min === max ? act(canBet ? "bet" : "raise", min) : setOpen(true))}
            >
              {/* When the only legal size is all-in, opening a slider with one
                  position on it is a wasted tap under a clock. */}
              {min === max ? `all in ${min}` : canBet ? "bet" : "raise"}
            </button>
          )}
        </div>
      )}

      <div className="tiny dim" style={{ textAlign: "center" }}>
        blinds {bigBlind / 2}/{bigBlind}
      </div>
    </div>
  );
}
