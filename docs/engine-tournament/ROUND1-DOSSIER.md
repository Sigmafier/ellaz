# Round 1 — complete dossier

**Brick**: the engine/runtime for a canvas game in the Ellaz web portal
**Date**: 2026-07-25 · **Arms**: 5 · **Sticky input**: snake, 600 ticks, seed 20260725
**Constraint**: web only — PC + mobile + tablet browsers
**Machine-readable**: `results/round1.json` (180 rows: 60 current + 120 labelled superseded)

Everything measured, discovered or corrected in round 1, in one place. Written
before round 2 begins so this evidence survives whatever round 2 does to it.

---

## 1. What was actually compared

| arm | what it represents | language |
|---|---|---|
| **phaser** 4.2.1 | the incumbent — batteries-included framework | TS |
| **pixi** 8.x | the floor — renderer only, hand-rolled game loop | TS |
| **excalibur** 0.30.x | a TS-native engine with scenes/actors/lifecycle | TS |
| **defold** 1.13.0 | native-class runtime, wasm build | Lua |
| **godot** 4.7.1 | full editor-driven engine, wasm build | GDScript |

**Dropped**: Cocos Creator. Its build pipeline exists only inside an Electron GUI
editor behind a cocos.com account login. Every other arm builds headlessly from a
CLI. That is itself a finding — Cocos alone cannot go in CI without a GUI in the
loop — and it is why Excalibur was substituted. Full record: `cells/SUBSTITUTION-LOG.md`.

---

## 2. Fidelity gate — the reason the comparison means anything

All five arms reproduced the same 600-tick golden vector **byte-for-byte across
three languages**:

```
pixi   PASS 355d6d20    phaser PASS 355d6d20    excalibur PASS 355d6d20
defold PASS 355d6d20    godot  PASS 355d6d20
```

Without this the tournament would have been five subtly different games wearing
the same name. Achieved with a MINSTD (Park–Miller) PRNG — chosen over
mulberry32/xorshift because it needs only integer multiply and modulo, so it is
exactly reproducible in GDScript, Lua and TypeScript with no bit-twiddling — plus
a hand-written FNV-1a in each language.

**Reusable for round 2**: the GDScript and Lua ports of MINSTD + FNV-1a already
exist and are verified (`cells/godot/main.gd`, `cells/defold/main/main.gui_script`),
including the Lua `imul32` 16-bit-split trick that avoids both the `bit` library
and 2^53 overflow.

---

## 3. Cold time-to-interactive + payload — the decisive axis

Median of 3 rounds, alternating order, warm-up discarded, ~4 Mbps / 80 ms RTT,
served gzip like a real static host.

| arm | PC | tablet | mobile (4× CPU) | transfer |
|---|---|---|---|---|
| excalibur | **625 ms** | 680 ms | 892 ms | 142 KB |
| pixi | 723 ms | 798 ms | 963 ms | **126 KB** |
| phaser (incumbent) | 1,089 ms | 1,239 ms | 1,521 ms | 366 KB |
| defold | 2,971 ms | 3,138 ms | 3,770 ms | 1,179 KB |
| godot | **21,759 ms** | 22,913 ms | **24,181 ms** | 10,045 KB |

**Spread check** (PC, all rounds) — no arm won or lost on one lucky run:

```
pixi       718, 723, 946 ms        phaser  1089, 1073, 1287 ms
excalibur  625, 630, 615 ms        defold  2968, 2971, 3075 ms
godot      21844, 21463, 21759 ms
```

Godot's own game content (`index.pck`) is **10 KB**. The other 9,904 KB is engine
runtime that every future game pays again.

Our numbers independently reproduce the published figures: measured 10,045 KB vs
Poki's stated ~10 MB for an empty Godot project; measured 1,179 KB vs Defold's
stated ~1.03 MB. For context, Poki's portal budget is ≤5 MB initial / ≤8 MB total.

---

## 4. Stress scene — 800 sprites + a 300-particle burst every 2s

