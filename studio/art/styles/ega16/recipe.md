# EGA 16-colour

**Tier**: card · **Family**: pixel · **Renderer**: `render.ts` (cell 4, outline, dither 0.7 to the sixteen RGBI colours)

Backlog row from the 2026-09-05 research pass; a card until the operator keeps it.

## Look

Stark primaries and a visible crosshatch everywhere a colour falls between two of the sixteen.

## Palette

`palettes/ega16.json`, the canonical RGBI values, snapped hard with a strong checkerboard.

## Outline

One cell of black around the cast.

## Lighting

None painted; the dark-and-bright pairs (blue and bright blue) act as a two-step ramp.

## Grid and scale

Cell 4; a reference character is about 22 cells tall. Pivot bottom-centre.

## Animation

Whole-cell moves; the crosshatch shimmers if a fill drifts across cells.

## Best for

A DOS-era adventure mood, a shareware joke, a level set in the past.

## Avoid

Large soft fields; they turn to a uniform checkerboard that hurts to look at.

## Sample

`npm run render:styles` writes `shots/styles/reference--ega16.png`. Look for the crosshatch on the ground band.
