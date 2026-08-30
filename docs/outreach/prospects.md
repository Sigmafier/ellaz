# Prospects — destinations measured, before a letter is spent on them

**This is neither a draft nor a record.** [`ledger.md`](ledger.md) says what we
FIRED. [`backlinks.md`](backlinks.md) says what EXISTS. This says which
destinations are worth the one scarce thing in this whole lane: a letter, which
always needs the operator.

Read it with `node scripts/reach/prospects.mjs`. Nothing here is published, and a
row appearing here is not a decision to write to anyone.

## Why the verdict is not a score

A number invites ranking destinations against each other and these are not
comparable. A `.gov.il` that nofollows everything is worth more attention than a
blog that does not, because of who reads it. So the verdict answers one narrow
question — *would a link here carry authority* — and whether it is worth a letter
stays a person's call.

| verdict | meaning |
|---|---|
| `TAKE` | 5+ external anchors, dofollow, and the page is current |
| `thin` | links out, but barely |
| `nofollow` | links out and nofollows all of it. Readers only, never authority |
| `dormant` | anchors found, newest date on the page is over a year old |
| `blind` | **no external anchors found.** Says nothing about the page — says the instrument read nothing |
| `unchecked` | the fetch failed for OUR reasons. 403 and 429 are usually a user-agent block or a rate limit, never an outage |

`blind` and `unchecked` are deliberately not verdicts. Collapsing either into
"0 dofollow" is how a destination gets written off by a probe that never reached
it, which this repo has done twice
([`a-diagnostic-that-truncates-what-it-compares.md`](../../.claude/rules/a-diagnostic-that-truncates-what-it-compares.md)).

## The matcher proves itself on every run

`nofollow: 0` is very good news and it is exactly what a matcher that cannot see
`rel` reports about every page on earth. So a fixture carrying one anchor of each
kind is parsed before anything else, and a mismatch stops the run rather than
printing numbers nobody should believe. Planted 2026-08-30: deleting the `rel`
branch makes it print `FAIL` and exit 2.

## The candidates

Two of these rows exist to be controls rather than prospects, and they are marked
so nobody sends them a letter: `freetech4teachers.com` is a destination this repo
already ruled dormant, and our own itch page is the only row whose `linksToUs`
must come back true.

<!-- prospects:rows -->

| URL | Note |
|---|---|
| https://www.commonsense.org/education/top-picks | Common Sense Education. Enormous authority in exactly our category and it links out — measured 2026-08-30: 35 external, 34 dofollow, 1 nofollow, and that 1 is the control proving the count is real. Editorial, so the ask is inclusion in a list, never a submission. |
| https://www.learninggame.org/free-learning-games-for-children/ | A live roundup of free learning games, already linking to code.org and ed.stanford.edu. Measured 2026-08-30: 125 external, 122 dofollow, 3 nofollow. |
| https://www.kidsaitools.com/en/articles/best-free-educational-games-kids-no-ads-2026 | A 2026 roundup whose stated criteria are ours exactly — genuinely free, zero ads, zero in-app purchases. Returned **429** on 2026-08-30, so it is `unchecked` and nothing is known about it either way. Re-run before deciding. |
| https://www.freetech4teachers.com/ | **CONTROL, NOT A PROSPECT.** Already ruled out on 2026-08-29: 200, current design, huge archive, last post 2023-08-23. It is here so a run that reports every destination healthy is visibly wrong. |
| https://ytrofr.itch.io/sudoku | **CONTROL, NOT A PROSPECT.** Our own itch listing. It is the only row whose `linksToUs` must come back true, which is what proves that flag fires on a real page and not only on the fixture. |

<!-- /prospects:rows -->

## What a `TAKE` does not tell you

It does not say the destination will reply, that our games fit their audience, or
that a letter is due. It says a link there would count. Everything after that is
[`hebrew-directories.md`](hebrew-directories.md)'s method: read the destination's
own rules on the day, write one letter with no shared sentences, and put the
ledger row in before it goes.
