# itch.io - three project pages, ready to paste

**Status**: draft - and the word is literal on both counts. **Sudoku is UPLOADED and sits
as an itch DRAFT** at
<https://itch.io/game/edit/4953564>, public URL <https://ytrofr.itch.io/sudoku> (which
404s to anyone logged out, which is what a draft looks like from outside and is not a
fault). Verified 2026-08-30 in the live form: title, url, `kind=html`, Released, No
payments, 1,138-char description, Puzzle + Educational, ten tags all accepted, embed
800x900 with mobile / autostart / fullscreen on, comments on, cover set, two
screenshots, AI disclosure answered by the operator. **And it was PLAYED in itch's own
player** - board rendered, timer running, number pad live, whole game inside the frame
with no inner scroll. That last check is the only one that could have caught the 2048
bundle which built, type-checked and gated 14/14 and did not run. 2048 and Snake are
still drafts here. The operator creates the account, uploads the zips and pastes the
copy below; no part of this is automated and no part of it should be.

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
| Sudoku | `sudoku` | 229 KB | DOM only, six difficulty levels, the clearest single-screen game we have |
| 2048 | `2048` | 228 KB | the most recognisable mechanic on the site |
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

This page is one game out of 42. The rest live at https://ellaz.fun - in Hebrew,
English, Spanish and French, with a room you decorate using coins the games pay out.

Your coins and your room live at ellaz.fun. This page is a copy of one game, so progress
here may not be saved between visits. Everything is free in both places.
```

**Genre**: Puzzle. **Tags** (itch allows 10, and its vocabulary is a FIXED LIST of 619 -
see the box below):
`puzzle` `casual` `family-friendly` `relaxing` `singleplayer` `brain-training`
`educational` `touch-friendly` `cute` `minimalist`

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

This page is one game out of 42. The rest live at https://ellaz.fun - in Hebrew,
English, Spanish and French, with a room you decorate using coins the games pay out.

Your coins and your room live at ellaz.fun. This page is a copy of one game, so progress
here may not be saved between visits. Everything is free in both places.
```

**Genre**: Puzzle. **Tags**: `puzzle` `casual` `singleplayer` `minimalist`
`family-friendly` `2d` `difficult` `score-attack` `endless` `touch-friendly`

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

This page is one game out of 42. The rest live at https://ellaz.fun - in Hebrew,
English, Spanish and French, with a room you decorate using coins the games pay out.

Your coins and your room live at ellaz.fun. This page is a copy of one game, so progress
here may not be saved between visits. Everything is free in both places.
```

**Genre**: Action. **Tags**: `snake` `arcade` `retro` `casual` `singleplayer`
`high-score` `family-friendly` `touch-friendly` `score-attack` `endless`

---

## The tag field is a FIXED VOCABULARY, and half our tags were not in it

**Measured 2026-08-30, in the live form**: `game[tags]` is a Selectize field preloaded
with **619 tags** and no server lookup. A tag that is not one of them is silently
DROPPED - `addItem` returns, the field shows nine chips instead of ten, and nothing
errors. This page previously said the tag lists "all exist in their vocabulary". They did
not, and the check that would have caught it is one line in the form's own console.

| draft list | rejected | why it reads plausible |
|---|---|---|
| sudoku | `sudoku` `kids` `html5` `mobile` `no-ads` | every one is a real word people use on itch pages - in the DESCRIPTION, not the tag field |
| 2048 | `2048` `numbers` `html5` `mobile` `no-ads` | `snake` IS a tag and `2048` is not, which is exactly the kind of asymmetry you cannot reason to |
| snake | `html5` `mobile` `no-ads` | itch sets platform from the project fields, so it has no platform TAGS at all |

Replacements, all confirmed present in the same list: `brain-training` `educational`
`touch-friendly` `cute` `minimalist` `2d` `difficult` `score-attack` `endless`.

**Check before pasting, not after**, on the open form:

```js
Object.keys(document.forms[2].querySelector('[name="game[tags]"]').selectize.options)
```

---

## The order matters, because PUBLISHING SKIPS THE EMBED BLOCK

**Measured 2026-08-30, and it cost 2048 a broken-looking first hour.** The embed
settings - viewport size, autostart, fullscreen button - do NOT exist on
`itch.io/game/new`. They appear on the EDIT page, and only once a playable file has
been uploaded. So a project taken straight from the creation form to Public goes live
in itch's default **640 x 360**, whatever the game needs. 2048 needs 900px of height:
it published with a grey "Run game" box, no fullscreen button, and the board clipped
behind an inner scrollbar. Every field on the form was correct.

Sudoku escaped this only because it was saved as a draft first, edited, and published
after - which is now the order:

```
create -> upload the zip -> tick "played in the browser"
       -> SET THE EMBED  800 x 900 - autostart ON - fullscreen ON - mobile ON
       -> cover -> screenshots -> AI disclosure
       -> Save as DRAFT -> play it in itch's own player -> only then Public
