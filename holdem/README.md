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
npm run bots             # THREE OPPONENTS at a fresh table — see below
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

## The practice table

**`PRACT` — <https://poker.ellaz.fun/#/room/PRACT>. Three seats held by the
house, and it appears on the home screen ONLY when the switch under the table
list is on.**

That switch is off by default and it used to not exist. "Always there" was
implemented as *create it on every visit to the home screen, and list it like
any other room*, so the first thing on the lobby, every single time, was a room
full of machines — the operator, 2026-08-15: *"it keeps popping again and again
i dont want it to come up unless we are on testing mod."*

**The switch is not a filter over something that exists anyway.** Asking for
the practice table is what creates it (`/api/practice`), and with the switch off
this client never asks. `client/src/net/botsPref.ts` remembers the choice per
device.

**The row says so, and the client does not know the code.** A lobby row carries
`bots` (`server/src/lobby.ts`), so the filter reads what the table says about
itself. The alternative was for the client to hardcode `PRACT` — a copy of a
server constant kept in step by nothing at all.

**A lobby row is whatever the table last SAID about itself, and a sleeping
table says nothing.** So a row written before `bots` existed keeps its old
shape for as long as the table stays quiet — which for this one, evergreen and
asleep whenever it is empty, is forever. `/init` answering 409 now re-reports on
the way out, which makes "ask for the practice table" the thing that repairs
its own row. Anything else added to `LobbyRow` needs the same thought: the field
does not arrive when you deploy it, it arrives when each table next speaks.

It is the same brain as `npm run bots`, moved from a terminal into the Durable
Object, because a table that needs somebody's laptop running is not a table you
can open at any hour. `server/src/botSeats.ts` is the whole of it; the DO's own
alarm is what makes a bot act, and a bot sits with `sit` and acts with `act`
like everyone else. Nothing here reaches around the engine — a bug in that file
can make a bot play badly and cannot make it play illegally.

**It sleeps, and that is the design rather than an optimisation.** A table that
DEALS around the clock is the fastest way off the free plan: ten actions a hand,
a hand every half minute, is roughly forty thousand alarm wake-ups and storage
writes a day for hands nobody is watching. So the house sits out while no human
socket is connected — no eligible players, no inter-hand alarm, no reaper clock
either (it is `evergreen`, so there is nothing for the reaper to decide) — and
an idle practice table costs literally nothing. It wakes on the first `hello`.
**The table is always THERE; it is not always playing, and those are different
promises.**

**A seat holding 0 chips does not sit at the table** (`server/src/busted.ts`).
Not tidiness: `blinds.ts` counts only seats with chips, so every busted seat
left in place is one player closer to a table that cannot deal — and the way
THAT ends is a room full of faces where nothing happens and no error is printed
anywhere. Measured on the live practice table before the fix: three of five
seats at 0 and every chip pooled in a fourth, because the only thing that ever
staked a bot back was `hello`, which fires once when somebody arrives and never
again however long they play.

Two answers, because the two seats mean different things. **The house is
restaked** — it cannot decide to rebuy and there is nobody to ask, so a busted
bot is just a dead chair and its chips were never real. **A person is stood
up**, keeping everything a leave normally gives them; their seat goes back to
"sit here", the same door they came in by. Deciding for them would be inventing
money for somebody entitled to decide they are done. The rule is pure and lives
beside `reap.ts` for the same reason — no test here can drive a Durable Object,
so anything with a decision in it moves where a test can hold it still. The
sweep runs LAST in a commit: sweeping first would send the tidied table before
the events that busted somebody, so the client would show the seat already gone
while the pacer was still animating the pot that emptied it.

**The time bank spends itself, and there is no button for it.** There was an
hourglass in the action bar and the operator could not tell what it did — the
correct reaction to a control that asks you, mid-decision, to notice a clock
and spend a reserve you were never told you had. A reserve of extra time has
exactly one moment worth spending: the moment you would otherwise be folded. So
the server spends it there, once per player per hand, and the timer bar simply
grows. **Only for somebody actually connected** — banking time for a closed
laptop delays every hand at the table by the full reserve to reach the same
fold.

