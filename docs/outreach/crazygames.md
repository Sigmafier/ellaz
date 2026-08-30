# CrazyGames - the enquiry, and the sentence that changes the answer

**Status**: draft. Nothing is sent, and there is a reason to read the next section
before deciding whether it ever should be.

This file exists because `portals.md` treats Poki and CrazyGames as one destination with
one letter and a bracketed swap. They are not one destination, and `RCH3` forbids the
shared text anyway. **Poki stays closed** - its SDK is documented as mandatory and an SDK
is an external network request from a game, which is the one convention this platform does
not break and Poki's own stated rule besides. That decision is unchanged and is not
re-litigated here.

---

## Re-read in a browser 2026-08-30, and four things moved

`portals.md` last read this destination on 2026-08-22, through a fetcher that returned a
client-rendered shell. Read today in a real browser, four claims changed - two in our
favour, one that is merely a correction, and one that decides the whole question.

| what `portals.md` says | what the site says today, verbatim |
|---|---|
| Basic Launch means *"monetization is disabled"* | it means more than that: **"The CrazyGames SDK is optional and monetization is not available"**, and separately *"No SDK is needed for Basic Launch"* |
| we should ask whether a non-exclusive listing is possible | already answered in public: *"You can publish on CrazyGames even if your game is already live or has been previously published... CrazyGames works as a complementary channel, not a conflicting one"* |
| the door is an enquiry email | the door is the **developer portal** (`developer.crazygames.com/games`), and the ungated enquiry channel is the **public support page** (`developer.crazygames.com/support`), which asks you to pick a topic and sends mail |
| listing is a strategy decision about advertising | it is first a question of whether they will take these games at all - see below |

**The SDK correction is the good news and it is bigger than it looks.** A Basic Launch
listing needs no SDK at all, so a hosted copy makes the same zero external network requests
that `assert:standalone` already proves. The convention holds with nothing waived.

## AMENDED 2026-08-30, by the operator, and they were right

The first version of this file said *"Ellaz is a children's games platform. That is not a
detail of the copy, it is the premise"*, and built the whole letter around apologising for
it. The operator's correction, verbatim: **"we dont have to target just for kids, our
games are for everyone."**

Counted rather than argued - `grep -o 'category: "[a-z]*"' src/games/*/meta.ts`:

```
think      13
kids       10      <- ten of forty-two
classics    9
learn       6
speed       3
create      1
```

**Thirty-two of the forty-two games are not on the kids shelf**, and `CLAUDE.md`'s own
first line says *"one website where kids and adults play our games"*. So the site is a
casual games site for all ages that has a shelf for younger children, which is a plainly
different thing from a children's platform, and the letter below was rewritten on that
basis.

This is the defect the two rules written the same day are about: a claim about a SET,
stated with no population, that nobody could check by reading it. One `grep` settles it.

## The sentence that still matters, and it matters less than I first wrote

CrazyGames publishes the reasons a submission fails its initial QA check. The list is
short, and this is the fifth item, verbatim:

```
Bugs or broken mechanics
Missing English-language support
Unoriginal content (e.g. clones or asset flips)
Inappropriate themes or content
Not meeting our Developer Requirements, Terms & Conditions, or ethical standards
Does not adhere to PEGI-12 guidelines
Content is targeted for kids            <- this one
```

**"Content is targeted for kids" is a documented rejection reason, and PEGI-12 adherence
is a requirement.** Read against the actual catalogue rather than against my first
description of it, that is a constraint on **the kids shelf - ten games** - and not on the
site.

The three that already ship as standalone bundles are sudoku, 2048 and snake: classic
mechanics, no characters, no reading age, nothing aimed at an age at all. They are
general-audience games from a general-audience site, and PEGI-12 is met without argument -
there is no violence, no theme, no chat, no purchase and no login anywhere in them.

**So the letter does not ask permission about this.** An earlier draft did, and that was
the wrong instinct twice over: it was built on a description of the site that was false,
and volunteering a rejection reason that does not apply invites the reviewer to apply it.
What the letter does instead is describe the site accurately in one line - a free games
site for all ages, with a section for younger children - and let the three games be judged
as what they are.

**And "unoriginal content (e.g. clones)" is the second thing to be honest about.** These
three are original implementations of public-domain mechanics with original art and
original names - which is exactly what this repo's own convention requires - but a
reviewer meeting 2048 for the first time may read the category before the implementation.
Naming it first is better than being told it.

## What Basic Launch actually is, and the thing nobody documents

It is a **test period, not a resting state**:

- it ends once the game has been live **at least 7 days AND reached at least 500 plays**
- if it has not reached 500 plays, it **ends automatically after 21 days**
- KPIs are average play time (*"successful titles often see 10+ minutes"*), day-1
  retention, and conversion
