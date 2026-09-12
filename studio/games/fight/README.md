# The fight game

A game on the Toybox engine ([`studio/toybox/`](../../toybox/README.md)):
every number in a file here, two recorded matches with their goldens beside
them, a page, and the history of the seven-arm tournament that picked the
renderer. The verdict and its evidence:
[`docs/engine-tournament/fight-2026-09/`](../../../docs/engine-tournament/fight-2026-09/VERDICT.md)
(Phaser 4). The rules, the cells and the harness are the engine's, not this
directory's - since 2026-09-12 nothing under `games/fight/` is engine.

## The map

| directory | holds |
|---|---|
| `data/` | every gameplay number: `arena/`, `match/`, `ai/`, `fighters/`, `modes/`, `stage/` - each file held to the engine's schema for its directory (`toybox/data/schemas/<dir>.schema.json`) |
| `assets/` | the four sprite sets the fighters bind (png + atlas + manifest + moves), COPIED from `dist-export` by `node toybox/harness/copy-sprites.mjs --game fight` and byte-checked by its `--check` |
| `tapes/` | `versus-600.json` and `stage-600.json`, each with its `.golden.json` beside it - the admission instruments |
| `page/` | the game page: `index.html` + `main.ts`, which runs the engine's Phaser cell on the one harness with live input; `?mode=stage` or `?mode=versus`, `?tape=<name>&fast=1` replays a golden, `?stats=1` prints the harness instruments under the stage |
| `tournament/` | history: the compare page (`compare/`), the seven defect logs (`defects/`), every instrument row ever appended (`data/raw-fight.jsonl`) |

## Running it

```bash
cd studio
npx vite build --config toybox/vite.config.ts                  # -> studio/dist-toybox
node toybox/harness/run-tape.mjs --game fight --tape versus-600   # canvas + page must ADMIT on the golden triple
node toybox/harness/run-tape.mjs --game fight --tape stage-600    # and on the stage golden
npm run assert:fight                                              # the tenth gate: data, assets, goldens agree
bash ~/.claude/scripts/hall-file.sh dist-toybox --title toybox-fight
#   -> open .../dist-toybox/games/fight/page/index.html?mode=stage&stats=1 from Windows
```

The page reads the keyboard (arrows / WASD, space) and the touch surface (left
half drags to walk, right half taps to swing) through one poll per tick; a
`?tape=versus-600&fast=1` run reads neither, which is why the page can still be
admitted by the engine's own gate. A tape names its own mode, so
`?tape=stage-600&fast=1` replays the stage golden without a `?mode=`.

**Tuning loop**: edit a JSON under `data/`, rebuild, republish, reload. No
port; nothing under `data/` needs a test to change, and everything under it is
held by one (`toybox/data/data.test.ts`, `assert:fight`). A sim change moves a
golden - `node toybox/harness/write-golden.mjs` re-records every game's and
prints each old and new triple whole; say why in the commit, and which
goldens moved. A scripted hero in `toybox/sim/stage-completes.test.ts` clears
all three waves without a human; when it stops clearing them, the numbers made
the run unwinnable.

## What a mode file can say

`data/modes/versus.json` names an arena, a match, a seed and a cast: one match
on one screen, `toybox/sim/match.ts`.

`data/modes/stage.json` names the same four plus a `stage` file
(`data/stage/toybox-quest.json`: the camera, the screen pads, the spawn lanes,
the XP curve, the level bumps, the coin physics) and `waves[]`, each a list of
spawns `{fighter, ai, team, side, delayTicks}`. Every spawn joins the cast as
ONE fixed roster row - dormant (`active` 0) until its wave and delay, at most
31 rows because the hit mask is one bit per target - so nothing is added to or
removed from the sim while it runs and the hash stays over a fixed field list.
`toybox/sim/stage.ts` wakes the spawns at the screen's edge in a lane drawn from
the sim's rng, follows the hero with the camera (`camX` in the state, lerped in
the view, `beginFrame(camX)` in both cells), holds everyone inside the screen,
and turns fight -> go -> clear; the hero down fades for `koFadeTicks` and
restarts THIS wave with coins, xp and level kept - no fail punishment.
`toybox/sim/pickups.ts` pays a KO exactly once (one coin, the fighter file's
`xp`), spends xp on levels (`base + level * perLevel`; +hp, a heal, +damage on
the hero's hits), and flies the coins. A fighter file may say `flying` +
`hover` (the bat holds its height alive, drops when KO'd). Play it:
`page/index.html?mode=stage`.

**Crypt reuses all of it.** A room is a wave with a door: the same fixed
roster with `wave` on each row, the same dormant predicate, the same camera
(a room is a screen the camera locks to), the same pickups, the same stage
HUD layout. What Crypt adds is data: a `rooms[]` shape where `go` walks
through a door instead of scrolling, and a `door` prop the arena painter
draws. Nothing in `toybox/sim/stage.ts` names a wave count except
`data.stage.waves` - and Crypt is its own directory under `games/`, five
folders and a page, on the same engine.

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
  `toybox/sim/chain.test.ts`) while a whiff still pays the 60 above. Added
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

**Both pages draw at the display's integer upscale, not at 640x360 stretched
by CSS** (since 2026-09-12). Measured with a rAF shim on the built pages, the
stage-600 tape: distinct draws at an emulated 120 Hz went 88.5% -> 96.7%
(Phaser) and 89.1% -> 96.5% (canvas), the same figure the pages read at 60 Hz;
the goldens did not move, because none of this touches the sim.

The goldens as of the extraction (2026-09-12): stage-600
`1be09f21 / 801d2ac4 / c7532cf4`, versus-600 `216303af / 3ddd21d5 / 002862ad` -
byte-identical through every move. The promotion checklist (from here into
the catalogue) is the engine's: [`studio/toybox/README.md`](../../toybox/README.md).
