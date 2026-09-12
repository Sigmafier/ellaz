# The crypt

The second game on the Toybox engine ([`studio/toybox/`](../../toybox/README.md)):
the knight through three locked rooms of bats, ninjas and a wizard, each room a
wave, the rooms joined by a door. Built 2026-09-12 (plan
`~/.claude/plans/crypt-on-the-toybox-engine.md`) as the first proof of the
engine's promise - a game is five folders and a page - and every one of its
numbers is a file in this directory. The rules, the cells and the harness are the
engine's; what the crypt ADDED to the engine is one rule and three art kinds,
both listed below.

## The map

| directory | holds |
|---|---|
| `data/` | every gameplay number, each file held to `toybox/data/schemas/<dir>.schema.json`: `arena/crypt.json` (three screens of one 1920 px world; the sim floor at **-40**, below the spawn line, so a left spawn walks in instead of popping; a stone band, a flagstone band and two archways for the painter), `match/crypt.json` (the fight's match numbers under this game's own name), `stage/crypt.json` (the fight's stage numbers plus `door: { x: 560 }`), `modes/crypt.json` (the knight and three rooms: three bats; two ninjas and a bat; the wizard and two bats - ten roster rows), `fighters/` (knight 100 hp · ninja 24 hp, xp 15 · wizard-boss 60 hp, xp 30 · bat 14 hp, xp 10, flying), `ai/` (ninja-cpu, wizard-cpu, bat-cpu) |
| `assets/` | the four sprite sets (knight, ninja, wizard, bat - snes16), COPIED from `dist-export` by `node toybox/harness/copy-sprites.mjs --game crypt` and byte-checked by its `--check` (16 compared, 0 differ) |
| `tapes/` | `crypt-600.json` with its `.golden.json` beside it (`d960cba7 / cca09ed7 / 6e98cddd`) - the admission instrument |
| `page/` | `index.html` + `main.ts`: the engine's Phaser cell on the one harness with live input; `crypt` is the one mode and the default; `?tape=crypt-600&fast=1` replays the golden, `?stats=1` prints the harness instruments |
| `tournament/data/raw-fight.jsonl` | every `run-tape` row appended for this game |

## Running it

```bash
cd studio
npx vite build --config toybox/vite.config.ts                  # -> studio/dist-toybox
node toybox/harness/run-tape.mjs --game crypt --tape crypt-600    # canvas + page must ADMIT on the golden triple
npm run assert:fight                                              # the tenth gate, over every games/*
bash ~/.claude/scripts/hall-file.sh dist-toybox --title toybox-crypt
#   -> open .../dist-toybox/games/crypt/page/index.html?stats=1 from Windows
```

Arrows or WASD walk, space swings; on a phone the left half drags to walk and
the right half taps to swing. Clear the room, then walk INTO the archway when
GO shows: the screen cuts to the next room. The knight at 0 hp fades and the
room restarts with coins, xp and level kept - no fail punishment, as the fight.

## The door - the one rule the crypt added to the engine

A stage file may name `door: { x }`. While it does, the go phase holds the
camera at the room's left edge until the hero, standing, reaches `x` view px
into the room; then `camX` jumps to the next room in one tick
(`toybox/sim/stage.ts` `followCamera`, six lines). The existing screen hold puts
the hero at the next room's left pad and the existing next-wave rule starts its
fight the same tick, so no entry position and no new state were needed. A hero
down in the doorway does not cut. Compile refuses a door past
`view.w - screen.heroPad`, naming the stage. Without a `door` the go phase
scrolls as the fight's does - the fight's stage file carries none, which is why
its two goldens printed IDENTICAL through the change (`38c4cb3c / eaa3c2af /
442ceea2` and `b231a537 / 3a784cd1 / e8dd20be`), twice: once when the rule
landed and once when this game's golden was written.

The archway is paint: `arena/crypt.json` puts a `door` prop at 525..595 px so
the knight's feet at 560 stand under the arch. The painter runs once at mount,
so the arch is always open; the HUD's GO says when to walk. A closing door is a
follow-on, with the wizard's bolt and torchlight.

## What the crypt reused, and what it added

Reused as-is: the wave machine (spawn on delay at the screen's edge, the screen
hold, fight -> go -> clear, the restart), the pickups, xp and levels, the stage
HUD, `run-tape`, `write-golden`, `assert:fight`, `copy-sprites`, the loader's
roster walk. The bat's fighter and ai files are copies of the fight's, on the
record: a game brings its own data.

Added to the engine, all generic and gated: the door rule above; three painter
kinds any arena file can name - `stone` (mortar behind, one course of blocks per
row, every other course offset half a block, a few blocks lighter or darker from
the band's seed), `flagstones` (the planks' perspective as slabs with seeded
seams) and `door` - with nine palette names, and `cells/shared/arena.test.ts`,
the painter's first test; `stage-completes.test.ts` and `data.test.ts` now walk
every game rather than the fight alone.

## The numbers, and what they were measured against

- **The moves** (`art/characters/{knight,ninja,wizard}/moves.ts`): the knight's
  blade 12 damage with the robot's knock and fall (spark), the ninja's cut 8 with
  a lighter knock and a lower fall (two floor someone), the wizard's orb 10 with
  the robot's star. Every hurt box inside its rig's hitbox and every box inside
  the exported frame - `moves.test.ts`, 36 green on first placement. The knight
  walks at 90 / 58 against the robot's 96 / 62: plate, and a first placement -
  the operator's play rules it.
- **Completability**: the scripted hero of `stage-completes.test.ts` clears 3 of
  3 rooms at tick 1863 of 9,000 - go at 461, the cut into room 2 at 639, go at
  1093, the cut into room 3 at 1242 - and every coin ends in the purse.
- **The left spawns**: `sim.xMin` -40 against `screen.spawnPad` 30, pinned by
  `data.test.ts`; the fight's floor of 20 still clamps its own left spawns
  (parked in the toybox plan, one number).
- **The stone band** is 157 px tall, not 150: the built page shot headlessly
  showed a pale seam where the cell's clear colour met the floor at 157.
