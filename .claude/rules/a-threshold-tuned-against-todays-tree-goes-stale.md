# A Number You Tune Against the Tree in Front of You Is Stale the Moment Another Lane Lands

**Scope**: Every tuned constant in this repo — the payload ceiling, the content floor, the panel cap, the prose floor, any budget or threshold a gate compares against.
**Origin**: 2026-08-11. Two instances in one afternoon, from two different pairs of parallel sessions.

## Core Rule

**A threshold is only correct relative to the tree it was measured against. When two
sessions work in parallel, each measures a tree the other is about to change — so both
numbers are right when written and at least one is wrong when they meet. Before
committing a tuned constant, ask what ELSE is in flight that moves the quantity it
bounds; before merging two changes that each touched a threshold, re-measure on the
merged tree rather than reasoning from the two numbers.**

Adding the two deltas is the specific thing that does not work. Each delta was measured
from a different baseline, so their sum describes a tree that never existed.

## The two instances, hours apart

**The payload ceiling.** One lane raised `CEILING` in `scripts/assert-payload.mjs` from
86,000 to 88,000, arguing it from a measured 86,653 — a tree without Word Guess. Another
lane, already on `origin`, had raised the same constant to 90,000, arguing it from a
measured 86,004 — a tree without the emitted Hebrew home. Neither number described the
merged tree, and the merge conflict was in exactly that one file. The residue is ~2.2 KB
of slack that neither author chose, in a file whose entire convention is that a raise
gets argued for.

**The content floor.** `assert-crawlable.mjs` shipped a floor of 120 words, argued from
"the thinnest content page here runs ~750 words". That was true when measured and false
three hours later: the fix for the empty Hebrew home emitted a deliberately compact
document of 130 words, making `/` the thinnest page on the site and clearing the floor by
**ten words**. One trimmed sentence from that copy would have reded the daily crawlability
email on a page that was completely correct.

**A third instance, and it is not a threshold at all.** 2026-08-22: a peer
committed while a gate run was in flight. Three things had just been measured
against the old tree - a test count, four build gates, and a recorded CI payload
figure - and all three named a commit that was no longer HEAD by the time they
were written down. Worse, the same move invalidated a BUILD STAMP: three
standalone zips were refused by their own gate because `git rev-parse HEAD` had
moved under them, twice in one session.

So the decay is not confined to tuned constants. **Anything derived from "the
tree" - a threshold, a measurement, a content hash, a commit stamp - belongs to
the tree it was taken from**, and in a repo with live peers that tree can be one
commit old before the command finishes printing. The remedy is the same: re-run,
never subtract, and say which tree.

## Why it is invisible from inside either lane

Both authors did the right thing. Each measured, each argued the number in the file, each
was correct against the tree they could see. Nothing in either diff mentions the other
change, no test fails, and the merge — if it even conflicts — presents as a text conflict
rather than a semantic one. The version that does **not** conflict is worse: two thresholds
in two different files, silently inconsistent, with no marker anywhere.

## What to do

- **Name the tree.** A comment arguing a threshold says what it was measured against, not
  just the number: "86,653 measured on a tree without Word Guess" ages honestly; "86,653"
  does not.
- **Re-measure on the merged tree** before believing any post-merge threshold. Run the
  gate, do not add the deltas.
- **Give a floor real margin against the thinnest LEGITIMATE case**, not against today's.
  120 against 130 is a tripwire under the copy; 60 against 130 survives an edit. The
  distance a floor must see is 0-vs-a-real-page, and that gap is a chasm at any sane
  value — the extra margin buys nothing and risks a false red.
- **Pin the binding case in a control**, named after the page or artifact it protects, so
  a future raise has to walk past it. `assert-crawlable.mjs` carries
  `"the compact emitted home clears the floor with room"` for exactly this.
- **Do not pad content to clear a threshold somebody else picked.** The copy should be the
  length the copy should be; the number is the thing that moves.

## The measurement trap underneath both

The two lanes counted "the same" quantity with different code. The emitted home was
reported at 130 words by its author; `bodyStats` counts the raw body with comments,
script and style removed. Those can disagree by an unknown amount in an unknown direction,
and the control written to pin it got this wrong on the first try — a fixture built to be
130 words measured 152, because the 22 link labels are words too.

**Two implementations of "how many words" agree until they do not.** When a threshold is
compared against a number somebody else measured, either measure it yourself with the
code that will do the comparing, or leave margin wide enough that the disagreement cannot
matter.

## The same decay for a SELECTOR, not a number (2026-08-23)

**A probe that names a UI string is a tuned constant too, and it goes stale the same
way — except its failure names the WRONG THING.**

`scripts/repro/repro-bench-on-a-phone.mjs` drove four literal tab captions
(`"SHARED · the bar"` and friends). The bench was rebuilt as one tap-a-part screen,
two of those tabs were deleted and the other two moved to `#/lab/footers`, and the
reproducer timed out on its first line:

```
locator.click: Timeout 30000ms exceeded.
  waiting for locator('button').filter({ hasText: 'SHARED · the bar' })
```

Read that message cold and it says the bench is broken. It was not; the caption was
renamed by the same commit that should have updated this file. **A repro that fails
because the thing it drives was RENAMED is indistinguishable from the thing it drives
being BROKEN**, which is the one failure mode a reproducer must never have — its whole
value is that its verdict can be trusted without re-deriving it.

The fix is the same shape as the one above: bind to the thing that is PINNED rather
than to the thing that is prose. A route is pinned by `App.tsx` and by a test; a
button's caption is prose that ships. So a surface became a ROUTE plus the shape it
claims, and the four captions went away.

Ask of any probe: **when this screen is redesigned, will this line fail loudly for the
right reason, quietly for the wrong one, or not fail at all?**

## When to Apply

- Committing or raising any tuned constant: a ceiling, a floor, a cap, a budget
- Resolving a merge conflict in a file holding one
- Reviewing a gate that passes by a small margin — ask what the margin is *against*
- Any session running beside another that touches the same artifact
- Writing or reviewing a probe that names a UI string, a label, a heading or a tab

## Related

- [`a-deploy-ledger-that-can-disagree-with-the-disk.md`](a-deploy-ledger-that-can-disagree-with-the-disk.md)
  — the same shape one layer down: something deciding from stale state rather than from
  the thing itself.
- [`a-row-that-grows-with-the-catalog-must-wrap.md`](a-row-that-grows-with-the-catalog-must-wrap.md)
  — correct when written, wrong once the catalog grew. That one is a layout constant
  going stale over months; this one goes stale over hours.
- `~/.claude/rules/quality/differential-arms-and-populations-must-be-real.md` — the
  machine-level version of "each arm was measured against a tree that no longer exists".
