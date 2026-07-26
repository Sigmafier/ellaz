# Dev-cost findings — measured by actually building all five arms

Not opinions. Every line below is something that happened while porting the same
600-tick snake to five engines on 2026-07-25.

## Could the arm reuse our real `logic.ts`?

| arm | reuse | port size | language |
|---|---|---|---|
| pixi | **verbatim** | 0 lines rewritten | TS |
| phaser | **verbatim** | 0 lines rewritten | TS |
| excalibur | **verbatim** | 0 lines rewritten | TS |
| godot | none — full rewrite | ~250 lines GDScript | GDScript |
| defold | none — full rewrite | ~250 lines Lua | Lua |

The three TS arms imported `src/games/snake/logic.ts` unchanged and inherited our
Vitest suite for free. The two native arms required reimplementing the rules, the
bot, the PRNG *and* a hand-written FNV-1a — each a fresh chance to introduce a
divergence. The golden-vector gate is the only reason we know they didn't.

## Toolchain weight and friction

| arm | toolchain to install | headless CI-able? |
|---|---|---|
| pixi / phaser / excalibur | `npm install` | yes, trivially |
| godot | 138 MB editor + ~1 GB export templates | yes (`--headless --export-release`) |
| defold | 200 MB `bob.jar` + **JDK 25** | yes (`java -jar bob.jar`) |
| cocos | GUI Electron editor + account login | **no** — dropped, see SUBSTITUTION-LOG.md |

## Friction actually hit (each cost real time)

**Godot**
- Export failed with a bare `Cannot export project with preset "Web" due to
  configuration errors:` — **no detail, even with `--verbose`**. Root cause was
  that Web export demands `textures/vram_compression/import_etc2_astc=true`.
  Pure guesswork to find.
- GDScript's strict typing rejected ~15 inferred `var x := ...` declarations as
  "Variant" errors; each needed an explicit annotation.

**Defold**
- `bob.jar` 1.13.0 requires **Java 25**; a JDK 21 gives an opaque
  `UnsupportedClassVersionError ... class file version 69.0`.
- The documented platform id `js-web` is **removed** — it is `wasm-web` now.
  Discovered by dumping strings out of `Platform.class`.
- Missing-builtin errors (`/input/game.input_binding` etc.) must be resolved one
  at a time; each failure reports exactly one missing resource.
- **No immediate-mode drawing API.** The other four arms draw primitives from
  code; Defold requires authoring atlas/GUI asset files in a protobuf format.
  This is why the Defold arm has no visual layer (see the validity caveat).

**Excalibur**
- Declaring `private actors` silently shadowed `Scene.actors`, the engine's own
  actor list. TypeScript caught it; a JS engine would not have.

## Portal integration — the binary that may matter more than any number

Our portal lazy-`import()`s each game as a chunk into a React `GameHost`, sharing
one Phaser vendor chunk across every canvas game.

| arm | mounts as a lazy chunk in GameHost? |
|---|---|
| pixi / phaser / excalibur | **yes** — plain ES module import |
| godot | **no** — owns `document`, canvas and the run loop; iframe-only |
| defold | **no** — same; iframe-only |

An iframe per game means: no shared vendor chunk, no shared `@sdk`/`@ui`/`@juice`
/`@i18n`, separate audio unlock, separate service-worker/caching story, and a
separate focus/input context. This is an architecture consequence, not a
tuning knob.

## Validity caveat — read before using the stress numbers

**The Defold arm renders nothing.** It runs the full logic, the stress
simulation loop and reports through the contract, but draws no sprites (see the
no-immediate-mode note above). Therefore:

- Defold **TTI and payload numbers are valid** — the engine boots, runs and reports.
- Defold **FPS numbers are NOT comparable** and are excluded from the stress
  table. Reporting them would flatter Defold for having nothing to draw.

Godot, by contrast, implements 9 real `draw_rect`/`draw_circle`/`draw_line` calls
in both play and stress modes and is fully comparable.

Closing that Defold gap would mean authoring a `.gui` scene plus box nodes — an
extra chunk of work that is itself the finding about Defold's authoring model.
