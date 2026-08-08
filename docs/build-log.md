# Build log — what shipped, in order, with the numbers

A durable record of the platform arc, written so a later session can pick it up
without re-deriving anything. Each entry states what changed, the measurement
that proves it, and the trap it cost — because the traps are the part that does
not survive in a git log.

Git history is the source of truth for *what*; this file is the source of truth
for *why*, and for numbers that were measured once on a live artifact and are
expensive to re-measure.

**Status at the last entry**: `main` @ `4ffd75f`, deployed and verified live.

---

## Wave A — halve the first visit

**Commits**: `e3c60c8..3d401b8`, then `e46b02e`, `c502966`, `45e4b1d`.

Half of what a child downloaded before seeing anything was PostHog — a library
whose main features (session replay, surveys, autocapture, toolbar) this
platform forbids itself from using, all shipped and all disabled at runtime.

`src/sdk/analytics.ts` now `import()`s it after first paint, behind a bounded
queue (cap 50, drop oldest). Both export signatures are byte-identical, so not
one call site changed.

| | Before | After |
|---|---|---|
| First visit (gz) | 143,234 B | **69,624 B** (−51.4%) |
| Shell chunk (gz) | 87,636 B | 13,080 B |
| Precache manifest | 431.89 KiB | 214.56 KiB |

Measured on a clean `git archive HEAD` tree and then re-verified on the served
artifact — the live `shell-B3-L-mvZ.js` hash matched the clean build exactly.

### What it cost, and what is now written down

- **A lazy import is three changes, not one.** The precache glob is
  `**/*.{html,css,js,svg,woff2}`, so a new chunk is precached by default. The
  dynamic `import()`, a *named* `manualChunks` branch, and a matching
  `globIgnores` entry all have to land together. Skipping the third moves bytes
  between requests and leaves the first visit exactly as heavy — behind a green
  build. → `.claude/rules/precache-glob-sweeps-new-chunks.md`
- **`globIgnores` governs only one of the two delivery paths.** A module-scope
  `lazy(() => import(…))` stays in the production module graph even when the
  branch that renders it is statically dropped, and Vite writes a
  `<link rel="modulepreload">` for it. That is a download, not a hint. The
  dev-only Juice Lab shipped 27 KB gz to every child that way until `c502966`.
- **A denylist gate cannot catch this.** A chunk with no `manualChunks` branch
  is named `module-<hash>.js` — exactly the failure mode, with no prefix to
  match. The first version of the gate printed `OK` over 222 KiB of PostHog.
  `scripts/assert-first-visit.mjs` is an allowlist, and it mutation-proves its
  own matcher on a planted manifest before trusting a pass.
- **Analytics has never run in production.** `VITE_POSTHOG_KEY` is unset, so
  Vite substitutes an empty string at build time, `if (!key) return` is always
  true, and the whole init is dead-code-eliminated. Verified against the live
  bundle: `person_profiles:"never"`, `capture_pageview:!1` and `respect_dnt:!0`
  all occur zero times. Every event since launch was discarded, which is why
  economy tuning from `reward_grant` has never had data.

**Parked, on measured grounds**: porting snake off Phaser contributes **zero**
to the first visit — `vendor-phaser-*` is already lazy and already excluded.
It is still worth doing (379 KB off snake players, one dependency gone, snake
joins the shared difficulty row, the sprite/"איטי" overlap bug disappears), but
it is not a payload fix and was never the halving.

---

## Wave B — the score contract

**Commits**: `45d2713`, `8a42b97`, `80d130a`, `a284354`, `b2f92f7`, plus docs.

Before this, six games each kept their own bare `best` in storage and the SDK
had no idea what a score was. Now a game reports a **value and a unit**
(`points` / `ms` / `moves`) and `src/sdk/score.ts` alone decides how that ranks.

**There is no `direction` parameter and there must never be one** — it would let
a game report `unit: "ms"` with `direction: "high"` and rank its slowest run
first, with nothing but code review in the way. Same reason `grant()` takes a
reason rather than a coin amount.

**Coverage: 20 of the 21 games.** Coloring gets none, ever — ranking a child's
drawing is the opposite of this platform's premise. That is the whole roster, so
a game without a record is now a bug rather than a gap.