Three things that each had to be closed for that to hold, and every one of them
would have looked fine:

- `standUpAbsent` hands back a seat whose player has no socket after five
  minutes. The house has no socket and never will, so without an exemption the
  practice table would empty itself five minutes after it was created.
- The reaper deletes a table nobody has visited. `evergreen` skips it — checked
  in the DO rather than inside `verdict`, because reap.ts answers "is anybody
  there" and should keep answering that honestly.
- Sitting the bots out is not quite enough to stop the dealing. Two people who
  close their laptops keep ACTIVE seats for the five minutes before they are
  stood up, which is two eligible players and a table folding to itself in an
  empty room. `armNext` now refuses to arm the inter-hand clock on a house table
  with nobody connected.

**The animals are distinct now.** `pickDistinctName` avoids an animal already in
the room, because the animal is the seat's FACE — with twenty of them drawn
independently a duplicate is 27% likely four-handed and 56% six-handed, and the
operator hit it on the first table the bots ever sat at: Nimble Squirrel beside
Brave Squirrel, told apart by one word.

The client calls `/api/practice` once per visit rather than anybody creating it
by hand. It is idempotent (fixed code, so a 409 is the success case) and it
means the table repairs itself the next time somebody opens the home screen —
where the alternative was a room I made once and trusted never to vanish, which
is the shape of a promise that quietly stops being true.

`PRACTICE_CODE` lives in `botSeats.ts` and not in `index.ts`, and the reason is
worth keeping: **every export of a worker's entry module is a runtime binding.**
A plain `export const` there makes the runtime refuse to boot —
`Incorrect type for map entry 'PRACTICE_CODE': the provided value is not of type
'function or ExportedHandler'` — on every environment at once.

## Somebody to play against

```bash
npm run bots                     # 3 bots, fresh private table, against the LIVE site
npm run bots -- --n 5            # five of them
npm run bots -- --join 7K3QM     # sit down at a table that already exists
npm run bots -- --local          # against `npm run dev` on :8787
```

It prints a `#/room/<CODE>` to play at and a `#/tv/<CODE>` to watch. Ctrl-C
stands them up.

**They run on your machine and reach the table through the same WebSocket a
browser uses.** Nothing is deployed, the server has no idea they are bots, and
a table of them exercises the real join, the real deal, the real clock and the
real reconnect — so a bug that shows up under bots is a bug a person would have
hit. It works against production for the same reason, and the worker's URL is
read back out of the deployed client bundle rather than written down here,
because that URL contains the Cloudflare account subdomain and would otherwise
be one account change away from being a lie.

**The brain lives in `shared/src/bot/`, and it is unit-tested for a reason.**
`equity.ts` is Monte Carlo over the REAL evaluator — a few hundred runouts,
counted — which means a bot can never disagree with the pot it is playing for,
gets draws valued for free, and needs no second opinion about what beats what.
Its tests check published preflop numbers (aces 85.2% heads-up, 63.9% against
three) that exist outside this repo, so they are a real control rather than a
snapshot of whatever it returned first. `policy.ts` turns that number into an
action, and its own tests exist because **"the bots never raise" is a silent
failure that wastes an entire sitting**: the pot never grows, nobody is ever
all in, and the run-out and the showdown — the two things most worth looking
at — simply never happen. A bounds property test over 4,000 random spots
guards the other silent failure, an amount outside the legal band, which the
server answers with an error the bot has no handler for: it then sits there
until the clock folds it, every hand, and the table looks broken in a way that
has nothing to do with what you were testing.

Four personalities — a station, a nit, a maniac, and one that plays about
right — because one policy at every seat produces the same hand forty times.

**The table is 40 big blinds deep on purpose.** At 100bb nobody is ever all
in: measured over the first eight hands this thing ever played, not once. The
depth is the difference between a demo that shows the best thing on the felt
and one that never does.

