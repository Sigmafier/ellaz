---
name: add-a-pixel-character
description: Draw a new studio character as hand-placed pixel parts on the rig - paint the grid with tools/roster-painter, claim it into parts, emit pixels<H>.ts + rig<H>.ts, register it, pass the character tests and the nine gates, and put it in the hall. Use when a game needs a new fighter, enemy or boss in the studio roster, or when an existing roster character must be redrawn.
---

# Add a pixel character to the studio roster

The recipe in one line, from `studio/docs/pixel-characters.md`: **draw it by hand at
its role's size, cut it along the standard bones, pose it with the standard clips, snap
every frame back to the grid.** This skill is the order of operations with the traps
in place. Run the `studio-workspace` skill first.

## When this fires

1. A game binding (`studio/art/games/<id>.json`) needs a cast member the roster lacks.
2. The operator asks for a character redrawn, or a hall note names one as "fix".
3. A new audience band or archetype slot in `art-bible.md` § The roster is empty.

## The order, and what each step proves

1. **Decide band, role, size.** `Band` kids | teen | adult decides proportions and what a
   face may do; `Role` hero 48 / enemy 32 / boss 64 decides the grid height. These are
   the operator's laws; do not pick 40.
2. **Paint it in `studio/tools/roster-painter/`** - a function in `kids.py`, `teen.py`
   or `adult.py` returning `(grid, palette, parts)`. Use the range painter (`ellipse`,
   `poly`, `shade` wedges), not single `px` calls: clusters, one light from upper-left,
   hue-shifted three-tone ramps, then `g.ring()` for the character's OWN outline. Feet on
   the last row; ink rows >= 70% of the height.
3. **Claim every ink cell into a part**, in claim order, with `only` where two parts
   share a region. `run.py` prints `UNCLAIMED` - it must be empty, or the rig test reds
   later with a less helpful message.
4. **Rig it in `rigs.py`**: origin (feet, centre column), bones, sockets (`hand`, `head`),
   hitbox, the hurt / ko eye edits as `editGrid` strings, an attack effect, draw order.
   Wide or long legs -> a `walk` override that shuffles by `dx`; a flat body -> `ko_end`
   that flips (`rot: Math.PI`); a tall boss -> `ko_end` that tips (`rot: -Math.PI / 2`).
5. **Emit**: `run.py preview.png <id> --emit`, then LOOK at the preview. Add the entry to
   `run.py`'s `ALL`, `SIZE` and `DESC` first.
6. **Register**: `art/characters/index.ts` - `pixelCharacter(id, name, role, band, ...)`
   in `PIXEL_CAST`, in gallery order. `characters.test.ts` pins the count per band; raise
   it in the same change.
7. **Prove it**: `cd studio && npx vitest run art/characters` - the parts re-compose the
   grid cell for cell, every standing frame keeps its feet within a pixel of the ground,
   the ko frame ends wider than tall, and no rest silhouette overlaps another above IoU
   0.85 (the ratchet prints the closest pair). Then `npm run build:check` - 48+ export
   sets and the nine gates.
8. **Reproduce**: `bash tools/roster-painter/reproduce.sh` must say `0 differ`. If you
   hand-edited an emitted file, teach the painter instead.
9. **Eyeball**: `node tools/roster-painter/sheet.mjs out.png <id>` for the five clip
   strips at 1x, then a hall batch (`show-visual.sh --ask "keep / fix / redraw?"`) and
   the taste row when the operator answers. Put it in a scene (`art/scenes/cast.ts`)
   and a game binding if it is for a game.
10. **If it fights**: `art/characters/<id>/moves.ts` (robot and teddy are the models),
    add it to `pixelCharacter(...)`'s last argument; `assert-moves` gates it.

## Failed attempts (do not repeat)

| tried | what happened | do instead |
|---|---|---|
| a pixel style as a filter over a geometric rig | thirteen styles, all "pretty bad"; a filter cannot add anatomy | draw the pixels; the style renders them cell for cell |
| an AI base (FLUX) cleaned to the palette at 48 px | dots, no clusters; muddy | hand-placed parts; FLUX only as a reference sketch |
| a hip-swing walk on wide or long legs (crab, owl, wizard, golem) | feet dipped 2-4 px under the ground; the feet test reds | shuffle by `dx` in the walk override |
| a tumbling ko on a flat body (crab, bat) | last frame taller than wide; the ko test reds | `ko_end` flips it onto its back |
| a star colour not in the palette (`"Y"` on the bunny) | tsc error in the emitted rig | pick from the character's own palette |
| judging the drawing from the emitted `.ts` | the eye cannot read 48 rows of letters | the preview PNG and the clip strips, every time |
| a `str.replace` patch on the emitted file | silently no-op when the anchor drifted | edit the painter, re-emit, `reproduce.sh` |

## Related

- `studio/docs/pixel-characters.md` - the craft rules and the twelve worked examples
- `studio/docs/art-bible.md` § The roster - the band x role matrix
- `studio/tools/roster-painter/README.md` - the painter
- `.claude/rules/a-generator-of-committed-literals-lives-beside-them.md` - why the painter is in the repo
