# Scaling the First Visit — Measure the Slope, Not the Ceiling

**Status**: steps 1 and 2 SHIPPED 2026-08-13; step 3 LANDED 2026-08-21 and is
NOT what this document called it; steps 4 and 5 SHIPPED 2026-08-26, and step 5
is the thing the last section of this file used to call a rewrite. **The O(1)
target is MET** - 29.0 B per game at 42 games, against the 40 asked for here -
and the ceiling is 56,000 rather than 91,600 because half the first visit was a
rendering library. What is left is written down at the bottom rather than left
to be re-derived.
**Measured on**: the working tree at 25 games for steps 1-3, at 38 and then 42
for steps 4-5; two build arms from one source every time.

## What shipped, and the number that came back different

`npm run assert:slope` (`scripts/assert-slope.mjs`) is now the gate, wired into
`build:check`, and it is what produced every figure in this section.

```
                     slope        shell chunk    index.html    first visit
before  (one art map)  294.6 B/game   265.5 B/game   29.1 B/game   89,164 B gz
after   (art split)    120.8 B/game    91.2 B/game   29.5 B/game   87,644 B gz
```

**The prediction below — 192 → ~29 — was wrong on both ends, and for one reason
worth keeping.** Its arm B cut the roster and stubbed the art but left the
`catalog.ts` LOADER in place. `manualChunks` pins every game's `meta.ts` to the
shell chunk, and the loader keeps it reachable, so arm B was still paying for the
metadata of the games it had "removed". That term cancelled out of the
subtraction and never appeared in the answer. **Cutting a game means cutting its
roster entry, its loader AND its art**; two of the three measures something, just
not what it says.

So the residual **120.8 B is not art** — the art term is gone. It is the DOM-free
`meta.ts` the static roster carries so the home grid can render without any game
code (~91 B), plus the emitted home document's link row (~29 B). Confirmed on the
artifact: a lazy-half game's Hebrew title is in `shell-*.js` and not in
`art-rest-*.js`. Nothing in step 1 can move the metadata; **step 3 is what does**,
and it is now the only thing standing between this repo and the rule.

The gate therefore carries two numbers. `PER_GAME_BUDGET = 140` is ENFORCED — the
line the architecture can actually hold, and not a rubber stamp, since putting the
art back in the shell measures 294.6. `O1_TARGET = 40` is REPORTED every run,
never enforced, because a gate that reds on day one for something nobody can fix
that day teaches its reader to ignore it — the same argument `assert-crawlable.mjs`
makes for its content floor. When the metadata term goes, the enforced number
drops to the target in that commit.

Both directions are proven rather than assumed. Planting a fat scene in the shell
for each of the eight games arm B removes (`assert-slope.mjs --control`) reds the
gate at **989 B/game, naming `shell.js`**; without it the gate is green at 120.8.

**Where the split landed.** `src/ui/gameArt.ts` keeps the first
`SHELL_ART_COUNT = 16` games of the roster; `src/ui/gameArtRest.ts` is the rest, a
lazy `art-rest-*.js` chunk (2.05 KB gz), excluded from the precache and fetched on
browser idle. 16 is a measurement, not a round number — driven in a real browser
against a production build with a fresh profile, which is the worst case since a
returning player's keep-playing row pushes the grid further down:

| viewport | columns | cards starting above the fold | fully visible |
|---|---|---|---|
| 390 x 844 phone | 3 | 6 | 3 |
| 1280 x 800 desktop | 8 | 16 | 8 |

16 is the largest number anyone was measured to reach without scrolling, so
nothing visible on first paint waits for a request. Erring large costs 163 B gz
per extra scene ONCE and nothing per game after: the slope is set by which side a
NEW game lands on, and a new game is appended to the roster, so it is always lazy.

Verified in a browser on the built artifact, with the opposite reading forced
rather than merely observed: blocking `art-rest-*.js` leaves **16 cards drawn and
9 showing their emoji** — never an empty box — and allowing it gives **25 drawn**
with the chunk fetched over the network (2,349 B transferred). The 9 are exactly
the lazy half. Emitted game pages still colour their header from the game's own
ground (`/games/merge/` is `#FF8A3D`, not the fallback indigo), because the shell
keeps each lazy game's ground beside its id — `artGround` answering one indigo for
ten games would be a plausible picture with no error anywhere.

