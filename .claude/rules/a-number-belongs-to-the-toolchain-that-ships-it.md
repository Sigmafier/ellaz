---
paths: "**/scripts/**,.github/workflows/**,vite.config.ts"
---

# A Number Measured on a Toolchain That Never Builds the Artifact Is Not That Artifact's Number

**Scope**: Every measured figure in this repo that a gate compares against - the payload ceiling, the per-game slope, the content floor, any byte count written into prose.
**Origin**: 2026-08-21. CI builds on Node 22 and this machine runs Node 24. Same commit, no dependency drift: **90,359 vs 90,413 B gz**, a 54 B difference against 141 B of headroom.

## Core Rule

**A measurement belongs to the toolchain that produced it. The number a gate
enforces has to come from the toolchain that SHIPS - and when the two differ, a
local reading is a different measurement of a different artifact, not a slightly
noisy reading of the same one.**

Nothing about this is visible from either side. The local build is correct, the
CI build is correct, the gate passes on both, and the two disagree by more than
a third of the remaining budget.

## Why it hid for so long

The ceiling has been raised three times and argued each time from a figure
measured on this machine. Every one of those arguments was made carefully, and
every one of them was about a build the deploy has never produced. It surfaced
only because the headroom got small enough for 54 B to matter - which means the
error was there for months, growing no louder, while the number it corrupted got
more load-bearing rather than less.

**Version drift is not the only axis.** The same shape is a different minifier
version, a different `NODE_OPTIONS`, a lockfile the CI resolved differently, or
a machine whose `gzip` defaults differ. Ask what the SHIPPING toolchain is, not
whether yours looks reasonable.

## What to do

- **`assert-payload.mjs` prints a NOTE naming the Node it is running on** and
  says what to do about it. It is a note rather than a refusal on purpose: a
  gate that reds on a correct local build is a gate people learn to skip
  ([`a-gate-that-reds-on-day-one-teaches-you-to-ignore-it.md`](a-gate-that-reds-on-day-one-teaches-you-to-ignore-it.md)).
- **Quote the CI figure, never the local one**, anywhere a reader will act on
  it - CLAUDE.md, a plan, an outreach draft, a ceiling raise.
- **A local reading is still the right instrument for a DELTA** measured in two
  arms on one tree, same machine, same hour. That is what it is good at. It is
  the ABSOLUTE against a ceiling that belongs to CI.
- Raising a ceiling means reading the number off a CI run first.

## When to Apply

- Writing any byte figure into prose, a plan, or a threshold
- Raising or lowering any tuned constant
- Any gate that passes locally by less than the toolchain spread
- Adding a gate whose comparison is absolute rather than differential

## Related

- [`a-threshold-tuned-against-todays-tree-goes-stale.md`](a-threshold-tuned-against-todays-tree-goes-stale.md)
  - the sibling on the other axis. That one is a number measured on a tree that
  has moved; this is a number measured on a machine that never ships.
- [`a-hand-authored-number-that-leaves-the-repo.md`](a-hand-authored-number-that-leaves-the-repo.md)
  - what happens when such a number is published.
- [`a-diagnostic-that-truncates-what-it-compares.md`](a-diagnostic-that-truncates-what-it-compares.md)
  - an instrument that cannot express the difference it is measuring.
