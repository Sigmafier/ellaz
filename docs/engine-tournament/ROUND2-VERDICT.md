# Round 2 — VERDICT

**Brick**: the engine/runtime for a canvas game in the Ellaz web portal
**Date**: 2026-07-25 (corrected 2026-07-26) · **Arms**: 6 · **Sticky input**: Hopper, a 660x16 platformer
**Golden checksum**: `f84a3f6e` · 4,299-tick input tape · 71.7s of play
**Constraint from the operator**: web only — PC + mobile + tablet browsers

Round 1 used Snake, which loads no art, never scrolls, has no physics and no
jump to feel — and left two arms' FPS implementation-limited and unrankable.
This round fixes all of that.

---

## Fidelity gate — passed by all six

Every arm reproduced the same 4,299-tick vector byte-for-byte across **three
languages** (TypeScript ×4, GDScript, Lua):

```
phaser PASS f84a3f6e   pixi   PASS f84a3f6e   excalibur PASS f84a3f6e
kaplay PASS f84a3f6e   godot  PASS f84a3f6e   defold    PASS f84a3f6e
```

This is stronger than round 1's gate: the simulation now includes gravity,
variable-height jumping with coyote-time and jump-buffering, AABB tile
collision, patrolling enemies with stomp-kill, coin pickup, pit death and
respawn — and all of it agrees exactly across the three languages.

That was not luck. It rests on **integer fixed-point physics** (int32 in 1/256-px
units at a fixed 60 Hz), proven bit-identical by a dedicated blocking probe
before any renderer was written (`probe/RESULT.md`). The probe was verified to
have teeth: swapping floor-division for truncation — what GDScript's bare
`int / int` does — produces a *different* checksum.

---

## Cold time-to-interactive + payload

Median of 3 rounds, warm-up discarded, order alternated, ~4 Mbps / 80 ms RTT,
served gzip. `geo` skin (the only one all six arms support).

| arm | PC | tablet | mobile (4x CPU) | transfer |
|---|---|---|---|---|
| **kaplay** | **885 ms** | 1,016 ms | **1,412 ms** | **73 KB** |
| pixi | 1,170 ms | 1,312 ms | 1,677 ms | 137 KB |
| phaser (incumbent) | 1,426 ms | 1,712 ms | 2,208 ms | 379 KB |
| excalibur | 1,916 ms | 2,221 ms | 2,910 ms | 129 KB |
| defold | 2,984 ms | 3,248 ms | 3,726 ms | 1,120 KB |
| **godot** | **22,640 ms** | 23,774 ms | **26,336 ms** | 10,064 KB |

Spreads are tight (kaplay 869–885 on PC), so these are real differences.

**Real third-party assets are nearly free**: the Kenney CC0 pack costs only
**7–15 KB** more than our generated art across every arm. Payload is dominated
entirely by engine runtime, not by art. The asset-pipeline fear was unfounded.

---

## Render — the axis round 1 could not measure fairly

Real level plus a 900-sprite swarm. Reported as a **distribution**, because
round 1 proved mean FPS hides everything that is actually felt.

| arm | PC fps | PC p99 | PC jank% | mobile fps | mobile p99 | mobile jank% |
|---|---|---|---|---|---|---|
| **defold** | **60.0** | 17.3 ms | **0%** | 39.5 | 33.3 ms | **0%** |
| **pixi** | **60.0** | 17.2 ms | **0%** | **58.7** | 21.9 ms | **0%** |
| **phaser** | **60.0** | 16.8 ms | **0%** | 56.7 | 33.4 ms | 1.0% |
| kaplay | 30.0 | 43.4 ms | 40% | 19.8 | 74.5 ms | 100% |
| excalibur | 21.4 | 57.2 ms | 100% | 9.6 | 127.6 ms | 100% |
| godot | 14.1 | 93.3 ms | 100% | 14.5 | 83.9 ms | 100% |

