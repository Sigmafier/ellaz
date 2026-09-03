# Newgrounds - two listings, and the four things that were wrong in this file

> **BOTH LISTINGS WERE UN-PUBLISHED BY NEWGROUNDS, 2026-08-30, HOURS AFTER GOING LIVE.**
> `portal/view/1049495` (Snake) and `portal/view/1049504` (2048) both return Newgrounds'
> 404 page to their own AUTHOR while logged in, and `ytrofr.newgrounds.com/games` reads
> *"Nothing matches your filters / search terms."* The projects still exist: the dashboard
> at `/projects/games` lists both as **Un-Published**, and each edit page carries a red
> banner reading *"This project has been un-published from the game section."*
>
> **The edits SURVIVED - it is only the publication that did not.** 2048's edit page still
> shows Embed Width 800, Embed Height 900 and Touchscreen friendly ticked, which is the
> frame fix made an hour earlier. So the shaping held and the listing did not.
>
> **This is not diagnosed and must not be guessed at.** The banner is passive and names no
> actor. It does not say "blammed", which is the word Newgrounds uses when a submission is
> voted off under judgment - but that is an argument from wording, not evidence. The
> candidates are a moderator action, an automated action, and a judgment outcome, and the
> instrument that separates them is the account's own notifications, which are the
> operator's to read. **Do not press Publish again until it is known which** - republishing
> over a moderation decision is a different act from republishing after a glitch, and only
> one of them is safe for the account.
>
> Everything below this banner was true when written and describes two live listings.
>
> **THE CAUSE WAS CHASED AND IS NOT KNOWABLE FROM HERE. Measured 2026-08-30:**
>
> | instrument | what it said |
> |---|---|
> | the account's notification feed | *"There are no more events in this feed."* |
> | the account's private messages | *"You don't have any messages right now."* |
> | the project page | a banner naming no actor; **no** judgment score, blam count or vote anywhere in the page text |
> | the publish control | `Publish Changes` is **visible and enabled**, linking to `/publish`; `Un-Publish Project` is hidden, which is what an already-un-published project looks like |
> | the community record | **three** forum threads carry this exact string, and none was ever publicly answered |
>
> The 2022 thread, `bbs/topic/1510406`, lists our situation point for point: removed
> everywhere but the project section, no PM, no email, nothing in the logs, no rule they
> could find. It got no reply. So the silence is the platform's normal behaviour here, not
> something peculiar to us, and **the absence of a notification is evidence AGAINST a
> moderator** - Newgrounds notifies for those.
>
> **Leading hypothesis, and it is only that**: an account created that same day published
> two submissions within two hours, each carrying an outbound link to the same domain. That
> is the shape automated anti-spam acts on, and it is the SAME new-account hypothesis
> already standing on this page for why both our anchors read `rel="nofollow"` while 36
> anchors on 16 other submissions read dofollow. One account, one day, two silent
> penalties. It is testable only by asking.
>
> **So ask, do not re-press Publish.** If the cause is automated, republishing is the
> behaviour that escalates it, and the route is theirs and public: **`support@newgrounds.com`**,
> named on `newgrounds.com/wiki/contact-us` as the recommended method, with replies coming
> from `tomfulp@ngmail.newgrounds.com` - worth allowlisting before writing.
>



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

> **AMENDED 2026-08-30, AFTER PUBLISHING. The measurement below is reproducible and it
> did not predict our own page.** Snake went live at
> `https://www.newgrounds.com/portal/view/1049495` and its one `ellaz.fun` anchor reads
> **`rel="nofollow"`**. Everything under "What we actually got" is the corrected reading;
> the survey below it stands as written, because re-run the same hour it still returns
> the same answer on everybody else's pages. **A survey of other people's artifacts is
> not a prediction about yours** - which is RCH14's own point, arriving from the
> direction nobody was watching: the door was verified by what it SERVES and the link
> was believed from a form we had not yet filled.

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

### The shaping step is placed where it cannot survive - 2048, 2026-08-30

