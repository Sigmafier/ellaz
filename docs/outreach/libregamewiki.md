# libregamewiki.org - the article, and the sentence in our own README that nearly sank it

**Status**: fired
**Surface**: <https://libregamewiki.org/Ellaz> - **SAVED 2026-09-03, HELD IN MODERATION.** It returns
HTTP 404 to everyone, including its author, because that is what the Moderation extension does
with a pending edit. See *Did the save land* below: it did, and the evidence is the server's own
bytes rather than a screen anybody read.
**Account**: `Ytrofr`, created by the operator 2026-09-03. It signs the edit; the wiki
blocks anonymous page creation and every revision is publicly attributed to it.
**Who saves it**: the operator. I fill the editor, they press Save.

## Why this door

Measured 2026-09-03 across the wiki: **695 external anchors, every one dofollow, across
497 distinct hosts.** The host count is the tell - it links out to 497 different games'
own sites rather than repeating a handful. It was the single best result of a 35-door
sweep (`lists.md`), and the only one of them we can walk through ourselves.

Under RCH13 an entry we place ourselves is **DISCOVERY, not EARNED**, however the `rel`
reads. It is not bookable against the December verdict as an earned link.

## The bar, re-read on the day (RCH3), not recalled

`Libregamewiki:Article_policy`, fetched 2026-09-03, 2,551 B:

> To be included in the LibreGameWiki, engines, games, and libraries must have:
> * Their source code licensed under a free source code license.
> * Their media licensed under a free media license **when applicable**.

`Libregamewiki:Common_game_licensing_traps`, fetched the same day, 8,168 B, is an essay
of disqualifying checks. Two of them are what this door turned on:

> **Partially missing licensing**. Licensing info does exist, but there is a portion
> (like a file, type of media, or entire directory) of the game where a license was not
> specified, neither explicitly nor implicitly

> **Source code is free, but media files aren't**: If the license info explicitly makes
> clear that only the source code is free, but not the media files, then it is not a
> free game.

It also says, in bold in the original: *"'free game' includes all media files (sounds,
music, graphics, levels, data, etc.), not just the source code."*

## What the re-read found, and it was in OUR repository

The ledger row written the day before said the licence question was *"covered on the
face of it - to be re-read and argued on the day, never assumed"*. Re-reading it found
this, in our own `README.md`:

```
[MIT](LICENSE). The code is yours to use. The game art, names and written content are
original work - please make your own rather than shipping ours under a new name.
```

**That sentence separates the code from the art and asks people not to reuse the art.**
It is the exact shape of the second easy check above. It was almost certainly meant as a
polite request - `LICENSE` is MIT and grants rights over the whole repository without
carve-outs - but an editor arriving from this article would read the README, and the
failure state is the public `Libregamewiki:Rejected games list`, which is sticky.

**Nothing was re-licensed.** The README was corrected to say what `LICENSE` already
grants, and it now carries a line telling the next author not to reintroduce the split.

## Why the answer is genuinely MIT, all the way down

The reason this project clears a media-licence bar easily is that it has **no separate
media to license.** Measured on the tree at `6eb9a7c`:

| what | where it lives | licence |
|---|---|---|
| every game's artwork | SVG written in `src/ui/gameArt.ts` (500 lines of TypeScript) | MIT - it is source |
| every sound effect | synthesised at run time, `src/sdk/audio.ts` (`AudioContext`, zero assets) | MIT - it is source |
| the whole game roster | `src/games/*/` - 42 directories, no binary assets | MIT |
| `public/favicon.svg`, `public/icon.svg` | the only two image files the site ships | MIT |
| Heebo, Cairo, Noto Sans (6 `.woff`) | `src/build/assets/`, **build-time only** - used by `src/build/ogImages.ts` to render page images; the site itself never serves them | SIL OFL 1.1, licence text bundled beside each family |

`git ls-files` matching every media extension returns **24 files** and not one of them is
game media: 13 are documentation screenshots under `docs/engine-tournament/evidence/`,
3 belong to the unrelated `holdem/` sub-project, 6 are the fonts above, 2 are the icons.

