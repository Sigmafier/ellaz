import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { textFor } from "@i18n/index";
import { formatScore, type GameContext, type SessionSpec } from "@sdk/index";
import { GameChrome } from "@ui/GameChrome";
import { type DifficultyOption } from "@ui/DifficultySelector";
import { burst, shake, haptic } from "@juice/index";
import { useGameSession, useGameTimer, useRememberedLevel, winMoment } from "@shared/index";
import { newGame, reveal, toggleFlag, DIFFICULTIES, type MineState, type Difficulty } from "./logic";

const NUM_COLORS = ["", "#4d7cff", "#2e9e5b", "#e0533d", "#7a44c9", "#c9962e", "#2aa7b8", "#c94f9e", "#666"];

type DiffKey = "easy" | "medium" | "hard";

const DIFF_OPTIONS: DifficultyOption<DiffKey>[] = [
  { id: "easy", label: { he: "קל", en: "Easy", es: "Fácil" } },
  { id: "medium", label: { he: "בינוני", en: "Med", es: "Media" } },
  { id: "hard", label: { he: "קשה", en: "Hard", es: "Difícil" } },
];

// Analytics/reward level name for a given config (avoids brittle chained ternaries as difficulties grow).
function levelName(d: Difficulty): DiffKey {
  if (d === DIFFICULTIES.hard) return "hard";
  if (d === DIFFICULTIES.medium) return "medium";
  return "easy";
}

/**
 * The board mid-clear, and the clock that goes with it.
 *
 * `elapsedMs` is the load-bearing field. Minesweeper's record is a TIME, so
 * restoring the grid without the clock would hand a returning player a board
 * that is three-quarters cleared and a timer reading zero — a personal best
 * they did not earn, on every board they ever walk away from. The clock is part
 * of the position, not decoration around it.
 *
 * `level` is stored and checked on the way back in. It cannot disagree with the
 * remembered difficulty in practice, since both are written together; storing
 * it makes the case where they somehow do a discarded snapshot rather than a
 * 14x14 grid rendered under a chrome that says "Easy".
 */
interface MinesSession {
  level: DiffKey;
  state: MineState;
  elapsedMs: number;
}

const SESSION: SessionSpec<MinesSession> = {
  version: 1,
  validate: (value): value is MinesSession => {
    const s = value as Partial<MinesSession> | null;
    if (typeof s !== "object" || s === null) return false;
    if (typeof s.level !== "string" || !(s.level in DIFFICULTIES)) return false;
    if (typeof s.elapsedMs !== "number" || !Number.isFinite(s.elapsedMs) || s.elapsedMs < 0) return false;
    const g = s.state;
    if (typeof g !== "object" || g === null) return false;
    // The grid must match the dimensions it claims AND the difficulty it says
    // it belongs to. Either one alone lets a truncated write through as a board
    // that renders and then indexes out of bounds on the first tap.
    const spec = DIFFICULTIES[s.level];
    if (g.rows !== spec.rows || g.cols !== spec.cols) return false;
    return (
      Array.isArray(g.grid) &&
      g.grid.length === g.rows &&
      g.grid.every((row) => Array.isArray(row) && row.length === g.cols)
    );
  },
};