## The finding

`scripts/assert-payload.mjs` enforces a fixed ceiling on the first visit. That is
the wrong instrument for a catalogue that is meant to grow, and it fails in a
specific way: it measures the **intercept** and is silent about the **slope**.
Every individual game passes. The hundredth game is what fails, and by then the
architecture that caused it is a year old.

Measured by building two arms from one tree — 25 games with real art, versus 6
games with the other 19 stubbed to a single dot:

```
25 games, real art     88,737 B gz
 6 games, 19 stubbed   85,082 B gz
                       ------
delta                   3,655 B over 19 games
SLOPE                     192 B gz per game

  the shell chunk    34,658 -> 37,754   (+3,096)   the card art
  index.html          2,195 ->  2,754     (+559)   the home document's links
```

Projected, holding everything else equal:

| catalogue | first visit | note |
|---|---|---|
| 25 | 89 KB | today |
| 100 | 101 KB | already past the current 90,000 ceiling |
| 250 | 132 KB | |
| 1000 | 270 KB | three times today's site, before a child taps anything |

**Two prior numbers in `CLAUDE.md` were wrong and are corrected by this.** It has
claimed ~300 B per game since Falling Blocks, and I raised that to ~750 B earlier
today on the strength of Colour Sort and Merge. Both were measured across windows
that contained other changes. 192 B is the isolated figure, and the method — two
arms, one tree, one variable — is the part worth keeping.

## Where the 192 comes from

**163 B is the card art, and it is unconditional.** `src/ui/gameArt.ts` is a
single object literal, so every scene is reachable and every scene ships. Cutting
a game out of the roster does not remove its art: measured, dropping 19 games
from `games.ts` alone saved **24 B each**, because the metadata gzips almost to
nothing beside its neighbours and the art never left.

That is the whole problem in one sentence: **the home grid pays for every card in
the catalogue, on a screen that shows about eight of them.**

**29 B is the game's link in the emitted home document.** That one is
load-bearing and should not be optimised away — it is the fix that made `/`
visible to answer engines (`.claude/rules/a-spa-shell-is-invisible-to-ai-crawlers.md`).
It is also HTML rather than JavaScript, so it costs bytes and not parse time. At
1000 games it is ~29 KB, which is the point at which the home page wants
categories or pagination for humans anyway, and the crawler answer becomes a
category index rather than one flat list.

## The rule to adopt

> **The first visit must be O(1) in the size of the catalogue.**
>
> A new game may cost the first visit its row in the emitted document and nothing
> else. Anything a child cannot see before scrolling is not a first-visit cost.

That is checkable, unlike a ceiling. It also states the thing we actually care
about, which is that the site does not get slower as it gets better.

## Three steps, smallest first

### Step 1 — split the art. SHIPPED 2026-08-13.

Keep the scenes for the cards above the fold in the shell; move the rest into a
lazy `art-rest` chunk, fetched on browser idle or on first scroll. The grid draws
a coloured placeholder for anything not yet arrived, which is exactly what it
already does for a game with no scene.

This repo has done this three times and documents the trap: it is **three**
changes, not one — the dynamic import, a **named** `manualChunks` branch, and a
matching `globIgnores` entry. Skipping the third leaves the payload unmoved
behind a green build (`.claude/rules/precache-glob-sweeps-new-chunks.md`).

Effect: slope falls from 192 B to ~29 B, and the shell stops growing entirely
past the first screen. At 1000 games the first visit is ~114 KB instead of 270,
and all of the remainder is HTML.

**As measured: 294.6 → 120.8 B/game.** The art half of that prediction held —
the shell chunk went 265.5 → 91.2 B/game — and the ~29 that was supposed to be
all that remained is only the document row. See the section at the top for the
metadata term neither arm of the original measurement could see.

**Pick the split by what is on screen, not by a count.** Eight cards is a phone;
a tablet in landscape shows more. Erring large costs a few hundred bytes; erring
small costs a visible pop-in on the first paint.

### Step 2 — replace the ceiling with a slope gate. SHIPPED 2026-08-13.

A test that builds two arms and fails if the per-game cost exceeds a small
budget:

