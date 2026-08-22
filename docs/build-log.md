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

### Two things that went wrong shipping it

**A peer's staged work rode out in my commit.** `git add <one file>` then `git commit`
publishes the whole INDEX, and another session had a 49-file `GameChrome` refactor
staged. It reached `main` and production under a commit message about an FTP timeout.
Six earlier commits were scope-checked with `git show --stat` and were clean; the
seventh was skipped because it looked like one obvious file. Nothing broke — 1,634
tests green, every route 200 — but it was published without its author's say-so. The
lesson is `git commit -- <paths>`, and reading `git diff --cached --name-only` before
every commit. Written up in the machine-level multi-agent-safety rule.

**Hostinger's FTP timed out twice at exactly 30s**, the action's default, leaving the
site PARTIALLY updated — new share cards serving beside the old sitemap, a state no
build ever produced. Every file looked right; only comparing two revealed it. Timeout
raised to 120s. A "0 upload lines" grep over the run log also misled this session into
concluding nothing had transferred; it had, and the artifact settled it.

## The deploy went green over a blank site (2026-08-08)

ellaz.fun served a **blank page for about an hour** while every deploy reported
success in 90 seconds. Documents returned 200; the JS they referenced returned
404. One defect, found four times, each time by the gate the previous one forced
into existence.

**1. A ledger on the server.** `SamKirkland/FTP-Deploy-Action` kept
`.ftp-deploy-sync-state.json` in the docroot and uploaded only the diff against
it. A transfer died mid-sync *after* the ledger was written, so from then on
every run compared against a file claiming the missing chunks were present and
skipped them. It could not self-heal by retrying, which is the one thing everyone
tries. The ledger was not uniformly wrong — it was right about `index.html` and
wrong about one asset, so anything that sampled the document agreed with it. (It
was also world-readable, publishing the whole file tree.)

**2. A size comparison.** Replacing it with `lftp mirror` moved the defect rather
than removing it. Mirror decides by comparing size and time, and Vite hashes are
**fixed length** — an `index.html` differing only in a hash is byte-identical in
size. It uploaded every new chunk and skipped all 49 pages: the outage signature
from the opposite direction.

**3. A hidden temp file.** lftp uploads to a temp name and renames on completion.
Its default is `.in.*`, a dotfile, and Hostinger refuses to rename hidden files
(`550`). That silently dropped `game-bubbles` and `game-coloring` out of an
otherwise successful pass — two games serving the error card.

**4. A gate one hop short.** The new live gate walked HTML → assets, and a game
chunk is never named in a document; it is named inside the shell chunk's own
dependency map. So 6 documents and all 26 assets those documents named were 200,
while 2 of 25 lazy chunks were 404, and the gate was **green over two dead
games**.

### What the fix actually is

The invariant is narrower and more useful than "no ledgers":

> The thing deciding what to send must not be able to be wrong about what is
> already there.

- `mirror` runs on **`assets/` and nowhere else**, because every name there
  carries a content hash — a changed file is a *new file*, so "does the remote
  have this name" is the whole question and cannot be wrong.
- The other **108 files are forced** with `put`, ordered so the 50 that name
  hashes go last. Die between the passes and the site is *stale* (old HTML, old
  assets, all present) rather than *blank*. Nothing is deleted, for that reason.
- The generator asserts its own shape (`>= 50` puts) before lftp sees it. A file
  walk that silently produces nothing uploads nothing and exits 0 — which it did,
  once, during testing.

**`scripts/assert-live.mjs`** is the gate the repo did not have, and it fails the
run. It asserts the live HTML references the same hashed assets as the `dist/`
just built, that **every artifact in `dist/` is fetchable**, and that each one is
**byte-identical by SHA-256** to what was built. Three things, each needed:

| Check | What passes without it |
|---|---|
| HTML matches the build | a site whose chunks never landed |
| every dist artifact fetchable | a dead game one hop past the HTML |
| bytes match by hash | an 80% truncation — 200, plausible length, syntax error on import |

It asserts every artifact rather than following the dependency map, because
following the map closes those two hops and leaves the next one. It cannot miss a
hop because it does not count hops.

Both hosts now carry it. The Pages job re-uses the published artifact rather than
rebuilding — the question is what was *published*, and a second build could verify
a site nobody deployed — and reads its URL from the deploy step rather than
hardcoding one, because that address already moved when the repo changed org.

### The measurement lessons, which cost more than the code

**A 200 document whose JS returns 404 is a blank page.** A status-code sweep over
`/`, `/games/snake/`, `/world/` and `/boards/` reported a perfectly healthy site
throughout the outage. It was run, it was believed, and it was wrong. Checking a
document proves the document arrived and says nothing about what it depends on.

**Two dead games were found by driving the live site in a browser**, not by
fetching URLs — asserting the *mount* (children of `#game-frame`, a real canvas
inside it) rather than a 200, because a chunk that fetches and fails to execute
leaves the identical error card.

**Unregistering the service worker does not clear the HTTP cache.** After a full
unregister-and-delete, 8 of 8 resources still came from cache and 0 from the
network, so a "cold" browser pass was not cold. A fresh browser *context* per game
is what actually produces a first visit; across 5 games every `/assets/` resource
had `transferSize > 0` and all five mounted. Byte equality in the gate is the
bridge for the rest: if the network serves exactly what was built, "the cached
bytes execute" and "the network bytes execute" are one claim.

**And the most reusable one.** That cold probe was first built around
`navigator.serviceWorker.controller === null`. It reported `sw=none` on all five
and looked exactly like success — an artifact of sampling at `domcontentloaded`,
before the worker claims the page. A positive control forcing the opposite state
returned `sw=CONTROLLING` on a *first* visit and exposed it:

> When an assertion depends on **when** you sample, the control has to produce
> the opposite reading — not merely a passing one. Re-reading the probe will not
> find this; a stable, confident, wrong value looks identical to a correct one.

### Two things that were not the cause, and were reported as if they were

**GitHub Actions was disabled on the repository** (`{"enabled": false}`) — that is
why runs sat queued with *zero jobs*. A blocked action fails at "Prepare all
required actions"; it does not queue. Separately, an action allowlist refused
`actions/deploy-pages@v4`, which broke Pages only. Three independent faults,
reported as one, and the loudest was the least important.

Verified after: 21/21 game chunks live and mounting, 25/25 lazy chunks reachable,
48/48 URLs crawlable as Googlebot, both hosts green, ledger 404, 1,634 tests.

Full rule: [`.claude/rules/a-deploy-ledger-that-can-disagree-with-the-disk.md`](../.claude/rules/a-deploy-ledger-that-can-disagree-with-the-disk.md).

## The six voices, and one drawing for the currency (2026-08-09)

Two commits, `ae4df64` and `5c355b4`. The Juice Lab picked six sounds by blind
tournament on 2026-08-02 and then nothing was done with them: the winners lived in
dev-only scaffolding while the app kept playing single oscillators — `tap` was one
440 Hz sine, `wrong` a 180 Hz sawtooth. **coin and star made no sound at all**;
neither had an `SfxName` member, so the coin flight was silent and a star was
nothing.

**The recorded verdict was wrong, and following it would have shipped the worst
outcome available.** The note said coin and wrong "were won by the sounds already
shipped in `src/sdk/audio.ts`", with a warning not to change them. `brackets.ts`
says the opposite outright — *"the palette deliberately reuses the LEAN specs as
its control characters"* — and every `*-current` character referenced `LEAN.*`,
none `CONTROL.*`. The control arm was the lab's own unshipped Arm A;
`coin-current`'s blurb "what the lab plays right now" meant the **lab**. All six
winners are new. The transferable half: **a verdict recorded as "the control won"
is ambiguous unless the record says WHAT THE CONTROL WAS** — record the spec
identifier, never the word "control". `voice.test.ts` pins it now.

**Level-matching moved out of the tournament and into the shipped engine**,
because the operator judged every character at matched loudness; raw, a reverbed
star against a 60 ms tap is roughly a 4× peak difference — a balance nobody had
heard. Measured on the live artifact: every voice within **6%** of target.

**The currency was four emoji, not one.** The wallet chip, the coins that fly to
it, every shop price and the star badge on all 21 home cards. They agreed only
because all four happened to use the same character, with nothing that could
notice if one changed. `flyTo`'s `emoji` was an *optional* parameter nobody ever
passed — the flying coin and the chip coin were two independent decisions wearing
one face. It is a required injected `particle` now, and `icons.test.ts` pins both
renderers to one path table.

**The coin glyph took six candidates rendered at 17px.** Two concentric circles is
the obvious coin, correct at 24px, and at the chip's real size it reads as a
**bullseye** — the inner circle collapses to a dot, and it is the `clock` glyph
with a filling. One coin on its side reads as a database cylinder. A filled disc
is legible and says nothing. Three stacked discs still read as money small.
**Judge a glyph at the size it ships at**; neither failure is visible from the
path data or a 24px preview.

Numbers: **first visit 84,786 B gz of 86,000** — only 1,214 spare, because
`icons.tsx` had to move from the `page` chunk to `shell`. It had been pinned to
`page` on the premise that nothing on the home screen draws an icon, and the
wallet chip is what made that false; leaving it there made the shell import from
the page chunk and Vite wrote a modulepreload for the whole content-page runtime
into `index.html`. `assert-first-visit.mjs` failed the build by name — the third
time it has caught exactly that. 1,551 tests, 67 files.

**Three probe defects, each of which looked exactly like a product bug**, worth
recording because two were caught only by a control run:

- A cross-renderer check reported 98 disagreeing coins. The selector matched every
  path in the app, all 21 game-art scenes included. Correct answer: 5, identical.
- The audio meter reported every muted sound at exactly 0.3000 — a *closed*
  AudioContext's analyser keeps returning its last frame forever, so the positive
  control's own level became the floor under every later reading. It read as
  "muted still makes sound".
- `wrong` measured 39% **above** target. Reasoning that under-sampling can only
  make a peak *lower*, I called it real. The principle is true and the conclusion
  was wrong: a second artifact was present — plays were spaced 320 ms apart while
  that voice runs past 700 ms with its tail, so consecutive plays overlapped and
  summed. **A second artifact can invert the sign of the first.**

A hypothesis the data killed on the way: jitter does not drive the peak variance.
`coin` carries the most jitter and shows the least spread.

