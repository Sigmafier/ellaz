# Toybox - the engine

One pure simulation, one draw loop, two renderers on it, and one instrument
that admits a renderer only when it replays a recorded match to the same
three hashes. Every game the studio builds on it is data, sprites, tapes and
a page; the rules, the cells and the harness live HERE, once. Pulled out of
the fight game on 2026-09-12 (plan `~/.claude/plans/toybox-engine-extraction.md`)
with both goldens byte-identical after every one of the seven commits.

## The map

| directory | holds | imports |
|---|---|---|
| `sim/` | the sim: int32 in 1/256 px (`FP`), 60 ticks/s, seeded rng IN the state, name-sorted state table, FNV-1a over an ordered field list. Pure `step(state, inputs, data)`; `match.ts` is Versus, `stage.ts` + `pickups.ts` are the wave run (a stage naming a `door` cuts between rooms instead of scrolling); `compile.ts` turns a game's json into `FightData`. its tests beside it, over every fight-kind game's data | nothing outside `sim/` - `no-studio-import.test.ts` holds it |
| `turn/` | the second sim kind (2026-09-13, Ember): a turn battle on a grid - `grid`, `intent`, `battle`, `step`, `hash`, `view`, `tape`; int32 and pure like `sim/`, `battle-completes.test.ts` its completability KPI | `sim/fixed`, `sim/view` types, `sim/hash` folding |
| `dungeon/` | the third sim kind (2026-09-13, the Hollow): a real-time isometric room played with clicks - `grid`, `knight`, `foes`, `hits`, `room`, `step`, `hash`, `view`, `tape`; `room-completes.test.ts` its KPI | the same three from `sim/` |
| `campaign/` | the layer ABOVE the sims (2026-09-13): `flow.ts` a pure reducer (title, level pick, level, CLEAR, TRY AGAIN, the world's end), `save.ts` one versioned localStorage key per campaign, `shell.ts` binding both to a page's three panels and running each level through `run-cell` until the kind's `outcome` | `sim/` types, `cells/` - `no-studio-import.test.ts` holds it |
| `data/` | `load.ts` (`loadMode(modeId, gameRoot)` - the node loader, reads `<game>/data/` and `<game>/assets/`), `loadTurnMode`, `loadDungeonMode`, `readModeKind` (a mode file's `kind` picks the sim; absent is the fight's), `loadCampaign` (every level loads, one kind per campaign), `schemas/<kind>.schema.json` (one per data directory, NAMED after it - thirteen today), `data.test.ts` (every game's data against the schema for its kind) | `sim/`, `turn/`, `dungeon/`, `campaign/` types |
| `cells/` | `run-cell.ts` (the one loop: it owns the data, the sim, the clock, the tape, the hash and the input; a cell owns the pixels), `contract.ts` (what a cell IS - no `update`, no `step`, no `dt` - and `SimKind`, the seam a sim kind plugs into: `create`, `step`, `hashState`, `view`, `outcome`, an optional `purse`), `kinds/` (`fight.ts`, `turn.ts`, `dungeon.ts`), `retime.ts`, `shared/` (arena painter with six kinds - wall, planks, shelf, stone, flagstones, door - and its test; browser loader, fx, input, props), `canvas/` (the bar, zero engine bytes, `?game=`), `phaser/` (the Phaser 4 winner) | `sim/`, `../adapters/` |
| `harness/` | `run-tape.mjs` (the admission gate), `assert-equal-work.mjs`, `bytes.mjs`, `sweep.mjs`, `write-golden.mjs`, `copy-sprites.mjs` - each takes `--game <name>` (fight by default) | `../scripts/lib/` |
| `index.ts` | the node door: the sim's surface plus the loader | - |
| `boundary.test.ts` | the gate on all of the above (below) | - |
| `vite.config.ts` + `package.json` | one build with ROOT `studio/` into `dist-toybox`: every `cells/<name>/index.html`, every `games/<game>/page/index.html`, every `games/<game>/tournament/compare/index.html`; Phaser is a devDependency HERE (`npm ci` in this directory; the studio typecheck resolves it via `tsconfig` paths) | - |

```bash
cd studio
npx vite build --config toybox/vite.config.ts        # -> studio/dist-toybox
node toybox/harness/run-tape.mjs --game fight --tape versus-600   # every built cell + the game's page must ADMIT
node toybox/harness/run-tape.mjs --game fight --tape stage-600
node toybox/harness/run-tape.mjs --game crypt --tape crypt-600    # the second game, same gate
node toybox/harness/run-tape.mjs --game ember --tape meadow-1200  # the turn kind
node toybox/harness/run-tape.mjs --game hollow --tape crypt-win-2400   # the dungeon kind
node toybox/harness/run-tape.mjs --game fight --tape toybox-boss-1400  # a boss level with a carry
node toybox/harness/run-tape.mjs --control                        # a bent golden must DISQUALIFY
npm run assert:fight                                              # the tenth gate, over every games/*
bash ~/.claude/scripts/hall-file.sh dist-toybox --title toybox-fight
#   -> open .../dist-toybox/games/fight/page/index.html?campaign=brawl from Windows
```

## What a game brings - five folders and a page

A game is a directory under `studio/games/<name>/`. The engine walks that
directory; nothing under `toybox/` names a game.

| the game supplies | what the engine does with it |
|---|---|
| `data/<dir>/*.json` - a fight game's `arena`, `match`, `ai`, `fighters`, `stage`; a turn game's `battles`, `rules`, `units`; a dungeon game's `rooms`, `dungeon`, `actors`; every game's `modes` and, for a whole game, `campaign` | held to `toybox/data/schemas/<dir>.schema.json` by `data.test.ts` and `assert:fight`; a directory with no schema is refused, and so is a game with no `modes/` - a game is what its modes say it is |
| `assets/<set>/` (png + atlas + manifest + moves) | copied from `dist-export` by `copy-sprites --game <name>` and byte-checked by its `--check`; the cells load them by the fighter's `sprites` name |
| `tapes/<tape>.json` + `<tape>.golden.json` beside it | `golden-tape.test.ts` replays every tape of every game; `run-tape --game <name> --tape <tape>` replays it through every BUILT cell and the game's page |
| `page/index.html` + `main.ts` | built by `vite.config.ts` at `dist-toybox/games/<name>/page/`; it imports `cells/run-cell` and a cell class, passes `root: ".."` and reads `?mode=`, `?tape=`, `?boxes=`, `?stats=` |
| `tournament/` (optional) | history: a compare page, defect logs, the raw rows `run-tape` appends to `tournament/data/raw-fight.jsonl` |
| `README.md` | the game's own numbers and what they were measured against |

Four games today, on three kinds of simulation:

| game | kind | what it is | its README |
|---|---|---|---|
| `games/fight/` | fight | Toybox Brawl: the robot through waves on a scrolling shelf, and Versus. The game the engine was pulled out of | [README](../games/fight/README.md) |
| `games/crypt/` | fight | the knight through three locked rooms joined by a door (2026-09-12). It cost the engine one data-gated rule (`stage.door`: the go phase CUTS instead of scrolling) and three painter kinds (`stone`, `flagstones`, `door`) | [README](../games/crypt/README.md) |
| `games/ember/` | turn | Ember Hollow: a turn battle on a grid (2026-09-13). It cost the engine a second sim kind and the `SimKind` seam | [README](../games/ember/README.md) |
| `games/hollow/` | dungeon | Ember Hollow Crypt: a real-time isometric room played with clicks (2026-09-13). It cost a third kind, a frame arena op and the room painter | [README](../games/hollow/README.md) |

Every engine test that walks `games/*` (`data.test.ts`, `golden-tape.test.ts`,
`stage-completes.test.ts`, `assert:fight`) pins its population by name, so a
broken walk cannot pass over one game and a new game reds those lines on purpose.

## A campaign: three levels and a boss (2026-09-13)

A game becomes a whole game with one more data directory. `data/campaign/<id>.json`
names worlds of levels, and a level is a mode file the game already plays. The
operator's MVP, ruled 2026-09-13: every game is ONE world of three levels and a
boss level, a title, a level pick, TRY AGAIN on a loss and VICTORY at the end.

```
title --START--> level pick [LEVEL 1] [LEVEL 2] [LEVEL 3] [BOSS]   (a locked level wiggles, never disabled)
                    |
                 a level --won--> LEVEL n CLEAR --NEXT--> the next level ... BOSS CLEAR --FINISH--> VICTORY
                    |
                   lost --> TRY AGAIN --RETRY--> the same level, with the purse it started with
```

- **The kind decides how a level ends.** `SimKind.outcome(state)` is `"won"`,
  `"lost"` or `null`: the fight reads its wave phase (2 cleared, 3 the hero down),
  the turn machine and the dungeon their `PHASE_WON` / `PHASE_LOST`. The shell runs
  each level through `run-cell` with `until: outcome !== null`, stops the run (the
  cell unmounts, so the page holds one canvas), and dispatches `stageDone` or
  `stageLost`. No sim changed for it, so no golden moved.
- **Only a kind with a purse carries one.** `SimKind.purse` exists on the fight
  alone: a won fight level hands its coins, xp and level to the next through
  `createState(data, carry)`, and a tape may carry one too. Ember and the Hollow
  start every level fresh (operator ruling), and their kinds refuse a carry.
- **One campaign plays one kind.** `loadCampaign` and `assert:fight` take the first
  level's kind as the campaign's; a level of another kind, a fight level with no
  stage file, or a level that does not load is refused naming the world and the level.
- **A lost level changes nothing in the save.** `flow.ts` records a level only when
  it is won, so RETRY starts it with the purse it started with. The save is
  `SAVE_VERSION` 2 (cleared worlds, cleared levels, the purse, the best tick per
  level); a record of another version or shape is discarded, never migrated, and a
  storage that throws reads as a fresh save.
- **A boss is data.** A fighter, unit or actor file may say `boss: true`, and the
  HUD draws that character's bar top-centre while it stands
  (`cells/shared/hud-boss.ts`, one layout for all three kinds and both cells). It may
  say `drawScale` 1 to 4: the view hands the cell a sprite `size`, and a FIGHTER's
  body and strike boxes grow with its picture, so it is hit where it is drawn; its
  knockback does not grow. No committed file set either key before the Teddy King,
  which is why the seven older goldens printed identical.
- **The page** reads `?campaign=<id>` (a `?tape=` still wins), and `?trace=1` prints
  one line per transition. `window.__fightCampaign` publishes the screen, the level,
  the purse, the cleared levels and the bests for a headless probe.

Brawl is the first game built to it (`brawl.json`: stage, toybox-2, toybox-3,
toybox-boss). The Crypt, Ember and the Hollow follow, one at a time, each played by
the operator before the next (plan `~/.claude/plans/three-levels-and-a-boss-in-every-toybox-game.md`).

## The rules the gates hold

- **Tuning is data.** Every gameplay number is a json under the game's
  `data/` with a schema. `sim/` carries the FNV and rng constants, `FP`, the
  tick rate and a roster cap of 31 (the hit mask's bits) - and nothing else
  numeric.
- **Any sim change moves a golden.** `node toybox/harness/write-golden.mjs`
  re-records every game's goldens and prints each old and new triple whole;
  the commit says why, and WHICH goldens moved (a Versus-only change that
  moves the stage golden is the thing two goldens exist to show). A move that
  changes no behaviour keeps every golden byte-identical, which is how this
  extraction was proven.
- **A cell cannot advance the sim.** `contract.ts` has no `update`, `step` or
  `dt`; `run-cell.ts` steps and hands the cell a draw plan. Seven arms ran one
  program because of that absence.
- **`run-tape` ADMITS a black canvas** (proven with the melonJS controls): the
  triple is a property of the sim, not the pixels. The eyeball on the hall page
  is the only pixel gate.
- **The engine imports no game.** `boundary.test.ts`: every `.ts` and `.mjs`
  under `toybox/` (node_modules excluded, the population from the tree) may
  import only `toybox/*` and `../adapters/*`; the node side (the harness `.mjs`
  and the tests) may also reach `../scripts/lib/`. Static imports, dynamic
  `import()` and `new URL(..., import.meta.url)` are all read. Its planted
  controls are built from helpers because the test is in its own population -
  a literal `games/` import written into it was caught by the gate on the
  first run.
- **Both cells draw at the display's integer upscale**, not 640x360 stretched
  by CSS (since 2026-09-12): the draw plan carries the fraction of a game px
  and each cell rounds to a whole device pixel at upscale `k`. `?stats=1`
  prints `distinctDraws` and the backbuffer.

## The one duplicate, on the record (2026-09-12)

`toybox/harness/copy-sprites.mjs` copies the exporter's files from
`dist-export/` into `games/<game>/assets/` (byte-checked, driven by the tenth
gate's controls). `scripts/sprites/sync-sprites.mjs` at the repository root
drives the same exporter in a headless browser into `src/games/<game>/sprites/`,
re-encoding the sheet to an indexed PNG (slime 54,011 B -> 8,104 B, pixels
byte-identical). Two implementations of one job, kept because the workspace
boundary forbids either from writing where the other does. When a game is
promoted into `src/`, one wins and the other goes - the half-migrated-duplicate
trap, named here so it is not re-found.

## Promotion checklist - from the studio into the catalogue

The winner is the engine ellaz already ships, so the promotion is smaller than
the plan feared. Still a list, because each line is a gate somebody will hit:

1. `git mv studio/toybox/sim src/games/<game>/logic` - the sim imports nothing
   outside itself, so nothing else moves with it. Its tests move too.
2. The game's data files become imports of the game module (they are JSON; the
   schema test travels with them).
3. The sprite sets go to `public/games/<game>/` - and here `copy-sprites.mjs`
   and `sync-sprites.mjs` become one script (above).
4. `cells/phaser/cell.ts` becomes the game's Phaser scene; `run-cell.ts`
   becomes the game's loop, reading `GameContext` for input and lifecycle
   instead of `window`.
5. **ONE new chunk, three changes**: `game-<id>-` needs the dynamic `import()`
   in `catalog.ts`, a NAMED `manualChunks` branch and a matching `globIgnores`
   entry - `precache-glob-sweeps-new-chunks.md`. The engine chunk
   `vendor-phaser-` already exists for snake and needs nothing.
6. `npm run assert:payload` on the tree in front of you - the shell must not
   move; the chunk is lazy or it is not shipped.
7. Product laws apply from here: `meta.ts` + `logic.ts` + a renderer land
   together, every locale, `winMoment()` for the win, reasons not amounts,
   kids rules if `ageBand` is kids.

The tournament that picked Phaser, its seven arms and their defect logs:
[`docs/engine-tournament/fight-2026-09/`](../../docs/engine-tournament/fight-2026-09/VERDICT.md).
