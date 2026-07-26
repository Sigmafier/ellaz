# Engine tournament — why Ellaz runs on Phaser 4

Two head-to-head bake-offs, 294 measured rows, six engines. This folder is the
durable record so the decision doesn't have to be re-argued from memory.

**Short answer**: Phaser 4 for canvas games. PixiJS if a specific game is
load-critical. Kaplay if we build a small static-screen game. Godot, Defold and
Excalibur are out, each for a different measured reason.

The decision summary lives in [`../../CLAUDE.md`](../../CLAUDE.md) under
*"Engine choice — settled by measurement"*. Everything here is the evidence
behind it.

---

## Read in this order

| File | What it answers |
|---|---|
| [ROUND2-VERDICT.md](ROUND2-VERDICT.md) | **Start here.** The current verdict, per-engine, with the validity limits stated alongside |
| [summary-round2.md](summary-round2.md) | The round-2 measurement tables (TTI, payload, FPS distribution) |
| [dev-cost.md](dev-cost.md) | What each engine cost to actually build on — toolchains, friction, port size |
| [ROUND1-DOSSIER.md](ROUND1-DOSSIER.md) | The first round (Snake) and why it wasn't good enough |
| [PROBE-SPEC.md](PROBE-SPEC.md) / [PROBE-RESULT.md](PROBE-RESULT.md) | How we proved all six arms ran the *same game* |
| [ROUND3-PARTIAL.md](ROUND3-PARTIAL.md) | Round 3 (static-screen match-3). Load axis done — **render axis void, machine was 3.2x oversubscribed** |

## How the comparison was made honest

The hard part of a multi-engine comparison isn't measuring — it's proving the
arms are the same program. Ours were:

- **One game, one input tape.** A 660×16-tile platformer ("Hopper"), replayed
  from an identical 4,299-tick recorded input sequence, ~72 seconds of play.
- **One checksum.** Every arm had to reproduce `f84a3f6e` before *any* of its
  numbers counted. Two porting bugs were caught this way that no benchmark
  would have shown.
- **Integer physics.** All positions and velocities are `int32` in 1/256-px
  units at a fixed 60 Hz, because floats diverge across JavaScript, GDScript and
  Lua. See [PROBE-SPEC.md](PROBE-SPEC.md).
- **A probe with teeth.** The determinism probe was itself verified with a
  negative control — swapping floor-division for truncation changes the
  checksum, so the agreement is evidence rather than coincidence.
- **Screenshots, not proxies.** Every arm's rendering was confirmed by looking at
  it. An earlier round reported "0 lit pixels" for an arm that was rendering
  perfectly well.

## The headline numbers

Median of 3 rounds, warm-up discarded, throttled to ~4 Mbps / 80 ms, gzipped.

```
                cold start (desktop)   transfer    fps      janked frames
kaplay                 885 ms            73 KB     30.0         40%
pixi                 1,170 ms           137 KB     60.0          0%
phaser               1,426 ms           379 KB     60.0          0%
excalibur            1,916 ms           129 KB     21.4        100%
defold               2,984 ms         1,120 KB     60.0          0%
godot               22,640 ms        10,064 KB     14.1        100%
```

Note that mean FPS alone would have been misleading: Kaplay's 30 fps average
hides that 40% of frames janked, and on mobile it janks on every single frame.

## What this does NOT tell you

- **Anything 3D.** All six arms are 2D. A 3D marketplace game needs a separate
  three.js / Babylon.js / PlayCanvas evaluation.
- **Built-in physics quality.** Deliberately bypassed — every arm ran one shared
  deterministic simulation so the games were provably identical.
- **Input latency.** Captured only as single samples, which is not a ranking.
- **Each engine's floor.** Every arm used its stock build configuration. A
  custom-compiled Godot template was later built and measured (see the verdict)
  — it cut transfer 27% and desktop start to 19.1 s, but made mobile *worse* and
  did nothing for frame rate.

## Data

`data/` holds the raw measurements — `round1.json` (180 rows, with superseded
rows labelled rather than deleted), `raw-round2.json` (87 rows, 6 arms, 0
errors), `raw-godot-slim.json` (the custom-template follow-up) and `golden.json`
(the expected end state and checksum).

`evidence/` holds the rendered output of every arm plus the side-by-side compare
sheet. The six panels should be indistinguishable in game content; differences in
letterboxing are artifacts of how each engine fits its canvas to the page.

---

*Measured 2026-07-25, corrected 2026-07-26. Portal thresholds cited from Poki and
CrazyGames first-party documentation.*
