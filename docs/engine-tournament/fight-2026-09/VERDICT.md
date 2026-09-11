# Fight tournament verdict - Phaser 4 draws the fight game (2026-09-12)

Seven renderers ran ONE recorded match (`versus-600`, 600 ticks, seed 20260912)
from ONE pure TypeScript sim, and every one of them reached the same three
hashes: state `dfd5d033`, per-tick chain `2617d8f2`, events `687c23d3`. The
tournament could not have been decided by "which arm looked wrong", because
none did - and that is what the sim/renderer split was built to guarantee.

## The operator's eyeball, verbatim, before the reveal

The compare page (`studio/games/fight/tournament/compare/`, blind letters from
seed 912) was opened from Windows on the operator's own display, all seven
arms started on one Go, and the verdict was:

> actually it all looks well. choose the best engine in terms of quality and
> ease of development and scale and perfomrance. and lets continue

That is a TIE across all seven on the eyeball axis, and an explicit delegation
of the pick to the measured axes. It is recorded here before `letters.json` was
opened, as the protocol asks. The mapping, opened after:

| letter | A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|---|
| arm | kaplay | littlejs | phaser4 | pixi8 | canvas | melonjs | excalibur |

## The pick: Phaser 4 (`phaserjs/phaser` 4.2.1)

Scored on the four axes the operator named. Every number below was measured on
this tree on 2026-09-12 by the harness under `studio/games/fight/tournament/`,
and the raw rows are in `data/arms.jsonl` and `studio/games/fight/tournament/data/raw-fight.jsonl`.

| axis | what was measured | phaser4 | the field |
|---|---|---|---|
| quality | pixel diff vs the canvas bar, same tick | identical outside the fx burst (531 px of 230,400, all inside the burst bbox) | every admitted arm reads the same: 1-LSB blend rounding and fx only |
| ease | defects logged while building the arm, and their class | 6, none engine-permitted: two harness/probe errors, a soft `console.error`, a two-source pivot, insertion-order depth, a path-with-two-bases | pixi8 0, canvas 0, kaplay 7, excalibur 8, littlejs 12, melonjs 13 |
| ease | authored lines in the cell | 394 | canvas 254, pixi8 371, littlejs 406, kaplay 429, excalibur 442, melonjs 484 |
| scale | what Stage and Crypt (the next two mode files) need that the arm already ships: scenes, camera, tilemaps, input, audio, tweens, particles | all of it, in the box | pixi8 and canvas: a renderer only, the rest is ours to write; littlejs: no tilemap/camera stack; excalibur and melonjs: full engines, at 8 and 13 defects |
| scale | bytes the SITE pays when the game is promoted | **0 marginal** - `vendor-phaser-*` is already a chunk ellaz ships for snake | pixi8 +164,029 gz, melonjs +242,895, excalibur +124,498, kaplay +69,510, littlejs +12,397 as a SECOND lazy engine chunk |
| performance | equal-work probe (backbuffer, dpr, drawn) | 640x360, dpr 1, drawn 20, samples 0, antialias false | identical for six arms; kaplay hard-codes 4 MSAA samples + antialias true and cannot be equalised |
| performance | time to first frame, 3 interleaved rounds, cold | median 6.1 ms, spread 3.6 | the sweep REFUSED to rank: four arms' spread exceeds the gap to their neighbour. No order is claimed |

**Why Phaser and not the zero-defect PixiJS arm.** Pixi is a renderer. The
fight scaffold's next two modes are data files (`modes/stage.json` with waves,
`modes/crypt.json` with rooms) on the same core, and each needs a camera, a
tilemap, audio and input - on Pixi that is code we write and test ourselves,
which is the integration the tournament skill says to rank, not the component.
On Phaser it is configuration, and ellaz already owns the adapter
(`studio/adapters/phaser/load-atlas.ts`), the chunk, the precache entry and the
team knowledge (snake ships on it). The engine-choice doc at
`docs/engine-choice.md` settled Phaser for the catalogue after three
tournaments; this one, run on a different game with a shared-sim harness,
lands on the same answer for the same reason - the bytes are already paid.

**What Phaser costs, stated.** 378,540 B gz is the heaviest engine in the
field - 2.3x Pixi, 30x LittleJS. It is a lazy chunk the child downloads only
on opening a Phaser game, and it is a chunk they already download for snake.
If the fight game ever ships STANDALONE (itch, Newgrounds) it pays the full
378 KB alone; Pixi would be the pick for that packaging and nothing else.

## The runner-up, and why it is on the record

PixiJS 8: 0 defects, 371 lines, 164,029 gz, pixel-identical. The one trap logged
(`anchor`, not `pivot`, is the property that moves the origin) is a naming
choice, not a defect. If the site ever drops Phaser for snake, re-run the pick.

## What the tournament found that was not about the pick

- **The admission gate cannot see a drawing.** The melonJS lane planted two
  controls - a frozen picture and a fully black canvas - and `run-tape.mjs`
  printed ADMITTED over both, because it reads the sim's hashes and the
  drawing never touches them. The eyeball round is the ONLY pixel gate in this
  tournament, which is why a seven-way tie on it still had to happen. A future
  harness should carry one screenshot-vs-bar diff per arm as a gate.
- **Kaplay cannot do equal work.** Its context attributes are hard-coded
  (`antialias: true`, 4 MSAA samples). Any jank reading on it carries that
  caveat, and the equal-work probe prints it beside the arm rather than
  failing it.
- **The TTFF sweep refused to rank**, correctly. The interleaved three-round
  design found the arms overlapping inside their own noise at this load. The
  per-round orderings are in the raw rows; nobody should quote a TTFF order.
- **Seven engine traps, one per lane, each with its class**, are in
  `studio/games/fight/tournament/defects/*.md`. The ones a future integrator
  will hit first: Pixi `anchor` vs `pivot`; Excalibur's static 4096 texture
  check and flush reordering; Kaplay's `loadSpriteAtlas` 2048 constant;
  LittleJS overwriting the host's `cssText` and `loadTexture` resolving on
  error; melonJS's `isDirty`/`inViewport` draw skips and a removed
  `me.video.init()`; Phaser's `createCanvas` soft `console.error` and
  insertion-order display list.

## Deviations from the plan, stated

- **Eyeball rounds**: the plan asked for a blind ranking of seven plus three
  pairwise rounds of the top arm against the bar. The operator ruled all seven
  a tie on sight and delegated the pick; no pairwise rounds were run because
  there was no top arm to pair. The KPI "verdicts recorded verbatim" reads
  ONE verbatim line covering seven arms, not seven plus three.
- **Ledger rows**: six, not seven. The canvas bar is not a third-party repo
  and the ledger keys on the repo; its measurements live here and in
  `data/arms.jsonl` instead.
