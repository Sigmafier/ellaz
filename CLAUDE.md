# CLAUDE.md — Ellaz Games Platform

Guidance for Claude Code (and humans) working in this repo.

**This file is the MAP, not the territory.** On 2026-08-29 it was 164,867 chars —
over Claude Code's 150,000-char per-file limit, so part of it was being dropped
from context every turn and nobody could say which part. The evidentiary
narrative moved, byte-identical, into `docs/`; the laws and the pointers stayed
here. `npm run assert:context` proves the move lost nothing, and reds on a
planted loss. **Keep it that way: a new trap gets a paragraph in the right
`docs/` file and at most a line here.**

## What this is

Ellaz is a **cross-device casual-games PWA** — one website where kids and adults
play our games on phone, tablet, and PC. English (default, LTR) + Hebrew (RTL).
Anonymous play, on-device saves, anonymous kid-safe analytics. No backend.

**This repo also holds a SECOND, unrelated site.** `holdem/` is a real-time
multiplayer poker table for adults — its own npm workspace root, its own tests,
its own host (Cloudflare, not Hostinger), and a server, which the games platform
deliberately does not have. Nothing in `src/` may import from it and nothing in
it may import from `src/`. See § The poker table below before touching anything
under `holdem/`, and note the trap that follows from it: **`npm test` at the
repository root does not run a single one of its tests.**

**And a THIRD workspace, `studio/`, since 2026-09-05: the art bible.** Six
style renderers with recipes, four characters with five clips each, a technique
library, an engine-neutral sprite export (sheet + atlas + manifest) with Phaser
and canvas adapters, and a gallery. Same independence as the poker
table: its own `package.json`, tests, seven gates and `studio.yml`; nothing in
`src/` or `holdem/` imports from it and nothing in it imports from them, and
**root `npm test` runs none of its tests** - `cd studio && npm run build:check`.
Run the **`studio-workspace` skill** before touching it; the map is
[`studio/README.md`](studio/README.md). **The gallery is a TOOL, so it is
shadcn + Radix wearing a byte copy of the ellaz tokens, on port 5188 and no
other** - the products-vs-tools rule in
[`a-tool-ships-on-the-shared-kit-a-product-on-the-lightest.md`](.claude/rules/a-tool-ships-on-the-shared-kit-a-product-on-the-lightest.md).
The app itself stays Preact on `src/ui`, because its budget is bytes.

**What shipped, in order, with the measured numbers and the traps each one
cost**: [`docs/build-log.md`](docs/build-log.md). Read it before re-deriving a
payload figure, re-litigating the engine choice, or wondering why analytics has
never produced data. [`docs/architecture.md`](docs/architecture.md) is the
module map and the SDK contract.

## Where the detail lives

Every one of these was in this file and is now one `cat` away. Read the row
before re-deriving a number, re-litigating a decision, or wondering why
something is built the way it is.

