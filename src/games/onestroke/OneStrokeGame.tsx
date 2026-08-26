import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { textFor, type Locale } from "@i18n/index";
import { formatScore, type GameContext, type RewardTier, type SessionSpec } from "@sdk/index";
import { GameChrome, type ChromeLevel } from "@ui/GameChrome";
import { burst, haptic, shake } from "@juice/index";
import { useGameSession, useGameTimer, useRememberedLevel, winMoment } from "@shared/index";
import {
  LEVELS,
  LEVEL_IDS,
  colOf,
  covered,
  isBlocked,
  isSolved,
  newGame,
  openCount,
  rowOf,
  scoreFor,
  step,
  undo,
  type Cell,
  type LevelId,
  type OneStrokeState,
} from "./logic";

/**
 * The level row, built FROM the logic's own list rather than beside it.
 *
 * `LEVEL_IDS` decides the order and `LEVEL_LABELS` is a `Record<LevelId, ...>`,
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
 * A level is a grid and a wall count; a tier is what the economy pays for it.
 * Written out rather than passed straight through, so the day this game gains
 * an "expert" the compiler asks what that is worth instead of quietly handing
 * `grant()` a tier it has never heard of.
 */
const LEVEL_TIER: Record<LevelId, RewardTier> = {
  easy: "easy",
  medium: "medium",
  hard: "hard",
};

/**
 * The line's colour, and there is only ever one of it.
 *
 * A one-stroke puzzle has nothing to tell apart, so the board carries no
 * palette and nothing here has to survive a colour-blind reading of two hues
 * against each other. It matches this game's own `meta.color`, which is what
 * the emitted page tints its header from, so the board and the bar agree.
 */
const INK = "#4C6EF5";

/**
 * A square's size, against the VIEWPORT and never the container - the house
 * rule for every board here.
 *
 * The vw and vh terms are computed into variables rather than interpolated
 * inline so the whole `min(...)` reads as one uninterrupted expression, which
 * is what `game-panel-clears-widest-board.test.ts` scans for.
 *
 * 88px caps every tier rather than one cap per tier, so the arithmetic has a
 * single answer: the widest board is `7 x 88 = 616px` plus 6 gaps of 4, which
 * is 640 inside the 684px the desktop panel leaves. On a 390px phone the vw
 * term binds instead, so a hard board is about 352px across.
 */
function cellSize(size: number): string {
  const vw = (84 / size).toFixed(2);
  const vh = (56 / size).toFixed(2);
  return `min(${vw}vw, ${vh}vh, 88px)`;
}

/** The gap between squares, in px. Small: the line has to look continuous. */
const CELL_GAP = 4;

/** Which way the line leaves a square. Read off the path, drawn as an arm. */
interface Ink {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  /** The live end, which gets a slightly bigger cap so a player can find it. */
  head: boolean;
}

/**
 * Every square the line covers, with the directions it leaves in.
 *
 * Derived per render rather than stored on the state: the arms are a picture of
 * `path`, and a second copy of that fact is a second thing that can be wrong.
 */
function inkOf(state: OneStrokeState): Map<Cell, Ink> {
  const out = new Map<Cell, Ink>();
  state.path.forEach((cell, i) => {
    const e: Ink = { up: false, down: false, left: false, right: false, head: i === state.path.length - 1 };
    const link = (other: Cell) => {
      const dr = rowOf(other, state.size) - rowOf(cell, state.size);
      const dc = colOf(other, state.size) - colOf(cell, state.size);
      if (dr === -1) e.up = true;
      else if (dr === 1) e.down = true;
      else if (dc === -1) e.left = true;
      else if (dc === 1) e.right = true;
    };
    if (i > 0) link(state.path[i - 1]);
    if (i < state.path.length - 1) link(state.path[i + 1]);
    out.set(cell, e);
  });
  return out;
}

/* -------------------------------------------------------------- the session */

/**
 * A board in progress: the level it belongs to, the whole board, and the clock.
 *
 * The CLOCK is load-bearing rather than decoration. This game's record is a
 * time, so restoring the line without it would hand a returning player a board
 * three-quarters drawn and a timer reading zero - a personal best nobody
 * earned, on every board they ever walk away from.
 *
 * `blocked` and `start` travel too, and they have to: the walls and the marked
 * square ARE the puzzle, and a line restored over a different board is a line
 * whose own squares are no longer where it left them.
 *
 * There is NO reward latch in here, and that is a fact about the game rather
 * than an omission. The only grant is the single `level_complete` at the end,
 * and a finished board is never handed back - `live: !won` clears it and the
 * guard at the mount refuses one anyway. The day this game pays anything
 * mid-run, that latch belongs here, or leaving and returning becomes a way to
 * be paid twice (see the session rule).
 */
