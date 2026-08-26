# CLAUDE.md — Ellaz Games Platform

Guidance for Claude Code (and humans) working in this repo.

## What this is

Ellaz is a **cross-device casual-games PWA** — one website where kids and adults
play our games on phone, tablet, and PC. English (default, LTR) + Hebrew (RTL).
Anonymous play, on-device saves, anonymous kid-safe analytics. No backend.

**This repo also holds a SECOND, unrelated site.** `holdem/` is a real-time
multiplayer poker table for adults — its own npm workspace root, its own tests,
its own host (Cloudflare, not Hostinger), and a server, which the games platform
deliberately does not have. Nothing in `src/` may import from it and nothing in
it may import from `src/`. See § The poker table below before touching anything
under `holdem/`, and note the trap that follows from it: **`npm test` at the
repository root does not run a single one of its tests.**

**What shipped, in order, with the measured numbers and the traps each one
cost**: [`docs/build-log.md`](docs/build-log.md). Read it before re-deriving a
payload figure, re-litigating the engine choice, or wondering why analytics has
never produced data. [`docs/architecture.md`](docs/architecture.md) is the
module map and the SDK contract.

## Commands

```bash
npm install
npm run dev        # http://localhost:5180 (no service worker — use for QA)
npm test           # Vitest: pure-logic + catalog tests
npm run build      # tsc --noEmit && vite build → dist/  (also the type-check gate)
npm run preview    # serve the production build on :5180
```

**QA gotcha:** the production build registers a service worker (`autoUpdate`) — a new
deploy activates on the user's next load and reloads the page. A tab already open on
the old SW still serves the cached bundle until that reload, so when eyeballing a
fresh build use `npm run dev` (no SW) or clear the SW/caches first.

## Architecture

Single Vite + React 18 + TypeScript app. Phaser 4 powers canvas games. Internal
module boundaries mirror extractable packages 1:1 (import via the `@sdk`/`@ui`/
`@juice`/`@i18n`/`@shared` aliases, never deep paths):

```
src/
├─ sdk/      Game SDK - the neutral contract every game implements
│            GameModule/GameContext, SaveStore (localStorage), analytics port
│            (PostHog behind an interface), audio port (named SFX + tone/time),
│            speech port (Web Speech TTS), lifecycle, ads stubs, and the rewards
│            economy (economy + profile + wallet, surfaced as ctx.rewards)
├─ shared/   Neutral game helpers - rng (mulberry32/seedFrom/randInt/pick/shuffle),
│            pentatonic notes, winMoment() (the canonical win)
├─ ui/       Design tokens + RTL-aware components (Hebrew-first fonts, big targets)
│            + DifficultySelector (the shared level row) + DirectionPad (the
│            four-way cross + joystick, pinned to the `page` chunk like GameChrome)
├─ juice/    Game-feel kit - haptics, screen shake, particle burst, full-screen
│            confetti, flyTo (coins arc to the wallet chip), tween
├─ i18n/     he (default, RTL) + en (LTR) strings + direction, and `locales.ts` -
│            the TWO locale sets (see below). A leaf module importing nothing
├─ portal/   Shell - App (the home screen at `/`), Home (grid of real links),
│            PageApp (boots a game or the room on its own page), GameHost
│            (mount/unmount bridge), WalletChip, games (the ordered roster),
│            catalog (roster + lazy loaders), paths/pageContext/legacyHash,
│            world/ (the room + shop)
├─ build/    BUILD-TIME ONLY - the 200 emitted pages. Pure strings, no DOM, no
│            React. Nothing in the app may import it (it reads src/content)
└─ games/<id>/
   ├─ meta.ts         DOM-free GameMeta - catalog.ts imports it statically
   ├─ logic.ts        PURE game logic - NO DOM/Phaser imports; unit-tested (TDD)
   ├─ logic.test.ts
   └─ <Renderer>      React component (DOM) or Phaser scene (canvas)
```

**Games (42)** — 25 `ageBand: "kids"` (balloons, bees, bubbles, coloring, echo,
evolve, finddiff, frog, fruit, hidden, jigsaw, letters, match3, math, maze,
memory, merge, music, pet, reaction, sequence, shadows, sort, spell, vanish) and
17 `"all"` (2048, arrowtap, blocks, bubbleshooter, fit, flow, lettercross,
minesweeper, nonogram, onestroke, parking, snake, sudoku, tictactoe, untangle,
wordguess, wordsearch). Both lists were
re-derived from the metas on 2026-08-26 and both were wrong before that: the
`kids` half named `sortsize`, which has never existed, and omitted `letters`;
the `all` half said `n2048`, which is the DIRECTORY and not the id.
Counts here go stale fast — `src/portal/catalog.ts` is the source of truth and
`catalog.test.ts` ratchets the count. This line said 25 for about six hours on
2026-08-13 while four more games shipped, and it said 33 with `lettercross`
already live and shipping, which is the ordinary rate of decay: read it off the
roster rather than off this sentence.

**A game may declare itself UNFINISHED, and two surfaces say so.** `GameMeta.beta`
is a plain boolean on the DOM-free meta; the home-grid card draws a pill in its
top-right corner and the emitted game page draws one beside the game's name in the
utility row. **One field, because the two surfaces cannot see each other** — the
card is React in the shell and the page is a string written by `src/build`, which
may never import the app, so anything else is two lists of beta games and the day
they disagree a player taps an unbadged card and lands on a page that says beta.
It is a DECLARATION and never a behaviour: nothing is gated on it, nothing is
hidden, a beta game plays and ranks exactly like a finished one.

The PAGE carries the translated sentence and the CARD carries only the word, and
that split is the payload — `src/build` ships to nobody, so the note is free
there, while every character on the card is in the shell chunk every child
downloads before choosing anything (both, with a title and an aria-label: 293 B
gz; the word alone: 163). `beta-is-declared.test.ts` pins both surfaces against
the one field and **reds the day the last flag comes off** — with no beta game
every assertion in it passes over nothing, so delete the file then rather than
softening it into a skip.

Two traps in the badge, both measured on the artifact rather than reasoned. It is
a **SIBLING of the breadcrumb, never a child** (`.bc` is `overflow:hidden` +
`text-overflow:ellipsis`, so anything inside it is cut from the END first — which
is exactly where a badge after the game's name sits, and it would vanish on a
narrow phone with every width check reading clean). And the card badge is pinned
**physically `right`**, because the star badge sharing that card carries
`dir="ltr"` for its digit and logical insets resolve against an element's OWN
direction — so in Hebrew a logical inset put both badges in the same corner while
English looked perfect:
[`rtl-spatial-grid-dir-ltr.md`](.claude/rules/rtl-spatial-grid-dir-ltr.md) §
the other edge of the same knife.

**Four games landed together on 2026-08-26, and each one is a puzzle whose
boards are BUILT BACKWARDS rather than shuffled and hoped over.** That is the
`sort` discipline applied four more times, and it is the whole reason none of
them can hand a child something impossible.

- **`flow`** (Pipe Flow) joins pairs of dots and wins only when every square is
  covered. Its walk is a Hamiltonian path cut into one segment per colour, and
  the walk is produced by BACKBITE - seed the row-by-row zigzag, then fold a
  suffix of it ~9,800 times, each fold leaving it still visiting every square
  once. It shipped for an afternoon as a budgeted depth-first SEARCH instead,
  which is correct whenever it finishes and gave up on **91.2% of hard deals**,
  so nine boards in ten were cut from the same underlying zigzag. Nothing threw
  and every gate was green; the only thing that saw it was `scripts/sim/flow-routes.mjs`
  measuring which branch ran. Its `snake deals` column is a permanent regression
  guard and must stay at 0.
- **`arrowtap`** (Arrows Out) clears a grid of arrows that can only leave when
  their lane is clear, dealt backwards from the empty board. Measured over
  12,000 boards: **you cannot strand yourself** - a tap only ever empties a
  square and an empty square blocks nothing - so a cleared board always takes
  exactly one tap per arrow. That is why the record is the CLOCK: the tap count
  cannot be a score.
- **`fruit`** (Fruit Drop) is the one real physics simulation here, circles only,
  written as arithmetic in `logic.ts` with no engine. The renderer consumes REAL
  elapsed time in `DT`-sized sub-steps (`fixed-timestep-must-match-display.md`),
  and the loop STOPS once the pile settles, which is why it has no pause control.
- **`parking`** (Escape the Jam) is 6x6 Rush Hour, and it is the one that needed
  a second pass. Walking away from a solved board until "a car is in the way"
  produced a 40-move walk over a board whose true minimum was **2.1 moves, with
  ~90% solvable in two** - the recorded walk's length and the puzzle's depth are
  different numbers and nothing about the first can see the second. `deal` now
  GRADES candidates with a saturating breadth-first search over the shipped
  rules and keeps the deepest of up to 250 layouts. Floors are 4/5/5, measured
  rather than chosen: medium and hard share one because the ceiling is a
  property of the LAYOUT, not of the scramble.

**`scripts/repro/repro-new-games-play.mjs` is the only check here that watches a
game MOVE.** Every other gate reads `dist/` or a source tree, and `logic.test.ts`
drives the rules in node where there is no frame clock at all - so a game whose
rules are perfect and whose renderer never advances passes all of them. It opens
each of the four in headless Chromium and asserts the board responds. Read its
header before trusting a hand-run browser check: driving a real Chrome through
the extension reported Fruit Drop frozen in mid-air and every tap ignored,
because the window was minimised and `requestAnimationFrame` is paused in a
hidden tab. The harness asserts a bare rAF loop ticks BEFORE it opens a game,
for exactly that reason.

**Four MORE landed the same day, and they are four more applications of the same
discipline.** `nonogram` derives its clues from a picture and then PROVES by
line-solving that those clues force exactly one picture with no guess anywhere -
a deal that fails the proof is thrown away, and its control is a planted 5x5
whose clues admit two pictures, plus a second test proving both pictures really
do satisfy those clues so the refusal is correct rather than timid. `onestroke`
folds a walk that already visits every square and then takes the walls off the
two ENDS of it. `wordsearch` plants every listed word before a single filler
letter, so the list is exactly what went in. `untangle` joins its dots without a
crossing FIRST and only then throws them onto a ring, and carries that drawing
as a WITNESS that nothing renders and no rule reads - its one job is to refuse a
restored board whose lines cannot be drawn crossing-free.

**`onestroke` found a real defect in plain backbite**, and only because its fold
count is an instrumented counter and a test asserted it moved: a region whose
two walk ends are BOTH dead ends has no legal fold, so the second stir did
nothing on 20% of hard cuts. One hard board in five was whatever the cut
happened to leave. Nothing threw.

**`wordsearch`'s sharp edge is the filler accidentally spelling a listed word**
somewhere the generator did not intend. It judges the letters the player
SELECTED and never where a word was planted, so any occurrence counts - and its
control is a real untampered board, found by sweeping 36,000 deals, whose filler
spells TURTLE a second time.

All four record `ms`, because in all four the move count is the wrong question:
onestroke's is fixed by construction and untangle's is unbounded, so counting it
would put a price on exploring.

**`scripts/repro/repro-wave11-play.mjs` asks whether a tap does anything**, which
`repro-preact-swap.mjs` (does it MOUNT) and `logic.test.ts` (do the RULES work,
in node, with no pointer) between them cannot. It taps the game's own
`<button>`s rather than a fraction of the box - the first version aimed at four
points in the middle and called onestroke and untangle broken, when both were
correctly refusing a tap on nothing: a path may only be extended from its head,
and untangle's dots are 44px buttons on a ring with empty canvas between them.

**`lettercross` is the one game with a dictionary, and it is the one game with a
NOTICE.** It is BONUS (1993) rebuilt: a 9x9 board, twelve prize boxes in a ring
around it, and **five bonus screens** — a 60s crossword, "the same letter is
missing from THREE words" (100 pts), the same from TWO (40), an anagram of all
the letters (30-100 by length) and fill-the-missing-letters. `ROUND_OF` in
`bonus.ts` says which art opens which, and every round reports a QUALITY in 0..1
and never a payout, the same shape as `economy.ts` and `score.ts`.

**Two word lists, and they are NOT interchangeable.** `puzzleWords.ts` (346
authored, concrete words) is what a screen may SHOW; `words.ts` (ENABLE1 behind a
blocklist) is what JUDGES. Getting that backwards costs something real in each
direction, and the asymmetry is written down twice — in
`src/games/lettercross/NOTICE.md` and in `sharedLetter.ts`. **Exactly two modules
IN THE ROUND TREE may import the dictionary** — `patterns.ts`, which answers "is
that a word" for the three pool-fed screens, and `bonusBoard.ts`, the crossword,
which judges what the player built from their own deal and shows nothing from it.
`rounds-are-wired.test.ts` asserts that SET rather than describing it, because
NOTICE.md named it wrong for a day.

**Read that scope literally: `logic.ts` imports it too**, to judge a word placed
on the 9x9, and that is the third production reader. The sentence above said
"exactly two modules" with no qualifier until 2026-08-25 — false as written, in
the same commit that fixed the identical defect in NOTICE.md, which HAD the
qualifier. Worse than a plain error: the test passes, because it scans the round
tree, so a green run reads as proof of the broader claim. **A prose claim about a
SET states the population it ranges over, or the test standing behind it is
answering a narrower question than the sentence asks.**

The game is `beta: true` today. The board and all five screens play; the
placement rules, the padlocks and the music do not exist yet.

**`create` is no longer empty.** It was declared in `CATEGORY_ORDER` from the
beginning and held zero games, so that heading never rendered once. `music` is
the first thing in it. Every game offers a **difficulty selector**
and/or endless levels: 20 declare their `levels` to `<GameChrome>`, which owns
the level toggle (the two exceptions are finddiff, which is endless, and evolve,
which gets its levels from the n2048 renderer it borrows). Only **math and
sudoku still render `<DifficultySelector>` directly** — the other eight files
that name it import its `DifficultyOption` type and nothing else. Wins go through **`winMoment()`** from
`@shared`, which owns the confetti (there are zero `celebrate()` calls left in
`src/games/`).

**Deploy**: pushing to `main` deploys to **two hosts in parallel**, from the same
source at two different base paths. The PWA is `registerType: "autoUpdate"` so
returning players get new versions automatically. Repo is public; collaborator: Benzi.

| URL | Host | Workflow | Base |
|---|---|---|---|
| **`https://ellaz.fun/`** (the live site) | Hostinger, over FTPS | `deploy-hostinger.yml` | `/` |
| `https://sigmafier.github.io/ellaz/` | GitHub Pages | `deploy-pages.yml` | `/ellaz/` |

The two are deliberately kept separate rather than pointing ellaz.fun at Pages:
a Pages custom domain 301-redirects the `github.io` path onto it, so a project
site gets exactly ONE hostname. Keeping both live costs a second build.

The Hostinger job reads three repo secrets (`FTP_SERVER`, `FTP_USERNAME`,
`FTP_PASSWORD`), already set. Missing them it **skips with a warning instead of
failing**, so **a green checkmark is not proof it deployed** — check the
`Upload to Hostinger` step's conclusion, then check the live artifact. Three
host settings were each verified against the live server on 2026-08-02 because
each would otherwise produce a green deploy beside a frozen site: the account is
chrooted so `server-dir` is `./` (not `public_html/`), the username is
`u210394724.ellaz` (not `…ellaz.fun`), and the cert is `CN=*.hstgr.io` so
`security: loose` is required.

**The deploy now proves it landed, instead of asking you to.**
`scripts/assert-live.mjs` runs in the same job and reds the run unless the live
HTML references the same hashed assets as the `dist/` just built AND every one
of them is fetchable. Both halves are load-bearing: "all assets 200" passes on a
fully stale site, and "the HTML matches the build" passes on a site whose chunks
never landed. Only the conjunction separates *the site works* from *my build is
live*.

It exists because on 2026-08-08 ellaz.fun served a blank page for an hour while
deploys reported success in 90 seconds. `SamKirkland/FTP-Deploy-Action` kept a
sync ledger **on the server**; a transfer died after the ledger was written; and
every run since diffed against a file claiming the missing chunks were present,
so it skipped them forever.

The upload holds no ledger now. `mirror` runs on **`assets/` and nowhere else**,
where every name carries a content hash so a changed file is a *new file*; the
other 108 files are **forced**, ordered so the 50 that name hashes go last, and a
run dying mid-transfer leaves a *stale* site rather than a blank one. The
invariant is narrower than "no ledgers": **the thing deciding what to send must
not be able to be wrong about what is already there.** A JSON ledger can be; so
can a size comparison, which skipped all 49 pages once because Vite hashes are
fixed length and an HTML file differing only in a hash is byte-identical in size.
The gate also compares each artifact by **SHA-256**, because an 80%-truncated
chunk is 200 with a plausible length and a syntax error on import. A status sweep
over `/`, `/games/snake/`, `/world/` and `/boards/` reported **all 200
throughout the outage**, because a 200 document whose JS 404s is a blank page.
[`.claude/rules/a-deploy-ledger-that-can-disagree-with-the-disk.md`](.claude/rules/a-deploy-ledger-that-can-disagree-with-the-disk.md).

**Runs sitting QUEUED with zero jobs means Actions is disabled on the
repository** - `gh api repos/Sigmafier/ellaz/actions/permissions`. A *blocked*
action fails at "Prepare all required actions"; it does not queue. Two different
faults, mistaken for one on 2026-08-08.

Cache headers live in `deploy/hostinger.htaccess`, copied to `dist/.htaccess` by
the workflow and shipped to Hostinger only (Pages runs nginx). The SPA catch-all
that used to live there is gone: every route is a real document now, so the only
thing it still caught was a typo, and answering a typo with 200 plus the home
page is a soft 404. `ErrorDocument 404 /404.html` replaces it.

**Runbook — read this before touching any of it**:
[`docs/deploy.md`](docs/deploy.md) (verification commands, troubleshooting table,
secret rotation, the CDN edge-cache caveat, and how to move to Pages later).
The discipline that found those three settings:
[`.claude/rules/verify-the-deploy-target-not-just-the-run.md`](.claude/rules/verify-the-deploy-target-not-just-the-run.md).