- *"Games with strong KPIs can move on to Full Launch, where you'll integrate our SDK for
  monetization"*

**What happens to a game that does not move on is not stated anywhere on the site.** That
matters more to us than to a normal developer: our pages say there are no advertisements,
so a listing that could transition into carrying them without us choosing it is not
something we can accept quietly. It is the one question worth spending the enquiry on.

Worth noticing without pretending it is a plan: two-to-five-minute casual games are
unlikely to show 10+ minute sessions, so the ad-free state is probably the one this
catalogue would stay in. That is a prediction about someone else's threshold, not a
strategy, and it must not be written down as though it were a guarantee.

---

## The letter

**Where it goes**: `https://developer.crazygames.com/support`, which is public and needs
no account. Pick the topic that best fits a pre-submission question - the list only renders
in the browser and is not reproduced here rather than guessed at. Creating the developer
account, if it comes to that, is the operator's own act.

**Subject**:

```
Pre-submission question about Basic Launch, from a 42-game HTML5 site
```

**Body**:

```
Hello,

I would rather ask one question before submitting anything than submit and find out, so
this is a short enquiry rather than a pitch.

I run ellaz.fun, a free browser games site - 42 games for all ages, playable on phone,
tablet and desktop. Three of them already ship as self-contained HTML5 bundles and are the
ones I would put forward: sudoku, 2048 and a snake game. They are original implementations of public-domain mechanics, with artwork
drawn in code and names of our own - no borrowed sprites, no licensed audio, no reskins.
They carry no advertising, no accounts, no logins and no external network requests of any
kind, which I mention because I read that Basic Launch needs no SDK and that external ads
are not permitted at that stage. That is already how these are built.

The technical shape, in case it saves you a click: pure HTML5, no plugin and no download,
about 230 KB for the largest plain game and about 1.9 MB for the snake one, which is the
only game here that carries a game engine. Eight to ten files each. Every game boots into
a container it is handed, so hosting adjustments are integration rather than a rewrite.

My question touches a promise we make in writing, which is why I would rather ask it
first. Our own pages say the games carry no advertising, and Basic Launch is described as
a test period rather than a resting state. If a game finishes Basic Launch without meeting
the Full Launch KPIs, what happens to it - does it stay listed as it is, does it come
down, or does it move on regardless? I could not find this documented anywhere, and the
answer changes whether a listing is something I can honestly describe on my own site.

Thank you for reading,
Yatir
https://ellaz.fun
```

**Why the letter asks one question and no more.** The draft in `portals.md` asked whether
a non-exclusive listing was possible; their FAQ answers that in public, so asking it would
only show the documentation went unread. My own first draft then asked whether a kids-site
origin disqualified the three games - a question built on a false description of the site,
and one that hands a reviewer a rejection reason they had not reached for. What is left is
the single thing their documentation does not cover, and it is the one that decides
whether a listing is compatible with what our pages promise.

---

## Provenance

| Claim in the letter | Where it comes from |
|---|---|
| no SDK needed at Basic Launch, no external ads | `docs.crazygames.com/requirements/intro` and `/resources/basic-launch-metrics/`, read in a browser 2026-08-30 |
| "content is targeted for kids" is a rejection reason | `docs.crazygames.com/faq/`, § Step A, read in a browser 2026-08-30 |
| 42 games, all ages, one shelf for younger children | `grep -o 'category: "[a-z]*"' src/games/*/meta.ts` on 2026-08-30: think 13, kids 10, classics 9, learn 6, speed 3, create 1 |
| Basic Launch is 7-21 days, 500 plays | same page, verbatim |
| three games ship as self-contained bundles | `dist-standalone-zips/`, gated by `scripts/assert-standalone.mjs` |
| games make no external network requests | asserted by `assert:standalone`, which fails on any external origin; negative control 14/14 |
| about 230 KB largest plain game, about 1.9 MB snake | measured on the built artifacts 2026-08-30 at HEAD `48a6e1f`: 2048 234,762 B, snake 1,924,037 B. **NOTHING IN THE REPO GATES THESE** - re-measure before sending if days have passed |
| 8 to 10 files each | `find dist-standalone/<id> -type f`, same tree: 8, 8 and 10 |
| original mechanics, original art and names | the originality convention in `CLAUDE.md`, and `src/ui/gameArt.ts` - every tile is drawn in code |

**Do not quote a revenue share, a review turnaround, an SDK version or a play-count
forecast.** None of it was read from their site, and the letter's only real asset is that
every sentence in it can be checked.

## The signature

**Approved by the operator 2026-08-30**: `Yatir`, the transliteration of `יתיר`, stands.
It appears once at the bottom of this letter and three times in `english-directories.md`.
That open question is closed.
