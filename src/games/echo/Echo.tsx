import { useCallback, useEffect, useRef, useState } from "react";
import type { GameContext } from "@sdk/index";
import { Button, Stat } from "@ui/components";
import { DifficultySelector, type DifficultyOption } from "@ui/DifficultySelector";
import { haptic, shake } from "@juice/index";
import { Prompt, winMoment } from "@shared/index";
import { IDLE, beginInput, pressPad, startRound, type SeqState } from "@shared/sequence";
import {
  LEVELS,
  MISS_FREQ,
  PADS,
  PRESS_FLASH_MS,
  ROUND_GAP_MS,
  buildPlayback,
  isMilestoneRound,
  levelById,
  padTone,
  type LevelId,
} from "./logic";

// THE LOAD-BEARING RULE OF THIS GAME: it must be fully playable MUTED.
//
// Every step of the pattern is a VISUAL event - the pad brightens, grows, and
// carries its own glyph - and the tone is a second channel laid on top. Nothing
// in the playback path reads `ctx.audio.muted`, nothing waits on an audio
// callback, and no flash is conditional on a tone having been produced. A child
// with the volume off, or before the first gesture has unlocked audio, sees the
// whole sequence. Sound here is exactly as supplementary as speech is elsewhere
// in this app.
//
// Tones are fired at the instant of their own flash rather than scheduled ahead
// against `ctx.audio.time()`. Deliberate: a tone scheduled into the audio clock
// cannot be un-scheduled through the port, so a paused or unmounted game would
// keep singing its pattern into an empty room. Cancellable beats sample-accurate
// for a half-second flash.

const LEVEL_LABELS: Record<LevelId, { he: string; en: string }> = {
  easy: { he: "קל", en: "Easy" },
  medium: { he: "בינוני", en: "Med" },
  hard: { he: "קשה", en: "Hard" },
};

// Derived from LEVELS rather than re-typed, so the row can never drift from the
// levels the logic actually knows about.
const LEVEL_OPTIONS: DifficultyOption<LevelId>[] = LEVELS.map((l) => ({
  id: l.id,
  label: LEVEL_LABELS[l.id],
}));

function promptFor(phase: SeqState["phase"], round: number, he: boolean): string {
  switch (phase) {
    case "showing":
      return he ? "הסתכלו על הסדר" : "Watch the order";
    case "input":
      return he ? "עכשיו תורכם - חזרו אחריי" : "Your turn - follow me";
    case "won":
      return he ? "יופי! עוד אחד" : "Nice! One more";
    case "lost":
      return he ? `הגעתם לשלב ${round}` : `You reached round ${round}`;
    default:
      return he ? "לחצו על ההתחלה ותראו את הסדר" : "Press start and watch the order";
  }
}

