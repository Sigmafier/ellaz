import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { haptic } from "@juice/index";
import {
  BONUS_ZONES, CUPS, FILL_MS, GEM_PEEK_MS, GEM_SWAP_MS, LEAF_FLASH_MS, LEAF_MAX,
  LEAF_MIN, STARS, STAR_LIT_MS, SWEEP_MS, fillAt, fillQuality, gemAfter, gemQuality,
  gemSwaps, leafCount, leafQuality, starOrder, starQuality, sweepAt, sweepQuality,
  tierOf, type BonusArt, type BonusTier,
} from "./bonus";

/** How long the outcome stays lit before the round hands back. */
const DWELL_MS = 750;

const ZONE_FILL: Readonly<Record<BonusTier, string>> = {
  easy: "#EFE0BE",
  medium: "#F2B93F",
  hard: "#E2612F",
};
const INK = "#241C17";
const EDGE = "#B07C1C";

/**
 * The bonus rounds behind the prize boxes - steps 3 and 5 of the game plan.
 *
 * THE SHELL DECIDES NOTHING. Every round reduces itself to a QUALITY in 0..1
 * and hands it to `finish`; `bonus.ts`'s `tierOf` alone turns that into a tier,
 * and `Lettercross.tsx` hands the tier to `winMoment`. Five games, one pay
 * scale, and the same shape as a game reporting a reason instead of an amount.
 *
 * FIVE VERBS, NOT FIVE SKINS - stop, remember, tap, count, hold. The point of a
 * bonus is that it is a different ACTIVITY from laying letters, so five timing
 * bars would be one mini-game wearing five hats. None of them is a word round
 * either: a word puzzle inside a word puzzle is a break from nothing.
 *
 * EVERY ROUND IS TAP-COMPLETABLE. `drop` is a press-and-hold, which is not a
 * drag - nothing here needs a sustained pointer travelling across the screen.
 */
export function BonusRound({
  art, glyph, hint, label, onStop, playTap,
}: {
  art: BonusArt;
  glyph: ReactNode;
  hint: string;
  label: string;
  onStop: (tier: BonusTier) => void;
  playTap: () => void;
}) {
  const [landed, setLanded] = useState<BonusTier | null>(null);
  /**
   * Read by callbacks and rAF loops created once, which never see a later
   * render's state - a `landed` in one of those closures is `null` for ever, so
   * a round would keep running under a frozen-looking readout.
   */
  const doneRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const finish = useCallback((quality: number) => {
    if (doneRef.current) return;
    doneRef.current = true;
    const tier = tierOf(quality);
    setLanded(tier);
    playTap();
    haptic.tap();
    // Held rather than handed back instantly: a round that closes on the last
    // tap hides the one thing it was asking - how it went.
    timerRef.current = window.setTimeout(() => onStop(tier), DWELL_MS);
  }, [onStop, playTap]);

  useEffect(() => () => { if (timerRef.current !== null) window.clearTimeout(timerRef.current); }, []);

  const done = landed !== null;

  return (
    <div aria-label={label} role="group" style={{
      position: "absolute", inset: 0, zIndex: 3,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 18, background: "color-mix(in oklab, var(--surface) 92%, transparent)",
    }}>
      <svg viewBox="0 0 24 24" width="64" height="64" aria-hidden="true"
        style={{ transform: done ? "scale(1.12)" : "none", transition: "transform 220ms" }}>
        {glyph}
      </svg>

      {art === "bell" && <Sweep done={done} landed={landed} finish={finish} />}
      {art === "gem" && <Cups done={done} finish={finish} />}
      {art === "star" && <Stars done={done} finish={finish} playTap={playTap} />}
      {art === "leaf" && <Leaves done={done} finish={finish} />}
      {art === "drop" && <Jar done={done} finish={finish} />}

      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", minHeight: 20, textAlign: "center", padding: "0 12px" }}>
        {done ? "" : hint}
      </div>
    </div>
  );
}

type Part = { done: boolean; finish: (q: number) => void };

/* ------------------------------------------------------------ bell: STOP */

function Sweep({ done, landed, finish }: Part & { landed: BonusTier | null }) {
  const [pos, setPos] = useState(0);
  const startRef = useRef(0);
  const doneRef = useRef(false);
  doneRef.current = done;

  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    startRef.current = t0;
    const tick = (now: number) => {
      if (doneRef.current) return;
      setPos(sweepAt(now - t0));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <button type="button" disabled={done}
      onClick={() => finish(sweepQuality(sweepAt(performance.now() - startRef.current)))}
      style={{ ...tapArea, cursor: done ? "default" : "pointer" }}>
      {/* One flex row of the SAME zones `tierAt` scores, so the stripe a player
          aims at is the stripe that pays. */}
      <div style={{
        position: "relative", width: "min(78vw, 300px)", height: 34,
        display: "flex", borderRadius: 9, overflow: "hidden", border: `1px solid ${EDGE}`,
      }}>
        {BONUS_ZONES.map((z, i) => (
          <div key={i} style={{
            flex: `${z.to - z.from} 0 0`, background: ZONE_FILL[z.tier],
            opacity: landed === null || landed === z.tier ? 1 : 0.32,
            transition: "opacity 220ms",
          }} />
        ))}
        {/* The marker rides `left`, one property, so the band never reflows. */}
        <div aria-hidden="true" style={{
          position: "absolute", top: -3, bottom: -3, left: `${pos * 100}%`,
          width: 4, marginLeft: -2, borderRadius: 2, background: INK,
          boxShadow: done ? `0 0 0 3px rgba(36,28,23,0.22)` : "none",
          transition: done ? "box-shadow 200ms" : "none",
        }} />
      </div>
    </button>
  );
}

