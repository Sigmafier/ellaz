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
cost and dev cost were measured on real artifacts and remain sound.

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
| **Phaser 4** | **Ours.** 60 fps / 0% jank, mounts as a lazy chunk, reuses `logic.ts` verbatim; its 379 KB is paid once and shared across all games. |
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
