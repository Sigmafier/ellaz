# The Juice Lab — judging how the app FEELS

> **THE LAB IS GONE — this is a past-tense record.** It was a dev-only
> tournament at `#/lab` for choosing sounds and effects by ear rather than by
> argument, and it always carried a kill date: the winners land, `src/juice/lab/`
> is deleted in the same commit. That happened on **2026-08-08** in `ae4df64`.
> `npm run dev` no longer has a `#/lab`; the hash now parses to the home grid
> like any other unrecognised one.
>
> Kept because the *methodology* is reusable — the blind protocols, the ethical
> line it declined to cross, and the damping law that made the sounds stop
> reading as synthetic — and because a verdict is worthless if the record of how
> it was reached disappears with the harness. **What shipped and what it cost:**
> [`build-log.md`](build-log.md) § The six voices.

---

## Why it exists, and what it deliberately refuses

The ask was to make the app "more rewarding" and "addictive". That splits into
two halves, and only one of them is safe to build.

**Feel** — the sound of a tap, the shape of a win, whether a streak climbs, how
a coin lands. All upside. A game that feels good to touch is simply better made.
This is what the lab exists to tune.

**Reward schedules** — variable-ratio payouts, near-miss animations,
loss-framed streaks ("don't break your 6-day run!"), punitive daily-login
mechanics. These reliably increase engagement, and they work by manufacturing
compulsion rather than enjoyment. **The audience here is five years old.** Not
built, and the refusal is the design, not an oversight.

The economy already sits on the right side of that line and should stay there:
games report reasons rather than amounts, the wallet is add-only with no
`spend()` a game can reach, stars are never spent or lost, and the shop is
purely cosmetic. See [`rewards-economy-convention.md`](../.claude/rules/rewards-economy-convention.md).

## Nothing here reaches a player

**This section was wrong once, and it shipped.** Read the failure first, because
it is the reason the checks are shaped the way they are.

### The bug this section used to hide

Four guarantees were claimed and three of them were true:

1. **The route branch is dev-gated.** `App.tsx` wraps the whole `#/lab` branch in
   `import.meta.env.DEV`, which Rollup evaluates to `false` and drops. In
   production `#/lab` falls through to the games grid — the right answer for a
   stale bookmark anyway. ✅ true
2. **The chunk is carved out.** `vite.config.ts` assigns `/src/juice/lab/` to a
   `lab` chunk *before* the shared-code rule, which would otherwise pin it to
   the shell. ✅ true
3. **The PWA precache excludes it** via `"**/lab-*.js"` in `globIgnores`. ✅ true
4. **Therefore no player downloads it.** ❌ **false.**

A module-scope `lazy(() => import("@juice/lab/JuiceLab"))` keeps the lab in the
production module graph even when every branch that renders it is dropped. Vite
then writes a `<link rel="modulepreload">` for the chunk into `index.html`, and
the browser fetches it eagerly on first paint — service worker or not. Every
child downloaded ~27 KB gzipped of tournament scaffolding. It was live on
ellaz.fun until the fix.

The fix is the `import.meta.env.DEV &&` guard *at the import site*, so the
ternary folds to `null` and the dynamic import disappears with it. Do not tidy
it away as redundant with the route check — it is not.

### Why the old checks passed

```bash
grep -c '#/lab' dist/assets/shell-*.js      # 0  — true, and irrelevant
grep -o 'lab-[A-Za-z0-9_-]*\.js' dist/sw.js # none — true, and irrelevant
```

Both were correct. Neither looked at `index.html`, which is where the bug was.
**There are two independent delivery paths and these checked only one.** A
check whose scope excludes the claim it is quoted for reports green while
lying.

### What to actually run

```bash
npm run build:check     # build + scripts/assert-first-visit.mjs
```

That gate asserts a first visit downloads only shell assets, across **both**
paths — `index.html` (script tags and modulepreloads) and the workbox precache
manifest in `sw.js`. It is an allowlist, not a denylist, because a denylist can
only forbid the chunks somebody already thought of. By hand:

```bash
grep -c 'lab-' dist/index.html   # must be 0
ls dist/assets/lab-*.js          # must not exist at all
```

## The three questions it asks

They are genuinely different, and mixing them up is what made the first version
of this page unreadable.

| Section | Question | How you answer |
|---|---|---|
| Shell demo | Does this feel good? | Nothing to rank — just play |
| Six rounds | How MUCH? | Rank three blind pads 🥇🥈🥉 |
| Palette (45) | Which SOUND? | Audition freely, pick a favourite |

