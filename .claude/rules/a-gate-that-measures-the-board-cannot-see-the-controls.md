# A Gate That Measures the Board Cannot See the Controls Beside It

**Scope**: Every game page layout, and any gate that decides a layout is "done" - above
all when a layout change moves controls somewhere the existing gate does not look.
**Origin**: 2026-09-14. Every game got a PC layout with its footer beside the board.
`repro-board-fills-the-window.mjs` was green on all 43 games, and on the same live site
coloring's colours were cut off the bottom of a 1024x768 window. The operator found it by
looking: *"i see the colors ... are out of the screen, we should handle this better"*.

## Core Rule

**A layout gate answers questions about the element it reads. When a change moves OTHER
elements - a footer into a side column, a picker into a strip - the gate that approved the
change cannot have looked at them, and its green is silent about them. Give the moved
thing its own instrument, in the same change, and let that instrument's population come
from the page (every control), never from a list of games someone thought were at risk.**

## What each gate could see

```
                                board gate          on-screen gate
reads                           .ellaz-board        every button, input, footer
                                                    and side-column child
sizes                           3 PC + phone        5 PC, 1024x768 upward
coloring @1024x768, live        GREEN               24 of 53 controls cut
maze down arrow @1024x768       GREEN               hidden 68px under a scrollbar
all 43 games, live              GREEN               19 of 215 arms cut, 5 games
same 43 games after the fix     GREEN               0 of 215
```

The board gate was not wrong. It measured fill, centring and the phone frame, and all
three were correct. It simply had no row for "can the player reach the brush", and a
missing row reads exactly like a passing one.

## Two things the new gate had to get right

- **A clip by the board is play, not a defect.** A balloon rising in under the arena's
  bottom edge is a hidden button, and the first run flagged it in every window. The rule
  it uses: hidden by an ancestor INSIDE the play surface is a game object; hidden by
  anything else is a control the player cannot see.
- **Its controls planted both verdicts.** A control past the right edge and a footer
  behind a scrollbar must be caught; a 1px screen-reader button must NOT be - and the same
  button at 60x40 must be, or the no-flag cell passes for the wrong reason. The first
  version of that cell failed: `width: 1px` on a button with default padding is 13px wide.

## The fix is layout, not a scrollbar

Scrolling was the first answer, and it is how the controls got hidden. What shipped:
a PICKER goes in `GameChrome`'s `side` slot (the empty column that kept the board
centred), a sideways `.ellaz-strip` wraps on a PC, and a column taller than the board is
scaled to fit by `fitColumns`. On a phone all three are inert.

## When to Apply

- Any change that moves controls to a new place on the page, on any viewport
- Reading a green layout gate: ask which ELEMENTS it read, not only whether it passed
- Adding a game: run `npm run assert:on-screen -- --only <id>` beside the board gate
- A report of "I can't see X": find the gate that should have seen X before fixing X

## The tell

A layout change whose diff moves a footer, a toolbar or a picker, verified by a gate whose
name is about the board.

## Related

- [`game-controls-and-platform-chrome-never-share-a-bar.md`](game-controls-and-platform-chrome-never-share-a-bar.md)
  - where the footer went on a PC, and why the board must stay centred.
- [`a-row-that-grows-with-the-catalog-must-wrap.md`](a-row-that-grows-with-the-catalog-must-wrap.md)
  - the strip that ran off the window is that rule's row, on a new viewport.
- [`a-diagnostic-that-truncates-what-it-compares.md`](a-diagnostic-that-truncates-what-it-compares.md)
  - an instrument that cannot express the failure it is looking for.

---

**Last Updated**: 2026-09-14 (origin)
