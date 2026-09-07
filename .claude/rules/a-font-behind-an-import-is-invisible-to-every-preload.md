# A Resource Reached Through `@import` Is On the Critical Path and Invisible to Every Preload

**Scope**: Every render-blocking stylesheet this repo ships, and anything reached from
inside one - a webfont above all, but equally an icon sheet, a theme file, a vendor CSS.
**Origin**: 2026-09-07. PageSpeed reported 350 ms (desktop) and 1,300 ms (mobile) of
blocked render on `fonts.googleapis.com`, and the home page's `<head>` did not mention
fonts at all. Both statements were true.

## Core Rule

**A URL inside a stylesheet cannot be discovered until that stylesheet has downloaded AND
parsed. So an `@import` does not merely add a request - it adds a request that starts
late by construction, that no `<link rel=preload>` can pull forward and no `preconnect`
can warm, because nothing in the document has ever seen the URL. If a resource is needed
for the first paint, it is named in the document's own head. There is no second way.**

## What it cost here

```
BEFORE - five serial hops, mobile, measured
  ellaz.fun                 301 ms
    -> index-*.js           366 ms
      -> shell-*.css        399 ms
        -> css2?family=     432 ms   <- one line of CSS, discovered only here
          -> woff2 x3   499-560 ms
                                      render blocked 1,300 ms
                                      LCP 4.2 s, of which 2,440 ms
                                      was render delay on a 0 ms TTFB

AFTER - named in the head, fetched from our own origin
  ellaz.fun                 301 ms
    -> index-*.js        \
    -> shell-*.css        |  in parallel, same origin,
    -> heebo-<hash>.woff2 |  connection already open
                                      render blocked ~0 ms
```

The line was `src/ui/global.css:5`. It had been there for months.

## The three things that made it invisible

**1. Every gate was green, correctly.** `npm test`, `build:check`, `assert-payload`,
`assert-first-visit`, `assert-pages`, `assert-crawlable` and `assert-live` all passed
over this every day. They read `dist/`, the chunk graph, the emitted documents and the
live asset hashes. **Not one of them reads the first line of a stylesheet, and not one
reads the SHAPE of a served `<head>`.** The absence was the defect, not the `@import`.

**2. The audit's own wording pointed away from it.** Lighthouse listed a render-blocking
request to `fonts.googleapis.com` and, three panels down, *"no origins were
preconnected"* - while `layout.ts` plainly emitted a `preconnect`. Reading the source
made the report look wrong. Reading `curl https://ellaz.fun/` settled it in one command:
the app shell is not a content page and received neither tag. **Assert against the served
bytes; the source can be right about a page this page is not.**

**3. There were two font paths and they disagreed.** `layout.ts` emitted a `<link>` for
content pages only; `global.css` `@import`ed the same URL for everyone. So a game page
loaded the same two families TWICE, over two origins, and the home page loaded them by
the one path nothing could optimise. Two mechanisms for one job is one more than anyone
re-reads.

## What to do instead

- **Name it in the head.** `<link rel="preload" as="font" type="font/woff2" crossorigin>`,
  emitted by the module that owns `<head>`, with the hashed filename read out of the
  bundle - never rebuilt by hand (`resolveFontAssets`, beside `resolveLazyChunks`, for the
  same reason).
- **`crossorigin` is mandatory on a font preload.** Fonts are fetched in CORS mode
  whatever their origin, so a preload without it is fetched in a *different mode* from the
  `@font-face` request that follows: the browser cannot match them, downloads the file
  twice, and the preload costs bytes instead of saving time.
- **Preload the subset the page actually draws, and only that.** `unicode-range` lets the
  browser choose; a preload has no such discretion. The wrong subset is a download the
  page never uses *plus* the one it needs still arriving late.
- **Preload the BODY face, not every face.** Here Fredoka's Latin subset alone is
  29,704 B - larger than the body face - because it carries a whole 300-700 variable axis
  for headings. It is declared in CSS and arrives under `font-display: swap`.
- **Check `globPatterns` before adding any asset type.** This repo's workbox glob already
  swept `**/*.woff2`, so self-hosting without a matching `globIgnores` would have
  precached all 99,988 B - every subset, including the two a given reader never draws -
  and bought nothing behind a green build.

## The gate

`npm run assert:fast` reads the **served** bytes of three page shapes and reds on a
third-party `@import` in a blocking stylesheet, a third-party blocking stylesheet, a
non-deferred third-party script in `<head>`, and a page whose body face is not preloaded.

It was written **before** the fix and watched reporting 11 failures across 3 pages
(`docs/perf/assert-fast-before-2026-09-07.md`), because a gate first run after the fix
cannot be told apart from a gate that never fires. Its controls include the near-misses
that matter: a first-party `@import` (this repo really has one - `global.css:1` imports
`./tokens.css`) and a deferred third-party script must both stay silent, or the matcher
is just banning `@import`.

**And its first version truncated its own evidence.** The matcher stopped at the first
`;`, which is a legitimate CSS terminator and also a character inside the value -
`wght@400;600;800` - so it printed `…css2?family=Heebo:wght@400` and silently dropped two
weights and a whole second family. Fixed, and pinned by a control asserting the URL is
reported whole. See
[`a-diagnostic-that-truncates-what-it-compares.md`](a-diagnostic-that-truncates-what-it-compares.md).

## When to Apply

- Adding any `@import` to any stylesheet - ask whether the thing imported is needed for
  the first paint
- Adding a webfont, an icon font, a vendor stylesheet, a theme file
- Reading a performance audit that names a request you cannot find in the head: fetch the
  head, then fetch the stylesheets it names
- Any second mechanism for a job one mechanism already does

## The tell

A performance report naming a third-party request, and a `grep` of the source that finds
the right tag in the wrong file - or finds nothing at all.

## Related

- [`a-diagnostic-that-truncates-what-it-compares.md`](a-diagnostic-that-truncates-what-it-compares.md)
  - the gate written for this rule joined that family before it left the room.
- [`precache-glob-sweeps-new-chunks.md`](precache-glob-sweeps-new-chunks.md) - the same
  shape one layer out: a new asset type swept into the precache behind a green build.
- [`a-generator-of-committed-literals-lives-beside-them.md`](a-generator-of-committed-literals-lives-beside-them.md)
  - `src/ui/fonts.css` and the six woff2 are emitted, so `scripts/fonts/sync-fonts.mjs`
  ships beside them with a `--check` that was watched failing on a one-byte flip.
- [`a-comment-that-explains-a-cost-must-name-its-measurement.md`](a-comment-that-explains-a-cost-must-name-its-measurement.md)
  - every byte figure quoted here was measured on 2026-09-07, and the generator prints
  them again on every run rather than leaving them to rot in prose.

---

**Last Updated**: 2026-09-07 (origin)
