import { textFor } from "@i18n/index";
import { useCallback, useRef, useState, useEffect, type PointerEvent as ReactPointerEvent } from "react";
import type { GameContext } from "@sdk/index";
import { GameChrome } from "@ui/GameChrome";
import { type DifficultyOption } from "@ui/DifficultySelector";
import { burst, shake, haptic } from "@juice/index";
import { shuffle, winMoment, useRememberedLevel } from "@shared/index";
import { newGame, tapObject, isWon, targetIcons, type HiddenState } from "./logic";

// A big cast of DISTINCT characters (every icon unique so a target is never
// ambiguous). It has to be at least as large as the biggest crowd below, so the
// "hard" scene is a dense, Where's-Wally-style throng rather than a sparse one.
const CAST = [
  "🐶", "🐱", "🦊", "🐰", "🐻", "🐼", "🐨", "🐵", "🦁", "🐯", "🐸", "🐷",
  "🐔", "🐧", "🐦", "🦉", "🦄", "🐝", "🦋", "🐢", "🐙", "🦖", "🦕", "🐳",
  "🐌", "🐞", "🦔", "🦇", "🐴", "🐮", "🐗", "🦒", "🦓", "🦩", "🦜", "🐡",
  "🐠", "🐬", "🦈", "🐊", "🐍", "🐜", "🦗", "🕷️", "🦂", "🦀", "🦞", "🐚",
  "🐺", "🦝", "🦡", "🦫", "🦦", "🦥", "🐿️", "🦨", "🐹", "🐭", "🦇", "🦚",
].filter((v, i, a) => a.indexOf(v) === i); // keep it strictly distinct

type Difficulty = "easy" | "medium" | "hard";

// Difficulty controls BOTH the crowd size (slice of CAST) and the target count.
// Crowds are large on purpose - the whole point of the change is a busy scene.
const DIFFICULTIES: Record<Difficulty, { crowd: number; targets: number }> = {
  easy: { crowd: 24, targets: 3 },
  medium: { crowd: 40, targets: 4 },
  hard: { crowd: 56, targets: 5 },
};

const DIFF_OPTIONS: DifficultyOption<Difficulty>[] = [
  { id: "easy", label: { he: "קל", en: "Easy", es: "Fácil" } },
  { id: "medium", label: { he: "בינוני", en: "Med", es: "Media" } },
  { id: "hard", label: { he: "קשה", en: "Hard", es: "Difícil" } },
];

// Fresh random layout for a difficulty: a shuffled crowd slice + random targets.
function makeRound(difficulty: Difficulty): HiddenState {
  const cfg = DIFFICULTIES[difficulty];
  const crowd = shuffle(CAST).slice(0, cfg.crowd);
  return newGame(crowd, cfg.targets);
}

export function Hidden({ ctx }: { ctx: GameContext }) {
  // This game's own words. A locale RECORD, so promoting a language reds
  // this block by name instead of leaving the game speaking English
  // inside a page that is not.
  const T = textFor(
    {
      he: { found: "נמצאו", find: "מצאו:", done: (n: number) => `שלב ${n} הושלם! ממשיכים…` },
      en: { found: "Found", find: "Find:", done: (n: number) => `Level ${n} done! Next up…` },
      es: { found: "Encontrados", find: "Busca:", done: (n: number) => `¡Nivel ${n} completado! Vamos…` },
    },
    ctx.locale,
  );
  const [difficulty, setDifficulty] = useRememberedLevel(
    ctx,
    DIFF_OPTIONS.map((o) => o.id),
    "easy",
  );
  const [round, setRound] = useState(1);
  const [state, setState] = useState<HiddenState>(() => makeRound(difficulty));
  const [justWon, setJustWon] = useState(false);
  // Furthest round reached, per DIFFICULTY — the round counter resets to 1 on a
  // difficulty change, so a shared record would let an easy streak stand as the
  // record on hard, where a crowd is twice the size.
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best(difficulty));
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

  const foundCount = targets.filter((t) => t.found).length;
  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "layers", label: ctx.t("stage"), value: round, record: best ?? "-", compact: true },
        { icon: "check", label: T.found, value: `${foundCount}/${targets.length}`, ltr: true, compact: true },
      ]}
      levels={DIFF_OPTIONS}
      level={difficulty}
      onLevel={changeDifficulty}
      onRestart={reshuffle}
      // The target strip IS the question, and it has to stay readable while the
      // child is scanning the crowd - so it sits under the scene rather than
      // above it, where a thumb holding the tablet does not cover it.
      footer={
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "var(--radius-2)",
            boxShadow: "var(--shadow-1)",
            padding: "10px 12px",
            minHeight: 76,
            display: "flex",
            gap: 10,
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: "var(--text-dim)", fontSize: 13, fontWeight: 800 }}>
            {T.find}
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
                background: t.found ? "linear-gradient(180deg,#55efc4,#00cec9)" : "var(--surface-2)",
                opacity: t.found ? 0.6 : 1,
                position: "relative",
              }}
            >
              {t.icon}
              {t.found && (
                <span style={{ position: "absolute", right: 2, top: 0, fontSize: 16 }}>✅</span>
              )}
            </div>
          ))}
        </div>
      }
    >
      {/* The crowd */}
      <div
        ref={sceneRef}
        className="ellaz-play-surface"
        style={{
          position: "relative",
          width: "min(94vw, 58vh, 580px)",
          aspectRatio: "1 / 1.15",
          // A place rather than a void: sky over meadow, so the crowd reads as
          // a scene to search through (Where's-Wally), not icons on black.
          background:
            "linear-gradient(180deg,#cdeaff 0%,#dff1ff 46%,#bfe6a0 46%,#a6d987 100%)",
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
                border: found ? "3px solid #00b894" : "none",
                background: found ? "rgba(0,230,164,0.25)" : "transparent",
                fontSize: "clamp(17px, 4.4vw, 28px)",
                lineHeight: 1,
                padding: 1,
                borderRadius: 8,
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
            {T.done(round)}
          </div>
        </div>
      ) : null}
    </GameChrome>
  );
}
