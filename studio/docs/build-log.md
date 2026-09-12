# Studio build log - what shipped, in order, with the numbers

The studio's own record, the same shape as the platform's
[`docs/build-log.md`](../../docs/build-log.md): each entry says what changed,
the measurement that proves it, and the trap it cost. Git is the source of
truth for *what*; this file holds the *why* and the numbers that were measured
once and are expensive to re-measure. Read it before re-deriving a count,
re-opening a decision the operator already made, or wondering why a thing is
built the way it is.

**Status at the last entry**: `main` @ `c2f9f1e` (2026-09-06). Studio
`build:check` exit 0: 289 tests, 19 registered styles, 12 characters, 48
sprite sets / 1,200 frames, 8 moves files, 9 gates, every control fired.
**Eleven commits unpushed**; the last studio CI run is on `51950ec`, before the
roster, so CI has never seen the pixel cast. Plan parked at S7 - see § Where it
stands.

---

## M1 - the workspace, the styles, the rig, the export, the gallery (2026-09-05)

**Commits**: `1fe0483` .. `c680cca`, seventeen tasks W1-W17 in one day. Plan:
`~/.claude/plans/i-picked-lets-create-structured-wozniak.md`.

A third independent workspace beside `src/` and `holdem/`: own `package.json`,
lockfile, tests, gates, workflow. `assert-boundary` refuses an import in either
direction, and `studio/**` is on both ellaz deploys' `paths-ignore`, so a
studio push never republishes ellaz.fun.

What landed, with its measurement:

| piece | measured |
|---|---|
| scene DSL + five shared passes + 13 renderers ported from a scratchpad HTML | render-smoke 39/39 (13 styles x 3 scenes) in headless Chromium |
| recipes, nine identical headings, gated | `assert:recipes` 13/13, 9 controls |
| seven palettes as JSON, `.gpl`/`.hex` round-tripped | 11 tests |
| the parts rig: bones, poses, keyframes, bake with a pinned pivot | 17 tests; pivot cannot move |
| robot + knight hand-rigged, teddy parametric, slime hand frames; five clips each | 20 clip strips eyeballed |
| technique library: 8 sampled generators of the same robot, 3 card-only | `techniques.test.ts` SAMPLED = 8 |
| export: sheet + TexturePacker atlas + manifest + palettes, stamped with commit and `dirty` | 16 sets / 400 frames |
| three export gates (schema, frame grammar, atlas-vs-sheet pixels) | 28 controls |
| Phaser + canvas adapters, Godot stub that says it is one | recording-fake tests |
| gallery: six pages in ONE html file that opens from `file://` | 8/8 routes shot |
| CI `studio.yml` with Playwright | run 33978168087 green incl. every control |

148 tests at the end of M1, from 42 after the port.

**The traps.**

- **The dirty stamp read clean on a dirty tree.** `git status --porcelain -- studio`
  run with cwd `studio/` names the pathspec `studio/studio`, a directory that
  does not exist, so the status was always empty. Pathspec `.` now, and it was
  watched printing `-dirty` before the fix was committed.
- **The runner bundle goes stale by a hand-kept list.** The freshness check
  compared the bundle's mtime to `art/` and `runner/` and not to `export/` or
  `adapters/`, which the bundle also imports; a function added to the runner
  reported `is not a function`, which reads as a source bug. All four
  directories now; `STUDIO_REBUILD=1` forces it.
- **A `str.replace` patch that finds no anchor writes the file back unchanged
  and prints its own success line.** Twice. `assert anchor in s` before every
  replace.
- **The gallery's port.** `vite preview --port 5188` was refused by the machine's
  dev-port gate at 19:16; the operator authorised 5188 at 19:31. It is the
  studio's only port and `strictPort` makes a taken port an error rather than a
  silently different origin.

## The gallery on shadcn, and the rule that made it so (`1f62e5f`)

Two sidebars were built and measured on the same data - a hand-rolled vanilla
one on the ellaz tokens, and the shadcn `Sidebar` - and published as a pair
(hall `20260905-185432`). The operator picked shadcn, and asked for the rule to
be learned and always used: **a product ships on the lightest kit that meets
its byte budget (Preact + `src/ui`); a tool ships on shadcn + Radix on the same
tokens.** Rule file:
[`.claude/rules/a-tool-ships-on-the-shared-kit-a-product-on-the-lightest.md`](../../.claude/rules/a-tool-ships-on-the-shared-kit-a-product-on-the-lightest.md).

