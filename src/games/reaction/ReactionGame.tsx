import { textFor, type Locale } from "@i18n/index";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from "react";
import type { GameContext } from "@sdk/index";
import { type DifficultyOption } from "@ui/index";
import { GameChrome } from "@ui/GameChrome";
import { burst, haptic, shake } from "@juice/index";
import { Prompt, useGameTimer, winMoment, useRememberedLevel } from "@shared/index";
import {
  NO_BEST,
  READY,
  armAttempt,
  goLive,
  isMilestone,
  isPlausible,
  praiseFor,
  readTapTime,
  seconds,
  tapEarly,
  tapGo,
  type Attempt,
  type Difficulty,
} from "./logic";

// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS GAME MEASURES, AND WHAT IT DOES NOT
//
// The number is `tapTime - greenTime`, and both ends are chosen to avoid
// measuring OUR code instead of the child.
//
// GREEN TIME is taken in a DOUBLE requestAnimationFrame scheduled from a
// `useLayoutEffect` — NOT at the `setState` that turns the light green, where
// the green pixels do not exist yet and timestamping would fold our own render,
// layout and paint into the child's "reaction". The layout effect runs after the
// DOM is mutated and before the paint; the first rAF then fires at the start of
// the frame that paints green, the second at the start of the following frame,
// which is roughly when that frame is presented. We take the SECOND callback's
// own `DOMHighResTimeStamp` (the `performance.now()` timebase), seeding the
// first as a provisional so a tap inside that one-frame window still measures
// something — and measures it LONG, which is the safe direction.
//
// TAP TIME is the pointer event's own `timeStamp`, taken at dispatch, rather
// than `performance.now()` inside the handler, which runs after dispatch and
// after whatever else was queued on the main thread. `readTapTime` falls back to
// `performance.now()` when that stamp is not on the same timebase (some engines
// use epoch ms); the fallback can only make the number longer, never impossible.
//
// WHAT REMAINS, honestly. Display presentation latency — compositor hand-off to
// photons — is NOT observable from JavaScript at all; it is typically another
// one to two frames plus panel response, so the number is systematically
// OPTIMISTIC by roughly 10-40 ms. Touchscreen input sampling adds roughly
// 10-25 ms the other way, PESSIMISTIC; the two partly cancel by an amount nobody
// here can know. rAF timestamps quantise to the frame interval, so there is ±8 ms
// of grain at 120 Hz and ±16 ms at 60 Hz.
//
// So: a CONSISTENT SCORE ON ONE DEVICE, good to maybe ±30-50 ms in absolute
// terms, NOT comparable across devices. Plenty for a child beating their own
// record, which is all the game asks. It is not a laboratory reaction time and
// this file does not claim to be one. None of the above has been measured on
// real hardware — it is reasoning about the pipeline, not a calibration.
// ─────────────────────────────────────────────────────────────────────────────

