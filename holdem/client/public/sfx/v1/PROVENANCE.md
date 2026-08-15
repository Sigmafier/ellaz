# Where this audio came from

| | |
|---|---|
| **Pack** | Casino Audio (1.1) |
| **Author** | Kenney Vleugels — <https://kenney.nl> |
| **Licence** | **CC0 1.0 Universal** (public domain) — <http://creativecommons.org/publicdomain/zero/1.0/> |
| **Obtained** | <https://opengameart.org/content/54-casino-sound-effects-cards-dice-chips> → `kenney_casino-audio.zip` |
| **Downloaded** | 2026-08-15 |
| **Licence text** | `LICENSE.txt`, beside this file, verbatim from the pack |

Kenney's own words, from that file: *"You may use these assets in personal
and commercial projects. Credit (Kenney or www.kenney.nl) would be nice but is
not mandatory."*

**We credit anyway.** It is in the studio, on the sounds tab, and in the
README. "Not mandatory" is not a reason to leave it out.

## What was changed

`scripts/encode-sfx.mjs`, run once by hand and its output committed:

- **mono**, from 44.1 kHz stereo Ogg Vorbis
- **48 kHz Opus at 48 kbps** — 36 files, 120,538 B total
- **trailing** silence trimmed at −55 dBFS; **the attack is never trimmed**
- **not normalised.** Each file's peak was measured and written as a playback
  gain to `client/src/audio/sampleGain.gen.ts` instead, so the level match is
  a number anyone can retune rather than an irreversible edit to a recording

The 12 dice sounds and 4 pack-opening sounds in the original are **not
shipped** — hold'em has no dice, and they were a third of the pack's bytes.

## If this is ever replaced

Ship it as `sfx/v2/`. Files under `public/` are copied verbatim and are **not
content-hashed**, so a changed file under the same name is served out of a
stale cache indefinitely. The version lives in the path for that reason.
