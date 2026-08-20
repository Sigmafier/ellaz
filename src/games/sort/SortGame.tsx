import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { textFor, type Locale } from "@i18n/index";
import type { GameContext, RewardTier, SessionSpec } from "@sdk/index";
import { GameChrome, type ChromeLevel } from "@ui/GameChrome";
import { burst, haptic, shake } from "@juice/index";
import { useGameSession, useRememberedLevel, winMoment } from "@shared/index";
import {
  LEVELS,
  LEVEL_IDS,
  isSolved,
  newGame,
  scoreFor,
  tap,
  topRun,
  undo,
  type LevelId,
  type SortState,
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
 * A level is a puzzle size; a tier is what the economy pays for it. Written out
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
 * The eight colours, 1-based to match `Color` in `logic.ts` — which is a
 * palette INDEX precisely so the rules never learn a hex code.
 *
 * They are spread across LIGHTNESS as well as hue, and that is the accessible
 * half of the choice: a sorting game cannot stop being about colour, but two
 * balls a red-green colour-blind player reads as the same hue are still a pale
 * one and a dark one, and the hardest level puts all eight on screen at once.
 */
const COLORS: readonly string[] = [
  "", // 0 is never a ball; a tube stores no zeroes
  "#FFE14D", // lemon      — the lightest
  "#FF9F1C", // tangerine
  "#F04E4E", // poppy
  "#F58BC0", // blossom
  "#6FD44E", // lime
  "#19C6C6", // lagoon
  "#3B6FE0", // ink        — the darkest pair
  "#8E44D0", // orchid
];

/* ---------------------------------------------------------------- the board */

/**
 * Tubes per row: half of them, so every level lays out as two even rows rather
 * than one long line that wraps somewhere arbitrary.
 */
function columnsFor(tubes: number): number {
  return Math.ceil(tubes / 2);
}

/**
 * A ball's size, against the VIEWPORT and never the container — the house rule
 * for every board here. The vw term is computed into a variable rather than
 * interpolated inline so the whole `min(...)` is one uninterrupted expression:
 * `game-panel-clears-widest-board.test.ts` reads these as text and stops at the
 * first `)`, so an inline `.toFixed(2)` hides the px cap from the gate that
 * exists to check it.
 *
 * The arithmetic that says it fits, at the worst case (hard, 10 tubes, 5 across
 * on a 390px phone): a tube is `ball + 16`, so 5 x (43.7 + 16) + 4 x 8 = 330px
 * inside 351px of 90vw. `maxWidth` below is the belt to that braces.
 */
function ballSize(cols: number): string {
  const vw = (56 / cols).toFixed(2);
  return `min(${vw}vw, 6vh, 52px)`;
}

/** The tube's own chrome — border 3, padding 5, both sides. */
const TUBE_TRIM = 16;

/* -------------------------------------------------------------- the session */

/**
 * A puzzle in progress: the level it belongs to, and the whole board.
 *
 * `history` travels inside `SortState`, and it has to: undo is unlimited here,
 * so a run restored without its history is a run a child can no longer take a
 * move back in — which is the one affordance this game leans on hardest.
 *
 * There is NO reward latch in this snapshot, and that is a fact about the game
 * rather than an omission. The only grant is the single `level_complete` at the
 * end, and a solved board is never handed back: `live: !won` clears it, and the
 * guard at the mount refuses one anyway. The day this game pays anything
 * mid-run — a milestone, a personal best — that latch belongs here, or leaving
 * and returning becomes a way to be paid twice (see the session rule).
 */
interface SortSession {
  level: LevelId;
  state: SortState;
}

const SESSION: SessionSpec<SortSession> = {
  version: 1,
  validate: (value): value is SortSession => {
    const s = value as Partial<SortSession> | null;
    if (typeof s !== "object" || s === null) return false;
    if (typeof s.level !== "string" || !(s.level in LEVELS)) return false;
    const spec = LEVELS[s.level as LevelId];
    const g = s.state;
    if (typeof g !== "object" || g === null) return false;
    // Everything the renderer sizes itself from reads off the LEVEL, so a board
    // of some other shape lays out as a grid whose columns and tubes disagree.
    if (g.capacity !== spec.capacity) return false;
    const tubes = spec.colors + spec.spare;
    if (!Array.isArray(g.tubes) || g.tubes.length !== tubes) return false;
    const ball = (c: unknown) => Number.isInteger(c) && (c as number) >= 1 && (c as number) <= spec.colors;
    if (!g.tubes.every((t) => Array.isArray(t) && t.length <= spec.capacity && t.every(ball))) {
      return false;
    }
    if (g.selected !== null && !inRange(g.selected, tubes)) return false;
    if (typeof g.moves !== "number" || !Number.isFinite(g.moves)) return false;
    // The strictest check here, because `undo` is the one function that trusts
    // this: it splices `tubes[move.to]` without asking whether that tube exists,
    // so a history naming a tube this board does not have is a THROW inside a
    // tap handler rather than a wrong picture.
    return (
      Array.isArray(g.history) &&
      g.history.every(
        (m) =>
          m !== null &&
          typeof m === "object" &&
          inRange(m.from, tubes) &&
          inRange(m.to, tubes) &&
          Number.isInteger(m.count) &&
          m.count > 0 &&
          m.count <= spec.capacity,
      )
    );
  },
};

function inRange(n: unknown, limit: number): boolean {
  return Number.isInteger(n) && (n as number) >= 0 && (n as number) < limit;
}

/* ----------------------------------------------------------------- the game */

export function SortGame({ ctx }: { ctx: GameContext }) {
  const [level, setLevel] = useRememberedLevel(
    ctx,
    LEVEL_OPTIONS.map((o) => o.id),
    "easy",
  );
  const restored = useMemo(() => ctx.session.load(SESSION), [ctx]);
  // Adopted only for the level this mount opened on, and never once it is
  // solved — a finished puzzle has nothing left to pour, and returning to one
  // reads as the game having failed to deal a board.
  const resume =
    restored && restored.level === level && !isSolved(restored.state) ? restored : undefined;

  // Nothing is HELD on the way back in. A restored `selected` would put a run in
  // the hand of a child who has not touched the screen yet, and the lifted balls
  // would be the first thing they see with no memory of having picked them up.
  const [state, setState] = useState<SortState>(() =>
    resume ? { ...resume.state, selected: null } : newGame(level),
  );
  const [won, setWon] = useState(false);
  // Fewest moves, per LEVEL. Four colours and eight are not the same puzzle, so
  // one shared record would let an easy run permanently outrank every hard one.
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best(level));
  const boardRef = useRef<HTMLDivElement>(null);
  const tubeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const started = useRef(false);

  useGameSession(ctx, SESSION, () => ({ level, state }), { live: !won });

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
      setState(newGame(lv));
      setWon(false);
      setBest(ctx.score?.best(lv));
      ctx.analytics.levelStart(lv);
    },
    [ctx, level, setLevel],
  );

  /**
   * The whole input model, from the handler flow and never from inside a
   * `setState` updater — React may run an updater twice, and this one grants
   * coins (see the rewards rule).
   */
  const onTube = useCallback(
    (index: number) => {
      if (won) return;
      ctx.audio.unlock();
      const { state: next, outcome } = tap(state, index);

      if (outcome.kind === "ignored") return;

      // A refusal is not an error, and `logic.ts` deliberately keeps the run in
      // the player's hand rather than dropping it — so this must not deselect
      // either, or every misjudged tap costs two taps to recover from. The tube
      // shakes and the game says nothing. `next` IS `state` here, so there is
      // nothing to repaint.
      if (outcome.kind === "refused") {
        const el = tubeRefs.current[index];
        if (el) shake(el, 5, 200);
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

      setWon(true);
      const at = boardCentre();
      if (at) burst(at.x, at.y, { count: 16 });
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
    [boardCentre, ctx, level, state, won],
  );

  /**
   * Unlimited, because a five-year-old mis-taps constantly and a puzzle they
   * cannot walk back out of is a puzzle they abandon. `undo` returns the same
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

  const cols = columnsFor(state.tubes.length);
  const ball = ballSize(cols);
  const sorted = state.tubes.filter(
    (t) => t.length === state.capacity && t.every((c) => c === t[0]),
  ).length;

  // This game's own words. A locale RECORD, so promoting a language reds
  // this block by name instead of leaving the game speaking English
  // inside a page that is not.
  const T = textFor(
    {
      he: {
        sorted: "מוינו",
        pick: "הקישו על מבחנה כדי להרים צבע",
        pour: "הקישו על מבחנה כדי לשפוך",
        undo: "צעד אחורה",
      },
      en: {
        sorted: "Sorted",
        pick: "Tap a tube to pick a colour up",
        pour: "Tap a tube to pour it in",
        undo: "Step back",
      },
      es: {
        sorted: "Ordenados",
        pick: "Toca un tubo para coger un color",
        pour: "Toca un tubo para verter",
        undo: "Un paso atrás",
      },
    },
    ctx.locale,
  );

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "moves", label: ctx.t("moves"), value: state.moves, compact: true, record: best ?? "-" },
        { icon: "check", label: T.sorted, value: `${sorted}/${LEVELS[level].colors}`, ltr: true, compact: true },
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
            }}
          >
            {won ? `${ctx.t("youWon")} 🎉` : state.selected === null ? T.pick : T.pour}
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
      {/* NO `dir="ltr"` here, and that is deliberate. The rule pins a grid LTR
          when its POSITION or its INPUT is directional - n2048 mirrors and its
          swipes invert. Nothing about a pour is directional: any tube pours into
          any other, and the row reading right-to-left in Hebrew is simply the
          right way round for the child looking at it. */}
      <div
        ref={boardRef}
        className="ellaz-play-surface"
        style={
          {
            ["--ball" as string]: ball,
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, auto)`,
            justifyContent: "center",
            // The ROW gap is derived from the ball, not fixed at 8, and that is
            // the lift's fault: a picked run rises `0.5 x ball` above its rim,
            // which on a 390px phone is ~25px, so an 8px row gap would draw the
            // lifted balls of the bottom row through the tubes of the top one.
            // 0.62 clears 0.5 with a little air.
            gap: "calc(var(--ball) * 0.62) 8px",
            // The braces to the arithmetic in `ballSize`. It should never bind;
            // if a future level widens a row past it, the play surface scrolls
            // rather than the tubes being sliced off by the frame.
            maxWidth: "min(90vw, 560px)",
            touchAction: "none",
          } as CSSProperties
        }
      >
        {state.tubes.map((tube, i) => {
          const run = topRun(tube);
          // The whole top RUN lifts, not one ball, because the run is exactly
          // what a pour would move - so a child can SEE how much is in their
          // hand before they choose where it goes.
          const lifted = state.selected === i && run ? run.count : 0;
          const complete = tube.length === state.capacity && tube.every((c) => c === tube[0]);
          return (
            <button
              key={i}
              ref={(el) => {
                tubeRefs.current[i] = el;
              }}
              type="button"
              aria-label={`tube ${i + 1}`}
              // Pointer Events, and the capture with them: a tap that begins on
              // a tube belongs to that tube even if the finger slides off a
              // 44px-wide target before it lifts. `click` is deliberately NOT
              // listened to - it would fire a second time after this one.
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                onTube(i);
              }}
              // ...which leaves the keyboard, since a <button> reaches its own
              // onClick from Enter and Space and we are not listening there.
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                onTube(i);
              }}
              style={{
                display: "flex",
                // Bottom-up: `tube[0]` is the BOTTOM ball, and column-reverse
                // lays the first child there, so the array order and the picture
                // agree with no reversing anywhere.
                flexDirection: "column-reverse",
                justifyContent: "flex-start",
                alignItems: "center",
                width: `calc(var(--ball) + ${TUBE_TRIM}px)`,
                height: `calc(var(--ball) * ${state.capacity} + ${TUBE_TRIM}px)`,
                boxSizing: "border-box",
                padding: 5,
                border: `3px solid ${
                  state.selected === i
                    ? "var(--brand)"
                    : complete
                      ? "var(--green)"
                      : "rgba(255,255,255,0.18)"
                }`,
                // Square-ish shoulders, round bottom: a test tube rather than a
                // pill, so the open end reads as the end you pour into.
                borderRadius: "calc(var(--ball) * 0.28) calc(var(--ball) * 0.28) calc(var(--ball) * 0.7) calc(var(--ball) * 0.7)",
                background: "rgba(255,255,255,0.07)",
                boxShadow: state.selected === i ? "0 0 0 4px rgba(108,92,231,0.35)" : "var(--shadow-1)",
                // The lifted balls sit ABOVE the rim, so the tube must not clip.
                overflow: "visible",
                cursor: "pointer",
                touchAction: "none",
              }}
            >
              {tube.map((color, slot) => (
                <span
                  key={slot}
                  style={{
                    width: "var(--ball)",
                    height: "var(--ball)",
                    flex: "0 0 auto",
                    borderRadius: "50%",
                    background: COLORS[color],
                    // A lit top edge and a shaded bottom one - what stops a flat
                    // circle reading as a sticker instead of a ball.
                    boxShadow:
                      "inset 0 calc(var(--ball) * 0.12) 0 rgba(255,255,255,0.35), " +
                      "inset 0 calc(var(--ball) * -0.14) 0 rgba(0,0,0,0.2)",
                    // Kept in step with the grid's row gap above - a deeper lift
                    // than that gap puts these balls inside the tube overhead.
                    transform:
                      slot >= tube.length - lifted
                        ? "translateY(calc(var(--ball) * -0.5))"
                        : undefined,
                    transition: "transform 0.14s ease",
                  }}
                />
              ))}
            </button>
          );
        })}
      </div>
    </GameChrome>
  );
}
