# Probe #3 — is integer fixed-point physics bit-identical across languages?

**Blocking gate.** Round 2 claims all six arms run *the same game*. That claim
rests entirely on every language producing byte-identical simulation state. This
probe tests it on a deliberately trap-laden subset **before** any renderer exists.

## Why floats were rejected

Round 1's snake was integer-tick based, so determinism was free. A platformer is
not: gravity, velocity and sub-pixel position are classically floats, and float
accumulation diverges across JS / GDScript / Lua for reasons that are invisible
until tick 400. So positions and velocities are **`int32` in 1/256-px units**.
Integers below 2^53 are exact in all three languages (all use IEEE754 doubles
under the hood; GDScript has true int64).

## The traps this probe deliberately exercises

| # | Trap | Why it bites |
|---|---|---|
| 1 | **Division rounding** | JS `Math.floor(a/b)` floors. GDScript `int/int` **truncates toward zero**. For negative operands these disagree — and vertical velocity is negative while rising. Every arm must use an explicit `floorDiv`. |
| 2 | **32-bit hash overflow** | FNV-1a multiplies by 16777619. JS needs `Math.imul`; GDScript needs an explicit `& 0xFFFFFFFF`; Lua 5.1 has no integer type and no bitops, so it needs the 16-bit-split `imul32` from round 1. |
| 3 | **Byte extraction** | `>>`/`&` do not exist in Lua 5.1. All byte splitting is arithmetic-only (`% 256`, `floor(u/256)`) so one algorithm serves all three. |
| 4 | **Negative modulo** | Sign of `%` differs by language. Avoided: every `%` operand here is non-negative by construction. |
| 5 | **Jump-cut division on a negative** | `vy = floorDiv(vy, 2)` while `vy < 0` — trap #1 fired on purpose, every jump. |

## The simulation

Fixed 60 Hz. 1 px = 256 units (`FP`). 16 px tiles = 4096 units.

```
GRAVITY 40      MAX_FALL 1024    ACCEL 24     FRICTION 18
MAX_RUN 640     JUMP_V -1180     JUMP_CUT_DIV 2
COYOTE 6 ticks  BUFFER 6 ticks   PLAYER 12x16 px
```

Step order (identical in all three ports):
1. read input from the tape
2. horizontal accel / friction, clamp to `MAX_RUN`
3. gravity, clamp to `MAX_FALL`
4. jump buffer + coyote bookkeeping, fire jump
5. jump cut (`floorDiv(vy, 2)` if released while rising) — **trap 1 + 5**
6. move X, resolve AABB against solid tiles
7. move Y, resolve AABB, set `onGround`
8. fold `x, y, vx, vy, onGround` into the FNV-1a checksum

**Input tape** is formula-derived (`t % 200`, `t % 23`) rather than recorded, so
the probe needs no shared PRNG and no data file — it is reproducible from the
source alone.

Out-of-grid is treated as solid, so the player can never escape the world and the
run stays bounded.

## Pass condition

All ports print the same checksum and the same final state after 600 ticks.
Divergence at any tick is a **blocking failure**: round 2 would then fall back to
per-tick lockstep comparison and the fidelity claim would be stated as weaker.
