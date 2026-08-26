import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { textFor, type Locale } from "@i18n/index";
import { formatScore, type GameContext, type RewardTier, type SessionSpec } from "@sdk/index";
import { GameChrome, type ChromeLevel } from "@ui/GameChrome";
import { burst, haptic, shake } from "@juice/index";
import { useGameSession, useGameTimer, useRememberedLevel, winMoment } from "@shared/index";
import {
  DIRS,
  LEVELS,
  LEVEL_IDS,
  hasMove,
  isSolved,
  newGame,
  scoreFor,
  tap,
  type ArrowTapState,
  type Dir,
  type LevelId,
} from "./logic";

/**
 * The level row, built FROM the logic's own list rather than beside it.
 *
 * `LEVEL_IDS` decides the order and `LEVEL_LABELS` is a `Record<LevelId, …>`,
 * so adding a tier to `logic.ts` reds this file by name instead of shipping a
 * difficulty the toggle cannot reach.
 */
const LEVEL_LABELS: Record<LevelId, Record<Locale, string>> = {
  easy: { he: "קל", en: "Easy", es: "Fácil" },
  medium: { he: "בינוני", en: "Med", es: "Media" },
  hard: { he: "קשה", en: "Hard", es: "Difícil" },
};

const LEVEL_OPTIONS: ChromeLevel<LevelId>[] = LEVEL_IDS.map((id) => ({
  id,
  label: LEVEL_LABELS[id],
}));

/**
 * Two vocabularies that happen to spell the same three words today.
 *
 * A level is a puzzle size; a tier is what the economy pays for it. Written out
 * rather than passed straight through, because the day this game gains an
 * "expert" the compiler asks what that is worth instead of quietly handing
 * `grant()` a tier it has never heard of.
 */
const LEVEL_TIER: Record<LevelId, RewardTier> = {
  easy: "easy",
  medium: "medium",
  hard: "hard",
};

/* ---------------------------------------------------------------- the board */

/**
 * The whole board's size, against the VIEWPORT and never the container — the
 * house rule for every board here. One `min(...)` per level, written out as
 * literals rather than computed, because `game-panel-clears-widest-board.test.ts`
 * reads these as TEXT: a `${cap}px` built at runtime carries no digits, so the
 * gate that exists to check the ceiling would find nothing and report green
 * about a number it never saw.
 *
 * The px terms are `size * 90`, so a cell is at most 90px on a desktop and the
 * grid never floats in the panel. All three clear the 700px panel cap with
 * room, and the widest (540) is well under the 640 the widest board in the
 * catalogue asks for. On a 390px phone the vw term binds: 88vw is 343px, which
 * is 57px per cell on the 6x6 — above the 44px tap floor.
 */
const BOARD_SIZE: Record<LevelId, string> = {
  easy: "min(88vw, 52vh, 360px)",
  medium: "min(88vw, 52vh, 450px)",
  hard: "min(88vw, 52vh, 540px)",
};

/**
 * One colour per direction, spread across LIGHTNESS as well as hue.
 *
 * The arrow's SHAPE is what says which way it points, so nobody has to read the
 * colour to play — it is a grouping aid, which is exactly the safe way to use
 * colour. Spreading the lightness anyway means the four are still four to a
 * colour-blind player, and the hardest level puts all four on screen at once.
 */
const DIR_COLOR: Record<Dir, string> = {
  up: "#FFD23F", // gold      — the lightest
  right: "#FF6B6B", // poppy
  down: "#3BB273", // fern
  left: "#5A7BE8", // ink      — the darkest
};

/**
 * Degrees to turn the one arrow path by.
 *
 * ONE path, rotated, rather than four drawings: four paths are four chances for
 * one of them to be a different weight, and nobody would notice until a child
 * had the board in front of them.
 *
 * It is an inline SVG and never an emoji. An OS arrow emoji is a different
 * glyph on every platform, cannot be recoloured, and on some of them renders as
 * a full-colour picture — which is the one thing a directional cue must not be.
 */
const DIR_ROTATION: Record<Dir, number> = { up: 0, right: 90, down: 180, left: 270 };

/** A solid block arrow pointing UP inside a 24x24 box. See `DIR_ROTATION`. */
const ARROW_PATH = "M12 3.5 L20 12.5 H15.5 V20.5 H8.5 V12.5 H4 Z";