They are NOT trying to play well. A bot that played correctly would fold most
hands preflop, which is right and is a terrible thing to watch. And the equity
assumes every opponent holds two random cards, which is generous to the hero
facing a raise — so they call rather more than they should. For a test run
that is the friendly direction to be wrong in: more pots reach a showdown,
which is where the cards get turned over.

Measured on the live site, 2026-08-14: a person clicked through the buy-in
sheet and was dealt in beside them, the board arrived `0 → 3 → 4 → 5` over
thirteen seconds, two more card faces appeared at the showdown while the board
stayed up, and the page threw nothing.

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

## One table, one socket

**The worst bug this project has had, and every guard against it was pointed
somewhere else.** The operator, 2026-08-15: *"i see cards in flop go again and
again hence i see more than 6 7 8 cards on deck."* Everything above says a
six-card board is unrepresentable — `handBoard` is replaced by the server's own
board on every snapshot, and the felt renders `slice(0, shownCount)`. All of it
is true, and all of it assumes ONE stream of events.

`client/src/net/socket.ts` held more than one. Two lines did it, and neither
reads like a bug on its own:

- `wake()` returned early only when the socket was **OPEN**. A socket still
  shaking hands is neither open nor gone, and coming back to a tab fires wake
  every time.
- `open()` assigned `this.ws` without closing what was already there, so the
  abandoned socket stayed live — and its own `onclose` ran the reconnect
  ladder, which is why the count GREW instead of settling at two.

Measured on the live table with `scripts/repro/double-socket.mjs`: forty
`visibilitychange` events produced **forty-one sockets, twenty-two open at
once**. Every one of them received every broadcast and delivered it into the
one store. `StreetDealt` appends, so the flop was applied twenty-two times.
The operator was reporting the mild version of what was happening.

It also doubles the sounds, the pot in the winner banner, and the depth of the
pacer queue — so "many many bugs in game play" was one defect wearing several
costumes.

**Fixed in two places on purpose, and they are not the same fix.** `retire()`
takes the handlers off a socket before closing it and every handler checks it
is still the current one — that is the CAUSE. `deliver()` refuses a `seq` it
has already accepted (`client/src/state/pacer.ts`) — that is the CLASS, and it
holds no matter how many streams exist. `client/src/net/socket.test.ts` stubs a
WebSocket and pins both; four of its seven tests go red against the old code.

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

## Six decisions that are the table, not a preference

Settled 2026-08-15: a **racetrack** felt, **wide** cards, a **big centre rank
with no corner index**, **pill** nameplates, and **double-slow** pacing. They
are the plain CSS in `look.css` now; the old defaults became arms beside the
others.

**Shipping them as defaults was the actual fix for "I have to do this again and
again."** A pick lives in this browser's `localStorage`, so a phone and a PC
were always two different tables and always would be — no amount of lock UI
reaches a device that has never been here. The look system already had the
right shape for this: the default is the plain rule with no attribute, so
flipping one is moving a declaration and letting `axes.test.ts` check both
directions (`current: true` must have no rule of its own; every other arm must
have one that does something).

Two live defects surfaced doing it, both of the class this system fails in —
**an arm that reads as a boring option rather than a broken one**:

- **The Pill arm's extra padding had never applied.** `Seat.tsx` set an inline
  `padding` shorthand, an inline style beats a stylesheet rule, so picking Pill
  rounded the corners and did nothing else. The scale now comes from JS as
  `--plate-pad-x/y` and the multiplier from CSS, and the allowed-list in
  `axes.test.ts` forbids the shorthand coming back. Measured live: 31.5 px,
  where the base is 15.
- **`pace` scaled only the CSS animations.** "Much slower" doubled how long a
  card took to turn over and left the gap between the flop and the turn exactly
  as it was — half a knob, and the half nobody watches. `pacer.ts` reads
  `--pace` off the document now, **capped at 1.6 while the CSS gets the full
  2**: a beat is time the felt spends behind a server whose clock has never
  heard of a look preference, and at 2× a full run-out would cost ~10 s of a
  25 s action clock on the hand after every all-in. The arithmetic is in the
  code beside the cap.

