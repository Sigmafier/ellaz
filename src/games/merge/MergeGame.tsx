import { useCallback, useEffect, useRef, useState } from "react";
import type { GameContext } from "@sdk/index";
import type { Locale } from "@i18n/index";
import { Button } from "@ui/components";
import { GameChrome } from "@ui/GameChrome";
import { type DifficultyOption } from "@ui/DifficultySelector";
import { burst, haptic, shake } from "@juice/index";
import { useRememberedLevel, winMoment } from "@shared/index";
import {
  DIFFICULTIES,
  LADDER,
  LEVELS,
  isDead,
  newGame,
  scoreReport,
  tapCell,
  type Difficulty,
  type MergeState,
} from "./logic";

// The renderer. Every rule about what a tap DOES lives in logic.ts; this file
// only decides what a tap LOOKS and SOUNDS like, and what the outcomes it
// reports are worth to the economy.
//
// TAP, NEVER DRAG. `logic.ts` has no `drag(from, to)` at all, so the only path
// through the game is tap-a-creature then tap-where-it-goes. That is the kids
// rule in CLAUDE.md and it is also the accessible path: a five-year-old on a
// phone, and anyone on assistive input, cannot reliably hold a sustained
// pointer gesture. Drag may be added ON TOP of this later; it may never replace
// it.

const LEVEL_OPTIONS: DifficultyOption<Difficulty>[] = [
  { id: "easy", label: { he: "קל", en: "Easy", es: "Fácil" } },
  { id: "medium", label: { he: "בינוני", en: "Med", es: "Media" } },
  { id: "hard", label: { he: "קשה", en: "Hard", es: "Difícil" } },
];

// This game's own words, as a locale RECORD rather than a `locale === "he" ?`
// ternary — promoting a language reds this block by name instead of leaving the
// game speaking English inside a page that is not.
const WORDS: Record<Locale, { hint: string; highest: string; empty: string }> = {
  he: {
    hint: "הקישו על שני יצורים זהים כדי ליצור את הבא",
    highest: "הכי גבוה",
    empty: "משבצת ריקה",
  },
  en: {
    hint: "Tap two of the same to make the next one",
    highest: "Highest",
    empty: "empty square",
  },
  es: {
    hint: "Toca dos iguales para crear el siguiente",
    highest: "Más alto",
    empty: "casilla vacía",
  },
};

