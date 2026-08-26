# Newgrounds - two listings, and a warning about the fit

**Status**: drafts. Nothing is uploaded.

## Read this before doing the work

**Newgrounds is not a parenting audience and the copy here does not pretend otherwise.**
Its community is long-standing, mostly adult, and built around animation and indie games
with an edge. A page selling "42 free games for kids, made by a parent" reads there the
way a nursery advertisement reads in a bar: not offensive, just addressed to nobody in
the room.

So two decisions follow, and both are deliberate:

1. **Only Snake and 2048 go up.** They are arcade games that happen to be on a kids'
   platform, and they stand on their own. Sudoku for four-year-olds does not.
2. **The copy leads with the build, not the children.** This audience contains a lot of
   people who have shipped a web game and know what it costs. "No ads, no account, works
   offline, 200 KB" is the interesting sentence here. The kids platform is the footnote.

**Expected return is low, and that is fine.** This is a do-follow-ish link on an old,
high-authority domain and a small chance of a few players. It costs one upload each. If
the two pages sit at 40 views forever, nothing was lost. Do not spend an afternoon on it,
and do not post a third game if the first two go quiet.

---

## What could not be verified from here

**Re-checked 2026-08-22: still 403.** The HTML5 submission wiki page returns HTTP 403
Forbidden to a fetch, four days after the same result, so nothing below has been
re-verified against their site and the caveat here is current rather than stale.

`https://www.newgrounds.com/` returns **403 to a script** - not to a browser. Every
scripted check of that domain therefore returns the same thing, including the check of
whether a page exists at all, so nothing below about their submission form has been
confirmed by fetching it. Open it in a browser and correct this file where it is wrong.

That is the same shape of blindness that hid the CDN bot-challenge on ellaz.fun for
months: a domain that answers a browser and refuses a script tells you nothing until you
use the right instrument. Here it costs nothing, because the operator has a browser.

**What is true regardless**: the upload is the same zip as itch - the contents of
`dist-standalone/<id>/` with `index.html` at the root of the zip. Build it with
`STANDALONE_GAME=<id> npm run build:standalone` and gate it with
`npm run assert:standalone` before uploading.

---

## Listing 1 - Snake

**Title**: `Snake`

**Description**:

```
Snake, three speeds, no advertisement in the middle of your run.

Arrow keys, or swipe on a phone. The fast setting keeps speeding up as you grow, so a
long run ends because the board became the enemy, not because a clock ran out. It keeps
your longest run.

Built as a plain web page. No account, no download, no tracking of you, and it works
offline once it has loaded. It is one game lifted out of a free site of 42 of them, and
that whole site is about 53 KB before you pick anything.

The rest: https://ellaz.fun

Your progress on this page may not be saved between visits, because it runs inside a
frame on somebody else's domain. At ellaz.fun it is saved.
```

**Rating**: Everyone. **Genre**: Action - Arcade.
**Tags**: `snake` `arcade` `html5` `retro` `mobile` `no-ads`

---

## Listing 2 - 2048

**Title**: `2048`

**Description**:

```
The tile game, with nothing added to it.

Slide, merge, reach 2048. What is missing is the point: no advertisement between
attempts, no account, no popup asking you to rate it. Close the tab mid-run and the board
is still there when you come back.

Built as a plain web page, 204 KB, works offline. One game out of a free site of 42.

The rest: https://ellaz.fun

Your progress on this page may not be saved between visits, because it runs inside a
frame on somebody else's domain. At ellaz.fun it is saved.
```

**Rating**: Everyone. **Genre**: Puzzle - Other.
**Tags**: `2048` `puzzle` `numbers` `html5` `mobile` `no-ads`

---

## Provenance

| Claim in the copy | Where it comes from |
|---|---|
| 42 games | `src/portal/catalog.ts`, counted 2026-08-18 |
| about 53 KB first load | `scripts/assert-payload.mjs` ceiling is 56,000 B gz; measured 53,121 on 2026-08-18 |
| 204 KB for 2048 | `dist-standalone/2048` summed on the built artifact, re-measured 2026-08-22 |
| works offline | the PWA precaches the shell (`vite.config.ts` workbox) |
| no tracking | analytics is anonymous-events-only and has never had a key set in production (`CLAUDE.md` § Firebase) |
| snake keeps the longest run | `src/sdk/score.ts`; snake reports a personal best at game over |
| 2048 remembers the board | `src/sdk/session.ts` |
| progress may not persist in a frame | third-party iframes get partitioned storage in Chrome; Safari's ITP may refuse it |

**The "no tracking" line is stronger than it looks and it is honest.** PostHog is wired
but its key has never been set in a production build, so `if (!key) return` is always true
and the whole init is removed by the minifier. Even when a key is set it runs in
anonymous-events mode with no `identify()`, no session replay and no autocapture. Do not
soften this to "minimal tracking"; do not strengthen it to "we will never measure
anything", which is not true.
