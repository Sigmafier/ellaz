import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { GameContext, RewardTier, SessionSpec } from "@sdk/index";
import { Button } from "@ui/components";
import { GameChrome, type ChromeLevel } from "@ui/GameChrome";
import { burst, haptic, shake } from "@juice/index";
import { useGameSession, useRememberedLevel, winMoment } from "@shared/index";
import {
  LEVELS,
  filled,
  hardDrop,
  intervalFor,
  newGame,
  render,
  shift,
  spin,
  tick,
  type BlocksState,
  type LevelKey,
  type Piece,
} from "./logic";

const LEVEL_OPTIONS: ChromeLevel<LevelKey>[] = [
  { id: "easy", label: { he: "רגוע", en: "Calm" } },
  { id: "normal", label: { he: "רגיל", en: "Normal" } },
  { id: "hard", label: { he: "מהיר", en: "Fast" } },
];

const LEVEL_TIER: Record<LevelKey, RewardTier> = {
  easy: "easy",
  normal: "medium",
  hard: "hard",
};

/* -------------------------------------------------------------- the style */

/**
 * THE LOOK, in one place.
 *
 * Index 1-11, matching `logic.ts`'s `color` field, which is a number precisely
 * so the rules never learn a hex code. Swapping the whole game's style is this
 * block plus `WELL`: no piece, no renderer branch and no test moves with it.
 *
 * Chosen so no two ADJACENT hues collide once a stack is six deep, which is the
 * only moment the palette has to work - a board of one colour reads as a wall
 * and a player stops seeing the seams between pieces.
 */
const PIECE_COLORS: readonly string[] = [
  "", // 0 is empty; the array is 1-based to match the logic's colour index
  "#FFC730", // o      sunflower
  "#26B0E6", // i3     lagoon
  "#FF8A3D", // l3     tangerine
  "#FF4D8D", // i4     raspberry
  "#A855C9", // t4     orchid
  "#6FD44E", // s4     lime
  "#17B98A", // z4     jade
  "#4F5BD5", // j4     indigo
  "#E4572E", // l4     clay
  "#F5F0FF", // plus5  the two hard-only shapes are pale, so they read as
  "#9FB3C8", //  u5    intruders rather than as more of the same
];

/** The well. Deliberately NOT a theme token - see the note in the board below. */
const WELL = "#211B3D";
const WELL_LINE = "#2E2652";

function colorOf(v: number): string {
  return PIECE_COLORS[Math.abs(v)] ?? PIECE_COLORS[1];
}

/* --------------------------------------------------------------- the board */

/**
 * The cell size, as a CSS expression against the VIEWPORT rather than the
 * container - the house rule for every board in this app. Both terms are
 * derived from the level's own shape, so an eight-wide board is not sized as if
 * it were ten, and the 30px cap is what stops a desktop drawing a wall of
 * postage stamps.
 */
function cellSize(cols: number, rows: number): string {
  return `min(${(88 / cols).toFixed(2)}vw, ${(52 / rows).toFixed(2)}vh, 30px)`;
}

/**
 * A run in progress: the whole board, the falling piece, the next one, and the
 * bag it is being drawn from.
 *
 * The BAG is why the whole `BlocksState` travels rather than a summary. It is
 * the shuffled draw pile that stops real droughts, and a run resumed with a
 * fresh bag would quietly re-roll the next seven pieces — invisible, and
 * exactly the "the game is cheating" feeling the bag exists to prevent.
 *
 * `milestone` rides along for the same reason `bestFired` does in 2048: it
 * records a coin this run has already been paid.
 */
interface BlocksSession {
  state: BlocksState;
  milestone: number;
}

