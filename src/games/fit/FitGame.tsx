import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameContext, SessionSpec } from "@sdk/index";
import type { Locale } from "@i18n/index";
import { Button } from "@ui/components";
import { GameChrome } from "@ui/GameChrome";
import { type DifficultyOption } from "@ui/DifficultySelector";
import { burst, haptic, shake } from "@juice/index";
import { useGameSession, useRememberedLevel, winMoment } from "@shared/index";
import {
  DIFFICULTIES,
  LEVELS,
  MILESTONE_EVERY,
  OFFER_SIZE,
  isDead,
  isShapeId,
  legalAnchors,
  makeShape,
  milestoneStep,
  newGame,
  scoreReport,
  tapCell,
  tapSlot,
  type Difficulty,
  type FitState,
  type Shape,
} from "./logic";

// The renderer. Every rule about what a tap DOES lives in logic.ts; this file
// decides what a tap LOOKS and SOUNDS like, and what the outcomes it reports
// are worth to the economy.
//
// TAP, NEVER DRAG. `logic.ts` has no `drag(from, to)` at all: one of the three
// offered shapes is always held, and a tap on the board either places it or
// bumps. That is the kids rule in CLAUDE.md and it is also the accessible path -
// a five-year-old on a phone, and anyone on assistive input, cannot reliably
// hold a sustained pointer gesture. Drag may be added ON TOP of this later; it
// may never replace it.
//
// NO CLOCK ANYWHERE. Nothing on this screen moves until a child touches it, so
// there is no `useGameTimer`, no interval, and no state a timer alone can leave.
// The three transient bits of feedback below - the pop, the flash and the bump -
// live in React state and never reach `FitState`, which is what makes the whole
// game state safe to write to disk (session-snapshot-convention.md).

const LEVEL_OPTIONS: DifficultyOption<Difficulty>[] = [
  { id: "easy", label: { he: "קל", en: "Easy", es: "Fácil" } },
  { id: "medium", label: { he: "בינוני", en: "Med", es: "Media" } },
  { id: "hard", label: { he: "קשה", en: "Hard", es: "Difícil" } },
];

// This game's own words, as a locale RECORD rather than a `locale === "he" ?`
// ternary - promoting a language reds this block by name instead of leaving the
// game speaking English inside a page that is not.
const WORDS: Record<
  Locale,
  {
    hint: string;
    lines: string;
    empty: string;
    full: string;
    piece: (n: number) => string;
  }
> = {
  he: {
    hint: "בחרו צורה, ואז הקישו על הלוח",
    lines: "שורות",
    empty: "משבצת ריקה",
    full: "משבצת מלאה",
    piece: (n) => `צורה בת ${n} משבצות`,
  },
  en: {
    hint: "Pick a shape, then tap the board",
    lines: "Lines",
    empty: "empty square",
    full: "filled square",
    piece: (n) => `shape of ${n} squares`,
  },
  es: {
    hint: "Elige una forma y toca el tablero",
    lines: "Líneas",
    empty: "casilla vacía",
    full: "casilla llena",
    piece: (n) => `figura de ${n} casillas`,
  },
};

/* -------------------------------------------------------------- the style */

/**
 * THE LOOK, in one place.
 *
 * Index 1-9, matching `logic.ts`'s `color` field, which is a number precisely so
 * the rules never learn a hex code. One hue per shape FAMILY, so a child reads
 * "the long blue one" before they can name anything - and so a filling board
 * still shows its seams rather than becoming one wall of colour.
 */
const PIECE_COLORS: readonly string[] = [
  "", // 0 is empty; the array is 1-based to match the logic's colour index
  "#FFC730", // dot      sunflower
  "#3DBBEE", // duo      lagoon
  "#6FD44E", // trio     lime
  "#FF8A3D", // quad     tangerine
  "#FF4D8D", // quint    raspberry
  "#A855C9", // box2     orchid
  "#E4572E", // box3     clay
  "#17B98A", // corner3  jade
  "#8093F1", // elbow5   periwinkle
];

/** The board itself. Deliberately not a theme token - see the note on the grid. */
const WELL = "#1D2440";
const WELL_CELL = "#28315A";

function colorOf(v: number): string {
  return PIECE_COLORS[v] ?? PIECE_COLORS[1];
}

/* ------------------------------------------------------------- the snapshot */

