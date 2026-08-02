import { useCallback, useMemo, useRef, useState, useEffect, type PointerEvent as ReactPointerEvent } from "react";
import type { GameContext, RewardTier } from "@sdk/index";
import { Button, Stat } from "@ui/components";
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
  const [sceneIdx, setSceneIdx] = useState(0);
  const [level, setLevel] = useState(1);
  const scene: Scene = SCENES[sceneIdx];
  const [state, setState] = useState<FindState>(() => newGame(diffsOf(scene)));
  const [won, setWon] = useState(false);
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
          winMoment(ctx, {
            reason: "level_complete",
            tier: tierForScene(sceneIdx),
            level: scene.id,
            ms: ns.misses,
            at: { x: e.clientX, y: e.clientY },
          });
        }
      } else if (result.kind === "miss") {
        ctx.audio.play("fail");
        if (wrapRef.current) shake(wrapRef.current, 4, 160);
      }
    },
    [ctx, state, scene.id, sceneIdx],
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
    <div ref={wrapRef} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: 12 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Stat label={ctx.locale === "he" ? "שלב" : "Level"} value={level} />
        <Stat label={ctx.locale === "he" ? "נותרו" : "Left"} value={remaining(state)} />
        <div style={{ fontWeight: 800 }}>{scene.name[ctx.locale]}</div>
        <Button variant="ghost" kids ariaLabel="restart" onClick={() => reset()}>
          🔄
        </Button>
      </div>

      <div
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

      {won ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>🎉</div>
          <Button kids onClick={advance}>
            ▶
          </Button>
        </div>
      ) : (
        <div style={{ color: "var(--text-dim)", fontSize: 13 }}>
          {ctx.locale === "he" ? "מצאו את ההבדלים 🔍" : "Find the differences 🔍"}
        </div>
      )}
    </div>
  );
}
