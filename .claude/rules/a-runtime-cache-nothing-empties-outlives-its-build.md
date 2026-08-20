# A Runtime Cache Nothing Empties Outlives the Build It Belongs To

**Scope**: `workbox.runtimeCaching` in `vite.config.ts`, and any future cache this app writes.
**Origin**: 2026-08-20. A correct, verified, live deploy was reported as never having shipped.

## Core Rule

**`cleanupOutdatedCaches` cleans the PRECACHE and nothing else. Every runtime cache
you add is yours to empty, and until something does, it holds responses from builds
that no longer exist for as long as its `maxAgeSeconds` says. A NetworkFirst cache of
DOCUMENTS is the worst case: when the network misses its timeout the page a returning
visitor renders is the old one, whole, with no error and no tell.**

## What it looked like

`ellaz-pages` is NetworkFirst, `networkTimeoutSeconds: 3`, `maxAgeSeconds: 30 days`.
Every check said the deploy was live, because every check is a first visit:

| Check | Result while a returning phone showed the old page |
|---|---|
| `curl` the game page | new markup |
| `assert-live.mjs` | green - live HTML names the assets just built |
| `assert-crawlable.mjs` | green - it fetches as a crawler, which has no cache |
| a fresh browser context | new header, new game row |
| `sw.js` on the server | the new one, naming the current shell hash |
| **a returning visitor over a slow link** | **the document from whichever build was cached** |

Measured the same hour: one of five document fetches took **1.84 s** from a wired
connection. Three seconds is not a generous budget on mobile data.

This is the repo's recurring shape one layer further in - correct for every population
we can check, wrong for the one that is most of the users. Its two siblings are
[`sw-navigation-fallback-hijacks-real-pages.md`](sw-navigation-fallback-hijacks-real-pages.md)
(also returning-visitor-only, also invisible to crawlers) and
[`a-deploy-ledger-that-can-disagree-with-the-disk.md`](a-deploy-ledger-that-can-disagree-with-the-disk.md)
(something deciding from remembered state rather than from the thing itself).

## The fix, and why it runs in the service worker

`sw-purge.js`, emitted by `vite.config.ts` and pulled in with `workbox.importScripts`,
drops `ellaz-pages` on `activate` - so a new build empties it.

**It cannot live in the page.** A client stuck on a stale document is running the stale
BUNDLE, so page-side code is the one copy that never gets to run. `sw.js` is always
revalidated, so `activate` reaches even a client a month behind. That asymmetry is the
whole reason for the placement.

**The cost, stated rather than discovered**: a page visited before the deploy is not
available offline until it is visited online once more. The shell at `/` is precached
and unaffected. A page from a build that no longer exists is worth less than that.

## Three ways it rots, so three assertions

`assert-first-visit.mjs` checks that `sw.js` imports it, that the file exists with an
`activate` handler, and that it deletes **`ellaz-pages`** by name - plus that it is not
ALSO precached. The third is the nasty one: a purge naming the wrong cache runs, throws
nothing, logs nothing, and reads exactly like one that works. Four negative controls,
because every assertion here passes vacuously if a regex quietly stops matching.

## Where the file lives, and why not `public/`

`public/` is copied by the STANDALONE build too, and `assert-standalone.mjs` refuses a
service-worker trace inside a bundle uploaded to someone else's origin - correctly. It
is emitted by a plugin the standalone config does not use, so it cannot reach it.

`.htaccess` also names it in the no-cache list: it carries no content hash, and a
service worker fetches imported scripts through the ordinary HTTP cache
(`updateViaCache` defaults to `"imports"`), so the `immutable` rule for `*.js` would
freeze it for a year.

## When to Apply

- Adding any `runtimeCaching` entry - ask what empties it, and say so in the config
- Any report of "I do not see it live" that survives a correct deploy: check the
  returning-visitor path before re-reading the code
- Raising a `maxAgeSeconds`, or lowering a `networkTimeoutSeconds`
- Writing any check that would only ever run against a cold client
