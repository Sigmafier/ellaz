import { useCallback, useEffect, useRef, useState } from "react";
import { formatScore, type GameContext } from "@sdk/index";
import { GameChrome } from "@ui/GameChrome";
import { type DifficultyOption } from "@ui/DifficultySelector";
import { burst, shake, haptic } from "@juice/index";
import { useGameTimer, winMoment } from "@shared/index";
import { newGame, reveal, toggleFlag, DIFFICULTIES, type MineState, type Difficulty } from "./logic";

const NUM_COLORS = ["", "#4d7cff", "#2e9e5b", "#e0533d", "#7a44c9", "#c9962e", "#2aa7b8", "#c94f9e", "#666"];

type DiffKey = "easy" | "medium" | "hard";

const DIFF_OPTIONS: DifficultyOption<DiffKey>[] = [
  { id: "easy", label: { he: "קל", en: "Easy" } },
  { id: "medium", label: { he: "בינוני", en: "Med" } },
  { id: "hard", label: { he: "קשה", en: "Hard" } },
];

// Analytics/reward level name for a given config (avoids brittle chained ternaries as difficulties grow).
function levelName(d: Difficulty): DiffKey {
  if (d === DIFFICULTIES.hard) return "hard";
  if (d === DIFFICULTIES.medium) return "medium";
  return "easy";
}

export function Minesweeper({ ctx }: { ctx: GameContext }) {
  const [diff, setDiff] = useState<Difficulty>(DIFFICULTIES.easy);
  const [state, setState] = useState<MineState>(() => newGame(DIFFICULTIES.easy));
  const [flagMode, setFlagMode] = useState(false);
  // Fastest clear, per DIFFICULTY. Nine mines and forty are different games.
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best("easy"));
  const boardRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  // Stops on a win AND on a death — a board you lost has no time worth showing.
  // useGameTimer also stops on pause, so putting the tablet down costs nothing.
  const timer = useGameTimer(ctx, { running: !state.won && !state.dead });

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      ctx.lifecycle.gameplayStart();
      ctx.analytics.levelStart("easy");
    }
  }, [ctx]);

  const reset = useCallback(
    (d = diff) => {
      setDiff(d);
      setState(newGame(d));
      setBest(ctx.score?.best(levelName(d)));
      timer.reset();
      ctx.analytics.levelStart(levelName(d));
    },
    [ctx, diff, timer],
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

  const he = ctx.locale === "he";
  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "flag", label: he ? "דגלים" : "Flags", value: state.flagsLeft },
        // A clock reads right-to-left in Hebrew and "1:30" becomes "30:1".
        { icon: "clock", label: ctx.t("time"), value: formatScore(timer.elapsedMs, "ms"), ltr: true },
        { icon: "trophy", label: ctx.t("best"), value: best === undefined ? "-" : formatScore(best, "ms"), ltr: true },
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
                  ? he
                    ? "מצב דגל 🚩"
                    : "Flag mode 🚩"
                  : he
                    ? "מצב חשיפה"
                    : "Reveal mode"}
          </span>
          <span style={{ fontSize: 13, opacity: 0.85 }}>
            {flagMode
              ? he
                ? "הקישו לסמן · לחצו כאן לחזרה לחשיפה"
                : "Tap to mark · press here to go back to revealing"
              : he
                ? "הקישו לחשוף · לחצו כאן לסימון דגלים"
                : "Tap to reveal · press here to place flags"}
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
