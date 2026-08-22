# itch.io - three project pages, ready to paste

**Status**: drafts. Nothing is uploaded. The operator creates the account, uploads the
zips and pastes the copy below; no part of this is automated and no part of it should be.

**What gets uploaded.** `npm run build:standalone` with `STANDALONE_GAME=<id>`, then zip
the contents of `dist-standalone/<id>/` with `index.html` at the **root of the zip**, not
inside a folder. Measured 2026-08-18:

**Build the zips LAST, after the final commit.** The stamp is `git rev-parse HEAD`,
so *any* commit - yours or a peer's - makes every existing zip stale and
`assert:standalone` refuses it by name. That is the gate doing its job; it is also
an ordering constraint, and doing it in the other order means building twice.
Measured 2026-08-22: a peer landed a commit between two gate runs in the same
session, and the push of the fix invalidated the zips a second time.

**The zips go in `dist-standalone-zips/`, never in `dist-standalone/zips/`.** The gate
walks every CHILD of `dist-standalone/` and treats each as a bundle, so a `zips/`
folder parked there reports as a fourth bundle with `0 html, 0 js` - which is the
exact shape a killed upload leaves, so it reads as a torn bundle rather than as a
misplaced folder. Both directories are gitignored.

**Gate the ZIP, not the build directory.** The directory passing says nothing about
what actually leaves in the archive - a wrong root, a dropped file, a path
separator. Extract each zip to a scratch root shaped `<root>/<id>/` and run the real
gate over it:

```bash
BUNDLE_ROOT=/path/to/extracted node scripts/assert-standalone.mjs
```


| Game | id | Bundle | Why this one |
|---|---|---|---|
| Sudoku | `sudoku` | 225 KB | DOM only, six difficulty levels, the clearest single-screen game we have |
| 2048 | `2048` | 204 KB | the most recognisable mechanic on the site |
| Snake | `snake` | 1.9 MB | the only game that loads Phaser, and the only canvas game of the three |

**`STANDALONE_GAME` takes the game's `meta.id`, never its directory name**, and this
table said `n2048` until 2026-08-22 - so the first command an operator typed from this
page failed. The build refuses loudly and prints the whole roster, which is the right
shape, but a draft whose first instruction does not run is a draft nobody finishes:

```
$ STANDALONE_GAME=n2048 npm run build:standalone
Error: unknown game "n2048" - the roster has: memory, evolve, coloring, ... 2048, ...
```

Only one game in the catalogue has a directory that differs from its id, which is why
this survived: `src/games/n2048/` publishes as `2048` everywhere a person sees it.

Snake is nine times the size of the other two for one reason: it is the only game in the
repo that imports Phaser (`grep -rln 'from "phaser"' src/`). There is no payload ceiling
on itch, so this is a note rather than an objection. Upload sudoku first; it is the better
first listing whatever happens to the other two.

**Every bundle carries a 1.2 KB `gamesRest-*.js`, and it must stay.** It holds the
names and colours of the roster's below-the-fold half, it is byte-identical across all
three zips, and for sudoku, 2048 and snake it is never fetched - all three sit in the
shell half, so `entryFor` resolves them without it. It looks exactly like something to
delete from an artifact labelled "Sudoku". **Deleting it breaks every game in the other
half**, which reach it through `ensureFullCatalog()` and would then mount nothing.
Measured 2026-08-22, after the roster split.

<!-- outreach-facts:off -->
(That paragraph was rewritten once: it said "the other 18 games" and `assert:outreach`
read the phrase as a roster claim and asked for 33. The gate was right to fire - a bare
"N games" in this folder is a claim about the catalogue - and `--fix` would have made
the sentence false. Say which half, never how many.)
<!-- outreach-facts:on -->

**Before uploading, run the gate**: `npm run assert:standalone`. It checks for absolute
paths, a service worker, a phone-home, a missing `index.html`, and a filename whose case
does not match what the code asks for. That last one passes on this machine and 404s on
itch, because `/mnt/c` is case-insensitive and their CDN is not.

