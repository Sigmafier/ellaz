---
paths: "docs/outreach/**,**/scripts/**,README.md"
---

# A Hand-Authored Number That Leaves the Repository Needs a Gate, Because Editing the File Does Not Fix It

**Scope**: `docs/outreach/**` today, and anything else this repo writes for a reader who is not in it — a submission, a press letter, a listing, a store description, a conference abstract.
**Origin**: 2026-08-18, auditing the outreach folder. Eight drafts, 57 wrong figures, six days after they were written, with every gate in the repo green.

## Core Rule

**Every number-bearing surface here is derived except the ones written to be
published. The sitemap, `llms.txt` and the emitted home read the roster and cannot
be wrong about how many games there are. A draft cannot read anything. So the one
folder whose contents go to strangers is the one folder where a figure is a
guess — and it is also the one place where being wrong is not repaired by editing
the file, because the file is not what the stranger read.**

The asymmetry is the whole rule. A stale line in `CLAUDE.md` costs the next
session ten minutes. A stale line in a Show HN post is permanent, public, and read
as a claim about whether this project's numbers can be trusted at all — which is
the one thing the drafts are actually selling.

## What it looked like

Written 2026-08-11 and 2026-08-12 against a tree with 23 games. Measured 2026-08-18:

| | Drafts said | The tree said |
|---|---|---|
| games | 23 | **33** |
| emitted pages | 52 | **144** |
| page locales | 2 | **4** |
| first visit | 88,234 B gz | **90,027** |
| ceiling / room left | 90,000 / 1,766 B | **90,500 / 473** |

Ten games landed, French was promoted, the ceiling was raised. Nothing in the diff
of any of those changes mentions `docs/outreach/`, and nothing should have to.

**Two of the errors were not drift.** A `provenance` row named
`src/games/snake/SnakeGame.tsx`, a file that has never existed under that name;
and one table said sudoku has four difficulty tiers eight lines above a row
correctly saying six. Both sat in the column whose entire purpose is to make a
claim checkable, and both survived because **nobody re-ran the check the column
names.** A provenance row is a promise that something can be verified, not
evidence that it was.

## The claim that flips instead of drifting

"under 90 KB" appeared nine times. It was true at 88,234 B gz and false at 90,027
— by 27 bytes.

**No numeric matcher can see this**, and that is worth internalising before
writing one: the number in the sentence is the THRESHOLD, and it did not change.
Only the world moved past it. A gate over published prose therefore needs two
kinds of check — *this figure equals that measurement*, and *this sentence still
holds* — and only the first can be auto-fixed.

The repair is also a lesson: the copy now says **about 90 KB**, which is true at
90,027 and survives the next 200 bytes. Where the exact figure matters, quote it
exactly and let the gate maintain it; where it does not, do not spend precision
you will have to keep paying for.

## Building the gate

`scripts/assert-outreach.mjs` is the implementation. Four properties, each of
which cost something to learn:

**Enumerate the phrasings; do not generalise them.** A loose matcher rewrites the
wrong number under `--fix`. The corpus is eight files — "23 games", "one game out
of 23", "a free site of 23 of them", "both 23", "23 משחקים" — so list them.

**`minHits` per claim is the positive control, and it is the load-bearing half.**
A matcher that finds nothing reports a clean sweep over prose it never read. Here
it caught two of its own holes on the first run: `measured 88,234 on <date>` in
three provenance rows and `one game out of 23` in three more, both invisible to a
matcher anchored on a following unit. Zero hits must be a FAILURE.
See [`a-diagnostic-that-truncates-what-it-compares.md`](a-diagnostic-that-truncates-what-it-compares.md).

**Ask which text is in the population before asking whether the logic is right.**
`press.md` carries a Hebrew press letter quoting the counts; an English-only
matcher reports the folder clean while the one document written for a journalist
stays wrong. Same shape as the `LOCALES` literal that ran zero Spanish pages
through the voice gate, and as the `/` exclusion that let the home serve 29 bytes
to every AI crawler.
See [`a-locale-page-without-a-translated-body-is-a-duplicate.md`](a-locale-page-without-a-translated-body-is-a-duplicate.md).

**An auto-fixer cannot tell a claim from a history.** `press.md` recounts that its
own payload figure moved and names the old number and the new one; `--fix`
rewrote the history into a sentence contradicting itself. Historical passages are
wrapped in `<!-- outreach-facts:off -->` and **the count of exempted regions is
printed on every run**, because an exemption that can be applied quietly is a way
to make a gate pass by deleting its job.

## Where the gate goes

**Not in `build:check.`** The same placement as `assert:standalone`: a gate for an
artifact published by hand, run before publishing. Wiring it into the build reds
every lane that adds a game until somebody edits eight markdown files, and a gate
that reds on work it is not about is a gate people learn to skip
([`a-gate-that-reds-on-day-one-teaches-you-to-ignore-it.md`](a-gate-that-reds-on-day-one-teaches-you-to-ignore-it.md)).
`--fix` is what makes that placement honest — the correction costs one command, so
there is no incentive to publish around it.

## The half no gate reaches

Some published surfaces are not files in this repo at all. The **GitHub repository
description** still said "in Hebrew and English" when the site had four written
languages and eleven interface ones — public, beside every link the outreach
points at, and unreachable from any check here. When auditing what this project
claims, enumerate the surfaces before enumerating the files.

## When to Apply

- Writing anything for a reader outside this repo that quotes a number about it
- Reviewing a draft in `docs/outreach/`: run `npm run assert:outreach` first, then
  read for the things it cannot see — whether an admission is still true, whether
  a destination's rules have changed, whether a date in a provenance row was
  actually re-derived
- Adding a figure to any such draft: ask what derives it, and whether the gate can
  see the shape you are about to write it in
- Any claim of the form "we checked that" — the row saying so is not the check

## Related

- [`a-threshold-tuned-against-todays-tree-goes-stale.md`](a-threshold-tuned-against-todays-tree-goes-stale.md)
  — the same decay one layer in. That one is a threshold argued against a tree
  that has since moved; this is a published sentence about it.
- [`game-content-template.md`](game-content-template.md) — "authors write prose,
  code supplies facts". This folder is where that rule had never been applied.
- [`a-second-published-artifact-needs-its-own-gate.md`](a-second-published-artifact-needs-its-own-gate.md)
  — the same argument for a published *artifact* rather than a published *claim*,
  including why the gate is written before the thing it guards.
- [`a-diagnostic-that-truncates-what-it-compares.md`](a-diagnostic-that-truncates-what-it-compares.md)
  — why `minHits` exists.
