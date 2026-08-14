# Hold'em — פוקר עם חברים

Server-authoritative multiplayer no-limit Texas Hold'em for a friend group.
Play money only. No accounts, no real money, no ads. Hebrew-first (RTL) with
an English toggle.

- **`shared/`** — the pure poker engine (evaluator, betting, side pots, dead-button
  blinds, table reducer, per-seat redaction) + the WS protocol. No DOM, no
  Workers APIs; runs identically in the server and in node vitest.
- **`server/`** — Cloudflare Worker + one SQLite-backed **Durable Object per
  table**. The DO shuffles with `crypto.getRandomValues`, holds the deck and
  every hole card, and sends each seat only what it may see. WebSocket
  Hibernation API, storage-as-truth, single `alarm()` for the shot clock and
  auto-dealing.
- **`client/`** — Vite + React PWA. Felt table with your seat always
  bottom-center, authoritative action bar (no optimistic play), synthesized
  poker sounds (zero audio files — the ellaz WebAudio voice engine with a new
  poker voice set), chip-flight juice, hand history replay, league ledger.

## Rules of the house (pinned in the engine tests)

- Min raise = last full raise; **short all-in raises do not reopen** the betting
  (per-wager rule, not TDA cumulative) — `betting.test.ts` pins the cases.
- **Dead button**: the BB advances one live seat per hand; the SB/button may
  rest on a vacated seat. Joiners post a live BB or wait out the button zone.
- Side pots layer by live commitment levels; folded chips are dead money in the
  layers they reach; odd chips go left of the button. The soak test replays
  thousands of random hands asserting `sum(chips)` never moves by a single chip.
- Timeout = check if free, else fold; two consecutive timeouts sit you out.
  One 30s time bank per hand. Disconnection does NOT pause the game — the
  timer protects the table, the snapshot-on-reconnect protects you.
- Mucked cards are never sent to anyone and stay hidden in the history replay.

## Develop

```bash
npm install
npm test                 # engine + protocol suites (fast, pure)
npm run dev              # wrangler dev :8787  +  vite :5175 (proxied /ws /api)
node scripts/smoke.mjs   # 3 headless players play 5 real hands over WS
node scripts/cli-client.mjs create "yossi"   # interactive terminal player
```

Four local players: one normal window, one incognito, one other browser
profile, one CLI client (identity is per-profile localStorage).

**5175, not 5173** — 5173 is OGAS's legacy Sigma app on this machine, and two
apps on one localhost origin share its `localStorage`, including this client's
device token.

The CLI client's argument is a **label for that process**, not a table name.
Nobody types a name here (see below), so it only shapes the token and the
console output.

## Names are drawn, never typed

16 adjectives × 20 animals, English, one emoji each. The two **ids** are what
cross the wire and what the server stores; the string is rendered on the way
out, so nothing a client sends is ever displayed.

That is the security half, and it is also why there is no moderation surface on
this platform: a poker table is a room with other people's names in it, and a
free-text field means somebody eventually types something that sits on the felt
all session. There is nothing to review because there is nothing to type.

**The pool is the allowlist.** An id the server cannot resolve never reaches
storage — and is answered with a real name rather than an error, because the
realistic way to send an unknown word is to be one build ahead or behind, and
refusing the socket over a word would turn a cosmetic mismatch into "you cannot
join this table". The `name` message says what was settled on, so the client
renders the reply and never its own request.

Adding words is fine. **Never remove or rename a word id** — they are persisted
per player and travel in saved hand history and the ledger, so removing one
un-names every player who had it, retroactively, in hands already played.

## It must stay free

Workers, Durable Objects and Pages are all on the free plan, and the SQLite DO
class is declared from day one (`new_sqlite_classes`) because a KV-backed class
**cannot be migrated to SQLite later on free**. Decline every "Upgrade to
Workers Paid" prompt — the same standing rule as Firebase in the parent repo. A
free account has no payment path, so it cannot produce a bill and needs no
budget alarm.

Measured 2026-08-14 against a real Durable Object, 30 hands, 3 players:
1,874 rows written, 2,223 read, 435 alarms — **62.5 writes per hand**, scaling
to roughly 112 at six players.

| Quota (free/day) | Binds at |
|---|---|
| rows written 100,000 | **~890 hands/day** ← the constraint |
| rows read 5,000,000 | ~67,000 hands/day |
| requests 100,000 (20:1 on WS messages) | ~150,000 hands/day |

~890 hands is roughly 30 table-hours of six-player poker per day across every
table at once. Fine for friends; not fine for anything public.

**Read that as a lower bound on headroom, not a precise ceiling.** The counter
was a Proxy over DO storage and it counts KEYS touched; Cloudflare does not
publish how a key maps to billed rows, so the real figure is this or better.
It was worth measuring anyway — the question was whether the answer was 900 or
9, and those are different projects.

If it ever binds, the lever is `hist:cur`, rewritten on every action so an
interrupted hand can be replayed. Moving it to a hand-end write cuts per-action
cost by about a quarter and loses only the replay detail of a hand nobody
finished.

