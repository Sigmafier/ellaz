import { useCallback, useEffect, useRef, useState } from "react";
import type { GameContext } from "@sdk/index";
import { GameChrome } from "@ui/GameChrome";
import { type DifficultyOption } from "@ui/DifficultySelector";
import { burst, shake, haptic } from "@juice/index";
import { winMoment } from "@shared/index";
import { emptyBoard, winner, isDraw, place, chooseMove, type Board, type Difficulty } from "./logic";

type Score = { wins: number; losses: number; draws: number };

const DIFF_OPTIONS: DifficultyOption<Difficulty>[] = [
  { id: "easy", label: { he: "קל", en: "Easy" } },
  { id: "medium", label: { he: "בינוני", en: "Med" } },
  { id: "hard", label: { he: "קשה", en: "Hard" } },
];

// Human is X (goes first), AI is O. Tap a cell to play. Difficulty tunes the AI:
// easy = random, medium = ~50% optimal, hard = unbeatable minimax.
export function TicTacToe({ ctx }: { ctx: GameContext }) {
  const [board, setBoard] = useState<Board>(() => emptyBoard());
  const [busy, setBusy] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [score, setScore] = useState<Score>({ wins: 0, losses: 0, draws: 0 });
  // The record is the LONGEST RUN OF WINS in a row, per DIFFICULTY — the three
  // AIs are different opponents (easy is random, hard is unbeatable minimax), and
  // the tally already zeroes on a difficulty change. Hard's record may honestly
  // stay empty: a perfect minimax opponent can be drawn but never beaten.
  // Seeded from "medium" because that is this game's opening difficulty.
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best("medium"));
  // Held in a ref, not state: `finish` runs both from the click handler and from
  // a setTimeout, where a state read would be stale — and this count must be exact.
  const streakRef = useRef(0);
  const boardRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const win = winner(board);
  const draw = isDraw(board);
  const done = !!win || draw;

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      ctx.lifecycle.gameplayStart();
      ctx.analytics.levelStart("vs-ai");
    }
  }, [ctx]);

  // Restart deliberately does NOT break the streak: abandoning a board is not a
  // loss, and this platform does not punish walking away from one. The cost is
  // that a streak can be farmed by restarting every game that turns bad — which
  // is fine for a personal best and is worth remembering before this number is
  // ever ranked against other players.
  const reset = useCallback(() => {
    setBoard(emptyBoard());
    setBusy(false);
    ctx.analytics.levelStart("vs-ai");
  }, [ctx]);

  const finish = useCallback(
    (b: Board) => {
      const w = winner(b);
      if (w) {
        if (w.player === "X") {
          setScore((s) => ({ ...s, wins: s.wins + 1 }));
          const r = boardRef.current?.getBoundingClientRect();
          const centre = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined;
          if (centre) burst(centre.x, centre.y, { count: 14 });
          // Only a WIN pays. A loss or a draw grants nothing — never a
          // consolation reward, and the wallet is add-only so never a penalty.
          // Extend the run BEFORE reporting, so the score is this win included.
          streakRef.current += 1;
          const won = winMoment(ctx, {
            reason: "level_complete",
            tier: difficulty,
            level: "vs-ai",
            at: centre,
            score: { value: streakRef.current, unit: "points", board: difficulty },
          });
          if (won.score) setBest(won.score.best);
        } else {
          // The AI won: the run of wins is over.
          streakRef.current = 0;
          setScore((s) => ({ ...s, losses: s.losses + 1 }));
          ctx.audio.play("fail");
          if (boardRef.current) shake(boardRef.current);
          ctx.analytics.levelFail("vs-ai", "ai-won");
        }
      } else if (isDraw(b)) {
        // A draw also breaks the run — it is a streak of WINS. Hard mode is
        // unbeatable minimax, so a draw there is the common outcome and must
        // never quietly count as one.
        streakRef.current = 0;
        setScore((s) => ({ ...s, draws: s.draws + 1 }));
        ctx.audio.play("pop");
      }
    },
    [ctx, difficulty],
  );

  // Switching difficulty starts a clean slate: fresh board + zeroed tally, so
  // the score always reflects a single difficulty.
  const changeDifficulty = useCallback(
    (level: Difficulty) => {
      if (level === difficulty) return;
      setDifficulty(level);
      setScore({ wins: 0, losses: 0, draws: 0 });
      streakRef.current = 0;
      setBest(ctx.score?.best(level));
      reset();
    },
    [ctx, difficulty, reset],
  );

  const onCell = useCallback(
    (i: number) => {
      if (done || busy || board[i] !== null) return;
      ctx.audio.unlock();
      ctx.speech.unlock();
      ctx.audio.play("tap");
      haptic.tap();
      const afterHuman = place(board, i, "X");
      setBoard(afterHuman);
      if (winner(afterHuman) || isDraw(afterHuman)) {
        finish(afterHuman);
        return;
      }
      // AI replies after a short beat so the move is legible.
      setBusy(true);
      setTimeout(() => {
        const aiMove = chooseMove(afterHuman, "O", difficulty);
        const afterAi = place(afterHuman, aiMove, "O");
        setBoard(afterAi);
        setBusy(false);
        ctx.audio.play("flip");
        if (winner(afterAi) || isDraw(afterAi)) finish(afterAi);
      }, 380);
    },
    [board, busy, done, ctx, finish, difficulty],
  );

  const status = win
    ? win.player === "X"
      ? ctx.t("youWon")
      : ctx.t("gameOver")
    : draw
      ? ctx.locale === "he"
        ? "תיקו"
        : "Draw"
      : ctx.locale === "he"
        ? "התור שלך"
        : "Your turn";

  const he = ctx.locale === "he";

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "trophy", label: ctx.t("best"), value: best ?? "-" },
        { icon: "star", label: he ? "ניצחונות" : "Wins", value: score.wins },
        { icon: "draw", label: he ? "תיקו" : "Draws", value: score.draws },
      ]}
      levels={DIFF_OPTIONS}
      level={difficulty}
      onLevel={changeDifficulty}
      onRestart={reset}
      // The footer is this game's own area. tictactoe has no secondary controls
      // to put there - so it says the one thing a player actually wants, at a
      // size a five-year-old can read across a room. See GameChrome's note on
      // why that region exists and why leaving it empty is the worse option.
      footer={
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "var(--radius-2)",
            boxShadow: "var(--shadow-1)",
            padding: "15px 12px",
            minHeight: 98,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            textAlign: "center",
          }}
        >
          <b style={{ fontSize: 25, fontFamily: "Fredoka, inherit" }}>{status}</b>
          <span style={{ fontSize: 13.5, color: "var(--text-dim)" }}>
            {he ? "שלושה ברצף מנצחים" : "Three in a row wins"}
          </span>
        </div>
      }
    >
      <div
        ref={boardRef}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          // explicit equal rows: without this, a cell holding a big X/O glyph grows
          // its row taller than the empty rows and the square board deforms
          gridTemplateRows: "repeat(3, 1fr)",
          gap: 10,
          width: "min(88vw, 46vh, 420px)",
          aspectRatio: "1",
        }}
      >
        {board.map((cell, i) => {
          const winning = win?.line.includes(i);
          return (
            <button
              key={i}
              className={winning ? "ellaz-pulse" : undefined}
              aria-label={cell ?? `cell ${i + 1}`}
              onClick={() => onCell(i)}
              style={{
                border: "none",
                borderRadius: 16,
                background: winning ? "linear-gradient(180deg,#55efc4,#00cec9)" : "var(--surface)",
                color: cell === "X" ? "var(--brand-2)" : "var(--teal)",
                fontSize: "clamp(36px, 12vw, 72px)",
                fontWeight: 800,
                lineHeight: 1,
                // grid items must be allowed to shrink below content size so the
                // glyph never forces the cell to grow
                minWidth: 0,
                minHeight: 0,
                overflow: "hidden",
                display: "grid",
                placeItems: "center",
                boxShadow: "var(--shadow-1)",
              }}
            >
              {cell}
            </button>
          );
        })}
      </div>
    </GameChrome>
  );
}