`gallery/src/tokens.css` is a byte copy of `src/ui/tokens.css`; `assert:tokens`
(gate 7, 5 controls) holds them equal and prints the `cp` when they drift. The
sixth primitive is `npx shadcn add`, never a hand-rolled rail.

## The beetle, and the first culls (`4a0fcca`, `601dec8`, `aa73f4b`, `51950ec`)

The operator's law that every surface we build carries the beetle landed on
the gallery first (surface `studio-gallery`, loopback http only). Its first
note removed Stained-glass mosaic for good; six notes in one minute removed six
more (NES, hi-bit, CRT, voxel, sticker, watercolor), taking the registry from
13 to 6: snes16, paper, flat, crayon, gameboy, clay. The notes are shown back on the page as pins plus a drawer
(hall `20260905-204459`, answered YES).

**Trap:** a note dropped on a canvas carried no words, because `textContent` of
a canvas is empty. Tiles now carry `data-tile`, and the widget climbs to the
nearest element with words.

## The styles ledger, the research pass, and LF2 (`4c70ba7`, `594322b`)

Operator: *"a ledger of what styles we chose and what we removed."* IN is
`registry.ts` itself; OUT (7, each with its commit and the operator's own
words) and BACKLOG live in `art/styles/ledger.json`; `docs/styles-ledger.md`
and the gallery's Ledger page are RENDERED from them. `styles-ledger.mjs` is
gate 8 (12 controls): a removed style still registered, a backlog row
re-proposing a removed one, a git deletion the ledger never recorded, and a
hand-edited doc all red. **Never re-propose an OUT row.**

The research pass (`~/.claude/reports/research-art-styles-pixel-rosters-lf2-2026-09-05.md`,
cache note *Art Styles Catalogue, Rosters and LF2*) produced 32 backlog rows
across pixel, ink, print + paint, vector + craft, and an 80px arcade-brawler row
of our own. Little Fighter 2 was studied ONLY through F.LF's GPL clean-room
docs, written up in [`reference/little-fighter-2.md`](reference/little-fighter-2.md);
the installer on the desktop was never run or unpacked and nothing of theirs
may enter the repo.

## The pixel family, and the verdict that changed the source (`0d10c9b`)

Thirteen pixel sub-styles rendered from the backlog as card renderers (PICO-8,
C64, Spectrum, EGA 16, VGA 256, Neo Geo, HD-2D, pre-rendered, rotoscope,
1-bit, isometric, chunky 32, brawler 80) and published on the reference scene
(hall `20260905-215742`). The operator: all *"pretty bad"*; Neo Geo and HD-2D
picked as the least worst, a direction hint and not a keep.

The finding: **every style was a filter over four characters drawn as about
ten rectangles, and a filter cannot add anatomy or a light. The source was the
ceiling.** Recorded as a rejected taste row. No further style family is
rendered until the source is fixed - which is where the rest of this log goes.
The 13 cards are still registered (19 rows); the cull bookkeeping is S2 and
still open.

## The bake-off: three ways to make one knight (`f23ca85`, `8dee493`, `b2037e4`)

The operator's rulings first (taste rows 2026-09-05): AI sprites allowed as a
BASE with our palette lock and cleanup; no commissioning budget; CC0 packs are
calibration controls only, never shipped; bake-off before any roster.

| arm | what | result |
|---|---|---|
| A hand-placed | the knight at 48 px as palette-indexed strings, craft rules from Pixel Logic / Saint11: silhouette first, clusters not dots, one light, hue-shifted ramps, selective outline | *"amazing"* - keep and scale (hall `20260905-223915`) |
| B FLUX.1-schnell | local, Apache 2.0, ComfyUI + GGUF Q4 on the GTX 1660 Ti, then palette lock + cleanup | good illustration, muddy at 48 px through the lock - dots, no clusters (hall `20260906-082844`) |
| C CC0 control | a Kenney knight-like sprite, scratchpad only | calibration only |
| Ludo.ai | the first AI plan | out: not free for the operator |

