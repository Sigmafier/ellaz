# The one-shot surfaces - drafted now, fired last

**Status**: drafts. **Nothing is submitted.** These are the three surfaces that cannot be
re-run, so they are also the three where firing early spends the only attempt there is.

**Do not use this file yet.** Clause SEO14 gates all three on every other lane being green.
As of 2026-08-12 that means: the itch.io and Newgrounds uploads have not happened, the
Hebrew posts have not been posted, and the awesome-pwa PR has not been opened. Firing
Product Hunt at a project whose "available on itch.io" claim is not yet true is exactly
the failure this ordering exists to prevent.

---

## Why these three are different from everything else in this folder

A Reddit post that lands badly can be deleted and rewritten next month. An itch.io page can
be edited. A pull request can be closed and reopened.

**A Product Hunt launch happens once, on one day, and the result is permanent and public.**
Show HN is nearly the same - a second Show HN for the same project reads as spam, and the
first one keeps its score forever. AlternativeTo entries persist and are edited by
strangers afterwards.

So the ordering is not caution for its own sake. It is that the one-shot surfaces are the
only place where "we will fix it and try again" is not available.

---

## Show HN

**This is the one I would fire first of the three**, and the only one I would be confident
about. Their guidelines were fetched and read on 2026-08-12 (`news.ycombinator.com/showhn.html`,
200, 684 words - a genuinely verified destination, unlike the two below).

Ellaz fits their stated criteria unusually well:

| Their rule | Us |
|---|---|
| "something you've made that other people can play with" | 33 games, playable in one tap |
| "easy for users to try your thing out, ideally without barriers such as signups" | no account, no email, nothing to install |
| "must be something you've worked on personally and which you're around to discuss" | **the operator's, not this session's** - see below |
| "The project should be non-trivial" | 33 games, 144 pages, four languages |
| off topic: "blog posts, sign-up pages, newsletters, lists" | not one of those |

**The one condition that is not about the project.** They require the author to be present
in the thread. A Show HN posted and then left alone does badly and reads as a drive-by.
Pick a morning when there are two or three hours free afterwards; do not post it at night.

**Title** (theirs must begin with `Show HN:`):

```
Show HN: Ellaz - 33 browser games for kids in four languages, no accounts or ads
```

**First comment** - posted immediately after submitting, as their tips describe:

```
I built this for my own kids and it grew into a platform.

Thirty-three games, Hebrew first and English second, playable on a phone, a
tablet or a PC. No account, no ads, no analytics identity, no backend at all -
progress lives in localStorage, which also means a phone and a tablet are two
separate players. That is a real limitation and I have not solved it.

Some things I did not expect going in:

- The first visit is 90,494 bytes gzipped and the build fails above 90,500.
  Adding a game costs the shell about 300 bytes even though every game is a
  lazy chunk, because its metadata is in the statically imported roster.
- Making an import lazy is three changes, not one. Miss the third (the
  service worker's precache glob) and the build is green, the chunk really
  is lazy, and the first visit is exactly as heavy as before.
- The site served a blank page for an hour while deploys reported success in
  ninety seconds, because the uploader kept a sync ledger on the server and
  a transfer died after the ledger was written. Retrying could not fix it;
  retrying was the broken part.
- A status sweep during that outage said four pages were healthy. A 200
  document whose JavaScript 404s is a blank page.

It is MIT: https://github.com/Sigmafier/ellaz

Happy to answer anything about the SDK contract, the payload work, or the
Hebrew/RTL side, which was more interesting than I expected.
```

That comment leads with the limitation rather than the feature list on purpose. It is also
the most honest thing available and, on that audience, the most credible.

---

## Product Hunt

**Fire this last of the three, and only if the operator actually wants a launch day.**

Product Hunt rewards presence: replying to every comment for the first several hours,
having images ready, and posting early in their day. A launch nobody tends does worse than
no launch, and it cannot be repeated.

**Name**: `Ellaz`
**Tagline** (their limit is short - trim to fit whatever the form says):

```
33 free browser games for kids. No ads, no accounts, works offline.
```

**Description**:

```
Ellaz is a games site for children and the adults playing beside them. Thirty-three
games, in Hebrew, English, Spanish and French, on a phone, a tablet or a PC.

Nothing to install and nothing to sign up for. No ads, no in-app purchases, no
tracking identity, and every game works offline once the page has loaded.

Kids' games are tap-completable, with big targets and no reading required to get
around. Nobody is ever punished for a wrong answer. Coins and stars are earned by
playing and spent on a room you decorate.

Children never type anything, anywhere in the app - a player's name is picked from
a fixed word list. There is nothing to moderate because there is nothing anyone can
type.

Free, open source, MIT.
```

