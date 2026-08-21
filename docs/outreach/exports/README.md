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

