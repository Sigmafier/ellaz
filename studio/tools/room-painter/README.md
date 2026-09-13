# The crypt room painter

The painter that drew the Ember Hollow Crypt's room for the dungeon sketch of
2026-09-11 (`dungeon-room.js`, a hall copy), ported from a browser canvas onto
integer arrays so the room is a COMMITTED, REPRODUCIBLE sprite set and not a
picture painted once. It emits `games/hollow/assets/crypt-room/` - one sheet
holding the room (floor slabs, the two walls, the archway, the banner, the
vines, the rune ring) as one frame and the four props (pillar, crate, crates,
crystal) as one frame each, plus the TexturePacker atlas and the manifest the
engine's cells read.

`reproduce.sh` is why the committed copy is trusted: on 2026-09-13 all three
emitted files came back byte-identical to the committed set, and the
`--control` arm (one grout colour flipped in a scratch copy of `paint.mjs`)
came back `DIFF crypt-room.png` and nothing else.

## Run it

```bash
cd studio
node tools/room-painter/paint.mjs games/hollow/assets/crypt-room --preview tools/room-painter/preview.png
bash tools/room-painter/reproduce.sh             # emit to scratch and diff: 3 files, 0 differ
bash tools/room-painter/reproduce.sh --control   # the planted colour flip must read DIFF
```

No dependency: `png.mjs` is a sixty-line encoder on node's own `zlib`.

## The files

| file | holds |
|---|---|
| `paint.mjs` | the palette, `hash`, `paintRoom` (one colour per art cell), the prop painters (`boxPass` + `finish`), the sheet composer, the atlas and manifest writers, `preview` |
| `png.mjs` | `encodePng(width, height, rgba)`: paletted with `tRNS` when 256 colours or fewer (this sheet is), RGBA otherwise; filter 0, deflate level 9 |
| `reproduce.sh` | the byte-identity gate and its control |
| `preview.png` | the room at 2 px per cell with the props on their tiles - what the cells show, for the eyeball |

## What the sheet is, measured 2026-09-13

| | |
|---|---|
| art resolution | 1 art cell = 2 view px, the same cell the sprites use |
| sheet | 3200 x 3180 px, 10 px per cell, so the cells draw it at their `DRAW_SCALE` of 1/5 like every export set |
| `crypt-room.png` | **77,766 bytes**, paletted (the plan of 2026-09-13 guessed at an RGBA sheet near a megabyte; the palette is under 256 colours and every cell is a 10 px run) |
| the room frame | 3200 x 2220 px (320 x 222 cells); the view is 640 x 444 |
| each prop frame | 480 x 960 px (48 x 96 cells) with the prop's foot at cell (24, 88) |
| the manifest pivot | (240, 880) px, shared by the four props - both cells take ONE pivot per set |
| clips | `room`, `pillar`, `crate`, `crates`, `crystal`, one frame each, `fps 1`, `loop false` |

The room frame is drawn by its TOP-LEFT at (0, 0) of the view; its atlas pivot
is (0, 0) and the manifest pivot does not apply to it. The props are drawn by
their foot at the tile centre through the ordinary sprite path.

## What is not here from the sketch

The torch flames, the pooled glows and the vignette were drawn per frame in the
sketch with additive blending; the cells have no op for a glow, so they are out
of the MVP (the torches' brackets are not painted either - the sketch drew those
with the flames). The gem sprites are out too: the room drops coins, which the
engine already draws.

## Known gaps

- `Math.sin`, `Math.hypot` and `Math.atan2` shape the vines, the ring and the
  archway; V8's results are stable on this machine and `reproduce.sh` proves
  the bytes, but a different JS engine could round a cell differently.
- The prop frames are untrimmed; the atlas's `trimmed` is `false` throughout.
