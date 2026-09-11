# The fight game

One pure simulation, every number in a file, and a renderer chosen by a
seven-arm tournament. The verdict and its evidence:
[`docs/engine-tournament/fight-2026-09/`](../../../docs/engine-tournament/fight-2026-09/VERDICT.md)
(Phaser 4). The plan: `~/.claude/plans/read-tbe-followin-hand-gentle-truffle.md`.

## The map

| directory | holds | imports |
|---|---|---|
| `core/` | the sim: int32 in 1/256 px (`FP`), 60 ticks/s, seeded rng IN the state, name-sorted state table, FNV-1a over an ordered field list. Pure `step(state, inputs, data)`. Fourteen test files beside it | nothing outside `core/` - `no-studio-import.test.ts` holds it, so promotion is a `git mv` |
| `data/` | every gameplay number: `arena/`, `match/`, `ai/`, `fighters/`, `modes/`, each with a JSON schema. `load.ts` reads a mode's whole graph | - |
| `assets/` | the sprite sets the fighters bind (png + atlas + manifest + moves), COPIED from `dist-export` by `tools/copy-sprites.mjs` and byte-checked by its `--check` | - |
| `cells/` | the harness (`run-cell.ts` owns the clock, the tape, the hash and the input; `retime.ts`, `shared/`) and the canvas bar (`cells/canvas/`) | `core/`, `../../adapters/` |
| `render/` | the game page: the Phaser 4 cell promoted from `cells/phaser4/` after the verdict. `?stats=1` prints the harness instruments under the stage | `cells/`, `core/`, `../../adapters/phaser/` |
| `tournament/` | the tape, the golden, the four instruments (`harness/`), the compare page (`compare/`), the seven defect logs (`defects/`) and every measurement row (`data/raw-fight.jsonl`) | - |
| `tools/` | `copy-sprites.mjs`, `write-golden.mjs` | - |

The studio's tenth gate, `npm run assert:fight`, holds data, assets and the
golden together (nine planted controls).

## Running it

```bash
cd studio/games/fight/cells && npx vite build      # -> studio/dist-fight (render, the canvas bar, the compare page)
cd studio
node games/fight/tournament/harness/run-tape.mjs   # both pages must ADMIT on the golden triple
bash ~/.claude/scripts/hall-file.sh dist-fight --title fight-versus
#   -> open .../dist-fight/render/index.html?stats=1 from Windows
```

The page reads the keyboard (arrows / WASD, space) and the touch surface (left
half drags to walk, right half taps to swing) through one poll per tick; a
`?tape=versus-600&fast=1` run reads neither, which is why the promoted page can
still be admitted by the tournament's own gate.

## What a mode file can say

`data/modes/versus.json` names an arena, a match, a seed and a cast. Stage
(waves) and Crypt (rooms) are the next two mode files on the same core - new
data kinds, not a fork.

## Tuning that is data, not code

- `match/versus.json` `attackCooldownTicks` (45): the recovery window after
  every attack START. Measured 2026-09-12 over 6,000 ticks of a robot walking
  and mashing: hits taken 0 at 0 or 15 ticks, 11 at 45, 22 at 60. A robot
  standing still and mashing still takes 0 at every value - the teddy's AI
  walks straight into the robot's reach - and that is an `ai/teddy-cpu.json`
  approach problem, parked.
- The moves files' `cancelFrom`, damage, knock and stun are the studio's
  (`studio/art/characters/<id>/moves.ts`), exported and copied here.

Any sim change moves the golden: `node games/fight/tools/write-golden.mjs`
prints the old and new triple whole; say why in the commit.

## Promotion checklist - from the studio into the catalogue

The winner is the engine ellaz already ships, so the promotion is smaller than
the plan feared. Still a list, because each line is a gate somebody will hit:

1. `git mv studio/games/fight/core src/games/fight/logic` - the core imports
   nothing outside itself, so nothing else moves with it. Its tests move too.
2. The data files become imports of the game module (they are JSON; a schema
   test travels with them).
3. The sprite sets go to `public/games/fight/` with `copy-sprites.mjs --check`
   pointed at the new root - the byte-identity check is what makes the copy a
   generator and not a fork.
4. `render/cell.ts` becomes the game's Phaser scene; `run-cell.ts` becomes the
   game's loop, reading `GameContext` for input and lifecycle instead of
   `window`.
5. **ONE new chunk, three changes**: `game-fight-` needs the dynamic
   `import()` in `catalog.ts`, a NAMED `manualChunks` branch and a matching
   `globIgnores` entry - `precache-glob-sweeps-new-chunks.md`. The engine
   chunk `vendor-phaser-` already exists for snake and needs nothing. Had the
   winner been any other engine this would have been two chunks and six
   changes.
6. `npm run assert:payload` on the tree in front of you - the shell must not
   move; the chunk is lazy or it is not shipped.
7. Product laws apply from here: `meta.ts` + `logic.ts` + a renderer land
   together, every locale, `winMoment()` for the win, reasons not amounts,
   kids rules if `ageBand` is kids.
