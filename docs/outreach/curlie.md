# curlie.org - one form, one shot, and their own rules pick the category

**Status**: draft
**Surface**: <https://curlie.org/en/Kids_and_Teens/Games/Online/Collections>
**The form**: <https://curlie.org/public/suggest?t=kt-games&cat=Kids_and_Teens/Games/Online/Collections>
**Account**: none. A free self-serve form, no login, no editor application.
**Who submits**: the operator. I fill nothing here - it is a public form and the
submission is theirs to make.

## Why this door

The DMOZ successor, human-edited by volunteers. Measured 2026-09-03 with the headers a
real Chrome sends: **12 of 12 external anchors dofollow across 12 distinct hosts**, fresh
2026 content. It had been filed `unchecked` on a 403 until the probe stopped sending a
user agent alone.

Under RCH13 a listing we place ourselves is **DISCOVERY, not EARNED**.

## "Please only suggest a URL to Curlie once, ever"

That sentence is in their submission agreement, and it is why this file spends its length
on the category rather than on the copy. There is no second attempt to correct a wrong
guess: *"Sites intentionally submitted to inappropriate or unrelated categories will be
removed."*

## The category, decided by reading theirs rather than ranking ours

Four were considered. The winner is the one whose own description is a sentence about us:

| category | its own words | verdict |
|---|---|---|
| **`Kids_and_Teens/Games/Online/Collections`** (18 sites) | *"Pages in English language dedicated to people under 18 years that provide collections of online games, from different genres."* | **TAKE** |
| `Kids_and_Teens/Games/Online` (89) | the parent. Their form's own example says submit to the leaf, not the branch | too shallow |
| `Games/Video_Games/Browser_Based/Collections` (61) | no audience in the definition | less accurate |
| `Games/Video_Games/Browser_Based/Open_Source` (17) | true of us, and it describes the CODE rather than the site a reader would visit | less accurate |

The audience half is decided by `ageBand`, not by `category` - **25 of 42 games are
`ageBand: "kids"`** - which is the field that governs *who a game is for*, the same
distinction that made the CrazyGames letter wrong twice
([`docs/outreach/ledger.md`](ledger.md), 2026-08-30).

## What the form asks, verbatim from its own fields

Read off the live form 2026-09-03: `url`, a `type` radio (Regular / PDF / RSS / Atom),
`title` (maxlength 100), `description` (textarea), three age checkboxes
(`kids` / `teens` / `mteens`), and `email`.

```
URL            https://ellaz.fun/
Type           Regular
Title          Ellaz
Description    Collection of 42 browser games including sudoku, mazes, word
               searches and coloring, playable without registration and offline
               once loaded. Available in English, Hebrew, Spanish and French.
Age-Level      [x] Kids (12 and under)   [x] Teens (13-15)   [ ] Mature Teens (16-18)
E-mail         yatiroffer@gmail.com
```

## Every rule that shaped it, quoted from the form

> Keep the description of your site brief - **no longer than 25-30 words**.

**26 words.** Counted, not estimated.

> Do not use ALLCAPS ... Do not repeat the title of your site in the description.
> Avoid using promotional language and strings of key words and search terms.

No "free", no "best", no "fun", and the word *Ellaz* does not appear in the description.
"Playable without registration" is the same kind of fact their existing entries carry
(*"Requires registration and parental permission to record high scores"*), stated the
other way round.

> **If the page is not in the English language this category is not suitable for
> submission.**

So the URL is `https://ellaz.fun/` and NOT `/he/`. Verified the same day: `lang="en"`,
title *"Ellaz - free browser games for kids and grown-ups"*, 42 game links in the served
HTML.

> Avoid submitting sites with addresses that redirect to another address.

Verified: `https://ellaz.fun/` returns **200 with zero redirects**.

> Sites which are incomplete, contain 'Under Construction' notices, or contain broken
> graphics or links aren't good candidates.

Verified: zero "under construction" or "coming soon" markers in the served HTML.

> Sites whose main focus is selling games or other products will not be listed here.

Nothing is sold anywhere on the site.

> Only submit your site here if the main focus of your site is games for kids to play
> online.

It is.

## The age boxes, and why Mature Teens is left unticked

Their bands are **Kids (12 and under) · Teens (13-15) · Mature Teens (16-18)**, "select
all that apply". `ageBand` splits **25 kids / 19 all**, so Kids and Teens are both true.
Mature Teens is left unticked deliberately: the 19 "all" games suit a sixteen-year-old
perfectly well, but nothing here is aimed at them, and ticking a band a site does not
target is the kind of overclaim their editors remove sites for.

## Every fact in the description, traced

| claim | source, 2026-09-03 |
|---|---|
| 42 games | `npm run assert:outreach` prints `42 games (25 kids)`; `ROSTER_IDS` has 42 ids |
| sudoku, mazes, word searches, coloring | four real roster ids, and the four printable packs are built from them |
| without registration | no accounts, no server; progress is `localStorage` |
| offline once loaded | installable PWA, service worker precaches the shell |
| English, Hebrew, Spanish, French | `PAGE_LOCALES` in `src/i18n/locales.ts` |

**Do not quote these numbers from this file later.** They are a dated reading, and this
repo's history is full of figures that went stale in place.

## The operator's steps

1. Open the form link above - the category is already in the URL, do not navigate to it
   through the tree and lose it.
2. Paste the five fields exactly as written.
3. Tick **Kids** and **Teens**. Leave Mature Teens unticked.
4. Tick the agreement, submit **once**.
5. Tell me it went, and I flip the ledger row to `fired` with the date.

**No second submission, ever, whatever happens.** If it is rejected, the answer is a
different category argued from scratch, not the same URL again.

## Verdict

**2026-12-02**, per SEO11. The `backlinks.md` watch is added when the row fires, not now:
a listing that does not exist yet would read `unchecked`, a word this repo reserves for
*the fetch failed for our reasons*.
