# Round 3 — Gem Pop (static screen) — VERDICT

**Date**: 2026-07-27 · **Arms**: 3 (Phaser 4, PixiJS 8, Kaplay)
**Sticky input**: 120-move recorded swap tape, golden checksum `37cd50e2` (all three arms)
**Status**: COMPLETE — both axes measured, arms verified equal-work

## The question

Round 2 disqualified Kaplay for one reason: the level *scrolled*, and Kaplay has
no culled tilemap. But most of the Ellaz catalogue has no camera at all —
memory, sudoku, tictactoe, math, coloring, minesweeper, 2048. Round 3 asks
whether Kaplay wins where that handicap does not apply: a static screen that
instead stresses concurrent tweens, particle bursts and changing text.

## Answer: yes on desktop and tablet — on mobile, a jank win and an fps tie

Medians of 3 rounds. All arms verified rendering at **488×558 with 4× MSAA**
before any number was taken.

| arm | PC | tablet | mobile | TTI (PC) | transfer |
|---|---|---|---|---|---|
| **kaplay** | **59.9 fps / 0.2% jank** | **59.4 / 0.0%** | 45.0 / **0.7%** | **684 ms** | **72 KB** |
| phaser | 57.8 / 0.6% | 51.9 / 2.3% | 43.1 / 7.3% | 1,361 ms | 378 KB |
| pixi | 43.7 / 0.3% | 39.3 / 2.3% | 35.1 / 11.4% | 1,063 ms | 148 KB |

**Read the fps margins against the noise, not as raw numbers** — a lead smaller
than a cell's own round-to-round spread is a tie, however clean the median looks:

| viewport | kaplay − phaser | worst spread | verdict |
|---|---|---|---|
| PC | +2.1 fps | 0.3 fps | **real win** |
| tablet | +7.5 fps | 1.7 fps | **real win** |
| mobile | +1.9 fps | **3.9 fps** | **tie** — ordering flips in 1 of 3 rounds |

So: Kaplay wins **PC and tablet outright** on both axes, starts in half the time
and ships **one fifth** the bytes. On **mobile its fps is a statistical tie with
Phaser** — but its **jank win there is consistent**, lowest in *every* round
(0.72 / 0.49 / 3.49% against Phaser's 7.27 / 9.09 / 5.60%), which is the axis
that decides whether a game feels smooth.

It also wins while carrying a handicap it cannot switch off: Kaplay hardcodes
`antialias: true` and `preserveDrawingBuffer: true` in its `getContext` call,
with no option to disable either. The result is therefore conservative.

*(The mobile overstatement was caught by `harness/r3-variance.mjs` during
`/finalize`, after the first version of this file claimed a clean sweep of all
three viewports. Median-only reporting hid it: the median is a real win, the
per-round ordering is not.)*

## The measurement was wrong twice before it was right

This is the substance of the round, and it is worth more than the table above.

**Pass 1 — the machine.** Every arm read 8–15 fps. Three identical Phaser runs
gave 11.8 / 15.4 / 24.1 fps; the same cell read 15.2 in the sweep and 37.2 in a
standalone probe. Load average was **38.8 on 12 cores**. Diagnosed rather than
assumed — all 14 Chrome processes resolved to the operator's own browser, zero
leaked Playwright instances, so nothing was killed. Numbers discarded.

**Pass 2 — the harness.** Re-run on a quiet box, the data looked *excellent*:
3 rounds per cell, 4–6% spread, stable rank ordering, payload cross-validating
against round 2 to within 1 KB. Every validity check I had built came back
green, and the ranking was still wrong.

A WebGL context probe — asking the live `getContextAttributes()` what was
actually granted, rather than trusting the engine config — found the arms were
not doing the same work:

| arm | backbuffer | MSAA | fill vs rivals |
|---|---|---|---|
| phaser | 488×558 | 4× | 1.0× |
| pixi | 488×558 | **0×** | 1.0×, no AA |
| kaplay | **1440×900** | 4× | **4.76×** |

Two independent defects, both mine. Pixi was the only arm explicitly setting
`antialias`, and I had set it to the expensive value. Kaplay's `letterbox`
scales the *content* but sizes its backbuffer from `canvas.offsetWidth ×
pixelDensity` — and it hard-sets the canvas to `width: 100%`, so the **parent
box**, not the canvas, is the lever. Left alone it rendered the whole window.

That single flaw manufactured the entire result: Kaplay looked worst on PC
(4.76× the fill) and best on mobile (only ~1.2× there, because the mobile
viewport is small). The write-up would have read *"Kaplay struggles on desktop
but wins on mobile"* — a conclusion produced start to finish by my own harness.

**The lesson that generalises**: reproducibility measures whether the *machine*
was quiet. It says nothing about whether the *arms are comparable*. Three tight
rounds and a cross-validated payload are not evidence of a fair comparison. Only
interrogating the live artifact caught it — the config had been claiming 488×558
for all three the whole time.

Guards added, both now in the harness: every row is stamped with the 1-minute
load average, and `harness/r3-ctx-probe.mjs` asserts equal backbuffer and sample
count before a sweep is trusted.

## Why the data is trustworthy this time

Not "the machine was quiet" — that claim failed once already. The dataset
defends itself: within each viewport the three rounds were taken across a load
range of **8.4 → 12.1**, and fps is flat across it (a **+42%** swing in machine
load moves Phaser's PC result by **0.5%**).

```
kaplay   load  8.95 -> 60.1    load  9.94 -> 59.9    load 12.12 -> 59.8
phaser   load  8.44 -> 57.9    load 11.89 -> 57.8    load 12.01 -> 57.6
pixi     load 10.05 -> 43.7    load 11.21 -> 43.9    load 11.96 -> 43.4
```

Spread is **0.3–0.5 fps** (it was 12.3 in the void run). A 44% swing in machine
load moves the result by half a frame, so these numbers are a property of the
engines, not the box. That is a much stronger claim than "load was low".

## Validity limits, stated plainly

- **The fidelity gate is weaker than round 2's.** All three arms import the same
  TypeScript module, so `37cd50e2` proves each arm *drives* the simulation
  correctly (right tape, right order, no double-stepping) — not that a
  cross-language port is faithful. Round 2's gate spanned three languages.
- **Pixi's third place is real but partly self-inflicted.** Measured at 48.5 fps
  on PC with AA off versus 43.7 with 4× MSAA — still last either way, so the
  ranking holds. Pixi is also the only arm on **WebGL2**, where MSAA resolves via
  an explicit blit rather than a multisampled default framebuffer; that is an
  engine default, not something the harness imposed.
- **This is one static-screen game.** Tween-, particle- and text-heavy. A
  static screen dominated by something else (large images, heavy text layout)
  is not covered.

## What it changes

Kaplay earns a **documented static-screen carve-out**. For a small game with no
camera it beats Phaser on desktop and tablet frame rate, matches it on mobile
frame rate while janking far less, and does it at a fifth of the bytes and half
the start time.

It does **not** displace Phaser as the default. Phaser is second by a small
margin on a game type Kaplay is best at, and round 2 shows it far ahead once a
camera is involved — and the shared Phaser vendor chunk is already paid for and
cached across all ten existing games. Adding Kaplay means a second engine in the
bundle, which only pays for itself on a game that would otherwise load Phaser
for the first time.
