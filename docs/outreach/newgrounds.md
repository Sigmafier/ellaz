# Newgrounds - two listings, and the four things that were wrong in this file

**Status**: drafts. Nothing is uploaded. The account is the operator's to create.

## Read this before doing the work

**Newgrounds is not a parenting audience and the copy here does not pretend otherwise.**
Its community is long-standing, mostly adult, and built around animation and indie games
with an edge. A page selling "42 free games for kids, made by a parent" reads there the
way a nursery advertisement reads in a bar: not offensive, just addressed to nobody in
the room.

So two decisions follow, and both are deliberate:

1. **Only Snake and 2048 go up.** They are arcade games that happen to be on a kids'
   platform, and they stand on their own. Sudoku for four-year-olds does not.
2. **The copy leads with the build, not the children.** This audience contains a lot of
   people who have shipped a web game and know what it costs. "No ads, no account, works
   offline, 229 KB" is the interesting sentence here. The kids platform is the footnote.

**One thing here is genuinely better than itch, and it is the only measured difference
that favours this door** - see the rel section below. Everything else about the fit is
worse. Do not spend an afternoon on it, and do not post a third game if the first two go
quiet.

---

## What this file got wrong, measured 2026-08-30 in a browser

This file previously said the submission wiki "returns HTTP 403 Forbidden to a fetch"
and that nothing about the platform could be verified from here. **Three of its four
claims about Newgrounds were wrong, and all three were checkable in about four minutes
once the right instrument was used.**

| this file said | measured |
|---|---|
| the HTML5 submission wiki 403s to a script | that path is a plain **404 in a browser too** - the page does not exist. A 403 was inferred from a script fetch and read as a block; it was a dead link |
| a "do-follow-ish link" | **dofollow, verified** - see below. It was a guess wearing a hedge |
| Genre: `Action - Arcade` (Snake) | **not a category on Newgrounds.** The vocabulary has 52 values and neither of ours was in it |
| Genre: `Puzzle - Other` (2048) | the real value is `Puzzles - Sliding`, plural and more specific |

**The instrument that worked**: the browse filter at
`https://www.newgrounds.com/games` serves the whole genre `<select>` to a logged-out
reader, so the real vocabulary is readable without an account. The submission form is
behind `https://www.newgrounds.com/projects/games/new`, which exists and redirects to
`/login`. If the form's list ever differs from the browse filter's, the form wins.

---

## What a listing here actually buys - and unlike itch, it IS a link

**Newgrounds does NOT nofollow the external links in an author's description.** Measured
2026-08-30 across six live game pages:

| what | `rel` |
|---|---|
| author-supplied links in the description (itch, Steam, Discord, opengameart) - 9 of them | `noreferrer noopener` |
| Newgrounds' own utility links on the same page (Login, Sign Up, Share, Fullscreen) - 8 of them | `nofollow` |
| Newgrounds' merch partner in the page chrome | *(none)* |

**The middle row is the control and it is the reason this reading is worth anything**:
the same matcher, on the same page, in the same pass, DID report `nofollow` eight times.
It can express the answer we were afraid of, and it simply never returns it for a URL an
author typed. The anchors are also in the HTML on the wire, not injected by script.

Compare itch, measured the same week: **every** user-supplied external URL there carries
`nofollow noopener`, everywhere on the platform. Same class of surface, opposite answer.
That is the whole argument for spending an hour here.

**It is still DISCOVERY, not authority** (`RCH13`): a link we place ourselves does not
enter an earned count however dofollow it is, and it must not be booked against the
2026-11-27 backlink verdict. What changes is the practical value, not the bookkeeping.

---

## Newgrounds asks about AI, and its rule is stricter than itch's

Quoted from the Game Guidelines, read 2026-08-30:

> "please do not share any games that were generated via an AI prompt. These are
> considered shovelware and not your own work."

> "If you do utilize AI in any aspect of your game, please disclose what and how it was
> used in the author commentary."

> "Our enforcement will be largely subjective ... know that if you are using AI in your
> work, it may be removed at our discretion."

> Thumbnails: "Don't use an AI-generated thumbnail."

**Three consequences, and the first is the operator's alone.**

1. **The disclosure is required, it goes in the visible description, and it is the
   operator's declaration about their own work - not something this file may write for
   them.** A draft sentence is offered below to be confirmed, rewritten or deleted. It
   is the same thing itch asked as a radio button, except here it must be in words the
   readers see.
2. **Removal is a real outcome, at their discretion.** This lane can therefore go to
   zero after the work is done, which is one more reason it is second and not first.
3. **The thumbnails are safe.** Every cover here is rasterised from the game's own
   `gameArt` SVG - drawn in code in this repository, no generated imagery anywhere
   (`src/build/ogImages.ts`).

Also from the same page, and we are clean on all of it: you must be the creator and
owner, no borrowed sprites, no music you do not have rights to.

---

## The order, which is the same order itch taught us

`seo-playbook` D14, written from what 2048 cost on itch:

```
create -> upload the zip -> set every presentation field the form now offers
       -> thumbnail -> screenshots -> the AI disclosure sentence
       -> save as a DRAFT -> PLAY IT in Newgrounds' own player
       -> only then publish
```

**Never publish from the creation form.** On itch the embed block did not exist until a
file was attached, so 2048 went public in a 640x360 default with its board clipped and
every field on the form reading correct. Assume the same shape here until the form
proves otherwise.

