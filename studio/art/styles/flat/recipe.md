# Flat vector + long shadow

**Tier**: full · **Family**: vector · **Renderer**: `render.ts` (10 shadow steps of 1.5 px)

Picked for both games. Clean geometric shapes, the way the platform's own
key art is drawn, with one trick: every foreground piece casts a long
stepped shadow down and to the right.

## Look

Full-resolution vector fills, anti-aliased edges, no outlines and no
texture. The background is drawn flat first. Then the whole foreground is
stamped ten times in translucent black, each stamp 1.5 px further down and
right than the last, before the foreground is drawn crisp on top. The stamps
overlap into a solid 45-degree shadow about 15 px long, which gives every
character weight and lifts it off the ground without a single gradient. It
is the look of a modern app icon, and it matches `src/ui/gameArt.ts` so a
game in this style agrees with its own poster.

## Palette

The key-art palette: raspberry, tangerine, sunflower, lime, jade, lagoon,
indigo, orchid, clay, over paper `#FFF7EC` and ink `#241C3B`. Colours stay
exactly as authored. The shadow is `rgba(0,0,0,.12)` per stamp; ten stamps
overlapping read as roughly 70% black where they all agree, so a dark ground
should stay lighter than that or the shadow disappears into it.

## Outline

None. Shapes separate by colour and by the shadow each casts on its
neighbour. Where two same-colour foreground shapes touch (the robot's two
legs), leave a gap of two or three scene units so the shadow of one falls on
the other and draws the edge for you.

## Lighting

A single light upper-left, expressed entirely by the shadow direction
(down-right, 45 degrees). No highlights, no shading. If a shape needs to
read rounder, give it a lighter sibling shape offset upper-left, as the
teddy's belly does against its body.

## Grid and scale

No grid. Author on the 1x scene grid at any size; the style is
resolution-independent and the export renders at whatever scale the game
asks for. Corner radii matter here because they are visible: the reference
robot uses radius 3 to 4 on its body and 1 on small parts. Pivot is the
bottom centre of the feet.

## Animation

Tweened, not stepped: because shapes are vector, a rig can move a part by a
fraction of a unit and the shadow follows. Idle breathes by scaling the
torso 2% about its base. Walk swings the legs as rotations of the parts rig.
Attack is a 3-frame anticipation-strike-recover with the arm part
translated. The shadow is recomputed per frame, never baked into a part.

## Best for

Both picked games, and every game whose art must match the platform's
posters. Tactics units on Ember Hollow's board read especially well because
the long shadow separates a unit from its tile. Also the right style for
shop items and icons.

## Avoid

Gradients, textures, outlines, and drop shadows with blur; any of those
turns it into a different style (clay). Avoid pure-white
backgrounds: the shadow is the only depth cue and it needs a ground with
some value to land on.

## Sample

`npm run render:styles` writes `shots/styles/reference--flat.png`,
`shots/styles/brawl-room--flat.png` and `shots/styles/ember-field--flat.png`.
Judge the style on the reference shot.
Look for the shadow reading as solid at 45 degrees with no banding, the cast lifting off the ground, and the two same-colour legs still separating.
