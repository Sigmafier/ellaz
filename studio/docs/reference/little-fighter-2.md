# Little Fighter 2, read as a design document

**Why this file exists.** The operator keeps `LF2_v2.0a.exe` on the desktop and asked
to learn from it: *"we can reverse engineer it safely while respecting limitations to
understand more game engines and styles and gameplay."* This is that study, written
2026-09-05, and it is a study of a DATA MODEL and a STYLE, never of code or assets.

## The limitations, stated first

- **LF2 is copyrighted freeware by Marti Wong and Starsky Wong.** Free to download is
  not free to copy. No sprite, sound, data file or byte of its executable enters this
  repository, ever. `CLAUDE.md`'s original-art law already says so for every game we
  ship; this file says it for the study too.
- **The installer was not run and was not unpacked.** It carries no known archive
  signature (not NSIS, Inno, 7z-SFX, zip, cab or RAR), so the only way to read its
  files is to execute it on Windows, which is the operator's act, not a session's.
  Nothing below came from it.
- **Everything below comes from the GPL-3.0 clean-room reimplementation F.LF**
  (Project F, Li Tin Ho and contributors, `github.com/Project-F/F.LF`), whose own
  standard document says it was *"derived from observations to the original LF2
  without looking into its source code or disassembly."* Reading a clean-room engine's
  documentation is reading documentation. F.LF keeps the original game's converted
  assets in a separate repository (`LF2_19`) precisely so its code stays clean; we do
  not clone that one.
- **`openlf2` (xsoameix) describes itself as built by decompiling the original.** Not
  read, not cited, for that reason.
- The `.dat` obfuscation the modding community reverses is documented in F.LF's
  `tools/data_file_decrypt.js` (skip 123 bytes, subtract a repeating ASCII key). It is
  recorded here as a fact about the format, and there is no reason for this repo to
  ever implement it.

## What LF2 actually is, mechanically

A 2.5D side-view brawler: the world is x-z ground plus y height, characters move in
depth, and every living thing is a **frame graph**. That last part is the lesson.

### Every object is a list of numbered frames

A character's data file is `bmp` (the sprite sheets: `w`, `h`, `row`, `col` per
file, each cell **79x79** in F.LF's converted form, the community's "80x80") followed
by up to a few hundred `frame` records. A frame is one picture plus the rules for
leaving it:

| field | what it does |
|---|---|
| `pic` | which cell of which sheet to draw |
| `state` | the logical state the engine treats this frame as (standing 0, walking 1, running 2, attack 3, jump 4, dash 5, defend 7, injured 11, frozen 13, caught 10, dance-of-pain 16 ...) |
| `wait` | how many ticks this frame holds before `next` |
| `next` | the frame to go to when `wait` expires (999 = back to standing, 0 = stay) |
| `dvx` `dvy` `dvz` | velocity applied on entering the frame; `dvy` negative is up; 550 means "stop dead" |
| `centerx` `centery` | the pivot: where the feet meet the ground inside the cell |
| `hit_a` `hit_j` `hit_d` `hit_Fa` `hit_Ua` `hit_Da` `hit_ja` ... | frame to jump to if attack / jump / defend, or a direction-plus-key combo, is pressed while in this frame |
| `mp` | mana cost to enter, or mana gained |
| `sound` | a sound to play on entry |
| `bdy` | hurtboxes: `x y w h` rectangles that can be hit |
| `itr` | interaction boxes: `kind x y w h zwidth dvx dvy fall arest vrest bdefend injury effect` |
| `opoint` | spawn another object (a projectile, a thrown weapon) at a point, in a frame, with a velocity |
| `cpoint` | the catch point: where a grabbed character is held, and what the holder can do with them |
| `wpoint` | the weapon point: where a held weapon sits, its angle, and whether this frame swings it |
| `bpoint` | where blood comes from when hurt |

The frame numbering is a convention the engine relies on: 0-3 standing, 5-8 walking,
9-11 running, 60-68 punch, 70-73 super punch, 110 defend, 180-191 falling, 220-229
injured, 230-231 lying, and so on. A character who wants a new move adds frames in
the free ranges and wires them with `hit_*` and `next`. **No character has code.**

### `itr.kind` is the whole interaction vocabulary

- `kind 0` a normal hit: an active box that hurts other teams; `injury` damage,
  `fall` how far toward knockdown, `bdefend` how much it breaks a block, `arest`
  the attacker's rest ticks, `vrest` the victim's, `effect` blood / fire / ice.
- `kind 1` and `3` catch: grab a character (kind 1 only one already in state 16, the
  stagger after a heavy hit) and both go to `catchingact` / `caughtact` frames.
- `kind 2` and `7` pick up a weapon (7 without leaving the current frame).
- `kind 6` a passive box: if my punch box overlaps your kind-6 box I go to frame 70
  (super punch) instead of 60 - how "punch a stunned enemy harder" is data, not code.
- `kind 4`, `5` a thrown body or weapon hitting things on its own.

