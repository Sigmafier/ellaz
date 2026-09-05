# Ellaz Studio - the art bible

A studio library of art styles, characters and sprite-making techniques you
can pick from for any game, in any engine. It is the third independent
workspace in this repository, beside the games platform (`src/`) and the
poker table (`holdem/`): its own `package.json`, lockfile, tests, gates and
workflow. **Nothing in `src/` imports from here and nothing here imports
from `src/` or `holdem/`** - `assert-boundary` refuses either direction.

```bash
cd studio
npm ci
npm test               # vitest, pure logic, node (CI reds under 120 tests)
npm run typecheck
npm run gallery        # the gallery on http://localhost:5188 - and ONLY 5188
npm run gallery:build  # dist-gallery/index.html - ONE file, opens from file://
npm run export         # dist-export/: sheets, atlases, manifests, palettes
npm run assert:all     # the seven gates
npm run assert:controls  # every gate's planted-defect controls
npm run build:check    # all of the above, in order
```

**The gallery's port is 5188, by the operator's ruling, and `strictPort`
means a taken port is an error rather than a silently different origin.**
Never `--port` anything else: a port the operator has not authorised cannot
be logged into and the failure reads as a product bug.

**Root `npm test` runs none of this.** Its vitest include is `src/**`, by
design. Run the studio's checks from inside `studio/`.

## What is in here

| directory | holds |
|---|---|
| `art/scene-ops.ts` | the neutral vocabulary: rect / circle / ellipse / polygon with one `fg` flag |
| `art/passes/` | what styles share: pixelate, outline, quantize (NES snap, Game Boy split), shaded fill, grain |
| `art/styles/<id>/` | one `render.ts` and one `recipe.md` per style; `registry.ts` is the single list |
| `art/scenes/` | the three reference scenes every style renders |
| `art/palettes/` | canonical JSON, exported to `.gpl` and `.hex` |
| `art/rig/` | the parts rig: bones, poses, keyframes, baking to frames |
| `art/characters/` | robot and knight (hand-rigged), teddy (parametric), slime (hand-authored frames) |
| `art/techniques/` | eight ways to make frames, each producing the same robot; three card-only |
| `art/games/` | per-game bindings: style, palette, technique, scene, cast |
| `export/` | frame geometry, atlas layout, manifest, `export-all.mjs`, `manifest.schema.json` |
| `adapters/` | Phaser (`load.atlas` + one anim per clip), canvas (player + drawFrame), Godot (a stub, and it says so) |
| `gallery/` | six pages on shadcn + Radix, wearing the ellaz tokens: styles, characters, sprites, palettes, techniques, games. Built to one HTML file; served on 5188 |
| `runner/` | the browser bundle every headless job drives - no server, no port |
| `scripts/` | the six gates, three renderers, gallery shots, and `lib/` they share |
| `docs/` | `art-bible.md` (the studio-wide rules) and `techniques.md` (the library, checked against the code) |

## The two ideas

**A style says how a sprite LOOKS; a technique says where its FRAMES come
from.** They are independent. The gallery's Styles page renders one scene
through every style; its Techniques page renders one robot through every
technique. Pick one of each per game, and write it in `art/games/<id>.json`.

**Engines get an export, never the source.** `npm run export` writes, per
character and style, a PNG sheet, a TexturePacker JSON-hash atlas, and a
manifest naming the clips (fps, loop), the pivot, the sockets and the hitbox
in frame pixels. An adapter reads those three files and nothing else, so a
Godot game and a Phaser game load the same sprite.

## The gates, and why there are seven

Each reads a different artifact. A green one says nothing about what
another would find.

