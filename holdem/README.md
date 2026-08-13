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
npm run dev              # wrangler dev :8787  +  vite :5173 (proxied /ws /api)
node scripts/smoke.mjs   # 3 headless players play 5 real hands over WS
node scripts/cli-client.mjs create "Yossi"   # interactive terminal player
```

Four local players: one normal window, one incognito, one other browser
profile, one CLI client (identity is per-profile localStorage).

## Deploy

`.github/workflows/deploy.yml`: vitest → `wrangler deploy` (server) →
`wrangler pages deploy` (client). Secrets: `CLOUDFLARE_API_TOKEN`,
`CLOUDFLARE_ACCOUNT_ID`; repo variable `SERVER_URL` (the workers.dev URL,
baked into the client build as `VITE_SERVER_URL`).

Rooms: `POST /api/create` → 5-char Crockford code (no I/L/O/U; input maps
I/L→1, O→0). A **league** room's code is the league — bankrolls, ledger and
history live in that one Durable Object.
