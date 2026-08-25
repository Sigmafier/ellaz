# A Comment That Explains What Something COSTS Is Quoted as Fact, So It Must Name the Measurement

**Scope**: Every comment in this repo that justifies a choice with a number, a size, a
speed, or a "cheaper / faster / free" — in code, in a rule, in `CLAUDE.md`, in a NOTICE.
**Origin**: 2026-08-25. Three instances in this repository, one of them written and
caught inside a single hour.

## Core Rule

**A comment saying WHY something costs what it costs is read by the next person as a
measurement, whatever tense it was written in. So it either names what was measured —
the two arms, the numbers, the date — or it does not make the claim. A prediction
written in the voice of a finding is worse than no comment, because the next reader
does not re-measure something that has already been settled.**

The failure has no error, no test and no diff. The code is correct, the comment is
plausible, and the only thing wrong is that nobody ever ran the thing it describes.

## Three instances, and none of them was careless

| when | the comment said | what was true |
|---|---|---|
| 2026-08-21 | *"Comments in DOCUMENT_CSS are SERVED; keep them short here"* — in three places | true when written, false from `1b8f2b9` onward. `42a5b77` is a commit whose whole message is *"Trim the breadcrumb comment, because comments in DOCUMENT_CSS are SERVED"* — a real edit, spent on a rule that had stopped being true |
| 2026-08-25 | *"the same badge cost 256 B gz as a style literal and a fraction of that as a rule, because CSS gzips against every other rule while a JS object gzips against minified code"* | the reasoning is sound and the measurement is the other way: 90,959 as a literal, **90,996** as a rule. The move COST 37 B (shell JS −70, CSS +109) |
| 2026-08-25 | NOTICE.md: *"`patterns.ts` is the only module in the round tree that imports this one"* | `bonusBoard.ts` had imported the dictionary since the crossword shipped. The safety property held; the sentence was checkable and false, in the one file here whose job is precision about that list |

The middle one is the sharpest, because the argument in it is *correct in general*. CSS
does gzip well against its neighbours. It simply lost to the fact that moving a style
object out of a chunk leaves the chunk's other strings compressing worse. That is not
something anyone can reason to — it is a property of the tree on the day.

## What to write instead

- **Two arms, or no number.** `90,959 as a literal, 90,996 as a rule` — the pair, not the
  delta, so a reader can tell which build it belongs to.
- **Say what did NOT get measured.** *"kept as a class because a theme can override a
  class and cannot override a style attribute"* is a REASON. It stops being a lie the
  moment it stops claiming bytes.
- **A claim about a SET goes in a test, not a sentence.** NOTICE.md now describes the
  modules allowed to read the dictionary and `rounds-are-wired.test.ts` asserts the set,
  so a new arrival is a red build naming itself rather than a sentence quietly
  becoming false. Prose describes; only code can hold.
- **And the sentence names the POPULATION it ranges over.** See below - a set claim
  with no scope word is a different false claim from a set claim with the wrong members,
  and the test standing behind it can be green over both.
- **Date the claim** when it is about the tree — see
  [`a-threshold-tuned-against-todays-tree-goes-stale.md`](a-threshold-tuned-against-todays-tree-goes-stale.md).

## A fourth instance, and the wrinkle is the SCOPE WORD (2026-08-25)

The same day the NOTICE was fixed, the corrected claim was restated in `CLAUDE.md`
**without its qualifier** — in the same commit as the fix:

```
NOTICE.md   TWO modules IN THE ROUND TREE import this one, not one.   <- true
CLAUDE.md   Exactly two modules may import the dictionary             <- false
```

`logic.ts` imports it too, to judge a word placed on the 9x9. So the sentence was
false at the scope it stated, while every member it listed was correct — a different
defect from naming the wrong members, and one that survives a careful reading of the
member list.

**Three things made it worse than an ordinary error:**

- **The test was green over it.** `rounds-are-wired.test.ts` scanned the round tree
  and passed, so the green run read as evidence for the broader sentence. A test can
  only ever answer the question it asks; it cannot notice that the prose asked a
  bigger one.
- **A reviewer re-derived it.** An independent review agent reading the docs that
  afternoon reported "confirmed limited to exactly the two sanctioned modules" — the
  false claim laundered back as verified. A wrong scope propagates to anyone who
  trusts the file, which is the file's whole purpose.
- **The population was hand-kept.** The test's own module list was an array of seven
  filenames, so a new round module reading the dictionary would simply not have been
  in it — the mirror-of-a-directory defect one layer out
  ([`a-path-filter-is-a-hand-kept-mirror-of-an-import-graph.md`](a-path-filter-is-a-hand-kept-mirror-of-an-import-graph.md)).
  It is `readdirSync` now, and the full set and the round-tree subset are two separate
  assertions, because they are two separate claims.

**The rule that falls out:** write the scope, then check the sentence is true AT that
scope, then make the test's population match the scope the sentence claims. All three,
or the guard answers a narrower question than the reader is asking.

## The tell

You are typing *because*, *which is cheaper*, *for free*, *costs nothing*, *a fraction
of* — and you have not run the thing in this paragraph on this tree today. Also: a
comment that would take a full build to check, in a file nobody rebuilds to read.
And for a set claim: the sentence names members but no population — *"exactly N
modules"*, *"the only caller"*, *"nothing else reads"* with no "in X" attached.

## When to Apply

- Writing any comment carrying a byte count, a timing, or a cost comparison
- Writing a NOTICE, a rule, or a `CLAUDE.md` line asserting what a set contains
- Reviewing a diff whose comment explains a performance decision — ask where the number
  came from, and accept "I reasoned it" as a No
- Reading one: a cost comment with no date and no pair is a hypothesis

## Related

- [`a-diagnostic-that-truncates-what-it-compares.md`](a-diagnostic-that-truncates-what-it-compares.md)
  — the family. There the instrument cannot express the failure; here there was no
  instrument at all and the sentence stood in for one.
- [`a-threshold-tuned-against-todays-tree-goes-stale.md`](a-threshold-tuned-against-todays-tree-goes-stale.md)
  — a number that WAS measured, against a tree that has since moved.
- [`a-number-belongs-to-the-toolchain-that-ships-it.md`](a-number-belongs-to-the-toolchain-that-ships-it.md)
  — measured on the wrong machine. All three end in a confident wrong number.
- [`a-hand-authored-number-that-leaves-the-repo.md`](a-hand-authored-number-that-leaves-the-repo.md)
  — the same decay once the number is published.