---

## The one sentence that has to be on every page

itch serves an uploaded game inside a **cross-origin iframe**. Chrome partitions storage
for those, and Safari may refuse it outright, so coins, stars and personal bests may not
survive between visits **on itch specifically**. Nothing breaks and nothing errors - every
storage write in the app is already wrapped in try/catch - the progress simply does not
come back.

That is not a defect to hide. It is the reason to click through, and it belongs in the
description of all three pages, in these words or very close to them:

> Your coins and your room live at ellaz.fun. This page is a copy of one game, so
> progress here may not be saved between visits. Everything is free in both places.

---

## Fields itch actually asks for

Filled per game below. The ones worth deciding once:

- **Kind of project**: HTML. **Pricing**: No payments. **Release status**: Released.
- **Uploads**: tick **"This file will be played in the browser"**.
- **Embed**: 800 x 900, **Mobile friendly** on, **Fullscreen button** on, automatic start on.
  Our games size themselves against the **viewport** (`min(90vw, 60vh, cap)`), so inside a
  small frame they scale down to fit rather than clipping. Fullscreen is where they look
  the way they are meant to, which is why that button is not optional.
- **Community**: Comments on. Somebody asking a question is the entire point of being here.
- **Visibility**: Public, once you have looked at the embedded game yourself.

---

## Project 1 - Sudoku

**Title**: `Sudoku for Kids and Grown-Ups`

**Short description / tagline** (itch shows this in listings, keep it under ~120 chars):

```
Six levels, from a 4x4 animal grid for a five-year-old to a full expert 9x9. Free, no ads, no account.
```

**Description**:

```
A sudoku that starts small enough for a child who cannot read yet.

The first two boards use animals instead of numbers - a 4x4 and then a 6x6 - so the rule
is the only thing to learn. Above those are four number grids on a full 9x9, ending at an
expert board that is not gentle with anybody. Your best time is kept per board, so a 4x4
record and a 9x9 record are two separate achievements rather than one meaningless number.

There are no ads, no account, no download, and nothing to type anywhere. It works on a
phone, a tablet or a computer, and it works offline once it has loaded.

One honest thing: the expert board frustrates most adults, and that is on purpose. Start
at the animals with a young child and move up when they ask to.

This page is one game out of 33. The rest live at https://ellaz.fun - in Hebrew,
English, Spanish and French, with a room you decorate using coins the games pay out.

Your coins and your room live at ellaz.fun. This page is a copy of one game, so progress
here may not be saved between visits. Everything is free in both places.
```

**Genre**: Puzzle. **Tags** (itch allows 10; these all exist in their vocabulary):
`puzzle` `sudoku` `casual` `family-friendly` `kids` `html5` `mobile` `relaxing`
`no-ads` `singleplayer`

**Languages**: English. (`standalone.html` is hardcoded `lang="en"`, so the uploaded
bundle resolves one shipped locale and it is English. The SITE has four written
languages; this listing describes the BUNDLE, and promising Hebrew here would ship a
listing the download cannot honour.) **Inputs**: Mouse, Touchscreen, Keyboard.
**Accessibility**: Interactive tutorial / One button (both true; do not tick colour-blind
support, which has not been tested).

---

## Project 2 - 2048

**Title**: `2048 - Slide and Merge`

**Short description / tagline**:

```
The tile game, with nothing bolted on. No ads, no account, no timer shouting at you.
```

**Description**:

```
Slide the tiles, merge the matching ones, try to reach 2048.

That is the whole game and it has not been improved. What is different is what is
missing: no advertisement between attempts, no account, no popup asking you to rate it,
no counter telling you how many people beat your score today.

It remembers where you were. Close the tab in the middle of a good run, come back, and
the board is still there.

One honest thing: this mechanic is thirty seconds to learn and roughly forever to put
down. It is not a game to hand a child ten minutes before bedtime.

This page is one game out of 33. The rest live at https://ellaz.fun - in Hebrew,
English, Spanish and French, with a room you decorate using coins the games pay out.

Your coins and your room live at ellaz.fun. This page is a copy of one game, so progress
here may not be saved between visits. Everything is free in both places.
```

