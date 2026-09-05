# Attribute-clash 8x8

**Tier**: card · **Family**: pixel · **Renderer**: `render.ts` (cell 3, outline, two colours per 8x8 block)

Backlog row from the 2026-09-05 research pass; a card until the operator keeps it.

## Look

Flat fills in fifteen loud colours, with colour spilling at every 8x8 block edge the cast crosses. The spill is the point.

## Palette

`palettes/spectrum.json`: eight normal, seven bright. A block keeps its two most-used and drops the rest.

## Outline

One cell of black around the cast, which usually becomes a block's ink colour.

## Lighting

None possible; two colours a block leaves no room for a highlight.

## Grid and scale

Cell 3 with 8-cell attribute blocks; a reference character is about 30 cells tall. Pivot bottom-centre.

## Animation

Move in whole blocks when you can; a character sliding across block borders flickers colour, which was the machine's charm and its curse.

## Best for

A retro-computing joke, a loading screen, a mode you switch on to laugh.

## Avoid

Any scene where two cast members overlap a block; one of them borrows the other's colour.

## Sample

`npm run render:styles` writes `shots/styles/reference--spectrum.png`. Look for the colour spill where a character meets the ground line.