Full rule, the per-difficulty board table, and the traps:
[`.claude/rules/score-contract-convention.md`](../.claude/rules/score-contract-convention.md).

### What it cost

- **`ms` on `winMoment` is a duration.** It feeds
  `analytics.levelComplete(level, ms)`. Memory was passing `ns.moves` and
  finddiff `ns.misses`, so a 14-move game would have been logged as a
  14-millisecond one. Dormant only because analytics has never run. A game with
  no clock now omits `ms` entirely — "not measured" is honest.
- **evolve was covered all along and every doc said otherwise.** It has no
  renderer of its own; it renders `n2048`'s component under its own game id, so
  it got its own storage namespace and its own board for free. The published
  "11 of 21" figure was wrong the moment it was written.
- **A stored `0` reads as no record, not a record of zero.** All six legacy
  games initialised `best` to 0 meaning "none yet". Taking that literally is
  harmless noise in a points game and fatal in a timed one, where a best of 0 ms
  could never be beaten. The `legacyKey` shim is read-through only, and it has a
  kill date.
- **finddiff records scenes cleared, not the "Level" it displays.** Level only
  bumps after a full pass through every scene, so recording it would leave most
  players a permanent record of 1.
- **An empty record can be correct.** tictactoe's hard AI is unbeatable minimax,
  so a player may honestly never set a record there.

### The verification detour worth remembering

After deploying, the live shell hash did not match a local build — which looks
exactly like a failed deploy. The entire difference was `try{}catch{}` versus
`try{const n=""}catch{}`, one build-time constant, with the minifier renaming
four variables downstream of it.

**Corrected 2026-08-04, by measurement.** This section used to say CI passes the
key as an empty string, so reproducing a CI artifact required setting
`VITE_POSTHOG_KEY=""`. The artifact says the reverse. A local build with
`VITE_POSTHOG_KEY=""` emits `const n=""`; the deployed shell has no such
constant, which is what Vite writes when the variable is **absent** rather than
present-and-empty. Both workflows do pass `VITE_POSTHOG_KEY: ${{ secrets.… }}`,
but with the secret undefined the variable does not reach the build at all.

So: **to reproduce a CI artifact locally, leave the var UNSET** —
`env -u VITE_POSTHOG_KEY npx vite build`. Verified byte-for-byte on 2026-08-04
against the live `shell-C7VlYQOC.js` and `cloud-CYSAdfXq.js`; the `""` arm
reproduced neither.

The wider lesson is the one that keeps repaying: the hash mismatch cost a
verification detour on two separate days, and both times the cheap move was to
diff the two files and read the first differing offset rather than to reason
about the build. It took one command and named the cause exactly. Once the
constant disappears, every downstream name shifts and one lazy chunk's hash
changes, which changes the dependency map embedded in the shell — so a one-token
difference reliably presents as "nothing matches".

**A hash mismatch is not evidence of a failed deploy.** Verify by content, then
find the constant.

---

## The Firebase project (2026-08-03)

`.firebaserc` had named `ellaz-games` since long before the project existed, so
the "legacy Firebase target" escape hatch in CLAUDE.md would have failed if
anyone had used it. The project is real now: number `93565492047`, Firebase
added, a web app, Firestore Native in **me-west1 (Tel Aviv)**, Anonymous
sign-in on. It backs the players and boards work — the live site stays on
Hostinger.

**It has no billing account, and that is the whole cost guarantee.** See the
Firebase section in [`CLAUDE.md`](../CLAUDE.md) for the rule and the trap that
tries to get you to break it.

### What creating it cost

- **The Firebase Management API refuses mutating calls from gcloud's OAuth
  client**, even as project owner with `cloud-platform` scope. Reads 404
  correctly; writes 403. The write path needs a service account — reached by
  **impersonation, never a downloaded key**. `serviceUsageAdmin` was granted for
  the one-time API enable and removed afterwards; the bootstrap SA now holds
  only `firebase.admin` + `serviceUsageConsumer`.
- **`identityPlatform:initializeAuth` answers `BILLING_NOT_ENABLED`** because
  that API is the paid Identity Platform product, while the console toggle for
  the identical feature is free Firebase Auth. The error means "use the
  console", never "enable billing".
