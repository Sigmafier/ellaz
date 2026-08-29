---
name: ship-ellaz
description: Verify and ship ellaz.fun - which gate reads what, how to prove a deploy actually landed rather than trusting a green tick, and the payload budget. Use before committing, when a deploy looks stale or blank, or when quoting any payload or page-count figure.
---

# Shipping ellaz

## Every gate reads something different

A green one says nothing about what another would find — that is the whole design.
`npm run build:check` runs the first-visit set; the rest are run deliberately.

| Gate | Reads | Catches |
|---|---|---|
| `npm run build` | source | types; also the type-check gate |
| `npm run assert:first-visit` | `dist/` chunk graph + `index.html` | a lazy chunk in the shell, or a modulepreload for one |
| `npm run assert:payload` | gzipped shell | the first visit over its ceiling |
| `npm run assert:slope` | two build arms | the per-game cost of the catalogue growing |
| `npm run assert:pages` | the emitted documents | prose floor, canonical, hreflang, JSON-LD, sitemap bijection, share cards, titles |
| `npm run assert:crawlable` | **the network**, as every crawler robots.txt names | an edge challenge, a per-bot 429, a 200 with no content |
| `npm run assert:live` | **the live site** | HTML naming assets that never landed; bytes that arrived truncated |
| `npm run assert:standalone` | `dist-standalone/` or an extracted zip | anything phoning home, an absolute path, a stale build stamp |
| `npm run assert:outreach` | `docs/outreach/` | a published number that has gone stale |
| `npm run assert:context` | `CLAUDE.md` + `docs/` | prose lost when CLAUDE.md was split |

**Run `assert:pages` under BOTH bases** — half these failures are base-dependent and each
workflow only ever sees one arm:

```bash
npm run build:check
BASE_PATH=/ellaz/ npx vite build --outDir dist-ellaz && DIST_DIR=dist-ellaz npm run assert:pages
```

## A green checkmark is not proof it deployed

Both deploy jobs SKIP with a warning when their secrets are absent. Check the upload
step's own conclusion, then check the artifact a visitor receives:

```bash
gh run view <run-id> --json jobs --jq '.jobs[].steps[] | "\(.conclusion)\t\(.name)"'
curl -s https://ellaz.fun/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js'
```

A red deploy here is often just the host: **one re-run, and a SECOND failure is what
changes the diagnosis.** Runs QUEUED with zero jobs means Actions is disabled on the
repository — a different fault from a blocked action.

Runbook: [`docs/deploy.md`](../../../docs/deploy.md). The outage that taught each of these:
`.claude/rules/a-deploy-ledger-that-can-disagree-with-the-disk.md`,
`verify-the-deploy-target-not-just-the-run.md`,
`a-bot-challenge-at-the-edge-is-invisible-from-your-browser.md`.

## Never quote a payload figure from prose

Every number written down in this repo has gone stale, twice. Run
`npm run assert:payload` on the tree in front of you — and remember a local reading is
not the CI reading (`a-number-belongs-to-the-toolchain-that-ships-it.md`). A delta is
only a per-game cost if the game was the only variable: build two arms from one tree.

**Adding a chunk is THREE changes**: the dynamic `import()`, a NAMED `manualChunks`
branch, and a matching `globIgnores` entry. Skipping the third leaves the payload
unmoved behind a green build.
