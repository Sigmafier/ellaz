import { useCallback, useEffect, useRef, useState } from "react";
import type { GameContext } from "@sdk/index";
import { Button, Stat } from "@ui/components";
import { DifficultySelector, type DifficultyOption } from "@ui/DifficultySelector";
import { burst, shake, haptic } from "@juice/index";
import { winMoment } from "@shared/index";
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
  const boardRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

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
      ctx.analytics.levelStart(levelName(d));
    },
    [ctx, diff],
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
        winMoment(ctx, {
          reason: "level_complete",
          tier: levelName(diff),
          level: levelName(diff),
          at:
            clientX != null && clientY != null
              ? { x: clientX, y: clientY }
              : board
                ? { x: board.left + board.width / 2, y: board.top + board.height / 2 }
                : undefined,
        });
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

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        <Stat label={ctx.locale === "he" ? "דגלים" : "Flags"} value={state.flagsLeft} />
        <Button
          variant={flagMode ? "primary" : "ghost"}
          ariaLabel="flag mode"
          onClick={() => setFlagMode((f) => !f)}
        >
          🚩
        </Button>
        <Button variant="ghost" onClick={() => reset()}>
          {state.dead ? "😵" : state.won ? "😎" : "🙂"}
        </Button>
        <DifficultySelector
          options={DIFF_OPTIONS}
          value={levelName(diff)}
          onChange={(id) => reset(DIFFICULTIES[id])}
          locale={ctx.locale}
        />
      </div>

      <div
        ref={boardRef}
        className="ellaz-play-surface"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${state.cols}, 1fr)`,
          gap: 3,
          width: `min(94vw, 62vh, ${state.cols * 42}px)`,
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

      <div style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center" }}>
        {state.dead
          ? ctx.t("gameOver")
          : state.won
            ? ctx.t("youWon")
            : flagMode
              ? ctx.locale === "he"
                ? "מצב דגל: הקישו לסמן 🚩"
                : "Flag mode: tap to mark 🚩"
              : ctx.locale === "he"
                ? "הקישו לחשוף · 🚩 לסימון"
                : "Tap to reveal · 🚩 to flag"}
      </div>
    </div>
  );
}