/**
 * A run in progress: the whole board, the tray, and the draw pile behind it.
 *
 * The BAG travels rather than being re-rolled, for the same reason blocks'
 * does: it is what stops real droughts, and a run resumed with a fresh bag
 * would quietly re-deal the next several shapes - invisible, and exactly the
 * "the game is cheating" feeling the bag exists to prevent.
 *
 * `bestFired` is the reward LATCH, and it has to travel or leaving the game
 * becomes a way to be paid twice: beat your record, walk out, come back, and
 * the next placement celebrates the same record again - once per resume,
 * forever (session-snapshot-convention.md).
 *
 * The MILESTONE latch is not here, and that is deliberate rather than an
 * omission: `milestoneStep(cleared)` is a pure function of a field the snapshot
 * already carries, so the run's line count IS the ledger. Storing it as well
 * would be a second source of truth that nothing keeps in step.
 */
interface FitSession {
  state: FitState;
  bestFired: boolean;
}

const SESSION: SessionSpec<FitSession> = {
  version: 1,
  validate: (value): value is FitSession => {
    const s = value as Partial<FitSession> | null;
    if (typeof s !== "object" || s === null) return false;
    if (typeof s.bestFired !== "boolean") return false;

    const g = s.state as Partial<FitState> | null | undefined;
    if (typeof g !== "object" || g === null) return false;
    if (typeof g.level !== "string" || !(g.level in LEVELS)) return false;

    // The board must match the dimensions the LEVEL declares, not merely the
    // ones the snapshot claims: the CSS grid is built from the level, so a
    // board of some other size renders as a grid whose cells and columns
    // disagree - a plausible picture with no error anywhere.
    const cfg = LEVELS[g.level as Difficulty];
    if (g.size !== cfg.size) return false;
    if (!Array.isArray(g.grid) || g.grid.length !== cfg.size * cfg.size) return false;
    if (!g.grid.every((c) => c === null || (typeof c === "number" && Number.isFinite(c)))) {
      return false;
    }

    if (!Array.isArray(g.offer) || g.offer.length !== OFFER_SIZE) return false;
    if (!g.offer.every((id) => id === null || isShapeId(id))) return false;
    // A held shape at every moment is this game's whole input model, so a
    // snapshot whose selection points at an empty slot is refused rather than
    // repaired: it would restore a board that answers every tap with silence.
    if (typeof g.selected !== "number" || !Number.isInteger(g.selected)) return false;
    if (g.selected < 0 || g.selected >= OFFER_SIZE || g.offer[g.selected] === null) return false;

    if (!Array.isArray(g.bag) || !g.bag.every(isShapeId)) return false;
    return [g.score, g.cleared, g.placed].every(
      (n) => typeof n === "number" && Number.isFinite(n) && n >= 0,
    );
  },
};

/* ---------------------------------------------------------------- the shape */