**All six numbers are fair this time.** Round 1 had to disclaim Godot (immediate
-mode `_draw()`) and Excalibur (per-frame allocation). Round 2's Godot arm uses a
real `TileMapLayer` + `TileSetAtlasSource` + `Sprite2D`, and the Excalibur arm
swaps graphics only on change and mutates positions in place. Each arm uses its
engine's own best tilemap story, so this ranks *"the engine at its best"* rather
than identical work — which is the right question.

Note what the distribution exposes: **Kaplay's 30 fps average conceals 40% janked
frames**, and on mobile it janks on *every single frame*. A mean-only table would
have called that "half of 60" instead of "unplayable".

---

## Portal integration — still the binary that outranks the numbers

| arm | mounts as a lazy chunk in our React `GameHost`? |
|---|---|
| pixi / phaser / excalibur / kaplay | **yes** — plain ES module import |
| godot / defold | **no** — each owns `document`, canvas and run loop; iframe-only |

| arm | reuses our real `logic.ts`? | port cost |
|---|---|---|
| pixi / phaser / excalibur / kaplay | **verbatim** | 0 lines rewritten |
| godot | no — full rewrite | ~330 lines GDScript |
| defold | no — full rewrite | ~380 lines Lua + a build-time asset generator |

---

## Verdict

**1. Phaser 4 stays — and this time it earns it on merit, not just incumbency.**
It is one of only three arms holding a locked **60 fps with zero jank**, it
mounts as a lazy chunk, it reuses `logic.ts` verbatim with our Vitest suite, and
its 379 KB is paid once and shared across every canvas game. Its only real loss
is load time, and that cost is amortised across ten games.

**2. PixiJS is the genuine alternative, and the strongest all-rounder measured.**
It matches Phaser's 60 fps / 0% jank on desktop and **beats it on mobile** (58.7
vs 56.7 fps, 0% vs 1.0% jank) while loading **256 ms faster at 36% of the bytes**.
The cost is real though: it is a renderer, not an engine — the game loop, tile
culling and sprite pooling in this arm are all hand-rolled. Worth it only for a
load-critical canvas game, not worth re-porting ten working games for.

**3. Godot is out for web — on time-to-interactive and frame rate, not on size.**
Round 1 disqualified it on load; the "you built it wrong" objection is now closed
with an idiomatic re-test, and it *still* returns **14 fps with 100% janked
frames**.

**CORRECTION (2026-07-26, after external research):** the size half of this
verdict was overstated. Our 10 MB is the **stock export template**, not Godot's
floor — custom-compiled templates (`disable_3d`, `optimize=size`, no advanced
text server, no Mono, `wasm-opt`, Brotli) are reported reaching **~2.4 MB
Brotli**, and one project took 41 MB to 9.5 MB. And the portal budgets were wrong
in our notes: Poki targets **initial download under 8 MB** (not the 5 MB we had),
while **CrazyGames allows 50 MB** — which stock Godot passes comfortably.

What actually disqualifies it is **time**: CrazyGames requires **time-to-gameplay
≤ 20 s**, and we measured **22.6 s desktop / 26.3 s mobile**. The 14 fps at 100%
jank is independent of build size entirely.

**We then built the stripped template and measured it** rather than leaving the
caveat theoretical. Godot 4.7.1 compiled with `optimize=size lto=full
threads=no disable_3d=yes`, no Mono, no advanced text server, no
WebRTC/CSG/noise/navigation. It passes the golden checksum and renders correctly.

| | stock | stripped | verdict |
|---|---|---|---|
| transfer (gzip) | 10,064 KB | **7,316 KB** | −27% |
| TTI desktop | 23,152 ms | **19,087 ms** | **clears 20 s — just** |
| TTI tablet | 25,481 ms | 24,456 ms | still fails |
| TTI mobile | 28,584 ms | **33,119 ms** | **WORSE — fails harder** |
| stress fps (PC) | 11.0 | 10.6 | unchanged |
| jank (PC) | 100% | 100% | unchanged |

Three findings, none of which rescue it:

1. **Desktop clears the bar, barely** (19.1 s vs 20 s) — so "a custom template
   changes nothing" would have been wrong, and the correction above was right.