/* -------------------------------------------------------- gem: REMEMBER */

const CUP_W = 74;

function Cups({ done, finish }: Part) {
  /** `slotOf[cup]` - which slot each cup stands in. Cups are identical, so the
   *  MOTION is what a player follows; without real travel a swap of two
   *  identical drawings changes nothing on screen and the round is a coin. */
  const [slotOf, setSlotOf] = useState<number[]>(() => Array.from({ length: CUPS }, (_, i) => i));
  const [phase, setPhase] = useState<"peek" | "shuffle" | "pick">("peek");
  const [gemSlot, setGemSlot] = useState(0);
  const plan = useRef<{ swaps: ReturnType<typeof gemSwaps>; start: number } | null>(null);
  if (plan.current === null) {
    const start = Math.floor(Math.random() * CUPS);
    plan.current = { swaps: gemSwaps(), start };
  }

  useEffect(() => { setGemSlot(plan.current!.start); }, []);

  useEffect(() => {
    const timers: number[] = [];
    timers.push(window.setTimeout(() => setPhase("shuffle"), GEM_PEEK_MS));
    plan.current!.swaps.forEach(([a, b], i) => {
      timers.push(window.setTimeout(() => {
        setSlotOf((prev) => {
          const next = [...prev];
          // The swap is defined on SLOTS, so move whichever cups are standing
          // in them - the same two indices `gemAfter` walks.
          const ca = next.findIndex((s) => s === a);
          const cb = next.findIndex((s) => s === b);
          next[ca] = b; next[cb] = a;
          return next;
        });
        setGemSlot((g) => (g === a ? b : g === b ? a : g));
      }, GEM_PEEK_MS + i * GEM_SWAP_MS));
    });
    timers.push(window.setTimeout(() => setPhase("pick"), GEM_PEEK_MS + plan.current!.swaps.length * GEM_SWAP_MS));
    return () => timers.forEach(window.clearTimeout);
  }, []);

  const actual = gemAfter(plan.current.start, plan.current.swaps);

  return (
    <div style={{ position: "relative", width: CUPS * CUP_W, height: 96 }}>
      {slotOf.map((slot, cup) => (
        <button key={cup} type="button" disabled={done || phase !== "pick"}
          onClick={() => finish(gemQuality(slot, actual))}
          aria-label={`${cup + 1}`}
          style={{
            position: "absolute", top: 18, left: slot * CUP_W, width: CUP_W - 10, height: 72,
            border: "none", background: "none", padding: 0,
            transition: "left 380ms cubic-bezier(.4,0,.2,1)",
            cursor: phase === "pick" && !done ? "pointer" : "default",
          }}>
          <svg viewBox="0 0 24 24" width={CUP_W - 10} height={72} aria-hidden="true">
            <path d="M5 4h14l-2 15a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3Z" fill={ZONE_FILL.medium} stroke={EDGE} strokeWidth="1.2" />
          </svg>
        </button>
      ))}
      {/* The gem, shown only while the cups are up. */}
      <div aria-hidden="true" style={{
        position: "absolute", top: 62, left: gemSlot * CUP_W + (CUP_W - 10) / 2 - 11,
        opacity: phase === "peek" ? 1 : 0, transition: "opacity 260ms, left 380ms cubic-bezier(.4,0,.2,1)",
      }}>
        <svg viewBox="0 0 24 24" width="22" height="22"><path d="M6 3h12l3 6-9 12L3 9Z" fill={ZONE_FILL.hard} stroke={EDGE} strokeWidth="1.2" /></svg>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- star: SPEED */

function Stars({ done, finish, playTap }: Part & { playTap: () => void }) {
  const order = useRef<number[] | null>(null);
  if (order.current === null) order.current = starOrder();
  const [beat, setBeat] = useState(0);
  const hits = useRef(0);
  const tookThisBeat = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setBeat((b) => {
        const next = b + 1;
        if (next >= STARS) { window.clearInterval(id); finish(starQuality(hits.current)); return b; }
        tookThisBeat.current = false;
        return next;
      });
    }, STAR_LIT_MS);
    return () => window.clearInterval(id);
  }, [finish]);

  const lit = order.current[beat];

  return (
    <div style={{ display: "flex", gap: 10 }}>
      {Array.from({ length: STARS }, (_, i) => (
        <button key={i} type="button" disabled={done}
          aria-label={`${i + 1}`}
          onClick={() => {
            // One hit per beat, or a player can tap the lit star repeatedly and
            // score five of five off one finger that never moved.
            if (i !== lit || tookThisBeat.current || done) return;
            tookThisBeat.current = true;
            hits.current += 1;
            playTap();
          }}
          style={{
            border: "none", background: "none", padding: 0,
            cursor: done ? "default" : "pointer",
            transform: i === lit ? "scale(1.18)" : "none", transition: "transform 140ms",
          }}>
          <svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true">
            <path d="m12 2 2.9 6.3 6.8.8-5 4.7 1.3 6.8L12 17.3 6 20.6l1.3-6.8-5-4.7 6.8-.8Z"
              fill={i === lit ? ZONE_FILL.hard : "var(--surface-2, #EFE7D6)"} stroke={EDGE} strokeWidth="1.1" />
          </svg>
        </button>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------- leaf: COUNT */

function Leaves({ done, finish }: Part) {
  const plan = useRef<{ n: number; spots: { x: number; y: number; r: number }[] } | null>(null);
  if (plan.current === null) {
    const n = leafCount();
    plan.current = {
      n,
      spots: Array.from({ length: n }, () => ({
        x: 8 + Math.random() * 78, y: 8 + Math.random() * 62, r: Math.random() * 360,
      })),
    };
  }
  const [showing, setShowing] = useState(true);
  useEffect(() => {
    const id = window.setTimeout(() => setShowing(false), LEAF_FLASH_MS);
    return () => window.clearTimeout(id);
  }, []);

  const choices = Array.from({ length: LEAF_MAX - LEAF_MIN + 1 }, (_, i) => LEAF_MIN + i);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{
        position: "relative", width: "min(78vw, 300px)", height: 108,
        border: `1px solid ${EDGE}`, borderRadius: 12, background: "var(--surface-2, #EFE7D6)", overflow: "hidden",
      }}>
        {showing && plan.current.spots.map((s, i) => (
          <svg key={i} viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" style={{
            position: "absolute", left: `${s.x}%`, top: `${s.y}%`, transform: `rotate(${s.r}deg)`,
          }}>
            <path d="M4 20c0-8 6-14 16-16 1 11-5 17-16 16Z" fill={ZONE_FILL.medium} stroke={EDGE} strokeWidth="1.1" />
          </svg>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, opacity: showing ? 0.3 : 1, transition: "opacity 200ms" }}>
        {choices.map((c) => (
          <button key={c} type="button" disabled={done || showing}
            onClick={() => finish(leafQuality(c, plan.current!.n))}
            style={{
              width: 44, height: 44, borderRadius: 10, border: `1px solid ${EDGE}`,
              background: ZONE_FILL.easy, color: INK, fontSize: 18, fontWeight: 800,
              cursor: !showing && !done ? "pointer" : "default",
            }}>{c}</button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ drop: HOLD */

function Jar({ done, finish }: Part) {
  const [fill, setFill] = useState(0);
  const holdRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  doneRef.current = done;

  const release = useCallback(() => {
    if (holdRef.current === null || doneRef.current) return;
    const f = fillAt(performance.now() - holdRef.current);
    holdRef.current = null;
    setFill(f);
    finish(fillQuality(f));
  }, [finish]);

  const press = useCallback(() => {
    if (holdRef.current !== null || doneRef.current) return;
    const t0 = performance.now();
    holdRef.current = t0;
    const tick = () => {
      if (holdRef.current === null || doneRef.current) return;
      const f = fillAt(performance.now() - t0);
      setFill(f);
      // The brim ends the round on its own: a jar you can hold for ever is a
      // round you win by not playing it. It spills, and a spill scores zero -
      // which still pays the easy tier, because nothing here punishes.
      if (f >= 1) { holdRef.current = null; finish(0); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [finish]);

  const pct = Math.round(fill * 100);
  return (
    <button type="button" disabled={done}
      onPointerDown={press} onPointerUp={release} onPointerCancel={release} onPointerLeave={release}
      style={{ ...tapArea, cursor: done ? "default" : "pointer", touchAction: "none" }}>
      <div style={{
        position: "relative", width: 96, height: 116, borderRadius: "8px 8px 16px 16px",
        border: `2px solid ${EDGE}`, overflow: "hidden", background: "var(--surface-2, #EFE7D6)",
      }}>
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 0, height: `${pct}%`,
          background: fill >= 1 ? ZONE_FILL.easy : ZONE_FILL.hard,
        }} />
        {/* The line to stop at, drawn where `FILL_TARGET` says it is. */}
        <div aria-hidden="true" style={{
          position: "absolute", left: 0, right: 0, bottom: "72%", height: 3,
          background: INK, opacity: 0.75,
        }} />
      </div>
    </button>
  );
}

const tapArea = {
  border: "none", background: "none", padding: 0,
  display: "flex", alignItems: "center", justifyContent: "center",
} as const;

/** Exported for the wiring test, which asserts the renderer holds still. */
export const BONUS_SWEEP_MS = SWEEP_MS;
export const BONUS_FILL_MS = FILL_MS;
