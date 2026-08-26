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
  BLANK,
  CLUE_UNIT,
  CROSSED,
  FILLED,
  LEVELS,
  LEVEL_IDS,
  clueTotal,
  colSatisfied,
  filledCount,
  isSolved,
  lineSolve,
  maxRuns,
  newGame,
  rowSatisfied,
  scoreFor,
  setMark,
  tapMark,
  type Clue,
  type LevelId,
  type Mark,
  type NonogramState,
  type PaintMode,
} from "./logic";

/**
 * The level row, built FROM the logic's own list rather than beside it.
 *
 * `LEVEL_IDS` decides the order and `LEVEL_LABELS` is a `Record<LevelId, …>`,
 * so adding a tier to `logic.ts` reds this file by name instead of shipping a
 * difficulty the toggle cannot reach.
 */
const LEVEL_LABELS: Record<LevelId, Record<Locale, string>> = {
  easy: { he: "5x5", en: "5x5", es: "5x5" },
  medium: { he: "10x10", en: "10x10", es: "10x10" },
  hard: { he: "15x15", en: "15x15", es: "15x15" },
};

const LEVEL_OPTIONS: ChromeLevel<LevelId>[] = LEVEL_IDS.map((id) => ({
  id,
  label: LEVEL_LABELS[id],
}));

/**
 * Two vocabularies that happen to spell the same three words today.
 *
 * A level is a grid size; a tier is what the economy pays for it. Written out
 * rather than passed straight through, so the day this game gains a 20x20 the
 * compiler asks what that is worth instead of quietly handing `grant()` a tier
 * it has never heard of.
 */
const LEVEL_TIER: Record<LevelId, RewardTier> = {
  easy: "easy",
  medium: "medium",
  hard: "hard",
};

/* ---------------------------------------------------------------- the board */

/**
 * A cell's size, against the VIEWPORT and never the container - the house rule
 * for every board here.
 *
 * WRITTEN OUT PER TIER, AS LITERALS, AND THAT IS DELIBERATE. The tree-wide gate
 * in `src/ui/game-panel-clears-widest-board.test.ts` reads px caps out of a
 * `min(...)` as TEXT, so an interpolated `${cap}px` is a number it cannot see -
 * and a check that cannot see a value reports green about it forever. So the
 * arithmetic lives in the comment and in `logic.ts`, and the result lives here
 * as three literals that `logic.test.ts` reads back.
 *
 * The arithmetic. A board is `size` cells wide PLUS a clue gutter of
 * `maxRuns(size) * 0.5` cells, which is 6.5, 12.5 and 19 cell-widths at the
 * three tiers. The desktop panel leaves 684px, so the px cap is that over the
 * width in cells: 684/6.5 = 105, 684/12.5 = 54, 684/19 = 36. The caps below sit
 * just under each, giving 572, 650 and 646px of board.
 *
 * On a 390px phone the vw term binds instead and a hard cell lands near 18px.
 * That is the honest floor of a 15x15 on a small screen, and it is the one
 * thing about this game that a bigger screen genuinely fixes.
 */
const CELL: Record<LevelId, string> = {
  easy: "min(13.84vw, 8.92vh, 88px)",
  medium: "min(7.20vw, 4.64vh, 52px)",
  hard: "min(4.73vw, 3.05vh, 34px)",
};

/** Every fifth line gets a heavier rule, the way a printed nonogram does. */
const BLOCK = 5;

/**
 * One clue number, drawn in the gutter.
 *
 * A `<span>` rather than a cell of its own: the gutter is ONE grid cell per row
 * and per column, and the numbers inside it are laid out by flex. Sizing each
 * number as a grid track instead would make the gutter as wide as the busiest
 * line on the board, which changes on every restart.
 */
function clueText(clue: Clue): string[] {
  return clue.length ? clue.map(String) : ["0"];
}

/* -------------------------------------------------------------- the session */

