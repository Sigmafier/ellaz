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

Verified 2026-08-01: no shipped Ellaz game is exposed. Snake's accumulator steps at a
**game speed** (~120 ms), far slower than any refresh rate, and its grid movement is meant
to be discrete. Every other game is DOM/React and event-driven. This rule is preventive —
the trap is waiting for the first continuous-motion game.

## How to check

Every tournament arm carries a HUD reading `steps/fr`. It must sit at **1.00**. A reading of
0.50 means the display is twice the sim rate and half your frames are dead.
Reference implementation: `detectRefresh()` and `atRate()` in the round-2 tournament arms;
the reproduction harness is `harness/rate-mismatch.mjs` (runs the sim at 30 Hz against a
60 Hz screen — the same 2:1 ratio — and reports 40.1% of frames advancing nothing).

**Companion**: [`docs/engine-tournament/EYEBALL-VERDICT.md`](../../docs/engine-tournament/EYEBALL-VERDICT.md)
