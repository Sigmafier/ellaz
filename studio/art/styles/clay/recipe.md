# Clay / soft 3D

**Tier**: card · **Family**: craft · **Renderer**: `render.ts` (soft shadow, shaded fill with rim light)

## Look

Plasticine: each cast piece drops a blurred shadow six pixels down, then gets the radial highlight and shadow with a white rim, so every shape reads as a rounded lump.

## Palette

Authored colours, lightened at the highlight and darkened at the shadow by the pass; saturated fills look most like clay.

## Outline

None; the rim light and the drop shadow separate pieces.

## Lighting

Upper-left, baked per shape; the shadow pools below.

## Grid and scale

Vector, any scale; the shadow blur is fixed at 10 px, so tiny pieces vanish into their own shadow.

## Animation

Tweened squash-and-stretch suits it; stop-motion stepping also reads as claymation.

## Best for

A toybox or kitchen-table look; younger players' games.

## Avoid

Flat backgrounds with no shadow to land on; very thin pieces.

## Sample

`npm run render:styles` writes `shots/styles/reference--clay.png`. Look for the slime reading as a wet lump with a rim.