Still open from this: `play()` throws on a name it does not know, contradicting
its own docstring ("no-ops if … asset missing, best-effort"). Zero of 44 call
sites can reach it and the `Record<SfxName, …>` type makes the table complete by
construction, so it is latent rather than live — a one-line guard in `play()`.
And the first tap of a session plays ~5 dB quiet, because the gesture that
unlocks audio is the same gesture that plays the sound.

Full account: [`juice-lab.md`](juice-lab.md), now a past-tense record.

## A falling-block game, and a piece set that is ours (2026-08-09)

Commit `24981bf`. Game 22, `blocks` / קוביות נופלות / Falling Blocks, DOM
renderer, live on both hosts the same evening.

**It is not called Tetris and it does not use the famous seven pieces**, because
CLAUDE.md § Legal forbids trademarked names and trade dress by name. The
falling-block mechanic is old and free; the seven four-cell shapes in their
famous colours are the dress. So the pool is **eleven shapes of three to five
cells** in the platform's own palette.

**The constraint produced the design.** The piece POOL is the difficulty, not the
clock: Calm stocks four gentle shapes on 8x14, Normal nine on 10x18, Fast adds a
plus and a cup that cannot lie flat on anything.

**The number that says so.** `scripts/sim/blocks-rows.mjs` plays the real engine
with two throwaway policies, 300 games per level. A "tidy" bot - tries every
column and rotation, keeps whichever leaves the fewest buried holes - **survived
the full 1000-piece cap in 100% of Calm runs and 99.3% of Normal, and died in
every one of 300 Fast runs after a median of 78 rows.** A bot dropping into
random columns is dead after ~20 pieces having cleared nothing. **A bot places
instantly, so the drop speed never entered that result.** Two pieces did.

**The first version of that statistic was a cap artifact and would have shipped
as a fact.** With a 4000-piece cap the run printed "1509 rows" for Normal, which
is not the game's ceiling - it is where the script stopped. The fix was not a
bigger cap: it is `survivedPct` printed beside every median, and a header saying
that where survival is high the median beside it is meaningless. **A ceiling you
imposed reads exactly like a ceiling you measured.**

### The traps

- **Two hand-drawn test fixtures were wrong in opposite directions**, and both
  looked right. A board with a two-wide shaft at the far left is not "a stack
  with no clear available" - the landing COMPLETES those rows, because the other
  six columns were already full. The game-over test needed a three-wide shaft
  filled by a two-wide piece. Neither error was in the code.
- **Fixed pixels do not survive a viewport-derived cell.** A 5px corner radius is
  a rounded square on the 30px desktop cell and a **circle** on the 11px
  landscape-phone cell, which is what the first build shipped. Every cell detail
  is now a fraction of a `--cell` custom property: radius, seam, dashed ghost,
  and the jelly highlight.
- **The game-over overlay inherited `--text`**, which is near-black on the light
  theme, over an overlay that is dark in BOTH. Legible in exactly one theme.
  `n2048` still has this.
- **The content gate fired before the game could be opened in dev**: no
  `src/content/games/blocks.ts` meant a 500 on `/games/blocks/`, not a thin page.
  Working as designed, and the reason step 6 of the recipe is not optional.

### Measured

- **First visit 85,226 B gz of 86,000** - 774 spare. Adding the game cost the
  shell **306 B gz**, measured against a clean `main` build in a worktree: its
  `meta.ts` rides the statically-imported roster and its scene rides `gameArt`.
  The game itself is a lazy `game-blocks-*.js` at **4.32 KB gz**.
- 28 logic tests; suite 1,604 across 69 files. Pages 48 -> 50, sitemap 50 URLs,
  og cards 50.
- **Verified on the running app, not only in tests**: a full run persisted
  `coins 5, stars 1` and `ellaz:blocks:score:normal`, which exercises the whole
  `winMoment` -> economy -> profile path plus the per-level score board.
- **Live-verified over the network by CI, not by hand.** `assert-live` byte-
  compares every non-HTML artifact by SHA-256, so the lazy game chunk - which no
  document names, the exact hop that shipped two broken games on 2026-08-08 - was
  covered. Documents are excluded there, so `crawlable.yml` was dispatched on
  demand: 50/50 sitemap URLs served a real page to Googlebot, negative control
  8/8.

**One thing this cost elsewhere:** the three pilot pages hardcoded "21 games" in
their FAQ, so a 22nd made them wrong. Updated to 22. A count in prose is a
maintenance debt the voice gate cannot see.

## Carry on where you left off (2026-08-09)

Commit `894423a`. Every game reopened as a stranger: a child who played hard
sudoku re-picked hard on every single open, and a half-finished board was gone
the moment they tapped home. Nothing in the catalogue persisted a position —
only `vanish` remembered its difficulty, by hand.

Two layers, separated because they have different lifetimes. **The level**, in
all 20 games with a toggle, survives a win, a restart and the board snapshot
itself. **The board**, in the six games with a position worth returning to —
sudoku, minesweeper, 2048, blocks, memory, coloring — is cleared the moment the
run ends. evolve inherits the second free, through 2048's renderer under its own
game id. Resume is silent, which was the operator's call: no dialog, no reading
required, and `GameChrome`'s restart button is already the way to a fresh board.

`ctx.session` is the third policy port after `economy.ts` and `score.ts`, and it
exists for the same reason both of those do — **a wrong answer does not throw,
it renders a plausible board the rules can no longer explain.**

### The two bugs that were live and did not crash

**A resumed run could be paid twice.** 2048's `won` gates the `level_complete`
grant and play continues past it, so a snapshot carrying the grid and not `won`
restores a board one merge away from granting the 2048 win **again** — once per
resume, indefinitely. `bestFired` does the same for `personal_best`, and blocks'
milestone step for its drip coin. All three are now in the snapshot. This is the
whole reason the rule says a saved position is *not a receipt*: the question to
ask is not "what does the board look like", it is "what has this run already
been paid for".

**Memory could resume permanently dead.** `flip()` sets `lock: true` on a
mismatch and the RENDERER clears it 850 ms later with a `setTimeout`. A snapshot
caught inside that window restores with no timer behind it, and `flip()` then
returns `ignored` for every card. The board looks completely normal and accepts
no input. `settle()` in the pure `logic.ts` fixes it **at save time, not load
time** — settling on load would leave the impossible state on disk, one build
away from a reader that forgets to settle it. Six tests pin it, including the
dead board stated directly as `expect(flip(stuck, 4).outcome.kind).toBe("ignored")`.

Neither was found by reading. The first came from asking what gates each
`winMoment`; the second from reading `logic.ts` before writing the snapshot type.

### The measurement lessons, again

**The obvious control is undone by the feature.** Clear `localStorage`, reload,
expect a different board — except navigating away fires `visibilitychange`,
`useGameSession` flushes on pause, and the snapshot is written straight back
between the clear and the reload. The control reported "identical board" for a
reason that had nothing to do with resume. A separate browser context — storage
the first player never touched — is the honest control.

**`networkidle` is 13 s late in dev.** Vite serves hundreds of unbundled modules,
so the game has been mounted and its clock running the whole time; every timing
assertion read 13 s on a clock that genuinely started at zero. Waiting for the
board instead moved a fresh clock to 0.3 s and a resumed one to 3.7 → 4.0 s.

Same shape as the deploy gate's cold-load probe: **when an assertion depends on
WHEN you sample, the control has to produce the OPPOSITE reading.**

**And one report that was wrong.** The Hostinger upload was called abnormally
slow — 8× baseline, possibly retrying — on the strength of repeated `in_progress`
readings from the GitHub API. The API was serving stale job state. The upload
took **2m41s** against a 2m43s baseline, and the job had finished about seven
minutes before it was described as still running.

### Measured

- **First visit 85,770 B gz of 86,000 — 230 spare, down from 774.** The feature
  cost the shell **546 B gz**: `sdk/session.ts` plus both `@shared` hooks land
  there under the existing `src/{sdk,…,shared}` pinning rule. **The ceiling now
  binds — the next game does not fit.** The identified way to pay for it is in
  CLAUDE.md § Firebase and it is unshipped: carve the two hooks into the `page`
  chunk the way `GameChrome` already is, which first needs 20 games importing the
  direct module path instead of the `@shared` barrel.
- Suite **1,633 across 70 files** (from 1,604/69). `session.test.ts` adds 24;
  `memory/logic.test.ts` adds 6. Three mutations — version check, byte cap,
  validator — each planted and each failed loudly before being reverted.
- **Verified in a browser across all six games: 26 checks, every one with a
  control that fires.** sudoku's puzzle, entry and clock; 2048, minesweeper,
  coloring and blocks by position fingerprint; memory by a real match plus the
  mid-mismatch trap; evolve proving it keeps its own namespace and not 2048's.
- `logic-is-pure.test.ts` caught both new hooks the moment they existed and had
  to be told they are React on purpose — the gate working exactly as its
  guarded-by-exclusion design intends.

## Eleven languages, and a gate that reads how much body (2026-08-11)

**Commits**: `28db1d9`, `7d8b77f`, `9c7a5d3`, `6febd98`. Ran beside two other
sessions all afternoon, which is half of what this entry is about.

### The two locale sets

`src/i18n/locales.ts` splits **what the interface speaks** (`APP_LOCALES`, now 11:
he en es pt fr de ar it ru tr id) from **what has written prose** (`PAGE_LOCALES`,
still just he and en). `ROUTES` derives from the narrow one, so adding a language
to the app emits **zero** documents.

The split is not tidiness. Google, verbatim: *"Localized versions of a page are
only considered duplicates if the main content of the page remains untranslated."*
A German header over an English article is the named anti-pattern, once per game,
22 times over.

`GameContent.copy` is `Record<PageLocale, GameCopy>`, so promoting a locale before
its prose exists is a **red build in all 22 content files**. That is deliberately
the strongest layer available: every other guard here reads `dist/`, and 2026-08-08
proved a script can be confidently wrong about what it scanned. A `Record<K,V>`
cannot be wrong about whether a key exists.

`x-default` also moved from Hebrew to **English** — it answers "we have no page in
your language", and Hebrew is the wrong answer to that for everyone except Hebrew
speakers, who match their own `hreflang` first.

27 tests. The sharp ones assert each autonym is really written in its own script
(`he: /[֐-׿]/`, `ar: /[؀-ۿ]/`, `ru: /[Ѐ-ӿ]/`) and that no autonym contains a flag —
a flag is a country, not a language, and an Israeli flag beside an Arabic one is a
statement a children's game platform has no business making.

