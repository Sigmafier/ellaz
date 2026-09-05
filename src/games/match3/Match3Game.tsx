import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { GameContext, SessionSpec } from "@sdk/index";
import type { Locale } from "@i18n/index";
import { GameChrome } from "@ui/GameChrome";
import { type DifficultyOption } from "@ui/DifficultySelector";
import { burst, haptic, shake } from "@juice/index";
import { useGameSession, useRememberedLevel, winMoment } from "@shared/index";
// Direct, because this is the one announcement in the game that is NOT a win -
// see the game-over branch below. The barrel does not re-export it.
import { announceWinShare } from "@shared/shareResult";
import {
  BURST,
  DIFFICULTIES,
  KINDS,
  LEVELS,
  PLAIN,
  RAINBOW,
  STRIPE_COL,
  STRIPE_ROW,
  findMatches,
  goalFor,
  hasMove,
  isOver,
  newGame,
  scoreReport,
  swipeCell,
  tapCell,
  type CascadeStep,
  type Difficulty,
  type Kind,
  type Match3State,
  type SwapOutcome,
  type SwipeDir,
} from "./logic";

// The renderer. Every rule about what a tap DOES lives in logic.ts; this file
// decides what a tap LOOKS and SOUNDS like, and what the outcomes it reports
// are worth to the economy.
//
// TAP FIRST, SWIPE ON TOP. The first tap picks a gem up and a second tap on a
// neighbour trades them; a swipe does the same trade in one motion. The tap
// path is the one that may never be lost — a five-year-old on a phone, and
// anyone on assistive input, cannot reliably hold a sustained pointer gesture
// (CLAUDE.md § kids games), and every cell is a real `<button>`, so a keyboard
// reaches every swap the gesture does. `logic.test.ts` pins that equivalence
// rather than leaving it to this comment.
//
// The gesture is DECIDED HERE AND RESOLVED THERE: this file turns a pointer
// into a direction, and `swipeCell` turns a direction into the same `swapAt`
// the taps call. A swipe cannot acquire rules of its own, because it has
// nowhere to put them.
//
// THE ANIMATION IS A REPLAY, NOT A STATE MACHINE. `tapCell` returns a board
// that is already settled plus the list of steps that got there, so everything
// below is decoration over a decided outcome. `busy` locks input while the
// cascade plays, and it lives in React state and NEVER in `Match3State` — a
// lock that reaches the disk is `memory`'s 850 ms bug, which restored a board
// that refused every card and looked completely normal
// (session-snapshot-convention.md).

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
    round: string;
    goal: string;
    gem: (n: number) => string;
    held: string;
    shuffled: string;
    moves: string;
    over: string;
    finalScore: string;
    /** What a power-up is CALLED, so a screen reader can say which one. */
    kind: Record<Exclude<Kind, 0>, string>;
  }
> = {
  he: {
    hint: "הקישו על אבן ואז על שכנה שלה, או החליקו אותה",
    round: "סיבוב",
    goal: "נשארו",
    gem: (n) => `אבן ${n}`,
    held: "נבחרה",
    shuffled: "ערבבנו את הלוח",
    moves: "מהלכים",
    over: "נגמרו המהלכים",
    finalScore: "ניקוד סופי",
    kind: { 1: "פס רוחב", 2: "פס אורך", 3: "פיצוץ", 4: "קשת" },
  },
  en: {
    hint: "Tap a gem, then one next to it, or swipe it across",
    round: "Round",
    goal: "To go",
    gem: (n) => `gem ${n}`,
    held: "picked",
    shuffled: "board shuffled",
    moves: "Moves",
    over: "Out of moves",
    finalScore: "Final score",
    kind: { 1: "row blast", 2: "column blast", 3: "bomb", 4: "rainbow" },
  },
  es: {
    hint: "Toca una gema y luego una vecina, o deslízala",
    round: "Ronda",
    goal: "Faltan",
    gem: (n) => `gema ${n}`,
    held: "elegida",
    shuffled: "tablero mezclado",
    moves: "Jugadas",
    over: "Sin jugadas",
    finalScore: "Puntuación final",
    kind: { 1: "fila", 2: "columna", 3: "bomba", 4: "arcoíris" },
  },
};

