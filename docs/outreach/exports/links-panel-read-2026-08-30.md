# The Links panel, read in a browser on 2026-08-30 — and why there is no CSV

There is no `links-2026-08-30.csv` in this folder, and that is not an omission.
The panel was opened, it is **empty**, and an empty CSV would have added a file
without adding a fact. What follows is the fact.

## What it said

`sc-domain:ellaz.fun`, Search Console → Links, account `/u/1`:

| | Total |
|---|---|
| External links | **0** |
| Internal links | **0** |

Every card reads *No data*: Top linked pages, Top linking sites, Top linking text.

## Why the zeros are not a measurement of zero

**Internal links = 0 is provably false.** The site emits 200 documents that link
to each other thousands of times; `assert:pages` walks that graph on every build.
A property whose own pages do not link to each other has not been crawled into a
link graph at all.

**And the instrument works.** The obvious reading of "0" is that the report is
broken for this account, so it was controlled in the same session, one property
away in the same picker:

```
sc-domain:ellaz.fun     External      0    Internal      0
sc-domain:<another>     External 11,569    Internal 55,663   <- the control
```

Same account, same report, same minute. So the Links report is working and
`ellaz.fun` genuinely has no link graph built yet. The zeros are Google saying
"nothing here to report about this property", not "nobody links to you".

**Only one ellaz property exists** — checked in the picker, there is no rival
URL-prefix property holding the real data.

## What this does to the 2026-11-27 verdict

Eight surfaces are on a clock to 2026-11-27/28 and this was to be the instrument
that read them. It has now produced no row on any date, and `RCH10` plus this
plan's own §7 predicted exactly this: *"it has already failed its own positive
control once, so re-read it in late November and, if internal is still 0, the
instrument is broken rather than the lane young."* Internal is still 0.

**So a fallback has to exist before November, not in it.** The two that do not
depend on this panel:

- **`npm run reach:backlinks`** — asks each destination we wrote to whether our
  domain appears in its response BODY. It cannot discover an unknown link, but
  every link this lane could earn comes from a destination we already named, so
  its blind spot is small and known.
- **Bing Webmaster Tools** — an independent link report on a property Bing has
  crawled since 18 Aug. Its dashboard read empty on 2026-08-21 while URL
  Inspection said indexed, so it needs its own control before it is trusted.

Re-read this panel in late November. If it is still 0/0 with the control still
firing, the Google half of the verdict is unreadable and should be reported as
unreadable rather than as zero.

---

## BUILT 2026-08-30, the same day — and the first one could not have answered

Both fallbacks above exist now, and building the first one found that it was
**structurally unable to report a success**.

`resolve1` in `scripts/reach/backlinks.mjs` froze `expected` rows: fed a page
carrying our link, an `expected` row still resolved to `expected`. All four Hebrew
rows would have read `expected` on 2026-11-27 whether or not a single editor had
published us. So the plan above named an instrument that could only ever produce
the absence of a result — the same class of non-verdict this whole session kept
finding, one layer further out.

It promotes now, and on an ANCHOR rather than a mention: `linkShape()` reads
`href` attributes in all four quoting shapes a server actually emits, because a
page writing "we like ellaz.fun" in its prose is not a backlink. A page that names
us without linking is printed as `NAMED, NOT LINKED` at the top of the board — the
most actionable state in the file, and a sentence to send rather than a wait to
continue.

**And the population was wrong.** 11 fired surfaces, 4 watched: seven had a
verdict date and no instrument, including all three English letters sent that
afternoon. `WATCHED` now maps every fired ledger surface to the page a link would
appear on or to `null` with the reason there can never be one, and both the
checker and the daily board build REFUSE when a fired surface has neither.

Live run, 2026-08-30, twelve destinations, zero `unchecked`:

```
4 linked    the three itch pages and our own repo — the positive control,
            which is what makes the seven below mean absent rather than broken
7 absent    the four Hebrew doors and the three English ones. Correct: none of
            them has published us yet, five days and one day after sending
1 claimed   the awesome-pwa PR, frozen by design — its page renders our URL
            inside its own diff, so no fetch can tell it from a real listing
```

`npm run reach:bing` is the second, with the same three states this folder's
Search Console reader learned the hard way. It has no export yet and says
`UNMEASURED`, which is the honest reading. **The two exports share this folder and
neither reader may read the other's**: Bing's files carry a `bing-` prefix, and
both loose consumers were narrowed in the same change — `gsc-links.mjs` picked
"the newest .csv" and the board's banner asked "is any filename like `/link/i`",
so a Bing export dropped in here would have been reported as a Search Console
reading. The right number attributed to the wrong engine is worse than no number,
because nobody would question it.
