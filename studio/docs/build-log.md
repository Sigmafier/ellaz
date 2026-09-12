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

## Next games: a gallery of what to build next (2026-09-11, uncommitted)

Plan: `~/.claude/plans/i-want-to-find-functional-wand.md`. The operator: *"the list we
have is not good enough i want more options and a gallery i can choose from"* - too few
rows, too many quiet puzzles, not enough for adults.

**What it is.** A `Next games` page (`#/next`) with one card per candidate: the real
game that inspired it, what you do, why it is fun, fun / thrill / reviews / trend dots,
the evidence and its label, and Want / Maybe / No plus a note. Filters in the rail:
picks, who it is for, kind of game, which list, sort.

**Where the data comes from.** `scripts/games/pipeline.data.mjs` at the repo root stays
the only authored source. `npm run games:write` renders `docs/games/*.md` and a
byte-checked copy at `gallery/next-games/data.json`. `gallery/next-games-api.ts` serves
it, the pictures and the picks on the dev and preview server only (loopback, own origin),
and writes picks to `gallery/next-games/picks.json`. Not `public/`: the gallery build
inlines everything into one HTML file.

**Research.** Four Sonnet lanes (web portals, mobile stores, indie hits, arcade + adult
classics) returned 87 rows; merged by mechanic into 55, then 3 declined on the operator's
earlier ruling on tap-loop games (stack tower, hexagon fit, falling-sand Tetris) = 54 new,
plus 20 still open from the old list. 46 of the 55 carried VERIFIED evidence; a checker
re-fetched 10 random ones: 9 agreed, 1 named the wrong publisher (fixed). 8 old rows had
already shipped - 6 by id, and `suika`/`unblock` as `fruit`/`parking`, which only the new
title-words check could see (watched red first).

**Pictures.** `scripts/capture-next-game-shots.mjs`: store gameplay screenshot, else
og:image, else a page capture. Gitignored by `studio/.gitignore` (`shots/`) - other
people's games, never committed. First run: 74 of 74 captured, and **9 rows shared 3
identical pictures**: the portals lane had given category pages, so each card showed the
portal's logo. Fixed at both ends: 13 links corrected (each page title checked, a made-up
game returned 404 as the control), the gate refuses a shared or listing-page `refUrl`
(controls 8, 9), and the capture script exits 3 on two identical pictures (watched red on
the real defect). Final: 74 distinct, 74 decoded on the page.

**Measured.** games:check 0 with 9 controls CAUGHT · studio build:check 0 (289 tests) ·
page probe: 74 of 74 cards, adults filter 24, a Want click lands in picks.json and a
second click clears it, 0 px overflow at 390 wide, no page errors · beetle mounted ·
`verify-dev-url.sh` safe to hand over.

**Next.** The operator picks; animated demos get built for the Wants only.

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

## The look demo: the Showcase bar at the size a game draws it (2026-09-12)

The operator stopped a nine-task standard mid-plan - *"i want to see a simpe
mvp demo of how it would look first so we ack the direction"* - so `#/look`
puts the slime, the robot and the golem on the survivors arena's own ground
(`#0b0d1f`, grid `#171a33` every 42 px) playing one clip on one beat. Almost
none of it was new: `packInBrowser` + `ClipPlayer` + `drawFrame` already do
this for one character on `#/sprites`, whose own comment calls it the canvas
adapter's test scene. No export was run and no studio-to-game bridge was
needed - the gallery packs in memory, and its dev server cannot reach
`dist-export` at all (three URLs, all the SPA fallback, `text/html`, 550 B).

**The size is the whole point, and it was measured before the page existed.**
The exporter emits 980x660 frames for a character 48 authored pixels tall,
because every authored pixel is a flat `unit * scale` block and `unit` is 5
for the entire cast. So `k` is how many screen pixels one authored pixel
becomes: k=1 is literally what a player sees, and 1, 2, 3, 4, 6, 8 all land
the block on a whole number, so nothing in the picker resamples. At 6x the
robot draws 288 px, the golem 366, the slime 138 - each exactly 6x its
48 / 61 / 23. The page packs at scale 1 rather than the export's 2: identical
authored pixels, a quarter of the sheet memory (three characters at scale 2
is 43 million pixels of canvas).