| Read this | For |
|---|---|
| [`docs/build-log.md`](docs/build-log.md) | what shipped, in order, with the measured numbers and the traps each one cost |
| [`docs/architecture.md`](docs/architecture.md) | the module map and the SDK contract |
| [`docs/games-and-chrome.md`](docs/games-and-chrome.md) | the annotated `src/` tree, the 42 games, the design bench, the game row, the home bar, and every non-negotiable convention in full |
| [`docs/adding-a-game.md`](docs/adding-a-game.md) | the ~30-minute recipe, step by step, and what each step's gate refuses |
| [`docs/rewards-world-and-sessions.md`](docs/rewards-world-and-sessions.md) | coins, stars, scores, the room and its 82 items, names, speech, and resume |
| [`docs/pages-and-seo.md`](docs/pages-and-seo.md) | the 200 emitted pages, the three locale sets, share cards, search thumbnails, the document stylesheet, the prose rules |
| [`docs/performance-and-cls.md`](docs/performance-and-cls.md) | the room's boot shift and the home page's boot flash, both measured |
| [`docs/measurement-and-payload.md`](docs/measurement-and-payload.md) | the two analytics systems that report nothing, the consent bar, the payload ceiling and slope |
| [`docs/sound-and-juice.md`](docs/sound-and-juice.md) | the nine sounds, the lab that chose them, the streak ladder |
| [`docs/engine-choice.md`](docs/engine-choice.md) | why Phaser stays, and why the fps column is not a feel proxy |
| [`docs/standalone-and-outreach.md`](docs/standalone-and-outreach.md) | the itch.io bundles, and the numbers we tell strangers |
| [`docs/firebase-and-cloud.md`](docs/firebase-and-cloud.md) | the Firebase project, cloud backup over plain HTTP, and the quota design |
| [`docs/poker-table.md`](docs/poker-table.md) | the Hold'em sub-project in full |
| [`docs/deploy.md`](docs/deploy.md) | the deploy runbook, verification commands, secret rotation |
| [`docs/reports.md`](docs/reports.md) | player bug and idea reports: what a report carries, what it never carries, the throttle, and how the inbox becomes GitHub issues |
| the **`handle-a-report` skill** (`.claude/skills/handle-a-report/`) | how a report becomes a closed issue - read it whole (the title is a 60-char slice), split its asks, find whose code it really is, close on live bytes |
| [`docs/payload-history.md`](docs/payload-history.md) · [`docs/scaling-the-first-visit.md`](docs/scaling-the-first-visit.md) | superseded payload readings, and the O(1) argument |
| [`.claude/rules/`](.claude/rules/) | 49 traps, one per file, each with its measurement. Path-scoped, so each loads when you touch what it governs |
| [`holdem/README.md`](holdem/README.md) | the poker runbook, quotas, DNS |

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

**The gates.** `build:check` runs the four that guard a first visit; the rest are
run deliberately. Each reads a different thing, and that is the point — a green
one says nothing about what another would find.

| Gate | Reads | Catches |
|---|---|---|
| `npm run build` | the source | types; it is also the type-check gate |
| `npm run assert:first-visit` | `dist/` chunk graph + `index.html` | a lazy chunk that reached the shell, or a modulepreload for one |
| `npm run assert:payload` | `dist/` gzipped shell | the first visit over its ceiling |
| `npm run assert:slope` | two build arms | the per-game cost of the catalogue growing |
| `npm run assert:pages` | the 200 emitted documents | prose floor, canonical, hreflang, JSON-LD, sitemap bijection, share cards, titles |
| `npm run assert:crawlable` | **the network**, as every crawler robots.txt names | a challenge, a 429, or a 200 carrying no content |
| `npm run assert:live` | **the live site** after a deploy | HTML naming assets that never landed, or bytes that arrived truncated |
| `npm run assert:standalone` | `dist-standalone/` or an extracted zip | anything that phones home, an absolute path, a stale stamp |
| `npm run assert:outreach` | `docs/outreach/` | a published number that has gone stale |
| `npm run assert:context` | `CLAUDE.md` + `docs/` vs the pre-split commit | prose lost when this file was split, and any dead pointer in `docs/` |
| `npm test` | `src/**` | **not one poker test — see the poker table below** |

Run `assert:pages` under **both** bases before believing it:
`npm run build:check`, then
`BASE_PATH=/ellaz/ npx vite build --outDir dist-ellaz && DIST_DIR=dist-ellaz npm run assert:pages`.
Half these failures are base-dependent and each workflow only ever sees one arm.

## Architecture — the boundaries

Single Vite + React 18 + TypeScript app; Phaser 4 powers canvas games (snake is
the only one that imports it). **React and ReactDOM are aliased onto
`preact/compat` in `vite.config.ts`** — and no test in this repo can see that
swap break, so read
[`a-runtime-swapped-by-an-alias-is-invisible-to-the-suite.md`](.claude/rules/a-runtime-swapped-by-an-alias-is-invisible-to-the-suite.md)
before touching it.

Import through the aliases, never deep paths. The annotated tree, with what each
module owns, is in [`docs/games-and-chrome.md`](docs/games-and-chrome.md).