export function Minesweeper({ ctx }: { ctx: GameContext }) {
  const [levelId, setLevelId] = useRememberedLevel(
    ctx,
    DIFF_OPTIONS.map((o) => o.id),
    "easy",
  );
  const restored = useMemo(() => ctx.session.load(SESSION), [ctx]);
  // Only adopted when it belongs to the difficulty this mount opened on, and
  // never when the run it describes is already over — a cleared or exploded
  // board has nothing left to do, and returning to one would look like the game
  // failed to start.
  const resume =
    restored && restored.level === levelId && !restored.state.won && !restored.state.dead
      ? restored
      : undefined;

  const [diff, setDiff] = useState<Difficulty>(DIFFICULTIES[levelId]);
  const [state, setState] = useState<MineState>(() => resume?.state ?? newGame(DIFFICULTIES[levelId]));
  const [flagMode, setFlagMode] = useState(false);
  // Fastest clear, per DIFFICULTY. Nine mines and forty are different games.
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best(levelId));
  const boardRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  // Stops on a win AND on a death — a board you lost has no time worth showing.
  // useGameTimer also stops on pause, so putting the tablet down costs nothing.
  // `initialMs` continues a resumed clear rather than restarting its clock.
  const timer = useGameTimer(ctx, {
    running: !state.won && !state.dead,
    initialMs: resume?.elapsedMs,
  });

  // A board is worth returning to only while it is still in play. `live` going
  // false on a win or a death CLEARS the snapshot, so the next open deals a
  // fresh grid.
  useGameSession(
    ctx,
    SESSION,
    () => ({ level: levelName(diff), state, elapsedMs: timer.elapsedMs }),
    { live: !state.won && !state.dead },
  );

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      ctx.lifecycle.gameplayStart();
      ctx.analytics.levelStart(levelId);
    }
  }, [ctx, levelId]);

  const reset = useCallback(
    (d = diff) => {
      setDiff(d);
      setLevelId(levelName(d));
      setState(newGame(d));
      setBest(ctx.score?.best(levelName(d)));
      // Back to zero, never to the abandoned run's minutes — see `initialMs`.
      timer.reset();
      ctx.analytics.levelStart(levelName(d));
    },
    [ctx, diff, timer, setLevelId],
  );

  const act = useCallback(
    (r: number, c: number, flag: boolean, clientX?: number, clientY?: number) => {
      if (state.dead || state.won) return;
      ctx.audio.unlock();
      ctx.speech.unlock();
      if (flag) {
        setState(toggleFlag(state, r, c));
        ctx.audio.play("tap");
        haptic.tap();
        return;
      }
      const ns = reveal(state, r, c);
      setState(ns);
      if (ns.dead) {
        ctx.audio.play("fail");
        haptic.fail();
        if (boardRef.current) shake(boardRef.current);
        ctx.analytics.levelFail(levelName(diff), "mine");
      } else if (ns.won) {
        if (clientX != null && clientY != null) burst(clientX, clientY, { count: 14 });
        const board = boardRef.current?.getBoundingClientRect();
        // Read the clock now: `state.won` flips on the next render, so the
        // timer is still running at this point.
        const clearedMs = timer.elapsedMs;
        const result = winMoment(ctx, {
          reason: "level_complete",
          tier: levelName(diff),
          level: levelName(diff),
          ms: clearedMs,
          score: { value: clearedMs, unit: "ms", board: levelName(diff) },
          at:
            clientX != null && clientY != null
              ? { x: clientX, y: clientY }
              : board
                ? { x: board.left + board.width / 2, y: board.top + board.height / 2 }
                : undefined,
        });
        if (result.score) setBest(result.score.best);
      } else {
        ctx.audio.play("pop");
      }
    },
    [ctx, state, diff],
  );

  const cellContent = (cell: MineState["grid"][number][number]) => {
    if (cell.flagged && !cell.revealed) return "🚩";
    if (!cell.revealed) return "";
    if (cell.mine) return "💣";
    return cell.adj > 0 ? String(cell.adj) : "";
  };

  // This game's own words. A locale RECORD, so promoting a language reds
  // this block by name instead of leaving the game speaking English
  // inside a page that is not.
  const T = textFor(
    {
      he: {
        flags: "דגלים",
        flagMode: "מצב דגל 🚩",
        revealMode: "מצב חשיפה",
        flagHint: "הקישו לסמן · לחצו כאן לחזרה לחשיפה",
        revealHint: "הקישו לחשוף · לחצו כאן לסימון דגלים",
      },
      en: {
        flags: "Flags",
        flagMode: "Flag mode 🚩",
        revealMode: "Reveal mode",
        flagHint: "Tap to mark · press here to go back to revealing",
        revealHint: "Tap to reveal · press here to place flags",
      },
      es: {
        flags: "Banderas",
        flagMode: "Modo bandera 🚩",
        revealMode: "Modo descubrir",
        flagHint: "Toca para marcar · pulsa aquí para volver a descubrir",
        revealHint: "Toca para descubrir · pulsa aquí para poner banderas",
      },
    },
    ctx.locale,
  );
  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "flag", label: T.flags, value: state.flagsLeft, compact: true },
        // A clock reads right-to-left in Hebrew and "1:30" becomes "30:1".
        {
          icon: "clock",
          label: ctx.t("time"),
          value: formatScore(timer.elapsedMs, "ms"),
          ltr: true,
          record: best === undefined ? "-" : formatScore(best, "ms"),
        },
      ]}
      levels={DIFF_OPTIONS}
      level={levelName(diff)}
      onLevel={(id) => reset(DIFFICULTIES[id])}
      onRestart={() => reset()}
      // Flag mode is a MODE, not an action, and it is used on nearly every turn.
      // It gets the footer: a thumb reaches the bottom of a phone far more
      // easily than the top, and a full-width button can show which mode is on
      // instead of relying on a tint the player has to remember the meaning of.
      footer={
        <button
          type="button"
          aria-label="flag mode"
          aria-pressed={flagMode}
          onClick={() => setFlagMode((f) => !f)}
          style={{
            width: "100%",
            border: "none",
            borderRadius: "var(--radius-2)",
            background: flagMode ? "var(--brand)" : "var(--surface)",
            color: flagMode ? "#fff" : "var(--text)",
            boxShadow: "var(--shadow-1)",
            fontFamily: "inherit",
            padding: "12px 14px",
            minHeight: 68,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 17, fontWeight: 800 }}>
            {state.dead
              ? ctx.t("gameOver")
              : state.won
                ? ctx.t("youWon")
                : flagMode
                  ? T.flagMode
                  : T.revealMode}
          </span>
          <span style={{ fontSize: 13, opacity: 0.85 }}>
            {flagMode ? T.flagHint : T.revealHint}
          </span>
        </button>
      }
    >
      <div
        ref={boardRef}
        className="ellaz-play-surface"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${state.cols}, 1fr)`,
          gap: 3,
          width: `min(94vw, 52vh, ${state.cols * 42}px)`,
          aspectRatio: `${state.cols} / ${state.rows}`,
          background: "#2b2f57",
          padding: 4,
          borderRadius: 10,
          touchAction: "none",
        }}
      >
        {state.grid.map((row, r) =>
          row.map((cell, c) => {
            const revealed = cell.revealed;
            return (
              <button
                key={`${r}-${c}`}
                aria-label={`cell ${r + 1},${c + 1}`}
                onClick={(e) => act(r, c, flagMode, e.clientX, e.clientY)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  act(r, c, true);
                }}
                style={{
                  border: "none",
                  borderRadius: 4,
                  background: revealed
                    ? cell.mine
                      ? "#ff7675"
                      : "rgba(255,255,255,0.10)"
                    : "linear-gradient(180deg,#5a5fa8,#474c86)",
                  color: cell.revealed && cell.adj > 0 ? NUM_COLORS[cell.adj] : "#fff",
                  fontWeight: 800,
                  fontSize: "clamp(11px, 3.4vw, 20px)",
                  display: "grid",
                  placeItems: "center",
                  padding: 0,
                  aspectRatio: "1",
                }}
              >
                {cellContent(cell)}
              </button>
            );
          }),
        )}
      </div>
    </GameChrome>
  );
}