/* -------------------------------------------------------------- the look */

/**
 * One hue AND one shape per gem, index 1-6 matching `logic.ts`'s colour index.
 *
 * The shape is not decoration. Roughly one boy in twelve cannot separate the
 * red gem from the green one, and a match-3 whose only signal is hue is a game
 * they cannot play at all — so every colour also has an outline a child can
 * name. It costs nothing: six `<path>` strings, drawn at whatever size the
 * board resolves to.
 *
 * 1-based to match the logic, so an off-by-one shows up as a wrong gem rather
 * than as a silent `undefined`.
 */
const GEMS: readonly { fill: string; path: string }[] = [
  { fill: "", path: "" }, // 0 is a hole; never drawn
  { fill: "#FF4D8D", path: "M50 8 92 50 50 92 8 50Z" }, // diamond
  { fill: "#3DBBEE", path: "M50 10a40 40 0 1 0 .1 0Z" }, // circle
  { fill: "#6FD44E", path: "M14 14h72v72H14Z" }, // square
  { fill: "#FFC730", path: "M50 10 90 84H10Z" }, // triangle
  { fill: "#A855C9", path: "M50 8 68 26h26v26l18 18-18 18v26H68l-18 18-18-18H24V88L6 70l18-18V26h26Z" }, // star-ish
  { fill: "#FF8A3D", path: "M28 12h44l22 38-22 38H28L6 50Z" }, // hexagon
];

/**
 * The mark a power-up wears, drawn on top of its gem in the same 100x100 box.
 *
 * SHAPE-distinct, not hue-distinct, for the same reason the gems themselves
 * are: roughly one boy in twelve cannot separate the red gem from the green
 * one, and a power-up a child can only identify by its colour is one they
 * cannot plan around. Bars across, bars down, a ring, a star - four outlines
 * anybody can name.
 *
 * ONE INK, and it is dark rather than white. Measured against all six gem
 * fills on 2026-09-05: `#12172B` scores 4.06 (purple) to 11.38 (yellow), so
 * every one clears the 3:1 floor a graphical object needs. White scores 1.56
 * on the yellow gem, 1.87 on the green and 2.20 on the blue - it fails four of
 * the six, and the one it looks best on is the one nobody would have checked.
 *
 * The rainbow's arms are 5 units wide, not 8. Three widths were rendered side
 * by side on the real hexagon at both 136px and the board's own 41px
 * (2026-09-05): at 8 the eight-point star fills in and reads as a dark BLOB at
 * board size, at 6 the points are visible, and at 5-and-shorter it is still an
 * asterisk. Only the small arm matters - all three are identical at 136px,
 * which is the size nobody plays at.
 *
 * Every mark stays inside a circle of radius ~17 about the middle, which is
 * the largest disc that fits inside the TRIANGLE gem - the tightest of the six.
 * A mark drawn wider than the gem it sits on spills onto the dark well, where
 * a dark ink is invisible, and the ring appears broken on exactly one colour.
 */
const MARK_INK = "#12172B";

function KindMark({ kind }: { kind: number }) {
  if (kind === STRIPE_ROW) {
    return <path d="M34 41h32v7H34zM34 52h32v7H34z" fill={MARK_INK} />;
  }
  if (kind === STRIPE_COL) {
    return <path d="M41 34h7v32h-7zM52 34h7v32h-7z" fill={MARK_INK} />;
  }
  if (kind === BURST) {
    return (
      <path
        d="M50 33a17 17 0 1 0 .1 0zM50 40a10 10 0 1 0 .1 0z"
        fill={MARK_INK}
        fillRule="evenodd"
      />
    );
  }
  if (kind === RAINBOW) {
    return (
      <g fill={MARK_INK}>
        <path d="M47.5 36h5v28h-5zM36 47.5h28v5H36z" />
        <path d="M47.5 36h5v28h-5zM36 47.5h28v5H36z" transform="rotate(45 50 50)" />
      </g>
    );
  }
  return null;
}

/**
 * The pitch of each cascade step, in semitones over the base pop.
 *
 * C major pentatonic, and it CAPS at the top instead of wrapping: a long chain
 * should keep sounding like it is going somewhere, and a chain that dropped
 * back to the bottom would tell a child doing well that they had started over.
 */