- **Firestore location is permanent.** It was created in `eur3` because a
  `head -10` truncated the location list and made Tel Aviv look unavailable. An
  explicit `grep -c me-west1` returned 1. The database was empty, so it was
  deleted and recreated in `me-west1` — a 275 s cooldown before `(default)`
  frees up. That was the only window to fix it.

---

## Wave C step 1 — the player has a name

**Commit**: `4777ce8`.

A pool of 16 adjectives × 20 animals, stored on the profile as two **word ids**
and rendered per locale, shown on the World screen with a reroll button. Local
only: no Firebase, no new dependency, nothing over the network. Wave C step 2 is
the anonymous uid and cloud sync; this ships and works without it.

The design rule and its traps live in
[`name-pool-convention.md`](../.claude/rules/name-pool-convention.md). The short
version: no child ever types a name, which removes moderation entirely; ids
rather than a string, so a name survives a language switch; and Hebrew
adjectives agree with their noun and follow it, so an English-shaped
adjective+noun pool gets both the order and the gender wrong.

**Cost: +2,135 B gz on the first visit** (69,624 → 71,759), measured on a
key-matched arm — both arms treated the key the same way, which is the part that
matters. (Which way that is, is the corrected note above: to match CI, unset it.
A single arm set to `""` is still a valid A/B, it just is not the CI artifact.)

### The optimisation that the measurement killed

The obvious response to that cost was to make the World a lazy route — it is a
secondary screen holding 327 lines of inline SVG, so the estimate was 4-6 KB gz.

**Built it and measured: the World chunk is 4,390 B raw, and the first visit
drops only 1,005 B gz.** Reverted.

Two things the probe established, both worth not re-deriving:

- **`Home.tsx` imports `world/Scene`** to preview the child's room on the home
  screen, so `art.tsx` and `items.ts` are in the shell regardless of what
  happens to `World.tsx`. Lazy-loading the World can never move them.
- **Vite did NOT write a `modulepreload` for the World chunk.** `index.html`
  still listed exactly three eager assets. That is worth knowing because the
  comment above the Juice Lab guard in `App.tsx` says a module-scope
  `lazy(() => import(…))` gets one — true in that case, not universally. Verify
  on the artifact, as that comment itself instructs.

1 KB gz was not worth putting a spinner in front of a screen children open
deliberately.

## Wave C step 2a — progress leaves the device

**Commit**: `04bfd6d`.

Anonymous auth plus one Firestore document per player, reached with `fetch`.
A backup code is shown in the World; entering it on another device brings the
room across.

### No Firebase SDK, on purpose

`firebase/app` + `auth` + `firestore` is roughly 150-200 KB gz even tree-shaken
— close to **three times this app's entire first visit**, which the previous two
waves were spent halving. What the platform needs from it is: sign in
anonymously, read one document, write one document. All three are ordinary REST
calls, so they are ~250 lines of our own code and **zero dependencies**. The
SDK's real value is offline persistence and realtime listeners, and neither is
wanted here — `localStorage` is already the offline store, and a board that
updates on open is the better product anyway.

The client lands in a lazy `cloud-*` chunk (the same three coordinated changes
as PostHog) and is not fetched at all until the player has something worth
saving, so a first-time visitor who bounces makes no request and mints no
account.

### What it is not

**A backup and a transfer, not live two-way sync.** Restoring copies progress
across; from then on the two devices drift apart again. Merging two
independently-earned coin balances correctly needs per-device counters the
profile does not carry (a PN-counter: each device increments only its own entry,
so a merge is a per-key max and the totals stay exact). Shipping a
plausible-looking merge instead is how coins quietly vanish, which is the exact
failure the wallet's rollback discipline exists to prevent. That is step 2b, and
the UI says what it does rather than implying more.

### Why there is a code at all

Anonymous identity lives in the browser's own storage, so "clear browsing data"
destroys the key to the cloud copy at the same moment it destroys the local one.
**Nothing inside the device can survive that.** So the app asks for a piece of
paper and explains why.

The alphabet is Crockford base32 without I, L, O and U — the first three because
a handwritten `1` and `I` are the same mark, and U so eight random characters
cannot spell something a parent then has to explain. Reading a code back
**repairs** those confusions rather than rejecting them.