**2048 went live at Newgrounds' default 640 x 480 with the board clipped, which is the
same fault, on the same day, that the itch listing had already taught us.** It is fixed -
800 x 900, touchscreen ticked, republished, and the live iframe measures 800 x 900 - but
the interesting part is why the rule that was supposed to prevent it did not.

```
D14 says          fill  ->  upload  ->  SHAPE  ->  publish LAST
what happened     fill  ->  upload  ->  publish
                            ^^^^^^      ^^^^^^^
                            the only step that needs the operator's own hands,
                            and the button is right there when they finish
```

The instruction was written, correct, and read. It still failed, because **a handover
sits between the two steps** - the upload needs a person (a native file picker cannot be
driven), and the publish button is the next thing that person sees. Telling them to wait
is asking someone to stop one click short of the thing they came to do.

**A stronger instruction is the wrong fix.** The right one is to make the default
correct, and there is a specific candidate: `option[filewidth_2]` and
`option[fileheight_2]` are **present in the creation form's DOM before any file exists**,
merely hidden. If they accept 800 / 900 pre-upload and persist, the trap disappears
entirely, because the listing is then already shaped when the person arrives.

**UNVERIFIED - and deliberately not asserted.** Nobody has tested whether a pre-upload
value survives, and the only way to test it is a throwaway project on the operator's own
account. Test it on the next listing, before the handover; do not write it down as
working until a reload says so.

### What we actually got - measured on our own live page, 2026-08-30

```
ours    portal/view/1049495   1 anchor  ->  rel="nofollow"      (Snake)
ours    portal/view/1049504   1 anchor  ->  rel="nofollow"      (2048, same account)
theirs  16 other submissions  36 anchors -> rel="noreferrer noopener", 0 nofollow
```

**Three causes ruled out in the same pass, each with the population that ruled it out:**

| candidate cause | ruled out by |
|---|---|
| it is Under Judgment | 8 anchors on **6 other under-judgment submissions**, all dofollow |
| the domain is unknown to them | controls link to `grottosoft.com`, `morushroom.net`, `idleangler.com` - all dofollow |
| the anchor text is a bare URL | 9 of the 36 controls are bare URLs - all dofollow |

What is left is the **account**, which was created the same day. That is a hypothesis,
not a measurement: I could not read a join date or a trust level out of the markup and
stopped rather than keep guessing at selectors. It is cheap to settle later - **re-read
this one anchor's `rel` in a few weeks.** If it flips to `noreferrer noopener` with no
edit from us, new-account throttling is confirmed and the door is worth more than it
looks today; if it does not, the link is decoration and Newgrounds is a traffic surface
only.

**Nothing about the decision changes.** The listing was never booked as an earned link
(`RCH13`), so the ledger needs no correction - only this file did, because this file
told the next reader something about our page that turned out to be false of it.

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

Built with an AI coding assistant, the way you would use an IDE: I directed the design,
the rules and the art, and reviewed every line. The game logic, the artwork and the
sounds are original and are covered by tests in a public repository. Nothing here was
generated from a prompt.
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