**Then verify the artifact, not the form** (`RCH14`, proposed 2026-08-30). After it is
live, load the public page and read the hashed asset name out of the frame - the served
`standalone-<hash>.js` is derived from the bytes, so it cannot agree with a form that is
wrong. Snake's itch listing took four attempts to serve the build we meant, and on all
four the form confirmed and the game played. The wrong game.

---

## Listing 1 - Snake

**Title**: `Snake`

**Description**:

```
Snake, three speeds, no advertisement in the middle of your run.

Arrow keys, or swipe on a phone. The fast setting keeps speeding up as you grow, so a
long run ends because the board became the enemy, not because a clock ran out. It keeps
your longest run.

Built as a plain web page. No account, no download, no tracking of you, and it works
offline once it has loaded. It is one game lifted out of a free site of 42 of them, and
that whole site is about 53 KB before you pick anything.

The rest: https://ellaz.fun

Your progress on this page may not be saved between visits, because it runs inside a
frame on somebody else's domain. At ellaz.fun it is saved.
```

**Rating**: Everyone.
**Genre**: `Skill - Collect`. Second choice `Skill - Avoid`; both are real values and
either is defensible, because the collecting is what creates the avoiding. **Not**
`Action - Arcade`, which does not exist.
**Tags**: `snake` `arcade` `html5` `retro` `mobile` `no-ads` - unverified, because the
tag field is behind the login and this file has already been caught inventing a
vocabulary once. Check them against what the form offers.

---

## Listing 2 - 2048

**Title**: `2048`

**Description**:

```
The tile game, with nothing added to it.

Slide, merge, reach 2048. What is missing is the point: no advertisement between
attempts, no account, no popup asking you to rate it. Close the tab mid-run and the board
is still there when you come back.

Built as a plain web page, about 229 KB, works offline. One game out of a free site of 42.

The rest: https://ellaz.fun

Your progress on this page may not be saved between visits, because it runs inside a
frame on somebody else's domain. At ellaz.fun it is saved.
```

**Rating**: Everyone.
**Genre**: `Puzzles - Sliding` - the exact value, and a sparser shelf than `Puzzles -
Other` (`SEO13`). **Not** `Puzzle - Other`, which is not the real string.
**Tags**: `2048` `puzzle` `numbers` `html5` `mobile` `no-ads` - same caveat as above.

---

## The AI disclosure sentence - a DRAFT for the operator to rule on

Newgrounds requires this in the author commentary and it must be true. This is offered
as a starting point only; the operator's own words are better than ours, and they are
the only person who can make this declaration:

```
Built with an AI coding assistant, the way you would use an IDE: I directed the design,
the rules and the art, and reviewed every line. The game logic, the artwork and the
sounds are original and are covered by tests in a public repository. Nothing here was
generated from a prompt.
```

Every clause of that has to be something the operator is willing to stand behind. If any
of it is not, cut it rather than soften it - a hedged disclosure is worse than a short
one.

---

## Provenance

| Claim in the copy | Where it comes from |
|---|---|
| 42 games | `ls src/games/*/meta.ts \| wc -l`, re-counted 2026-08-30: **42** |
| about 53 KB first load | the CI figure, which is the one that ships: **53,121 B gz** of a 56,000 ceiling, measured on the deploy at `63655b6` (2026-08-26). This machine reads 53,219 on Node 24, +98 B apart - a number belongs to the toolchain that ships it, and `assert:outreach` reds if the published one is the local read |
| about 229 KB for 2048 | `dist-standalone/2048` summed on the built artifact, re-measured 2026-08-30: **234,762 B = 229.3 KB**. It has read 204, then 208, then 227.7, and now 229.3 - the first two were measurements of a bundle that DID NOT RUN, and the last two are real drift. **NOTHING GATES THIS NUMBER**: `assert:outreach` checks the payload ceiling and the CI payload record, and never looks at a standalone bundle. Re-measure it on the day the listing goes up, every time |
| snake is the big one | `dist-standalone/snake` = **1,924,037 B = 1.83 MB** unpacked, 458,579 B zipped, 2026-08-30. Not quoted in the copy; kept here so a future edit does not invent one |
| works offline | the PWA precaches the shell (`vite.config.ts` workbox) |
| no tracking | analytics is anonymous-events-only and has never had a key set in production (`CLAUDE.md` § Firebase) |
| snake keeps the longest run | `src/sdk/score.ts`; snake reports a personal best at game over |
| 2048 remembers the board | `src/sdk/session.ts` |
| progress may not persist in a frame | third-party iframes get partitioned storage in Chrome; Safari's ITP may refuse it |
| the genre values | the live `<select name="genre">` on `newgrounds.com/games`, 52 values + "All", read 2026-08-30 |
| the rel finding | six live game pages, 9 author links, all `noreferrer noopener`; 8 `nofollow` anchors on the same page as the control |

**The "no tracking" line is stronger than it looks and it is honest.** PostHog is wired
but its key has never been set in a production build, so `if (!key) return` is always true
and the whole init is removed by the minifier. Even when a key is set it runs in
anonymous-events mode with no `identify()`, no session replay and no autocapture. Do not
soften this to "minimal tracking"; do not strengthen it to "we will never measure
anything", which is not true.
