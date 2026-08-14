# A Gate Must Tell "Not Yet" From "Wrong" — and a Cascade Points Away From Its Cause

**Scope**: Every gate in this repo that reads the network — `assert-live.mjs`, `assert-crawlable.mjs`, `assert-holdem-live.mjs`, and anything added beside them.
**Origin**: 2026-08-14, the first Hold'em deploy. The gate failed a deploy that was entirely correct, and the most convincing line it printed described a defect that did not exist.

## Core Rule

**A gate that reads the network is measuring a system with a WARM-UP. Refusing to
distinguish "this is not up yet" from "this is wrong" makes the gate red on correct
work — and once a gate is red on correct work, it is a gate people learn to re-run
rather than read.**

**Retry the transient. Bound it, and say so out loud.** A wait that is reported is
information; a wait that is silent is a gate that hangs.

## What happened

`assert-holdem-live.mjs` ran seconds after `ellaz-holdem.pages.dev` was created. A
brand-new pages.dev hostname is not resolvable at the edge for a minute or two, so it
answered **HTTP 522**. The gate printed three failures:

```
FAIL the site returned HTTP 522
FAIL the served page does not reference assets/index-CYMdjURJ.js — it is serving an older build
FAIL index.html is not being served (HTTP 522)          ... x10 artifacts
```

One cause. Three kinds of red line, and **twelve of them**.

## The second half, which is the sharper one

**In a cascade, the DERIVED line is more specific and more wrong than the root — so it
is the one the reader believes.**

Read those three again. The first is honest and vague: something answered 522. The
second is precise, technical, plausible, and completely false: *it is serving an older
build*. There is no older build. There has never been a deploy of this project at all.
A reader who trusts the most informative-looking line goes hunting for a stale-deploy
bug in a deploy that was perfect, and this repo has a whole rule file
([`a-deploy-ledger-that-can-disagree-with-the-disk.md`](a-deploy-ledger-that-can-disagree-with-the-disk.md))
that would have made that hunt feel extremely well-founded.

The mechanism is mechanical and worth recognising anywhere: `html` was `""`, so
`html.includes(builtEntry)` was `false`, so the `else` branch fired — and that branch's
message was written for the only case its author had in mind. **An assertion whose input
never arrived does not report "no input". It reports whatever its failure branch says.**

So: when an early check fails, the checks that consume its output must say *"not
evaluated"*, not their own failure text. Order the output so the root is first and the
dependents are visibly dependent.

## What is retryable, and what is not

```js
const RETRYABLE = new Set([521, 522, 523, 524]);   // and a thrown connection error
```

That list is short on purpose. **A 404 or a 500 is the site telling you something true,
and waiting will not change it.** Widening this set is how a gate stops being able to
fail — the failure mode at the opposite end, and the worse one, because it is silent.

## Prove it against the SHIPPED function, not a copy

The controls that were actually run here, each driven through the real `fetchWhenWarm`
rather than a re-implementation of its logic:

| Control | Expected | Measured |
|---|---|---|
| 522 then 200 | retries, then passes | 3 attempts, 10s, passed |
| 404 | does NOT retry | 1 attempt, 0s |
| 522 forever | gives up, bounded | 4 attempts, 15s, failed |

The middle row is the one that matters. Without it, a retry loop that retries
*everything* passes the other two and looks identical to a correct one.

## When to Apply

- Adding or editing any gate that fetches over the network
- The first run of a gate against infrastructure that has just been created
- Any gate output with several red lines — find which one is the cause before reading
  any of the others, and treat the most specific line as the most suspect
- Reviewing a retry: check what it refuses to retry, not what it retries

## Related

- [`a-gate-that-reds-on-day-one-teaches-you-to-ignore-it.md`](a-gate-that-reds-on-day-one-teaches-you-to-ignore-it.md)
  — the same consequence from the opposite cause. There the threshold is unreachable
  today; here the threshold is right and the world is thirty seconds behind. Both end
  with a reader who stops reading.
- [`a-diagnostic-that-truncates-what-it-compares.md`](a-diagnostic-that-truncates-what-it-compares.md)
  — a gate whose *message* contradicts its own correct verdict. Same outcome: the gate
  reads as broken and gets bypassed.
- [`a-deploy-ledger-that-can-disagree-with-the-disk.md`](a-deploy-ledger-that-can-disagree-with-the-disk.md)
  — the real staleness bug this gate's false line impersonated.