| arm | PC fps | PC p95 | tablet fps | mobile fps | mobile p95 | fair? |
|---|---|---|---|---|---|---|
| defold | **60.0** | 17.28 ms | 58.2 | 41.9 | 33.33 ms | ✅ |
| phaser | 34.8 | 46.06 ms | 45.0 | **58.1** | 20.76 ms | ✅ |
| pixi | 29.5 | 46.31 ms | 38.2 | 51.2 | 24.66 ms | ✅ |
| godot | 11.0 | 107.37 ms | 15.1 | 16.1 | 96.98 ms | ⚠️ |
| excalibur | 10.7 | 179.69 ms | 5.7 | 4.0 | 275.97 ms | ⚠️ |

**Only the three ✅ rows are an engine comparison.** Godot's arm used
immediate-mode `_draw()` (idiomatic Godot would use Sprite2D/MultiMesh);
Excalibur's allocated a new `Rectangle` per actor and recreated 300 actors per
burst. Both are *my* implementations, not the engines' ceilings.

Among the fair three: **Defold wins desktop (60.0), Phaser wins mobile (58.1 vs
Defold's 41.9)**. Defold appears more CPU-bound under the 4× mobile throttle,
consistent with pushing 1,100 per-node `set_position` calls across the Lua/wasm
boundary each frame.

Mobile FPS exceeding PC FPS is expected, not an error: the mobile viewport is
390×844 vs 1440×900, so there are far fewer pixels to fill, and this workload is
fill-rate bound.

---

## 5. Portal integration — a binary that outranks every number

| arm | mounts as a lazy chunk in our React `GameHost`? |
|---|---|
| pixi / phaser / excalibur | **yes** — plain ES module import |
| godot / defold | **no** — each owns `document`, the canvas and the run loop; iframe-only |

Iframe-only means no shared vendor chunk, no shared `@sdk`/`@ui`/`@juice`/`@i18n`,
separate audio unlock, separate service-worker/caching story, separate input and
focus context. For a portal of many small games that is an architecture break,
not a config choice.

---

## 6. Dev cost — measured by actually building all five

### Could the arm reuse our real `logic.ts`?

| arm | reuse | port size |
|---|---|---|
| pixi / phaser / excalibur | **verbatim** | 0 lines rewritten |
| godot | none — full rewrite | ~250 lines GDScript |
| defold | none — full rewrite | ~250 lines Lua |

The three TS arms imported `src/games/snake/logic.ts` unchanged and inherited our
Vitest suite for free. The two native arms required reimplementing the rules, the
bot, the PRNG *and* a hand-written FNV-1a — four fresh chances to diverge. The
golden gate is the only reason we know they didn't.

### Toolchain weight

| arm | toolchain | headless CI-able? |
|---|---|---|
| pixi / phaser / excalibur | `npm install` | yes, trivially |
| godot | 138 MB editor + ~1 GB export templates | yes (`--headless --export-release`) |
| defold | 200 MB `bob.jar` + **JDK 25** | yes (`java -jar bob.jar`) |
| cocos | GUI Electron editor + account login | **no** — dropped |

### Friction actually hit (each cost real time)

**Godot**
- Export failed with a bare `Cannot export project with preset "Web" due to configuration errors:` — **no detail even at `--verbose`**. Root cause: Web export demands `textures/vram_compression/import_etc2_astc=true`. Found by pure guesswork.
- Strict typing rejected ~15 inferred `var x := …` declarations as Variant; each needed an explicit annotation.

**Defold**
- `bob.jar` 1.13.0 requires **Java 25**; JDK 21 gives an opaque `UnsupportedClassVersionError … class file version 69.0`.
- The documented platform id `js-web` is **removed** — it is `wasm-web`. Discovered by dumping strings out of `Platform.class`.
- Missing-builtin errors surface one at a time, each naming exactly one resource.
- **No immediate-mode drawing API.** Every visual must be a GUI/atlas node authored in a protobuf format. This is why the arm initially rendered nothing.
- Default `max_nodes: 512` is too low for 800 sprites + 300 particles → raised to 2048.
- GUI nodes live in the scene's **design space** (900×900), not the canvas pixel size — using `window.get_size()` put the board off-centre.
- A 1 px grid line in a 900-wide design space renders at 0.73 px and disappears.

**Excalibur**
- Declaring `private actors` silently shadowed `Scene.actors`, the engine's own actor list. TypeScript caught it; a JS engine would not have.
- `boot()` called at module top instantiated scene classes declared below — class declarations are not hoisted (TDZ). Moved the call to the bottom of the file.

---

## 7. Measurement bugs found and fixed — read this before trusting any harness

Four separate bugs would each have produced a confident, wrong verdict. All were
caught and fixed *before* the numbers were reported. Round 2's harness inherits
every fix.

| bug | effect if unfixed | fix |
|---|---|---|
| Playwright `waitForFunction(fn, {timeout})` — options is the **third** argument | my options object was read as the page-function arg; the timeout silently stayed 30 s and Godot "failed" | `(fn, null, {timeout})` |
| Test server sent no `content-encoding` | Godot downloaded 38 MB raw instead of ~10 MB — unfair to the largest arm | `gzipSync` + `content-encoding: gzip` |
| `readPixels` reported `litPixels: 0` for a correctly-rendering arm | Defold judged "not rendering" when it was | canvas lacks `preserveDrawingBuffer` — verify with a **screenshot**, never a pixel count |
| Golden bot turned randomly | 44 deaths, maxScore 1 — a useless vector that barely exercised the game | deterministic greedy bot → 1 death, maxScore 26 |

Also worth carrying forward: `pkill -f "[r]un.mjs"` **self-matched the issuing
shell** (the pattern was in its own argv) and killed it, exit 144. Kill by
resolved PID after checking `/proc/<pid>/cmdline`.

---

## 8. The correction — Defold's blank panel

Operator reported "looks like defold is not working". Defold was in fact booting,
running the full simulation and passing the checksum — it simply **drew nothing**,
because no visual layer had been built for it (see the no-immediate-mode note
above). I had flagged this as a gap and excluded its FPS; the operator was right
that a blank panel made the arm useless to judge.

A GUI visual layer was built (board, border, 32 grid lines, pooled segment nodes,
800 stress sprites, 300 particles — all runtime `gui.new_box_node`s), three
rendering bugs were fixed, fidelity was re-verified (`defold PASS 355d6d20`), and
the arm was re-measured.

**This changed the result.** Defold's FPS moved from EXCLUDED to valid and it
became the fastest desktop renderer in the grid. Two claims of mine went stale
and were corrected: that Phaser "wins the only fair FPS comparison" (Defold beats
it on desktop) and that the Defold panel renders blank.

Superseded rows are retained and labelled in `results/round1.json`.

---

## 9. Verdict as it stood at the end of round 1

1. **Phaser 4 stays** — not because it is the fastest renderer (Defold beats it on
   desktop, 60.0 vs 34.8 fps) but on the balance that matters here: fastest of the
   three *valid* arms on mobile (58.1 fps), mounts as a lazy chunk, reuses
   `logic.ts` verbatim with our Vitest suite, and its 366 KB is paid once and
   shared across every canvas game.
2. **Godot is definitively out for web** — 21.8 s desktop / 24.2 s mobile TTI,
   iframe-only, 10 KB of game inside 10 MB of runtime.
3. **Defold is out on integration, not merit** — fastest renderer in the grid
   (p95 17.3 ms with 1,100 nodes), respectable 1.18 MB, but 3.0 s TTI, iframe-only,
   and its Lua port could not reuse `logic.ts` at all.
4. **PixiJS and Excalibur load ~400 ms faster than Phaser at ~⅓ the bytes** — not
   migration-worthy, but worth remembering for a load-critical game.

**Net: no change to the platform.** A control arm winning is a real result, and
"should we have used Godot?" is now answered with measurements instead of opinion.

---

## 10. Why round 2 exists

Snake cannot separate these engines on the axes that will actually decide our next
games. It loads **no art**, never **scrolls**, has **no physics**, and has **no
jump to feel**. It also left two arms' FPS implementation-limited and therefore
unrankable, and the operator's eyeball gate was never closed.

Round 2 addresses exactly that: a real platformer level, engine-idiomatic
rendering in every arm, a sixth candidate (Kaplay) purpose-built for the genre,
and new axes — asset-pipeline cost, p99 scroll jank, and input-to-pixel latency.
Plan: `~/.claude/plans/synthetic-doodling-rivest.md`.
