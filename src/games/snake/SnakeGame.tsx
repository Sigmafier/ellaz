import { useEffect, useRef, useState } from "react";
import type { GameContext } from "@sdk/index";
import { GameChrome } from "@ui/GameChrome";
import { type DifficultyOption } from "@ui/DifficultySelector";
// The MODULE, not the `@shared/index` barrel — sanctioned by that barrel's own
// header, and deliberate here. Snake is the only game importing none of
// `@shared`, and pulling the barrel in for one hook would drag `spawn`,
// `Prompt` and the rest of it along for the ride.
import { useRememberedLevel } from "@shared/useRememberedLevel";
// TYPE-ONLY, and that is load-bearing. Importing one VALUE from this module
// (it was `SPEED_KEYS`, for a decorative exhaustiveness check) makes the static
// import real, and Rollup then refuses to move the module behind the dynamic
// `import()` below - it says so out loud: "dynamically imported ... but also
// statically imported ... will not move module into another chunk". The scene
// pulls Phaser, so that one convenience import un-deferred 380 KB of engine
// while every comment here still claimed it was lazy.
import type { SnakeStatus, SpeedKey } from "./SnakeScene";

// The one Phaser game in the roster, wearing the same chrome as the other
// twenty. Its score, level and speed used to be drawn INSIDE the canvas at
// 20px in a corner, and its speed picker was three Phaser text buttons that
// only existed on the ready screen - so it was the one game where "restart"
// and "change difficulty" were unreachable once a run had started.
//
// React owns the chrome, Phaser owns the canvas, and the scene is the single
// source of truth for every number: it publishes on each `draw`, and the chrome
// only ever asks it to do things (`setSpeed`, `restartFromChrome`).
//
// Phaser is imported LAZILY, inside the effect. A static import would pull 379
// KB of engine into this module's chunk at parse time; snake is the only game
// that imports it at all, and it must stay that way.

const SPEED_OPTIONS: DifficultyOption<SpeedKey>[] = [
  { id: "slow", label: { he: "🐢 איטי", en: "🐢 Slow" } },
  { id: "normal", label: { he: "🙂 רגיל", en: "🙂 Normal" } },
  { id: "fast", label: { he: "🐇 מהיר", en: "🐇 Fast" } },
];

// A fixed LOGICAL size, scaled to the parent by Phaser.Scale.FIT. Booting at a
// measured pixel width was the old shape and it read `clientWidth`, which
// includes padding - so the canvas was born slightly too big and FIT quietly
// corrected it. A constant cannot be measured wrong.
const LOGICAL = 440;

export function SnakeGame({ ctx }: { ctx: GameContext }) {
  const hostRef = useRef<HTMLDivElement>(null);
  // Typed as the scene's public surface only. `any` for the Phaser.Game itself
  // would be honest but useless; this is the half we actually call.
  const sceneRef = useRef<{
    setSpeed: (k: SpeedKey) => void;
    restartFromChrome: () => void;
  } | null>(null);
  // Snake is the one game whose level lives inside the engine rather than in
  // React: the scene owns `selectedSpeed` and publishes it back out. So the
  // memory sits here and is pushed INTO the scene once it boots, rather than
  // the scene being taught to persist anything.
  const [speed, setSpeed] = useRememberedLevel(
    ctx,
    SPEED_OPTIONS.map((o) => o.id),
    "normal",
  );
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const [status, setStatus] = useState<SnakeStatus>({
    score: 0,
    level: 1,
    speed,
    phase: "ready",
  });
  const [best] = useState(() => ctx.score?.best() ?? 0);

  useEffect(() => {
    let game: { destroy: (removeCanvas: boolean) => void } | null = null;
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;

    ctx.lifecycle.loadingStart();
    void (async () => {
      const [{ default: Phaser }, { SnakeScene }] = await Promise.all([
        import("phaser"),
        import("./SnakeScene"),
      ]);
      // The component may have unmounted while the engine was downloading. On a
      // cold cache that is seconds, not milliseconds, so this is a real race and
      // not a formality - without it Phaser mounts a canvas into a detached node
      // and nothing ever destroys it.
      if (cancelled) return;
      const g = new Phaser.Game({
        type: Phaser.AUTO,
        parent: host,
        width: LOGICAL,
        height: LOGICAL,
        backgroundColor: "#0f1226",
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: SnakeScene,
      });
      game = g;
      g.scene.start("snake", {
        ctx,
        onStatus: (s: SnakeStatus) => {
          if (!cancelled) setStatus(s);
        },
        // The scene hands ITSELF over when it is built. Asking Phaser for it
        // here does not work: `scene.start` queues, so `getScene` on the next
        // line is null. See the comment on `onReady` in SnakeScene.
        onReady: (scene: typeof sceneRef.current) => {
          if (cancelled) return;
          sceneRef.current = scene;
          // The remembered speed, applied the moment the scene exists. Read
          // through a REF, not the state value: this effect's dependency list
          // is `[ctx]` on purpose, and closing over `speed` directly would
          // either go stale or — once added as a dependency — tear down and
          // reboot the whole Phaser game on every speed change.
          //
          // `setSpeed` republishes the status, so the chrome's toggle catches
          // up on its own rather than needing to be told twice.
          scene?.setSpeed(speedRef.current);
        },
      });
      ctx.lifecycle.loadingFinished();
    })();

    return () => {
      cancelled = true;
      sceneRef.current = null;
      game?.destroy(true);
    };
  }, [ctx]);

  const he = ctx.locale === "he";
  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "bolt", label: ctx.t("score"), value: status.score },
        { icon: "layers", label: he ? "רמה" : "Level", value: status.level },
        { icon: "trophy", label: ctx.t("best"), value: Math.max(best, status.score) },
      ]}
      levels={SPEED_OPTIONS}
      level={status.speed}
      // Reachable MID-RUN, which the in-canvas picker never was. The scene
      // applies it on the next tick and does not treat it as a "go".
      onLevel={(k) => {
        setSpeed(k);
        sceneRef.current?.setSpeed(k);
      }}
      onRestart={() => sceneRef.current?.restartFromChrome()}
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
            {status.phase === "over"
              ? he
                ? "המשחק נגמר - הקישו לשחק שוב"
                : "Game over - tap to play again"
              : status.phase === "ready"
                ? he
                  ? "הקישו כדי להתחיל"
                  : "Tap to start"
                : he
                  ? "החליקו או חצים"
                  : "Swipe or arrow keys"}
          </b>
        </div>
      }
    >
      <div
        ref={hostRef}
        style={{
          width: "min(88vw, 46vh, 440px)",
          aspectRatio: "1",
          borderRadius: 14,
          overflow: "hidden",
          // The canvas owns the gesture: no scroll, no pinch under a finger
          // that is mid-swipe.
          touchAction: "none",
        }}
      />
    </GameChrome>
  );
}
