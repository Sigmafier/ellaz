import { textFor } from "@i18n/index";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
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
  { id: "easy", label: { he: "רגוע", en: "Calm", es: "Tranquilo" } },
  { id: "normal", label: { he: "רגיל", en: "Normal", es: "Normal" } },
  { id: "hard", label: { he: "מהיר", en: "Fast", es: "Rápido" } },
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

/**
 * How long the drop button must be held before it fires.
 *
 * A hard drop is the one IRREVERSIBLE move in this game - the piece is gone the
 * instant it lands, and a run can end on it - and the button sits in the same
 * row as three arrows a thumb is already jabbing at. So it is the one control
 * that must not be reachable by accident.
 *
 * 250ms, arrived at by playing it: 1000 first, then 500, then this.
 *
 * The margin is now the thing to know about. A deliberate tap runs 60-120ms, so
 * a full second cleared that by an order of magnitude and this clears it by
 * roughly two. That is still a real guard - a jab in passing does not linger for
 * a quarter of a second - but it is no longer an enormous one, and shortening it
 * further starts to trade the guard for the wait rather than trimming slack.
 * Below about 150ms there is nothing left to protect.
 *
 * It is a constant rather than a literal so the charge ANIMATION and the timer
 * cannot disagree about how long the wait is - a bar that fills in 600ms over a
 * button that fires at 250ms reads as a broken button rather than a deliberate
 * one. Changing this number changes both, and the prose on the game's own pages
 * quotes it in three languages, so it moves with them or they start lying.
 */
const HOLD_MS = 250;

/** How long the button stays lit after firing, so the drop has a visible end. */
const FLASH_MS = 260;

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

/* --------------------------------------------------------- the hold button */

/**
 * A button that fires only after `HOLD_MS` of sustained press, and SHOWS the
 * wait while it happens.
 *
 * The animation is not decoration. A button that ignores a tap and says nothing
 * is indistinguishable from a broken one, so the charge has to be visible from
 * the first frame of the press: the fill sweeps DOWNWARD and the arrow slides
 * down with it, which is the move being asked for, drawn at the speed it is
 * being waited for. Releasing early snaps both back in 160ms - a fast, obvious
 * un-doing, so a cancel reads as a cancel rather than as a missed press.
 *
 * Everything is driven by `phase` rather than by a rAF loop: the browser
 * interpolates a single transform for the whole charge, off the main thread, on
 * a screen that is already repainting a falling board several times a second.
 */
