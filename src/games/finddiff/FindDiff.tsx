import { textFor } from "@i18n/index";
import { useCallback, useMemo, useRef, useState, useEffect, type PointerEvent as ReactPointerEvent } from "react";
import type { GameContext, RewardTier } from "@sdk/index";
import { GameChrome } from "@ui/GameChrome";
import { BOARD_CLASS, boardVars } from "@ui/boardSize";
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
        { icon: "layers", label: ctx.t("stage"), value: level, record: best ?? "-", compact: true },
        { icon: "check", label: T.left, value: remaining(state), compact: true },
      ]}
      // finddiff has no difficulty - it is one endless ladder of scenes, so the
      // toggle is simply absent rather than showing a single dead option.
      onRestart={() => reset()}
      // The scene gallery is a PICKER: under the board on a phone, in the column
      // on the board's other side on a PC, where it wraps instead of running
      // past the window edge (GameChrome `side`, measured 2026-09-14).
      side={
        <div style={{ paddingBottom: 8 }}>
          <div className="ellaz-strip" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
            {SCENES.map((s, i) => {
              const active = i === sceneIdx;
              return (
                <button
                  key={s.id}
                  aria-label={s.name[ctx.locale]}
                  aria-pressed={active}
                  onClick={() => {
                    ctx.audio.play("tap");
                    reset(i);
                  }}
                  style={{
                    flex: "0 0 auto",
                    width: 52,
                    height: 52,
                    padding: 3,
                    borderRadius: 10,
                    border: active ? "3px solid var(--brand)" : "2px solid var(--line)",
                    background: "#fff",
                    boxShadow: active ? "var(--shadow-2)" : "var(--shadow-1)",
                    cursor: "pointer",
                  }}
                >
                  <svg
                    viewBox={s.viewBox}
                    width="100%"
                    height="100%"
                    style={{ display: "block", borderRadius: 6 }}
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{ __html: s.base + s.diffs.map((d) => d.left).join("") }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      }
      footer={
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {won ? (
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
          )}
        </div>
      }
    >
      {/* wrapRef lives HERE, on the picture pair, because that is what shakes on
          a wrong tap. It used to sit on the outer wrapper this component no
          longer owns - and an unattached ref shakes nothing while the guard
          around it (`if (wrapRef.current)`) keeps every test green. */}
      {/* THE PAIR, on both shapes (2026-09-14, operator: every game has a PC
          version). Side by side on a phone and on a PC, as it always was.

          PHONE - byte-identical: `min(94vw, 116vh, 640px)`, now declared through
          `boardVars` so `.ellaz-board` resolves the same `min()`.
          PC - sized from the height the window leaves, NOT stretched to the
          width. Each picture is a square scene (`viewBox` 0 0 100 100) with
          `aspectRatio: 1`, so the only honest way to make it bigger is taller:
          ratio 2 makes the pair twice the available height wide, and each square
          then stands 5px short of that height (the 10px gap, halved). Full width
          would mean either distorted scenes or dead space, and the pictures
          would still be the size the height allows. The difference count and
          every tap radius are in scene units, so nothing about a round changes.

          `chrome` is an ESTIMATE (2026-09-14) read off the phone frame baseline
          (444 frame - 178 picture); the page measures it and corrects it. */}
      <div
        ref={wrapRef}
        className={BOARD_CLASS}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          ...boardVars({ vw: 94, vh: 116, cap: 640, chrome: 111, ratio: 2 }),
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
