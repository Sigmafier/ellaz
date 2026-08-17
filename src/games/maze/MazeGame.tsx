import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameContext, SessionSpec } from "@sdk/index";
import type { Locale } from "@i18n/index";
import { GameChrome } from "@ui/GameChrome";
import { DirectionPad } from "@ui/DirectionPad";
import { type DifficultyOption } from "@ui/DifficultySelector";
import { burst, haptic } from "@juice/index";
import { useGameSession, useRememberedLevel, winMoment } from "@shared/index";
import {
  DIFFICULTIES,
  LEVELS,
  isSolved,
  newMaze,
  scoreReport,
  stepMove,
  type Difficulty,
  type Dir,
  type MazeState,
} from "./logic";

// The renderer. Every rule about what a tap DOES lives in logic.ts; this file
// decides what a tap LOOKS and SOUNDS like, and what the outcomes it reports
// are worth to the economy.
//
// ARROWS, ONE STEP AT A TIME. The mouse walks a single square per press of the
// on-screen D-pad (or an arrow key), which is what a child expects of a maze:
// you steer it through, you do not teleport it. A press into a hedge simply
// does nothing — no penalty, this platform has no losing. Walking the fewest
// steps is still the skill, so the streak rewards an efficient route.
//
// NO CLOCK IN THE GAME STATE. The only timers in this file are cosmetic - the
// route that lights up behind the mouse, and the beat before the next maze is
// dealt. Neither ever reaches `MazeState`, which is what makes the whole state
// safe to write to disk (session-snapshot-convention.md).

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
    perfect: string;
    streak: string;
    mouse: string;
    cheese: string;
    home: string;
    empty: string;
  }
> = {
  he: {
    hint: "השתמשו בחצים כדי להזיז את העכבר",
    perfect: "מושלם!",
    streak: "מושלמים",
    mouse: "העכבר",
    cheese: "פירור",
    home: "המאורה",
    empty: "משבצת ריקה",
  },
  en: {
    hint: "Use the arrows to move the mouse",
    perfect: "Perfect!",
    streak: "Perfect",
    mouse: "the mouse",
    cheese: "a crumb",
    home: "the burrow",
    empty: "empty square",
  },
  es: {
    hint: "Usa las flechas para mover el ratón",
    perfect: "¡Perfecto!",
    streak: "Perfectos",
    mouse: "el ratón",
    cheese: "una miga",
    home: "la madriguera",
    empty: "casilla vacía",
  },
};

/* -------------------------------------------------------------- the style */

/** The hedge. Deliberately not a theme token - see the note on the board. */
const HEDGE = "#14532d";
const FLOOR = "#F3EAD8";
const FLOOR_TRAIL = "#FFE9A8";
const HOME_TILE = "#D8F0DC";

/** How thick a hedge is drawn. One number, so the frame and the walls agree. */
const WALL = 4;

/** The beat between finishing a maze and being handed the next one. */
const NEXT_MAZE_MS = 1300;

/**
 * How often a HELD joystick takes another step. Deliberately unhurried.
 *
 * A press of an arrow is one square and always has been; the stick repeats so a
 * child can lean on it down a long corridor instead of tapping down it. The
 * cost of repeating at all is that an overshot junction is a step the route did
 * not need, and `steps === par` is exactly what "perfect" means here - so the
 * interval is set for a walk a five-year-old can stop, not for speed. A hedge
 * stops the walk on its own: `stepMove` returns `blocked`, which takes no step
 * and costs nothing, so holding the stick into a wall is free.
 */
const MOVE_REPEAT_MS = 260;

/* ------------------------------------------------------------- the snapshot */

/**
 * A maze in progress: the board, where the mouse is, and the run's streak.
 *
 * THE WHOLE STATE IS THE SNAPSHOT, and there is no reward latch beside it -
 * which is unusual here and worth saying out loud, because forgetting a latch
 * is how leaving a game becomes a way to be paid twice
 * (session-snapshot-convention.md). It is safe for exactly one reason: a solved
 * maze never reaches the disk. Every maze is paid once, in the handler, at the
 * moment it is finished; `live: !solved` then CLEARS the snapshot, and the next
 * maze is dealt with nothing owing on it.
 *
 * `validate` refuses a solved board rather than repairing one. Nothing this
 * build writes can produce one, so a snapshot carrying one came from a build
 * with a different idea of what "finished" means - and restoring it would show
 * a child a maze with nothing left to do.
 */