**Every round and every palette event includes today's behaviour as an
unlabelled arm.** That is what lets the lab say "the thing you already have is
right" — and it has, twice. See the verdict below.

**Blind by construction.** Pads are shuffled from a session seed persisted in
`localStorage`, so a refresh mid-judging cannot silently re-point half-finished
rankings at different arms. Nothing reveals its identity until you commit a
ranking. A labelled test makes you pick what you expect to like.

**Loudness is level-matched.** Every voice is rendered offline purely to measure
its peak, then trimmed to a common target. Without this the loudest arm simply
wins, and the tournament measures gain rather than character.

## The sounds: 45 characters, 0 KB, no trade dress

Everything is synthesised at runtime from physics. No samples, no downloads, no
network, and nothing imitating any product's actual assets.

Struck bodies use real modal ratios — glass `1 : 2.71 : 5.15`, bell
`1 : 2.76 : 5.4`, marimba bar `1 : 3.9`, tine `1 : 2.0 : 3.01` — plus wood and
soft mallet.

**The single thing that made these stop sounding cheap** is the damping law in
`palette/builders.ts`:

```ts
const life = ms / Math.pow(ratio, damp);   // high partials die FIRST
```

Strike anything real and its bright modes decay first; that is what makes a
struck object sound struck. The first palette gave every partial one shared
envelope, which produces an *organ* tone, and the ear reads that as
"synthesiser" instantly. It was rejected on the first listen. Three other
changes shipped with the fix: a shared convolution room on every voice (a note
with no room has no place), a lower master level (refined UI sound sits *under*
the content), and a warmth shelf (above ~9 kHz, "bright" and "expensive" are
opposites).

Two engines compete on identical specs: **A** builds each note live,
**B** pre-renders it to a buffer. They should be near-identical; a clear winner
would itself be information.

## Tier 1 shell juice

`src/juice/lab/shell.ts` — press depth, ripple, a floating reward number,
entrance cascade, idle nudge.

**The finding that produced it:** `Home.tsx` had zero juice and zero sound. Not
a little — none. The World shakes and bursts, the wallet chip pops and rolls,
every game is full of feel, and the one screen every session starts on was
completely inert. Better tap sounds cannot help a shell that never plays one.

Two design notes worth keeping:

- **Everything attaches from outside, by delegation on a container.** No
  component was edited to receive it. That is why the lab can A/B the *real*
  Home rather than a mock of it, and why shipping this later is one call in the
  portal shell rather than a prop threaded through four components.
- **The entrance cascade's step shrinks as the catalog grows.** A fixed
  per-card delay is a pleasant 0.4 s at ten games and an unbearable 2 s at
  fifty. The cascade always finishes inside `STAGGER_TOTAL_MS`.

Reduced motion is honoured throughout. Hit-stop is skipped *entirely* rather
than shortened — a freeze is not "motion you can turn down", it is a
discontinuity, and for a motion-sensitive player that is the worst kind.

## Verdict (2026-08-02), as corrected on 2026-08-08

| Event | Winner | Spec |
|---|---|---|
| tap | Shutter | `tap-shutter` |
| correct | Harp gliss | `ok-harp` |
| win | Sweep and land | `win-rise` |
| coin | two triangles up a fifth | `LEAN.coin` |
| wrong | soft falling thud | `LEAN.wrong` |
| star | Crystal sparkle | `star-crystal` |

**This table said "**Control**" for coin and wrong, and that was ambiguous
enough to be false.** The paragraph under it read: *"coin and wrong were won,
blind, by the sounds already shipped in `src/sdk/audio.ts` — do not improve
those two without a fresh blind test."* Landing the winners on that basis would
have wired a **320 Hz square** for coin and left a **180 Hz sawtooth** for wrong,
because `brackets.ts` says outright — *"the palette deliberately reuses the LEAN
specs as its control characters"*. Every `*-current` character referenced
`LEAN.*`; none referenced `CONTROL.*`. `coin-current`'s blurb, "what the lab
plays right now", meant the **lab**, not the app. So the control arm was the
lab's own Arm A, a design that had never shipped, and **all six winners are new
voices**. Two of them, coin and star, had no `SfxName` member at all and made no
sound in the app.