Arm A then went on the rig (`8dee493`): one drawing cut into eight parts along
the bone tree, five clips, every frame snapped back to the grid. The technique
is `art/techniques/pixel-parts.ts`. **Operator's route: hand-placed pixel
parts posed by the studio rig.**

**Traps.**

- **The style drew a second outline ring outside the drawn one.** A pixel
  character brings its own outline; the pixel styles add none (`b2037e4`).
- **FLUX under the Bash tool's 8 GB memory cgroup**: ComfyUI was killed while
  mapping 9.7 GB of model files. Launch it under `systemd-run --user --scope`
  (`COMFY_SCOPE=1` in `~/comfy/run-knight.py`). `/tmp` is a full tmpfs -
  models never go there.
- **Gemini image generation** is a later arm only, with an OGAS key and no
  spend before the operator says so.

## The cast as pixel parts, and the recipe (`07bc102`, `23e8cb0`)

Robot 48, teddy 32, slime 32 redrawn as pixel parts on the rig; all four
kept as drawn (hall `20260905-231046`). Sizes by role are the operator's law:
**hero 48 / small enemy 32 / boss 64.** A pixel character declares `pixel:
UNIT` and the export aligns its frame to that grid; UNIT is 5 because that is
snes16's CELL. The recipe - rules, cutting along the bones, posing and
snapping, "adding a character in an hour" - is
[`pixel-characters.md`](pixel-characters.md), and the same recipe is a
`games-art-playbook` tenant in the doctrine atlas (project world), as the
operator asked.

## The roster: twelve, by band and role (`d28ac98`, 2026-09-06)

Eight new characters drawn by archetype across three audience bands: bunny 48,
crab 32, Owl King 64 (kids); ninja 48, wizard 48, bat 32 (teen); brawler 48,
golem 64 (adult). The matrix is `art-bible.md` § The roster. The operator kept
all eight as drawn (hall `20260906-092425`, answered in chat).

Numbers: 140 character tests; the silhouette ratchet holds every pair of rest
masks, boxed to 24 cells, under IoU 0.85 (66 pairs, closest ninja/brawler at
0.82); 48 export sets / 1,200 frames.

**Traps.**

- **The feet test forced two animation idioms.** Every standing frame must
  keep its feet within a pixel of the ground, so wide- or long-legged bodies
  (crab, owl, wizard, golem) shuffle by translation in their walk rather than
  swinging about the hip, and flat bodies (crab, bat) flip onto their back at
  ko while tall bosses tip.
- **The painter was not in the repo, for a day.** The grids were painted by a
  small Python range-painter (`px`/`rect`/`ellipse`/`poly`/`shade`,
  claim-coverage check, `emit_pixels` + `emit_rig` from one spec per character)
  that lived in the session scratchpad under `/tmp` - a tmpfs - while the repo
  kept only the emitted rows. Found at parking time. It is
  `studio/tools/roster-painter/` now, and its `reproduce.sh` emitted all sixteen
  files byte-identical to the repo (a planted one-pixel change reds it, exit 1).
  Two instrument errors on the way: a stale `.pyc` served the mutated source
  after the restore (same size, older mtime; `python -B` now), and a pipe to
  `tail` reported `tail`'s exit code. Rule:
  [`a-generator-of-committed-literals-lives-beside-them.md`](../../.claude/rules/a-generator-of-committed-literals-lives-beside-them.md).
- **The render-smoke ink floor was tuned against the old reference.** 100 was
  right for four geometric figures; the twelve-pixel reference reads 77-90 on
  the palette-locked styles, so the floor is 40 (blank still reads 0) and the
  gate prints its lowest reading.
- **One Chromium tab crashed holding nineteen large canvases.** The gallery
  shots script opens one page per route now.

## S6: every scene draws the roster, and the fight half gets a file (`fd9ceab`, `c2f9f1e`)

Operator: *"keep all eight, start S6. make sure they all appear in our galleries
and studio. properly."*

- **Scenes**: `art/scenes/cast.ts` places any character at native cell size;
  the reference is the twelve in two rows (1590 x 800); the playroom and the
  field are drawn at 480 x 300 and scaled 2.5x so the cast stands at s = 1.
  The game casts widened: Toybox Brawl 6, Ember Hollow 5, both on the
  `pixel-parts` technique.
