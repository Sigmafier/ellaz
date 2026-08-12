# An Emitted Page Served Straight Out of the Renderer Boots Nothing in Dev

**Scope**: `src/build/pages.ts` `configureServer`, and any future dev middleware that answers a URL with HTML.
**Origin**: 2026-08-04, the first time a person opened `/boards/` in a browser.

## Core Rule

**Dev middleware must return `await server.transformIndexHtml(url, html)`, never the rendered
string. `@vitejs/plugin-react` injects a react-refresh preamble into every document it
transforms, and the modules it generates assert that preamble exists. A page that skips the
pipeline throws `@vitejs/plugin-react can't detect preamble` on the first component it
evaluates, and nothing mounts.**

## Why it survived every gate

The failure is dev-only, content-page-only, and silent in exactly the places we look:

| Where | What it looked like |
|---|---|
| `npm run build` + `assert-pages.mjs` | green - production has no preamble, so the artifact is genuinely correct |
| `build.test.ts` | green - it tests the generator, which emits the right string |
| `curl` of the dev page | perfect HTML, script tag present, correct `data-page` |
| `/` in dev | perfect - the app shell DOES go through the pipeline, because Vite serves it |
| A person opening `/games/snake/` | the no-JavaScript poster, forever |

So the one visible symptom is the emitted fallback doing its job: **"המשחק דורש JavaScript"
on a page where JavaScript is running fine.** Read that sentence as "the runtime never
reached this poster", not as "the browser has no JavaScript".

Every game page, the room and the boards were affected the whole time the emitted-pages work
had existed. Nobody had opened one in dev.

## Do not paste the preamble in

The obvious repair is to inline the six lines of `import RefreshRuntime from "/@react-refresh"`
into the emitted head. That is a copy of a plugin's private detail, in a second place, which
goes stale on a plugin upgrade with the same silent symptom. Call the pipeline instead - it
also gives content pages HMR, which they previously did not have.

## The other half: once they go through the pipeline, EVERY html hook sees them

Sending the emitted pages through `transformIndexHtml` is correct and it has a consequence
that arrives months later, in a different file. **Every `transformIndexHtml` hook in the
config is now handed 78 documents that are not the app shell** - and a hook written for
`index.html` will happily do index.html things to a game page.

2026-08-12, and it was found by opening a page rather than by any gate: the home-document
emitter (added for the AI-crawler fix) asserts `index.html` contains `<div id="root"></div>`
and throws if it does not. A game page contains `#game-frame`, not `#root`. So **every
content page in dev answered 500** - all 78 - while production was perfectly correct,
because at build time that hook runs exactly once, for index.html.

```ts
transformIndexHtml(html, ctx) {
  if (ctx.path !== "/index.html") return html;   // the shell, and nothing else
```

**`/index.html` is the path in both environments** - measured, not assumed. Dev normalises
`/` to it; the build reports it under either base; a content page reports its own URL.
Guess at this and you get a guard that is correct in one environment and absent in the other.

The general form, worth carrying to the next hook: **a build-time hook that becomes a
dev-time hook stops being able to assume what it is looking at.** Scope on the ctx, not on
the content - scoping on "does this html have a `#root`" would have silently skipped the
shell too, the day the mount point moved, which is the exact failure the throw exists to
prevent.

## When to Apply

- Adding any dev middleware that answers a URL with HTML
- Adding any `transformIndexHtml` hook - scope it before you write its body
- A page that renders its prose correctly but never mounts its React island
- Every content page 500ing in dev while `npm run build` is green
- Upgrading `@vitejs/plugin-react` or `vite`

`build.test.ts` § "the dev middleware" pins it: every emitted page goes through
`transformIndexHtml`, `/` and unknown paths fall through untouched. Mutation-proven by
restoring the direct `res.end`.

## Related

- [`sw-navigation-fallback-hijacks-real-pages.md`](sw-navigation-fallback-hijacks-real-pages.md)
  - the same shape one layer out: correct for crawlers and fresh browsers, broken for the
  people who actually use the site.
- [`pwa-stale-bundle-qa.md`](pwa-stale-bundle-qa.md) - the other reason a working fix looks
  un-shipped in a browser.
