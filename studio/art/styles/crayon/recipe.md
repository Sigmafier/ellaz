# Crayon doodle

**Tier**: full · **Family**: paint · **Renderer**: `render.ts` (lined paper, fill jitter 4, stroke jitter 3)

Picked for Toybox Brawl. A child's drawing in wax crayon on lined notebook
paper: the fill never quite reaches the edge, the outline is drawn twice and
does not agree with itself, and everything is a little wobbly.

## Look

The page is off-white with pale blue rules every 24 px. Each shape is
filled twice at 80% opacity with its corners jittered by up to two units,
so the two fills overlap into a darker core and a lighter fringe, like wax
laid down in two passes. Then it is stroked twice at 90% with a crayon 45%
darker than the fill, jittered again, three units wide for the cast and two
for the background. Line joins and caps are round. Rects are traced as
polygons here so their corners can wobble too. Jitter is seeded by
`crayon:<scene id>`, so the wobble is the same on every export.

## Palette

Crayon-box colours: the scene's own fills, which are bright, plus a darker
sibling of each generated automatically for the stroke. The paper is
`#fffdf5` and the rules `rgba(120,160,200,.25)`. A scene's flat background
is drawn as a crayon shape too, so a sky becomes a scribbled blue block
with a darker blue edge, which is right for the style.

## Outline

Two jittered strokes in the darker crayon around every shape, background
included. The doubled line is the signature; a single clean stroke reads as
a marker, not a crayon. Stroke width tells cast from scenery (3 versus 2).

## Lighting

None. A crayon drawing has no light source; depth is drawn by overlap order
and by the darker stroke. Ground shadows in the scene are drawn as their own
grey scribble, which is charming and correct.

## Grid and scale

No grid. The jitter is in absolute scene units, so a shape under six units
across loses its identity; keep every meaningful shape above ten units.
Pivot is the bottom centre of the feet. Because fills are traced with
jitter, exporting the same frame twice with different seeds produces a
"boiling line" effect for free.

## Animation

Boiling line at four to six frames per second: re-render each frame with a
new seed even when nothing moves, so the drawing shimmers like hand-drawn
animation. Movement itself is stepped like the paper style. Idle: two
frames of pure boil. Walk: four frames. Attack: three. Never tween; a
crayon drawing that glides looks like a sticker.

## Best for

Toybox Brawl, where the operator picked it: a fighting game that looks like
it came out of a school notebook is funny in the right way. Also any game
aimed squarely at the youngest players, and the pair for real scanned kid
drawings.

## Avoid

Thin shapes, small text, fine detail, and precise alignment of any kind.
Avoid dark backgrounds: the paper and its rules are part of the look. Do
not reduce the jitter to make it "cleaner"; that is the flat style.

## Sample

`npm run render:styles` writes `shots/styles/reference--crayon.png`,
`shots/styles/brawl-room--crayon.png` and
`shots/styles/ember-field--crayon.png`. Judge on the reference shot.
Look for the doubled outline disagreeing with itself, fills that stop short of the edge, and the notebook rules showing through the pale areas.
