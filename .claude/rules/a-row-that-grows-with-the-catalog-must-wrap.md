# A Row Whose Length Grows With the Catalog Must Wrap or Scroll

**Scope**: Any horizontal flex row in this app whose item count is not fixed at author time.
**Origin**: 2026-08-07, the boards redesign. Second instance in this repo.

## Core Rule

**A `display: flex` row sizes to `max-content` and does not wrap unless told to. If the
number of items comes from the catalog, from a player's history, or from anything else that
grows, the row will eventually be wider than the phone - and inside a container with
`overflow: hidden` there is no scrollbar to reveal what fell off. Every such row carries
`flexWrap: "wrap"`, or `overflowX: "auto"` with `flex: "0 0 auto"` children, chosen
deliberately.**

Wrap when every item matters equally and the reader needs to see the set (a game grid, a
filter set). Scroll when the row is a rail with a natural first item and the rest are
secondary (the keep-playing row, the shop category tabs, which already do this).

## Why it is invisible until it is not

The author writes the row with three or four items and it looks correct forever after. The
count grows in a different file - a new game in `games.ts`, a new stat in a renderer - and
nothing about that change mentions the row. There is no error, no console warning, no
failing test. The screen just quietly stops showing some of its content, and only on
narrow viewports, which is where most children actually play.

## The two instances

| When | Where | Measured |
|---|---|---|
| 2026-08-04 | Nine games' stat rows, non-wrapping flex under `alignItems: "center"` | 439px of row on a 390px phone |
| 2026-08-07 | The boards' game picker, one `DifficultySelector` per game | **1,410px on a 390px phone - 15 of 20 games unreachable** |
| 2026-08-07 | The boards' difficulty row, `DifficultySelector` handed `game.boards` | six sudoku levels: **`Expert` rendered as `Exper`**, both `Animals N×N` cut - and the row reported no overflow at all |

The third arrived hours after the second, in the fix for the second, using the same component.
That is what "fix the class, not the instance" means here: `DifficultySelector` now wraps, so
every caller is covered rather than the one that happened to be measured.

The second is the worse shape: the row lived inside `#game-frame`, which carries
`overflow: hidden`, so the overflowing games were not scrolled off-screen, they were
clipped with nothing to scroll. `document.documentElement.scrollWidth` was unchanged, so
even a page-level overflow check reported clean.

`DifficultySelector` is the specific trap, because it is the shared component and it is
`display: flex; gap: 6px` with no wrap - correct for three difficulty pills, wrong the
moment it is handed a list. It is fine to use it for a bounded set; do not hand it the
catalog.

## How to check - and a width check is NOT enough

Measure against the containing box, not the window - the page can be perfectly happy while
a row inside a fixed-width frame is clipped:

```js
const box = frame.getBoundingClientRect();
[...frame.querySelectorAll("*")].filter((el) => el.getBoundingClientRect().width > box.width + 1);
```

**That check finds the loud version and is structurally blind to the quiet one.** Flex items
shrink before they overflow, so a row that is only slightly too wide reports the container's
exact width, no element anywhere is wider than its frame, and the text is clipped INSIDE each
pill. Measured on the built artifact at 390px: the boards' difficulty row read
`scrollWidth 358 === clientWidth 358` and `0 elements wider than frame`, while `Expert`
rendered as `Exper` (48px box, 58px of text) and both `Animals N×N` pills lost a glyph.

So assert per ITEM, not per row:

```js
[...row.children].filter((c) => c.scrollWidth > Math.ceil(c.getBoundingClientRect().width));
```

Run both at 390px with the catalog fully populated - a seeded profile, not a fresh one. An
empty profile hides this bug completely, which is why it survived a screenshot review.

## Related

- [`rtl-spatial-grid-dir-ltr.md`](rtl-spatial-grid-dir-ltr.md) - the other layout rule that
  only bites in one locale and is invisible in the other.
- `CLAUDE.md` § Responsive - boards size against the VIEWPORT, not their container.
