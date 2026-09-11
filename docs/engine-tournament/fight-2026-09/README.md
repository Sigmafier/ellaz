# The fight tournament (September 2026)

Seven renderers, one recorded match, one pure sim. The verdict and the pick
are in [`VERDICT.md`](VERDICT.md); this file is how it was run and where the
evidence is, so the numbers can be re-derived rather than quoted.

## What was compared

- **The brick**: the renderer for the studio fight game. The sim
  (`studio/games/fight/core/`) is engine-free TypeScript in int32 1/256 px at
  60 ticks/s, and every arm runs the same compiled build of it through
  `cells/run-cell.ts`, which owns the clock, the tape and the hash. A cell has
  no `update`, `step` or `dt` - it cannot advance the sim, only draw it.
- **The sticky input**: `studio/games/fight/tournament/tapes/versus-600.json`,
  600 ticks of robot vs CPU teddy, tick-indexed and sparse. The golden it must
  reach is `tournament/data/versus-600.golden.json`.
- **The field**: canvas (the bar, zero engine bytes), Phaser 4.2.1, PixiJS
  8.20.1, KAPLAY 3001.0.19, Excalibur 0.32.0, LittleJS 1.18.29, melonJS 20.4.0.
  Seven others were dropped at research time with a reason each (plan
  `read-tbe-followin-hand-gentle-truffle.md` §0.1 row 6).

## The instruments, in the order they ran

| instrument | reads | refuses when |
|---|---|---|
| `harness/run-tape.mjs` | each cell from disk in headless Chromium, `?tape=versus-600&fast=1` | any page or console error, or a hash that differs from the golden |
| `harness/assert-equal-work.mjs` | `getContextAttributes`, drawing buffer, css size, dpr, `drawn` | any arm whose numbers differ from the bar (kaplay's MSAA is printed, not hidden) |
| `harness/bytes.mjs` | the built chunks, split engine / shared / authored | fewer than the expected chunk classes |
| `harness/sweep.mjs --rounds 3` | cold and warm time-to-first-frame, order alternated per round, load average stamped | a cell's spread exceeds the gap to its neighbour - it prints per-round orderings instead of a rank |
| `compare/blind.mjs --seed 912` | the built tree | - (it never prints the mapping) |
| `compare/index.html` | all arms in fixed 640x360 slots, one Go, a ranking form, a copy button | - |

Everything appends to `studio/games/fight/tournament/data/raw-fight.jsonl` as
it happens; `data/arms.jsonl` here is the one-row-per-arm digest.

## Re-running it

```bash
cd studio/games/fight/cells && npx vite build          # all arms into studio/dist-fight
cd ../../..                                            # studio/
node games/fight/tournament/harness/run-tape.mjs
node games/fight/tournament/harness/assert-equal-work.mjs
node games/fight/tournament/harness/bytes.mjs
node games/fight/tournament/harness/sweep.mjs --rounds 3
node games/fight/tournament/compare/blind.mjs --seed <n> && cd games/fight/cells && npx vite build
bash ~/.claude/scripts/hall-file.sh ../../../dist-fight --title fight-tournament
```

After the verdict the losing cells were deleted in their own commit (`git log
-- studio/games/fight/cells` finds them), so a re-run today builds the winner
and the bar only. Check out the commit before that deletion to rebuild the
whole field.

## Files

- `VERDICT.md` - the pick, the operator's words, the deviations
- `data/arms.jsonl` - one row per arm: hashes, bytes, lines, defects, equal-work
- `studio/games/fight/tournament/defects/<arm>.md` - every defect each lane hit, with its class
- `studio/games/fight/tournament/data/raw-fight.jsonl` - every instrument row, as appended
