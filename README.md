# Ellaz — Cross-Device Games Platform

One website where kids and adults play our games on **phone, tablet, and PC**. Games
are installable (PWA), work offline, and speak **Hebrew + English (RTL-aware)**.

Wave 1 ships four games proving both rendering paths and both audiences:

| Game | Audience | Renderer |
|------|----------|----------|
| 🧠 Memory | kids (age 5) | React DOM |
| 🎨 Coloring | kids | React DOM + SVG |
| 🔢 2048 | everyone | React DOM |
| 🐍 Snake | everyone | Phaser 4 (canvas) |

## Run it

```bash
npm install
npm run dev        # http://localhost:5180
npm test           # 26 pure-logic + catalog tests
npm run build      # type-check + production PWA build → dist/
npm run preview    # serve the production build
```

Optional analytics: copy `.env.example` → `.env` and add a PostHog **public** project
key. Without a key, events log to the console in dev and are silent in prod.

## Architecture

A single Vite app with strict internal module boundaries that mirror the planned
extractable packages 1:1:

```
src/
├─ sdk/      Game SDK — the neutral contract every game implements
│            (GameModule/GameContext, save store, analytics, audio, lifecycle, ads)
├─ ui/       Design tokens + RTL-aware components (Hebrew-first fonts, big targets)
├─ juice/    Game-feel kit — haptics, screen shake, particle burst, tween
├─ i18n/     he/en strings + direction
├─ portal/   Shell — home grid, hash router, lazy game loader (GameHost)
└─ games/<id>/
   ├─ logic.ts        PURE game logic — no DOM/Phaser, unit-tested (TDD)
   ├─ logic.test.ts
   └─ <Renderer>      React component (DOM) or Phaser scene (canvas)
```

**Rules that keep it fast + modular**

- `logic.ts` imports nothing from DOM/Phaser → trivially testable + reusable.
- Every game is lazy-loaded via `import()`; Phaser sits in one shared vendor chunk,
  downloaded once and cached across all canvas games.
- Games talk only to the SDK `GameContext` (save, analytics, audio, lifecycle, ads) —
  never to portal internals. The lifecycle/ads shape matches the **Poki + CrazyGames**
  union, so games can list on those portals later with zero rewrites.
- Analytics is anonymous, kid-safe (COPPA internal-operations): no `identify()`, no
  PII, no session replay, no behavioral ads.

## Add a new game in ~30 minutes

1. `src/games/<id>/logic.ts` — pure rules + `logic.test.ts` (write tests first).
2. Renderer:
   - **DOM game**: `<Game>.tsx` React component taking `{ ctx }`, then
     `index.ts` = `reactGame(meta, ctx => createElement(Game, { ctx }))`.
   - **Canvas game**: a `Phaser.Scene` + `index.ts` exporting a `GameModule` that
     boots `new Phaser.Game({ parent: ctx.mount, ... })` (see `games/snake`).
3. Register it in `src/portal/catalog.ts` (metadata + `load: () => import(...)`).

That's the whole factory. The SDK, UI, juice, i18n, PWA, and analytics come for free.

## Deploy

**Push to `main`.** Two workflows publish to two hosts automatically:

| URL | Host | Workflow |
|---|---|---|
| **<https://ellaz.fun/>** — the live site | Hostinger (FTPS) | `deploy-hostinger.yml` |
| <https://sigmafier.github.io/ellaz/> | GitHub Pages | `deploy-pages.yml` |

Nothing needs to be built or uploaded by hand, and a green run is not proof a
deploy happened — check the upload step, not the checkmark. Full runbook,
verified host settings, cache-header design and troubleshooting:
**[`docs/deploy.md`](docs/deploy.md)**.

The Firebase config (`firebase.json`) is still in the repo but is not part of any
pipeline and does not serve ellaz.fun.

## Roadmap

Wave 2+ (data-driven, each its own plan): find-the-difference, hidden-object,
tic-tac-toe, sudoku, minesweeper, word-guess (he/en), block-fall, bubble shooter,
solitaire, checkers, arcade games. Then Capacitor store wrap + accounts/leaderboards.
