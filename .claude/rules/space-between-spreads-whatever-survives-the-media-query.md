# `space-between` Distributes Whatever Survives the Media Query, Not What You Wrote

**Scope**: Every flex row in this app that hides one of its own children responsively - the screen header today, any toolbar built like it later.
**Origin**: 2026-08-23, reported as *"the sound/mute button just sits in the center"*. It had shipped that way and every gate here was green.

## Core Rule

**`justify-content` is applied to the items that are still in the layout. Hide one
with a media query and the rule you wrote for four items silently becomes a rule
for three - so a group that was pinned to an edge is now floating in the middle,
in exactly the viewport nobody authoring the CSS is looking at.**

Before hiding any flex child responsively, ask what `justify-content` then does
to the ones that remain. The answer is rarely the same layout with a gap in it.

## The measurement

The bar is `.top .in{display:flex;justify-content:space-between}` over four
children - home, the screen's name, mute, the wallet - and the name is
`display:none` under 720px, which is correct and deliberate (it is said again in
the breadcrumb one row below). At 390px:

```
                        WIDE (>=720)              PHONE (<720)
  items in layout       home name mute wallet     home ---- mute wallet
  space-between puts    |home  name  mute wallet| |home    mute    wallet|
  mute's left edge      hard against the wallet   160px - the dead centre
```

Two platform controls that belong together, 99px apart, with nothing between
them and nothing either side. Fixed by `margin-inline-start:auto` on the button:
free space is absorbed by the margin instead of divided by `space-between`, so
the pair travels to the end together.

Measured on the built artifact at 390px with that one declaration toggled and
nothing else: mute's left edge **160 -> 220**, its gap to the coins pill
**67px -> 8px** (the row's own `--hgap`), and home and the wallet BOTH unmoved -
which is what makes it one variable rather than a re-layout.

## Why nothing caught it

- **It is perfect on a desktop.** `.gname` is `flex:1 1 0` there and eats every
  spare pixel, so the two controls are already adjacent and the bug has no way
  to appear. The defect exists only below the breakpoint.
- **Every gate here reads a document built at ONE width.** A media query is a
  string in `DOCUMENT_CSS` to all of them; none renders it, so "which items are
  in the layout at 390px" is a question nothing in this repo was asking.
- **The header pin was already strong and still blind.** It asserted the three
  screens draw the same controls in the same order, that mute is emitted hidden,
  that it is labelled, that no game control is in the bar. All true, all green,
  none of them about position.

## What to do

- Prefer an **auto margin** over restructuring: it absorbs free space before
  `justify-content` sees it, it is inert when a sibling is already growing (so
  the wide arm is untouched), and it needs no wrapper.
- Use the **logical** property (`margin-inline-start`), never `margin-left` - a
  physical one strands the button in the centre of the Hebrew bar and passes
  every assertion written against the English one.
- Hang it on the **element the runtime touches**. Mute is emitted `hidden` and
  revealed later; a wrapper would be a second thing to keep in step with that.
- **Pin the position, not just the presence.** A test that a control exists,
  is labelled and is in the right file says nothing about where it lands.

## The tell

A `display:none` in a media query whose parent sets `justify-content` to
anything other than `flex-start`. Or a review that only ever happened at desktop
width on a layout whose target is a phone.

## Related

- [`game-controls-and-platform-chrome-never-share-a-bar.md`](game-controls-and-platform-chrome-never-share-a-bar.md)
  - mute and the wallet are one family, which is why they belong in one group.
  That rule says WHICH controls share a bar; this one is about where they land.
- [`a-row-that-grows-with-the-catalog-must-wrap.md`](a-row-that-grows-with-the-catalog-must-wrap.md)
  - the other flex defect here that is invisible until measured at 390px, and
  invisible to a width check even then.
- [`a-fixed-shell-cannot-chain-a-gesture-to-a-sibling.md`](a-fixed-shell-cannot-chain-a-gesture-to-a-sibling.md)
  - the same shape for gestures: every part correct, the RELATIONSHIP wrong, and
  a relationship has no line number.
