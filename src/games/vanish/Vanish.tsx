import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import type { GameContext } from "@sdk/index";
import { Button, DifficultySelector, Stat, type DifficultyOption } from "@ui/index";
import { haptic, shake } from "@juice/index";
import { Prompt, useGameTimer, winMoment } from "@shared/index";
import {
  COVER_MS,
  DIFFICULTIES,
  isCorrectChoice,
  newRound,
  nextPhase,
  revealedItems,
  vanishedItem,
  type Difficulty,
  type Phase,
  type Round,
} from "./logic";

// "What disappeared?" - study, cover, answer.
//
// The renderer owns only TIMING and PIXELS; `logic.ts` owns the round. The one
// rule worth restating here is that a wrong tap costs nothing: it shakes, the
// character stays hidden, and the same question is asked again. There is no
// score to lose and no attempt counter to exhaust.

const LEVEL_LABELS: Record<Difficulty, { he: string; en: string }> = {
  easy: { he: "קל", en: "Easy" },
  medium: { he: "בינוני", en: "Med" },
  hard: { he: "קשה", en: "Hard" },
};

// Built from DIFFICULTIES so the row can never drift out of sync with the ladder.
const LEVEL_OPTIONS: DifficultyOption<Difficulty>[] = DIFFICULTIES.map((id) => ({
  id,
  label: LEVEL_LABELS[id],
}));

// Hebrew is the PRIMARY string, not a translation of the English.
const T = {
  he: {
    study: "תסתכלו טוב על החברים",
    cover: "עוצמים עיניים רגע...",
    ask: "מי נעלם?",
    solved: "כל הכבוד! מצאתם את",
    round: "סיבוב",
    found: "מצאתם",
    time: "זמן",
    again: "שוב",
    next: "עוד סיבוב",
  },
  en: {
    study: "Look carefully at the friends",
    cover: "Close your eyes for a moment...",
    ask: "Who disappeared?",
    solved: "Well done! You found",
    round: "Round",
    found: "Found",
    time: "Time",
    again: "Again",
    next: "Next round",
  },
} as const;

const TILE_MIN = 72; // kids target floor is 64px; the extra 8 is breathing room

function isDifficulty(v: string): v is Difficulty {
  return (DIFFICULTIES as readonly string[]).includes(v);
}

