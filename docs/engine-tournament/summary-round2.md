# Round 2 — measured results (all six arms)

From 87 raw rows. TTI = median of 3 rounds, warm-up discarded,
order alternated per round, ~4 Mbps / 80 ms RTT, served gzip.
Every arm reproduced the golden checksum `f84a3f6e` before any number below counted.

## Cold time-to-interactive — `geo` skin (ms, median)

_The RANKING skin — the only one all six arms support._

| arm | PC | tablet | mobile (4x CPU) | transfer KB |
|---|---|---|---|---|
| kaplay | 885 | 1016 | 1412 | 73 |
| pixi | 1170 | 1312 | 1677 | 137 |
| phaser | 1426 | 1712 | 2208 | 379 |
| excalibur | 1916 | 2221 | 2910 | 129 |
| defold | 2984 | 3248 | 3726 | 1120 |
| godot | 22640 | 23774 | 26336 | 10064 |

## Cold time-to-interactive — `kenney` skin (ms, median)

_PC only, and Defold not at all: its arm would need a second tilesource + a second baked tilemap at a different tile size. Kept purely for the payload-delta comparison._

| arm | PC | tablet | mobile (4x CPU) | transfer KB |
|---|---|---|---|---|
| kaplay | 867 | not measured | not measured | 81 |
| pixi | 1236 | not measured | not measured | 144 |
| phaser | 1433 | not measured | not measured | 394 |
| excalibur | 1908 | not measured | not measured | 143 |
| godot | 22341 | not measured | not measured | 10064 |
| defold | not measured | not measured | not measured | ? |

## What the real third-party assets cost (kenney - geo, PC TTI)

| arm | geo KB | kenney KB | delta KB | geo TTI | kenney TTI |
|---|---|---|---|---|---|
| defold | 1120 | not measured | — | 2984 | — |
| godot | 10064 | 10064 | 0 | 22640 | 22341 |
| kaplay | 73 | 81 | 8 | 885 | 867 |
| excalibur | 129 | 143 | 14 | 1916 | 1908 |
| pixi | 137 | 144 | 7 | 1170 | 1236 |
| phaser | 379 | 394 | 15 | 1426 | 1433 |

Godot shows a delta of 0 because its export packs EVERY resource into
`index.pck` regardless of which skin is requested — it ships both skins either
way. The other arms fetch only the skin in use.

## Stress — the real level plus a 900-sprite swarm

Reported as a DISTRIBUTION. Round 1 proved mean FPS hides everything:
34 fps average can be smooth or a stutter-fest, and only p99/jank tell them apart.

| arm | PC fps | PC p95 | PC p99 | PC jank% | mobile fps | mobile p99 | mobile jank% |
|---|---|---|---|---|---|---|---|
| defold | 60 | 17 | 17.3 | 0 | 39.5 | 33.33 | 0 |
| pixi | 60 | 16.9 | 17.2 | 0 | 58.7 | 21.9 | 0 |
| phaser | 60 | 16.7 | 16.8 | 0 | 56.7 | 33.4 | 0.97 |
| kaplay | 30 | 39.8 | 43.4 | 40.23 | 19.8 | 74.5 | 100 |
| excalibur | 21.4 | 54.6 | 57.2 | 100 | 9.6 | 127.6 | 100 |
| godot | 14.1 | 83.33 | 93.3 | 100 | 14.5 | 83.9 | 100 |

## Spread check (PC TTI, geo, all rounds — is any arm just noisy?)

- defold     2998, 2980, 2984 ms
- godot      22887, 22640, 22424 ms
- kaplay     882, 912, 885 ms
- excalibur  1905, 1944, 1916 ms
- pixi       1196, 1170, 1166 ms
- phaser     1414, 1449, 1426 ms

