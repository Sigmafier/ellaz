import { textFor } from "@i18n/index";
import { useEffect, useRef, useState } from "react";
import type { GameContext } from "@sdk/index";
import { GameChrome } from "@ui/GameChrome";
import { DirectionPad } from "@ui/DirectionPad";
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
import type { Dir } from "./logic";

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

// NO EMOJI IN THESE LABELS, and that is a measurement rather than a taste.
// The toggle's floor is 132px (see `GameChrome`), and "🙂 Normal" needs 146
// where the next widest label in the whole catalogue needs 128 - so snake was
// the ONE game whose difficulty read "Nor..." on a 390px phone. Raising the
// floor to fit it wrapped sudoku instead, whose third cell is a 99px compact
// one: the honest window was [146, 147], one pixel, in English only. Measured
// on the live site 2026-08-20. The dots beside the label already say which of
// the three you are on, which is what the animals were doing.
const SPEED_OPTIONS: DifficultyOption<SpeedKey>[] = [
  { id: "slow", label: { he: "איטי", en: "Slow", es: "Lento" } },
  { id: "normal", label: { he: "רגיל", en: "Normal", es: "Normal" } },
  { id: "fast", label: { he: "מהיר", en: "Fast", es: "Rápido" } },
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
    setPaused: (p: boolean) => void;
    restartFromChrome: () => void;
    startFromChrome: () => void;
    steer: (dir: Dir) => void;
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
    paused: false,
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
        // The only reason this line exists: a bug report from this game can
        // carry a picture of the board.
        //
        // WebGL discards the drawing buffer after each frame is presented, so
        // `canvas.toDataURL()` from outside Phaser reads back a single flat
        // colour - it does not throw, it returns a well-formed black square.
        // Measured on the built bundle, 2026-09-03
        // (`scripts/repro/repro-report-shot.mjs`): snake's raw read-back was
        // 1 distinct colour against bubbleshooter's 67, so `shot.ts` refused
        // it as blank, correctly, and snake was the one canvas game whose
        // reports could never carry a screenshot.
        //
        // The cost is real and it is a rendering cost, not a frame-rate one:
        // the driver keeps the back buffer alive instead of discarding it, on
        // one 440x440 canvas. Named here rather than assumed - if snake ever
        // feels worse on a low-end phone, this is the line to question first,
        // and the fps column is not the instrument for that
        // (see .claude/rules on the engine benchmark).
        render: { preserveDrawingBuffer: true },
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

  // This game's own words. A locale RECORD, so promoting a language reds
  // this block by name instead of leaving the game speaking English
  // inside a page that is not.
  const T = textFor(
    {
      he: {
        over: "המשחק נגמר - הקישו לשחק שוב",
        ready: "הקישו כדי להתחיל",
        hint: "כפתורים, החלקה או חצים",
      },
      en: {
        over: "Game over - tap to play again",
        ready: "Tap to start",
        hint: "Buttons, swipe or arrow keys",
      },
      es: {
        over: "Fin del juego - toca para jugar otra vez",
        ready: "Toca para empezar",
        hint: "Botones, desliza o flechas",
      },
    },
    ctx.locale,
  );

  // The pad's four directions are this game's four directions, so the shared
  // `PadDir` is `Dir` here rather than something to map. Steering is idempotent
  // — the scene ignores a turn into the direction it is already going — so the
  // joystick needs no repeat: entering a direction once is the whole message.
  const steer = (dir: Dir) => sceneRef.current?.steer(dir);

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "bolt", label: ctx.t("score"), value: status.score, record: Math.max(best, status.score) },
        { icon: "layers", label: ctx.t("stage"), value: status.level, compact: true },
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
      // Only while it is actually moving. On the ready screen and the game-over
      // screen the snake is already stopped, and a cover over either hides the
      // one line telling the player how to leave it.
      //
      // Both read from the SCENE's published status rather than from a state
      // beside it, so a restart taken from behind the cover lifts it: the scene
      // clears its own flag and the next publish says so.
      paused={status.phase === "playing" ? status.paused : undefined}
      onPaused={
        status.phase === "playing" ? (next) => sceneRef.current?.setPaused(next) : undefined
      }
      footer={
        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          {/* The strip says three different things and only two of them are
              INSTRUCTIONS. "Tap to start" and "tap to play again" tell the
              player to do something; "Buttons, swipe or arrow keys" describes
              what is available. Until 2026-08-30 all three rendered as the
              same white card with bold centred text, and none of them was
              tappable - measured on the published itch bundle: two taps on
              the strip did nothing, one tap on the board started the game.
              A card carrying an imperative, directly under the board, is the
              most button-looking thing on a phone screen.

              So the strip now IS the button while it is asking, and stops
              looking like one while it is merely telling. Same handler as a
              canvas tap (`startFromChrome`), never a second copy of the
              logic. Not `disabled` while playing - it is simply not a button
              then, which is the honest shape and keeps the platform's rule
              that `disabled` is reserved for the genuinely impossible. */}
          {status.phase === "playing" ? (
            <div
              style={{
                padding: "10px 12px",
                minHeight: 44,
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                color: "var(--muted)",
              }}
            >
              <span style={{ fontSize: 15, fontFamily: "Fredoka, inherit" }}>{T.hint}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => sceneRef.current?.startFromChrome()}
              style={{
                background: "var(--surface)",
                borderRadius: "var(--radius-2)",
                boxShadow: "var(--shadow-1)",
                border: "none",
                cursor: "pointer",
                font: "inherit",
                color: "inherit",
                padding: "10px 12px",
                minHeight: 44,
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                touchAction: "manipulation",
              }}
            >
              <b style={{ fontSize: 17, fontFamily: "Fredoka, inherit" }}>
                {status.phase === "over" ? T.over : T.ready}
              </b>
            </button>
          )}

          {/* On-screen controls — the old-school pad for a player with no
              keyboard who would rather tap than swipe, plus the stick in the
              middle for one who would rather steer. */}
          <DirectionPad onDir={steer} />
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
