# A Gate That Reds on Day One for Something Nobody Can Fix That Day Teaches Its Reader to Ignore It

**Scope**: Any new gate in this repo shipped while a known offender is still live — a content floor, a payload slope, a crawl check, a lint rule.
**Origin**: 2026-08-13, the slope gate. Second instance of a shape `assert-crawlable.mjs` already used twice.

## Core Rule

**When a gate is correct but the tree cannot pass it yet, ship it REPORTING rather
than ENFORCING, and enforce at a line the architecture can actually hold today.
Two numbers, and say on every run which is which — because a gate that is red on
the day it lands is a gate whose red means nothing by the end of the week.**

The failure is not a wrong threshold. It is a reader who learns that this check is
always red, stops looking, and is therefore not looking on the day it goes red for
a real reason.

## The shape

```js
const PER_GAME_BUDGET = 140;  // ENFORCED - what this architecture can hold
const O1_TARGET = 40;         // REPORTED - where it should end up
```

And the run says both, every time, naming what closes the gap:

```
SLOPE  123.6 B gz per game, budget 140
O(1) target is 40 B gz per game, not met. The part of the gap that is NOT card
art is the roster's static meta.ts - docs/scaling-the-first-visit.md step 3 is
what removes it.
OK  the first visit is O(1) in the catalogue (16.4 B gz per game spare).
```

Three properties make that worth reading rather than noise:

- **The enforced number is not a rubber stamp.** 140 against a measured 123.6 is
  16 B of slack, and putting the card art back in the shell measures 294.6 — so
  the gate reds on the regression it exists for. A budget nothing can fail is the
  other way to make a gate meaningless.
- **The reported number names its own remedy.** "Not met" plus the file and step
  that closes it, so the line is an instruction rather than a complaint.
- **It says which is which.** A single number cannot express "correct, unmet, and
  known" — the reader has to be told they are looking at an ambition.

## Both instances here

| Gate | Enforced | Reported | Why the split |
|---|---|---|---|
| `assert-crawlable.mjs` | status + challenge body | `CONTENT_FLOOR`, armed by `CRAWL_CONTENT_FLOOR=1` | written while a thin page was live |
| `assert-crawlable.mjs` | Googlebot access | per-bot access, armed by `CRAWL_BOT_ACCESS=1` | Hostinger 429s GPTBot and nobody here can change a vendor setting today |
| `assert-slope.mjs` | `PER_GAME_BUDGET = 140` | `O1_TARGET = 40` | the metadata term needs step 3, which is not this change |

All three are the same decision: the gate is right, the world is not ready, and a
red that nobody can act on is worse than an honest number that says so.

## When the reported number becomes the enforced one

**In the same commit that makes the last offender pass**, and not before. Arming
is one line; leaving it disarmed after the reason has gone is how the ambition
quietly becomes the standard. Each of the three carries its arming condition in
the code beside the constant, so the person who fixes the cause finds the switch.

## The failure this is NOT

Do not use this to ship a gate you have not proven. A reporting-only gate still
needs its negative control: `assert-slope.mjs --control` plants a fat scene and
must red at 989 B/game naming the shell chunk. **Advisory is about the THRESHOLD
being unreachable today, never about the check being unverified** — an unproven
gate reporting a number is just a number.

## When to Apply

- Adding any gate whose current tree does not pass
- Reviewing a gate that has been red since it landed — it is not doing its job
- Tempted to weaken a threshold so a gate goes green: split it instead, so the
  real target stays written down rather than negotiated away

## Related

- [`a-threshold-tuned-against-todays-tree-goes-stale.md`](a-threshold-tuned-against-todays-tree-goes-stale.md)
  — the adjacent trap: a number argued against a tree that has since moved. That
  one is about the threshold going stale; this is about it being unreachable from
  the start.
- [`a-diagnostic-that-truncates-what-it-compares.md`](a-diagnostic-that-truncates-what-it-compares.md)
  — a gate nobody has watched fail is not a gate, in either mode.
- `docs/scaling-the-first-visit.md` — what closes the slope gate's reported gap.