const SESSION: SessionSpec<MazeState> = {
  version: 1,
  validate: (value): value is MazeState => {
    const s = value as Partial<MazeState> | null;
    if (typeof s !== "object" || s === null) return false;
    if (typeof s.level !== "string" || !(s.level in LEVELS)) return false;

    // The board must match the dimensions the LEVEL declares, not merely the
    // ones the snapshot claims: the CSS grid is built from the level, so a
    // board of some other size renders as a grid whose cells and columns
    // disagree - a plausible picture with no error anywhere.
    const cfg = LEVELS[s.level as Difficulty];
    const n = cfg.size * cfg.size;
    if (s.size !== cfg.size) return false;

    const walls = s.walls as Partial<MazeState["walls"]> | null | undefined;
    if (typeof walls !== "object" || walls === null) return false;
    for (const side of [walls.right, walls.down]) {
      if (!Array.isArray(side) || side.length !== n) return false;
      if (!side.every((w) => typeof w === "boolean")) return false;
    }

    const inBoard = (v: unknown) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v < n;
    if (!inBoard(s.at) || !inBoard(s.home)) return false;
    if (!Array.isArray(s.cheese) || !s.cheese.every(inBoard)) return false;
    if (s.cheese.length > cfg.cheese) return false;
    if (
      ![s.steps, s.par, s.streak].every(
        (v) => typeof v === "number" && Number.isFinite(v) && v >= 0,
      )
    ) {
      return false;
    }
    // A finished maze has already been paid for. See the note above.
    return !(s.cheese.length === 0 && s.at === s.home);
  },
};

/* ----------------------------------------------------------------- the game */

