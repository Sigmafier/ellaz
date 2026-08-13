import { textFor } from "@i18n/index";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GameContext } from "@sdk/index";
import { GameChrome } from "@ui/GameChrome";
import { type DifficultyOption } from "@ui/DifficultySelector";
import { burst, shake, haptic } from "@juice/index";
import { winMoment, useRememberedLevel } from "@shared/index";
// Direct module paths, not the `@shared` barrel: pass-and-play is two games'
// worth of code and the barrel would pull it into every other game's chunk.
// `finish` is aliased because this component already has a `finish` of its own
// for the solo path, and a shadowed import is a silent wrong-function call.
import {
  finish as finishMatch,
  newVersus,
  nextMatch,
  pass,
  versusWords,
  type Seat,
  type VersusState,
} from "@shared/versus";
import { VersusBanner, VersusToggle } from "@shared/VersusBanner";
import { versusMatchEnd } from "@shared/versusMoment";
import { emptyBoard, winner, isDraw, place, chooseMove, type Board, type Difficulty } from "./logic";

type Score = { wins: number; losses: number; draws: number };

/**
 * Which mark each seat plays. Seat 0 is X and opens, exactly as the human does
 * against the AI — so the board looks identical in both modes and a child who
 * has played alone already knows which shape is theirs.
 *
 * The two seat COLOURS in `versus.ts` are the two colours this game has always
 * drawn X and O in, so the banner and the board agree without either of them
 * having to say so.
 */
const SEAT_MARK = ["X", "O"] as const;

const DIFF_OPTIONS: DifficultyOption<Difficulty>[] = [
  { id: "easy", label: { he: "קל", en: "Easy", es: "Fácil" } },
  { id: "medium", label: { he: "בינוני", en: "Med", es: "Media" } },
  { id: "hard", label: { he: "קשה", en: "Hard", es: "Difícil" } },
];