interface StrokeSession {
  level: LevelId;
  state: OneStrokeState;
  elapsedMs: number;
}

const SESSION: SessionSpec<StrokeSession> = {
  version: 1,
  validate: (value): value is StrokeSession => {
    const s = value as Partial<StrokeSession> | null;
    if (typeof s !== "object" || s === null) return false;
    if (typeof s.level !== "string" || !(s.level in LEVELS)) return false;
    if (typeof s.elapsedMs !== "number" || !Number.isFinite(s.elapsedMs) || s.elapsedMs < 0) return false;

    const spec = LEVELS[s.level as LevelId];
    const g = s.state;
    if (typeof g !== "object" || g === null) return false;
    // Everything the renderer sizes itself from reads off the LEVEL, so a board
    // of some other shape lays out as a grid whose columns and squares
    // disagree.
    if (g.size !== spec.size) return false;
    const cells = spec.size * spec.size;

    if (!Array.isArray(g.blocked) || g.blocked.length !== spec.blocked) return false;
    const walls = new Set<number>();
    for (const cell of g.blocked) {
      if (!inRange(cell, cells)) return false;
      if (walls.has(cell as number)) return false;
      walls.add(cell as number);
    }
    if (!inRange(g.start, cells) || walls.has(g.start)) return false;

    // The strictest check here and the one worth the lines: `step` trusts that
    // the line is contiguous, starts on the marked square and never repeats. A
    // truncated or hand-edited snapshot breaking any of those would not throw.
    // It would draw a plausible board whose arms point at nothing and whose
    // win can never be reached, which is far harder to notice than a refusal
    // to load.
    if (!Array.isArray(g.path) || g.path.length < 1 || g.path.length > cells) return false;
    if (g.path[0] !== g.start) return false;
    const seen = new Set<number>();
    for (let i = 0; i < g.path.length; i++) {
      const cell = g.path[i];
      if (!inRange(cell, cells) || walls.has(cell) || seen.has(cell)) return false;
      seen.add(cell);
      if (i > 0 && !neighbouring(g.path[i - 1], cell, spec.size)) return false;
    }
    return true;
  },
};

function inRange(n: unknown, limit: number): boolean {
  return Number.isInteger(n) && (n as number) >= 0 && (n as number) < limit;
}

/** The adjacency test again, on raw numbers, for `validate` before it trusts anything. */
function neighbouring(a: number, b: number, size: number): boolean {
  const dr = Math.abs(Math.floor(a / size) - Math.floor(b / size));
  const dc = Math.abs((a % size) - (b % size));
  return dr + dc === 1;
}

/* ----------------------------------------------------------------- the game */

