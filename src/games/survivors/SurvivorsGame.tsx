import { textFor } from "@i18n/index";
import { useEffect, useRef, useState } from "react";
import type { GameContext } from "@sdk/index";
import { GameChrome } from "@ui/GameChrome";
import { DirectionPad } from "@ui/DirectionPad";
import type { DifficultyOption } from "@ui/DifficultySelector";
// The MODULE, not the `@shared/index` barrel - the same call snake makes, and for
// the same reason: pulling the barrel in for one hook drags the rest along.
import { useRememberedLevel } from "@shared/useRememberedLevel";
// TYPE-ONLY, and that is load-bearing. Importing one VALUE from the scene makes
// the static import real, and Rollup then refuses to move it behind the dynamic
// `import()` below - un-deferring the whole engine while every comment here still
// claims it is lazy. `logic.ts` is a different matter: it is pure, pulls nothing,
// and the arena's size is needed to shape the box before Phaser exists.
import type { SurvivorsScene, SurvivorsStatus } from "./SurvivorsScene";
import type { LevelKey, UpgradeId } from "./logic";
import { ARENA, RUN_MS } from "./logic";

// The second Phaser game in the roster, wearing the same chrome as the other
// forty-two. React owns the bar and the upgrade cards; Phaser owns the arena.
//
// The cards are DOM rather than canvas text on purpose: they are the one thing in
// this game a player must TAP, and a rectangle drawn inside a canvas cannot be
// reached by a keyboard or a screen reader.

const LEVEL_OPTIONS: DifficultyOption<LevelKey>[] = [
  { id: "calm", label: { he: "רגוע", en: "Calm", es: "Tranquilo" } },
  { id: "normal", label: { he: "רגיל", en: "Normal", es: "Normal" } },
  { id: "wild", label: { he: "פראי", en: "Wild", es: "Salvaje" } },
];

