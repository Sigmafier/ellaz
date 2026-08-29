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

## The "discrepancy" was not one - RESOLVED the same day, and the answer is growth

Flagged here for an hour as a contradiction: the export says **8 clicks / 231
impressions** over "Last 3 months", the live property says **676 impressions in
August alone**, and overlapping windows cannot both be right.

They do not overlap. Summing the export's OWN daily rows:

```
Chart.csv spans          2026-08-01 -> 2026-08-18
first day with any data  2026-08-04
sums to                  8 clicks, 231 impressions   <- matches the headline exactly
```

**The label said three months and the file holds eighteen days**, because the
property has no data before 2026-08-01 - `num_of_days=90` returns the identical
totals to `num_of_days=28`. So the export is Aug 1-18 and the live figure is
Aug 1-26, and the whole gap is the eight days between them:

| window | clicks | impressions | impressions/day |
|---|---|---|---|
| Aug 1-18 (the export) | 8 | 231 | ~15, and ~25 over its last week |
| Aug 19-26 (the gap) | **17** | **445** | **~56**, peaking at 90 |
| Aug 1-26 (live) | 25 | 676 | |

Clicks tripled and impressions more than doubled in eight days. Average position
19.2 today against 21.7 on 2026-08-20.

**The lesson is about the LABEL, not the data.** A Search Console export names the
window you asked for, not the window it contains; on a young property those are
different, and the file will happily say "Last 3 months" over eighteen days of
rows. Sum `Chart.csv` before comparing any two exports - the daily rows are the
only honest statement of what an export covers.

## Bing, claimed 2026-08-29 - crawled, indexed, ranked first, and its dashboard says none of that

**Read the correction before the table.** The first version of this section said
*"Bing has not crawled the site."* That was WRONG, and it was wrong because I
believed two empty dashboard panels and never asked the index itself. It was
committed and pushed as `91f5286`; this is the amendment, in the file, because
the wrong sentence is what a later session would have read.

**What Bing actually holds, measured 2026-08-29 in the operator's own Chrome:**

| instrument | says | true? |
|---|---|---|
| **URL Inspection**, `https://ellaz.fun/` | **Indexed successfully - URL can appear on Bing.** Discovered **18 Aug 2026**; last crawl **18 Aug 2026 03:29**; crawl allowed YES; page fetch **Successful**; indexing allowed YES | **this is the ground truth** |
| **bing.com/search?q=ellaz.fun** | **result #1**, correct title and description, plus `/games/minesweeper` at #2 | corroborates |
| **Sitemaps** | 1 known sitemap, submitted 8/29, crawled 8/29, **Success, 200 URLs discovered** | corroborates - 200 is the exact `<loc>` count `curl` gets |
| Search Performance | 0 clicks, 0 impressions, May 29 - Aug 28 | **honest.** Nobody has clicked us from Bing. That is a real zero |
| Site Explorer | no indexed URLs | **contradicts URL Inspection.** Dashboard lag on a property verified today |
| Backlinks | `-`, no data | honest - there are no inbound links yet |

**Two dashboard panels being empty is not the index being empty.** Search
Performance and Site Explorer are populated from data accrued after the property
is verified, and the property was verified today; the crawler visited eleven days
before anyone claimed the site. Those are independent facts and I collapsed them
into one.

**The tell it was stale rather than absent:** Bing's own snippet reads *"30 free
games"*. The live page has said **42** for weeks. So Bing holds a real copy, taken
at an older crawl - which is exactly what an index with one visit and no return
looks like, and is the opposite of never having been there.

### `site:ellaz.fun` on Bing is not an instrument - it answers with garbage

Typed into Bing it returns **"About 1,180 results"** of German-English dictionary
pages for *"selection panel"*. Nothing to do with us, and a count that means
nothing.

**The control:** `site:github.com ellaz` in the same session returns the
`ytrofr/ellaz` repository as result #1, 51 results. So the `site:` operator works
here; it simply falls back to unrelated results on a small domain instead of
returning an empty set. **A count from `site:` on this domain may not be quoted,
in either direction** - it cannot express "none", so it cannot report it.

### The positive control that DID work, and why the first one did not

Run in *Backlinks To Any Site*: `https://github.com/` returns **2.0M referring
domains and 14.0M anchor texts** in the same view where `ellaz.fun` returns `-`.
The report can plainly say a large number when there is one, so its `-` for us is
an honest empty. The first attempt used `kef-lilmod.co.il` and it also returned
nothing - too small to discriminate. **A positive control has to be chosen so a
working instrument CANNOT return the same answer as a broken one**; a quiet site
fails that test and reads exactly like a failure.

### Where that leaves the two search engines

| | Google Search Console | Bing Webmaster Tools |
|---|---|---|
| backlinks report | External 0, **Internal 0** | `-` (no data) |
| holds data about us? | YES - 137 indexed, 676 impressions | YES - indexed since 18 Aug, ranked #1 for our name |
| does the BACKLINK report work? | **NO** - 0 internal against 137 indexed pages is impossible | **YES** - control fires at 2.0M |
| so its zero means | **the instrument is broken** | **an honest zero. There are no links yet** |

Bing is the trustworthy backlink instrument and Google's is not. Bing's zero is
today's baseline for the Hebrew lane.

**And a host check, since "not crawled" was on the table.** `curl` from this
machine, 2026-08-29: bingbot UA gets **200** on `/`, `/robots.txt`, `/sitemap.xml`
and `/he/`, byte-identical to a browser UA. The positive control matters here too
- the same host returns **429** to a GPTBot UA, so it demonstrably does refuse
crawlers by name and is choosing not to refuse this one.

**Next reading: 2026-11-27.** Not before - a new page gets a freshness boost that
then decays, so an early reading measures the boost and can reverse a strategy
that is working (`seo-doctrine` SEO11).