- **The moves file** (`export/moves.schema.json`, `export/moves.ts`): Little
  Fighter 2's frame graph with names - states over clip names, per-frame
  hurt / hit / push boxes in body units from the pivot converted to frame
  pixels like the manifest hitbox, inputs, `next`, impulse, `onHit` light /
  heavy. Robot and teddy carry moves; the exporter writes
  `<character>--<style>.moves.json` beside each manifest (8 files).
- **`assert-moves` is the ninth gate**, 14 planted controls, all fired; it
  refuses a run with zero moves files.

289 tests, 9 gates, 82 controls, root `assert:context` OK.

## Where it stands - parked at S7 (2026-09-06)

Plan: `~/.claude/plans/studio-m2-wider-styles-roster-and-the-fight-model.md`.

| task | state |
|---|---|
| S1 plan + ledger row | done |
| S2 pixel family rendered; **cull bookkeeping open** (13 cards still registered) | half |
| S3-S5 vector + craft / ink / print + paint families | paused until the operator asks for more styles |
| S6 moves file + ninth gate | done |
| **S7 hitbox overlay in the Sprites player** (bdy / itr / push colours, frame scrub) | **next** |
| S8 roster | done, kept |
| S9 `fight/` engine + Fight page | open |
| S10 docs, ledger sync, README, memory | this entry |

Open beside the plan:

- Eleven commits unpushed; studio CI last ran on `51950ec`. A push runs the
  nine gates on the roster for the first time.
- Hall batches never answered in the hall (their rulings came in chat where
  they came at all): `20260905-165533` (the 13 ported styles), `165649`
  (which technique), `165656` (which style the sprites ship in), `191721`
  (the shadcn gallery, later ruled yes in chat).
- A new character is the `add-a-pixel-character` skill; the painter is in `tools/`.
- `--on-brand on --brand` at 3.14:1 in the app's ShareSheet and Boards is a
  platform defect, pinned by a test, not the studio's.

## The fight game: one pure sim, seven renderers, Phaser picked (2026-09-12)

`studio/games/fight/` is the studio's first game scaffold. The sim is engine-free
TypeScript (`core/`, int32 in 1/256 px, 60 ticks/s, seeded rng IN the state,
FNV-1a over an ordered field list, 14 test files including a golden tape whose
two negative controls were watched red first), every gameplay number is a JSON
file under `data/` with a schema, and the sprite sets are copied from
`dist-export` by `tools/copy-sprites.mjs` with a byte-identity `--check`.
`assert:fight` is the studio's tenth gate: data, assets and the golden must
agree, nine planted controls.

