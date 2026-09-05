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

## Before you call it done

`npm test` · `npm run build:check` · then read the rule for whatever the game does:
rewards, scores, sessions, restart, RTL grids, difficulty — all in `.claude/rules/`.