**First comment**:

```
I built this for my own kids.

Two decisions that shaped everything else. There is no backend, so nothing about
a child is collected or stored anywhere but their own device - and the honest cost
of that is that clearing browser storage erases their coins and their room, and a
phone and a tablet are two different players. And no child types anything: names
are picked from a list, which removes moderation from the project entirely.

Hebrew is the default and the interface is right-to-left, which turned out to be
where most of the interesting bugs were.
```

**Gallery**: the home grid on a phone, one kids game mid-play, the room, and a game page in
Hebrew. Four images, no text overlays.

**What was NOT verified**: Product Hunt's current submission rules, tagline length limit and
whether a maker account is required were not fetched. Their pages are client-rendered and
return nothing readable to a script. **Read the form before trusting the lengths above.**

---

## AlternativeTo

The plan's original angle was "free, ad-free alternative to Poki". Two problems with it.

**The destination check came back blind.** Measured 2026-08-12:

```
alternativeto.net/software/poki/about/                404, 23 words
alternativeto.net/browse/search?q=poki                403, 23 words
alternativeto.net/software/this-does-not-exist-xyzzy  403, 23 words   <- control
```

The invented URL is indistinguishable from the real search. So **this session cannot tell
whether Poki is listed there at all**, and the entire "alternative to Poki" framing rests
on an assumption nobody has checked. The operator has a browser; one search settles it.

**And the framing may be wrong even if Poki is listed.** `docs/outreach/portals.md` already
records the strategic question: Poki and CrazyGames are advertising businesses, and this
site says "no ads" on all 144 of its pages. Positioning against them on a comparison site
is a public statement of that position. It is defensible and it is the operator's to make,
not a copywriting choice.

If it goes ahead:

**Name**: `Ellaz`
**Description**:

```
A free browser games site for kids and adults. 33 games in Hebrew, English,
Spanish and French,
playable on phone, tablet and PC. No account, no ads, no tracking, and it works
offline. Open source, MIT.
```

**Categories**: Games, Kids, Education
**Tags**: `browser-games` `kids` `hebrew` `pwa` `offline` `open-source` `no-ads`
**Listed as an alternative to**: **verify each one exists on the site first.** Poki,
CrazyGames, ABCya, PBS Kids Games are the plausible set; not one of them was confirmed.

---

## The order, and the gate on each

| # | Surface | Fires when | Repeatable |
|---|---|---|---|
| 1 | Show HN | itch.io live, Hebrew posts done, awesome-pwa PR open | effectively no |
| 2 | AlternativeTo | after the Poki listing is confirmed in a browser | entries are editable |
| 3 | Product Hunt | last, and only on a day with hours free afterwards | **no** |

Before any of them, re-run the checks that would embarrass a launch:

```bash
npm run build:check        # payload, precache, first visit
npm run assert:crawlable   # the only gate that reads the network
node scripts/assert-live.mjs   # the live site is the build we think it is
```

A launch pointing at a site that is quietly serving a stale bundle is the specific way this
spends its one shot, and this project has had that exact outage once already.

---

## Provenance

| Claim | Where it comes from |
|---|---|
| Show HN rules, quoted | `news.ycombinator.com/showhn.html`, fetched 2026-08-12, 200 with 684 words |
| 33 games | `src/portal/catalog.ts` and `src/portal/games.ts`, both 33, counted 2026-08-18 |
| 90,494 B gz first visit | `scripts/assert-payload.mjs` on a clean tree at 1e219fe, 2026-08-18 |
| ~122 B gz shell cost per game | `npm run assert:slope`, which measures the marginal game rather than quoting one commit's delta |
| the deploy ledger outage | `.claude/rules/a-deploy-ledger-that-can-disagree-with-the-disk.md` |
| the three-change lazy import | `.claude/rules/precache-glob-sweeps-new-chunks.md` |
| no child types anything | `.claude/rules/name-pool-convention.md` |
| AlternativeTo probe and its control | the three `curl` rows above, 2026-08-12 |

## What was NOT verified

- **Product Hunt's rules, limits and account requirements.** Client-rendered; nothing
  readable reached a script.
- **Whether Poki, CrazyGames, ABCya or PBS Kids Games are listed on AlternativeTo.** The
  probe cannot distinguish a real page from an invented one there, so all four are
  unconfirmed and the "alternative to" list must be checked in a browser before submitting.
- **Whether any of the three still works the way it did.** All three change their rules;
  read the form.
