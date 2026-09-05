# Paper cut-out

**Tier**: full · **Family**: craft · **Renderer**: `render.ts` (card `#fbf3e4`, tilt up to 2 degrees, grain 14)

Picked for both games. Every character is a stack of coloured card pieces
glued down by a child: each piece leans a degree or two, sits a little proud
of the page, and the whole thing has the tooth of real paper.

## Look

The page is cream card stock. Background shapes are pasted flat and square.
Every foreground piece is rotated by a small fixed angle (up to two degrees,
derived from its position so the same piece always leans the same way) and
drawn with a soft shadow three pixels right and five down, blur six, so it
reads as a layer of paper above the page. Finally a seeded grain of plus or
minus seven levels is added to every pixel, which is what stops it looking
like a flat vector with a shadow. The seed is `paper:<scene id>`, so the
same scene exports the same bytes every time.

## Palette

Construction-paper colours: slightly desaturated from the key-art palette
so they read as pigment on card rather than light on a screen. The card
itself is `#fbf3e4`; a scene's own light background (a sky) is drawn over it
as a flat piece, so it should be a shade darker than the card or it
vanishes. Shadows are `rgba(0,0,0,.28)` and never coloured.

## Outline

None drawn. The edge of each piece is the shadow it casts, and the grain
breaks the edge just enough to read as cut rather than computed. Where a
piece must stand out from a same-colour piece behind it (the teddy's muzzle
on its face), rely on the shadow gap; never add a stroke.

## Lighting

Upper-left, expressed by the shadow offset (down-right). Pieces have no
shading of their own. The shadow blur is what tells the eye a piece is
above the page rather than printed on it; keep it soft (six) and keep the
offset larger than the blur so it reads as height, not as a smudge.

## Grid and scale

No grid; vector shapes at any scale. Rotation is applied about each piece's
own centre, so very long thin pieces (a sword) lean visibly while small ones
barely move; that is right, it is how real cut-outs look. Pivot is the
bottom centre of the feet, before tilt.

## Animation

Stop-motion: pieces move in steps, not tweens, and every frame re-derives
its tilt so the lean shifts slightly between frames the way hand-moved paper
does. Six to eight frames per second is the correct feel; twelve looks
mechanical. Idle: the head piece nods one frame in three. Walk: legs swap
two frames, body piece rocks. Attack: the arm piece swings in two steps.

## Best for

Both picked games, and any game that should feel handmade and warm: a
storybook tactics map, a toybox room. Also the natural pair for the
kid-drawings technique, since a photographed drawing is already a cut-out.

## Avoid

Tilting background pieces (a wall that leans reads as an error, not a
style), colouring the shadow, sharpening the grain, and tweened motion.
Avoid very small foreground pieces below eight scene units; the shadow and
tilt swallow them.

## Sample

`npm run render:styles` writes `shots/styles/reference--paper.png`,
`shots/styles/brawl-room--paper.png` and `shots/styles/ember-field--paper.png`.
Judge on the reference shot; the grain is only visible at 1:1.
Look for every cast piece leaning a different way, the shadow reading as height rather than smudge, and the wall behind them staying perfectly square.