Idle tables cost nothing. `armNext()` deletes the alarm below two eligible
players, and a table whose players all walk away self-quiesces through the
timeout-to-sit-out path — so hibernation is real rather than nominal.

## Deploy

`.github/workflows/deploy-holdem.yml`, **at the repository root**. It replaced
`holdem/.github/workflows/deploy.yml`, which GitHub never read: workflows are
discovered only in `.github/workflows/` at the root, so that file had no id and
no runs and could not have been dispatched. Setting the secrets would not have
made it deploy.

vitest + typecheck → `wrangler deploy` (server) → resolve the worker URL from
the Cloudflare API → build the client against it → `wrangler pages deploy` →
**`scripts/assert-holdem-live.mjs`**, which reds the run.

Two repo secrets, and no repo variables — the worker URL is resolved rather
than hand-set, because a first deploy cannot know the account's workers.dev
subdomain and a wrong one produces a client that renders perfectly and connects
to nothing.

| Secret | Where |
|---|---|
| `CLOUDFLARE_API_TOKEN` | "Edit Cloudflare Workers" template + Cloudflare Pages: Edit |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard sidebar |

**Without them the job SKIPS with a warning rather than failing** — the same
choice `deploy-hostinger.yml` makes, because a workflow that reds on every push
gets ignored. The cost is that a green tick is not proof of a deploy: read the
run summary, which says either "Hold'em is live" with URLs or "deploy skipped".

### When a deploy goes wrong

`assert-holdem-live.mjs` is the only check here that reads the **network**.
What each failure means:

| It says | It means |
|---|---|
| `worker unreachable` | the Worker did not deploy, or the URL resolved wrong |
| `could not create a table` | the Worker deployed but the Durable Object binding is broken — the root route never touches one, so this is the first real test |
| `websocket into the table` | hibernation, attachments or storage failed on the real edge |
| `does not reference <asset>` | Pages is serving an **older build** |
| `SERVED but does not match the build` | a truncated or stale asset — a 200 with a plausible length and a syntax error on import |
| `the bundle still points at localhost` / `names no server at all` | the client was built without `VITE_SERVER_URL`; it renders perfectly and connects to nothing |

### The URL

Launch is on the free `ellaz-holdem.pages.dev`. `poker.ellaz.fun` is a CNAME at
Hostinger pointing at it — a **subdomain** works with DNS staying where it is;
only an apex would force ellaz.fun's nameservers onto Cloudflare, which this
project is not going to do.

**Three parties have to agree, and only one of them is in this repo.** Each can
be right while another is wrong, and the failures do not look alike:

| Party | What it needs | If it is the missing one |
|---|---|---|
| Cloudflare Pages | the hostname registered on the `ellaz-holdem` project | Cloudflare error 1000/522 — obvious |
| Hostinger DNS | `CNAME poker` → `ellaz-holdem.pages.dev` | NXDOMAIN — obvious |
| The Worker | the new origin in `ALLOWED_ORIGINS` | **the page loads perfectly and every button 403s** |

That third row is why the code half shipped first and alone. The origin check
is the only thing between the new hostname and a working game: a browser there
sends `Origin: https://poker.ellaz.fun`, which is not `.pages.dev`, so without
that entry every create and every socket is refused while the site looks fine.
Listing a hostname before it resolves costs nothing — nobody can send that
Origin yet — whereas adding it afterwards leaves a window where the site is up
and broken.

**Do it in this order:**

1. **Cloudflare** → Workers & Pages → `ellaz-holdem` → Custom domains → *Set up
   a domain* → `poker.ellaz.fun`. It will sit at "pending" and tell you the
   CNAME target. Registering FIRST means the edge knows the name before any
   traffic arrives for it.
2. **Hostinger** → hPanel → Domains → ellaz.fun → DNS / Nameservers → add
   `Type CNAME · Name poker · Points to ellaz-holdem.pages.dev · TTL 3600`.
3. Wait for the certificate (usually minutes), then run the gate below.

```bash
npm run assert:domain                 # advisory: prints what is still outstanding
HOLDEM_CUSTOM_DOMAIN=1 npm run assert:domain   # enforcing: reds on any of them
```

It checks DNS, the CNAME target, HTTPS, that the hostname serves the **same
app** as the pages.dev origin (a domain attached to the wrong Pages project
otherwise looks entirely healthy), and — the one nobody thinks to check — that
the Worker accepts the new Origin. That last one is asserted on the CORS
response HEADER rather than the status, because the preflight answers 200
either way, and it carries a disallowed-origin control so a gate that says yes
to everyone cannot pass. Arm it with `HOLDEM_CUSTOM_DOMAIN=1` once all three
parties are done.

Rooms: `POST /api/create` → 5-char Crockford code (no I/L/O/U; input maps
I/L→1, O→0). A **league** room's code is the league — bankrolls, ledger and
history live in that one Durable Object.
