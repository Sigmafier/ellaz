# A Fixed Shell Cannot Chain a Gesture to a Sibling Scroller

**Scope**: Any screen in this repo laid out as a fixed `100dvh` shell whose page deliberately cannot scroll — the design bench today, anything built like it later.
**Origin**: 2026-08-23, found by `/deep-test` during `/finalize`, on the shell built the day before to fix the previous version of this same complaint.

## Core Rule

**Scroll chaining walks the ANCESTOR chain and nothing else. A gesture landing on
a non-scrolling zone of a fixed shell cannot reach the shell's scroller if that
scroller is a SIBLING — it has nowhere to go, so it does nothing. Before making a
page unable to scroll, name which element receives a gesture in every band of the
screen, and forward it explicitly where the answer is "none".**

The trap is that the old, scrolling layout worked *by accident of hierarchy*: the
page was the scroller and therefore an ancestor of everything, so every gesture
chained upward and always found it. Making the page fixed removes that ancestor
and the accident with it — silently, because nothing errors and most of the screen
still works.

## The measurement

The bench at 390x844, wheeling down the screen:

```
bands   preview y=43..580    sheet y=415..844   sheet travel 123px
y= 80 → 0px    y=160 → 0px    y=240 → 0px    y=320 → 0px    y=400 → 0px
y=470 → 123px  y=540 → 123px  y=620 → 123px  y=700 → 123px  y=830 → 123px
```

**372px of 844 — 44% of the screen — is inert to one gesture.** The preview zone is
`flex: 0 0 auto` inside a shell that is `overflow: hidden`; the knob sheet is its
sibling. `Preview`'s transparent shield stops the *frame* eating the gesture, which
is a different job, and it does not forward what it caught.

## Why it survives review

Every part is individually right. The shield is right (a swipe must not scroll the
previewed document). The fixed shell is right (a knob below a fold is a knob that
does not exist). The sheet scrolling is right. What is wrong is a relationship, and
a relationship has no line number.

It also **looks fine on a desktop**, where the two columns sit side by side and the
page scrolls normally, and it is not a crash, a warning, or a failed assertion in
any correctness test.

## What to do

- **Name the receiver per band** before shipping a fixed shell: for every horizontal
  strip of the screen, which element gets a `wheel` / `touchmove`? Any band whose
  answer is "nothing" is a dead zone you are choosing.
- **Forward, don't hope.** A zone that should drive a sibling scroller listens and
  calls `scrollBy` on it. Chaining will not do it for you.
- **Or choose the dead zone deliberately and say so** — a viewfinder that is inert
  is a defensible design. What is not defensible is not knowing which one shipped.

## The tell

A layout change that swaps a scrolling page for a fixed one, and a review that
checks "is everything reachable" (it was: 5/5 knobs hittable) rather than "does
every gesture land somewhere".

## Related

- [`a-layout-nobody-can-look-at-drifts-into-a-different-one.md`](a-layout-nobody-can-look-at-drifts-into-a-different-one.md)
  — the bench this happened on, and why it exists.
- [`a-row-that-grows-with-the-catalog-must-wrap.md`](a-row-that-grows-with-the-catalog-must-wrap.md)
  — the other layout rule whose defect is invisible until measured at 390px.
- `scripts/repro/repro-bench-on-a-phone.mjs` — reproduces it; exits 1 on this line.
