# A Deleted Page Keeps Its Ranking For Weeks, So Removing It Is Half a Change

**Scope**: Every removal in this repo that takes a URL out of the world — a game, a
page, a route, a locale arm, a category.
**Origin**: 2026-08-29. Three Search Console 404s traced to one deliberate deletion
fifteen days earlier, and to our own committed export saying the dead URL was still
ranking at **position 8**.

## Core Rule

**Deleting the content is the first half. The 301 is the second half, and it ships in
the same change. A URL keeps whatever ranking it had for weeks after the thing behind
it is gone — so a removal without a redirect does not tidy anything up, it throws away
the one asset that took months to earn and cannot be bought.**

The failure is silent in every direction. The deletion commit is correct, complete and
well-reviewed. `npm test` is green, `build:check` is green, `assert:pages` is green,
`assert:crawlable` is green — because every one of them reads the sitemap or `dist/`,
and a URL that no longer exists is in neither. The only instrument that can see it is
Search Console, and only weeks later.

## What it cost here

`sortsize` — the big/small game — shipped on 2026-08-02 and was removed deliberately
on 2026-08-14 in `0207a33`, whose message says so plainly: *"removed the big/small game
(sortsize) entirely: roster, catalog, content, art, the daily-rotation fixture, and the
sim script."* Thorough, and every line of it right.

Then our own committed export, `docs/outreach/exports/performance-2026-08-21/Pages.csv`,
dated **a week after the deletion**:

```
https://ellaz.fun/en/games/sortsize/,0,2,0%,8       <- position 8
https://ellaz.fun/games/sortsize/,0,3,0%,23.33
```

Google was serving a deleted game to real searchers. Nothing else on this site earns
position 8 — the site's average is around 19. Search Console reported the 404s on
08-18 and still listed three of them on 08-29.

## Where the redirect goes: the SHELF, never a sibling

`/games/sortsize/` now 301s to `/games/kids/`, and the locale arms to their own
`/<locale>/games/kids/`.

**Not to `/games/sort/`.** That is Color Sort, a different mechanic with a similar
name, and sending a reader who asked for one game to a different game is a
bait-and-switch that Google treats as a soft 404 — it earns less than the honest 404 it
replaced. The category page is the truthful answer to *the specific thing is gone*:
here are the 25 games it sat among, in your language.

## The rule lives where no build can see it, so it is asserted

The redirects are `RewriteRule`s in `deploy/hostinger.htaccess`. `dist/` has never
contained that directory and the sitemap has never listed it, so **every gate in this
repo stays green whether they fire or not** — the same shape `assert-live.mjs` already
records for the `/en/` flip. They are therefore asserted in `assert-live.mjs`, against
the live site, after the upload.

**The near-miss control is the load-bearing half.** `/games/sort/` is a live page whose
path is a strict prefix of the dead one. A rule written without the `$` anchor would
301 a working game to a listing — and no assertion that EXPECTS a redirect could ever
see that, because they all pass. So the gate asserts `200` on `/games/sort/` and `404`
one letter past the anchor on `/games/sortsizes/`.

Before shipping, all five redirect rows were confirmed FAILING against the live site
(four 404, one 301 to the wrong place) and both controls confirmed already correct — so
the assertion is known to be able to fire rather than merely green.

## When to Apply

- Removing a game, a page, a route, a locale arm or a category
- Renaming anything whose id appears in a URL — a rename is a delete plus an add
- Reviewing a diff that deletes a `meta.ts`, a content file, or a catalog entry
- Reading a Search Console "Not found (404)" bucket: ask what was deleted, and when

## The tell

A deletion commit that touches only source, and a reviewer who is pleased by how
thorough it is. Ask: **was this URL ever published?** If yes, the diff is incomplete
until it also contains the redirect and the assertion.

## Related

- [`a-hand-authored-number-that-leaves-the-repo.md`](a-hand-authored-number-that-leaves-the-repo.md)
  — the same asymmetry: editing the file does not fix what a stranger already read, and
  here it does not fix what an index already holds.
- [`verify-the-deploy-target-not-just-the-run.md`](verify-the-deploy-target-not-just-the-run.md)
  — a green run proving nothing about the live artifact.
- [`a-diagnostic-that-truncates-what-it-compares.md`](a-diagnostic-that-truncates-what-it-compares.md)
  — why the near-miss control exists: a gate that only ever expects a redirect cannot
  express the failure where it redirects too much.