```
build arm A: the catalogue as it is
build arm B: the catalogue minus N games, art included
assert (A - B) / N <= PER_GAME_BUDGET
```

`PER_GAME_BUDGET` starts at ~40 B — the document row plus headroom — and the
ceiling stays as a second, coarser guard so a non-catalogue regression still gets
caught. The two answer different questions and both are worth keeping.

The cost is honest: two builds, so it belongs in `build:check` on CI rather than
in the unit suite. And it needs the same discipline as every other gate here — a
**negative control** that plants a fat scene and confirms the gate reds, or it is
a gate nobody has watched fail.

**The instrument trap, written down because it caught me twice in one hour:** a
build arm whose errors are swallowed (`>/dev/null 2>&1`) produces no `dist/` and
reads as a successful measurement of nothing. Both arms must assert they emitted
an `index.html` before either number is believed.

As built, `scripts/assert-slope.mjs` also:

- builds **both arms from one throwaway copy** under the system temp dir with
  `node_modules` symlinked back, because a peer session building into `dist/`
  would wipe an arm mid-assert, and mutating tracked files to measure them leaves
  a tree nobody can explain when the run is killed;
- **asserts every mutation landed** — the roster shrank by exactly N, N loaders
  went, and a scene was found and cut for every removed id — before either number
  is believed, since a cut that silently did not apply makes the two arms equal
  and reports "safe to ship";
- measures each arm through the **exported `firstVisit()` in
  `assert-payload.mjs`**, so the ceiling gate and the slope gate cannot disagree
  about what a first visit is;
- removes the **last** N games rather than a random N: a new game is appended, so
  the tail is the marginal game the budget is about.

### Step 3 — the roster metadata, not the art. LANDED 2026-08-21.

**The title of this section was wrong for as long as it existed, and the
correction is the useful part.** Step 1 had already removed the art term — the
shell chunk went 265.5 → 91.2 B per game — so by the time step 3 was reached,
"art as data" described work that was already done. The whole of the remaining
slope above the document row was the DOM-free `meta.ts` that `src/portal/games.ts`
imports **statically** for every game, so the home grid can render without
pulling any game code.

**Pruning the fields was measured and rejected first.** Deleting each field's
occurrences from the served shell chunk and re-compressing:

```
  title 28.5   emoji 7.6   color 5.5   category 5.1   scoreUnit 1.3
  orientation 1.3   ageBand 1.2   renderer 1.1   ownsChrome 0.7   B gz per game
```

The five the home grid never reads come to **181 B gz = 5.5 B per game**. The
headroom was 84 B and a game cost ~122, so pruning does not buy even one game
and cannot be the fix. Saying that with a number is the outcome, not a failure.

**What landed instead: the catalogue arrives in two beats.** `shellRoster.ts`
carries 33 ids and the 15 metas the grid needs above the fold; `gamesRest.ts`
carries the other 18 and is fetched on browser idle beside the art it already
waits for. **Slope 122.1 → 70.1 B per game; first visit 90,484 → 89,985.**

**40 is still not reached, and the arithmetic says why.** The document row is
~29.5 B per game and is load-bearing — it is what made `/` visible to answer
engines. That leaves ~10 B of shell budget per game against ~52 B of named
fields plus ~39 B of id and object overhead. So the only route to the target is
the one this section always described in its second paragraph: **the shell stops
carrying a record per game at all** — the grid virtualised so the DOM holds a
screenful rather than a catalogue. `assert-slope.mjs` REPORTS that gap on every
run and enforces 140, per
[`a-gate-that-reds-on-day-one-teaches-you-to-ignore-it.md`](../.claude/rules/a-gate-that-reds-on-day-one-teaches-you-to-ignore-it.md).

**A budget was deliberately NOT lowered to 70.** A budget set at today's reading
leaves no room for the next honest cut, and 70.1 is not 40.

### Step 4 — the LOADERS, which this file had called free. SHIPPED 2026-08-26.

The paragraph above is right about the remaining terms and wrong about one of
them being small. `catalog.ts` held a lazy loader for every game **in the shell**,
and `loaderFor`'s own comment said so and then said it was not free — 431 B gz
in chunk names alone and 649 in the expressions around them, measured, with the
comment ending "do not restore a claim about this without a number".