**The transferable lesson, and why this table now carries a Spec column: a
verdict recorded as "the control won" is ambiguous unless the record also says
WHAT THE CONTROL WAS.** Record the spec identifier, never the word "control".
`src/sdk/voice.test.ts` pins the correction — `FAIL.freq === 196` with no
sawtooth, `COIN` two triangles a fifth apart with no square — so a future reader
cannot restore the old sounds on a note's authority.

Tap changed from Keyboard click to Shutter on a second listen, in context on the
real Home screen rather than in isolation. Shutter has the strongest personality
in the tap list, so it is the one most likely to wear out by the three hundredth
press. The operator was asked and chose to **ship it and judge it live** rather
than soften it pre-emptively; that judgement is still outstanding.

The six ranking rounds were **never judged** — including the one that would have
decided the coin-flight behaviour, which is why `winMoment` plays one coin per
win rather than one per coin.

## Done, in one pass, on 2026-08-08 (`ae4df64`)

1. ~~Fold the winning voices into `src/sdk/audio.ts`.~~ Done — as
   `src/sdk/voice.ts` (pure data, unit-testable in node) plus
   `voiceEngine.ts` (the only file touching audio nodes). `audio.ts` keeps its
   interface, so all 41 `play()` call sites were untouched.
2. ~~Attach the Tier 1 shell juice in the portal for real.~~ Done — `src/juice/shell.ts`,
   attached to the real `Home`, deliberately **without** `playTap` (Home already
   plays tap through its own handler; passing both fires on `pointerdown` and
   again on `click`).
3. ~~**Delete `src/juice/lab/` in that same commit.**~~ Done — 14 files, same commit.

Step 3 was not optional tidying. Two systems doing one job is how fixes start
drifting between them. See `no-half-migrated-duplicate-systems`.

Two things landed that were not on this list, because the lab's own source
disagreed with the verdict note: **coin and star were wired for the first time**
(no `SfxName` member existed for either), and the level-matching moved out of the
tournament and into the shipped engine — the operator judged every character AT
matched loudness, so shipping them raw would have been a balance nobody heard.

Proposed and not built: **Tier 2** (a beat of anticipation before the win; the
combo ladder, whose maths is already written and unit-tested in `specs.ts` and
currently wired to nothing; tile-expands-into-game transition; a loading beat)
and **Tier 3** (character reaction, star ceremony, a haptic vocabulary). The
"safe meta" layer — shop goal tracker, personal-best banner, welcome-back gift —
is deliberately out of scope.

## Traps this cost us

- **WSL2 emits no inotify events for `/mnt/c`.** Vite's watcher never saw a
  single edit; it kept serving boot-time transforms and returned a cheerful
  `200` for every request, so changes appeared to do nothing. Fixed with
  `server.watch.usePolling`. The failure is nasty because the server looks
  healthy and it reads as "my change didn't work" rather than "the server never
  saw it".
- **Deleting a module leaves a stale reference in Vite's graph.** After
  `palette.ts` was split into `palette/`, the dev server kept serving a
  transform importing the deleted file. Only a restart cleared it. A visible
  error boundary is what surfaced this in one shot instead of a white screen —
  `fallback={null}` had been hiding it as a blank page.
- **Don't conclude anything from a read that was too short.** Twice: a build log
  read before `vite-plugin-pwa` had run "proved" a missing service worker, and a
  4-second `curl` against a cold dev server "proved" it was down. Both were
  wrong, and in the first case a second identical mistake read as confirmation.

## Files

```
src/juice/lab/
├─ specs.ts        pure, DOM-free core - envelopes, pitch maths, win tiers,
│                  easing curves. Everything here is unit-tested.
├─ specs.test.ts   40 tests, incl. structural guards: every character has a
│                  room, no partial outlives its fundamental
├─ engines.ts      the two competing engines + level matching + shared reverb
├─ voices.ts       transcriptions of the LEAN engine's voices. Read as
│                  "today's shipped sounds" for months; they were not.
├─ palette/        45 characters across six events (builders, tap, feedback,
│                  reward)
├─ brackets.ts     six blind rounds, arm 0 always the control - and it says
│                  outright that the control characters ARE the LEAN specs
├─ visuals.ts      squash, hit-stop, ripple, tiered celebration, rich coin flight
├─ shell.ts        Tier 1 - the portal effects, attached by delegation
├─ ShellLab.tsx    renders the REAL Home with the effects on/off
└─ JuiceLab.tsx    the tournament surface + guided mode
```
