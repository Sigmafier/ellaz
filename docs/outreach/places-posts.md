**Status**: draft

# Places — drafted posts

One post per surviving `places.md` row. Each is written from scratch, in the
operator's own voice as a parent who built this for their kids, signed **Yatir**
(the transliteration the operator approved 2026-08-30, `ledger.md` row 85). No
two share a sentence outside the signature — checked by eye, and each is short
enough to check by eye. Every post names the rule read on `places.md` that
permits it, immediately above the post. **Nothing here has been sent.** The
operator posts, from their own account, after re-reading the destination's rules
on the day (`reach-doctrine` RCH3 — rules are read on the day of posting, never
from a note written earlier, this one included).

Facts used, and only these: 42 games, four languages (English, Hebrew, Spanish
and French), no ads, no accounts, plays offline as a PWA, MIT source at
`github.com/Sigmafier/ellaz`. No other number appears anywhere below.

---

## LinkedIn

**Rule read**: `linkedin.com/legal/professional-community-policies` forbids paid
political advertising and undisclosed sponsored endorsements. A personal post
about a project the operator built is neither — door is the operator's own
profile, so no rule stands between it and posting.

> I spent this year building something for my own kids: Ellaz, a free browser
> games site with 42 games in English, Hebrew, Spanish and French. No ads, no
> accounts, and it works offline as a PWA. The source is MIT-licensed at
> github.com/Sigmafier/ellaz. If you're a parent, or you just like PWAs and
> game engines, I'd genuinely like feedback.
>
> - Yatir

---

## dev.to

**Rule read 2026-09-03, and it changed the draft.** The earlier note checked
`dev.to/code-of-conduct`, which carries no self-promotion ban - true, and the
wrong document. The binding clause is in `dev.to/terms`, read today:

> "make a good-faith effort to share content that is on-topic, of high-quality,
> and is not designed primarily for the purposes of promotion or creating
> backlinks. Posts must contain substantial content - they may not merely
> reference an external link that contains the full post."

The previous draft was ~100 words carrying two links, which is exactly the shape
that sentence describes. It is replaced. `canonical_url` remains documented (23
occurrences in the live Forem API reference today), but it may not be used to
point at a fuller version elsewhere - the substance has to be ON dev.to.

So the post below is a technical article that stands on its own. The site is
mentioned because it is where the bug happened, not as the point.

**Title:** A button that covers another button passes every test you have

---

Yesterday I shipped a share button onto the win screen of a games site I
maintain. It was correct code. It type-checked, it rendered, every assertion
about it passed, and it covered a control that children use.

Here is the whole of it:

```jsx
<div style={{
  position: "absolute",
  insetInlineStart: 0,
  insetInlineEnd: 0,
  bottom: "max(12px, env(safe-area-inset-bottom))",
  display: "flex",
  justifyContent: "center",
  zIndex: 20,
}}>
  <Button onClick={openShareSheet}>Share my result</Button>
</div>
```

Bottom centre of the play area, floating, above everything. That is a
reasonable place to put a thing that appears when you win.

It is also where the game puts its controls. Measured in a browser on the built
bundle, in two games:

```
memory   chip 526-556   "Two players" button 512-549    covered
maze     chip 443-495   direction pad DOWN   432-492    covered
```

Every game on the site that steers with a direction pad puts that pad at the
bottom centre of the same box. A centred floating pill anchored to the bottom
of that box is not sometimes going to collide with them. It always was.

## Why nothing caught it

The suite is not thin - about 4,500 tests, and several of them are specifically
about this component. All of them passed, and none of them could have failed,
for two separate reasons.

The first is that a button covering another button is a completely valid
program. Both elements exist. Both are in the accessibility tree. Both respond
to a click, if you dispatch one at them directly. Every question a unit test
knows how to ask - does it render, does it call the handler, does it carry the
label, is it absent on a loss - has the same answer whether or not the thing is
sitting on top of something else.

The second is more specific, and it is the one worth carrying around:

**jsdom has no layout engine.** `getBoundingClientRect()` returns zeros. Every
element in a jsdom test occupies the rectangle (0, 0, 0, 0), which means no two
elements ever overlap, which means an overlap assertion written against jsdom
cannot fail. You can write the check. It will be green forever, on every
codebase, for every element, including ones that are genuinely covering each
other.

That is a nastier property than "we did not write the test". A test that cannot
fail is worse than a missing one, because it appears in coverage and it appears
in review.

## What actually found it

I played the game.

Won a round of the memory game, looked at the screen, and the pill was sitting
on the "Two players" button. Total time to find: about four seconds after the
win animation finished. Total time it had survived automated verification:
every run, forever.

I have a note in my repo, written after an earlier incident, that says a gate
reading the bytes of an artifact cannot tell you the artifact runs. This is the
same lesson one layer up. A gate that reads the DOM cannot tell you the DOM is
usable, because usable is a geometric property and the DOM is not a geometry.

## The fix, and the thing I pinned instead of the pixels

The chip is in normal flow now. It reserves a strip at the end of the play area
rather than being painted over one:

```jsx
<div style={{
  flex: "0 0 auto",
  display: "flex",
  justifyContent: "center",
  padding: "10px 0 max(10px, env(safe-area-inset-bottom))",
}}>
```

Same overlap check afterwards: zero covered controls.

The interesting question was what to write a test for. I cannot test the
geometry - see above. So the test reads the source and asserts the DECISION:
this element does not get `position: absolute`, does not get `position: fixed`,
does not get a `zIndex`, and is not anchored to an edge.

```js
it("is in normal flow, so it reserves space instead of covering a control", () => {
  expect(block).not.toMatch(/position:\s*["']absolute["']/);
  expect(block).not.toMatch(/position:\s*["']fixed["']/);
});
```

