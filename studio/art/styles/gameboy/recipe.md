# Game Boy

**Tier**: card · **Family**: pixel · **Renderer**: `render.ts` (cell 7, outline, fg-aware four shades)

Picked and then unpicked for the brawler; kept as a card because a monochrome
mode is a cheap unlockable skin.

## Look

Seven-pixel cells in the four DMG greens. The cast takes the two dark shades and the background the two light ones, so a character never dissolves into a wall; without that split it did.

## Palette

`#0f380f`, `#306230`, `#8bac0f`, `#9bbc0f`. Nothing else, ever. Authored colours only decide which of the two shades a pixel gets, by luminance.

## Outline

One cell of the darkest green around the cast. It is the only reliable edge in a two-shade character.

## Lighting

None possible. Contrast is the whole vocabulary.

## Grid and scale

Cell 7; a reference character is about 18 cells tall. Pivot bottom-centre.

## Animation

Two-frame idle and walk; keep moves whole-cell.

## Best for

An unlockable monochrome skin, a handheld-flavoured mini-game.

## Avoid

Any scene whose cast and background have similar luminance: the split saves contrast, not identity.

## Sample

`npm run render:styles` writes `shots/styles/reference--gameboy.png`. Look for the cast reading dark on a light ground.