| Alias | Directory | Holds |
|---|---|---|
| `@sdk` | `src/sdk/` | the neutral contract every game implements — saves, analytics, audio, speech, lifecycle, and the policy ports (`economy` · `score` · `session` · `streak`) |
| `@shared` | `src/shared/` | neutral game helpers — rng, notes, `winMoment()` |
| `@ui` | `src/ui/` | tokens, RTL-aware components, `DifficultySelector`, `DirectionPad` |
| `@juice` | `src/juice/` | haptics, shake, burst, confetti, `flyTo`, tween |
| `@i18n` | `src/i18n/` | strings, direction, and the three locale sets. A leaf module importing nothing |
| — | `src/portal/` | the shell: home, page boot, `GameHost`, wallet, catalog, the room |
| — | `src/build/` | **BUILD-TIME ONLY** — the 200 emitted pages |
| — | `src/content/` | **BUILD-TIME ONLY** — the words on those pages |
| — | `src/games/<id>/` | `meta.ts` (DOM-free) · `logic.ts` (pure, tested) · a renderer |

**Six import boundaries, and each one is a real failure rather than a style rule:**

- **Nothing in `src/` may import from `holdem/`, and nothing in `holdem/` from `src/`.** Two sites, two hosts, one repo.
- **The app may never import `src/build/**` or `src/content/**`.** One stray import puts every word of 200 pages into the shell a child downloads before choosing a game. `no-app-imports.test.ts` holds it.
- **`src/build/**` may not use the `@ui`/`@i18n` aliases.** Node loads it from `vite.config.ts` at config time, where no Vite alias exists yet — so an aliased import fails the whole config to load and reads as a broken build. Use relative paths.
- **`src/build` may never import `src/portal/catalog.ts`.** Its lazy loaders would pull Phaser into `vite.config.ts`.
- **`logic.ts` imports no DOM and no Phaser.** Rules are pure and driven by an injectable `rng`, so they test in node.
- **Games talk only to `GameContext`**, never to portal internals. The lifecycle and ads shape matches the Poki + CrazyGames union so games can list on those portals later with no rewrites.

**`@ui` may import `@i18n`** — sanctioned and deliberate, and i18n is a leaf so it
can never become a cycle. Do not "fix" it back into 22 locale ternaries.

**Counts here go stale fast.** 42 games, 200 emitted pages, 4 page locales, 11
interface locales, 82 shop items — every one of those has been wrong in this file
before. `src/portal/catalog.ts`, `dist/pages.json` and `PAGE_LOCALES` are the
sources of truth, and each has a test that ratchets it.

## Non-negotiable conventions

The laws, one line each. The measurement behind every one of them, and the full
prose, is in [`docs/games-and-chrome.md`](docs/games-and-chrome.md) § Non-negotiable
conventions; the named rule file carries the evidence.

**How a game is built**

- **Pure logic core.** All rules in `games/<id>/logic.ts`, zero DOM/Phaser, injectable `rng` last. Test the logic, not the DOM.
- **Wins go through `winMoment()`** from `@shared` — never a hand-rolled celebrate-plus-grant block. It banks and persists BEFORE it animates, so a thrown animation can never cost a child a coin.
- **Games report reward REASONS, never amounts** (`level_complete`/`milestone`/`personal_best` + a tier). `src/sdk/economy.ts` alone decides the payout. → [`rewards-economy-convention.md`](.claude/rules/rewards-economy-convention.md)
- **Games report a score VALUE and UNIT, never a direction.** `src/sdk/score.ts` decides whether high or low wins. There is no `direction` parameter and there must never be one. → [`score-contract-convention.md`](.claude/rules/score-contract-convention.md)
- **`ctx.rewards` and `ctx.score` are add-only.** No `spend()`, no `clear()`. Spending happens in one place, the World screen.
- **Coloring keeps no score, ever.** Ranking a child's drawing is the opposite of this platform's premise.
- **Side effects fire from the event handler, never from a `setState` updater.** React may run an updater twice — for `winMoment` that is a double grant. → [`game-difficulty-and-juice-convention.md`](.claude/rules/game-difficulty-and-juice-convention.md)
- **A restart must clear what the game's INPUT is gated on**, not just deal a new board. → [`a-restart-must-clear-what-the-input-is-gated-on.md`](.claude/rules/a-restart-must-clear-what-the-input-is-gated-on.md)
- **A saved position carries every reward latch**, or leaving and returning is a way to be paid twice — and it must never hold a state only a timer can leave. → [`session-snapshot-convention.md`](.claude/rules/session-snapshot-convention.md)
- **Puzzle boards are BUILT BACKWARDS, never shuffled and hoped over.** That is why none of them can hand a child something impossible.

