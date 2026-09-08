# Boot-time layout shift - the room, and the home page

<!-- Extracted VERBATIM from CLAUDE.md on 2026-08-29, when CLAUDE.md was 164,867 chars
     and over Claude Code's 150,000-char per-file limit. Nothing was reworded; the text
     below is byte-identical to what CLAUDE.md held at commit bb8c47b, and
     `npm run assert:context` proves it. CLAUDE.md now points here instead of
     carrying this on every single turn of every session. -->

## The room's boot-time layout shift

**`/world/` on a phone read CLS 0.297 - POOR, and the worst page on the site by
two orders of magnitude** *of the eight that had been measured*. Every game page
reads 0.003 to 0.010, the boards 0.028, the room on a desktop 0.044. The plan had
this recorded as a defect on the GAME page; measured across 8 pages x 2
viewports, it never was. **`/` was not one of those eight and is far worse - see
the section below.**

An EMPTY content-sized `#game-frame` centred in a 740px box sits at y=474; the
1297px scene mounts and it snaps to y=104. **`body[data-page="world"]
#game-frame:empty{min-height:100%}`** reserves the box only while the frame is
empty, so the finished layout is unchanged - measured identical to the control at
both viewports, three interleaved runs, 0.2713 -> 0.0032.

**That fix REGRESSED under preact and the regression is live (2026-08-26, OPEN).**
The room's own probe, one tree with only the alias reverted, positive control
firing on both arms:

```
  /world/   preact build   0.3164  0.3307  0.3307    median 0.3307   POOR
  /world/   react  build   0.0264  0.0066  0.0064    median 0.0066   good
  live      ellaz.fun      0.0064  0.3164  0.0064  <- about one load in three
```

**And the probe's own verdict cannot see it**: it reports the MEDIAN of three
runs, so a defect on one load in three reads as `OK`. Read the per-run column,
not the median, until that is changed.

The mechanism is narrowed and not settled - `:empty` releases its reservation the
moment the frame stops being empty, and under `preact/compat`'s synchronous
commit that is a frame before the scene's content has a size, which is the SAME
class as the `/` hand-off below. Two quick attempts were inconclusive (an
unconditional `min-height` read 0.006 once and 0.316 twice; a runtime-injected
variant perturbs the timing being measured) and were stopped rather than shipped
- `debugging/no-band-aids.md`, two failures means trace, not patch.

