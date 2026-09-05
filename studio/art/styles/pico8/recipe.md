# Fantasy-console 16 colours

**Tier**: card · **Family**: pixel · **Renderer**: `render.ts` (cell 4, outline, dither 0.35 to the fixed sixteen)

Backlog row from the 2026-09-05 research pass; a card until the operator keeps it.

## Look

Bold clusters in sixteen colours nobody may add to. Reads like a tiny cartridge.

## Palette

The sixteen of `palettes/pico8.json`, snapped, with a light checkerboard between neighbours.

## Outline

One cell of the near-black around the cast.

## Lighting

None painted; the palette's own ramps (peach, orange, brown) stand in.

## Grid and scale

Cell 4; a reference character is about 22 cells tall. Pivot bottom-centre.

## Animation

Whole-cell moves, two-frame idles, big pose changes over anatomy.

## Best for

Jam-sized games, a retro mini-game, anything meant to feel small and sharp.

## Avoid

Subtle gradients and skin tones; the sixteen cannot hold them.

## Sample

`npm run render:styles` writes `shots/styles/reference--pico8.png`. Look for the cast in clean sixteen-colour clusters.
