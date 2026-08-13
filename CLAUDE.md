# CLAUDE.md — Ellaz Games Platform

Guidance for Claude Code (and humans) working in this repo.

## What this is

Ellaz is a **cross-device casual-games PWA** — one website where kids and adults
play our games on phone, tablet, and PC. English (default, LTR) + Hebrew (RTL).
Anonymous play, on-device saves, anonymous kid-safe analytics. No backend.

**What shipped, in order, with the measured numbers and the traps each one
cost**: [`docs/build-log.md`](docs/build-log.md). Read it before re-deriving a
payload figure, re-litigating the engine choice, or wondering why analytics has
never produced data. [`docs/architecture.md`](docs/architecture.md) is the
module map and the SDK contract.

## Commands

```bash
npm install
npm run dev        # http://localhost:5180 (no service worker — use for QA)
npm test           # Vitest: pure-logic + catalog tests
npm run build      # tsc --noEmit && vite build → dist/  (also the type-check gate)
npm run preview    # serve the production build on :5180
```

**QA gotcha:** the production build registers a service worker (`autoUpdate`) — a new
deploy activates on the user's next load and reloads the page. A tab already open on
the old SW still serves the cached bundle until that reload, so when eyeballing a
fresh build use `npm run dev` (no SW) or clear the SW/caches first.

## Architecture

Single Vite + React 18 + TypeScript app. Phaser 4 powers canvas games. Internal
module boundaries mirror extractable packages 1:1 (import via the `@sdk`/`@ui`/
`@juice`/`@i18n`/`@shared` aliases, never deep paths):

```
src/
├─ sdk/      Game SDK - the neutral contract every game implements
│            GameModule/GameContext, SaveStore (localStorage), analytics port
│            (PostHog behind an interface), audio port (named SFX + tone/time),
│            speech port (Web Speech TTS), lifecycle, ads stubs, and the rewards
│            economy (economy + profile + wallet, surfaced as ctx.rewards)
├─ shared/   Neutral game helpers - rng (mulberry32/seedFrom/randInt/pick/shuffle),
│            pentatonic notes, winMoment() (the canonical win)
├─ ui/       Design tokens + RTL-aware components (Hebrew-first fonts, big targets)
│            + DifficultySelector (the shared level row)
├─ juice/    Game-feel kit - haptics, screen shake, particle burst, full-screen
│            confetti, flyTo (coins arc to the wallet chip), tween
├─ i18n/     he (default, RTL) + en (LTR) strings + direction, and `locales.ts` -
│            the TWO locale sets (see below). A leaf module importing nothing
├─ portal/   Shell - App (the home screen at `/`), Home (grid of real links),
│            PageApp (boots a game or the room on its own page), GameHost
│            (mount/unmount bridge), WalletChip, games (the ordered roster),
│            catalog (roster + lazy loaders), paths/pageContext/legacyHash,
│            world/ (the room + shop)
├─ build/    BUILD-TIME ONLY - the 90 emitted pages. Pure strings, no DOM, no
│            React. Nothing in the app may import it (it reads src/content)
└─ games/<id>/
   ├─ meta.ts         DOM-free GameMeta - catalog.ts imports it statically
   ├─ logic.ts        PURE game logic - NO DOM/Phaser imports; unit-tested (TDD)
   ├─ logic.test.ts
   └─ <Renderer>      React component (DOM) or Phaser scene (canvas)
```

**Games (29)** — 21 `ageBand: "kids"` (balloons, bees, bubbles, coloring, echo,
evolve, finddiff, frog, hidden, maze, math, memory, merge, music, pet, reaction,
sequence, shadows, sort, sortsize, vanish) and 8 `"all"` (blocks, fit,
minesweeper, n2048, snake, sudoku, tictactoe, wordguess).
Counts here go stale fast — `src/portal/catalog.ts` is the source of truth and
`catalog.test.ts` ratchets the count. This line said 25 for about six hours on
2026-08-13 while four more games shipped, which is the ordinary rate of decay:
read it off the roster rather than off this sentence.

**`create` is no longer empty.** It was declared in `CATEGORY_ORDER` from the
beginning and held zero games, so that heading never rendered once. `music` is
the first thing in it. Every game offers a **difficulty selector**
and/or endless levels: 20 declare their `levels` to `<GameChrome>`, which owns
the level toggle (the two exceptions are finddiff, which is endless, and evolve,
which gets its levels from the n2048 renderer it borrows). Only **math and
sudoku still render `<DifficultySelector>` directly** — the other eight files
that name it import its `DifficultyOption` type and nothing else. Wins go through **`winMoment()`** from
`@shared`, which owns the confetti (there are zero `celebrate()` calls left in
`src/games/`).

**Deploy**: pushing to `main` deploys to **two hosts in parallel**, from the same
source at two different base paths. The PWA is `registerType: "autoUpdate"` so
returning players get new versions automatically. Repo is public; collaborator: Benzi.

| URL | Host | Workflow | Base |
|---|---|---|---|
| **`https://ellaz.fun/`** (the live site) | Hostinger, over FTPS | `deploy-hostinger.yml` | `/` |
| `https://sigmafier.github.io/ellaz/` | GitHub Pages | `deploy-pages.yml` | `/ellaz/` |

The two are deliberately kept separate rather than pointing ellaz.fun at Pages:
a Pages custom domain 301-redirects the `github.io` path onto it, so a project
site gets exactly ONE hostname. Keeping both live costs a second build.

The Hostinger job reads three repo secrets (`FTP_SERVER`, `FTP_USERNAME`,
`FTP_PASSWORD`), already set. Missing them it **skips with a warning instead of
failing**, so **a green checkmark is not proof it deployed** — check the
`Upload to Hostinger` step's conclusion, then check the live artifact. Three
host settings were each verified against the live server on 2026-08-02 because
each would otherwise produce a green deploy beside a frozen site: the account is
chrooted so `server-dir` is `./` (not `public_html/`), the username is
`u210394724.ellaz` (not `…ellaz.fun`), and the cert is `CN=*.hstgr.io` so
`security: loose` is required.

**The deploy now proves it landed, instead of asking you to.**
`scripts/assert-live.mjs` runs in the same job and reds the run unless the live
HTML references the same hashed assets as the `dist/` just built AND every one
of them is fetchable. Both halves are load-bearing: "all assets 200" passes on a
fully stale site, and "the HTML matches the build" passes on a site whose chunks
never landed. Only the conjunction separates *the site works* from *my build is
live*.

It exists because on 2026-08-08 ellaz.fun served a blank page for an hour while
deploys reported success in 90 seconds. `SamKirkland/FTP-Deploy-Action` kept a
sync ledger **on the server**; a transfer died after the ledger was written; and
every run since diffed against a file claiming the missing chunks were present,
so it skipped them forever.

The upload holds no ledger now. `mirror` runs on **`assets/` and nowhere else**,
where every name carries a content hash so a changed file is a *new file*; the
other 108 files are **forced**, ordered so the 50 that name hashes go last, and a
run dying mid-transfer leaves a *stale* site rather than a blank one. The
invariant is narrower than "no ledgers": **the thing deciding what to send must
not be able to be wrong about what is already there.** A JSON ledger can be; so
can a size comparison, which skipped all 49 pages once because Vite hashes are
fixed length and an HTML file differing only in a hash is byte-identical in size.
The gate also compares each artifact by **SHA-256**, because an 80%-truncated
chunk is 200 with a plausible length and a syntax error on import. A status sweep
over `/`, `/games/snake/`, `/world/` and `/boards/` reported **all 200
throughout the outage**, because a 200 document whose JS 404s is a blank page.
[`.claude/rules/a-deploy-ledger-that-can-disagree-with-the-disk.md`](.claude/rules/a-deploy-ledger-that-can-disagree-with-the-disk.md).

**Runs sitting QUEUED with zero jobs means Actions is disabled on the
repository** - `gh api repos/Sigmafier/ellaz/actions/permissions`. A *blocked*
action fails at "Prepare all required actions"; it does not queue. Two different
faults, mistaken for one on 2026-08-08.

Cache headers live in `deploy/hostinger.htaccess`, copied to `dist/.htaccess` by
the workflow and shipped to Hostinger only (Pages runs nginx). The SPA catch-all
that used to live there is gone: every route is a real document now, so the only
thing it still caught was a typo, and answering a typo with 200 plus the home
page is a soft 404. `ErrorDocument 404 /404.html` replaces it.

**Runbook — read this before touching any of it**:
[`docs/deploy.md`](docs/deploy.md) (verification commands, troubleshooting table,
secret rotation, the CDN edge-cache caveat, and how to move to Pages later).
The discipline that found those three settings:
[`.claude/rules/verify-the-deploy-target-not-just-the-run.md`](.claude/rules/verify-the-deploy-target-not-just-the-run.md).

**The Hostinger CDN is OFF (2026-08-08), and that is load-bearing for SEO.** Its
`I'm Under Attack!` mode had been on, serving every crawler a JavaScript
proof-of-work it cannot solve: HTTP 403 with an HTML body where the sitemap
belonged, while the site loaded perfectly in a browser. Google reported "Sitemap
could not be read", 0 discovered pages. Nothing in this repo could see it - every
gate here asserts against `dist/`, and none against what a crawler receives over
the network. If the CDN is ever re-enabled, set Security Level to **Essentially
off** in the same visit; the Medium default is enough to re-block a 48-URL crawl.
Verify by `curl`ing as Googlebot, never in a browser:
[`.claude/rules/a-bot-challenge-at-the-edge-is-invisible-from-your-browser.md`](.claude/rules/a-bot-challenge-at-the-edge-is-invisible-from-your-browser.md).

**`npm run assert:crawlable` is the only gate here that reads the NETWORK** rather
than `dist/`, which is precisely why it exists — a 403 to every crawler passed every
other check in this repo. It fetches robots.txt and the sitemap as Googlebot and then
walks all 78 URLs; that walk IS the burst test, since the challenge arms on a run of
requests rather than the first one. It checks the BODY as well as the status, because
a challenge can be served with 200. `.github/workflows/crawlable.yml` runs it daily
and a red run emails the owner. Node built-ins only, so it needs no `npm ci`.

**And it walks as every crawler robots.txt NAMES, not only as Googlebot** — because
walking as one agent is structurally incapable of seeing a block keyed on another.
Measured 2026-08-13: this gate was green while **GPTBot received HTTP 429 on every
HTML page**, from Hostinger's own server, contradicting the `Allow: /` our emitted
robots.txt grants it. `sitemap.xml` and `llms.txt` returned 200 for it throughout, so
a check pointed at either would also have been green. Every citation crawler
(OAI-SearchBot, ClaudeBot, Claude-SearchBot, PerplexityBot) is served, so ChatGPT,
Claude and Perplexity citations are unaffected; the two refused agents are *training*
crawlers. **The bot list is parsed out of the SERVED robots.txt** rather than kept in
the script, so there is exactly one list and the gate asks only "does the server serve
what our own file promises". **One URL per bot**, since the 78-URL walk is already the
burst and a per-UA block has never been per-URL. **The probe must send a crawler
SHAPE**: measured, the bare token `GPTBot` gets 200 from the same server that 429s
`Mozilla/5.0 (compatible; GPTBot/1.0; …)`, so a gate built on the token alone reports
green over the defect it exists for. Advisory until `CRAWL_BOT_ACCESS=1`, for the same
reason the content floor is — a known offender is live and nobody here can fix a
vendor setting today.

