# C64 multicolour

**Tier**: card · **Family**: pixel · **Renderer**: `render.ts` (cells 8 wide by 4 tall, outline, dither 0.3)

Backlog row from the 2026-09-05 research pass; a card until the operator keeps it.

## Look

Chunky double-wide pixels in the sixteen Commodore colours; everything leans a little blocky.

## Palette

`palettes/c64.json`, Pepto's measured values, snapped with a light checkerboard.

## Outline

One cell of black around the cast; the wide pixel makes it read heavy.

## Lighting

None; the palette's greys and the brown-orange pair do the modelling.

## Grid and scale

Cells 8 x 4; a reference character is about 22 rows tall. Pivot bottom-centre.

## Animation

Horizontal moves in whole double-wide cells; vertical ones in single rows.

## Best for

A deliberately clunky retro mode, a loading-screen joke, a title card.

## Avoid

Thin vertical detail; it rounds to a two-cell-wide bar.

## Sample

`npm run render:styles` writes `shots/styles/reference--c64.png`. Look for the wide-pixel stair-steps on every curve.