Built with an AI coding assistant, the way you would use an IDE: I directed the design,
the rules and the art, and reviewed every line. The game logic, the artwork and the
sounds are original and are covered by tests in a public repository. Nothing here was
generated from a prompt.
```

**Rating**: Everyone.
**Genre**: `Puzzles - Sliding` - the exact value, and a sparser shelf than `Puzzles -
Other` (`SEO13`). **Not** `Puzzle - Other`, which is not the real string.
**Tags**: `2048` `puzzle` `numbers` `html5` `mobile` `no-ads` - same caveat as above.

---

## The AI disclosure - RULED 2026-08-30, and it is part of the description now

The operator approved this wording, so it is the last paragraph of both descriptions
above rather than a separate field to remember. Paste a description whole and the
disclosure travels with it.

```
Built with an AI coding assistant, the way you would use an IDE: I directed the design,
the rules and the art, and reviewed every line. The game logic, the artwork and the
sounds are original and are covered by tests in a public repository. Nothing here was
generated from a prompt.
```

It is a declaration about their own work and was theirs to make; this file offered a
draft and they took it as written. If any clause of it ever stops being true, cut that
clause rather than softening it - a hedged disclosure is worse than a short one, and
Newgrounds enforces this one subjectively.

## Provenance

| Claim in the copy | Where it comes from |
|---|---|
| 42 games | `ls src/games/*/meta.ts \| wc -l`, re-counted 2026-08-30: **42** |
| about 53 KB first load | the CI figure, which is the one that ships: **55,097 B gz** of a 56,000 ceiling, measured on the deploy at `63655b6` (2026-08-26). This machine reads 53,219 on Node 24, +98 B apart - a number belongs to the toolchain that ships it, and `assert:outreach` reds if the published one is the local read |
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

---

## The support letter - SENT 2026-08-30 17:56, confirmed in Sent

**Sent and confirmed from Gmail's own Sent folder**, not from the compose window: to
`support@newgrounds.com`, 17:56, subject and body as below. The CrazyGames letter sits
directly beneath it at 17:39 - two letters, two companies, seventeen minutes apart, and
the Sent list is the thing that keeps them straight.

**The allowlist was done FIRST, and it is a real step rather than a note.** A Gmail filter
now reads `from:(tomfulp@ngmail.newgrounds.com)` -> `Never send it to Spam`, verified by
re-reading the settings list rather than by trusting the confirmation toast, with the
account's three pre-existing filters untouched. Newgrounds' own contact wiki says every
one of their emails comes from that address. Without the filter, a reply landing in spam
is indistinguishable from being ignored - and "they never answered" is exactly the wrong
conclusion to reach about a platform we may want to go back to.

**Where it goes**: `support@newgrounds.com`, named on `newgrounds.com/wiki/contact-us` as
their recommended method. **Replies come from `tomfulp@ngmail.newgrounds.com` - allowlist
that address before sending**, or the answer to this letter lands in spam and we conclude
they ignored us. Copy is at `Desktop\ellaz-doors\newgrounds\letter-support.txt`.

**Not the CrazyGames letter.** That one went to `submissions@crazygames.com` at 17:39 the
same day and asks a completely different question of a different company. Two letters, two
recipients, and the only thing they share is the date.

**Both project ids were read off the dashboard rather than recalled** - 2048 is `8060521`,
Snake is `8060462`. The first draft had Snake's from memory, taken from the uploaded FILE
name `8060462_alternate_375983_r1.zip`, which happens to carry the same digits; that is a
coincidence to verify, not a shortcut to rely on.

**Subject**:

```
Two submissions un-published with no notification - which was it?
```

**Body**:

```
Hello,

Two of my game submissions were un-published a few hours after going live, and I
cannot find out why, so I am asking rather than guessing.

  2048   project 8060521   was portal/view/1049504
  Snake  project 8060462   was portal/view/1049495

Both project pages say "This project has been un-published from the game
section" and nothing further. There is nothing in my notification feed, nothing
in my private messages, and nothing at my email address, so I have no way to
tell whether this was a moderator, an automated action, or something I did
wrong.

I have not pressed Publish again, because if it was automatic I assume doing
that repeatedly is the wrong move.

For context, in case any of it is the cause: my account is new, I uploaded both
submissions on the same day, and both are HTML5 games whose descriptions link
back to my own site, ellaz.fun, where they also live. They are original
implementations of public-domain mechanics - a 2048-style sliding puzzle and a
snake game - with artwork drawn in code, no borrowed assets and no licensed
audio. Both are free, carry no advertising, and make no external network
requests of any kind. If any of that broke a rule I would rather be told plainly
than work it out by trial.

What I would like to know is simply which it was, and whether these submissions
can be restored or should be left alone.

Thank you,
Yatir
ytrofr on Newgrounds
https://ellaz.fun
```

**What this letter deliberately does not do.** It does not argue, does not assert we broke
no rule, and does not ask them to restore anything. It asks which of three things happened
and what we should do. A small team answers a short honest question far more often than a
complaint - and we genuinely do not know the answer, so any other tone would be a claim we
cannot support.
