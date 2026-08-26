import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { textFor, type Locale } from "@i18n/index";
import type { GameContext, RewardTier, SessionSpec } from "@sdk/index";
import { GameChrome, type ChromeLevel } from "@ui/GameChrome";
import { burst, haptic, shake } from "@juice/index";
import { useGameSession, useRememberedLevel, winMoment } from "@shared/index";
import {
  EXIT_ROW,
  LEVELS,
  LEVEL_IDS,
  SIZE,
  blockers,
  isSolved,
  newGame,
  occupancy,
  reachableCells,
  scoreFor,
  tap,
  undo,
  type LevelId,
  type ParkingState,
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
 * A level is how much traffic there is; a tier is what the economy pays for it.
 * Written out rather than passed straight through, because the day this game
 * gains a fourth tier the compiler asks what that is worth instead of quietly
 * handing `grant()` a tier it has never heard of.
 */
const LEVEL_TIER: Record<LevelId, RewardTier> = {
  easy: "easy",
  medium: "medium",
  hard: "hard",
};

/* -------------------------------------------------------------- the board */

/**
 * One cell, against the VIEWPORT and never the container — the house rule for
 * every board here, and the whole `min(...)` is one uninterrupted expression
 * because `game-panel-clears-widest-board.test.ts` reads it as text.
 *
 * The arithmetic that says it fits: the board is six cells plus 0.95 of a cell
 * on the right for the wall, the gap and the lane the winning car drives into,
 * so 6.95 x 12.6vw = 87.6vw — 342px inside the 351px of 90vw a 390px phone
 * gives. On a desktop the 76px cap binds instead: 528px inside the 684px the
 * panel leaves.
 */
const CELL = "min(12.6vw, 8.4vh, 76px)";

/** Air between a car and its neighbours, so a jam reads as cars and not as a wall. */
const INSET = 3;

/** The right-hand wall, in px. Thick enough that the gap in it is unmistakable. */
const WALL = 6;

/**
 * How long the winning car takes to drive out, and therefore how long the
 * celebration waits. Long enough to read as leaving, short enough that a child
 * does not think the game has stopped responding.
 */
const DRIVE_MS = 420;

/**
 * The traffic, and the player.
 *
 * Every other car is a COOL hue and the player's is the one warm one, so the
 * car that matters is the odd one out rather than merely a different colour in
 * a row of colours. Colour is never the only signal though: the player's car
 * also carries an arrow pointing at the exit and a heavier outline, because a
 * red-green colour-blind child looking at a board of blues and one orange is
 * exactly the case where hue alone stops being an answer.
 */
const PLAYER_CAR = "#f39c12";
const TRAFFIC: readonly string[] = [
  "#4a7fd4",
  "#3aa8a0",
  "#6d6fc4",
  "#4f93b8",
  "#5e8f6b",
  "#8a6fb0",
  "#3f8ec9",
  "#5a7f9c",
];

/* -------------------------------------------------------------- the session */

/**
 * A jam in progress: the level it belongs to, and the whole board.
 *
 * `history` travels inside `ParkingState`, and it has to: undo is unlimited
 * here, so a run restored without its history is a run a child can no longer
 * take a move back in — which is the one affordance this game leans on hardest
 * when a car has been pushed into a corner.
 *
 * There is NO reward latch in this snapshot, and that is a fact about the game
 * rather than an omission. The only grant is the single `level_complete` at the
 * end, and a solved board is never handed back: `live: !won` clears it, and the
 * guard at the mount refuses one anyway. The day this game pays anything
 * mid-run — a milestone, a personal best — that latch belongs here, or leaving
 * and returning becomes a way to be paid twice (see the session rule).
 *
 * Nothing about the DRIVE-OUT is stored either, and that is the other half of
 * the same rule: `driving` is a state only a `setTimeout` leaves, so a snapshot
 * caught inside it would restore a car halfway through the wall with no timer
 * behind it. It cannot reach the disk, because `won` and `driving` are set in
 * the same breath and `won` clears the snapshot.
 */
interface ParkingSession {
  level: LevelId;
  state: ParkingState;
}

const SESSION: SessionSpec<ParkingSession> = {
  version: 1,
  validate: (value): value is ParkingSession => {
    const s = value as Partial<ParkingSession> | null;
    if (typeof s !== "object" || s === null) return false;
    if (typeof s.level !== "string" || !(s.level in LEVELS)) return false;
    const g = s.state;
    if (typeof g !== "object" || g === null) return false;
    // The renderer sizes and positions everything off these, so a board of some
    // other shape lays out as a grid whose cells and cars disagree.
    if (g.size !== SIZE || g.exitRow !== EXIT_ROW) return false;
    if (!Array.isArray(g.cars) || g.cars.length !== LEVELS[s.level as LevelId].cars) return false;

    // Every car on the board, in one piece, and no two on the same cell. An
    // overlap is the nastiest shape a corrupt save comes in: it renders a
    // perfectly ordinary picture that the rules can no longer explain, because
    // `occupancy` reports one car per cell and the other one has vanished.
    const taken = new Set<number>();
    for (let i = 0; i < g.cars.length; i++) {
      const c = g.cars[i];
      if (typeof c !== "object" || c === null) return false;
      if (c.id !== i) return false; // ids ARE indices — see logic.ts
      if (c.axis !== "h" && c.axis !== "v") return false;
      if (c.len !== 2 && c.len !== 3) return false;
      if (!inRange(c.row, SIZE) || !inRange(c.col, SIZE)) return false;
      const lastRow = c.axis === "v" ? c.row + c.len - 1 : c.row;
      const lastCol = c.axis === "h" ? c.col + c.len - 1 : c.col;
      if (lastRow >= SIZE || lastCol >= SIZE) return false;
      for (let k = 0; k < c.len; k++) {
        const cell = c.axis === "h" ? c.row * SIZE + c.col + k : (c.row + k) * SIZE + c.col;
        if (taken.has(cell)) return false;
        taken.add(cell);
      }
    }
    // The player's car is what the whole game is about, and `isSolved` reads
    // all three of these. A snapshot whose first car has drifted onto another
    // row is a board that can never be won.
    const player = g.cars[0];
    if (player.axis !== "h" || player.len !== 2 || player.row !== EXIT_ROW) return false;

    if (g.selected !== null && !inRange(g.selected, g.cars.length)) return false;
    if (typeof g.moves !== "number" || !Number.isFinite(g.moves) || g.moves < 0) return false;
    // The strictest check here, because `undo` is the one function that trusts
    // this: it puts a car back at `from` without asking whether that position
    // is on the board, so a history naming a car this board does not have, or a
    // column it cannot reach, restores a board with a car hanging off the edge.
    return (
      Array.isArray(g.history) &&
      g.history.every(
        (m) =>
          m !== null &&
          typeof m === "object" &&
          inRange(m.car, g.cars.length) &&
          inRange(m.from, SIZE) &&
          inRange(m.to, SIZE),
      )
    );
  },
};

function inRange(n: unknown, limit: number): boolean {
  return Number.isInteger(n) && (n as number) >= 0 && (n as number) < limit;
}

/* ----------------------------------------------------------------- the game */

export function ParkingGame({ ctx }: { ctx: GameContext }) {
  const [level, setLevel] = useRememberedLevel(
    ctx,
    LEVEL_OPTIONS.map((o) => o.id),
    "easy",
  );
  const restored = useMemo(() => ctx.session.load(SESSION), [ctx]);
  // Adopted only for the level this mount opened on, and never once it is
  // solved — a finished board has nothing left to move, and returning to one
  // reads as the game having failed to deal a jam.
  const resume =
    restored && restored.level === level && !isSolved(restored.state) ? restored : undefined;

  // Nothing is HELD on the way back in. A restored `selected` would put a car
  // in the hand of a child who has not touched the screen yet, and the lifted
  // car would be the first thing they see with no memory of picking it up.
  const [state, setState] = useState<ParkingState>(() =>
    resume ? { ...resume.state, selected: null } : newGame(level),
  );
  const [won, setWon] = useState(false);
  const [driving, setDriving] = useState(false);
  // Fewest moves, per LEVEL. Six cars and twelve are not the same puzzle, so one
  // shared record would let an easy run permanently outrank every hard one.
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best(level));
  const boardRef = useRef<HTMLDivElement>(null);
  const carRefs = useRef<(HTMLDivElement | null)[]>([]);
  const started = useRef(false);

  useGameSession(ctx, SESSION, () => ({ level, state }), { live: !won });

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      ctx.lifecycle.gameplayStart();
      ctx.analytics.levelStart(level);
    }
  }, [ctx, level]);

  /**
   * The win, held until the car has actually left.
   *
   * `winMoment` is banked BEFORE anything cosmetic runs, so the ordinary shape
   * is to call it straight from the handler. Here the celebration has to wait
   * for the drive-out, and a coin a child earned must not depend on an
   * animation finishing — so the payout is a closure with a one-shot latch,
   * fired by the timer OR by the unmount cleanup, whichever comes first.
   *
   * It is still never called from inside a `setState` updater, which is what
   * the rule is actually about: React may run an updater twice, and the latch
   * plus the handler-only assignment is what makes a double grant impossible.
   */
  const payoutRef = useRef<null | (() => void)>(null);
  const runPayout = useCallback(() => {
    const pay = payoutRef.current;
    if (!pay) return;
    payoutRef.current = null;
    pay();
  }, []);
  useEffect(() => () => runPayout(), [runPayout]);

  /** The gap in the wall — where the coins should fly from. */
  const exitPoint = useCallback(() => {
    const r = boardRef.current?.getBoundingClientRect();
    if (!r) return undefined;
    return { x: r.right, y: r.top + (r.height / SIZE) * (EXIT_ROW + 0.5) };
  }, []);

  /**
   * A fresh board, on a restart or a change of difficulty.
   *
   * `newGame` is a SEARCH now, not a shuffle: it builds layouts and grades each
   * one by how many slides its shortest solution actually takes, because the
   * generator that merely scrambled dealt boards a child finished in two taps.
   * Measured on the shipped settings, on desktop Node: 11 ms at the median on
   * easy, 55 on medium, 31 on hard, with a rare tail into the hundreds. The
   * per-tier numbers and their caveats live beside `LEVELS` in `logic.ts` and
   * are not repeated here, because two copies of a measurement is one copy that
   * goes stale.
   *
   * It stays in the tap handler at those sizes: the board appears with the tap,
   * and nothing has to render a half-built car park.
   */
  const reset = useCallback(
    (lv: LevelId = level) => {
      payoutRef.current = null;
      setLevel(lv);
      setState(newGame(lv));
      setWon(false);
      setDriving(false);
      setBest(ctx.score?.best(lv));
      ctx.analytics.levelStart(lv);
    },
    [ctx, level, setLevel],
  );

  /**
   * The whole input model, from the handler flow and never from inside a
   * `setState` updater — React may run an updater twice, and this one ends in a
   * grant (see the rewards rule).
   */
  const onCell = useCallback(
    (index: number) => {
      if (won) return;
      ctx.audio.unlock();
      const { state: next, outcome } = tap(state, index);

      if (outcome.kind === "ignored") return;

      // A refusal is not an error, and `logic.ts` deliberately keeps the car in
      // the player's hand rather than dropping it — so this must not deselect
      // either, or every misjudged tap costs two taps to recover from. The car
      // nudges and the game says nothing. `next` IS `state` here, so there is
      // nothing to repaint.
      if (outcome.kind === "refused") {
        const el = carRefs.current[outcome.car];
        if (el) shake(el, 4, 180);
        haptic.tap();
        return;
      }

      setState(next);

      if (outcome.kind === "picked" || outcome.kind === "cancelled") {
        ctx.audio.play("tap");
        haptic.tap();
        return;
      }

      ctx.audio.play("pop");
      haptic.tap();
      if (!isSolved(next)) return;

      // Won. The car leaves through the gap first; the party follows it out.
      setWon(true);
      setDriving(true);
      const at = exitPoint();
      payoutRef.current = () => {
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
      };
      window.setTimeout(runPayout, DRIVE_MS);
    },
    [ctx, exitPoint, level, runPayout, state, won],
  );

  /**
   * Unlimited, because a five-year-old mis-taps constantly and a jam they
   * cannot walk back out of is a jam they abandon. `undo` returns the same
   * state when there is nothing left to take back, which is how this knows.
   */
  const takeBack = useCallback(() => {
    if (won) return;
    const next = undo(state);
    if (next === state) return;
    ctx.audio.unlock();
    ctx.audio.play("tap");
    haptic.tap();
    setState(next);
  }, [ctx, state, won]);

  /* -------------------------------------------------------------- the view */

  const grid = occupancy(state);
  const inTheWay = blockers(state);
  const targets = useMemo(
    () => (state.selected === null ? new Set<number>() : new Set(reachableCells(state, state.selected))),
    [state],
  );

  // This game's own words. A locale RECORD, so promoting a language reds this
  // block by name instead of leaving the game speaking English inside a page
  // that is not.
  const T = textFor(
    {
      he: {
        blocking: "חוסמות",
        pick: "הקישו על מכונית כדי להרים אותה",
        move: "הקישו על משבצת פנויה כדי להזיז",
        undo: "צעד אחורה",
        yours: "המכונית שלכם",
        car: "מכונית",
        space: "משבצת פנויה",
        exit: "היציאה",
      },
      en: {
        blocking: "In the way",
        pick: "Tap a car to pick it up",
        move: "Tap a free space to slide it there",
        undo: "Step back",
        yours: "Your car",
        car: "Car",
        space: "Free space",
        exit: "The way out",
      },
      es: {
        blocking: "Estorban",
        pick: "Toca un coche para cogerlo",
        move: "Toca un hueco para moverlo",
        undo: "Un paso atrás",
        yours: "Tu coche",
        car: "Coche",
        space: "Hueco libre",
        exit: "La salida",
      },
    },
    ctx.locale,
  );

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        {
          icon: "moves",
          label: ctx.t("moves"),
          value: state.moves,
          compact: true,
          record: best ?? "-",
        },
        {
          icon: "layers",
          label: T.blocking,
          value: `${inTheWay}/${state.cars.length - 1}`,
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
            style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", minHeight: 18 }}
          >
            {won ? `${ctx.t("youWon")} 🎉` : state.selected === null ? T.pick : T.move}
          </div>
          {/* flexWrap even at one button: this row is the place a second
              control would land, and nine games shipped 439px of unwrapped row
              onto a 390px phone by leaving it off the first time. */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              aria-label={T.undo}
              disabled={state.history.length === 0 || won}
              onClick={takeBack}
              style={{
                flex: "1 1 0",
                minWidth: 0,
                // A kids target: >= 2cm on the short side, and the row gives it
                // the whole width on the long one.
                minHeight: 64,
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
                // Dimmed rather than hidden: a button that disappears the moment
                // a board is fresh is one a child has to rediscover every game.
                opacity: state.history.length === 0 || won ? 0.42 : 1,
                cursor: state.history.length === 0 || won ? "default" : "pointer",
                touchAction: "manipulation",
              }}
            >
              <span style={{ fontSize: 26, lineHeight: 1 }}>⟲</span>
              {T.undo}
            </button>
          </div>
        </div>
      }
    >
      {/* `dir="ltr"` on the whole board subtree, and it is load-bearing rather
          than tidy. This grid is SPATIAL and its moves are DIRECTIONAL: the
          exit is on the physical right, and under the Hebrew app's RTL the grid
          would mirror, so cell index 5 would draw where cell 0 belongs and every
          car would slide the wrong way. Physical `left`/`right` are used
          throughout inside it for the same reason — a logical inset here
          resolves against this element's own direction, which is now always
          LTR, so the two would silently disagree in Hebrew.
          See .claude/rules/rtl-spatial-grid-dir-ltr.md. */}
      <div dir="ltr" style={{ display: "flex", justifyContent: "center" }}>
        <div
          style={{
            position: "relative",
            // Room on the right for the wall, the gap and the lane the winning
            // car drives into. Only on the right: the lane is decoration, and
            // padding both sides to keep it symmetric costs a whole cell of
            // board on a 390px phone.
            paddingRight: `calc(${CELL} * 0.95)`,
            // The winning car drives out THROUGH this edge, so it is clipped
            // here rather than allowed to push the play surface wider and grow
            // a horizontal scrollbar for 420ms.
            overflow: "hidden",
          }}
        >
          <div
            ref={boardRef}
            className="ellaz-play-surface"
            style={
              {
                ["--cell" as string]: CELL,
                position: "relative",
                display: "grid",
                gridTemplateColumns: `repeat(${SIZE}, var(--cell))`,
                gridTemplateRows: `repeat(${SIZE}, var(--cell))`,
                background: "var(--surface-2)",
                borderRadius: "var(--radius-2)",
                touchAction: "none",
              } as CSSProperties
            }
          >
            {/* The tap targets: one button per cell, in row-major order, so a
                cell's index IS the index `tap()` takes. The cars are drawn OVER
                these and are `pointer-events: none`, which keeps every tap
                target the same size and shape whatever is parked on it — a
                three-long car would otherwise be one enormous button and the
                gap beside it a sliver. */}
            {grid.map((occupant, index) => {
              const row = Math.floor(index / SIZE);
              const col = index % SIZE;
              const label =
                occupant === 0 ? T.yours : occupant !== null ? `${T.car} ${occupant}` : T.space;
              return (
                <button
                  key={index}
                  type="button"
                  aria-label={`${label} ${row + 1}-${col + 1}`}
                  // Pointer Events, and the capture with them: a tap that begins
                  // on a cell belongs to that cell even if the finger slides off
                  // before it lifts. `click` is deliberately NOT listened to -
                  // it would fire a second time after this one.
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    onCell(index);
                  }}
                  // ...which leaves the keyboard, since a <button> reaches its
                  // own onClick from Enter and Space and we are not listening.
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    onCell(index);
                  }}
                  style={{
                    // The reachable dot below is absolutely positioned, and
                    // without this it would resolve against the board instead
                    // of the cell and pile every dot into the top-left corner.
                    position: "relative",
                    padding: 0,
                    border: "none",
                    background: "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    touchAction: "none",
                    // Under the cars, so a car is never half-hidden by a bay.
                    zIndex: 0,
                  }}
                >
                  {/* The bay, so the empty tarmac reads as parking spaces. */}
                  <span
                    style={{
                      width: "72%",
                      height: "72%",
                      borderRadius: 4,
                      border: "2px dashed rgba(255,255,255,0.10)",
                    }}
                  />
                  {/* Where the held car can actually go. This dot is the whole
                      reason a four-year-old can play: without it the only way
                      to find a legal square is to tap around the grid. */}
                  {targets.has(index) && (
                    <span
                      style={{
                        position: "absolute",
                        width: "34%",
                        height: "34%",
                        borderRadius: "50%",
                        background: "var(--brand)",
                        opacity: 0.72,
                      }}
                    />
                  )}
                </button>
              );
            })}

            {/* The cars, absolutely positioned over the cell grid rather than
                laid out with grid-column/grid-row spans. Two reasons, and the
                second is what settles it: a car has to move between cells with
                a transition, and only a transform can do that smoothly (a grid
                placement jumps); and the winning car has to travel PAST the
                right-hand edge, which a grid track cannot express at all. */}
            {state.cars.map((car, i) => {
              const held = state.selected === i;
              const mine = i === 0;
              const wide = car.axis === "h" ? car.len : 1;
              const tall = car.axis === "v" ? car.len : 1;
              // Driving out: the same transform, carried past the wall. The
              // opacity is what makes it read as leaving rather than as the car
              // being swallowed by the frame it is clipped against.
              const shift = mine && driving ? 1.6 : 0;
              return (
                // TWO elements per car, and the split is a fix rather than
                // nesting for its own sake. The outer one carries the POSITION
                // and its transition; the inner one carries the PAINT and is
                // what `shake` is handed on a refusal. `shake` composes its
                // wobble onto whatever `style.transform` it finds and restores
                // it afterwards, so shaking the positioned element would run
                // every jitter frame through the 140ms transform easing and
                // damp the nudge into something nobody can see.
                <div
                  key={car.id}
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: `calc(var(--cell) * ${wide} - ${INSET * 2}px)`,
                    height: `calc(var(--cell) * ${tall} - ${INSET * 2}px)`,
                    transform: `translate(calc(var(--cell) * ${car.col + shift} + ${INSET}px), calc(var(--cell) * ${car.row} + ${INSET}px))`,
                    opacity: mine && driving ? 0 : 1,
                    // The cars are drawn over the tap targets, so they must not
                    // eat the taps aimed at them.
                    pointerEvents: "none",
                    zIndex: 1,
                    // Only the car leaving moves at drive-out speed. Every
                    // other slide keeps the quick step a tap should have, or
                    // the whole game would feel like it is underwater.
                    transition:
                      mine && driving
                        ? `transform ${DRIVE_MS}ms cubic-bezier(0.34, 0, 0.6, 1), opacity ${DRIVE_MS}ms ease-in`
                        : "transform 140ms ease",
                  }}
                >
                  <div
                    ref={(el) => {
                      carRefs.current[i] = el;
                    }}
                    style={{
                      width: "100%",
                      height: "100%",
                      boxSizing: "border-box",
                      borderRadius: "calc(var(--cell) * 0.22)",
                      background: mine ? PLAYER_CAR : TRAFFIC[(i - 1) % TRAFFIC.length],
                      boxShadow: held
                        ? "0 0 0 4px rgba(108,92,231,0.55), var(--shadow-1)"
                        : "inset 0 calc(var(--cell) * 0.09) 0 rgba(255,255,255,0.28), " +
                          "inset 0 calc(var(--cell) * -0.11) 0 rgba(0,0,0,0.22), var(--shadow-1)",
                      // The player's car is heavier as well as warmer. Colour is
                      // never the only thing saying which car is yours.
                      border: mine ? "3px solid rgba(0,0,0,0.42)" : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      paddingRight: "8%",
                      color: "rgba(0,0,0,0.55)",
                      fontSize: "calc(var(--cell) * 0.4)",
                      lineHeight: 1,
                      fontWeight: 900,
                    }}
                  >
                    {mine && <span>▶</span>}
                  </div>
                </div>
              );
            })}

            {/* The wall, in two pieces, with the gap between them. Physical
                `left: 100%` rather than a logical inset: this subtree is pinned
                LTR, so the two must not be allowed to disagree. */}
            <div
              style={{
                position: "absolute",
                left: "100%",
                top: 0,
                width: WALL,
                height: `calc(var(--cell) * ${EXIT_ROW})`,
                background: "var(--text-dim)",
                borderRadius: WALL,
                opacity: 0.55,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "100%",
                top: `calc(var(--cell) * ${EXIT_ROW + 1})`,
                width: WALL,
                height: `calc(var(--cell) * ${SIZE - EXIT_ROW - 1})`,
                background: "var(--text-dim)",
                borderRadius: WALL,
                opacity: 0.55,
              }}
            />
            {/* And a sign on the gap, so it reads as a way out rather than as a
                piece of wall somebody forgot to draw. */}
            <div
              aria-label={T.exit}
              role="img"
              style={{
                position: "absolute",
                left: `calc(100% + ${WALL + 2}px)`,
                top: `calc(var(--cell) * ${EXIT_ROW})`,
                height: "var(--cell)",
                display: "flex",
                alignItems: "center",
                color: PLAYER_CAR,
                fontSize: "calc(var(--cell) * 0.42)",
                lineHeight: 1,
                fontWeight: 900,
              }}
            >
              ›
            </div>
          </div>
        </div>
      </div>
    </GameChrome>
  );
}