export function OneStrokeGame({ ctx }: { ctx: GameContext }) {
  const [level, setLevel] = useRememberedLevel(
    ctx,
    LEVEL_OPTIONS.map((o) => o.id),
    "easy",
  );
  const restored = useMemo(() => ctx.session.load(SESSION), [ctx]);
  // Adopted only for the level this mount opened on, and never once it is
  // finished - a covered board has nothing left to draw, and returning to one
  // reads as the game having failed to deal a puzzle.
  const resume =
    restored && restored.level === level && !isSolved(restored.state) ? restored : undefined;

  const [state, setState] = useState<OneStrokeState>(() => resume?.state ?? newGame(level));
  const [won, setWon] = useState(false);
  // Fastest board, per LEVEL. Twenty-three squares and thirty-eight are not the
  // same achievement, so one shared record would let an easy run permanently
  // outrank every hard one.
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best(level));
  const boardRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  // Stops on a win, and `useGameTimer` also stops on pause, so putting the
  // tablet down costs nothing. `initialMs` continues a resumed board rather
  // than restarting its clock.
  const timer = useGameTimer(ctx, { running: !won, initialMs: resume?.elapsedMs });

  /**
   * The live board, mirrored out of React.
   *
   * A drag delivers pointer events faster than React re-renders, so two moves
   * in one frame would both read the same stale `state` from the closure and
   * the second would overwrite the first. Every handler below reads this ref
   * and writes through `apply`, so the rules always see the board as it is.
   */
  const live = useRef(state);
  const apply = useCallback((next: OneStrokeState) => {
    live.current = next;
    setState(next);
  }, []);

  const holding = useRef(false);
  const lastCell = useRef<Cell | null>(null);

  // Read from the ref rather than from `state`, so a flush during teardown
  // stores the last move of a drag even if React never rendered it.
  useGameSession(ctx, SESSION, () => ({ level, state: live.current, elapsedMs: timer.elapsedMs }), {
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
      apply(newGame(lv));
      setWon(false);
      setBest(ctx.score?.best(lv));
      // Back to zero, never to the abandoned board's minutes - a restart is a
      // new run, and reinstating those minutes would hand a child a board they
      // cannot record a good time on.
      timer.reset();
      holding.current = false;
      lastCell.current = null;
      ctx.analytics.levelStart(lv);
    },
    [apply, ctx, level, setLevel, timer],
  );

  /**
   * The board just filled up. Celebrate, and bank it.
   *
   * From the handler flow and never from inside a `setState` updater - React
   * may run an updater twice, and this one grants coins (see the rewards rule).
   */
  const finish = useCallback(
    (from: OneStrokeState) => {
      if (!isSolved(from)) return;
      // Read the clock NOW: `won` flips on the next render, so the timer is
      // still running at this point.
      const drawnMs = timer.elapsedMs;
      setWon(true);
      ctx.audio.play("success");
      const at = boardCentre();
      if (at) burst(at.x, at.y, { count: 18 });
      const result = winMoment(ctx, {
        reason: "level_complete",
        tier: LEVEL_TIER[level],
        level,
        ms: drawnMs,
        at,
        score: scoreFor(from, level, drawnMs),
      });
      if (result.score) setBest(result.score.best);
    },
    [boardCentre, ctx, level, timer],
  );

  /**
   * A touch on a square - the whole input model, and the one that must always
   * work.
   *
   * TAP IS THE COMPLETE PATH: touch the square next to the end of the line, and
   * again, and again. Drag is layered on top of exactly this call and is never
   * required, because a five-year-old on a phone and anyone on an alternative
   * pointer cannot reliably hold a sustained gesture. The keyboard reaches the
   * same function from Enter and Space.
   */
  const onCell = useCallback(
    (cell: Cell) => {
      if (won) return;
      ctx.audio.unlock();
      const taken = step(live.current, cell);

      if (taken.outcome.kind === "ignored") {
        // Not next door, a wall, or a square the line already holds. A refusal
        // is not an error: the board twitches and the game says nothing, so a
        // misjudged touch costs nothing to recover from.
        const el = boardRef.current;
        if (el) shake(el, 3, 140);
        return;
      }

      apply(taken.state);
      if (taken.outcome.kind === "completed") {
        ctx.audio.play("pop");
        finish(taken.state);
        return;
      }
      ctx.audio.play("tap");
      haptic.tap();
    },
    [apply, ctx, finish, won],
  );

  /** During a drag, a refusal is silent: a finger crossing a wall is not a mistake. */
  const onDragInto = useCallback(
    (cell: Cell) => {
      if (won) return;
      const taken = step(live.current, cell);
      if (taken.outcome.kind === "ignored") return;
      apply(taken.state);
      if (taken.outcome.kind === "completed") {
        ctx.audio.play("pop");
        finish(taken.state);
        holding.current = false;
        return;
      }
      ctx.audio.play("tap");
    },
    [apply, ctx, finish, won],
  );

  const takeBack = useCallback(() => {
    if (won) return;
    const taken = undo(live.current);
    if (taken.outcome.kind === "ignored") return;
    apply(taken.state);
    ctx.audio.play("tap");
    haptic.tap();
  }, [apply, ctx, won]);

  /**
   * Which square the finger is over now.
   *
   * `setPointerCapture` sends every later move to the element the gesture
   * STARTED on, so `onPointerEnter` on the neighbours never fires and the
   * position has to be read off the document instead. That is the price of the
   * capture, and the capture is what keeps a fast drag from being dropped the
   * moment it leaves a 47px target.
   */
  const cellUnder = (x: number, y: number): Cell | null => {
    const el = document.elementFromPoint(x, y);
    const holder = el instanceof Element ? el.closest("[data-cell]") : null;
    if (!(holder instanceof HTMLElement) || holder.dataset.cell === undefined) return null;
    return Number(holder.dataset.cell);
  };

  const onMove = useCallback(
    (x: number, y: number) => {
      if (!holding.current) return;
      const cell = cellUnder(x, y);
      if (cell === null || cell === lastCell.current) return;
      lastCell.current = cell;
      onDragInto(cell);
    },
    [onDragInto],
  );

  const onLift = useCallback(() => {
    holding.current = false;
    lastCell.current = null;
  }, []);

  /* -------------------------------------------------------------- the view */

  const { size } = LEVELS[level];
  const cell = cellSize(size);
  const ink = useMemo(() => inkOf(state), [state]);
  const open = openCount(state);
  const drawn = covered(state);
  const canUndo = drawn > 1 && !won;

  // This game's own words. A locale RECORD, so promoting a language reds this
  // block by name instead of leaving the game speaking English inside a page
  // that is not.
  const T = textFor(
    {
      he: {
        squares: "משבצות",
        start: "מתחילים במשבצת המסומנת והולכים למשבצת שלידה",
        going: "ממשיכים למשבצת שלידה. אף משבצת לא פעמיים",
        stuck: "אין לאן להמשיך. חוזרים צעד אחורה",
        back: "צעד אחורה",
      },
      en: {
        squares: "Squares",
        start: "Begin on the marked square and move to the one beside it",
        going: "Carry on to a square next door. Never the same one twice",
        stuck: "Nowhere left to go. Take a step back",
        back: "Step back",
      },
      es: {
        squares: "Casillas",
        start: "Empieza en la casilla marcada y pasa a la de al lado",
        going: "Sigue a una casilla vecina. Ninguna dos veces",
        stuck: "No queda salida. Da un paso atrás",
        back: "Paso atrás",
      },
    },
    ctx.locale,
  );

  // Is there anywhere at all to go from the end of the line? A dead end is a
  // legal state and the way out is the step-back button, so the hint says that
  // rather than letting a player sit in front of a board that ignores them.
  const boxed = useMemo(() => {
    if (won || drawn === open) return false;
    const headCell = state.path[state.path.length - 1];
    for (const other of [headCell - size, headCell + size, headCell - 1, headCell + 1]) {
      if (!neighbouring(headCell, other, size)) continue;
      if (other < 0 || other >= size * size) continue;
      if (!isBlocked(state, other) && !state.path.includes(other)) return false;
    }
    return true;
  }, [drawn, open, size, state, won]);

  const hint = won
    ? `${ctx.t("youWon")} 🎉`
    : boxed
      ? T.stuck
      : drawn > 1
        ? T.going
        : T.start;

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        {
          icon: "draw",
          label: T.squares,
          value: `${drawn}/${open}`,
          ltr: true,
          compact: true,
        },
        {
          // A clock reads right to left in Hebrew and "1:30" becomes "30:1".
          icon: "clock",
          label: ctx.t("time"),
          value: formatScore(timer.elapsedMs, "ms"),
          ltr: true,
          record: best === undefined ? "-" : formatScore(best, "ms"),
        },
      ]}
      levels={LEVEL_OPTIONS}
      level={level}
      onLevel={(lv) => reset(lv)}
      // `reset`, NOT `clear`. Rubbing the line out leaves `won` true - and all
      // three pointer handlers, the undo and the timer are gated on it - so
      // after a win restart handed back a board that looked fresh, answered
      // nothing, and showed the winning clock. Every other puzzle here routes
      // restart through its own `reset`, including `flow`, which shipped in the
      // same commit. See scripts/repro/repro-onestroke-restart-after-win.mjs.
      onRestart={() => reset()}
      footer={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            minHeight: 44,
            padding: "0 6px",
          }}
        >
          {/* The step back. It is the ONLY way back there is, and it is the same
              move as touching the square the line came from - one rule, two
              doors, so the button and the finger can never disagree. */}
          <button
            type="button"
            onClick={takeBack}
            aria-label={T.back}
            style={{
              minWidth: 64,
              height: 40,
              padding: "0 14px",
              borderRadius: "var(--radius-pill)",
              border: "none",
              background: canUndo ? "var(--surface-2)" : "transparent",
              color: canUndo ? "var(--text)" : "var(--text-dim)",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              // Never `disabled`. Nothing to take back is not an error, and a
              // control that stops answering teaches a child it is broken.
              opacity: canUndo ? 1 : 0.45,
            }}
          >
            ↶
          </button>
          <span style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center" }}>{hint}</span>
        </div>
      }
    >
      {/* `dir="ltr"`, because this board's POSITION is meaningful: the line runs
          left and right across a grid indexed `row * size + col`, so mirroring
          it under Hebrew would draw every route as its own mirror image while
          the rules went on believing otherwise. See
          .claude/rules/rtl-spatial-grid-dir-ltr.md. */}
      <div
        ref={boardRef}
        dir="ltr"
        className="ellaz-play-surface"
        onPointerMove={(e) => onMove(e.clientX, e.clientY)}
        onPointerUp={onLift}
        onPointerCancel={onLift}
        style={
          {
            ["--cell" as string]: cell,
            display: "grid",
            gridTemplateColumns: `repeat(${size}, var(--cell))`,
            gridTemplateRows: `repeat(${size}, var(--cell))`,
            justifyContent: "center",
            gap: CELL_GAP,
            padding: 6,
            borderRadius: "var(--radius-3)",
            background: "rgba(255,255,255,0.05)",
            touchAction: "none",
          } as CSSProperties
        }
      >
        {Array.from({ length: size * size }, (_, i) => {
          if (isBlocked(state, i)) {
            return (
              <div
                key={i}
                aria-hidden="true"
                style={{
                  width: "var(--cell)",
                  height: "var(--cell)",
                  borderRadius: "calc(var(--cell) * 0.16)",
                  background: "rgba(0,0,0,0.28)",
                  boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.06)",
                }}
              />
            );
          }
          const paint = ink.get(i);
          const isStart = i === state.start;
          return (
            <button
              key={i}
              type="button"
              data-cell={i}
              aria-label={`row ${rowOf(i, size) + 1} column ${colOf(i, size) + 1}`}
              aria-pressed={paint !== undefined}
              // Pointer Events, and the capture with them: a drag that begins on
              // a square belongs to this board even if the finger leaves a 47px
              // target before it lifts. `click` is deliberately NOT listened to
              // - it would fire a second time after this one.
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                holding.current = true;
                lastCell.current = i;
                onCell(i);
              }}
              // ...which leaves the keyboard, since a <button> reaches its own
              // onClick from Enter and Space and we are not listening there.
              // This is the second complete route through the game: every move
              // can be made without a pointer at all.
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                onCell(i);
              }}
              style={{
                position: "relative",
                width: "var(--cell)",
                height: "var(--cell)",
                padding: 0,
                border: "none",
                borderRadius: "calc(var(--cell) * 0.16)",
                background: "rgba(255,255,255,0.08)",
                cursor: "pointer",
                touchAction: "none",
                // The board is the tap target and the arms are decoration, so
                // nothing inside a square may take the pointer away from it.
                overflow: "visible",
              }}
            >
              {isStart && (
                <span
                  style={{
                    position: "absolute",
                    inset: "12%",
                    borderRadius: "50%",
                    boxShadow: `inset 0 0 0 3px ${INK}`,
                    opacity: 0.85,
                  }}
                />
              )}
              {paint && (
                <>
                  {/* The junction, then one arm per direction the line leaves
                      in. Drawn as plain boxes rather than as a stroked path, so
                      a corner is two overlapping arms and needs no geometry. */}
                  <span
                    style={{
                      position: "absolute",
                      inset: "32%",
                      borderRadius: "50%",
                      background: INK,
                      transform: paint.head ? "scale(1.3)" : undefined,
                      transition: "transform 0.12s ease",
                    }}
                  />
                  {arm(paint.up, "up")}
                  {arm(paint.down, "down")}
                  {arm(paint.left, "left")}
                  {arm(paint.right, "right")}
                </>
              )}
            </button>
          );
        })}
      </div>
    </GameChrome>
  );
}

/**
 * One arm of the line, from the middle of a square to the edge it leaves by.
 *
 * It runs a little PAST the edge (the gap between squares is 4px) so two
 * squares' arms meet and the line reads as one continuous run rather than as a
 * row of dashes.
 */
function arm(show: boolean, dir: "up" | "down" | "left" | "right") {
  if (!show) return null;
  const across = "calc(50% - var(--cell) * 0.15)";
  const along = `calc(50% + ${CELL_GAP}px)`;
  const box: CSSProperties =
    dir === "up" || dir === "down"
      ? { left: across, right: across, height: along, [dir === "up" ? "top" : "bottom"]: `-${CELL_GAP}px` }
      : { top: across, bottom: across, width: along, [dir === "left" ? "left" : "right"]: `-${CELL_GAP}px` };
  return <span style={{ position: "absolute", background: INK, ...box }} />;
}