**What a child touches**

- **Kids games are tap-completable; drag is optional, never required.** A five-year-old on a phone, and anyone on assistive input, cannot hold a sustained pointer gesture. Plus targets ≥2x2cm, icon+audio navigation, instant restart, **no fail-punishment**.
- **No disabled buttons for "you have not earned this yet."** A locked item stays pressable and answers with a gentle wiggle. `disabled` is reserved for the genuinely impossible.
- **A thing that tells the player to tap it must answer a tap.** If the words are an instruction the element is a control; if they are only a description it must stop looking like one. Never `disabled` in between - a hint is not a disabled button, it is not a button. → [`a-control-that-carries-an-imperative-must-be-a-control.md`](.claude/rules/a-control-that-carries-an-imperative-must-be-a-control.md)
- **Speech is supplementary, never the question.** A voice can be selected, fire `onend` on time, and emit no sound, and that is undetectable from JavaScript. If removing speech would make a game unplayable, the design is wrong.
- **A control is either GAME or PLATFORM, and they never share a bar.** The test: would this still make sense on the World screen or the Boards? → [`game-controls-and-platform-chrome-never-share-a-bar.md`](.claude/rules/game-controls-and-platform-chrome-never-share-a-bar.md)
- **Steering is one component** — `DirectionPad` from `@ui/DirectionPad`, imported by its own path (it lives in the `page` chunk, so a barrel re-export would make the shell import from it). Never ship the joystick alone.
- **Input:** Pointer Events only, `touch-action: none` on play surfaces, `keydown` state map for desktop. Wrap all `localStorage` in try/catch. Unlock audio on the first user gesture.
- **Responsive:** size boards with `min(<vw>, <vh>, <cap>px)` — against the VIEWPORT, not the container.
- **A spatial grid carries `dir="ltr"`** or it mirrors in the Hebrew app and inverts every direction — and a `dir` on an element defeats that element's OWN logical insets. → [`rtl-spatial-grid-dir-ltr.md`](.claude/rules/rtl-spatial-grid-dir-ltr.md)
- **`GameMeta.beta` is a DECLARATION, never a behaviour.** Nothing is gated on it; a beta game plays and ranks like a finished one.

**What may leave the machine**

- **No external network requests from games.** Poki's rule, and the reason this SDK can be listed on a portal at all. A webfont `@import` counts.
- **Analytics is anonymous and kid-safe.** PostHog anonymous-events mode only — **never `identify()`**, no PII, no session replay, no autocapture, no behavioural ads. Analytics failure must never block gameplay.
- **Original art and names only.** No trademarked names or trade dress — no "Tetris", "Wordle", "Waldo"; change shapes, colours and names for any cloned mechanic.
- **Persisted ids are forever.** Shop item ids, name-pool word ids: never rename one, never reuse one. → [`name-pool-convention.md`](.claude/rules/name-pool-convention.md)
- **A number that leaves this repo needs a gate**, because editing the file does not fix what a stranger already read. → [`a-hand-authored-number-that-leaves-the-repo.md`](.claude/rules/a-hand-authored-number-that-leaves-the-repo.md)

**Bytes**

