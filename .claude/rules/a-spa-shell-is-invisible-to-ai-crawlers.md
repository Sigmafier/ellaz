---
paths: "**/build/**,**/main.tsx,index.html,**/scripts/**"
---

# A Client-Rendered Page Is a Blank Page to Every AI Crawler

**Scope**: Any route in this app that boots React rather than being an emitted document.
**Origin**: 2026-08-11. `https://ellaz.fun/` — the canonical entry, the `x-default` target and the most-linked page on the site — served a 29-byte body to every crawler, and had done for months.

## Core Rule

**Googlebot renders JavaScript. No answer engine does. A page whose content only
exists after React mounts ranks normally in Google and is simply absent from
ChatGPT, Claude, Perplexity and Copilot — permanently, with no error anywhere.
Any route that matters for search must carry its content in the HTML on the
wire, not in the bundle.**

The measured before:

```html
<body class="app-shell">
    <div id="root"></div>
</body>
```

29 bytes. Zero words, zero headings, zero links — on a site whose entire SEO
thesis is that Hebrew is the primary language, while `/en/`, an emitted
document, served 252 words and 26 links the whole time.

## The evidence, because "Google renders JS" makes this sound fine

- Vercel's analysis of over 500 million GPTBot fetches found **zero evidence of
  JavaScript execution**. GPTBot fetched JS files in ~11.5% of requests and ran
  none; ClaudeBot downloaded JS in ~23.8% and ran none.
- Anthropic's own documentation states the web fetch tool "does not support
  websites dynamically rendered via JavaScript".
- These crawlers do not wait for rendering and do not retry. They fetch raw HTML,
  take what is there, and move on.

So the failure is not "indexed more slowly". It is **invisible to answer engines
while looking healthy in Google**, which is exactly why nobody noticed.

## Why every check in this repo reported green

Same shape as the bot challenge and the deploy ledger, and the third instance of
it here:

| Check | Result while `/` was empty |
|---|---|
| `npm run build` / `build:check` | green — they read `dist/`, which was correct |
| `assert-pages.mjs` | green — `/` is not an emitted page, so it is not in its population |
| `assert-crawlable.mjs` | green — it asserted status codes, and `/` was a healthy 200 |
| `curl https://ellaz.fun/` | 200, correct document, correct head tags |
| A browser | perfect |

Note the second row especially. The gate that checks page content **deliberately
excludes `/`**, because `/` is the app and not an emitted document. The one page
with no content was the one page the content gate could not see.

## The fix, and the two things that make it not-cloaking

`src/build/pages.ts` `transformIndexHtml` injects `homeShellBody()` — the same
copy, the same games, the same order the grid renders — as a **sibling before
`#root`**, and `src/main.tsx` removes it on mount.

1. **It is a faithful mirror.** Everything emitted is what the app shows once it
   boots, in the same language. That is progressive enhancement, which is what
   Google's JavaScript SEO guidance asks for. Emitting content the app does not
   show would be the actual violation.
2. **It is removed, not hidden.** Hiding it with CSS leaves a permanent duplicate
   of every game link in the DOM, which is how one mirror becomes two sources of
   truth. A visitor with no JavaScript never reaches the removal and keeps the
   document, which is the point.

**Sibling, never a child of `#root`.** A node React does not know about, inside
the container it reconciles, is `react-nested-root-teardown.md` in a different
costume — `#game-poster` has sat beside `#game-frame` for exactly this reason on
44 pages.

## The shell's own CSS is wrong for a document

`body.app-shell { overflow: hidden; height: 100% }` is correct for an application
that manages its own scroll regions, and the comment above it in `global.css`
already says what it does to a document: every word below the fold becomes
unreachable by scroll while a crawler reads the page perfectly. A no-JavaScript
visitor never gets the removal, so for them the emitted home **is** the page and
it has to scroll.

Scoped with `:has(#home-doc)` rather than a class the runtime must strip, so the
override disappears the instant the node does and there is nothing to keep in
sync.

## The gate

`build.test.ts` § "the Hebrew home is a document, not an empty shell" asserts an
`h1`, one link per catalogued game, a word floor, sibling placement, and correct
links under **both** bases. `transformIndexHtml` throws if the `#root` marker
ever stops matching, so the document cannot vanish silently.

Mutation-proven by planting the pre-fix emitter: 4 of 5 went red. **The fifth is
the lesson** — the sibling-ordering test used `indexOf(...) < indexOf(...)`, and
`indexOf` returns `-1` when the document is absent, so it reported green over the
exact absence it existed to catch. It now asserts presence first. A gate nobody
has watched fail is not a gate.

## When to Apply

- Adding any route that boots the app instead of being an emitted document
- Any claim that a page is "fine for SEO because Google renders JavaScript"
- Reviewing a content or crawl gate: ask which pages are **excluded** from its
  population, because that is where this hides
- Debugging "we don't show up in ChatGPT/Perplexity" while Google traffic is fine

## How to check, in one command

```bash
GB="Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
curl -s https://ellaz.fun/ -A "$GB" \
  | sed 's/<script[^>]*>.*<\/script>//g; s/<[^>]*>/ /g' | wc -w
```

A word count near zero on any indexable route is this bug. Never check in a
browser — the browser runs the JavaScript that the crawler will not.

## Related

- [`a-bot-challenge-at-the-edge-is-invisible-from-your-browser.md`](a-bot-challenge-at-the-edge-is-invisible-from-your-browser.md)
  — a 403 to every crawler beside a perfect browser experience.
- [`a-deploy-ledger-that-can-disagree-with-the-disk.md`](a-deploy-ledger-that-can-disagree-with-the-disk.md)
  — a 200 document whose JavaScript 404s is a blank page, and a status sweep
  cannot see it.
- [`sw-navigation-fallback-hijacks-real-pages.md`](sw-navigation-fallback-hijacks-real-pages.md)
  — the exact mirror image: correct for crawlers, broken for returning visitors.
- [`react-nested-root-teardown.md`](react-nested-root-teardown.md) — why the
  emitted block is a sibling.