**The Hostinger CDN is OFF (2026-08-08), and that is load-bearing for SEO.** Its
`I'm Under Attack!` mode had been on, serving every crawler a JavaScript
proof-of-work it cannot solve: HTTP 403 with an HTML body where the sitemap
belonged, while the site loaded perfectly in a browser. Google reported "Sitemap
could not be read", 0 discovered pages. Nothing in this repo could see it - every
gate here asserts against `dist/`, and none against what a crawler receives over
the network. If the CDN is ever re-enabled, set Security Level to **Essentially
off** in the same visit; the Medium default is enough to re-block a 48-URL crawl.
Verify by `curl`ing as Googlebot, never in a browser:
[`.claude/rules/a-bot-challenge-at-the-edge-is-invisible-from-your-browser.md`](.claude/rules/a-bot-challenge-at-the-edge-is-invisible-from-your-browser.md).

**`npm run assert:crawlable` is the only gate here that reads the NETWORK** rather
than `dist/`, which is precisely why it exists — a 403 to every crawler passed every
other check in this repo. It fetches robots.txt and the sitemap as Googlebot and then
walks every URL the sitemap lists (128 with French, and the number moves with `PAGE_LOCALES`); that walk IS the burst test, since the challenge arms on a run of
requests rather than the first one. It checks the BODY as well as the status, because
a challenge can be served with 200. `.github/workflows/crawlable.yml` runs it daily
and a red run emails the owner. Node built-ins only, so it needs no `npm ci`.

**And it walks as every crawler robots.txt NAMES, not only as Googlebot** — because
walking as one agent is structurally incapable of seeing a block keyed on another.
Measured 2026-08-13: this gate was green while **GPTBot received HTTP 429 on every
HTML page**, from Hostinger's own server, contradicting the `Allow: /` our emitted
robots.txt grants it. `sitemap.xml` and `llms.txt` returned 200 for it throughout, so
a check pointed at either would also have been green. Every citation crawler
(OAI-SearchBot, ClaudeBot, Claude-SearchBot, PerplexityBot) is served, so ChatGPT,
Claude and Perplexity citations are unaffected; the two refused agents are *training*
crawlers. **The bot list is parsed out of the SERVED robots.txt** rather than kept in
the script, so there is exactly one list and the gate asks only "does the server serve
what our own file promises". **One URL per bot**, since the 78-URL walk is already the
burst and a per-UA block has never been per-URL. **The probe must send a crawler
SHAPE**: measured, the bare token `GPTBot` gets 200 from the same server that 429s
`Mozilla/5.0 (compatible; GPTBot/1.0; …)`, so a gate built on the token alone reports
green over the defect it exists for. Advisory until `CRAWL_BOT_ACCESS=1`, for the same
reason the content floor is — a known offender is live and nobody here can fix a
vendor setting today.

**It also reads HOW MUCH BODY, because a 200 carrying the whole correct document
and no content is the third shape of this failure and the one a status check can
never see.** `bodyStats()` counts words, links and headings in the raw body and
`CONTENT_FLOOR` is 60/3/1. Three exclusions, and the surprising one is BODY-ONLY:
`/` scored **96 words** with tags stripped across the whole document on a body of
29 bytes, all 96 being an HTML comment in the head about pinch-zoom — so a floor
under 96 would have passed an empty shell forever while showing a reassuring
non-zero number. Comment-stripping is narrower than it looks: the generic tag
strip already eats a comment with no `>` inside, and that line earns its place
only on comments holding one.

**The floor is ADVISORY until `CRAWL_CONTENT_FLOOR=1`.** It reports the count every
run and fails only when armed, because it was written while a known offender was
live and a gate that reds on day one for something nobody can fix that day teaches
its reader to ignore the daily email. Arming is one line in `crawlable.yml`, in the
same change that makes the last offender pass.

**60 and not 120**, and that number moved for a reason worth keeping: the emitted
home is deliberately compact, and at 120 the Hebrew one (130 words, when Hebrew
held `/`) cleared the floor by ten words — one trimmed sentence would have reded
a correct page. The English home that replaced it measures 181 words, which is
more headroom by accident rather than by design, and is exactly why the floor
stays at 60: the distance a floor must see is empty-vs-real, and that gap is a
chasm at any sane value. See
[`.claude/rules/a-threshold-tuned-against-todays-tree-goes-stale.md`](.claude/rules/a-threshold-tuned-against-todays-tree-goes-stale.md).

The body scan uses `indexOf`/`lastIndexOf` rather than a regex, and that is a fix
rather than a style choice — `/<body[^>]*>([\s\S]*)<\/body>/i` is quadratic on input
with many `<body` and no `</body>` (117 KB took 8.8 s; it now takes 10 ms). No live
page can reach it, but this is the one gate whose job is to notice when the server
serves something we did not build, so malformed input must not be what stalls it.
`scripts/repro/repro-bodystats-quadratic.mjs` asserts the growth RATE and exits 1 if
it comes back.

**The repo moved to the `Sigmafier` org** (2026-08-02). `ytrofr/ellaz` still
redirects on push, so a stale remote works and hides the move — but the LIVE URL
changed with it, and `ytrofr.github.io/ellaz` is not it. Verify with
`gh api repos/Sigmafier/ellaz/pages --jq .html_url` rather than trusting this line.

**RTL gotcha**: a spatial game grid must carry `dir="ltr"` so it does NOT mirror in
the Hebrew RTL app (else swipe/arrow directions invert — see `src/games/n2048`); the
math equation is also pinned `dir="ltr"` for standard notation.

**Steering is one component now, and it is a CROSS.** `DirectionPad` in `@ui`
draws up / left-right / down in a 3×3, with a **draggable joystick in the middle
cell** — so the down key sits BELOW the pair rather than between them, which is
where snake and maze each drew it in their own byte-identical `dpadBtn` copy. The
arrows stay plain `<button>`s carrying the labels and the stick is `aria-hidden`:
drag is never REQUIRED here, so a pad that shipped as the stick alone would take
those two games away from exactly the players this platform is for. `repeatMs`
decides whether HOLDING a direction repeats — maze passes 260 ms (a direction is a
STEP, so holding walks a corridor), snake passes nothing (steering is idempotent).
`direction-pad.test.ts` pins the layout as DATA off the exported `PAD_KEYS` rather
than grepping style objects, and refuses any renderer drawing all four glyphs
without going through the component; five mutations killed, including the old
two-row block, which satisfies every other assertion in the file. It is **absent
from the `@ui` barrel on purpose** and pinned to `page` in `manualChunks`, both for
the `GameChrome` reason — a re-export would make the shell import from the page
chunk. **One cell size for both games (`PAD_CELL = 88`)** — snake drew 56 and
maze 58 in their own copies, which nobody chose. The test pins it from BOTH
ends, off constants the component actually renders: a FLOOR at `--tap-kids`
(64px, the age-five target, read out of `tokens.css` rather than retyped) and a
CEILING at the 390px phone with 48px of margin to spare. The ceiling is the one
that earns its place — "make it bigger" was asked three times running, each time
from a desktop, and the failure it ends in is a key hanging off the side of a
screen nobody in that conversation is looking at. The pad costs the first
visit **nothing** — it is `page`-side, and the number moved by single digits
across all three commits. **Do not look for a payload figure here**: this
paragraph carried one for about three hours and it went stale twice in that
window, once because another lane shipped two games and once because another
raised the ceiling. Run `npm run assert:payload` on the tree in front of you.

**Pausing is a chrome control and only TWO games have one** — blocks and snake,
since 2026-08-19. `GameChrome` takes an optional `paused` / `onPaused` PAIR: it
draws a fourth nav button and, more importantly, an **opaque cover over the play
surface**. The cover is the feature. A see-through pause renders perfectly and
is simply the cheapest strategy in a falling-block game — unlimited time to read
a stack — so it hides the board rather than dimming it.

**The game owns the flag, never the chrome**, because the game is what stops.
Snake publishes `paused` out of the scene alongside its score, exactly as it
already published its phase; a `useState` beside it would be two owners of one
fact, disagreeing the first time a restart cleared the scene's copy and left the
chrome holding a lid over a snake that had already set off.

Three traps, all of which draw a perfect cover over a broken game, and all three
pinned in `pause-stops-the-game.test.ts` (13 mutations planted, 13 killed):

- **The portal's pause is a SECOND flag, not the same one.** `ctx.onResume`
  fires when a backgrounded tab returns. Sharing one ref means pausing on
  purpose, switching apps, and coming back starts the game under a cover nobody
  dismissed — which is the precise sequence a "put the tablet down" control
  exists to serve. Blocks holds `pausedRef` and `portalPausedRef` and stops on
  either.
- **Every steering control is in the FOOTER, outside the cover.** The D-pad and
  blocks' arrow row stay tappable, and so does the keyboard, so a paused game is
  fully playable behind its own lid unless the game refuses input itself. Blocks
  gates one `accepting()` predicate that all four actions call; snake guards its
  four input surfaces in the scene.
- **Resuming must reset the step clock.** The gravity tick asks how long since
  the last step, and after a two-minute pause the honest answer is two minutes —
  so the piece drops on the first frame back, which is the fall the pause
  prevented. Snake needs no equivalent: `update` returns before touching its
  accumulator, so nothing is banked while it is stopped.

**The level toggle grew a `minWidth` floor for this**, and it is a fix rather
than a tweak. A fourth 56px button leaves the toggle 94 px on a 390 px phone, and
at `flex: "1 1 0"` a flex item SHRINKS rather than wraps — so "Classic" is
clipped inside its own card with no element wider than its frame and no overflow
anywhere to measure. Both halves are needed: `minWidth: 132` and a non-zero
basis. Same defect as
[`a-row-that-grows-with-the-catalog-must-wrap.md`](.claude/rules/a-row-that-grows-with-the-catalog-must-wrap.md),
one component over.

**Do not add one to a turn-based game.** A game that only moves when a hand
moves already pauses itself, and the button would be a control that does
nothing. The test above pins that exclusion by name for memory, sudoku,
reaction, tictactoe and coloring; `reaction` is the sharp case, since pausing a
reflex test pauses the thing being measured. The honest remaining candidate is
**bees**, whose round is a real countdown — and `balloons`, `bubbles` and `frog`
are NOT, despite looking adjacent: their spawners' own comments say an expired
prop costs nothing, so walking away from one costs a player nothing either.

Two games that look adjacent are deliberately NOT on it. **blocks** has `◀ ⟳ ▶ ⤓` —
an action row, not a cross, and its `▼` was removed on purpose (the comment says
the single-step soft drop was fiddly on a phone). **2048** has no on-screen buttons
at all, only swipe and arrow keys. Giving either one a joystick is a control
redesign, not this layout change.

## The Design Bench - where a layout is looked at, dialled and pinned

**Add `?design` to any game URL** and a drawer opens over the REAL chrome - the
emitted header, the real `GameChrome`, the real board - with knobs for every
size those already read. **`#/lab/buttons`** is the tap inspector: tap a part
of a real game page (the purple bar, the page row, the breadcrumb, the game
row, the board) and only that part's numbers come up. `src/lab/design/`, inside
the existing `lab-*` chunk, so a page without the query param fetches none of
it.

**A chrome decision is a NAMED VARIANT in `src/lab/design/spec.ts`**, and
`variant-is-shipped.test.ts` reads `layout.ts` and `GameChrome.tsx` and reds if
either stops matching `SHIPPED`. That test is what makes "ship != approved" a
red build rather than an argument. `SHIPPED` and `G1` are equal in every field
as of 2026-08-23 - the `--uh` gap was closed by the operator amending the
RECORD ("Keep 56, update G1"), the breadcrumb by the code moving back to plain.
**A record may be CHANGED, by the person whose record it is, with the date and
the reason written down. It may not change by ITSELF because something else
moved** - which is what a `{...SHIPPED}` spread did silently until 2026-08-22.

Three invariants that are easy to undo:

- **Three knobs are labelled `records only` on purpose** (`statShape`,
  `restartAt`, `pauseAt`). They need the component to render differently, not
  the page to style differently, so the bench records the choice and does not
  fake the preview. A knob that writes an attribute nothing reads answers
  "yes, previewed" to everyone who turns it.
- **TOKENS go on the BODY, ATTRIBUTES on the ROOT.** `body.screen{--uh:56px}`
  is a declaration ON the body and beats one inherited from `<html>`, so a
  drawer writing tokens to `documentElement` is inert; the candidate CSS
  selects `:root[data-design-*]`, so attributes must go the other way.
  `applySpec` resolves both from the element it is handed.
- **The four `--gc-*` names are NOT declared in `tokens.css`** - measured, that
  would cost 110 B gz - and `token-hygiene.test.ts` exempts them **by name
  rather than by prefix**, so a typo is still an orphan.

**`every-token-has-a-part.test.ts` is what the tap design can lose and the old
slider lists could not**: a token nobody names is a knob that exists, is pinned,
is read by the component, and cannot be turned.

The per-game footers are at **`#/lab/footers`** - what 33 authors did to a
footer nothing governs, a different question from what one shared number should
be.

**A lab screen that declares no scroller is CLIPPED.** `body.app-shell` is
`overflow:hidden`, so a lab route must name both axes; `#/lab/buttons` scrolls
only by accident of `overflowX:hidden`. **And a swipe over the preview is
FORWARDED to the sheet** - scroll chaining walks only the ANCESTOR chain and
the sheet is a SIBLING, so 44% of the screen was inert to one gesture until
2026-08-23
([`a-fixed-shell-cannot-chain-a-gesture-to-a-sibling.md`](.claude/rules/a-fixed-shell-cannot-chain-a-gesture-to-a-sibling.md)).

**The consent bar covers the bottom of any lab screen on a FIRST visit** - a
fresh browser context always sees it, the operator dismissed it once and never
will again, so a probe that leaves it up is measuring a state nobody is in.

`scripts/repro/repro-bench-on-a-phone.mjs` drives all four tabs at 390x844 with
touch and re-runs every guard. The full account - why G1 was already live, the
three phone defects and how each was measured, the sticky/box-shadow/thumbnail
findings, and the two measurement traps that made a real 10px gap read as
`same` - is in [`docs/build-log.md`](docs/build-log.md) § the design bench, and
the rule is
[`a-layout-nobody-can-look-at-drifts-into-a-different-one.md`](.claude/rules/a-layout-nobody-can-look-at-drifts-into-a-different-one.md).
## The game row - difficulty, the score, the stage

**One row, three cells, the same in every game: the difficulty, a main number
and a second number.** `GameChrome` draws it. Until 2026-08-21 nobody could
compare it against anything, and it had drifted into **25 different row shapes
across 33 games** - which is the complaint stated as a number.

**It is a GRID with three fixed tracks** (`1.25 / 1 / 0.85`), and that is what
makes the cells line up across games rather than each being sized by its own
content. Two consequences worth knowing before touching it:

- **The FLOORS are retired.** `--gc-level-min` (132) and `--gc-stat-min` (88)
  are gone and every cell is `minWidth: 0`. Under flex a floor made the row
  WRAP; under a grid it makes the item wider than its track and the row
  overflows a container that clips rather than scrolls - so the cell is sliced
  off at the edge with nothing anywhere to measure. Do not put one back.
- **`compact` no longer sizes a cell to its own number.** That flag is exactly
  what produced the 25 shapes.

**A game with nothing gets no row.** `coloring` has neither a difficulty nor a
number, and three dashes on the one game that deliberately keeps no score would
be the opposite of the point. The pad counts the DIFFICULTY as a cell - keying
it on the stats alone left `finddiff` (two numbers, no difficulty) at two cells
in a three-track grid, a row that does not wrap, does not clip, and is simply a
different row. It was the only game to differ and it surfaced only because the
shape count was VERIFIED rather than trusted.

**No glyph in a number card**, because the glyph is what costs the third cell:
measured across all 33 games, with it sudoku's `42/81` ellipsises inside its
own card - nothing overflows, nothing is wider than its frame, and the number
is simply unreadable - and without it nothing clips anywhere. It is a token
(`--gc-icon-display`) rather than a deleted element, so the bench can put it
back and show the trade instead of arguing it.

**The cards carry the game's own hue**, `color-mix(in oklab, var(--g) 16%,
var(--surface))`, declared in `DOCUMENT_CSS` behind an `@supports` with the
plain surface declared first and unconditionally - so a browser without
`color-mix` gets a readable card rather than a transparent one, and the
standalone bundle (which emits no `DOCUMENT_CSS`) falls back the same way.

**`--g` is on the BODY as well as the header, and that is load-bearing.** The
panel is a sibling of the header several levels down, so a tint resolving `--g`
at body level would have found nothing there and painted all 33 games one
indigo - the same plausible-picture-no-error failure `layout.ts` already warns
about for the header bar, one element over. Both copies come from the same
`chrome.ground` in the same call, so they cannot disagree.

**The side gutters were cut in half.** Measured on the artifact at 390px, the
panel's 8px plus the head's 12px spent **40px - 10.3% of a phone** before a
card started. The panel's horizontal padding is gone (it is edge-to-edge on a
phone anyway, `.box` drops its radius under 720px) and the head's is 10, so the
row went **350 -> 370px**. Note the trap in measuring this: a desktop probe
reports the viewport 15px narrower because of its scrollbar, and that 15px is
not a gutter - kill the scrollbar before reading any of these numbers.

**Every number in the row is a token whose FALLBACK is the shipped value**
(`var(--gc-value, 18px)` and eight more), and every part of a cell carries a
class - `gc-row`, `gc-cell`, `gc-level`, `gc-stat`, `gc-icon`, `gc-label`,
`gc-value`, `gc-record`, `gc-slot-empty`. A token can change a size; it cannot
move a label under its number or drop a glyph, and those are the decisions
being asked about - so a candidate style is a STYLESHEET the bench injects into
a real game page, never a drawing beside one.
`panel-tokens-are-shipped.test.ts` reads each fallback back out of the
component, through all three shapes a fallback comes in: a px literal, a
`${TAP}` const, and a `var(--radius-2)` a whole file away.

Dial it at **`#/lab/buttons` -> the game row**, which also measures
what the row actually does - how many lines, and which text is ellipsised
inside its own card while every overflow check reads clean.


## Rewards, the World, and speech

**The economy.** A game reports WHAT HAPPENED and never says what that is worth.
`ctx.rewards.grant({ reason, tier?, level? })` takes one of three reasons
(`level_complete`, `milestone`, `personal_best`) plus an optional tier
(`easy`/`medium`/`hard`), and `src/sdk/economy.ts` alone decides the payout: 3/5/8
coins by tier, a flat 1 coin for a milestone, and one star for every reason that
is not a milestone. Coins are spent. Stars are a trophy count that is never spent
and never lost, and they also gate the premium shop items (`requiresStars`). Full
rule and traps: [`.claude/rules/rewards-economy-convention.md`](.claude/rules/rewards-economy-convention.md).