### The gate now reads how much body

`assert:crawlable` asserted every sitemap URL answers 200 and is not a challenge.
Both true of a page serving nothing — which `/` was, and which is how the empty
Hebrew home stood for months with every gate green.

| measured live, as Googlebot | words | links | h1 |
|---|---|---|---|
| `https://ellaz.fun/` | **0** | 0 | 0 |
| `https://ellaz.fun/en/` | 252 | 26 | 1 |
| `https://ellaz.fun/games/snake/` | 3,230 | 10 | 1 |

**The number that would have defeated a naive floor: 96.** That is what `/` scores
with tags stripped across the whole *document*, on a body of 29 bytes — every one
of those 96 words an HTML comment in the head about pinch-zoom. A floor set
anywhere under 96 passes an empty shell forever while showing a reassuring
non-zero number. Hence body-only.

Advisory until `CRAWL_CONTENT_FLOOR=1`, because it was written while a known
offender was live and a gate that reds on day one for something nobody can fix
that day teaches its reader to ignore the daily email.

### The trap it cost, and it cost it twice

**Ten words of margin.** The floor shipped at 120, argued from "the thinnest page
here runs ~750 words". That was true when measured and false three hours later:
the parallel session's fix emitted a deliberately compact home of **130 words**.
One trimmed sentence and the daily email reds on a correct page. Dropped to 60.

The same afternoon, two lanes each raised the payload ceiling — 88,000 argued from
a tree without Word Guess, 90,000 from a tree without the home fix. Neither
described the merged tree. Both instances are one rule:
[`a-threshold-tuned-against-todays-tree-goes-stale.md`](../.claude/rules/a-threshold-tuned-against-todays-tree-goes-stale.md).

### `/deep-test`: a quadratic scan, and a fix nothing could guard

97 cells over the shipped code with real captured pages, not fixtures. One defect:

| input | before | after |
|---|---|---|
| 15 KB | 77 ms | 0.04 ms |
| 117 KB | **8,785 ms** | **0.27 ms** |

`/<body[^>]*>([\s\S]*)<\/body>/i` is quadratic on many `<body` with no `</body>` —
the engine retries from every start, drives the greedy `[\s\S]*` to end-of-input,
then backtracks a character at a time hunting a tag that is not there.
`indexOf`/`lastIndexOf` cannot backtrack, so the shape is gone rather than tuned.

**Magnitude: 0% of live volume** — all 52 URLs carry one balanced `<body>` pair and
the largest page is 38 KB. Fixed anyway, because this is the one gate whose job is
to notice when the server serves something we did not build. Malformed input is the
case it exists *for*.

**Then the more interesting finding.** The old regex was planted back verbatim and
**all 16 controls passed**. They had to — it returns identical output, 900× slower,
and no correctness control can express that. There is now one control that measures
time (2,000 ms budget: 200× over the healthy 9.7 ms, 4× under the regression) and a
runnable reproducer that asserts the growth *rate* rather than a duration, because a
wall-clock budget on a shared machine is a flaky test.

A third: a mutation taking the **first** `</body>` also survived, and the comment
written minutes earlier claimed that behaviour was "pinned by a test" — it was
pinned in a scratch harness, not the shipped file, which is the same as not pinned.

Ended at 17 controls, 7 mutations, each killing exactly one. Report:
`~/.claude/reports/deep-test-ellaz-crawl-gate-and-locales-2026-08-11.md`.

### Learned and deliberately not changed

Hidden text, `<noscript>` and `<template>` all clear the content floor — a crawler
does read them, but it is the shape of a page gaming the gate. `walk()` follows
redirects, so a redirecting sitemap URL is scored as its target. No input-size
ceiling: `res.text()` is unbounded and 10 MB parses in ~4 s, linear so not a hang.
CJK without spaces reads as one word — unreachable until `zh` or `ja` is added.

## One game, on somebody else's CDN (2026-08-11)

The site publishes a second artifact now: a **standalone single-game bundle**, built by
its own config, for hosts we do not control — itch.io first. `STANDALONE_GAME=sudoku npm
run build:standalone` writes `dist-standalone/sudoku/`, and `npm run assert:standalone`
decides whether it may leave the building.

**A separate config file, not a branch in `vite.config.ts`.** The whole risk of this work
is that a change made for a third-party host regresses the site a child actually loads. A
branch puts both builds one typo apart; a separate file means the production build cannot
regress from it at all, and rollback is deleting one file. The cost is duplicated
`resolve.alias` and `build.target`, which fail loudly at build time.

**The gate was written first, and it found three defects on the first real bundle**:
no `index.html` at the zip root; a `cloud-*.js` chunk carrying `firestore.googleapis.com`,
`identitytoolkit.googleapis.com` and `securetoken.googleapis.com` into an artifact
labelled "Sudoku"; and every other game plus Phaser riding along — a sudoku bundle
carrying `phaser.esm-*.js` at 1,685 kB. Stubbing the other games and the cloud client at
*resolution* took it from 2.1 MB to **224 KB**.

**The fourth defect no static check could see.** Loaded in a real browser, the page
fetched `fonts.googleapis.com` — `src/ui/global.css:5` imports Heebo and Fredoka. Fine on
our own site; on someone else's page it is an external request from a game, which is the
one thing this artifact promises not to make, and it hands a child's IP to Google. Stripped
in this build only: changing the main site is a payload-and-design decision with a budget
attached, and it is logged as the operator's call with the privacy argument rather than
the byte one.

### The traps, and the one worth keeping

**`resolveId` receives the RAW specifier.** `catalog.ts` writes
`import("../games/snake/index")` — a string containing no `src/` at all — so a hook
matching `/\/src\/games\//` on the specifier fires on nothing. The first version did
exactly that and produced a **byte-identical bundle that looked like a working one**.
Only the gate's output disagreed. Resolve first (`this.resolve(source, importer,
{skipSelf: true})`), then match the resolved id.

**`closeBundle` runs via `hookParallel`.** Two plugins mutating the same output directory
race each other, and the failure surfaced as the *later* plugin complaining that
`standalone.html` did not exist — the innocent bystander. Merged into one
`finalizeBundle()` where the order is the order of the statements.

**And the one that generalises past this repo: I wrote the pattern from the SOURCE, and
the artifact is minified.** `@import url("https://…")` in `global.css` is
`@import"https://…wght@500;600";` in the built CSS — no whitespace after `@import`, and
semicolons *inside* the query string. A regex requiring the space and stopping at the
first `;` matched nothing, three times, while the bytes sat in plain view. **The identical
defect was in the gate**, whose narrowed `externalOrigins` pattern had gone quietly
false-negative over the exact request it existed to catch.

> A check that can silently not-run reports confidently about something it never
> observed. Write the matcher against the artifact, and prove it fires on the real bytes.

### Measured

Three bundles: **2048 204 KB · sudoku 224 KB · snake 1.9 MB**. Snake is nine times the
others because it is the only game importing Phaser. `grep -rl googleapis dist-standalone/`
returns nothing. The gate ships **14 planted controls**, all firing, plus a positive
control that must still pass.

Served from a nested subdirectory standing in for itch's CDN and driven in a browser: the
board plays, 42 of 81 cells filled, clock running, 95 interactive nodes, the no-JavaScript
fallback removed, no service worker, **four network requests and every one local**, fonts
resolving to `system-ui`, and the commit stamp present in the head. `dist/` untouched;
`build:check` green.

### What is published, and what is written down

`docs/outreach/` now holds seven drafts — three Hebrew posts, a press pitch, itch,
Newgrounds, Reddit and the Poki/CrazyGames enquiry. Nothing is sent; the operator posts
and uploads all of it.

**Three of the four destination checks came back blind, in the same shape.** Newgrounds
returns 403 to any script including its own root. The Poki developer portal is a 200
carrying **nine words** — a client-rendered shell. Every subreddit returned an identical
8.4 KB shell, including one invented as a control, so that probe cannot tell a real
destination from a fictional one. None of the three is claimed as verified, and each file
names its blind instrument.

Verification also caught a fabricated fact in our own copy: the itch page said sudoku had
"four sizes" where the game has **six levels across three board sizes**. Read out of
`LEVEL_OPTIONS`, not remembered. Two other numbers were deleted rather than softened — a
time-to-gameplay figure nobody measured, and a page count that moves the day a language
is promoted.

The Poki draft leads with the decision it forces rather than the submission: those portals
are advertising businesses, and "no ads" is on all 52 of our pages. The SDK shape was built
to their union so the door stays open, which is not the same as walking through it.

Full rule, including the case-sensitivity trap that passes on `/mnt/c` and 404s on their
CDN: [`a-second-published-artifact-needs-its-own-gate.md`](../.claude/rules/a-second-published-artifact-needs-its-own-gate.md).

## The English home was not the home screen (2026-08-13)

Reported by a person, in one sentence: *"I still see buttons leading to this page which
should be homepage but appears broken: https://ellaz.fun/en/"*. They were right, and no
gate in this repo could have told them so.

`/en/` and `/es/` were **pure documents**. `homePage()` built a heading, a fact list, a
grid of emoji-and-title links and four paragraphs of prose, with `headAssets` deliberately
withheld — the comment in `pages.ts` said, in as many words, that they *"carry no runtime
because there is nothing on them to run"*. That is exactly right for an article and exactly
wrong for the **home screen**, which is what that URL is. Every wordmark and back link on
an English page points at it: the header of all 25 English game pages, the room, the
boards, and `exitTo`'s floor in `PageApp`. So a player who finished a game tapped back and
landed on a static article — no grid art, no wallet, no world, no daily, nothing to press.

**Why nothing here saw it.** The same shape as every other outage in this file: correct
everywhere you look, wrong for a population you are not in.

| Check | Result while `/en/` was a dead end |
|---|---|
| `assert-pages.mjs` | green — and it **asserted the defect**: `if (/id="root"/) fail(…)` on every page whose kind was not game/world/boards |
| `build.test.ts` | green — "no page carries `#root`" was a test |
| `assert-crawlable.mjs` | green — 252 words, 26 links, one `h1`, all true |
| `assert-live.mjs` | green — the page and its assets were fetchable |
| a browser | a perfectly rendered, perfectly useless page |

Two of those gates were not merely blind. They were **pinning it in place**, because
"a home page is a document" had been true since the pages work shipped and both had been
written to defend it.