function HoldPad({
  label,
  hint,
  glyph,
  onHold,
}: {
  label: string;
  hint: string;
  glyph: string;
  onHold: () => void;
}) {
  /**
   * TWO signals, deliberately not one.
   *
   * The charge and the after-flash were a single three-state `phase` driving a
   * single element, and that conflated them: "fully charged" and "still lit from
   * the last drop" were both `scaleY(1)`, so pressing again inside the flash
   * showed no charge at all - the button was already full - and the flash's own
   * timer landed mid-charge and reset it. At 1000ms that needed a press within
   * 260ms of a drop; at 250ms the flash outlives the charge, so ordinary quick
   * dropping hits it every time.
   *
   * Separated, `charging` always starts from empty and the flash fades over the
   * top of it. Neither can reach the other.
   */
  const [charging, setCharging] = useState(false);
  const [flash, setFlash] = useState(false);
  const holdRef = useRef(0);
  const flashRef = useRef(0);

  useEffect(
    () => () => {
      window.clearTimeout(holdRef.current);
      window.clearTimeout(flashRef.current);
    },
    [],
  );

  /** Let go before the charge is up: nothing fires, and the fill retreats. */
  const release = useCallback(() => {
    if (!holdRef.current) return;
    window.clearTimeout(holdRef.current);
    holdRef.current = 0;
    setCharging(false);
  }, []);

  const press = useCallback(() => {
    if (holdRef.current) return;
    // A tick at the START of the charge, so a player who cannot see the button
    // under their own thumb still knows the press registered.
    haptic.tap();
    setCharging(true);
    holdRef.current = window.setTimeout(() => {
      holdRef.current = 0;
      // Empty first, lit second: the charge is spent, and what remains on screen
      // is the confirmation rather than a bar that never came down.
      setCharging(false);
      setFlash(true);
      onHold();
      window.clearTimeout(flashRef.current);
      flashRef.current = window.setTimeout(() => setFlash(false), FLASH_MS);
    }, HOLD_MS);
  }, [onHold]);

  /**
   * A click with `detail === 0` has no pointer behind it: it is a keyboard or
   * assistive-technology activation, which cannot express "hold" at all. Those
   * fire immediately, because the guard here is against a stray THUMB landing
   * between two arrows - a player who has focused this button and activated it
   * has already committed, and making the drop unreachable to them would be a
   * far worse bug than the one this solves.
   */
  const click = useCallback(
    (e: ReactMouseEvent<HTMLButtonElement>) => {
      if (e.detail === 0) onHold();
    },
    [onHold],
  );

  return (
    <button
      type="button"
      // The hint rides in the accessible name because there is no room for it on
      // a 58px button, and "hold" is exactly the thing a screen-reader user
      // cannot discover by looking at the fill.
      aria-label={`${label} — ${hint}`}
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      // A held press is a long-press: without these, mobile browsers offer to
      // select the glyph or open a context menu right as the drop fires.
      onContextMenu={(e) => e.preventDefault()}
      onClick={click}
      style={{
        position: "relative",
        overflow: "hidden",
        flex: "1.4 1 0",
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
        // `none`, where the other three pads are `manipulation`, and the
        // difference is the whole reason this button works on a phone. A press
        // that is HELD is a press a thumb drifts during, and the browser reads
        // that drift as the start of a page scroll: it claims the gesture, fires
        // `pointercancel`, and the charge dies just short for a player who never
        // let go. Refusing to pan from this one 58px button costs nothing
        // - the board above it does not scroll either.
        touchAction: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
        WebkitTouchCallout: "none",
        WebkitTapHighlightColor: "transparent",
        transform: charging ? "scale(0.97)" : "none",
        transition: "transform 140ms var(--ease)",
      }}
    >
      {/* the charge: sweeps down over exactly HOLD_MS, retreats in 120ms */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--brand)",
          transformOrigin: "top",
          transform: charging ? "scaleY(1)" : "scaleY(0)",
          opacity: charging ? 0.38 : 0,
          // The charge is LINEAR and exactly `HOLD_MS`, so the moment the button
          // is full is the moment it fires. An eased fill would spend its last
          // third looking finished while the timer was still running.
          transition: charging
            ? `transform ${HOLD_MS}ms linear, opacity 100ms linear`
            : `transform 120ms var(--ease), opacity 120ms linear`,
        }}
      />
      {/* the confirmation, on its own element so a quick second press charges
          from empty instead of inheriting this one's full bar */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--brand)",
          opacity: flash ? 0.55 : 0,
          transition: flash ? "opacity 60ms linear" : `opacity ${FLASH_MS}ms linear`,
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: "relative",
          display: "block",
          transform: charging ? "translateY(4px)" : "none",
          transition: charging ? `transform ${HOLD_MS}ms linear` : "transform 120ms var(--ease)",
        }}
      >
        {glyph}
      </span>
    </button>
  );
}

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
  /**
   * TWO pauses, and they must not be one flag.
   *
   * `portalPausedRef` is the tab going away — a phone call, a switched tab, the
   * portal's own pause — and it is undone by the matching resume. `paused` is
   * the player's own button, and it is undone by nobody but them. Merged into a
   * single ref, backgrounding a deliberately-paused game and coming back to it
   * fires `onResume` and starts the piece falling under a cover the player
   * never dismissed. The clock is stopped when EITHER is set.
   */
  const portalPausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
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

  /**
   * The chrome's pause button. Resuming RESETS the step clock, and that line is
   * the whole reason this is a callback rather than a bare `setPaused`: the
   * gravity tick asks how long it has been since the last step, and after a
   * two-minute pause the honest answer is two minutes — so the first frame back
   * satisfies the interval instantly and the piece drops the moment the cover
   * lifts, which is exactly the fall the pause was there to prevent.
   */
  const togglePause = useCallback((next: boolean) => {
    setPaused(next);
    if (!next) lastStepRef.current = performance.now();
  }, []);

  const start = useCallback(
    (key: LevelKey) => {
      setLevel(key);
      milestoneRef.current = 0;
      scoredRef.current = false;
      // A new board is never a paused one. Without this a level change made
      // from behind the cover deals a fresh piece into a game the player still
      // cannot see, and the only way out is the pause button they did not
      // press to get there.
      setPaused(false);
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
      if (s.over || pausedRef.current || portalPausedRef.current) return;
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
        portalPausedRef.current = true;
      }),
      ctx.onResume(() => {
        portalPausedRef.current = false;
        lastStepRef.current = performance.now();
      }),
    ];
    return () => off.forEach((f) => f());
  }, [ctx]);

  /* ------------------------------------------------------------- the input */

  /**
   * Every action goes through here first.
   *
   * The cover the chrome draws blocks the BOARD, and the pad is in the footer
   * below it, so without this guard a paused game is fully playable by its own
   * buttons and by the keyboard — the piece just moves somewhere the player
   * cannot see, and lands there. Gating the four callbacks rather than the
   * three input surfaces means a fifth surface added later is covered by
   * construction.
   */
  const accepting = useCallback(() => !pausedRef.current, []);

  const nudge = useCallback(
    (dc: number) => {
      if (!accepting()) return;
      ctx.audio.unlock();
      const r = shift(gameRef.current, dc);
      if (r.moved) apply(r.state);
    },
    [accepting, apply, ctx],
  );

  const turn = useCallback(() => {
    if (!accepting()) return;
    ctx.audio.unlock();
    const r = spin(gameRef.current);
    if (r.moved) {
      apply(r.state);
      ctx.audio.play("tap");
    }
  }, [accepting, apply, ctx]);

  /** One row down, by hand. Resets the clock so it does not land a beat later. */
  const soften = useCallback(() => {
    if (!accepting()) return;
    ctx.audio.unlock();
    lastStepRef.current = performance.now();
    gravity();
  }, [accepting, ctx, gravity]);

  const slam = useCallback(() => {
    if (!accepting()) return;
    ctx.audio.unlock();
    if (gameRef.current.over) return;
    const r = hardDrop(gameRef.current);
    lastStepRef.current = performance.now();
    apply(r.state);
    haptic.tap();
    settle(r.state, r.cleared);
  }, [accepting, apply, ctx, settle]);

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

  // This game's own words. A locale RECORD, so promoting a language reds
  // this block by name instead of leaving the game speaking English
  // inside a page that is not.
  const T = textFor(
    {
      he: { rows: "שורות", left: "שמאלה", rotate: "סובב", right: "ימינה", down: "למטה", drop: "הפל", hold: "החזיקו רגע", next: "הבא" },
      en: { rows: "Rows", left: "Left", rotate: "Rotate", right: "Right", down: "Down", drop: "Drop", hold: "hold for a moment", next: "Next" },
      es: { rows: "Filas", left: "Izquierda", rotate: "Girar", right: "Derecha", down: "Abajo", drop: "Soltar", hold: "mantén pulsado un momento", next: "Siguiente" },
    },
    ctx.locale,
  );
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
        { icon: "bolt", label: ctx.t("score"), value: state.score, record: best },
        { icon: "layers", label: T.rows, value: state.lines, compact: true },
      ]}
      levels={LEVEL_OPTIONS}
      level={level}
      onLevel={start}
      onRestart={restart}
      // Absent once the well has stacked out: the piece is not falling any
      // more, so there is nothing left to stop, and the sheet under the board
      // already owns that screen.
      paused={state.over ? undefined : paused}
      onPaused={state.over ? undefined : togglePause}
      footer={
        // The pad. Row order is fixed LTR because these are DIRECTIONS on a
        // board that is itself pinned LTR - mirroring them in Hebrew would put
        // the left arrow on the right of the piece it moves.
        // No soft-drop button: the single-step "▼" was fiddly on a phone and
        // the hard-drop "⤓" does the useful thing. Keyboard ArrowDown still
        // soft-drops for desktop players.
        //
        // The drop is the ONE button here that is held rather than tapped. It is
        // the only irreversible control in the game and it sits inside a row of
        // arrows a thumb is already moving across, so a tap is exactly the input
        // it must not accept. Everything else stays a tap.
        <div dir="ltr" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {pad(T.left, "◀", () => nudge(-1))}
          {pad(T.rotate, "⟳", turn, true)}
          {pad(T.right, "▶", () => nudge(1))}
          <HoldPad label={T.drop} hint={T.hold} glyph="⤓" onHold={slam} />
        </div>
      }
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-dim)" }}>
          {T.next}
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