/** One offered shape, drawn as its own little grid of squares. */
function ShapeChip({ shape }: { shape: Shape }) {
  // Every shape gets the same overall footprint rather than the same cell size,
  // so a five-long bar and a single dot are the same weight in the tray and the
  // row never jumps as the offer changes.
  const dot = Math.max(9, Math.round(66 / Math.max(shape.w, shape.h)));
  const on = new Set(shape.cells.map(([r, c]) => `${r},${c}`));
  return (
    <div
      aria-hidden="true"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${shape.w}, ${dot}px)`,
        gridTemplateRows: `repeat(${shape.h}, ${dot}px)`,
        gap: 2,
      }}
    >
      {Array.from({ length: shape.w * shape.h }, (_, k) => {
        const r = Math.floor(k / shape.w);
        const c = k % shape.w;
        return (
          <span
            key={k}
            style={{
              borderRadius: Math.max(2, Math.round(dot * 0.22)),
              background: on.has(`${r},${c}`) ? colorOf(shape.color) : "transparent",
            }}
          />
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- the game */

export function FitGame({ ctx }: { ctx: GameContext }) {
  // The level a child last chose, VALIDATED against this game's own list - an id
  // no longer in the list resolves to -1 in GameChrome's findIndex and the
  // toggle silently disappears. Everything below reads `level`; a hardcoded
  // "easy" here would deal an easy board under chrome saying "Hard".
  const [level, setLevel] = useRememberedLevel(ctx, DIFFICULTIES, "easy");

  // Read ONCE, before the first render, so a resumed board never flashes as a
  // fresh one. A finished run is refused rather than restored: `live` clears it
  // on the way out, so a stored dead board can only come from a build that
  // wrote one.
  const restored = useMemo(() => ctx.session.load(SESSION), [ctx]);
  const resume =
    restored && restored.state.level === level && !isDead(restored.state) ? restored : undefined;

  const [state, setState] = useState<FitState>(() => resume?.state ?? newGame(level));
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best(level));
  /** Cells the last placement filled, for one short pop. */
  const [popped, setPopped] = useState<readonly number[]>([]);
  /** Cells the last clear emptied, for one short flash. */
  const [flash, setFlash] = useState<readonly number[]>([]);
  /** The cell a shape would not fit on. See `onCell` - a refusal is not an error. */
  const [bumped, setBumped] = useState<number | null>(null);
  /** Pointer preview. Touch never sets this; a mouse gets a ghost. */
  const [hover, setHover] = useState<number | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  /**
   * One personal-best moment per run.
   *
   * The score port calls every point past the old record a personal best, and
   * this game reports on every placement, so without the latch a first-time
   * player - whose record is nothing at all - collects the reward on literally
   * every tap. It resets where a new run begins, and travels in the snapshot.
   */
  const bestFiredRef = useRef(resume?.bestFired ?? false);
  /**
   * The milestone already paid for, as a STEP.
   *
   * Seeded from the restored run's own line count rather than from a stored
   * counter - see the note on `FitSession`. Starting it back at 0 over a board
   * already at twenty lines would pay the very next clear again.
   */
  const milestoneRef = useRef(milestoneStep(resume?.state.cleared ?? 0));

  const dead = isDead(state);
  const T = WORDS[ctx.locale];
  const held = state.offer[state.selected];
  const heldShape = useMemo(() => (held ? makeShape(held) : null), [held]);

  // Cosmetic timers, tracked only so unmount can cancel them - a `setState`
  // firing into a torn-down game is a console error in front of a child. Each
  // id retires itself, or a long run would accumulate thousands of dead ones.
  const after = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((t) => t !== id);
      fn();
    }, ms);
    timersRef.current.push(id);
  }, []);
  useEffect(() => () => timersRef.current.forEach((id) => window.clearTimeout(id)), []);

  /**
   * Where the held shape's top-left may legally sit.
   *
   * Marked on the board while a shape is held, which is how a child learns the
   * anchor rule without a word of instruction: the marks thin out as the board
   * fills, so they stop being decoration and become the answer.
   */
  const anchors = useMemo(
    () => (heldShape && !dead ? new Set(legalAnchors(state, heldShape)) : new Set<number>()),
    [state, heldShape, dead],
  );

  /** The cells a placement at `hover` would fill, for the pointer ghost. */
  const ghost = useMemo(() => {
    if (hover === null || !heldShape || !anchors.has(hover)) return new Set<number>();
    const r0 = Math.floor(hover / state.size);
    const c0 = hover % state.size;
    return new Set(heldShape.cells.map(([dr, dc]) => (r0 + dr) * state.size + (c0 + dc)));
  }, [hover, heldShape, anchors, state.size]);

  // Deal a fresh board at `next`. Everything describing the RUN resets here,
  // including both latches: a new run has been paid for nothing yet.
  const startLevel = useCallback(
    (next: Difficulty) => {
      setLevel(next);
      setState(newGame(next));
      setBest(ctx.score?.best(next));
      setPopped([]);
      setFlash([]);
      setBumped(null);
      setHover(null);
      bestFiredRef.current = false;
      milestoneRef.current = 0;
      ctx.analytics.levelStart(next);
    },
    [ctx, setLevel],
  );

  const restart = useCallback(() => startLevel(level), [startLevel, level]);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      ctx.lifecycle.gameplayStart();
      ctx.analytics.levelStart(level);
    }
  }, [ctx, level]);

  // A live board is worth returning to; a finished one is not, so `live: false`
  // CLEARS rather than freezes. Restoring a run with no legal move would show a
  // child a board with nothing to do and no way to understand why.
  useGameSession(ctx, SESSION, () => ({ state, bestFired: bestFiredRef.current }), { live: !dead });

  /* ------------------------------------------------------------- the taps */

  const onSlot = useCallback(
    (slot: number) => {
      const { state: next, outcome } = tapSlot(state, slot);
      if (outcome.kind === "ignored") return;
      ctx.audio.unlock();
      ctx.speech.unlock();
      ctx.audio.play("tap");
      haptic.tap();
      setHover(null);
      setState(next);
    },
    [ctx, state],
  );

  // Everything here runs in the HANDLER, never inside a setState updater:
  // React may run an updater twice, and a doubled `winMoment` is a doubled
  // grant - real coins, not a stray animation.
  const onCell = useCallback(
    (index: number, el: HTMLElement) => {
      if (dead) return;
      ctx.audio.unlock();
      ctx.speech.unlock();

      const { state: next, outcome } = tapCell(state, index);
      if (outcome.kind === "ignored") return;

      // A refusal is NOT an error, and it costs nothing: the shape is still
      // held, the board is untouched, and the child simply taps somewhere else.
      // So it answers with a bump and says nothing - the same shape the World
      // shop uses for an item nobody can afford yet.
      if (outcome.kind === "blocked") {
        haptic.tap();
        setBumped(index);
        after(260, () => setBumped(null));
        return;
      }
      if (outcome.kind !== "placed") return;

      setState(next);
      setHover(null);

      // The tapped square's own middle, so coins fly from the shape the child
      // just placed rather than from the middle of the screen.
      const r = el.getBoundingClientRect();
      const at = { x: r.left + r.width / 2, y: r.top + r.height / 2 };

      setPopped(outcome.cells);
      after(280, () => setPopped([]));

      const lines = outcome.rows.length + outcome.cols.length;
      if (lines > 0) {
        ctx.audio.play("success");
        haptic.success();
        setFlash(outcome.clearedCells);
        after(320, () => setFlash([]));
        burst(at.x, at.y, { count: 8 + lines * 6 });
      } else {
        ctx.audio.play("pop");
        haptic.tap();
      }

      // The record climbs WITH the run. This game has no ending a child reaches
      // on purpose, so waiting for one would mean a run they walk away from
      // never counted at all. `scoreReport` is logic.ts's own answer to what the
      // record measures - the renderer never invents a unit, and never writes
      // its own `best`.
      const report = scoreReport(next, level);
      const scored = ctx.score?.report(report);
      if (scored?.isPersonalBest) setBest(scored.best);

      // A coin every few lines. `confetti: false` because this fires often, and
      // a full-screen celebration that fires often stops being one.
      const step = milestoneStep(next.cleared);
      if (step > milestoneRef.current) {
        milestoneRef.current = step;
        winMoment(ctx, {
          reason: "milestone",
          level: `lines-${step * MILESTONE_EVERY}`,
          at,
          confetti: false,
        });
      }

      // The one celebration an endless game ever gets, latched to once per run.
      // There is no `level_complete` here on purpose: nothing is ever finished,
      // so nothing may pay a completion star.
      if (scored?.isPersonalBest && !bestFiredRef.current) {
        bestFiredRef.current = true;
        winMoment(ctx, {
          reason: "personal_best",
          tier: level,
          level: `score-${report.value}`,
          at,
        });
      }

      if (isDead(next)) {
        ctx.audio.play("fail");
        if (boardRef.current) shake(boardRef.current);
        ctx.analytics.levelFail(level, "no-fit");
      }
    },
    [after, ctx, dead, level, state],
  );

  /* ----------------------------------------------------------- the screen */

  const size = state.size;

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "bolt", label: ctx.t("score"), value: state.score },
        { icon: "layers", label: T.lines, value: state.cleared },
        { icon: "trophy", label: ctx.t("best"), value: best ?? "-" },
      ]}
      levels={LEVEL_OPTIONS}
      level={level}
      onLevel={startLevel}
      onRestart={restart}
      footer={
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "var(--radius-2)",
            boxShadow: "var(--shadow-1)",
            padding: "10px 10px 12px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
          }}
        >
          <div
            // The tray. LTR like the board: the three slots are positions a
            // child points at, and a row that mirrors between languages is a
            // different row (rtl-spatial-grid-dir-ltr.md).
            dir="ltr"
            style={{
              display: "flex",
              // Three slots today, and any row in this repo that can grow wraps
              // rather than clipping - a-row-that-grows-with-the-catalog-must-wrap.md.
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
              gap: 8,
              width: "100%",
            }}
          >
            {state.offer.map((id, slot) => {
              const shape = id ? makeShape(id) : null;
              const isHeld = slot === state.selected && shape !== null;
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={shape === null}
                  aria-label={shape ? T.piece(shape.cells.length) : T.empty}
                  aria-pressed={isHeld}
                  onClick={() => onSlot(slot)}
                  style={{
                    // 96px tall and at least a third of the row wide: this is
                    // the target a child actually aims at, and it clears the
                    // 2cm floor even where a board cell cannot.
                    flex: "1 1 92px",
                    minWidth: 0,
                    height: 96,
                    display: "grid",
                    placeItems: "center",
                    border: "none",
                    borderRadius: 14,
                    padding: 0,
                    background: shape ? "var(--surface-2)" : "transparent",
                    outline: isHeld ? "3px solid var(--brand)" : "none",
                    outlineOffset: -3,
                    transform: isHeld ? "scale(0.96)" : "none",
                    opacity: shape ? 1 : 0.25,
                    transition: "transform 0.12s ease, opacity 0.2s ease",
                    cursor: shape ? "pointer" : "default",
                    touchAction: "none",
                  }}
                >
                  {shape ? <ShapeChip shape={shape} /> : null}
                </button>
              );
            })}
          </div>
          <b
            style={{
              fontSize: 15,
              fontFamily: "Fredoka, inherit",
              textAlign: "center",
              color: "var(--text-dim)",
            }}
          >
            {dead ? ctx.t("gameOver") : T.hint}
          </b>
        </div>
      }
    >
      <div
        ref={boardRef}
        className="ellaz-play-surface"
        // LTR, always. The app is Hebrew RTL by default, so an RTL grid lays
        // column 0 out on the visual RIGHT and every spatial assumption the
        // player makes inverts - see rtl-spatial-grid-dir-ltr.md.
        dir="ltr"
        onPointerLeave={() => setHover(null)}
        style={{
          position: "relative",
          // Sized against the VIEWPORT, not this container, like every board
          // here. 92vw is 359px on a 390px phone, which leaves ~40px cells on
          // the 8x8 boards and ~55px on the 6x6 one. 54vh rather than 60 because
          // this game carries a 96px tray under the board. The 480px cap sits
          // well under what the 700px desktop panel leaves, so nothing grows a
          // scrollbar inside it (game-panel-clears-widest-board.test.ts).
          width: "min(92vw, 54vh, 480px)",
          aspectRatio: "1",
          boxSizing: "border-box",
          display: "grid",
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          // Explicit ROWS as well: without them a taller cell stretches its row
          // and the square board deforms.
          gridTemplateRows: `repeat(${size}, 1fr)`,
          gap: 3,
          padding: 6,
          background: WELL,
          borderRadius: 16,
          touchAction: "none",
        }}
      >
        {state.grid.map((cell, i) => {
          const ghosting = ghost.has(i);
          const isAnchor = cell === null && anchors.has(i);
          const clearing = flash.includes(i);
          return (
            <button
              key={i}
              type="button"
              // 64 cells that all read "empty square" are 64 cells a screen
              // reader cannot tell apart, so each carries its own column and
              // row. One-based, because nobody counts from zero out loud.
              aria-label={`${cell === null ? T.empty : T.full} ${(i % size) + 1}, ${Math.floor(i / size) + 1}`}
              className={popped.includes(i) ? "ellaz-pop" : undefined}
              onPointerEnter={() => setHover(i)}
              onClick={(e) => onCell(i, e.currentTarget)}
              style={{
                minWidth: 0,
                minHeight: 0,
                lineHeight: 1,
                border: "none",
                padding: 0,
                borderRadius: "18%",
                display: "grid",
                placeItems: "center",
                background:
                  cell !== null
                    ? colorOf(cell)
                    : clearing
                      ? "#FFF7EC"
                      : ghosting && heldShape
                        ? colorOf(heldShape.color)
                        : WELL_CELL,
                opacity: ghosting && cell === null ? 0.45 : 1,
                // The bump. A dashed ring rather than a colour change, so it
                // reads as "not here" rather than as a mistake being scored.
                outline: bumped === i ? "3px dashed #FF8A3D" : "none",
                outlineOffset: -2,
                boxShadow:
                  cell !== null
                    ? "inset 0 2px 0 rgba(255,255,255,0.28), inset 0 -2px 0 rgba(0,0,0,0.2)"
                    : "none",
                transition: "background 0.12s ease, opacity 0.12s ease",
                cursor: "pointer",
                touchAction: "none",
              }}
            >
              {isAnchor && !ghosting ? (
                <span
                  aria-hidden="true"
                  style={{
                    width: "22%",
                    height: "22%",
                    borderRadius: "50%",
                    background: "rgba(255, 255, 255, 0.3)",
                  }}
                />
              ) : null}
            </button>
          );
        })}

        {dead && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              background: "rgba(20, 22, 44, 0.72)",
              borderRadius: 16,
            }}
          >
            <div style={{ textAlign: "center", color: "#FFF7EC" }}>
              <div style={{ fontSize: 40 }}>😅</div>
              <h2 style={{ margin: "8px 0", color: "inherit" }}>{ctx.t("gameOver")}</h2>
              <Button onClick={restart}>{ctx.t("restart")}</Button>
            </div>
          </div>
        )}
      </div>
    </GameChrome>
  );
}
