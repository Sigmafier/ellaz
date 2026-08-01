# Round 2 — the eyeball verdict, and why it inverted the benchmark

**Date**: 2026-08-01 · **Gate**: the pre-committed operator eyeball from the plan
(*"which one's jump feels best, and which would you play again?"*)

The plan fixed this question before any arm was built, and committed in advance to
treating a metric/eyeball disagreement as a **finding** rather than a tie-break. It
disagreed. This is that finding.

---

## The verdict

| rank | arm | benchmark said (PC, stress) |
|---|---|---|
| 1 | **excalibur** | 21.4 fps · **100% jank** — 4th of 4 |
| 2 | phaser | 60.0 fps · 0% jank — joint 1st |
| 3 | kaplay | 30.0 fps · 40% jank — 3rd |
| 4 | **pixi** | 60.0 fps · 0% jank — joint 1st |

The two ends swapped places; the middle held. The arm the harness rated unusable is the
one the operator would ship, and one of the two it rated perfect came last.

**Every published number is correct.** They measured something nobody plays.

---

## Why the benchmark missed it

### 1. The ranked workload is not the game

`STRESS = { sprites: 900 }`. The real level runs about 50 sprites. The ranking was
therefore a **sprite-batching throughput test at ~19x the game's actual load**.

PixiJS is a renderer whose entire reason to exist is batching. It wins that test by
construction. Excalibur is a full engine carrying per-actor overhead, so it loses it by
construction. Neither result says anything about the game.

### 2. The harness never ran where the operator does

| | harness | operator |
|---|---|---|
| refresh | 60 Hz headless | **~120 Hz** |
| surface | 480×256 backbuffer | fullscreen |
| input | scripted tape | hands on a keyboard |
| machine | quiet-ish | 25% of frames dropped |

Four independent gaps. At least one of them demonstrably inverts a ranking — see below.

### 3. It benchmarked the engine, not the integration

Pixi's arm hand-rolls tile culling: it rewrites every visible tile's texture and position
every frame — roughly 512 sprite writes, about 61k/second at 120 Hz. Phaser's tilemap
layer is engine-culled and leaves them alone.

So the Pixi arm does the **most** per-frame work of any arm, and all of that work is
**ours, not the engine's**. The benchmark measured the half Pixi is excellent at and
skipped the half we would have to write and maintain.

> "Renderer, not engine" does not mean less work. It means the work moves into your
> codebase, and into your bugs.

---

## The defect the eyeball found that three measured rounds did not

The simulation step was hardcoded to `1000/60` ms. On a ~120 Hz display the accumulator
only crosses its threshold on every **second** frame, so **half of all rendered frames
advance the game by nothing**. A permanent freeze-frame stutter, on every frame pair, in
Phaser, Pixi and Kaplay alike.

