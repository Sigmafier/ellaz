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

export function useGameTimer(ctx: GameContext, opts: GameTimerOptions): GameTimer {
  const { onTick, tickMs = DEFAULT_TICK_MS, running } = opts;
  const [elapsedMs, setElapsedMs] = useState(0);

  const bankedRef = useRef(0);
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
