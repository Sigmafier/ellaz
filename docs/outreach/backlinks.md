# Backlinks — every link we know of, and whether it is still there

**This is a RECORD, not a draft.** Nothing here is published; it is the list of
links that point at ellaz.fun, and the date each one was last confirmed alive.

Read it with `npm run reach:backlinks`, which re-fetches every row and writes
the result to `backlinks-checked.json`. `-- --html` renders the same board as a
page.

---

## Why this is separate from `ledger.md`

They answer different questions and the answers routinely disagree.

| | `ledger.md` | this file |
|---|---|---|
| tracks | what WE DID | what EXISTS |
| a row means | a surface was fired | a link points at us |
| goes stale because | a person posted and did not write it down | **somebody else deleted something** |

A surface can be `fired` and produce no link at all — which is the normal case,
not the failure case. And a link can die without anyone touching this repository:
a forum post is removed, a list entry is dropped in a rewrite, a page is edited
and our URL goes with it. **That is the whole reason this file needs re-checking
rather than reading**, and it is why `gone` is a status of its own.

## Why a status code is not the check

A page can return 200 with our link edited out of it. So the checker asserts our
domain appears in the **body**, exactly as `assert-crawlable.mjs` does for our own
pages, and for the same reason: the status answers "is that page alive", never
"does it still point at us".

**And a fetch that fails is not evidence of absence.** No network, a timeout, a
host refusing an automated client — each reports `unchecked`, never `gone`. A
probe that cannot reach a thing has not shown the thing is missing;
[`a-diagnostic-that-truncates-what-it-compares.md`](../../.claude/rules/a-diagnostic-that-truncates-what-it-compares.md)
is the same lesson, and it has cost this repo a wrong conclusion twice.

## Status vocabulary

| Status | Meaning |
|---|---|
| `live` | fetched, and our URL is in the body. The date is when that was last true. |
| `gone` | **was** live on a recorded date, and is not now. A finding, and the reason this file exists. |
| `claimed` | we believe it exists but cannot verify it from here — a login wall, a closed group, an automated-client block. Never counted as a link. |
| `expected` | a surface was fired and no link has appeared yet. Not a link. |
| `unchecked` | the fetch failed for our reasons, not theirs. Says nothing either way. |

**GSC rows are DERIVED and marked `[gsc]`** — read from Search Console's own
export, never typed here. That report is the authority on whether a link exists
(RCH8); this table is what we believe *between* exports, and the two are shown
apart so a belief can never be mistaken for a measurement.

## The ledger

<!-- backlinks:rows -->

| URL | Source | Status | First seen | Re-check | Notes |
|---|---|---|---|---|---|
| https://github.com/hemanth/awesome-pwa/pull/465 | awesome-pwa list PR | claimed | 2026-08-12 | 2026-11-10 | Open and mergeable since 2026-08-12, **not merged**, so there is no link yet — a PR page is not a listing. The list has merged nothing since 2026-08-10 and its queue went 10 → 24, so it batches. Do not wait on it. |

<!-- /backlinks:rows -->

## What GSC says

**Nothing yet, and that is a gap rather than a finding.** The Links report has
never been exported, so `npm run reach:links` prints UNMEASURED and exits 2 — it
will never print `0`, because zero is a real answer that says the lane produced
nothing, and the two are acted on differently.

Drop `Top linking sites` into `exports/` and both this file and that script start
reading it.