**Excalibur was the sole exception** — it landed one step per rendered frame while the other
three froze on alternate frames. The operator identified it in one sentence (*"excalibur only
seems to work smoothly"*) before any measurement did. The mechanism first given here — an
independent ~60 Hz update tick — was **wrong**; see
[Correction](#correction--why-excalibur-escaped-restated) below.

Nothing headless could have caught this: **every probe ran at exactly 60 Hz, the one
refresh rate at which the fault cannot appear.**

### Reproduced, then fixed

The fault needs a display faster than the sim. Scaling the ratio instead of the hardware —
sim at 30 Hz against a 60 Hz screen is the same 2:1 — reproduces it exactly:

| timing | steps/frame | frames advancing nothing | drawn-step jitter |
|---|---|---|---|
| sim 30 Hz vs 60 Hz screen | 0.62 | **40.1%** | 88.4% |
| sim matched to display | 1.08 | **0%** | 0% |

Fix: every arm measures the refresh rate at startup and retimes its integer physics to it —
accelerations by k², velocities by k, tick counters by 1/k, where k = 60/rate. Exactly one
step lands per rendered frame at 60, 120 or 144 Hz. Verify and stress modes stay pinned at
60 Hz, so no published figure moves; all seven arms still reproduce their golden checksums.

---

## Confound closed — the blind re-run

The first ranking had the engine names showing, and it was not recorded whether it predated
the display-rate fix. Both were settled on 2026-08-01 by a blind re-run: four arms served as
A/B/C/D in an order drawn at random at server start, all on the post-fix build with identical
settings, the ranking written to disk before the mapping was revealed
(`harness/blind.mjs`, key + verdict in `results/blind-*.json`).

| place | named run | blind run |
|---|---|---|
| 1 | excalibur | **excalibur** |
| 2 | phaser | kaplay |
| 3 | kaplay | phaser |
| 4 | pixi | **pixi** |

**Excalibur wins blind, on the post-fix build, with every arm rate-matched.** So its win is
not the 120/60 defect and not the label — it is something about the engine that neither the
benchmark nor the mechanism story below captures.

**Both ends held; the middle swapped.** Phaser and Kaplay traded places between two runs by
the same judge on the same day, which is the signature of two arms the operator cannot
separate. Read the result as *excalibur first, pixi last, the middle a coin flip* — not as a
four-way ordering.

**What it is still not**: one judge, one machine, one session, two runs. Only the second was
blind. Stability of the ends across a *second* blind run (fresh random order) is unproven.

---

## Correction — why Excalibur escaped, restated

An earlier version of this page, of `CLAUDE.md`, and of the project memory said Excalibur
escaped the 120/60 fault because it *"drives the loop from its own ~60 Hz update tick rather
than once per screen refresh."* **That is wrong.** Read from the shipped source
(excalibur 0.30.3, `build/esm/excalibur.development.js`):

- `StandardClock` is documented as implementing "the requestAnimationFrame browser api to
  run the tick()", and its `start()` body is a bare `requestAnimationFrame(mainloop)` recursion.
- `maxFps` defaults to `Number.POSITIVE_INFINITY`, and our arm sets neither `maxFps`,
  `fixedUpdateFps` nor `fixedUpdateTimestep`.

So Excalibur's `postupdate` fires **once per rAF frame**, exactly like the other three. The
claim was inferred from the arm's `scene.on("postupdate")` call site without reading what
drives it — the arm code says "not rAF", the engine says otherwise.

**The likelier mechanism, and it is a hypothesis, not a measurement**: Excalibur is the
slowest renderer measured here by a wide margin (21.4 fps against 60.0 for the other three on
the ranked workload; 9.6 fps on mobile). A frame that costs more than 8.3 ms cannot sustain
120 Hz, so the browser settles it at ~60 — which is exactly the rate the hardcoded simulation
step assumed. **Excalibur may have felt smooth pre-fix precisely because it was too slow to
run fast enough to break.**

Falsifiable, and cheap: on a 120 Hz display, a pre-fix Excalibur build should show
`display ≈ 60 Hz` and `steps/fr ≈ 1.00` in the HUD, while a pre-fix Phaser build shows
`display ≈ 120 Hz` and `steps/fr ≈ 0.50`. The HUD did not exist pre-fix, so this has not been
run. It does not affect the blind result above, which is post-fix throughout.

---

## Why does Excalibur win? — three hypotheses eliminated, none confirmed

`harness/latency-probe.mjs` and `harness/render-parity.mjs`, headless at 60 Hz, 12 trials per
arm, every trial accounted for (no silent drops).

**Input → first changed drawn position**, three independent runs, 12 trials per arm per run,
every trial accounted for (`results/latency-round2.json`):

| arm | frames (all 3 runs) | ms run 1 / 2 / 3 | ms spread |
|---|---|---|---|
| phaser | **1** | 5.1 / 1.8 / 1.8 | 2.8× |
| pixi | **1** | 5.5 / 1.1 / 2.2 | 5.0× |
| kaplay | **1** | 5.0 / 5.4 / 4.9 | 1.1× |
| excalibur | **1** | 6.7 / 13.1 / 7.9 | 2.0× |

**Read the frame column, not the millisecond column.** Frames came back 1 in **144 of 144
trials** — perfectly stable across three runs on a box whose load moved from 6 to 40 between
them. The millisecond column moved by up to 5× on identical code over the same period, which
makes it a measurement of the machine, not of the engines. An earlier version of this page
quoted a single run's 6.7 ms as "excalibur marginally worse"; three runs show that ordering
does not survive its own variance, so it has been withdrawn.

One thing the repeats do suggest, at n=3 and confounded by drifting load: Excalibur is the arm
most often failing to hold 60 fps under contention (a 33.3 ms median frame in 2 of 3 runs,
against 1 of 3 for phaser and 0 of 3 for the other two). That is consistent with the
"too slow to sustain 120 Hz, so it accidentally matched the 60 Hz step" hypothesis above, and
it is not evidence for it.

**Live canvas, read from the running page rather than the config:** all four at a 480×256
WebGL backbuffer, 2.00× upscale, 123k pixels. Identical.

So, ruled out:

1. **Input capture** — one shared `keydown` listener in `arm-lib`; all four arms are running
   literally the same code. Never a candidate once read.
2. **The update/draw split** — the four hook different points (`Scene.update`, `ticker.add`,
   `onUpdate`+`onDraw`, `postupdate`) and Kaplay carries its drawn position into a separate
   draw pass, which should have cost it a frame. It does not. All four tie at **one frame**.
3. **A render handicap** — the failure mode that produced two wrong rankings in this project
   already (Kaplay drawing 10× the pixels; a 488×558 config against a 1440×900 render). Not
   this time; the arms are pixel-identical.

On the one metric that reproduces, all four arms are identical: **one frame, every time**.

**The honest conclusion is that this probe found nothing, and that is informative**: whatever
Excalibur does better is not in the half of the pipeline that ends at "the engine assigned a
new position". It is downstream — compositing, present, frame pacing under real load — or it
is not a timing property at all.

**Why the next probe should not be built here.** Everything above ran headless at a clean
60 Hz. The operator judges at ~120 Hz on a machine dropping 25% of frames. That is the exact
mistake this whole document exists to record, and building a screencast probe in the wrong
environment would repeat it with a more expensive instrument. The working instrument is the
operator's eyes on the operator's machine.

---

## The pairwise blind — there is nothing to find

Excalibur against Phaser only, three rounds, each under a different independently-shuffled
letter pair, ranking recorded before the reveal (`harness/pairwise.mjs`,
`results/pairwise-*.json`).

| round | labels | picked |
|---|---|---|
| 1 | X / Y | excalibur |
| 2 | P / Q | **phaser** |
| 3 | M / N | **tie** |

**1-1-tie, and not one symptom ticked from a six-item list that included "can't point at
anything".** Head to head, blinded, repeated, the operator cannot separate them.

This refutes the specific prediction the four-arm runs supported. Two prior rankings both put
Excalibur above Phaser; the direct test of exactly that pair failed to reproduce it, twice out
of three, with nothing to describe.

**On power, stated rather than glossed:** three rounds cannot distinguish "no difference" from
"a small difference". It can and does refute a *large* one — and only a large one could
justify an engine migration. The test was powered for the decision being made, not for the
general question.

**What the four-arm "first place" actually was.** Ranking four things forces an order even
when the top two are level. The middle already swapped between the two four-arm runs
(phaser↔kaplay); the pairwise result now shows the top two were level as well. The reading
that survives all three runs is narrower and duller than the headline:

> Excalibur, Phaser and Kaplay are mutually indistinguishable on feel. **Pixi is reliably
> last** — the only stable ordering in any of the runs, and the one the round-2 fps table got
> exactly backwards by rating it joint-first.

---

## Verdict — Phaser stays, and the question is closed

Not "for now". Phaser **ties on feel** against the arm that appeared to beat it, and wins
outright on everything else measured: dev cost (tilemap, camera and scaling are the engine's
job), 60 fps / 0% jank on the ranked workload, ecosystem, and a 375 KB runtime amortised once
across all ten games behind a shared vendor chunk and a service worker.

Excalibur is not a reject on merit — it is a genuine alternative that happens to be no better
where it counted, while costing the slowest load of the four JS arms (1,916 ms PC / 2,910 ms
mobile) and a whole migration. There is no version of this evidence that pays for that.

**The real deliverable of three rounds of tournament was never an engine.** It is the
display-rate fix and the render interpolation, both of which live in the shared layer and
protect every game we ship regardless of which engine draws it.

---

## What this does and does not change

**Still valid, and re-auditable from this repo** — payload, time-to-interactive, integration
cost and dev cost were measured on real artifacts and are unaffected by the feel question.
The raw rows are committed here, not left in the scratchpad: `data/raw-round2.json` (87 rows),
`data/round1.json`, `data/raw-round3.json`, `data/raw-godot-slim.json`, plus 12 render
screenshots in `evidence/` and the context probes in `probes/`.

Re-derived from `data/raw-round2.json` on 2026-08-01 — every published PC cold-TTI figure
reproduces exactly:

| arm | re-derived median | published |
|---|---|---|
| kaplay | 885 | 885 |
| pixi | 1,170 | 1,170 |
| phaser | 1,426 | 1,426 |
| excalibur | 1,916 | 1,916 |
| defold | 2,984 | 2,984 |
| godot | 22,640 | 22,640 |

Quote them freely. (A `/finalize` pass earlier the same day claimed these raw files were lost —
it had searched the scratchpad `results/` directory and never looked in `docs/`, where the
archival step had correctly put them. The caveat it added has been withdrawn.)

**Now suspect** — anything derived from the stress harness's fps/jank as a proxy for felt
quality. That includes **Godot's `14.1 fps / 100% jank`**. Godot remains out, but on
**one** ground rather than two: **22,640 ms to interactive** against CrazyGames' 20 s bar
is an independent load-time measurement on the real artifact that no amount of feel
rescues. Defold is likewise unaffected — it is out on integration (iframe-only, cannot
reuse `logic.ts`, own branding), not on speed.

**The engine choice does not change** — see the verdict section above. Phaser ties on feel
and wins on everything else; Excalibur's apparent lead did not survive a direct test.

**But the ARGUMENT for Phaser changed.** Round 2 picked it partly on 60 fps / 0% jank, a
column this page has since disqualified as a feel proxy. What actually carries it now is dev
cost (tilemap, camera and scaling are the engine's job) and the fact that its 375 KB is
amortised **once** across all ten games behind a shared vendor chunk and a service worker —
the round-2 verdict over-weighted first-load bytes as if they were a per-game cost; for this
portal they are a per-user-lifetime cost. Same conclusion, different reasons, and the reasons
are what the next decision will be made from.

**The most valuable output is not an engine.** It is the display-rate fix, which lives in
the shared layer and therefore protects every game we ship regardless of engine. Verified
that no current Ellaz game is exposed — snake's accumulator steps at a *game speed* (~120
ms) far slower than any refresh rate, and its grid movement is meant to be discrete. The
trap is waiting for the first continuous-motion game.

---

## Method lessons

1. **Construct validity beats measurement rigor.** Cross-language checksums, 294
   measurement rows, three viewports, variance gates, equal-work probes and negative
   controls — every one of them guarded against *measurement error*, and not one guarded
   against *measuring the wrong quantity*.
2. **Run the harness where the user is.** A benchmark environment chosen for
   reproducibility (headless, fixed 60 Hz, small backbuffer, scripted input) is chosen for
   exactly the properties that hide environment-dependent faults.
3. **Benchmark the integration, not the component.** Rank what you would ship, including
   the code you would have to write yourself.
4. **One sentence from the real environment outbid 294 rows from a synthetic one.** Not an
   argument against measuring — an argument about *where*.
5. **Blind the retest before you trust a repeat.** The second ranking agreed with the first
   at both ends, which is only evidence because the judge could not see the labels. Had it
   been unblinded, the agreement would have been worth nothing.
6. **A mechanism read off the call site is a guess.** "Excalibur drives its own tick" came
   from seeing `scene.on("postupdate")` in *our* code and never opening the engine's clock.
   The explanation was plausible, published in three places, and false. When the claim is
   about what a dependency does, read the dependency.

---

**See also**: [`ROUND2-VERDICT.md`](ROUND2-VERDICT.md) · [`ROUND2-CORRECTION.md`](ROUND2-CORRECTION.md) ·
[`ROUND3-VERDICT.md`](ROUND3-VERDICT.md) · [`README.md`](README.md)
