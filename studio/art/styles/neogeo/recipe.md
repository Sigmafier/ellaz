# Arcade hand-drawn

**Tier**: card · **Family**: pixel · **Renderer**: `render.ts` (cell 3, shaded, posterised to five steps, black outline)

Backlog row from the 2026-09-05 research pass; a card until the operator keeps it.

## Look

Big sprites with banded ramps, a bright rim, and a black contour: a coin-op cabinet's cast.

## Palette

Whatever the scene authored, posterised to five steps per channel so a ramp is three or four drawn bands.

## Outline

One cell of black around the cast; the arcade always outlined.

## Lighting

Hard radial highlight upper-left, shadow lower-right, rim light on the edge, then banded.

## Grid and scale

Cell 3; a reference character is about 30 cells tall, the arcade's hundred-pixel sprite. Pivot bottom-centre.

## Animation

Many frames, big anticipation poses, smears on fast attacks.

## Best for

A teen brawler or fighter, a run-and-gun, anything with a move list.

## Avoid

Tiny characters; the banding needs area to read as drawing rather than noise.

## Sample

`npm run render:styles` writes `shots/styles/reference--neogeo.png`. Look for three visible bands on the teddy's belly.
