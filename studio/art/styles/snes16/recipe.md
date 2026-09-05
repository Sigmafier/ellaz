# SNES 16-bit

**Tier**: full · **Family**: pixel · **Renderer**: `render.ts` (`pixelate`, cell 5, outline on)

The style the operator picked for both Toybox Brawl and Ember Hollow. A
Super Nintendo sprite: chunky but not crude, every character wearing a dark
edge, colours flat and saturated.

## Look

Everything is rendered at one fifth resolution and scaled back up with
nearest-neighbour, so every visible pixel is a crisp 5x5 block. The cast
gets a one-cell outline in near-black ink; the room, the floor and the sky do
not, which is what keeps the characters popping off the background the way a
sprite sits on a tile map. No gradients, no shading: a shape is one colour,
and depth comes from the outline and from adjacent shapes being different
colours. The result reads instantly at 480x300 and still reads at 96 px on a
phone, which is the whole reason it won.

## Palette

Flat, saturated, with a dark and a light of each hue for detail (the robot's
shell `#d8342e` against its `#8f1c18` legs). No palette snapping: the scene's
own colours survive, so a game palette authored in `art/palettes/` renders
exactly. The outline ink is `#1a1230`, a purple-black rather than pure black,
so it sits inside the colours instead of cutting them. Keep a light ground
behind a dark character and a dark ground behind a light one; the outline
covers the rest.

## Outline

One cell (5 px) of `#1a1230` around every foreground shape, drawn by
shifting the foreground layer one cell in four directions and tinting the
union. Interior edges between two foreground shapes get no outline, which is
intentional: a robot's visor sits inside its head, not beside it. Background
shapes get none. If a prop must read as separate from the cast, give it a
different fill, not an outline.

## Lighting

None baked. Key light is implied by the palette: a shape's lighter sibling
sits upper-left of its darker one when the character is built (the visor
above the chest, the shell above the legs). Drop shadows on the ground are
part of the scene as flat `rgba(0,0,0,.28)` ellipses, and they pixelate with
everything else. Never add a gradient to this style; that is the hi-bit
style's job.

## Grid and scale

Cell 5 scene units. A character authored at scale 1.9 in the reference
scenes is about 125 px tall, so roughly 25 cells: enough for a face, too few
for fingers. Author sprites for this style on a 24 to 32 cell grid per
character. Pivot is the bottom centre of the feet, on a cell boundary, so a
walk never sub-pixel shimmers.

## Animation

Frames are whole-cell moves. Idle: two frames, the head and chest one cell
up on the second. Walk: four frames, legs alternating one cell forward, body
bobbing one cell. Attack: anticipation one frame back, strike one frame with
the arm extended two cells, recover. Hurt: one frame shifted one cell back
with the visor swapped to the darker fill. KO: the last frame lies on the
ground line. Keep every frame on the cell grid or the outline will crawl.

## Best for

Both picked games. Fighters with clear silhouettes and a busy background
(Toybox Brawl), tactics boards where twelve units must be told apart at a
glance (Ember Hollow). Anything that needs to look like a game a child's
parent remembers.

## Avoid

Fine detail below one cell, text inside the art, thin diagonal lines (they
stair-step), and pale backgrounds behind pale characters with no outline to
save them. Do not mix in the shaded pass; if a shape needs form, use the
hi-bit style instead.

## Sample

`npm run render:styles` writes `shots/styles/reference--snes16.png` (the
four-character reference), `shots/styles/brawl-room--snes16.png` and
`shots/styles/ember-field--snes16.png`. The reference shot is the one to
judge the style by; the two scenes show it in its games.
