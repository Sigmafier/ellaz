# The Ellaz studio art bible

The studio-wide layer. Everything a style has to agree with, whatever it looks
like. Each style then carries its own recipe beside its renderer
(`art/styles/<id>/recipe.md`) with the same nine headings every time, so two
recipes can be read side by side and the gap between them is the style.

This file is short on purpose. If a rule needs a paragraph of argument it is
either a recipe (it belongs to one style) or a trap (it belongs in
`.claude/rules/`, with its measurement).

## North star

Fun and colourful, easy to read, never chaotic. A five-year-old on a phone must
be able to tell what every character is and which way it faces, at the size the
game draws it, in one glance. That is the operator's brief for the whole
platform and every style here serves it; a style that reads well at 480x300 on
a monitor and turns to soup at 64px on a phone is not finished.

Anti-references, from the taste ledger: a dark navy ground with a purple aurora
behind everything · emoji standing in for art · the Flat UI "Dutch" palette ·
one uniform rounded card for every element regardless of its job.

## Readability and silhouette

- The silhouette carries the character. Fill every shape black and it must
  still be the robot, the knight, the teddy, the slime.
- One foreground flag, one rule: `fg: true` gets the style's edge treatment
  (outline, extrusion, drop shadow, tilt); `fg: false` never does. A wall
  never leans and a floor never grows a black edge.
- Contrast is measured, never eyeballed: the cast against its ground, in the
  rendered artifact, at the size it will be drawn.

## Palette roles

Every game palette assigns these roles before it assigns colours. A style may
snap or shade them; it may not confuse them.

| role | means | in the reference cast |
|---|---|---|
| player | the thing you control | robot red `#d8342e`, knight plate `#c0c8d8` |
| enemy | the thing that hurts you | teddy fur `#8a5a2b`, slime green `#5fcf3a` |
| interactable | tap this | chest light `#2b5cff`, shield boss `#ffd23f` |
| warning | this will cost you | campfire orange `#ff7a1a` |
| disabled | not now, and it says so gently | never a greyed-out button (`CLAUDE.md` § What a child touches) |

The studio's canonical palette is `art/palettes/ellaz.json`, seeded from the
key-art palette so sprites and the game's poster agree.

## Proportions, in heads

| body plan | heads tall | used by |
|---|---|---|
| chibi | 2.5 | shop items, tiny icons |
| kid | 3 | the reference cast at rest |
| hero | 4 | a game's lead when the camera is close |
| brawler | 5 | Toybox Brawl's fighters, so reach reads |

Height is in heads because it survives every style: a paper cut-out knight and
a Game Boy knight are the same knight.

## Lighting

Key light upper-left, always. Highlights sit at 35% across and 30% down a
shape's box; the shadow gathers lower-right. Drop shadows fall down and right.
A style that has no shading (SNES, flat) still obeys this when it places a
highlight pixel or a long shadow.

## Grid and pixel scale

- Scenes are authored at 1x in scene units; a style chooses its cell. The
  pixel styles are 3 (hi-bit), 5 (SNES, CRT), 7 (Game Boy), 9 (NES) scene
  units per cell; voxel is 8 and mosaic 12.
- A sprite's pivot is the bottom centre of its feet. Every clip of a character
  keeps the same pivot, so swapping clips never makes the character hop.
- Sockets (where a held thing attaches: hand, head) are named, not numbered.

## Animation

- Clip names are fixed: `idle`, `walk`, `attack`, `hurt`, `ko`. A game may
  add more; it may not rename these.
- Frame names follow `<character>_<clip>_<nnnn>`, four digits, from 0000.
- Idle breathes: two to four frames, the chest and head move, the feet do not.
- Walk is a loop of an even number of frames; attack and hurt do not loop; ko
  holds its last frame.
- Anticipation before an attack, follow-through after. Squash on landing.
  The feet touch the ground line on every frame that is not a jump.

## Type

Interface type is the platform's, not the style's: a crayon game still uses
the app's font for its buttons. Styles may letter their own title art.

## Export

One source per asset. The source renders to frames; frames pack into a
TexturePacker-style JSON-hash atlas beside a PNG sheet; a manifest names the
clips with their fps, loop flag, pivot, sockets and hitbox; palettes export to
`.gpl` and `.hex`. Engines get an adapter each and never read the source.
Detail: `export/` and `adapters/`.

## Approved and rejected

Kept in the taste ledger (`taste.py show ellaz`), not here, because a list in a
document decays and the ledger decays on purpose. Picks so far: SNES 16-bit,
paper cut-out and flat vector for both games; crayon doodle for Toybox Brawl.
Game Boy was picked and unpicked.

## Exceptions

None yet. An exception is recorded here with the game, the rule it bends, and
why the game is better for it.

## Changelog

- 2026-09-05 - written, alongside the port of the 13 prototype renderers.