## The article, as it will be saved

Paste target: <https://libregamewiki.org/index.php?title=Ellaz&action=edit>

Every wiki link in it was probed for a 404 before it was written, so the article carries
no redlinks. `Category:Game collections` (23 members, including Simon Tatham's Portable
Puzzle Collection and Smolpxl) is the precedent for a collection rather than one game.

```wikitext
{{Gameinfo
|title                = Ellaz
|image                = 
|caption              = 
|genres               = [[:Category:Puzzle games|Puzzle]], [[:Category:Games for children|children's]]
|developer            = Sigmafier
|code license         = [[MIT]]
|media license        = [[MIT]]
|latest release       = 
|release date         = August 2026
|release date iso     = 2026-08-02
|release announcement = 
|language             = [[:Category:TypeScript games|TypeScript]]
|library              = Phaser, Preact
|platforms            = {{Web}}
|link homepage        = https://ellaz.fun/
|link scmweb          = https://github.com/Sigmafier/ellaz
|scm                  = git clone https://github.com/Sigmafier/ellaz.git
|link tracker         = https://github.com/Sigmafier/ellaz/issues
}}
'''Ellaz''' is a collection of 42 small games that run in a web browser. Development began
in July 2026 and the site was first published in August 2026 by Sigmafier.

The collection covers puzzle, word, memory, arcade and board games; 25 of the 42 are marked
in the source as being aimed at children. The site can be installed as a progressive web
application, and once it has been loaded the games continue to work without a network
connection. Progress is kept in the browser's local storage: the project has no server and
no user accounts.

The interface is translated into 11 languages, and each game's description page is
published in four of them (English, Hebrew, Spanish and French). Both left-to-right and
right-to-left layouts are supported.

== Technical ==

The games are written in TypeScript. Most are rendered with [https://preactjs.com/ Preact];
one, ''Snake'', uses the [https://phaser.io/ Phaser] engine.

The project ships no separate media files. The artwork is drawn as SVG in the source code
and the sound effects are synthesised at run time with the Web Audio API, so the source
licence covers the whole game. Three font families used only when generating page images at
build time - Heebo, Cairo and Noto Sans - are bundled together with their licence texts
under the SIL Open Font License 1.1.

Single-game builds of ''Snake'', ''Sudoku'' and ''2048'', which run offline from a local
copy, are published separately.

== External links ==

* [https://ellaz.fun/ Homepage]
* [https://github.com/Sigmafier/ellaz Source code]
* [https://ytrofr.itch.io/snake Snake], [https://ytrofr.itch.io/sudoku Sudoku] and [https://ytrofr.itch.io/2048 2048] as downloadable single-game builds

[[Category:Games]]
[[Category:Game collections]]
[[Category:HTML5 games]]
[[Category:TypeScript games]]
[[Category:MIT games]]
[[Category:2D games]]
[[Category:Puzzle games]]
[[Category:Games for children]]
```

## Provenance of every number in it

**None of these may be quoted from this file later** - they are dated readings, and this
repo's own history is full of figures that went stale in place.

| claim | source, 2026-09-03 |
|---|---|
| 42 games, 25 for children | `npm run assert:outreach` prints `42 games (25 kids)`; `ROSTER_IDS` has 42 ids |
| 11 interface languages | `src/i18n/dict/` holds 11 files |
| 4 page languages | `PAGE_LOCALES` in `src/i18n/locales.ts` |
| development began July 2026 | first commit `2026-07-19` |
| published August 2026 | first Hostinger deploy workflow, `2026-08-02` |
| one game uses Phaser | `grep -rl "from \"phaser\""` returns `src/games/snake/SnakeScene.ts` alone |
| Preact | React and ReactDOM are aliased onto `preact/compat` in `vite.config.ts` |
| three itch builds | `ytrofr.itch.io/{snake,sudoku,2048}` all HTTP 200 |

## What the policy forbids, and how this article avoids it

> Personal opinions or reviews · Original research · Walkthroughs or installation
> instructions · Unverifiable information

