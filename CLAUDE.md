# CLAUDE.md — Ellaz Games Platform

Guidance for Claude Code (and humans) working in this repo.

## What this is

Ellaz is a **cross-device casual-games PWA** — one website where kids and adults
play our games on phone, tablet, and PC. Hebrew (default, RTL) + English (LTR).
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
├─ i18n/     he (default, RTL) + en (LTR) strings + direction
├─ portal/   Shell - App (the home screen at `/`), Home (grid of real links),
│            PageApp (boots a game or the room on its own page), GameHost
│            (mount/unmount bridge), WalletChip, games (the ordered roster),
│            catalog (roster + lazy loaders), paths/pageContext/legacyHash,
│            world/ (the room + shop)
├─ build/    BUILD-TIME ONLY - the 46 emitted pages. Pure strings, no DOM, no
│            React. Nothing in the app may import it (it reads src/content)
└─ games/<id>/
   ├─ meta.ts         DOM-free GameMeta - catalog.ts imports it statically
   ├─ logic.ts        PURE game logic - NO DOM/Phaser imports; unit-tested (TDD)
   ├─ logic.test.ts
   └─ <Renderer>      React component (DOM) or Phaser scene (canvas)
```

**Games (21)** — 16 `ageBand: "kids"` (balloons, bees, bubbles, coloring, echo,
evolve, finddiff, frog, hidden, math, memory, reaction, sequence, shadows,
sortsize, vanish) and 5 `"all"` (minesweeper, n2048, snake, sudoku, tictactoe).
Counts here go stale fast — `src/portal/catalog.ts` is the source of truth and
`catalog.test.ts` ratchets the count. Every game offers a **difficulty selector**
and/or endless levels: 17 render the shared `<DifficultySelector>` from `@ui`,
coloring, finddiff and hidden advance through endless levels instead, and snake
picks speed from in-canvas Phaser buttons. Wins go through **`winMoment()`** from
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
walks all 48 URLs; that walk IS the burst test, since the challenge arms on a run of
requests rather than the first one. It checks the BODY as well as the status, because
a challenge can be served with 200. `.github/workflows/crawlable.yml` runs it daily
and a red run emails the owner. Node built-ins only, so it needs no `npm ci`.

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
`ctx.rewards`. **20 of the 21 games have one**, and **coloring gets none, ever**
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
   with `<DifficultySelector>` from `@ui`.
5. Register in **two** places, which are deliberately different lists:
   `src/portal/games.ts` holds the ordered roster (`import { meta as <id> }` plus a
   row in `GAMES`), and `src/portal/catalog.ts` holds the lazy loader
   (`<id>: () => import("../games/<id>/index")`). The ORDER lives in one file and
   the loaders in the other because the build-time page emitter reads the roster
   and must never touch game code - a stray `import("../games/snake")` at config
   time would load Phaser inside `vite.config.ts`. `catalog.test.ts` is
   property-based with a count ratchet, and `build.test.ts` asserts the two lists
   stay identical, so a well-formed entry needs no test edit.
6. `src/content/games/<id>.ts` - the page's words, in Hebrew AND English, plus a
   `provenance` row for every number the prose quotes. See the next section.

The SDK, UI, juice, i18n, PWA, rewards, and analytics come for free. Phaser lives in
a shared vendor chunk (`vite.config` `manualChunks`) cached across all canvas games.
**Two web pages come for free as well** - the route table is derived from the
roster, so `/games/<id>/` and `/en/games/<id>/` are emitted, sitemapped and gated
the moment step 5 lands. Missing step 6 is a red build, not a thin page.

## Every game has a real web address

The site used to be one document. It is now 49: `dist/index.html` (still the app,
unchanged) plus **48 emitted pages** built by `src/build/**` inside a Vite plugin,
so `npm run build` cannot skip them and neither deploy workflow can forget.

| URL | What it is |
|---|---|
| `/` | the application. The emitter only adds head tags here, never overwrites it |
| `/games/<id>/` · `/en/games/<id>/` | 21 games x 2 languages, ~900 words each |
| `/en/` | the English home index, with 21 real links |
| `/world/` · `/en/world/` | the room |
| `/boards/` · `/en/boards/` | the leaderboards (two screens - see below) |
| `/404.html` | bilingual, `noindex`, and `ErrorDocument`-wired on Hostinger |
| `robots.txt` · `sitemap.xml` · `llms.txt` | emitted, not in `public/` (see below) |

**Adding a page kind means finding every list that says which pages boot the app.**
There were three, and they do not live together: `build.test.ts`'s `boots`
predicate, `scripts/assert-pages.mjs`'s, and the runtime's own switch in
`pageContext.ts`. Miss one and the page is held to the DOCUMENT rules instead,
so it fails the build for a reason that has nothing to do with what is wrong -
which is what happened, and is the gate working. The runtime one is worse: a
missing branch there falls through to the game arm and mounts a `GameHost` with
an empty id, so the page renders its prose perfectly and shows "we couldn't find
that game" where the screen should be.

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
reads the page perfectly. `index.html` carries the class; the 46 content pages do
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
returns one identical date for all 48 — the same bug wearing a disguise, on the only
machine that publishes. Both deploy workflows set `fetch-depth: 0`, the emitter omits
the field on a shallow clone or a uniform result rather than lying, and
`assert-pages.mjs` fails the build on 48 identical dates. **An absent `<lastmod>` is
valid and is what this site shipped for months; a uniform one is a lie.**

**It is currently DORMANT, correctly.** A commit on 2026-08-08 touched all 21 game
directories, so every game page resolves to one timestamp and the emitter omits the
field. That is the design working, not a bug: `<lastmod>` exists to say WHICH pages
changed, and 48 identical dates answer "all of them" — as useful as saying nothing.
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

**The content-page runtime is a lazy `page-*` chunk** - the game host and the
whole room, 8.8 KB gz, which `/` never needs. Adding it caught the documented
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

Every page carries an `og:image`: **48 cards, 1200x630**, emitted by `src/build/ogCard.ts`
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
before the other eighteen.

**`src/content/` is build-time only.** `no-app-imports.test.ts` forbids portal, ui,
sdk, games, juice, shared and i18n from importing it; one stray import would put every
word of all 21 pages into the precached shell a child downloads before choosing a game.

Full rule: [`.claude/rules/game-content-template.md`](.claude/rules/game-content-template.md).

## How the app FEELS — the sounds, and the lab that chose them

**The Juice Lab is gone.** It was a dev-only `#/lab` tournament — 45
physics-synthesised sound characters, six blind ranking rounds — and it always
carried a kill date: the winners land, `src/juice/lab/` is deleted in that same
commit. That happened on 2026-08-08 in `ae4df64`. Do not look for it.

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
checkmark. **First visit is 69,624 B gz** (measured on the live artifact
2026-08-02, down from 143,234).
