import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { haptic } from "@juice/index";
import { tierOf, type BonusTier } from "./bonus";
import { CHOICES, SHARED_MS, makeShared, sharedQuality } from "./sharedLetter";

/** How long the outcome stays lit before the round hands back. */
const DWELL_MS = 1800;
const INK = "#241C17";
const EDGE = "#B07C1C";
const GOLD = "#F2B93F";
const RIGHT = "#3E9E5B";
const WRONG = "#E2612F";

export type SharedText = {
  readonly label: string;
  /** "The same letter is missing from both words." - with {n} for the count. */
  readonly hint: string;
  readonly start: string;
  readonly got: string;
  readonly missed: string;
};

/**
 * "The same letter is missing from these words" - two of BONUS's five screens.
 *
 *   20s  the identical letter, missing in the TWO words before you    40 pts
 *   30s  the identical letter, missing in the THREE words before you  100 pts
 *
 * ONE COMPONENT, TWO ROUNDS. The original words them as two separate bonuses
 * and they differ in exactly two numbers, so `count` is a prop: the clock comes
 * from `SHARED_MS` and the payout from `sharedQuality`, both of which live in
 * `sharedLetter.ts`. A second copy of this file with 3 where 2 is would be two
 * places to fix the next thing either of them gets wrong.
 *
 * THE ROUND STILL DECIDES NOTHING. It reduces to a quality in 0..1 and hands it
 * to `onStop`; `tierOf` turns that into a tier and `Lettercross.tsx` hands the
 * tier to `winMoment`. Same shape as a game reporting a reason and never an
 * amount.
 *
 * A START BUTTON, because BONUS had one - "להתחלת המשימה הקש על 'התחל'". Here it
 * matters more than in the crossword round: the words are hidden until it is
 * pressed, so a twenty-second clock is twenty seconds of reading rather than
 * however long it took the player to notice the screen had changed.
 *
 * A WRONG LETTER COSTS NOTHING BUT TIME. Kids games here are gentle: the letter
 * shakes and dims and the clock keeps running, which is pressure enough. There
 * is no lives counter and no way to end the round early on a mistake.
 *
 * IT SHOWS THE ANSWER WHEN THE CLOCK WINS. BONUS allowed no appeal inside a
 * bonus, which is about arguing rather than about learning - a round that ends
 * with the blanks still blank teaches nothing, and this is a children's game.
 */
