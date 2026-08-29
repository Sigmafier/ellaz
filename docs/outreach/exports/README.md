# Search Console and Bing Webmaster exports

Drop the CSVs here. `npm run reach:links` reads the newest one.

**Search Console → Links → Top linking sites → Export → CSV.** That is the only
thing on this stack that can answer who links to us: every gate in this repo
reads `dist/` or fetches the live site as a crawler, which answers whether we can
be fetched and never whether anyone points at us.

Do not substitute a `site:` query. Measured 2026-08-20 against ellaz.fun: fetched
by a script it returned ten results, none of them the site, beside a claimed
102,000. It looks authoritative in a browser and is not a measurement.

Name the files with the date they were exported - `links-2026-08-20.csv` - since
the export itself carries no date and a stale one is indistinguishable from a
fresh one once it is on disk. The reader picks the newest by modification time
and prints which file it read.

Bing Webmaster Tools imports its verification straight from Search Console, so
claiming it costs a few minutes and gives a second, independent link report.

## What is here, and what it measured (2026-08-21)

`performance-2026-08-21/` — Search Console → Performance → Export, Web, last 3
months. Read it with `npm run reach:perf`.

**The Links report was EMPTY on the same visit.** That is a MEASURED ZERO from
the engine's own report, which is what RCH8 asks for — not UNMEASURED. Nobody
links to this site. `npm run reach:links` still prints UNMEASURED because no
Links CSV exists to drop here; an empty report exports nothing, so the honest
record of the zero is this paragraph and the ledger row, not a file.

## 2026-08-29 - still empty, and this is the BASELINE the lane is read against

The operator opened the Links report the same afternoon the four Hebrew letters
went and reported **0 links**. Recorded here rather than treated as a problem,
for three reasons:

- **It is the expected reading.** The letters left roughly four hours earlier. A
  link cannot exist until an editor reads one, decides, and publishes; Google
  then has to recrawl and report. That is weeks. A non-zero number today would
  mean something had gone wrong with the measurement, not right with the lane.
- **It is the BASELINE, and it is worth more today than it will ever be again.**
  In November, `0 → 2` and `2 → 2` are completely different outcomes and only a
  dated zero can tell them apart. This paragraph is that date.
- **There is still no file to drop.** An empty report exports nothing, so the
  honest record of a zero is prose plus a ledger row - the same conclusion as
  2026-08-21, now confirmed twice eight days apart.

**Before believing any future zero, check the positive control.** This report
claimed INTERNAL links = 0 once, which is provably false: the home page alone
carries 38 across 104 indexed pages. If a later reading shows zero external AND
zero internal, the instrument is broken and its external zero carries no
information (`reach-doctrine` RCH10). If internal is populated and external is
zero, the zero is real.

## 2026-08-29, LATER - the control FIRED. This report is BROKEN, not empty

Read directly in Search Console rather than from an export, on the property that
actually holds the data (see below). Three reports, same property, same minute:

| Report | Reads |
|---|---|
| **Links** | External **0** &middot; Internal **0** |
| Performance, 1-26 Aug | 25 clicks, 676 impressions, 89 queries, average position 19.2 |
| Page indexing | **137 indexed**, 50 not indexed |

**Internal links cannot be zero on a site with 137 indexed pages** - the home page
alone carries 38. So the Links report is not reporting for this property at all,
and its external zero carries NO information about whether anyone links to us.
This is exactly the control this file said to run, and it failed:
`reach-doctrine` RCH10, an absence is not believed until the probe is shown
producing the opposite reading.

**So the zero recorded above is WITHDRAWN as evidence.** It is not "nobody links
to us"; it is "this instrument answers zero to everything". The same reading on
2026-08-21 has to be re-read the same way - it was never a measured zero either.

**Use `npm run reach:backlinks` instead.** It fetches each named destination and
asserts our domain appears in the response BODY, and it carries a positive
control that FIRES: the `github.com/Sigmafier/ellaz` row comes back live. An
instrument that can still say yes is the only kind whose no means anything.

## Where this property actually is

`sc-domain:ellaz.fun`, on the SECOND Google account in Chrome - URL index
`/u/1`, not `ytrofr@gmail.com`:

```
https://search.google.com/u/1/search-console/links?resource_id=sc-domain%3Aellaz.fun
```

Without the `/u/1/` Google answers *"Oops, you don't have access to this
property"*, and typing "ellaz" into the picker on `ytrofr@gmail.com` returns
**"No matching property"**. Worth writing down because the failure reads like a
missing property rather than a wrong account.

## An open discrepancy - do NOT quote either figure until it is settled

`performance-2026-08-21/` records **8 clicks / 231 impressions** over "Last 3
months" ending 2026-08-21. The live property shows **676 impressions in August
alone**. Overlapping windows cannot both be right, so one of them is measuring
something else - a different property, or a filter left on at export time.
Re-derive before quoting either, and never average them.

**Next reading: 2026-11-27.** Not before - a new page gets a freshness boost that
then decays, so an early reading measures the boost and can reverse a strategy
that is working (`seo-doctrine` SEO11).
