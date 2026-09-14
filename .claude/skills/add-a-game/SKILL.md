---
name: add-a-game
description: Add a new game to the Ellaz catalogue - the six-step recipe (meta, pure logic, renderer, winMoment, the two registration lists, the per-locale content file) and the gates that refuse a half-finished one. Use when adding, scaffolding or registering a game under src/games/.
---

# Add a new game (~30 min)

Evidence, measurements and the full prose for every step:
[`docs/adding-a-game.md`](../../../docs/adding-a-game.md).

## The six steps

1. **`src/games/<id>/meta.ts`** — the `GameMeta`: id, bilingual title, emoji, colour,
   `ageBand`, category, orientation, renderer, and **`scoreUnit`** if it keeps a record.
   Keep it **DOM-free** — `catalog.ts` imports it statically, so anything it drags in
   lands in the shell bundle every child downloads before choosing anything.
2. **`src/games/<id>/logic.ts`** — pure rules plus `logic.test.ts`, **written first**.
   Injectable `rng` as the LAST parameter defaulting to `Math.random`; use
   `mulberry32`/`seedFrom`/`shuffle` from `@shared`, never a private copy.
3. **The renderer.** DOM: a `<Game>.tsx` taking `{ ctx }`, then `index.ts` =
   `reactGame(meta, ctx => createElement(Game, { ctx }))`. Canvas: a `Phaser.Scene`
   plus a `GameModule` booting into `ctx.mount` (see `games/snake`) — but 41 of 42
   games need no engine, so assume you do not either.
4. **The win.** `winMoment(ctx, { reason, tier, level, at })` from `@shared`, called
   **from the event handler, never inside a `setState` updater**. Level row via
   `<DifficultySelector>`; hold the level in `useRememberedLevel(ctx, ids, fallback)`
   so the game reopens where it was left. Everything a hardcoded first-level literal
   feeds must read the restored level, or the chrome says "Hard" over an easy board.
5. **Register in TWO places, deliberately different lists.** `src/portal/games.ts` is
   the ordered roster (the page emitter reads it and must never touch game code);
   `src/portal/catalog.ts` is the lazy loader. `catalog.test.ts` ratchets the count and
   `build.test.ts` asserts the two lists agree.
6. **`src/content/games/<id>.ts`** — the page's words, **once per `PAGE_LOCALES`**, plus
   a `provenance` row for every number the prose quotes.

## Two things to know before starting

- **A game cannot ship in fewer languages than the site has.** A missing locale arm does
  not compile (`tsc` names the file and line); a missing content file fails
  `content.test.ts` (it names the game). Two gates, two shapes, neither of which a
  reviewer has to notice.
- **It cannot be built in parallel slices that each keep the suite green.** `game-art.test.ts`
  and `game-panel-clears-widest-board.test.ts` key on a directory merely CONTAINING
  `meta.ts`, so `meta.ts`, the art scene and the renderer land together or those two stay
  red. That is the gates working: a game with no picture is not finished.

## Which kit, and where the art comes from

- **A game is a PRODUCT, so its chrome is `@ui` on Preact - never shadcn, never React,
  never a UI dependency in `src/`.** The budget is bytes a child downloads and
  `assert:payload` holds it. The rule, with the measured pair behind it:
  [`a-tool-ships-on-the-shared-kit-a-product-on-the-lightest.md`](../../rules/a-tool-ships-on-the-shared-kit-a-product-on-the-lightest.md).
- **Its style and sprites are PICKED in the studio gallery** (`cd studio && npm run
  gallery`, port 5188) and bound in `studio/art/games/<id>.json`; sprites reach a game
  from `studio/dist-export` through an adapter, never by importing `studio/`. Run the
  `studio-workspace` skill before touching that side.

## A showcase game (`tier: "showcase"`)

Survivors is the reference, ruled to clear the bar by the operator on 2026-09-13.
A game declaring `tier: "showcase"` in `meta.ts` takes on all of this:

1. **The requirements, enforced.** `build:check` runs `TIER_REQUIREMENTS=1
   node scripts/assert-tier.mjs`: real studio sprites, the five clips, hit effects,
   2+ weapons that look different, under the showcase byte budget. A missing one reds
   the build; it is not advice.
2. **`ArcadeChrome` from `@ui`, never `GameChrome`.** Selected by tier, never by game
   id (`arcade-chrome-is-tier-not-id.test.ts`). It carries `ellaz-panel-wide` (1680px),
   because a 16:9 board inside the 700px reading panel is SMALLER than a portrait one.
3. **Controls on an ENTRANCE screen over the arena** (`ArcadeEntrance`): title,
   difficulty, Play, the game's own extra. HUD hidden while it is up; drawn after mount,
   never as a loading poster (`arcade-entrance-covers-the-arena.test.ts`).
4. **The arena shape is a property of the RUN.** Two shapes of the same AREA
   (survivors: `ARENA` 420x560, `ARENA_WIDE` 648x364), picked once at mount off
   `matchMedia("(min-width: 900px)")` - the query the board CSS uses - and passed INTO
   the sim (`newRun(level, arena)`). A media query resizes a box; it cannot change how
   much floor the game has.
5. **Every tuned number is measured on BOTH arenas.** Shape moves difficulty even at
   equal area: survivors' landscape measured 11-30% harder (a 240-unit gun reach no
   longer spans a 324 half-width) and its golem fight 13% shorter. Pin both arms in a
   test and write the table beside the constant.
6. **A big map: the arena is the VIEW, the world is derived from it.** Survivors
   (2026-09-14): `run.world = worldFor(arena)`, three views each way; the camera is a
   function of the player (`cameraOf`), never stored, clamped to the world. Shapes spawn
   just outside the VIEW, not the world, and a shape a whole view behind is walked back
   in - or the enemy cap fills with shapes that never arrive. Rules live in pure modules
   (`world.ts`, `arsenal.ts`, `powers.ts`, `cards.ts`) that import only TYPES from
   `logic.ts`, so there is no cycle; `repro-survivors-expansion.mjs` checks it in a browser.

### Failed attempts (2026-09-13)

| Tried | Why it failed | Do instead |
|---|---|---|
| Raise the px cap to grow the PC board | `58vh` bound first at 1536x639: 0px moved | move the vh term too, or reshape the arena |
| One arena constant plus a CSS media query | the sim still had 420x560 of floor | pass the arena into `newRun` |
| Control "moving beats standing still" | a prediction about the game, and false (80.9 vs 56.3 s) | controls are instrument properties: the level ladder, an immortal run reaching 3:00 |
| Caption computed from the arena centre, ring drawn at the player | the picture refuted its own caption | draw what the sentence measures; clip to the floor |
| Difficulty options described in prose | operator: "i dont see. eyeball me the options" | render each arm, one per card, on the Visual Hall |
| Stick on the HUD layer read `pointer.worldX` (2026-09-14) | once the camera scrolls, world coords are off by the camera | a `setScrollFactor(0)` layer reads `pointer.x/y` |
| Minimap drawn every frame | the canvas showed through the DOM entrance cover | draw it only while playing |
| Spawn on the WORLD edge | a shape a screen and a half away never arrives; walking made it easier | spawn off the VIEW, recycle a view behind |
| A walk test that never clears `choosing` | the first level-up froze the run and the wall was never reached | the test clears `choosing` each frame |

## Before you call it done

`npm test` · `npm run build:check` · then read the rule for whatever the game does:
rewards, scores, sessions, restart, RTL grids, difficulty — all in `.claude/rules/`.