export function MergeGame({ ctx }: { ctx: GameContext }) {
  // The level a child last chose, VALIDATED against this game's own list — an
  // id no longer in the list resolves to -1 in GameChrome's findIndex and the
  // toggle silently disappears. Everything below reads `level`; a hardcoded
  // "easy" here would deal an easy board under chrome saying "Hard".
  const [level, setLevel] = useRememberedLevel(ctx, DIFFICULTIES, "easy");
  const [state, setState] = useState<MergeState>(() => newGame(level));
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best(level));
  /** The square that just merged, for one 240ms pop. */
  const [popped, setPopped] = useState<number | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  /**
   * One personal-best moment per run.
   *
   * `logic.ts` reports a new top rung on EVERY climb and the score port calls
   * every point past the old record a personal best, so without this latch a
   * first-time player — whose record is nothing at all — collects the reward on
   * literally every merge. It resets where a new run begins, and nowhere else.
   */
  const bestFiredRef = useRef(false);

  const cfg = LEVELS[level];
  const dead = isDead(state);
  const T = WORDS[ctx.locale];

  // Deal a fresh board at `next`. Everything that describes the RUN resets
  // here, including the latch: a new run has paid for nothing yet.
  const startLevel = useCallback(
    (next: Difficulty) => {
      setLevel(next);
      setState(newGame(next));
      setBest(ctx.score?.best(next));
      setPopped(null);
      bestFiredRef.current = false;
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

  // Everything here runs in the HANDLER, never inside a setState updater:
  // React may run an updater twice, and a doubled `winMoment` is a doubled
  // grant — real coins, not a stray animation.
  const onTap = useCallback(
    (index: number, el: HTMLElement) => {
      if (dead) return;
      ctx.audio.unlock();
      ctx.speech.unlock();

      const { state: next, outcome } = tapCell(state, index);
      if (outcome.kind === "ignored") return;
      setState(next);

      // The tapped square's own middle, so coins fly from the creature the
      // child just made rather than from the middle of the board.
      const r = el.getBoundingClientRect();
      const at = { x: r.left + r.width / 2, y: r.top + r.height / 2 };

      if (outcome.kind === "merged") {
        ctx.audio.play("success");
        haptic.success();
        setPopped(outcome.to);
        setTimeout(() => setPopped(null), 260);
        burst(at.x, at.y, { count: 10 });

        // The record climbs WITH the run. This game has no ending, so waiting
        // for one would mean a run a child walks away from never counted at
        // all. `scoreReport` is logic.ts's own answer to what the record
        // measures — the renderer never invents a unit, and never writes its
        // own `best`.
        const report = scoreReport(next, level);
        const scored = ctx.score?.report(report);
        if (scored?.isPersonalBest) setBest(scored.best);

        // A milestone rung, the first time this run reaches it. `logic.ts`
        // gates `milestone` on `newTop` already, so a second creature at the
        // same rung pays nothing. `confetti: false` because this fires every
        // few taps and a full-screen celebration that often stops being one.
        if (outcome.milestone) {
          winMoment(ctx, {
            reason: "milestone",
            level: `rung-${outcome.tier}`,
            at,
            confetti: false,
          });
        }

        // The one celebration an endless game ever gets. It is latched to once
        // per run, and there is no `level_complete` here on purpose: nothing is
        // ever finished, so nothing may pay a completion star.
        if (scored?.isPersonalBest && !bestFiredRef.current) {
          bestFiredRef.current = true;
          winMoment(ctx, {
            reason: "personal_best",
            tier: level,
            level: `best-${report.value}`,
            at,
          });
        }
      } else if (outcome.kind === "selected") {
        ctx.audio.play("tap");
        haptic.tap();
      } else if (outcome.kind === "cleared") {
        ctx.audio.play("tap");
      } else {
        // dropped or moved — a creature arrived on an empty square.
        ctx.audio.play("pop");
        haptic.tap();
      }

      // Checked for EVERY outcome, not only a merge: dropping a creature onto
      // the last free square is the other way a board runs out.
      if (isDead(next)) {
        ctx.audio.play("fail");
        if (boardRef.current) shake(boardRef.current);
        ctx.analytics.levelFail(level, "board-full");
      }
    },
    [ctx, state, level, dead],
  );

  const top = LADDER[state.topTier];

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "bolt", label: ctx.t("score"), value: state.score, record: best ?? "-" },
        { icon: "layers", label: T.highest, value: top.emoji, ltr: true },
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
            padding: "14px 12px",
            minHeight: 62,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            // The item count here is one today, and a row in this repo that can
            // grow wraps rather than clipping - see
            // a-row-that-grows-with-the-catalog-must-wrap.md.
            flexWrap: "wrap",
            gap: 8,
            textAlign: "center",
          }}
        >
          <b style={{ fontSize: 16, fontFamily: "Fredoka, inherit" }}>
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
        // player makes inverts — see rtl-spatial-grid-dir-ltr.md.
        dir="ltr"
        style={{
          position: "relative",
          // Sized against the VIEWPORT, not this container, like every board
          // here. 94vw is 366px on a 390px phone, which leaves ~63px squares on
          // the 5x5 board and ~80px on the 4x4 ones. The 480px cap sits well
          // under the 700px desktop panel, so nothing grows a scrollbar inside
          // it (game-panel-clears-widest-board.test.ts).
          width: "min(94vw, 60vh, 480px)",
          aspectRatio: "1",
          boxSizing: "border-box",
          display: "grid",
          gridTemplateColumns: `repeat(${cfg.cols}, 1fr)`,
          // Explicit ROWS as well: without them a tall glyph stretches its row
          // and the square board deforms.
          gridTemplateRows: `repeat(${cfg.rows}, 1fr)`,
          gap: 8,
          padding: 8,
          background: "var(--surface-2)",
          borderRadius: 16,
          touchAction: "none",
        }}
      >
        {state.cells.map((cell, i) => {
          const rung = cell === null ? null : LADDER[cell];
          const held = state.selected === i;
          return (
            <button
              key={i}
              type="button"
              // An emoji reads as nothing to a screen reader, so the creature's
              // own name in the player's language is the label.
              aria-label={rung ? rung[ctx.locale] : T.empty}
              aria-pressed={held}
              className={popped === i ? "ellaz-merge" : undefined}
              onClick={(e) => onTap(i, e.currentTarget)}
              style={{
                minWidth: 0,
                // minHeight + lineHeight so one big glyph cannot push its row
                // taller than the others and skew the grid.
                minHeight: 0,
                lineHeight: 1,
                border: "none",
                padding: 0,
                borderRadius: 12,
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
                fontFamily: "inherit",
                fontSize: "clamp(24px, 9vw, 46px)",
                background: rung ? "var(--surface)" : "rgba(0, 0, 0, 0.07)",
                boxShadow: rung ? "var(--shadow-1)" : "none",
                // An outline rather than a ring in the box shadow: the cell
                // clips its own overflow, and a shadow ring would be cut off.
                outline: held ? "3px solid var(--brand)" : "none",
                outlineOffset: -3,
                transform: held ? "scale(0.94)" : "none",
                transition: "transform 0.12s ease, background 0.12s ease",
                cursor: "pointer",
                touchAction: "none",
              }}
            >
              {rung ? (
                rung.emoji
              ) : state.selected === null ? (
                // Nothing held, so tapping here ADDS a creature. The mark says
                // so without a word, and it disappears while something IS held,
                // because then the same tap moves rather than adds.
                <span aria-hidden="true" style={{ opacity: 0.26, fontSize: "58%" }}>
                  +
                </span>
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
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40 }}>😅</div>
              <h2 style={{ margin: "8px 0" }}>{ctx.t("gameOver")}</h2>
              <Button onClick={restart}>{ctx.t("restart")}</Button>
            </div>
          </div>
        )}
      </div>
    </GameChrome>
  );
}
