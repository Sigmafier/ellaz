---
paths: "**/ui/**,**/portal/**,**/games/**"
---

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
| 2026-08-30 | The game chrome row, snake standalone **while playing** | two navs leave the grid **227px of a 355px wrapper**; `Normal` rendered `N...` - identically at column ratios 1.8, 2.2 and 2.6 |

**The fourth is the one that says the count need not grow at all.** The chrome row has
carried exactly three cells since it became a grid, and it still overflowed - because the
*siblings* grew. A nav button is not in the row, it sits beside it, and each one takes width
the three cells never see: zero navs in the app (the page owns restart), one on a standalone
game, two while a game that can pause is playing. So the thing that grew was the row's
CONTAINER minus its neighbours, which no amount of looking at the row itself reveals.

**And a column ratio cannot fix it**, which is the second half of the lesson. Three attempts
at re-weighting the tracks - 1.8, 2.2, 2.6 - all clipped identically, because dividing 227px
differently does not make 227px into 270px. Measured on the built artifact at 390px, sweeping
the frame width until the ellipsis stopped: clear at rowW 277, short by 11px at 257. The fix
is `flexWrap: "wrap"` on the sibling wrapper plus a measured `flex-basis` on the row, so it
takes its own line rather than losing letters. Both halves are load-bearing and the test
plants both mutations: wrap without a basis never fires (a zero-basis item always fits), and
a basis without wrap overflows instead of moving.

Only the standalone bundles reach it - the app puts restart in the page header - and only
snake, the one game that both pauses and ships standalone. Verified on all three built
bundles at 390px afterwards: 2048 and sudoku unchanged at one line, snake's ready state
unchanged at one line, snake playing now two lines with nothing clipped and zero page
overflow. At the 800x900 embed the live listings use, the row is 637px and does not wrap at
all, so nothing published moved.

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