**It also reads HOW MUCH BODY, because a 200 carrying the whole correct document
and no content is the third shape of this failure and the one a status check can
never see.** `bodyStats()` counts words, links and headings in the raw body and
`CONTENT_FLOOR` is 60/3/1. Three exclusions, and the surprising one is BODY-ONLY:
`/` scored **96 words** with tags stripped across the whole document on a body of
29 bytes, all 96 being an HTML comment in the head about pinch-zoom — so a floor
under 96 would have passed an empty shell forever while showing a reassuring
non-zero number. Comment-stripping is narrower than it looks: the generic tag
strip already eats a comment with no `>` inside, and that line earns its place
only on comments holding one.

**The floor is ADVISORY until `CRAWL_CONTENT_FLOOR=1`.** It reports the count every
run and fails only when armed, because it was written while a known offender was
live and a gate that reds on day one for something nobody can fix that day teaches
its reader to ignore the daily email. Arming is one line in `crawlable.yml`, in the
same change that makes the last offender pass.

**60 and not 120**, and that number moved for a reason worth keeping: the emitted
home is deliberately compact, and at 120 the Hebrew one (130 words, when Hebrew
held `/`) cleared the floor by ten words — one trimmed sentence would have reded
a correct page. The English home that replaced it measures 181 words, which is
more headroom by accident rather than by design, and is exactly why the floor
stays at 60: the distance a floor must see is empty-vs-real, and that gap is a
chasm at any sane value. See
[`.claude/rules/a-threshold-tuned-against-todays-tree-goes-stale.md`](.claude/rules/a-threshold-tuned-against-todays-tree-goes-stale.md).

The body scan uses `indexOf`/`lastIndexOf` rather than a regex, and that is a fix
rather than a style choice — `/<body[^>]*>([\s\S]*)<\/body>/i` is quadratic on input
with many `<body` and no `</body>` (117 KB took 8.8 s; it now takes 10 ms). No live
page can reach it, but this is the one gate whose job is to notice when the server
serves something we did not build, so malformed input must not be what stalls it.
`scripts/repro/repro-bodystats-quadratic.mjs` asserts the growth RATE and exits 1 if
it comes back.

**The repo moved to the `Sigmafier` org** (2026-08-02). `ytrofr/ellaz` still
redirects on push, so a stale remote works and hides the move — but the LIVE URL
changed with it, and `ytrofr.github.io/ellaz` is not it. Verify with
`gh api repos/Sigmafier/ellaz/pages --jq .html_url` rather than trusting this line.

**RTL gotcha**: a spatial game grid must carry `dir="ltr"` so it does NOT mirror in
the Hebrew RTL app (else swipe/arrow directions invert — see `src/games/n2048`); the
math equation is also pinned `dir="ltr"` for standard notation.

## Rewards, the World, and speech

**The economy.** A game reports WHAT HAPPENED and never says what that is worth.
`ctx.rewards.grant({ reason, tier?, level? })` takes one of three reasons
(`level_complete`, `milestone`, `personal_best`) plus an optional tier
(`easy`/`medium`/`hard`), and `src/sdk/economy.ts` alone decides the payout: 3/5/8
coins by tier, a flat 1 coin for a milestone, and one star for every reason that
is not a milestone. Coins are spent. Stars are a trophy count that is never spent
and never lost, and they also gate the premium shop items (`requiresStars`). Full
rule and traps: [`.claude/rules/rewards-economy-convention.md`](.claude/rules/rewards-economy-convention.md).

**Add-only by design.** `RewardsPort` has no `spend()`. A game can only ever put
coins in. Spending happens in exactly one place, the World screen, against the
`wallet` singleton, so no game (and no bug in a game) can take a player's coins.
The profile persists at `ellaz:profile:v1` behind `migrateProfile()`, which
coerces anything it is handed (missing key, truncated write, hand-edited junk, a
future shape) into a usable profile and must never throw.

**The win moment.** `winMoment(ctx, {...})` from `@shared` is the canonical win:
it grants and persists FIRST, then plays sound, haptics, confetti and the coin
flight to the wallet chip, then fires analytics. The cosmetic half is wrapped in
try/catch, so a thrown animation can never cost a kid a coin. Confetti defaults
ON; endless-game milestones pass `confetti: false`.

**Scores.** Same shape as the economy, one layer over: a game reports a **value
and a unit** (`points`/`ms`/`moves`) and `src/sdk/economy.ts`'s sibling
`src/sdk/score.ts` decides how that ranks — `points` high, `ms` and `moves` low.
**There is no `direction` parameter and there must never be one**, or a game
could report `ms` as "higher is better" and order its own leaderboard backwards.
The record rides the existing win as `winMoment(ctx, { …, score: { value, unit,
board } })`; `ctx.score` is add-only, with no `clear()`, exactly like
`ctx.rewards`. **22 of the 23 games have one**, and **coloring gets none, ever**
— ranking a child's drawing is the opposite of this platform's premise. That is
the whole roster: every other game keeps a record, so a missing one is a bug
rather than a gap. (evolve carries one without a line of its own — it renders
`n2048`'s component under its own game id, so it gets its own storage namespace
and its own board for free.)

**The unit is also declared, in `meta.ts`, because only the VALUE is persisted.**
`ellaz:sudoku:score:easy` holds a bare `12750`, and nothing reading it back can
tell milliseconds from points — which is the difference between fast winning and
slow winning. So `scoreUnit` lives on the DOM-free meta, the one place the
catalog can read without importing a renderer, and
`score-unit-declared.test.ts` reads each game's own source and requires the two
to agree. A unit copied to the wrong game type-checks, renders, and orders that
board backwards for exactly the games using it, so the pin is the whole point;
it was mutation-proved on sudoku and memory. It follows a borrowed renderer
rather than hardcoding one, so evolve resolves through `n2048` with no special
case.

What each game records is the honest answer to "how well did that go", not one
imposed shape: a **time** where a clock exists (sudoku, minesweeper), **moves**
where the game already counted them (memory), **how far up an endless ladder**
a run got (balloons, bubbles, frog, sequence, shadows, sortsize, vanish, hidden,
finddiff), and for tictactoe the **longest run of wins** against that difficulty's
AI. Two of those deserve their traps written down: finddiff records cumulative
scenes cleared rather than the "Level" it displays, because Level only bumps
after a full pass and would leave most players a permanent record of 1; and
tictactoe's hard AI is unbeatable minimax, so its record may honestly stay empty.
`board` scopes a record to a difficulty wherever the scales differ
(6 pairs vs 10, a 4×4 animal sudoku vs an expert 9×9). The six games that kept
their own `best` before this existed are on the default board **on purpose**, so
their players' records survived; a read-through `legacyKey` shim carries those
old keys, and it has a kill date. Full rule, the board table, and the `ms`-is-a-
duration trap: [`.claude/rules/score-contract-convention.md`](.claude/rules/score-contract-convention.md).

**The World** (`#/world`) is a room and a character with 8 slots (wall, floor,
rug, plant, poster, outfit, hat, pet) holding 24 items in original inline SVG.
Buying also places the item, one tap, no confirm dialog. An item the player
cannot afford or has not unlocked answers with a gentle shake and says nothing,
because a refusal is not an error. Every category ships exactly one free
`price: 0` default (pinned by `world/items.test.ts`), so the room is complete
before a player has earned anything. **Item ids are persisted in
`profile.owned` forever: never rename one, never reuse one.**

**The player's name.** Every player is called something — one adjective plus one
animal, drawn from a pool of 16 × 20 in `src/sdk/names.ts` and shown on the World
screen with a reroll button. **No child ever types a name**, which removes
moderation from this platform entirely: there is nothing to review because there
is nothing anyone can type. The profile stores the two **word ids**, never a
rendered string, so one player has one name in both languages. Hebrew adjectives
agree with their noun and follow it, so every noun declares a gender and every
adjective carries both forms — `זריז נמר` is the wrong order and `לטאה זריז` is
the wrong gender, and an English-shaped pool makes both mistakes at once. **Word
ids are persisted forever: never rename one, never remove one**, exactly like the
shop item ids. Full rule and the rest of the traps:
[`.claude/rules/name-pool-convention.md`](.claude/rules/name-pool-convention.md).

**Speech** (`ctx.speech`) is Web Speech TTS for Hebrew and English letters and
words. Zero assets, zero network. Voices load ASYNCHRONOUSLY, so subscribe with
`onAvailabilityChange()` rather than reading `available()` once; call `unlock()`
inside a user gesture for iOS; it follows the global mute; and nothing it does
ever throws or rejects. It is ALWAYS supplementary, never the question itself:
see the hard rule at the top of `src/sdk/speech.ts`.

## Carrying on where you left off

**Two layers, deliberately separate, because they have different lifetimes.**

**The level, in all 20 games with a level toggle.** `useRememberedLevel` from
`@shared` returns a `useState`-shaped pair whose setter persists, and it
VALIDATES the stored id against the game's own option list rather than trusting
it — `GameChrome` finds the current level with `findIndex`, so an id no longer in
the list resolves to `-1` and **the toggle disappears**, leaving a game that
plays perfectly with no way to change difficulty. vanish shipped this by hand
first; it now uses the hook, under the same key with the same values.

**The board, in the six games with a position worth returning to** — sudoku,
minesweeper, 2048, blocks, memory, coloring. evolve inherits it through 2048's
renderer under its own game id, so it gets its own namespace free. The reflex and
endless games get level memory only: resuming a reaction test is meaningless.
**Resume is silent** — no dialog, no reading required — and the restart button
already in `GameChrome` is the way to a fresh board.

**`ctx.session` is the third policy port**, after economy and score. A game
reports WHERE IT IS; `src/sdk/session.ts` alone decides whether a stored position
is still usable — version, age, a 64 KB cap and the game's own shape check, all
failing to `undefined`, the same answer as "never played", so a game needs one
code path for both. A wrong answer here does not throw: it renders a plausible
board the rules can no longer explain.

**A snapshot carries more than the board, and both extras are load-bearing.**
Every **latch recording a reward the run already collected** — 2048's `won` and
`bestFired`, blocks' milestone step — because without them leaving the game is a
way to be **paid twice**: reach 2048, walk out, come back, and the next merge
grants the win again, once per resume, forever. And for a timed game, the
**clock** (`useGameTimer({ initialMs })`), or every abandoned board becomes a
personal best nobody earned. `reset()` still goes to zero; a restart is a new run.

**A state only a TIMER can leave must never reach the disk.** Memory's mismatch
sets `lock: true` and the renderer clears it 850 ms later; a snapshot caught in
that window restores with no timer behind it and `flip()` then refuses every
card — a board that looks completely normal and is permanently unplayable.
`settle()` in `memory/logic.ts` runs at SAVE time, not load time, so the disk can
never hold that state.

**Sessions are device-local by construction.** `ellaz:<gameId>:session` cannot
match the anchored `ellaz:<game>:score:<board>` pattern `records.ts` validates,
so a backup code moves coins and records and never a board mid-play.

Full rule, including why the level is stored as an ID and never an index, and why
the obvious verification control is undone by the feature itself:
[`.claude/rules/session-snapshot-convention.md`](.claude/rules/session-snapshot-convention.md).

## Engine choice — settled, but read the caveat before quoting a number

**Phaser 4 stays.** Three tournaments compared it head-to-head against real
alternatives on an identical game; the second used a 660-tile scrolling
platformer with physics, enemies and art, and every arm was proven to run the
same simulation via a cross-language checksum before any number counted.