/**
 * A board in progress: the tier, the whole puzzle, the clock, and the mode.
 *
 * `elapsedMs` is the field this snapshot turns on. The record here is a solve
 * TIME, so restoring the grid alone would hand back a board eight cells from
 * done with the clock at zero, and every abandoned puzzle would become a
 * personal best nobody earned.
 *
 * `mode` travels for a smaller reason that is still worth a line: a player who
 * walked away mid-board was in the middle of ruling cells OUT, and coming back
 * to a fill brush means their next tap paints a cell they had just decided was
 * empty.
 *
 * There is NO reward latch in here, and that is a fact about the game rather
 * than an omission: the only grant is the single `level_complete` at the end,
 * and a solved board is never handed back (`live: !won` clears it, and the
 * guard at the mount refuses one anyway). The day this game pays anything
 * mid-run - a coin per completed row, a personal best - that latch belongs
 * here, or leaving and returning becomes a way to be paid twice. See
 * .claude/rules/session-snapshot-convention.md.
 */
interface NonogramSession {
  level: LevelId;
  state: NonogramState;
  elapsedMs: number;
  mode: PaintMode;
}

/** A clue that could actually be printed beside a line of `size` cells. */
function plausibleClue(value: unknown, size: number): value is number[] {
  if (!Array.isArray(value)) return false;
  if (!value.every((n) => Number.isInteger(n) && n > 0 && n <= size)) return false;
  const needed = value.reduce((a: number, b: number) => a + b, 0) + Math.max(0, value.length - 1);
  return needed <= size;
}

const SESSION: SessionSpec<NonogramSession> = {
  version: 1,
  validate: (value): value is NonogramSession => {
    const s = value as Partial<NonogramSession> | null;
    if (typeof s !== "object" || s === null) return false;
    if (typeof s.level !== "string" || !(s.level in LEVELS)) return false;
    if (s.mode !== "fill" && s.mode !== "cross") return false;
    if (typeof s.elapsedMs !== "number" || !Number.isFinite(s.elapsedMs) || s.elapsedMs < 0)
      return false;

    const spec = LEVELS[s.level as LevelId];
    const g = s.state;
    if (typeof g !== "object" || g === null) return false;
    // Everything the renderer sizes itself from reads off the LEVEL, so a board
    // of some other shape lays out as a grid whose tracks and cells disagree.
    if (g.size !== spec.size) return false;
    if (!Array.isArray(g.marks) || g.marks.length !== spec.size * spec.size) return false;
    if (!g.marks.every((m) => m === BLANK || m === FILLED || m === CROSSED)) return false;
    if (!Array.isArray(g.rows) || g.rows.length !== spec.size) return false;
    if (!Array.isArray(g.cols) || g.cols.length !== spec.size) return false;
    if (!g.rows.every((c) => plausibleClue(c, spec.size))) return false;
    if (!g.cols.every((c) => plausibleClue(c, spec.size))) return false;

    // THE SAME PROOF A FRESH DEAL GETS, and it is the reason this validator is
    // worth more than a shape check. Everything above says the numbers are
    // printable; only this says they are a PUZZLE. A truncated write or a
    // hand-edited record can hand back clues that render perfectly and admit
    // two pictures - or none - and a child would meet that as a board they
    // simply cannot finish, with nothing on screen to explain it.
    //
    // It costs well under a millisecond at 15x15, once, on the way in.
    return lineSolve(spec.size, g.rows, g.cols).kind === "solved";
  },
};

/* ----------------------------------------------------------------- the game */

