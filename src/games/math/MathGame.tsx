import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { textFor, type Locale } from "@i18n/index";
import type { GameContext } from "@sdk/index";
import { GameChrome } from "@ui/GameChrome";
import { type DifficultyOption } from "@ui/DifficultySelector";
import { burst, shake, haptic } from "@juice/index";
import { winMoment, useRememberedLevel } from "@shared/index";
import { generateProblem, isCorrect, type MathLevel, type Problem } from "./logic";

// Two rows, because the seven levels are two different games for two different
// ages. The pre-arithmetic row asks nothing a four-year-old cannot answer by
// counting pictures; the number row needs numerals. Both rows are the shared
// <DifficultySelector> and both drive the same `level` state, so whichever row
// does not hold the current level simply shows no highlighted button.
// ONE ordered ramp: the three pre-number modes a child plays before they can
// read a numeral, then the four arithmetic levels. This was two
// <DifficultySelector> rows, seven pills, because seven do not fit a phone.
// The chrome's toggle shows only the current one, so the split is gone - and
// the order is now the actual teaching order rather than two unranked groups.
const LEVEL_OPTIONS: DifficultyOption<MathLevel>[] = [
  { id: "count", label: { he: "ספירה", en: "Count" } },
  { id: "match", label: { he: "התאמה", en: "Match" } },
  { id: "visual", label: { he: "תמונות", en: "Pictures" } },
  { id: "up5", label: { he: "עד 5", en: "Up to 5" } },
  { id: "up10", label: { he: "עד 10", en: "Up to 10" } },
  { id: "up20", label: { he: "עד 20", en: "Up to 20" } },
  { id: "mult", label: { he: "כפל", en: "Times ×" } },
];

// Bottom-of-screen hint, per mode.
const HINTS: Record<Problem["mode"], Record<Locale, string>> = {
  arith: { he: "בחרו את התשובה הנכונה", en: "Tap the right answer" },
  count: { he: "כמה יש? בחרו את המספר", en: "How many? Tap the number" },
  match: { he: "בחרו את הקבוצה עם המספר הזה", en: "Tap the group with that many" },
  visual: { he: "ספרו את התמונות ובחרו את המספר", en: "Count the pictures, tap the number" },
};

/**
 * A group of `n` glyphs, wrapped at five per row so a child can count it at a
 * glance instead of scanning one long line. Pinned `dir="ltr"` like every other
 * spatial arrangement in this RTL app.
 */
function GlyphGroup({ n, glyph, size }: { n: number; glyph?: string; size: string }) {
  if (!glyph || n <= 0) return null;
  return (
    <div
      dir="ltr"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(n, 5)}, auto)`,
        gap: "0.12em",
        justifyContent: "center",
        fontSize: size,
        lineHeight: 1.15,
      }}
    >
      {Array.from({ length: n }, (_, i) => (
        <span key={i} aria-hidden="true">
          {glyph}
        </span>
      ))}
    </div>
  );
}

export function MathGame({ ctx }: { ctx: GameContext }) {
  // This game's own words. A locale RECORD, so promoting a language reds
  // this block by name instead of leaving the game speaking English
  // inside a page that is not.
  const T = textFor(
    { he: { streak: "רצף" }, en: { streak: "Streak" } },
    ctx.locale,
  );
  const [level, setLevel] = useRememberedLevel(ctx, LEVEL_OPTIONS.map((o) => o.id), "up10");
  const [problem, setProblem] = useState<Problem>(() => generateProblem(level));
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(() => ctx.score?.best() ?? 0);
  const [wrongChoice, setWrongChoice] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const streakRef = useRef(0); // authoritative streak for side-effects (no stale closure)
  // A once-per-run latch over the score port's verdict. Without it a first-time
  // player sets a "new best" on every single answer (1 > 0, 2 > 1, …) and mints
  // a personal-best reward each time; one record per run is the honest reading
  // of "beat your own record".
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
        if (ctx.score?.report({ value: ns, unit: "points" }).isPersonalBest) {
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
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "bolt", label: ctx.t("score"), value: score },
        { icon: "check", label: T.streak, value: `${streak} 🔥` },
        { icon: "trophy", label: ctx.t("best"), value: best },
      ]}
      levels={LEVEL_OPTIONS}
      level={level}
      onLevel={chooseLevel}
      onRestart={() => chooseLevel(level)}
      footer={
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "var(--radius-2)",
            boxShadow: "var(--shadow-1)",
            padding: "13px 12px",
            minHeight: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <b style={{ fontSize: 17, fontFamily: "Fredoka, inherit" }}>
            {HINTS[problem.mode][ctx.locale]}{" "}
            {problem.mode === "arith" ? (level === "mult" ? "✖️" : "➕➖") : problem.glyph}
          </b>
        </div>
      }
    >
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
        {/*
          Every question is pinned dir="ltr". For the equation that is standard
          notation in an RTL app; for the two-group visual sum it is load-bearing
          in the same way - otherwise RTL mirrors the row and 3 + 2 is drawn as
          2 + 3, which is a different (and for subtraction, unanswerable) sum.
        */}
        {problem.mode === "arith" && (
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
        )}

        {problem.mode === "count" && (
          <GlyphGroup n={problem.groups[0]} glyph={problem.glyph} size="clamp(30px, 9vw, 52px)" />
        )}

        {/* Matching: the numeral IS the question, and the groups are the buttons. */}
        {problem.mode === "match" && (
          <div
            dir="ltr"
            style={{
              fontSize: "clamp(56px, 20vw, 104px)",
              fontWeight: 800,
              lineHeight: 1.1,
              color: "var(--yellow)",
            }}
          >
            {problem.answer}
          </div>
        )}

        {problem.mode === "visual" && (
          <div
            dir="ltr"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: 10,
              fontSize: "clamp(28px, 9vw, 46px)",
              fontWeight: 800,
              lineHeight: 1.1,
            }}
          >
            <GlyphGroup n={problem.a} glyph={problem.glyph} size="clamp(24px, 7vw, 40px)" />
            <span>{problem.op}</span>
            <GlyphGroup n={problem.b} glyph={problem.glyph} size="clamp(24px, 7vw, 40px)" />
            <span>=</span>
            <span style={{ color: "var(--yellow)" }}>?</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
        {problem.choices.map((c) => {
          const isWrong = wrongChoice === c;
          // In matching mode the buttons ARE the groups, so they need room for
          // up to six glyphs. Both shapes stay well past the 64px kids target.
          const isGroup = problem.choiceKind === "group";
          return (
            <button
              key={c}
              aria-label={`answer ${c}`}
              onPointerDown={(e) => answer(c, e)}
              style={{
                width: isGroup ? "auto" : "var(--tap-kids)",
                height: isGroup ? "auto" : "var(--tap-kids)",
                minWidth: isGroup ? 96 : 72,
                minHeight: 72,
                padding: isGroup ? "12px 14px" : 0,
                border: "none",
                borderRadius: 20,
                background: isWrong ? "var(--red)" : "linear-gradient(180deg,var(--brand-2),var(--brand))",
                color: "#fff",
                fontSize: 34,
                fontWeight: 800,
                boxShadow: "var(--shadow-1)",
              }}
            >
              {isGroup ? <GlyphGroup n={c} glyph={problem.glyph} size="clamp(18px, 5vw, 26px)" /> : c}
            </button>
          );
        })}
      </div>
    </GameChrome>
  );
}
