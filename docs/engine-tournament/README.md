# Engine tournament — why Ellaz runs on Phaser 4

Two head-to-head bake-offs, 294 measured rows, six engines. This folder is the
durable record so the decision doesn't have to be re-argued from memory.

**Short answer**: Phaser 4 for canvas games. **Kaplay for a static-screen game** —
round 3 put it ahead of Phaser on desktop and tablet (and level on mobile, with
less jank) at a fifth of the bytes. PixiJS if a specific game is load-critical.
Godot and Defold are out on load time and integration.

> ### ⚠ Before you quote a number from this folder
>
> **The fps and jank columns are not evidence about how a game feels.** They were
> measured on a 900-sprite stress against a game that runs ~50, headless at 60 Hz.
> Three operator eyeball runs — one named, one blind, one blind pairwise — put
> **Excalibur, Phaser and Kaplay level on feel, with only Pixi reliably last**, i.e.
> almost the inverse of the fps table. Read
> [**EYEBALL-VERDICT.md**](EYEBALL-VERDICT.md) before citing anything from the
> render axis.
>
> Payload, time-to-interactive, integration cost and dev cost are sound and
> **re-auditable** — the raw rows are in [`data/`](data/) and every published PC
> cold-TTI figure re-derives from them to the digit.

The decision summary lives in [`../../CLAUDE.md`](../../CLAUDE.md) under
*"Engine choice"*. Everything here is the evidence behind it.

---

## Read in this order

| File | What it answers |
|---|---|
| [EYEBALL-VERDICT.md](EYEBALL-VERDICT.md) | **Start here.** Why the benchmark ranked the engines almost backwards, the display-rate defect that caused the felt lag, the two blind protocols, and what is safe to quote |
| [ROUND2-VERDICT.md](ROUND2-VERDICT.md) | The per-engine verdict with validity limits stated alongside |
| [summary-round2.md](summary-round2.md) | The round-2 measurement tables (TTI, payload, FPS distribution) |
| [dev-cost.md](dev-cost.md) | What each engine cost to actually build on — toolchains, friction, port size |
| [ROUND1-DOSSIER.md](ROUND1-DOSSIER.md) | The first round (Snake) and why it wasn't good enough |
| [PROBE-SPEC.md](PROBE-SPEC.md) / [PROBE-RESULT.md](PROBE-RESULT.md) | How we proved all six arms ran the *same game* |
| [ROUND3-VERDICT.md](ROUND3-VERDICT.md) | Round 3 (static-screen match-3). **Kaplay wins every viewport** — and how two harness bugs nearly produced the opposite answer |
| [ROUND2-CORRECTION.md](ROUND2-CORRECTION.md) | **Read with round 2.** The round-2 Kaplay arm rendered ~10.5x the pixels of its rivals; verdict survives, published fps figures do not |

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
- **Equal work, verified at the context.** Same input is not enough — the arms
  must also *render the same thing*. `probes/r3-ctx-probe.mjs` asks the live
  WebGL context what it actually granted (backbuffer size, MSAA samples, WebGL
  version) instead of trusting each engine's config. Added after it caught two
  arms rendering wildly different pixel counts; see
  [ROUND3-VERDICT.md](ROUND3-VERDICT.md). **`probes/` is archived for method and
  is not runnable from this repo** — the scripts need Playwright and the built
  arm trees from the (deleted) tournament scratchpad; each says so at the top.

## The headline numbers

Median of 3 rounds, warm-up discarded, throttled to ~4 Mbps / 80 ms, gzipped.

```
                cold start (desktop)   transfer    fps      janked frames
kaplay                 885 ms            73 KB     46.4 †       5.9% †
pixi                 1,170 ms           137 KB     60.0          0%
phaser               1,426 ms           379 KB     60.0          0%
excalibur            1,916 ms           129 KB     21.4        100%
defold               2,984 ms         1,120 KB     60.0          0%
godot               22,640 ms        10,064 KB     14.1        100%
```

**† Kaplay's frame-rate figures are corrected and provisional.** The round-2
Kaplay arm was measured rendering 1440×900 with 4× MSAA while every rival
rendered 480×256 with none — roughly 10.5× the pixels. The originally published
30.0 fps / 40% jank was that handicap, not the engine. Re-measured with the
backbuffer matched it reads 46.4 fps / 5.9%, and it still loses the scroller
badly (48.7% jank on tablet, 100% on mobile). See
[ROUND2-CORRECTION.md](ROUND2-CORRECTION.md) — the load axis is unaffected.

Note that mean FPS alone would have been misleading: on mobile Kaplay janks on
every single frame here, which no average conveys.

## What this does NOT tell you

- **Anything 3D.** All six arms are 2D. A 3D marketplace game needs a separate
  three.js / Babylon.js / PlayCanvas evaluation.
- **Built-in physics quality.** Deliberately bypassed — every arm ran one shared
  deterministic simulation so the games were provably identical.
- **Input latency to *pixels*.** Measured properly on 2026-08-01 for the four JS
  arms — 3 runs × 12 trials, and all four move on the **same frame**, 144/144.
  But that stops at "the engine assigned a new position"; the compositor and swap
  are downstream of it, and the millisecond column swings 2-5× with machine load
  so it ranks nothing. See [EYEBALL-VERDICT.md](EYEBALL-VERDICT.md).
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

---

## Status — settled 2026-08-01, and what is still open

**Settled. Do not re-run a tournament for these.**

- **Phaser 4 is the engine.** It ties the field on feel and wins on dev cost,
  ecosystem and jank. The question was closed by three eyeball runs, not by the
  benchmark.
- **Kaplay for a static-screen game** (round 3), **Pixi only if one game is
  load-critical**, **Godot and Defold out** on 22.6 s time-to-interactive and
  iframe-only integration respectively. None of these turn on the disputed
  render axis.
- **The display-rate trap is a project rule**, not a tournament footnote:
  [`.claude/rules/fixed-timestep-must-match-display.md`](../../.claude/rules/fixed-timestep-must-match-display.md)
  carries the reference implementation inline, because the tournament tree that
  produced it lived in a scratchpad and is gone.

**Open, and worth knowing before you trust a figure.**

| # | Open item | Why it matters |
|---|---|---|
| 1 | Round-2 fps/jank never re-measured on a quiet box | Every ranked run happened at load 6-40 on 12 cores. The `ROUND2-CORRECTION.md` Kaplay figures are provisional for this reason |
| 2 | The fps axis measures a 900-sprite stress, not a ~50-sprite game | Ranks batching throughput, which a pure renderer wins by construction. Re-scope before it decides anything |
| 3 | Nobody knows why Excalibur *felt* first in two four-arm runs | Input latency, the update/draw split and render parity were all measured and all tie. Probably a ranking artifact — the pairwise says level |
| 4 | Input latency stops at position-assign, not at photons | A screencast probe would close it, and needs a 120 Hz machine to be worth running |
| 5 | **Anything 3D is unevaluated** | All six arms were 2D. A three.js / Babylon / PlayCanvas bake-off would be a fresh tournament |

**If you are here to add a game**, none of the above blocks you — follow
*"Add a new game"* in [`../../CLAUDE.md`](../../CLAUDE.md). The only thing to carry
in your head is rule
[`fixed-timestep-must-match-display`](../../.claude/rules/fixed-timestep-must-match-display.md),
and only if your game has continuous motion.