**Add-only by design.** `RewardsPort` has no `spend()`. A game can only ever put
coins in. Spending happens in exactly one place, the World screen, against the
`wallet` singleton, so no game (and no bug in a game) can take a player's coins.
The profile persists at `ellaz:profile:v1` behind `migrateProfile()`, which
coerces anything it is handed (missing key, truncated write, hand-edited junk, a
future shape) into a usable profile and must never throw.

**The win moment.** `winMoment(ctx, {...})` from `@shared` is the canonical win:
it grants and persists FIRST, then plays sound, haptics, confetti and the coin
flight to the wallet chip, then fires analytics. The cosmetic half is wrapped in
try/catch, so a thrown animation can never cost a kid a coin. Confetti defaults
ON; endless-game milestones pass `confetti: false`.

**Scores.** Same shape as the economy, one layer over: a game reports a **value
and a unit** (`points`/`ms`/`moves`) and `src/sdk/economy.ts`'s sibling
`src/sdk/score.ts` decides how that ranks — `points` high, `ms` and `moves` low.
**There is no `direction` parameter and there must never be one**, or a game
could report `ms` as "higher is better" and order its own leaderboard backwards.
The record rides the existing win as `winMoment(ctx, { …, score: { value, unit,
board } })`; `ctx.score` is add-only, with no `clear()`, exactly like
`ctx.rewards`. **22 of the 23 games have one**, and **coloring gets none, ever**
— ranking a child's drawing is the opposite of this platform's premise. That is
the whole roster: every other game keeps a record, so a missing one is a bug
rather than a gap. (evolve carries one without a line of its own — it renders
`n2048`'s component under its own game id, so it gets its own storage namespace
and its own board for free.)

**The unit is also declared, in `meta.ts`, because only the VALUE is persisted.**
`ellaz:sudoku:score:easy` holds a bare `12750`, and nothing reading it back can
tell milliseconds from points — which is the difference between fast winning and
slow winning. So `scoreUnit` lives on the DOM-free meta, the one place the
catalog can read without importing a renderer, and
`score-unit-declared.test.ts` reads each game's own source and requires the two
to agree. A unit copied to the wrong game type-checks, renders, and orders that
board backwards for exactly the games using it, so the pin is the whole point;
it was mutation-proved on sudoku and memory. It follows a borrowed renderer
rather than hardcoding one, so evolve resolves through `n2048` with no special
case.

What each game records is the honest answer to "how well did that go", not one
imposed shape: a **time** where a clock exists (sudoku, minesweeper), **moves**
where the game already counted them (memory), **how far up an endless ladder**
a run got (balloons, bubbles, frog, sequence, shadows, sortsize, vanish, hidden,
finddiff), and for tictactoe the **longest run of wins** against that difficulty's
AI. Two of those deserve their traps written down: finddiff records cumulative
scenes cleared rather than the "Level" it displays, because Level only bumps
after a full pass and would leave most players a permanent record of 1; and
tictactoe's hard AI is unbeatable minimax, so its record may honestly stay empty.
`board` scopes a record to a difficulty wherever the scales differ
(6 pairs vs 10, a 4×4 animal sudoku vs an expert 9×9). The six games that kept
their own `best` before this existed are on the default board **on purpose**, so
their players' records survived; a read-through `legacyKey` shim carries those
old keys, and it has a kill date. Full rule, the board table, and the `ms`-is-a-
duration trap: [`.claude/rules/score-contract-convention.md`](.claude/rules/score-contract-convention.md).

**The World** (`/world/`) is a room and a character with **11 slots** (wall,
floor, rug, window, light, plant, poster, toy, outfit, hat, pet) holding **82
items** in original inline SVG. Read those two off `CATEGORIES` and the
catalogue rather than off this line. An item the player cannot afford or has
not unlocked answers with a gentle shake and says nothing, because a refusal is
not an error. Every category ships exactly one free `price: 0` default (pinned
by `world/items.test.ts`), so the room is complete before a player has earned
anything. **Item ids are persisted in `profile.owned` forever: never rename
one, never reuse one.**

**A tap PREVIEWS. A button BUYS.** Tapping a shop card used to buy the item on
the spot, which was tolerable at 27 items and wrong at 82: the picture on a
132px card was all a child had to go on, and the only way to see a hat properly
was to own it. A tap now swaps that one slot into the big room above and marks
the card with a dashed ring; a single named button under the room says exactly
what will happen next - **Buy · 30**, **Place**, **✓ Placed**, or the
requirement that is holding it. There is still no confirm dialog: buying places
the thing too, so it is one press and one visible result.

**No disabled buttons, and that is a rule rather than a style.** A locked or
unaffordable item stays pressable and answers with the same gentle wiggle the
cards always gave. `Button`'s `disabled` is reserved for actions that are
genuinely impossible, and "you have not earned this yet" is not one - it would
be the first fail-punishment in the app. The shake lands on the BAR, because
the bar is what was pressed. The bar's height is reserved whether or not it is
showing, or the grid jumps 74px under the finger that just tapped it.

**Three things the expansion could not do naively, all of them payload.**
`items.ts`, `art.tsx` and `Scene.tsx` are pinned to the SHELL - Home draws the
child's real room in its world card - and the first visit had **718 B gz of
headroom**. Measured on two arms of one tree: the 52 new drawings are 6.8 KB gz
and their 52 catalogue ROWS another 2.4 KB. Both now live in one lazy
`world-art` chunk (`artRest.tsx` + `itemsRest.ts`), and the whole change costs
the first visit **+436 B gz**.

The rows are the half that surprises, and the second trap is one further out:
a STATIC import of that chunk from `World.tsx` costs a first visit nothing and
charges every visitor who opens a **game**, because `PageApp` imports `World`
and the shelf lands in `page` - measured 19.3 → 28.5 KB gz on a game page,
**+47%**, to carry pictures of shop items no game will ever draw. So `World`
reads a catalogue that GROWS: `shopItems()` in `roomArt.ts` returns 33 rows
until the chunk lands and 82 after, and the screen re-renders on that one event.
`shop-previews-before-it-buys.test.ts` pins both directions - the shop may not
read the shell half, and it may not import the lazy half statically - because
each fix is the other's regression. Six mutations planted, six killed.

**A missing drawing is a legal state, not an error.** `roomPiece` falls back to
the slot's free default for any art it has not been handed, and `artFor`
resolves an id the shell has never heard of by that id's own prefix - so the
room on the home screen can be briefly INCOMPLETE and is never WRONG. That
leans on `art === id` and `id` starting with `<category>_`, true of all 82 rows
and pinned, so a row that breaks it is a red build rather than a wall that
quietly stops drawing for the one child who bought it.

**Every free default must stay in the SHELL half**, since it is the fallback
everything else falls back TO; in the lazy half it would be a fallback that is
itself missing. Same for every pre-existing row: a returning player has those
equipped already.

**The player's name.** Every player is called something — one adjective plus one
animal, drawn from a pool of 16 × 20 in `src/sdk/names.ts` and shown on the World
screen with a reroll button. **No child ever types a name**, which removes
moderation from this platform entirely: there is nothing to review because there
is nothing anyone can type. The profile stores the two **word ids**, never a
rendered string, so one player has one name in both languages. Hebrew adjectives
agree with their noun and follow it, so every noun declares a gender and every
adjective carries both forms — `זריז נמר` is the wrong order and `לטאה זריז` is
the wrong gender, and an English-shaped pool makes both mistakes at once. **Word
ids are persisted forever: never rename one, never remove one**, exactly like the
shop item ids. Full rule and the rest of the traps:
[`.claude/rules/name-pool-convention.md`](.claude/rules/name-pool-convention.md).

**Speech** (`ctx.speech`) is Web Speech TTS for Hebrew and English letters and
words. Zero assets, zero network. Voices load ASYNCHRONOUSLY, so subscribe with
`onAvailabilityChange()` rather than reading `available()` once; call `unlock()`
inside a user gesture for iOS; it follows the global mute; and nothing it does
ever throws or rejects. It is ALWAYS supplementary, never the question itself:
see the hard rule at the top of `src/sdk/speech.ts`.

## Carrying on where you left off

**Two layers, deliberately separate, because they have different lifetimes.**

**The level, in all 20 games with a level toggle.** `useRememberedLevel` from
`@shared` returns a `useState`-shaped pair whose setter persists, and it
VALIDATES the stored id against the game's own option list rather than trusting
it — `GameChrome` finds the current level with `findIndex`, so an id no longer in
the list resolves to `-1` and **the toggle disappears**, leaving a game that
plays perfectly with no way to change difficulty. vanish shipped this by hand
first; it now uses the hook, under the same key with the same values.

**The board, in the six games with a position worth returning to** — sudoku,
minesweeper, 2048, blocks, memory, coloring. evolve inherits it through 2048's
renderer under its own game id, so it gets its own namespace free. The reflex and
endless games get level memory only: resuming a reaction test is meaningless.
**Resume is silent** — no dialog, no reading required — and the restart button
already in `GameChrome` is the way to a fresh board.

**`ctx.session` is the third policy port**, after economy and score. A game
reports WHERE IT IS; `src/sdk/session.ts` alone decides whether a stored position
is still usable — version, age, a 64 KB cap and the game's own shape check, all
failing to `undefined`, the same answer as "never played", so a game needs one
code path for both. A wrong answer here does not throw: it renders a plausible
board the rules can no longer explain.

**A snapshot carries more than the board, and both extras are load-bearing.**
Every **latch recording a reward the run already collected** — 2048's `won` and
`bestFired`, blocks' milestone step — because without them leaving the game is a
way to be **paid twice**: reach 2048, walk out, come back, and the next merge
grants the win again, once per resume, forever. And for a timed game, the
**clock** (`useGameTimer({ initialMs })`), or every abandoned board becomes a
personal best nobody earned. `reset()` still goes to zero; a restart is a new run.

**A state only a TIMER can leave must never reach the disk.** Memory's mismatch
sets `lock: true` and the renderer clears it 850 ms later; a snapshot caught in
that window restores with no timer behind it and `flip()` then refuses every
card — a board that looks completely normal and is permanently unplayable.
`settle()` in `memory/logic.ts` runs at SAVE time, not load time, so the disk can
never hold that state.

**Sessions are device-local by construction.** `ellaz:<gameId>:session` cannot
match the anchored `ellaz:<game>:score:<board>` pattern `records.ts` validates,
so a backup code moves coins and records and never a board mid-play.

Full rule, including why the level is stored as an ID and never an index, and why
the obvious verification control is undone by the feature itself:
[`.claude/rules/session-snapshot-convention.md`](.claude/rules/session-snapshot-convention.md).

## Engine choice — settled, but read the caveat before quoting a number

**Phaser 4 stays.** Three tournaments compared it head-to-head against real
alternatives on an identical game; the second used a 660-tile scrolling
platformer with physics, enemies and art, and every arm was proven to run the
same simulation via a cross-language checksum before any number counted.

**The operator's eyeball verdict INVERTED the fps ranking** (2026-08-01). The
numbers are correct; they measured the wrong quantity. The ranked workload was
900 sprites against a game that runs ~50 (a batching test a pure renderer wins
by construction), and every probe ran headless at 60 Hz — the one refresh rate
at which the real defect could not appear. **So do not quote the fps/jank column
as a proxy for how a game feels.** Payload, time-to-interactive, integration
cost and dev cost were measured on real artifacts and remain sound — and are
**re-auditable**: the raw rows live in `docs/engine-tournament/data/` (87 round-2
rows, round 1, round 3, plus 12 render screenshots in `evidence/`). Every
published PC cold-TTI figure was re-derived from them to the digit on 2026-08-01.

Three eyeball runs settled it — a named ranking, a blind four-arm re-run, and a
blind three-round pairwise of the apparent winner against Phaser. The pairwise
came back **1-1-tie with no symptom reported**, refuting the one prediction the
earlier runs supported. **Excalibur, Phaser and Kaplay are indistinguishable on
feel; only Pixi is reliably last** — the exact arm the fps table rated joint-
first. A four-way ranking forces an order even when the arms are level, and
that is all "excalibur first" ever was.

**So Phaser stays, and the engine question is closed**: it ties on feel and wins
on dev cost, ecosystem and jank, and its 375 KB is paid once across all ten
games. The real deliverable was never an engine — it is the display-rate fix and
the render interpolation, which protect every game regardless of engine. Full
account, the blind protocols, the three eliminated mechanisms, and a published
claim that turned out to be false:
[`docs/engine-tournament/EYEBALL-VERDICT.md`](docs/engine-tournament/EYEBALL-VERDICT.md).

**The trap that found it applies to every game we ship**: a fixed 60 Hz
simulation step on a 120 Hz display freezes every second frame. See
`.claude/rules/fixed-timestep-must-match-display.md`. No current game is
exposed — snake steps at a game speed, and the rest are DOM/event-driven.

| Engine | Verdict |
|---|---|
| **Phaser 4** | **Ours.** 60 fps / 0% jank, mounts as a lazy chunk, reuses `logic.ts` verbatim. Its 379 KB is **paid by snake alone** — snake is the only game that imports it (`grep -rln 'from "phaser"' src/`, verified 2026-08-02). It is lazy and precache-excluded, so it costs nothing on a first visit, but "shared across all games" was never true. |
| PixiJS 8 | Credible alternative — same 60 fps, loads 256 ms faster at 36% of the bytes, but it is a renderer: loop, culling and pooling are hand-rolled. Reach for it only if one canvas game is load-critical. |
| Kaplay | **The pick for a static-screen game** — a third bake-off on a match-3 put it ahead of Phaser on desktop and tablet (60 fps / 0.2% jank · 59 fps / 0.0%) at 72 KB and 684 ms, a fifth of Phaser's bytes. On mobile the frame rate ties, but it janks far less (0.5–3.5% vs 5.6–9.3%). Still out for **scrolling** games: no culled tilemap, and it janks every frame on mobile there. |
| Excalibur | Out — but on cost, not on feel. A blind pairwise against Phaser came back 1-1-tie with no symptom reported, so its apparent feel win was a four-way ranking forcing an order between level arms. Slowest JS load of the four (1,916 ms PC / 2,910 ms mobile), though the second-smallest payload at 129 KB. Its 21 fps / 100% jank came from the disqualified stress workload — don't quote it. |
| Defold | Out on integration, not merit — fastest renderer measured, but 3.0 s TTI, iframe-only, can't reuse `logic.ts`. |
| Godot 4 | Out for web. 22.6 s to interactive — fails CrazyGames' 20 s time-to-gameplay bar. Re-tested with idiomatic rendering and still 14 fps / 100% jank, so this is not an implementation artefact. |

Full evidence: **[`docs/engine-tournament/`](docs/engine-tournament/)** — verdict,
both dossiers, 294 raw measurement rows, the determinism probe and per-arm
renders. **Anything 3D is unevaluated** — all six arms were 2D; that would need a
separate three.js / Babylon / PlayCanvas bake-off.

## Non-negotiable conventions

- **Pure logic core.** All rules live in `games/<id>/logic.ts` with zero DOM/Phaser
  imports, driven by an injectable `rng` for determinism. Test the logic, not the DOM.
- **Games talk only to `GameContext`** (`@sdk`) — never to portal internals. The
  lifecycle + ads shape matches the **Poki + CrazyGames** union so games can list on
  those portals later with no rewrites.
- **A control is either GAME or PLATFORM, and they never share a bar.** Home,
  the wallet, sound and full screen are platform; difficulty, restart, pause,
  share and the game's own numbers are game. **Share is the sharpest case and
  answers the test cleanly**: sharing THIS game means nothing on the room or
  the boards, so it is emitted by `gamePage` alone rather than by
  `screenChrome`, which serves all three. It is a button, so it goes on the
  utility row. The test is one question: would this
  control still make sense on the World screen or the Boards? Mixing the two
  is how this page ended up with four ways home and two things called "Level"
  8px apart. Inside the game family there is a second split, and it is about
  WIDTH rather than meaning: **buttons go in the UTILITY ROW above the stage,
  difficulty and numbers in the panel.** A fourth 56px cell overflows the
  panel's row on a 390px phone, and which games wrap is a function of GAME
  STATE (a compact cell is sized by its own text), so it cannot be settled by
  choosing a better constant - read it off `#/lab/buttons` -> the game row
  rather than off any number written down.
  **The home bar is ONE LINE at 390px and up, and it took four changes.** The
identity block was `flex: 1 1 auto` and GREW to 310 of 358px to hold a ~60px
word, which is why removing controls from it changed its height by exactly
zero. Arm P, the operator's pick of four drawn on the real page: the block
stops growing, the chip shows COINS only, the wordmark is 18px on a phone, and
the round controls are 40px. **No single one does it** - measured one variable
at a time at 390px, the first three each leave it at two rows - so removing any
one is a regression rather than a tidy-up. 360px is still two rows on a real
wallet, and 320px is two on every arm anyone measured; that is the honest
finding, not a tuning failure.

**The streak chip is NOT in the home bar, and its absence is load-bearing
rather than cosmetic.** Operator ruling 2026-08-25, "we dont need it there" -
and measuring it turned a preference into a defect: `DailyChip` renders null
until there IS a streak, so it was outside every arm ever measured. Seeded with
a five-day streak the shipped arm-P bar is **123px, two rows**, and without the
chip it is **76px, one row**. A player with a streak was getting the two-row bar
the whole pick was about. It is a removal from ONE BAR and not a deletion: the
daily card below still carries the streak and the game page's header still draws
it `bare`, and `home-header-must-wrap.test.ts` asserts both sides, because a
chip that renders nothing on a first visit makes the two indistinguishable by
looking.

**`--hpill` is NOT a smaller `--tap`**, and the distinction is load-bearing:
`--tap` is the platform target for every control in every game and the age-five
target is `--tap-kids` at 64px, so the mock's global shrink would have taken
8px off every button a child touches. It is 40px on a phone and `var(--tap)`
from 560px up, in `global.css`, the only file here that can carry a media
query - and the wordmark's size is a CLASS for the same reason, because an
inline `fontSize` beats any rule and would make the query dead code that reads
as present.

**The three round controls carry the CARD treatment, and that is a contrast
defect rather than a taste call.** `--surface-2` on the page background is
1.37:1 on night and **1.02:1 on market**, against a 3:1 WCAG floor for a
graphical object - so in daylight they were not quiet buttons, they were
invisible ones, and the bug cannot be seen in the dark theme most of this work
happens in. The fill is the CARD one and the hard offset is what every DS
`Button` and the wallet chip 8px away already carry: the pill had drifted out
of the design system, the system did not lack an answer.

