# Adding a new game - the full recipe and every trap in it

<!-- Extracted VERBATIM from CLAUDE.md on 2026-08-29, when CLAUDE.md was 164,867 chars
     and over Claude Code's 150,000-char per-file limit. Nothing was reworded; the text
     below is byte-identical to what CLAUDE.md held at commit bb8c47b, and
     `npm run assert:context` proves it. CLAUDE.md now points here instead of
     carrying this on every single turn of every session. -->

## Add a new game (~30 min)

1. `src/games/<id>/meta.ts` - the `GameMeta` (id, bilingual title, emoji, color,
   ageBand, category, orientation, renderer, and **`scoreUnit`** if the game keeps
   a record). Keep it **DOM-free**: `catalog.ts` imports it statically, so the home
   grid renders without pulling React, Phaser, or any game code into the shell
   bundle. `scoreUnit` must match the `unit:` the renderer reports and
   `score-unit-declared.test.ts` enforces that, because only the VALUE of a record
   is persisted and never the unit - so the leaderboards read the unit here to
   decide whether fast or slow wins, and a wrong one orders that board backwards
   in silence.
2. `src/games/<id>/logic.ts` - pure rules + `logic.test.ts` (write tests first).
   Take an injectable `rng` as the LAST parameter defaulting to `Math.random`, and
   use `mulberry32`/`seedFrom`/`shuffle` from `@shared` rather than a private copy.
3. Renderer:
   - **DOM:** a `<Game>.tsx` taking `{ ctx }`, then `index.ts` =
     `reactGame(meta, ctx => createElement(Game, { ctx }))`.
   - **Canvas:** a `Phaser.Scene` + `index.ts` exporting a `GameModule` that boots
     `new Phaser.Game({ parent: ctx.mount, scale: { mode: Phaser.Scale.FIT } })`
     (see `games/snake`).
4. On a win, call `winMoment(ctx, { reason, tier, level, at })` from `@shared` -
   from the event handler, never inside a `setState` updater. Render the level row
   with `<DifficultySelector>` from `@ui`, and hold the level in
   **`useRememberedLevel(ctx, ids, fallback)`** rather than `useState` so the game
   reopens on the level last chosen - it is the same `[value, set]` shape, and the
   setter persists. Everything a hardcoded first-level literal then feeds
   (`useState(() => newRound("easy"))`, `ctx.score?.best("easy")`,
   `levelStart("easy")`) must read the restored level instead, or the chrome says
   "Hard" over an easy board. If the game has a position worth returning to, add
   `ctx.session` + `useGameSession` as well - see § Carrying on where you left off,
   and read the rule first, because the snapshot has to carry every reward latch.
5. Register in **two** places, which are deliberately different lists:
   `src/portal/games.ts` holds the ordered roster (`import { meta as <id> }` plus a
   row in `GAMES`), and `src/portal/catalog.ts` holds the lazy loader
   (`<id>: () => import("../games/<id>/index")`). The ORDER lives in one file and
   the loaders in the other because the build-time page emitter reads the roster
   and must never touch game code - a stray `import("../games/snake")` at config
   time would load Phaser inside `vite.config.ts`. `catalog.test.ts` is
   property-based with a count ratchet, and `build.test.ts` asserts the two lists
   stay identical, so a well-formed entry needs no test edit.
6. `src/content/games/<id>.ts` - the page's words, **once per `PAGE_LOCALES`**
   (Hebrew, English, Spanish and French today), plus a `provenance` row for every number
   the prose quotes. See the next section.

**A game cannot ship in fewer languages than the site has, and that is enforced
rather than remembered.** Measured 2026-08-12 by planting a game with a `he|en`
title and no content file at all: `tsc` said `Property 'es' is missing in type
'{ he: string; en: string; }'`, naming the file and the line, and
`content.test.ts` said `games in the catalog with no page: probegame`, naming
the game. Two gates, two different failure shapes, neither of which a reviewer
has to notice. The probe is restorable and sha256-verified; the tree carries
none of it.

So step 6 is not optional and there is no half-done state: a game with two
languages of prose does not compile, and a game with none does not pass tests.
That is the whole "every new game is multilingual by construction" guarantee,
and it costs a new game exactly one more `es:` arm.

The SDK, UI, juice, i18n, PWA, rewards, and analytics come for free. **A new game
almost certainly needs no engine**: 22 of the 23 render as React over a pure
`logic.ts`, and snake is the only one importing Phaser (`SnakeScene.ts`, the sole
hit for `from "phaser"` in `src/`, re-verified 2026-08-13). Phaser sits in its own
lazy `vendor-phaser` chunk - "cached across all canvas games" was never true,
because snake is the only canvas game.
**A web page PER PAGE LOCALE comes for free as well** - the route table is
derived from the roster and `PAGE_LOCALES`, so `/games/<id>/`,
`/he/games/<id>/`, `/es/games/<id>/` and `/fr/games/<id>/` are emitted,
sitemapped and gated the moment step 5 lands. Read the count off
`PAGE_LOCALES`, not off this sentence - it has been wrong twice. Missing step 6 is a red build, not a thin page.

**Two gates key on a DIRECTORY CONTAINING `meta.ts`, not on registration**, so
"I haven't registered it yet" does not keep a half-built game out of their
population: `src/ui/game-art.test.ts` wants a scene in `src/ui/gameArt.ts` and
`src/ui/game-panel-clears-widest-board.test.ts` wants a renderer contributing a
board-sizing expression. Both go red the moment `src/games/<id>/meta.ts` exists.

That is the gates working rather than a nuisance - a game with no picture is not
finished, and the art gate exists *because* 21 games once shipped as one OS emoji
on a colour block while every other gate reported green. But it does mean **a
game cannot be built in parallel slices that each keep the suite green.** Either
land `meta.ts`, the art scene and the renderer together, or expect those two red
until the set is complete. Discovered 2026-08-13, building two games at once.
