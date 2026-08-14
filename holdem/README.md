# Hold'em

Texas Hold'em for friends. One room code, no accounts, play money only.

A self-contained npm workspace inside the ellaz repo, deployed to its own host.
**It shares no runtime with ellaz.fun** — different server, different site,
different workflow. Nothing here can break the games site and nothing there can
break this.

```
shared/   the engine + the wire protocol. Pure: no DOM, no platform globals,
          runs identically in a Worker and in node. Guarded by
          engine-is-pure.test.ts.
server/   one Cloudflare Durable Object per table. Storage is the only truth;
          memory is a rebuildable cache.
client/   Vite + React. 390px first, English, LTR.
scripts/  smoke (headless, over WS) · eyeball (a real browser) ·
          assert-holdem-live (the deploy gate) · cli-client (a terminal player)
```

## Running it

```bash
npm ci
npm run typecheck            # all three workspaces
npm test                     # 129 tests, node only

# two terminals:
npm run dev --workspace=server     # wrangler on :8787
npm run dev --workspace=client     # vite on :5175
```

**Not 5173.** That port belongs to OGAS's legacy Sigma app, and a shared
`localhost` origin cross-contaminates `localStorage` between two different
products. `ALLOWED_ORIGINS` in `wrangler.toml` allows 5175 and 4173 only.

### Proving it works

```bash
node scripts/smoke.mjs                    # 3 players, 5 hands, over real sockets
SMOKE_HANDS=30 node scripts/smoke.mjs     # longer

# a real browser, a real second player, at 390px
PLAYWRIGHT_CORE=<any-checkout>/node_modules/playwright-core/index.mjs \
CHROME=~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome \
node scripts/eyeball.mjs
```

`playwright-core` is deliberately **not** a dependency — it is a ~120 MB
install that CI does not need, since the workflow runs the unit suite and the
smoke. The eyeball exits 2 rather than passing when it cannot find one.

## Deploying

Push to `main` with anything under `holdem/` changed.
`.github/workflows/deploy-holdem.yml` typechecks, tests, deploys the Worker,
resolves its URL from the Cloudflare API, builds the client against **that**
URL, publishes to Pages, and then asserts the result is live.

Two repo secrets are required:

| Secret | Where |
|---|---|
| `CLOUDFLARE_API_TOKEN` | "Edit Cloudflare Workers" template + Cloudflare Pages: Edit |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard sidebar |

**Without them the job SKIPS with a warning rather than failing** — same choice
`deploy-hostinger.yml` makes, because a workflow that reds on every push gets
ignored. The cost is that a green tick is not proof of a deploy: read the run
summary, which says either "Hold'em is live" with URLs or "deploy skipped".

### It must stay free

Workers, Durable Objects and Pages are all on the free plan, and the SQLite DO
class is declared from day one (`new_sqlite_classes`) because a KV-backed class
**cannot be migrated to SQLite later on free**. Decline every "Upgrade to
Workers Paid" prompt — the same standing rule as Firebase in the parent repo. A
free account has no payment path, so it cannot produce a bill.

Measured 2026-08-14 against a real Durable Object, 30 hands, 3 players:

| Quota (free/day) | Binds at |
|---|---|
| rows written 100,000 | **~890 hands/day** ← the constraint |
| rows read 5,000,000 | ~67,000 hands/day |
| requests 100,000 (20:1 on WS messages) | ~150,000 hands/day |

~890 hands is roughly 30 table-hours of six-player poker per day across every
table. Fine for friends; not fine for anything public. If it ever binds, the
lever is `hist:cur`, rewritten on every action for crash-replay — moving it to a
hand-end write cuts per-action cost by a quarter and loses only replay detail
for an interrupted hand.

Idle tables cost nothing: `armNext()` deletes the alarm below two eligible
players, and a table whose players all walk away self-quiesces through the
timeout-to-sit-out path.

### When a deploy goes wrong

`scripts/assert-holdem-live.mjs` runs in the deploy job and reds the run. It is
the only check here that reads the **network**. What each failure means:

| It says | It means |
|---|---|
| `worker unreachable` | the Worker did not deploy, or the URL resolved wrong |
| `could not create a table` | the Worker deployed but the Durable Object binding is broken — the root route never touches one, so this is the first real test |
| `websocket into the table` | hibernation, attachments or storage failed on the real edge |
| `does not reference <asset>` | Pages is serving an **older build** |
| `SERVED but does not match the build` | a truncated or stale asset — a 200 with a plausible length and a syntax error on import |
| `the bundle still points at localhost` / `names no server at all` | the client was built without `VITE_HOLDEM_SERVER`; it renders perfectly and connects to nothing |

All six are mutation-proven, plus a positive control that must still pass.

### The URL

Launch is on the free `ellaz-holdem.pages.dev`. `poker.ellaz.fun` is a later
CNAME at Hostinger pointing at it — a **subdomain** works with DNS staying
where it is; only an apex would force ellaz.fun's nameservers onto Cloudflare,
which this project is not going to do. Add the domain in the Pages dashboard
**before** creating the CNAME, or it 522s.

## Conventions worth not re-deriving

- **A name is two word ids, never text.** The pool in `shared/src/names.ts` is
  the allowlist; the server renders the string. There is nothing a player can
  type, so there is nothing to moderate. Never remove or rename a word id.
- **The engine takes an injectable `rng` with no default.** Tests pass a seeded
  one; the server passes `secureRng()`. A 32-bit PRNG cannot reach 52! and its
  state is recoverable from observed output.
- **Events narrate; the snapshot is the truth.** The server sends a full `room`
  after every command so the client never re-implements the rules.
- **Live seats carry ids, history carries rendered strings.** A hand played
  tonight should read tonight's way forever.
- **No service worker.** A table is worthless without its socket, so caching
  the shell buys nothing and a stale bundle against a newer protocol is a
  broken table with no symptom a player can report.
