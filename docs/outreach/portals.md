# Poki and CrazyGames - the enquiry, and the decision it forces first

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
| no ads, anywhere | the home page, all 144 emitted pages, both outreach drafts |
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

## What could not be verified from here

Both `https://developers.poki.com/` and `https://developer.crazygames.com/` return **HTTP
200** and are **client-rendered shells** - the Poki page is 3.4 KB carrying **nine words**
of text. So no requirement, revenue share, SDK version or submission step below has been
read from their site by this session, and none should be quoted to them as fact.

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
33 web games, HTML5, no engine dependency - looking at distribution options
```

**Body**:

```
Hello,

I run ellaz.fun - a free browser games site, 33 games, playable on phone, tablet and
desktop. It is Hebrew-first with an English version, which may be an unusual audience
angle for you.

Some specifics that are probably the ones that matter:

- Pure HTML5. Most of the games are plain web pages; one uses Phaser. Nothing needs a
  plugin, a download or an account.
- The whole site is about 90 KB gzipped on a first visit, and each game loads on demand.
  The largest single game is about 200 KB, and the Phaser one about 1.9 MB.
- Game logic is separated from rendering already, and each game boots into a container we
  hand it, so wrapping one in a portal SDK is integration rather than a rewrite.
- The lifecycle and ad-break points were built against the published Poki and CrazyGames
  models from the start, so the hooks exist even though nothing currently calls them.

[FOR POKI: I have read that you require the Poki SDK and that games run without external
network calls. The second is already how these are built - the games make no network
requests at all.]

[FOR CRAZYGAMES: I have read that you have a time-to-gameplay expectation. I have not
measured our games against your specific definition of it, so rather than quote a number
at you: the shell is about 90 KB gzipped and a plain game adds around 200 KB, with no
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
| 33 games | `src/portal/catalog.ts`, counted 2026-08-18 |
| about 90 KB gz first visit | `scripts/assert-payload.mjs` ceiling 90,500; measured 90,027 on 2026-08-18 |
| ~200 KB largest plain game, 1.9 MB Phaser game | `du -sh dist-standalone/*` on the built artifacts |
| one game uses Phaser | `grep -rln 'from "phaser"' src/` returns one file |
| logic separated from rendering | the pure-`logic.ts` convention, enforced across all 33 games |
| games boot into a supplied container | `GameContext.mount`; `src/standalone.tsx` is a working proof |
| lifecycle built to the Poki + CrazyGames union | `CLAUDE.md` § Non-negotiable conventions |
| games make no network requests | asserted by `scripts/assert-standalone.mjs`, which fails on any external origin |

**Do not quote a revenue share, an SDK version or a review turnaround in this email.**
None of it was readable from their sites, and a number invented to sound informed is the
one thing that would make this letter worse than not sending it.
