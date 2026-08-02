import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameContext, RewardTier } from "@sdk/index";
import { Button } from "@ui/components";
import { DifficultySelector, type DifficultyOption } from "@ui/DifficultySelector";
import { burst } from "@juice/index";
import { winMoment } from "@shared/index";
import { generate, setCell, conflicts, isSolved, type SudokuState, type Level } from "./logic";

// Two rows, both the shared <DifficultySelector>: the animal boards a young
// child can finish, and the classic digit boards. Splitting them keeps six
// options off one non-wrapping row (it overflows a phone) and reads as what it
// is — pick animals, or pick numbers.
const KIDS_OPTIONS: DifficultyOption<Level>[] = [
  { id: "kids4", label: { he: "חיות 4×4", en: "Animals 4×4" } },
  { id: "kids6", label: { he: "חיות 6×6", en: "Animals 6×6" } },
];

const DIGIT_OPTIONS: DifficultyOption<Level>[] = [
  { id: "easy", label: { he: "קל", en: "Easy" } },
  { id: "medium", label: { he: "בינוני", en: "Med" } },
  { id: "hard", label: { he: "קשה", en: "Hard" } },
  { id: "expert", label: { he: "מומחה", en: "Expert" } },
];

// Sudoku has six levels; the economy has three tiers. The two animal boards are
// a child's first win, so they pay easy/medium. Expert still pays as hard.
const LEVEL_TIER: Record<Level, RewardTier> = {
  kids4: "easy",
  kids6: "medium",
  easy: "easy",
  medium: "medium",
  hard: "hard",
  expert: "hard",
};

// Six animals a five-year-old can tell apart at thumbnail size: different
// silhouettes and different dominant colours, never six similar faces. Index
// i holds the glyph for value i+1; a 4×4 board uses the first four.
// (`castOf("animals")` in @shared did not exist when this was written, so the
// cast lives here. Swap to the shared one once it lands.)
const ANIMALS = ["🐘", "🦁", "🐸", "🐧", "🦉", "🐢"] as const;
const ANIMAL_NAMES = ["elephant", "lion", "frog", "penguin", "owl", "turtle"] as const;