### Verified against the real project, not just the tests

The unit tests drive a fake backend, which proves the logic and nothing about
the URLs, the auth, or the rules. `npm run probe:cloud` drives the live project:
**12/12**, with a **positive control on every negative** — owner *can* write,
stranger *can* read — so a rule that refused everyone could not pass it. A
stranger gets 403 overwriting progress and 403 repointing a code; an
unauthenticated reader gets 403.

Two things that only a live probe could have caught:

- **Firestore had no rules release at all.** The database was created by API and
  nothing had ever been published, so every client call would have been denied.
  Rules are released through the Firebase Rules API, **not by this repo's CI**,
  which means a `firestore.rules` edit that was never released is invisible from
  the source tree. That is why the probe exists and why it should be re-run after
  any rules change.
- The client builds **masked** PATCH URLs (`?updateMask.fieldPaths=…`) while the
  first probe used unmasked ones. Those were driven against live Firestore
  separately before being trusted.

## Wave D — the boards (2026-08-04 → 2026-08-07)

Shipped in four steps: the write side dark, the read side plus the
no-last-place rule, a real URL and screen, then the layout the operator
actually chose. The first three are recorded in the plan's checkpoint log; what
follows is the part with numbers worth keeping.

**The rule the code enforces.** `sdk/standing.ts` decides what may be said about
a player's position, and `own` — the child's own best, nothing about anybody
else — is the COMMON case, not a consolation prize. A rank is earned: it must be
both a low number and a top tenth, because 10th of 12 is the bottom of the board
wearing a rosette. Impossible counts resolve to "say nothing" rather than a
guess.

**The screen was wrong in a way no test could see.** It laid all twenty games
out in one non-wrapping flex row: **1,410px of buttons inside a 390px phone**,
clipped by `#game-frame`'s own `overflow: hidden`. Not scrolled off — clipped,
with nothing to scroll. **Fifteen of twenty games were unreachable.** The page
itself never overflowed, so a document-level check reported clean, and an empty
profile hides it completely. Three identically-styled pill rows sat above it,
none saying what it picked.

Measured before touching anything, on the live site with a seeded player:

```
frame 390px · row 1410px · reachable 5 of 20 · pageOverflowX false
```

**What replaced it**, after the operator picked from an interactive mock: the
boards open on the player's own games as cards, each already carrying their
best, and a tap opens that game's board with the difficulty and time rows
labelled and a button straight into playing it. The grid earns the first screen
— a control panel tells a player nothing until they operate it, while twenty
cards with their own records on them are already an answer. And a record finally
has a route back to the game it came from, which is what a leaderboard is for.

Verified on the built artifact and then on ellaz.fun itself, not on the green
tick: 20 cards, **0 elements wider than the frame**, no page overflow, at 390px
and 664px and in English, with the play link resolving to `/games/<id>/` and
`/en/games/<id>/`.

**Traps this cost:**

- **A test that could not fail.** The guard meant to stop the card and the board
  quoting different records compared `cardBest(g, recs)` to a re-derivation that
  also called `firstBoard` — both sides route through the same helper, so it was
  satisfied by definition. Replaced with concrete values plus a source-scan that
  forbids the inline `game.boards[0]`, mutation-proven by planting exactly that.
- **A case-insensitive filesystem.** `GameArt.tsx` beside `gameArt.ts` is the
  same path on `/mnt/c`; the import resolved silently to the SVG module. The
  component is `gameArtView.tsx`.
- **Formatter churn.** `npx prettier --write` reformatted 164 lines of
  `Home.tsx` that had nothing to do with the change — this repo has no prettier
  config and never did. Reverted.

**First visit 80,345 B gz of an 82,000 ceiling (98%).** The redesign adds 302 B;
a clean baseline built at the parent commit read 80,043. The headroom problem
predates this work and is the next thing to look at.

## The site was uncrawlable and looked perfect (2026-08-08)

Google Search Console: **"Sitemap could not be read", 0 discovered pages.** The
site loaded correctly in a browser, every gate was green, and the sitemap was
valid.

Hostinger's CDN had **"I'm Under Attack!"** mode enabled. That mode answers every
request with a SHA-256 proof-of-work in JavaScript. A browser solves it in a few
seconds and the visitor never notices; a crawler cannot solve it and gets HTTP
403 with an HTML body where the XML belongs. Both were true of the same URL at the
same instant.

