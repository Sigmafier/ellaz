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

16 adjectives × 20 animals, English, each animal drawn in
`client/src/ui/animals.tsx`. The two **ids** are what
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

## The felt is deliberately behind the server

`client/src/state/pacer.ts` holds server messages back and releases them at
street boundaries. The engine was always right — it deals the flop, the turn
and the river as three `StreetDealt` events and turns over every live hand on
an all-in runout — but the client applied the whole batch in one React render,
so an all-in preflop arrived as five community cards, two showdowns and a
result simultaneously. Nothing to fix in the engine; the information was there
and arriving too fast to be a game.

**It costs nobody a decision.** A batch only ever holds more than one street
when no player can act, which is exactly the condition the engine sets
`runout` on. In ordinary play a batch carries one street and the delay is one
beat.

**`view.hand` goes null the instant a pot is awarded**, and that is the trap
behind almost everything that looked broken here. Anything gated on it
vanishes at precisely the moment everyone wants to look at it. The board reads
from `shownBoard` in the store, which outlives the hand, and a seat's cards
test `reveals` BEFORE `hand`. Both are cleared by the next `HandStarted`. If
you add anything else that should survive the end of a hand, gate it the same
way — and do not "fix" a disappearance by giving a banner its own copy of the
board, which is what `WinMoment` used to do and why there were two rows of
five cards stacked on each other.

## Nobody there means nobody there

Three clocks, all in `server/src/reap.ts`, which is pure and tested because it
is the only code here that can destroy something a person made.

- **Presence is a claim with an expiry.** `connected` is not something the
  lobby can observe — it is the last thing the TABLE said, and a table that
  stops waking up stops correcting it. `verdict` used to return `keep` the
  moment `connected > 0`, so the one state that pins a row in the lobby
  forever was the state a dead table is most likely to be frozen in. A row sat
  advertising "4/6" forty minutes after the last browser closed. `reportedAt`
  travels with the count and `presentNow` refuses to believe one older than
  `PRESENCE_TTL_MS`; an occupied table renews it every `HEARTBEAT_MS`, and the
  renewal is what makes the expiry safe — six people between hands emit
  nothing at all.
- **`webSocketError` is as load-bearing as `webSocketClose`.** The hibernation
  API delivers a clean close to one and a broken one to the other, and a
  killed tab, a lost signal and a shut lid are all the second kind. It did not
  exist here, so those departures were never reported.
- **A seat is given back after `STAND_UP_MS` with no socket** — keyed by
  playerId rather than seat index, because it is the person who left.
  Auto-sit-out after two timeouts already existed and was never enough: a
  sat-out player still occupies the chair, so a table fills with ghosts and
  stops being joinable while looking busy. A CONNECTED player is never stood
  up, however long they sit out.

**One alarm, two clocks.** A Durable Object has exactly one alarm slot;
`armNext` arms the earlier of the game clock and the reaper's, and `alarm()`
re-derives which it was rather than trusting which it set. Adding the
heartbeat immediately exposed the cost of not doing that: `alarm()`'s
interHand branch started the next hand on ANY alarm, which was correct only
while the inter-hand deadline was the sole thing that could wake an occupied
table. It checks its deadline now.

## Every glyph is drawn — except the chat emotes

`client/src/ui/icons.tsx` (17, `currentColor`) and `client/src/ui/animals.tsx`
(the 20 players can be called). An emoji is a font the device chooses, not a
picture we ship.

The **card suits** were the worst case: `♠` and `♣` are text characters, `♥`
and `♦` have emoji presentations, and several Android builds promote all four
to full-colour cartoons — so the same card was a black spade on one phone and
a glossy blue pictogram on the next, at a table where the suit is half of what
a card says. `SUIT_CHAR` still exists in `CardFace`, for `data-card-suit`
only, so a test can read a card without pixels.

The **emote tray is the sanctioned exception** and is marked `data-emote-tray`
so a sweep can state what it excludes. The player is throwing a face across
the table; their platform's own set is the one they recognise.

The animals are the only icons here that are not `currentColor`, and that is
legibility rather than decoration: at 14px a tiger, a lion, a bear and a panda
are the same circle with two ears. **Judge any new one rendered at 14, not at
64** — four of the twenty were rewritten at that size, and the hedgehog was a
smooth hill twice, both times a paint-order bug.

**A preview harness that renders raw HTML will lie to you.** React camelCases
SVG attributes; `strokeWidth` means nothing to the HTML parser, so every
stroked icon comes back hairline. Render through the real client build.

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

**Live at <https://poker.ellaz.fun/>** since 2026-08-14.
`ellaz-holdem.pages.dev` still serves the same build and is the origin the
custom domain aliases. `poker.ellaz.fun` is a CNAME at Hostinger pointing at
it — a **subdomain** works with DNS staying where it is; only an apex would
force ellaz.fun's nameservers onto Cloudflare, which this project is not going
to do.

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

**Setting one up again (a second subdomain, or after a rebuild) goes in this
order:**

1. **Cloudflare** → Workers & Pages → `ellaz-holdem` → Custom domains → *Set up
   a domain* → the hostname. It will sit at "pending" and tell you the
   CNAME target. Registering FIRST means the edge knows the name before any
   traffic arrives for it.
2. **Hostinger** → hPanel → Domains → ellaz.fun → DNS / Nameservers → add
   `Type CNAME · Name poker · Points to ellaz-holdem.pages.dev · TTL 3600`.
3. Wait for the certificate (usually minutes), then run the gate below.

```bash
npm run assert:domain                            # what is still outstanding
HOLDEM_CUSTOM_DOMAIN=1 npm run assert:domain     # enforcing (what CI runs)
```

It checks DNS, the CNAME target, HTTPS, that the hostname serves the **same
app** as the pages.dev origin (a domain attached to the wrong Pages project
otherwise looks entirely healthy), and — the one nobody thinks to check — that
the Worker accepts the new Origin. That last one is asserted on the CORS
response HEADER rather than the status, because the preflight answers 200
either way, and it carries a disallowed-origin control so a gate that says yes
to everyone cannot pass.

**It runs ARMED on every deploy** (`deploy-holdem.yml`, after the live check),
because the origin allowlist lives in `server/wrangler.toml` and so a future
deploy can break the custom domain while `pages.dev` keeps working perfectly.

**It asks three public resolvers separately and accepts a hit from any one.**
`Resolver.setServers([a, b])` reads as redundancy and is not: NXDOMAIN is a
real answer rather than a transport failure, so node stops at the first server
and never asks the second. Minutes after the record was published, 1.1.1.1
still held the negative cache while 8.8.8.8 had the CNAME — and the gate
reported *"the CNAME has not been created"* about a domain that was already
serving the correct build over a valid certificate. A resolver disagreement is
propagation, and calling it an absent record sends somebody back to a panel
they had already got right.

Rooms: `POST /api/create` → 5-char Crockford code (no I/L/O/U; input maps
I/L→1, O→0). A **league** room's code is the league — bankrolls, ledger and
history live in that one Durable Object.