/* -------------------------------------------------------------- the session */

/**
 * A board in progress: the level it belongs to, the grid, and the CLOCK.
 *
 * The clock is not an extra — this game's record is a time, so a snapshot
 * without it hands back a board two taps from done with the clock at zero, and
 * every abandoned board becomes a personal best nobody earned. It is part of
 * the position (see the session rule).
 *
 * There is NO reward latch in here, and that is a fact about the game rather
 * than an omission. The only grant is the single `level_complete` at the end, a
 * solved board is never handed back (`live: !won` clears it, and the guard at
 * the mount refuses one anyway), and nothing is paid mid-run. The day this game
 * pays a milestone, that latch belongs here or leaving and returning becomes a
 * way to be paid twice.
 *
 * Nothing here is a state only a `setTimeout` can leave: a refused tap changes
 * no state at all, so there is no lock to catch mid-animation.
 */
interface ArrowTapSession {
  level: LevelId;
  state: ArrowTapState;
  elapsedMs: number;
}

const SESSION: SessionSpec<ArrowTapSession> = {
  version: 1,
  validate: (value): value is ArrowTapSession => {
    const s = value as Partial<ArrowTapSession> | null;
    if (typeof s !== "object" || s === null) return false;
    if (typeof s.level !== "string" || !(s.level in LEVELS)) return false;
    if (typeof s.elapsedMs !== "number" || !Number.isFinite(s.elapsedMs) || s.elapsedMs < 0) {
      return false;
    }
    const g = s.state;
    if (typeof g !== "object" || g === null) return false;
    // The renderer sizes the grid off the LEVEL, so a board of some other shape
    // lays out as a grid whose columns and cells disagree — a picture with the
    // wrong number of rows rather than an error.
    const size = LEVELS[s.level as LevelId].size;
    if (g.size !== size) return false;
    if (!Array.isArray(g.cells) || g.cells.length !== size * size) return false;
    if (!g.cells.every((c) => c === null || (DIRS as readonly string[]).includes(c as string))) {
      return false;
    }
    if (!Number.isInteger(g.taps) || g.taps < 0) return false;
    // `left` must AGREE with the grid it claims to count. It is the number the
    // chrome draws, so a snapshot where the two disagree shows a child "3 left"
    // over an empty board — and refusing it costs nothing, since a rejected
    // snapshot is the same answer as "never played".
    return g.left === g.cells.filter((c) => c !== null).length;
  },
};

/* ----------------------------------------------------------------- the game */