Team, front-or-back, `zwidth` in depth and `vrest` (so one swing does not hit the
same victim every tick) all live on the box.

### Why this is a good model and what it cost them

Good: a designer adds a character with a text file and a bitmap. Every move's timing,
reach, damage, knockback and follow-ups are numbers you can read next to the picture
they belong to. Balance is a diff. It is exactly the model Skullgirls, Rivals of Aether
and every fighting-game workshop converged on independently (see the roster research,
`~/.claude/reports/research-art-styles-pixel-rosters-lf2-2026-09-05.md`).

Cost: the numbers are coordinates inside an 80x80 cell, so moving a character's pivot
by one pixel silently shifts every hitbox; and the magic numbers (`next: 999`,
`dvy: 550`, the frame ranges) are load-bearing convention with no schema. F.LF's docs
list a dozen "unimplemented" and "issue" lines that are all of this kind.

## What our manifest should borrow, and what it should not

Our `export/manifest.schema.json` already has clips with fps, loop, pivot, sockets and
a single hitbox per clip. That is a sprite manifest. LF2 is a **fight** manifest. For
Toybox Brawl (a side-view 2.5D brawler, the operator's own pitch), the gap is:

| LF2 has | we have | borrow? |
|---|---|---|
| per-FRAME `bdy` and `itr` boxes | one hitbox per clip | **yes** - a punch is active on frame 3 of 6, not on the clip |
| `wait` per frame | one fps per clip | **yes** - per-frame duration, fps becomes the default |
| `next` + `hit_*` (the frame graph) | nothing; the game code decides | **yes, as a separate file** - `moves.json` per character: states, transitions on input, cancels. Keep it OUT of the atlas manifest so a non-fighting game never carries it |
| `dvx/dvy/dvz` on frame entry | nothing | yes, in `moves.json` as `impulse` |
| `opoint` / `cpoint` / `wpoint` | `sockets` (named points) | **already ours** - sockets are the general form; LF2's three are sockets with a role |
| `itr.kind` and `effect` | nothing | yes, as `hit.kind` and `hit.effect` on the per-frame box |
| coordinates inside a fixed 80x80 cell | our atlas trims frames and keeps `spriteSourceSize` | **no** - keep ours; boxes are stored in pivot-relative units so a re-trim cannot move them |
| magic frame numbers (999, 550, ranges) | - | **no** - named states and named clips, validated by the manifest gate |

**The concrete next step, when the operator says so**: `studio/export/moves.schema.json`
(a state graph over clip names, per-frame boxes in pivot-relative pixels, input
transitions, impulses) plus a `hitbox` overlay in the gallery's Sprites player that
draws `bdy` in one colour and `itr` in another over the playing clip - the thing every
LF2 data changer shows and the reason its modding scene is thirty years old. It is
not built; it is proposed.

## What we built from it (2026-09-06)

`export/moves.schema.json` and `export/moves.ts`: a state graph over the manifest's
clip names, per-frame `bdy` / `itr` / `push` boxes in frame pixels, `on` transitions
from a closed input vocabulary, `impulse` on frame entry, `onHit.light` / `onHit.heavy`
for the stagger and the knockdown, `fall` accumulating toward the latter. Where LF2 has
`next: 999` we have a named state; where it has frame ranges we have clip names the
manifest gate already holds; where it has `hit_a` we have `on.attack`. Boxes are
authored in the rig's body units from the pivot (`gridBox`, naming grid cells of the
drawing) and converted to frame pixels at export exactly as the manifest's hitbox is,
so a re-trim cannot move them. The robot and the teddy carry moves
(`art/characters/<id>/moves.ts`); `scripts/assert-moves.mjs` reads every exported
`moves.json` beside its manifest and refuses a state naming a missing clip, a frame
count that disagrees, a box off the frame, a transition or input outside the closed
sets, and a hit that does no damage - fourteen planted controls. `opoint`, `cpoint`
and `wpoint` are not ported: sockets already are the general form, and nothing here
throws or grabs yet.

## The style, as a style

LF2's look is worth a backlog row of its own: **hand-drawn arcade sprites at roughly
80px**, black outlines, 3-4 tone shading, a bright saturated cast on muted painted
backgrounds, big readable attack poses. It is the `neogeo` row of the styles ledger
one notch smaller and softer, and it is squarely a teen style, which is the audience
the operator just asked to widen to. If it is picked, it gets its own row and its own
renderer; it must not be a trace of theirs.

## Sources

- F.LF, GPL-3.0: `https://github.com/Project-F/F.LF` - `docs/TheLF2standard.html`,
  `docs/character.html`, `docs/sprite.html`, `LF/character.js`, `tools/data_file_decrypt.js`
- Project F's stated method: "derived from observations ... without looking into its
  source code or disassembly" (`docs/TheLF2standard.html` § Overview)
- Little Fighter 2 on Wikipedia for the authorship and freeware status
- The research report named above for the roster and hitbox conventions of other
  fighting games, cited there
