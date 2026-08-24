import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { haptic } from "@juice/index";
import { tierOf, type BonusTier } from "./bonus";
import {
  BH, BONUS_MS, BW, dealTiles, emptyMini, miniQuality, scoreMini, type MiniCell,
} from "./bonusBoard";

/** How long the outcome stays lit before the round hands back. */
const DWELL_MS = 1500;
const INK = "#241C17";
const EDGE = "#B07C1C";
/** One cell. The main board's own size, which is the point of a 9-wide strip. */
const CELL = "min(9.2vw, 34px)";

export type BonusText = {
  readonly label: string;
  readonly hint: string;
  readonly start: string;
  readonly finish: string;
  readonly points: string;
  readonly bad: string;
};

/**
 * The bonus round behind a prize box - YOUR OWN BOARD.
 *
 * WHAT THE ORIGINAL ACTUALLY DID, read out of BONUS's own `BON.EXE` rather
 * than from a description of it: five bonus screens, and every one of them a
 * WORD game. This is the biggest of the five - "build a crossword from as many
 * letters as possible; the bonus is the total points of the words you built".
 * The five arcade rounds that used to live in this file (stop a sweep, a shell
 * game, tap the lit stars, count the leaves, hold and release) were built from
 * a summary and were the wrong genre; they are gone.
 *
 * THE SHELL STILL DECIDES NOTHING. The round reduces to a QUALITY in 0..1 and
 * hands it to `finish`; `tierOf` alone turns that into a tier and
 * `Lettercross.tsx` hands the tier to `winMoment`. Same shape as a game
 * reporting a reason and never an amount.
 *
 * A START BUTTON, because BONUS had one - "להתחלת המשימה הקש על התחל". The
 * clock must not already be running when a player is still reading what the
 * round wants, and after a word has just been played that reading time is real.
 *
 * TAP-COMPLETABLE, never a drag: tap a tile, tap a square. Tap a placed tile to
 * take it back. Nothing here needs a sustained pointer.
 */
