# Reach ledger — what was fired, when, and when we judge it

**This is the record. The drafts beside it are proposals.** Every draft describes
its surface as still available, because that is how a draft is written — so the
only thing that can answer *have we already used this* is a row here.

`npm run assert:outreach` reads this file. Every draft in this folder must have a
row, every row's status must match the `**Status**:` line in its draft, and a row
that is `fired` or `spent` must carry both dates. A disagreement fails the gate.

**Write the row before the post goes out, not after.** Written afterwards it is a
memory; written before, it is the thing that stops the same submission going out
twice — and the thing that makes the ninety-day wait a scheduled step rather than
patience. (`reach-doctrine` RCH2.)

## Status vocabulary

| Status | Meaning |
|---|---|
| `draft` | written, not sent. Nobody outside this repository has seen it. |
| `fired` | sent, and the surface can be used again if it is worth it. |
| `spent` | sent, and this surface cannot be re-run. Never fire it again. |
| `dropped` | decided against. The reason is in the notes column, so it is not re-derived next quarter. |

A verdict is due **90 days** after firing, never earlier: new pages get a
freshness boost, then decay, so an earlier reading measures the boost and
reverses a correct strategy (`seo-doctrine` SEO11).

## The ledger

| Surface | Draft | Status | Fired | Verdict due | Notes |
|---|---|---|---|---|---|
| awesome-pwa (list PR) | `dev.md` | fired | 2026-08-12 | 2026-11-10 | **PR [#465](https://github.com/hemanth/awesome-pwa/pull/465), open, mergeable.** Found already open on 2026-08-20 while preparing to open it — the draft said "nothing is opened" for eight days. Entry corrected the same day: it advertised 23 games in Hebrew and English. List batches merges; last batch 2026-08-10, 10 PRs queued | **2026-08-21: that list has merged nothing since 2026-08-10 and its open queue has gone 10 -> 24.** The "merges every ~9 days" evidence that justified this lane no longer holds. Not dead (it batches), but do not wait on it. |
| awesome-phaser (list PR) | `dev.md` | dropped | — | — | dormant 16 months, every open PR unanswered. Ranked by merge recency, not stars |
| dev.to article | `dev.md` | draft | — | — | operator's to publish or discard |
| Hebrew communities ×3 | `hebrew.md` | draft | — | — | **Destinations named 2026-08-21, rules NOT re-readable from here.** A direct fetch of a Facebook group returns its title and nothing else - no rules, no pinned post, no About panel - public or private. So RCH5's fetch is the operator's, in the group, on the day; `hebrew.md` carries the checklist it has to produce. One rule IS known without login: `מורות משקיעות` brokers promotion through a named person by phone, so an unbrokered link there reads as dodging it |
| Reddit ×3 | `reddit.md` | draft | — | — | destinations returned an identical generic shell to an automated fetch; not yet actually read |
| itch.io | `itch.md` | draft | — | — | **The three zips are BUILT and GATED at `44e0571` (2026-08-22)**: `dist-standalone/zips/ellaz-{sudoku,2048,snake}.zip`, 76 / 69 / 446 KB, `index.html` at the zip root. Gated as the ZIP rather than as the build directory - extracted and run back through `assert:standalone`, 14/14 planted cases caught. Stamp reads `ellaz:commit 44e0571…-dirty`; the `-dirty` is untracked build scratch and peers' in-flight files, not uncommitted source. **Still needs an account, which only the operator can create.** Rebuild if HEAD moves - the gate refuses a stale stamp |
| Newgrounds | `newgrounds.md` | draft | — | — | same bundles - see the itch row; built and gated at `44e0571` |
| Poki / CrazyGames enquiry | `portals.md` | draft | — | — | approved 2026-08-20: their ads on their domain, our site stays ad-free (RCH1) |
| Israeli tech press | `press.md` | draft | — | — | contacts verified 2026-08-11; re-verify before sending |
| Show HN | `launch.md` | draft | — | — | **one shot.** Fires last, after every lane above is green |
| Product Hunt | `launch.md` | draft | — | — | **one shot.** Same gate |

## What the outside world has sent back (2026-08-21, first real measurement)

Search Console, Performance, last 3 months, in
[`exports/performance-2026-08-21/`](exports/performance-2026-08-21/). Read it
with `npm run reach:perf`.

| | |
|---|---|
| indexed? | **yes** — 55 distinct URLs earn impressions, in all four written languages |
| impressions | 4 in the 9 days before 2026-08-10; **227** in the 9 days from it |
| clicks | 8 |
| where | **Israel 65%**, United States 6%, Spain 1% |
| what they search in | **Hebrew 76%**, Latin 24% |
| which URLs earn it | bare/English 66%, `/en/` 16%, **`/he/` 11%**, `/es/` 5%, `/fr/` 3% |
| position | only **26%** of impressions come from pages averaging page one |
| linking sites | **0. Measured** — the Links report was empty on the same visit |

Three things follow, and none of them was guessable from inside the repository.

**The crawl block is behind us.** The 08-10 step is the 2026-08-08 CDN fix
landing, two days later, as a recrawl.

**This is not a crawling or a content problem. It is an authority problem.** The
pages are indexed and they sit at 11 to 50. Zero links is exactly the curve a
three-week-old domain with no links produces, and links are the only lever that
moves it.

**The audience is Israeli and the English pages are absorbing their searches.**
That decides the order of the lanes below: the Hebrew communities are no longer
the best guess, they are where the measured demand already is.

## What has actually reached the outside world

Nothing from this folder. The two things that HAVE been public the whole time are
the repository's own metadata and the site itself — which is exactly why the
first lane of the backlinks routine is auditing what we already own, and why the
repository description was wrong for weeks while every check of the link passed.