```

**And a second trap in the same area: saving is not publishing.** Visibility is its own
radio (`Draft` / `Restricted` / `Public`) and `Save` does not move it. Sudoku sat at
**404 for everyone** for fifteen minutes while every field read back correct, because
"I saved it" and "it is published" are two different facts.

**Verify the fix on the live IFRAME, never on the form that set it.** Reading
`embed[width]` back tells you what you typed. `document.querySelector('.game_frame
iframe').width` tells you what a visitor gets, and the presence or absence of the
`Run game` button is how you know autostart really took.

## The listing said the right thing four times while serving the wrong build

**Snake took four uploads to serve the build we meant, and the form was green on every
one of them.** The page rendered, the game played, the fields read back correct. What
was on screen was the previous bundle.

Two independent causes, neither of which the form can show you:

- **Two handover folders with the same name.** The package was being rebuilt at
  `C:\Users\ytr_o\ellaz-doors\` while the operator was opening
  `C:\Users\ytr_o\OneDrive\Desktop\ellaz-doors\`, whose `ellaz-snake.zip` was from the
  previous night. Same filename, same size to the eye, twelve hours apart. The upload
  was never at fault.
- **A scripted click does not reach itch's uploader.** Ticking "played in the browser"
  with `el.click()` flips the checkbox in the DOM and the component keeps its own state,
  so Save writes back what it still believes. A real mouse click reaches it, and itch's
  own reaction - the platform checkboxes disappearing - is the proof the handler ran.
  When a control needs a trusted event, the tell is that the page does not react beyond
  the pixel you changed.

**The instrument that settled it, in seconds, every time**: the entry chunk's name.
Vite derives `standalone-<hash>.js` from the bytes, so the served `index.html` naming a
chunk IS the build, and no click landing in the wrong place can make it agree.

```
served by the listing        standalone-SFusrQJJ.js   <- the old upload
the zip we handed over       standalone-tBBZWxFJ.js   <- the fix
```

And the control that makes it evidence rather than a coincidence: the superseded upload,
fetched by its own id, still reported `SFusrQJJ`. The probe could say either.

**So: hand the file over by CHECKSUM, and verify the listing by CONTENT.** Print the
byte count and the entry chunk beside the path in the checklist, and after publishing,
read the hashed name off the public page with no session. Proposed as `RCH14`.

## What a listing here actually buys, measured - and it is not a link

**itch nofollows every external URL a user supplies, everywhere on the platform.**
Measured 2026-08-30 on our own live project page and on two unrelated public profiles:

| where | the anchor | `rel` |
|---|---|---|
| our project page, in the description | `https://ellaz.fun` | `nofollow noopener` |
| `itch.io/profile/increpare`, website field | `increpare.com` | `nofollow me` |
| `itch.io/profile/terrycavanagh`, website field | `distractionware.com` | `nofollow me` |
| the same two profiles, social links | twitter / bsky | `me` |
| the same two pages, itch's own footer | itch's twitter / facebook | *(none)* |

The last two rows are the control, and they are the reason this reading is worth
anything: the same matcher on the same pages **did** report anchors without `nofollow`,
so it can express the answer we were hoping for and simply never returns it for a URL a
user typed.

So a listing here is a **playable copy where the audience already browses**, and the
players who find it. It is not authority, on two independent grounds: `RCH13` already
classes a link we placed ourselves as DISCOVERY however dofollow it is, and this one is
not dofollow either. Run the lane - it is worth running - but do not book it against the
2026-11-27 backlink verdict, and do not let it share a window with an authority lane
whose verdict has to stay attributable.

The check that would have said this before any of the work is the one
`reach-playbook` C8 already demands of a curated list: count `rel` on the destination's
real outbound anchors first. A platform got exempted from it for no better reason than
that it takes an upload instead of a letter. Filed as a note on `seo-playbook` D11,
whose own detail calls a platform door "usually the shortest path to a real link".

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
| 42 games | `src/portal/catalog.ts`, counted 2026-08-18 |
| bundle sizes 229 KB / 228 KB / 1.9 MB | `dist-standalone/{sudoku,2048,snake}` summed on the built artifacts, **re-measured 2026-08-29 at HEAD 167f7d2**: 234,374 / 233,133 / 1,921,856 B. The 2048 figure has now moved twice in one day - 204 KB on 2026-08-22, 208 KB when re-measured, and 228 KB once the build stopped stubbing out its own game module (that bundle did not run; see `.claude/rules/a-build-gate-that-never-runs-the-artifact.md`). **No gate checks these** - they drift with every build, so re-measure on the day a listing goes up |
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
