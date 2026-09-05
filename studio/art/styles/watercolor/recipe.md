# Watercolor storybook

**Tier**: card · **Family**: paint · **Renderer**: `render.ts` (three blurred washes, one sharper wash, dark edge, grain)

## Look

Every shape is three translucent washes blurred 3 px and jittered six units, a sharper 50% wash on top, and a darker wet edge; then paper grain. Seeded, so exports are stable.

## Palette

Authored colours at 32% and 50% opacity over warm paper `#fdf8ee`, so everything reads paler and blended.

## Outline

A 35% stroke in a darker shade of each fill, jittered: the pigment edge, not a line.

## Lighting

None; paper shows through the light areas.

## Grid and scale

Vector; jitter is six units, so shapes under ten units blur away. Pivot bottom-centre.

## Animation

Boiling washes at a low frame rate; re-seed each frame.

## Best for

A story or map screen, a calm puzzle game.

## Avoid

Dark scenes and small details; anything needing a crisp edge.

## Sample

`npm run render:styles` writes `shots/styles/reference--watercolor.png`. Look for the washes bleeding past the shape.