const clock = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function SurvivorsGame({ ctx }: { ctx: GameContext }) {
  const hostRef = useRef<HTMLDivElement>(null);
  // Typed as the half the chrome actually calls, rather than the whole scene.
  const sceneRef = useRef<Pick<
    SurvivorsScene,
    "setLevel" | "setPaused" | "restartFromChrome" | "startFromChrome" | "steer" | "choose"
  > | null>(null);

  const [level, setLevel] = useRememberedLevel(
    ctx,
    LEVEL_OPTIONS.map((o) => o.id),
    "normal",
  );
  const levelRef = useRef(level);
  levelRef.current = level;

  const [status, setStatus] = useState<SurvivorsStatus>({
    score: 0,
    timeLeft: RUN_MS,
    hp: 3,
    maxHp: 3,
    power: 1,
    xp: 0,
    need: 4,
    level,
    phase: "ready",
    paused: false,
    offer: [],
  });
  const best = ctx.score?.best(status.level) ?? 0;

  useEffect(() => {
    let game: { destroy: (removeCanvas: boolean) => void } | null = null;
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;

    ctx.lifecycle.loadingStart();
    void (async () => {
      const [{ default: Phaser }, { SurvivorsScene: Scene }] = await Promise.all([
        import("phaser"),
        import("./SurvivorsScene"),
      ]);
      // The component may have unmounted while the engine was downloading. On a
      // cold cache that is seconds, not milliseconds.
      if (cancelled) return;
      const g = new Phaser.Game({
        type: Phaser.AUTO,
        parent: host,
        width: ARENA.w,
        height: ARENA.h,
        backgroundColor: "#0b0d1f",
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        // So a bug report from this game can carry a picture of the arena. WebGL
        // discards the drawing buffer after presenting, so a read-back from
        // outside Phaser returns a well-formed black square instead of failing.
        render: { preserveDrawingBuffer: true },
        scene: Scene,
      });
      game = g;
      g.scene.start("survivors", {
        ctx,
        onStatus: (s: SurvivorsStatus) => {
          if (!cancelled) setStatus(s);
        },
        onReady: (scene: SurvivorsScene) => {
          if (cancelled) return;
          sceneRef.current = scene;
          // The remembered level, applied the moment the scene exists. Read
          // through a REF: this effect depends on `[ctx]` alone, and closing over
          // `level` would either go stale or reboot Phaser on every change.
          scene.setLevel(levelRef.current);
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

  // This game's own words. A locale RECORD, so promoting a language reds this
  // block by name instead of leaving the game speaking English inside a page
  // that is not.
  const T = textFor(
    {
      he: {
        ready: "הקישו כדי להתחיל",
        over: "נגמרו הלבבות - הקישו לשחק שוב",
        won: "שרדתם שלוש דקות! הקישו לעוד סיבוב",
        hint: "גררו, חצים או כפתורים - היריות לבד",
        pick: "עלייה לדרגה",
        score: "צורות",
        time: "נשאר",
        hearts: "לבבות",
      },
      en: {
        ready: "Tap to start",
        over: "Out of hearts - tap to play again",
        won: "You survived three minutes! Tap for another run",
        hint: "Drag, arrows or buttons - it shoots by itself",
        pick: "Level up",
        score: "Shapes",
        time: "Left",
        hearts: "Hearts",
      },
      es: {
        ready: "Toca para empezar",
        over: "Sin corazones - toca para jugar otra vez",
        won: "¡Sobreviviste tres minutos! Toca para otra ronda",
        hint: "Arrastra, flechas o botones - dispara solo",
        pick: "Subes de nivel",
        score: "Formas",
        time: "Queda",
        hearts: "Corazones",
      },
    },
    ctx.locale,
  );

  const UP = textFor(
    {
      he: {
        rapid: "יריות מהירות יותר",
        power: "יריות חזקות יותר",
        spread: "עוד יריה בכל פעם",
        swift: "תנועה מהירה יותר",
        magnet: "אוספים יהלומים מרחוק",
        heart: "לב נוסף",
        pierce: "היריות עוברות דרך",
      },
      en: {
        rapid: "Faster shots",
        power: "Stronger shots",
        spread: "One more bolt",
        swift: "Quicker feet",
        magnet: "Longer gem reach",
        heart: "One more heart",
        pierce: "Shots pass through",
      },
      es: {
        rapid: "Disparos más rápidos",
        power: "Disparos más fuertes",
        spread: "Un disparo más",
        swift: "Pies más rápidos",
        magnet: "Más alcance de gemas",
        heart: "Un corazón más",
        pierce: "Los disparos atraviesan",
      },
    },
    ctx.locale,
  );

  const asking = status.phase !== "playing";
  const choosing = status.offer.length > 0;

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "bolt", label: T.score, value: status.score, record: Math.max(best, status.score) },
        { icon: "clock", label: T.time, value: clock(status.timeLeft), compact: true, ltr: true },
        { icon: "heart", label: T.hearts, value: `${status.hp}/${status.maxHp}`, compact: true, ltr: true },
      ]}
      levels={LEVEL_OPTIONS}
      level={status.level}
      // Reachable mid-run. The scene treats it as a fresh run at that level.
      onLevel={(k) => {
        setLevel(k);
        sceneRef.current?.setLevel(k);
      }}
      onRestart={() => sceneRef.current?.restartFromChrome()}
      // Only while the arena is actually moving. On the ready, won and over
      // screens nothing is running, and a cover over any of them hides the one
      // line telling the player how to leave it.
      paused={status.phase === "playing" ? status.paused : undefined}
      onPaused={
        status.phase === "playing" ? (next) => sceneRef.current?.setPaused(next) : undefined
      }
      footer={
        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          {/* The strip says four things and only three of them are INSTRUCTIONS.
              While playing it merely describes the controls, so it stops being a
              button - not a disabled one, which this platform reserves for the
              genuinely impossible, but simply not a control. Same handler as a
              tap on the arena, never a second copy of the logic. */}
          {asking ? (
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
                {status.phase === "won" ? T.won : status.phase === "over" ? T.over : T.ready}
              </b>
            </button>
          ) : (
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
          )}

          {/* Tap steering, for a player with no keyboard who would rather not
              drag. Tapping the same arrow again stops the ship. */}
          <DirectionPad onDir={(d) => sceneRef.current?.steer(d)} />
        </div>
      }
    >
      <div style={{ position: "relative", width: "min(92vw, 58vh, 420px)" }}>
        <div
          ref={hostRef}
          style={{
            width: "100%",
            aspectRatio: `${ARENA.w} / ${ARENA.h}`,
            borderRadius: 14,
            overflow: "hidden",
            // The arena owns the gesture: no scroll, no pinch under a finger
            // that is mid-drag.
            touchAction: "none",
          }}
        />
        {choosing && (
          <div
            role="group"
            aria-label={T.pick}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              borderRadius: 14,
              background: "rgba(11, 13, 31, 0.86)",
            }}
          >
            <b style={{ color: "#fff", fontSize: 18, fontFamily: "Fredoka, inherit" }}>
              {T.pick} {status.power}
            </b>
            {status.offer.map((id: UpgradeId) => (
              <button
                key={id}
                type="button"
                onClick={() => sceneRef.current?.choose(id)}
                style={{
                  width: "100%",
                  minHeight: 52,
                  borderRadius: "var(--radius-2)",
                  border: "2px solid #22e7ff",
                  background: "rgba(34, 231, 255, 0.12)",
                  color: "#fff",
                  font: "inherit",
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: "Fredoka, inherit",
                  cursor: "pointer",
                  touchAction: "manipulation",
                }}
              >
                {UP[id]}
              </button>
            ))}
          </div>
        )}
      </div>
    </GameChrome>
  );
}
