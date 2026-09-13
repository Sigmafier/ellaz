# Ember Hollow

The third game on the Toybox engine ([`studio/toybox/`](../../toybox/README.md))
and the first that is not a fight: a turn battle on a grid. The knight and the
wizard against a slime and two bats on a painted meadow under a ruined keep.
Every foe shows where it will walk and whom it will strike before you end your
turn. Built 2026-09-13 (plan `~/.claude/plans/ember-hollow-on-the-toybox-engine.md`)
to prove the engine can run a second KIND of simulation on the one loop. The
fight's and the crypt's goldens printed identical through every commit.

## The map

| directory | holds |
|---|---|
| `data/` | every number, each file held to `toybox/data/schemas/<dir>.schema.json`: `modes/meadow.json` (`kind: "turn"` - the one field that sends the loop to the turn sim - naming its battle, its rules and its seed), `battles/meadow.json` (the 1200x750 view, an 8x4 grid of 120x78 tiles, one blocked tile, the five placements, and the field's `art`: sky, hills, the keep, three trees, the fire), `rules/ember.json` (every timing in ticks: a 12-tick walk step, a 15-tick windup, a 24-tick recover, the banners, the floats), `units/` (knight 30 hp, atk 7, move 3, range 1 · wizard 18 hp, atk 6, move 2, range 3 · slime 14 hp, atk 4, move 2 · bat 9 hp, atk 3, move 4, flying at 40) |
| `assets/` | the four sprite sets (knight, wizard, slime, bat - snes16), copied by `node toybox/harness/copy-sprites.mjs --game ember` and byte-checked by its `--check` (16 compared, 0 differ) |
| `tapes/` | `meadow-1200.json` with its `.golden.json` beside it (`8d4ae281 / a31fda87 / 65252f79`) |
| `page/` | `index.html` + `main.ts`: the Phaser cell on the one harness; `meadow` is the default mode, `?tape=meadow-1200&fast=1` replays the golden, `?stats=1` prints the instruments |
| `tournament/data/raw-fight.jsonl` | every `run-tape` row appended for this game |

There is no `arena/`: the fight's arena schema is a z-band a fighter walks in,
and a battle is a grid on a painted field, so the battle file carries its own
view and art.

## Running it

```bash
cd studio
npx vite build --config toybox/vite.config.ts
node toybox/harness/run-tape.mjs --game ember --tape meadow-1200   # canvas + page must ADMIT
npm run assert:fight                                               # walks every games/*, turn refs included
bash ~/.claude/scripts/hall-file.sh dist-toybox --title toybox-ember
#   -> open .../dist-toybox/games/ember/page/index.html?stats=1 from Windows
```

Click a hero, click a blue tile to walk, click a red foe to strike, Space ends
the hero's turn; R restarts after VICTORY or DEFEAT.

## What Ember added to the engine

- **A second sim kind**, `toybox/turn/` (nine modules, ten test files), pure and
  int32 like the fight's, with its own hash, tape shape and view. A mode file's
  `kind` picks the sim (`readModeKind`; absent is the fight's, so no older file
  changed). `SimKind` in `cells/contract.ts` is the seam: the loop owns the clock,
  the tape, the hash chain and the draw order, and a kind supplies pure functions.
- **Data**: three schemas (`units`, `battles`, `rules`), `modes.schema.json` as a
  `oneOf` on `kind`, and the validator subset learned `oneOf` (five controls).
- **Cells**: the arena painter learned `fill`, `poly` and `ellipse` and a rational
  scale; `shared/shapes.ts`, `shared/hud-turn.ts` (the party panel, the log, the
  banner, the bars over heads, the "-atk" strike labels), `shared/pointer.ts`, and
  the Phaser cell's colour reader takes `rgb`/`rgba` (the first headless run threw
  on the fire's shadow).

## The numbers, and what they were measured against

- **Completability**: `turn/battle-completes.test.ts` plays a scripted party to
  VICTORY at tick 1012 (turn 5, 16 hits, the knight on 1 hp); a party that only
  waits is DEFEATED, the control.
- **The tape** is eight rows authored against the real sim: the knight and the
  wizard walk, the enemies act once both heroes are done, and on turn 2 the knight
  walks to (3,1) and strikes the slime from 14 to 7.
- **The control** in `golden-tape.test.ts`: `walkTicks` one longer moves the
  meadow chain, while the fight's and the crypt's goldens stay their committed selves.

## Open

The operator has not yet played the meadow to VICTORY and DEFEAT in the hall
(hall batch `20260913-111843-toybox-ember`). Ember is the third game in the
three-levels-and-a-boss plan (`~/.claude/plans/three-levels-and-a-boss-in-every-toybox-game.md`,
task L3): three more battles on the same painted field, and a `big-slime` boss.