export function Echo({ ctx }: { ctx: GameContext }) {
  const he = ctx.locale === "he";
  const [levelId, setLevelId] = useState<LevelId>("easy");
  const level = levelById(levelId);
  const [seq, setSeq] = useState<SeqState>(IDLE);
  /** Which pad is lit right now. The ONLY channel the game truly needs. */
  const [lit, setLit] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [best, setBest] = useState(() => ctx.score?.best() ?? 0);

  const gridRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  // Live mirrors for the pause handler, which is subscribed once and would
  // otherwise close over the first render's state forever.
  const seqRef = useRef(seq);
  const padsRef = useRef(level.pads);
  useEffect(() => {
    seqRef.current = seq;
    padsRef.current = level.pads;
  });
  // A once-per-run latch. The score port answers "was that a record?" on every
  // round, and without this a first-time player would hear yes on literally
  // every one of them (1 > 0, then 2 > 1, ...) and mint a personal-best reward
  // each time. One record per run is the moment worth celebrating.
  const bestFiredRef = useRef(false);
  // Timers that are NOT playback: the press flash and the pause before the next
  // round. Playback owns its own timers inside its effect, whose cleanup is what
  // makes pause / unmount / level change actually stop a sequence mid-flight.
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearExtra = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms));
  }, []);

  // Nothing may still be pending after unmount.
  useEffect(() => clearExtra, [clearExtra]);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      ctx.lifecycle.gameplayStart();
    }
  }, [ctx]);

  // Pause stops playback dead and REWINDS the round: whatever was flashing is
  // gone, so on resume the child sees the whole pattern again before being asked
  // to repeat it. Both unsubscribes run on cleanup.
  //
  // The `won` case is the one that bites: clearing the timers also kills the
  // pending advance to the next round, which would strand the run on a cleared
  // pattern with no way forward. So pause DOES that advance itself. Rewinding a
  // won round instead would be worse - the child would clear the same round
  // twice and a milestone would pay twice for it.
  useEffect(() => {
    const offPause = ctx.onPause(() => {
      setPaused(true);
      setLit(null);
      clearExtra();
      const s = seqRef.current;
      if (s.phase === "won") setSeq(startRound(s, padsRef.current));
      else if (s.phase === "showing" || s.phase === "input") {
        setSeq({ ...s, phase: "showing", cursor: 0 });
      }
    });
    const offResume = ctx.onResume(() => setPaused(false));
    return () => {
      offPause();
      offResume();
    };
  }, [ctx, clearExtra]);

  // Playback. Driven by plain timeouts off a schedule computed in logic.ts -
  // there is no simulation here, and deliberately no rAF accumulator (see
  // .claude/rules/fixed-timestep-must-match-display.md). The cleanup runs on
  // unmount, on pause, and whenever the round changes, so a sequence can never
  // outlive the screen it belongs to.
  useEffect(() => {
    if (paused || seq.phase !== "showing") return;
    const pb = buildPlayback(seq.pattern, seq.round);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const step of pb.steps) {
      timers.push(
        setTimeout(() => {
          setLit(step.pad);
          ctx.audio.tone({ freq: step.freq, ms: step.ms });
        }, step.atMs),
      );
      timers.push(setTimeout(() => setLit(null), step.atMs + step.ms));
    }
    // `beginInput` is a no-op unless we are still showing, so a late timer can
    // never re-open input on a round that already ended.
    timers.push(setTimeout(() => setSeq((s) => beginInput(s)), pb.inputAtMs));
    return () => {
      timers.forEach(clearTimeout);
      setLit(null);
    };
  }, [ctx, seq, paused]);

  const startRun = useCallback(() => {
    ctx.audio.unlock();
    ctx.speech.unlock();
    clearExtra();
    bestFiredRef.current = false;
    setLit(null);
    ctx.analytics.levelStart(levelId);
    setSeq(startRound(null, level.pads));
  }, [ctx, clearExtra, levelId, level.pads]);

  const chooseLevel = useCallback(
    (id: LevelId) => {
      clearExtra();
      bestFiredRef.current = false;
      setLit(null);
      setLevelId(id);
      setSeq(IDLE);
    },
    [clearExtra],
  );

  // Everything below runs in the HANDLER FLOW, never inside a setState updater:
  // React may run an updater twice, and for winMoment that is a double grant.
  const onPad = useCallback(
    (pad: number) => {
      if (seq.phase !== "input") return;
      ctx.audio.unlock();
      ctx.speech.unlock();

      const next = pressPad(seq, pad);
      if (next === seq) return; // the machine ignored it; nothing happened
      setSeq(next);
      setLit(pad);
      later(() => setLit(null), PRESS_FLASH_MS);

      const r = gridRef.current?.getBoundingClientRect();
      const at = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined;

      if (next.phase === "lost") {
        // Gentle: a low soft tone and a shake. No harsh buzzer, no "you lost".
        ctx.audio.tone({ freq: MISS_FREQ, ms: 320, gain: 0.14 });
        haptic.tap();
        const el = gridRef.current;
        if (el) shake(el);
        ctx.analytics.levelFail(levelId, `round-${next.round}`);
        return;
      }

      ctx.audio.tone({ freq: padTone(pad), ms: 190 });
      haptic.tap();
      if (next.phase !== "won") return;

      // Round cleared. This game is ENDLESS, so it never pays a completion star:
      // a milestone drip every few rounds, and one latched personal best.
      const round = next.round;
      if (isMilestoneRound(round)) {
        winMoment(ctx, { reason: "milestone", level: `round-${round}`, at, confetti: false });
      }
      if (ctx.score?.report({ value: round, unit: "points" }).isPersonalBest) {
        setBest(round);
        if (!bestFiredRef.current) {
          bestFiredRef.current = true;
          winMoment(ctx, {
            reason: "personal_best",
            tier: levelId,
            level: `round-${round}`,
            at,
            confetti: false,
          });
        }
      }
      later(() => setSeq(startRound(next, level.pads)), ROUND_GAP_MS);
    },
    [ctx, seq, levelId, level.pads, later],
  );

  const idle = seq.phase === "idle";
  const lost = seq.phase === "lost";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        padding: 16,
      }}
    >
      <Prompt ctx={ctx} glyph="💡" text={promptFor(seq.phase, seq.round, he)} />

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Stat label={he ? "שלב" : "Round"} value={seq.round} />
        <Stat label={ctx.t("best")} value={best} />
        <Button variant="ghost" kids ariaLabel={ctx.t("restart")} onClick={startRun}>
          🔄
        </Button>
      </div>

      <DifficultySelector
        options={LEVEL_OPTIONS}
        value={levelId}
        onChange={chooseLevel}
        locale={ctx.locale}
        kids
      />

      {/* dir="ltr": a spatial grid must not mirror in the Hebrew RTL app, or the
          pad the child watched is not the pad under their finger. */}
      <div
        ref={gridRef}
        dir="ltr"
        className="ellaz-play-surface"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${level.cols}, 1fr)`,
          gap: 14,
          width: "min(88vw, 56vh, 420px)",
          touchAction: "none",
        }}
      >
        {Array.from({ length: level.pads }, (_, i) => {
          const pad = PADS[i];
          const on = lit === i;
          return (
            <button
              key={i}
              aria-label={pad.name[ctx.locale]}
              // Pointer Events only for the play action. `onKeyDown` keeps the
              // pads reachable from a keyboard without an `onClick` that would
              // double-fire alongside the pointer path.
              onPointerDown={() => onPad(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onPad(i);
                }
              }}
              style={{
                aspectRatio: "1",
                minHeight: 64,
                border: on ? "4px solid #fff" : "4px solid rgba(255,255,255,0.14)",
                borderRadius: 20,
                background: pad.color,
                color: "rgba(0,0,0,0.62)",
                fontSize: "clamp(30px, 9vw, 56px)",
                lineHeight: 1,
                display: "grid",
                placeItems: "center",
                touchAction: "none",
                // The flash: brighter, bigger, ringed. Three simultaneous visual
                // changes, so it reads at a glance with the sound off.
                filter: on ? "brightness(1.5) saturate(1.15)" : "brightness(0.72)",
                transform: on ? "scale(1.06)" : "scale(1)",
                boxShadow: on
                  ? "0 0 0 8px rgba(255,255,255,0.35), var(--shadow-1)"
                  : "var(--shadow-1)",
                transition: "filter 0.08s linear, transform 0.08s linear, box-shadow 0.08s linear",
              }}
            >
              {/* The glyph is the non-colour cue, and it grows with the flash. */}
              <span aria-hidden="true" style={{ transform: on ? "scale(1.15)" : "scale(1)" }}>
                {pad.glyph}
              </span>
            </button>
          );
        })}
      </div>

      {(idle || lost) && (
        <div style={{ textAlign: "center", display: "grid", gap: 8, justifyItems: "center" }}>
          {lost && <div style={{ fontSize: 36 }}>🙂</div>}
          <Button kids onClick={startRun}>
            {idle ? "▶" : ctx.t("restart")}
          </Button>
        </div>
      )}
    </div>
  );
}
