---
name: add-a-toybox-game
description: Add a game to the studio's Toybox engine (studio/games/<name>/ - data, assets, tapes, a page) the way the crypt was built on it in one day, with the gates that refuse a half-finished one and the three traps the second game hit. Use when adding, scaffolding, porting or promoting a game under studio/games/, when a game needs a new engine rule or a new arena art kind, or when a games/* walk in the engine's tests goes red after a game is added.
---

# Add a game to the Toybox engine (about one day)

The engine (`studio/toybox/`) is the rules, the two renderer cells and the tape
harness, once; a game is five folders and a page under `studio/games/<name>/`.
The contract in full: [`studio/toybox/README.md`](../../../studio/toybox/README.md)
§ What a game brings. The worked instance, every number with what it was measured
against: [`studio/games/crypt/README.md`](../../../studio/games/crypt/README.md)
(2026-09-12, plan `~/.claude/plans/crypt-on-the-toybox-engine.md`).

Everything runs from `studio/`. Prove every step with the WHOLE studio suite
(`npx vitest run`), never one file: three sim suites once read the tape by a path
no grep saw, and a single-file run missed them.

## The six steps, in order

1. **Moves for every fighter that has none.** `art/characters/<c>/moves.ts` on the
   character's rig spec with `gridBox` + `standardGraph` (the robot's is the
   template; boxes named in the drawing's own grid cells), registered in
   `art/characters/index.ts`; `moves.test.ts` names every fighter that carries
   moves - widen that list. Then `npm run export`, and
   `node toybox/harness/copy-sprites.mjs --game <name> <set>...` followed by
   `--check` (N files compared, 0 differ). A set with no moves file is refused.
2. **An engine rule, only if the game needs one, and only gated on data.** A new
   behaviour enters behind a key in a data file the existing games do not carry
   (the crypt's `stage.door`), TDD in the engine's test with the door-less data as
   the control, and `node toybox/harness/write-golden.mjs` must print every
   EXISTING game's triples identical in the same commit. The rule:
   `.claude/rules/an-engine-rule-enters-gated-on-data-the-existing-games-lack.md`.
   Most games need none - a room is a wave, a boss is a fighter file with more hp.
3. **The data.** `data/{arena,match,stage,modes,fighters,ai}/*.json`, each held to
   `toybox/data/schemas/<dir>.schema.json`; copy the fight's shapes and change the
   numbers. A game brings its OWN copies of shared fighters (the bat's two files
   are copied verbatim, on the record). A left spawn walks in only if the arena's
   `sim.xMin` is below `-screen.spawnPad`. `data.test.ts` pins the games list by
   name and every fighter's sprite set in its own game's `assets/` - add the game
   to those lines.
4. **Art the painter does not know yet.** `toybox/cells/shared/arena.ts` draws
   `kind`s from the arena file's loose `art` block; a new look is a new generic
   kind (never a game-named one) with its rects tested in `arena.test.ts` (inside
   the band, the named colours, the same seed reproducing). Bands must meet: a gap
   between two bands shows the cell's CLEAR colour, which no painter test can see.
5. **The page and the proof it completes.** `page/index.html` + `main.ts`: copy
   the fight's, set the default `mode`, change the help line; vite finds it from the
   tree. `toybox/sim/stage-completes.test.ts` walks every stage mode of every game
   with a scripted hero - add the game to its population line and read the clear
   tick it prints. If the hero cannot clear a room, the numbers are wrong, not the
   test.
6. **The tape, the golden, the gates.** Author `tapes/<name>-600.json` (ten
   seconds of hero input), then `write-golden` (the new golden beside it, the old
   games identical), then `npx vite build --config toybox/vite.config.ts`, then
   `node toybox/harness/run-tape.mjs --game <name> --tape <name>-600` must ADMIT
   canvas and page at the golden's triple, the old games' tapes still ADMIT, and
   `npm run assert:fight` walks both. Publish with
   `bash ~/.claude/scripts/hall-file.sh dist-toybox --title toybox-<name>` and prove
   the page URL with `verify-dev-url.sh` from Windows; the operator's eyeball is the
   only pixel gate.

Then the docs: the game's README (numbers and what they were measured against),
the engine README's game count, a build-log entry appended as an index blob when a
peer holds the working copy, and the memory.

## Failed attempts, so they are not repeated

| What was tried | What happened | Do instead |
|---|---|---|
| Writing the tape, then running the whole suite before `write-golden` | `golden-tape.test.ts` asserts a golden EXISTS for every tape, so the suite read red and the C5 commit was refused twice | tape, `write-golden`, suite - in that order |
| Trusting the population pins to be generic | "the games are the fight", "the tapes are the fight's two", the fighter-set list: four tests red the moment a second game existed | widen each line with the new name; never loosen it to `length > 0` |
| Ending the wall band at the fight's 150 px with the floor at 157 | the built page showed a pale seam: the cell's clear colour between two bands | bands meet edge to edge; shoot the BUILT page headlessly (`shot-crypt.mjs` recipe: `routeDisk` + `cellUrl("page", ..., game)` from `run-tape.mjs`) |
| Counting the spawn's wake tick from the cut as `delayTicks` steps | off by one: a row wakes on its delay-th step, as the fight's spawn test pins | mirror the existing test's arithmetic before asserting your own |

## What every commit carries

One additive commit per step, by pathspec (`git add` new files first, then
`git commit -- <paths>`), and `git show --name-only --format="" HEAD | wc -l`
matching the count. A sim change names which goldens moved and why; a step that
touched none says they printed identical.