- **Adding a chunk is THREE changes, not one**: the dynamic `import()`, a NAMED `manualChunks` branch, and a matching `globIgnores` entry. The precache glob sweeps `**/*.js`, so skipping the third leaves the payload unmoved behind a green build. → [`precache-glob-sweeps-new-chunks.md`](.claude/rules/precache-glob-sweeps-new-chunks.md)
- **Never quote a payload figure from prose — run `npm run assert:payload` on the tree in front of you.** Every number written in this file has gone stale, twice. And a figure measured on this machine is not the CI figure: → [`a-number-belongs-to-the-toolchain-that-ships-it.md`](.claude/rules/a-number-belongs-to-the-toolchain-that-ships-it.md)
- **A delta is only a per-game cost if the game is the only variable.** Build two arms from one tree; do not diff across a working session.
- **A survey of other people's pages does not predict what a platform will do to ours.** Newgrounds was chosen partly because author links are dofollow - measured properly, with a control, and still true of everyone else. Both of our own listings publish `rel="nofollow"`. → [`a-survey-of-their-artifacts-is-not-a-prediction-about-yours.md`](.claude/rules/a-survey-of-their-artifacts-is-not-a-prediction-about-yours.md)
- **A checklist step between a handover and the publish button will be skipped**, however clearly it is written. Move it before the handover or make the default correct; a louder instruction is not a fix. → [`a-step-between-a-handover-and-the-button-is-skipped.md`](.claude/rules/a-step-between-a-handover-and-the-button-is-skipped.md)
- **A gate that reads the bytes cannot tell you the artifact RUNS.** Load a standalone bundle in a browser before it leaves the repo: `2048` shipped a green-gated zip whose own game module had been stubbed out, and every static assertion passed. → [`a-build-gate-that-never-runs-the-artifact.md`](.claude/rules/a-build-gate-that-never-runs-the-artifact.md)

## Add a new game

The recipe is six steps and about thirty minutes. Run the **`add-a-game` skill**
(`.claude/skills/add-a-game/`), which carries it with every trap in place;
[`docs/adding-a-game.md`](docs/adding-a-game.md) is the same content as prose.

The two things worth knowing before you start:

- **A game cannot ship in fewer languages than the site has.** A missing `es:` arm does not compile and a missing content file fails `content.test.ts`. Two gates, two failure shapes, neither of which a reviewer has to notice.
- **A game cannot be built in parallel slices that each keep the suite green.** Two gates key on a directory merely CONTAINING `meta.ts`, so `meta.ts`, the art scene and the renderer land together or two tests stay red. That is the gates working — a game with no picture is not finished.

## Deploy

**Normal path: push to `main`.** Two hosts build and publish in parallel from the
same source at two different base paths. Nothing needs building or uploading by
hand, and a hand-uploaded `dist/` is how the two hosts drift apart.

| URL | Host | Workflow | Base |
|---|---|---|---|
| **`https://ellaz.fun/`** (the live site) | Hostinger, over FTPS | `deploy-hostinger.yml` | `/` |
| `https://sigmafier.github.io/ellaz/` | GitHub Pages | `deploy-pages.yml` | `/ellaz/` |

Four things that have each cost a real outage, and are the reason `docs/deploy.md`
exists:

- **A green checkmark is not proof it deployed.** Both jobs SKIP with a warning when their secrets are absent. Check the upload step's own conclusion, then check the live artifact. → [`verify-the-deploy-target-not-just-the-run.md`](.claude/rules/verify-the-deploy-target-not-just-the-run.md)
- **`scripts/assert-live.mjs` runs in the same job** and reds unless the live HTML names the same hashed assets as the `dist/` just built AND every one is fetchable, by SHA-256. Both halves are load-bearing: "all assets 200" passes on a fully stale site. → [`a-deploy-ledger-that-can-disagree-with-the-disk.md`](.claude/rules/a-deploy-ledger-that-can-disagree-with-the-disk.md)
- **The upload holds no ledger.** The thing deciding what to send must not be able to be wrong about what is already there. `mirror` runs on `assets/` and nowhere else, where every name carries a content hash; everything else is forced, hash-naming files last.
- **Removing a page is HALF a change — the 301 ships in the same commit.** A URL keeps its ranking for weeks after the content is gone: `sortsize` was deleted on 2026-08-14 and our own export has it at **position 8** a week later. Redirect every locale arm to the SHELF it sat on, never to a sibling game, and assert it in `assert-live.mjs` with a near-miss control — no build artifact can see a `RewriteRule` fire. → [`a-deleted-page-keeps-its-ranking-for-weeks.md`](.claude/rules/a-deleted-page-keeps-its-ranking-for-weeks.md)
- **The Hostinger CDN is OFF, and that is load-bearing for SEO.** Its bot-challenge mode served every crawler a 403 with an HTML body where the sitemap belonged, invisible from any browser. If it is ever re-enabled, set Security Level to Essentially off in the same visit. → [`a-bot-challenge-at-the-edge-is-invisible-from-your-browser.md`](.claude/rules/a-bot-challenge-at-the-edge-is-invisible-from-your-browser.md)

