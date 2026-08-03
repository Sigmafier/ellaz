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
`try{const n=""}catch{}`, because CI passes `VITE_POSTHOG_KEY` as an **empty
string** (the secret is absent, so Actions substitutes `""`) while the local arm
had it unset. The minifier then renamed four variables downstream of that one
expression. Rebuilding with `VITE_POSTHOG_KEY=""` reproduced all four live
hashes exactly, and the live balloons chunk was byte-identical.

**To reproduce a CI artifact locally you must set the var, not leave it unset.**

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
key-matched arm (`VITE_POSTHOG_KEY=""` in both, per the Wave B lesson above).

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

## Still open

- **Wave C** — anonymous players who keep their progress, and a name pool.
- **Wave D** — the boards, percentile-first: a child is never told they came
  last. Firestore's free daily quota is the design constraint, and it is
  fail-closed (reads refused until reset, never a charge), which is why the
  board design is percentile-first rather than "top 100".
- **A2** — snake off Phaser. Parked, not cancelled.
- **`VITE_POSTHOG_KEY`** — not set. Safe to add at any time; `build:check` fails
  the deploy if the PostHog chunk would land in the precache rather than
  shipping it behind a green checkmark.
- **Nobody has played Wave 2** on a real device, and Hebrew TTS has never run
  with `he-IL` on real hardware.