**The fix** is the arrangement `/` has had since the AI-crawler work: `homeShellBody` inside
`#home-doc`, an empty `#root` as its **sibling**, `class="app-shell"`, the app's own head
tags, and `main.tsx` removing the document once React commits. There was never a reason for
the other two languages to get only the first half of that.

Measured on the artifact and driven in a fresh browser context per language:

| | before | after |
|---|---|---|
| `/en/` words · links · h1 | 252 · 26 · 1 | **176 · 31 · 1** |
| `/en/` mounts the grid | no | **yes**, `lang="en" dir="ltr"` |
| `/es/` mounts the grid | no | **yes**, Spanish chrome, no English flash |
| back from `/en/games/snake/` | a static article | **the English home screen** |
| first visit | — | 86,483 B gz of 90,000 |

The prose loss is document chrome, not content: the shell body carries the whole page and
the app draws its own header, footer and language links.

**Three things that would each have shipped a plausible wrong page.**

`homeShellBody` had been hardcoded to Hebrew for as long as it only served `/`. Left that
way it would have emitted the **Hebrew home under `lang="en"`** — a page that renders,
links correctly and clears every word floor. `assert-pages.mjs`'s script-dominance gate is
the control that catches it.

`readPageContext` reads **`data-locale` and never `documentElement.lang`** on the app
branch. `index.html` has said `lang="he"` since before any of this existed, so reading the
attribute would have pinned `/` to Hebrew and silently overridden the stored preference of
every player using one of the other ten languages — a regression on the one page that was
never broken, introduced by the fix for the pages that were.

And the predicate for "which emitted files are homes" was first written as
`fileName.split("/").length === 2`, which is true of `en/index.html` and equally true of
`world/index.html`. It reads off `ROUTES` now. A list that already knows the answer cannot
be wrong about it, and this is the third time in this file that a derived predicate has
replaced a shape-matching one for the same reason.

The URL wins over the stored preference on `/en/` and `/es/`, and is **not persisted**:
arriving on an English page is not the same as choosing English, and writing it would
repaint `/` for a Hebrew speaker who followed one link. Spanish awaits its dictionary
before mounting, exactly as `bootContentPage` does — there is no flash to trade, since the
emitted home is still on screen and React has not rendered a thing.

## A fourth maze, and the lever that turned out to matter (2026-08-17)

Way Home shipped with three boards and its whole difficulty argument sitting on two
levers, because it has no others: there is no clock to speed up and no lives to take
away. The expert board is **10×10, six crumbs, `braid: 0`, and a different carve** —
and the carve is the part worth reading.

The first cut of this was 8×8 with five crumbs on the same depth-first backtracker,
and it was a bigger board rather than a harder one. Asked for more dead ends, the
honest answer was that a backtracker cannot give them: it carves one long corridor at
a time, so **11.8% of cells are dead ends at any size**. Going to 10×10 buys 11.80 dead
ends against 8.19 and an 82.09-step par — half again as much walking at one square per
press, and a nearest-crumb bot still matching par on 58.7% of deals. Longer, not harder.