**The operator's eyeball verdict INVERTED the fps ranking** (2026-08-01). The
numbers are correct; they measured the wrong quantity. The ranked workload was
900 sprites against a game that runs ~50 (a batching test a pure renderer wins
by construction), and every probe ran headless at 60 Hz — the one refresh rate
at which the real defect could not appear. **So do not quote the fps/jank column
as a proxy for how a game feels.** Payload, time-to-interactive, integration
cost and dev cost were measured on real artifacts and remain sound — and are
**re-auditable**: the raw rows live in `docs/engine-tournament/data/` (87 round-2
rows, round 1, round 3, plus 12 render screenshots in `evidence/`). Every
published PC cold-TTI figure was re-derived from them to the digit on 2026-08-01.

Three eyeball runs settled it — a named ranking, a blind four-arm re-run, and a
blind three-round pairwise of the apparent winner against Phaser. The pairwise
came back **1-1-tie with no symptom reported**, refuting the one prediction the
earlier runs supported. **Excalibur, Phaser and Kaplay are indistinguishable on
feel; only Pixi is reliably last** — the exact arm the fps table rated joint-
first. A four-way ranking forces an order even when the arms are level, and
that is all "excalibur first" ever was.

**So Phaser stays, and the engine question is closed**: it ties on feel and wins
on dev cost, ecosystem and jank, and its 375 KB is paid once across all ten
games. The real deliverable was never an engine — it is the display-rate fix and
the render interpolation, which protect every game regardless of engine. Full
account, the blind protocols, the three eliminated mechanisms, and a published
claim that turned out to be false:
[`docs/engine-tournament/EYEBALL-VERDICT.md`](docs/engine-tournament/EYEBALL-VERDICT.md).

**The trap that found it applies to every game we ship**: a fixed 60 Hz
simulation step on a 120 Hz display freezes every second frame. See
`.claude/rules/fixed-timestep-must-match-display.md`. No current game is
exposed — snake steps at a game speed, and the rest are DOM/event-driven.

| Engine | Verdict |
|---|---|
| **Phaser 4** | **Ours.** 60 fps / 0% jank, mounts as a lazy chunk, reuses `logic.ts` verbatim. Its 379 KB is **paid by snake alone** — snake is the only game that imports it (`grep -rln 'from "phaser"' src/`, verified 2026-08-02). It is lazy and precache-excluded, so it costs nothing on a first visit, but "shared across all games" was never true. |
| PixiJS 8 | Credible alternative — same 60 fps, loads 256 ms faster at 36% of the bytes, but it is a renderer: loop, culling and pooling are hand-rolled. Reach for it only if one canvas game is load-critical. |
| Kaplay | **The pick for a static-screen game** — a third bake-off on a match-3 put it ahead of Phaser on desktop and tablet (60 fps / 0.2% jank · 59 fps / 0.0%) at 72 KB and 684 ms, a fifth of Phaser's bytes. On mobile the frame rate ties, but it janks far less (0.5–3.5% vs 5.6–9.3%). Still out for **scrolling** games: no culled tilemap, and it janks every frame on mobile there. |
| Excalibur | Out — but on cost, not on feel. A blind pairwise against Phaser came back 1-1-tie with no symptom reported, so its apparent feel win was a four-way ranking forcing an order between level arms. Slowest JS load of the four (1,916 ms PC / 2,910 ms mobile), though the second-smallest payload at 129 KB. Its 21 fps / 100% jank came from the disqualified stress workload — don't quote it. |
| Defold | Out on integration, not merit — fastest renderer measured, but 3.0 s TTI, iframe-only, can't reuse `logic.ts`. |
| Godot 4 | Out for web. 22.6 s to interactive — fails CrazyGames' 20 s time-to-gameplay bar. Re-tested with idiomatic rendering and still 14 fps / 100% jank, so this is not an implementation artefact. |

Full evidence: **[`docs/engine-tournament/`](docs/engine-tournament/)** — verdict,
both dossiers, 294 raw measurement rows, the determinism probe and per-arm
renders. **Anything 3D is unevaluated** — all six arms were 2D; that would need a
separate three.js / Babylon / PlayCanvas bake-off.

## Non-negotiable conventions

- **Pure logic core.** All rules live in `games/<id>/logic.ts` with zero DOM/Phaser
  imports, driven by an injectable `rng` for determinism. Test the logic, not the DOM.
- **Games talk only to `GameContext`** (`@sdk`) — never to portal internals. The
  lifecycle + ads shape matches the **Poki + CrazyGames** union so games can list on
  those portals later with no rewrites.
- **Wins go through `winMoment()`** (`@shared`), never a hand-rolled
  celebrate-plus-grant block. And **games report reward REASONS, never amounts**:
  `grant()` takes `level_complete`/`milestone`/`personal_best` plus a tier, and the
  earn table lives in one file so 30+ games cannot each invent their own
  economics. `analytics.levelComplete()` is NOT a win signal (see the rewards rule).
- **Speech is supplementary, never the question.** A voice can be present, be
  selected, fire `onend` on time and still emit no sound, and that failure is
  undetectable from JavaScript. A letter game SHOWS the letter and offers a speaker
  button that says it; it never asks "tap what you hear". If removing speech would
  make the game unplayable, the design is wrong.
- **`@ui` may import `@i18n`.** Sanctioned and deliberate: `DifficultySelector`
  takes a `locale` and renders bilingual labels, which is precisely what removed a
  locale ternary from every game with levels. i18n is a leaf module with no
  dependencies of its own, so this arrow can never become a cycle. Do not "fix" it
  back into 22 copies of `locale === "he" ? ... : ...`.
- **No external network requests from games** (Poki rule). Wrap all `localStorage` in
  try/catch (incognito-safe). Unlock audio on the first user gesture.
- **Input:** Pointer Events only (`pointerdown/move/up` + `setPointerCapture`);
  `touch-action: none` on play surfaces; `keydown` state map for desktop.
- **Responsive:** size boards with `min(<vw>, <vh>, <cap>px)` so they fit portrait,
  landscape, and tablet. `GameHost`'s mount is a scroll container with `minHeight:0`
  (flexbox scroll trap) — tall games scroll, never clip.
- **Kids games** (`ageBand: "kids"`): **tap-completable; drag optional.** Drag is
  never REQUIRED. Four of the games coming next (jigsaw, shape-fit, build-a-house,
  build-a-word) do use drag, and every one of them must also be finishable by
  tap-select then tap-target. Two reasons, and the second is the load-bearing one:
  a five-year-old on a phone, and anyone on assistive input, cannot reliably hold a
  sustained pointer gesture; and a tap path means the wave ships even if the shared
  drag utility slips. Plus ≥2×2cm targets, icon+audio navigation (no reading
  required), instant restart, no fail-punishment.
- **Analytics is anonymous + kid-safe** (COPPA internal-operations): PostHog
  anonymous-events mode only — **never `identify()`**, no PII, no session replay, no
  autocapture, no behavioral ads. Analytics failure must never block gameplay.
  PostHog is **lazy-loaded after first paint** (`src/sdk/analytics.ts`) behind a
  bounded queue (cap 50, drop oldest); a failed import drops events silently.
  **Adding a chunk is three changes, not one** — the dynamic import, a NAMED
  `manualChunks` branch, and a matching `globIgnores` entry. The precache glob
  sweeps `**/*.js`, so skipping the third leaves the payload unmoved behind a
  green build. `npm run build:check` enforces it and runs in both deploy
  workflows. See `.claude/rules/precache-glob-sweeps-new-chunks.md`.
- **Legal:** original art and names only. No trademarked names/trade dress (no
  "Tetris"/"Wordle"/"Waldo"; change shapes/colors/names for any cloned mechanic).

## Add a new game (~30 min)

1. `src/games/<id>/meta.ts` - the `GameMeta` (id, bilingual title, emoji, color,
   ageBand, category, orientation, renderer, and **`scoreUnit`** if the game keeps
   a record). Keep it **DOM-free**: `catalog.ts` imports it statically, so the home
   grid renders without pulling React, Phaser, or any game code into the shell
   bundle. `scoreUnit` must match the `unit:` the renderer reports and
   `score-unit-declared.test.ts` enforces that, because only the VALUE of a record
   is persisted and never the unit - so the leaderboards read the unit here to
   decide whether fast or slow wins, and a wrong one orders that board backwards
   in silence.
2. `src/games/<id>/logic.ts` - pure rules + `logic.test.ts` (write tests first).
   Take an injectable `rng` as the LAST parameter defaulting to `Math.random`, and
   use `mulberry32`/`seedFrom`/`shuffle` from `@shared` rather than a private copy.
3. Renderer:
   - **DOM:** a `<Game>.tsx` taking `{ ctx }`, then `index.ts` =
     `reactGame(meta, ctx => createElement(Game, { ctx }))`.
   - **Canvas:** a `Phaser.Scene` + `index.ts` exporting a `GameModule` that boots
     `new Phaser.Game({ parent: ctx.mount, scale: { mode: Phaser.Scale.FIT } })`
     (see `games/snake`).
4. On a win, call `winMoment(ctx, { reason, tier, level, at })` from `@shared` -
   from the event handler, never inside a `setState` updater. Render the level row
   with `<DifficultySelector>` from `@ui`, and hold the level in
   **`useRememberedLevel(ctx, ids, fallback)`** rather than `useState` so the game
   reopens on the level last chosen - it is the same `[value, set]` shape, and the
   setter persists. Everything a hardcoded first-level literal then feeds
   (`useState(() => newRound("easy"))`, `ctx.score?.best("easy")`,
   `levelStart("easy")`) must read the restored level instead, or the chrome says
   "Hard" over an easy board. If the game has a position worth returning to, add
   `ctx.session` + `useGameSession` as well - see § Carrying on where you left off,
   and read the rule first, because the snapshot has to carry every reward latch.
5. Register in **two** places, which are deliberately different lists:
   `src/portal/games.ts` holds the ordered roster (`import { meta as <id> }` plus a
   row in `GAMES`), and `src/portal/catalog.ts` holds the lazy loader
   (`<id>: () => import("../games/<id>/index")`). The ORDER lives in one file and
   the loaders in the other because the build-time page emitter reads the roster
   and must never touch game code - a stray `import("../games/snake")` at config
   time would load Phaser inside `vite.config.ts`. `catalog.test.ts` is
   property-based with a count ratchet, and `build.test.ts` asserts the two lists
   stay identical, so a well-formed entry needs no test edit.
6. `src/content/games/<id>.ts` - the page's words, **once per `PAGE_LOCALES`**
   (Hebrew, English and Spanish today), plus a `provenance` row for every number
   the prose quotes. See the next section.

**A game cannot ship in fewer languages than the site has, and that is enforced
rather than remembered.** Measured 2026-08-12 by planting a game with a `he|en`
title and no content file at all: `tsc` said `Property 'es' is missing in type
'{ he: string; en: string; }'`, naming the file and the line, and
`content.test.ts` said `games in the catalog with no page: probegame`, naming
the game. Two gates, two different failure shapes, neither of which a reviewer
has to notice. The probe is restorable and sha256-verified; the tree carries
none of it.

So step 6 is not optional and there is no half-done state: a game with two
languages of prose does not compile, and a game with none does not pass tests.
That is the whole "every new game is multilingual by construction" guarantee,
and it costs a new game exactly one more `es:` arm.