export function BonusRound({ glyph, t, onStop, playTap }: {
  glyph: ReactNode;
  t: BonusText;
  onStop: (tier: BonusTier) => void;
  playTap: () => void;
}) {
  const [phase, setPhase] = useState<"ready" | "playing" | "done">("ready");
  const [board, setBoard] = useState<readonly MiniCell[]>(emptyMini);
  /** Which TRAY index sits on each square, so a take-back returns that tile. */
  const [from, setFrom] = useState<readonly (number | null)[]>(() => Array(BW * BH).fill(null));
  const [sel, setSel] = useState<number | null>(null);
  const [left, setLeft] = useState(BONUS_MS);
  const [result, setResult] = useState<{ total: number; bad: number } | null>(null);

  const tiles = useMemo(() => dealTiles(), []);
  /**
   * Read by the rAF loop and the timeout, both created once. A `phase` read
   * from one of those closures is for ever the phase at creation time, so the
   * clock would keep running under a finished round.
   */
  const doneRef = useRef(false);
  const boardRef = useRef(board);
  boardRef.current = board;
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    const s = scoreMini(boardRef.current);
    setResult({ total: s.total, bad: s.bad.length });
    setPhase("done");
    playTap();
    haptic.tap();
    // Held rather than handed straight back: a round that closes on the last
    // tap hides the one thing it was asking - how it went.
    timerRef.current = window.setTimeout(() => onStop(tierOf(miniQuality(s.total))), DWELL_MS);
  }, [onStop, playTap]);

  const start = useCallback(() => {
    setPhase("playing");
    playTap();
    // Wall-clock, never a per-frame accumulator: a 120Hz display must not run
    // the clock at twice the speed of a 60Hz one
    // (.claude/rules/fixed-timestep-must-match-display.md).
    const t0 = performance.now();
    const tick = () => {
      if (doneRef.current) return;
      const remain = BONUS_MS - (performance.now() - t0);
      setLeft(Math.max(0, remain));
      if (remain <= 0) { finish(); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [finish, playTap]);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  const tapSquare = (i: number) => {
    if (phase !== "playing") return;
    const owner = from[i];
    if (owner !== null) {          // take it back
      setBoard((b) => b.map((c, k) => (k === i ? null : c)));
      setFrom((f) => f.map((c, k) => (k === i ? null : c)));
      setSel(owner);
      playTap();
      return;
    }
    if (sel === null) return;
    setBoard((b) => b.map((c, k) => (k === i ? tiles[sel] : c)));
    setFrom((f) => f.map((c, k) => (k === i ? sel : c)));
    setSel(null);
    playTap();
    haptic.tap();
  };

  const onBoard = (k: number) => from.includes(k);
  const secs = Math.ceil(left / 1000);

  return (
    <div aria-label={t.label} role="group" style={{
      position: "absolute", inset: 0, zIndex: 3,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 12, padding: 8, overflowY: "auto",
      background: "color-mix(in oklab, var(--surface) 96%, transparent)",
    }}>
      <svg viewBox="0 0 24 24" width={phase === "ready" ? 64 : 34} height={phase === "ready" ? 64 : 34}
        aria-hidden="true" style={{ transition: "width 220ms, height 220ms" }}>
        {glyph}
      </svg>

      {phase === "ready" && (
        <>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", textAlign: "center", padding: "0 12px" }}>
            {t.hint}
          </div>
          <button type="button" onClick={start} style={{
            minHeight: 52, minWidth: 132, borderRadius: 12, border: `2px solid ${EDGE}`,
            background: "#F2B93F", color: INK, fontSize: 18, fontWeight: 800, cursor: "pointer",
          }}>{t.start}</button>
        </>
      )}

      {phase !== "ready" && (
        <>
          <div aria-live="off" style={{ fontVariantNumeric: "tabular-nums", fontSize: 20, fontWeight: 800, color: secs <= 10 ? "#E2612F" : "var(--text)" }}>
            {secs}
          </div>

          <div dir="ltr" style={{ display: "grid", gridTemplateColumns: `repeat(${BW}, ${CELL})`, gap: 2 }}>
            {board.map((c, i) => (
              <button key={i} type="button" onClick={() => tapSquare(i)}
                aria-label={c ?? "empty"}
                style={{
                  width: CELL, height: CELL, padding: 0, borderRadius: 4,
                  border: `1px solid ${c ? EDGE : "var(--line, #ccc)"}`,
                  background: c ? "#F6E7C1" : "var(--surface-2, #eee)",
                  color: INK, fontSize: 15, fontWeight: 800, textTransform: "uppercase",
                  cursor: phase === "playing" ? "pointer" : "default",
                }}>{c ?? ""}</button>
            ))}
          </div>

          {phase === "playing" && (
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 4, maxWidth: 340 }}>
              {tiles.map((ch, k) => onBoard(k) ? null : (
                <button key={k} type="button" onClick={() => { setSel(k); playTap(); }}
                  style={{
                    width: 34, height: 40, borderRadius: 6, padding: 0,
                    border: `2px solid ${sel === k ? "#E2612F" : EDGE}`,
                    background: sel === k ? "#F2B93F" : "#F6E7C1",
                    color: INK, fontSize: 16, fontWeight: 800, textTransform: "uppercase", cursor: "pointer",
                  }}>{ch}</button>
              ))}
            </div>
          )}

          {phase === "playing" && (
            <button type="button" onClick={finish} style={{
              minHeight: 44, minWidth: 120, borderRadius: 12, border: `2px solid ${EDGE}`,
              background: "var(--surface)", color: "var(--text)", fontSize: 16, fontWeight: 700, cursor: "pointer",
            }}>{t.finish}</button>
          )}

          {result && (
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", textAlign: "center", padding: "0 12px" }}>
              {result.bad > 0 ? t.bad : `${result.total} ${t.points}`}
            </div>
          )}
        </>
      )}
    </div>
  );
}
