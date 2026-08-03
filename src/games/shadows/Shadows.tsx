import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { GameContext } from "@sdk/index";
import { Button, DifficultySelector, Stat, type DifficultyOption } from "@ui/index";
import { burst, haptic, shake } from "@juice/index";
import { Prompt, winMoment } from "@shared/index";
import { isCorrect, newRound, type Difficulty, type ShadowChoice, type ShadowRound } from "./logic";

// THE SILHOUETTE IS A `filter`, NOT AN ASSET. An emoji is a COLOUR glyph, so
// `brightness(0)` is what collapses it to solid black while keeping its exact
// outline and its transparency — no second art pipeline, and it works for all
// 58 glyphs in the cast at once. Verified by eye at :5181, not by reasoning: a
// silhouette that is secretly still colourful makes the game trivial, and that
// failure is completely invisible from the code.
//
// It is drawn on a LIGHT plate on purpose. The app is dark (`--bg: #0f1226`),
// and black-on-near-black is not a shadow, it is nothing.
const SILHOUETTE = "brightness(0)";

const DIFF_OPTIONS: DifficultyOption<Difficulty>[] = [
  { id: "easy", label: { he: "קל", en: "Easy" } },
  { id: "medium", label: { he: "בינוני", en: "Med" } },
  { id: "hard", label: { he: "קשה", en: "Hard" } },
];

// Kids targets: the `max(72px, …)` floor keeps every tile above the ~2cm rule
// even on a small phone, while the `min()` lets it grow on a tablet.
const TILE = "max(72px, min(22vw, 15vh, 108px))";
const TILE_GLYPH = "max(38px, min(13vw, 9vh, 60px))";
const PLATE = "max(150px, min(66vw, 32vh, 300px))";
const PLATE_GLYPH = "max(96px, min(42vw, 20vh, 190px))";

