// The clock the harness owns. Option 2 of fixed-timestep-must-match-display.md:
// the sim steps in whole 1000/60 ms ticks and the view interpolates between
// the last two states by the leftover fraction. Chosen over retiming to the
// display (option 1) for a tournament-specific reason: retimed tuning makes
// the tick count a property of whichever machine measured an arm, and the
// checksum gate then compares nothing. Interpolation's cost - up to one frame
// of input latency - is identical in every arm, so it cannot decide the
// contest.
//
// So on a 120 Hz display `stepsPerFrame` reads 0.50 and that is CORRECT here;
// the reading that discriminates a frozen every-second frame from an
// interpolated one is `distinctDraws`: consecutive draws must differ while the
// accumulator advances. run-cell.ts measures both.

import { TICK_RATE } from "../../../toybox/sim/types";

export const STEP_MS = 1000 / TICK_RATE;

export interface Clock {
  /** feed a rAF timestamp; returns how many whole ticks to step now */
  advance(nowMs: number): number;
  /** the leftover fraction of a tick, as an integer 0..255 for view.ts */
  alpha256(): number;
  readonly frames: number;
  readonly steps: number;
}

export function createClock(stepMs = STEP_MS, maxFrameMs = 250): Clock {
  let last = -1, acc = 0, frames = 0, steps = 0;
  return {
    advance(now) {
      if (last < 0) { last = now; frames += 1; return 0; }
      let dt = now - last;
      last = now;
      if (dt > maxFrameMs) dt = maxFrameMs;   // a backgrounded tab does not owe a thousand ticks
      if (dt < 0) dt = 0;
      acc += dt;
      let n = 0;
      while (acc >= stepMs) { acc -= stepMs; n += 1; }
      frames += 1;
      steps += n;
      return n;
    },
    alpha256() {
      const a = Math.floor((acc / stepMs) * 256);
      return a < 0 ? 0 : a > 255 ? 255 : a;
    },
    get frames() { return frames; },
    get steps() { return steps; },
  };
}

/** the refresh rate, snapped to a standard one; a LOW percentile because dropped frames only lengthen intervals */
export function detectRefresh(samples = 40): Promise<number> {
  const STANDARD = [30, 50, 60, 72, 75, 90, 100, 120, 144, 165, 180, 240];
  return new Promise((resolve) => {
    const iv: number[] = [];
    let last = 0;
    const tick = (t: number) => {
      if (last) iv.push(t - last);
      last = t;
      if (iv.length < samples) return requestAnimationFrame(tick);
      const s = [...iv].sort((a, b) => a - b);
      const hz = 1000 / s[Math.floor(s.length * 0.2)];
      resolve(STANDARD.find((r) => Math.abs(r - hz) / r < 0.08) ?? Math.round(hz));
    };
    requestAnimationFrame(tick);
  });
}
