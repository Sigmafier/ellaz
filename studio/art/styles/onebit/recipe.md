# 1-bit

**Tier**: card · **Family**: pixel · **Renderer**: `render.ts` (cell 4, ink outline, full dither to two values)

Backlog row from the 2026-09-05 research pass; a card until the operator keeps it.

## Look

Ink on paper and nothing between. Every mid-tone is a checkerboard, every form is a silhouette first.

## Palette

`#101010` ink and `#F4F1E8` paper, from `palettes/onebit.json`. Authored colours only decide how dense the weave is.

## Outline

One cell of ink around the cast, or a dark body dithers into a dark ground.

## Lighting

None. Density does the work a highlight would.

## Grid and scale

Cell 4; a reference character is about 22 cells tall. Pivot bottom-centre.

## Animation

Keep moves whole-cell; a half-cell shift makes the weave crawl.

## Best for

A horror or puzzle mood, a print-out, an unlockable monochrome skin.

## Avoid

Scenes whose cast and ground share a luminance; both dither to the same weave.

## Sample

`npm run render:styles` writes `shots/styles/reference--onebit.png`. Look for four distinct silhouettes.
