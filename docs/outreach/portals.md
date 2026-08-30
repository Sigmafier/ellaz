# Poki and CrazyGames - the enquiry, and the decision it forces first

> **SPLIT 2026-08-30. The CrazyGames half of this file has moved to
> [`crazygames.md`](crazygames.md) and four of its claims here are wrong.** Re-read in a
> real browser rather than through a fetcher, the site says the SDK is *optional* at Basic
> Launch and not merely that monetization is off; it answers the non-exclusivity question
> in public, so the letter below asks something already documented; the door is the
> developer portal, not an email; and its QA page lists **"content is targeted for kids"**
> as a rejection reason, which is a bigger fact about this platform than anything in the
> advertising discussion below. **Poki is unchanged and stays closed** - its SDK is
> mandatory, and an SDK is an external network request from a game. Everything below about
> Poki still stands; everything about CrazyGames is superseded.


**Status**: draft. Nothing is sent. **This one is not a paste-and-go**, and the reason is
in the first section rather than at the bottom.

---

## Read this before sending anything

**Poki and CrazyGames are advertising businesses.** They are excellent distribution - the
kind of traffic that does not come from anywhere else - and the way they pay for that
traffic is by running advertisements around and inside the games they host, through their
own SDK, with a revenue share.

Every line of this platform's public promise is the opposite of that:

| The promise | Where it is written down |
|---|---|
| no ads, anywhere | the home page, all 200 emitted pages, both outreach drafts |
| anonymous and kid-safe, no behavioural advertising | `CLAUDE.md` § Analytics; COPPA internal-operations framing |
| no external network requests from games | a non-negotiable convention, and Poki's own rule |

So listing there is a **strategy decision, not a submission task**, and it has three
honest answers:

1. **Don't.** The promise stays clean, and we forgo the largest audience on the list.
2. **List, and change the copy everywhere.** "No ads on ellaz.fun" is still true and is a
   real differentiator; "no ads" flat is not, the moment a Poki page exists.
3. **List a small number of games as a distribution experiment**, and say plainly on
   ellaz.fun that the portal versions carry the portal's advertising. Honest, and more
   words than a five-year-old's parent wants to read.

**Recommendation: do 1 for now and revisit after itch.** Nothing about the enquiry expires,
and the SDK work is already done - the lifecycle and ads shape in `src/sdk/` was
deliberately built to the union of Poki's and CrazyGames' requirements precisely so this
door stays open with no rewrites. That is the asset. Walking through the door is a
different question from having built it.

The draft below exists so the choice is a choice rather than a thing we never got round
to.

---

## Re-fetched 2026-08-22, and TWO sentences did come back

RCH5 says the destination is fetched the way its readers see it before anything is
pitched to it. Re-run today, and unlike the last attempt two sentences of real
documentation arrived - both of which bear directly on the decision above:

| Destination | Read today, verbatim |
|---|---|
| Poki (`sdk.poki.com`) | *"there are two mandatory steps to get your game ready for an impactful launch: implementing our mandatory requirements and our SDK"* |
| CrazyGames (`docs.crazygames.com`) | *"Monetization (video ads, banners, in-game purchases) is **disabled**"* during **Basic Launch**; at Full Launch *"Monetization is enabled and you start receiving revenue share"* |

**These two are not the same offer, and the draft below treated them as one.** Poki's SDK
is stated as mandatory, and an SDK is an external network request from a game - the
convention this platform does not break, and Poki's own documented rule besides. So for
Poki the three answers in the first section are the whole decision.

**CrazyGames has a stage with no advertising at all.** A Basic Launch listing carries no
video ads, no banners and no purchases, which means option 3 - list as an experiment and
say so on ellaz.fun - has a form nobody had priced: a listing that is honestly ad-free
until somebody chooses to promote it. It is not a way to have the audience and the
promise at once forever; Full Launch is where the traffic and the advertising both are.
But the entry price is different from what this file assumed.

