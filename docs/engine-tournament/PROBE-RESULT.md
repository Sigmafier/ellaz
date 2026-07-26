# Probe #3 — RESULT: **PASS**

**Date**: 2026-07-25 · **Gate**: blocking, must clear before any round-2 renderer

## The result

All three languages produced identical checksums **and** identical final state
after 600 ticks of integer fixed-point platformer physics:

```
PROBE js       3d36c300  x=140764 y=42736 vx=-280 vy=-1140 g=0
PROBE gdscript 3d36c300  x=140764 y=42736 vx=-280 vy=-1140 g=0
PROBE lua      3d36c300  x=140764 y=42736 vx=-280 vy=-1140 g=0
```

- **js** — Node 24, `probe/probe.mjs`
- **gdscript** — Godot 4.7.1 headless, `godot --headless --script probe/probe.gd`
- **lua** — the **real Defold wasm runtime** in Chromium, `probe/defold-probe/`

The Lua arm deliberately ran inside Defold rather than a system interpreter. No
system Lua exists here, and more importantly Defold is **Lua 5.1** — no integer
type, no bitwise operators — so a Lua 5.4 stand-in would have tested the wrong
dialect and returned a false pass.

## Does the probe have teeth?

A green cross-language probe proves nothing if its traps never fired. Both
checks pass (`probe/probe-teeth.mjs`):

**1. The traps fired.**

```
floorDiv calls with a NEGATIVE numerator : 100
jump-cuts on a negative vy (trap 1 + 5)  : 100
landings resolved against tiles          :  35
wall hits resolved against tiles         : 141
```

**2. Negative control — the probe discriminates.** Swapping floor division for
truncation-toward-zero (exactly what GDScript's bare `int / int` and a naive Lua
port do) changes the checksum:

```
floor division (correct) : 3d36c300
truncation (the bug)     : 834291d5
```

So the agreement above is a real signal, not three implementations that happened
never to hit the divergent path.

## What this licenses

Round 2 may claim all six arms run *the same game*, verified by a single
checksum, using the §0.1 gate's strong form. The weaker per-tick lockstep
fallback is not needed.

## Carried forward into `core/physics.ts`

| Decision | Why |
|---|---|
| `int32` in 1/256-px units, fixed 60 Hz | floats diverge across runtimes; integers below 2^53 are exact in all three |
| Explicit `floorDiv` everywhere — never bare `/` | GDScript truncates toward zero, JS floors; they disagree on the negatives that every jump produces |
| Arithmetic-only byte extraction (`% 256`, `floor(u/256)`) | Lua 5.1 has no `>>` or `&` |
| `imul32` 16-bit split in Lua, `Math.imul` in JS, `& 0xFFFFFFFF` in GDScript | FNV-1a's multiply overflows differently in each |
| 8-bit `bxor8` on the low byte in Lua | Lua 5.1 has no `~` |

## Cost

~25 minutes, including a full Defold `wasm-web` build. The round-1 GDScript and
Lua ports of FNV-1a and the `imul32` split were reused verbatim, which is most of
why this was cheap.