const CASCADE_STEPS = [0, 2, 4, 7, 9, 12] as const;

/**
 * How far a finger travels before it means a swipe, as a fraction of ONE CELL
 * plus an absolute floor in pixels.
 *
 * A fraction of a cell rather than a constant, because the same phone draws a
 * 55px cell on the easy board and a 41px one on the hard board, and a number
 * tuned against either is wrong on the other - a hair trigger that swipes on
 * every tap, or a distance a small hand never covers inside one gem. 0.4 of a
 * cell is comfortably past a tap's wobble and well short of the neighbour.
 *
 * The floor stops a very small cell (a narrow phone in landscape) from making
 * every jittery tap a swap.
 */
const SWIPE_CELL_FRACTION = 0.4;
const SWIPE_FLOOR_PX = 12;

const WELL = "#1D2440";
const WELL_CELL = "#28315A";

function gemOf(v: number) {
  return GEMS[v] ?? GEMS[1];
}

/* ------------------------------------------------------------- the snapshot */

/**
 * A run in progress.
 *
 * THERE IS NO REWARD LATCH HERE, and that is a decision rather than an
 * omission. This game pays on a completed ROUND, and `round` is already on the
 * state — so a run resumed at round five pays round five when it is finished,
 * which is exactly right, and there is no way to be paid twice by leaving and
 * coming back. The latch other endless games carry exists because their reward
 * fires on a comparison against a stored best; this one fires on a counter the
 * snapshot itself holds (session-snapshot-convention.md).
 */
interface Match3Session {
  state: Match3State;
}

const SESSION: SessionSpec<Match3Session> = {
  // 2 since 2026-09-05: the state gained `kinds`, so every v1 snapshot is
  // discarded rather than migrated. That is the port's own rule and it costs a
  // child at most one board - and the alternative, defaulting a missing
  // `kinds` to all-plain, is a second copy of this game's rules living in a
  // validator that nothing keeps in sync (session.ts, `SessionSpec.version`).
  version: 2,
  validate: (value): value is Match3Session => {
    const s = value as Partial<Match3Session> | null;
    if (typeof s !== "object" || s === null) return false;

    const g = s.state as Partial<Match3State> | null | undefined;
    if (typeof g !== "object" || g === null) return false;
    if (typeof g.level !== "string" || !(g.level in LEVELS)) return false;

    // The board must match the dimensions the LEVEL declares, not merely the
    // ones the snapshot claims: the CSS grid is built from the level, so a
    // board of some other size renders as a grid whose cells and columns
    // disagree - a plausible picture with no error anywhere.
    const cfg = LEVELS[g.level as Difficulty];
    if (g.size !== cfg.size || g.colors !== cfg.colors) return false;
    if (!Array.isArray(g.grid) || g.grid.length !== cfg.size * cfg.size) return false;
    // Every cell a real gem. A ZERO here is the one shape that matters: it is
    // what a board caught mid-cascade would look like, and it would restore as
    // a hole nothing can ever fill.
    if (!g.grid.every((v) => Number.isInteger(v) && v >= 1 && v <= cfg.colors)) return false;
    // The power-ups, parallel to the board and the same length. A short array
    // reads as `undefined` at the far end and every gem past it silently
    // becomes plain - a board that loses the rainbow a child was saving, with
    // nothing anywhere reporting a fault.
    if (!Array.isArray(g.kinds) || g.kinds.length !== cfg.size * cfg.size) return false;
    if (!g.kinds.every((k) => (KINDS as readonly number[]).includes(k))) return false;
    // And settled: no line already sitting on it, and a move still available.
    // Both are guaranteed by `newGame` and by every `swapAt`, so a board
    // failing either was written by something that is not this game.
    if (findMatches(g.grid, cfg.size).length > 0) return false;
    if (!hasMove(g.grid, cfg.size)) return false;

    if (g.selected !== null) {
      if (!Number.isInteger(g.selected)) return false;
      if ((g.selected as number) < 0 || (g.selected as number) >= cfg.size * cfg.size) return false;
    }
    if (!Number.isInteger(g.round) || (g.round as number) < 1) return false;
    if (g.goal !== goalFor(g.level as Difficulty, g.round as number)) return false;
    // A finished run is not a resumable position: restoring one would drop a
    // child onto a board that answers nothing. `> 0` rather than `>= 0`.
    if (!Number.isFinite(g.movesLeft) || (g.movesLeft as number) <= 0) return false;
    // And bounded, so a hand-edited localStorage cannot mint an endless run.
    // DELIBERATELY LOOSE. The first version of this line capped at
    // `moves + movesPerRound` (33 on easy) on the reasoning that one swap can
    // only ever add one bonus - which is true, and irrelevant, because the
    // budget CLIMBS across early rounds that hand back more than they cost.
    // `scripts/repro/match3-run-length.mts` measured a peak of 50/53/47 over
    // 1,200 runs, so that cap would have silently refused a great many real
    // saves and dropped children back to a fresh board. Four times the starting
    // budget is far above anything reachable and still refuses an absurd value.
    if ((g.movesLeft as number) > cfg.moves * 4) return false;
    return [g.cleared, g.score, g.moves].every(
      (n) => typeof n === "number" && Number.isFinite(n) && n >= 0,
    );
  },
};