**`repro-header-pills-are-round.mjs` measures what no source test can.** All
three controls share one style object and that object carries
`borderRadius: var(--radius-pill)` - every one of those assertions was green
while a mock rendered the globe as a hard-cornered slab, because the language
button is wrapped in a `border-radius: 0` positioning div and a selector
walking the header group catches the WRAPPER. The gate asks whether an element
is **painted** before demanding a shape (a transparent wrapper is not a defect,
it is a defect waiting) and refuses to report OK on fewer than 8 controls, since
every assertion in it passes vacuously over an empty selector. It also fails a
row of two different heights, which is how the 48px chip beside 40px pills was
caught. Full account: [`docs/build-log.md`](docs/build-log.md) § the home bar on
one line.

**Mute travels WITH the wallet, at the far edge** (`margin-inline-start:auto`;
  it sat in the dead centre of the phone bar for as long as that bar existed).
  **The breadcrumb is PLAIN TEXT**, on the operator's call 2026-08-23.
  **The screen's NAME is hidden on a phone and never removed from the
  document** - a media query and NOT an emitter branch, so a crawler still
  reads it; responsive hiding is not cloaking, and not emitting it is a
  different thing. **A platform control is on EVERY screen**: one `screenChrome`
  bar serves the game, the room and the boards, pinned by
  `screen-header-is-platform-only.test.ts`.
  Two mechanics that are easy to undo by accident: the emitted button is
  `hidden` until a game claims it (`claimRestartSlot()` in `src/ui/gameTools.ts`),
  without which the standalone bundle ships with no restart and no gate here
  can see it; and `gameTools.ts` is pinned to the `page` chunk, because the
  `src/ui/` catch-all sends it to the SHELL and `assert:payload` reds 81 B over.
  Every measurement behind all of this - the 33-game wrap counts, the one-pixel
  sudoku case, the mute 160 -> 220, the "Sudoku occurs 9 times" check - is in
  [`docs/build-log.md`](docs/build-log.md) § chrome.
  [`.claude/rules/game-controls-and-platform-chrome-never-share-a-bar.md`](.claude/rules/game-controls-and-platform-chrome-never-share-a-bar.md)
  · [`.claude/rules/space-between-spreads-whatever-survives-the-media-query.md`](.claude/rules/space-between-spreads-whatever-survives-the-media-query.md)
- **Wins go through `winMoment()`** (`@shared`), never a hand-rolled
  celebrate-plus-grant block. And **games report reward REASONS, never amounts**:
  `grant()` takes `level_complete`/`milestone`/`personal_best` plus a tier, and the
  earn table lives in one file so 30+ games cannot each invent their own
  economics. `analytics.levelComplete()` is NOT a win signal (see the rewards rule).
- **Speech is supplementary, never the question.** A voice can be present, be
  selected, fire `onend` on time and still emit no sound, and that failure is
  undetectable from JavaScript. A letter game SHOWS the letter and offers a speaker
  button that says it; it never asks "tap what you hear". If removing speech would
  make the game unplayable, the design is wrong.
- **`@ui` may import `@i18n`.** Sanctioned and deliberate: `DifficultySelector`
  takes a `locale` and renders bilingual labels, which is precisely what removed a
  locale ternary from every game with levels. i18n is a leaf module with no
  dependencies of its own, so this arrow can never become a cycle. Do not "fix" it
  back into 22 copies of `locale === "he" ? ... : ...`.
- **No external network requests from games** (Poki rule). Wrap all `localStorage` in
  try/catch (incognito-safe). Unlock audio on the first user gesture.
- **Input:** Pointer Events only (`pointerdown/move/up` + `setPointerCapture`);
  `touch-action: none` on play surfaces; `keydown` state map for desktop.
- **Nothing a game draws is selectable**, and a game needs no line of its own for
  that. `.ellaz-game-stage` on `GameHost`'s mount — the one element every game
  lives inside — carries `user-select: none` **plus the `-webkit-` prefix** (iOS
  Safari before 17 reads only the prefixed one) and `-webkit-touch-callout: none`
  (long press is a game gesture here; minesweeper flags a mine with it). It sat
  on `.ellaz-play-surface` before, which is only the BOARD — measured on the
  artifact at 390px, a drag across sudoku's header selected `"Level\nHard\n5/6"`
  while the same drag across the board selected nothing, because the level
  toggle, the stat row and the footer are SIBLINGS of the play surface.
  **CSS is only half of it**: a highlight made on the ~900 words of prose under
  the frame survives every gesture and stays drawn across the board, since a
  `user-select: none` region cannot take a selection off one that has it.
  `portal/selectionDismiss.ts` clears that on the first pointer down on the
  board, and is pinned to the `page` chunk beside `GameHost` rather than left to
  the `src/portal/` catch-all that would ship it to every first visit. Both
  defects, both controls and the before/after are
  `scripts/repro/repro-board-text-selection.mjs`.
- **Responsive:** size boards with `min(<vw>, <vh>, <cap>px)` so they fit portrait,
  landscape, and tablet. `GameHost`'s mount is a scroll container with `minHeight:0`
  (flexbox scroll trap) — tall games scroll, never clip.
- **Kids games** (`ageBand: "kids"`): **tap-completable; drag optional.** Drag is
  never REQUIRED. Four of the games coming next (jigsaw, shape-fit, build-a-house,
  build-a-word) do use drag, and every one of them must also be finishable by
  tap-select then tap-target. Two reasons, and the second is the load-bearing one:
  a five-year-old on a phone, and anyone on assistive input, cannot reliably hold a
  sustained pointer gesture; and a tap path means the wave ships even if the shared
  drag utility slips. Plus ≥2×2cm targets, icon+audio navigation (no reading
  required), instant restart, no fail-punishment.
- **Analytics is anonymous + kid-safe** (COPPA internal-operations): PostHog
  anonymous-events mode only — **never `identify()`**, no PII, no session replay, no
  autocapture, no behavioral ads. Analytics failure must never block gameplay.
  PostHog is **lazy-loaded after first paint** (`src/sdk/analytics.ts`) behind a
  bounded queue (cap 50, drop oldest); a failed import drops events silently.
  **Adding a chunk is three changes, not one** — the dynamic import, a NAMED
  `manualChunks` branch, and a matching `globIgnores` entry. The precache glob
  sweeps `**/*.js`, so skipping the third leaves the payload unmoved behind a
  green build. `npm run build:check` enforces it and runs in both deploy
  workflows. See `.claude/rules/precache-glob-sweeps-new-chunks.md`.
- **Legal:** original art and names only. No trademarked names/trade dress (no
  "Tetris"/"Wordle"/"Waldo"; change shapes/colors/names for any cloned mechanic).

## Add a new game (~30 min)

1. `src/games/<id>/meta.ts` - the `GameMeta` (id, bilingual title, emoji, color,
   ageBand, category, orientation, renderer, and **`scoreUnit`** if the game keeps
   a record). Keep it **DOM-free**: `catalog.ts` imports it statically, so the home
   grid renders without pulling React, Phaser, or any game code into the shell
   bundle. `scoreUnit` must match the `unit:` the renderer reports and
   `score-unit-declared.test.ts` enforces that, because only the VALUE of a record
   is persisted and never the unit - so the leaderboards read the unit here to
   decide whether fast or slow wins, and a wrong one orders that board backwards
   in silence.
2. `src/games/<id>/logic.ts` - pure rules + `logic.test.ts` (write tests first).
   Take an injectable `rng` as the LAST parameter defaulting to `Math.random`, and
   use `mulberry32`/`seedFrom`/`shuffle` from `@shared` rather than a private copy.
3. Renderer:
   - **DOM:** a `<Game>.tsx` taking `{ ctx }`, then `index.ts` =
     `reactGame(meta, ctx => createElement(Game, { ctx }))`.
   - **Canvas:** a `Phaser.Scene` + `index.ts` exporting a `GameModule` that boots
     `new Phaser.Game({ parent: ctx.mount, scale: { mode: Phaser.Scale.FIT } })`
     (see `games/snake`).
4. On a win, call `winMoment(ctx, { reason, tier, level, at })` from `@shared` -
   from the event handler, never inside a `setState` updater. Render the level row
   with `<DifficultySelector>` from `@ui`, and hold the level in
   **`useRememberedLevel(ctx, ids, fallback)`** rather than `useState` so the game
   reopens on the level last chosen - it is the same `[value, set]` shape, and the
   setter persists. Everything a hardcoded first-level literal then feeds
   (`useState(() => newRound("easy"))`, `ctx.score?.best("easy")`,
   `levelStart("easy")`) must read the restored level instead, or the chrome says
   "Hard" over an easy board. If the game has a position worth returning to, add
   `ctx.session` + `useGameSession` as well - see § Carrying on where you left off,
   and read the rule first, because the snapshot has to carry every reward latch.
5. Register in **two** places, which are deliberately different lists:
   `src/portal/games.ts` holds the ordered roster (`import { meta as <id> }` plus a
   row in `GAMES`), and `src/portal/catalog.ts` holds the lazy loader
   (`<id>: () => import("../games/<id>/index")`). The ORDER lives in one file and
   the loaders in the other because the build-time page emitter reads the roster
   and must never touch game code - a stray `import("../games/snake")` at config
   time would load Phaser inside `vite.config.ts`. `catalog.test.ts` is
   property-based with a count ratchet, and `build.test.ts` asserts the two lists
   stay identical, so a well-formed entry needs no test edit.
6. `src/content/games/<id>.ts` - the page's words, **once per `PAGE_LOCALES`**
   (Hebrew, English, Spanish and French today), plus a `provenance` row for every number
   the prose quotes. See the next section.

**A game cannot ship in fewer languages than the site has, and that is enforced
rather than remembered.** Measured 2026-08-12 by planting a game with a `he|en`
title and no content file at all: `tsc` said `Property 'es' is missing in type
'{ he: string; en: string; }'`, naming the file and the line, and
`content.test.ts` said `games in the catalog with no page: probegame`, naming
the game. Two gates, two different failure shapes, neither of which a reviewer
has to notice. The probe is restorable and sha256-verified; the tree carries
none of it.

So step 6 is not optional and there is no half-done state: a game with two
languages of prose does not compile, and a game with none does not pass tests.
That is the whole "every new game is multilingual by construction" guarantee,
and it costs a new game exactly one more `es:` arm.

The SDK, UI, juice, i18n, PWA, rewards, and analytics come for free. **A new game
almost certainly needs no engine**: 22 of the 23 render as React over a pure
`logic.ts`, and snake is the only one importing Phaser (`SnakeScene.ts`, the sole
hit for `from "phaser"` in `src/`, re-verified 2026-08-13). Phaser sits in its own
lazy `vendor-phaser` chunk - "cached across all canvas games" was never true,
because snake is the only canvas game.
**A web page PER PAGE LOCALE comes for free as well** - the route table is
derived from the roster and `PAGE_LOCALES`, so `/games/<id>/`,
`/he/games/<id>/`, `/es/games/<id>/` and `/fr/games/<id>/` are emitted,
sitemapped and gated the moment step 5 lands. Read the count off
`PAGE_LOCALES`, not off this sentence - it has been wrong twice. Missing step 6 is a red build, not a thin page.

**Two gates key on a DIRECTORY CONTAINING `meta.ts`, not on registration**, so
"I haven't registered it yet" does not keep a half-built game out of their
population: `src/ui/game-art.test.ts` wants a scene in `src/ui/gameArt.ts` and
`src/ui/game-panel-clears-widest-board.test.ts` wants a renderer contributing a
board-sizing expression. Both go red the moment `src/games/<id>/meta.ts` exists.

That is the gates working rather than a nuisance - a game with no picture is not
finished, and the art gate exists *because* 21 games once shipped as one OS emoji
on a colour block while every other gate reported green. But it does mean **a
game cannot be built in parallel slices that each keep the suite green.** Either
land `meta.ts`, the art scene and the renderer together, or expect those two red
until the set is complete. Discovered 2026-08-13, building two games at once.

## Every game has a real web address

The site used to be one document. It is now **165**: `dist/index.html` (still the
app, head-enhanced in place and `emitted: false` in the manifest) plus the **200
written by `src/build/**`** inside a Vite plugin — 199 pages and `404.html` — so
`npm run build` cannot skip them and neither deploy workflow can forget. The
sitemap carries 200 URLs, which is every route except the `noindex` 404. Read
those off `dist/pages.json` rather than off this line; it said 85 for days beside
a 144 in the same sentence, it said 144 for days after the category pages
landed, and it said 164 until four more games arrived.

| URL | What it is |
|---|---|
| `/` | the application, and now also a document. **ENGLISH since 2026-08-14.** The emitter adds head tags AND the English home body; it never overwrites the file |
| `/games/<id>/` · `/he/…` · `/es/…` · `/fr/…` | every game x every page locale, ~900 words each (33 games x 4 languages on 2026-08-18 — read both counts off the roster and `PAGE_LOCALES`, not off this line) |
| `/games/<category>/` · `/he/…` · `/es/…` · `/fr/…` | a landing page per game GROUP, ~250 words each (5 groups x 4 languages on 2026-08-21 — the group list is DERIVED, see below) |
| `/he/` · `/es/` · `/fr/` | the home screen in that language — **the app**, emitted as a shell (see below) |
| `/world/` · `/he/world/` · `/es/world/` · `/fr/world/` | the room |
| `/boards/` · `/he/boards/` · `/es/boards/` · `/fr/boards/` | the leaderboards (two screens - see below) |
| `/404.html` | bilingual, `noindex`, and `ErrorDocument`-wired on Hostinger |
| `robots.txt` · `sitemap.xml` · `llms.txt` | emitted, not in `public/` (see below) |

**English took the bare URLs on 2026-08-14, and Hebrew moved to `/he/`.** One
constant did it — `CANONICAL_LOCALE` in `src/i18n/locales.ts` — because
`localePrefix` gives the canonical language the bare path and every other
language a directory. Moving it moved every English document up to `/…` and
every Hebrew one down to `/he/…` — 31 each on the day, and that number moves
with the roster — and rewrote every canonical, `og:locale`,
JSON-LD `inLanguage`, sitemap row and share card with them. `DEFAULT_LOCALE`
was already English, so `x-default` did not move; the two constants are now
the same language and both are kept, because they answer different questions
and were different for months.

**Only ONE side of that could be redirected, and the asymmetry is the whole
SEO cost.** `/en/*` → `/*` is a 301 in `deploy/hostinger.htaccess` (plus the
slashless `^en$`, which used to be free from `DirectorySlash` and is not any
more, `dist/en/` being gone). The Hebrew side has no such rule and must never
get one: `/games/snake/` still answers 200 — it is the *English* page now — so
a redirect there would send every English reader to `/he/`. Hebrew's new
addresses simply have no history to inherit; Google recrawls the bare URL,
finds English, and follows the hreflang cluster. That is written down in the
`.htaccess` beside the rule so nobody later "fixes" the missing half.

Three runtime fallbacks moved with it and none is a literal any more:
`storedLocale()` (a first-time visitor), `redirectLegacyHash`'s default (an old
`#/game/snake` link now lands on the bare URL, so it needs no second hop), and
`speech.ts`'s unnamed-locale default. `index.html`'s `lang`/`dir` are **rewritten
at build time** from `CANONICAL_LOCALE` rather than reviewed — the file cannot
import anything, so a stale literal there is a document whose prose is English,
whose `lang` says Hebrew and whose layout is mirrored, all while rendering
perfectly. Cost on the artifact: **89,454 B gz of 90,000**, up 132 B, because
the same home screen is more bytes in English than in Hebrew.

**`/` carries the English home as real markup, because no answer engine runs
JavaScript.** It used to ship a 29-byte body - `<div id="root"></div>` and
nothing else. Googlebot renders JS so it saw the grid eventually, but GPTBot,
ClaudeBot and PerplexityBot fetch raw HTML and move on, so the site's canonical
entry and `x-default` target was a blank page to ChatGPT, Claude and Perplexity
for months, while `/en/` - an emitted document - was fine. Nothing caught it:
every gate here reads `dist/`, and `assert-pages.mjs` deliberately excludes `/`
because it is the app rather than an emitted page. The one page with no content
was the one page the content gate could not see.

`transformIndexHtml` now injects `homeShellBody()` as a **sibling before
`#root`** and `main.tsx` removes it on mount - the `#game-poster` arrangement,
for the same reason. It is a faithful mirror of what the grid renders, so it is
progressive enhancement rather than cloaking, and it is removed rather than
hidden so there is never a second permanent copy of every game link. Measured
on the artifact, served and curled as Googlebot: **0 words -> 132, 0 links ->
23, 0 h1 -> 1, for 867 B gz** (86,004 -> 86,871). The link count is derived
from the roster, so a new game joins it without an edit.
[`.claude/rules/a-spa-shell-is-invisible-to-ai-crawlers.md`](.claude/rules/a-spa-shell-is-invisible-to-ai-crawlers.md).

**EVERY home page is the app now, not only `/` (2026-08-13).** The URLs in this
paragraph are the ones that existed then: English was still at `/en/` and moved
to `/` on 2026-08-14. The mechanism is unchanged and applies to whichever
languages hold the directories. `/en/` and `/es/`
were pure documents — a heading, a fact list, emoji links and prose, with no
runtime at all. That is the correct shape for an article and the wrong shape for
the **home screen**, and it was reported by a person rather than caught by
anything here: every wordmark and back link on an English page (the header of
all 25 English game pages, the room, the boards, and `exitTo`'s floor in
`PageApp`) lands on `/en/`, and what arrived was a static article. No grid, no
wallet, no world, no daily. `homePage()` now emits the same arrangement
`transformIndexHtml` gives `/` — `homeShellBody(locale, …)` inside `#home-doc`,
an empty `#root` beside it, `class="app-shell"`, and the app's own head tags —
so all three home pages boot one bundle. **No prose is lost**: the shell body
carries the whole page (`/en/` 252 → 176 words, 26 → 31 links, still one `h1`),
and what went is the document chrome the app draws for itself.