They split at the same fold the metadata already splits at: 15 stay, the other
23 live in `gamesRest.ts` beside their metas and arrive in the same `meta-rest`
chunk. Nothing needs them earlier — `findEntry` and `dailyRotation` read
`ROSTER_IDS`, and `entryFor`, the only path that MOUNTS a game, already awaited
`ensureFullCatalog()`. So it costs no extra request.

**Slope 69.9 → 32.5 B per game; first visit 91,319 → 90,519 B gz.** Two arms,
one tree, one variable, 38 games, local Node 24.

**That is under the 40 this document has been asking for since it was written,**
so `PER_GAME_BUDGET` came down 140 → 45 in the same commit. 45 and not 40
because the slope is a gzip subtraction over 8 games and the ~54 B spread this
repo has measured between CI's Node 22 and a local Node 24 is ~6.8 B per game if
it lands on one arm alone. Both regressions still red: the loaders back is 69.9,
the card art back in the shell is 894.3.

At 42 games the same gate reads **29.0 B per game**.

### Step 5 — the thing this file said was a rewrite. SHIPPED 2026-08-26.

See "What this does not fix" below, which was true when written and is not any
more. `react` and `react-dom` are aliased onto `preact/compat` in
`resolve.alias`, the reconciler went **45,374 → 7,936 B gz**, and a first visit
went **90,519 → 52,956**. `CEILING` came down 91,600 → 56,000 — the only entry
in that comment block that is a cut rather than a raise.

It was a two-line config change and a browser probe, not a rewrite, because
`preact/compat` carries the whole API surface this app uses. What it needed was
EVIDENCE rather than engineering: nothing in the 3,944-test suite renders a
component (`vitest.config.ts` has its own resolve block, its environment is
`node`, its include is `*.test.ts`), and the two ways it breaks do not throw.
`scripts/repro/repro-preact-swap.mjs` is what answers: 42 of 42 games mount in a
real browser, both lazy-arrival controls fire, and the home, the room and the
boards render byte-identical to the React arm at 390x844.

**And the probe was wrong twice before it was right.** Its first card-art
counter read 1 of 39 and its node floor called three canvas games broken.
Running it against the REACT build reported the identical three failures — which
is the only reason the probe was corrected instead of Preact being blamed.

### A different budget entirely — the content pages (2026-08-22)

`DOCUMENT_CSS` is emitted into the 164 documents and **never enters the shell**,
so `assert-payload` cannot see it in either direction. It was 62.9% comments —
17,538 of 27,900 raw bytes — because it is a template literal Vite never
minifies, unlike `global.css`. Stripping them at emit time took **one game page
from 17,476 to 10,212 B gz (−41.6%)** and the whole 165-document set from 2.79 MB
to 1.59 MB, with the first visit unmoved.

Do not count that toward the ceiling above. It is a real saving for a reader who
opened a game page and zero for a child choosing one.

## What this does not fix

~~Half the first visit is React (45,374 B gz), which no amount of catalogue work
touches. If the first visit ever needs to be dramatically smaller, that is the
conversation — and it is a rewrite, not an optimisation.~~

**Struck 2026-08-26, and left visible rather than deleted.** It was true of the
tree it was written on and it was wrong about the price: the fix was two alias
lines and an afternoon of measurement, not a rewrite. See step 5 above. The
transferable half is that "that is a rewrite" was an estimate wearing a
finding's clothes, in a document whose whole subject is not doing that.

What genuinely remains:

- **The shell still carries a record per game** — `ROSTER_IDS` plus
  `ROSTER_CATEGORY`, about 7 B, and the emitted document's `<li><a>` at 29.5.
  Removing the first means virtualising the grid, which is a visible UX change.
  The second has a switch already: `MAX_FLAT_HOME_LINKS` in `sitePages.ts` makes
  the emitted `/` link CATEGORY pages instead of every game once the roster
  passes 60, and links every game whose category has no page of its own so
  nothing becomes unreachable. It is deliberately set above today's roster.
- **`build:check` builds three times**, because `assert-slope` needs two more
  arms and each renders the full share-card set.
- **The share cards rasterise serially**, and the comment justifying that was
  written at 48 cards. There are 200.