/* ----------------------------------------------------------------- the game */

export function Match3Game({ ctx }: { ctx: GameContext }) {
  // The level a child last chose, VALIDATED against this game's own list - an id
  // no longer in the list resolves to -1 in GameChrome's findIndex and the
  // toggle silently disappears. Everything below reads `level`; a hardcoded
  // "easy" here would deal an easy board under chrome saying "Hard".
  const [level, setLevel] = useRememberedLevel(ctx, DIFFICULTIES, "easy");

  // Read ONCE, before the first render, so a resumed board never flashes as a
  // fresh one.
  const restored = useMemo(() => ctx.session.load(SESSION), [ctx]);
  const resume = restored && restored.state.level === level ? restored : undefined;

  const [state, setState] = useState<Match3State>(() => resume?.state ?? newGame(level));
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best(level));
  /** The board currently DRAWN. Equals `state.grid` except mid-cascade. */
  const [view, setView] = useState<readonly number[]>(() => state.grid);
  /**
   * The power-ups currently DRAWN, parallel to `view`.
   *
   * A second piece of state rather than a read of `state.kinds`, and the two
   * are ALWAYS set together below. Drawing the marks from the settled state
   * while the colours replay the cascade puts every power-up on the wrong gem
   * for the length of the animation - a board that looks like it is cheating,
   * which is the whole reason `view` exists in the first place.
   */
  const [viewKinds, setViewKinds] = useState<readonly number[]>(() => state.kinds);
  /** Gems vanishing right now, for one short flash. */
  const [clearing, setClearing] = useState<readonly number[]>([]);
  /** The pair a refused swap tried. See `onCell` - a refusal is not an error. */
  const [bumped, setBumped] = useState<readonly number[]>([]);
  /** True while a cascade is playing. Input is locked; nothing here is persisted. */
  const [busy, setBusy] = useState(false);
  /** Set for a moment when a locked board was rearranged, so it is not silent. */
  const [note, setNote] = useState<string | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const startedAt = useRef(Date.now());

  const T = WORDS[ctx.locale];
  const size = state.size;

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

  // Deal a fresh board at `next`. Everything describing the RUN resets here.
  const startLevel = useCallback(
    (next: Difficulty) => {
      const fresh = newGame(next);
      setLevel(next);
      setState(fresh);
      setView(fresh.grid);
      setViewKinds(fresh.kinds);
      setBest(ctx.score?.best(next));
      setClearing([]);
      setBumped([]);
      setBusy(false);
      setNote(null);
      startedAt.current = Date.now();
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

  // Live, but NOT once the run is over.
  //
  // Until 2026-09-04 this game genuinely had no end state, and the comment
  // here said so. Now that the move budget can drain, a finished board is a
  // position a child cannot play their way out of - storing it would restore
  // them into a dead game whose only exit is the restart button, which is the
  // shape `session-snapshot-convention.md` refuses. Returning null CLEARS the
  // stored position (`useGameSession.ts:82` - it calls `ctx.session.clear()`,
  // it does not merely skip the write), which is what we want: a finished run
  // should not be resumable at all, and the next visit deals a fresh board.
  //
  // `state` is otherwise settled at every moment the hook could read it, which
  // is the property that makes it safe to store at all.
  useGameSession(ctx, SESSION, () => (isOver(state) ? null : { state }), { live: true });

  /* ------------------------------------------------------------- the taps */

  /** Walk the cascade's steps, one flash and one drop at a time. */
  const play = useCallback(
    (
      steps: readonly CascadeStep[],
      i: number,
      settled: { grid: readonly number[]; kinds: readonly number[] },
      shuffled: boolean,
    ) => {
      if (i >= steps.length) {
        // The settled board, which differs from the last step only when the
        // rules had to rearrange a locked board.
        setView(settled.grid);
        setViewKinds(settled.kinds);
        setBusy(false);
        if (shuffled) {
          setNote(T.shuffled);
          if (boardRef.current) shake(boardRef.current);
          after(1400, () => setNote(null));
        }
        return;
      }
      const step = steps[i];
      setClearing(step.cleared);

      // A power-up going off is a bigger event than a match, so it gets a
      // bigger answer: its own sound instead of the pop, and a shake for the
      // two that clear an area rather than a line. One sound per step either
      // way - a chain of five would otherwise stack five noises a child hears
      // as a glitch.
      const bang = step.fired.length > 0;
      if (bang && step.fired.some((f) => f.kind === BURST || f.kind === RAINBOW)) {
        if (boardRef.current) shake(boardRef.current);
        haptic.success();
      }
      // The cascade climbs a PENTATONIC ladder rather than a chromatic one, the
      // same scale `sdk/streak.ts` uses and for the same reason: a leading tone
      // makes an ascending line beg for the next step, and building that pull
      // deliberately for five-year-olds is not something this platform does. It
      // caps at the top rather than running off the end of the keyboard.
      ctx.audio.play(bang ? "star" : "pop", {
        semitones: CASCADE_STEPS[Math.min(i, CASCADE_STEPS.length - 1)],
      });
      after(180, () => {
        setClearing([]);
        setView(step.grid);
        setViewKinds(step.kinds);
        // A minted gem sparkles ON THE SQUARE IT LANDED ON. `spawned` is
        // reported after gravity for exactly this - the pre-drop index draws
        // the sparkle on empty air (see `settle`). The cell is looked up in
        // the DOM rather than computed from the board rect, so a board that
        // has resized between the swap and this frame cannot smear it.
        for (const made of step.spawned) {
          const cell = boardRef.current?.querySelector<HTMLElement>(`[data-cell="${made.index}"]`);
          if (!cell) continue;
          const r = cell.getBoundingClientRect();
          burst(r.left + r.width / 2, r.top + r.height / 2, { count: 8 });
        }
        after(110, () => play(steps, i + 1, settled, shuffled));
      });
    },
    [after, ctx, T],
  );

  /**
   * Draw and BANK a swap that happened, whichever input path asked for it.
   *
   * Two taps and one swipe report the same `SwapOutcome`, so they must be worth
   * the same thing. A second copy of this block for the gesture is how a swipe
   * quietly stops granting a coin, or grants two - the outcome is decided in
   * `logic.ts` and paid for exactly once here.
   *
   * `ignored` never reaches it: the two callers mean different things by it and
   * each says so itself.
   *
   * Everything here runs in the HANDLER, never inside a setState updater:
   * React may run an updater twice, and a doubled `winMoment` is a doubled
   * grant - real coins, not a stray animation.
   */
  const resolve = useCallback(
    (next: Match3State, outcome: SwapOutcome, el: HTMLElement) => {
      // A refusal is NOT an error and it costs nothing: the board is untouched
      // and the child simply tries somewhere else. So it answers with a bump
      // and says nothing - the same shape the World shop uses for an item
      // nobody can afford yet.
      if (outcome.kind === "rejected") {
        haptic.tap();
        setState(next);
        setBumped([outcome.a, outcome.b]);
        after(280, () => setBumped([]));
        return;
      }
      if (outcome.kind !== "matched") return;

      setState(next);
      haptic.success();

      // The tapped gem's own middle, so coins fly from the match the child just
      // made rather than from the middle of the screen.
      const r = el.getBoundingClientRect();
      const at = { x: r.left + r.width / 2, y: r.top + r.height / 2 };

      // Draw the trade first, then let the cascade play over it. The marks
      // move with it: a power-up left on the square it came from for 140ms is
      // visible, and it is the frame in which the board looks wrong.
      setView(outcome.swapped);
      setViewKinds(outcome.swappedKinds);
      setBusy(true);
      after(140, () =>
        play(outcome.steps, 0, { grid: next.grid, kinds: next.kinds }, outcome.shuffled),
      );

      if (outcome.gems >= 5) burst(at.x, at.y, { count: 6 + outcome.gems });

      // A completed round is this game's one celebration, and it banks BEFORE
      // any of the animation above can throw. The score rides it, so the record
      // and the reward are one decision rather than two that can disagree.
      if (outcome.roundUp > 0) {
        const report = scoreReport(next, level);
        const won = winMoment(ctx, {
          reason: "level_complete",
          tier: level,
          level: `${level}-${outcome.roundUp}`,
          at,
          ms: Date.now() - startedAt.current,
          score: { value: report.value, unit: report.unit, board: report.board },
          // A ROUND, not the run. The confetti, the sound and the eight coins
          // are exactly as they were; what this drops is the Play again and
          // Share pair, which used to appear between every round while the
          // game carried on - issue #27. It is stated rather than inferred
          // because no reward reason can express "a real level finished and
          // the run continues"; see the note on `runEnded` in winMoment.ts.
          runEnded: false,
        });
        if (won.score) setBest(won.score.best);
        startedAt.current = Date.now();
      }

      // THE END OF THE RUN. Deliberately NOT a winMoment: the rounds have
      // already paid, and running out of moves is the one thing in this game
      // that is not an achievement - paying coins for it would be the same
      // untruth as a retry button that cannot work. So the score is recorded
      // and the chip is offered, and nothing is granted.
      if (outcome.over) {
        const report = scoreReport(next, level);
        const result = ctx.score?.report({ value: report.value, unit: report.unit, board: report.board });
        if (result) setBest(result.best);
        announceWinShare({
          score: { value: report.value, unit: report.unit, board: report.board },
          isPersonalBest: result?.isPersonalBest ?? false,
          runEnded: true,
        });
      }
    },
    [after, ctx, level, play],
  );

  /** A tap: pick a gem up, put it down, or trade with the one held. */
  const onCell = useCallback(
    (index: number, el: HTMLElement) => {
      if (busy) return;
      ctx.audio.unlock();
      ctx.speech.unlock();

      const { state: next, outcome } = tapCell(state, index);

      if (outcome.kind === "ignored") {
        // Picking a gem up or putting it down. Quiet, and never a refusal.
        if (next.selected !== state.selected) {
          ctx.audio.play("tap");
          haptic.tap();
        }
        setState(next);
        return;
      }
      resolve(next, outcome, el);
    },
    [busy, ctx, resolve, state],
  );

  /** A swipe: the same trade, in one motion, with no gem picked up first. */
  const onSwipe = useCallback(
    (index: number, dir: SwipeDir, el: HTMLElement) => {
      if (busy) return;
      ctx.audio.unlock();
      ctx.speech.unlock();

      // `ignored` here is a push off the board edge. It is not a refusal - the
      // finger asked for nothing - so it is silent and does not even clear a
      // gem the child had picked up.
      const { state: next, outcome } = swipeCell(state, index, dir);
      resolve(next, outcome, el);
    },
    [busy, ctx, resolve, state],
  );

  /* ---------------------------------------------------------- the gesture */

  /** The pointer currently down on a cell, if it has not been spent yet. */
  const dragRef = useRef<{
    id: number;
    index: number;
    el: HTMLElement;
    x: number;
    y: number;
    threshold: number;
  } | null>(null);
  /**
   * Set the moment a gesture fires, so the `click` the same pointer ends with
   * is not ALSO read as a tap - which would swipe a gem and then pick up
   * whatever landed under the finger. Cleared by the next `pointerdown` and
   * consumed by the click itself, so a keyboard press is never swallowed.
   */
  const swipedRef = useRef(false);

  const onBoardDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    swipedRef.current = false;
    const cell = (e.target as Element).closest<HTMLElement>("[data-cell]");
    if (!cell) return;
    const index = Number(cell.dataset.cell);
    if (!Number.isInteger(index)) return;

    // Capture on the CELL, never on the board. With the capture on an ancestor
    // the browser retargets the closing `click` to it, and the tap path - the
    // one this game may never lose - stops firing at all.
    cell.setPointerCapture(e.pointerId);

    // A threshold in CELLS rather than in pixels, because a cell is 55px on an
    // easy board and 41px on a hard one at the same phone width, and a fixed
    // number is either a hair trigger on one or unreachable on the other. The
    // floor keeps a wobbly tap from counting as a swipe on any board.
    const r = cell.getBoundingClientRect();
    dragRef.current = {
      id: e.pointerId,
      index,
      el: cell,
      x: e.clientX,
      y: e.clientY,
      threshold: Math.max(SWIPE_FLOOR_PX, r.width * SWIPE_CELL_FRACTION),
    };
  }, []);

  const onBoardMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.id !== e.pointerId) return;

      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (Math.abs(dx) < drag.threshold && Math.abs(dy) < drag.threshold) return;

      // Spend the pointer the instant it crosses: one gesture is one swap, so
      // a finger dragged on across the board cannot trade a chain of gems the
      // child never asked to trade.
      dragRef.current = null;
      swipedRef.current = true;

      // The dominant axis wins, so a slightly crooked swipe still means what a
      // child meant by it. The board is `dir="ltr"`, so these are the same
      // directions in Hebrew as in English (rtl-spatial-grid-dir-ltr.md).
      const dir: SwipeDir =
        Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
      onSwipe(drag.index, dir, drag.el);
    },
    [onSwipe],
  );

  /** A pointer that is gone cannot still be mid-swipe. */
  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  /* ----------------------------------------------------------- the screen */

  const over = isOver(state);
  const remaining = Math.max(0, state.goal - state.cleared);
  const progress = Math.min(1, state.cleared / state.goal);
  const clearingSet = useMemo(() => new Set(clearing), [clearing]);
  const bumpedSet = useMemo(() => new Set(bumped), [bumped]);

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "bolt", label: ctx.t("score"), value: state.score },
        { icon: "layers", label: T.round, value: state.round, record: best ?? "-", compact: true },
        // The number that now decides when the run ends, so it earns a box of
        // its own rather than a line in the footer nobody reads.
        { icon: "moves", label: T.moves, value: state.movesLeft, compact: true },
      ]}
      levels={LEVEL_OPTIONS}
      level={level}
      onLevel={startLevel}
      onRestart={restart}
      footer={
        over ? (
          /* THE END OF THE RUN, in the footer the round progress used to fill.
             It replaces that block rather than stacking under it: a goal bar
             and a "to go" count are both meaningless once nothing can be
             played, and leaving them up is the same untruth as the Play again
             button that used to appear mid-run.

             There is no Play again BUTTON here. GameChrome's own restart is
             already on the utility row above, and the platform's Play again
             arrives on the win chip from `announceWinShare` - two of our own
             buttons doing one job is what
             game-controls-and-platform-chrome-never-share-a-bar.md refuses. */
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "var(--radius-2)",
              boxShadow: "var(--shadow-1)",
              padding: "14px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              fontFamily: "Fredoka, inherit",
            }}
          >
            {/* Announced, because a child who has just run out of moves needs
                telling - the board simply stopping answering is not a message. */}
            <b role="status" style={{ fontSize: 17 }}>
              {T.over}
            </b>
            <span style={{ fontSize: 15, color: "var(--text-dim)" }}>
              {T.finalScore} <span dir="ltr">{state.score}</span>
            </span>
          </div>
        ) : (
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "var(--radius-2)",
            boxShadow: "var(--shadow-1)",
            padding: "12px 14px 14px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              // Any row in this repo that can grow wraps rather than clipping -
              // a-row-that-grows-with-the-catalog-must-wrap.md.
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 8,
              width: "100%",
              fontFamily: "Fredoka, inherit",
            }}
          >
            <b style={{ fontSize: 15 }}>
              {T.round} {state.round}
            </b>
            <b style={{ fontSize: 15, color: "var(--text-dim)" }}>
              {T.goal} <span dir="ltr">{remaining}</span>
            </b>
          </div>
          {/* The goal, as a bar rather than a number a pre-reader has to parse. */}
          <div
            aria-hidden="true"
            style={{
              width: "100%",
              height: 12,
              borderRadius: 999,
              background: "var(--surface-2)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress * 100}%`,
                height: "100%",
                borderRadius: 999,
                background: "var(--brand)",
                transition: "width 0.28s ease",
              }}
            />
          </div>
          <b
            style={{
              fontSize: 15,
              fontFamily: "Fredoka, inherit",
              textAlign: "center",
              color: "var(--text-dim)",
            }}
          >
            {note ?? T.hint}
          </b>
        </div>
        )
      }
    >
      <div
        ref={boardRef}
        className="ellaz-play-surface"
        // The gesture is read on the BOARD rather than per cell: one listener
        // that finds which gem a pointer started on, instead of 64 that each
        // have to agree about what a swipe is.
        onPointerDown={onBoardDown}
        onPointerMove={onBoardMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        // LTR, always. The app is Hebrew RTL by default, so an RTL grid lays
        // column 0 out on the visual RIGHT and every spatial assumption the
        // player makes inverts - see rtl-spatial-grid-dir-ltr.md.
        dir="ltr"
        style={{
          position: "relative",
          // Sized against the VIEWPORT, not this container, like every board
          // here. 92vw is 359px on a 390px phone, which leaves ~55px cells on
          // the 6x6 board and ~41px on the 8x8 one. 54vh rather than 60 because
          // this game carries a goal bar under the board. The 480px cap sits
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
        {view.map((cell, i) => {
          const gem = gemOf(cell);
          const held = state.selected === i;
          const going = clearingSet.has(i);
          const kind = viewKinds[i] ?? PLAIN;
          return (
            <button
              key={i}
              type="button"
              // 64 cells that all read "gem" are 64 cells a screen reader cannot
              // tell apart, so each carries its own column and row. One-based,
              // because nobody counts from zero out loud.
              // The power-up is NAMED, not merely drawn. A child on a screen
              // reader gets the mark's meaning; without it the two stripes are
              // the same announcement as an ordinary gem and the one piece of
              // information they carry is sighted-only.
              aria-label={`${T.gem(cell)}${kind === PLAIN ? "" : ` ${T.kind[kind as Exclude<Kind, 0>]}`} ${(i % size) + 1}, ${Math.floor(i / size) + 1}${held ? ` — ${T.held}` : ""}`}
              aria-pressed={held}
              // Which gem a gesture started on. Read off the DOM rather than
              // hit-tested from coordinates, so the cell the browser says was
              // pressed is the cell that moves.
              data-cell={i}
              onClick={(e) => {
                // The click that closes a swipe is not a tap. Consumed here
                // rather than only cleared on the next press, so it can never
                // outlive its own gesture and swallow a keyboard press.
                if (swipedRef.current) {
                  swipedRef.current = false;
                  return;
                }
                onCell(i, e.currentTarget);
              }}
              style={{
                minWidth: 0,
                minHeight: 0,
                lineHeight: 1,
                border: "none",
                padding: "8%",
                borderRadius: "18%",
                display: "grid",
                placeItems: "center",
                background: held ? "rgba(255,255,255,0.16)" : WELL_CELL,
                outline: held ? "3px solid var(--brand)" : "none",
                outlineOffset: -3,
                // The bump. A dashed ring rather than a colour change, so it
                // reads as "not that one" rather than as a mistake being scored.
                boxShadow: bumpedSet.has(i) ? "inset 0 0 0 3px #FF8A3D" : "none",
                transform: held ? "scale(0.94)" : "none",
                opacity: going ? 0 : 1,
                transition: "opacity 0.16s ease, transform 0.12s ease, background 0.12s ease",
                cursor: "pointer",
                touchAction: "none",
              }}
            >
              <svg
                viewBox="0 0 100 100"
                aria-hidden="true"
                style={{ width: "100%", height: "100%", display: "block" }}
              >
                <path d={gem.path} fill={gem.fill} />
                <KindMark kind={kind} />
              </svg>
            </button>
          );
        })}
      </div>
    </GameChrome>
  );
}
