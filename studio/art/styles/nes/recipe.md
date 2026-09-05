# NES 8-bit

**Tier**: card · **Family**: pixel · **Renderer**: `render.ts` (cell 9, outline, `nesSnap`)

## Look

Nine-pixel cells, a dark outline on the cast, and every colour snapped to eight hues, four lightness bands and on/off saturation. Chunkier and flatter than SNES; reads as the console before it.

## Palette

The snap is the palette: 8 hues x 4 bands, greys unsaturated. Author in any colours; the snap decides what survives, so pick fills far apart in hue.

## Outline

One cell (9 px) of `#1a1230` around the foreground, none on the background. At this cell size the outline is a quarter of a small shape, so keep shapes big.

## Lighting

None. Flat fills only; a lighter sibling shape stands in for a highlight where one is needed.

## Grid and scale

Cell 9. A reference character is about 14 cells tall, which is the NES sprite budget exactly: a face is two cells of eyes. Pivot bottom-centre of the feet.

## Animation

Two-frame idle, two- or four-frame walk, single-frame attack and hurt; every move a whole cell.

## Best for

A deliberately retro mini-game, a "classic mode" skin, a title screen.

## Avoid

Skin tones and pastel backgrounds: the snap pushes both to grey or to a garish band. Small props.

## Sample

`npm run render:styles` writes `shots/styles/reference--nes.png`. Look for the four cast members still telling apart after the snap.
