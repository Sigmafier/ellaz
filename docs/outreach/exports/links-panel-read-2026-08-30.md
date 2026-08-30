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
