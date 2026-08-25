import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { haptic } from "@juice/index";

/**
 * Lettercross - the parts every bonus screen has, so that four screens do not
 * carry four copies of them.
 *
 * BONUS's five bonuses differ in what they ASK and agree on everything around
 * it: a symbol, a sentence, a START button ("להתחלת המשימה הקש על 'התחל'"), a
 * clock counting down, and a moment at the end where the answer is shown. Only
 * the middle of the screen is a different game.
 *
 * THE CLOCK IS WHY THIS IS SHARED RATHER THAN COPIED. It carries three traps
 * that each look like nothing and each break a round in a way a screenshot
 * cannot show, so having them in one place is worth more than the layout is:
 *
 *   - it is WALL-CLOCK, never a per-frame accumulator. A 120Hz display runs an
 *     accumulator at twice the speed of a 60Hz one, so the same round would be
 *     ten seconds on a good phone (.claude/rules/fixed-timestep-must-match-display.md)
 *   - `doneRef` is a REF and not the phase. The rAF loop and the dwell timeout
 *     are created once, so a `phase` read from either closure is for ever the
 *     phase at creation time - the clock would keep counting under a round that
 *     had already been won
 *   - the cleanup cancels BOTH. A player who leaves mid-round takes the frame
 *     loop and the pending handback with them
 */

/** How long the outcome stays lit before the round hands back. */
export const DWELL_MS = 1800;

export const INK = "#241C17";
export const EDGE = "#B07C1C";
export const GOLD = "#F2B93F";
export const RIGHT = "#3E9E5B";
export const WRONG = "#E2612F";

/**
 * THE ROW OF TAPPABLE LETTERS, and the button that carries one - as STYLE
 * rather than as a component, which is the whole decision here.
 *
 * All three rounds that offer a choice drew this literal themselves, and the
 * style object was byte-identical in all three. The obvious repair is a
 * `<ChoiceRow>` - and it is the wrong one: the three rows agree on how they
 * LOOK and on nothing else. Anagram keys by INDEX (its letters repeat, so the
 * character is not a key), labels `"{c} tile"`, and carries `dir="ltr"`;
 * fillgaps never disables a choice and has no tone; sharedLetter keys by the
 * character and disables on a wrong guess. A component covering that takes
 * five props to serve three callers who differ in four of them, which is the
 * same code with a layer over it.
 *
 * So the CONSTANT is shared and the STRUCTURE is not. A style literal has no
 * parameters to get wrong, and each round keeps the row it actually needs.
 */
export const CHOICE_ROW = {
  display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6, maxWidth: 300,
} as const;

/** A button that is only a hit target - the Tile inside it does the drawing. */
export const BARE_BUTTON = { border: 0, background: "none", padding: 0 } as const;

/** Every round asks a different question and says the same four things around it. */
export type RoundText = {
  readonly label: string;
  readonly hint: string;
  readonly start: string;
  readonly got: string;
  readonly missed: string;
};

export type RoundClock = {
  readonly phase: "ready" | "playing" | "done";
  readonly left: number;
  readonly solved: boolean;
  /** True once the round has ended, readable from inside a closure. */
  readonly over: () => boolean;
  readonly start: () => void;
  readonly finish: (won: boolean) => void;
};

/**
 * The clock, the phases, and the held moment at the end.
 *
 * `settle` is called once, DWELL_MS after the round ends, with how it went. It
 * is held rather than handed straight back because a round that closes on the
 * last tap hides the one thing it was asking - how it went, and what the answer
 * was.
 */