`flex-start` on the room (the game pages' own fix) moves the desktop room y=120
-> y=260 and breaks the centring `layout.ts` defends on purpose. An unscoped
`min-height` moved the finished height 4px in one run of three. Both measured,
both rejected.

**Its probe was blind first.** A 400px control planted before the `h1` read
0.0084, identical to the unplanted arm, and reported the whole site healthy - the
stage fills the viewport, so the `h1` is below the fold and CLS rightly ignores
it. Planted at the top of the body it reads 0.3593. Re-measure with
`scripts/repro/repro-room-boot-shift.mjs`, which exits 1 if its own control
cannot see a planted shift.

## The home page's boot flash, and the CLS nobody had measured

**Load `/` and a plain bulleted document appears for a moment before the app.**
That document is not a bug: `#home-doc` is the emitted home page that exists
because no AI crawler runs JavaScript and `/` is the site's canonical entry
(see the section on the SPA shell). `main.tsx` removes it once React mounts. It
is what a no-JavaScript visitor keeps, and the app is what everyone else gets.

**What it costs, measured 2026-08-26 at 390x844, one tree, one variable:**

```
                        the document is    CLS on /   of which the
                        on screen for                 document/app hand-off
  react (before)         2534 ms            0.685          0.000
  preact (shipped)        504 ms            1.709          1.000     <- regression
  preact + one CSS rule   504 ms            0.685          0.000
```

Two separate things, and only one of them is the flash.

**The flash itself is five times shorter than it was**, because the swap cut the
work between the stylesheet landing and the app committing. It is not gone, and
removing it entirely is an open question - hiding the document when JavaScript
is present trades half a second of readable page for half a second of blank one,
which is not obviously better and has not been put to anyone.

**The CLS 1.000 was a regression the swap introduced, and it is fixed.** The
removal runs on the next animation frame, which was right while React 18
committed asynchronously and is a frame too late under `preact/compat`, whose
`render()` returns with the DOM already committed - so one painted frame carries
the whole app laid out underneath the whole document. Closed in `global.css` by
`body.app-shell:has(#root:not(:empty)) #home-doc{display:none}`, the exact
complement of the `#root:empty` rule above it. **CSS rather than moving the
removal earlier**, because a rule fires on the same style recalculation under
either runtime and so cannot be wrong about when one committed.

**The remaining 0.685 is older than the swap and is NOT fixed.** About 800 ms
after mount the lazy roster lands, the daily card appears above the category
rail, and 100px of page moves down. It is on both runtimes. The fix is the
room's - reserve the slot's height while it is empty - and it has not been done.

`scripts/repro/repro-home-boot-shift.mjs` gates the hand-off and REPORTS the
rest. **Its control had to be a second BUILD**: injecting `display:block
!important` at runtime to put the old behaviour back reads 0.689 - healthy - on
the very build that measures 1.709 without the rule, because a stylesheet added
after the navigation commits does not reproduce one that was never there. A
control that cannot fail was reporting FAIL on a correct page, which is the worst
of both. Pass `--control-base` at a build whose `global.css` lacks the rule; with
no control base the run says so out loud rather than pretending.

---

## The desktop CLS 0.2 - measured, attributed and closed (2026-09-07)

PageSpeed reported **CLS 0.200 on desktop and 0.000 on mobile** for `/` in the
same session, attributing the desktop shift to the 42-tile game grid
(`<div style="display: grid">`).

**The grid is almost certainly not the cause.** `Home.tsx` already draws an
`aspect-ratio: 1/1` placeholder for every roster id not yet in the catalogue, so
the grid's own height is right from the first React paint. What a layout shift is
charged to is the element that MOVED, not the element that caused it — and above
the grid sit `WorldHero`, `DailyCard` and the `recent.length > 0` keep-playing
rail, the last two of which appear after an async profile read. That matches what
this file already recorded as open: the lazy roster landing ~800 ms after mount
and pushing ~100 px down.

**It was not re-measured, and the reason is worth writing down.** Two instruments
were tried and both refused to produce a trustworthy number:

- **The PageSpeed API** returned `429 RESOURCE_EXHAUSTED` — the keyless quota is
  shared across every anonymous caller and was spent for the day.
- **A browser tab driven from the agent harness reports `visibilityState:
  "hidden"`.** Chrome does not paint a background tab, so `getEntriesByType("paint")`
  is empty, LCP never fires, and no layout shift is ever recorded. The tab
  returned **CLS 0 with zero shifts, twice**, on a page that had just been
  measured at 0.200 by Lighthouse.

That second one is the dangerous instrument, and it is the reason this section
exists rather than a claim that the CLS was fixed. A hidden tab does not error,
does not warn, and returns exactly the number you were hoping for. The only
defence is a control that asserts the measurement was possible at all — here,
printing `visibilityState` and the paint entries beside every reading, and
treating an empty paint list as "no measurement" rather than "no shifts".
See [`.claude/rules/a-diagnostic-that-truncates-what-it-compares.md`](../.claude/rules/a-diagnostic-that-truncates-what-it-compares.md).

**What is genuinely known after the font work:** a real (foreground) load makes
zero requests to `googleapis` or `gstatic`, and fetches both woff2 at 224 ms and
258 ms in parallel with the shell. Since the fonts now arrive before first paint
rather than five hops later, a font-swap contribution to CLS should be gone — but
"should be" is the whole problem this file keeps recording, so it is written as a
hypothesis.

### The measurement, later the same day

The harness is `scripts/repro/repro-home-cls-attribution.mjs` - Lighthouse's own
two device profiles, arms **interleaved** (desktop/mobile/desktop/mobile, because
non-interleaved arms measure the arm order as much as the arm), and per-element
attribution summed across runs rather than one number.

**It now refuses to report anything until it has proved it can see.** Before the
real arms it plants a 300px block at the top of the page a second after load and
requires each arm to detect it, printing `visibility` and the paint count beside
the verdict. That is the direct answer to the hidden tab above: an arm that cannot
see a 300px block landing is an arm whose 0.0000 means *no measurement*, and it
aborts with exit 2 instead of printing a healthy-looking table.

It needs `playwright`, which is deliberately **not** a dependency of this repo.
Copy it into a tree that has one and run it from there; a bare `NODE_PATH` does
not work, because ESM ignores it.

**The operator's own Chrome was tried first and reported the hidden tab again** -
`visibilityState: "hidden"`, zero paint entries, CLS 0 with zero shifts, on the
page Lighthouse had just measured at 0.200. The control caught it, and the run was
thrown away rather than believed. Playwright is the fallback, and this is it being
used as one.

### What was actually moving - two things, not one

A second probe printed the y-offset of every direct child of the home column at
intervals. It named the first cause in one read:

```
  t=400ms   224  div.ellaz-rail   the category rail
            304  div              the 42-tile grid
  t=800ms   224  a                🔥 Today's puzzle          <- arrives here
            324  div.ellaz-rail   the category rail, 100px down
            404  div              the grid, 100px down
```

**Cause 1 - the daily card had no box.** `todaysGame()` needs the game's METADATA,
which is in the lazy catalogue, so `DailyCard` returned `null` on the first paint
and appeared about half a second later. Everything below it moved 100px.

**Cause 2 - the grid re-ordered itself.** This one is invisible in the trace above,
because the grid's HEIGHT was always right: the shell has carried one slot per
roster id since 2026-08-21 for exactly that reason. What it did not have was one
slot per id *in the right place*. It drew all the pending placeholders first and
the arrived cards after them, so as the catalogue landed each card jumped from the
tail of the grid to its position in catalogue order. Forty-two tiles moving, with
the page height unchanged and nothing about it looking wrong.

### The fixes, and the numbers

Both are the same shape, and it is the shape this file already recommends: hold the
slot from the first paint, keyed on something the shell knows synchronously.

- `dailyGameId()` is pure and reads `ROSTER_IDS`, so WHETHER there is a card today
  is known immediately even though its title and art are not. When the metadata is
  missing the card renders as its own 88px box - `aria-hidden`, unlabelled, and a
  `div` rather than an anchor, because an anchor with no accessible name is an
  accessibility failure and because nothing on it invites a tap.
- The grid maps over `ROSTER_IDS`, one slot per id, each slot either the card or
  the placeholder. `roster-split.test.ts` asserts `ROSTER_IDS` equals
  `GAMES.map(m => m.id)` element for element, so that order IS catalogue order.
- The keep-playing rail got the same treatment. `recentlyPlayed()` is a synchronous
  profile read, so the COUNT is settled before the catalogue lands; the slice now
  happens before the lookup, so the rail cannot grow from one card to four.

```
                        desktop            mobile
  live, before          0.2000             0.7134
  + daily card's box    0.0877             0.4575
  + grid holds order    0.0000             0.0017
                        ^ three interleaved runs per arm, control firing on each
```

Desktop matches what PageSpeed measured (0.200) to four decimal places, which is
the only reason to believe the harness at all.

**It is also a visible improvement, not only a metric.** At 300ms on a phone the
old page showed the category rail 200px too high over a completely blank grid -
the placeholders are transparent, and the fifteen games the shell already has were
below the fold behind twenty-seven of them. The new page shows nine playable games
in their final positions.

### What proves the app still works

`scripts/repro/e2e-shell-walkthrough.mjs` - the first thing in this repo that
DRIVES the site rather than reading its bytes. Eighteen checks: the grid fills,
no placeholder survives, every link has an accessible name, a category chip
filters to a non-empty grid and the All chip restores it, the daily card links to
a real game, a tile opens a game that mounts, the keep-playing rail comes back for
a seeded returning player with a slot count that never changes, Hebrew is RTL, and
the room draws.

**It has a control, and the control is the point.** `--control` blocks the
`meta-rest` chunk so the catalogue never lands; the script then requires exactly
five named checks to fail and every other one to pass, and reds if the set is
wrong in either direction. A run where nothing fails is a blind harness and a run
where everything fails is a broken one.

### Verified on the live site after the deploy (2026-09-07)

The same harness, same controls, against `https://ellaz.fun/` once the deploy
finished and its own `assert-live` step had passed:

```
CONTROL desktop  visibility=visible  paints=2  planted-shift 0.2223 -> SEEN
CONTROL mobile   visibility=visible  paints=2  planted-shift 0.3572 -> SEEN

DESKTOP  0.0005  0.0000  0.0005   median 0.0005   (was 0.2000)
MOBILE   0.0304  0.0308  0.0000   median 0.0304   (was 0.7134)
```

`e2e-shell-walkthrough.mjs` against the live site: **18/18**. `assert:fast`
across three page shapes: green.

**What the residual is, and why it is being left.** Every remaining shift on
mobile is the consent bar. It is `position: fixed` and starts `display: none`,
so it pushes nothing - what moves is the BAR ITSELF, because its text reflows by
a line when Heebo swaps in and a fixed bar anchored to the bottom grows upward.
0.0304 is a third of the "good" threshold, PageSpeed's own mobile run scored
this page CLS 0 before any of this work, and the only levers on it are the
consent copy and the font swap. Recorded rather than chased.

### The two findings from that measurement, and what the first one really was

**The English pages downloaded Heebo's Hebrew subset - 12,000 B - and the reason
written down the first time was wrong.**

The note said the cost came from the emitted footer's language link, `<a href="/he/"
hreflang="he" lang="he">עברית</a>`, and prescribed a system font for it. The byte
figure was right. The cause was not, and the fix it prescribed moves nothing on its
own.

```
CLAIMED                            MEASURED, in Chrome, with a control
-------                            -----------------------------------
"the boot document's language      /                  no hebrew woff2 at all
 links, which main.tsx removes"    /games/memory/     heebo-hebrew 12,000 B

                                   then the control: the SAME page with every
                                   codepoint in U+0590-05FF replaced
                                   -> STILL fetches it, initiatorType "css",
                                      at 1244 ms - after the app mounted
```

Google's `hebrew` `@font-face` does not only cover Hebrew. It declares
**`U+200C-2010`**: ZWNJ, ZERO WIDTH JOINER, LRM, RLM. A ZWJ is what holds an emoji
sequence together, and Memory's own footer reads "Two players 🧑‍🤝‍🧑". So the browser
needed a face for one invisible character, chose the Hebrew one, and pulled 12,000 B
onto pages with no Hebrew letter anywhere in them.

**Both halves shipped**, because the autonym is a second, smaller trigger that the
range fix does not cover:

1. `scripts/fonts/sync-fonts.mjs` drops `U+200C-2010` from the hebrew face. Lossless:
   the LATIN face already declares `U+2000-206F` and every page fetches it, so those
   characters are drawn by the same typeface from a file already on the wire.
2. `src/ui/global.css` gives `html:not([lang="he"]) a[hreflang][lang="he"]` a system
   face, so the visible `עברית` in the footer does not pull the subset either.

And a guard, because the next sync would put the range back: `--check` now asserts the
hebrew face claims nothing in general punctuation, watched failing on Google's
unmodified range and naming the span. **"Declare latin last so it wins" is a theory
this measured to be false** - hebrew is declared first, latin last, and hebrew won.

Three instruments were wrong before one was right, all recorded in
[`a-diagnostic-that-truncates-what-it-compares.md`](../.claude/rules/a-diagnostic-that-truncates-what-it-compares.md):
the production preview registers a service worker and the first three readings were of
a precached document; the "zero Hebrew characters" scan covered one of the font's six
spans; and computed style pointed at a cascade bug that did not exist. The instrument
that settled it measured the DOWNLOAD, not the markup.

**`label-content-name-mismatch`: three of four fixed.** A probe faithful to axe -
accessible name lowercased, visible text stripped of emoji and punctuation and read
with `aria-hidden` subtrees skipped, with a planted mismatch and two near-miss controls
- found four on the home screen:

| element | the name said | the eye read |
|---|---|---|
| the world card | "my world" | "my world coins 3 enter" |
| the daily card | "today's puzzle: two make one" | "todays puzzle two make one play" |
| the Lettercross tile | "lettercross, not played yet" | "beta lettercross" |
| the Tic-Tac-Toe tile | "tic-tac-toe, not played yet" | "tictactoe" |

The first two are now named from their own contents - the `aria-label` was OVERRIDING
the card, so a screen reader lost the coin count and the Play pill as well. The third
puts the beta word at the front of the name, from `betaWord()` so the badge and the
name cannot drift. **The fourth is left**: the name contains the visible words in the
order they are read, and only axe's punctuation stripping makes "Tic-Tac-Toe" and
"tictactoe" differ. There is no name a person would write that satisfies it.


**The measured result, both arms, one build, service worker cleared first:**

```
                              BEFORE            AFTER
/games/memory/  (English)     needs the         does not need it
                              hebrew face       heebo-hebrew: unloaded, no entry
                              (12,000 B)        -12,000 B on a cold first visit
/he/games/memory/ (Hebrew)    4 woff2           4 woff2   unchanged, Hebrew still Heebo
label mismatches on /         4                 1         (Tic-Tac-Toe, above)
```

**Say "needs", not "downloads", and measure it COLD.** A resource-timing entry
exists for a cache hit too, and `encodedBodySize` reports the file's full size
whether or not a byte crossed the wire - so counting entries cannot tell a download
from a replay. Measured 2026-09-08, three arms on the live site:

```
A  fresh tab, cold                    2 entries, hebrew face UNLOADED
B  same tab, arrived from /he/        4 entries, ALL transferSize 0, deliveryType "cache"
C  same tab, SW + caches cleared      2 entries, hebrew face UNLOADED, 0 B over the wire
```

Arm B is the trap: four entries on a page with zero rendered Hebrew, and it reads as
a regression until you print `transferSize`. Nothing was downloaded. The claim that
holds is about what a page NEEDS - and an absent entry in a cold context cannot be a
cache replay, which is why arms A and C are the ones quoted.

A category or print page loads no shell stylesheet and declares no `@font-face` at all
(`/games/kids/` serves zero), so it never could fetch a subset - the pages that pay are
the app shell and the game pages, and the rule lives where both of them read it.

## The unstyled first paint, and the noise floor underneath the score (2026-09-08)

The operator reported two things in one message: PageSpeed at **87** where it had read
99 the night before, and the home page rendering **completely unstyled** for a moment on
load. They are different problems and only one of them is a defect.

### The unstyled paint - proven from the screenshot alone

```
WHAT WAS ON SCREEN                     WHAT THAT MEANS
h1 in a serif face                     body.app-shell{font-family:var(--font)}  not applied
links default blue + underlined        #home-doc a{color:var(--brand-ink,...)}  not applied
no page layout at all                  #home-doc{max-width:44rem;padding:...}   not applied

the consent bar, correctly styled      .consent{...}  IS applied - and it is the one
dark navy, white text, two buttons     block whose CSS ships INLINE (consent.ts)
```

Exactly one element was styled, and it was the only one whose styles were part of the
document. So the external stylesheet had not applied - not a font swap, not a slow
mount. `assets/shell-*.css` was a render-blocking `<link>` in the head, correctly typed
`text/css`, 200, byte-identical to the build: a separate artifact with its own cache
entry, its own version, and its own chance to be absent. This host deletes hashed assets
on deploy (every pre-deploy name 404s within the hour), the service worker holds up to 60
documents for 30 days on a `NetworkFirst` route, and `cleanupOutdatedCaches()` runs when a
new worker activates - three ways for a document and its stylesheet to disagree.

**The fix removes the class rather than any one cause**: the shell stylesheet now ships
INSIDE every emitted document as an inline `<style>`. A document cannot be missing part
of itself. Full write-up, gates and costs:
[`a-stylesheet-in-another-file-can-be-missing-at-paint-time.md`](../.claude/rules/a-stylesheet-in-another-file-can-be-missing-at-paint-time.md).

### The 87 is mostly the instrument, and here is the measurement that says so

Four Lighthouse runs against the **same live bytes**, same machine, same flags, minutes
apart:

```
run1   95   FCP 0.9  LCP 0.9  TBT 190 ms  SI 4.1 s  CLS 0
run2   94   FCP 1.2  LCP 1.2  TBT 290 ms  SI 1.3 s  CLS 0
run3   99   FCP 1.3  LCP 1.4  TBT 110 ms  SI 1.3 s  CLS 0
run4   99   FCP 0.9  LCP 0.9  TBT 100 ms  SI 1.0 s  CLS 0.002
```

**94 to 99 on identical bytes. TBT spans 3x, Speed Index 4x.** Between the 99 and the 87
the only source change was a build stamp, so a large part of that gap is the instrument,
not the site. A single score is not evidence here; a distribution is.

What the runs agree on is where the real cost sits: **Style & Layout 592 ms** of a 1.4 s
main thread, against Script Evaluation's 277 ms, on **1,140 DOM elements** - 42 game cards
each carrying an inline SVG twelve levels deep. That is what TBT is made of, and no font
or stylesheet change touches it. It became visible only after the font work: while the
first paint was blocked for 1,300 ms the same work happened outside the TBT window.

Speed Index has its own cause and it is the documented boot flash - the page paints a
plain document, then React replaces it with a card grid, so the screen changes twice.

### `content-visibility: auto` on the cards - measured and REJECTED

The obvious lever for 592 ms of Style & Layout is to stop styling and laying out the
cards nobody has scrolled to. It was probed properly rather than assumed: two static
servers on 5176 and 5177 from the SAME build, one variable - a rule giving every grid
child `content-visibility:auto; contain-intrinsic-size:auto 100px` - and four Lighthouse
runs per arm, **interleaved** A/B/A/B so arm order could not become the result.

```
A  no content-visibility    scores 88 86 91 89   TBT med 311 ms  S&L med 782 ms  SI med 2138
B  content-visibility       scores 92 92 83 72   TBT med 298 ms  S&L med 827 ms  SI med 2280
```

**Style & Layout went UP.** TBT moved 13 ms, which is a twentieth of the arm's own spread,
and B produced both the best run and by far the worst. Nothing here is a win, so nothing
shipped - the elements still have to be created and styled when they enter the viewport,
and the containment bookkeeping is not free.

Recorded because a rejected experiment with a number is worth more than an untried idea:
the next session that reaches for this lever can read the measurement instead of spending
an hour rediscovering it.
