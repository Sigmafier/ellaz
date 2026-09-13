# Ember Hollow Crypt

The fourth game on the Toybox engine ([`studio/toybox/`](../../toybox/README.md))
and its third KIND of simulation: a real-time isometric room you play with clicks.
The knight walks where you click and swings with Space, against four slimes that
hop and bite and two bats that hover, swoop and retreat. Clear the room, and the
door opens; walk out through it, and the room is won. Built 2026-09-13 (plan
`~/.claude/plans/ember-hollow-crypt-dungeon-kind.md`) from the dungeon sketch of
2026-09-11. The fight's, the crypt's and Ember's goldens printed identical through
every commit.

## The map

| directory | holds |
|---|---|
| `data/` | every number, each file held to `toybox/data/schemas/<dir>.schema.json`. Lengths are CENTI-TILES (100 is one tile), speeds are centi-tiles per second, and times are ticks: `modes/crypt.json` (`kind: "dungeon"`, naming its room, its rules and its seed), `rooms/crypt.json` (a 12x12 grid, five blocked tiles with the pillar, crates and crystal props painted on them, the three-tile door, the knight's start, six spawns with their waits, and the scenery set), `dungeon/crypt.json` (aggro start, swing seek, click radius, separation, coin drops, banners and fades), `actors/` (knight 100 hp, speed 280, reach 155, damage 10-15, mp 60 · slime 30 hp, bite 4, 3 coins · bat 20 hp, flying at 30, swoop 3, 3 coins) |
| `assets/` | `knight--snes16`, `slime--snes16`, `bat--snes16` (copied by `copy-sprites --game hollow`, check 12/0), `knight-facings` (the front and back set, copied from its own generator), `crypt-room` (the room picture and four props, emitted by `studio/tools/room-painter/`) |
| `tapes/` | `crypt-win-2400.json` (a room WON: six foes down, the door walked, six coins taken; `026e6be3 / 22fc2f13 / bfbcc988`) and `crypt-lose-1200.json` (the knight standing still until he falls; `dc43c25e / ae5c58a5 / faa4f3ff`) |
| `page/` | `index.html` + `main.ts`: the Phaser cell on the one harness with the dungeon pointer; `crypt` is the default mode, `?tape=<name>&fast=1` replays a golden, `?stats=1` prints the instruments |
| `tournament/data/raw-fight.jsonl` | every `run-tape` row appended for this game |

## Running it

```bash
cd studio
npx vite build --config toybox/vite.config.ts
node toybox/harness/run-tape.mjs --game hollow --tape crypt-win-2400    # canvas + page must ADMIT
node toybox/harness/run-tape.mjs --game hollow --tape crypt-lose-1200
bash tools/room-painter/reproduce.sh              # the room picture re-emits byte-identical: 3 files, 0 differ
npm run assert:fight
bash ~/.claude/scripts/hall-file.sh dist-toybox --title toybox-hollow
#   -> open .../dist-toybox/games/hollow/page/index.html?stats=1 from Windows
```

## What the Hollow added to the engine

- **A third sim kind**, `toybox/dungeon/` (twelve modules and twelve test files):
  grid pathing, the knight, the foes' behaviour blocks, hits, the room's phases
  (fight, door, won, lost), hash, tape and view. `readModeKind` knows `"dungeon"`.
- **Data**: `rooms`, `actors` and `dungeon` schemas, and `modes.schema.json` as a
  `oneOf` of three.
- **Cells**: a `frame` arena op (a whole painted frame drawn under everything),
  `ArenaForCell.ops` so a kind can hand the loop its own picture, both cells' frame
  branch, `shared/hud-dungeon.ts` (the hp and mp orbs, the coin plate, bars over
  hurt foes, floats, banners), `shared/pointer-dungeon.ts` and `kinds/dungeon.ts`,
  which merges the room's props into every frame's sprite list at their tiles' depth.
- **A committed generator**, `studio/tools/room-painter/`: the sketch's canvas
  painter ported onto integer arrays, with `reproduce.sh` and a `--control` arm that
  must read DIFF. The room png is 77,766 B; the plan guessed about 1 MB.

## The numbers, and what they were measured against

- **Completability**: `dungeon/room-completes.test.ts` opens the door at tick 533 and
  wins at 619 with the knight on 92 hp; a knight who does nothing is LOST at 1332, the
  control.
- **A defect found by measuring before testing**: a knight standing still for 6,000
  ticks left both slimes stuck, because a looping clip was clamped instead of wrapped.
  It became a test after it was found.
- **Two defects found only on the BUILT page**: the hit and coin events had to be in
  screen px for the fx, and the sprite set had to come from the clip reader, not the
  frame name. A headless drive of seven steps ran with zero errors; distinct draws
  read 93 to 96%.
- **The control** in `golden-tape.test.ts`: the knight one FP a tick faster moves the
  win chain, while the four older goldens stay their committed selves.
- **Deep-test** (report `~/.claude/reports/deep-test-ellaz-dungeon-sim-2026-09-13.md`):
  six edge cells, ten mutants killed, the no-op survived, and one mutant survived on an
  order the sim cannot reach (documented there).

## Open

The operator has not yet played the room to VICTORY and DEFEAT in the hall (batch
`20260913-125655-toybox-hollow`). The Hollow is the fourth game in the
three-levels-and-a-boss plan (task L4): three more rooms on the same painted room with
the props moved to new blocked tiles, and a `big-bat` boss.
