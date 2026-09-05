# Hi-bit modern pixel

**Tier**: card · **Family**: pixel · **Renderer**: `render.ts` (cell 3, shaded, no outline)

## Look

Three-pixel cells, no outline, and the cast shaded with a radial highlight upper-left and shadow lower-right before downsampling. The modern indie pixel look: soft forms, crisp cells.

## Palette

Authored colours plus the highlight and shadow the pass adds. Works with the full key-art palette unchanged.

## Outline

None. Forms separate by shading; two same-colour shapes touching will merge, so offset or recolour them.

## Lighting

Baked: highlight at 35%/30% of each shape's box, shadow at the far edge, soft falloff, a faint rim.

## Grid and scale

Cell 3; a reference character is about 42 cells tall, enough for fingers and eyes with pupils. Pivot bottom-centre.

## Animation

Six to eight frames per cycle read well at this resolution; sub-cell motion still shimmers, so keep moves on the grid.

## Best for

A polished flagship look for a game that wants "pixel" without "retro".

## Avoid

Tiny sprites: below twenty cells the shading is noise. Mixing with the outline pass.

## Sample

`npm run render:styles` writes `shots/styles/reference--hibit.png`. Look for the robot reading round without an edge line.