**`HEIGHT_BY_ROLE` is the role's GRID, not the drawn height.** The
measurement's own control flagged the slime as 23 authored pixels against a
nominal 32 and it was right to: the pixel grid is 32 string rows of which 23
carry ink, and `origin: [20, 32]` agrees. Robot fills 48 of 48, golem 61 of
64, and a slime is simply squat. Nothing to fix - but a check that reads
`HEIGHT_BY_ROLE` as a promise about pixels will keep firing.

**The trap that cost the most: on `/mnt/c` the vite dev server never saw the
edits.** `look.tsx`, `router.ts` and `index.ts` were correct on disk,
`tsc --noEmit` exited 0 and the suite was 599 green, while `localhost:5188`
served an `index.ts` with no look import - stable ETag, and its own sourcemap
`sourcesContent` decoded to the pre-edit file. curl read fresh because curl
has no cache; the browser read a graph from before the edits and showed a
stale error overlay quoting a comment already fixed. inotify does not fire on
a Windows drive, which is why this repo already says not to QA on `npm run
dev`. Restarting the server fixed it; the BUILD is the artifact to believe.
Two hash-only navigations also silently reloaded nothing, and the renderer
wedged three times on canvas-heavy pages.

**Admission.** Verified on the built `dist-gallery/index.html` over `file://`,
the same single file the shots script opens: route `look`, no page error, no
console error, 61 frames in 1,000 ms, 17,864 ink pixels of 56,898 sampled.
Both arms were then captured in ONE browser at 1280x900 @2x, because a pair
captured two ways differs by the capture as much as by the art - BEFORE is a
real run (clock 3:00 -> 2:52, 7 shapes, runners and gems on screen), and the
harness refuses to write an arm that did not animate. The start needed a
mouse click at the canvas centre; Playwright's actionability check times out
on a constantly-redrawing canvas and the button role did not match.

Open, and NOT this demo's to answer: the five snes16 sheets are **~1.36 MB**
of PNG (robot 351 K, golem 479 K, bat 202 K, crab 181 K, slime 148 K) against
a Showcase budget the operator ruled at **300 KB per game**. That is a real
contradiction between a settled ruling and the art it names, recorded here so
the rebuild cannot ship past it quietly.

## Stage polish: a chain, corpses, 120 Hz motion, and a head in one piece (2026-09-12)

The operator played the three waves ("the base is pretty awesome") and came
back with three notes, then a fourth from the polished build. Each was
MEASURED before it was laned, and each is one commit: `b010bd1`, `b9d7fe8`,
`f716d00`, `bb650b3`. The plan is
`~/.claude/plans/stage-polish-corpses-chain-smoothness.md`.

