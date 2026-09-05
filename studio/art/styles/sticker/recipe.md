# Sticker book

**Tier**: card · **Family**: vector · **Renderer**: `render.ts` (12 px white border, soft grey halo, gloss)

## Look

Every cast piece is die-cut: a 16 px translucent grey halo, a 12 px white border, the flat fill, and a glossy ellipse clipped inside. Polygons skip the gloss so a spark stays sharp.

## Palette

Authored colours over the scene's own background. White border always white; the halo is 18% black.

## Outline

The white border is the outline. Round joins; it merges across touching pieces into one sticker, which reads right.

## Lighting

A single gloss highlight upper-left on each piece; no shading.

## Grid and scale

Vector, any scale. The border is fixed at 12 px, so small pieces become mostly border: keep pieces above 20 units.

## Animation

Tweened; the border follows the shape. Peel-and-place transitions suit it.

## Best for

A collection or album screen, shop items, a sticker-reward mechanic.

## Avoid

Busy backgrounds behind white borders; crowds of small pieces.

## Sample

`npm run render:styles` writes `shots/styles/reference--sticker.png`. Look for one clean white border per character, not per part.
