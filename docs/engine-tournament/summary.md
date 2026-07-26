# Engine tournament — measured results

Generated from 60 raw rows. TTI = median of 3 rounds, alternating
order, warm-up discarded. Network throttled to ~4 Mbps / 80 ms RTT.

## Cold time-to-interactive (ms, median)

| cell | PC | tablet | mobile (4x CPU) | transfer KB |
|---|---|---|---|---|
| pixi | 723 | 798 | 963 | 126 |
| phaser | 1089 | 1239 | 1521 | 366 |
| excalibur | 625 | 680 | 892 | 142 |
| defold | 2971 | 3138 | 3770 | 1179 |
| godot | 21759 | 22913 | 24181 | 10045 |

## Stress scene — 800 sprites + 300-particle burst

| cell | PC fps | PC p95 ms | tablet fps | mobile fps | mobile p95 ms |
|---|---|---|---|---|---|
| pixi | 29.5 | 46.31 | 38.2 | 51.2 | 24.66 |
| phaser | 34.8 | 46.06 | 45 | 58.1 | 20.76 |
| excalibur | 10.7 | 179.69 | 5.7 | 4 | 275.97 |
| defold | 60 | 17.28 | 58.2 | 41.9 | 33.33 |
| godot | 11 | 107.37 | 15.1 | 16.1 | 96.98 |

## Spread check (PC TTI, all rounds — is any arm just noisy?)

- pixi       718, 723, 946 ms
- phaser     1089, 1073, 1287 ms
- excalibur  625, 630, 615 ms
- defold     2968, 2971, 3075 ms
- godot      21844, 21463, 21759 ms

