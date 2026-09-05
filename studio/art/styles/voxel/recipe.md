# Voxel cubes

**Tier**: card · **Family**: vector · **Renderer**: `render.ts` (cell 8, depth 6, cast extruded only)

## Look

The scene read at 8 px cells; background cells are flat tiles on a pale blue ground, cast cells become cubes six pixels deep with a lit top edge and two shaded faces. Extruding the background too smeared the whole room, so only the cast rises.

## Palette

Authored colours; the cube faces add a 40% white top strip, a 42% black right face and a 22% black bottom face automatically.

## Outline

None; the cube faces draw the edges.

## Lighting

Upper-left, fixed: top faces lit, right and bottom faces shaded.

## Grid and scale

Cell 8; the extrusion adds six pixels right and down, so leave that margin at the frame edge. Pivot bottom-centre of the feet, before extrusion.

## Animation

Whole-cell moves; a cube that moves by a fraction of a cell shears.

## Best for

An isometric puzzle skin, a "3D mode" toggle, item icons.

## Avoid

Thin diagonal shapes (they become a staircase of cubes) and dense backgrounds that compete with the cast's depth.

## Sample

`npm run render:styles` writes `shots/styles/reference--voxel.png`. Look for the cast standing proud of the flat ground.