| gate | reads | catches |
|---|---|---|
| `assert:boundary` | import specifiers in `src/`, `holdem/`, `studio/` | either side reaching into the other |
| `assert:tokens` | `gallery/src/tokens.css` against `src/ui/tokens.css`, byte for byte | the gallery's copy of the ellaz tokens drifting from the app's; the fix is printed |
| `assert:recipes` | every `recipe.md` against `registry.ts` | a missing recipe, a renamed heading, a tier that disagrees, a directory with no row |
| `assert:render` | every style x every scene in headless Chromium | a renderer that throws or draws nothing |
| `assert:manifest` | every exported manifest against the schema | a missing pivot, an fps of 0, a stray key |
| `assert:grammar` | every frame name | anything but `<character>_<clip>_<nnnn>`, contiguous, in order |
| `assert:atlas` | atlas vs manifest vs the sheet's pixels | a frame played but not packed, a rect off the sheet, a blank cell |

Every gate has `--control`: it plants the defects it claims to catch and
requires each to fire, beside a positive control that must stay quiet. A
gate nobody has watched fail is not a gate.

## Rendering happens in a browser, on purpose

The renderers are Canvas 2D. Headless jobs bundle `art/` into one script
(`runner/`) that Playwright injects into a blank page, so there is no dev
server and no port to pick. The gallery's BUILD is the same shape: one HTML
file with everything inlined, which opens from `file://` and from the Visual
Hall alike; its dev server is the one port the studio has, 5188. When a
native canvas is wanted for speed, it goes in `art/canvas.ts` as a factory -
never a second renderer.

## The gallery is a TOOL, so it wears the shared kit

The products-vs-tools rule, decided 2026-09-05 after both candidates were
built and measured: **a product (ellaz.fun, the games) ships on the lightest
kit that meets its byte budget - Preact and `src/ui`; a tool (this gallery,
any editor, board or dashboard) ships on shadcn + Radix on the same ellaz
tokens.** One kit for every tool, so the sixth primitive is
`npx shadcn add <name>` from `studio/` (the `components.json` there points
at `gallery/src`), and keyboard, focus and aria arrive with it.

- `gallery/src/tokens.css` is a byte copy of `src/ui/tokens.css`; `assert:tokens`
  holds them equal. Never edit the copy - copy the app's file over it.
- `gallery/src/index.css` maps every shadcn role (`--primary`, `--sidebar`,
  `--muted-foreground`, ...) onto an ellaz token. No page names a colour.
- `gallery/src/components/ui/*` is generated by the shadcn CLI and is vendor
  code: re-`add` it, do not hand-edit it, and do not hold it to the studio's
  500-line file law.
- The sidebar holds the page list and the current page's own pickers; the
  page gets the whole width for the thing being looked at.

## Adding a style

1. `art/styles/<id>/render.ts` exporting `render: Renderer`.
2. `art/styles/<id>/recipe.md` with the nine headings, in order
   (`art/styles/recipe-contract.json`).
3. One row in `art/styles/registry.ts`.

`assert:recipes` reds on a directory without a row and a row without a
directory; `assert:render` reds if it does not draw.

## Adding a character

Hand-rig it (`art/characters/robot/rig.ts` is the model), or generate it
(`art/characters/parametric.ts`), or author frames (`art/characters/slime/frames.ts`).
Whichever way, it carries the five clips - `idle`, `walk`, `attack`, `hurt`,
`ko` - and the tests in `art/characters/characters.test.ts` hold every
character to the same contract.

## Decisions on the record

- Location: a sibling workspace, so poker or a Godot game can take a sprite
  without dragging the ellaz SDK along.
- Gallery: shadcn + Radix on the ellaz tokens, not Storybook (the artifacts
  are canvases and PNGs, not React components) and not vanilla DOM (a
  hand-rolled sidebar was built, measured beside the shadcn one, and lost
  on the sixth-primitive argument - see § The gallery is a TOOL).
- Uniform, untrimmed frames on a grid: the simplest thing every engine loads
  correctly. A game wanting a trimmed pack derives one from this.
- The operator's picks (2026-09-05): SNES 16-bit, paper cut-out and flat
  vector for both games; crayon doodle for Toybox Brawl. Game Boy was picked
  and unpicked. They live in the taste ledger and in `art/games/`.