The SDK, UI, juice, i18n, PWA, rewards, and analytics come for free. **A new game
almost certainly needs no engine**: 22 of the 23 render as React over a pure
`logic.ts`, and snake is the only one importing Phaser (`SnakeScene.ts`, the sole
hit for `from "phaser"` in `src/`, re-verified 2026-08-13). Phaser sits in its own
lazy `vendor-phaser` chunk - "cached across all canvas games" was never true,
because snake is the only canvas game.
**Three web pages come for free as well** - the route table is derived from the
roster and `PAGE_LOCALES`, so `/games/<id>/`, `/he/games/<id>/` and
`/es/games/<id>/` are emitted, sitemapped and gated the moment step 5 lands. Missing step 6 is a red build, not a thin page.

**Two gates key on a DIRECTORY CONTAINING `meta.ts`, not on registration**, so
"I haven't registered it yet" does not keep a half-built game out of their
population: `src/ui/game-art.test.ts` wants a scene in `src/ui/gameArt.ts` and
`src/ui/game-panel-clears-widest-board.test.ts` wants a renderer contributing a
board-sizing expression. Both go red the moment `src/games/<id>/meta.ts` exists.

That is the gates working rather than a nuisance - a game with no picture is not
finished, and the art gate exists *because* 21 games once shipped as one OS emoji
on a colour block while every other gate reported green. But it does mean **a
game cannot be built in parallel slices that each keep the suite green.** Either
land `meta.ts`, the art scene and the renderer together, or expect those two red
until the set is complete. Discovered 2026-08-13, building two games at once.

## Every game has a real web address

The site used to be one document. It is now 85: `dist/index.html` (still the app,
unchanged) plus **90 emitted pages** built by `src/build/**` inside a Vite plugin,
so `npm run build` cannot skip them and neither deploy workflow can forget.

| URL | What it is |
|---|---|
| `/` | the application, and now also a document. **ENGLISH since 2026-08-14.** The emitter adds head tags AND the English home body; it never overwrites the file |
| `/games/<id>/` · `/he/games/<id>/` · `/es/games/<id>/` | every game x 3 languages, ~900 words each (28 on 2026-08-14 — read the count off the roster, not off this line) |
| `/he/` · `/es/` | the home screen in that language — **the app**, emitted as a shell (see below) |
| `/world/` · `/he/world/` · `/es/world/` | the room |
| `/boards/` · `/he/boards/` · `/es/boards/` | the leaderboards (two screens - see below) |
| `/404.html` | bilingual, `noindex`, and `ErrorDocument`-wired on Hostinger |
| `robots.txt` · `sitemap.xml` · `llms.txt` | emitted, not in `public/` (see below) |

**English took the bare URLs on 2026-08-14, and Hebrew moved to `/he/`.** One
constant did it — `CANONICAL_LOCALE` in `src/i18n/locales.ts` — because
`localePrefix` gives the canonical language the bare path and every other
language a directory. Moving it moved every English document up to `/…` and
every Hebrew one down to `/he/…` — 31 each on the day, and that number moves
with the roster — and rewrote every canonical, `og:locale`,
JSON-LD `inLanguage`, sitemap row and share card with them. `DEFAULT_LOCALE`
was already English, so `x-default` did not move; the two constants are now
the same language and both are kept, because they answer different questions
and were different for months.

**Only ONE side of that could be redirected, and the asymmetry is the whole
SEO cost.** `/en/*` → `/*` is a 301 in `deploy/hostinger.htaccess` (plus the
slashless `^en$`, which used to be free from `DirectorySlash` and is not any
more, `dist/en/` being gone). The Hebrew side has no such rule and must never
get one: `/games/snake/` still answers 200 — it is the *English* page now — so
a redirect there would send every English reader to `/he/`. Hebrew's new
addresses simply have no history to inherit; Google recrawls the bare URL,
finds English, and follows the hreflang cluster. That is written down in the
`.htaccess` beside the rule so nobody later "fixes" the missing half.

Three runtime fallbacks moved with it and none is a literal any more:
`storedLocale()` (a first-time visitor), `redirectLegacyHash`'s default (an old
`#/game/snake` link now lands on the bare URL, so it needs no second hop), and
`speech.ts`'s unnamed-locale default. `index.html`'s `lang`/`dir` are **rewritten
at build time** from `CANONICAL_LOCALE` rather than reviewed — the file cannot
import anything, so a stale literal there is a document whose prose is English,
whose `lang` says Hebrew and whose layout is mirrored, all while rendering
perfectly. Cost on the artifact: **89,454 B gz of 90,000**, up 132 B, because
the same home screen is more bytes in English than in Hebrew.

**`/` carries the English home as real markup, because no answer engine runs
JavaScript.** It used to ship a 29-byte body - `<div id="root"></div>` and
nothing else. Googlebot renders JS so it saw the grid eventually, but GPTBot,
ClaudeBot and PerplexityBot fetch raw HTML and move on, so the site's canonical
entry and `x-default` target was a blank page to ChatGPT, Claude and Perplexity
for months, while `/en/` - an emitted document - was fine. Nothing caught it:
every gate here reads `dist/`, and `assert-pages.mjs` deliberately excludes `/`
because it is the app rather than an emitted page. The one page with no content
was the one page the content gate could not see.

`transformIndexHtml` now injects `homeShellBody()` as a **sibling before
`#root`** and `main.tsx` removes it on mount - the `#game-poster` arrangement,
for the same reason. It is a faithful mirror of what the grid renders, so it is
progressive enhancement rather than cloaking, and it is removed rather than
hidden so there is never a second permanent copy of every game link. Measured
on the artifact, served and curled as Googlebot: **0 words -> 132, 0 links ->
23, 0 h1 -> 1, for 867 B gz** (86,004 -> 86,871). The link count is derived
from the roster, so a new game joins it without an edit.
[`.claude/rules/a-spa-shell-is-invisible-to-ai-crawlers.md`](.claude/rules/a-spa-shell-is-invisible-to-ai-crawlers.md).

**EVERY home page is the app now, not only `/` (2026-08-13).** The URLs in this
paragraph are the ones that existed then: English was still at `/en/` and moved
to `/` on 2026-08-14. The mechanism is unchanged and applies to whichever
languages hold the directories. `/en/` and `/es/`
were pure documents — a heading, a fact list, emoji links and prose, with no
runtime at all. That is the correct shape for an article and the wrong shape for
the **home screen**, and it was reported by a person rather than caught by
anything here: every wordmark and back link on an English page (the header of
all 25 English game pages, the room, the boards, and `exitTo`'s floor in
`PageApp`) lands on `/en/`, and what arrived was a static article. No grid, no
wallet, no world, no daily. `homePage()` now emits the same arrangement
`transformIndexHtml` gives `/` — `homeShellBody(locale, …)` inside `#home-doc`,
an empty `#root` beside it, `class="app-shell"`, and the app's own head tags —
so all three home pages boot one bundle. **No prose is lost**: the shell body
carries the whole page (`/en/` 252 → 176 words, 26 → 31 links, still one `h1`),
and what went is the document chrome the app draws for itself.

Two things that look like details and are not. `homeShellBody` **takes a
locale** — hardcoded to Hebrew it would have emitted the Hebrew home under
`lang="en"`, a page that renders, links correctly, clears every floor and is in
the wrong language (the script gate in `assert-pages.mjs` is the control).
And `readPageContext` reads **`data-locale` only, never `documentElement.lang`**,
on the app branch: `index.html` always carries a `lang` — `he` until 2026-08-14
and `en` since — so reading the attribute would pin `/` to whichever language
holds the root, over the stored choice of every player using one of the other
ten. `/` carries no `data-locale`, and that absence is the signal. The flip did
not change that line and could not: the bug it prevents is "the root's language
wins", not "Hebrew wins". The URL wins on `/he/` and `/es/` and is **not
persisted** — following one Hebrew link must not repaint `/` for an English
speaker. Spanish waits for its dictionary before mounting, exactly as
`bootContentPage` does, so there is no flash of English over Spanish prose.

**Adding a page kind means finding every list that says which pages boot the app.**
There were three, and they do not live together: `build.test.ts`'s `boots`
predicate, `scripts/assert-pages.mjs`'s, and the runtime's own switch in
`pageContext.ts`. Miss one and the page is held to the DOCUMENT rules instead,
so it fails the build for a reason that has nothing to do with what is wrong -
which is what happened, and is the gate working. The runtime one is worse: a
missing branch there falls through to the game arm and mounts a `GameHost` with
an empty id, so the page renders its prose perfectly and shows "we couldn't find
that game" where the screen should be. Promoting `/en/` and `/es/` to app shells
walked the same three lists again, and the fourth failure shape is worth naming:
the first predicate written for "which files are homes" was
`fileName.split("/").length === 2`, which is right about `en/index.html` and
also matches `world/index.html`. It is `ROUTES.filter(r => r.kind === "home")`
now — the route table cannot be wrong about which pages are homes.

**The slug is `meta.id`, never the directory name.** `src/games/n2048/` publishes at
`/games/2048/`, so a hand-written `/games/n2048/` is a 404 that only the link
checker in `scripts/assert-pages.mjs` would catch.

**The game plays on its own page, and React owns exactly two elements there.**
A game page carries the app's own head tags - lifted verbatim off `index.html`,
never reconstructed, because the names carry a content hash - and mounts into
`#game-frame` and `#wallet-slot`. Everything else on the page is emitted once
and never reconciled, which is what makes hydration mismatch structurally
impossible rather than merely unlikely.