**A fist that would not chain (`b010bd1`).** The obvious fix - lower
`attackCooldownTicks` below 60 - was measured dead first: a standing masher
takes 0 hits at every value 15/20/30/40/45 at both AI holds over three seeds,
the exploit W5 closed. So the chain is a REFUND, not a shorter recovery:
`match.landedCooldownTicks` (0) is what the attacker's cooldown becomes the
tick a swing LANDS, handing the next swing to the moves file's `cancelFrom`;
a whiff still pays 60. Gaps in `chain.test.ts` 64/64/184 -> 24/84/147 with
the control at 60 unchanged; the standing mash now 2/4/5 (was 2/3/10 - the
teddy's landed hits refund too). Both goldens moved and the commit says why.

**Corpses that rode the camera (`b9d7fe8`).** `holdToScreen` clamped a KO'd
body to the screen like the living, and nothing ever removed one. Now the
clamp leaves `hp <= 0` alone, a held ko clip's `stT` keeps counting past its
end (a living fighter knocked down still stands up at `downTicks`), and at
`stage.corpseTicks` (90) past the clip the row goes `active 3` - gone: dormant
AND spent, never respawned. No new hashed field. The stage golden's hash moved
for exactly that; its event hash did not; Versus (no KO in its tape) was
untouched.

**Motion that stuttered at 120 Hz (`f716d00`).** `viewOf` floored the
interpolation to whole game px and the 640x360 canvas was CSS-stretched, so a
0.53 px/frame walk drew every second frame in place. The plan now carries the
fraction (`pxF`), and each cell rounds to ITS grid - a whole device pixel at
integer upscale `k`: the canvas backbuffer is `view x k` with the context
scaled, and Phaser is scaled INSIDE the cell (Graphics layers x k, sprites
and text in device px, camera zoom stays 1 because zoom moves the origin).
Distinct draws at an emulated 120 Hz: 88.5% -> 96.7% (render), 89.1% -> 96.5%
(canvas), equal to the 60 Hz figure; goldens byte-identical. The instrument is
a rAF shim that hands EVERY caller the same synthetic timestamp per frame -
its first version gave each of three rAF users its own increment and read 3x
off. The clip-fps A/B (walk 10 vs 15) was ruled A: 10 stays.

**A head cut in two (`bb650b3`).** The operator's screenshot of the robot's
idle, frame 4 of 4: the visor rows one cell over, the chin rows not. The
standard idle key tilts the head 0.03 rad and a pixel rig re-snaps every
frame, so a rotation whose farthest cell moves under one cell cannot be shown
- it only shears. Rule: **a pixel part never rotates by less than a cell.**
`shapePixelPose(rig, unit)` drops any bone rotation whose reach (farthest
corner of every part on the bone or under it, at rest) times the angle is
under `unit`; every larger rotation keeps its pose. It runs at bake time
through `PixelRig.bake()`, the one path. Swept over the roster: 79 bone-frames
flattened across the twelve, 25 of 60 snes16 strips changed and 35 identical
(the slime among them); the positive control asserts the RAW clips still carry
the robot's idle tilt, and an identity shaper reds all 11 sweeps. The atlases
did not change and neither golden moved - frames and boxes come from the
moves files, not the pixels. Eyeballed on four before/after hall pages: the
robot's visor, the owl's eye rings, the bat's wing root and the wizard's face
whole; every arm and leg swing untouched.

**Traps this arc cost.** Studio CI had never run on the fight tree, and its
first run failed the typecheck on `Cannot find module 'phaser'`: locally the
typecheck had found Phaser by walking up into the REPO ROOT's node_modules
(the app's own copy), which CI never installs. `studio/tsconfig.json` pins
`paths.phaser` to `games/fight/cells/node_modules/phaser` and `studio.yml`
runs `npm ci` in that package too - the first fix (the install alone) was
re-verified red on the target toolchain before the second landed. And the
goal-drift gate stayed bound to the closed plan across the follow-on, so the
polish plan's manifest is mirrored into it; `--declare` is refused by the
bash self-protect.

**Admission.** `run-tape --tape stage-600` and `--tape versus-600` ADMITTED on
canvas + render after every rebuild; studio suite 41 files / 625 tests; ten
gates ok, every control fired; `tsc` 0. Still open: the operator's own
`?stats=1` distinct-draws figure at 120 Hz was never reported back.

## The Toybox engine: the rules, the cells and the harness leave the fight game (2026-09-12)

The operator's arc, confirmed after they played Stage: the MVP feel loop
(done), then **the engine on its own**, then Crypt on it, then Toybox Brawl to
the catalogue. Step two, in one afternoon: everything under `games/fight/`
that was engine rather than game moved to `studio/toybox/`, in seven commits
by pathspec (`9e9517e` T1, `50702ec` T2, `7bd66ce` T3, `ee14f50` T4,
`9476153` T5, `1f58895` T6, `c969dfa` T7 docs), and the proof of a pure move
is that both goldens - stage `1be09f21 / 801d2ac4 / c7532cf4`, versus
`216303af / 3ddd21d5 / 002862ad` - are byte-identical to `ec7d454` after
every one, with `run-tape` admitting canvas + page on both tapes after every
rebuild. The plan: `~/.claude/plans/toybox-engine-extraction.md`.

**The cut the operator ruled** (four `AskUserQuestion` rounds): the home is
`studio/toybox/` inside the studio workspace, not a root package; rules +
cells + harness are the engine, a game is data + sprites + tapes + page; the
name is toybox. What that is on disk: `toybox/sim/` (the old `core/`, still
sibling-only), `toybox/data/` (`loadMode(modeId, gameRoot)` - every caller
passes the game's root, the engine has no game of its own; the six schemas
at `schemas/<dir>.schema.json`, NAMED after the data directory so no table
maps one to the other; `data.test.ts` walks `games/*/data` and refuses a game
with no `modes/`), `toybox/cells/` (the loop, the contract, the canvas bar
with `?game=`, `phaser/` = the promoted render cell), `toybox/harness/` (the
four instruments and the two tools, each `--game <name>`, rows to the game's
own `tournament/data/`), `toybox/index.ts` (the node door), `toybox/vite.config.ts`
(root `studio/`, into `dist-toybox`: every cell page, every `games/*/page`,
every compare page, read from disk), and Phaser's package beside it - the
studio typecheck pins `paths.phaser` there and CI runs `npm ci` there. The
fight keeps `data/`, `assets/`, `tapes/` (tape and golden beside each
other), `page/` and its tournament history; `assert:fight` walks every
`games/*` (11 controls). The gate the whole move was for is
`toybox/boundary.test.ts`: nothing under `toybox/` imports a game, static,
dynamic or by URL; a real `games/` import planted in a scratch copy reds
naming the file, a comment naming the same path stays green.

**Traps this arc cost.** (1) T1 was proven with the golden test alone and
reded three sim suites that read the versus tape through a hand-built
`join(HERE, "..", "tournament", "tapes", ...)` - split string segments that no
grep for `tournament/tapes` saw; from T2 every task ran the WHOLE suite, and
T2 repaired T1 before anything was pushed. (2) `git commit -- <pathspec>`
takes only TRACKED files: `toybox/index.ts` was untracked at T2, so T2's
message named a door that was not in it; it landed in T3 with `git add`.
(3) The boundary test is in its own population - its first version wrote the
planted `games/` imports out as literals and the gate caught itself on the
first run; the controls are built from helpers now. (4) A local `build:check`
is red on a THIRD session's untracked gallery page (`next-games.tsx`), so
every tsc figure here is "0 outside gallery/" and the final verify runs on a
`git archive HEAD` tree with both `node_modules` symlinked in. (5) The peer
session (the sprite bridge) pushed the interleaved stack through T5 on a
pinned sha it verified on an archive tree; two copiers now exist -
`toybox/harness/copy-sprites.mjs` (dist-export -> `games/<g>/assets`) and
`scripts/sprites/sync-sprites.mjs` (the exporter in a browser -> `src/games/<g>/sprites`,
indexed PNG) - named in the toybox README as the one duplicate this
extraction knowingly leaves; one wins when a game is promoted.

**Admission.** After T7: suite 42 files / 637 tests (636 green, the third
session's router edit); `vite build --config toybox/vite.config.ts` green;
`run-tape --game fight` stage-600 2/2 + versus-600 2/2 ADMITTED on
`dist-toybox`; `assert:fight` ok, 11 controls; boundary gate 8/8 with its
mutation red; `copy-sprites --check` 20 compared 0 differ; the §9 grep for
old engine paths outside history returns nothing. Next: Crypt, as
`games/crypt/` - five folders and a page on the same engine.