function now(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

const DIFF_OPTIONS: DifficultyOption<Difficulty>[] = [
  { id: "easy", label: { he: "קל", en: "Easy", es: "Fácil" } },
  { id: "medium", label: { he: "בינוני", en: "Med", es: "Media" } },
  { id: "hard", label: { he: "קשה", en: "Hard", es: "Difícil" } },
];

/**
 * The light's width; height follows the aspect ratio. `min(<vw>, <vh>, <cap>)`
 * so it fits portrait, landscape and tablet. On the smallest phone (320px) that
 * is 192px across — the lit lamp alone clears the 64px minimum several times
 * over, and the whole housing is the tap target.
 */
// Sized DOWN from min(60vw, 30vh, 240px) on 2026-08-08. This is the tallest
// element in the tallest game: at 320x568 the old value made the page 726px
// natural, `fitStage` scaled it to 0.76, and a 56px chrome button landed on the
// glass at 42px - under the 44px WCAG floor. A scale multiplies straight
// through every tap target on the screen, so height is an ACCESSIBILITY budget
// here, not a taste one.
const LIGHT_W = "min(56vw, 24vh, 230px)";

/**
 * How long the result screen is protected from the tap that produced it. A child
 * good enough at this to enjoy it double-taps, and the second tap would restart
 * before they saw their time. Restart stays INSTANT after this window; only the
 * tap they did not mean to send is swallowed.
 */
const RESTART_GRACE_MS = 450;

/**
 * THE TWO STATES DIFFER BY MORE THAN HUE, AND THAT IS THE POINT.
 *
 * This game is literally red versus green, and red-green colour deficiency is
 * the most common form there is — hue alone would make it unplayable for roughly
 * one boy in twelve. So each state carries three cues that survive greyscale:
 * WHICH LAMP (stop is the TOP one, go the BOTTOM — readable across the room),
 * THE SYMBOL INSIDE IT (a flat SQUARE for stop, a blunt closed shape; a TRIANGLE
 * pointing up for go, an open arrow that says "move" — different silhouettes,
 * not two colours of one silhouette), and BRIGHTNESS (the unlit lamp is nearly
 * black against the housing, the lit one carries a halo).
 *
 * Hue is the fourth cue and the least load-bearing. Original art: a generic
 * two-lamp signal, deliberately not any real brand's shape or trade dress.
 */
function TrafficLight({ live, dim }: { live: boolean; dim: boolean }): ReactElement {
  const stopOn = !live;
  return (
    <svg
      viewBox="0 0 120 220"
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block" }}
    >
      {/* Housing. */}
      <rect x="6" y="6" width="108" height="208" rx="30" fill="#1b2030" />
      <rect x="14" y="14" width="92" height="192" rx="24" fill="#252b3d" />

      {/* Both lamps unlit, always drawn — an unlit lamp must still look like a
          lamp, or the light reads as broken rather than as "not yet". */}
      <circle cx="60" cy="66" r="38" fill="#141826" />
      <circle cx="60" cy="154" r="38" fill="#141826" />

      {/* STOP: the top lamp, a flat square. */}
      <g
        style={{
          opacity: stopOn ? (dim ? 0.5 : 1) : 0.08,
          transition: "opacity 90ms linear",
        }}
      >
        <circle cx="60" cy="66" r="46" fill="#e8402a" opacity="0.22" />
        <circle cx="60" cy="66" r="38" fill="#e8402a" />
        <rect x="43" y="49" width="34" height="34" rx="6" fill="#ffffff" opacity="0.94" />
      </g>

      {/* GO: the bottom lamp, a triangle pointing up. */}
      <g style={{ opacity: live ? 1 : 0.08, transition: "opacity 90ms linear" }}>
        <circle cx="60" cy="154" r="48" fill="#2ecc71" opacity="0.28" />
        <circle cx="60" cy="154" r="38" fill="#2ecc71" />
        <path d="M60 132 L80 170 L40 170 Z" fill="#ffffff" opacity="0.96" />
      </g>
    </svg>
  );
}

export function ReactionGame({ ctx }: { ctx: GameContext }): ReactElement {
  const [difficulty, setDifficulty] = useRememberedLevel(
    ctx,
    DIFF_OPTIONS.map((o) => o.id),
    "easy",
  );
  const [attempt, setAttempt] = useState<Attempt>(READY);
  // NO_BEST (0) means "no record yet" here, and the port says the same thing
  // with `undefined` — lower is better, so a stored zero could never be beaten.
  const [best, setBest] = useState<number>(() => ctx.score?.best() ?? NO_BEST);
  /** True after an early tap, until the next green. Drives the gentle "not yet". */
  const [nudged, setNudged] = useState(false);

  /**
   * One string, in whichever language this page is. Takes a locale RECORD
   * rather than two positional strings, so promoting a language reds every
   * call site by name instead of leaving them all answering in English.
   */
  const say = (words: Record<Locale, string>): string => textFor(words, ctx.locale);
  const live = attempt.phase === "go";

  // Everything the pointer handler and the clock callback read lives in a ref.
  // Both of them can fire twice inside one React tick, and neither may read
  // through a `setState` updater — see .claude/rules/rewards-economy-convention.md.
  const attemptRef = useRef(attempt);
  const difficultyRef = useRef(difficulty);
  /** Successful, MEASURABLE green taps this run. Feeds the milestone drip. */
  const successRef = useRef(0);
  /** One personal-best moment per run. Without this latch a child who improves
   *  five times in their first minute mints five rewards. Reopens on a level change. */
  const bestFiredRef = useRef(false);
  /** One green per arm: the clock ticks several times past the boundary. */
  const firedRef = useRef(false);
  /** When green was actually PAINTED. See the header. Null until the frame lands. */
  const greenAtRef = useRef<number | null>(null);
  /** When the result screen appeared, for the double-tap grace above. */
  const resultAtRef = useRef(0);
  const lightRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    ctx.lifecycle.gameplayStart();
    ctx.analytics.levelStart("reaction");
  }, [ctx]);

  // The wait is measured on the PAUSE-AWARE game clock, never on a raw
  // `Date.now()` delta or a bare `setTimeout`. A child who puts the tablet down
  // mid-red must not come back to a light that turned green while they were
  // gone — that would hand them a "reaction time" of four minutes, or worse,
  // fire green into a hidden tab where no frame is ever painted.
  const timer = useGameTimer(ctx, {
    running: attempt.phase === "waiting",
    tickMs: 16,
    onTick: (elapsed) => {
      if (firedRef.current) return;
      const a = attemptRef.current;
      if (a.phase !== "waiting" || elapsed < a.waitMs) return;
      firedRef.current = true;
      const next = goLive(a);
      attemptRef.current = next;
      setAttempt(next);
      setNudged(false);
    },
  });

  // Timestamp green AFTER the browser has painted it. Scheduled from a LAYOUT
  // effect so it is queued before the paint, not after it.
  useLayoutEffect(() => {
    if (attempt.phase !== "go") {
      greenAtRef.current = null;
      return;
    }
    greenAtRef.current = null;
    let second = 0;
    const first = requestAnimationFrame((t1) => {
      // Provisional: earlier than the true presentation, so a tap landing inside
      // this one-frame window measures LONG rather than not at all.
      greenAtRef.current = t1;
      second = requestAnimationFrame((t2) => {
        greenAtRef.current = t2;
      });
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [attempt.phase]);

  const put = useCallback((next: Attempt) => {
    attemptRef.current = next;
    setAttempt(next);
  }, []);

  const startAttempt = useCallback(() => {
    // Inside the gesture, so iOS opens both gates.
    ctx.audio.unlock();
    ctx.speech.unlock();
    firedRef.current = false;
    greenAtRef.current = null;
    setNudged(false);
    timer.reset();
    put(armAttempt(difficultyRef.current));
  }, [ctx, timer, put]);

  /**
   * A tap on green. Everything here runs in the HANDLER FLOW, never inside a
   * `setState` updater: React may run an updater twice, and for `winMoment` that
   * is a double grant rather than a stray animation.
   */
  const finish = useCallback(
    (reactionMs: number, at: { x: number; y: number }) => {
      const settled = tapGo(attemptRef.current, reactionMs);
      put(settled);
      resultAtRef.current = now();
      const ms = settled.reactionMs;

      if (!isPlausible(ms)) {
        // Anticipated, or the tab was away and no frame was ever painted. The
        // result screen says so rather than showing an invented number, and
        // nothing is banked — an unbeatable record would end the game.
        ctx.audio.play("tap");
        haptic.tap();
        return;
      }

      const n = successRef.current + 1;
      successRef.current = n;
      burst(at.x, at.y, { count: 12, spread: 70, colors: ["#2ecc71", "#a8f0c6", "#ffffff"] });

      // The port ranks `ms` LOW without being told to, the same way economy.ts
      // decides what a tier pays. It is only reached with a plausible reading:
      // the `!isPlausible(ms)` guard above has already returned, which matters
      // because the port's own validity check is finite-number-only and would
      // otherwise bank an anticipated tap as a record nobody can beat.
      const record = ctx.score?.report({ value: ms, unit: "ms" });
      const beaten = record?.isPersonalBest ?? false;
      if (beaten) setBest(ms);

      // One moment per tap. A personal best outranks the milestone drip, so the
      // two can never fire together and double-celebrate the same instant.
      const d = difficultyRef.current;
      if (beaten && !bestFiredRef.current) {
        bestFiredRef.current = true;
        winMoment(ctx, { reason: "personal_best", tier: d, level: `best-${d}`, ms, at });
        return;
      }
      if (isMilestone(n)) {
        // Endless game: a drip, so no confetti. `milestone` pays a flat coin and
        // no star regardless of tier, so no tier is passed.
        winMoment(ctx, { reason: "milestone", level: `${d}-${n}`, ms, at, confetti: false });
        return;
      }
      ctx.audio.play("success");
      haptic.tap();
    },
    [ctx, put],
  );

  /** Every input path lands here: pointer, and Enter/Space on a desktop. */
  const act = useCallback(
    (stamp: number, at: { x: number; y: number }) => {
      const a = attemptRef.current;

      if (a.phase === "ready" || a.phase === "result") {
        // Swallow the tail of a double-tap, so the child actually sees the time
        // they just set. The Again button is unaffected and always works.
        if (a.phase === "result" && now() - resultAtRef.current < RESTART_GRACE_MS) return;
        startAttempt();
        return;
      }

      if (a.phase === "waiting") {
        // NOT A LOSS. The light re-arms with a fresh wait and says "not yet" —
        // a soft shake and a neutral tap sound, no fail noise, nothing deducted.
        put(tapEarly(a, difficultyRef.current));
        firedRef.current = false;
        setNudged(true);
        timer.reset();
        ctx.audio.play("tap");
        haptic.tap();
        if (lightRef.current) shake(lightRef.current, 5, 220);
        return;
      }

      if (a.phase === "go") {
        const green = greenAtRef.current;
        // No painted frame ⇒ no measurement. Zero, which `isPlausible` refuses.
        finish(green === null ? 0 : readTapTime(stamp, now()) - green, at);
      }
    },
    [ctx, timer, put, startAttempt, finish],
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      // The event's own stamp, taken at dispatch — earlier and truer than a
      // `performance.now()` read from inside this handler.
      act(e.nativeEvent.timeStamp, { x: e.clientX, y: e.clientY });
    },
    [act],
  );

  // Desktop is a listed target for this PWA, and a reaction game on a keyboard
  // is a real way to play it. The coins fly from the light's own centre.
  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.repeat) return;
      if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
      e.preventDefault(); // Space would otherwise scroll the page out from under the light.
      const r = lightRef.current?.getBoundingClientRect();
      const at = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 0, y: 0 };
      act(e.nativeEvent.timeStamp, at);
    },
    [act],
  );

  const changeDifficulty = useCallback(
    (d: Difficulty) => {
      if (d === difficultyRef.current) return;
      difficultyRef.current = d;
      setDifficulty(d);
      // A new run: the milestone count restarts and the personal-best latch
      // reopens, exactly where `chooseLevel()` resets it in the other endless games.
      successRef.current = 0;
      bestFiredRef.current = false;
      firedRef.current = false;
      greenAtRef.current = null;
      setNudged(false);
      timer.reset();
      put(READY);
    },
    [timer, put],
  );

  const done = attempt.phase === "result";
  const measured = done && isPlausible(attempt.reactionMs);
  const praiseText = {
    lightning: say({ he: "מהיר כמו ברק!", en: "Lightning fast!", es: "¡Rápido como un rayo!" }),
    quick: say({ he: "מהיר מאוד!", en: "Super quick!", es: "¡Superrápido!" }),
    good: say({ he: "יפה מאוד!", en: "Nice one!", es: "¡Muy bien!" }),
    steady: say({ he: "כל הכבוד!", en: "Well done!", es: "¡Bravo!" }),
  }[praiseFor(attempt.reactionMs)];


  const caption =
    attempt.phase === "go"
      ? say({ he: "עכשיו! 👆", en: "Now! 👆", es: "¡Ahora! 👆" })
      : attempt.phase === "waiting"
        ? nudged
          ? say({ he: "עוד לא… חכו לירוק 🙂", en: "Not yet… wait for green 🙂", es: "Todavía no… espera al verde 🙂" })
          : say({ he: "חכו לאור הירוק…", en: "Waiting for green…", es: "Esperando el verde…" })
        : attempt.phase === "result"
          ? measured
            ? praiseText
            : say({ he: "בואו ננסה שוב 🙂", en: "Let's try that again 🙂", es: "Vamos a probar otra vez 🙂" })
          : say({ he: "לחצו על הרמזור כדי להתחיל", en: "Tap the light to start", es: "Toca el semáforo para empezar" });

  const ariaLabel =
    attempt.phase === "go"
      ? say({ he: "אור ירוק, לחצו עכשיו", en: "green light, tap now", es: "luz verde, toca ahora" })
      : attempt.phase === "waiting"
        ? say({ he: "אור אדום, מחכים", en: "red light, waiting", es: "luz roja, esperando" })
        : say({ he: "רמזור, לחצו כדי להתחיל", en: "traffic light, tap to start", es: "semáforo, toca para empezar" });

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        // Numbers stay LTR inside the Hebrew app - "0.41" must not mirror.
        { icon: "clock", label: ctx.t("time"), value: measured ? seconds(attempt.reactionMs) : "-", ltr: true },
        { icon: "trophy", label: ctx.t("best"), value: best > 0 ? seconds(best) : "-", ltr: true },
      ]}
      levels={DIFF_OPTIONS}
      level={difficulty}
      onLevel={changeDifficulty}
      onRestart={startAttempt}
      // The caption is the whole conversation this game has with the player -
      // "wait", "go!", "0.41 seconds". It belongs under the light, at a size
      // that can be read while looking at the light rather than at the words.
      footer={
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "var(--radius-2)",
            boxShadow: "var(--shadow-1)",
            padding: "12px 14px",
            minHeight: 76,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            textAlign: "center",
          }}
        >
          <b style={{ fontSize: 19, fontFamily: "Fredoka, inherit" }}>{caption}</b>
          {/* The start / play-again button lives HERE rather than under the
              light. It used to be its own row, which cost ~76px of height on a
              screen that is already the tallest in the roster - and that height
              is what `fitStage` pays for by shrinking every tap target on the
              page, including this button. */}
          {done || attempt.phase === "ready" ? (
            <button
              type="button"
              aria-label={done ? "play again" : "start"}
              onClick={startAttempt}
              style={{
                minWidth: 160,
                minHeight: 52,
                border: "none",
                borderRadius: "var(--radius-2)",
                background: "var(--brand)",
                color: "#fff",
                fontFamily: "Fredoka, inherit",
                fontSize: 20,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {done ? say({ he: "שוב! 🔄", en: "Again! 🔄", es: "¡Otra vez! 🔄" }) : say({ he: "יאללה! ▶", en: "Go! ▶", es: "¡Vamos! ▶" })}
            </button>
          ) : null}
          {/* No tally and no count: a number next to "early" reads as a score,
              and jumping the gun is explicitly not one. */}
          {attempt.earlyTaps > 0 && attempt.phase !== "ready" ? (
            <span style={{ fontSize: 13, opacity: 0.75 }} dir="auto">
              {say({ he: "יצאתם קצת מוקדם, וזה לגמרי בסדר 🙂", en: "You went a little early, and that is fine 🙂", es: "Saliste un poquito antes, y no pasa nada 🙂" })}
            </span>
          ) : null}
        </div>
      }
    >
      <Prompt
        ctx={ctx}
        glyph="🟢"
        text={say({ he: "חכו לאור הירוק ואז לחצו מהר!", en: "Wait for the green light, then tap fast!", es: "¡Espera la luz verde y luego toca rápido!" })}
        speak={say({
          he: "חכו לאור הירוק. כשהוא נדלק, לחצו מהר",
          en: "Wait for the green light. When it lights up, tap fast",
          es: "Espera la luz verde. Cuando se encienda, toca rápido",
        })}
      />

      <div
        ref={lightRef}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-live="polite"
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        style={{
          width: LIGHT_W,
          aspectRatio: "120 / 220",
          // The play surface owns the gesture: no scroll, no pinch, no
          // long-press selection under a five-year-old's finger.
          touchAction: "none",
          userSelect: "none",
          cursor: "pointer",
          // TRANSFORM ONLY — never width/height/top/left, which force layout on
          // every frame of the transition.
          transform: live ? "scale(1.05)" : "scale(1)",
          transition: "transform 120ms var(--ease)",
          willChange: "transform",
          filter: live ? "drop-shadow(0 10px 26px rgba(46, 204, 113, 0.45))" : "none",
          outline: "none",
        }}
      >
        <TrafficLight live={live} dim={attempt.phase === "ready" || attempt.phase === "result"} />
      </div>

    </GameChrome>
  );
}
