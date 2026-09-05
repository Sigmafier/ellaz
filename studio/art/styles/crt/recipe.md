# CRT arcade

**Tier**: card · **Family**: pixel · **Renderer**: `render.ts` (SNES stage + bloom ghost + scanlines + vignette)

## Look

The SNES render seen through a curved tube: a screen-blended copy two pixels right for phosphor bloom, a dark line every third row, and a vignette pulling the corners down to 60% black.

## Palette

SNES palette, then everything dimmed by the scanlines; brights survive better than mids, so push saturation up one step when authoring for this style.

## Outline

The SNES one-cell outline, softened by the bloom.

## Lighting

The tube's, not the scene's: brighter centre, dark corners.

## Grid and scale

Cell 5 underneath; scanlines are on the 3 px pixel grid, not the cell grid, so they beat against it slightly, which is the point.

## Animation

Whatever the SNES clips do; the overlay is per frame and static.

## Best for

An attract screen, a cabinet-in-the-room diegetic display, a "CRT filter" toggle.

## Avoid

Small text under scanlines. Using it as the default view of a game; it is a filter, not a style.

## Sample

`npm run render:styles` writes `shots/styles/reference--crt.png`. Look for the bloom halo on the yellow visor.