Two things that look like details and are not. `homeShellBody` **takes a
locale** — hardcoded to Hebrew it would have emitted the Hebrew home under
`lang="en"`, a page that renders, links correctly, clears every floor and is in
the wrong language (the script gate in `assert-pages.mjs` is the control).
And `readPageContext` reads **`data-locale` only, never `documentElement.lang`**,
on the app branch: `index.html` always carries a `lang` — `he` until 2026-08-14
and `en` since — so reading the attribute would pin `/` to whichever language
holds the root, over the stored choice of every player using one of the other
ten. `/` carries no `data-locale`, and that absence is the signal. The flip did
not change that line and could not: the bug it prevents is "the root's language
wins", not "Hebrew wins". The URL wins on `/he/` and `/es/` and is **not
persisted** — following one Hebrew link must not repaint `/` for an English
speaker. Spanish waits for its dictionary before mounting, exactly as
`bootContentPage` does, so there is no flash of English over Spanish prose.

**Adding a page kind means finding every list that says which pages boot the app.**
There were three, and they do not live together: `build.test.ts`'s `boots`
predicate, `scripts/assert-pages.mjs`'s, and the runtime's own switch in
`pageContext.ts`. Miss one and the page is held to the DOCUMENT rules instead,
so it fails the build for a reason that has nothing to do with what is wrong -
which is what happened, and is the gate working. The runtime one is worse: a
missing branch there falls through to the game arm and mounts a `GameHost` with
an empty id, so the page renders its prose perfectly and shows "we couldn't find
that game" where the screen should be. Promoting `/en/` and `/es/` to app shells
walked the same three lists again, and the fourth failure shape is worth naming:
the first predicate written for "which files are homes" was
`fileName.split("/").length === 2`, which is right about `en/index.html` and
also matches `world/index.html`. It is `ROUTES.filter(r => r.kind === "home")`
now — the route table cannot be wrong about which pages are homes.

**A group gets a landing page once it holds three games, and nothing decides
that by hand.** `MIN_GAMES_FOR_A_PAGE = 3` in `src/content/categories.ts`;
`PAGED_CATEGORIES` in `src/build/routes.ts` is the category list filtered by it.
`create` holds one game and gets no page — **`/games/create/` returning 404 is
the control that proves the filter can exclude something**, and it is asserted.
The day `create` holds three it gets four pages, in every written language, with
no edit anywhere.

`CATEGORY_IDS` is derived from the COPY record, not the catalog, because
`src/build` may never import `src/portal/catalog.ts` — its lazy loaders would
pull Phaser into `vite.config.ts`. `CategoryContent` is
`Record<PageLocale, Record<Category, CategoryCopy>>`, so a locale promoted
before its prose exists and a category added with no copy are both red builds.
No article states its own group size: `{games}` is a token the emitter fills
from the roster, so a page cannot be wrong about how many games it lists.

**They are pure DOCUMENTS — no `headAssets`, nothing boots** — so they cost the
first visit zero. **Their inbound links are in the game-page breadcrumb**
(`Home › Classics › Snake`, the middle crumb a link only for a paged category),
and that placement was a measurement rather than a preference: five links in
`homeShellBody` measured **81 B gz** on the first visit against 63 B of headroom,
while the breadcrumb costs the shell nothing and yields 132 contextual links
instead of 4. Adding a page kind means walking the three lists that say which
pages boot the app — `build.test.ts`, `assert-pages.mjs`, `pageContext.ts` — and
`build.test.ts`'s used to be a path regex that matched `/games/kids/` as a game.

**The slug is `meta.id`, never the directory name.** `src/games/n2048/` publishes at
`/games/2048/`, so a hand-written `/games/n2048/` is a 404 that only the link
checker in `scripts/assert-pages.mjs` would catch.

**The game plays on its own page, and React owns exactly two elements there.**
A game page carries the app's own head tags - lifted verbatim off `index.html`,
never reconstructed, because the names carry a content hash - and mounts into
`#game-frame` and `#wallet-slot`. Everything else on the page is emitted once
and never reconciled, which is what makes hydration mismatch structurally
impossible rather than merely unlikely.