export function Shadows({ ctx }: { ctx: GameContext }) {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [level, setLevel] = useState(1);
  const [round, setRound] = useState<ShadowRound>(() => newRound("easy"));
  const [solved, setSolved] = useState(false);
  // Furthest level reached, per DIFFICULTY — the level counter resets to 1 on a
  // difficulty change, so a shared record would let an easy streak stand as the
  // record on hard, where the choices are a harder read.
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best("easy"));

  // The double-grant guard. `solved` is state and therefore stale inside a
  // handler that fires twice in one tick; a ref is read at call time, so two
  // fast taps cannot bank the same win twice.
  const lockRef = useRef(false);
  const startedAt = useRef(Date.now());
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      ctx.lifecycle.gameplayStart();
      ctx.analytics.levelStart("shadows");
    }
  }, [ctx]);

  // Never leave a timer pointing at an unmounted tree.
  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );

  const deal = useCallback(
    (d: Difficulty) => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      setRound(newRound(d));
      setSolved(false);
      lockRef.current = false;
      startedAt.current = Date.now();
      ctx.analytics.levelStart("shadows");
    },
    [ctx],
  );

  /** Another round at the same difficulty, same level number. */
  const reshuffle = useCallback(() => deal(difficulty), [deal, difficulty]);

  const changeDifficulty = useCallback(
    (d: Difficulty) => {
      if (d === difficulty) return;
      setDifficulty(d);
      setLevel(1);
      setBest(ctx.score?.best(d));
      deal(d);
    },
    [ctx, deal, difficulty],
  );

  const onChoice = useCallback(
    (choice: ShadowChoice, e: ReactPointerEvent<HTMLButtonElement>) => {
      if (lockRef.current) return;
      // Inside the gesture, so iOS opens both gates.
      ctx.audio.unlock();
      ctx.speech.unlock();

      if (!isCorrect(round, choice.id)) {
        // A wrong tap is a gentle nudge and nothing else: no score loss, no
        // "you lost", no state change at all. This platform has no losing.
        ctx.audio.play("tap");
        haptic.tap();
        shake(e.currentTarget, 5, 150);
        return;
      }

      lockRef.current = true;
      setSolved(true);
      ctx.audio.play("success");
      haptic.success();
      burst(e.clientX, e.clientY, { count: 12 });
      // Fired from the HANDLER, never from inside a setState updater: React may
      // run an updater twice, and that would double-grant a real coin.
      // `level` here is the level being COMPLETED — it is bumped later, inside
      // the advance timer below — so it is the right number to record.
      const won = winMoment(ctx, {
        reason: "level_complete",
        tier: difficulty,
        level: `${difficulty}-${level}`,
        at: { x: e.clientX, y: e.clientY },
        ms: Date.now() - startedAt.current,
        score: { value: level, unit: "points", board: difficulty },
      });
      if (won.score) setBest(won.score.best);
      advanceTimer.current = setTimeout(() => {
        setLevel((n) => n + 1);
        deal(difficulty);
      }, 1100);
    },
    [ctx, round, difficulty, level, deal],
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        padding: 12,
      }}
    >
      <Prompt
        ctx={ctx}
        glyph="🌑"
        text={ctx.locale === "he" ? "איזו תמונה מתאימה לצל?" : "Which picture matches the shadow?"}
      />

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Stat label={ctx.locale === "he" ? "שלב" : "Level"} value={level} />
        <Stat label={ctx.t("best")} value={best ?? "-"} />
        <DifficultySelector
          options={DIFF_OPTIONS}
          value={difficulty}
          onChange={changeDifficulty}
          locale={ctx.locale}
          kids
        />
        <Button variant="ghost" kids ariaLabel="new round" onClick={reshuffle}>
          🔄
        </Button>
      </div>

      {/* The shadow, on its light plate. */}
      <div
        className="ellaz-play-surface"
        style={{
          width: PLATE,
          height: PLATE,
          display: "grid",
          placeItems: "center",
          borderRadius: 26,
          background: "linear-gradient(180deg, #ffffff, #ccd6ea)",
          boxShadow: "var(--shadow-2)",
          touchAction: "none",
        }}
      >
        <span
          aria-hidden="true"
          style={{ fontSize: PLATE_GLYPH, lineHeight: 1, filter: SILHOUETTE }}
        >
          {round.answerEmoji}
        </span>
      </div>

      {/* The pictures. `dir="ltr"` because this row is SPATIAL: the app is
          Hebrew-RTL by default, which would mirror the tiles away from the
          order the logic dealt them.

          An explicit column count, not `flex-wrap`. Wrapping put four tiles as
          3+1 on a phone (measured at 420px) — the fourth picture stranded on its
          own line reads as less of an option than the other three, which is a
          fairness problem, not a cosmetic one. Two rows of two is balanced at
          every width. */}
      <div
        dir="ltr"
        className="ellaz-play-surface"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${round.choices.length === 4 ? 2 : round.choices.length}, ${TILE})`,
          gap: 12,
          justifyContent: "center",
          touchAction: "none",
        }}
      >
        {round.choices.map((c) => {
          const isAnswer = solved && c.id === round.answerId;
          return (
            <button
              key={c.id}
              aria-label={ctx.locale === "he" ? c.he : c.en}
              onPointerDown={(e) => onChoice(c, e)}
              style={{
                width: TILE,
                height: TILE,
                display: "grid",
                placeItems: "center",
                padding: 0,
                fontSize: TILE_GLYPH,
                lineHeight: 1,
                borderRadius: 20,
                border: `4px solid ${isAnswer ? "var(--green)" : "transparent"}`,
                background: "var(--surface)",
                boxShadow: "var(--shadow-1)",
                touchAction: "none",
              }}
            >
              {c.emoji}
            </button>
          );
        })}
      </div>

      {solved ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>🎉</div>
          <div style={{ color: "var(--text-dim)", fontSize: 13 }}>
            {ctx.locale === "he" ? `יפה! ממשיכים לשלב ${level + 1}…` : `Nice! On to level ${level + 1}…`}
          </div>
        </div>
      ) : (
        <div style={{ color: "var(--text-dim)", fontSize: 13 }}>
          {ctx.locale === "he" ? "מי מסתתר בצל? 🕵️" : "Who is hiding in the shadow? 🕵️"}
        </div>
      )}
    </div>
  );
}
