import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { textFor, type Locale } from "@i18n/index";
import { formatScore, type GameContext, type RewardTier, type SessionSpec } from "@sdk/index";
import { GameChrome, type ChromeLevel } from "@ui/GameChrome";
import { burst, haptic, shake } from "@juice/index";
import { useGameSession, useGameTimer, useRememberedLevel, winMoment } from "@shared/index";
import {
  LEVELS,
  LEVEL_IDS,
  MARGIN,
  NUDGE_STEP,
  SPAN,
  beginGrab,
  countCrossings,
  crossingEdges,
  dragTo,
  endGrab,
  isSolved,
  newGame,
  nudge,
  placeSelected,
  scoreFor,
  selectDot,
  settle,
  type Edge,
  type LevelId,
  type Point,
  type UntangleState,
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
 * A level is a dot count; a tier is what the economy pays for it. Written out
 * rather than passed straight through, because the day this game gains an
 * "expert" the compiler asks what that is worth instead of quietly handing
 * `grant()` a tier it has never heard of.
 */
const LEVEL_TIER: Record<LevelId, RewardTier> = {
  easy: "easy",
  medium: "medium",
  hard: "hard",
};

/* ---------------------------------------------------------------- the field */

/**
 * The play field, sized against the VIEWPORT and never its container — the
 * house rule for every board here, so the stage breaks out of the page gutter
 * on a phone instead of being squeezed by it.
 *
 * 560px is the desktop cap. The panel leaves 684px, and the widest board in the
 * catalogue asks for 640, so this sits comfortably under both — a square field
 * gains nothing from the last 80px and loses a lot of vertical room to it.
 * On a 390px phone the vw term binds and the field is ~359px, where the ring
 * puts neighbouring dots about 81px apart on the hardest tier.
 */
const FIELD = "min(92vw, 56vh, 560px)";

/** The dot a finger actually hits, and the dot an eye actually sees. */
const HIT = "var(--tap)";
const DOT = "calc(var(--tap) * 0.46)";

/** Line widths in LOGIC units, so they scale with the field rather than with the screen. */
const STROKE = 7;
const STROKE_CROSSED = 11;

/** Percent of the field, for absolute placement. Logic units in, CSS out. */
const pct = (v: number): string => `${(v / SPAN) * 100}%`;

/* -------------------------------------------------------------- the session */

/**
 * A board in progress: the tier, the whole drawing, and the clock.
 *
 * The CLOCK travels because the record is a time. Without it every board a
 * child walks away from and comes back to would finish on a few seconds and
 * become a personal best nobody earned.
 *
 * There is NO reward latch here, and that is a fact about the game rather than
 * an omission: the only grant is the single `level_complete` at the end, a
 * finished board is never handed back (`live: !won` clears it, and the guard at
 * the mount refuses one anyway), so there is no mid-run payment that leaving
 * and returning could collect twice. The day this game pays anything for a
 * crossing removed, that latch belongs in here — see the session rule.
 */
interface UntangleSession {
  level: LevelId;
  state: UntangleState;
  elapsedMs: number;
}

const isPoint = (p: unknown): p is Point => {
  const q = p as Partial<Point> | null;
  return (
    typeof q === "object" &&
    q !== null &&
    Number.isInteger(q.x) &&
    Number.isInteger(q.y) &&
    (q.x as number) >= MARGIN &&
    (q.x as number) <= SPAN - MARGIN &&
    (q.y as number) >= MARGIN &&
    (q.y as number) <= SPAN - MARGIN
  );
};

const SESSION: SessionSpec<UntangleSession> = {
  version: 1,
  validate: (value): value is UntangleSession => {
    const s = value as Partial<UntangleSession> | null;
    if (typeof s !== "object" || s === null) return false;
    if (typeof s.level !== "string" || !(s.level in LEVELS)) return false;
    if (typeof s.elapsedMs !== "number" || !Number.isFinite(s.elapsedMs) || s.elapsedMs < 0) return false;
    const spec = LEVELS[s.level as LevelId];
    const g = s.state;
    if (typeof g !== "object" || g === null) return false;

    if (!Array.isArray(g.nodes) || g.nodes.length !== spec.dots || !g.nodes.every(isPoint)) return false;
    if (!Array.isArray(g.solution) || g.solution.length !== spec.dots || !g.solution.every(isPoint))
      return false;

    if (!Array.isArray(g.edges) || g.edges.length === 0 || g.edges.length > spec.lines) return false;
    const seen = new Set<string>();
    for (const edge of g.edges) {
      if (!Array.isArray(edge) || edge.length !== 2) return false;
      const [a, b] = edge as [unknown, unknown];
      if (!Number.isInteger(a) || !Number.isInteger(b)) return false;
      if ((a as number) < 0 || (a as number) >= (b as number) || (b as number) >= spec.dots) return false;
      const key = `${a}-${b}`;
      if (seen.has(key)) return false;
      seen.add(key);
    }

    // THE ONE CHECK THAT COULD NOT BE INFERRED FROM SHAPE ALONE, and the reason
    // the crossing-free drawing is stored at all. A line list restored off a
    // disk can be perfectly well formed and still have no crossing-free drawing
    // anywhere — and that board renders beautifully, plays normally, and can
    // never be won. The witness settles it by exhibition rather than by
    // argument: if these dots put HERE cross nothing, then a solution exists,
    // and the same predicate that judges the player is what says so.
    if (countCrossings({ nodes: g.solution as Point[], edges: g.edges as Edge[] }) !== 0) return false;

    // A gesture cannot survive a save: `settle` strips both at write time, so
    // anything holding one was not written by this game.
    if (g.selected !== null || g.grab !== null) return false;
    return typeof g.moves === "number" && Number.isFinite(g.moves) && g.moves >= 0;
  },
};

/* ----------------------------------------------------------------- the game */

export function UntangleGame({ ctx }: { ctx: GameContext }) {
  const [level, setLevel] = useRememberedLevel(
    ctx,
    LEVEL_OPTIONS.map((o) => o.id),
    "easy",
  );
  const restored = useMemo(() => ctx.session.load(SESSION), [ctx]);
  // Adopted only for the tier this mount opened on, and never once it is
  // untangled — a finished board has nothing left to move, and returning to one
  // reads as the game having failed to deal a puzzle.
  const resume =
    restored && restored.level === level && !isSolved(restored.state) ? restored : undefined;

  const [state, setState] = useState<UntangleState>(() => resume?.state ?? newGame(level));
  const [won, setWon] = useState(false);
  // Fastest untangle, per TIER. Six dots and twelve dots are not the same
  // puzzle, so one shared record would let an easy run outrank every hard one.
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best(level));
  const fieldRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  // The clock stops the moment the board comes untangled, and `useGameTimer`
  // already stops it on pause. `initialMs` carries the same promise one step
  // further out: walking away and coming back tomorrow costs the clock nothing.
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
  const apply = useCallback((next: UntangleState) => {
    live.current = next;
    setState(next);
  }, []);

  /** Was the grabbed dot already chosen when the finger came down? See `release`. */
  const wasSelected = useRef(false);

  // Read from the ref rather than from `state`, and SETTLED, so a flush during
  // a drag stores a board with no gesture hanging off it.
  useGameSession(
    ctx,
    SESSION,
    () => ({ level, state: settle(live.current), elapsedMs: timer.elapsedMs }),
    { live: !won },
  );

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      ctx.lifecycle.gameplayStart();
      ctx.analytics.levelStart(level);
    }
  }, [ctx, level]);

  const fieldCentre = useCallback(() => {
    const r = fieldRef.current?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined;
  }, []);

  const reset = useCallback(
    (lv: LevelId = level) => {
      setLevel(lv);
      apply(newGame(lv));
      setWon(false);
      setBest(ctx.score?.best(lv));
      wasSelected.current = false;
      // Zero, never the abandoned run's minutes — a restart is a new run.
      timer.reset();
      ctx.analytics.levelStart(lv);
    },
    [apply, ctx, level, setLevel, timer],
  );

  /**
   * Commit a board and, if that untangled it, celebrate.
   *
   * From the handler flow and never from inside a `setState` updater — React
   * may run an updater twice, and this one grants coins.
   */
  const commit = useCallback(
    (next: UntangleState) => {
      apply(next);
      if (!isSolved(next)) return;

      setWon(true);
      ctx.audio.play("success");
      const at = fieldCentre();
      if (at) burst(at.x, at.y, { count: 20 });
      // Read the clock here rather than from a later render: `won` has only
      // just been set, so the timer is still running for one more tick.
      const solvedMs = timer.elapsedMs;
      const result = winMoment(ctx, {
        reason: "level_complete",
        tier: LEVEL_TIER[level],
        level,
        at,
        ms: solvedMs,
        score: scoreFor(level, solvedMs),
      });
      if (result.score) setBest(result.score.best);
    },
    [apply, ctx, fieldCentre, level, timer],
  );

  /** Screen coordinates to logic coordinates. `clampPoint` does the rest. */
  const toLogic = useCallback((clientX: number, clientY: number): Point => {
    const r = fieldRef.current?.getBoundingClientRect();
    if (!r || r.width === 0 || r.height === 0) return { x: 0, y: 0 };
    return { x: ((clientX - r.left) / r.width) * SPAN, y: ((clientY - r.top) / r.height) * SPAN };
  }, []);

  const onDotDown = useCallback(
    (dot: number, e: ReactPointerEvent<HTMLButtonElement>) => {
      if (won) return;
      // The field's own handler would read this as "put the chosen dot here",
      // which would drop one dot on top of another.
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      ctx.audio.unlock();
      wasSelected.current = live.current.selected === dot;
      const begun = beginGrab(live.current, dot);
      if (begun.outcome.kind === "ignored") return;
      apply(begun.state);
      ctx.audio.play("tap");
      haptic.tap();
    },
    [apply, ctx, won],
  );

  const onMove = useCallback(
    (clientX: number, clientY: number) => {
      if (won || live.current.grab === null) return;
      const step = dragTo(live.current, toLogic(clientX, clientY));
      if (step.outcome.kind === "ignored") return;
      apply(step.state);
    },
    [apply, toLogic, won],
  );

  const onLift = useCallback(() => {
    const held = live.current.grab;
    if (held === null) return;
    const released = endGrab(live.current);
    if (released.outcome.kind !== "released") return;

    // A tap on a dot that was ALREADY chosen unchooses it, which is the only
    // way back out of a selection without moving anything. A drag never gets
    // here: `counted` is true and the selection is already gone.
    if (!released.outcome.counted && wasSelected.current) {
      apply(selectDot(released.state, held.dot).state);
      return;
    }
    if (released.outcome.counted) {
      ctx.audio.play("pop");
      haptic.tap();
    }
    commit(released.state);
  }, [apply, commit, ctx]);

  /** A tap on empty ground: put the chosen dot there. The second half of the tap route. */
  const onFieldDown = useCallback(
    (clientX: number, clientY: number) => {
      if (won) return;
      ctx.audio.unlock();
      if (live.current.selected === null) {
        // Nothing is chosen, so there is nothing to place. A refusal is not an
        // error: the field twitches and the game says nothing.
        const el = fieldRef.current;
        if (el) shake(el, 3, 140);
        return;
      }
      const placed = placeSelected(live.current, toLogic(clientX, clientY));
      if (placed.outcome.kind === "ignored") return;
      if (placed.outcome.kind === "placed" && placed.outcome.counted) {
        ctx.audio.play("pop");
        haptic.tap();
      }
      commit(placed.state);
    },
    [commit, ctx, toLogic, won],
  );

  /**
   * The keyboard, which is a COMPLETE second route through this game.
   *
   * Enter or Space chooses a dot; the arrow keys walk it. Nothing here needs a
   * pointer at all, which is the same promise the tap route makes to a hand
   * that cannot hold a sustained gesture.
   */
  const onDotKey = useCallback(
    (dot: number, key: string) => {
      if (won) return;
      if (key === "Enter" || key === " ") {
        const picked = selectDot(live.current, dot);
        if (picked.outcome.kind === "ignored") return;
        apply(picked.state);
        ctx.audio.play("tap");
        return;
      }
      const step = ARROWS[key];
      if (!step) return;
      let from = live.current;
      if (from.selected !== dot) from = selectDot(from, dot).state;
      const moved = nudge(from, step.dx * NUDGE_STEP, step.dy * NUDGE_STEP);
      if (moved.outcome.kind === "ignored") {
        apply(from);
        return;
      }
      commit(moved.state);
    },
    [apply, commit, ctx, won],
  );

  /* -------------------------------------------------------------- the view */

  const crossed = useMemo(() => crossingEdges(state), [state]);
  const crossings = useMemo(() => countCrossings(state), [state]);

  // This game's own words. A locale RECORD, so promoting a language reds this
  // block by name instead of leaving the game speaking English inside a page
  // that is not.
  const T = textFor(
    {
      he: {
        crossings: "הצטלבויות",
        start: "גוררים נקודה, או נוגעים בה ואז במקום שאליו היא הולכת",
        holding: "עכשיו נוגעים במקום שאליו הנקודה הולכת",
        close: "נשארה הצטלבות אחת",
        dot: "נקודה",
      },
      en: {
        crossings: "Crossings",
        start: "Drag a dot, or tap it and then tap where it should go",
        holding: "Now tap the spot this dot should go to",
        close: "One crossing left",
        dot: "Dot",
      },
      es: {
        crossings: "Cruces",
        start: "Arrastra un punto, o tócalo y luego toca adónde va",
        holding: "Ahora toca el sitio adonde va este punto",
        close: "Queda un cruce",
        dot: "Punto",
      },
    },
    ctx.locale,
  );

  const hint = won
    ? `${ctx.t("youWon")} 🎉`
    : state.selected !== null
      ? T.holding
      : crossings === 1
        ? T.close
        : T.start;

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        {
          icon: "draw",
          label: T.crossings,
          value: crossings,
          ltr: true,
          compact: true,
        },
        {
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
      onRestart={() => reset()}
      footer={
        <div
          style={{
            color: "var(--text-dim)",
            fontSize: 13,
            textAlign: "center",
            minHeight: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 6px",
          }}
        >
          {hint}
        </div>
      }
    >
      {/* `dir="ltr"`, because this field's POSITION is meaningful: a dot at
          x = 120 is on the left, and mirroring the field under Hebrew would put
          it on the right while the rules went on believing otherwise — so a
          drag would fight the finger. See
          .claude/rules/rtl-spatial-grid-dir-ltr.md. */}
      <div
        ref={fieldRef}
        dir="ltr"
        className="ellaz-play-surface"
        onPointerDown={(e) => onFieldDown(e.clientX, e.clientY)}
        onPointerMove={(e) => onMove(e.clientX, e.clientY)}
        onPointerUp={onLift}
        onPointerCancel={onLift}
        style={
          {
            position: "relative",
            width: FIELD,
            height: FIELD,
            margin: "0 auto",
            borderRadius: "var(--radius-3)",
            background: "rgba(255,255,255,0.05)",
            touchAction: "none",
          } as CSSProperties
        }
      >
        {/* The lines. Behind every dot, and deaf to the pointer, so a drag that
            passes over one is still a drag rather than a tap on the line. */}
        <svg
          viewBox={`0 0 ${SPAN} ${SPAN}`}
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            overflow: "visible",
          }}
        >
          {state.edges.map(([a, b], i) => {
            const bad = crossed.has(i);
            return (
              <line
                key={i}
                x1={state.nodes[a].x}
                y1={state.nodes[a].y}
                x2={state.nodes[b].x}
                y2={state.nodes[b].y}
                stroke={bad ? "var(--red-ink)" : "var(--teal-ink)"}
                strokeWidth={bad ? STROKE_CROSSED : STROKE}
                strokeLinecap="round"
                // The lines still in trouble are drawn heavier as well as in
                // another colour, so the board is readable to a player who
                // cannot tell the two hues apart.
                opacity={bad ? 1 : 0.75}
              />
            );
          })}
        </svg>

        {state.nodes.map((p, i) => {
          const chosen = state.selected === i;
          return (
            <button
              key={i}
              type="button"
              aria-label={`${T.dot} ${i + 1}`}
              aria-pressed={chosen}
              onPointerDown={(e) => onDotDown(i, e)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " " && !ARROWS[e.key]) return;
                e.preventDefault();
                onDotKey(i, e.key);
              }}
              style={{
                position: "absolute",
                left: pct(p.x),
                top: pct(p.y),
                transform: "translate(-50%, -50%)",
                width: HIT,
                height: HIT,
                padding: 0,
                border: "none",
                background: "transparent",
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                cursor: "grab",
                touchAction: "none",
              }}
            >
              {/* The hit area is a full platform tap target; the drawing inside
                  it is smaller, so twelve dots on a phone still read as dots
                  rather than as a row of buttons. */}
              <span
                style={{
                  width: DOT,
                  height: DOT,
                  borderRadius: "50%",
                  background: chosen ? "var(--yellow-ink)" : "var(--brand-ink)",
                  boxShadow: chosen
                    ? "0 0 0 4px color-mix(in oklab, var(--yellow-ink) 45%, transparent)"
                    : "inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.25)",
                  transition: "background 0.12s ease, box-shadow 0.12s ease",
                }}
              />
            </button>
          );
        })}
      </div>
    </GameChrome>
  );
}

/** The four arrow keys, as one step each. */
const ARROWS: Record<string, { dx: number; dy: number } | undefined> = {
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
};
