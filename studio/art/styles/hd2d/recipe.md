# Pixel sprites in a lit scene

**Tier**: card · **Family**: pixel · **Renderer**: `render.ts` (blurred full-res ground, warm light, vignette, cell-4 cast with bloom)

Backlog row from the 2026-09-05 research pass, marked adjacent to the removed hi-bit style; a card until the operator keeps it explicitly.

## Look

Crisp pixel figures standing in a soft, lit diorama: depth of field behind, a halo around the cast.

## Palette

Whatever the scene authored; the light warms the top-left and cools the bottom-right.

## Outline

One cell of dark around the cast, so it sits on the blur instead of melting into it.

## Lighting

A warm-to-cool gradient, a vignette, and an additive bloom drawn from the cast itself.

## Grid and scale

Cell 4 for the cast; the ground has no grid at all. Pivot bottom-centre.

## Animation

Pixel clips for the cast; the scene's light can drift continuously.

## Best for

A teen RPG or tactics mood where the world should feel bigger than the sprites.

## Avoid

Kids' bright flat scenes; the vignette reads gloomy on them.

## Sample

`npm run render:styles` writes `shots/styles/reference--hd2d.png`. Look for a soft ground and a sharp cast.
