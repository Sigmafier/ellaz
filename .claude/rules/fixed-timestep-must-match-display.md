# A Fixed-Timestep Game Loop Must Match the Display, Not Assume 60 Hz

**Scope**: Any Ellaz game with continuous motion driven by a fixed simulation step.
**Origin**: 2026-08-01 engine tournament — cost three rounds of measurement and two wrong verdicts.

## Core Rule

**Never hardcode a simulation step of `1000/60` and drive it from `requestAnimationFrame`.**
A 120 Hz display delivers a frame every 8.3 ms while the accumulator needs 16.7 ms, so it
only crosses its threshold on every **second** frame — half of all rendered frames draw the
player exactly where the previous one did. This is not an occasional stutter under load; it
is structural, on every frame pair, and it looks like input lag.

120 Hz and 144 Hz laptops are ordinary now. **60 Hz is not a safe assumption.**

Pick one, and say which in a comment:

1. **Match the display** (best feel): measure the refresh rate at startup and scale the
   step to it. With integer/fixed-point physics, scale by `k = 60 / rate` — accelerations
   by `k²`, velocities by `k`, tick counters by `1/k`. Getting those exponents wrong is
   silent: scaling a velocity like an acceleration halves the wall-clock jump time and the
   level stops being clearable.
2. **Interpolate**: keep a 60 Hz step and draw between the last two states by the leftover
   accumulator fraction. Steadiest picture, but it draws the recent past and costs up to a
   frame of input latency.
3. **Decouple the tick**: run the simulation on its own timer, independent of rAF. Also
   immune to *dropped* frames, which the other two are not.

Never draw the raw lattice **rounded to whole game pixels** on an upscaled canvas either —
at 2.5 px/tick, rounding turns a steady run into a 2,3,2,3 stagger, magnified by the
upscale. Measured at 19.9% frame-to-frame spread with a ±0.1 variance: arithmetic, not luck.

## When to Apply

- Any new canvas game with smooth continuous motion (platformer, runner, shooter, physics).
- Any report of "laggy", "not smooth" or "controls feel delayed" that appears on one machine
  and not another — check the display refresh rate first, before touching the game code.
- Reviewing a game loop: if you see `1000 / 60` next to an accumulator, this rule applies.

## Not currently a live bug

Verified 2026-08-01 by reading the source, not by recall:

- **Snake** is the only game with an accumulator, and it steps at a **game speed** — `SPEEDS`
  = 170/130/90 ms by difficulty, shaved 8 ms per level down to `STEP_FLOOR = 60` ms. Even at
  its fastest that is 7× a 120 Hz frame, and it is fed by Phaser's `update(_time, delta)`
  rather than a hardcoded constant. Its grid movement is meant to be discrete. Not exposed at
  any level or speed.
- **`src/juice/effects.ts`** holds the only other `requestAnimationFrame` loops (shake, tween).
  Both derive progress from wall-clock elapsed (`p = (now - start) / ms`), so they are
  refresh-rate independent by construction.
- Every other game is DOM/React and event-driven.
- `grep -rn "1000 */ *60" src/` → no hits.

This rule is preventive — the trap is waiting for the first continuous-motion game.

## How to check

Instrument `steps/frame` and assert it sits at **1.00**. A reading of 0.50 means the display is
twice the sim rate and half your frames are dead; 2.00 means the reverse.

```ts
// Measure the real refresh rate, then snap to the nearest standard one.
// Use a LOW percentile, not the median: dropped frames only ever LENGTHEN an
// interval, so the fast end is the honest signal.
const STANDARD = [30, 50, 60, 72, 75, 90, 100, 120, 144, 165, 180, 240];
export function detectRefresh(samples = 40): Promise<number> {
  return new Promise((resolve) => {
    const iv: number[] = []; let last = 0;
    const tick = (t: number) => {
      if (last) iv.push(t - last);
      last = t;
      if (iv.length < samples) return requestAnimationFrame(tick);
      const s = [...iv].sort((a, b) => a - b);
      const hz = 1000 / s[Math.floor(s.length * 0.2)];
      const near = STANDARD.find((r) => Math.abs(r - hz) / r < 0.08);
      resolve(near ?? Math.round(hz));
    };
    requestAnimationFrame(tick);
  });
}

// Retime integer/fixed-point tuning from its 60 Hz baseline to `rate`.
// The exponents are the whole point: acceleration is px/frame², velocity is
// px/frame, a duration is a frame COUNT. Scaling a velocity like an
// acceleration halves wall-clock jump height and silently breaks the level.
const k = (rate: number) => 60 / rate;
const acc = (v: number, r: number) => Math.sign(v) * Math.max(1, Math.round(Math.abs(v) * k(r) ** 2));
const vel = (v: number, r: number) => Math.sign(v) * Math.max(1, Math.round(Math.abs(v) * k(r)));
const dur = (v: number, r: number) => Math.max(1, Math.round(v / k(r)));
```

Reproduce the fault without a 120 Hz screen by scaling the *ratio* instead of the hardware —
running the sim at 30 Hz against a 60 Hz display is the same 2:1, and reports **40.1% of frames
advancing nothing** against **0%** when matched.

**Companion**: [`docs/engine-tournament/EYEBALL-VERDICT.md`](../../docs/engine-tournament/EYEBALL-VERDICT.md)
