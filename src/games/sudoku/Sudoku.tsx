import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { textFor } from "@i18n/index";
import { formatScore, type GameContext, type RewardTier, type SessionSpec } from "@sdk/index";
import { GameChrome } from "@ui/GameChrome";
import { type DifficultyOption } from "@ui/DifficultySelector";
import { burst } from "@juice/index";
import { useGameSession, useGameTimer, useRememberedLevel, winMoment } from "@shared/index";
import { generate, setCell, conflicts, isSolved, type SudokuState, type Level } from "./logic";

// ONE ordered ramp, animals first: a child starts at 4×4 animals, and expert
// wraps back round to it. This used to be two <DifficultySelector> rows,
// because six pills on one row overflowed a phone. The chrome's toggle shows
// only the CURRENT level, so the width problem is gone and the split with it -
// and a single ramp is also the honest shape, since these are six rungs of one
// ladder rather than two kinds of puzzle.
const LEVEL_OPTIONS: DifficultyOption<Level>[] = [
  { id: "kids4", label: { he: "חיות 4×4", en: "Animals 4×4", es: "Animales 4×4" } },
  { id: "kids6", label: { he: "חיות 6×6", en: "Animals 6×6", es: "Animales 6×6" } },
  { id: "easy", label: { he: "קל", en: "Easy", es: "Fácil" } },
  { id: "medium", label: { he: "בינוני", en: "Med", es: "Media" } },
  { id: "hard", label: { he: "קשה", en: "Hard", es: "Difícil" } },
  { id: "expert", label: { he: "מומחה", en: "Expert", es: "Experto" } },
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

/**
 * The half-filled puzzle, and the clock that belongs to it.
 *
 * Sudoku's record is a solve TIME, which makes `elapsedMs` the field this whole
 * snapshot turns on: restoring the grid alone would hand back a puzzle eight
 * cells from done with the clock at zero, and every abandoned board would
 * become a personal best nobody earned. The clock is part of the position.
 *
 * The whole `SudokuState` travels, `solution` included. Regenerating from the
 * level instead would produce a DIFFERENT puzzle, and re-solving the stored one
 * means shipping a solver to reconstruct something we already had.
 */
interface SudokuSession {
  level: Level;
  state: SudokuState;
  elapsedMs: number;
}

const SESSION: SessionSpec<SudokuSession> = {
  version: 1,
  validate: (value): value is SudokuSession => {
    const s = value as Partial<SudokuSession> | null;
    if (typeof s !== "object" || s === null) return false;
    if (typeof s.level !== "string" || !LEVEL_OPTIONS.some((o) => o.id === s.level)) return false;
    if (typeof s.elapsedMs !== "number" || !Number.isFinite(s.elapsedMs) || s.elapsedMs < 0) return false;
    const g = s.state;
    if (typeof g !== "object" || g === null) return false;
    // Everything this renderer sizes itself from reads off `spec`, so a spec
    // that disagrees with the grids it describes is the one corruption that
    // renders — as a board with missing rows, or one that throws on the first
    // tap into a row that is not there.
    const n = g.spec?.n;
    if (typeof n !== "number" || n < 1) return false;
    const square = (grid: unknown) =>
      Array.isArray(grid) &&
      grid.length === n &&
      grid.every((row) => Array.isArray(row) && row.length === n);
    return square(g.puzzle) && square(g.given) && square(g.solution);
  },
};

export function Sudoku({ ctx }: { ctx: GameContext }) {
  const [level, setLevel] = useRememberedLevel(ctx, LEVEL_OPTIONS.map((o) => o.id), "easy");
  const restored = useMemo(() => ctx.session.load(SESSION), [ctx]);
  // Adopted only when it belongs to the level this mount opened on, and never
  // when it is already solved — a finished grid has nothing left to tap, and
  // returning to one reads as the game having failed to deal a puzzle.
  const resume =
    restored && restored.level === level && !isSolved(restored.state) ? restored : undefined;

  const [state, setState] = useState<SudokuState>(() => resume?.state ?? generate(level));
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [won, setWon] = useState(false);
  // Fastest solve, per LEVEL. A 4×4 animal board and an expert 9×9 are not the
  // same puzzle, so they are not the same record.
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best(level));
  const boardRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  // The clock stops the moment the board is solved, and useGameTimer already
  // stops it on pause — a child who puts the tablet down mid-puzzle must not
  // come back to a ruined time. `initialMs` is the same promise one step
  // further out: walking away entirely, and coming back tomorrow, costs the
  // clock nothing either.
  const timer = useGameTimer(ctx, { running: !won, initialMs: resume?.elapsedMs });

  // Cleared the moment the puzzle is solved, so the next open deals a new one.
  useGameSession(ctx, SESSION, () => ({ level, state, elapsedMs: timer.elapsedMs }), {
    live: !won,
  });

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      ctx.lifecycle.gameplayStart();
      ctx.analytics.levelStart(level);
    }
  }, [ctx, level]);

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
      setBest(ctx.score?.best(lv));
      // Zero, never the abandoned run's minutes — see `initialMs`.
      timer.reset();
      ctx.analytics.levelStart(lv);
    },
    [ctx, level, timer],
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
        // Read the clock here, not from a later render: `won` has only just
        // been set, so the timer is still running for one more tick.
        const solvedMs = timer.elapsedMs;
        const result = winMoment(ctx, {
          reason: "level_complete",
          tier: LEVEL_TIER[level],
          level,
          at: centre,
          ms: solvedMs,
          score: { value: solvedMs, unit: "ms", board: level },
        });
        if (result.score) setBest(result.score.best);
      }
    },
    [ctx, sel, state, won, level, timer],
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

  // This game's own words. A locale RECORD, so promoting a language reds
  // this block by name instead of leaving the game speaking English
  // inside a page that is not.
  const T = textFor(
    {
      he: {
        filled: "מולאו",
        errors: (n: number) => `${n} שגיאות`,
        pickKids: "בחרו תא והקישו חיה",
        pick: "בחרו תא והקישו מספר",
      },
      en: {
        filled: "Filled",
        errors: (n: number) => `${n} errors`,
        pickKids: "Pick a cell, tap an animal",
        pick: "Pick a cell, tap a number",
      },
      es: {
        filled: "Rellenadas",
        errors: (n: number) => `${n} errores`,
        pickKids: "Elige una casilla y toca un animal",
        pick: "Elige una casilla y toca un número",
      },
    },
    ctx.locale,
  );
  const cells = n * n;
  return (
    <GameChrome
      ctx={ctx}
      stats={[
        {
          icon: "clock",
          label: ctx.t("time"),
          value: formatScore(timer.elapsedMs, "ms"),
          ltr: true,
          record: best === undefined ? "-" : formatScore(best, "ms"),
        },
        { icon: "check", label: T.filled, value: `${cells - empties}/${cells}`, ltr: true, compact: true },
      ]}
      levels={LEVEL_OPTIONS}
      level={level}
      onLevel={(lv) => reset(lv)}
      onRestart={() => reset()}
      footer={
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", minHeight: 18 }}>
            {won
              ? ctx.t("youWon") + " 🎉"
              : bad.size > 0
                ? T.errors(bad.size)
                : kids
                  ? T.pickKids
                  : T.pick}
          </div>
          {/* Keypad — the same glyphs the board shows. Kids sizes get ≥64px
              targets. This is exactly what the footer region exists for. */}
          <div
            dir="ltr"
            style={{ display: "grid", gridTemplateColumns: `repeat(${padCols}, 1fr)`, gap: 8, width: "100%" }}
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
                  background: "var(--surface)",
                  boxShadow: "var(--shadow-1)",
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
        </div>
      }
    >
      {/* dir="ltr" — a spatial grid must not mirror in the Hebrew RTL app, so
          logical column 0 stays on the visual left and the box rules line up. */}
      <div
        dir="ltr"
        ref={boardRef}
        className="ellaz-play-surface"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${n}, 1fr)`,
          width: "min(94vw, 44vh, 440px)",
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
    </GameChrome>
  );
}
