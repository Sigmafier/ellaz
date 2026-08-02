import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { GameContext } from "@sdk/index";
import { Stat } from "@ui/components";
import { DifficultySelector, type DifficultyOption } from "@ui/DifficultySelector";
import { burst, shake, haptic } from "@juice/index";
import { winMoment } from "@shared/index";
import { generateProblem, isCorrect, type MathLevel, type Problem } from "./logic";

// Difficulty options in display order, with bilingual labels.
const LEVEL_OPTIONS: DifficultyOption<MathLevel>[] = [
  { id: "up5", label: { he: "עד 5", en: "Up to 5" } },
  { id: "up10", label: { he: "עד 10", en: "Up to 10" } },
  { id: "up20", label: { he: "עד 20", en: "Up to 20" } },
  { id: "mult", label: { he: "כפל", en: "Times ×" } },
];

export function MathGame({ ctx }: { ctx: GameContext }) {
  const [level, setLevel] = useState<MathLevel>("up10");
  const [problem, setProblem] = useState<Problem>(() => generateProblem("up10"));
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(() => ctx.storage.get("best", 0));
  const [wrongChoice, setWrongChoice] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const streakRef = useRef(0); // authoritative streak for side-effects (no stale closure)
  // The best at the START of this run, plus a once-per-run latch. Without the
  // latch a first-time player sets a "new best" on every single answer (1 > 0,
  // 2 > 1, …) and mints a personal-best reward each time; one record per run is
  // the honest reading of "beat your own record".
  const bestRef = useRef(best);
  const bestFiredRef = useRef(false);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      ctx.lifecycle.gameplayStart();
      ctx.analytics.levelStart("addsub10");
    }
  }, [ctx]);

  const next = useCallback(() => {
    setProblem(generateProblem(level));
    setWrongChoice(null);
  }, [level]);

  // Switching difficulty starts a clean run at the new level.
  const chooseLevel = useCallback((lvl: MathLevel) => {
    setLevel(lvl);
    streakRef.current = 0;
    bestFiredRef.current = false;
    setScore(0);
    setStreak(0);
    setWrongChoice(null);
    setProblem(generateProblem(lvl));
  }, []);

  const answer = useCallback(
    (choice: number, e: ReactPointerEvent) => {
      ctx.audio.unlock();
      ctx.speech.unlock();
      if (isCorrect(problem, choice)) {
        const ns = streakRef.current + 1;
        streakRef.current = ns;
        ctx.audio.play("success");
        haptic.success();
        burst(e.clientX, e.clientY, { count: 12 });
        setScore((s) => s + 1);
        setStreak(ns);
        const at = { x: e.clientX, y: e.clientY };
        if (ns > bestRef.current) {
          bestRef.current = ns;
          ctx.storage.set("best", ns);
          setBest(ns);
          if (!bestFiredRef.current) {
            bestFiredRef.current = true;
            winMoment(ctx, { reason: "personal_best", level: `streak-${ns}`, at, confetti: false });
          }
        }
        // Reward side-effects live in the handler (not a state updater) so they
        // fire once, reliably, on every 5-in-a-row.
        if (ns % 5 === 0) {
          winMoment(ctx, { reason: "milestone", level: `streak-${ns}`, at, confetti: false });
        }
        // The per-answer analytics event is NOT the reward trigger — see above.
        ctx.analytics.levelComplete("addsub10", 0);
        next();
      } else {
        // Gentle: shake the wrong answer, reset streak, let them try again.
        streakRef.current = 0;
        ctx.audio.play("fail");
        haptic.fail();
        setStreak(0);
        setWrongChoice(choice);
        if (cardRef.current) shake(cardRef.current, 5, 200);
        ctx.analytics.levelFail("addsub10", "wrong");
      }
    },
    [ctx, problem, next],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, padding: 16 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <Stat label={ctx.locale === "he" ? "נקודות" : "Score"} value={score} />
        <Stat label={ctx.locale === "he" ? "רצף" : "Streak"} value={`${streak} 🔥`} />
        <Stat label={ctx.t("best")} value={best} />
      </div>

      <DifficultySelector
        options={LEVEL_OPTIONS}
        value={level}
        onChange={chooseLevel}
        locale={ctx.locale}
      />

      <div
        ref={cardRef}
        style={{
          background: "linear-gradient(180deg,#2b3170,#1c2150)",
          borderRadius: 24,
          padding: "28px 24px",
          minWidth: "min(88vw, 360px)",
          textAlign: "center",
          boxShadow: "var(--shadow-2)",
        }}
      >
        <div
          dir="ltr"
          style={{
            fontSize: "clamp(44px, 15vw, 84px)",
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: 2,
          }}
        >
          {problem.a} {problem.op} {problem.b} = <span style={{ color: "var(--yellow)" }}>?</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
        {problem.choices.map((c) => {
          const isWrong = wrongChoice === c;
          return (
            <button
              key={c}
              aria-label={`answer ${c}`}
              onPointerDown={(e) => answer(c, e)}
              style={{
                width: "var(--tap-kids)",
                height: "var(--tap-kids)",
                minWidth: 72,
                minHeight: 72,
                border: "none",
                borderRadius: 20,
                background: isWrong ? "var(--red)" : "linear-gradient(180deg,var(--brand-2),var(--brand))",
                color: "#fff",
                fontSize: 34,
                fontWeight: 800,
                boxShadow: "var(--shadow-1)",
              }}
            >
              {c}
            </button>
          );
        })}
      </div>

      <div style={{ color: "var(--text-dim)", fontSize: 14 }}>
        {ctx.locale === "he"
          ? `בחרו את התשובה הנכונה ${level === "mult" ? "✖️" : "➕➖"}`
          : `Tap the right answer ${level === "mult" ? "✖️" : "➕➖"}`}
      </div>
    </div>
  );
}
