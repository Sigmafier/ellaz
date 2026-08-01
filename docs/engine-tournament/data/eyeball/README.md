# Eyeball-gate raw evidence — 2026-08-01

The operator-verdict data behind
[`../../EYEBALL-VERDICT.md`](../../EYEBALL-VERDICT.md). Archived here because the
harness that produced it lived in an ephemeral scratchpad.

| File | What it is |
|---|---|
| `blind-key-*.json` | Letter→engine mapping for the blind four-arm run, written at server start, before any judging |
| `blind-verdict-*.json` | The four-arm ranking, recorded before the mapping was revealed |
| `pairwise-key-*.json` | Letter→engine mapping for the three-round excalibur-vs-phaser pairwise |
| `pairwise-*.json` | The pairwise result — 1-1-tie, no symptom ticked |
| `latency-round2.json` | Input→position-assign latency, 2 persisted runs × 12 trials × 4 arms |

**Two keys exist for the four-arm run** (`12-39-01` and `12-40-55`). The first
server was restarted before any judging to pick up a page edit, which re-drew the
order; only `12-40-55` has a matching verdict. Kept rather than pruned so the
timestamps reconcile.

**`latency-round2.json` holds runs 2 and 3 of three.** Run 1 predates the
persistence code and survives only as the withdrawn figures quoted in
`EYEBALL-VERDICT.md`'s history. The two persisted runs are what the published
2-5× spread is computed from — the point being that the ms column does not
reproduce, which two runs already establish.