That is an unusual shape for a test and I went back and forth on it. What sold
me is that it fails for the right reason. I planted the exact code that shipped
and three of its five assertions went red. And it carries its own instruction:
if somebody later wants the chip floating, they have to bring a measurement
against a direction-pad game, and delete this test to say so. A deliberate
deletion with a reason is a much better artifact than a silent regression.

The vacuity guard matters too, because a source-reading test can pass by
accident on the wrong slice of file:

```js
it("the block this test reads is the chip's, and not something else", () => {
  expect(block).toMatch(/Icon name="share"/);
  expect(block.length).toBeGreaterThan(120);
});
```

## The general version

If a defect is geometric - overlap, clipping, contrast, reachable tap target,
something below the fold that needed to be above it - your test suite is
probably structurally incapable of seeing it, and it will be green with total
confidence. Open the thing and use it.

For what it is worth the site is Ellaz (ellaz.fun), 42 free browser games for
kids in four languages, no ads and no accounts, and the source is MIT at
github.com/Sigmafier/ellaz. But the bug is the point, and I would have written
this up the same if it had happened at work.

## Hashnode

**Rule read**: `hashnode.com/terms` carries an anti-spam/anti-harassment clause
and a minimum-age rule for the SERVICE - not a ban on writing about your own
project, which is the platform's stated purpose.

> A different angle on the same project (Ellaz, a free kids' games site) than
> I'd write for a general audience: the hardest part was not any single game,
> it was making one route render correctly in four languages, two of them
> right-to-left. A locale either gets a fully translated page or none at all -
> a half-translated page reads as a duplicate to a search engine, not a
> smaller version of the real one. 42 games now, in English, Hebrew, Spanish and French - no ads, no accounts, works offline. Code's MIT:
> github.com/Sigmafier/ellaz.
>
> - Yatir

---

## Bluesky

**Rule read**: `bsky.social/about/support/community-guidelines` forbids
advertising that TARGETS minors and commercial practices aimed at children - not
an adult sharing their own project from their own account.

> Built Ellaz for my kids: 42 free browser games, no ads, no accounts, works
> offline. English, Hebrew, Spanish, French. MIT source:
> github.com/Sigmafier/ellaz
>
> - Yatir

---

## "Made with Phaser" community

**Rule read**: `phaser.io/community` carries no rules clause of its own (checked
and silent) - a showcase of a Phaser-built game is the page's stated purpose.

> Sharing a small Phaser 4 build: the Snake game inside Ellaz, a free 42-game
> site for kids in English, Hebrew, Spanish and French (no ads, no accounts,
> works offline as a PWA). Happy to talk through the RTL/Hebrew board handling
> if it's useful to anyone else building with Phaser - it turned out to need
> more care than I expected. Source (MIT): github.com/Sigmafier/ellaz.
>
> - Yatir

---

## Y8 (forum, a question rather than a submission)

**Rule read**: `developer.y8.com` documents the Y8 SDK as required for ads,
cloud saves, leaderboards and player accounts - it does not say whether a
non-monetized, no-SDK submission is possible at all, which this post asks rather
than assumes.

> Hi - I run a small, ad-free games site for kids (42 games, no accounts, no
> monetization). I've read through the Developer Portal docs and I can't tell
> whether a game can be submitted without integrating the Y8 SDK, or whether
> the SDK is required even for a plain, non-monetized listing. Could someone
> point me to where that's documented, or say from experience? Thanks.
>
> - Yatir

---

## Armor Games (email, not a public post)

**Rule read**: the community's own pinned answer to "how do you submit a game
to armorgames?" names the door directly: email `tasselfoot@armorgames.com` with
a link, per `armorgames.com/community/thread/6089508/how-to-upload-games`. Not
a forum post — a private submission email, drafted here in the same voice for
the same reason.

> Subject: Game submission - Snake (Ellaz)
>
> Hi Tasselfoot,
>
> I built Snake as part of Ellaz, a free, ad-free games site for kids - 42
> games total, in English, Hebrew, Spanish and French, no accounts, works
> offline as a PWA. I saw in the forum that submissions go through you -
> here's the game: [link to the built standalone bundle]. Happy to answer
> anything about it.
>
> Thanks for your time,
> Yatir

---

## YouTube (channel bio / video description - reach-only, RCH13)

**Rule read**: `youtube.com/howyoutubeworks/policies/community-guidelines`
governs content safety, not whether a creator may describe their own project -
recorded as `channel`, nofollow, discovery only, never counted as a backlink.

> Ellaz is a free browser games site for kids: 42 games, no ads, no accounts,
> works offline. Built in English, Hebrew, Spanish and French by one parent
> for their own kids. MIT source: github.com/Sigmafier/ellaz
>
> - Yatir

*(This needs a channel and at least one recorded video before it can be used -
see the ledger's Do-next. The text above is ready; the video is not.)*

---

## Indie Hackers

**Rule read**: the platform's own posting-requirements thread says access is
granted to accounts with "a pattern of contributing authentically" over time -
not a ban on the content, a gate on the ACCOUNT. This post is pre-drafted for
whenever that gate clears; see the ledger's Do-next.

> Shipped a side project this year: Ellaz, a free, ad-free browser games site
> for kids - 42 games, no accounts, offline-capable as a PWA, written in
> English, Hebrew, Spanish and French. No monetization plan; I built it
> because I wanted something I could actually hand my own kids without a
> screen full of ads. MIT source if anyone wants to poke at the code:
> github.com/Sigmafier/ellaz. Would love feedback from other parents or
> makers here.
>
> - Yatir