export function NonogramGame({ ctx }: { ctx: GameContext }) {
  const [level, setLevel] = useRememberedLevel(
    ctx,
    LEVEL_OPTIONS.map((o) => o.id),
    "easy",
  );
  const restored = useMemo(() => ctx.session.load(SESSION), [ctx]);
  // Adopted only for the tier this mount opened on, and never once it is
  // solved - a finished picture has nothing left to fill, and returning to one
  // reads as the game having failed to deal a puzzle.
  const resume =
    restored && restored.level === level && !isSolved(restored.state) ? restored : undefined;

  const [state, setState] = useState<NonogramState>(() => resume?.state ?? newGame(level));
  const [mode, setMode] = useState<PaintMode>(() => resume?.mode ?? "fill");
  const [won, setWon] = useState(false);
  // Fastest solve, per TIER. A 5x5 and a 15x15 are not the same afternoon, so
  // one shared record would let an easy run permanently outrank every hard one.
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best(level));
  const boardRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  // The clock stops the moment the picture is right, and `useGameTimer` already
  // stops it on pause - a child who puts the tablet down mid-board must not
  // come back to a ruined time. `initialMs` is the same promise one step out:
  // walking away entirely and coming back tomorrow costs the clock nothing.
  const timer = useGameTimer(ctx, { running: !won, initialMs: resume?.elapsedMs });

  /**
   * The live board, mirrored out of React.
   *
   * A drag delivers pointer events faster than React re-renders, so two cells
   * painted in one frame would both read the same stale `state` from the
   * closure and the second would overwrite the first. Every handler below reads
   * this ref and writes through `apply`.
   */
  const live = useRef(state);
  const apply = useCallback((next: NonogramState) => {
    live.current = next;
    setState(next);
  }, []);

  // Read by the snapshot getter, which runs during teardown and during a
  // visibility change - both places where the render that set `mode` may not
  // have happened yet.
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const holding = useRef(false);
  /** What the whole gesture paints, decided by the cell it started on. */
  const brush = useRef<Mark>(BLANK);
  const lastCell = useRef<number | null>(null);

  useGameSession(
    ctx,
    SESSION,
    () => ({ level, state: live.current, elapsedMs: timer.elapsedMs, mode: modeRef.current }),
    { live: !won },
  );

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
      // Zero, never the abandoned board's minutes - see `initialMs`.
      timer.reset();
      holding.current = false;
      lastCell.current = null;
      ctx.analytics.levelStart(lv);
    },
    [apply, ctx, level, setLevel, timer],
  );

  /**
   * Write one cell and, if that finished the picture, celebrate.
   *
   * From the handler flow and never from inside a `setState` updater - React
   * may run an updater twice, and this one grants coins.
   */
  const paint = useCallback(
    (cell: number, mark: Mark) => {
      if (won) return;
      const step = setMark(live.current, cell, mark);
      if (step.outcome.kind === "ignored") return;
      apply(step.state);
      ctx.audio.play(mark === FILLED ? "pop" : "tap");
      haptic.tap();
      if (!isSolved(step.state)) return;

      setWon(true);
      ctx.audio.play("success");
      // Read the clock here, not from a later render: `won` has only just been
      // set, so the timer is still running for one more tick.
      const solvedMs = timer.elapsedMs;
      const at = boardCentre();
      if (at) burst(at.x, at.y, { count: 20 });
      const result = winMoment(ctx, {
        reason: "level_complete",
        tier: LEVEL_TIER[level],
        level,
        at,
        ms: solvedMs,
        score: scoreFor(solvedMs, level),
      });
      if (result.score) setBest(result.score.best);
    },
    [apply, boardCentre, ctx, level, timer, won],
  );

  /**
   * A tap on a cell - the whole input model, and the one that must always work.
   *
   * TAP IS THE COMPLETE PATH: one tap per cell, in whichever mode the footer is
   * showing, and a second tap on the same cell takes it back. Dragging is
   * layered on exactly these calls and is never required, because a small hand
   * on a phone and anyone on assistive input cannot reliably hold a sustained
   * gesture. The keyboard reaches this same function from Enter and Space.
   */
  const onCell = useCallback(
    (cell: number) => {
      if (won) {
        const el = boardRef.current;
        if (el) shake(el, 3, 140);
        return;
      }
      ctx.audio.unlock();
      const mark = tapMark(live.current, cell, modeRef.current);
      brush.current = mark;
      paint(cell, mark);
    },
    [ctx, paint, won],
  );

  /**
   * Which cell the finger is over now.
   *
   * `setPointerCapture` sends every later move to the element the gesture
   * STARTED on, so `onPointerEnter` on the neighbours never fires and the
   * position has to be read off the document instead. That is the price of the
   * capture, and the capture is what keeps a fast drag from being dropped the
   * moment it leaves an 18px target.
   */
  const cellUnder = (x: number, y: number): number | null => {
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
      // The whole gesture paints what its FIRST cell became. Re-deciding per
      // cell would make a drag across a mixed row flip every cell it crossed,
      // which is a lot of undoing for one careless swipe.
      paint(cell, brush.current);
    },
    [paint],
  );

  const onLift = useCallback(() => {
    holding.current = false;
    lastCell.current = null;
  }, []);

  /* -------------------------------------------------------------- the view */

  const { size } = LEVELS[level];
  const gutter = maxRuns(size) * CLUE_UNIT;
  const cell = CELL[level];
  const filled = filledCount(state);
  const total = clueTotal(state);

  // Which lines already read what their numbers say. Dimming those is the whole
  // of this game's feedback: it never says a cell is wrong, it only stops
  // asking about a line that is finished. Recomputed per render rather than
  // stored, because it is a picture of `marks` and a second copy of that fact
  // is a second thing that can be wrong.
  const doneRows = useMemo(
    () => Array.from({ length: size }, (_, r) => rowSatisfied(state, r)),
    [size, state],
  );
  const doneCols = useMemo(
    () => Array.from({ length: size }, (_, c) => colSatisfied(state, c)),
    [size, state],
  );

  // This game's own words. A locale RECORD, so promoting a language reds this
  // block by name instead of leaving the game speaking English inside a page
  // that is not.
  const T = textFor(
    {
      he: {
        cells: "משבצות",
        fill: "מלא",
        cross: "סמן ריק",
        start: "המספרים סופרים רצפים של משבצות מלאות באותה שורה",
        crossing: "נגיעה מסמנת משבצת כריקה",
        mode: "מצב סימון",
      },
      en: {
        cells: "Cells",
        fill: "Fill",
        cross: "Rule out",
        start: "The numbers count runs of filled cells along that line",
        crossing: "A tap rules a cell out as empty",
        mode: "Marking mode",
      },
      es: {
        cells: "Casillas",
        fill: "Rellenar",
        cross: "Descartar",
        start: "Los números cuentan rachas de casillas llenas en esa línea",
        crossing: "Un toque descarta la casilla como vacía",
        mode: "Modo de marcado",
      },
    },
    ctx.locale,
  );

  const hint = won ? `${ctx.t("youWon")} 🎉` : mode === "cross" ? T.crossing : T.start;

  const clueStyle: CSSProperties = {
    display: "flex",
    fontSize: "calc(var(--cell) * 0.46)",
    fontWeight: 700,
    lineHeight: 1,
    color: "var(--text-dim)",
    userSelect: "none",
  };

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
          icon: "check",
          label: T.cells,
          value: `${filled}/${total}`,
          ltr: true,
          compact: true,
        },
      ]}
      levels={LEVEL_OPTIONS}
      level={level}
      onLevel={(lv) => reset(lv)}
      onRestart={() => reset()}
      footer={
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              color: "var(--text-dim)",
              fontSize: 13,
              textAlign: "center",
              minHeight: 18,
              padding: "0 6px",
            }}
          >
            {hint}
          </div>
          {/* The mode toggle. A segmented pair rather than a long press or a
              second finger: both of those are gestures this platform does not
              require of anybody, and neither is discoverable. */}
          <div
            role="group"
            aria-label={T.mode}
            style={{ display: "flex", gap: 8, width: "100%" }}
          >
            {(["fill", "cross"] as const).map((m) => {
              const on = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    ctx.audio.unlock();
                    setMode(m);
                    ctx.audio.play("tap");
                  }}
                  style={{
                    flex: "1 1 0",
                    minHeight: "var(--tap, 56px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    border: "none",
                    borderRadius: "var(--radius-2)",
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    color: on ? "var(--on-brand, #fff)" : "var(--text)",
                    background: on ? "var(--brand)" : "rgba(255,255,255,0.08)",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      background: m === "fill" ? "currentColor" : "transparent",
                      boxShadow: m === "cross" ? "inset 0 0 0 2px currentColor" : undefined,
                    }}
                  >
                    {m === "cross" ? "✕" : ""}
                  </span>
                  {m === "fill" ? T.fill : T.cross}
                </button>
              );
            })}
          </div>
        </div>
      }
    >
      {/* `dir="ltr"`, because this board's POSITION is meaningful: a clue counts
          runs left to right along a row indexed `row * size + col`, so mirroring
          the grid under Hebrew would draw every clue against the wrong end of
          its own line while the rules went on believing otherwise. See
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
            gridTemplateColumns: `calc(var(--cell) * ${gutter}) repeat(${size}, var(--cell))`,
            gridTemplateRows: `calc(var(--cell) * ${gutter}) repeat(${size}, var(--cell))`,
            justifyContent: "center",
            gap: 1,
            padding: 6,
            borderRadius: "var(--radius-3)",
            background: "rgba(255,255,255,0.05)",
            touchAction: "none",
          } as CSSProperties
        }
      >
        {/* The corner, where the two gutters meet. Empty, and it stays empty. */}
        <div aria-hidden />

        {Array.from({ length: size }, (_, c) => (
          <div
            key={`c${c}`}
            style={{
              ...clueStyle,
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "calc(var(--cell) * 0.06)",
              paddingBottom: "calc(var(--cell) * 0.12)",
              opacity: doneCols[c] ? 0.35 : 1,
            }}
          >
            {clueText(state.cols[c]).map((n, i) => (
              <span key={i}>{n}</span>
            ))}
          </div>
        ))}

        {Array.from({ length: size }, (_, r) => (
          <RowOfCells
            key={`r${r}`}
            r={r}
            size={size}
            state={state}
            clueStyle={clueStyle}
            done={doneRows[r]}
            doneCols={doneCols}
            onDown={(i, e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              holding.current = true;
              lastCell.current = i;
              onCell(i);
            }}
            onKey={(i) => onCell(i)}
          />
        ))}
      </div>
    </GameChrome>
  );
}

