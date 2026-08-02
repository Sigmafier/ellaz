# A New Chunk Is Precached By Default — Lazy-Loading Without `globIgnores` Changes Nothing

**Scope**: Any change to `vite.config.ts` that adds, renames, or splits a build chunk in this repo.
**Origin**: 2026-08-02, deferring PostHog off the first visit.

## Core Rule

**The PWA precache glob is `**/*.{html,css,js,svg,woff2}` — it sweeps everything the build
emits. `globIgnores` is the ONLY thing keeping a chunk off the first visit. So making an
import lazy is not one change, it is three, and doing only the first moves bytes between
requests while leaving the first visit exactly as heavy as before.**

All three, in the same commit:

1. The dynamic `import()` in the source.
2. A **named** branch in `manualChunks`, so the chunk has a stable prefix to match on.
   Without a name, Rollup emits `index-<hash>.js` and there is nothing to exclude.
3. The matching `**/<prefix>-*.js` entry in `workbox.globIgnores`.

Skipping step 3 is the dangerous one, because **every signal says it worked**: the build is
green, the bundle report shows a smaller shell, the new chunk exists and is genuinely lazy.
The only thing that reveals it is the precache manifest, which nobody reads by default.

`manualChunks` prefixes are a build contract with `globIgnores`, not cosmetics. The existing
`game-`, `vendor-phaser-`, `vendor-analytics-` and `lab-` prefixes all exist for this reason.
Renaming one without updating the other silently ships it to every child on first load.

## The gate must be an ALLOWLIST — a denylist cannot see this bug

Listing known-bad prefixes (`game-`, `vendor-phaser-`, …) feels natural and cannot work.
**When a chunk has no `manualChunks` branch, Rollup names it `module-<hash>.js`** — so the one
case the gate exists to catch is the one case with no prefix to match against.

Measured here on 2026-08-02: a build with the dynamic `import()` but no `vendor-analytics`
branch precached `module-BPhPDZCf.js` — 222 KiB of PostHog — and the denylist version of
`assert-precache.mjs` printed `OK precache holds shell assets only` over it.

So name what MAY be precached and reject everything else. Adding a shell asset becomes a
deliberate edit to that list; a stray chunk stops the build.

## A dead env var deletes the chunk instead of deferring it

`import.meta.env.VITE_*` is **substituted at build time**. With the var unset, Vite writes
`undefined`, `if (!key) return;` becomes always-true, and the minifier removes everything
after it — including the `import()`. The chunk then does not exist at all, the shell shrinks
by the full library weight, and it looks exactly like a successful lazy-load.

That is why any before/after payload measurement must set the var in **both** arms. Measured
here: same commit, keyless build emits 26 chunks and no PostHog anywhere; keyed build emits a
222 KiB PostHog chunk. Comparing a keyed baseline against a keyless "after" would have
reported a 74 KB win that is really just a deleted feature.

## Assert it, and prove the assertion can fail

`npm run build:check` runs `scripts/assert-precache.mjs` after a build.

**The matcher must be unquoted.** Minified `sw.js` writes precache entries as
`{url:"index.html",revision:"..."}` — a bare identifier key, not JSON. A `"url":"` matcher
finds **zero** entries, so every "contains no forbidden chunk" assertion under it passes over
an empty list and reports success. Measured on the real artifact 2026-08-02: `"url":"`
occurs 0 times, `url:"` occurs 11.

That false green has fired twice in this project. So the script does two things before
trusting its own result: it **refuses a zero-entry manifest** outright, and it re-runs the
**same extractor** over a planted manifest and exits non-zero if the matcher fails to fire.
A control that does not exercise the same code path proves nothing about the check.

When changing that script, mutation-test it: plant a real forbidden entry into a copy of a
real `sw.js`, point `DIST_DIR` at it, and confirm exit 1 naming the entry. A gate nobody has
watched fail is not a gate.

## When to Apply

- Adding any `manualChunks` branch, or making any import dynamic.
- Renaming a chunk prefix — check `globIgnores` and the `runtimeCaching` `urlPattern` together.
- A payload optimisation that "landed" but the numbers did not move: read the precache
  manifest before touching the source again.

## Related

- `pwa-stale-bundle-qa.md` — the other way a shipped fix looks un-shipped.
- `verify-the-deploy-target-not-just-the-run.md` — same family: a green run is not a changed site.