Seven renderers then ran ONE recorded match (`tournament/tapes/versus-600.json`)
through `cells/run-cell.ts`, which owns the clock, the tape and the hash - a
cell has no `update`, `step` or `dt`. All seven reached the same three hashes
(`dfd5d033` / `2617d8f2` / `687c23d3`), did equal work at 640x360 dpr 1 drawn
20 (Kaplay's hard-coded 4 MSAA samples printed beside it), and were pixel-
identical to the plain-canvas bar outside 1-LSB blend rounding and the fx
burst. The operator saw all seven blind on one hall page and ruled a tie -
*"actually it all looks well"* - and delegated the pick to the measured axes.

**Phaser 4 wins**: 6 defects (none engine-permitted), 394 authored lines,
scenes/camera/tilemaps/audio in the box for the Stage and Crypt modes, and zero
marginal site bytes because snake already ships `vendor-phaser`. Its cost is
stated: 378,540 gz, the heaviest engine in the field. PixiJS 8 is the runner-up
(0 defects, 164,029 gz, a renderer only). Verdict, letters and every number:
`docs/engine-tournament/fight-2026-09/`; six Stack Ledger rows written with
evidence, lesson, pair and the verdict; the losing cells deleted in their own
commit so `git log -- studio/games/fight/cells` still holds them.

Two findings worth more than the pick. **The admission gate cannot see a
drawing**: the melonJS lane planted a frozen picture and a fully black canvas
and `run-tape.mjs` printed ADMITTED over both, because it reads the sim's hashes
and never the pixels - the eyeball is the only pixel gate. **The TTFF sweep
refused to rank**: three interleaved rounds found four arms overlapping inside
their own noise, so it printed per-round orderings and no order is claimed.

Parked for W10 tuning, in the moves data and not in code: a robot mashing
attack takes zero damage in 6,000 ticks, because attack cancels from frame 4
with no recovery window.

**Next.** The winner promoted to `games/fight/render/`, the Versus MVP playable
from the hall with keyboard and touch, `distinctDraws` read at 100% on the
operator's 120 Hz display.

## Stage mode: side-scrolling waves on the fight core (2026-09-12)

The operator chose side-scrolling waves for Stage and answered six questions
before a line was written: a downed hero restarts the WAVE (coins, xp and
level kept, no fail punishment), coins + xp only (no spring fist), three waves
and a camera, tune by rebuild + hall page, Crypt as the next plan designed for
now, and a FIXED roster with spawn timers. Plan:
`~/.claude/plans/read-the-following-handoff-swift-wadler.md`.

Eight tasks, eight commits, all by pathspec with the file count verified.
The slime and the bat got their moves (a lunge, a swoop) and their sprite sets
joined `games/fight/assets/` at 16 compared, 0 differ. The core learned the
vocabulary with the hash ratchet watched red first: `FighterState.active`
(dormant / live / on screen), a `stage` block (wave, phase, clock, camX, coins,
xp, level) behind a presence byte, `pickups` folded count-then-each, and a
fighter file may say `xp`, `flying`, `hover`. A mode file may name a `stage`
file and `waves[]`; every spawn is one roster row from tick 0, dormant until
its wave and delay, at most 31 because the hit mask is one bit per target.
`core/stage.ts` wakes them at the screen's edge, follows the hero, holds
everyone inside the screen, turns fight -> go -> clear and restarts a wave;
`core/pickups.ts` pays a KO exactly once and spends xp on levels. Both cells
take `camX`, draw coins as shared rects, and share ONE stage HUD layout.

**Measured, not tuned by feel.** The bat's hover moved 30 -> 20 because the
robot's punch rows (20-29 of 48) could not reach a body lifted 30. A scripted
hero (`stage-completes.test.ts`) clears 3 of 3 waves at tick 3295 of a 9,000
budget and ends with all twelve coins. `/deep-test` found one class - a
level-up heal revived a downed hero mid-fade - fixed at the heal; six mutants
killed by their named cells, the no-op survived. The parked defect (a robot
standing still and mashing attack took 0 hits in 6,000 ticks) needed two
traces: a hold-in-place teddy sat 44 px inside a 56 px punch; a step-out
teddy was still hit at 64-66 px because its own hurt box begins 9 px ahead of
its pivot; and with the hold right, cooldown 45 landed 0 at EVERY hold value.
The matrix (standing mash, 6,000 ticks): cooldown 45 -> 0 / 0 / 0 at hold
0 / 200 / 255; 60 -> 0 / 2 / 0; 75 -> 0 / 15 / 14. So `attackCooldownTicks`
is 60 and `holdWhenTargetAttacks` 200, and five seeds read 2, 3, 10, 1, 4
(hold 0: 0 on all five). The Versus golden moved once, in that commit, and
says so.

**Admission.** `tournament/tapes/stage-600.json` + its golden (2ec5dd5c /
f0349eed / 225525c6, 7 hits, a slime and a bat KO'd, the hero at level 2);
the golden test reads every tape on disk; the stage-only control is the
spawn band, because a camera-divisor edit was measured NOT to move a 600-tick
chain (the camera never unlocks). `assert:fight` checks a mode's stage file
and its waves' names (tenth control watched firing); `run-tape --tape
stage-600` ADMITS canvas and render, `versus-600` still both. Fight suite
300 green. Hall: `files/20260912-125000-fight-stage/dist-fight/render/index.html?mode=stage&stats=1`.

Accepted, on the record: a wave restart drops the coins on the floor (xp
kept); dying refights the wave with its enemies respawned, so xp can be
farmed; a trade on the last enemy is the hero's death. Open: the operator's
own 120 Hz `?stats=1` reading and the wave-restart feel, both W8; Crypt is
the next plan (a room is a wave with a door - README § What a mode file can
say names what it reuses).
