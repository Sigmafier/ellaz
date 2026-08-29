# The poker table (holdem/) - a different site, a different host, a server

<!-- Extracted VERBATIM from CLAUDE.md on 2026-08-29, when CLAUDE.md was 164,867 chars
     and over Claude Code's 150,000-char per-file limit. Nothing was reworded; the text
     below is byte-identical to what CLAUDE.md held at commit bb8c47b, and
     `npm run assert:context` proves it. CLAUDE.md now points here instead of
     carrying this on every single turn of every session. -->

## The poker table (`holdem/`) — a different site, a different host, a server

Live since 2026-08-14. Real-time Texas Hold'em for friends: play money, no
accounts, one shareable five-letter room code. **It is not a game in the ellaz
catalogue and must never become one** — it is for adults, it needs a server, and
the two sites share nothing but this repository.

| | |
|---|---|
| The table | **<https://ellaz-holdem.pages.dev/>** (Cloudflare Pages) |
| The server | <https://holdem-server.yatiroffer.workers.dev> (Cloudflare Worker) |
| Workspace root | `holdem/` — its own `package.json`, lockfile, tests, tsconfig |
| Runbook, quotas, the DNS shape for a nicer URL | [`holdem/README.md`](../holdem/README.md) |

**Six decisions the operator made, so nobody re-opens them**: its own site
rather than a page inside ellaz.fun · names are DRAWN from a pool, never typed ·
chips are fresh every table, not a league · phones first · **English first** ·
and it must stay free.

**`npm test` at the repo root runs ellaz's suite and none of poker's.** The two
workspaces are independent, so anything touching `holdem/` runs
`npm ci && npm test` **from inside `holdem/`**. A CI job that forgets this
installs the wrong dependencies, runs the wrong tests, and then deploys anyway
with a log that reads perfectly.

**Three ports of the platform's own conventions came across**, and each has a
rule file that now covers both implementations: names drawn from a pool
([`name-pool-convention.md`](../.claude/rules/name-pool-convention.md) — read the
archive exception, because a finished hand stores RENDERED names while the live
table stores ids), a deploy gate that reads the network rather than `dist/`
([`a-second-published-artifact-needs-its-own-gate.md`](../.claude/rules/a-second-published-artifact-needs-its-own-gate.md)),
and a pure rules core with a purity test standing over it.

**Cloudflare must stay on the free plan. Decline every "Upgrade to Workers
Paid" prompt** — the identical standing rule to Firebase below, for the identical
reason: with no payment path attached, the worst case is a service that refuses
rather than a bill. The binding quota is **100,000 rows written per day**, not
requests; the measured ceiling is roughly 890 hands a day. The Durable Object is
declared under `new_sqlite_classes`, and that is one-way — **a KV-backed class
cannot be migrated to SQLite later on the free plan**, so it must never be
changed to `new_classes`.

**Two workflows, both at the repository ROOT and not under `holdem/`.**
`holdem.yml` (CI) and `deploy-holdem.yml` (deploy) are scoped with `paths:`, and
the two ellaz workflows carry a matching `paths-ignore:` so a poker push does
not redeploy ellaz. That nesting is not a style choice — a workflow anywhere but
the root is a text file GitHub has never read:
[`a-workflow-outside-the-repo-root-is-an-ordinary-text-file.md`](../.claude/rules/a-workflow-outside-the-repo-root-is-an-ordinary-text-file.md).
The deploy skips with a warning when the two Cloudflare secrets are absent, so
**a green tick is not proof it deployed** — the same caveat the Hostinger job
carries, and the reason `scripts/assert-holdem-live.mjs` runs in the same job.
What that gate got wrong on its first real run, and why a cascade of red lines
points away from its own cause:
[`a-gate-must-tell-not-yet-from-wrong.md`](../.claude/rules/a-gate-must-tell-not-yet-from-wrong.md).

**`poker.ellaz.fun` is not set up.** A subdomain CNAME at Hostinger pointing at
`ellaz-holdem.pages.dev` works with DNS staying where it is; only an apex would
force ellaz.fun's nameservers onto Cloudflare, which would be a much larger
change. Add the domain in the Pages dashboard **before** creating the CNAME, or
it answers 522. Procedure: `holdem/README.md` § The URL.