The poster is a **sibling** of the frame, not a child: a node React does not know
about, inside a tree it reconciles, is `react-nested-root-teardown` in a
different costume. It paints instantly (the game's emoji on its own colour), and
the runtime hides it when the game is up. Its emitted state is the honest one -
a real button and "the game needs JavaScript" - because that is what a visitor
with no JavaScript will keep seeing. The runtime rewrites both on boot: it hides
the button and fetches on browser idle, unless data saver is on, in which case
the button stays and waits for their tap.

**`body { overflow: hidden }` is now scoped to `body.app-shell`.** Unscoped it is
correct for an application that manages its own scroll regions and catastrophic
for a document - every word below the fold unreachable by scroll while a crawler
reads the page perfectly. `index.html` carries the class; the 48 content pages do
not.

**The hash router is retired.** `/#/game/snake` and `/#/world` redirect once at
boot (`legacyHash.ts`, `location.replace` so Back does not bounce), the home
cards are real `<a href>`, and Back, shareable game URLs and middle-click all
work without a line of code. `#/lab` used to be left alone as dev-only
scaffolding; the lab was deleted on 2026-08-08, so that hash now parses to the
home grid like any other unrecognised one - which is the right landing for a
bookmark from the tournament.

`src/portal/paths.ts` generates those links and `src/build/routes.ts` writes the
files. They are two implementations on purpose, because the app may never import
`src/build` (it reads `src/content`); `paths.test.ts` asserts they agree on every
game, so the copy cannot drift into a card that links to a page nobody wrote.

**`<lastmod>` comes from git, or it does not come at all.** `src/build/lastmod.ts`
derives each page's date from the last commit that touched its own sources — the
game's directory and its content file, never a build timestamp, which would say
"every page changed" on every deploy and teach Google to discount the field
permanently. **The trap is CI**: `actions/checkout` clones at depth 1, so `git log`
returns one identical date for all 52 — the same bug wearing a disguise, on the only
machine that publishes. Both deploy workflows set `fetch-depth: 0`, the emitter omits
the field on a shallow clone or a uniform result rather than lying, and
`assert-pages.mjs` fails the build on 50 identical dates. **An absent `<lastmod>` is
valid and is what this site shipped for months; a uniform one is a lie.**

**It is currently DORMANT, correctly.** A commit on 2026-08-08 touched all 21 game
directories, so every game page resolves to one timestamp and the emitter omits the
field. That is the design working, not a bug: `<lastmod>` exists to say WHICH pages
changed, and 50 identical dates answer "all of them" — as useful as saying nothing.
It returns on its own as the games diverge again. Do not make it emit uniform dates
to make the number reappear; the gate rejects those, and the two would contradict.

**It woke up for four days in 2026-08 and it was a BUG that woke it** - the resolver guessed a prose path from the game's DIRECTORY, and `2048` is the one game whose id is not its directory, so one wrong-but-plausible date was the only thing keeping the field alive. `lastmod.test.ts` now pins WHICH FILES a date is derived from, by name, for that game. Full account: [`docs/build-log.md`](docs/build-log.md) § lastmod.

**IndexNow pings Bing after a successful upload**, because ChatGPT Search and Copilot
lean on Bing's index. Ownership is a key file the build publishes at `/<key>.txt`
(primary host only — the Pages copy is noindex). `scripts/indexnow.mjs` submits **only
URLs whose `<lastmod>` moved**, and falls back to the whole set only when the sitemap
carries no dates, saying so. It is `continue-on-error`: a search-engine ping must
never fail a good release. The index-coverage benefit is documented; a causal lift in
AI citations is not, and this should not be read as claiming one.

**Canonical never carries the base.** `https://ellaz.fun/games/snake/` on both
hosts; the GitHub Pages copy adds `noindex` to every page and a `Disallow: /`
robots.txt, and emits no sitemap. `robots.txt` is emitted rather than dropped in
`public/` precisely because the two hosts need opposite files.

**Two gates, and `build:check` runs both.** `assert-first-visit.mjs` now matches
FULL dist-relative paths rather than basenames - `games/2048/index.html` has the
basename `index.html`, which the old matcher waved through as "the app shell".
`assert-pages.mjs` checks the pages themselves: prose floor, canonical, hreflang,
noindex, internal-link integrity, JSON-LD parse, sitemap bijection, no page
precached, and no `NavigationRoute` in `sw.js`. Every check has a negative control,
and all of them were mutation-proven against a real `dist/` on 2026-08-04.

**It reads `<title>` and `meta description` since 2026-08-16, and it did not
before** — the two strings did not appear anywhere in the file. That is why `/`
shipped `<title>Ellaz — Games / משחקים</title>` on the site's canonical entry and
`x-default` target, a bilingual literal `index.html` owned and nothing rewrote,
beside an English `og:title`, an English description and `lang="en"`. It survived
the 2026-08-14 flip that rewrote every other tag on that page. `replaceTitle()`
in `pages.ts` now owns it, exactly as `replaceHtmlLangDir` owns `lang`/`dir`, and
throws rather than no-op — **it REPLACES rather than appends, because a second
`<title>` is legal HTML and the browser keeps the FIRST**, so appending emits the
right string into a document that goes on showing the wrong one.

**The title's language check is ASYMMETRIC, and that is the whole finding.** The
obvious design is the script-DOMINANCE test Gate 4 already uses ten lines away —
and it reports **green** on this exact defect: `Ellaz — Games / משחקים` measures
**62.5% Latin, 37.5% Hebrew**, so Latin dominates and the title passes. A title is
short enough that the brand name swings the ratio. So a **Latin**-locale title
must carry *zero* non-Latin letters, while a **non-Latin** locale's title may
carry Latin (the Hebrew home title is legitimately 13.9% Latin — it starts
"Ellaz") and is compared only against the other non-Latin scripts. Both halves are
pinned by one control that asserts dominance *would* have passed. Six mutations
against a real `dist/` on 2026-08-16, each killed and named; `/` is seeded in
explicitly, since it is `emitted: false` and the per-page loop cannot see it —
the third time that blind spot has needed naming in this file.

Run the gate under **both** bases before believing it:
`npm run build:check` then `BASE_PATH=/ellaz/ npx vite build --outDir dist-ellaz &&
DIST_DIR=dist-ellaz npm run assert:pages`. Half these failures are base-dependent
and each workflow only ever sees one arm.

**The service-worker trap that would have broken all of it**, for returning
visitors and nobody else:
[`.claude/rules/sw-navigation-fallback-hijacks-real-pages.md`](.claude/rules/sw-navigation-fallback-hijacks-real-pages.md).

**The leaderboards are two screens, and the split is load-bearing.** They open on the
player's own games as cards, each already carrying their best, and a tap opens that
game's board with the difficulty and time rows labelled and a button straight into
playing it. The single page this replaced laid all twenty games out in one
non-wrapping flex row - 1,410px inside a 390px phone, clipped by the frame's own
`overflow: hidden` - so **fifteen of twenty games were unreachable**, not merely
awkward. See [`.claude/rules/a-row-that-grows-with-the-catalog-must-wrap.md`](.claude/rules/a-row-that-grows-with-the-catalog-must-wrap.md);
`DifficultySelector` is the specific trap, correct for three pills and wrong when
handed the catalog.

`src/portal/boardsView.ts` holds the pure half so the screen can be checked without a
browser, and **`firstBoard()` is one function on purpose**: the card quotes the board
the detail view opens. A `game.boards[0]` written inline in the component would be
correct today and would silently stop agreeing the moment `firstBoard` learns anything,
so a guard in `boardsView.test.ts` forbids it - mutation-proven by planting exactly
that line. The card art comes from `@ui/gameArtView`, shared with the home grid, so
there is one answer to what a game looks like rather than two that drift.

**Still authored by hand, not derived**: the difficulty tiers and what each game's
record measures. Both live inside renderers that import React, so a build-time
import is not possible; the pages simply do not state them yet. Deriving them means
declaring `levels` in each DOM-free `meta.ts` with a test that pins it to the
renderer's own `DifficultySelector` options.

**The content-page runtime is a lazy `page-*` chunk** - the game host, the whole
room, and (since 2026-08-13) every shared game helper except `rng.ts`. 12.3 KB gz,
which `/` never needs. Adding it caught the documented
three-change trap live: the dynamic import and the chunk name were right, and
`WalletChip`, `catalog` and `world/Scene` (imported by BOTH the home grid and
the page runtime) were left unassigned, so Rollup folded them into `page-*` and
made the ENTRY import from it. Vite then wrote a `<link rel="modulepreload">`
for the whole thing into `index.html`. `assert-first-visit.mjs` failed the build
by name. Every portal module that is not one of the four page files is now
pinned to the shell explicitly: an unassigned shared module is not neutral, it
picks a side.

(An un-isolated first-visit gap from 2026-08-04 is recorded in [`docs/payload-history.md`](docs/payload-history.md).)

**Games size themselves against the VIEWPORT, not their container** (`min(90vw,
60vh, <cap>px)`), so the stage breaks out of the page gutter on a phone. Giving
the frame the full width is cheaper and more honest than teaching 21 games a new
sizing rule. Verifying that surfaced a pre-existing responsive defect it did not
cause: nine games laid their stat row out as a non-wrapping flex under
`alignItems: "center"`, which sizes to max-content and overflows any narrow
screen - 439px of row on a 390px phone. Two games already carried
`flexWrap: "wrap"`; the rest now do.

**The game page has its own header, and the game panel is capped on desktop.**
Two separate pieces of chrome, decided one axis at a time against rendered
production builds.

The **header** (`src/build/layout.ts`) is a real bar in flow on a game page -
60px, 44px controls, wordmark + back | game name | wallet + full screen - and
its colour is `oklch(from var(--g) .30 calc(c * 1.05) h)`, a deep tone of that
game's own ground. Pinning lightness rather than mixing is the whole trick:
contrast holds by CONSTRUCTION across a catalogue nobody has finished writing
(7.84-10.68 over all 21 grounds, none below AA), where mixing toward a
near-black drags the hue and turned snake's emerald navy. **`--g` is not
ambient** - it is emitted per page from `artGround()`, and without that
attribute all 21 bars resolve to one fallback indigo, which is a plausible
picture with no error anywhere. The room still floats its header; the game's
float is exactly what put chrome on top of the board.

The **panel cap** is one rule: `.ellaz-game-panel { max-width: 700px }` above
900px of viewport, in `global.css` rather than inline because an inline style
cannot carry a media query. Every row inside `GameChrome` is `flex: 1 1 0` with
no ceiling - correct at 390px, and at 1440 it made the difficulty toggle
**1193px wide** to say "Level: Classic" and three stat cards 456px each to hold
one digit. Capping the panel fixes every row at once.

**700 and not 640**, because the widest board any game asks for is 640 (bees,
finddiff) and a tighter cap makes those two grow a scrollbar *inside* the panel
instead - silently, since the play surface is `overflow: auto`.
`game-panel-clears-widest-board.test.ts` reads the game TREE and fails the build
if a new game ever asks for more than the cap leaves.

**The board does NOT grow to meet the panel, and that is deliberate.** Boards
size against the viewport, so on a desktop the px cap or the `vh` term binds and
the space they are given never enters the arithmetic. Making them desktop-aware
is not "raise 20 caps" - it is 39 heterogeneous expressions across 20 files, of
which several are not boards at all (`min(19vw, 11vh, 96px)` is one balloon;
sequence has eight; minesweeper's is computed from column count). That belongs
in one sizing module, not in 39 edits.

## The stylesheet a content page carries

**`DOCUMENT_CSS` was 62.9% comments and nothing was minifying it.** It is a
template literal emitted into the head of all 164 documents, so Vite never sees
it - `global.css` is a real stylesheet and its comments are free; this one's were
not. `SERVED_CSS = stripCssComments(DOCUMENT_CSS)` is what goes on the wire:
**one game page 17,476 -> 10,212 B gz (-41.6%)**, all 165 documents 2.79 MB ->
1.59 MB.

**So comments in `DOCUMENT_CSS` are FREE, and you should write them.** That
sentence is here because the file spent a day and a half saying the opposite:
three notes read *"Comments in DOCUMENT_CSS are SERVED; keep them short here"* -
true when written on 2026-08-21, false from `1b8f2b9` on 2026-08-22, and never
updated. They were not idle either: `42a5b77` is a commit whose whole message is
*"Trim the breadcrumb comment, because comments in DOCUMENT_CSS are SERVED"*. A
stale instruction does not read as stale, it reads as a rule. Removed 2026-08-23,
the fact stated once at the `SERVED_CSS` declaration, and pinned by
`document-css-comments-are-free.test.ts` - which also counts the EMITTERS, since
the claim only holds while nothing emits the raw copy. 7 mutations, 7 killed.
Explain freely there: it is the one stylesheet no browser devtool will show you.

**It is a different budget from the first visit and must never be counted toward
it.** The `<style>` is emitted only when `opts.shell` is false, so `index.html`
never carries it and `assert-payload` cannot see it in either direction -
measured unmoved at 90,022 across the change.

**The source keeps every word**, and both halves are pinned in `build.test.ts`:
the source must still contain `/*` and the served copy must not. Either
assertion alone is satisfiable the wrong way.

**`src/build/css.ts` is a scanner, not a regex**, and that is not fastidiousness:
`/\/\*[\s\S]*?\*\//g` eats from inside `content:"/*"` to the next `*/` and takes
real declarations with it, leaving a page that renders and is missing rules. It
throws on an unterminated comment rather than swallowing the file, and it removes
comments rather than replacing them with a space - which is what the CSS
tokenizer does, so `.a/*x*/.b` stays `.a.b` instead of becoming a descendant
selector.

## The room's boot-time layout shift

**`/world/` on a phone read CLS 0.297 - POOR, and the worst page on the site by
two orders of magnitude** *of the eight that had been measured*. Every game page
reads 0.003 to 0.010, the boards 0.028, the room on a desktop 0.044. The plan had
this recorded as a defect on the GAME page; measured across 8 pages x 2
viewports, it never was. **`/` was not one of those eight and is far worse - see
the section below.**

An EMPTY content-sized `#game-frame` centred in a 740px box sits at y=474; the
1297px scene mounts and it snaps to y=104. **`body[data-page="world"]
#game-frame:empty{min-height:100%}`** reserves the box only while the frame is
empty, so the finished layout is unchanged - measured identical to the control at
both viewports, three interleaved runs, 0.2713 -> 0.0032.

**That fix REGRESSED under preact and the regression is live (2026-08-26, OPEN).**
The room's own probe, one tree with only the alias reverted, positive control
firing on both arms:

```
  /world/   preact build   0.3164  0.3307  0.3307    median 0.3307   POOR
  /world/   react  build   0.0264  0.0066  0.0064    median 0.0066   good
  live      ellaz.fun      0.0064  0.3164  0.0064  <- about one load in three
```

**And the probe's own verdict cannot see it**: it reports the MEDIAN of three
runs, so a defect on one load in three reads as `OK`. Read the per-run column,
not the median, until that is changed.

The mechanism is narrowed and not settled - `:empty` releases its reservation the
moment the frame stops being empty, and under `preact/compat`'s synchronous
commit that is a frame before the scene's content has a size, which is the SAME
class as the `/` hand-off below. Two quick attempts were inconclusive (an
unconditional `min-height` read 0.006 once and 0.316 twice; a runtime-injected
variant perturbs the timing being measured) and were stopped rather than shipped
- `debugging/no-band-aids.md`, two failures means trace, not patch.

`flex-start` on the room (the game pages' own fix) moves the desktop room y=120
-> y=260 and breaks the centring `layout.ts` defends on purpose. An unscoped
`min-height` moved the finished height 4px in one run of three. Both measured,
both rejected.

**Its probe was blind first.** A 400px control planted before the `h1` read
0.0084, identical to the unplanted arm, and reported the whole site healthy - the
stage fills the viewport, so the `h1` is below the fold and CLS rightly ignores
it. Planted at the top of the body it reads 0.3593. Re-measure with
`scripts/repro/repro-room-boot-shift.mjs`, which exits 1 if its own control
cannot see a planted shift.

## The home page's boot flash, and the CLS nobody had measured

**Load `/` and a plain bulleted document appears for a moment before the app.**
That document is not a bug: `#home-doc` is the emitted home page that exists
because no AI crawler runs JavaScript and `/` is the site's canonical entry
(see the section on the SPA shell). `main.tsx` removes it once React mounts. It
is what a no-JavaScript visitor keeps, and the app is what everyone else gets.

**What it costs, measured 2026-08-26 at 390x844, one tree, one variable:**

```
                        the document is    CLS on /   of which the
                        on screen for                 document/app hand-off
  react (before)         2534 ms            0.685          0.000
  preact (shipped)        504 ms            1.709          1.000     <- regression
  preact + one CSS rule   504 ms            0.685          0.000
```

Two separate things, and only one of them is the flash.

**The flash itself is five times shorter than it was**, because the swap cut the
work between the stylesheet landing and the app committing. It is not gone, and
removing it entirely is an open question - hiding the document when JavaScript
is present trades half a second of readable page for half a second of blank one,
which is not obviously better and has not been put to anyone.

**The CLS 1.000 was a regression the swap introduced, and it is fixed.** The
removal runs on the next animation frame, which was right while React 18
committed asynchronously and is a frame too late under `preact/compat`, whose
`render()` returns with the DOM already committed - so one painted frame carries
the whole app laid out underneath the whole document. Closed in `global.css` by
`body.app-shell:has(#root:not(:empty)) #home-doc{display:none}`, the exact
complement of the `#root:empty` rule above it. **CSS rather than moving the
removal earlier**, because a rule fires on the same style recalculation under
either runtime and so cannot be wrong about when one committed.

**The remaining 0.685 is older than the swap and is NOT fixed.** About 800 ms
after mount the lazy roster lands, the daily card appears above the category
rail, and 100px of page moves down. It is on both runtimes. The fix is the
room's - reserve the slot's height while it is empty - and it has not been done.

`scripts/repro/repro-home-boot-shift.mjs` gates the hand-off and REPORTS the
rest. **Its control had to be a second BUILD**: injecting `display:block
!important` at runtime to put the old behaviour back reads 0.689 - healthy - on
the very build that measures 1.709 without the rule, because a stylesheet added
after the navigation commits does not reproduce one that was never there. A
control that cannot fail was reporting FAIL on a correct page, which is the worst
of both. Pass `--control-base` at a build whose `global.css` lacks the rule; with
no control base the run says so out loud rather than pretending.

## The picture a search result shows

**Every game page embeds a real `<img>`, and until 2026-08-22 none of them did.**
Measured live as Googlebot across all 33 games in four languages: **0 `<img>`, 0
structured-data `image`, 0 image rows in the sitemap**, while every gate here was
green and every page had a perfect `og:image`.

Those two are not the same thing and the names invite the confusion. **`og:image`
is a social card** handed to a scraper with a URL and no page. **A result
thumbnail is chosen from images the page EMBEDS.** Our art is drawn as inline
`<svg>`, which has no URL - it is markup, so it can never be indexed or chosen.

`src/build/artFiles.ts` writes the same `gameArt` scene to
**`art/<id>-<hash8>.svg`**, one per game, and `gamePage.ts` embeds it after the
lede. **The hash is not decoration**: a stable name has to be force-uploaded on
every deploy, because lftp's `mirror` decides by comparing SIZE and TIME and
that heuristic once skipped all 49 pages of this site. Hashed, the art and the
200 share cards join the pass that is safe, and the forced set went 417 -> 195. **33 files, 37 KB, and the
first visit is unmoved at 89,979 B gz** - `src/build` ships to nobody.

Four things that are load-bearing rather than incidental:

- **`art/**` is in `globIgnores`.** `globPatterns` sweeps `**/*.svg`, so without
  that line every child precaches a picture of every game, with a green build and
  an unmoved payload gate. First asset in months to need the entry.
- **The `src` carries the base, the canonical never does.** `artHref(base, id)`
  for the tag, `artPath(id)` for JSON-LD and the sitemap. Both arms are built and
  gated, because half these failures are base-dependent.
- **1200x900, not the art's own 200x150 viewBox.** A vector has no size until one
  is declared and a crawler measures the declared box. Free - same path data.
- **The alt is `site.artAlt`, not the H1.** The H1 is `"{title}"` in every
  language but Hebrew, so the alt read `2048` to the only two audiences that ever
  get it. `build.test.ts` reads the emitted attribute off a real page and refuses
  an alt that is only the name.

**On the schema, having actually checked the current gallery rather than
assumed**: HowTo and FAQPage rich results were retired 2023-08-08 and FAQ has left
the gallery, so ~23 of each page's 33 JSON-LD nodes produce nothing - **and
nothing is dropped**, because Google says there is no need to remove deprecated
markup and answer engines still parse the FAQ. `VideoGame` alone is **not** a
Search feature: it is now co-typed `["VideoGame", "SoftwareApplication"]`, which
is the pairing Google's Software App page asks for. That still yields no rich
result, and the reason is written beside the code so nobody re-derives it: Software
App requires `aggregateRating` or `review`, we collect nothing about a player, and
inventing a rating breaches both our own rule and Google's policy. **The one
image-bearing rich result a game can qualify for is closed by a decision we would
make again, which is exactly why the picture has to be on the page.**

Seven artifact checks in `assert-pages.mjs`, all mutation-proven (controls 38 ->
41). The one that earns its place: the emitter writes one attribute per line, so a
matcher built on `.` reports **zero images on a page that has one** - the exact
reading this gate exists to disprove.

## The picture a shared link grows

Every page carries an `og:image`, 1200x630, emitted by `src/build/ogCard.ts` (pure,
the layout) plus `ogImages.ts` (async, the rasteriser) from the same `gameArt` SVG
the home grid uses. Read the COUNT off `dist/og/`, never off this line - it said 50
for weeks while 164 shipped. They cost nothing on a first visit — PNG is not in the
precache glob and no shell asset fetches them.

**A game card shows its WHOLE scene; every other kind shows a mosaic.** `cardArt()`
returns the tiles and `preserveAspectRatio` is `meet` for a game - `gameArt` hardcodes
`slice`, which is right for a CSS-sized card in the app and cropped 56% of the
composition here (900px rendered, 135px cut each end, the bar over 230px more). The
letterbox is invisible because the card's ground already IS the scene's own ground.
The mosaic is DERIVED from the roster, so a new game joins the home card with no edit,
and a category shows its own games - a "Kids games" card showing minesweeper would
misdescribe the link it previews.

**The second line is `site.tagline` and never a count.** A card is a baked PNG cached
on the scraper's own infrastructure for weeks, so a number that is safe in HTML
(rebuilt every deploy) goes stale where nothing here can reach it. Ratified as
**SEO22** and **SEO23** in `/seo-doctrine` on 2026-08-23.

**The gate compares the PICTURES, by content hash.** Until 2026-08-23, 32 of 164 cards
drew nothing at all and 12 of those were byte-identical in threes, with every tag
correct throughout. Each cheaper check passes the failure it is meant to catch: a tag
check passes a blank image, a file-name check passed the identical twelve for months,
and a byte floor written for a flat colour passes a flat slab with text on it (16 KB
against a 4096 B floor). `checkCardsAreDistinct()` in `assert-pages.mjs`; plant a
duplicate and it reds naming both files.

**Text never reaches the rasteriser as text, and that is the whole design.** Neither
`resvg` nor `satori` implements the Unicode bidi algorithm: both lay `<text>` out in
LOGICAL order, so "נחש" rasterises as "שחנ" — a clean PNG of nonsense — and
`direction: "rtl"` fixes neither. `bidi-js` computes the visual order first, and satori
then emits PATHS. **Naive reversal would be wrong** for "2048" (must not become "8402")
and for "מה בא אחר כך?" (the "?" belongs on the left); both are pinned in tests.

Two more traps, both of which render a plausible wrong picture rather than an error:
`gameArt` is an HTML fragment, so it needs an injected `xmlns` to be a document at all;
and every scene ends with `fill:var(--art-veil,transparent)`, which a rasteriser cannot
resolve and paints as **opaque black over the entire card**. `artSvgSized` resolves it
and throws on any `var()` it cannot.

**The fonts are three families now, and the byte gate could never have seen why.**
Heebo covers Latin and Hebrew and **nothing else** — measured on the bundled files,
zero Arabic codepoints and zero Cyrillic. Satori does not throw on a missing glyph;
it draws a **rectangle**. So an Arabic or Russian card is a valid PNG of a title
bar full of tofu, and the size check below passes it: measured, a fully-tofu card
is **10,899 B**, inside the 4 KB–600 KB window, and a real card is ~21 KB because
the art dominates. Promoting either language would have shipped 32 unreadable
cards with every gate green.

Three things cost real time to find and are pinned in `ogGlyphs.test.ts`:
**registering a fallback under the SAME family name does nothing** (satori takes
the first match for family+weight and never falls back within a family — Arabic
stayed at 128 bytes of path per character; under its own name Cyrillic went
150 → 645); **Noto Sans Arabic, Noto Kufi Arabic and Amiri all CRASH** satori's
opentype fork with `lookupType: 5 - substFormat: 3 is not yet supported`, so the
obvious choice is the one that breaks the build — **Cairo**, Tajawal and Almarai
parse; and **Arabic joining WORKS**, so do not add a shaper. That last one is
easy to get backwards: tested by rendering one letter and the same letter
doubled, where an unshaped pair would be the isolated outline twice — it is not,
while the **Latin control** (`n` vs `nn`) is exactly doubled, which is what makes
the method able to report "no shaping" at all.

`missingGlyphs()` in `ogImages.ts` now refuses to rasterise a card carrying a
character no bundled font has. It asks the cmap through **satori's own parser**,
so the check and the rasteriser cannot disagree, and it is an exact question
rather than a threshold that could go stale. Adding the fonts was proven inert:
all **96 existing cards byte-identical** before and after, and the first visit
unmoved at 89,440 B — `src/build` ships to nobody, so 68 KB of fonts cost a
reader zero.

`assert-pages.mjs` gates it: a card per page, absolute ellaz.fun URL, file present, and
**between 4 KB and 600 KB** — the floor catches a flat-colour card, the ceiling is where
WhatsApp silently drops the preview. Mutation-proven three ways. Full account:
[`docs/build-log.md`](docs/build-log.md) § Share cards.

## One game, on a host we cannot watch

`STANDALONE_GAME=sudoku npm run build:standalone` writes `dist-standalone/sudoku/` —
one game, one page, `index.html` at the root, ready to zip for itch.io. It has its
own config (`vite.standalone.config.ts`) and its own entry (`src/standalone.tsx`),
and **neither may ever be folded into the main build**: a branch inside
`vite.config.ts` puts both one typo apart, while a separate file means the site a
child loads cannot regress from this work at all. It never writes `dist/`.

Reusing `bootContentPage` is the tempting move and it is wrong — `PageApp.tsx`
calls `analytics.init()`, `analytics.track()` and `startCloudSync()`
**unconditionally**, and those are static imports, so no `manualChunks` branch and
no `globIgnores` entry can remove them. Only a different entry can. Other games and
`src/sdk/cloud.ts` are stubbed at **resolution**, each stub throwing if reached; a
sudoku bundle went 2.1 MB → 224 KB once they were.

`npm run assert:standalone` is the gate, written before the target and carrying 14
planted controls. It found three defects on the first real bundle, and a browser
found a fourth the gate could not see: a `fonts.googleapis.com` import, which is an
external request from a game — the rule that lets this SDK be listed on a portal at
all. **That fix is scoped to this build**; `src/ui/global.css:5` still fetches the
same font on the live site, and changing that is a payload decision with a budget
attached. Full rule, including the case-sensitivity trap that passes on `/mnt/c` and
404s on their CDN:
[`.claude/rules/a-second-published-artifact-needs-its-own-gate.md`](.claude/rules/a-second-published-artifact-needs-its-own-gate.md).

**The gate's own stamp message was wrong for a day, and the shape is worth keeping.**
It compared the build stamp in full and printed `.slice(0, 16)` of each side, while
`buildStamp()` marks a dirty tree by appending `-dirty` at character 41 — so the only
thing that differed was the only thing 16 characters could not show. It read
*"stamped 13840666dff557ae but the tree is 13840666dff557ae; rebuild"*: a correct
refusal wearing a self-contradicting sentence, triggered by **build, then edit any
file**. Fixed to print both in full. It matters because a gate that reads as broken
gets bypassed, and a bypassed stamp check is how a stale bundle reaches itch — the
exact outcome the stamp exists to prevent. Two more instruments in this repo failed the
same way in two days, one of them the check verifying this very fix:
[`.claude/rules/a-diagnostic-that-truncates-what-it-compares.md`](.claude/rules/a-diagnostic-that-truncates-what-it-compares.md).

Two things the gate is known to do that are easy to forget: it refuses a **torn** bundle
(`1 html, 0 js` — the shape a killed upload leaves), and the standalone build **requires
a git repository**. Outside one it fails with a message about *webfonts*, because the
commit-stamp step shells out to git and a later step reports the CSS that was never
written. Both deploy workflows always have git, so this is a trap for a source unpack
rather than a live defect.

## The numbers we tell strangers

`docs/outreach/` holds eight drafts meant to leave this repository - Show HN,
Product Hunt, dev.to, three Reddit posts, itch.io, Newgrounds, a Hebrew press
letter, two pull requests into other people's lists. **Nothing is published.**

It is also **the only place here where a number about this site is written by
hand.** The sitemap, `llms.txt` and the emitted home read the roster, so they
cannot be wrong about how many games there are; a draft cannot read anything.
Measured 2026-08-18, six days after they were written: **57 wrong figures**,
two of them wrong when written rather than stale.

**`npm run assert:outreach`** derives the facts and scans every draft; `--fix`
rewrites the numeric drift in one command and `--control` runs six controls. It
is **not in `build:check`, on purpose** - the same placement as
`assert:standalone`, a gate for an artifact published by hand. Three things in
it earn their place, each found by the gate failing rather than by reasoning:
**`minHits` per claim**, so a matcher finding fewer occurrences than the corpus
holds reports BLIND rather than clean; **Hebrew is in the population**, because
`press.md` quotes the counts and an English-only matcher reports the folder
clean; and **`--fix` cannot tell a claim from a history**, so historical
passages are wrapped in `<!-- outreach-facts:off -->` and the count of exempted
regions prints every run.

**One claim flips rather than drifting, and no numeric matcher can see that
class**: "under 90 KB" was true at 88,234 and false at 90,027, while the number
in the sentence - the THRESHOLD - never changed. It is carried as a PREDICATE
in the gate, and the copy says *about 90 KB*.

**And a draft cannot be its own record.** Every file there says "Status:
drafts, nothing is posted", because that is how a draft is written - and it
keeps saying it after somebody posts.
[`docs/outreach/ledger.md`](docs/outreach/ledger.md) is the record;
`scripts/outreach-ledger.mjs` fails when the two disagree, when a surface has
no row, or when a fired row carries no verdict date.

**Two things no gate here can reach.** There is **no inbound-link data in this
project at all** - `npm run reach:links` prints UNMEASURED and exits 2 until a
Search Console export is dropped in `docs/outreach/exports/`, never `0`,
because zero is a finding and unmeasured is a gap. And the **GitHub repository
description** lives in a vendor panel; `npm run reach:about` compares it against
one DERIVED from the roster and `PAGE_LOCALES`.

Full audit: [`docs/outreach/audit.md`](docs/outreach/audit.md). Rule:
[`a-hand-authored-number-that-leaves-the-repo.md`](.claude/rules/a-hand-authored-number-that-leaves-the-repo.md).
The law lives in `/reach-doctrine` and `/reach-playbook`, with `/reach` as the
map over them.
## THREE locale sets, and the difference between them is the whole point

`src/i18n/locales.ts` holds all three, and confusing any two is the trap.

| set | what it is | today | adding one costs |
|---|---|---|---|
| `APP_LOCALES` | what the INTERFACE speaks | 11 | one lazy `locale-<xx>` chunk, ~1.3 KB gz, fetched only by somebody who picked it |
| `PAGE_LOCALES` | what has WRITTEN PROSE | 4 (he, en, es, fr) | prose only - `ROUTES` derives from it, so pages, sitemap, hreflang and share cards all follow |
| `SHIPPED_LOCALES` | what AUTHORED APP STRINGS are written in | 2 | **PAYLOAD** - these ride in the statically-imported roster |

**The third exists because the other two were quietly the same type.** `Locale`
was an alias of `PageLocale`, and `GameMeta.title` is `Record<Locale, string>`
on a meta the roster imports STATICALLY - so every PAGE language dragged 33
more titles into the shell. Measured before the split: reaching eleven cost
**+9,120 B gz across every shell record, against 625 B of headroom.** Pages read
a game's name through `gameName(id, locale)` (build-time only, throws rather
than falling back). Two funnels narrow an interface language to a shorter list:
`pageLocaleFor()` for URLs, `shippedLocaleFor()` for authored strings, and
`textFor()` wherever the record itself is in hand.

**The result, and the number to re-run rather than trust: adding a locale to
`PAGE_LOCALES` now reds ONLY `src/content`.** The probe is one command and it
is the whole proof of this design:

```bash
# add a 5th entry to PAGE_LOCALES, then:
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "^src/content/"   # must be empty
```

**Promotion is always two commits: prose first, then the list.** The other
order fails to compile, which is the gate working - `GameContent.copy` is
`Record<PageLocale, GameCopy>`, and a `Record<K,V>` cannot be wrong about
whether a key exists the way a script can be wrong about what it scanned.

**When adding a language, hunt the SILENT gates, not the loud ones.** Spanish
killed six two-language constants; the loud ones (arithmetic, a `/todo/i`
matcher hitting the Spanish word *todo*) cost an afternoon, and the silent ones
were green over prose nothing had measured - a `["he","en"]` literal that ran
ZERO Spanish pages through the voice gate, and a roster-count gate with no word
for `juegos`. Ask of every gate not "is its logic right" but **"which pages are
in its population, and which words does it know"**.

`src/content/voice.ts` is `Record<PageLocale, VoiceRules>` for exactly that
reason: as four ternaries, a third language joined the ELSE arm of all four and
would have been measured against the English banned list, passed, and reported
clean.

Four artifact gates in `assert-pages.mjs` read the locale lists off
`dist/pages.json` rather than keeping a copy: stray locale directory,
cross-locale body difference, script sanity (a comparison, not a threshold, so
nothing goes stale) and hreflang reciprocity. **`/` has to be seeded into them
by hand** - it is `emitted: false`, the same blind spot that let it serve a
29-byte body to every AI crawler for months, and on the first run the
reciprocity check reported a defect on `/en/` because it could not see `/`.

`x-default` is **English, not Hebrew** - it answers "we have no page in your
language". Since 2026-08-14 it points at `/`, so `x-default` and
`CANONICAL_LOCALE` are the same; both constants are kept because they answer
different questions and were different for months.

Full account, including the six constants one by one and why the picker carries
autonyms: [`docs/build-log.md`](docs/build-log.md) § locales, and
[`a-locale-page-without-a-translated-body-is-a-duplicate.md`](.claude/rules/a-locale-page-without-a-translated-body-is-a-duplicate.md).
## The reader is told, not just the crawler

**Every emitted page carries a one-line offer of the other languages it exists
in** - `src/build/langOffer.ts`, first thing in `<body>`, one hidden row per
alternate, and one attribute on `<html>` choosing which shows. It is **emitted,
never rendered**: `src/build/**` ships to nobody, so it costs a first visit
zero, it is on screen in the first paint rather than after the bundle, and the
rows derive from the page's own hreflang cluster - a fifth locale gets a fifth
row with no edit.

Measured, Search Console 2026-08-04 to 08-18: **76% of the queries are Hebrew
and 11% of the impressions land on a `/he/` URL.** Six Hebrew minesweeper
queries earned 19 impressions and `/he/games/minesweeper/` earned zero of them.
The hreflang cluster was reciprocal and correct throughout - it is addressed to
a crawler, and nothing on the page told a reader the Hebrew version existed.
The Hebrew pages are not the weak lane either: where Google serves one it ranks
around 6 against a mean of 27 for the English twins.

**Never a redirect.** A crawler follows one too, so every other language drops
out of the index; Google says so in writing.

**`--oh` is how the stage pays for it** - 0px unless the offer showed, and
subtracted unconditionally in `.box`'s `calc`. Declared only in the override,
the calc resolves to nothing on the pages with no offer, which is most of them,
and the box loses its height entirely.

**The four home shells carry no bar and that is deliberate.** `/`, `/he/`,
`/es/`, `/fr/` render no `DOCUMENT_CSS` and no emitted chrome, so a bar there
would have to live in the bundle - the cost this whole design avoids. 4 of 164
documents, 11% of the impressions. Stated rather than left to be found.

**`src/build/**` may not use the `@i18n`/`@ui` aliases.** It is loaded by NODE
from `vite.config.ts` at config time, where no Vite alias exists yet, so an
aliased import fails the whole config to load and reads as a broken build rather
than a wrong import. Every module in there uses relative paths; follow them.

## The words on a game page

Each game gets ~750 words per language at `src/content/games/<id>.ts`. Three rules,
all mechanised in `npx vitest run src/content/`:

**Authors write prose; code supplies facts.** Difficulty tiers, what the record
measures, the platform facts (free, no ads, no account, offline) are read from
`meta.ts`, the game's own `DifficultySelector` options and `sdk/score.ts` at render
time. A writer cannot claim something the game does not do, because they are not the
one saying it.

**Every number names the script that derives it.** `provenance` rows are
repo-relative paths and `content.test.ts` asserts the file exists. The memory page's
"9.2 moves" comes from `scripts/sim/memory-moves.mjs`, which parses the real level
table out of `Memory.tsx` and simulates 20,000 games, so it fails loudly if a
difficulty changes. The first draft said "under twenty-eight moves" and nothing
produced that number; this field is why the next one cannot happen quietly.

**Never translate - write it twice.** A translation carries the source language's
rhythm, and that rhythm is exactly what reads as machine-made.

`src/content/voice.ts` is the measurable half of "does this sound like a person", and
the measurable half is mostly **uniformity**: our first draft's five paragraphs were
57, 53, 50, 56 and 54 words, a 5% spread where humans run 30 to 60. It also bans the
tell vocabulary per language, the em dash, more than one rule-of-three, and the
"it's not just X, it's Y" crutch. It cannot see whether the admission is true, whether
a statistic was derived, or whether it sounds like us - which is why three pilots ship
before the other twenty.

**`src/content/` is build-time only.** `no-app-imports.test.ts` forbids portal, ui,
sdk, games, juice, shared and i18n from importing it; one stray import would put every
word of all 21 pages into the precached shell a child downloads before choosing a game.

Full rule: [`.claude/rules/game-content-template.md`](.claude/rules/game-content-template.md).

## How the app FEELS — the sounds, and the lab that chose them

**The sound lab is at `#/lab`, and it is reachable in production** —
`https://ellaz.fun/#/lab`, or `http://localhost:5180/#/lab` under `npm run dev`.
It is the gallery: every sound the app plays beside the alternatives, the win
moment playable end to end, and every visual effect and haptic on a button.
`docs/juice-map.md` is the written inventory — what each sound is, where it
fires, and the honest list of what was never judged.

**Tapping a candidate PICKS it and plays it through the real `audioPort`**, so
what you hear is what a game will play — not a preview that can disagree.
The pick is a whole `VoiceSpec` in `localStorage` (`ellaz:voice:v1`), because
the candidate specs live in the lab's own chunk that a child's device never
downloads. `src/sdk/voiceOverride.ts` is the gate on the way back in, and it is
the strictest one in this app: every other stored blob decides what a screen
SHOWS, this one decides what a synthesiser DOES next to a child's ear. It
validates rather than coerces — unlike `migrateProfile`, which salvages junk on
purpose — and anything it does not fully like is DROPPED, falling back to the
built-in, which is the same answer as "nothing was ever picked". Gain is the one
exception: it is scaled down as a whole rather than refused, so a slightly-loud
pick stays picked and stays safe.

Measured on the artifact 2026-08-13: the lab is **9,715 B gz in its own
`lab-*` chunk**, referenced 0 times in `index.html` and absent from the precache
manifest, while sibling `.js` chunks are precached — which is the positive
control proving the `globIgnores` entry is doing the work rather than the glob
missing it. First visit **89,164 B gz of 90,000**, 836 spare. Adding it was the
documented three changes: the dynamic import, the named `manualChunks` branch,
the `globIgnores` entry. `src/lab/**` matches none of the other `manualChunks`
rules, so without its own branch it falls to `return undefined` and lands in the
ENTRY chunk, shipped to every child with no `lab-` name for anything to match.

**All nine sounds were re-picked on 2026-08-13, and six of them overrode a
blind-tournament winner.** tap is **Tick**, pop is **Pock**, correct is **Wood
run**, wrong is **Two steps down**, win is **Ladder**, coin is **Drop in**, star
is **High bar**, flip is **Whoosh**, streak is **Glass**. Every one was chosen
from its own strip of 5–8 arms with the names showing.

**"Shutter won the tournament" and "tap is Tick" are both true**, and somebody
will eventually cite the first. A blind round (2026-08-02) asked which sounds
better with nothing else to go on; a named pick asks which belongs in this app,
and the second question is the one that ships. `VERDICT` and **`OVERRODE_BLIND`**
in `src/lab/voices.ts` record which is which, and the card badge says *"picked
over a blind winner"* for those six. Collapsing the two is how a preference gets
remembered as a result — the exact mistake `docs/juice-lab.md` records.

**Nothing was deleted: all nine predecessors live in `src/lab/previous.ts`** and
remain playable arms. That file exists because of a trap this repo had already
documented once and still nearly shipped: every "was" arm was written as the
shipped CONSTANT (`TAP`, `SUCCESS`, `WIN`…), which is correct exactly until the
constant moves. When all nine moved at once, each of those arms would have
silently become a second copy of its own replacement — two buttons per strip
playing an identical sound, one labelled with the old name, and every test still
green because a duplicate spec is a valid spec. `pop-square` was the only arm
holding its own literal (written out longhand when Cork was promoted) and so the
only one that survived. **A control arm must be a literal, never an import.**
`voices.test.ts` now fails on any two arms in a strip that are byte-identical;
mutation-proven by restoring the pre-fix line.

**A partial nobody can hear was making the browser complain.** `star` on tuned
wood asks for 26,634 Hz on its top note, above Nyquist at any sample rate, so
WebAudio clamped it and logged `value outside nominal range` on every star.
`voiceEngine` now skips any layer that spends its whole life above `sampleRate/2`
— measured on the artifact: **8 oscillators instead of 9, zero warnings**, and
nothing audible changed because nothing up there was audible.

**The streak ladder exists, is playable, and nothing calls it.**
`src/sdk/streak.ts` is the third policy port after `economy.ts` and `score.ts` —
a game reports how many correct in a row and never picks a pitch. First rung on
the **3rd**, C major pentatonic (`0 2 4 7 9 12 14 16 19 21`), and it **caps** at
the top rather than resetting, because dropping a long run back to the bottom
tells a child who is doing well that they are suddenly a beginner again.
Pentatonic and not diatonic on purpose: a leading tone makes an ascending line
*beg* for the next step, and building that pull deliberately for five-year-olds
is not something this platform does. `streakStep` returns **`undefined`, never
0**, for "too short to count" — 0 is a real rung, so the two must not be
spellable the same way or the ladder fires on every correct answer. Measured at
the audio layer after the timbre moved to Glass: 523 Hz on the first two taps,
then 519 → 1756, and 1773 on the thirteenth — the same rung, jittered, the cap
holding. **The partial COUNT is the better evidence than the pitch**: taps 1–2
draw nine oscillators (Wood run, three bar partials across three notes — the
ordinary `success` sound below the floor) and every tap after draws four, which
is glass. `streakTier()` returns `good`/`great`/`amazing` and **nothing speaks
them**.

**Confetti and burst spread are now 140 and 190 px** (`ellaz:juice:v1`,
`src/juice/tuning.ts`), both picked in the lab on 2026-08-13; shake was
re-chosen and came back unchanged at 6 px / 240 ms, which is worth recording
rather than reading as "that one was skipped". The honest limit: **burst COUNT
is not tunable**, because 20 sites pass their own hand-authored 5–16 and an
explicit argument beats a default. Unlike `voiceOverride` this store **clamps
rather than drops** — the worst a bad number here does is draw odd confetti.
Measured in a fresh browser context with nothing stored: a win draws **140**
pieces and the lab marks 140 / 6 / 240 / 190 as shipped.

**A control that stops controlling is worse than no control.** `tuning.test.ts`
proved `clearTuning` by saving `confetti: 140` and asserting the result equalled
shipped — fine until 140 *became* shipped, at which point the save was a no-op
and the assertion passed whether or not `clearTuning` did anything, with nothing
in either diff to show it. It now derives a value that cannot collide and
asserts the setup changed something before asserting the teardown undid it.

**Level-matching now keys on CONTENT, not object identity.** `voiceEngine`'s
trim cache was a `WeakMap<VoiceSpec, number>`, which is right for eight module
constants and wrong for a voice read from storage: every parse mints a fresh
object, so the trim was missed on every re-read and the picked voice played
unmatched against the palette it was being compared to — ruining the one
comparison the lab exists to make.

**The Juice Lab that came before it is gone.** It was a dev-only `#/lab`
tournament — 45 physics-synthesised sound characters, six blind ranking rounds —
and it always carried a kill date: the winners land, `src/juice/lab/` is deleted
in that same commit. That happened on 2026-08-08 in `ae4df64`. Its four unused
partial tables (bell, bar, wood, soft) were recovered into `src/lab/modes.ts`
rather than into `@sdk/voice`, since a mode nothing plays yet must not be paid
for by a first visit; `struck()` takes a partial set directly so the lab reaches
the SAME damping law instead of keeping a second copy of the physics.

**`src/sdk/voice.ts` holds the eight voices it chose**, as pure data (no
WebAudio, so it unit-tests in node), and `voiceEngine.ts` is the only place that
touches audio nodes. `sdk/audio.ts` is unchanged as an interface — all 41
`play()` call sites were untouched by the swap.

**All eight are NEW. The recorded verdict said otherwise and it was wrong.** A
memory note claimed coin and wrong "were won by the sounds already shipped", with
a warning not to change them. `brackets.ts` said the opposite outright — *"the
palette deliberately reuses the LEAN specs as its control characters"* — every
`*-current` character referenced `LEAN.*` and none referenced `CONTROL.*`, so the
control arm was the lab's own unshipped design and `coin-current`'s blurb "what
the lab plays right now" meant the **lab**. Following the note would have wired a
320 Hz square for coin and left a sawtooth buzz for wrong. `voice.test.ts` pins
the correction so nobody restores the old sounds on a note's authority.

The transferable half: **a verdict recorded as "the control won" is ambiguous
unless the record also says WHAT THE CONTROL WAS.** Record the spec identifier,
never the word "control".

**coin and star had no wiring at all** before this — no `SfxName` member, a
silent coin flight, nothing on a star. Both now fire from `winMoment` staggered
behind the win chord (450 ms / 620 ms) so a level completion is a short phrase
rather than three sounds in a pile. **That sequencing is not a tournament
result**: the guided round that would have chosen the coin-flight behaviour was
never ranked, so one coin plays per win — the conservative reading of a question
nobody answered.

**Level-matching ships with the engine.** Each voice is rendered offline once and
trimmed to a common peak, because the operator judged all six AT matched
loudness; untrimmed, a reverbed star against a 60 ms tap is roughly a 4× peak
difference. Measured on the live artifact: every voice lands within 6% of target.
**Except the first tap of a session**, which plays ~5 dB quiet — the gesture that
unlocks audio is the same gesture that plays the sound, so the trim does not
exist yet. Once per session, quieter not louder.

**`Home.tsx` had zero juice and zero sound** when the lab was built; it now
attaches `attachShellJuice` for press depth, a ripple and a haptic —
deliberately **without** `playTap`, because Home already plays tap through its
own handler and passing both fires on `pointerdown` and again on `click`.

**The modulepreload trap the lab cost us is still live for any lazy chunk**, and
it is the reason `build:check` exists in this shape. Keeping a dev-only chunk off
a child's device needs **four** things: the route branch behind
`import.meta.env.DEV`, the chunk carved out with a named `manualChunks` prefix,
that prefix in the PWA `globIgnores` — and the `lazy(() => import(...))` **at
module scope itself behind `import.meta.env.DEV`**. Without the fourth, the first
three are all true and Vite still writes a `<link rel="modulepreload">` into
`index.html`, so every child eagerly downloads it on first paint. It was live on
ellaz.fun until 2026-08-03. Verify with `npm run build:check`, never by reading
the code — the greps that missed it were each individually correct.

The blind protocols, the ethical line the lab declined to cross, the damping law
that made the sounds stop reading as synthetic, and what the tournament cost:
[`docs/juice-lab.md`](docs/juice-lab.md), now a past-tense record.

## Known traps (learned here)

- **Nested React root teardown:** DOM games mount their own React root via
  `reactHost.tsx`. Its teardown MUST be deferred with `queueMicrotask` — unmounting a
  nested root during the portal's own unmount throws `removeChild: node is not a
  child`. Don't also clear the mount node in `GameHost` (double-free).
- **SW serves stale bundle** during QA (see Commands). This is intended `prompt` behavior.
- **Never name a file as a case-variant of a neighbour.** This repo sits on `/mnt/c`,
  which is case-INSENSITIVE, so `@ui/GameArt` and `@ui/gameArt` are the same path here
  and different paths in CI. A new `GameArt.tsx` beside the existing `gameArt.ts`
  resolved silently to the SVG module; `tsc` caught it in seconds ("has no exported
  member named 'GameArt'. Did you mean 'gameArt'?"), but only because the export names
  differed. The component is `gameArtView.tsx`.
- **No backend by design, so clearing browser storage erases the child's coins,
  stars and room.** Everything lives in `localStorage` (`ellaz:profile:v1` plus the
  per-game save keys), which also means a phone and a tablet are two separate
  players with two separate rooms. `migrateProfile()` salvages a corrupt or partial
  record rather than throwing, but nothing can recover a cleared one. The v2
  mitigation idea is an export/import backup code the player can write down; it is
  explicitly OUT of scope, and it is not a reason to build accounts.

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
| Runbook, quotas, the DNS shape for a nicer URL | [`holdem/README.md`](holdem/README.md) |

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
([`name-pool-convention.md`](.claude/rules/name-pool-convention.md) — read the
archive exception, because a finished hand stores RENDERED names while the live
table stores ids), a deploy gate that reads the network rather than `dist/`
([`a-second-published-artifact-needs-its-own-gate.md`](.claude/rules/a-second-published-artifact-needs-its-own-gate.md)),
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
[`a-workflow-outside-the-repo-root-is-an-ordinary-text-file.md`](.claude/rules/a-workflow-outside-the-repo-root-is-an-ordinary-text-file.md).
The deploy skips with a warning when the two Cloudflare secrets are absent, so
**a green tick is not proof it deployed** — the same caveat the Hostinger job
carries, and the reason `scripts/assert-holdem-live.mjs` runs in the same job.
What that gate got wrong on its first real run, and why a cascade of red lines
points away from its own cause:
[`a-gate-must-tell-not-yet-from-wrong.md`](.claude/rules/a-gate-must-tell-not-yet-from-wrong.md).

**`poker.ellaz.fun` is not set up.** A subdomain CNAME at Hostinger pointing at
`ellaz-holdem.pages.dev` works with DNS staying where it is; only an apex would
force ellaz.fun's nameservers onto Cloudflare, which would be a much larger
change. Add the domain in the Pages dashboard **before** creating the CNAME, or
it answers 522. Procedure: `holdem/README.md` § The URL.

## Deploy

**Normal path: push to `main`.** Both hosts build and publish themselves — see
the Deploy table under Architecture. Nothing needs to be built or uploaded by
hand, and a hand-uploaded `dist/` is how the two hosts drift apart.

Manual escape hatches, for when CI is down:

```bash
npm run build && firebase deploy    # legacy Firebase target (firebase.json)
# Hostinger by hand: npm run build, cp deploy/hostinger.htaccess dist/.htaccess,
# then upload dist/ to public_html via hPanel's File Manager.
```

## Firebase — the project is real now, and it must stay free

`.firebaserc` has named `ellaz-games` since long before the project existed, so
that `firebase deploy` line above would simply have failed. The project was
created for real on 2026-08-03 (number `93565492047`): Firebase added, a web app,
Firestore Native in **me-west1 (Tel Aviv)**, and Anonymous sign-in enabled. It
backs the players/boards work, not hosting - the live site stays on Hostinger.

**It has NO billing account, and that is the whole cost guarantee. Never link
one.** A GCP project with no billing account has no payment path at all: every
service either runs inside its free quota or returns an error. It cannot produce
a bill, so no budget alert is needed and none can be set.

The one way to break that is to accept an **"Upgrade to Blaze"** prompt, which
Firebase offers whenever you touch Cloud Storage, Cloud Functions, or extensions.
**Decline it, every time.** Nothing this platform needs requires Blaze:

- **Anonymous auth is free** and has no paid tier here. Note the trap - the
  *console* toggle is free Firebase Auth, while the `identityPlatform:initializeAuth`
  **API** is the paid Identity Platform product and answers `BILLING_NOT_ENABLED`.
  That error means "use the console", never "enable billing".
- **Phone auth bills per SMS even at tiny volume.** It is off. Leave it off - we
  ask a child for nothing, so there is no reason to turn it on.
- **Cloud Storage is not provisioned** and must not be. Original SVG ships in the
  bundle; the World needs no uploads.

**Cloud backup talks to it over plain HTTP — there is no `firebase` dependency
and there must not be one.** The SDK is ~150-200 KB gz, close to three times the
whole first visit, to do three things that are ordinary REST calls: anonymous
sign-in, read one document, write one document. `src/sdk/cloud.ts` is the client
and it lives in a lazy `cloud-*` chunk. **Rules are released through the Firebase
Rules API, not by this repo's CI**, so a `firestore.rules` edit that was never
released is invisible from the source tree — run `npm run probe:cloud` after any
rules change. It drives the live project with a positive control on every
negative, which is how the original "no rules release exists at all" was found.
Cloud backup is a **backup and a transfer, not live sync**; making it live needs
per-device counters on the profile first.

**A transfer carries two things, because progress lives in two places.** The
profile (coins, stars, the room) is one key; every personal best is a separate
key per game per board, written by each game's own `SaveStore`. The first version
carried only the profile, so it restored a room with none of the records that
filled it and said nothing - `src/sdk/records.ts` is the missing half. An incoming
document may **never name its own storage keys**: every key is matched against an
anchored `ellaz:<game>:score:<board>` pattern before it reaches the disk, because
otherwise a crafted document could write `ellaz:cloud:v1` (this device's identity)
or `ellaz:profile:v1`. Adoption **unions** rather than replaces - `ctx.score` has
no `clear()` and a transfer must not become one - and it cannot merge by taking
the better of two values, because only the number is persisted and not the unit.

**Restoring is the only action in this app that destroys progress**, so it carries
two guarantees that no other screen needs and that a future destructive feature
must inherit: the confirm shows a NUMBER for what is lost beside what is gained
(prose describes a risk, a number lets someone notice it is the wrong tablet), and
`adoptRestored()` keeps the replaced profile at `ellaz:profile:undo:v1` so
`undoRestore()` works **after a reload** — the realistic moment anyone notices is a
child opening the app hours later. Its sibling: the backup code is generated
locally, so it exists whether or not anything reached the cloud. It is shown dimmed
and labelled unsaved until an upload confirms, never as a promise the network has
not made. Both rules, and the `void someAsyncSave()` tell that hides the second one:
[`.claude/rules/destructive-actions-show-both-sides.md`](.claude/rules/destructive-actions-show-both-sides.md).

Firestore's free daily quota is the real design constraint, and running out is
fail-closed - reads are refused until it resets, which costs nothing and shows a
child a stale board rather than a charge. **That makes write VOLUME a correctness
question, not a tuning one**: exhausting the daily allowance stops backups for
every player at once. Three things hold it down, and all three are load-bearing -
the sync debounce is 30s (not 5s, which cost up to 720 pushes an hour of play and
is only safe to lengthen because `visibilitychange` flushes, which is how phone
sessions actually end); the `codes/<code>` index is written **once per page load**
rather than once per push, latched in memory so a fresh load re-verifies it and
quietly repairs a lost index; and a push whose profile is byte-identical to the
last successful one is skipped. The skip compares the profile **without
`updatedAt`** - that stamp moves on every wallet mutation, so comparing the whole
serialised record would never match twice and the check would be dead code that
always passed. Together: ~1,440 writes/hour worst case down to ~121. Confirm the current numbers at
<https://firebase.google.com/pricing> before designing near the edge, and assume a
naive "top 100" board read costs 100 reads. Prefer `count()` aggregations and
cache what you can, which is also why the board design is percentile-first.

## Measurement — there are TWO analytics systems, and NEITHER reports

**Google Analytics is live and has never counted a thing.** `G-E25QBB8420`, one
literal in `src/build/analytics.ts`, emitted into all 164 documents and the app
shell, absent from the 404 and from the whole noindex mirror. Measured live
2026-08-22: `gtag/js` 200, `/g/collect` **204 on every pageview**, no cookie.
Every gate here passes and the property is empty.

The answer is in the collect URL, which nothing here had ever read:
`gcs=G100` — ad_storage **and** analytics_storage DENIED, `gcd=13p3p3p3p7l1`,
denied by default and never updated. A GA4 hit under denied `analytics_storage`
is a cookieless consent-mode ping: raw material for behavioural modelling rather
than a counted pageview, and modelling wants roughly a thousand events a day for
a week. This site gets eight clicks a month. **A 204 means Google accepted the
packet; it has never meant anybody counted it.**

**It is not a bug** — it is exactly the cookieless, ads-off, no-banner setup that
was asked for. What nobody priced is that at this size it also means no data.

**The obvious fix did not exist, so there is a banner now.** "Grant
`analytics_storage`, keep `client_storage:'none'`, stay cookieless" was proposed
and measured on the live site with a control: granting writes `_ga` **and**
`_ga_E25QBB8420` with `client_storage` untouched. Consent governs the cookie, so
the trade was binary — no cookie and no data, or data and a banner. **The
operator chose the banner on 2026-08-22.**

**`src/build/consent.ts` is that bar, and the consent DEFAULT stays `denied`** —
that is the whole design, not an oversight. The first hit of a first visit still
goes out denied, before anybody is asked, and only an explicit Accept flips it
with `consent update`. A bar shown while the tag was already granted would be
theatre. Verified live on `afafd7a`: `gcs=G100` on the page-view hit,
**`gcs=G101` on the next one after the click**, ad_storage denied in both.

It is **emitted, not bundled**, on the `langOffer` rails, so all 160 document
pages carry it with no JavaScript of their own. Four things in it are
load-bearing rather than styling, and each is mutation-proved (5 planted, 5
killed): `position: fixed` so it cannot shift a page — `/world/` went 0.2966 to
0.0032 the same day, and a bar in flow would trade one metric for another;
hidden until script, because a reader with no JS has no `gtag` to consent to
either; **Accept and Decline styled by ONE selector**, so the quiet-decline dark
pattern requires splitting it; and primary-host-only, keyed on the same
`base === "/"` test the tag uses, so the mirror cannot ask for consent to a tag
it never loads.

Measured live: Decline writes **no cookie**, stores `denied` and does not come
back on other pages; Accept writes `_ga`, stores `granted`, and the bar is gone.

**It cost 593 B gz** — two arms on one tree, 90,021 without and 90,614 with, not
subtracted from anything written down earlier — and the ceiling went 90,500 to
**91,000** with the reason in `scripts/assert-payload.mjs` rather than in a
commit message. It was trimmed first, which bought 61 B and was not enough.

**The prose beside the tag was the real trap.** `analytics.ts`'s doc comment
carried BOTH answers, forty lines apart, on the one question that decides it, and
the shipped literal agreed with only one. `analytics.test.ts` now reads its own
source and reds when a doc bullet declares a consent state the tag does not ship
(3 mutations, 3 killed, with a positive control so it cannot pass vacuously).
Full account: [`.claude/rules/a-tag-that-fires-is-not-a-tag-that-counts.md`](.claude/rules/a-tag-that-fires-is-not-a-tag-that-counts.md).

**Nothing outside that one file ever calls `gtag`**, so GA sees `page_view` and
nothing else. Every game event goes to PostHog instead — see below, and note that
fixing the consent state would still leave the games unmeasured.

**If it ever does report**: every pageview is a new user (measured — two loads of
one URL gave two different `cid`s), so `views`, `pages`, `countries`, `devices`
and `referrers` are real while **`users`, `sessions` and `engagement` are
inflated and must never be quoted.**

Analytics key is `VITE_POSTHOG_KEY` (public); see `.env.example`. Both workflows
pass it through from a repo secret of the same name.

**It is not set yet, and until it is, analytics does nothing.** `import.meta.env.VITE_*`
is substituted at BUILD time, so with the secret absent Vite writes `undefined`,
`if (!key) return` becomes always-true, and the whole init is dead-code-eliminated.
Verified against the live bundle on 2026-08-02: `person_profiles:"never"`,
`capture_pageview:!1` and `respect_dnt:!0` all had zero occurrences. Every event
since launch has been discarded — which is why economy tuning from `reward_grant`
has never had data to tune against.

Setting the secret is safe at any time: `build:check` fails the deploy if the
PostHog chunk would land in the precache, rather than shipping it behind a green
checkmark. **First visit is 89,164 B gz of the 90,000 ceiling** in
`scripts/assert-payload.mjs` — **836 B spare**, measured on the artifact
2026-08-13 on a tree carrying a peer's in-flight `daily` and `share` work; see
the attribution note further down before reading that delta as anyone's. (It was 69,624 on 2026-08-02, down from 143,234; the ceiling has
moved more than once since, so read `CEILING` in the script rather than trusting
this line.) **Adding a game costs the SHELL about 300 B gz** even though its code
is lazy: its `meta.ts` is in the statically-imported roster and its `gameArt`
scene is in the grid. Falling Blocks cost 306 B, measured against a clean `main`
build.

**The real number is 192 B gz per game, and both figures this file carried
before were wrong.** It said ~300 B from Falling Blocks; I raised that to ~745 B
on 2026-08-13 from Colour Sort and Merge. Each was measured across a window that
contained other changes, which is the same mistake twice — a delta is only a
per-game cost if the game is the only variable.

Isolated properly (two build arms from one tree, 25 games versus 6 with the
other 19 stubbed): **163 B is the card art and 29 B is the game's link in the
emitted home document.** The art dominates because `src/ui/gameArt.ts` is one
object literal — every scene is reachable, so every scene ships, on a screen
showing about eight cards. Dropping games from the roster *alone* saves only
**24 B each**, because the art never leaves with them; that number is the trap,
not the answer.

**So do not quote a per-game cost from a payload diff taken across a working
session.** Build two arms, change one thing.
[`docs/scaling-the-first-visit.md`](docs/scaling-the-first-visit.md) carries the
measurement, the O(1) rule that replaces the fixed ceiling, and the three steps.

**The ceiling stopped binding on 2026-08-13**, and how it stopped matters more
than the number, because the fix written down here was wrong about its own size
by a factor of eight and wrong about what was blocking it.

This file used to say the carve was worth ~546 B and needed 20 games to move off
the `@shared` barrel onto direct module paths first. Neither held. **The barrel
was never the blocker** — `manualChunks` assigns by module PATH, so who imports
what changes nothing; `src/shared/` was pinned to the shell wholesale by the
`src/{sdk,ui,juice,i18n,shared}` catch-all. And the only module in there the
shell genuinely reaches is **`rng.ts`**, via `sdk/names.ts` and
`sdk/backupCode.ts`, both of which already import the direct path for exactly
this reason. Everything else — `winMoment`, the spawner, the cast, the shapes,
the sequence brain, the game clock, the `Prompt` chip, both session hooks, and
the barrel itself — was downloaded by every child before they had chosen a game.

**One ordering rule in `manualChunks` moved all of it: 89,561 → 84,974 B gz,
4,587 B saved, headroom 439 B → 5,026 B**, which is roughly sixteen more games
rather than one. `rng.ts` is matched FIRST and returned to the shell, and that
ordering IS the guard: move it and the shell imports from the page chunk, which
is the failure `assert-first-visit.mjs` exists to catch and has now caught three
times. It passed with its negative control rejecting 9 of 9 planted entries, so
that green is a real one rather than a vacuous one.

**Latest reading: 53,132 B gz of 56,000, 2,868 spare** (2026-08-26, 42 games,
4 page locales, local Node 24 - read the CI figure before quoting it anywhere a
reader will act on). **The ceiling came DOWN, 91,600 -> 56,000, and it is the
first cut in that comment block rather than another raise.** Two things did it,
both measured as two arms of one tree:

- **The lazy loaders left the shell.** `catalog.ts` held an `import()` per game
  for every game; 15 stay and the other 23 live in `gamesRest.ts` beside their
  metas. First visit 91,319 -> 90,519, and the per-game SLOPE 69.9 -> 32.5,
  which is under the 40 `docs/scaling-the-first-visit.md` has asked for since it
  was written. `PER_GAME_BUDGET` came down 140 -> 45 in the same commit.
- **`react` and `react-dom` are aliased onto `preact/compat`.** The reconciler
  went 45,374 -> 7,936 B gz and the first visit 90,519 -> 52,956. Half of what a
  child downloaded before choosing anything was a rendering library and none of
  it was a game.

**Nothing in the test suite can see the second one, and for a day the suite was
lying about which runtime it tested.** `vitest.config.ts` resolves aliases from
ITS OWN config and carried the five path aliases and not those two, so all 4,303
tests exercised React 18 - still installed, still a dependency - while the site
shipped preact. They passed before the swap, after it, and would have passed had
it been broken. The two aliases are in `vitest.config.ts` now, so a future
component test tests what ships; nothing renders a component TODAY, so this buys
honesty rather than coverage. **The obvious control does not work**: measured,
`preact/compat` reports `version: "18.3.1"`, the same
`$$typeof: Symbol(react.element)` and even React's
`__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED`, so each of those passes
under React. A vnode's `constructor` is `undefined` in preact and `Object` in
React, and that is the whole discriminator;
`nested-root-teardown.test.ts` asserts it and has been watched failing with the
aliases removed. Full account:
[`.claude/rules/a-runtime-swapped-by-an-alias-is-invisible-to-the-suite.md`](.claude/rules/a-runtime-swapped-by-an-alias-is-invisible-to-the-suite.md).

The environment is `node` and the include is `*.test.ts`, so the suite still
renders nothing, and the two ways the swap breaks do not throw. `useSyncExternalStore` is what re-renders the grid when the
lazy metadata and card art land, so a subtle difference leaves every card below
the fold blank forever with a clean console; and `reactHost.tsx` tears down a
nested root inside the portal's tree, which is a different code path in preact.
`scripts/repro/repro-preact-swap.mjs` is the evidence: 42 of 42 games mount in a
real browser, both lazy-arrival controls fire (`art-rest` blocked reads 15 of 39
cards, `meta-rest` blocked reads 15 labelled), and the home, the room and the
boards render BYTE-IDENTICAL to the React arm at 390x844.

**A second harness compares the two builds head to head.**
`scripts/repro/repro-arm-parity.mjs` runs both arms over all 42 games and judges
pixels and behaviour separately, because a game can render identically and be
dead. Most games here are RANDOM, so a cross-arm pixel difference is the
EXPECTED reading and not a finding: a second pass re-shoots ONE build for exactly
the games that differed, and where a build differs from itself as much as the two
builds differ there is nothing left for the engine to explain. Measured
2026-08-26 on one tree with only the alias reverted: **42 games, 0 behaviour
differences, 0 unexplained pixel differences, 0 console errors in either arm, 11
screens byte-identical and the other 31 explained by their own deal.** Three
games were flagged and re-run three times each before that was said out loud.
`--control` drives its verdict red with no setup, because a harness nobody has
watched fail is not a harness - and this one had two verdict defects of its own
when `/deep-test` went looking (its header carries them).

**Reverting is four lines and a build**: drop the two aliases from
`vite.config.ts` and the two from `vitest.config.ts`. `react` and `react-dom` are
deliberately still installed and still dependencies - they cost the bundle
nothing, they carry the types, and they are what makes that revert a config edit
rather than an install.

**That probe was wrong twice before it was right, and the React arm is why I
know.** Its first card-art counter read 1 of 39 and its node floor called snake,
bubbleshooter and fruit broken - and running it against the React build reported
the identical three failures. `card.querySelector("svg")` returns the STAR
BADGE, and a canvas game draws almost no DOM. Never read a single arm.

The slope at 42 games is **29.0 B gz per game**. Run `npm run assert:slope` and
`npm run assert:payload` on the tree in front of you rather than trusting either
number here.)

(**The superseded readings live in [`docs/payload-history.md`](docs/payload-history.md)** -
about a dozen of them, newest first, verbatim. They are kept out of this file on
purpose: every one was correct on its own tree and wrong about every other, so a
stack of them here was teaching the opposite of what it says. Run
`npm run assert:payload` for the live figure.)
**The transferable half is the measurement, not the bytes.** Two numbers in this
file were confidently wrong at the same moment: a ceiling of 86,000 that the live
gate had read `90_000` since a parallel lane raised it, and a 546 B estimate for
work nobody had ever measured. Both were written by someone who had measured
something true at the time. **Re-measure before quoting any payload figure here**
— the gate is one command, and this prose has now gone stale twice. See
[`.claude/rules/a-threshold-tuned-against-todays-tree-goes-stale.md`](.claude/rules/a-threshold-tuned-against-todays-tree-goes-stale.md).