**🔒 Settle** folds a decided strip down to one line and drops it below the
open ones, with the six arriving settled. It is a **view preference only** — it
never blocks a change, and tapping a settled row reopens it. `lockStore.ts`
stores booleans rather than a list of locked keys, because a list cannot say "I
deliberately reopened one of the six" and the next release would quietly close
it again.

## The sound lab

It is one TAB of three now — the studio, `client/src/look/Studio.tsx`, which is
the look (`#/look`), the sounds (`#/lab`) and your name (`#/name`) over a felt
dealing a real hand from the real engine. Three URLs, one screen, one lazy
`lab-*` chunk that no player downloads to play.

**<https://poker.ellaz.fun/#/lab>**, or the **Make it yours** row on the home
screen, or the room menu → *Choose sounds*. Eleven strips, one per sound the
table plays, **98 candidates**. Tapping a candidate **picks it and plays it
through the real audio port** — not a preview path that could disagree with
what a hand actually sounds like. That is the whole design rule: the thing
being judged has to be the thing that ships.

The home-screen row was added on 2026-08-15 for a reason worth keeping: the
studio's only two entrances were typing `#/look` or already being inside a
table, and the question that arrived the day after it shipped was *"how do i
reach the lab?"*. A screen nobody can find is a screen nobody uses.

### The first palette was thin, and the cause was nameable

The verdict was *"the sounds are horrible"*, which no test can hold. The cause
could be tested: **every impact was all click and no body.** `CHIP_CLACK` was
`struck(2400, …, CLAY)` and CLAY's partials start at ratio 1, so the sound's
lowest component was 2400 Hz and there was no energy below it anywhere.

A clay chip landing on a chip on felt is two things at once: a **body at
180–300 Hz** decaying over 120–300 ms, and a **click at 2.5–4.5 kHz** gone in
20–80 ms. The named signature of a synthetic impact is "too much brightness
around 3–10 kHz, too little midrange body, decay envelopes too simple" — which
was a description of what we had, arrived at from the other direction.

So `voice.ts` gained two builders and the whole palette was rebuilt on them:

- **`mix()`** — layer whole voices, so an impact can be a bright strike over a
  low body. **Put the brightest voice first**: rescaling divides by the base's
  `freq`, and the override gate refuses any ratio above 64, which is the whole
  voice silently falling back to the built-in.
- **`scatter()`** — an aperiodic run. A perfectly even burst train is the
  difference between chips and a drum machine playing chips. Seeded, so a spec
  is data and stays pickable; per-play variation is `jitter` and already exists.

**A cascade is not the unit repeated.** A dozen chips tumbling into a pot make
a dozen clicks and *one* low rumble, because the table under them is one object
being excited repeatedly. Stacking a full body per chip is both wrong and over
the gate's 64-layer ceiling — which is how the modelling error surfaced.

Measured on the deployed bundle, felt paused, with an idle control at zero
oscillators and the body-less arm as the negative control:

| tapped | oscillators | lowest |
|---|---|---|
| Clay (shipped) | 14 | **244 Hz** |
| No body (what shipped before) | 8 | **2621 Hz** |
| Riffle (the new shuffle) | 0 | pure noise, correctly |

`audio/pokerVoices.test.ts` asserts the spectrum reaches the bottom, and is
mutation-proved: restoring the body-less chip kills 4 of 4.

**Three sounds the table never made**, added the same day — a **shuffle** at
the start of a hand (the most recognisable poker sound there is, and a hand
simply began), a **raise** that sounds like more chips than a call, and a
**card turning over** at showdown, which was silent inside a beat the pacer
holds 1.2 s open for.

**Sound on a phone, which is a different problem from sound.** Two causes, and
neither leaves a trace in JavaScript — the context reports `running`, every node
connects, `onended` fires on time, and nothing is in an error state:

- **iOS suspends the AudioContext whenever the app is backgrounded.** A call, a
  glance at a message, the screen locking. `attachUnlockOnFirstGesture` used to
  REMOVE its own listener after the first tap, so nothing ever resumed it and
  every sound for the rest of that session was dropped by the
  `state !== "running"` guard in `play()`. Not one missing sound — all of them,
  permanently, after an ordinary interruption. It now listens for as long as the
  page lives, and resuming a running context is a no-op, so asking costs nothing
  and asking once was the bug.