No adjective of praise appears in the article, there is no "free of ads" selling line, no
instructions, and every sentence traces to the table above.

## Their search API is broken - do not use it as an instrument

`api.php?action=query&list=search` returned **zero results for every query tried**,
including terms that certainly appear on the wiki. Category listings and direct page
fetches work and were used instead, with a nonsense category as the negative control
(0 members, while `Category:Free media licenses` returned 13). An empty search result
from that wiki says nothing at all.

## Did the save land? Yes, and the obvious instrument could not say so

Saved 2026-09-03. Then every cheap check came back **empty**, and empty is exactly the
state that cannot be argued with:

| what was read | what it said |
|---|---|
| `https://libregamewiki.org/Ellaz`, anonymous | **HTTP 404**, 22,488 B of "no such page" |
| the same page signed in as `Ytrofr` | *"There is currently no text in this page"* |
| `Special:Contributions/Ytrofr` | *"No changes were found"* |
| `list=users&usprop=editcount` | `editcount: 0` |

**Not one of those distinguishes "queued in moderation" from "the save never happened",**
because the Moderation extension keeps a pending edit out of the page, out of history and
out of the edit count by design. Four readings, all correct, all non-verdicts - the shape
this repo files under `a-diagnostic-that-truncates-what-it-compares.md`.

Two of them were nonetheless run with a **positive control**, so the tools themselves are
not in doubt: the same `usercontribs` call returns three edits for `Drummyfish`, and
`logevents` returns the `newusers create` entry for `Ytrofr` at `2026-09-03T14:28:55Z`.
The instruments work; they just cannot answer this question.

**The reading that does answer it** is the one that asks the server for the text:

```
same-origin fetch of ?title=Ellaz&action=edit   ->  2,702 bytes, sha256 3c337d2b7481cf6e
docs/outreach/libregamewiki.md's copy           ->  2,702 bytes, sha256 3c337d2b7481cf6e
NEGATIVE CONTROL, a page nobody has ever edited ->  0 bytes, same code path
```

Fetched rather than read out of the open tab, deliberately: a browser can restore a
textarea from form history, and that would have looked identical. The server is holding
our text, byte for byte, and the method is on record returning nothing for a page that has
none. `Special:Moderation` also exists and refuses us by name - *"limited to users in one
of the groups: Administrators, Moderators"* - which corroborates that the queue is real.

**So the send is the best-evidenced one in this repo.** The ladder here has been a server
string, a wire 200, a mail in Sent, and once nothing at all; this is the first door where
a third party can be shown holding the exact bytes we handed over, hashed.

**What is still unknown**: whether a moderator approves it, and when. Nothing above
predicts that. No second save, no nudge - a queued edit re-saved is a second queued edit.

## The operator's steps

1. Be signed in as `Ytrofr` at <https://libregamewiki.org/>.
2. Open <https://libregamewiki.org/index.php?title=Ellaz&action=edit> - I fill the box.
3. Read it. Then Save.
4. The edit passes moderation (`ext.moderation.notify` loads on every page), so it may
   not appear immediately. That is expected and is not a failure.

**No screenshot is uploaded.** The template files an article without one into
`Category:Game articles with no screenshots`, which is a normal state - Capuchine has no
image either. Any image we did upload would have to be under a free media licence, and
that is a separate decision.

## Verdict

**2026-12-02**, per SEO11.

**The `backlinks.md` row is added the moment the page is SAVED, not now, and that is
deliberate.** `pointsAtUs` turns any non-`ok` response into `{ ok: null }`, which
`classify` files as `unchecked` - a status this repo reserves for *the fetch failed for
our reasons*, never for *the page does not exist*. Watching a URL that 404s by design
would put a permanently `unchecked` row in the register and quietly drain that word of
its meaning. `coverage()` only requires a watch for a `fired` or `spent` surface, so
nothing is uncovered in the meantime.

When it is saved, the row goes in as `expected` and promotes only on `linked` - and its
positive control is today's reading, printed above: `https://libregamewiki.org/Ellaz`
returns **HTTP 404**, so the checker is on record saying NO before it is ever trusted to
say yes.