2. **Mobile gets ~4.5 s WORSE**, and it is not noise — three runs each,
   stock 27.8/28.6/29.3 s vs stripped 32.7/33.1/33.6 s, non-overlapping. A
   smaller download is being outweighed by something costlier to instantiate
   under the 4× CPU throttle; `lto=full` is the obvious suspect but we did not
   isolate it. **We tested one point in the custom-template space, not the space.**
3. **Frame rate is untouched** (10.6 vs 11.0 fps, 100% jank both). Build size was
   never the mechanism there.

There is also a trap worth recording: a custom Godot web build **defaults to
threads on**, which requires `SharedArrayBuffer` and full cross-origin isolation.
That build refused to run behind an ordinary static server, and per Godot's own
docs cross-origin isolation *"means no ads, nor third-party integrations on the
website hosting your game"* — i.e. incompatible with the Poki/CrazyGames SDK
model. The portal-viable variant is `threads=no`, which is what the table above
measures.

**4. Defold is the surprise, and it is out on integration rather than merit.**
It is the joint-fastest renderer (60 fps, 0% jank desktop; 39.5 fps, 0% jank
mobile — the only *native* arm that is genuinely fast). But it loses on four
structural counts, none tunable: **2.98 s TTI**, **iframe-only** so it cannot
mount in `GameHost` or share our SDK, **cannot reuse `logic.ts`**, and it needs a
**build-time asset generator** (tilesource, baked tilemap, entity prototype) where
every other arm takes a PNG plus JSON at runtime. Remember it if we ever build a
standalone, render-heavy game outside the portal shell.

**5. Kaplay is a real find for the right job — and this is not that job.**
**885 ms and 73 KB** is the best load result in the grid by a wide margin, and it
mounts as a plain ES module. But it has no culled tilemap component, so a
scrolling platformer costs it 40% janked frames on desktop and 100% on mobile.
For a static-screen casual game — which describes most of the Ellaz catalogue —
it would be an excellent, tiny choice. For a scroller, no.

**6. Excalibur is out.** Slowest load of the four JS arms *and* 21 fps at 100%
jank. Nothing recommends it here.

**Net: no change to the platform.** Phaser 4 remains correct for our canvas
games, and this time that conclusion rests on a real game rather than Snake.
Two new, documented options: **PixiJS** if a canvas game is ever load-critical,
**Kaplay** if we build a small static-screen game and want a 73 KB runtime.

---

## Validity limits — stated before the numbers, not after

1. **This does not measure built-in physics quality.** Every arm runs our shared
   deterministic integer physics so the games are provably identical. What each
   engine's own physics would have given for free is not measured.
2. **Rendering is engine-idiomatic but not identical work.** Each arm uses its
   engine's best tilemap approach, and those differ structurally (Phaser and
   Godot cull a real tilemap layer; Pixi and Excalibur pool sprites; Kaplay
   redraws immediate-mode). That is the intended question, but it is not
   like-for-like drawing.
3. **The Defold arm supports the `geo` skin only.** Kenney would need a second
   tilesource (18px tiles, 24px characters, two sheets) plus a second baked
   tilemap. So `geo` is the ranking skin; Kenney is the payload-delta finding on
   the other five.
4. **Framing is not normalised.** Each engine fits its 480x256 canvas to the page
   its own way. Differences in letterboxing in the compare sheet are mine, not
   the engines'.
5. **Every arm was verified by screenshot, never a pixel-count probe** — round 1
   reported `litPixels: 0` for an arm that was rendering correctly.
6. **Every arm used its engine's STOCK build configuration.** No custom export
   templates, no tree-shaking beyond each toolchain's default. This is the
   out-of-the-box cost, which is the right question for "what does adopting this
   engine cost us" — but it is NOT each engine's floor. Godot in particular is
   reported to compress substantially with a custom template (see the correction
   under verdict 3).

---

## Still open — the eyeball gate

The machine axis is done; the human one is not. Pre-committed question, fixed
before any results were seen:

> *Which one's jump feels best, and which would you play again?*

```
node harness/serve-grid.mjs 0.0.0.0     # then open http://<dev-box-ip>:5600/
```

Compare sheet: `screenshots/r2-compare-geo.png`.