A **frontier carve** (Prim's on a uniform grid) is the lever that exists. It grows from
everything already reached rather than from wherever it is standing, so passages branch
early: **32.94 dead ends per board, a third of every cell**, and the longest route
across a 10×10 falls from 67.90 squares to 27.22. Both are still perfect mazes — a wall
is only ever opened onto a cell nothing has reached, so the passages are a spanning tree
however the frontier is shuffled.

The trade is not the one it looks like. Bushy is not the same maze with stubs added:
the stubs are SHORT, so the board is **quicker to cross and much harder to cross
optimally**. Measured through the shipped reducer over 20,000 deals:

| | hard 7×7 | expert 10×10 bushy | (the 8×8 it replaced) |
|---|---|---|---|
| par | 39.53 | **52.78** | 55.36 |
| dead ends per board | 5.92 | **32.94** | 8.19 |
| nearest-crumb bot matches par | 68.6% | **33.0%** | 60.2% |
| reading order matches par | 44.6% | **8.2%** | 35.4% |

The record here is perfect runs and nothing else, so that third row is the one that
decides how hard a level is — and it is the row the size lever barely moved. Note the
one that runs the *other* way: the worst order costs **1.89× par** on the expert board
against 2.13× on hard. A bad order is punished less, and the right one is far harder to
see, because a bushy board is full of near-ties.

Six crumbs rather than five keeps par at roughly what it was (52.78 against 55.36), so
the run stays a sane length while the ordering problem goes from 120 orders to 720.
`optimalRoute` brute-forces all of them per deal, which is microseconds; the growth is
factorial, so eight crumbs (40,320) needs a different algorithm rather than a bigger
loop, and the comment there says so.

### The mutation that survived, and what it was blind to

Four mutations were planted and three died. The survivor is the useful one:
**switching `LEVELS.expert.style` back to `"winding"` passed the entire suite.** One
word, the whole difficulty of the level gone, nothing red.

Each gate was individually right and none of them read the level. The carve test proved
`carve` can cut both shapes — at a size it passed in itself. The ramp test proved the
walk was longer — a winding 10×10 is longer still. The perfect-maze test proved the
passages form a tree — both carves do. Same family as every other entry in this file:
a check that cannot represent the thing it is looking for reports green about it forever.

The gate added for it measures what a player is **dealt** rather than what the config
says, and as a **density** so it cannot pass on a board that is merely bigger: expert's
dead-end share must be more than double hard's (11.9% vs 32.9% measured). Asserted as a
ratio rather than against 32.94, so an rng change moves the number without reding a
build that still has the shape it is meant to have. It kills the survivor by name, and
kills a 12×12 winding board too.

### The panel gate could not see this board either

`game-panel-clears-widest-board.test.ts` reads every game's `min()` px ceilings against
the 700px panel. Maze sizes a **cell**, not a board, so it read 76 and the board was
8 × 76 = 608. At ten cells that is **760px against the 684 the panel leaves** — and an
oversized board here does not spill or throw, it grows a scrollbar inside a play surface
that is `overflow: auto`.

The cap is 64 now (10 × 64 = 640, exactly the widest board in the tree), and
`board-fits-the-panel.test.ts` asserts that arithmetic by reading both sources — the
literal out of the renderer, the cap out of the shipped stylesheet — with controls in
both directions on each matcher. Restoring 76 fails it naming the two numbers.

### Measured

- **first visit 89,469 → 89,455 B gz**, two arms from one tree. A level lives in the
  lazy game chunk and only its meta reaches the shell, so the honest reading of a
  14-byte fall is *unmoved*: `index.html` carries hashed asset names, and how well a
  different hash string gzips is worth a handful of bytes in either direction. The
  first cut of this change measured +7 on the same baseline. Do not read either as a
  cost or a saving.
- **Driven in a real browser on the built artifact**, 390×844, expert picked from the
  chrome: 100 cells, a **347px** board inside a 390px phone (444px on a 1440×900
  desktop), six crumbs, and a 60-step route the driver brute-forced from the walls the
  DOM actually renders — walked, and the screen read Moves 60, Perfect 1, Best 1, wallet
  8 coins and a star. Par agreeing across two independent implementations is the useful
  half; the payout is what proves `LEVEL_TIER`.
- 2,653 tests green, `tsc` clean, `build:check` green under the default base.

`Difficulty` and `RewardTier` stop spelling the same words at `expert`, so the renderer
carries a `LEVEL_TIER` map and expert pays as `hard` — the sudoku and sort shape.
Passing the level straight through became a compile error the moment the fourth id
existed, which is that arrangement working.

Cells come out ~34px on a 390px phone against hard's 49. That is under the 2cm target
floor and does not breach it: **no square on this board is ever tapped**, the D-pad
drives the mouse, so a cell is a picture and the rule that governs a target does not
govern it. Prose in all four languages carries the fourth board, its numbers, and a
screen reader being told about a hundred squares rather than forty-nine.

## The outreach drafts were the only unmeasured surface (2026-08-18)

`docs/outreach/` holds eight drafts — Show HN, Product Hunt, dev.to, three Reddit
posts, itch.io, Newgrounds, a Hebrew press letter, two pull requests into other
people's lists. They were written on 2026-08-11 and 2026-08-12 and every one of
them had gone stale by the 18th: **57 wrong figures.**

| Claim | Drafts said | The tree said |
|---|---|---|
| games | 23 | **33** |
| games for young children | 16 | **24** |
| emitted pages | 52 | **144** |
| page locales | 2 | **4** |
| first visit | 88,234 B gz | **90,027** |
| ceiling / room left | 90,000 / 1,766 B | **90,500 / 473** |
| sudoku · 2048 standalone | 224 KB · 204 KB | **226 KB · 207 KB** |
| locale chunks | ~1.3 KB gz | **~1.5 KB gz** |

**Two were not drift — they were wrong when written**, in the `provenance` column
whose entire purpose is to make a claim checkable: a row naming
`src/games/snake/SnakeGame.tsx`, which has never existed under that name, and an
itch table saying sudoku has four difficulty tiers eight lines above a row
correctly saying six. Both survived because nobody re-ran the check the column
names.

**One claim flipped from true to false rather than drifting.** "under 90 KB"
appears nine times across three drafts. It was true at 88,234 B gz and is false at
90,027 — by 27 bytes, in the most-repeated sentence in the folder. A numeric
matcher cannot see that: the number in the sentence is the THRESHOLD, not the
measurement, and it never changed. Only the world did. The copy now says
*about 90 KB*, which is accurate and does not re-break on the next 200 bytes.

### Why this folder and no other

Every other number-bearing surface here is derived. The sitemap, `llms.txt` and
the emitted home read the roster, so they cannot be wrong about how many games
there are — measured on the same build, `llms.txt` listed 33 games in each of
four languages without an edit. `src/content/` carries a `provenance` row per
figure and `content.test.ts` checks the deriving script still exists.

The outreach drafts have the provenance column and nothing that reads it. That
would be a documentation problem anywhere else; here it is a publishing problem,
because this is also the only folder whose contents are meant to LEAVE the
repository. `launch.md` says it itself: a Show HN happens once.

### The gate

`scripts/assert-outreach.mjs` (`npm run assert:outreach`, plus `--fix` and
`--control`). It derives the facts from the roster, `src/i18n/locales.ts`,
`assert-payload.mjs` and the built artifact, then scans every draft.

**Not in `build:check`, on purpose** — the same placement as `assert:standalone`,
a gate for an artifact published by hand. Wiring it into the build would red every
lane that adds a game until somebody edited eight markdown files, and a gate that
reds on work it is not about is a gate people learn to skip. `--fix` makes the
correction one command instead of eight files.

Three things earn their place, and each was found by the gate failing rather than
by reasoning:

- **`minHits` is the positive control.** Each claim declares how many occurrences
  the corpus is known to hold; fewer is reported as **BLIND**, never as clean. It
  caught two of its own holes immediately — the first matcher could not see
  `measured 88,234 on <date>` in three provenance rows, nor `one game out of 23`
  in three more, and had reported the folder clean over both.
- **Hebrew is in the population.** `press.md` carries a Hebrew press letter and
  `hebrew.md` two Hebrew posts, all quoting the counts. An English-only matcher
  reports the folder clean while the one document written for a journalist stays
  wrong — the same shape as the `LOCALES` literal that ran zero Spanish pages
  through the voice gate.
- **`--fix` cannot tell a claim from a history.** `press.md` recounts that its own
  payload figure moved and names both numbers; the auto-fix rewrote the history
  into a sentence contradicting itself. Historical passages are now wrapped in
  `<!-- outreach-facts:off -->`, and the count of exempted regions prints on every
  run — an exemption that could be applied quietly is a way to make a gate pass by
  deleting its job.

Six controls: a fixed corpus is clean, a planted count is caught, a rephrased
corpus reports BLIND, and the `under 90 KB` predicate answers **both ways** against
a literal fixture — FALSE at 90,027 and clean at 89,000. That last pair is the one
that matters; a control which only ever produces the failing reading cannot tell a
working predicate from one wired to a constant.

### What held, and the two targets re-measured

An audit that only reports failures is not one. Unchanged on the same build:
**Phaser 379,855 B gz** to the digit, exactly one importer (`SnakeScene.ts`),
snake's 1.9 MB standalone, six sudoku levels, 11 interface languages, MIT with a
real `LICENSE`, and the `awesome-pwa` patch still applying at the same two anchor
lines (`Cybercar` 168, `Falling Nikochan` 169).

`dev.md`'s method — rank candidate lists by **merge recency**, not by stars —
survives a week: `awesome-pwa` merged a batch of 9 on 2026-08-10 and 11 on
2026-08-01; `awesome-phaser` has not moved since 2025-04-14. Open the first, skip
the second, as drafted. Two things did change: **PR #441, a Games and
Entertainment addition, is still unmerged since 2026-07-14** across two batches
that merged other sections, so the "merges within the day" caveat now has two data
points rather than one; and a direct positioning collision landed in that section
— `Play Park (harborplay.us)`, described as *"Free family games … No account, no
ads"* — so our entry should lead on Hebrew, RTL and offline rather than on the
same two negatives.

### What this audit could NOT see

**Egress to ellaz.fun is refused in the environment this ran in** (the proxy
answers 403 to CONNECT), so `assert:crawlable` and `assert:live` did not run and
**the live site was not observed**. Every figure above is the tree and a local
build. In a repo whose sharpest lesson is that every gate reads `dist/` and none
reads what a visitor receives, that is the limitation to hold on to.

And there is **no inbound-link data here at all** — no Search Console, no index,
nothing in the repo that records a link. This audits the claims we are about to
make, not the links we have.

Full record: [`docs/outreach/audit.md`](outreach/audit.md). Rule:
[`a-hand-authored-number-that-leaves-the-repo.md`](../.claude/rules/a-hand-authored-number-that-leaves-the-repo.md).

---

## Reach: a doctrine for the half of being found that is not the site (2026-08-20)

**The audit came back clean on everything a gate here can reach, and that was the
finding.** Fetched live as Googlebot: the home serves 197 words, 38 links and one
`h1`; `/he/`, `/es/`, `/fr/`, both snake pages, the room and the boards all serve
real prose; 144 sitemap URLs each with a `lastmod`; hreflang reciprocal with
`x-default` on the English home; `HEAD` and `GET` agree; `/nope/` returns 404 with
a body byte-identical to `404.html`; the Pages mirror still `noindex` and
`Disallow: /`. Eleven of thirteen crawler agents get 200.

So the site is not the problem. **Nothing has ever been done with it.** Eight
outreach drafts, none fired. No link report ever read. A repository description
that has been wrong in public for weeks while every check of the *link* passed.

### What was built

`reach-doctrine` and `reach-playbook` in the doctrine console, with `seo-doctrine`
now inheriting the first — so a session loading only the SEO book still carries
the cross-channel law. Seven routines, one per channel: SEO, AEO, GEO, backlinks
and curated lists, social and community, launch surfaces and portals, and
measuring any of it. 34 citations, 0 broken; roughly half the steps are `ref`s
into `seo-playbook` rather than copies, so rewording a step there updates every
channel that reuses it. Ten clauses sit in the tray as proposals.

Two new bands, and the distinction they draw is the useful part: **everything
above them is a machine deciding whether to show us, and these two are a person
deciding.** A machine can be satisfied by construction, which is why it is
gateable. A moderator cannot, the cost of getting it wrong is the account rather
than a ranking, and nothing under those bands can be gamed by markup.

### Three instrument failures, in one afternoon, all in our favour to catch

**A compression probe reported no encoding on four URLs** and named it a real
performance defect. It had never sent an `Accept-Encoding` header. Every page is
brotli. The reading was stable, repeated and confident, which is exactly what a
correct reading looks like.

**A `site:` query returned ten results, none of them this site**, beside a claim
of 102,000 — an engine serving generic content to a script-shaped client, with
nothing in the response saying so. That is why `scripts/reach/gsc-links.mjs`
reads Search Console's own export and exits 2 with UNMEASURED rather than 0.
Zero is a finding; unmeasured is a gap; a script printing 0 because it could not
read its input has told a lie with a number in it.

**And the console accepted ten writes into the wrong book, reporting success ten
times.** A POST reads its tenant from the body, and a `?skill=` on the URL was
silently ignored — which is not a 404, because the fallback is a real tenant. Ten
reach clauses landed in `campaign-doctrine`, a peer's book with work in flight,
and the only thing that revealed it was checking where they actually were. The
mismatch now refuses with a 400 naming both sides, mutation-proved three ways
including the control that matters: a body-only write must still succeed, or a
guard that refuses everything passes both negative tests.

### The ledger, and why a draft cannot be its own record

Every draft says "Status: drafts, nothing is posted", because that is how a draft
is written — and it keeps saying it after somebody posts. For Show HN and Product
Hunt, which fire once ever, that is the whole risk.
[`docs/outreach/ledger.md`](outreach/ledger.md) is the record and
`scripts/outreach-ledger.mjs` checks the two agree. **The disagreement is the
signal**: a draft claiming it was sent while its row still says draft means
somebody posted and did not write it down, and neither file can detect that
alone. A fired row with no verdict date fails too, because a verdict nobody
scheduled is one taken at three weeks — which measures the freshness boost and
reverses a correct strategy.

Seven mutation controls plus a positive one, in the repo rather than in a
session. The gate also caught eleven fresh drifts on the day it landed: the first
visit had moved 81 bytes since the drafts were corrected two days earlier.

## A query with nowhere to land (2026-08-21)

**SEO16 says to read the search report's own query list before planning a page,
because a query already producing impressions that no page answers is the
highest-value page to write next — the demand is measured rather than assumed.**
This site had 33 game pages and four homes, and nothing at all for the shape
people actually type: *math games for kids*, *jigsaw puzzles online*, *free
sudoku*. A category query arrived, found a home page listing everything, and
left.

There are 20 more documents now — five groups across four page locales, at
`/games/<category>/` and its `/he/`, `/es/`, `/fr/` siblings. 164 URLs in the
sitemap, all walked live as Googlebot, all carrying a real body.

### The threshold is derived, so a sixth group joins on its own

`MIN_GAMES_FOR_A_PAGE = 3`, and `PAGED_CATEGORIES` is `CATEGORY_IDS` filtered by
`gamesIn(c).length >= MIN_GAMES_FOR_A_PAGE`. `create` holds one game today and
gets no page; the day it holds three it gets four, in every written language,
with no edit anywhere. **`/games/create/` returning 404 is the control that
proves the filter can actually exclude something** — it is asserted in the tests
and it was checked on the live site.

`CATEGORY_IDS` comes off the copy record rather than the catalog, and that is
not a stylistic choice: `src/build` may never import `src/portal/catalog.ts`,
whose lazy loaders would pull Phaser into `vite.config.ts`.

### Authors write prose, code supplies facts — one layer up from a game page

No article states its own group size. `{games}` is a token the emitter fills
from the roster at render time, the same shape `homeCopy` already used, so a
page cannot be wrong about how many games it lists. 24 articles, written
natively in four languages, every one through the same `voice.ts` analyser the
game pages use — paragraph spread, the short-sentence floor, the per-language
banned vocabulary, one rule-of-three.

The gate has a **population positive control**, because a voice check that
silently ran over zero articles reads exactly like a clean sweep. That is the
`LOCALES = ["he","en"]` literal from the Spanish promotion wearing a different
hat, and it is the second time a content gate here has needed one.

`CategoryContent` is `Record<PageLocale, Record<Category, CategoryCopy>>`. A
language promoted before its prose exists is a red build; so is an SDK category
added with no copy. Neither is a review miss.

### Where the inbound links went, and why it was a measurement

The instinct is to link the category pages from the home body, where every
visitor and every crawler lands. **Measured on the artifact, two arms from one
tree: five links in `homeShellBody` cost 81 B gz on the first visit — 90,356
against 90,437 — with 63 B of headroom at the time.** So the obvious placement
was over budget by 18 bytes before anything else landed that week.

They went into the game-page breadcrumb instead: `Home › Classics › Snake`, with
the middle crumb a link only when `PAGED_CATEGORIES` holds that category. It
costs the shell **zero** — the breadcrumb is emitted, build-time, shipped to
nobody's first visit — and it produces 132 contextual links instead of 4, each
on a page about a game in that exact group. The better placement was also the
free one, and only the measurement said so.

### Three gates broke, and all three were real defects

None of them was the gate being fussy.

**The `boots` predicate was a path regex.** `build.test.ts` decided which pages
mount the app with `/(^|\/)games\//`, which is true of `/games/snake/` and also
true of `/games/kids/` — so a pure document was held to the app-shell rules and
failed for a reason unrelated to what was wrong. It reads `KIND_OF.get(fileName)`
off the route table now, which cannot be wrong about what a page is. That is the
same list-of-page-kinds trap the English home hit, on its fourth outing.

**Every category page in a language resolved to one share card.** `ogImageFile`
built its name from `route.kind` and `route.id`, and a category route has no
`id` — so all five collapsed onto `og/category-en.png`. A valid PNG, of the
wrong group, on four pages out of five.

**The hreflang sibling key ignored the category**, so a cluster could point at
the wrong group's page in another language.

### And a fourth, found by the `/document` pass rather than by any gate

**16 of the 20 category pages named `kids` as their twin in every language, in
the sitemap.** The sibling lookup in `siteFiles.ts` keyed on `kind` and `id`; a
category route carries no `id`, so `o.id === r.id` was `undefined === undefined`
for every category in a locale and `find` returned whichever came first.
`/games/kids/` was correct by position alone.

Three things make it worth writing down. **The page's own `<link
rel="alternate">` tags were perfect throughout** — two code paths emit the same
cluster and only the one nobody opens was wrong. **The reciprocity gate passed**,
because it reads the page tags, so a real hreflang defect sat under a check
written for hreflang defects. And **the comment four lines above the buggy line
describes this exact bug**, from the time the boards declared the room as their
twin: a documented trap is not a closed one.

The previous fix replaced a branch with a lookup, which stopped a new page KIND
from falling into a wrong else. It could not stop a new DISCRIMINATOR from being
absent from the key. The key is the page **family** now — the path with its
locale prefix removed — because a field list has to be extended by hand every
time the route type grows and a path family cannot fall behind it.

The gate that would have caught it reads the sitemap's clusters and requires
them to equal the pages' own. It went RED on the shipped `dist/` naming all 16,
then GREEN, with both directions controlled: a parser returning an empty map
would pass every "they agree" assertion vacuously, so the control that matters
is the one proving it can see *present*.

### A rule written when the 404 was the only non-booting page

`assert-pages.mjs` asserts a document fetches nothing eagerly. That was written
when `404.html` was the only page in the population, and it failed all 20 new
pages over the Google Analytics tag they are *supposed* to carry. The first fix
keyed the exemption on `page.indexable`, which the manifest does not publish —
so it failed all 20 again, this time with a message about the very script it was
meant to allow. It keys on `page.kind !== "notFound"` now, **the same predicate
the coverage gate uses**, so the two cannot demand and refuse the same thing.

### Comments in `DOCUMENT_CSS` are served

Trimming one explanatory comment on the breadcrumb rule took it from 615 B raw
to 304, which is 248 → 133 B gz **on every content page**. The CSS in
`layout.ts` is emitted into the document; unlike the comments in `global.css`,
which Vite strips, these ship. Roughly 41% of each page's CSS, compressed, is
commentary. Only the one block was cut — the rest is a whether-question, not a
sweep.

### What it cost

First visit **90,356 B gz of 90,500**, 144 spare — the pages are documents, so
the runtime paid nothing; the movement is the breadcrumb's markup and CSS. Slope
121.5 B gz per game against a 140 budget, unmoved: this adds no per-game term.
Live: 164/164 URLs a real body as Googlebot, `/games/create/` 404, 36/36 and
35/35 planted defects caught by the two gates' controls.

## Every page offers the reader their own language (2026-08-21)

The Search Console export said the site was found and the arrivals were landing
in the wrong language. 76% of the queries Hebrew, 65% of the impressions Israel,
**11% of those impressions on a `/he/` URL**. Six Hebrew minesweeper queries
earned 19 impressions and `/he/games/minesweeper/` earned zero of them - Google
served the English page, which had 33.

The Hebrew pages were not the weak lane, which is the finding that inverts the
obvious reading. Where Google served one it ranked around **6**; the English
game pages averaged **27**. The hreflang cluster was reciprocal, self-referencing
and correct throughout. It is addressed to a crawler, and there was nothing
anywhere on any page that told a reader the Hebrew version existed.

**So the bar is EMITTED, not rendered, and that decision is what made "every
language" free.** `src/build/langOffer.ts` writes one row per language the page
actually has - derived from its own alternates, so a fifth locale gets a fifth
row with no edit - all hidden, and one attribute on `<html>` chooses which shows.
No script ever writes text, a href or a direction, so a wrong-language bar is
impossible rather than unlikely. Cost to a first visit: **zero**, on a ceiling
with 30 B of room, because `src/build/**` ships to nobody. And it is on screen in
the first paint rather than after the bundle, which is the right moment for
somebody who arrived from a search result.

The React version was written first, as the mock the operator eyeballed, and
deleted in the same change that emitted the real one. Two implementations of one
feature is how they drift.

**Never a redirect** (SEO3): a crawler follows one too, and every other language
drops out of the index.

**The four home shells are the gap, deliberately.** `/`, `/he/`, `/es/`, `/fr/`
render no `DOCUMENT_CSS` and no emitted chrome - the app draws all of it - so a
bar there would have to live in the bundle, which is the cost this design exists
to avoid. 4 of 164 documents, 11% of the impressions.

Measured in five fresh browser contexts at 390px: `he`, `es` and `fr` each get
their own row with the right text, href and direction; an English reader on the
English page and a Hebrew reader already on `/he/` get nothing; a German reader
whose second preference is English gets nothing; dismissal survives a reload.

**The measurement trap, and it nearly shipped as a finding.** The offer arms read
**CLS 0.28** and the no-offer arms 0.003 - damning, and false. Re-run with the
arms interleaved, an `en-US` arm with no offer at all read **0.283**: the shift is
the game mounting into a 48px poster and becoming a 581px board, it predates this
work entirely, and the arm ORDER is what made it look like the offer's. The
offer's own contribution is 0.005 against a 0.004 control. **Parked, not chased:
that 0.28 is real and is somebody's next piece of work.**

Seven planted defects, seven killed. The eighth SURVIVED and is why the copy
table is pinned directly rather than through a rendered page: a page never offers
its own language, so a row copied from the page's language is absent from that
page's markup and a rendered-row check reports every remaining line distinct -
green, over the one mistake it exists to catch.

Three clauses went to the console and wait on a verdict: **SEO17** (hreflang
speaks to the crawler, the reader needs an offer), **SEO18** (cross the queries
against the URL that earns each one, per language) and **RCH11** (a row in a
search report is a historic record, not a live fact - fetch before filing).
Three playbook steps cite them.

Two rules came out of the same day, both measured rather than reasoned:
[`a-number-belongs-to-the-toolchain-that-ships-it.md`](../.claude/rules/a-number-belongs-to-the-toolchain-that-ships-it.md)
(CI is Node 22, this machine is Node 24, and the same commit differs by 54 B gz
against 141 B of headroom) and
[`a-script-that-runs-on-import-prints-its-importers-verdict.md`](../.claude/rules/a-script-that-runs-on-import-prints-its-importers-verdict.md).
The second one found three live instances in `scripts/reach/`, including a guard
written for exactly this defect that **threw** - `pathToFileURL(process.argv[1])`
raises when there is no `argv[1]`, so the line written to stop a hijack crashed
the importer instead. Nobody had imported it.

## The catalogue arrives in two beats (2026-08-21)

The first visit was **84 bytes** from refusing the next game. The operator chose
step 3 of [`docs/scaling-the-first-visit.md`](scaling-the-first-visit.md) over
raising the ceiling again, so the shell stopped carrying a record for every game.

Measured first, and the measurement is what killed the obvious fix. Deleting each
field's occurrences from the served shell and re-compressing: the five fields the
home grid never reads (`orientation`, `ageBand`, `renderer`, `ownsChrome`,
`scoreUnit`) come to **181 B gz = 5.5 B/game**. A game costs ~122. So pruning
does not buy even one game and cannot be the answer - which §6c of the plan had
anticipated, and the honest move was to say it with a number rather than raise
the ceiling.

What shipped instead: `shellRoster.ts` holds 15 games' metadata plus **every**
game's id and category, `gamesRest.ts` holds the other 18, and `catalog()` grows
once - from 15 to 33 - on browser idle. The ids buy 33 laid-out slots at first
paint so nothing reflows; the categories keep `learn`, `speed` and `create` in
the nav row, since all three have every one of their games below the fold and a
row a four-year-old navigates by must not pop three chips a beat after paint.
2.8 and 3.8 B per game, against a card that costs 91.

**Slope 122.1 -> 70.1 B gz per game. First visit 90,484 -> 89,985, 515 spare.**
Two arms from one tree, on the tree in front of me, today.

**`catalog()` is a FUNCTION, and that is the safety property rather than a style
choice.** `Boards.tsx` had `const METAS = CATALOG.map(...)` at module scope;
after the split that captures 15 games forever, and a player's own records screen
then shows half their games and looks complete. A call cannot be captured stale.

Four places needed the second beat and each fails silently without it:
`GameHost` must resolve through `entryFor` (`findEntry` alone says "we couldn't
find that game" for 18 of 33 - a permanent-looking error on a game that works);
`dailyRotation` picks from `ROSTER_IDS` rather than the loaded catalogue, or
today's puzzle differs between a fast connection and a slow one; `Home` reserves
an empty slot per pending id, with no label and no spinner; `Boards` recomputes
on the catalogue event.

**The import gate is ARMED, not advisory** - one import of the full roster from
anything that ships undoes all of it behind a green build. `FULL_CATALOG` moved
to `src/testing/` because inside `src/portal/` the gate counted it as a module
that ships, correctly, since it cannot tell a test helper from a screen by its
path. An exemption list would have been the wrong fix.

**Two `manualChunks` ordering traps, both found by the chunk being ABSENT rather
than by anything failing.** A pin added beside the `gameArtRest` rule emitted no
chunk at all and nothing went red; the `src/portal/**` catch-all fires first. And
line 344 pins every `src/games/*/meta.ts` to the shell before either, so it now
asks which half a meta is in - by parsing `shellRoster.ts` at config time rather
than holding a second list, because a second list here is a third copy of the fold.

**40 is not reachable from here, and the number says why.** Of the 70 that remain,
~29.5 is the emitted home's link row, which is load-bearing - it is what made `/`
visible to answer engines - and stays. The rest is the LOADER map: 33 chunk names
at 431 B gz and the import expressions at 649 B. `catalog.ts`'s own comment
claimed the loaders "cost nothing next to 33 records", written without measuring
and wrong; corrected in place. Moving the below-fold loaders beside their metas
is the next honest cut.

**A peer caught `assert:slope` broken by the commit before this one.** It parses
the roster textually and looked for `export const GAMES = [`, which is a spread
now. Two more defects fixed while in there, and the first is the dangerous one:
arm B also has to cut the ids, or it carries 33 for 25 games and **under-reports
the slope** - the direction that reads green. And the report labelled the lazy
half's length as the catalogue, printing "18 games" for a site with 33: a true
number under a false name.

## A game name that leaves the repository is a fact with no digits in it (2026-08-21)

`docs/outreach/hebrew.md` offered kindergarten teachers a game called **גדול
וקטן**. It was deleted in `0207a33` nine days earlier; the sorting game is
`sort`, and it is about colour. The draft was three days from being posted.

Every matcher in `assert-outreach.mjs` reads NUMBERS - that gate exists precisely
because hand-authored figures leave this repo and go stale
([`a-hand-authored-number-that-leaves-the-repo.md`](../.claude/rules/a-hand-authored-number-that-leaves-the-repo.md)).
A name is the same defect with no digits in it, so nothing could see it.

Each post now declares its games in an `<!-- outreach-games: -->` comment and the
gate checks **both directions**: every id must be in the roster, and its Hebrew
title must appear verbatim in the prose beneath. Both halves are needed - an
id-only check passes a RETITLED game forever. 16 controls, up from 10.

**Two normalisations, and they are the French-glossary lesson from the other
end.** The gate went red on three CORRECT posts: a title ending in `?`
(`מה נעלם?`) and a name split across a markdown blockquote wrap (`מצא\n> הבדלים`).
It loosens whitespace and trailing punctuation only, so a retitled game still
reds. A gate that reds on correct copy is a gate somebody switches off.

**It also found that three scripts each parsed the roster with their own regex**,
and my own split had broken two of them at once - `assert-outreach` crashed with
"the roster parsed to zero games" (refusing rather than reporting zero, which is
the design working) and `repo-about.mjs` would have published a wrong count to a
public GitHub field. One reader now: `scripts/lib/roster.mjs`. Same argument as
`firstBoard()` in `boardsView.ts`.

**RCH5 cannot be satisfied from here for a Facebook group, and saying so is the
finding.** Measured twice: a direct fetch returns the group's TITLE and nothing
else - no rules, no pinned post, no About panel, public or private alike. A
search index holds more, but that is somebody else's crawl on somebody else's
date, which is exactly what "fetched the way its readers see it" excludes. So
six destinations are NAMED with what is known about each, and the rules are read
by the operator, in the group, on the day, against a six-item checklist.

One rule IS readable without login and it generalises: **מורות משקיעות brokers
promotion through a named person.** A room with a paid or brokered channel reads
an unbrokered link as somebody dodging it, and the thing being free changes
nothing about how it reads. Look for that channel before posting anywhere.

## The site had no picture to feature (2026-08-22)

The operator noticed there were no images beside our Google results and asked
why. The answer was not a ranking problem or a schema problem. **Every gate here
was green and the pages contained no images at all.**

Measured live, as Googlebot, across all 33 game pages in all four languages:

| | before | after |
|---|---:|---:|
| `<img>` elements on a game page | **0** | 1 |
| structured-data `image` values | **0** | 2 |
| image rows in the sitemap | **0** | 132 |
| art files a crawler can fetch | **0** | 33 |

The art was there the whole time. It is drawn as **inline `<svg>`**, which has no
URL - so it is markup, not an image, and cannot be indexed or chosen. `og:image`
was perfect on every page and is a different thing: a social card handed to a
scraper with a URL and no page. Google chooses a result thumbnail from images the
page **embeds**. There were none, and nothing anywhere reported it, because a
missing picture breaks nothing.

**The fix is one file per game and a real `<img>`.** `src/build/artFiles.ts`
writes the same `gameArt` scene to `art/<id>.svg` at build time and `gamePage.ts`
embeds it after the lede - the first image in the article body. 33 files, **37 KB
total, and it costs a first visit nothing**: 89,979 B gz of 90,500 before and
after, because `src/build` ships to nobody.

**SVG, and that was checked rather than assumed.** Google's image documentation
lists what it indexes from an `img` `src` as "BMP, GIF, JPEG, PNG, WebP, SVG and
AVIF". `schema.ts` already leaned on that same list for the Organization `logo`,
so this is the second use of one fact rather than a new bet.

**1200x900 rather than the art's own 200x150 viewBox.** A vector has no intrinsic
size until one is declared, and a crawler measures the declared box. 4:3 is one of
the three ratios Google names and 1200 wide clears every stated bar. It costs
nothing - the path data is identical at any size.

### The precache trap, which this is the first asset in months to hit

`globPatterns` is `**/*.{html,css,js,svg,woff2}`. **SVG is in it.** Without an
`art/**` entry in `globIgnores`, 33 files land in the precache and every child
downloads a picture of every game before choosing one, with a green build and an
unmoved payload gate. Measured after the entry: **0 art files in an 11-entry
precache manifest.** `.claude/rules/precache-glob-sweeps-new-chunks.md`.

### The alt was the H1 for an hour, and the H1 is not a description

The first version used `headingFor()`. That is `"{title}"` in every language
except Hebrew, so the alt read **`2048`** - a name, to the two audiences who only
ever get the alt: a screen reader and a crawler. It is now `site.artAlt`, one
template per language with the name filled in, and `build.test.ts` reads the
emitted attribute back out of a real page and refuses an alt that is only the
name. Registering the new `{title}` token is also what `content.test.ts` caught
me failing to do, which is that gate working.

### What we really need from schema, having actually looked

The operator asked to research before dropping anything. Checked against Google's
current rich-results gallery, 2026-08-22:

- **HowTo and FAQPage rich results were both retired on 2023-08-08**, and FAQ has
  since left the gallery entirely. Roughly 23 of the 33 JSON-LD nodes on each game
  page are theirs. Google states there is **no need to remove** deprecated markup -
  it is inert, not harmful - and answer engines still parse the FAQ cleanly, which
  is the reason `schema.ts` already gave for keeping it. **So nothing is dropped.**
- **`VideoGame` is not a Search feature on its own.** Google's Software App page
  asks for it to be **co-typed with `SoftwareApplication`** for a game to be
  eligible at all. We had carried only the half that produces nothing since the
  file was written. That is now `"@type": ["VideoGame", "SoftwareApplication"]`.
- **And it still produces nothing, for a reason worth writing down rather than
  re-deriving every quarter.** Software App requires `name`, `offers.price`, and
  either `aggregateRating` **or** `review`. We have the first two and will never
  have the third: we collect nothing about a player, so there are no ratings, and
  inventing them breaches both our own rule and Google's structured-data policy.
  The one image-bearing rich result a game can qualify for is closed by a decision
  we would make again - so the picture has to come from the page, and now does.

### The gate

Seven artifact checks in `assert-pages.mjs`, each mutation-proven against a real
`dist/`: the `<img>` removed, the art file deleted, the JSON-LD `image` dropped,
the co-type lost, the sitemap image namespace dropped, an image row pointing
nowhere, and the alt flattened to the bare name in every language. **7 of 7
killed, and the unmutated artifact still passes** - a gate that refused
everything would pass every negative test ever written. Controls went 38 to 41.

The extractor's own control is the one that earns its place: the emitter writes
one attribute per line, so a matcher built on `.` reports **zero images on a page
that has one** - which is the exact reading this whole gate exists to disprove. A
false green there would have been indistinguishable from the defect.

Three artifacts state this fact and each is checked against the others, because
two of them are files nobody opens. Checking any one alone is checking the wrong
thing, and it reads green - the same lesson as the 16 category pages whose
sitemap named the wrong twin while their own tags were perfect.

Doctrine: **SEO19** (a result's picture comes from an image the page embeds),
**SEO20** (check a type against the current gallery before trusting it), **SEO21**
(close an unreachable rich result with a number, not a fabrication) - all three in
the tray at `localhost:8775`, plus playbook steps A11, A12, A13 and B7.

## The 0.28 layout shift was on the room, not the game (2026-08-22)

The plan had carried this as "a real Core Web Vitals failure on the site's main
content", meaning the game page. Measured across 8 pages x 2 viewports on the
live site, that is not where it is:

```
  every game page       0.003 - 0.010   good
  the boards            0.028           good
  a category page       0.010           good
  the room, desktop     0.044           good
  the room, PHONE       0.297           POOR      <- all of it, on one page
```

**Cause, measured rather than inferred.** Before React mounts, `#game-frame` is
content-sized and EMPTY, so it is 0px tall - and the room's box centres it,
putting it at **y=474** in a 740px box. The scene then mounts 1297px tall and the
frame snaps to **y=104**. A full-width block moving 370px is the whole number.

**The fix is `body[data-page="world"] #game-frame:empty{min-height:100%}`**, and
`:empty` is the load-bearing part: it reserves the box only while there is
nothing in the frame, so React mounting a child stops the selector matching and
the finished layout is exactly whatever it is today. Measured, three interleaved
runs, both viewports: **0.2713 -> 0.0032**, with `frame 104/1297` and `scene
104/1297` identical to the control every time.

Two obvious fixes were measured and rejected, which is why this one is odd-looking:

- **`justify-content:flex-start` on the room** - the same fix the game pages
  already have - moves the DESKTOP room from y=120 to **y=260**. That breaks the
  centring `layout.ts` defends deliberately ("the ROOM keeps center: it is a
  composed scene rather than a control panel with a board under it").
- **An unscoped `min-height:100%`** fixes the shift and changed the finished
  height by 4px in one run of three. A fix that can move the finished layout at
  all is a fix somebody has to re-eyeball.

### The probe was blind on its first run, and reported the site healthy

The first control planted a 400px block before the `h1` and read **0.0084 -
identical to the unplanted arm**. It looked like a clean bill of health for the
whole site. It was not: the stage fills the viewport, so the `h1` is BELOW THE
FOLD, and CLS correctly ignores what is off screen. Every number taken before
that control was fixed is void, including a confident "CLS is fine everywhere".

Planted at the top of the body instead, the control reads **0.3593**, and only
then do the readings above mean anything. **A control has to produce the OPPOSITE
reading, not merely a passing one** - the same lesson the deploy gate's cold-load
probe cost, and the second time in this repo a CLS measurement has needed one.

`scripts/repro/repro-room-boot-shift.mjs` carries both the measurement and the
control, and exits 1 if the probe cannot see a planted shift. The cheap CI guard
is a string pin in `build.test.ts`, mutation-proven by dropping `:empty`.

## 62.9% of the content pages' stylesheet was comments (2026-08-22)

`DOCUMENT_CSS` is a template literal emitted straight into the head of all 164
documents. **Vite never sees it**, so nothing minifies it - unlike `global.css`,
which is a real stylesheet whose comments cost a reader nothing. Measured:

```
  30 comment blocks, 17,538 of 27,900 raw bytes = 62.9%

  one game page   raw   50,995 ->  33,419   (-34.5%)
                  gz    17,476 ->  10,212   (-7,264 B, -41.6%)
  all 165 docs    gz  2,791,250 -> 1,592,931 (-1.14 MB)
  first visit           90,019 ->  90,022   unmoved
```

**The first visit is unmoved and that is structural, not luck.** This `<style>`
is emitted only when `opts.shell` is false, so `index.html` never carries it, and
`assert-payload` reads `index.html` and the chunks it names. It is a content-page
budget and must never be counted toward the ceiling.

**The source keeps every word.** The reasoning in `layout.ts` is why the next
person does not undo a measurement, and it is worth more there than the bytes are
on the wire - which is the whole argument for stripping at EMIT time rather than
writing terser comments. Both halves are pinned, because either alone is
satisfiable the wrong way: stripping the source too would pass "no comments on
the wire" while destroying the reasoning, and keeping the source without wiring
the strip passes "the source explains itself" while shipping 7.5 KB gz of prose
to every reader.

### It is a scanner, not a regex, and that is the whole design

`/\/\*[\s\S]*?\*\//g` is correct for today's stylesheet and wrong the day
somebody writes `content:"/*"` - it would eat from inside the string to the next
`*/` and take real declarations with it. The page still renders, just missing
rules: a silent failure, which is the shape this repo keeps paying for. A scanner
that knows it is inside a string cannot be wrong about it, and it also **throws**
on an unterminated comment rather than swallowing the rest of the file.

Comments are removed rather than replaced with a space, which is what the CSS
tokenizer itself does - a comment is not a token separator, so `.a/*x*/.b` is
`.a.b`. Replacing with a space would silently make it a descendant selector.

Three mutations, three killed: the wiring reverted to the source constant, the
source stripped as well, and the scanner swapped for the naive regex - which is
caught by the `content:"/*"` case and nothing else.

## The published payload figure now comes from CI (2026-08-22)

`assert-outreach` re-derived the first visit from the local `dist/`, and that is
the wrong instrument for a number that leaves the repository. This machine runs
Node 24; the deploy builds on Node 22. Same commit, **90,022 here and 90,008
there.**

That is not a rounding argument. Every draft's provenance row NAMES the commit it
was measured on, so a local reading written under that row is false about the one
thing the row exists to let a reader check - and the gate was *requiring* it.
The gate and
[`a-number-belongs-to-the-toolchain-that-ships-it.md`](../.claude/rules/a-number-belongs-to-the-toolchain-that-ships-it.md)
were enforcing opposite things.

**`docs/outreach/ci-payload.json` is the record, and it is READ OFF THE DEPLOY'S
OWN LOG** by `npm run reach:ci-payload -- --write`, never re-derived and never
retyped. It cannot be wrong about what CI measured, because it is what CI
printed. It carries the commit, the run id and the date.

### A record that rots in silence is the failure this replaces

So there are three states with three different messages, because they want three
different actions - and each was mutation-proved by planting it:

| state | what happens |
|---|---|
| **missing** | REFUSES. Never falls back to the local build - that is the behaviour being removed, and a fallback restores it on the first bad day |
| **names a commit this history lacks** | REFUSES. It was measured on a different artifact, so believing it is worse than having nothing |
| **behind HEAD** | advisory `NOTE`, with the distance named, so a draft is never checked against a 40-commit-old number without the reader being told |

**Both readings print on every run**, with the spread:

```
payload: CI 90,008 B gz at 1b8f2b9 (2026-08-22, run 32579897452)
         ·  this machine 90,022 on Node 24, +14 B apart
```

The spread is the thing worth seeing rather than rediscovering. A run that
printed only one number invites the next person to "fix" the drafts to whichever
it happened to be, which is how this started.

Four new controls: a draft quoting the LOCAL build is caught, the RECORDED figure
is accepted (so this is not a matcher that reds on every number), a record exists
at all, and the commit it names is one this repository has.

**And a bug I introduced and caught while doing it**: adding the npm script left
`assert:outreach:control` defined TWICE in `package.json`. JSON keeps the last
one, so the ledger-control step would have silently stopped running with nothing
failing. There is now a duplicate-key check in the verification for it.

## Still open

- **Wave C step 2b** — live two-way sync. Needs the profile to carry per-device
  earned/spent counters before a merge can be correct; until then the cloud is a
  backup and a transfer, and the UI says so.
- **The first-visit budget — 89,985 B gz of 90,500, 515 spare, measured
  2026-08-21 on `main` after the catalogue split (Node 24; CI is Node 22 and
  reads ~54 B lighter).** The ceiling has moved three times (86,000 → 90,000 →
  90,500) and this line has been stale twice, so **re-run `npm run build:check`
  before designing anything near the edge rather than quoting this number**. The
  history it records: two lanes raised the ceiling within hours on 2026-08-11,
  each arguing from a measured baseline the other was about to change, and
  neither described the merged tree. **Adding two deltas measured from different
  baselines does not describe any tree that exists.** The slope gate is the
  durable half — 121.5 B gz per game against a 140 budget, so the first visit is
  O(1) in the catalogue even while the absolute number drifts. **Step 3 landed:
  the slope is 70.1, not 121.5.** The O(1) target of 40 is not reachable from
  here and the section above says why with a number — the remaining 70 is the
  emitted home's link row (~29.5, load-bearing) plus the loader map.
  See [`a-threshold-tuned-against-todays-tree-goes-stale.md`](../.claude/rules/a-threshold-tuned-against-todays-tree-goes-stale.md).
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
- **Recovery from the crawl block is CONFIRMED** (2026-08-21, Search Console
  Performance export, in `docs/outreach/exports/performance-2026-08-21/`). The
  step is unmistakable: **4 impressions across the 9 days before 2026-08-10, and
  227 across the 9 days from it** — 25 a day where there had been one every
  other day. The CDN fix of 2026-08-08 is what Google was waiting on, and the
  two-day lag is a recrawl, not a doubt. 55 distinct URLs earn impressions
  across all four written languages, so the pages are indexed. Read it with
  `npm run reach:perf`.
- **First-visit EXECUTION is proven for 5 of 22 games**, not all of them. A fresh
  browser context per game covers bubbles, coloring, snake, sudoku and memory; the
  other 17 are verified mounting as a *returning* visitor plus byte-identical
  delivery from the network, which is a strong argument and not a measurement.
  Residual risk is low and it is not zero. `blocks` (2026-08-09) is one of the 17:
  it was driven end to end in dev, and live only by byte equality.
- **76% of the demand is Hebrew and 11% of the impressions are on Hebrew URLs.**
  Measured 2026-08-21. Israel is 65% of all impressions; the query list is Hebrew
  long-tail game names (`שולה המוקשים`, `מצא את ההבדלים`, `משחקי זיכרון לילדים`).
  But `/he/games/minesweeper/` earns **zero** impressions while its six Hebrew
  queries earn 19 between them, and `/games/minesweeper/` — English since the
  2026-08-14 flip — earns 33. **The Hebrew demand is landing on English URLs.**
  The most likely cause is that flip: the bare paths were Hebrew when Google
  first indexed them on 08-10, so they hold the Hebrew rankings and now serve
  English. Every page is technically correct (200, `lang="he"`, self-canonical,
  reciprocal hreflang, in the sitemap), which is why nothing here could see it.
  If it is the flip, hreflang resolves it on recrawl and the fix is patience —
  but that is a hypothesis with a test, not a finding. Re-export in 30 days and
  compare the `he` supply share. **No verdict before ~2026-11-19 either way**
  (SEO11).
- **Bing Webmaster Tools is not claimed.** IndexNow submits fine without it, but the
  coverage reports need the site added at <https://www.bing.com/webmasters> — an
  operator action, not a code one.
- **Every payload figure in this repository was measured on the wrong Node.**
  CI builds on **Node 22**; this machine runs **24**. Same commit, same lockfile,
  zero dependency drift — and **90,359 B gz there against 90,413 here, 54 bytes
  apart**, with 141 bytes of headroom. So the toolchain alone is a third of the
  remaining budget. Neither number is wrong; they describe two different
  artifacts, and nothing said so. The chunk basenames are identical and only the
  shell's 202 bytes differ, which is why nothing downstream ever noticed.
  `assert-payload.mjs` now reads `node-version` out of the deploy workflow and
  prints a NOTE when the two disagree — one source of truth, the same discipline
  as parsing the bot list out of the served robots.txt. **Quote a payload number
  from a CI run before writing it anywhere a reader acts on.** Found while
  reconciling the outreach drafts, which had been carrying local figures.
- **Backlinks: ZERO, and that is now MEASURED rather than unknown.** The Search
  Console Links report was empty on 2026-08-21 — the engine's own report, which
  is what RCH8 requires, so this is a finding and not a gap. It also explains the
  position curve: only **26% of impressions come from pages averaging page one**,
  and the rest sit at 11-50. A three-week-old domain with no links ranking at 20
  to 30 for competitive queries is the ordinary no-authority curve, not a content
  defect. Links are the lever. `npm run reach:links` still prints UNMEASURED
  because an empty report exports no file; the zero is recorded in
  `docs/outreach/exports/README.md` and the ledger.
- **The GitHub repository description is FIXED** (verified live 2026-08-22: the
  About box and `node scripts/reach/repo-about.mjs` now agree, both reading
  "Free browser games for kids and grown-ups. 33 games, 4 languages, no ads, no
  account, works offline"). It read "in Hebrew and English" for weeks while the
  site served four written languages, and it is derived from the roster and
  `PAGE_LOCALES` rather than typed, so it cannot re-break on the next game.
  It lives in a vendor panel no gate here can reach, so re-check it with
  `npm run reach:about` rather than trusting this line.