/**
 * One row: its clue in the gutter, then its cells.
 *
 * Split out so the grid's children stay flat - a wrapper element around a row
 * would need `display: contents`, which drops the row out of the accessibility
 * tree in some browsers. React fragments cost nothing and do not.
 */
function RowOfCells({
  r,
  size,
  state,
  clueStyle,
  done,
  doneCols,
  onDown,
  onKey,
}: {
  r: number;
  size: number;
  state: NonogramState;
  clueStyle: CSSProperties;
  done: boolean;
  doneCols: boolean[];
  onDown: (cell: number, e: ReactPointerEvent<HTMLButtonElement>) => void;
  onKey: (cell: number) => void;
}) {
  return (
    <>
      <div
        style={{
          ...clueStyle,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "calc(var(--cell) * 0.12)",
          paddingRight: "calc(var(--cell) * 0.12)",
          opacity: done ? 0.35 : 1,
        }}
      >
        {clueText(state.rows[r]).map((n, i) => (
          <span key={i}>{n}</span>
        ))}
      </div>
      {Array.from({ length: size }, (_, c) => {
        const i = r * size + c;
        const mark = state.marks[i];
        // The heavier rule every fifth line, the way a printed nonogram draws
        // it. An inset shadow rather than a border, because a border would
        // change the cell's box and knock the grid out of square.
        const rules: string[] = [];
        if (c % BLOCK === 0 && c > 0) rules.push("inset 2px 0 0 var(--surface-2, rgba(0,0,0,0.45))");
        if (r % BLOCK === 0 && r > 0) rules.push("inset 0 2px 0 var(--surface-2, rgba(0,0,0,0.45))");
        return (
          <button
            key={i}
            type="button"
            data-cell={i}
            aria-label={`row ${r + 1} column ${c + 1}`}
            aria-pressed={mark === FILLED}
            // Pointer Events, and the capture with them: a drag that begins on
            // a cell belongs to this board even if the finger leaves an 18px
            // target before it lifts. `click` is deliberately NOT listened to -
            // it would fire a second time after this one.
            onPointerDown={(e) => onDown(i, e)}
            // ...which leaves the keyboard, since a <button> reaches its own
            // onClick from Enter and Space and we are not listening there. This
            // is the second complete route through the game: every cell can be
            // decided without a pointer at all.
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              onKey(i);
            }}
            style={{
              position: "relative",
              width: "var(--cell)",
              height: "var(--cell)",
              padding: 0,
              border: "none",
              borderRadius: "calc(var(--cell) * 0.1)",
              cursor: "pointer",
              touchAction: "none",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "calc(var(--cell) * 0.5)",
              lineHeight: 1,
              color: "var(--text-dim)",
              boxShadow: rules.length ? rules.join(", ") : undefined,
              background:
                mark === FILLED
                  ? "var(--g, var(--brand))"
                  : done || doneCols[c]
                    ? "rgba(255,255,255,0.13)"
                    : "rgba(255,255,255,0.08)",
            }}
          >
            {mark === CROSSED ? <span aria-hidden>✕</span> : null}
          </button>
        );
      })}
    </>
  );
}
