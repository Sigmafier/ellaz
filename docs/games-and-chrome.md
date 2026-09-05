# Games, the module map, and the chrome around a game

<!-- Extracted VERBATIM from CLAUDE.md on 2026-08-29, when CLAUDE.md was 164,867 chars
     and over Claude Code's 150,000-char per-file limit. Nothing was reworded; the text
     below is byte-identical to what CLAUDE.md held at commit bb8c47b, and
     `npm run assert:context` proves it. CLAUDE.md now points here instead of
     carrying this on every single turn of every session. -->

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
[`rtl-spatial-grid-dir-ltr.md`](../.claude/rules/rtl-spatial-grid-dir-ltr.md) §
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
[`.claude/rules/a-deploy-ledger-that-can-disagree-with-the-disk.md`](../.claude/rules/a-deploy-ledger-that-can-disagree-with-the-disk.md).

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
[`docs/deploy.md`](../docs/deploy.md) (verification commands, troubleshooting table,
secret rotation, the CDN edge-cache caveat, and how to move to Pages later).
The discipline that found those three settings:
[`.claude/rules/verify-the-deploy-target-not-just-the-run.md`](../.claude/rules/verify-the-deploy-target-not-just-the-run.md).

**The Hostinger CDN is OFF (2026-08-08), and that is load-bearing for SEO.** Its
`I'm Under Attack!` mode had been on, serving every crawler a JavaScript
proof-of-work it cannot solve: HTTP 403 with an HTML body where the sitemap
belonged, while the site loaded perfectly in a browser. Google reported "Sitemap
could not be read", 0 discovered pages. Nothing in this repo could see it - every
gate here asserts against `dist/`, and none against what a crawler receives over
the network. If the CDN is ever re-enabled, set Security Level to **Essentially
off** in the same visit; the Medium default is enough to re-block a 48-URL crawl.
Verify by `curl`ing as Googlebot, never in a browser:
[`.claude/rules/a-bot-challenge-at-the-edge-is-invisible-from-your-browser.md`](../.claude/rules/a-bot-challenge-at-the-edge-is-invisible-from-your-browser.md).

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
[`.claude/rules/a-threshold-tuned-against-todays-tree-goes-stale.md`](../.claude/rules/a-threshold-tuned-against-todays-tree-goes-stale.md).

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

**Restart must clear what the game's INPUT is gated on, not just deal a new
board.** Seventeen games refuse a tap while the run is over (`if (won) return`,
`if (solved) return`, `if (lockRef.current) return`). `onestroke` shipped a
restart that rubbed the drawn line out and never cleared `won`, so after a win
it handed back a board reading `1/23` with the WINNING clock still frozen on it,
answering no finger at all - and every cheaper check passed, because the markup
really did change. `restart-clears-the-input-gate.test.ts` asks the question of
every game; `scripts/repro/repro-onestroke-restart-after-win.mjs` solves a board
for real and presses the button. The ref case is the subtle half: `if (x.current)
return` is either a gate restart must clear or a run-once latch it must not, and
the NAME cannot tell them apart - a game that sets the ref back to false
somewhere has a gate, one that never does has a latch.
[`a-restart-must-clear-what-the-input-is-gated-on.md`](../.claude/rules/a-restart-must-clear-what-the-input-is-gated-on.md).

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
[`a-row-that-grows-with-the-catalog-must-wrap.md`](../.claude/rules/a-row-that-grows-with-the-catalog-must-wrap.md),
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
([`a-fixed-shell-cannot-chain-a-gesture-to-a-sibling.md`](../.claude/rules/a-fixed-shell-cannot-chain-a-gesture-to-a-sibling.md)).

**The consent bar covers the bottom of any lab screen on a FIRST visit** - a
fresh browser context always sees it, the operator dismissed it once and never
will again, so a probe that leaves it up is measuring a state nobody is in.

`scripts/repro/repro-bench-on-a-phone.mjs` drives all four tabs at 390x844 with
touch and re-runs every guard. The full account - why G1 was already live, the
three phone defects and how each was measured, the sticky/box-shadow/thumbnail
findings, and the two measurement traps that made a real 10px gap read as
`same` - is in [`docs/build-log.md`](../docs/build-log.md) § the design bench, and
the rule is
[`a-layout-nobody-can-look-at-drifts-into-a-different-one.md`](../.claude/rules/a-layout-nobody-can-look-at-drifts-into-a-different-one.md).
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
caught. Full account: [`docs/build-log.md`](../docs/build-log.md) § the home bar on
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
  [`docs/build-log.md`](../docs/build-log.md) § chrome.
  [`.claude/rules/game-controls-and-platform-chrome-never-share-a-bar.md`](../.claude/rules/game-controls-and-platform-chrome-never-share-a-bar.md)
  · [`.claude/rules/space-between-spreads-whatever-survives-the-media-query.md`](../.claude/rules/space-between-spreads-whatever-survives-the-media-query.md)
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

### Match Three — power-ups, made by the SHAPE of a match

Asked for 2026-09-04, issue #24: "the candy crash super powers".

