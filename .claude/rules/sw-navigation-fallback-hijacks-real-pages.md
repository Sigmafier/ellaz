# A PWA Navigation Fallback Answers Every URL, Including the Ones You Just Built

**Scope**: Any change to `workbox` config, routing, or the set of real documents this site emits.
**Origin**: 2026-08-04, emitting the 46 content pages. Found by probe before anything shipped.

## Core Rule

**`vite-plugin-pwa` defaults `navigateFallback` to `index.html`, which registers a workbox
`NavigationRoute` with no denylist. From that moment the service worker answers EVERY
navigation with the app shell — so a real page at `/games/snake/` reaches crawlers and fresh
browsers correctly, and reaches a returning visitor as the home page.**

It is `navigateFallback: undefined` in `vite.config.ts` and it must stay that way.

## Why this is the worst shape of bug this project produces

The failure is scoped to exactly the people you cannot see:

| Who | What they get |
|---|---|
| Googlebot, Bingbot, every AI crawler | the right page |
| A fresh browser, an incognito window, a curl | the right page |
| A Playwright run that clears storage first | the right page |
| **Anyone who has visited the site before** | **the home page, at every URL** |

Every automated check you would think to write passes. `curl` passes. The build passes. The
only way to see it is to load the site, wait for `navigator.serviceWorker.controller`, and
*then* navigate — which is why `docs/deploy.md` says to do exactly that.

## The denylist is not the fix

The obvious repair is `navigateFallbackDenylist` with a regex per page family. It fails the
same way this project's other silent bugs fail: a path you forget stays hijacked, and the
symptom is invisible. The regexes also have to carry the base, so the Pages build needs a
different denylist from the Hostinger build, which doubles the chances of getting it wrong.

Undefined cannot serve the wrong document because it serves none.

## What replaces it

Offline navigation moves to a `runtimeCaching` rule matching `request.mode === "navigate"`,
`NetworkFirst` with a 3-second timeout. The network decides what a URL means; the cache
answers only when the network cannot. A page is cached as it is visited rather than
pre-emptively, which is also why the 46 pages are in `globIgnores` — precaching them would put
roughly a megabyte of prose in front of a child who has not picked a game yet.

`scripts/assert-pages.mjs` asserts three things about the built `sw.js`, and each has been
mutation-proven to fail when planted:

- zero occurrences of `NavigationRoute`
- the `ellaz-pages` runtime cache exists, so offline navigation was not simply deleted
- no emitted page appears in the precache manifest

## When to Apply

- Touching `workbox` config, or upgrading `vite-plugin-pwa` (a default can come back)
- Adding a new family of real URLs
- Any report of "the game page shows the home page" — check whether the reporter is a
  returning visitor before looking at the server

## Related

- [`precache-glob-sweeps-new-chunks.md`](precache-glob-sweeps-new-chunks.md) — the other half
  of the same config, and the same class of green-build failure.
- [`pwa-stale-bundle-qa.md`](pwa-stale-bundle-qa.md) — why a returning visitor is a different
  test subject from a fresh one.
- [`verify-the-deploy-target-not-just-the-run.md`](verify-the-deploy-target-not-just-the-run.md)
  — verify the artifact a person receives, not the run that produced it.