// Human is X (goes first), AI is O. Tap a cell to play. Difficulty tunes the AI:
// easy = random, medium = ~50% optimal, hard = unbeatable minimax.
export function TicTacToe({ ctx }: { ctx: GameContext }) {
  const [board, setBoard] = useState<Board>(() => emptyBoard());
  const [busy, setBusy] = useState(false);
  const [difficulty, setDifficulty] = useRememberedLevel(
    ctx,
    DIFF_OPTIONS.map((o) => o.id),
    "medium",
  );
  const [score, setScore] = useState<Score>({ wins: 0, losses: 0, draws: 0 });
  // The record is the LONGEST RUN OF WINS in a row, per DIFFICULTY — the three
  // AIs are different opponents (easy is random, hard is unbeatable minimax), and
  // the tally already zeroes on a difficulty change. Hard's record may honestly
  // stay empty: a perfect minimax opponent can be drawn but never beaten.
  // Seeded from "medium" because that is this game's opening difficulty.
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best(difficulty));
  // Held in a ref, not state: `finish` runs both from the click handler and from
  // a setTimeout, where a state read would be stale — and this count must be exact.
  const streakRef = useRef(0);
  const boardRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  // PASS-AND-PLAY. `undefined` means one player against the AI, which is what
  // this game has always been; a state means two people are sitting here.
  //
  // It is deliberately NOT persisted anywhere. `ctx.session` is device-local
  // memory of where a PLAYER left off, and a match is two people who are in the
  // room together — restoring one into a room the second player has left is
  // worse than a clean board. That also disposes of the reward-latch problem
  // the session convention warns about: nothing about a match reaches the disk,
  // so nothing about a match can be restored and paid twice.
  const [versus, setVersus] = useState<VersusState | undefined>(undefined);
  // One payout per match, latched here rather than derived from the board: the
  // terminal position is reachable from two code paths and `winMoment` must not
  // run twice for one match.
  const paidRef = useRef(false);
  /**
   * Which board the pending AI reply belongs to.
   *
   * The AI answers after a 380ms beat, from a `setTimeout` holding the board it
   * was thinking about. Anything that deals a new board inside that window — the
   * restart button, a difficulty change, and now the two-player switch — leaves
   * that timer alive, and it lands `setBoard(afterAi)` on top of the fresh board
   * a moment later. The player watches their new game turn back into the old one
   * with an extra O in it, and nothing errors.
   *
   * It is a pre-existing hole (restart has always been able to hit it) that
   * two-player mode adds a second, much easier door to, so it is fixed here
   * rather than left for the mode to walk through.
   */
  const dealRef = useRef(0);
  const win = winner(board);
  const draw = isDraw(board);
  const done = !!win || draw;
  // Who won the match on screen right now, for the banner. Derived, so it can
  // never disagree with the board.
  const result: Seat | "draw" | undefined = !versus
    ? undefined
    : win
      ? ((win.player === "X" ? 0 : 1) as Seat)
      : draw
        ? "draw"
        : undefined;

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
    dealRef.current += 1;
    setBoard(emptyBoard());
    setBusy(false);
    paidRef.current = false;
    // In two-player mode the restart button is "deal again", and dealing again
    // is what hands the first move to whoever lost the last one.
    setVersus((v) => (v ? nextMatch(v) : v));
    ctx.analytics.levelStart(versus ? "vs-player" : "vs-ai");
  }, [ctx, versus]);

  /**
   * Invite somebody, or go back to playing alone.
   *
   * Two people start a game together with ONE TAP and nothing else: no code, no
   * pairing, no second device, and above all no name to type — both players are
   * DRAWN from the pool the moment this is tapped. Tapping it again ends the
   * match and returns to the AI.
   *
   * Both directions deal a clean board, exactly as changing difficulty already
   * does, because the mark on the board means something different in each mode.
   */
  const toggleVersus = useCallback(() => {
    ctx.audio.unlock();
    ctx.audio.play("pop");
    // Bump BEFORE the board is replaced, so an AI reply already in flight lands
    // on a stale deal and is dropped rather than overwriting the new board.
    dealRef.current += 1;
    setVersus((v) => (v ? undefined : newVersus()));
    setBoard(emptyBoard());
    setBusy(false);
    paidRef.current = false;
    streakRef.current = 0;
    setScore({ wins: 0, losses: 0, draws: 0 });
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

  /**
   * The two-player half of the same moment.
   *
   * Deliberately NOT folded into `finish` above. That one decides what a player
   * earned against the AI — a streak, a personal best, a tier payout — and every
   * one of those is a fact about the PROFILE. None of them applies to a match
   * two people played on one device, so the two paths share the board and share
   * nothing else. `versusMatchEnd` is the only way this branch can pay, and it
   * cannot attach a score even if this file asked it to.
   *
   * Called from the click handler, never from a state updater: React may run an
   * updater twice, which here would pay the same match twice.
   */
  const finishVersus = useCallback(
    (b: Board, v: VersusState) => {
      const w = winner(b);
      const outcome: Seat | "draw" = w ? ((w.player === "X" ? 0 : 1) as Seat) : "draw";
      setVersus(finishMatch(v, outcome));

      const r = boardRef.current?.getBoundingClientRect();
      const centre = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined;
      if (w && centre) burst(centre.x, centre.y, { count: 14 });

      // ONE payout per match, and it is for finishing rather than for winning —
      // so it lands on a draw too, and the child who lost watches the same coin
      // fly to the same wallet. Nothing here can subtract anything from anybody:
      // there is no loss branch, because a loss costs nothing.
      if (!paidRef.current) {
        paidRef.current = true;
        // `winMoment` fires the analytics itself, so there is no second call
        // here — one match is one `levelComplete`.
        versusMatchEnd(ctx, centre, "vs-player");
      }
    },
    [ctx],
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

      // TWO PLAYERS: the seat whose turn it is puts its own mark down, and the
      // turn passes. No AI runs at all, and there is no `busy` beat — the second
      // player is right there and does not need to be waited for.
      if (versus) {
        const afterMove = place(board, i, SEAT_MARK[versus.turn]);
        setBoard(afterMove);
        if (winner(afterMove) || isDraw(afterMove)) finishVersus(afterMove, versus);
        else setVersus(pass(versus));
        return;
      }

      const afterHuman = place(board, i, "X");
      setBoard(afterHuman);
      if (winner(afterHuman) || isDraw(afterHuman)) {
        finish(afterHuman);
        return;
      }
      // AI replies after a short beat so the move is legible.
      setBusy(true);
      const deal = dealRef.current;
      setTimeout(() => {
        // The board this reply was for is gone — restarted, re-levelled, or
        // handed to a second player. Drop it rather than paint it over what is
        // on screen now.
        if (dealRef.current !== deal) return;
        const aiMove = chooseMove(afterHuman, "O", difficulty);
        const afterAi = place(afterHuman, aiMove, "O");
        setBoard(afterAi);
        setBusy(false);
        ctx.audio.play("flip");
        if (winner(afterAi) || isDraw(afterAi)) finish(afterAi);
      }, 380);
    },
    [board, busy, done, ctx, finish, difficulty, versus, finishVersus],
  );

  // This game's own words. A locale RECORD, so promoting a language reds
  // this block by name instead of leaving the game speaking English
  // inside a page that is not.
  const T = textFor(
    {
      he: { draw: "תיקו", turn: "התור שלך", rule: "שלושה ברצף מנצחים", wins: "ניצחונות", draws: "תיקו" },
      en: { draw: "Draw", turn: "Your turn", rule: "Three in a row wins", wins: "Wins", draws: "Draws" },
      es: { draw: "Empate", turn: "Te toca", rule: "Tres en raya gana", wins: "Victorias", draws: "Empates" },
    },
    ctx.locale,
  );

  const status = win
    ? win.player === "X"
      ? ctx.t("youWon")
      : ctx.t("gameOver")
    : draw
      ? T.draw
      : T.turn;

  return (
    <GameChrome
      ctx={ctx}
      stats={
        versus
          ? // A match has no personal best and no run of wins against an AI, so
            // the solo numbers would be stale the moment two people sit down.
            // What is left is the only thing that IS true of this sitting.
            [
              { icon: "flag", label: versusWords(ctx.locale).matches, value: versus.matches },
              { icon: "draw", label: T.draws, value: versus.draws },
            ]
          : [
              { icon: "trophy", label: ctx.t("best"), value: best ?? "-" },
              { icon: "star", label: T.wins, value: score.wins },
              { icon: "draw", label: T.draws, value: score.draws },
            ]
      }
      // The difficulty tunes the AI, and in two-player mode there is no AI. A
      // toggle that changes nothing is worse than no toggle, so it goes away.
      levels={versus ? undefined : DIFF_OPTIONS}
      level={versus ? undefined : difficulty}
      onLevel={versus ? undefined : changeDifficulty}
      onRestart={reset}
      // The footer is this game's own area. tictactoe has no secondary controls
      // to put there - so it says the one thing a player actually wants, at a
      // size a five-year-old can read across a room. See GameChrome's note on
      // why that region exists and why leaving it empty is the worse option.
      footer={
        <div style={{ display: "grid", gap: 8 }}>
          {versus ? (
            // The banner replaces the status line rather than joining it: in a
            // match, "whose turn" IS the status, and it says so in colour.
            <VersusBanner
              v={versus}
              locale={ctx.locale}
              // Matches won this sitting. tictactoe has nothing to count INSIDE
              // a match — you make a line or you do not — so the number a child
              // watches is the tally.
              counts={versus.wins}
              result={result}
            />
          ) : (
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
              <span style={{ fontSize: 13.5, color: "var(--text-dim)" }}>{T.rule}</span>
            </div>
          )}
          <VersusToggle on={!!versus} locale={ctx.locale} onToggle={toggleVersus} />
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