The poster is a **sibling** of the frame, not a child: a node React does not know
about, inside a tree it reconciles, is `react-nested-root-teardown` in a
different costume. It paints instantly (the game's emoji on its own colour), and
the runtime hides it when the game is up. Its emitted state is the honest one -
a real button and "the game needs JavaScript" - because that is what a visitor
with no JavaScript will keep seeing. The runtime rewrites both on boot: it hides
the button and fetches on browser idle, unless data saver is on, in which case
the button stays and waits for their tap.

**`body { overflow: hidden }` is now scoped to `body.app-shell`.** Unscoped it is
correct for an application that manages its own scroll regions and catastrophic
for a document - every word below the fold unreachable by scroll while a crawler
reads the page perfectly. `index.html` carries the class; the 48 content pages do
not.

**The hash router is retired.** `/#/game/snake` and `/#/world` redirect once at
boot (`legacyHash.ts`, `location.replace` so Back does not bounce), the home
cards are real `<a href>`, and Back, shareable game URLs and middle-click all
work without a line of code. `#/lab` used to be left alone as dev-only
scaffolding; the lab was deleted on 2026-08-08, so that hash now parses to the
home grid like any other unrecognised one - which is the right landing for a
bookmark from the tournament.

`src/portal/paths.ts` generates those links and `src/build/routes.ts` writes the
files. They are two implementations on purpose, because the app may never import
`src/build` (it reads `src/content`); `paths.test.ts` asserts they agree on every
game, so the copy cannot drift into a card that links to a page nobody wrote.

**`<lastmod>` comes from git, or it does not come at all.** `src/build/lastmod.ts`
derives each page's date from the last commit that touched its own sources — the
game's directory and its content file, never a build timestamp, which would say
"every page changed" on every deploy and teach Google to discount the field
permanently. **The trap is CI**: `actions/checkout` clones at depth 1, so `git log`
returns one identical date for all 52 — the same bug wearing a disguise, on the only
machine that publishes. Both deploy workflows set `fetch-depth: 0`, the emitter omits
the field on a shallow clone or a uniform result rather than lying, and
`assert-pages.mjs` fails the build on 50 identical dates. **An absent `<lastmod>` is
valid and is what this site shipped for months; a uniform one is a lie.**

**It is currently DORMANT, correctly.** A commit on 2026-08-08 touched all 21 game
directories, so every game page resolves to one timestamp and the emitter omits the
field. That is the design working, not a bug: `<lastmod>` exists to say WHICH pages
changed, and 50 identical dates answer "all of them" — as useful as saying nothing.
It returns on its own as the games diverge again. Do not make it emit uniform dates
to make the number reappear; the gate rejects those, and the two would contradict.

**IndexNow pings Bing after a successful upload**, because ChatGPT Search and Copilot
lean on Bing's index. Ownership is a key file the build publishes at `/<key>.txt`
(primary host only — the Pages copy is noindex). `scripts/indexnow.mjs` submits **only
URLs whose `<lastmod>` moved**, and falls back to the whole set only when the sitemap
carries no dates, saying so. It is `continue-on-error`: a search-engine ping must
never fail a good release. The index-coverage benefit is documented; a causal lift in
AI citations is not, and this should not be read as claiming one.

**Canonical never carries the base.** `https://ellaz.fun/games/snake/` on both
hosts; the GitHub Pages copy adds `noindex` to every page and a `Disallow: /`
robots.txt, and emits no sitemap. `robots.txt` is emitted rather than dropped in
`public/` precisely because the two hosts need opposite files.

**Two gates, and `build:check` runs both.** `assert-first-visit.mjs` now matches
FULL dist-relative paths rather than basenames - `games/2048/index.html` has the
basename `index.html`, which the old matcher waved through as "the app shell".
`assert-pages.mjs` checks the pages themselves: prose floor, canonical, hreflang,
noindex, internal-link integrity, JSON-LD parse, sitemap bijection, no page
precached, and no `NavigationRoute` in `sw.js`. Every check has a negative control,
and all of them were mutation-proven against a real `dist/` on 2026-08-04.

Run the gate under **both** bases before believing it:
`npm run build:check` then `BASE_PATH=/ellaz/ npx vite build --outDir dist-ellaz &&
DIST_DIR=dist-ellaz npm run assert:pages`. Half these failures are base-dependent
and each workflow only ever sees one arm.

**The service-worker trap that would have broken all of it**, for returning
visitors and nobody else:
[`.claude/rules/sw-navigation-fallback-hijacks-real-pages.md`](.claude/rules/sw-navigation-fallback-hijacks-real-pages.md).

**The leaderboards are two screens, and the split is load-bearing.** They open on the
player's own games as cards, each already carrying their best, and a tap opens that
game's board with the difficulty and time rows labelled and a button straight into
playing it. The single page this replaced laid all twenty games out in one
non-wrapping flex row - 1,410px inside a 390px phone, clipped by the frame's own
`overflow: hidden` - so **fifteen of twenty games were unreachable**, not merely
awkward. See [`.claude/rules/a-row-that-grows-with-the-catalog-must-wrap.md`](.claude/rules/a-row-that-grows-with-the-catalog-must-wrap.md);
`DifficultySelector` is the specific trap, correct for three pills and wrong when
handed the catalog.

`src/portal/boardsView.ts` holds the pure half so the screen can be checked without a
browser, and **`firstBoard()` is one function on purpose**: the card quotes the board
the detail view opens. A `game.boards[0]` written inline in the component would be
correct today and would silently stop agreeing the moment `firstBoard` learns anything,
so a guard in `boardsView.test.ts` forbids it - mutation-proven by planting exactly
that line. The card art comes from `@ui/gameArtView`, shared with the home grid, so
there is one answer to what a game looks like rather than two that drift.

**Still authored by hand, not derived**: the difficulty tiers and what each game's
record measures. Both live inside renderers that import React, so a build-time
import is not possible; the pages simply do not state them yet. Deriving them means
declaring `levels` in each DOM-free `meta.ts` with a test that pins it to the
renderer's own `DifficultySelector` options.

**The content-page runtime is a lazy `page-*` chunk** - the game host, the whole
room, and (since 2026-08-13) every shared game helper except `rng.ts`. 12.3 KB gz,
which `/` never needs. Adding it caught the documented
three-change trap live: the dynamic import and the chunk name were right, and
`WalletChip`, `catalog` and `world/Scene` (imported by BOTH the home grid and
the page runtime) were left unassigned, so Rollup folded them into `page-*` and
made the ENTRY import from it. Vite then wrote a `<link rel="modulepreload">`
for the whole thing into `index.html`. `assert-first-visit.mjs` failed the build
by name. Every portal module that is not one of the four page files is now
pinned to the shell explicitly: an unassigned shared module is not neutral, it
picks a side.

**First visit measured on the artifact 2026-08-04: 72,984 B gz.** The plan's
ceiling is 76,000; the live 2026-08-02 baseline was 69,624. The whole gap
predates the page work - it read 74,391 before Phase 4 started and is
un-isolated, which is worth someone's twenty minutes with `git bisect` and the
gz sum.

**Games size themselves against the VIEWPORT, not their container** (`min(90vw,
60vh, <cap>px)`), so the stage breaks out of the page gutter on a phone. Giving
the frame the full width is cheaper and more honest than teaching 21 games a new
sizing rule. Verifying that surfaced a pre-existing responsive defect it did not
cause: nine games laid their stat row out as a non-wrapping flex under
`alignItems: "center"`, which sizes to max-content and overflows any narrow
screen - 439px of row on a 390px phone. Two games already carried
`flexWrap: "wrap"`; the rest now do.

**The game page has its own header, and the game panel is capped on desktop.**
Two separate pieces of chrome, decided one axis at a time against rendered
production builds.

The **header** (`src/build/layout.ts`) is a real bar in flow on a game page -
60px, 44px controls, wordmark + back | game name | wallet + full screen - and
its colour is `oklch(from var(--g) .30 calc(c * 1.05) h)`, a deep tone of that
game's own ground. Pinning lightness rather than mixing is the whole trick:
contrast holds by CONSTRUCTION across a catalogue nobody has finished writing
(7.84-10.68 over all 21 grounds, none below AA), where mixing toward a
near-black drags the hue and turned snake's emerald navy. **`--g` is not
ambient** - it is emitted per page from `artGround()`, and without that
attribute all 21 bars resolve to one fallback indigo, which is a plausible
picture with no error anywhere. The room still floats its header; the game's
float is exactly what put chrome on top of the board.

The **panel cap** is one rule: `.ellaz-game-panel { max-width: 700px }` above
900px of viewport, in `global.css` rather than inline because an inline style
cannot carry a media query. Every row inside `GameChrome` is `flex: 1 1 0` with
no ceiling - correct at 390px, and at 1440 it made the difficulty toggle
**1193px wide** to say "Level: Classic" and three stat cards 456px each to hold
one digit. Capping the panel fixes every row at once.

**700 and not 640**, because the widest board any game asks for is 640 (bees,
finddiff) and a tighter cap makes those two grow a scrollbar *inside* the panel
instead - silently, since the play surface is `overflow: auto`.
`game-panel-clears-widest-board.test.ts` reads the game TREE and fails the build
if a new game ever asks for more than the cap leaves.

**The board does NOT grow to meet the panel, and that is deliberate.** Boards
size against the viewport, so on a desktop the px cap or the `vh` term binds and
the space they are given never enters the arithmetic. Making them desktop-aware
is not "raise 20 caps" - it is 39 heterogeneous expressions across 20 files, of
which several are not boards at all (`min(19vw, 11vh, 96px)` is one balloon;
sequence has eight; minesweeper's is computed from column count). That belongs
in one sizing module, not in 39 edits.

## The picture a shared link grows

Every page carries an `og:image`: **50 cards, 1200x630**, emitted by `src/build/ogCard.ts`
(pure, the layout) plus `ogImages.ts` (async, the rasteriser) from the same `gameArt` SVG
the home grid uses. They cost nothing on a first visit — PNG is not in the precache glob
and no shell asset fetches them.

**Text never reaches the rasteriser as text, and that is the whole design.** Neither
`resvg` nor `satori` implements the Unicode bidi algorithm: both lay `<text>` out in
LOGICAL order, so "נחש" rasterises as "שחנ" — a clean PNG of nonsense — and
`direction: "rtl"` fixes neither. `bidi-js` computes the visual order first, and satori
then emits PATHS. **Naive reversal would be wrong** for "2048" (must not become "8402")
and for "מה בא אחר כך?" (the "?" belongs on the left); both are pinned in tests.

Two more traps, both of which render a plausible wrong picture rather than an error:
`gameArt` is an HTML fragment, so it needs an injected `xmlns` to be a document at all;
and every scene ends with `fill:var(--art-veil,transparent)`, which a rasteriser cannot
resolve and paints as **opaque black over the entire card**. `artSvgSized` resolves it
and throws on any `var()` it cannot.

`assert-pages.mjs` gates it: a card per page, absolute ellaz.fun URL, file present, and
**between 4 KB and 600 KB** — the floor catches a flat-colour card, the ceiling is where
WhatsApp silently drops the preview. Mutation-proven three ways. Full account:
[`docs/build-log.md`](docs/build-log.md) § Share cards.

## One game, on a host we cannot watch

`STANDALONE_GAME=sudoku npm run build:standalone` writes `dist-standalone/sudoku/` —
one game, one page, `index.html` at the root, ready to zip for itch.io. It has its
own config (`vite.standalone.config.ts`) and its own entry (`src/standalone.tsx`),
and **neither may ever be folded into the main build**: a branch inside
`vite.config.ts` puts both one typo apart, while a separate file means the site a
child loads cannot regress from this work at all. It never writes `dist/`.

Reusing `bootContentPage` is the tempting move and it is wrong — `PageApp.tsx`
calls `analytics.init()`, `analytics.track()` and `startCloudSync()`
**unconditionally**, and those are static imports, so no `manualChunks` branch and
no `globIgnores` entry can remove them. Only a different entry can. Other games and
`src/sdk/cloud.ts` are stubbed at **resolution**, each stub throwing if reached; a
sudoku bundle went 2.1 MB → 224 KB once they were.

`npm run assert:standalone` is the gate, written before the target and carrying 14
planted controls. It found three defects on the first real bundle, and a browser
found a fourth the gate could not see: a `fonts.googleapis.com` import, which is an
external request from a game — the rule that lets this SDK be listed on a portal at
all. **That fix is scoped to this build**; `src/ui/global.css:5` still fetches the
same font on the live site, and changing that is a payload decision with a budget
attached. Full rule, including the case-sensitivity trap that passes on `/mnt/c` and
404s on their CDN:
[`.claude/rules/a-second-published-artifact-needs-its-own-gate.md`](.claude/rules/a-second-published-artifact-needs-its-own-gate.md).

**The gate's own stamp message was wrong for a day, and the shape is worth keeping.**
It compared the build stamp in full and printed `.slice(0, 16)` of each side, while
`buildStamp()` marks a dirty tree by appending `-dirty` at character 41 — so the only
thing that differed was the only thing 16 characters could not show. It read
*"stamped 13840666dff557ae but the tree is 13840666dff557ae; rebuild"*: a correct
refusal wearing a self-contradicting sentence, triggered by **build, then edit any
file**. Fixed to print both in full. It matters because a gate that reads as broken
gets bypassed, and a bypassed stamp check is how a stale bundle reaches itch — the
exact outcome the stamp exists to prevent. Two more instruments in this repo failed the
same way in two days, one of them the check verifying this very fix:
[`.claude/rules/a-diagnostic-that-truncates-what-it-compares.md`](.claude/rules/a-diagnostic-that-truncates-what-it-compares.md).

Two things the gate is known to do that are easy to forget: it refuses a **torn** bundle
(`1 html, 0 js` — the shape a killed upload leaves), and the standalone build **requires
a git repository**. Outside one it fails with a message about *webfonts*, because the
commit-stamp step shells out to git and a later step reports the CSS that was never
written. Both deploy workflows always have git, so this is a trap for a source unpack
rather than a live defect.

## Two locale sets, and the narrow one is a type

`src/i18n/locales.ts` holds both, and the difference between them is the whole
point. **`APP_LOCALES`** is what the interface speaks — currently 11: he, en, es,
pt, fr, de, ar, it, ru, tr, id. **`PAGE_LOCALES`** is what has written prose —
currently 3, he, en and **es** (promoted 2026-08-12, ~27,400 words). `ROUTES`
derives from `PAGE_LOCALES`, so **adding a language to the app emits exactly
zero documents** and cannot cost anything.

**Promoting Spanish cost no first-visit bytes and it very nearly cost 1,363.**
Content is build-time only, so 23 more articles move nothing. The chrome
dictionary is a different matter: the gate shipped with the previous brick
demanded `PAGE_LOCALES ⊆ STATIC_LOCALES`, which measured **90,864 B gz of
90,000 — 864 over**, and would have billed a Hebrew-speaking four-year-old for
the Spanish dictionary to reach a game with no Spanish in it. The invariant
moved to where the fetch is: `bootContentPage` awaits `loadDict` before
`createRoot`, behind the poster, so there is no flash to trade. **89,449 B gz,
551 spare, ceiling untouched.** See `STATIC_LOCALES` in `src/i18n/strings.ts`.

**Six two-language constants had to die for Spanish to land, and they are the
same defect wearing six costumes** — each one correct while exactly two
languages existed, each one silent or loudly wrong at three:

| Where | Was | Now |
|---|---|---|
| `content.test.ts` `LOCALES` | `["he","en"]` literal | `[...PAGE_LOCALES]` — it ran **zero** Spanish pages through the voice gate and reported a clean sweep |
| the placeholder matcher | `/\b(TODO\|…)\b/i` | caps-sensitive — `/todo/i` matches the Spanish word **todo**, flagging 17 of 23 good pages |
| the roster-count gate | walked `SITE` only | walks `CONTENT` too, and knows `juegos` — it could not see a Spanish roster claim at all |
| `build.test.ts` × 4 | `GAMES.length * 2`, `toBe(4)`, `rows.length * 2` | `* LOCALES.length` |
| `assert-pages.mjs` | `byChunk.size * 2` | `* L.page.length`, read off the manifest |

The useful half is which way each failed. The literal `LOCALES` and the roster
gate failed **silently** — green over unmeasured prose. The placeholder matcher
and the count assertions failed **loudly**, which cost an afternoon and nothing
else. When adding a language, hunt the silent ones: ask of every gate not "is
its logic right" but "which pages are in its population".

That split exists because of one line of Google's documentation: *"Localized
versions of a page are only considered duplicates if the main content of the page
remains untranslated."* A German header over an English article is not a smaller
German page — it is the named anti-pattern, once per game.

`GameContent.copy` is `Record<PageLocale, GameCopy>` and `SITE` is
`Record<PageLocale, SiteCopy>`, so **promoting a locale before its prose exists is
a red build**, not a lint warning and not a script that can be wrong about what it
scanned. Every other guard in this repo reads `dist/`, and the lesson of
2026-08-08 is that such a script can be confidently wrong; a `Record<K,V>` cannot
be wrong about whether a key exists. Promotion is always two commits: **prose
first, then the list.** The other order fails to compile, which is the gate
working.

**Measured 2026-08-11: adding `"es"` with no Spanish prose reds 30 files** — 23
content files, `site.ts`, `voice.ts`, plus `gamePage.ts`, `schema.ts`,
`ogCard.ts`, `pageContext.ts` and `build.test.ts`, since `GameMeta.title` is
`Record<Locale, string>` too. A game cannot even have a *name* in a language
nobody has written for.

`src/content/voice.ts` is on that wall on purpose. It used to be four
`locale === "he" ? … : …` ternaries, so a third language would have joined the
ELSE arm of all four and **Spanish prose would have been measured against the
English banned list, passed, and reported clean**. It is now
`VOICE: Record<PageLocale, VoiceRules>`. A gate that answers confidently for a
language it has never heard of is worse than no gate, because somebody trusts it.

**Four more gates live in `assert-pages.mjs`, and they read the locale lists off
`dist/pages.json` rather than keeping their own copy** — the scripts are `.mjs`
and cannot import a `.ts` module, so the manifest publishes `locales.{app, page,
canonical, xDefault, dir, script}` and there is still exactly one list.

| Gate | Catches |
|---|---|
| stray locale directory | `dist/de/` for a language with no prose - and, the other way, a missing `dist/en/`, so a broken emitter cannot pass by vacuum |
| cross-locale body difference | the realistic mistake: a content file copied to start a language and never rewritten. Sentences of 5+ words, since a game's name and a nav label are identical across languages by design |
| script sanity | a page emitted under the wrong locale's route. **URLs are stripped first** - six Hebrew letters beside one 34-char URL reads as 85% Latin |
| hreflang reciprocity | A lists B while B never lists A. Google discards a one-directional cluster, and nothing asserted this before |

The script check is a **comparison, not a threshold** — the expected script must
simply be dominant — so there is no constant to go stale. Measured: a Hebrew page
is 97% Hebrew, an English page 100% Latin, and a he/en twin pair shares **0%** of
its long sentences against a 20% ceiling.

**`/` had to be seeded into those gates by hand**, because it is `emitted: false`
in the manifest — the app shell, head-enhanced in place. That is the same blind
spot that let `/` serve a 29-byte body to every AI crawler for months, and it
reproduced itself here on the first run: the reciprocity check reported that
`/en/` pointed at a canonical "no emitted page has", when `/` carried a perfect
cluster the gate simply could not see. **A blind spot that reports as a defect on
the neighbouring page is the worst shape available.**

`x-default` is **English, not Hebrew** — it answers "we have no page in your
language", and Hebrew is the wrong answer to that for everyone except Hebrew
speakers, who are matched by their own `hreflang` long before `x-default` is
consulted. Since 2026-08-14 it points at `/`, which is the English home, so
`x-default` and the canonical language are now the SAME. That is legal and
correct — Google's own examples do it — and both constants are kept rather
than collapsed into one, because they answer different questions and were
different for months. The test on them asserts English rather than
`!== CANONICAL`, so it stayed meaningful through the flip instead of
inverting with it.

Full rule, including why the picker carries autonyms and never flags:
[`.claude/rules/a-locale-page-without-a-translated-body-is-a-duplicate.md`](.claude/rules/a-locale-page-without-a-translated-body-is-a-duplicate.md).

**The interface speaks all eleven, and each language is its own lazy chunk.**
`src/i18n/dict/<locale>.ts` holds one language of chrome (89 strings). `he` and
`en` are STATIC — they are the two the shell has always carried, so the split
cost the first visit nothing — and the other nine are `locale-<xx>` chunks
fetched only by somebody who picked them, ~1.3 KB gz each, excluded from the
precache. Until a chunk lands, strings resolve through **English, not Hebrew**:
a Turkish visitor seeing English for 200 ms is reading a language they may know;
Hebrew is an alphabet they cannot.

**There are now two locale TYPES and they mean different things.** `AppLocale`
is what the interface is speaking (11). `Locale` is still `he | en` and means
*a human wrote this string* — a game title, a difficulty label, the name of an
animal a game reads aloud. Widening `Locale` was tried first and the compiler
answered with **200+ errors demanding a Spanish name for every balloon**, which
is the right answer to the wrong question. It would also have been a payload
disaster: `meta.ts` is statically imported by the roster, so eleven titles per
game is 23 × 9 extra strings **in the shell**. Authored text is read through
**`textFor(authored, locale)`**, which falls back to English rather than
rendering `undefined` into a blank game card, and page links go through
**`pageLocaleFor(locale)`** — the app can speak Spanish while its *pages* exist
in two languages, which is the same answer `x-default` gives a crawler.

**`globIgnores` no longer hardcodes `en/**`.** It is derived from
`PAGE_LOCALES`, because the literal was correct and one commit from being a live
defect: the day Spanish pages ship, `es/**` is 25 real documents that nothing
excludes, so a child in Tel Aviv precaches the Spanish site. Nothing would have
failed — green build, and the payload gate reads `index.html`, not the manifest.

**The trap this cost, and the gate that now catches it: nine correctly-named,
correctly-excluded, EMPTY chunks look exactly like success.** The dictionaries
landed before the picker that fetches them, so nothing called `loadDict`, Rollup
tree-shook them away, and the build emitted nine 0-byte files sharing one content
hash. `assert-first-visit.mjs` now fails on an empty locale chunk, on two
sharing a hash (two languages are never byte-identical), and on none existing at
all. Mutation-proven 4 ways.

Measured on the artifact, driven in a real browser at 390 px with a fresh
context per language: the picker holds **11 languages over 6 rows** with no
clipped label, each dictionary arrives **over the network**, Arabic flips
`dir="rtl"`, and a game card falls back to `Memory` rather than blank. First
visit **88,188 B gz of 90,000 — 1,812 spare**, up 1,261 B for the picker and the
loader.

**Still English-only behind the chrome**, stated rather than left to be
discovered: `shared/cast.ts` (58 animal names), `portal/world/items.ts` (24 shop
items), `sdk/names.ts` (the name pool) and the per-game strings are all still
`he | en`. They live behind lazy chunks and fall back to English, so nothing
breaks — a Spanish child gets Spanish chrome and English animal names.

## The words on a game page

Each game gets ~750 words per language at `src/content/games/<id>.ts`. Three rules,
all mechanised in `npx vitest run src/content/`:

**Authors write prose; code supplies facts.** Difficulty tiers, what the record
measures, the platform facts (free, no ads, no account, offline) are read from
`meta.ts`, the game's own `DifficultySelector` options and `sdk/score.ts` at render
time. A writer cannot claim something the game does not do, because they are not the
one saying it.

**Every number names the script that derives it.** `provenance` rows are
repo-relative paths and `content.test.ts` asserts the file exists. The memory page's
"9.2 moves" comes from `scripts/sim/memory-moves.mjs`, which parses the real level
table out of `Memory.tsx` and simulates 20,000 games, so it fails loudly if a
difficulty changes. The first draft said "under twenty-eight moves" and nothing
produced that number; this field is why the next one cannot happen quietly.

**Never translate - write it twice.** A translation carries the source language's
rhythm, and that rhythm is exactly what reads as machine-made.

`src/content/voice.ts` is the measurable half of "does this sound like a person", and
the measurable half is mostly **uniformity**: our first draft's five paragraphs were
57, 53, 50, 56 and 54 words, a 5% spread where humans run 30 to 60. It also bans the
tell vocabulary per language, the em dash, more than one rule-of-three, and the
"it's not just X, it's Y" crutch. It cannot see whether the admission is true, whether
a statistic was derived, or whether it sounds like us - which is why three pilots ship
before the other twenty.

**`src/content/` is build-time only.** `no-app-imports.test.ts` forbids portal, ui,
sdk, games, juice, shared and i18n from importing it; one stray import would put every
word of all 21 pages into the precached shell a child downloads before choosing a game.

Full rule: [`.claude/rules/game-content-template.md`](.claude/rules/game-content-template.md).

## How the app FEELS — the sounds, and the lab that chose them

**The sound lab is at `#/lab`, and it is reachable in production** —
`https://ellaz.fun/#/lab`, or `http://localhost:5180/#/lab` under `npm run dev`.
It is the gallery: every sound the app plays beside the alternatives, the win
moment playable end to end, and every visual effect and haptic on a button.
`docs/juice-map.md` is the written inventory — what each sound is, where it
fires, and the honest list of what was never judged.

**Tapping a candidate PICKS it and plays it through the real `audioPort`**, so
what you hear is what a game will play — not a preview that can disagree.
The pick is a whole `VoiceSpec` in `localStorage` (`ellaz:voice:v1`), because
the candidate specs live in the lab's own chunk that a child's device never
downloads. `src/sdk/voiceOverride.ts` is the gate on the way back in, and it is
the strictest one in this app: every other stored blob decides what a screen
SHOWS, this one decides what a synthesiser DOES next to a child's ear. It
validates rather than coerces — unlike `migrateProfile`, which salvages junk on
purpose — and anything it does not fully like is DROPPED, falling back to the
built-in, which is the same answer as "nothing was ever picked". Gain is the one
exception: it is scaled down as a whole rather than refused, so a slightly-loud
pick stays picked and stays safe.

Measured on the artifact 2026-08-13: the lab is **9,715 B gz in its own
`lab-*` chunk**, referenced 0 times in `index.html` and absent from the precache
manifest, while sibling `.js` chunks are precached — which is the positive
control proving the `globIgnores` entry is doing the work rather than the glob
missing it. First visit **89,164 B gz of 90,000**, 836 spare. Adding it was the
documented three changes: the dynamic import, the named `manualChunks` branch,
the `globIgnores` entry. `src/lab/**` matches none of the other `manualChunks`
rules, so without its own branch it falls to `return undefined` and lands in the
ENTRY chunk, shipped to every child with no `lab-` name for anything to match.

**All nine sounds were re-picked on 2026-08-13, and six of them overrode a
blind-tournament winner.** tap is **Tick**, pop is **Pock**, correct is **Wood
run**, wrong is **Two steps down**, win is **Ladder**, coin is **Drop in**, star
is **High bar**, flip is **Whoosh**, streak is **Glass**. Every one was chosen
from its own strip of 5–8 arms with the names showing.

**"Shutter won the tournament" and "tap is Tick" are both true**, and somebody
will eventually cite the first. A blind round (2026-08-02) asked which sounds
better with nothing else to go on; a named pick asks which belongs in this app,
and the second question is the one that ships. `VERDICT` and **`OVERRODE_BLIND`**
in `src/lab/voices.ts` record which is which, and the card badge says *"picked
over a blind winner"* for those six. Collapsing the two is how a preference gets
remembered as a result — the exact mistake `docs/juice-lab.md` records.

**Nothing was deleted: all nine predecessors live in `src/lab/previous.ts`** and
remain playable arms. That file exists because of a trap this repo had already
documented once and still nearly shipped: every "was" arm was written as the
shipped CONSTANT (`TAP`, `SUCCESS`, `WIN`…), which is correct exactly until the
constant moves. When all nine moved at once, each of those arms would have
silently become a second copy of its own replacement — two buttons per strip
playing an identical sound, one labelled with the old name, and every test still
green because a duplicate spec is a valid spec. `pop-square` was the only arm
holding its own literal (written out longhand when Cork was promoted) and so the
only one that survived. **A control arm must be a literal, never an import.**
`voices.test.ts` now fails on any two arms in a strip that are byte-identical;
mutation-proven by restoring the pre-fix line.

**A partial nobody can hear was making the browser complain.** `star` on tuned
wood asks for 26,634 Hz on its top note, above Nyquist at any sample rate, so
WebAudio clamped it and logged `value outside nominal range` on every star.
`voiceEngine` now skips any layer that spends its whole life above `sampleRate/2`
— measured on the artifact: **8 oscillators instead of 9, zero warnings**, and
nothing audible changed because nothing up there was audible.

**The streak ladder exists, is playable, and nothing calls it.**
`src/sdk/streak.ts` is the third policy port after `economy.ts` and `score.ts` —
a game reports how many correct in a row and never picks a pitch. First rung on
the **3rd**, C major pentatonic (`0 2 4 7 9 12 14 16 19 21`), and it **caps** at
the top rather than resetting, because dropping a long run back to the bottom
tells a child who is doing well that they are suddenly a beginner again.
Pentatonic and not diatonic on purpose: a leading tone makes an ascending line
*beg* for the next step, and building that pull deliberately for five-year-olds
is not something this platform does. `streakStep` returns **`undefined`, never
0**, for "too short to count" — 0 is a real rung, so the two must not be
spellable the same way or the ladder fires on every correct answer. Measured at
the audio layer after the timbre moved to Glass: 523 Hz on the first two taps,
then 519 → 1756, and 1773 on the thirteenth — the same rung, jittered, the cap
holding. **The partial COUNT is the better evidence than the pitch**: taps 1–2
draw nine oscillators (Wood run, three bar partials across three notes — the
ordinary `success` sound below the floor) and every tap after draws four, which
is glass. `streakTier()` returns `good`/`great`/`amazing` and **nothing speaks
them**.

**Confetti and burst spread are now 140 and 190 px** (`ellaz:juice:v1`,
`src/juice/tuning.ts`), both picked in the lab on 2026-08-13; shake was
re-chosen and came back unchanged at 6 px / 240 ms, which is worth recording
rather than reading as "that one was skipped". The honest limit: **burst COUNT
is not tunable**, because 20 sites pass their own hand-authored 5–16 and an
explicit argument beats a default. Unlike `voiceOverride` this store **clamps
rather than drops** — the worst a bad number here does is draw odd confetti.
Measured in a fresh browser context with nothing stored: a win draws **140**
pieces and the lab marks 140 / 6 / 240 / 190 as shipped.

**A control that stops controlling is worse than no control.** `tuning.test.ts`
proved `clearTuning` by saving `confetti: 140` and asserting the result equalled
shipped — fine until 140 *became* shipped, at which point the save was a no-op
and the assertion passed whether or not `clearTuning` did anything, with nothing
in either diff to show it. It now derives a value that cannot collide and
asserts the setup changed something before asserting the teardown undid it.

**Level-matching now keys on CONTENT, not object identity.** `voiceEngine`'s
trim cache was a `WeakMap<VoiceSpec, number>`, which is right for eight module
constants and wrong for a voice read from storage: every parse mints a fresh
object, so the trim was missed on every re-read and the picked voice played
unmatched against the palette it was being compared to — ruining the one
comparison the lab exists to make.

**The Juice Lab that came before it is gone.** It was a dev-only `#/lab`
tournament — 45 physics-synthesised sound characters, six blind ranking rounds —
and it always carried a kill date: the winners land, `src/juice/lab/` is deleted
in that same commit. That happened on 2026-08-08 in `ae4df64`. Its four unused
partial tables (bell, bar, wood, soft) were recovered into `src/lab/modes.ts`
rather than into `@sdk/voice`, since a mode nothing plays yet must not be paid
for by a first visit; `struck()` takes a partial set directly so the lab reaches
the SAME damping law instead of keeping a second copy of the physics.

**`src/sdk/voice.ts` holds the eight voices it chose**, as pure data (no
WebAudio, so it unit-tests in node), and `voiceEngine.ts` is the only place that
touches audio nodes. `sdk/audio.ts` is unchanged as an interface — all 41
`play()` call sites were untouched by the swap.

**All eight are NEW. The recorded verdict said otherwise and it was wrong.** A
memory note claimed coin and wrong "were won by the sounds already shipped", with
a warning not to change them. `brackets.ts` said the opposite outright — *"the
palette deliberately reuses the LEAN specs as its control characters"* — every
`*-current` character referenced `LEAN.*` and none referenced `CONTROL.*`, so the
control arm was the lab's own unshipped design and `coin-current`'s blurb "what
the lab plays right now" meant the **lab**. Following the note would have wired a
320 Hz square for coin and left a sawtooth buzz for wrong. `voice.test.ts` pins
the correction so nobody restores the old sounds on a note's authority.

The transferable half: **a verdict recorded as "the control won" is ambiguous
unless the record also says WHAT THE CONTROL WAS.** Record the spec identifier,
never the word "control".

**coin and star had no wiring at all** before this — no `SfxName` member, a
silent coin flight, nothing on a star. Both now fire from `winMoment` staggered
behind the win chord (450 ms / 620 ms) so a level completion is a short phrase
rather than three sounds in a pile. **That sequencing is not a tournament
result**: the guided round that would have chosen the coin-flight behaviour was
never ranked, so one coin plays per win — the conservative reading of a question
nobody answered.

**Level-matching ships with the engine.** Each voice is rendered offline once and
trimmed to a common peak, because the operator judged all six AT matched
loudness; untrimmed, a reverbed star against a 60 ms tap is roughly a 4× peak
difference. Measured on the live artifact: every voice lands within 6% of target.
**Except the first tap of a session**, which plays ~5 dB quiet — the gesture that
unlocks audio is the same gesture that plays the sound, so the trim does not
exist yet. Once per session, quieter not louder.

**`Home.tsx` had zero juice and zero sound** when the lab was built; it now
attaches `attachShellJuice` for press depth, a ripple and a haptic —
deliberately **without** `playTap`, because Home already plays tap through its
own handler and passing both fires on `pointerdown` and again on `click`.

**The modulepreload trap the lab cost us is still live for any lazy chunk**, and
it is the reason `build:check` exists in this shape. Keeping a dev-only chunk off
a child's device needs **four** things: the route branch behind
`import.meta.env.DEV`, the chunk carved out with a named `manualChunks` prefix,
that prefix in the PWA `globIgnores` — and the `lazy(() => import(...))` **at
module scope itself behind `import.meta.env.DEV`**. Without the fourth, the first
three are all true and Vite still writes a `<link rel="modulepreload">` into
`index.html`, so every child eagerly downloads it on first paint. It was live on
ellaz.fun until 2026-08-03. Verify with `npm run build:check`, never by reading
the code — the greps that missed it were each individually correct.

The blind protocols, the ethical line the lab declined to cross, the damping law
that made the sounds stop reading as synthetic, and what the tournament cost:
[`docs/juice-lab.md`](docs/juice-lab.md), now a past-tense record.

## Known traps (learned here)

- **Nested React root teardown:** DOM games mount their own React root via
  `reactHost.tsx`. Its teardown MUST be deferred with `queueMicrotask` — unmounting a
  nested root during the portal's own unmount throws `removeChild: node is not a
  child`. Don't also clear the mount node in `GameHost` (double-free).
- **SW serves stale bundle** during QA (see Commands). This is intended `prompt` behavior.
- **Never name a file as a case-variant of a neighbour.** This repo sits on `/mnt/c`,
  which is case-INSENSITIVE, so `@ui/GameArt` and `@ui/gameArt` are the same path here
  and different paths in CI. A new `GameArt.tsx` beside the existing `gameArt.ts`
  resolved silently to the SVG module; `tsc` caught it in seconds ("has no exported
  member named 'GameArt'. Did you mean 'gameArt'?"), but only because the export names
  differed. The component is `gameArtView.tsx`.
- **No backend by design, so clearing browser storage erases the child's coins,
  stars and room.** Everything lives in `localStorage` (`ellaz:profile:v1` plus the
  per-game save keys), which also means a phone and a tablet are two separate
  players with two separate rooms. `migrateProfile()` salvages a corrupt or partial
  record rather than throwing, but nothing can recover a cleared one. The v2
  mitigation idea is an export/import backup code the player can write down; it is
  explicitly OUT of scope, and it is not a reason to build accounts.

## Deploy

**Normal path: push to `main`.** Both hosts build and publish themselves — see
the Deploy table under Architecture. Nothing needs to be built or uploaded by
hand, and a hand-uploaded `dist/` is how the two hosts drift apart.

Manual escape hatches, for when CI is down:

```bash
npm run build && firebase deploy    # legacy Firebase target (firebase.json)
# Hostinger by hand: npm run build, cp deploy/hostinger.htaccess dist/.htaccess,
# then upload dist/ to public_html via hPanel's File Manager.
```

## Firebase — the project is real now, and it must stay free

`.firebaserc` has named `ellaz-games` since long before the project existed, so
that `firebase deploy` line above would simply have failed. The project was
created for real on 2026-08-03 (number `93565492047`): Firebase added, a web app,
Firestore Native in **me-west1 (Tel Aviv)**, and Anonymous sign-in enabled. It
backs the players/boards work, not hosting - the live site stays on Hostinger.

**It has NO billing account, and that is the whole cost guarantee. Never link
one.** A GCP project with no billing account has no payment path at all: every
service either runs inside its free quota or returns an error. It cannot produce
a bill, so no budget alert is needed and none can be set.

The one way to break that is to accept an **"Upgrade to Blaze"** prompt, which
Firebase offers whenever you touch Cloud Storage, Cloud Functions, or extensions.
**Decline it, every time.** Nothing this platform needs requires Blaze:

- **Anonymous auth is free** and has no paid tier here. Note the trap - the
  *console* toggle is free Firebase Auth, while the `identityPlatform:initializeAuth`
  **API** is the paid Identity Platform product and answers `BILLING_NOT_ENABLED`.
  That error means "use the console", never "enable billing".
- **Phone auth bills per SMS even at tiny volume.** It is off. Leave it off - we
  ask a child for nothing, so there is no reason to turn it on.
- **Cloud Storage is not provisioned** and must not be. Original SVG ships in the
  bundle; the World needs no uploads.

**Cloud backup talks to it over plain HTTP — there is no `firebase` dependency
and there must not be one.** The SDK is ~150-200 KB gz, close to three times the
whole first visit, to do three things that are ordinary REST calls: anonymous
sign-in, read one document, write one document. `src/sdk/cloud.ts` is the client
and it lives in a lazy `cloud-*` chunk. **Rules are released through the Firebase
Rules API, not by this repo's CI**, so a `firestore.rules` edit that was never
released is invisible from the source tree — run `npm run probe:cloud` after any
rules change. It drives the live project with a positive control on every
negative, which is how the original "no rules release exists at all" was found.
Cloud backup is a **backup and a transfer, not live sync**; making it live needs
per-device counters on the profile first.

**A transfer carries two things, because progress lives in two places.** The
profile (coins, stars, the room) is one key; every personal best is a separate
key per game per board, written by each game's own `SaveStore`. The first version
carried only the profile, so it restored a room with none of the records that
filled it and said nothing - `src/sdk/records.ts` is the missing half. An incoming
document may **never name its own storage keys**: every key is matched against an
anchored `ellaz:<game>:score:<board>` pattern before it reaches the disk, because
otherwise a crafted document could write `ellaz:cloud:v1` (this device's identity)
or `ellaz:profile:v1`. Adoption **unions** rather than replaces - `ctx.score` has
no `clear()` and a transfer must not become one - and it cannot merge by taking
the better of two values, because only the number is persisted and not the unit.

**Restoring is the only action in this app that destroys progress**, so it carries
two guarantees that no other screen needs and that a future destructive feature
must inherit: the confirm shows a NUMBER for what is lost beside what is gained
(prose describes a risk, a number lets someone notice it is the wrong tablet), and
`adoptRestored()` keeps the replaced profile at `ellaz:profile:undo:v1` so
`undoRestore()` works **after a reload** — the realistic moment anyone notices is a
child opening the app hours later. Its sibling: the backup code is generated
locally, so it exists whether or not anything reached the cloud. It is shown dimmed
and labelled unsaved until an upload confirms, never as a promise the network has
not made. Both rules, and the `void someAsyncSave()` tell that hides the second one:
[`.claude/rules/destructive-actions-show-both-sides.md`](.claude/rules/destructive-actions-show-both-sides.md).

Firestore's free daily quota is the real design constraint, and running out is
fail-closed - reads are refused until it resets, which costs nothing and shows a
child a stale board rather than a charge. **That makes write VOLUME a correctness
question, not a tuning one**: exhausting the daily allowance stops backups for
every player at once. Three things hold it down, and all three are load-bearing -
the sync debounce is 30s (not 5s, which cost up to 720 pushes an hour of play and
is only safe to lengthen because `visibilitychange` flushes, which is how phone
sessions actually end); the `codes/<code>` index is written **once per page load**
rather than once per push, latched in memory so a fresh load re-verifies it and
quietly repairs a lost index; and a push whose profile is byte-identical to the
last successful one is skipped. The skip compares the profile **without
`updatedAt`** - that stamp moves on every wallet mutation, so comparing the whole
serialised record would never match twice and the check would be dead code that
always passed. Together: ~1,440 writes/hour worst case down to ~121. Confirm the current numbers at
<https://firebase.google.com/pricing> before designing near the edge, and assume a
naive "top 100" board read costs 100 reads. Prefer `count()` aggregations and
cache what you can, which is also why the board design is percentile-first.

Analytics key is `VITE_POSTHOG_KEY` (public); see `.env.example`. Both workflows
pass it through from a repo secret of the same name.

**It is not set yet, and until it is, analytics does nothing.** `import.meta.env.VITE_*`
is substituted at BUILD time, so with the secret absent Vite writes `undefined`,
`if (!key) return` becomes always-true, and the whole init is dead-code-eliminated.
Verified against the live bundle on 2026-08-02: `person_profiles:"never"`,
`capture_pageview:!1` and `respect_dnt:!0` all had zero occurrences. Every event
since launch has been discarded — which is why economy tuning from `reward_grant`
has never had data to tune against.

Setting the secret is safe at any time: `build:check` fails the deploy if the
PostHog chunk would land in the precache, rather than shipping it behind a green
checkmark. **First visit is 89,164 B gz of the 90,000 ceiling** in
`scripts/assert-payload.mjs` — **836 B spare**, measured on the artifact
2026-08-13 on a tree carrying a peer's in-flight `daily` and `share` work; see
the attribution note further down before reading that delta as anyone's. (It was 69,624 on 2026-08-02, down from 143,234; the ceiling has
moved more than once since, so read `CEILING` in the script rather than trusting
this line.) **Adding a game costs the SHELL about 300 B gz** even though its code
is lazy: its `meta.ts` is in the statically-imported roster and its `gameArt`
scene is in the grid. Falling Blocks cost 306 B, measured against a clean `main`
build.

**The real number is 192 B gz per game, and both figures this file carried
before were wrong.** It said ~300 B from Falling Blocks; I raised that to ~745 B
on 2026-08-13 from Colour Sort and Merge. Each was measured across a window that
contained other changes, which is the same mistake twice — a delta is only a
per-game cost if the game is the only variable.

Isolated properly (two build arms from one tree, 25 games versus 6 with the
other 19 stubbed): **163 B is the card art and 29 B is the game's link in the
emitted home document.** The art dominates because `src/ui/gameArt.ts` is one
object literal — every scene is reachable, so every scene ships, on a screen
showing about eight cards. Dropping games from the roster *alone* saves only
**24 B each**, because the art never leaves with them; that number is the trap,
not the answer.

**So do not quote a per-game cost from a payload diff taken across a working
session.** Build two arms, change one thing.
[`docs/scaling-the-first-visit.md`](docs/scaling-the-first-visit.md) carries the
measurement, the O(1) rule that replaces the fixed ceiling, and the three steps.

**The ceiling stopped binding on 2026-08-13**, and how it stopped matters more
than the number, because the fix written down here was wrong about its own size
by a factor of eight and wrong about what was blocking it.

This file used to say the carve was worth ~546 B and needed 20 games to move off
the `@shared` barrel onto direct module paths first. Neither held. **The barrel
was never the blocker** — `manualChunks` assigns by module PATH, so who imports
what changes nothing; `src/shared/` was pinned to the shell wholesale by the
`src/{sdk,ui,juice,i18n,shared}` catch-all. And the only module in there the
shell genuinely reaches is **`rng.ts`**, via `sdk/names.ts` and
`sdk/backupCode.ts`, both of which already import the direct path for exactly
this reason. Everything else — `winMoment`, the spawner, the cast, the shapes,
the sequence brain, the game clock, the `Prompt` chip, both session hooks, and
the barrel itself — was downloaded by every child before they had chosen a game.

**One ordering rule in `manualChunks` moved all of it: 89,561 → 84,974 B gz,
4,587 B saved, headroom 439 B → 5,026 B**, which is roughly sixteen more games
rather than one. `rng.ts` is matched FIRST and returned to the shell, and that
ordering IS the guard: move it and the shell imports from the page chunk, which
is the failure `assert-first-visit.mjs` exists to catch and has now caught three
times. It passed with its negative control rejecting 9 of 9 planted entries, so
that green is a real one rather than a vacuous one.

**Latest reading: 89,322 B gz, 678 spare** (2026-08-14, 29 games; supersedes
the 89,164 below) (2026-08-13, after the nine voices
were re-picked). That is **tight**, and the tree it was measured on is not the
one the previous line describes: `daily` and `share` are now static in the shell
(15 and 17 occurrences in the shell chunk), and a peer has all eleven locale
dictionaries, `Home.tsx`, `PageApp.tsx` and `gameArt.ts` modified in flight. So
the +2,701 since 86,463 is **not attributable to the sound work** — the voice
data itself moved by a few hundred bytes at most, and `src/lab/previous.ts` was
verified to land in the lab chunk with **zero** references in `index.html` and
zero in the precache manifest.

Whoever lands next should re-run the gate first: 836 B is roughly one more game's
worth of `gameArt` scene, and the honest reading is that this ceiling is now the
binding constraint again rather than a formality. The 84,974 further up is the
correct record of the `manualChunks` change against the tree IT was measured on;
all three are true of different trees, which is the whole point of the rule below.

**The transferable half is the measurement, not the bytes.** Two numbers in this
file were confidently wrong at the same moment: a ceiling of 86,000 that the live
gate had read `90_000` since a parallel lane raised it, and a 546 B estimate for
work nobody had ever measured. Both were written by someone who had measured
something true at the time. **Re-measure before quoting any payload figure here**
— the gate is one command, and this prose has now gone stale twice. See
[`.claude/rules/a-threshold-tuned-against-todays-tree-goes-stale.md`](.claude/rules/a-threshold-tuned-against-todays-tree-goes-stale.md).
