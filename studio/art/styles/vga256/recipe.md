# VGA painterly

**Tier**: card · **Family**: pixel · **Renderer**: `render.ts` (cell 3, shaded foreground, 6x6x6 cube, no dither, no outline)

Backlog row from the 2026-09-05 research pass; a card until the operator keeps it.

## Look

Soft ramps on every form, no dither, and no outline: the painted look of a late DOS adventure.

## Palette

A 216-colour cube stands in for a hand-picked 256; each fill gets its own short ramp from the shading pass.

## Outline

None. Edges come from value contrast, so the cast wants a darker ground behind it.

## Lighting

Radial highlight upper-left and shadow lower-right on every foreground piece, before downsampling.

## Grid and scale

Cell 3; a reference character is about 30 cells tall. Pivot bottom-centre.

## Animation

Cells are small enough for sub-cell easing; keep the highlight fixed to the light, not the body.

## Best for

An adult story game, a point-and-click mood, painted backdrops with pixel figures.

## Avoid

Pale cast on pale ground; with no outline it dissolves.

## Sample

`npm run render:styles` writes `shots/styles/reference--vga256.png`. Look for a visible highlight on the robot's dome and no black edge anywhere.