export function SharedLetterRound({ count, glyph, t, onStop, playTap }: {
  count: 2 | 3;
  glyph: ReactNode;
  t: SharedText;
  onStop: (tier: BonusTier) => void;
  playTap: () => void;
}) {
  const [phase, setPhase] = useState<"ready" | "playing" | "done">("ready");
  const [left, setLeft] = useState(SHARED_MS[count]);
  const [wrong, setWrong] = useState<readonly string[]>([]);
  const [solved, setSolved] = useState(false);

  const puzzle = useMemo(() => makeShared(count), [count]);

  /**
   * Read by the rAF loop and the timeout, both created once. A `phase` read from
   * one of those closures is for ever the phase at creation time, so the clock
   * would keep running under a finished round.
   */
  const doneRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const finish = useCallback((won: boolean) => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    setSolved(won);
    setPhase("done");
    playTap();
    if (won) haptic.success(); else haptic.tap();
    // Held rather than handed straight back: a round that closes on the last tap
    // hides the one thing it was asking - how it went, and what the answer was.
    timerRef.current = window.setTimeout(
      () => onStop(tierOf(sharedQuality(count, won))), DWELL_MS);
  }, [count, onStop, playTap]);

  const start = useCallback(() => {
    // No puzzle means nothing to ask. It is unreachable with the shipped pool
    // (shared-letter.test.ts pins that over 300 seeds) and it still may not
    // throw inside a bonus round: the player reached this box with a real word,
    // so the round closes at the floor rather than on an error.
    if (!puzzle) { setPhase("playing"); finish(false); return; }
    setPhase("playing");
    playTap();
    // Wall-clock, never a per-frame accumulator: a 120Hz display must not run
    // the clock at twice the speed of a 60Hz one
    // (.claude/rules/fixed-timestep-must-match-display.md).
    const t0 = performance.now();
    const tick = () => {
      if (doneRef.current) return;
      const remain = SHARED_MS[count] - (performance.now() - t0);
      setLeft(Math.max(0, remain));
      if (remain <= 0) { finish(false); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [count, finish, playTap, puzzle]);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  const guess = (c: string) => {
    if (phase !== "playing" || !puzzle || doneRef.current) return;
    if (c === puzzle.answer) { finish(true); return; }
    if (!wrong.includes(c)) setWrong((xs) => [...xs, c]);
    playTap();
    haptic.fail();
  };

  const secs = Math.ceil(left / 1000);
  // The blanks fill in once the round is over, whichever way it went - the
  // answer is the thing worth carrying out of a round you lost.
  const reveal = phase === "done";
  const shown = (pattern: string) =>
    reveal && puzzle ? pattern.replace("_", puzzle.answer) : pattern;

  return (
    <div aria-label={t.label} role="group" style={{
      position: "absolute", inset: 0, zIndex: 3,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 14, padding: 8, overflowY: "auto",
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
            background: GOLD, color: INK, fontSize: 18, fontWeight: 800, cursor: "pointer",
          }}>{t.start}</button>
        </>
      )}

      {phase !== "ready" && puzzle && (
        <>
          <div aria-live="off" style={{
            fontVariantNumeric: "tabular-nums", fontSize: 20, fontWeight: 800,
            color: secs <= 5 ? WRONG : "var(--text)",
          }}>{secs}</div>

          {/* The words, one per line. `dir="ltr"` because they are English
              whatever the app is speaking, and an unpinned line mirrors in the
              Hebrew app - the blank would land at the wrong end of the word.
              See .claude/rules/rtl-spatial-grid-dir-ltr.md */}
          <div dir="ltr" style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
            {puzzle.patterns.map((pattern, i) => (
              <div key={i} aria-label={shown(pattern)} style={{ display: "flex", gap: 4 }}>
                {[...shown(pattern)].map((ch, k) => (
                  <span key={k} style={{
                    width: 34, height: 42, borderRadius: 6, display: "grid", placeItems: "center",
                    border: `2px solid ${ch === "_" ? WRONG : EDGE}`,
                    background: ch === "_" ? "var(--surface)"
                      : reveal && pattern[k] === "_" ? RIGHT : "#F6E7C1",
                    color: reveal && pattern[k] === "_" ? "#fff" : INK,
                    fontSize: 20, fontWeight: 800, textTransform: "uppercase",
                  }}>{ch === "_" ? "" : ch}</span>
                ))}
              </div>
            ))}
          </div>

          {phase === "playing" && (
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6, maxWidth: 300 }}>
              {puzzle.choices.map((c) => {
                const no = wrong.includes(c);
                return (
                  <button key={c} type="button" onClick={() => guess(c)} disabled={no}
                    aria-label={c} style={{
                      width: 44, height: 48, borderRadius: 10, padding: 0,
                      border: `2px solid ${no ? "var(--line, #ccc)" : EDGE}`,
                      background: no ? "var(--surface-2, #eee)" : "#F6E7C1",
                      color: INK, fontSize: 20, fontWeight: 800, textTransform: "uppercase",
                      opacity: no ? 0.35 : 1, cursor: no ? "default" : "pointer",
                    }}>{c.toUpperCase()}</button>
                );
              })}
            </div>
          )}

          {reveal && (
            <div style={{
              fontSize: 17, fontWeight: 800, textAlign: "center", padding: "0 12px",
              color: solved ? RIGHT : "var(--text)",
            }}>{solved ? t.got : t.missed}</div>
          )}
        </>
      )}
    </div>
  );
}

/** Kept beside the component so a test can pin the row size it renders. */
export const OFFERED = CHOICES;
