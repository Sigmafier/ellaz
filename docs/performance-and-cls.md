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

## The desktop CLS 0.2, and why this session did not close it (2026-09-07)

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

**The harness for whoever picks this up**:
`scripts/repro/repro-home-cls-attribution.mjs` — Lighthouse's own two device
profiles, arms **interleaved** (desktop/mobile/desktop/mobile, because
non-interleaved arms measure the arm order as much as the arm), per-element
attribution summed across runs, and a decision rule fixed before the run: whatever
is attributed more than 0.05 gets the `:empty { min-height }` reservation already
proven on the room. It needs `playwright`, which is not currently resolvable from
this repo's `node_modules`.
