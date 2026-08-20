# What search engines actually report — read 2026-08-20

The first reach measurement this project has ever had. Everything below was read
off Google Search Console for the verified domain property `sc-domain:ellaz.fun`,
on 2026-08-20. Nothing here is derived from the repository, and nothing in the
repository can see any of it.

## Search performance — 1 to 18 August 2026

| | |
|---|---|
| Clicks | **8** |
| Impressions | **231** |
| Average CTR | 3.5% |
| Average position | **21.7** |
| Distinct queries | 52 |

Position 21.7 is the headline: the site is being *shown*, on the second and third
page of results, for queries that are exactly what it is. It is not an indexing
problem and it is not a content problem. It is a ranking-strength problem, which
is the problem backlinks solve — which is the lane that has never been fired.

The window is 18 days, not 90. The property carries no data before 1 August, so
**no verdict is due until roughly 2026-10-30** (`seo-doctrine` SEO11).

## The top ten queries, verbatim

| Query | Clicks | Impressions |
|---|---|---|
| ellaz | 3 | 7 |
| מוקשים משחק | 1 | 5 |
| מצא את ההבדלים | 0 | 9 |
| שולה המוקשים | 0 | 6 |
| משחקי זיכרון לילדים | 0 | 5 |
| atrapa la rana | 0 | 3 |
| שולה מוקשים | 0 | 3 |
| הבדלים | 0 | 2 |
| משחק שולה המוקשים ב google | 0 | 2 |
| משחק בלונים | 0 | 2 |

Nine of the ten are Hebrew, and one is Spanish (`atrapa la rana` — catch the
frog). Not one is English. The four-language page set is being found in the two
languages with the least competition, which is the sparse-surface argument
(`seo-doctrine` SEO13) showing up in real data rather than in reasoning.

## Indexing

| | |
|---|---|
| Indexed | **104** |
| Not indexed | 27 |

The 27 break down as 9 `Page with redirect` (the `/en/*` → `/*` 301s from the
2026-08-14 locale flip — expected), 4 `Alternate page with proper canonical tag`
(the hreflang cluster working — expected), 1 `Not found (404)`, and 13
`Crawled - currently not indexed`. Only the last two are worth a look.

## Backlinks: UNMEASURED, and here is why that is not the same as zero

```
External links   Total 0     Top linking sites: No data
Internal links   Total 0     Top linked pages:  No data
```

**Internal links reading zero is the positive control, and it fails.** The home
page alone carries 38 internal links and 104 pages are indexed, so the true
internal figure is in the thousands. A report returning 0 for a quantity we can
prove is large is not reporting; it is empty. The Links report populates weeks
behind verification, and this property has 18 days of history.

So the honest state is **UNMEASURED**, exactly as `npm run reach:links` says with
no export present — not "we have no backlinks". The external figure is very
probably zero as well, since nothing in `docs/outreach/` has ever been sent, but
that is an inference and this file does not record inferences as measurements.

This is `reach-doctrine` RCH10 — *a probe reporting an absence is not believed
until the same probe has been shown producing the opposite reading* — applied
about an hour after it was ratified, to the very report it was ratified over.

**Re-read the Links report in October.** If internal links is still 0 then, the
instrument is broken rather than young, and that is a different finding.

## What is still unmeasured after this

- **Bing**: Webmaster Tools is unclaimed, so its backlink report — the free second
  opinion, and the index behind ChatGPT Search and Copilot — does not exist yet.
- **On-site behaviour**: `VITE_POSTHOG_KEY` has never been set, so every analytics
  event since launch has been discarded. We know 8 people arrived. We know nothing
  about what they did.

## The 13 "Crawled - currently not indexed", named

Read out of Search Console on 2026-08-20, all 13 rows, `sc-domain:ellaz.fun`.
The count was already recorded above; this is which URLs, because a count of 13
and a list of 13 lead to completely different work.

| URL | Last crawled |
|---|---|
| `https://ellaz.fun/fr/games/snake/` | 18 Aug |
| `https://ellaz.fun/he/games/spell/` | 18 Aug |
| `https://www.ellaz.fun/fr/games/memory/` | 18 Aug |
| `https://ellaz.fun/games/spell/` | 18 Aug |
| `https://www.ellaz.fun/fr/games/bubbles/` | 18 Aug |
| `https://ellaz.fun/es/games/music/` | 18 Aug |
| `https://www.ellaz.fun/fr/games/letters/` | 18 Aug |
| `https://ellaz.fun/fr/games/balloons/` | 18 Aug |
| `https://www.ellaz.fun/es/games/letters/` | 18 Aug |
| `https://ellaz.fun/es/games/maze/` | 18 Aug |
| `https://ellaz.fun/fr/games/spell/` | 18 Aug |
| `https://www.ellaz.fun/es/games/spell/` | 18 Aug |
| `https://ellaz.fun/sitemap.xml` | 9 Aug |

**Nothing here needs fixing today, and that is the finding.** The check was run
expecting thin or orphaned pages, because that is what this bucket usually holds.
It holds none.

- **5 of 13 are the `www.` host.** Measured as Googlebot the same day: `www.ellaz.fun`
  answers **200**, not a redirect, and serves the correct canonical - `https://ellaz.fun/…`
  on every one. So Google is crawling a second hostname and correctly declining to
  index it. The canonical is doing exactly its job. It is still crawl budget spent on
  a mirror that can never rank, and one `RewriteCond %{HTTP_HOST} ^www\.` in
  `deploy/hostinger.htaccess` would end it - beside the `/en/*` rule already there.
- **7 of 13 are young.** French was promoted on 2026-08-16 and Spanish on 2026-08-12;
  this window closes on the 18th. A page crawled and not yet indexed four days after
  it first existed is a page Google has not got round to, not a page it rejected.
- **1 of 13 is `sitemap.xml`**, which is not a page and cannot be indexed. Its presence
  in this bucket is normal.

The transferable half is that a not-indexed COUNT is not a defect count. Three
different situations - a duplicate host, a new page, and a file that was never a
page - arrived in this report under one heading, and only the list separates them.
