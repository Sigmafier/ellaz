# CLAUDE.md — Ellaz Games Platform

Guidance for Claude Code (and humans) working in this repo.

## What this is

Ellaz is a **cross-device casual-games PWA** — one website where kids and adults
play our games on phone, tablet, and PC. Hebrew (default, RTL) + English (LTR).
Anonymous play, on-device saves, anonymous kid-safe analytics. No backend.

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
`@juice`/`@i18n` aliases, never deep paths):

```
src/
├─ sdk/      Game SDK — the neutral contract every game implements
│            GameModule/GameContext, SaveStore (localStorage), analytics port
│            (PostHog behind an interface), audio port, lifecycle, ads stubs
├─ ui/       Design tokens + RTL-aware components (Hebrew-first fonts, big targets)
├─ juice/    Game-feel kit — haptics, screen shake, particle burst, tween
├─ i18n/     he (default, RTL) + en (LTR) strings + direction
├─ portal/   Shell — App (hash router), Home (grid), GameHost (mount/unmount bridge),
│            catalog (game registry with lazy loaders)
└─ games/<id>/
   ├─ logic.ts        PURE game logic — NO DOM/Phaser imports; unit-tested (TDD)
   ├─ logic.test.ts
   └─ <Renderer>      React component (DOM) or Phaser scene (canvas)
```

Games (10): memory, coloring, finddiff, hidden, math (kids) · 2048, tictactoe,
minesweeper, sudoku, snake (classics). Every game has a **difficulty selector**
(a `Button` row, `variant` primary/ghost) and/or endless levels; wins fire
`celebrate()` (full-screen confetti) from `@juice`.

**Deploy**: pushing to `main` auto-deploys to GitHub Pages
(`https://ytrofr.github.io/ellaz/`) via `.github/workflows/deploy-pages.yml` — the
build uses `BASE_PATH=/ellaz/`. The PWA is `registerType: "autoUpdate"` so returning
players get new versions automatically. Repo is public; collaborator: Benzi.

**RTL gotcha**: a spatial game grid must carry `dir="ltr"` so it does NOT mirror in
the Hebrew RTL app (else swipe/arrow directions invert — see `src/games/n2048`); the
math equation is also pinned `dir="ltr"` for standard notation.

## Engine choice — settled by measurement, don't re-litigate

**Phaser 4 stays.** Two tournaments compared it head-to-head against real
alternatives on an identical game; the second used a 660-tile scrolling
platformer with physics, enemies and art, and every arm was proven to run the
same simulation via a cross-language checksum before any number counted.

| Engine | Verdict |
|---|---|
| **Phaser 4** | **Ours.** 60 fps / 0% jank, mounts as a lazy chunk, reuses `logic.ts` verbatim; its 379 KB is paid once and shared across all games. |
| PixiJS 8 | Credible alternative — same 60 fps, loads 256 ms faster at 36% of the bytes, but it is a renderer: loop, culling and pooling are hand-rolled. Reach for it only if one canvas game is load-critical. |
| Kaplay | **The pick for a static-screen game** — a third bake-off on a match-3 put it ahead of Phaser on desktop and tablet (60 fps / 0.2% jank · 59 fps / 0.0%) at 72 KB and 684 ms, a fifth of Phaser's bytes. On mobile the frame rate ties, but it janks far less (0.5–3.5% vs 5.6–9.3%). Still out for **scrolling** games: no culled tilemap, and it janks every frame on mobile there. |
| Excalibur | Out. Slowest JS load and 21 fps at 100% jank. |
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
- **No external network requests from games** (Poki rule). Wrap all `localStorage` in
  try/catch (incognito-safe). Unlock audio on the first user gesture.
- **Input:** Pointer Events only (`pointerdown/move/up` + `setPointerCapture`);
  `touch-action: none` on play surfaces; `keydown` state map for desktop.
- **Responsive:** size boards with `min(<vw>, <vh>, <cap>px)` so they fit portrait,
  landscape, and tablet. `GameHost`'s mount is a scroll container with `minHeight:0`
  (flexbox scroll trap) — tall games scroll, never clip.
- **Kids games** (`ageBand: "kids"`): tap-only (no drag), ≥2×2cm targets, icon+audio
  navigation (no reading required), instant restart, no fail-punishment.
- **Analytics is anonymous + kid-safe** (COPPA internal-operations): PostHog
  anonymous-events mode only — **never `identify()`**, no PII, no session replay, no
  autocapture, no behavioral ads. Analytics failure must never block gameplay.
- **Legal:** original art and names only. No trademarked names/trade dress (no
  "Tetris"/"Wordle"/"Waldo"; change shapes/colors/names for any cloned mechanic).

## Add a new game (~30 min)

1. `src/games/<id>/logic.ts` — pure rules + `logic.test.ts` (write tests first).
2. Renderer:
   - **DOM:** a `<Game>.tsx` taking `{ ctx }`, then `index.ts` =
     `reactGame(meta, ctx => createElement(Game, { ctx }))`.
   - **Canvas:** a `Phaser.Scene` + `index.ts` exporting a `GameModule` that boots
     `new Phaser.Game({ parent: ctx.mount, scale: { mode: Phaser.Scale.FIT } })`
     (see `games/snake`).
3. Register in `src/portal/catalog.ts` (metadata + `load: () => import(...)`).

The SDK, UI, juice, i18n, PWA, and analytics come for free. Phaser lives in a shared
vendor chunk (`vite.config` `manualChunks`) cached across all canvas games.

## Known traps (learned here)

- **Nested React root teardown:** DOM games mount their own React root via
  `reactHost.tsx`. Its teardown MUST be deferred with `queueMicrotask` — unmounting a
  nested root during the portal's own unmount throws `removeChild: node is not a
  child`. Don't also clear the mount node in `GameHost` (double-free).
- **SW serves stale bundle** during QA (see Commands). This is intended `prompt` behavior.

## Deploy (Firebase Hosting)

```bash
npm run build && firebase deploy    # firebase.json: SPA rewrite, CSP headers, immutable assets
```

Analytics key is `VITE_POSTHOG_KEY` (public); see `.env.example`.
