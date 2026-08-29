---
paths: "**/games/**,**/ui/**,**/portal/**,**/build/**"
---

# Spatial Game Grids Must Be `dir="ltr"`

**Scope**: Any game with a spatial grid or directional input in this RTL-default (Hebrew) app.

## Core Rule

A game board/grid — or any element whose **layout position or input direction is
meaningful** — MUST carry `dir="ltr"`. The app defaults to Hebrew RTL, so a CSS grid
inside it renders **mirrored**: logical column 0 lands on the visual right. When the
swipe/arrow handlers use physical screen direction, "swipe right" then moves tiles
toward the logical-right column that RTL drew on the visual *left* → inverted controls.

Pin the board to LTR so logical directions match visual directions. The Hebrew UI
chrome around it (labels, buttons, hints) stays RTL as normal.

## When to Apply

- Any board/grid game with swipe or arrow-key movement (2048, block-fall, snake-like).
- Math/number notation that must read left-to-right regardless of locale (the math
  equation is pinned `dir="ltr"`).
- Symptom: "left/right is inverted" or a grid looks mirrored only in Hebrew.

## Pattern (see `src/games/n2048/Game2048.tsx`)

```tsx
<div dir="ltr" style={{ display: "grid", gridTemplateColumns: `repeat(${size},1fr)` }}>
```

Also give grids explicit `gridTemplateRows: repeat(n, 1fr)` + cell `minHeight:0`
`lineHeight:1` so content (a big glyph/number) can't stretch a row and deform the
square board.

## The other edge of the same knife: `dir` on an element defeats its OWN logical insets

**Scope note**: this half applies to any element in this app, not only a game board.

**A `dir="ltr"` added for the reason above ALSO stops that element's
`inset-inline-start` / `inset-inline-end` from flipping.** Logical insets resolve
against the element's own direction, not its parent's — so the moment you pin an
element LTR to keep a digit or an arrow from reordering, every logical inset ON THAT
ELEMENT becomes physical, silently, everywhere.

Measured 2026-08-25 on the artifact, the Hebrew home at 390px:

```
                        the card       the star badge   the beta badge
  what the code says    -              insetInlineStart  inset-inline-end
  what you expect (he)  263..374       right corner      left corner
  what actually happens 263..374       270..290  LEFT    270..305  LEFT
                                                         ^^^^ same corner, overlapping
```

The star badge carried `dir="ltr"` for its digit-beside-a-glyph, and a comment saying —
twice, in one declaration — that its logical inset kept it on the leading edge in both
directions. It had been physically LEFT since the day that `dir` was added; the comment
was describing an intention. Nothing was wrong until a SECOND badge arrived using a
logical inset honestly, flipped under Hebrew, and landed on top of it.

**English looked perfect throughout** — the two sixty pixels apart, exactly as designed.

### What to do

- **When you pin an element `dir`, pin its insets physically too** (`right`, `left`), and
  say in the comment that the `dir` is why. A logical inset beside a `dir` on the same
  element is a contradiction that renders.
- **The neighbour is what breaks, not the element.** Adding any positioned sibling to a
  card that already holds a `dir`-pinned one means checking BOTH corners in BOTH
  directions — the existing one is not where its source says it is.
- **Measure the locale you do not develop in.** No test in this repo could see this: the
  markup is correct, the CSS is correct, and the collision only exists once a browser
  resolves `dir` against `inset-inline-*`. `scripts/repro/repro-beta-badge.mjs` walks
  three locales at two widths on the built artifact and exits 1 on any overlap.
- **Do not "fix" the `dir`-pinned element** unless you want its visual change too —
  moving the star badge is a change to 34 cards nobody asked for. Pin the newcomer.

## Related

- [`space-between-spreads-whatever-survives-the-media-query.md`](space-between-spreads-whatever-survives-the-media-query.md)
  — the sibling defect: every part correct, the RELATIONSHIP wrong, and a relationship
  has no line number. That one hides behind a viewport; this one hides behind a locale.
- [`a-comment-that-explains-a-cost-must-name-its-measurement.md`](a-comment-that-explains-a-cost-must-name-its-measurement.md)
  — the star badge's comment is an instance: it described what the author meant, and was
  quoted as what the code does.