- **WebAudio plays through the RINGER channel on iOS**, so the hardware side
  switch silences the game while everything reports success. An `<audio>`
  element that is genuinely playing moves the page to media playback and
  WebAudio follows it there, so `audio.ts` builds a tenth of a second of silence
  as a real WAV and loops it. Muting the game pauses it too: a page listed by
  the phone as playing media, right after you muted it, is its own small
  betrayal.

**The sounds tab shows what the audio layer is actually doing** — `audio:
running · media`, or `suspended`, or `MUTED`. A report from a phone nobody here
can hold says something checkable instead of "no sound", and the one cause that
is NOT knowable from code (the side switch) is named in words rather than
guessed at. It is on that tab and nowhere else, because the person who needs it
is already looking at sounds.

A pick persists as a complete `VoiceSpec` under `holdem:voice:v1`, so a sound
chosen on a phone plays on a laptop that has never opened this screen.
`audio/voiceOverride.ts` is the gate on the way back in and is the strictest
reader in this app — every other stored blob decides what a screen SHOWS, this
one decides what a synthesiser DOES next to somebody's ear. It validates rather
than coerces and drops anything it does not fully like, falling back to the
built-in, which is the same answer as "nothing was ever picked".

**The control arm in every strip is a hand-written literal, never an import of
the shipped constant.** An imported control silently becomes a second copy of
whatever replaces it — two buttons playing the same sound, one labelled with
the old name, and every test still green. `candidates.test.ts` fails on any two
arms in a strip being byte-identical, and separately on a control drifting from
`pokerVoices.ts`.

**Loudness is not policed by arithmetic.** The first version of the gate capped
the SUM of layer gains at 1.2; shipped `potSlide` sums to 1.287, so it would
have quietly attenuated a sound the table already plays. It was also the wrong
quantity — `run()` staggers its notes in time, so summing a 25-layer cascade
measures nothing anybody can hear. `warmVoices` already renders each voice
offline and trims it to a measured peak, so the gate polices shape and cost and
leaves loudness to the thing that can measure it.

**`npm run assert:first-visit` is why the lab does not reach a player.** Keeping
it off a first load takes three settings in three files — the lazy `import()`,
the chunk name, the `globIgnores` entry — plus one thing invisible from all
three: a `<link rel="modulepreload">` is a DOWNLOAD, not a hint, and Vite writes
one for a lazy chunk. Two further traps fired while this was being built:

- **A manual chunk is a magnet.** Declaring `manualChunks` for `src/lab` pulled
  REACT into the lab chunk, so the shell opened with
  `import{r as L,…}from"./lab-*.js"` at byte 229 — a static import, making the
  lab mandatory to run the app while still being excluded from the precache.
  Adding a `vendor` branch moved React out and four functions from `audio.ts`
  took its place. The tell both times was **a precache that got 13.5 KiB
  smaller after a whole screen was added.** The chunk is named through
  `chunkFileNames` now; Rollup already isolates a dynamic import, it only
  needed a stable name for the exclusion to match.
- **The precache matcher must be unquoted.** Minified workbox writes
  `url:"index.html"`, a bare identifier key — a `"url":"` matcher finds zero
  entries and every absence assertion under it passes over an empty list.

The gate carries five planted controls (`--control`) and both it and its
controls run in CI. Measured on the artifact: lab 13,600 B in its own chunk,
zero references in `index.html`, absent from the precache while the shell chunk
is present.

Verified on production by A/B: with no override the chip sound fired 3
oscillators at 2400 Hz and none at 2900; with Ceramic picked, none at 2400 and
3 at 2900. **The probe took two attempts to become capable of that** — reading
`frequency.value` at `start()` returns the 440 Hz default, because the engine
schedules pitch with `setValueAtTime`. Every reading was 440 and looked like
data. Ask of any probe whether it can represent the thing you are looking for.

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