export function ArrowTapGame({ ctx }: { ctx: GameContext }) {
  const [level, setLevel] = useRememberedLevel(
    ctx,
    LEVEL_OPTIONS.map((o) => o.id),
    "easy",
  );
  const restored = useMemo(() => ctx.session.load(SESSION), [ctx]);
  // Adopted only for the level this mount opened on, and never once it is
  // cleared — a finished board has nothing left to tap, and returning to one
  // reads as the game having failed to deal a puzzle.
  const resume =
    restored && restored.level === level && !isSolved(restored.state) ? restored : undefined;

  const [state, setState] = useState<ArrowTapState>(() => resume?.state ?? newGame(level));
  const [won, setWon] = useState(false);
  // Fastest clear, per LEVEL. Eight arrows on a 4x4 and twenty-two on a 6x6 are
  // not the same puzzle, so one shared record would let an easy run permanently
  // outrank every hard one.
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best(level));
  const boardRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const started = useRef(false);

  const solved = isSolved(state);
  /**
   * Arrows on the board and not one of them able to leave.
   *
   * A DEALT board can never reach this, and that is a property of the rules
   * rather than luck: a tap only ever empties a cell, an empty cell blocks
   * nothing, so every clear path stays clear and a solution that existed at
   * the deal survives any order of taps. `logic.test.ts` plays 60 boards
   * randomly to the end to prove it.
   *
   * The guard is still here because a session snapshot arrives off a disk a
   * person can edit, and the validator checks its SHAPE rather than its
   * solvability — deciding that is a search, and a search does not belong in a
   * load path. A board that has stopped answering is a real state to draw, and
   * the honest answer is the offer below rather than a child tapping forever.
   */
  const stuck = !solved && !hasMove(state);

  // The clock stops on a win AND on a dead board, because a clock counting
  // against a board that cannot answer is a clock counting nothing.
  // `useGameTimer` already stops on portal pause, so putting the tablet down
  // costs nothing either, and `initialMs` is that same promise one step further
  // out: walking away entirely and coming back tomorrow costs the clock nothing.
  const timer = useGameTimer(ctx, { running: !won && !stuck, initialMs: resume?.elapsedMs });

  // Cleared the moment the board is cleared, so the next open deals a fresh one.
  // A STUCK board is deliberately still stored: it is a real position, and the
  // restart offer below is how a player leaves it.
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

  const boardCentre = useCallback(() => {
    const r = boardRef.current?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined;
  }, []);

  const reset = useCallback(
    (lv: LevelId = level) => {
      setLevel(lv);
      setState(newGame(lv));
      setWon(false);
      setBest(ctx.score?.best(lv));
      // Zero, never the abandoned run's minutes. A restart is a new run, and a
      // restart that silently reinstated them would hand a child a board they
      // cannot record a good time on.
      timer.reset();
      ctx.analytics.levelStart(lv);
    },
    [ctx, level, setLevel, timer],
  );

  /**
   * The whole input model, from the handler flow and never from inside a
   * `setState` updater — React may run an updater twice, and this one grants
   * coins (see the rewards rule).
   */
  const onCell = useCallback(
    (cell: number) => {
      if (won) return;
      ctx.audio.unlock();
      const { state: next, outcome } = tap(state, cell);

      if (outcome.kind === "ignored") return;

      // A refusal is not an error. The arrow shakes, the game says nothing, and
      // NOTHING changes — `next` is `state` here, so there is nothing to
      // repaint and nothing to count. Telling a child off for a reasonable
      // guess is how they stop guessing.
      if (outcome.kind === "refused") {
        const el = cellRefs.current[cell];
        if (el) shake(el, 5, 200);
        haptic.tap();
        return;
      }

      setState(next);
      ctx.audio.play("pop");
      haptic.tap();
      if (!isSolved(next)) return;

      setWon(true);
      const at = boardCentre();
      if (at) burst(at.x, at.y, { count: 16 });
      // Read the clock HERE, not from a later render: `won` has only just been
      // set, so the timer is still running for one more tick.
      const clearedMs = timer.elapsedMs;
      const result = winMoment(ctx, {
        reason: "level_complete",
        tier: LEVEL_TIER[level],
        level,
        at,
        // `ms` is a DURATION, and this is one — the case that field exists for.
        // A count here would be logged as a time, which this repo has shipped
        // twice.
        ms: clearedMs,
        score: scoreFor(next, level, clearedMs),
      });
      if (result.score) setBest(result.score.best);
    },
    [boardCentre, ctx, level, state, timer, won],
  );

  /* -------------------------------------------------------------- the view */

  // This game's own words. A locale RECORD, so promoting a language reds
  // this block by name instead of leaving the game speaking English
  // inside a page that is not.
  const T = textFor(
    {
      he: {
        left: "חצים",
        hint: "הקישו על חץ שהדרך שלו החוצה פנויה",
        stuck: "אין יותר מהלכים. אפשר להתחיל לוח חדש.",
        again: "לוח חדש",
      },
      en: {
        left: "Arrows",
        hint: "Tap an arrow with a clear way out",
        stuck: "No moves left. You can start a fresh board.",
        again: "New board",
      },
      es: {
        left: "Flechas",
        hint: "Toca una flecha con la salida despejada",
        stuck: "No quedan movimientos. Puedes empezar un tablero nuevo.",
        again: "Tablero nuevo",
      },
    },
    ctx.locale,
  );

  const size = state.size;

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
        {
          icon: "layers",
          label: T.left,
          value: state.left,
          ltr: true,
          compact: true,
        },
      ]}
      levels={LEVEL_OPTIONS}
      level={level}
      onLevel={(lv) => reset(lv)}
      onRestart={() => reset()}
      // NO `paused`/`onPaused`, deliberately. The pause control is for a game
      // that KEEPS RUNNING while nobody is playing it — a falling piece, a
      // moving snake. Nothing here moves until a hand moves, so the board
      // already pauses itself, and the clock stops on its own when the tab goes
      // away (`useGameTimer` subscribes to the portal's pause). Sudoku and
      // minesweeper both keep a clock and both have none, for the same reason.
      // See .claude/rules/game-controls-and-platform-chrome-never-share-a-bar.md
      footer={
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              color: "var(--text-dim)",
              fontSize: 13,
              textAlign: "center",
              minHeight: 18,
            }}
          >
            {won ? `${ctx.t("youWon")} 🎉` : stuck ? T.stuck : T.hint}
          </div>
          {/* The dead-board offer, and it is an OFFER: a quiet line and a
              button, never a modal and never a scolding. It appears only when
              the board has genuinely stopped answering, so it is not a control
              a player has to learn to ignore.

              flexWrap even at one button: this row is the place a second
              control would land, and nine games shipped 439px of unwrapped row
              onto a 390px phone by leaving it off the first time. */}
          {stuck && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                aria-label={T.again}
                onClick={() => reset()}
                style={{
                  flex: "1 1 0",
                  minWidth: 0,
                  // A comfortable target on the short side; the row gives it the
                  // whole width on the long one.
                  minHeight: 56,
                  border: "none",
                  borderRadius: "var(--radius-2)",
                  background: "var(--surface)",
                  boxShadow: "var(--shadow-1)",
                  color: "var(--text)",
                  fontFamily: "inherit",
                  fontSize: 16,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  cursor: "pointer",
                  touchAction: "manipulation",
                }}
              >
                <span style={{ fontSize: 22, lineHeight: 1 }}>⟲</span>
                {T.again}
              </button>
            </div>
          )}
        </div>
      }
    >
      {/* dir="ltr" — a spatial grid must NOT mirror in the Hebrew RTL app, and
          this is the exact case that rule exists for: the cells hold arrows, so
          a mirrored grid would draw a right-pointing arrow in the cell that
          exits LEFT and the rules and the picture would disagree with nothing
          thrown and nothing logged.
          See .claude/rules/rtl-spatial-grid-dir-ltr.md */}
      <div
        dir="ltr"
        ref={boardRef}
        className="ellaz-play-surface"
        style={
          {
            display: "grid",
            gridTemplateColumns: `repeat(${size}, 1fr)`,
            gridTemplateRows: `repeat(${size}, 1fr)`,
            width: BOARD_SIZE[level],
            aspectRatio: "1",
            gap: "1.5%",
            padding: "1.5%",
            boxSizing: "border-box",
            background: "var(--surface-2)",
            borderRadius: "var(--radius-2)",
            boxShadow: "var(--shadow-1)",
            touchAction: "none",
          } as CSSProperties
        }
      >
        {state.cells.map((dir, i) => (
          <button
            key={i}
            ref={(el) => {
              cellRefs.current[i] = el;
            }}
            type="button"
            // Un-localised, like every other board in this repo. The label says
            // WHERE and WHICH WAY, because a screen reader gets neither from a
            // rotated path.
            aria-label={`cell ${Math.floor(i / size) + 1},${(i % size) + 1} ${dir ?? "empty"}`}
            // Pointer Events, and the capture with them: a tap that begins on a
            // cell belongs to that cell even if the finger slides off before it
            // lifts. `click` is deliberately NOT listened to — it would fire a
            // second time after this one.
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              onCell(i);
            }}
            // ...which leaves the keyboard, since a <button> reaches its own
            // onClick from Enter and Space and we are not listening there.
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              onCell(i);
            }}
            style={{
              display: "grid",
              placeItems: "center",
              minWidth: 0,
              minHeight: 0,
              padding: "12%",
              border: "none",
              borderRadius: "12%",
              // An empty cell is a HOLE, not a tile: it is the thing a path is
              // made of, so it reads as the board showing through rather than
              // as another piece a child might try to tap.
              background: dir === null ? "var(--bg)" : "var(--surface)",
              boxShadow: dir === null ? "none" : "var(--shadow-1)",
              color: dir === null ? "transparent" : DIR_COLOR[dir],
              cursor: dir === null ? "default" : "pointer",
              touchAction: "none",
            }}
          >
            {dir !== null && (
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  fill: "currentColor",
                  transform: `rotate(${DIR_ROTATION[dir]}deg)`,
                }}
              >
                <path d={ARROW_PATH} />
              </svg>
            )}
          </button>
        ))}
      </div>
    </GameChrome>
  );
}
