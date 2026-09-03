# Ellaz

**Free browser games for kids, in Hebrew and English.** No ads, no account, no
downloads, and it works offline. One site that plays the same on a phone, a tablet
and a PC.

### ▶ **[ellaz.fun](https://ellaz.fun/)**

[![Ellaz](https://ellaz.fun/og/home-en.png)](https://ellaz.fun/)

Hebrew is the default and the whole interface is RTL-aware; English is a click away.
Nothing is stored on a server — progress lives on the device, so there is nobody to
sign up to and nothing to review.

## What is in it

Twenty-three games, sixteen of them made for young children and the rest for anyone:
memory, colouring, spot-the-difference, hidden-object, mental arithmetic, 2048,
tic-tac-toe, minesweeper, sudoku, snake, falling blocks, word guess, and a dozen more.
Every game has difficulty levels or an endless ladder, keeps a personal best, and pays
out coins and stars into a room the player decorates.

`src/portal/catalog.ts` is the source of truth for that list, and a test ratchets the
count, so this paragraph is the thing that goes stale — not the site.

## Why it might interest you as code

- **No backend, by design.** Saves, coins, records and the room are all `localStorage`.
  Cloud backup talks to Firestore over plain HTTP rather than pulling in the ~150 KB
  Firebase SDK to do three REST calls.
- **A first visit is budget-gated.** `scripts/assert-payload.mjs` fails the build if the
  shell a child downloads before choosing a game crosses its ceiling. Every game, and
  Phaser itself, is a lazy chunk excluded from the precache.
- **Every game is a pure `logic.ts` plus a renderer.** The rules import no DOM and no
  Phaser, take an injectable rng, and are unit-tested on their own. Renderers are React
  DOM or a Phaser 4 scene.
- **Every game has a real web address, in both languages.** The site is a few dozen
  emitted documents rather than one, each carrying its content in the HTML — because AI
  crawlers do not run JavaScript. Gates assert the pages, the payload, the crawlability
  over the network, and that the live site serves the build that was just made.
- **Policy lives in one file each.** Games report *what happened* — a reason, a score
  and a unit — and `src/sdk/{economy,score,session}.ts` alone decide what that is worth,
  how it ranks, and whether a saved position is still usable.

## Run it

```bash
npm install
npm run dev          # http://localhost:5180  (no service worker - use this for QA)
npm test             # pure-logic, catalog, content and build tests
npm run build        # type-check + production PWA build -> dist/
npm run build:check  # build + payload, first-visit and page gates
```

## Layout

```
src/
├─ sdk/      the contract every game implements: save, analytics, audio, speech,
│            lifecycle, ads, and the rewards / score / session policy ports
├─ shared/   neutral helpers - rng, the canonical win moment, the level+session hooks
├─ ui/       design tokens and RTL-aware components, Hebrew-first
├─ juice/    haptics, shake, particles, confetti, the coin flight
├─ i18n/     the languages the interface speaks, and the ones that have prose
├─ portal/   the shell: home grid, routing, game host, the room and the shop
├─ build/    BUILD-TIME ONLY - the emitted pages, sitemap, schema and share cards
└─ games/<id>/
   ├─ meta.ts      DOM-free metadata the catalog imports statically
   ├─ logic.ts     pure rules, no DOM, no Phaser, injectable rng
   ├─ logic.test.ts
   └─ renderer     a React component, or a Phaser scene
```

Contributor and architecture notes, including the traps this codebase has already paid
for, are in [`CLAUDE.md`](CLAUDE.md), [`docs/architecture.md`](docs/architecture.md) and
[`docs/build-log.md`](docs/build-log.md).

## Deploy

Push to `main`. Two workflows publish to two hosts by themselves:

| URL | Host | Workflow |
|---|---|---|
| **<https://ellaz.fun/>** — the live site | Hostinger, over FTPS | `deploy-hostinger.yml` |
| <https://sigmafier.github.io/ellaz/> | GitHub Pages (a `noindex` mirror) | `deploy-pages.yml` |

A green run is not proof a deploy happened — `scripts/assert-live.mjs` runs in the same
job and fails the run unless the live site is serving the assets that were just built.
The full runbook is [`docs/deploy.md`](docs/deploy.md).

## Licence

[MIT](LICENSE), and it covers the whole repository - the code, the SVG game art
(which IS source: `src/ui/gameArt.ts`), the synthesised sound, and the written
content. There are no separately-licensed media files in this project. The three
font families bundled under `src/build/assets/`, used only when generating page
images at build time, are SIL Open Font License 1.1 with their licence texts
beside them.

We would rather you made your own art than shipped ours under a new name, and
"Ellaz" is our name for the site rather than something the licence hands over -
but both of those are a request, not a restriction.

**Do not reintroduce a sentence that separates "the code" from "the art".** The
previous wording did, and it reads to a licence reviewer as *source is free, media
is not*, which is an outright disqualification on
[libregamewiki's article policy](https://libregamewiki.org/Libregamewiki:Common_game_licensing_traps)
and on every list with the same bar. Nothing was re-licensed to fix it - `LICENSE`
already grants MIT over the whole repository; the README had simply stopped saying so.
