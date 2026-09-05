# Stained-glass mosaic

**Tier**: card · **Family**: craft · **Renderer**: `render.ts` (cell 12 on dark grout, hashed corner nudges, glint)

## Look

The scene read at 12 px cells and laid as tesserae on dark grout, each tile's corners nudged by a hash of its position so the grid looks hand-laid, with a glint along each tile's top edge.

## Palette

Authored colours as glass; the grout is `#2a2320` and shows in every seam, so the whole picture darkens.

## Outline

The grout is the outline, everywhere, background included.

## Lighting

The glint strip on each tile; nothing directional.

## Grid and scale

Cell 12, the coarsest style here; a reference character is about ten tiles tall. Faces are two tiles.

## Animation

Tiles swap colour; nothing moves smoothly. Best for static art.

## Best for

A title card, a level-complete vignette, a church-window boss intro.

## Avoid

Anything that must animate, and small characters.

## Sample

`npm run render:styles` writes `shots/styles/reference--mosaic.png`. Look for the four cast members still identifiable at ten tiles tall.
