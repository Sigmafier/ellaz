# Pre-rendered to pixel

**Tier**: card · **Family**: pixel · **Renderer**: `render.ts` (cell 4, soft plastic shading, 6x6x6 cube, no outline)

Backlog row from the 2026-09-05 research pass; a card until the operator keeps it.

## Look

Plastic-shiny forms with a rim of light, quantised to pixels: a 3D model that became a sprite.

## Palette

A 216-colour cube; every form gets the ramp the shading pass gives it.

## Outline

None; the rim light and the shadow side are the edge.

## Lighting

Soft radial highlight with a rim, before downsampling, as if lit in a renderer.

## Grid and scale

Cell 4; a reference character is about 22 cells tall. Pivot bottom-centre.

## Animation

Smooth many-frame clips; this look was born from rendered turntables.

## Best for

A mid-nineties platformer mood, toys that should look moulded.

## Avoid

Flat graphic scenes; the shading fights a poster-flat background.

## Sample

`npm run render:styles` writes `shots/styles/reference--prerender.png`. Look for the rim light on the slime.
