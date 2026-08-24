import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { haptic } from "@juice/index";
import { BONUS_ZONES, SWEEP_MS, sweepAt, tierAt, type BonusTier } from "./bonus";

/** How long the landed zone stays lit before the round hands back. */
const DWELL_MS = 750;

const ZONE_FILL: Readonly<Record<BonusTier, string>> = {
  easy: "#EFE0BE",
  medium: "#F2B93F",
  hard: "#E2612F",
};

/**
 * The bonus round behind the one box that has one - step 3 of the game plan.
 *
 * It draws `bonus.ts` and decides nothing: the zones, the sweep and the tier
 * all come from there, so what a player aims at and what they are paid cannot
 * disagree. It does not grant either - it reports a TIER and `Lettercross.tsx`
 * hands that to `winMoment`, the same shape as a game reporting a reason
 * instead of an amount.
 *
 * THE LOOP IS A WAY OF ASKING, NOT A CLOCK. `sweepAt` is a function of elapsed
 * wall-clock time, so a 120Hz display asks more often and gets the same answer
 * - a position accumulated per frame would run at twice the speed there and be
 * a different game on a different screen
 * (.claude/rules/fixed-timestep-must-match-display.md).
 */
export function BonusRound({
  glyph, hint, label, onStop, playTap,
}: {
  glyph: ReactNode;
  hint: string;
  label: string;
  onStop: (tier: BonusTier) => void;
  playTap: () => void;
}) {
  const [pos, setPos] = useState(0);
  const [landed, setLanded] = useState<BonusTier | null>(null);
  /**
   * Read by the rAF callback, which is created once and never sees a later
   * render's state. A `landed` in that closure is `null` for ever, so the
   * marker would keep sweeping under a frozen-looking readout.
   */
  const stoppedRef = useRef(false);
  const startRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    startRef.current = t0;
    const tick = (now: number) => {
      if (stoppedRef.current) return;
      setPos(sweepAt(now - t0));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const stop = useCallback(() => {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    const p = sweepAt(performance.now() - startRef.current);
    setPos(p);
    const tier = tierAt(p);
    setLanded(tier);
    playTap();
    haptic.tap();
    // Held rather than handed back instantly: a round that closes on the tap
    // hides the one thing it was asking - where the marker stopped.
    timerRef.current = window.setTimeout(() => onStop(tier), DWELL_MS);
  }, [onStop, playTap]);

  useEffect(() => () => { if (timerRef.current !== null) window.clearTimeout(timerRef.current); }, []);

  return (
    <button type="button" onClick={stop} aria-label={label} style={{
      position: "absolute", inset: 0, zIndex: 3, border: "none", padding: 0,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 18, background: "color-mix(in oklab, var(--surface) 92%, transparent)",
      cursor: landed ? "default" : "pointer",
    }}>
      <svg viewBox="0 0 24 24" width="76" height="76" aria-hidden="true"
        style={{ transform: landed ? "scale(1.12)" : "none", transition: "transform 220ms" }}>
        {glyph}
      </svg>

      {/* The band. One flex row of the SAME zones `tierAt` scores, so a stripe
          a player aims at is the stripe that pays. */}
      <div style={{
        position: "relative", width: "min(78%, 300px)", height: 34,
        display: "flex", borderRadius: 9, overflow: "hidden",
        border: "1px solid #B07C1C",
      }}>
        {BONUS_ZONES.map((z, i) => (
          <div key={i} style={{
            flex: `${z.to - z.from} 0 0`, background: ZONE_FILL[z.tier],
            opacity: landed === null || landed === z.tier ? 1 : 0.32,
            transition: "opacity 220ms",
          }} />
        ))}
        {/* The marker rides `left`, so it is one transform-free property and the
            band underneath never reflows. */}
        <div aria-hidden="true" style={{
          position: "absolute", top: -3, bottom: -3, left: `${pos * 100}%`,
          width: 4, marginLeft: -2, borderRadius: 2, background: "#241C17",
          boxShadow: landed ? "0 0 0 3px rgba(36,28,23,0.22)" : "none",
          transition: landed ? "box-shadow 200ms" : "none",
        }} />
      </div>

      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", minHeight: 20 }}>
        {landed === null ? hint : ""}
      </div>
    </button>
  );
}

/** Exported for the wiring test, which asserts the renderer holds still. */
export const BONUS_SWEEP_MS = SWEEP_MS;