**Genre**: Puzzle. **Tags**: `2048` `puzzle` `numbers` `casual` `html5` `mobile`
`singleplayer` `no-ads` `minimalist` `family-friendly`

**Note on the URL**: `n2048` is the DIRECTORY in the source; the game's id is `2048`,
and that is what it publishes as everywhere a person sees it. The itch project URL
should be `2048`, and so should `STANDALONE_GAME`.

---

## Project 3 - Snake

**Title**: `Snake`

**Short description / tagline**:

```
Snake, at three speeds, on any screen. Free, no ads, and it works offline.
```

**Description**:

```
Snake. Arrow keys on a computer, swipe on a phone.

Three speeds, and the fast one speeds up further as you grow, so a long run ends because
the board became the enemy rather than because a timer ran out. Your longest run is kept.

No ads, no account, no download.

One honest thing: this is the largest of our games to load, because it is the only one
that runs on a game engine rather than plain web pages. On a slow connection give it a
few seconds the first time.

This page is one game out of 33. The rest live at https://ellaz.fun - in Hebrew,
English, Spanish and French, with a room you decorate using coins the games pay out.

Your coins and your room live at ellaz.fun. This page is a copy of one game, so progress
here may not be saved between visits. Everything is free in both places.
```

**Genre**: Action. **Tags**: `snake` `arcade` `retro` `casual` `html5` `mobile`
`singleplayer` `no-ads` `high-score` `family-friendly`

---

## Cover image and screenshots

itch wants a cover at **630 x 500** (minimum 315 x 250) and up to five screenshots.

We already generate a 1200 x 630 share card per game (`src/build/ogCard.ts`), and it is
the wrong shape for this - cropping it to 630 x 500 cuts the title. Take the screenshots
from the live game at `https://ellaz.fun/games/<id>/` instead, on a phone-width window,
and make the cover from the game's own art rather than from a screenshot of chrome.

Do not upload a cover with text baked into it in one language. The audience here reads
English; the site is Hebrew-first. A picture of the board avoids choosing.

---

## Provenance

| Claim in the copy | Where it comes from |
|---|---|
| 33 games | `src/portal/catalog.ts`, counted 2026-08-18 |
| bundle sizes 225 KB / 204 KB / 1.9 MB | `dist-standalone/{sudoku,2048,snake}` summed on the built artifacts, re-measured 2026-08-22 |
| snake is the only Phaser game | `grep -rln 'from "phaser"' src/` returns one file |
| six sudoku levels: 4x4 and 6x6 animals, then four 9x9 tiers | `LEVEL_OPTIONS` in `src/games/sudoku/Sudoku.tsx` and `LEVELS` in its `logic.ts`. **The first draft of this file said "four sizes" and it was wrong** - six levels across three board sizes. Caught by reading the source, which is the whole reason this column exists |
| best time kept per board | `src/sdk/score.ts` plus the per-board scoping in `score-contract-convention.md` |
| 2048 remembers the board | `src/sdk/session.ts`; 2048 is one of the six games with resume |
| nothing to type anywhere | `src/sdk/names.ts` - a name is two word ids from a fixed pool |
| works offline after first load | the PWA precaches the shell (`vite.config.ts` workbox) |
| iframe storage may not persist | itch's own HTML5 docs describe the iframe embed; Chrome partitions storage for third-party iframes |
| embed sizing behaviour | `CLAUDE.md` § Responsive - boards size against the viewport, not their container |

**Destination check, 2026-08-11**: `https://itch.io/docs/creators/html5` returns 200 and
is the source of the zip-root and relative-path requirements. `https://itch.io/game/new`
returns 403 to a script, which is expected for a page that requires a login, and is not
evidence of anything either way.