export function Sudoku({ ctx }: { ctx: GameContext }) {
  const [level, setLevel] = useState<Level>("easy");
  const [state, setState] = useState<SudokuState>(() => generate("easy"));
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [won, setWon] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      ctx.lifecycle.gameplayStart();
      ctx.analytics.levelStart("easy");
    }
  }, [ctx]);

  const bad = useMemo(() => conflicts(state), [state]);

  // Everything size-bound reads off the state's own spec, so the board, the
  // box rules and the keypad can never disagree about which puzzle is showing.
  const { n, boxR, boxC } = state.spec;
  const kids = n < 9;
  const glyph = (v: number) => (v === 0 ? "" : kids ? ANIMALS[v - 1] : String(v));

  const reset = useCallback(
    (lv: Level = level) => {
      setLevel(lv);
      setState(generate(lv));
      setSel(null);
      setWon(false);
      ctx.analytics.levelStart(lv);
    },
    [ctx, level],
  );

  const enter = useCallback(
    (v: number) => {
      if (won || !sel) return;
      const [r, c] = sel;
      if (state.given[r][c]) return;
      ctx.audio.unlock();
      ctx.speech.unlock();
      const ns = setCell(state, r, c, v);
      setState(ns);
      ctx.audio.play(v === 0 ? "tap" : "pop");
      if (isSolved(ns)) {
        setWon(true);
        const rect = boardRef.current?.getBoundingClientRect();
        const centre = rect
          ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
          : undefined;
        if (centre) burst(centre.x, centre.y, { count: 16 });
        winMoment(ctx, {
          reason: "level_complete",
          tier: LEVEL_TIER[level],
          level,
          at: centre,
        });
      }
    },
    [ctx, sel, state, won, level],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const d = Number(e.key);
      if (e.key.length === 1 && d >= 1 && d <= n) enter(d);
      else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") enter(0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enter, n]);

  const selVal = sel ? state.puzzle[sel[0]][sel[1]] : 0;
  const empties = useMemo(
    () => state.puzzle.reduce((n2, row) => n2 + row.filter((v) => v === 0).length, 0),
    [state],
  );

  const padCols = kids ? 4 : 5;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        <DifficultySelector
          options={KIDS_OPTIONS}
          value={level}
          onChange={(lv) => reset(lv)}
          locale={ctx.locale}
          kids
        />
        <DifficultySelector
          options={DIGIT_OPTIONS}
          value={level}
          onChange={(lv) => reset(lv)}
          locale={ctx.locale}
        />
        <Button variant="ghost" onClick={() => reset()}>
          {ctx.t("restart")}
        </Button>
      </div>

      {/* dir="ltr" — a spatial grid must not mirror in the Hebrew RTL app, so
          logical column 0 stays on the visual left and the box rules line up. */}
      <div
        dir="ltr"
        ref={boardRef}
        className="ellaz-play-surface"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${n}, 1fr)`,
          width: "min(94vw, 60vh, 440px)",
          aspectRatio: "1",
          background: "#20244a",
          border: "3px solid #6c5ce7",
          borderRadius: 8,
          touchAction: "none",
        }}
      >
        {state.puzzle.map((row, r) =>
          row.map((v, c) => {
            const selected = sel && sel[0] === r && sel[1] === c;
            const sameVal = selVal !== 0 && v === selVal;
            const conflict = bad.has(`${r},${c}`);
            return (
              <button
                key={`${r}-${c}`}
                aria-label={`cell ${r + 1},${c + 1}`}
                onClick={() => setSel([r, c])}
                style={{
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRight: c % boxC === boxC - 1 && c !== n - 1 ? "2px solid #6c5ce7" : undefined,
                  borderBottom: r % boxR === boxR - 1 && r !== n - 1 ? "2px solid #6c5ce7" : undefined,
                  background: selected
                    ? "#4a4f96"
                    : sameVal
                      ? "rgba(108,92,231,0.25)"
                      : "transparent",
                  color: conflict ? "#ff7675" : state.given[r][c] ? "#ffffff" : "#a29bfe",
                  fontWeight: state.given[r][c] ? 800 : 600,
                  fontSize: kids ? "clamp(24px, 9vw, 48px)" : "clamp(14px, 4.4vw, 26px)",
                  // A conflicting animal can't be tinted red like a digit, so
                  // dim it instead — the feedback stays gentle either way.
                  opacity: kids && conflict ? 0.45 : 1,
                  padding: 0,
                  aspectRatio: "1",
                  lineHeight: 1,
                }}
              >
                {glyph(v)}
              </button>
            );
          }),
        )}
      </div>

      {/* Keypad — the same glyphs the board shows. Kids sizes get ≥64px targets. */}
      <div
        dir="ltr"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${padCols}, 1fr)`,
          gap: 8,
          width: "min(94vw, 440px)",
        }}
      >
        {Array.from({ length: n }, (_, i) => i + 1).map((v) => (
          <button
            key={v}
            aria-label={kids ? `enter ${ANIMAL_NAMES[v - 1]}` : `enter ${v}`}
            onClick={() => enter(v)}
            style={{
              minHeight: kids ? 64 : 48,
              border: "none",
              borderRadius: 10,
              background: "var(--surface-2)",
              color: "var(--text)",
              fontSize: kids ? 34 : 22,
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            {glyph(v)}
          </button>
        ))}
        <button
          aria-label="erase"
          onClick={() => enter(0)}
          style={{
            minHeight: kids ? 64 : 48,
            border: "none",
            borderRadius: 10,
            background: "var(--surface-2)",
            color: "var(--text)",
            fontSize: kids ? 28 : 20,
          }}
        >
          ⌫
        </button>
      </div>

      <div style={{ color: "var(--text-dim)", fontSize: 13, display: "flex", gap: 10, alignItems: "center" }}>
        <span>
          {won
            ? ctx.t("youWon") + " 🎉"
            : ctx.locale === "he"
              ? kids
                ? "בחרו תא והקישו חיה"
                : "בחרו תא והקישו מספר"
              : kids
                ? "Pick a cell, tap an animal"
                : "Pick a cell, tap a number"}
        </span>
        {!won && (
          <span style={{ opacity: 0.7 }}>
            {ctx.locale === "he" ? `נותרו ${empties}` : `${empties} left`}
            {bad.size > 0 ? (ctx.locale === "he" ? ` · ${bad.size} שגיאות` : ` · ${bad.size} errors`) : ""}
          </span>
        )}
      </div>
    </div>
  );
}