export function useRoundClock(
  ms: number,
  settle: (won: boolean) => void,
  playTap: () => void,
): RoundClock {
  const [phase, setPhase] = useState<"ready" | "playing" | "done">("ready");
  const [left, setLeft] = useState(ms);
  const [solved, setSolved] = useState(false);

  const doneRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const settleRef = useRef(settle);
  settleRef.current = settle;
  const tapRef = useRef(playTap);
  tapRef.current = playTap;

  const finish = useCallback((won: boolean) => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    setSolved(won);
    setPhase("done");
    tapRef.current();
    if (won) haptic.success(); else haptic.tap();
    timerRef.current = window.setTimeout(() => settleRef.current(won), DWELL_MS);
  }, []);

  const start = useCallback(() => {
    setPhase("playing");
    const t0 = performance.now();
    const tick = () => {
      if (doneRef.current) return;
      const remain = ms - (performance.now() - t0);
      setLeft(Math.max(0, remain));
      if (remain <= 0) { finish(false); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [finish, ms]);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  return { phase, left, solved, over: () => doneRef.current, start, finish };
}

/**
 * The frame: the symbol, the sentence, the START button, the clock, the verdict.
 * The round itself is `children`, and is only rendered once the clock is running.
 *
 * The words are HIDDEN until START is pressed, which matters more here than it
 * did in the crossword round: a twenty-second clock has to be twenty seconds of
 * reading, rather than however long it took the player to notice the screen had
 * changed.
 */
export function RoundShell({ glyph, t, clock, playTap, children }: {
  glyph: ReactNode;
  t: RoundText;
  clock: RoundClock;
  playTap: () => void;
  children: ReactNode;
}) {
  const { phase, left, solved } = clock;
  const secs = Math.ceil(left / 1000);
  const big = phase === "ready";
  return (
    <div aria-label={t.label} role="group" style={{
      position: "absolute", inset: 0, zIndex: 3,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 14, padding: 8, overflowY: "auto",
      background: "color-mix(in oklab, var(--surface) 96%, transparent)",
    }}>
      <svg viewBox="0 0 24 24" width={big ? 64 : 34} height={big ? 64 : 34}
        aria-hidden="true" style={{ transition: "width 220ms, height 220ms" }}>
        {glyph}
      </svg>

      {big ? (
        <>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", textAlign: "center", padding: "0 12px" }}>
            {t.hint}
          </div>
          <button type="button" onClick={() => { playTap(); clock.start(); }} style={{
            minHeight: 52, minWidth: 132, borderRadius: 12, border: `2px solid ${EDGE}`,
            background: GOLD, color: INK, fontSize: 18, fontWeight: 800, cursor: "pointer",
          }}>{t.start}</button>
        </>
      ) : (
        <>
          <div aria-live="off" style={{
            fontVariantNumeric: "tabular-nums", fontSize: 20, fontWeight: 800,
            color: secs <= 5 ? WRONG : "var(--text)",
          }}>{secs}</div>
          {children}
          {phase === "done" && (
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

/** One letter tile - the shape every round draws, in a word or in a row. */
export function Tile({ children, tone = "plain", size = 34 }: {
  children?: ReactNode;
  tone?: "plain" | "gap" | "filled" | "spent";
  size?: number;
}) {
  const border = tone === "gap" ? WRONG : tone === "spent" ? "var(--line, #ccc)" : EDGE;
  const back = tone === "gap" ? "var(--surface)"
    : tone === "filled" ? RIGHT
    : tone === "spent" ? "var(--surface-2, #eee)" : "#F6E7C1";
  return (
    <span style={{
      width: size, height: Math.round(size * 1.24), borderRadius: 6,
      display: "grid", placeItems: "center", border: `2px solid ${border}`,
      background: back, color: tone === "filled" ? "#fff" : INK,
      fontSize: Math.round(size * 0.59), fontWeight: 800, textTransform: "uppercase",
      opacity: tone === "spent" ? 0.35 : 1,
    }}>{children}</span>
  );
}

/**
 * No puzzle means nothing to ask.
 *
 * Unreachable with the shipped pool - each round's own test pins that over
 * hundreds of seeds - and it still may not throw inside a bonus round: the
 * player reached this box with a real word, so the round closes at the floor
 * rather than on an error, and `bonus.ts` has no way to pay less than that.
 */
export function useNoPuzzleGuard({ phase, finish }: RoundClock, puzzle: unknown) {
  useEffect(() => {
    if (phase === "playing" && !puzzle) finish(false);
  }, [finish, phase, puzzle]);
}