export function Vanish({ ctx }: { ctx: GameContext }) {
  const t = T[ctx.locale];

  const [level, setLevel] = useState<Difficulty>(() => {
    const saved = ctx.storage.get<string>("level", "easy");
    return isDifficulty(saved) ? saved : "easy";
  });
  // Furthest round reached, per DIFFICULTY — `roundNo` resets to 1 on a fresh run
  // at a new difficulty, so a shared record would let an easy streak stand as the
  // record on hard. Seeded from the RESTORED difficulty, not "easy": the level is
  // persisted, so a returning player must see the record for the one they are on.
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best(level));
  const [round, setRound] = useState<Round>(() => newRound(level));
  const [phase, setPhase] = useState<Phase>("study");
  const [solved, setSolved] = useState(false);
  const [roundNo, setRoundNo] = useState(1);
  const [foundCount, setFoundCount] = useState(0);
  const started = useRef(false);

  // Pause-aware: a child who puts the tablet down mid-study must not come back
  // to a blown clock, so the study countdown is `useGameTimer` (which stops on
  // ctx.onPause) rather than a bare setTimeout. `running` is true ONLY during
  // the study beat, so the clock is stopped for the cover and answer beats too.
  const { elapsedMs, reset: resetTimer } = useGameTimer(ctx, {
    running: phase === "study",
    tickMs: 100,
    onTick: (ms) => {
      // A pure updater - no side effects here, so a double-invoked updater is
      // harmless and a late tick after the beat changed is a no-op.
      if (ms >= round.studyMs) setPhase((p) => (p === "study" ? nextPhase(p) : p));
    },
  });

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    ctx.lifecycle.gameplayStart();
    ctx.analytics.levelStart(`vanish-${level}`);
  }, [ctx, level]);

  // The blanket beat. Cleared on unmount and on any phase change, so a round
  // restarted mid-cover cannot be dragged forward by a stale timer.
  useEffect(() => {
    if (phase !== "cover") return;
    const id = setTimeout(() => setPhase((p) => (p === "cover" ? nextPhase(p) : p)), COVER_MS);
    return () => clearTimeout(id);
  }, [phase]);

  const startRound = useCallback(
    (d: Difficulty, opts?: { fresh?: boolean }) => {
      setLevel(d);
      ctx.storage.set("level", d);
      // The record is scoped to the difficulty, so switching boards must show the
      // record for the board actually being played.
      setBest(ctx.score?.best(d));
      setRound(newRound(d));
      setSolved(false);
      setPhase("study");
      resetTimer();
      if (opts?.fresh) {
        setRoundNo(1);
        setFoundCount(0);
      } else {
        setRoundNo((n) => n + 1);
      }
      ctx.analytics.levelStart(`vanish-${d}`);
    },
    [ctx, resetTimer],
  );

  const onChoice = useCallback(
    (e: PointerEvent<HTMLButtonElement>, index: number) => {
      if (phase !== "reveal" || solved) return;
      // Inside the gesture, so iOS opens both gates.
      ctx.audio.unlock();
      ctx.speech.unlock();
      const el = e.currentTarget;

      if (!isCorrectChoice(round, index)) {
        // Gentle: a nudge and another try, with the character still hidden.
        ctx.audio.play("tap");
        haptic.tap();
        shake(el);
        return;
      }

      setSolved(true);
      setFoundCount((n) => n + 1);
      const r = el.getBoundingClientRect();
      // From the event handler, never from inside a setState updater: React may
      // run an updater twice, and that would double-grant the coins.
      // No `ms` here on purpose: the only clock in this file counts the STUDY
      // beat down, not how long the answer took, and `ms` is read as a solve
      // duration. "Not measured" is the honest answer.
      const won = winMoment(ctx, {
        reason: "level_complete",
        tier: round.difficulty,
        level: `vanish-${round.difficulty}`,
        at: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
        score: { value: roundNo, unit: "points", board: round.difficulty },
      });
      if (won.score) setBest(won.score.best);
    },
    // `roundNo` is read for the score — the round being solved IS the record.
    [ctx, phase, round, solved, roundNo],
  );

  const gone = vanishedItem(round);
  const board = revealedItems(round);
  const secondsLeft = Math.max(0, Math.ceil((round.studyMs - elapsedMs) / 1000));
  const choiceCols = Math.min(round.choices.length, 3);
  const promptText =
    phase === "study"
      ? t.study
      : phase === "cover"
        ? t.cover
        : solved
          ? `${t.solved} ${gone[ctx.locale]}`
          : t.ask;
  const promptGlyph =
    phase === "study" ? "👀" : phase === "cover" ? "🫣" : solved ? "🎉" : "🫥";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Stat label={t.round} value={roundNo} />
        <Stat
          label={phase === "study" ? t.time : t.found}
          value={phase === "study" ? secondsLeft : foundCount}
        />
        <Stat label={ctx.t("best")} value={best ?? "-"} />
        <Button variant="ghost" kids ariaLabel={t.again} onClick={() => startRound(level, { fresh: true })}>
          🔄
        </Button>
      </div>

      <DifficultySelector
        options={LEVEL_OPTIONS}
        value={level}
        onChange={(d) => startRound(d, { fresh: true })}
        locale={ctx.locale}
        kids
      />

      <Prompt ctx={ctx} glyph={promptGlyph} text={promptText} />

      {/* Spatial board: pinned LTR so the slots do not mirror in the Hebrew app,
          and touch-action:none so a tap on a tile is never eaten by a scroll. */}
      <div
        dir="ltr"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${round.columns}, 1fr)`,
          gap: 12,
          width: `min(92vw, 52vh, 420px)`,
          touchAction: "none",
        }}
      >
        {round.items.map((item, i) => {
          const covered = phase === "cover";
          const shown = phase === "study" ? item : board[i];
          const hole = shown === null && !covered;
          return (
            <div
              key={item.emoji}
              // The flip carries the blanket beat; the pop carries the reveal, so
              // the disappearance reads as an event rather than a jump cut.
              className={covered ? "ellaz-flip" : hole ? "ellaz-pulse" : "ellaz-pop"}
              // `role="img"` is what makes the label reachable - a bare <div>
              // with an aria-label is ignored by most screen readers.
              role="img"
              aria-label={hole || covered ? "?" : item[ctx.locale]}
              style={{
                aspectRatio: "1",
                minHeight: TILE_MIN,
                borderRadius: 18,
                display: "grid",
                placeItems: "center",
                fontSize: "clamp(30px, 9vw, 56px)",
                background: covered
                  ? "linear-gradient(180deg,var(--brand-2),var(--brand))"
                  : hole
                    ? "transparent"
                    : "var(--surface)",
                border: hole ? "3px dashed var(--brand)" : "none",
                boxShadow: hole ? "none" : "var(--shadow-1)",
                transition: "background 0.2s ease",
              }}
            >
              {covered ? "" : hole ? <span style={{ opacity: 0.35 }}>❓</span> : shown?.emoji}
            </div>
          );
        })}
      </div>

      {/* The answer row is the ORIGINAL set, shuffled: an absence is not
          tappable, so the child points at the character instead of the hole. */}
      {phase === "reveal" && (
        <div
          dir="ltr"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${choiceCols}, 1fr)`,
            gap: 10,
            width: `min(92vw, 420px)`,
            touchAction: "none",
          }}
        >
          {round.choices.map((item, i) => {
            const isAnswer = solved && item.emoji === gone.emoji;
            return (
              <button
                key={item.emoji}
                aria-label={item[ctx.locale]}
                onPointerDown={(e) => onChoice(e, i)}
                style={{
                  minHeight: TILE_MIN,
                  padding: "8px 4px",
                  border: "none",
                  borderRadius: 18,
                  display: "grid",
                  placeItems: "center",
                  gap: 2,
                  background: isAnswer ? "linear-gradient(180deg,#55efc4,#00b894)" : "var(--surface)",
                  color: "var(--text)",
                  boxShadow: "var(--shadow-1)",
                  cursor: "pointer",
                  touchAction: "none",
                }}
              >
                <span style={{ fontSize: "clamp(26px, 7vw, 42px)", lineHeight: 1 }}>
                  {item.emoji}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.1 }}>
                  {item[ctx.locale]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {solved && (
        <Button kids onClick={() => startRound(level)}>
          {t.next} ▶
        </Button>
      )}
    </div>
  );
}
