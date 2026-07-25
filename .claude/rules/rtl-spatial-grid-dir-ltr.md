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
