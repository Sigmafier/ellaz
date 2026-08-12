import { textFor } from "@i18n/index";
import { useCallback, useMemo, useRef, useState, useEffect, type PointerEvent as ReactPointerEvent } from "react";
import type { GameContext, RewardTier } from "@sdk/index";
import { GameChrome } from "@ui/GameChrome";
import { burst, shake, haptic } from "@juice/index";
import { winMoment } from "@shared/index";
import { newGame, tapAt, isWon, remaining, type FindState } from "./logic";
import { SCENES, diffsOf, type Scene } from "./scenes";

// Scenes are authored easiest-first, so the scene's position IS its difficulty:
// the first third pays as easy, the last third as hard.
function tierForScene(idx: number): RewardTier {
  const third = SCENES.length / 3;
  if (idx < third) return "easy";
  if (idx < third * 2) return "medium";
  return "hard";
}

// Two pictures, spot the differences. Tap a difference on EITHER picture.
export function FindDiff({ ctx }: { ctx: GameContext }) {
  // This game's own words. A locale RECORD, so promoting a language reds
  // this block by name instead of leaving the game speaking English
  // inside a page that is not.
  const T = textFor(
    {
      he: { left: "נותרו", next: "הבא", ask: "מצאו את ההבדלים 🔍" },
      en: { left: "Left", next: "Next", ask: "Find the differences 🔍" },
      es: { left: "Faltan", next: "Siguiente", ask: "Encuentra las diferencias 🔍" },
    },
    ctx.locale,
  );
  const [sceneIdx, setSceneIdx] = useState(0);
  const [level, setLevel] = useState(1);
  const scene: Scene = SCENES[sceneIdx];
  const [state, setState] = useState<FindState>(() => newGame(diffsOf(scene)));
  const [won, setWon] = useState(false);
  // Furthest progress ever reached, counted in SCENES CLEARED rather than in
  // the Level shown above it. Level only bumps after a full pass through every
  // scene, so most players would carry a permanent record of 1 — a number that
  // says nothing about whether they got further this time. Scenes cleared moves
  // on every win, which is what "how far have I got" should mean here.
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best());
  const wrapRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      ctx.lifecycle.gameplayStart();
      ctx.analytics.levelStart(scene.id);
    }
  }, [ctx, scene.id]);

  const reset = useCallback(
    (idx = sceneIdx) => {
      setSceneIdx(idx);
      setState(newGame(diffsOf(SCENES[idx])));
      setWon(false);
      ctx.analytics.levelStart(SCENES[idx].id);
    },
    [ctx, sceneIdx],
  );

  // Win → advance to the next scene; wrapping past the last scene bumps the
  // Level counter, so progression is endless (Scene 1 again at Level +1).
  const advance = useCallback(() => {
    const nextIdx = (sceneIdx + 1) % SCENES.length;
    if (nextIdx === 0) setLevel((l) => l + 1);
    reset(nextIdx);
  }, [sceneIdx, reset]);

  const onTapPicture = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      ctx.audio.unlock();
      ctx.speech.unlock();
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      // Map client coords → scene (0..100) coords.
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const { state: ns, result } = tapAt(state, x, y);
      setState(ns);
      if (result.kind === "hit") {
        ctx.audio.play("success");
        haptic.success();
        burst(e.clientX, e.clientY, { count: 10 });
        if (isWon(ns)) {
          setWon(true);
          // `ms` is gone rather than replaced. It used to carry `ns.misses`,
          // which is not a duration — analytics.levelComplete() would have
          // logged a 3-miss round as a 3-millisecond one. This game keeps no
          // clock, so "not measured" is the honest answer.
          const cleared = (level - 1) * SCENES.length + sceneIdx + 1;
          const result = winMoment(ctx, {
            reason: "level_complete",
            tier: tierForScene(sceneIdx),
            level: scene.id,
            at: { x: e.clientX, y: e.clientY },
            score: { value: cleared, unit: "points" },
          });
          if (result.score) setBest(result.score.best);
        }
      } else if (result.kind === "miss") {
        ctx.audio.play("fail");
        if (wrapRef.current) shake(wrapRef.current, 4, 160);
      }
    },
    [ctx, state, scene.id, sceneIdx, level],
  );

  const markers = useMemo(
    () =>
      state.found
        .map((id) => scene.diffs.find((d) => d.id === id))
        .filter(Boolean)
        .map((d) => `<circle cx="${d!.cx}" cy="${d!.cy}" r="${d!.r}" fill="none" stroke="#00e0a4" stroke-width="2"/>`)
        .join(""),
    [state.found, scene],
  );

  const leftSvg = scene.base + scene.diffs.map((d) => d.left).join("") + markers;
  const rightSvg = scene.base + scene.diffs.map((d) => d.right).join("") + markers;

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "layers", label: ctx.t("stage"), value: level },
        { icon: "check", label: T.left, value: remaining(state) },
        { icon: "trophy", label: ctx.t("best"), value: best ?? "-" },
      ]}
      // finddiff has no difficulty - it is one endless ladder of scenes, so the
      // toggle is simply absent rather than showing a single dead option.
      onRestart={() => reset()}
      footer={
        won ? (
          <button
            type="button"
            onClick={advance}
            style={{
              width: "100%",
              minHeight: 68,
              border: "none",
              borderRadius: "var(--radius-2)",
              background: "var(--brand)",
              color: "#fff",
              boxShadow: "var(--shadow-1)",
              fontFamily: "Fredoka, inherit",
              fontSize: 22,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            🎉 {T.next} ▶
          </button>
        ) : (
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "var(--radius-2)",
              boxShadow: "var(--shadow-1)",
              padding: "13px 12px",
              minHeight: 60,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              textAlign: "center",
            }}
          >
            <b style={{ fontSize: 17, fontFamily: "Fredoka, inherit" }}>{scene.name[ctx.locale]}</b>
            <span style={{ color: "var(--text-dim)", fontSize: 13 }}>
              {T.ask}
            </span>
          </div>
        )
      }
    >
      {/* wrapRef lives HERE, on the picture pair, because that is what shakes on
          a wrong tap. It used to sit on the outer wrapper this component no
          longer owns - and an unattached ref shakes nothing while the guard
          around it (`if (wrapRef.current)`) keeps every test green. */}
      <div
        ref={wrapRef}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          width: "min(94vw, 116vh, 640px)",
        }}
      >
        {[leftSvg, rightSvg].map((svg, i) => (
          <svg
            key={i}
            viewBox={scene.viewBox}
            className="ellaz-play-surface"
            onPointerDown={onTapPicture}
            style={{
              width: "100%",
              aspectRatio: "1",
              background: "#fff",
              borderRadius: 14,
              boxShadow: "var(--shadow-1)",
              touchAction: "none",
              cursor: "pointer",
            }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ))}
      </div>
    </GameChrome>
  );
}