const SESSION: SessionSpec<BlocksSession> = {
  version: 1,
  validate: (value): value is BlocksSession => {
    const s = value as Partial<BlocksSession> | null;
    if (typeof s !== "object" || s === null) return false;
    if (typeof s.milestone !== "number" || !Number.isFinite(s.milestone) || s.milestone < 0) return false;
    const g = s.state;
    if (typeof g !== "object" || g === null) return false;
    if (typeof g.level !== "string" || !(g.level in LEVELS)) return false;
    // The board must match the dimensions the level declares, not merely the
    // ones the snapshot claims: `cellSize` and the CSS grid are both computed
    // from the LEVEL, so a board of some other size renders as a grid whose
    // cells and columns disagree.
    const { cols, rows } = LEVELS[g.level];
    if (g.cols !== cols || g.rows !== rows) return false;
    if (
      !Array.isArray(g.board) ||
      g.board.length !== rows ||
      !g.board.every(
        (row) => Array.isArray(row) && row.length === cols && row.every((c) => typeof c === "number"),
      )
    ) {
      return false;
    }
    // `piece.cells` is indexed directly by every draw and collision check, so a
    // missing matrix is a throw on the first frame rather than a wrong picture.
    const squareMatrix = (p: unknown) => {
      const cellsOf = (p as { cells?: unknown })?.cells;
      return Array.isArray(cellsOf) && cellsOf.every((row) => Array.isArray(row));
    };
    if (!squareMatrix(g.piece) || !squareMatrix(g.next)) return false;
    if (!Array.isArray(g.bag) || !g.bag.every((id) => typeof id === "string")) return false;
    return (
      typeof g.pr === "number" &&
      typeof g.pc === "number" &&
      typeof g.score === "number" &&
      typeof g.lines === "number" &&
      typeof g.over === "boolean"
    );
  },
};

