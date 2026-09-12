# The fight game

One pure simulation, every number in a file, and a renderer chosen by a
seven-arm tournament. The verdict and its evidence:
[`docs/engine-tournament/fight-2026-09/`](../../../docs/engine-tournament/fight-2026-09/VERDICT.md)
(Phaser 4). The plan: `~/.claude/plans/read-tbe-followin-hand-gentle-truffle.md`.

## The map

| directory | holds | imports |
|---|---|---|
| `core/` | the sim: int32 in 1/256 px (`FP`), 60 ticks/s, seeded rng IN the state, name-sorted state table, FNV-1a over an ordered field list. Pure `step(state, inputs, data)`; `match.ts` is Versus, `stage.ts` + `pickups.ts` are the wave run. Twenty test files beside it | nothing outside `core/` - `no-studio-import.test.ts` holds it, so promotion is a `git mv` |
| `data/` | every gameplay number: `arena/`, `match/`, `ai/`, `fighters/`, `modes/`, `stage/`, each with a JSON schema. `load.ts` reads a mode's whole graph | - |
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
node games/fight/tournament/harness/run-tape.mjs --tape versus-600   # both pages must ADMIT on the golden triple
node games/fight/tournament/harness/run-tape.mjs --tape stage-600    # and on the stage golden
bash ~/.claude/scripts/hall-file.sh dist-fight --title fight-stage
#   -> open .../dist-fight/render/index.html?mode=stage&stats=1 from Windows
```

The page reads the keyboard (arrows / WASD, space) and the touch surface (left
half drags to walk, right half taps to swing) through one poll per tick; a
`?tape=versus-600&fast=1` run reads neither, which is why the promoted page can
still be admitted by the tournament's own gate. A tape names its own mode, so
`?tape=stage-600&fast=1` replays the stage golden without a `?mode=`.

**Tuning loop**: edit a JSON under `data/`, rebuild, republish, reload. No
port; nothing under `data/` needs a test to change, and everything under it is
held by one (`data.test.ts`, `assert:fight`). A sim change moves a golden -
see below.

## What a mode file can say

`data/modes/versus.json` names an arena, a match, a seed and a cast: one match
on one screen, `core/match.ts`.

`data/modes/stage.json` names the same four plus a `stage` file
(`data/stage/toybox-quest.json`: the camera, the screen pads, the spawn lanes,
the XP curve, the level bumps, the coin physics) and `waves[]`, each a list of
spawns `{fighter, ai, team, side, delayTicks}`. Every spawn joins the cast as
ONE fixed roster row - dormant (`active` 0) until its wave and delay, at most
31 rows because the hit mask is one bit per target - so nothing is added to or
removed from the sim while it runs and the hash stays over a fixed field list.
`core/stage.ts` wakes the spawns at the screen's edge in a lane drawn from the
sim's rng, follows the hero with the camera (`camX` in the state, lerped in the
view, `beginFrame(camX)` in both cells), holds everyone inside the screen, and
turns fight -> go -> clear; the hero down fades for `koFadeTicks` and restarts
THIS wave with coins, xp and level kept - no fail punishment. `core/pickups.ts`
pays a KO exactly once (one coin, the fighter file's `xp`), spends xp on levels
(`base + level * perLevel`; +hp, a heal, +damage on the hero's hits), and flies
the coins. A fighter file may say `flying` + `hover` (the bat holds its height
alive, drops when KO'd). Play it: `render/index.html?mode=stage`.

**Crypt reuses all of it.** A room is a wave with a door: the same fixed
roster with `wave` on each row, the same dormant predicate, the same camera
(a room is a screen the camera locks to), the same pickups, the same stage
HUD layout. What Crypt adds is data: a `rooms[]` shape where `go` walks
through a door instead of scrolling, and a `door` prop the arena painter
draws. Nothing in `core/stage.ts` names a wave count except `data.stage.waves`.

## Tuning that is data, not code

- `match/versus.json` `attackCooldownTicks` (60, was 45): the recovery window
  after every attack START. Measured 2026-09-12 over 6,000 ticks of a robot
  walking and mashing: hits taken 0 at 0 or 15 ticks, 11 at 45, 22 at 60. A
  robot STANDING STILL and mashing took 0 at every value because the teddy
  walked straight into the punch; with the AI's `holdWhenTargetAttacks` it
  waits outside the punch instead, but at 45 it cannot cross the 27 px between
  the robot's reach and its own inside the robot's recovery, so it still lands
  0. The matrix (standing mash, 6,000 ticks, teddy at its file speed):
  cooldown 45 lands 0 at every hold; 60 lands 2 (hold 200) with 14 teddy
  attacks; 75 lands 15. 60 is the smallest value at which standing and
  mashing is no longer a perfect defence. One number to retune if the robot
  feels slow.
- `match/versus.json` `landedCooldownTicks` (0): what the recovery becomes the
  tick a swing LANDS - 0 hands the next swing to the moves file's `cancelFrom`,
  so hits chain (swing-hit-swing at 24 ticks apart, measured in
  `core/chain.test.ts`) while a whiff still pays the 60 above. Added
  2026-09-12 after the operator played Stage and could not chain: the mash
  matrix showed that LOWERING `attackCooldownTicks` instead lands 0 hits on a
  standing masher at every value below 60 (15/20/30/40/45, both holds), so the
  chain is a refund on a hit and not a shorter recovery. With it the standing
  mash still takes 2/4/5 over three seeds (was 2/3/10: the teddy's landed hits
  refund too).
- `ai/*.json` `holdWhenTargetAttacks` (teddy 200, slime 160, bat 120): 0-255
  against one rng byte each tick the target's swing is still ahead - the odds
  the AI steps out of the target's reach (its reach + this fighter's body
  front + `reachPad.min`) or waits there instead of walking in. Only while
  approaching; one already reacting in range swings through. 255 is too
  careful (22 attacks, 0 landed at cooldown 60); 200 lands. Traced before it
  was believed: a hold that stood in place sat 44 px inside a 56 px punch.
- The moves files' `cancelFrom`, damage, knock and stun are the studio's
  (`studio/art/characters/<id>/moves.ts`), exported and copied here.

- `stage/toybox-quest.json`: every number from the demo the operator chose
  (2026-09-12). `camera.divisor` 12 is the demo's `dt*5` at 60 Hz;
  `screen.spawnPad` 30 puts a spawn just off the edge; the bat's `hover`
  is 20 (not the demo's 30: the robot's punch rows 20-29 of 48 could not
  reach a body lifted 30 - read off the moves files). `xp` 10 + 10/level,
  level-up +10 hp / heal 25 / +2 damage.
- `stage/toybox-quest.json` `corpseTicks` (90): TICKS a KO'd enemy lies where it
  fell after its ko clip (45 ticks) ends, then its row goes `active 3` - gone:
  `dormant()` hides it and the wave counts it as spent, never respawns it.
  Added 2026-09-12 after the operator's first play: `holdToScreen` had clamped
  bodies to the screen like the living, so they slid along with the camera,
  and nothing ever removed one. The timer is the held ko clip's `stT`, which
  now keeps counting past the clip's end for a KO'd fighter (a living one
  knocked down still stands up at `downTicks`) - no new hashed field; the
  stage golden's hash moved for exactly that and its event hash did not.
- Accepted, not defects: a wave restart drops the coins still on the floor
  (xp kept); dying refights the wave with its enemies respawned and xp kept,
  so xp can be farmed by dying; a trade on the last enemy counts as the
  hero's death.

Any sim change moves a golden: `node games/fight/tools/write-golden.mjs`
re-records every tape's golden and prints each old and new triple whole; say
why in the commit, and which goldens moved - a Versus-only change that moves
the stage golden is the thing the two goldens exist to show. A scripted hero
in `core/stage-completes.test.ts` clears all three waves without a human; when
it stops clearing them, the numbers made the run unwinnable.

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
