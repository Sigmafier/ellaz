# Round 3 — Gem Pop (static-screen) — PARTIAL

**Date**: 2026-07-26 · **Arms**: 3 (Phaser 4, PixiJS 8, Kaplay)
**Sticky input**: 120-move recorded swap tape, golden checksum `37cd50e2`
**Status**: load axis COMPLETE · **render axis NOT MEASURABLE — do not quote it**

## Why this round exists

Round 2 disqualified Kaplay for one reason only: the level *scrolled*, and Kaplay
has no culled tilemap, so a camera-driven game cost it 40% janked frames. But
most of the Ellaz catalogue has no camera at all — memory, sudoku, tictactoe,
math, coloring, minesweeper, 2048. Round 3 tests the case where Kaplay might
legitimately win: a static-screen game that instead stresses **concurrent tweens,
particle bursts and constantly-changing text**.

## The game is real

8x8 board, 6 gem types, cascade resolution, gravity, refill, scoring.
**14/14 logic tests green.** A deterministic bot (highest-scoring legal move, ties
by lowest index) generated the tape: **120 moves, 20,680 points, 1,169 gems
cleared, 298 cascades, longest chain 7**. Replaying the tape independently
reproduces `37cd50e2`.

**Weaker gate than round 2, stated plainly**: all three arms import the same
TypeScript module, so the checksum proves each arm *drives* the simulation
correctly (right tape, right order, no double-stepping) — not that a
cross-language port is faithful. Round 2's gate spanned three languages; this
one does not.

## Load axis — TRUSTWORTHY (ordering), inflated (absolutes)

| arm | PC | tablet | mobile | transfer |
|---|---|---|---|---|
| **kaplay** | **1,109 ms** | 1,174 ms | 1,820 ms | **72 KB** |
| pixi | 1,371 ms | 1,675 ms | 2,654 ms | 148 KB |
| phaser | 1,677 ms | 2,319 ms | 3,329 ms | 378 KB |

Payload cross-validates against round 2 almost exactly — kaplay 73→72 KB, phaser
379→378 KB — which is strong evidence the load axis is sound. **Kaplay ships 5.25x
less than Phaser for the same game.**

The absolute TTIs are inflated ~20% versus round 2 by machine contention (see
below), but the *ordering and ratios* hold across both rounds, so the ranking is
safe even though the milliseconds are not.

## Render axis — NOT MEASURABLE IN THIS ENVIRONMENT

The FPS figures this round are **void**. Three independent signals:

1. **Identical work, 2x spread.** Phaser stress, three fresh runs back to back:
   **11.8 / 15.4 / 24.1 fps**. A metric that moves 2x on identical input is
   measuring the machine.
2. **Sweep vs probe disagree.** The same Phaser stress read 15.2 fps in the sweep
   and 37.2 fps in a standalone probe minutes later.
3. **The machine was 3.2x oversubscribed** — load average **38.8 on 12 cores**,
   20 of 23 GB RAM in use, 14 live Chrome processes belonging to the operator.

Diagnosed rather than assumed: zero leaked Playwright browsers were found (all 14
Chrome processes resolve to `/opt/google/chrome/chrome`, the operator's own), so
this is genuine machine load, not a harness leak. Nothing was killed.

**The question round 3 was built to answer is therefore still open**: does Kaplay
hold frame rate on a tween-heavy static screen, where it has no tilemap handicap?
Load says it should be attractive; render is unproven.

## What would close it

Re-run `harness/r3-measure.mjs` on a quiet machine (load < ~4). The arms, tape,
golden and harness are all built and verified — it is a ~10-minute re-run, not a
rebuild.

## Standing recommendation until then

**Phaser 4 remains the answer**, unchanged. Kaplay's 72 KB / 1.1 s is a genuine
advantage for a small static-screen game and is worth revisiting — but a payload
win alone does not justify a second engine in the stack, and the frame-rate half
of the case is not yet evidenced.