export function BlocksGame({ ctx }: { ctx: GameContext }) {
  const [level, setLevel] = useRememberedLevel(ctx, LEVEL_OPTIONS.map((o) => o.id), "normal");
  const restored = useMemo(() => ctx.session.load(SESSION), [ctx]);
  // A stacked-out run is never resumed — `live` clears it — so a stored `over`
  // board can only come from a build that wrote one, and it is refused here
  // rather than handed back as a game with no legal move.
  const resume =
    restored && restored.state.level === level && !restored.state.over ? restored : undefined;

  const [state, setState] = useState<BlocksState>(() => resume?.state ?? newGame(level));
  const [best, setBest] = useState(() => ctx.score?.best(level) ?? 0);
  const boardRef = useRef<HTMLDivElement>(null);

  /**
   * The authoritative copy. The gravity timer, the keyboard handler and the
   * buttons all read THIS rather than the `state` closed over by the render
   * that installed them, so none of them can act on a board that has moved on.
   * `setState` exists only to repaint.
   */
  const gameRef = useRef(state);
  const pausedRef = useRef(false);
  const lastStepRef = useRef(0);
  /**
   * Rows at the last milestone, so one ping fires per five rows, not per row.
   *
   * RESTORED with the run, because a resumed run is the same run. Starting it
   * back at 0 over a board already at 20 rows makes the very next clear satisfy
   * `step > 0` and pay a milestone coin that was paid the first time round —
   * once per resume, indefinitely. See the same reasoning in `Game2048.tsx`.
   */
  const milestoneRef = useRef(resume?.milestone ?? 0);
  /** A run reports its score exactly once, at the end. */
  const scoredRef = useRef(false);

  const apply = useCallback((next: BlocksState) => {
    gameRef.current = next;
    setState(next);
  }, []);

  const boardCentre = useCallback(() => {
    const r = boardRef.current?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined;
  }, []);

  const start = useCallback(
    (key: LevelKey) => {
      setLevel(key);
      milestoneRef.current = 0;
      scoredRef.current = false;
      lastStepRef.current = 0;
      setBest(ctx.score?.best(key) ?? 0);
      apply(newGame(key));
      ctx.analytics.levelStart(key);
    },
    [apply, ctx],
  );

  const restart = useCallback(() => start(gameRef.current.level), [start]);

  // Reads `gameRef`, not `state`: that ref is this game's authoritative copy
  // (the gravity timer writes through it), so a flush landing between a step
  // and its repaint stores the board the game is actually on.
  useGameSession(
    ctx,
    SESSION,
    () => ({ state: gameRef.current, milestone: milestoneRef.current }),
    { live: !state.over },
  );

  useEffect(() => {
    ctx.lifecycle.gameplayStart();
    ctx.analytics.levelStart(level);
  }, [ctx]);

  /**
   * What a landing produced. Called from the handler flow (a button, a key, the
   * timer callback) and never from inside a state updater, so a doubled updater
   * can never double-grant - see the rewards rule.
   */
  const settle = useCallback(
    (after: BlocksState, cleared: number) => {
      if (cleared > 0) {
        ctx.audio.play("success");
        haptic.tap();
        const at = boardCentre();
        // A four-row clear is the best thing that happens in this game and it
        // deserves to be visible. One and two rows stay quiet, or the screen is
        // never still.
        if (at && cleared >= 3) burst(at.x, at.y, { count: 10 + cleared * 4 });
      } else {
        ctx.audio.play("pop");
      }

      // Endless game: coins drip on progress, and a star is reserved for the
      // personal best at the end. Confetti off, or it fires every few seconds.
      const step = Math.floor(after.lines / 5);
      if (step > milestoneRef.current) {
        milestoneRef.current = step;
        winMoment(ctx, {
          reason: "milestone",
          level: `rows-${step * 5}`,
          at: boardCentre(),
          confetti: false,
        });
      }

      if (after.over && !scoredRef.current) {
        scoredRef.current = true;
        ctx.audio.play("fail");
        if (boardRef.current) shake(boardRef.current);
        ctx.analytics.levelFail(after.level, "stack-out");
        // Reported once, at the end, and scoped to the level: eight columns and
        // ten are not the same game, so an easy run must not overwrite a fast one.
        const record = ctx.score?.report({
          value: after.score,
          unit: "points",
          board: after.level,
        });
        if (record?.isPersonalBest) {
          setBest(after.score);
          winMoment(ctx, {
            reason: "personal_best",
            tier: LEVEL_TIER[after.level],
            level: `score-${after.score}`,
            at: boardCentre(),
          });
        }
      }
    },
    [boardCentre, ctx],
  );

  const gravity = useCallback(() => {
    const r = tick(gameRef.current);
    apply(r.state);
    if (r.locked) settle(r.state, r.cleared);
  }, [apply, settle]);

  /* ------------------------------------------------------------- the clock */

  /**
   * A poll plus a wall-clock accumulator, NOT a fixed number of frames.
   *
   * The step here is a GAME speed - 1000ms down to 140ms - so it has nothing to
   * do with the display's refresh rate, and reading `performance.now()` each
   * time means a 120 Hz screen, a 60 Hz screen and a throttled background tab
   * all fall at the same rate. See `.claude/rules/fixed-timestep-must-match-display.md`
   * for the version of this that gets it wrong.
   */
  useEffect(() => {
    const id = window.setInterval(() => {
      const s = gameRef.current;
      if (s.over || pausedRef.current) return;
      const now = performance.now();
      if (!lastStepRef.current) lastStepRef.current = now;
      if (now - lastStepRef.current < intervalFor(s.level, s.lines)) return;
      lastStepRef.current = now;
      gravity();
    }, 16);
    return () => window.clearInterval(id);
  }, [gravity]);

  // A phone call, a switched tab, the portal's own pause: the stack must be
  // exactly where it was left. Without this the piece falls while nobody watches.
  useEffect(() => {
    const off = [
      ctx.onPause(() => {
        pausedRef.current = true;
      }),
      ctx.onResume(() => {
        pausedRef.current = false;
        lastStepRef.current = performance.now();
      }),
    ];
    return () => off.forEach((f) => f());
  }, [ctx]);

  /* ------------------------------------------------------------- the input */

  const nudge = useCallback(
    (dc: number) => {
      ctx.audio.unlock();
      const r = shift(gameRef.current, dc);
      if (r.moved) apply(r.state);
    },
    [apply, ctx],
  );

  const turn = useCallback(() => {
    ctx.audio.unlock();
    const r = spin(gameRef.current);
    if (r.moved) {
      apply(r.state);
      ctx.audio.play("tap");
    }
  }, [apply, ctx]);

  /** One row down, by hand. Resets the clock so it does not land a beat later. */
  const soften = useCallback(() => {
    ctx.audio.unlock();
    lastStepRef.current = performance.now();
    gravity();
  }, [ctx, gravity]);

  const slam = useCallback(() => {
    ctx.audio.unlock();
    if (gameRef.current.over) return;
    const r = hardDrop(gameRef.current);
    lastStepRef.current = performance.now();
    apply(r.state);
    haptic.tap();
    settle(r.state, r.cleared);
  }, [apply, ctx, settle]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const act: Record<string, () => void> = {
        ArrowLeft: () => nudge(-1),
        ArrowRight: () => nudge(1),
        ArrowUp: turn,
        ArrowDown: soften,
        " ": slam,
        a: () => nudge(-1),
        d: () => nudge(1),
        w: turn,
        s: soften,
      };
      const run = act[e.key];
      if (run) {
        e.preventDefault();
        run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nudge, turn, soften, slam]);

  // Swipe and tap on the board itself, for a player who would rather not use
  // the pad. The pad stays the primary path: a sustained gesture is exactly what
  // a small hand and an assistive pointer are worst at.
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    let sx = 0,
      sy = 0,
      moved = 0,
      tracking = false;
    const down = (e: PointerEvent) => {
      tracking = true;
      moved = 0;
      sx = e.clientX;
      sy = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!tracking) return;
      const dx = e.clientX - sx;
      // A column at a time, so a long drag walks the piece across rather than
      // teleporting it on release.
      const cell = el.getBoundingClientRect().width / gameRef.current.cols;
      if (Math.abs(dx) >= cell) {
        nudge(dx > 0 ? 1 : -1);
        sx = e.clientX;
        moved++;
      }
    };
    const up = (e: PointerEvent) => {
      if (!tracking) return;
      tracking = false;
      const dy = e.clientY - sy;
      if (dy > 44 && !moved) slam();
      else if (!moved && Math.abs(dy) < 12) turn();
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [nudge, slam, turn]);

  /* -------------------------------------------------------------- the view */

  const he = ctx.locale === "he";
  const L = LEVELS[state.level];
  const cell = cellSize(L.cols, L.rows);
  const painted = render(state);

  const pad = (label: string, glyph: string, onClick: () => void, wide = false) => (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        flex: wide ? "1.4 1 0" : "1 1 0",
        minWidth: 0,
        height: 58,
        border: "none",
        borderRadius: "var(--radius-2)",
        background: "var(--surface)",
        boxShadow: "var(--shadow-1)",
        color: "var(--text)",
        fontSize: 24,
        fontFamily: "inherit",
        cursor: "pointer",
        touchAction: "manipulation",
      }}
    >
      {glyph}
    </button>
  );

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "bolt", label: ctx.t("score"), value: state.score },
        { icon: "layers", label: he ? "שורות" : "Rows", value: state.lines },
        { icon: "trophy", label: ctx.t("best"), value: best },
      ]}
      levels={LEVEL_OPTIONS}
      level={level}
      onLevel={start}
      onRestart={restart}
      footer={
        // The pad. Row order is fixed LTR because these are DIRECTIONS on a
        // board that is itself pinned LTR - mirroring them in Hebrew would put
        // the left arrow on the right of the piece it moves.
        <div dir="ltr" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {pad(he ? "שמאלה" : "Left", "◀", () => nudge(-1))}
          {pad(he ? "סובב" : "Rotate", "⟳", turn, true)}
          {pad(he ? "ימינה" : "Right", "▶", () => nudge(1))}
          {pad(he ? "למטה" : "Down", "▼", soften)}
          {pad(he ? "הפל" : "Drop", "⤓", slam, true)}
        </div>
      }
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-dim)" }}>
          {he ? "הבא" : "Next"}
        </span>
        <NextPiece piece={state.next} />
      </div>

      <div
        ref={boardRef}
        className="ellaz-play-surface"
        // The board is spatial and its controls are directional, so it is
        // pinned LTR inside the Hebrew app - otherwise column 0 draws on the
        // right and every arrow points the wrong way.
        dir="ltr"
        style={{
          // The cell size rides as a custom property so every detail below is a
          // FRACTION of it. With fixed pixels a 5px radius on a 30px desktop
          // cell is a rounded square and on an 11px landscape-phone cell it is
          // a circle, which is what the first build shipped.
          ["--cell" as string]: cell,
          position: "relative",
          width: `calc(${cell} * ${L.cols})`,
          height: `calc(${cell} * ${L.rows})`,
          display: "grid",
          gridTemplateColumns: `repeat(${L.cols}, 1fr)`,
          gridTemplateRows: `repeat(${L.rows}, 1fr)`,
          // A FIXED deep well rather than a theme token, and that is a decision:
          // eleven saturated pieces need one constant ground to read against,
          // and on the light theme `--surface` puts pale yellow on near-white.
          background: WELL,
          border: `3px solid ${WELL_LINE}`,
          borderRadius: 10,
          boxShadow: "var(--shadow-1)",
          touchAction: "none",
          overflow: "hidden",
        } as CSSProperties}
      >
        {painted.flat().map((v, i) => (
          <div
            key={i}
            style={{
              // The seam is a border in the well's own colour, not a grid gap:
              // one node per cell instead of two, on a board that repaints
              // several times a second.
              border: `max(1px, calc(var(--cell) * 0.055)) solid ${WELL}`,
              boxSizing: "border-box",
              borderRadius: "calc(var(--cell) * 0.18)",
              background: v > 0 ? colorOf(v) : v < 0 ? "transparent" : WELL_LINE,
              // The landing shadow: the piece's own colour, hollow. A player
              // reads where it will land without having to count columns.
              outline: v < 0 ? `max(1px, calc(var(--cell) * 0.07)) dashed ${colorOf(v)}` : undefined,
              outlineOffset: "calc(var(--cell) * -0.14)",
              opacity: v < 0 ? 0.45 : 1,
              // The jelly: a lit top edge and a shaded bottom one, which is what
              // stops a flat colour block looking like a table cell.
              boxShadow:
                v > 0
                  ? "inset 0 calc(var(--cell) * 0.1) 0 rgba(255,255,255,0.32), " +
                    "inset 0 calc(var(--cell) * -0.1) 0 rgba(0,0,0,0.22)"
                  : undefined,
            }}
          />
        ))}

        {state.over && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              background: "rgba(20,22,44,0.78)",
              padding: 12,
              // Explicit, not inherited. `--text` is near-black on the light
              // theme, and this overlay is dark in BOTH themes, so inheriting
              // paints the heading black on near-black - which is what the
              // first build did, and it is legible in exactly one theme.
              color: "#FFF7EC",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 38 }}>🧱</div>
              <h2 style={{ margin: "6px 0 10px", fontSize: 18, color: "inherit" }}>
                {ctx.t("gameOver")}
              </h2>
              <Button onClick={restart}>{ctx.t("restart")}</Button>
            </div>
          </div>
        )}
      </div>
    </GameChrome>
  );
}

/** The queue, one piece deep. Drawn from the piece's own matrix, so it is never a lookalike. */
function NextPiece({ piece }: { piece: Piece }) {
  const n = piece.cells.length;
  const cells = new Set(filled(piece).map(([r, c]) => r * n + c));
  return (
    <div
      dir="ltr"
      aria-hidden="true"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${n}, 12px)`,
        gridTemplateRows: `repeat(${n}, 12px)`,
      }}
    >
      {Array.from({ length: n * n }, (_, i) => (
        <div
          key={i}
          style={{
            border: "1px solid transparent",
            boxSizing: "border-box",
            borderRadius: 3,
            background: cells.has(i) ? colorOf(piece.color) : "transparent",
            boxShadow: cells.has(i) ? "inset 0 1.5px 0 rgba(255,255,255,0.3)" : undefined,
          }}
        />
      ))}
    </div>
  );
}