A red deploy here is often just the host: **one re-run, and a SECOND failure is
what changes the diagnosis.** Runs sitting QUEUED with zero jobs means Actions is
disabled on the repository, which is a different fault from a blocked action.

Manual escape hatches, and the runbook: [`docs/deploy.md`](docs/deploy.md).

## Two vendors that must stay on the free plan

Both of these are cost guarantees rather than preferences, and both are one
accepted upgrade prompt away from being gone.

**Firebase — the `ellaz-games` project has NO billing account. Never link one.**
A GCP project with no billing account has no payment path at all: every service
either runs inside its free quota or returns an error. It cannot produce a bill,
so no budget alert is needed and none can be set. **Decline every "Upgrade to
Blaze" prompt** — Firebase offers it whenever you touch Cloud Storage, Cloud
Functions or extensions, and nothing this platform needs requires it. Anonymous
auth is free; phone auth bills per SMS and stays off; Cloud Storage is not
provisioned and must not be. Cloud backup talks to Firestore over **plain HTTP —
there is no `firebase` dependency and there must not be one** (the SDK is roughly
three times the whole first visit). Detail:
[`docs/firebase-and-cloud.md`](docs/firebase-and-cloud.md).

**Cloudflare — the poker table must stay on the free plan. Decline every
"Upgrade to Workers Paid" prompt.** The binding quota is 100,000 rows written per
day, not requests. The Durable Object is declared under `new_sqlite_classes`, and
that is one-way: a KV-backed class cannot be migrated to SQLite later on the free
plan, so it must never be changed to `new_classes`.

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

## The poker table (`holdem/`) — a different site, a different host, a server

Live since 2026-08-14: real-time Texas Hold'em for adults, play money, no
accounts, one shareable five-letter room code. **It is not a game in the ellaz
catalogue and must never become one** — it is for adults, it needs a server, and
the two sites share nothing but this repository.

| | |
|---|---|
| The table | **<https://ellaz-holdem.pages.dev/>** (Cloudflare Pages) |
| The server | <https://holdem-server.yatiroffer.workers.dev> (Cloudflare Worker) |
| Workspace root | `holdem/` — its own `package.json`, lockfile, tests, tsconfig |
| Runbook, quotas, DNS | [`holdem/README.md`](holdem/README.md) · [`docs/poker-table.md`](docs/poker-table.md) |

**`npm test` at the repository root runs ellaz's suite and NOT ONE of poker's.**
The two workspaces are independent, so anything touching `holdem/` runs
`npm ci && npm test` **from inside `holdem/`**. A CI job that forgets this
installs the wrong dependencies, runs the wrong tests, and deploys anyway with a
log that reads perfectly.

**Its two workflows live at the repository ROOT**, scoped with `paths:` — a
workflow anywhere else is a text file GitHub has never read
([`a-workflow-outside-the-repo-root-is-an-ordinary-text-file.md`](.claude/rules/a-workflow-outside-the-repo-root-is-an-ordinary-text-file.md)),
and the two ellaz workflows carry a matching `paths-ignore:` so a poker push does
not redeploy ellaz. Six decisions the operator made, so nobody re-opens them: its
own site rather than a page inside ellaz.fun · names are DRAWN from a pool, never
typed · chips are fresh every table · phones first · **English first** · free.
