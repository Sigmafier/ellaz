# The roster painter

The Python range-painter that drew the eight roster characters (bunny, crab,
Owl King, ninja, wizard, bat, brawler, golem) and emitted their
`art/characters/<id>/pixels<H>.ts` and `rig<H>.ts`. The repo's source of truth
is the emitted TypeScript; this tool is how those rows were made and how they
are changed. Robot, knight, teddy and slime were drawn by hand as strings and
are not here.

It lived in a session scratchpad on a tmpfs for a day. `reproduce.sh` is why it
is trusted now: it emits into a scratch directory and diffs against the repo,
and on 2026-09-06 all sixteen files came back byte-identical.

## Run it

```bash
# Pillow is not a studio dependency; use any python with PIL (the ComfyUI venv has it)
PY=~/comfy/.venv/bin/python
cd studio/tools/roster-painter
$PY run.py /tmp/preview.png                 # every character, a preview PNG, the claim report
$PY run.py /tmp/preview.png golem bat       # only these
$PY run.py /tmp/preview.png --emit          # write pixels<H>.ts + rig<H>.ts into art/characters/
bash reproduce.sh                           # emit to scratch and diff: the repo must come back unchanged
```

`run.py` prints, per character, the ink rows (must be >= 70% of the role
height), the cells each part claimed, and `UNCLAIMED` - any ink no part owns.
An unclaimed cell is a red in `pixel-cast.test.ts` later, so clear it here.

After `--emit`: `cd studio && npm run build:check`.

## The files

| file | holds |
|---|---|
| `lib.py` | `Grid` (px / rect / ellipse / circle / poly / line / shade / ring), `check()` claim coverage, `preview()`, `emit_pixels()` |
| `kids.py` `teen.py` `adult.py` | one function per character returning `(grid, palette, parts)`; parts are `(id, regions [[r0,r1,c0,c1]], only)` in CLAIM ORDER |
| `rigs.py` | per character: origin, bones, sockets, hitbox, the `editGrid` strings for hurt / ko eyes, the attack effect, draw order, and any clip override (`walk`, `attack`, `ko_end`); `K` is the translation scale per height; `emit_rig()` |
| `run.py` | the roster list, sizes by role, the descriptions written into each `pixels<H>.ts` header |
| `sheet.mjs` `scenes.mjs` | eyeball helpers: clip strips at 1x for a list of ids; the three scenes in a style. `node sheet.mjs out.png bunny,crab` from this directory after `npm run build:runner` |
| `reproduce.sh` | the byte-identity check |

## Drawing rules it assumes

The craft rules in [`../../docs/pixel-characters.md`](../../docs/pixel-characters.md):
native size by role (hero 48 / small enemy 32 / boss 64), clusters not dots,
one light from upper-left, hue-shifted three-tone ramps, the character's OWN
selective outline (`g.ring()` adds it; styles add none), feet on the last row.
Wide- or long-legged bodies shuffle by `dx` in their walk and flat bodies flip
at ko - see `rigs.py` for crab, owl, wizard, golem, bat - because the feet
test holds every standing frame within a pixel of the ground.
