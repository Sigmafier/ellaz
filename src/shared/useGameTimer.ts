// A pause-aware game clock.
//
// Three properties, each one a bug this hook exists to prevent:
//
// 1. PAUSE STOPS THE CLOCK. A kid who puts the tablet down mid-round (or takes
//    a phone call, which backgrounds the tab) must not come back to a blown
//    timer. We subscribe to `ctx.onPause`/`ctx.onResume` and both unsubscribes
//    run on cleanup.
// 2. NOTHING TICKS AFTER UNMOUNT. A leaked interval outlives the game and keeps
//    firing on the home screen, where `onTick` closes over a dead component.
// 3. ELAPSED COMES FROM THE WALL CLOCK, never from counting ticks. Browsers
//    throttle timers hard in a background tab, so `ticks * tickMs` would run the
//    game clock slow by exactly the amount the browser cheated us.
//
// The state is a span accumulator: `banked` holds completed time, `spanStart`
// marks the live span (null while paused or stopped). Elapsed is always
// `banked + (now - spanStart)`, so a late interval reports the true time.
//
// Deliberately thin — vitest here runs `environment: "node"` and collects only
// `*.test.ts`, so a `.ts` hook using React state is NOT unit-testable in this
// repo. Any real logic belongs in a pure module beside it, not in here.
import { useCallback, useEffect, useRef, useState } from "react";
import type { GameContext } from "@sdk/index";

export interface GameTimerOptions {
  /** Called on every tick with the true elapsed time. */
  onTick?: (elapsedMs: number) => void;
  /** How often to re-read the clock. Default 100ms; floored at one frame. */
  tickMs?: number;
  /** False stops accumulating (round over, menu open). Pause is separate. */
  running: boolean;
  /**
   * Time already banked before this mount — the clock a resumed run continues.
   *
   * Read ONCE, at mount, and only then. It seeds the accumulator rather than
   * offsetting reads, so everything downstream (the tick, `onTick`, the value a
   * win reports as its score) sees one honest elapsed time and no code path has
   * to remember to add it back.
   *
   * `reset()` still returns to zero, never to this. Restart means a new run,
   * and a restart that silently reinstated the abandoned run's minutes would
   * hand a child a puzzle they cannot record a good time on.
   */
  initialMs?: number;
}

export interface GameTimer {
  elapsedMs: number;
  /** Back to zero. Keeps running if it was running. */
  reset: () => void;
}

const DEFAULT_TICK_MS = 100;
const MIN_TICK_MS = 16;

function now(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

/**
 * A resumed clock arrives off a disk, so it is sanitised rather than trusted.
 * A NaN reaching `banked` poisons every later read — `NaN + (now - start)` is
 * NaN forever — and the symptom is a clock that renders as "NaN" or as nothing
 * at all, long after the snapshot that caused it is gone.
 */
function bankable(ms: number | undefined): number {
  return typeof ms === "number" && Number.isFinite(ms) && ms > 0 ? ms : 0;
}

export function useGameTimer(ctx: GameContext, opts: GameTimerOptions): GameTimer {
  const { onTick, tickMs = DEFAULT_TICK_MS, running, initialMs } = opts;
  // Both seeded from the same sanitised value: `useRef`/`useState` initialisers
  // run on the first render only, which IS "read once, at mount".
  const [elapsedMs, setElapsedMs] = useState(() => bankable(initialMs));

  const bankedRef = useRef(bankable(initialMs));
  const spanStartRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const runningRef = useRef(running);
  // `onTick` is usually an inline arrow, so a fresh identity every render. Held
  // in a ref, it cannot re-create the interval and reset the tick cadence.
  const onTickRef = useRef(onTick);
  useEffect(() => {
    onTickRef.current = onTick;
  });

  const read = useCallback(() => {
    const start = spanStartRef.current;
    return bankedRef.current + (start === null ? 0 : now() - start);
  }, []);

  /** Close the live span into `banked`. Idempotent. */
  const bank = useCallback(() => {
    const start = spanStartRef.current;
    if (start === null) return;
    bankedRef.current += now() - start;
    spanStartRef.current = null;
  }, []);

  /** Open a span, but only if the clock should actually be moving. */
  const open = useCallback(() => {
    if (!runningRef.current || pausedRef.current) return;
    if (spanStartRef.current === null) spanStartRef.current = now();
  }, []);

  const reset = useCallback(() => {
    bankedRef.current = 0;
    spanStartRef.current = null;
    open();
    setElapsedMs(0);
  }, [open]);

  // Portal pause/resume. Both unsubscribes run on cleanup — `ctx.onPause` and
  // `ctx.onResume` each RETURN one, and dropping them leaks a listener that
  // keeps a dead game's refs alive for the life of the session.
  useEffect(() => {
    const offPause = ctx.onPause(() => {
      pausedRef.current = true;
      bank();
      setElapsedMs(read());
    });
    const offResume = ctx.onResume(() => {
      pausedRef.current = false;
      open();
    });
    return () => {
      offPause();
      offResume();
    };
  }, [ctx, bank, open, read]);

  // Start/stop on `running`.
  useEffect(() => {
    runningRef.current = running;
    if (running) open();
    else bank();
    setElapsedMs(read());
  }, [running, bank, open, read]);

  // The tick. Cleared on every dependency change AND on unmount (property 2).
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const e = read();
      setElapsedMs(e);
      onTickRef.current?.(e);
    }, Math.max(MIN_TICK_MS, tickMs));
    return () => clearInterval(id);
  }, [running, tickMs, read]);

  // Unmount: close the span so nothing keeps counting against a live start time.
  useEffect(() => bank, [bank]);

  return { elapsedMs, reset };
}
