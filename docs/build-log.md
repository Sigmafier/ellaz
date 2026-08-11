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

## Still open

- **Wave C step 2b** — live two-way sync. Needs the profile to carry per-device
  earned/spent counters before a merge can be correct; until then the cloud is a
  backup and a transfer, and the UI says so.
- **The first-visit budget — the ceiling is now 90,000 and the figure under it is
  UNMEASURED.** Two lanes raised it on 2026-08-11 within hours of each other:
  88,000 argued from a measured 86,653 (a tree without Word Guess) and 90,000 from
  a measured 86,004 (a tree without the emitted Hebrew home). The merge kept
  90,000. **Neither number describes the merged tree, and adding the two deltas
  does not either** — each was measured from a baseline that no longer exists. Run
  `npm run build:check` on the merged tree before designing anything near the
  edge, and add the row to the history block in `assert-payload.mjs`, which
  currently records Word Guess (+234) and nothing for the home document (+1,770).
  A new game still costs the shell ~300 B.
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
- **Recovery from the crawl block is unconfirmed.** The server side is clean and
  `assert:crawlable` is green, but only Search Console can prove Google's own IPs
  are through. Watch the Sitemaps panel; "could not be read" can linger for days
  after the underlying fix.
- **First-visit EXECUTION is proven for 5 of 22 games**, not all of them. A fresh
  browser context per game covers bubbles, coloring, snake, sudoku and memory; the
  other 17 are verified mounting as a *returning* visitor plus byte-identical
  delivery from the network, which is a strong argument and not a measurement.
  Residual risk is low and it is not zero. `blocks` (2026-08-09) is one of the 17:
  it was driven end to end in dev, and live only by byte equality.
- **Bing Webmaster Tools is not claimed.** IndexNow submits fine without it, but the
  coverage reports need the site added at <https://www.bing.com/webmasters> — an
  operator action, not a code one.