**Neither page was readable in full**, and the rest of this section still stands: both
developer sites are client-rendered, the deep requirement pages were not reached, and no
revenue share, SDK version or submission step below has been read from their site.

This is the third destination in this outreach set to answer a script with a healthy
status and no content, after Newgrounds' 403 and Reddit's identical 8.4 KB shell. Same
lesson each time, and it is this repo's own: **a status code is not a body.** Open both in
a browser before sending; correct this file where it is wrong.

**What is true regardless**, because it is in our own tree: `src/sdk/` implements a
lifecycle and an ads stub shaped to the union of both portals' documented models, so a
listing needs integration work rather than a rewrite of any game.

---

## The enquiry email

Same body for both, with the bracketed line swapped. Send from a real address, one at a
time, and expect no reply from at least one of them - these inboxes receive a great deal.

**Subject**:

```
42 web games, HTML5, no engine dependency - looking at distribution options
```

**Body**:

```
Hello,

I run ellaz.fun - a free browser games site, 42 games, playable on phone, tablet and
desktop. It is Hebrew-first with an English version, which may be an unusual audience
angle for you.

Some specifics that are probably the ones that matter:

- Pure HTML5. Most of the games are plain web pages; one uses Phaser. Nothing needs a
  plugin, a download or an account.
- The whole site is about 53 KB gzipped on a first visit, and each game loads on demand.
  The largest plain game is about 230 KB, and the Phaser one about 1.9 MB.
- Game logic is separated from rendering already, and each game boots into a container we
  hand it, so wrapping one in a portal SDK is integration rather than a rewrite.
- The lifecycle and ad-break points were built against the published Poki and CrazyGames
  models from the start, so the hooks exist even though nothing currently calls them.

[FOR POKI: I have read that you require the Poki SDK and that games run without external
network calls. The second is already how these are built - the games make no network
requests at all.]

[FOR CRAZYGAMES: I have read that you have a time-to-gameplay expectation. I have not
measured our games against your specific definition of it, so rather than quote a number
at you: the shell is about 53 KB gzipped and a plain game adds around 230 KB, with no
loading screen between them.]

Two things I would want to understand before going further, and I would rather ask than
guess:

1. What the advertising looks like for a title played mostly by young children, and what
   control a developer has over it.
2. Whether a non-exclusive listing is possible - ellaz.fun stays live and free either way.

If there is a form you would rather I filled in, point me at it and I will.

Thank you,
[name]
https://ellaz.fun
```

**Why the two questions are in there.** They are the actual blockers, and asking them
first is cheaper than integrating an SDK and then discovering the answer. A reply that
dodges both is itself an answer.

---

## Provenance

| Claim in the email | Where it comes from |
|---|---|
| 42 games | `src/portal/catalog.ts`, counted 2026-08-18 |
| about 53 KB gz first visit | `scripts/assert-payload.mjs` ceiling 56,000; measured 53,121 on 2026-08-18 |
| ~230 KB largest plain game, 1.9 MB Phaser game | summed on the built artifacts, 2026-08-29 at HEAD 167f7d2: sudoku 234,374 B, 2048 233,133 B, snake 1,921,856 B. **Nothing gates these** |
| one game uses Phaser | `grep -rln 'from "phaser"' src/` returns one file |
| logic separated from rendering | the pure-`logic.ts` convention, enforced across all 42 games |
| games boot into a supplied container | `GameContext.mount`; `src/standalone.tsx` is a working proof |
| lifecycle built to the Poki + CrazyGames union | `CLAUDE.md` § Non-negotiable conventions |
| games make no network requests | asserted by `scripts/assert-standalone.mjs`, which fails on any external origin |

**Do not quote a revenue share, an SDK version or a review turnaround in this email.**
None of it was readable from their sites, and a number invented to sound informed is the
one thing that would make this letter worse than not sending it.
