# Isometric pixel

**Tier**: card · **Family**: pixel · **Renderer**: `render.ts` (shear 0.5, diamond ground grid, cell 4, outline)

Backlog row from the 2026-09-05 research pass; a card until the operator keeps it.

## Look

The cast leans into a receding ground drawn as a diamond grid; every curve becomes a stair-step.

## Palette

Whatever the scene authored, unsnapped; the grid lines are a ten-percent black.

## Outline

One cell of dark around the cast.

## Lighting

None painted; the grid gives the depth.

## Grid and scale

Cell 4 with a 40-pixel diamond pitch; a reference character is about 22 cells tall. Pivot bottom-centre, on a diamond.

## Animation

Move along the two diagonals in whole cells; a straight sideways walk reads wrong on this ground.

## Best for

A tactics grid, a farm or a town, a room seen from a corner.

## Avoid

Side-view fights; the shear makes a punch travel diagonally.

## Sample

`npm run render:styles` writes `shots/styles/reference--isopixel.png`. Look for the ground diamonds and the leaning cast.
