# 80px brawler

**Tier**: card · **Family**: pixel · **Renderer**: `render.ts` (cell 3, outline, four tones, muted painted backdrop)

Backlog row added 2026-09-05 when the operator ruled that Little Fighter 2 is for its style too. Our own drawing of that look; never a trace of theirs.

## Look

A bright, outlined, four-tone cast on a dimmer painted street: the side-scrolling brawler's stage.

## Palette

The cast keeps its authored colours in four steps per channel; the backdrop is desaturated to half.

## Outline

One cell of black around the cast, always; it is what separates fighter from stage.

## Lighting

A hard highlight and shadow on the cast, banded to four; the backdrop is flat and soft.

## Grid and scale

Cell 3; a reference character is about 30 cells tall, the eighty-pixel sprite. Pivot bottom-centre.

## Animation

Big anticipation, three-frame attacks, a held impact frame; per-frame boxes come from the moves file.

## Best for

Toybox Brawl and any side-view fighter for teens.

## Avoid

Pastel casts; four tones need saturation to read as a ramp.

## Sample

`npm run render:styles` writes `shots/styles/reference--brawler80.png`. Look for the cast popping off a greyer ground.
