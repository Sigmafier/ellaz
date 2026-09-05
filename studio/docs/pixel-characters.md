# Pixel characters: the recipe

How every character in this studio is drawn since 2026-09-05, when the
operator saw the knight on the rig and ruled: *"the knight is amazing... save it
and its recipe to our studio and playbook for games."* Thirteen pixel styles had
been rendered over four characters made of ten rectangles each, and all thirteen
were bad, because a filter cannot add anatomy, a light source or a silhouette.
The source is the ceiling. This is the source.

## The rule in one line

**One drawing per character, at its role's size, by hand, with the craft rules;
cut along the standard bones; posed by the standard clips; every frame snapped
back to the grid.** One grid gives five clips. The code is
`art/techniques/pixel-parts.ts`; the first four are in `art/characters/*/pixels*.ts`
with a `rig*.ts` beside each.

## Sizes by role (the operator's, 2026-09-05)

| role | height | why |
|---|---|---|
| hero | 48 px | enough for a face, a weapon and a readable silhouette |
| small enemy | 32 px | a third of the work, reads at a glance as "not the hero" |
| boss | 64 px | twice the hero, so the fight has a scale |

A raised weapon may climb up to 4 rows above the body (the knight's blade). The
test `pixel-cast.test.ts` holds both numbers.

## The craft rules (what makes it art, not a filter)

1. **Silhouette first.** Fill the figure black and look: if it does not read as
   a knight, no colour will save it. The shield left, the blade right, the plume
   up are the knight's silhouette.
2. **Clusters, not dots.** Every colour area is a shape of several pixels;
   a lone pixel of a colour is noise. The eye is 1x1 only because it is an eye.
3. **One light, upper-left.** Light faces get the light ramp step, the right and
   underside the shadow step. Every material: plate `P p q Q`, cape `C c x`.
4. **Hue-shifted ramps.** A shadow is not the fill darkened; it moves toward
   cool (blue-purple), a highlight toward warm (yellow-white). `pixels48.test`
   asserts every ramp changes hue by more than 2 degrees.
5. **Its own selective outline.** A one-pixel ring of the outline ink, inside
   the sprite's own cells; inner lines only where two materials meet (visor,
   belt, greave). Never pure black: `#1a1230`. **The style adds no second ring**
   - every snapped cell carries `own: true` and the pixel passes ring only what
   does not (operator ruling, 2026-09-05).
6. **Controlled diagonals.** Curves step 1-1-2-2 or 1-2-1-2, never a random
   staircase; a staircase that changes rhythm is a jaggy.
7. **Feet on the last row, pivot at the boots' centre.** The origin column is the
   middle of the feet; the exporter aligns the frame to the pixel grid from it.

## The palette

Around 24 entries for a hero, fewer for an enemy, each a single character in
the grid. The outline ink is shared across the cast. Two characters must never
map to one hex - the lossless test reads the drawing back by colour.

## Cutting it along the bones

The standard bones are `root, torso, head, armL, armR, legL, legR`, the same
names every clip poses. In the spec, each bone is a grid cell (its pivot: the
neck for the head, the shoulder for an arm, the hip for a leg) and each part is
a list of grid rectangles. **Parts claim cells in the order listed** - a cell
goes to the first part whose region holds it - so regions may overlap and a
later part takes what is left. `only: "DEO"` limits a region to some
characters, which is how the teddy's feet come out of the body's bottom rows.

The one test that matters: **the rest pose, snapped, re-composes the drawing
cell for cell.** If it fails, a pivot is off by one or a cell has no part.

## Posing and snapping

The standard clips (`characters/clips.ts`) are keyed for a ~70-unit body.
`scaleClipTranslations(clips, k, unit)` scales the translations, rounds each to
a whole pixel, and drops the head's own nod - at pixel scale a head that moves
one pixel more than its neck floats off the body.

Rotation turns a row of pixels into a polygon. `snapOps` re-rasterises every
baked frame at cell centres: a cell takes the topmost shape's fill, so a limb
turned 25 degrees is crisp cells in the source palette and never a blended
edge. A miss re-samples a quarter cell off, so a squashed body's rows never open
a hairline. Nothing outside the palette can appear; the test asserts it.

## What each character taught (worked examples)

- **Knight (48).** The first. Cape behind, shield on the left arm, blade on the
  right, plume above; hurt and ko are the visor rows re-written. The attack
  slash is a thin crescent in blade-edge white with its own rim - a translucent
  polygon turned grey at cell size.
- **Robot (48).** A hanging arm needs inner outline rows between shoulder, arm
  and fist or it reads as one slab. The antenna and bulb are head cells so they
  turn with it.
- **Teddy (32).** Shading as a hard wedge across the face hid the brows; a rim
  on the right and the underside reads as fur. Feet get their own colours so
  the legs can claim them.
- **Slime (32).** One body part on a bottom-pivoted torso bone, squashed with
  `sx`/`sy`; it hops in its walk (`hops: true`), and its drips are cells that
  the body did not keep - if a drip's inner cells stay with the body and the
  drip bone slides, it tears away, so the collapse squashes and does not slide.

## Adding a character in an hour

1. Pick the role, so the height. Paint the grid (a range painter in a scratch
   script is fine; the repo keeps the literal rows) and eyeball it at 6x.
2. Write `rig<H>.ts` from the knight's: origin, six bone cells, parts in claim
   order, sockets, hitbox, swaps for hurt/ko, `scaleClipTranslations(..., U)`.
3. Register it in `art/characters/index.ts` with `pixel: 5`.
4. `npx vitest run art/characters` - the lossless recompose names the cell
   that is wrong.
5. Render the clip strips at scale 1 and look at every frame before the hall.

## Why UNIT is 5

The rig is authored at `UNIT` body units per pixel, and `UNIT` equals the snes16
style's `CELL`, so one authored pixel is one style cell at export scale 1 and a
whole number of cells at any other scale. `frameGeometry` aligns a pixel
character's frame to that grid; unaligned, every pixel straddles two cells and
doubles.
