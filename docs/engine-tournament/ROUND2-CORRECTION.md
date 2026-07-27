# Round 2 — correction notice: the Kaplay arm was handicapped

**Raised**: 2026-07-27, while fixing the same defect in round 3.
**Status**: direction CONFIRMED · exact figures PENDING a quiet re-measure.

## What was wrong

A WebGL context probe (`harness/r2-ctx-probe.mjs`) shows the round-2 arms were
not rendering the same amount of work:

| arm | backbuffer | MSAA | pixels | fill vs rivals |
|---|---|---|---|---|
| phaser | 480×256 | 0× | 122,880 | 1.0× |
| pixi | 480×256 | 0× | 122,880 | 1.0× |
| excalibur | 480×256 | 0× | 122,880 | 1.0× |
| **kaplay** | **1440×900** | **4×** | **1,296,000** | **~10.5× the pixels, plus MSAA** |

Kaplay's `letterbox` scales the content to fit but sizes its backbuffer from
`canvas.offsetWidth × pixelDensity`, and the engine hard-sets its canvas to
`width: 100%` — so left to itself it renders at the full window. Every published
round-2 Kaplay frame-rate number was measured against that handicap.

The load axis (TTI, transfer size) is **unaffected** — it does not depend on
backbuffer size. Kaplay's 885 ms / 73 KB stands.

## What the re-measure showed

Kaplay arm fixed (parent box pinned to the logical size, transform-scaled for
display), everything else untouched:

| viewport | before (1440×900) | after (480×256) |
|---|---|---|
| pc | 30.0 fps / 40.2% jank | 46.4 fps / 5.9% jank |
| tablet | 27.6 fps / 79.6% jank | 28.9 fps / 48.7% jank |
| mobile | 19.8 fps / 100% jank | 12.7 fps / 100% jank |

**The round-2 verdict survives.** Kaplay still loses the scroller badly under
matched conditions — 46.4 fps against Phaser's 58.5 and Pixi's 58.1 on desktop,
48.7% janked frames on tablet, and every single frame janked on mobile. The
"no culled tilemap, not for scrolling games" conclusion is correct.

But the **published figures were unfairly harsh**, materially so on desktop:
the real gap is 46 fps / 5.9% jank, not 30 fps / 40% jank.

## Why the corrected figures are not published yet

The rematch ran on a contended box, and it shows: arms that were **not touched**
also dropped.

| arm | viewport | original | rematch |
|---|---|---|---|
| phaser | mobile | 56.7 fps / 1.0% | 30.2 fps / 27.1% |
| phaser | tablet | 60.0 fps / 0% | 46.0 fps / 8.6% |
| pixi | mobile | 58.7 fps / 0% | 45.4 fps / 8.2% |

Unlike round 3's static screen — which proved flat across a load range of
8.4→12.1 — this scrolling stress is strongly load-sensitive. So the rematch is
usable for **ranking within its own run** (pixi ≥ phaser > kaplay ≫ excalibur,
and Kaplay disqualified) but its absolute numbers cannot be spliced into the
round-2 table alongside numbers taken under different conditions.

Rematch rows are kept at `results/raw-round2-rematch-contended.jsonl`, named for
what they are. The canonical 87-row 6-arm dataset is untouched.

## One genuinely new signal, flagged not claimed

Within the rematch, **Pixi beat Phaser on tablet and mobile** (53.1 vs 46.0, and
45.4 vs 30.2) — where the original round 2 had them tied at the 60 fps vsync
ceiling. A ceiling hides ranking; the contended run pushed both below it and
they separated. That is a hypothesis worth testing on a quiet box, not a result.

## What closes this

Re-run `node harness/r2-measure.mjs phaser,pixi,excalibur,kaplay` at load < ~4.
The harness now takes 3 stress samples per cell with alternating order and
stamps every row with the load average, so the next dataset will show its own
spread instead of requiring trust — the same upgrade that made round 3 defensible.
