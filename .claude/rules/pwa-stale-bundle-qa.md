# PWA Service Worker Can Serve a Stale Bundle During QA

**Scope**: All QA/eyeballing of production builds of this app.

## Core Rule

The production build registers a service worker (`registerType: "autoUpdate"`, see
`vite.config.ts`). A new deploy activates on the user's **next load** and reloads the
page — but a browser tab already open on the old SW keeps serving the previously
cached bundle until that reload happens. When verifying a fresh build, either:

- run `npm run dev` (no service worker), or
- clear the SW + Cache Storage and reload.

Otherwise you may test STALE code and wrongly conclude "my fix didn't ship".

**History**: this was worse under the earlier `registerType: "prompt"` — with no
visible update UI, returning users were stuck on the old cache forever (they never
saw new games). Switched to `autoUpdate` so updates actually reach players.

## When to Apply

- After `npm run build && npm run preview`, before screenshotting/eyeballing.
- Automated checks (Playwright): unregister SWs + clear caches, then reload.

```js
// clear SW + caches in a browser-automation step
const regs = await navigator.serviceWorker.getRegistrations();
for (const r of regs) await r.unregister();
for (const k of await caches.keys()) await caches.delete(k);
```

## Why autoUpdate (not prompt)

The original choice was `prompt`, on the reasoning that `autoUpdate` (skipWaiting)
could swap the SW mid-game and yank a lazily-loaded game chunk. That traded a rare
mid-session hiccup for a permanent one: with no update UI ever built, returning
players sat on a stale cache forever and never saw new games. `vite.config.ts` has
said `registerType: "autoUpdate"` since then — this section described the old
choice for longer than it was true.

The stale-during-QA behaviour above is unchanged either way, and is still the
trade-off you work around with `npm run dev`.

**Server-side companion**: an `autoUpdate` SW only reaches players if the host
does not cache `sw.js` and `index.html`. Hostinger's default was `max-age=604800`
on both; `deploy/hostinger.htaccess` pins them to `no-cache`. See
[`docs/deploy.md`](../../docs/deploy.md).
