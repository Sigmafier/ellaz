import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { textFor, type Locale } from "@i18n/index";
import type { GameContext, RewardTier, SessionSpec } from "@sdk/index";
import { GameChrome, type ChromeLevel } from "@ui/GameChrome";
import { burst, haptic, shake } from "@juice/index";
import { useGameSession, useRememberedLevel, winMoment } from "@shared/index";
import {
  LEVELS,
  LEVEL_IDS,
  beginAt,
  colOf,
  connectedCount,
  endpointAt,
  extendTo,
  isSolved,
  newGame,
  release,
  rowOf,
  scoreFor,
  type Cell,
  type FlowState,
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
 * A level is a grid size; a tier is what the economy pays for it. Written out
 * rather than passed straight through, because the day this game gains an
 * "expert" the compiler asks what that is worth instead of quietly handing
 * `grant()` a tier it has never heard of.
 */
const LEVEL_TIER: Record<LevelId, RewardTier> = {
  easy: "easy",
  medium: "medium",
  hard: "hard",
};

/* -------------------------------------------------------------- the palette */

/**
 * The pipe colours, indexed the way `logic.ts` indexes a pair — which is a
 * palette INDEX precisely so the rules never learn a hex code.
 *
 * Eight, for six pairs at the hardest tier plus headroom, and they are spread
 * across LIGHTNESS as well as hue. That is the accessible half of the choice: a
 * pipe game cannot stop being about colour, but two pipes a red-green
 * colour-blind player reads as one hue are still a pale one and a dark one, and
 * the hard board puts six on screen at once. The order below walks light to
 * dark on purpose, so neighbouring indices are never the closest pair.
 */
const COLORS: readonly string[] = [
  "#FFD93D", // sunflower  — the lightest
  "#2E4FB8", // deep sea   — the darkest, so 0 and 1 can never be confused
  "#FF8A3D", // apricot
  "#12A594", // teal
  "#F26D9B", // rose
  "#5B3FA8", // aubergine
  "#8FD44E", // pear
  "#B23A3A", // brick
];

/* ---------------------------------------------------------------- the board */

/**
 * A cell's size, against the VIEWPORT and never the container — the house rule
 * for every board here.
 *
 * The vw and vh terms are computed into variables rather than interpolated
 * inline so the whole `min(...)` is one uninterrupted expression that
 * `game-panel-clears-widest-board.test.ts` can read as text: an inline
 * `.toFixed(2)` carries its own parentheses, and that gate used to stop at the
 * first `)` and never see the px cap it exists to check.
 *
 * 88px is the cap for every tier rather than one cap per tier, so the arithmetic
 * has a single answer: the widest board is `7 x 88 = 616px` plus 6 gaps of 4px,
 * which is 640 inside the 684px the desktop panel leaves. On a 390px phone the
 * vw term binds instead — 12vw on hard is ~47px, so the board is ~352px inside
 * 90vw with the gaps.
 */
function cellSize(size: number): string {
  const vw = (84 / size).toFixed(2);
  const vh = (56 / size).toFixed(2);
  return `min(${vw}vw, ${vh}vh, 88px)`;
}

/** The gap between cells, in px. Small: a pipe has to look continuous. */
const CELL_GAP = 4;

/** Which way a pipe leaves a cell. Read off the path, drawn as an arm. */
interface Ink {
  color: number;
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  /** The live end of the pipe, which gets a slightly bigger cap. */
  head: boolean;
}

/**
 * Every cell a pipe covers, with the directions it leaves in.
 *
 * Derived per render rather than stored on the state: the arms are a picture of
 * `paths`, and a second copy of that fact is a second thing that can be wrong.
 */
function inkOf(state: FlowState): Map<Cell, Ink> {
  const out = new Map<Cell, Ink>();
  state.paths.forEach((path, color) => {
    path.forEach((cell, i) => {
      const e: Ink = {
        color,
        up: false,
        down: false,
        left: false,
        right: false,
        head: i === path.length - 1,
      };
      const link = (other: Cell) => {
        const dr = rowOf(other, state.size) - rowOf(cell, state.size);
        const dc = colOf(other, state.size) - colOf(cell, state.size);
        if (dr === -1) e.up = true;
        else if (dr === 1) e.down = true;
        else if (dc === -1) e.left = true;
        else if (dc === 1) e.right = true;
      };
      if (i > 0) link(path[i - 1]);
      if (i < path.length - 1) link(path[i + 1]);
      out.set(cell, e);
    });
  });
  return out;
}

/* -------------------------------------------------------------- the session */

/**
 * A puzzle in progress: the level it belongs to, and the whole board.
 *
 * `endpoints` travels inside `FlowState`, and it has to: the dots ARE the
 * puzzle, and a board restored without them would be a grid of laid pipes with
 * nothing to join. The routes come back too, so a child returns to the pipes
 * they had already worked out.
 *
 * There is NO reward latch in this snapshot, and that is a fact about the game
 * rather than an omission. The only grant is the single `level_complete` at the
 * end, and a solved board is never handed back: `live: !won` clears it, and the
 * guard at the mount refuses one anyway. The day this game pays anything
 * mid-run — a milestone for each pipe joined, a personal best — that latch
 * belongs here, or leaving and returning becomes a way to be paid twice (see
 * the session rule).
 */
interface FlowSession {
  level: LevelId;
  state: FlowState;
}

const SESSION: SessionSpec<FlowSession> = {
  version: 1,
  validate: (value): value is FlowSession => {
    const s = value as Partial<FlowSession> | null;
    if (typeof s !== "object" || s === null) return false;
    if (typeof s.level !== "string" || !(s.level in LEVELS)) return false;
    const spec = LEVELS[s.level as LevelId];
    const g = s.state;
    if (typeof g !== "object" || g === null) return false;
    // Everything the renderer sizes itself from reads off the LEVEL, so a board
    // of some other shape lays out as a grid whose columns and cells disagree.
    if (g.size !== spec.size) return false;
    const cells = spec.size * spec.size;

    if (!Array.isArray(g.endpoints) || g.endpoints.length !== spec.pairs) return false;
    const dots = new Set<number>();
    for (const pair of g.endpoints) {
      if (!Array.isArray(pair) || pair.length !== 2) return false;
      for (const cell of pair) {
        if (!inRange(cell, cells)) return false;
        // Two colours sharing a dot is not a board this deal can produce, and
        // it would render as one circle a child can start two pipes from.
        if (dots.has(cell as number)) return false;
        dots.add(cell as number);
      }
    }

    if (!Array.isArray(g.paths) || g.paths.length !== spec.pairs) return false;
    // The strictest check here, and the one worth the lines: `extendTo` trusts
    // that a path is contiguous and that no two paths share a cell. A truncated
    // or hand-edited snapshot that broke either would not throw — it would draw
    // a plausible board whose arms point at nothing and whose win condition can
    // never be met, which is far harder to notice than a refusal to load.
    const taken = new Set<number>();
    for (let c = 0; c < g.paths.length; c++) {
      const path = g.paths[c];
      if (!Array.isArray(path)) return false;
      if (path.length === 1) return false; // a lone dot is a stub, never stored
      if (path.length > cells) return false;
      for (let i = 0; i < path.length; i++) {
        const cell = path[i];
        if (!inRange(cell, cells)) return false;
        if (taken.has(cell)) return false;
        taken.add(cell);
        if (i === 0) {
          const [a, b] = g.endpoints[c];
          if (cell !== a && cell !== b) return false;
        } else if (!neighbouring(path[i - 1], cell, spec.size)) {
          return false;
        }
      }
    }

    if (g.drawing !== null && !inRange(g.drawing, spec.pairs)) return false;
    return typeof g.moves === "number" && Number.isFinite(g.moves);
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

export function FlowGame({ ctx }: { ctx: GameContext }) {
  const [level, setLevel] = useRememberedLevel(
    ctx,
    LEVEL_OPTIONS.map((o) => o.id),
    "easy",
  );
  const restored = useMemo(() => ctx.session.load(SESSION), [ctx]);
  // Adopted only for the level this mount opened on, and never once it is
  // solved — a finished board has nothing left to join, and returning to one
  // reads as the game having failed to deal a puzzle.
  const resume =
    restored && restored.level === level && !isSolved(restored.state) ? restored : undefined;

  // Nothing is BEING DRAWN on the way back in. A restored `drawing` would leave
  // a pipe half-laid in the hand of a child who has not touched the screen yet,
  // and their next tap anywhere near it would extend a route they have no
  // memory of starting.
  const [state, setState] = useState<FlowState>(() =>
    resume ? { ...resume.state, drawing: null } : newGame(level),
  );
  const [won, setWon] = useState(false);
  // Fewest routes, per LEVEL. A 5x5 with four pairs and a 7x7 with six are not
  // the same puzzle, so one shared record would let an easy run permanently
  // outrank every hard one.
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best(level));
  const boardRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  /**
   * The live board, mirrored out of React.
   *
   * A drag delivers pointer events faster than React re-renders, so two moves
   * in one frame would both read the same stale `state` from the closure and
   * the second would overwrite the first. Every handler below reads this ref
   * and writes through `apply`, so the rules always see the board as it
   * actually is.
   */
  const live = useRef(state);
  const apply = useCallback((next: FlowState) => {
    live.current = next;
    setState(next);
  }, []);

  // Whether a finger is currently down, and whether it has travelled. The
  // second is what tells a DRAG from a TAP: a drag ends the route when the
  // finger lifts, while a tap leaves it open so the next tap can carry on.
  const holding = useRef(false);
  const dragged = useRef(false);
  const lastCell = useRef<Cell | null>(null);

  // Read from the ref rather than from `state`, so a flush during teardown
  // stores the last move of a drag even if React never rendered it.
  useGameSession(ctx, SESSION, () => ({ level, state: live.current }), { live: !won });

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
      holding.current = false;
      dragged.current = false;
      lastCell.current = null;
      ctx.analytics.levelStart(lv);
    },
    [apply, ctx, level, setLevel],
  );

  /**
   * Close the gesture and, if that finished the board, celebrate.
   *
   * From the handler flow and never from inside a `setState` updater — React
   * may run an updater twice, and this one grants coins (see the rewards rule).
   */
  const finish = useCallback(
    (from: FlowState) => {
      const { state: next, outcome } = release(from);
      apply(next);
      if (outcome.kind === "released" && outcome.counted) haptic.tap();
      if (!isSolved(next)) return;

      setWon(true);
      ctx.audio.play("success");
      const at = boardCentre();
      if (at) burst(at.x, at.y, { count: 18 });
      const result = winMoment(ctx, {
        reason: "level_complete",
        tier: LEVEL_TIER[level],
        level,
        at,
        // No `ms`. This game keeps no clock, so "not measured" is the honest
        // answer; a move count handed to that field would be logged as a
        // duration, which this repo has shipped twice.
        score: scoreFor(next, level),
      });
      if (result.score) setBest(result.score.best);
    },
    [apply, boardCentre, ctx, level],
  );

  /**
   * A tap on a cell — the whole input model, and the one that must always work.
   *
   * TAP IS THE COMPLETE PATH: touch a dot, then touch the squares one at a time
   * until the matching dot. Drag is layered on top of exactly these calls and is
   * never required, because a five-year-old on a phone and anyone on assistive
   * input cannot reliably hold a sustained gesture. The keyboard reaches this
   * same function from Enter and Space.
   *
   * Extending is tried FIRST and beginning second. That order is what lets a tap
   * on the matching dot finish the route rather than restart it: the twin is a
   * dot, so a begin-first reading would clear the pipe the player just spent six
   * taps laying.
   */
  const onCell = useCallback(
    (cell: Cell) => {
      if (won) return;
      ctx.audio.unlock();
      const from = live.current;

      const stepped = extendTo(from, cell);
      if (stepped.outcome.kind !== "ignored") {
        apply(stepped.state);
        if (stepped.outcome.kind === "completed") {
          ctx.audio.play("pop");
          // The route reached its dot, so the gesture is over whether or not a
          // finger is still down. Closing it here is what makes one pipe cost
          // one move however it was laid.
          finish(stepped.state);
          return;
        }
        ctx.audio.play("tap");
        haptic.tap();
        return;
      }

      const begun = beginAt(from, cell);
      if (begun.outcome.kind === "ignored") {
        // Not a dot and not reachable from the pipe in hand. A refusal is not an
        // error: the board twitches and the game says nothing, so a misjudged
        // tap costs nothing to recover from.
        const el = boardRef.current;
        if (el) shake(el, 3, 140);
        return;
      }
      apply(begun.state);
      ctx.audio.play("tap");
      haptic.tap();
    },
    [apply, ctx, finish, won],
  );

  /** During a drag, only ever EXTEND: sliding over another pair's dot must not steal the gesture. */
  const onDragInto = useCallback(
    (cell: Cell) => {
      if (won) return;
      const stepped = extendTo(live.current, cell);
      if (stepped.outcome.kind === "ignored") return;
      apply(stepped.state);
      if (stepped.outcome.kind === "completed") {
        ctx.audio.play("pop");
        finish(stepped.state);
        holding.current = false;
        return;
      }
      ctx.audio.play("tap");
    },
    [apply, ctx, finish, won],
  );

  /**
   * Which cell the finger is over now.
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
      dragged.current = true;
      onDragInto(cell);
    },
    [onDragInto],
  );

  const onLift = useCallback(() => {
    if (!holding.current) return;
    holding.current = false;
    lastCell.current = null;
    // A plain tap leaves the route OPEN so the next tap carries it on; only a
    // drag ends when the finger does. Without that split, tap-to-extend would
    // close the gesture after every single square and a five-cell pipe would
    // cost five moves.
    if (!dragged.current) return;
    dragged.current = false;
    finish(live.current);
  }, [finish]);

  /* -------------------------------------------------------------- the view */

  const { size, pairs } = LEVELS[level];
  const cell = cellSize(size);
  const ink = useMemo(() => inkOf(state), [state]);
  const joined = connectedCount(state);
  const holes = size * size - ink.size;

  // This game's own words. A locale RECORD, so promoting a language reds this
  // block by name instead of leaving the game speaking English inside a page
  // that is not.
  const T = textFor(
    {
      he: {
        pipes: "צינורות",
        start: "הקישו על נקודה, ואז על המשבצות עד לנקודה התואמת",
        drawing: "המשיכו עד לנקודה בצבע הזה",
        holes: "כל הצינורות חוברו, אבל נשארו משבצות ריקות",
      },
      en: {
        pipes: "Pipes",
        start: "Tap a dot, then tap the squares up to its matching dot",
        drawing: "Keep going to the dot in this colour",
        holes: "Every pipe is joined, but some squares are still empty",
      },
      es: {
        pipes: "Tuberías",
        start: "Toca un punto y luego las casillas hasta el punto igual",
        drawing: "Sigue hasta el punto de este color",
        holes: "Todas las tuberías están unidas, pero quedan casillas vacías",
      },
    },
    ctx.locale,
  );

  const hint = won
    ? `${ctx.t("youWon")} 🎉`
    : joined === pairs && holes > 0
      ? T.holes
      : state.drawing !== null
        ? T.drawing
        : T.start;

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        {
          icon: "layers",
          label: T.pipes,
          value: `${joined}/${pairs}`,
          ltr: true,
          compact: true,
        },
        {
          icon: "moves",
          label: ctx.t("moves"),
          value: state.moves,
          compact: true,
          record: best ?? "-",
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
      {/* `dir="ltr"`, because this board's POSITION is meaningful: a pipe runs
          left and right across a grid whose cells are indexed `row * size +
          col`, so mirroring the grid under Hebrew would draw every route as its
          own mirror image while the rules went on believing otherwise. See
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
          const dot = endpointAt(state, i);
          const paint = ink.get(i);
          const hue = paint ? COLORS[paint.color % COLORS.length] : undefined;
          const dotHue = dot !== null ? COLORS[dot % COLORS.length] : undefined;
          const active = paint !== undefined && paint.color === state.drawing;
          return (
            <button
              key={i}
              type="button"
              data-cell={i}
              aria-label={`row ${rowOf(i, size) + 1} column ${colOf(i, size) + 1}`}
              // Pointer Events, and the capture with them: a drag that begins on
              // a cell belongs to this board even if the finger leaves a 47px
              // target before it lifts. `click` is deliberately NOT listened to
              // — it would fire a second time after this one.
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                holding.current = true;
                dragged.current = false;
                lastCell.current = i;
                onCell(i);
              }}
              // ...which leaves the keyboard, since a <button> reaches its own
              // onClick from Enter and Space and we are not listening there.
              // This is also the second complete route through the game: every
              // move can be made without a pointer at all.
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
                boxShadow: active ? "inset 0 0 0 2px var(--brand)" : undefined,
                cursor: "pointer",
                touchAction: "none",
                // The board is the tap target and the arms are decoration, so
                // nothing inside a cell may take the pointer away from it.
                overflow: "visible",
              }}
            >
              {paint && hue && (
                <>
                  {/* The junction, then one arm per direction the pipe leaves
                      in. Drawn as plain boxes rather than as a stroked path so
                      a corner is two overlapping arms and needs no geometry. */}
                  <span
                    style={{
                      position: "absolute",
                      inset: "34%",
                      borderRadius: "50%",
                      background: hue,
                      transform: paint.head && !dot ? "scale(1.25)" : undefined,
                      transition: "transform 0.12s ease",
                    }}
                  />
                  {arm(paint.up, hue, "up")}
                  {arm(paint.down, hue, "down")}
                  {arm(paint.left, hue, "left")}
                  {arm(paint.right, hue, "right")}
                </>
              )}
              {dot !== null && dotHue && (
                <span
                  style={{
                    position: "absolute",
                    inset: "14%",
                    borderRadius: "50%",
                    background: dotHue,
                    // A lit top edge and a shaded bottom one, so a dot reads as
                    // a plug rather than as a flat sticker.
                    boxShadow:
                      "inset 0 calc(var(--cell) * 0.06) 0 rgba(255,255,255,0.4), " +
                      "inset 0 calc(var(--cell) * -0.07) 0 rgba(0,0,0,0.25)",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </GameChrome>
  );
}

/**
 * One arm of a pipe, from the middle of the cell to the edge it leaves by.
 *
 * It runs a little PAST the edge (the gap between cells is 4px) so two cells'
 * arms meet and the pipe reads as one continuous run rather than as a row of
 * dashes.
 */
function arm(show: boolean, hue: string, dir: "up" | "down" | "left" | "right") {
  if (!show) return null;
  const across = "calc(50% - var(--cell) * 0.16)";
  const along = `calc(50% + ${CELL_GAP}px)`;
  const box: CSSProperties =
    dir === "up" || dir === "down"
      ? { left: across, right: across, height: along, [dir === "up" ? "top" : "bottom"]: `-${CELL_GAP}px` }
      : { top: across, bottom: across, width: along, [dir === "left" ? "left" : "right"]: `-${CELL_GAP}px` };
  return <span style={{ position: "absolute", background: hue, ...box }} />;
}