**There is no new input.** A gem's KIND is decided by the shape of the run that
made it, and it fires when it is CLEARED — never by being tapped. Nothing a
five-year-old has to be taught: you match, and sometimes the board does
something bigger. Four kinds:

| shape | gem | what it takes |
|---|---|---|
| four in a line | a stripe **along** the run | that whole row, or that whole column |
| an L or a T | a burst at the **intersection** | the 3x3 around it |
| five or more | a rainbow | every gem sharing its colour |
| a cross with a five-long arm | a rainbow, **not** a burst | as above |

That last row was wrong in the first draft: retiring both runs of a cross meant
the five never reached the rainbow branch, so a child who lines up five that
happen to touch a three got the *weaker* gem for the bigger shape.

**A KIND IS A SECOND ARRAY, parallel to the grid**, not a richer gem — so
`findMatches`, `hasMove`, `dealBoard` and `shuffleBoard` all still reason about
colour alone and are the same code they were before this existed. Three cells
assert exactly that. A minted gem SURVIVES its own match, and a blast that
catches another special fires it too, to a fixed point rather than one pass: a
chain that stops after one link is what makes a power-up feel broken.

**Two defects the tests were written to catch, both invisible on screen:**

- `spawned` was derived by DIFFING the kinds arrays across gravity. A special
  that merely FELL lands on a square that used to be plain, so every drop read
  as a fresh mint and the renderer drew the sparkle on a gem the child had had
  for three moves. It is mapped through `collapse`'s own record of what moved
  where now.
- The marks are drawn from `viewKinds`, a second replay array set at every one
  of the four places `view` is set. Drawing them from the settled state instead
  puts every power-up on the wrong gem for the length of the animation — the
  same reason `view` exists at all.

**The mark is SHAPE-distinct and its ink was measured.** Bars across, bars down,
a ring, a star, in `#12172B` — which scores **4.06 (purple) to 11.38 (yellow)**
against all six gem fills, so every one clears the 3:1 floor a graphical object
needs. White scores **1.56 on yellow, 1.87 on green, 2.20 on blue**: it fails
four of the six, and the gem it looks best on is the one nobody would have
checked. A negative cell pins that, so an ink change has to walk past it.

The rainbow's star arms are **5 units wide, not 8**, and that was a real
before/after: three widths rendered on the real hexagon at both 136 px and the
board's own **41 px**. At 8 the eight points fill in and the mark reads as a
dark BLOB at board size; at 5 it is still an asterisk. All three look identical
at 136 px, which is the size nobody plays at.

**The snapshot is version 2**, so every v1 board is discarded rather than
migrated — the port's own rule, and the alternative (defaulting a missing
`kinds` to all-plain) is a second copy of this game's rules living in a
validator nothing keeps in sync.

**20 planted defects, 20 caught**, ten in the rules and ten in the renderer —
and the renderer harness needed three attempts. Two instruments reported four
distinct mark branches on a file where the rainbow had been mutated to draw the
burst's exact markup: the first compared strings that each began with their own
kind's NAME, and the second let the last branch run to the end of the function
so it carried `return null;` and its neighbour did not.

### Bubble Shooter — the aim guide's off switch, and squeezing through a gap

Two player reports, 2026-09-04, issues #28 and #29.

**The guide has a switch now.** It always drew the dashed path and the landing
ring, unconditionally; a chip in the game's footer turns both off, on its own row
and at the logical end rather than beside Shoot, because a settings chip next to
Shoot is one a child taps when they meant to fire. It **defaults ON** — the
renderer's own comment calls the ring "the single thing that makes the game
playable with a finger on a 390px screen", so off is a challenge a player goes
looking for. The choice is remembered under the game's own `ctx.storage`
namespace, written from the handler and never from a `setState` updater.

**A one-bubble gap can now be aimed at.** It was always legal to shoot through
and never possible to hit: a resting bubble is 1.0 wide and so is a flying one,
so the hole left by one missing bubble is a zero-clearance fit. Measured on the
shipped build, controls passing
(`scripts/repro/bubbleshooter-squeeze-window.mts`): the widest angle window that
got past a one-cell gap was **19.04 mrad — about 2.5 px of finger travel on a
360 px drag**. `SQUEEZE_DIST` is a second, tighter reach that applies only inside
a corridor (an empty cell with another empty cell one bubble-width ahead), so a
bubble with somewhere to go squashes through and a bubble facing a wall still
sticks. The value was swept, not chosen: **87.18 mrad, 11.5 px**, picked because
the nudge buttons step 80 mrad and a window narrower than one step is a move only
a dragging finger can make.

**Three guards written in that change were measured inert and one was deleted.**
Over 120 real boards x 601 angles (47.6M march steps, positive control 1.8M steps
where the reach decided the answer), a "the bubble must be one of the six forming
the gap" test could never fire — the hex packing puts the second ring of cells
sqrt(3) away, further than any point inside a cell can reach. It is gone, and the
geometry is written down in its place; the two remaining ones are labelled as
definitional rather than protective, so nobody later cites them as the thing
keeping the game correct.