export function MazeGame({ ctx }: { ctx: GameContext }) {
  // The level a child last chose, VALIDATED against this game's own list - an id
  // no longer in the list resolves to -1 in GameChrome's findIndex and the
  // toggle silently disappears. Everything below reads `level`; a hardcoded
  // "easy" here would deal an easy maze under chrome saying "Hard".
  const [level, setLevel] = useRememberedLevel(ctx, DIFFICULTIES, "easy");

  // Read ONCE, before the first render, so a resumed maze never flashes as a
  // fresh one.
  const restored = useMemo(() => ctx.session.load(SESSION), [ctx]);
  const resume = restored && restored.level === level ? restored : undefined;

  const [state, setState] = useState<MazeState>(() => resume ?? newMaze(level, 0));
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best(level));
  /** The route the last tap walked, lit for a moment so it can be seen. */
  const [trail, setTrail] = useState<readonly number[]>([]);
  /** Shown for a beat after a maze is finished in exactly par steps. */
  const [praise, setPraise] = useState(false);

  const startedRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);

  const solved = isSolved(state);
  const T = WORDS[ctx.locale];

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

  // Deal a fresh maze at `next`. The streak goes back to nothing, because a
  // streak is a fact about a RUN and this is a new one.
  const startLevel = useCallback(
    (next: Difficulty) => {
      setLevel(next);
      setState(newMaze(next, 0));
      setBest(ctx.score?.best(next));
      setTrail([]);
      setPraise(false);
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

  // A maze in progress is worth returning to; a finished one is not, so
  // `live: false` CLEARS rather than freezes. That clear is also what makes the
  // missing reward latch safe - see the note on SESSION.
  useGameSession(ctx, SESSION, () => state, { live: !solved });

  /* ------------------------------------------------------------ the steps */

  // Everything here runs in the HANDLER, never inside a setState updater:
  // React may run an updater twice, and a doubled `winMoment` is a doubled
  // grant - real coins, not a stray animation.
  const move = useCallback(
    (dir: Dir) => {
      if (solved) return;
      ctx.audio.unlock();
      ctx.speech.unlock();

      const { state: next, outcome } = stepMove(state, dir);
      if (outcome.kind !== "moved") {
        // Bumped a hedge or the edge: a small nudge, no penalty, no move.
        if (outcome.kind === "blocked") haptic.tap();
        return;
      }

      setState(next);
      setTrail(outcome.path);
      after(420, () => setTrail([]));

      // Coins fly from the middle of the board - there is no tapped cell to fly
      // from now that the arrows drive it.
      const r = gridRef.current?.getBoundingClientRect();
      const at = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 0, y: 0 };

      if (outcome.collected.length > 0) {
        ctx.audio.play("pop");
        haptic.tap();
        burst(at.x, at.y, { count: 6 * outcome.collected.length });
      } else {
        ctx.audio.play("tap");
        haptic.tap();
      }

      if (!outcome.solved) return;

      // ONE win per maze. A maze is a finished thing, so this is
      // `level_complete` with a tier - not the milestone/personal-best pair an
      // endless game uses - and the record rides it rather than being reported
      // separately, so a solve can never grant twice.
      const result = winMoment(ctx, {
        reason: "level_complete",
        tier: level,
        level: `maze-${next.size}`,
        at,
        score: scoreReport(next, level),
      });
      if (result.score?.best !== undefined) setBest(result.score.best);

      if (outcome.perfect) {
        setPraise(true);
        after(NEXT_MAZE_MS, () => setPraise(false));
      }
      // The next maze arrives on its own, carrying the streak forward. Nothing
      // is stored during this beat - the snapshot was cleared the moment the
      // maze was finished - so a child who leaves inside it comes back to a
      // fresh deal rather than to a solved board.
      after(NEXT_MAZE_MS, () => setState(newMaze(level, next.streak)));
    },
    [after, ctx, level, solved, state],
  );

  // Arrow keys / WASD for desktop, alongside the on-screen D-pad. Bound to the
  // window so a player never has to click the board to "focus" it first.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
        w: "up", s: "down", a: "left", d: "right",
      };
      const dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      move(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  /* ----------------------------------------------------------- the screen */

  const size = state.size;
  // Sized against the VIEWPORT, not this container, like every board here. On a
  // 390px phone the hard board's cells come out ~49px, which is the biggest a
  // seven-square maze can be and still fit beside its chrome; the 76px cap
  // stops the easy board becoming five enormous tiles on a desktop, and sits
  // well under what the 700px panel leaves (game-panel-clears-widest-board.test.ts).
  const cell = `min(${(88 / size).toFixed(2)}vw, ${(52 / size).toFixed(2)}vh, 76px)`;

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "moves", label: ctx.t("moves"), value: state.steps },
        { icon: "check", label: T.streak, value: state.streak },
        { icon: "trophy", label: ctx.t("best"), value: best ?? "-" },
      ]}
      levels={LEVEL_OPTIONS}
      level={level}
      onLevel={startLevel}
      onRestart={restart}
      footer={
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "var(--radius-2)",
              boxShadow: "var(--shadow-1)",
              padding: "8px 12px 10px",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            {/* What is still out there, as the things themselves. A pre-reader
                reads four crumbs going down to none; a number would need
                explaining. It WRAPS because the count comes from the level
                (a-row-that-grows-with-the-catalog-must-wrap.md). */}
            <div
              aria-hidden="true"
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 6,
                minHeight: 30,
                fontSize: 24,
                lineHeight: 1.2,
              }}
            >
              {Array.from({ length: LEVELS[level].cheese }, (_, i) => (
                <span key={i} style={{ opacity: i < state.cheese.length ? 1 : 0.2 }}>
                  🧀
                </span>
              ))}
            </div>
            <b
              style={{
                fontSize: 15,
                fontFamily: "Fredoka, inherit",
                textAlign: "center",
                color: praise ? "var(--green)" : "var(--text-dim)",
              }}
            >
              {praise ? T.perfect : T.hint}
            </b>
          </div>

          {/* The pad — one step per press, and one step per `MOVE_REPEAT_MS`
              while the stick is held, so a child can walk a long corridor by
              leaning on it instead of tapping down it. `move` refuses a solved
              board and a hedge on its own, so the repeat cannot run away. */}
          <DirectionPad onDir={move} size={58} repeatMs={MOVE_REPEAT_MS} />
        </div>
      }
    >
      <div
        ref={gridRef}
        className="ellaz-play-surface"
        // LTR, always. The app is Hebrew RTL by default, so an RTL grid lays
        // column 0 out on the visual RIGHT - and a maze whose walls mirror is a
        // different maze from the one the rules are solving
        // (rtl-spatial-grid-dir-ltr.md).
        dir="ltr"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${size}, ${cell})`,
          // Explicit ROWS as well: without them a taller cell stretches its row
          // and the square board deforms.
          gridTemplateRows: `repeat(${size}, ${cell})`,
          // The frame. Cells carry their own right and bottom hedge, so these
          // two close the other two sides and the whole board is enclosed.
          borderTop: `${WALL}px solid ${HEDGE}`,
          borderLeft: `${WALL}px solid ${HEDGE}`,
          borderRadius: 10,
          background: FLOOR,
          boxSizing: "content-box",
          touchAction: "none",
        }}
      >
        {Array.from({ length: size * size }, (_, i) => {
          const col = i % size;
          const row = Math.floor(i / size);
          const isMouse = i === state.at;
          const isHome = i === state.home;
          const isCheese = state.cheese.includes(i);
          const label = isMouse ? T.mouse : isCheese ? T.cheese : isHome ? T.home : T.empty;
          return (
            <div
              key={i}
              // Display only now — the arrows drive the mouse, so cells are not
              // tappable. Still labelled per-square so a screen reader can read
              // the board out; one-based, because nobody counts from zero aloud.
              role="img"
              aria-label={`${label} ${col + 1}, ${row + 1}`}
              style={{
                minWidth: 0,
                minHeight: 0,
                // A hedge on the far side of the board is drawn even where the
                // rules keep no wall, so the frame closes; everywhere else the
                // border is present but transparent, which keeps every cell
                // exactly the same size whether or not it has a wall.
                borderRight: `${WALL}px solid ${
                  col === size - 1 || state.walls.right[i] ? HEDGE : "transparent"
                }`,
                borderBottom: `${WALL}px solid ${
                  row === size - 1 || state.walls.down[i] ? HEDGE : "transparent"
                }`,
                boxSizing: "border-box",
                display: "grid",
                placeItems: "center",
                // Sized off the cell rather than fixed, so a glyph fills the
                // big easy tiles and still fits the small hard ones.
                fontSize: `calc(${cell} * 0.52)`,
                lineHeight: 1,
                background: trail.includes(i) ? FLOOR_TRAIL : isHome ? HOME_TILE : FLOOR,
                transition: "background 0.18s ease",
              }}
            >
              <span aria-hidden="true">
                {isMouse ? "🐭" : isCheese ? "🧀" : isHome ? "🏠" : ""}
              </span>
            </div>
          );
        })}
      </div>
    </GameChrome>
  );
}