**Nothing in this repo could have caught it.** Every gate here asserts against
`dist/` — `build:check`, `assert-pages.mjs`, `assert-first-visit.mjs`,
`build.test.ts`. None asserts against what a crawler receives over the network,
and that gap is exactly the size of this bug.

### What found it

- **The first request.** `curl` returned `403 content-type: text/html` where XML
  belonged. No browser could ever have produced that.
- **`HEAD` 200 vs `GET` 403**, six each — which proves origin and file are healthy
  before knowing anything about the vendor.
- **The block page's own `<title>`**, byte-identical to Hostinger's documented
  Under Attack interstitial. That turned "some bot protection" into a named toggle
  with a known location.

### What it cost

- **A wrong conclusion from single samples.** A 7-cell matrix showed 403 with
  `Accept-Encoding` and 200 without, and read as content negotiation. Ten
  repetitions per cell showed 403 everywhere: the IP had crossed the challenge
  threshold mid-matrix and the cell order made the flip look like a variable.
- **The probe was the trigger.** ~40 requests in two minutes from an ordinary home
  IP flagged it permanently. That is the mechanism, not an aside — **a crawler
  reading a sitemap and then its 48 URLs makes exactly that shape**, which is why
  a sitemap is the first casualty, and why the Medium default ("challenges
  moderately threatening visitors") suffices to cause this.
- **A poisoned instrument.** Once flagged, every later measurement from that IP
  reported the flag rather than the site. Confirmation needed a vantage point that
  had not been probing.

### After

CDN off entirely — `server: LiteSpeed`, not `hcdn`. Measured on the previously
blocked IP: **50/50 `200`** on a Googlebot burst, **48/48 `200`** across every
sitemap URL, `content-type: application/xml`, XML well-formed with no BOM and
self-referential hreflang on all 48. The `.htaccess` headers now apply directly
and survived: `/`, `/sw.js`, `/manifest.webmanifest` and a game page all still
`no-cache, must-revalidate`, so PWA autoUpdate is intact.

Recovery is Google's own crawl cadence, not instant — GSC retries a failed sitemap
for days, and resubmitting queues a re-read rather than forcing one.

Written down: [`.claude/rules/a-bot-challenge-at-the-edge-is-invisible-from-your-browser.md`](../.claude/rules/a-bot-challenge-at-the-edge-is-invisible-from-your-browser.md).

## Share cards (2026-08-08)

Until today no page carried an `og:image`, so every link shared to WhatsApp — the way
an Israeli parent actually passes a game to another parent — previewed as a bare line
of text. **48 cards now, one per page**, 1200x630, built from the same `gameArt` SVG
the home grid uses. Largest is 39 KB against WhatsApp's 600 KB ceiling; total 1.2 MB
in `dist/`, and **zero effect on the first visit** — PNG is not in the precache glob
(`html,css,js,svg,woff2`) and nothing on the shell fetches them. `twitter:card` moved
to `summary_large_image`.

### Neither renderer does bidi, and both fail silently

The whole shape of `ogCard.ts` comes from this. **`resvg` lays `<text>` out in LOGICAL
order** — "נחש" rasterises as "שחנ", a perfectly clean PNG of nonsense — and
`direction="rtl"` does not fix it. **satori gets it wrong the same way**, and its
`direction: "rtl"` style does not fix it either.

So the visual order is computed by `bidi-js` (UAX#9) before either renderer sees a
character. **Naive reversal is not a substitute and two shipping titles prove it**:
"2048" must not become "8402", and "מה בא אחר כך?" must put its question mark on the
LEFT. Both are pinned in `ogCard.test.ts`.

### What it cost

- **An eyeball check PASSED the bidi bug.** Reading Hebrew glyph order off a rendered
  PNG is not something to trust. It was settled mechanically instead: render each
  glyph alone, match its outline inside the merged path of the full word, sort by x.
- **`gameArt` is a fragment, not a document.** No `xmlns` (implied in HTML, fatal
  standalone — resvg: "the document does not have a root node").
- **An unresolved CSS var rasterises as opaque BLACK.** Every scene ends with
  `fill:var(--art-veil,transparent)`, invisible in a browser because the fallback
  wins. A rasteriser has no custom properties, falls back to the SVG *initial* fill,
  and paints a black rectangle over the whole card. `artSvgSized` resolves the
  fallback and **throws** on any `var()` it cannot.
- **resvg silently drops an SVG nested in satori's `<image>`** — flat colour, no
  warning. The art is rasterised to PNG first.

### Gated

`assert-pages.mjs` checks every page has a card, that it is an absolute ellaz.fun URL,
that the file exists, and that it is **over 4 KB and under 600 KB** — the floor is
what catches a flat-colour card, which is exactly how the black-rect bug looked.
The 404's *absence* of a card is asserted rather than skipped. Mutation-proven three
ways against a real `dist/`: deleted card, truncated card, stripped tag. 13/13
negative controls fire.

## Telling crawlers what CHANGED (2026-08-08)

Two surfaces, one idea: say what moved, and never claim everything moved.

**`<lastmod>`, derived from git.** 48 rows where there were none, resolving to **4
distinct dates** off real commit history. The obvious implementation is the wrong
one — stamping build time on all 48 says "every page changed" on every deploy, which
is false for 47 of them and teaches Google the field is noise. It is discounted, and
it does not come back.

**And the obvious implementation fails silently in CI.** `actions/checkout` clones at
depth 1, so `git log` sees one commit and returns the SAME timestamp for every path —
the build-time bug in a disguise, on the one machine that publishes. Both deploy
workflows now set `fetch-depth: 0`; `lastmod.ts` detects a shallow clone and **omits
the field** rather than lying; and it omits it again if all games resolve to one date,
which is the backstop for the day someone removes the setting. `assert-pages.mjs`
fails the build on 48 identical dates.

Every failure path here omits rather than guesses. A sitemap without `<lastmod>` is
valid and is what this site shipped for months. One where all 48 agree is a lie.

**IndexNow.** ChatGPT Search and Copilot lean on Bing's index, so absence from Bing is
absence from the answer engines however well Google is doing. One POST after a
successful upload, no account needed — ownership is proved by a key file the build
publishes at `/<key>.txt` (primary host only; the Pages duplicate is noindex and would
be claiming a site it does not represent). Gated: exactly one key file, containing
exactly its own key.

It submits **only what moved** — 8 of 48 on the current build — filtered by the
sitemap's own `<lastmod>`. Resubmitting all 48 every deploy is the same "everything
changed today" noise, one layer out. With no `<lastmod>` it falls back to the whole
set and *says so* rather than doing it quietly. `continue-on-error`, because a
search-engine ping is not worth failing a good release over.

Honest about the evidence: Bing's index-coverage and freshness benefit is documented;
a causal lift in AI citations is **not** — that link is correlational.

## Still open

- **Wave C step 2b** — live two-way sync. Needs the profile to carry per-device
  earned/spent counters before a merge can be correct; until then the cloud is a
  backup and a transfer, and the UI says so.
- **The first-visit budget** — 80,345 B gz of 82,000 (98%). The next feature
  hits the ceiling. Un-isolated: worth twenty minutes with `git bisect` and the
  gz sum.
- **Nobody has published a real score yet**, so every board renders empty and
  the own-best line carries the screen. Firestore's free daily quota stays the
  design constraint, and it is fail-closed (reads refused until reset, never a
  charge), which is why the board design is percentile-first rather than
  "top 100".
- **A2** — snake off Phaser. Parked, not cancelled.
- **`VITE_POSTHOG_KEY`** — not set. Safe to add at any time; `build:check` fails
  the deploy if the PostHog chunk would land in the precache rather than
  shipping it behind a green checkmark.
- **Nobody has played Wave 2** on a real device, and Hebrew TTS has never run
  with `he-IL` on real hardware.
- **Recovery from the crawl block is unconfirmed.** The server side is clean and
  `assert:crawlable` is green, but only Search Console can prove Google's own IPs
  are through. Watch the Sitemaps panel; "could not be read" can linger for days
  after the underlying fix.
- **Bing Webmaster Tools is not claimed.** IndexNow submits fine without it, but the
  coverage reports need the site added at <https://www.bing.com/webmasters> — an
  operator action, not a code one.
