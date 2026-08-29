---
name: holdem-workspace
description: Work inside holdem/ - the Texas Hold'em site that shares this repo but nothing else. Use before touching anything under holdem/, because npm test at the repository root runs none of its tests and Cloudflare must stay on the free plan.
---

# The `holdem/` workspace

A real-time poker table for adults on Cloudflare — **not a game in the ellaz catalogue
and never to become one**. Its own `package.json`, lockfile, tsconfig and tests. Nothing
in `src/` may import from it and nothing in it from `src/`.

## The trap that costs a whole CI run

**`npm test` at the repository root runs ellaz's suite and NOT ONE of poker's.** Anything
touching `holdem/` runs its checks from inside the workspace:

```bash
cd holdem && npm ci && npm test
```

A CI job that forgets this installs the wrong dependencies, runs the wrong tests, and
deploys anyway with a log that reads perfectly.

## Standing constraints

- **Cloudflare stays on the free plan. Decline every "Upgrade to Workers Paid" prompt.**
  The binding quota is 100,000 rows written per day, not requests.
- **The Durable Object is declared under `new_sqlite_classes`, and that is one-way.**
  A KV-backed class cannot be migrated to SQLite later on the free plan, so it must never
  be changed to `new_classes`.
- **Both workflows live at the repository ROOT**, scoped with `paths:`. A workflow
  anywhere else is a text file GitHub has never read.
- **A green tick is not proof it deployed** — the job skips when the two Cloudflare
  secrets are absent; `scripts/assert-holdem-live.mjs` runs in the same job.

## Six settled decisions, so nobody re-opens them

Its own site rather than a page inside ellaz.fun · names are DRAWN from a pool, never
typed · chips are fresh every table, not a league · phones first · **English first** ·
it stays free.

Full runbook, quotas and the DNS shape: [`holdem/README.md`](../../../holdem/README.md).
Prose history: [`docs/poker-table.md`](../../../docs/poker-table.md).
