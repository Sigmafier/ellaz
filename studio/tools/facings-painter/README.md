# The knight-facings painter

The Python layer-painter that drew the knight FACING THE VIEWER (`down`) and
FACING AWAY (`up`) for the Ember Hollow Crypt demo of 2026-09-11: idle 2, walk 4,
attack 3 per facing, 18 frames, emitted as a sheet + TexturePacker atlas +
manifest in the studio's export shape (10 px per cell, pivot at the soles).
`out/` holds what it emitted; the crypt demo's `assets/knight-facings/` is a copy
of `out/`.

It is NOT the studio's rig/export pipeline. The side-view knight in
`art/characters/knight/` is drawn on the rig with five clips; these two facings
were painted as a spike outside it, and they carry no `hurt` or `ko` clip, so a
knight drawn from them falls sideways whatever way he faces. The honest next
step is to redraw the facings through the rig (skill `add-a-pixel-character`);
until then this tool is how the existing frames were made and how they change.

It lived only in a session scratchpad on a tmpfs for a day. `reproduce.sh` is why
it is trusted now: on 2026-09-11 all three emitted files came back byte-identical
to `out/`, and the `--control` arm (one palette entry flipped in a scratch copy)
came back DIFF.

## Run it

```bash
# Pillow is not a studio dependency; use any python with PIL (the ComfyUI venv has it)
PY=~/comfy/.venv/bin/python
cd studio/tools/facings-painter
$PY paint.py out --preview preview.png   # re-emit into out/ and refresh the preview strip
bash reproduce.sh                        # emit to scratch and diff: out/ must come back unchanged
bash reproduce.sh --control              # the planted flip must read DIFF
```

## The files

| file | holds |
|---|---|
| `paint.py` | the palette (same letters as `art/characters/knight/pixels48.ts`), `Grid`, the two-pixel `stroke`, the shared `legs`, `front()` and `back()`, and `main()` which lays the 60x60-cell frames on a 6-column sheet |
| `out/knight-facings.{png,atlas.json,manifest.json}` | what it emitted - the committed literals this generator lives beside |
| `preview.png` | the 18 frames at 4x on a light ground, one row per facing |
| `zoom-walk.png` | a close-up of the walk cycle, kept from the spike |
| `reproduce.sh` | the byte-identity gate and its control |

## Known measured gaps (from the handoff of 2026-09-11)

- front/back idle is about 3 cells shorter than the side view
- no `hurt` / `ko` poses
- the manifest's `pivot` is the sole row; frames are untrimmed, so the per-frame
  atlas pivot and the manifest pivot coincide today
