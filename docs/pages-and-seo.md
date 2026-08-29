# Every game has a real web address - pages, locales, pictures, prose

<!-- Extracted VERBATIM from CLAUDE.md on 2026-08-29, when CLAUDE.md was 164,867 chars
     and over Claude Code's 150,000-char per-file limit. Nothing was reworded; the text
     below is byte-identical to what CLAUDE.md held at commit bb8c47b, and
     `npm run assert:context` proves it. CLAUDE.md now points here instead of
     carrying this on every single turn of every session. -->

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
[`.claude/rules/a-spa-shell-is-invisible-to-ai-crawlers.md`](../.claude/rules/a-spa-shell-is-invisible-to-ai-crawlers.md).

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

**It woke up for four days in 2026-08 and it was a BUG that woke it** - the resolver guessed a prose path from the game's DIRECTORY, and `2048` is the one game whose id is not its directory, so one wrong-but-plausible date was the only thing keeping the field alive. `lastmod.test.ts` now pins WHICH FILES a date is derived from, by name, for that game. Full account: [`docs/build-log.md`](../docs/build-log.md) § lastmod.

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
[`.claude/rules/sw-navigation-fallback-hijacks-real-pages.md`](../.claude/rules/sw-navigation-fallback-hijacks-real-pages.md).

**The leaderboards are two screens, and the split is load-bearing.** They open on the
player's own games as cards, each already carrying their best, and a tap opens that
game's board with the difficulty and time rows labelled and a button straight into
playing it. The single page this replaced laid all twenty games out in one
non-wrapping flex row - 1,410px inside a 390px phone, clipped by the frame's own
`overflow: hidden` - so **fifteen of twenty games were unreachable**, not merely
awkward. See [`.claude/rules/a-row-that-grows-with-the-catalog-must-wrap.md`](../.claude/rules/a-row-that-grows-with-the-catalog-must-wrap.md);
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

(An un-isolated first-visit gap from 2026-08-04 is recorded in [`docs/payload-history.md`](../docs/payload-history.md).)

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
[`docs/build-log.md`](../docs/build-log.md) § Share cards.

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
autonyms: [`docs/build-log.md`](../docs/build-log.md) § locales, and
[`a-locale-page-without-a-translated-body-is-a-duplicate.md`](../.claude/rules/a-locale-page-without-a-translated-body-is-a-duplicate.md).
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

Full rule: [`.claude/rules/game-content-template.md`](../.claude/rules/game-content-template.md).
