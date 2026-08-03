import { useCallback, useRef, useState, useEffect, type PointerEvent as ReactPointerEvent } from "react";
import type { GameContext } from "@sdk/index";
import { Button, Stat } from "@ui/components";
import { DifficultySelector, type DifficultyOption } from "@ui/DifficultySelector";
import { burst, shake, haptic } from "@juice/index";
import { shuffle, winMoment } from "@shared/index";
import { newGame, tapObject, isWon, targetIcons, type HiddenState } from "./logic";

// A big cast of original characters (>=34 distinct so "hard" has a full crowd);
// find the ones on the target strip.
const CAST = [
  "🐶", "🐱", "🦊", "🐰", "🐻", "🐼", "🐨", "🐵", "🦁", "🐯", "🐸", "🐷",
  "🐔", "🐧", "🐦", "🦉", "🦄", "🐝", "🦋", "🐢", "🐙", "🦖", "🦕", "🐳",
  "🐌", "🐞", "🦔", "🦇", "🐴", "🐮", "🐗", "🦒", "🦓", "🦩", "🦜", "🐡",
];

type Difficulty = "easy" | "medium" | "hard";

// Difficulty controls BOTH the crowd size (slice of CAST) and the target count.
const DIFFICULTIES: Record<Difficulty, { crowd: number; targets: number }> = {
  easy: { crowd: 16, targets: 3 },
  medium: { crowd: 24, targets: 4 },
  hard: { crowd: 32, targets: 5 },
};

const DIFF_OPTIONS: DifficultyOption<Difficulty>[] = [
  { id: "easy", label: { he: "קל", en: "Easy" } },
  { id: "medium", label: { he: "בינוני", en: "Med" } },
  { id: "hard", label: { he: "קשה", en: "Hard" } },
];

// Fresh random layout for a difficulty: a shuffled crowd slice + random targets.
function makeRound(difficulty: Difficulty): HiddenState {
  const cfg = DIFFICULTIES[difficulty];
  const crowd = shuffle(CAST).slice(0, cfg.crowd);
  return newGame(crowd, cfg.targets);
}

export function Hidden({ ctx }: { ctx: GameContext }) {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [round, setRound] = useState(1);
  const [state, setState] = useState<HiddenState>(() => makeRound("easy"));
  const [justWon, setJustWon] = useState(false);
  // Furthest round reached, per DIFFICULTY — the round counter resets to 1 on a
  // difficulty change, so a shared record would let an easy streak stand as the
  // record on hard, where a crowd is twice the size.
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best("easy"));
  const sceneRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      ctx.lifecycle.gameplayStart();
      ctx.analytics.levelStart("crowd");
    }
  }, [ctx]);

  // Clear any pending auto-advance timer on unmount.
  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  // Restart the CURRENT round (new layout, same difficulty + round counter).
  const reshuffle = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setState(makeRound(difficulty));
    setJustWon(false);
    ctx.analytics.levelStart("crowd");
  }, [ctx, difficulty]);

  // Switch difficulty — resets progression to round 1.
  const changeDifficulty = useCallback(
    (d: Difficulty) => {
      if (d === difficulty) return;
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      setDifficulty(d);
      setRound(1);
      setState(makeRound(d));
      setJustWon(false);
      setBest(ctx.score?.best(d));
      ctx.analytics.levelStart("crowd");
    },
    [ctx, difficulty],
  );

  const onObject = useCallback(
    (id: string, e: ReactPointerEvent) => {
      ctx.audio.unlock();
      ctx.speech.unlock();
      const { state: ns, result } = tapObject(state, id);
      if (result.kind === "found") {
        setState(ns);
        ctx.audio.play("success");
        haptic.success();
        burst(e.clientX, e.clientY, { count: 10 });
        if (isWon(ns)) {
          setJustWon(true);
          const result = winMoment(ctx, {
            reason: "level_complete",
            tier: difficulty,
            level: "crowd",
            at: { x: e.clientX, y: e.clientY },
            score: { value: round, unit: "points", board: difficulty },
          });
          if (result.score) setBest(result.score.best);
          // Auto-advance to the next endless round, keeping difficulty.
          advanceTimer.current = setTimeout(() => {
            setRound((r) => r + 1);
            setState(makeRound(difficulty));
            setJustWon(false);
            ctx.analytics.levelStart("crowd");
          }, 1100);
        }
      } else if (result.kind === "not-target") {
        ctx.audio.play("tap");
        if (sceneRef.current) shake(sceneRef.current, 3, 130);
      }
    },
    // `round` is read for the score. It is in here deliberately: without it the
    // handler would only refresh because `state` happens to change on every
    // tap, which is luck rather than correctness.
    [ctx, state, difficulty, round],
  );

  const targets = targetIcons(state);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 12 }}>
      {/* Level indicator + difficulty selector */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        <Stat label={ctx.locale === "he" ? "שלב" : "Level"} value={round} />
        <Stat label={ctx.t("best")} value={best ?? "-"} />
        <DifficultySelector
          options={DIFF_OPTIONS}
          value={difficulty}
          onChange={changeDifficulty}
          locale={ctx.locale}
          kids
        />
      </div>

      {/* Target strip: the characters to find */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        <span style={{ color: "var(--text-dim)", fontSize: 14 }}>
          {ctx.locale === "he" ? "מצאו:" : "Find:"}
        </span>
        {targets.map((t) => (
          <div
            key={t.id}
            style={{
              width: 52,
              height: 52,
              display: "grid",
              placeItems: "center",
              fontSize: 30,
              borderRadius: 12,
              background: t.found ? "linear-gradient(180deg,#55efc4,#00cec9)" : "var(--surface)",
              opacity: t.found ? 0.6 : 1,
              boxShadow: "var(--shadow-1)",
              position: "relative",
            }}
          >
            {t.icon}
            {t.found && (
              <span style={{ position: "absolute", right: 2, top: 0, fontSize: 16 }}>✅</span>
            )}
          </div>
        ))}
        <Button variant="ghost" kids ariaLabel="new layout" onClick={reshuffle}>
          🔄
        </Button>
      </div>

      {/* The crowd */}
      <div
        ref={sceneRef}
        className="ellaz-play-surface"
        style={{
          position: "relative",
          width: "min(94vw, 54vh, 560px)",
          aspectRatio: "1 / 1.1",
          background: "radial-gradient(circle at 50% 30%, #2b3170, #1a1e3f)",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "var(--shadow-2)",
          touchAction: "none",
        }}
      >
        {state.placed.map((o) => {
          const found = state.found.includes(o.id);
          return (
            <button
              key={o.id}
              aria-label="character"
              onPointerDown={(e) => onObject(o.id, e)}
              style={{
                position: "absolute",
                left: `${o.x}%`,
                top: `${o.y}%`,
                transform: "translate(-50%, -50%)",
                border: found ? "3px solid #00e0a4" : "none",
                background: "transparent",
                fontSize: "clamp(24px, 6vw, 34px)",
                lineHeight: 1,
                padding: 2,
                borderRadius: 10,
              }}
            >
              {o.icon}
            </button>
          );
        })}
      </div>

      {justWon ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>🎉</div>
          <div style={{ color: "var(--text-dim)", fontSize: 13 }}>
            {ctx.locale === "he" ? `שלב ${round} הושלם! ממשיכים…` : `Level ${round} done! Next up…`}
          </div>
        </div>
      ) : (
        <div style={{ color: "var(--text-dim)", fontSize: 13 }}>
          {ctx.locale === "he" ? "איפה הם מתחבאים? 👀" : "Where are they hiding? 👀"}
        </div>
      )}
    </div>
  );
}
