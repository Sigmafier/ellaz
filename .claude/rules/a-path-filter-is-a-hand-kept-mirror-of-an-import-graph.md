---
paths: ".github/workflows/**,**/scripts/**"
---

# A Workflow's `paths:` Filter Is a Hand-Kept Mirror of an Import Graph, and It Goes Stale Once Per Input

**Scope**: Every `paths:` / `paths-ignore:` list in `.github/workflows/`, and any future build whose trigger is a file list rather than a dependency.
**Origin**: 2026-08-23. Three misses in two days, one per input the reach board gained, each landing in a different direction.

## Core Rule

**A `paths:` list says which files a build depends on. The build's IMPORTS say the
same thing, and only one of them is checked by anything. So the list is correct on
the day it is written and drifts the moment the build reads one more file - in
silence, in whichever direction the miss happens to point.**

Both directions are real and they do not look alike:

| the miss | what happens | how it reads |
|---|---|---|
| an input missing from `paths:` | editing it publishes nothing | **the board ignored me** |
| an input missing from a sibling's `paths-ignore:` | editing it redeploys a site it cannot affect | nothing - it is invisible until something dies mid-transfer |

## The three, in order

`scripts/reach/build-reach-site.mjs` gained one import per commit, and the filters
were updated one commit late every time:

```
1  ledger.md + outreach-ledger.mjs   -> board would ignore a Do-next edit
                                     -> AND shipped ellaz.fun over FTP for nothing
2  hebrew.md + reddit.md             -> board would ignore an edited POST
3  repro-reach-board-copy.mjs        -> shipped ellaz.fun over FTP for nothing
```

The third is the one that settles it: a *probe* that cannot touch `dist/` triggered a
full FTP deploy of the site, and the comment two lines above the miss already called
each unnecessary deploy *a fresh chance to die mid-transfer*
([`a-deploy-ledger-that-can-disagree-with-the-disk.md`](a-deploy-ledger-that-can-disagree-with-the-disk.md)).
A warning written in the same file did not stop the third instance, which is the
usual result of a rule with no mechanism.

## What to do

- **Prefer a GLOB keyed on a naming convention over a name.** Reach-only probes are
  `scripts/repro/repro-reach-*.mjs`, so the next one is covered by a filter nobody has
  to remember. A convention is checkable by eye; a list is not.
- **Update the filter in the SAME commit as the import.** The import is the thing that
  changed the dependency; the filter is just its second copy.
- **Ask both questions, because a filter has two sides**: does the build that READS
  this file now run, and do the builds that do NOT read it now stay put?
- **Read the filter back out of the YAML after editing it**, rather than trusting the
  diff - `python3 -c "import yaml; ..."` on the parsed `on.push.paths`. A list this
  shape is one indentation away from being somewhere else entirely.

## The same shape with no YAML in it: a ledger and its watcher (2026-08-30)

`docs/outreach/ledger.md` records what we sent; `docs/outreach/backlinks.md` records
what we watch. That is a second hand-kept mirror of the same set, and nothing checked
it either: **11 fired surfaces, 4 watched.** Seven had a verdict date and no
instrument, including three letters sent that afternoon - so on their verdict day the
only thing that could read them would never have looked at the destination.

Two differences from the YAML case, both of which make it worse rather than better.
There is no import graph to diff against, so the mirror cannot be derived at all; and
the miss is silent in the only direction that matters, because a surface nobody
watches simply never appears in a report.

The fix is the one this rule already asks for, made mandatory: `WATCHED` in
`scripts/reach/backlinks.mjs` maps every fired ledger surface to the page a link would
appear on, or to `null` with the reason there can never be one. Both directions red -
an unmapped fired surface, and a mapped URL with no row - **and it runs in the daily
board build, not only when a person types the command.** That last part is the whole
lesson: the gap opens between sessions, so a gate whose trigger is somebody
remembering is a gate aimed away from its own failure mode.

## The tell

You are adding an `import` to a script that a workflow triggers on, and the workflow
file is not open. Or: you are adding a row to one file that a second file is supposed
to mirror, and nothing reads both.

## The other direction: a filter narrowed by a NAME PREFIX (2026-09-07)

The shape above is a filter with entries MISSING. This is the same defect wearing the
opposite face: a filter that is present, deliberate, argued for in its own comment - and
scoped to a name prefix, so it covers the one input somebody had in front of them and
none of that input's siblings.

```
BEFORE                                   AFTER
------                                   -----
# "A GLOB rather than a third name."     - "scripts/repro/**"
- "scripts/repro/repro-reach-*.mjs"
       ^ covers the reach probes           covers every reproducer, including the
         and nothing else                  ones nobody has written yet
```

The comment above that line already said *"this list has gone stale three times in two
days ... because it is a hand-kept mirror of an import graph"*, and then named a prefix -
which is a hand-kept mirror with one entry. Every non-reach probe kept rebuilding and
re-uploading the whole site for a change `dist/` cannot contain, and **on 2026-09-07 one
of those deploys silently dropped two JS chunks and took ellaz.fun down for about forty
minutes.**

**The test: name the CLASS the entry belongs to, then ask what else is in it.** Here the
class is "a file that is run by hand and imported by nothing" - a whole directory, not a
naming convention. A prefix is the right scope only when the prefix is what makes the
file's class, and `repro-reach-` did not: the directory did.

And pin it in both directions. `deploy-triggers.test.ts` now asserts the entry is
present, that nothing in the deploy path imports a reproducer, and that neither workflow
RUNS one - the last of which no import graph could ever see.

## A third face: a filter narrowed by EXTENSION (2026-09-08)

Same defect again, in a gate rather than a workflow. `assert-live.mjs` follows every
document's asset references and compares them to the build; it matched
`assets/<name>.(?:js|css)`, which is a hand-kept mirror of what Vite happens to emit.
The woff2 that the font work put in every head on 2026-09-07 fell straight through it.

```
BEFORE                              AFTER
------                              -----
\.(?:js|css))"                       \.[A-Za-z0-9]{2,6})"

live home page:                     live home page:
  5 hashed assets named               5 hashed assets named
  4 compared                          5 compared
```

**The cost is smaller than it looks, and saying so is the point.** The woff2 FILES were
never at risk - the same script already walks all of `dist/` and compares every
non-html file by SHA-256, so a dropped font upload has always been caught. The
uncovered case is a preload href naming a file that is not in the build: `assert-fast`
checks the tag is present and never fetches it, and this walk never looked at it. A
browser recovers, because the `@font-face` in the CSS carries its own fingerprinted
url - so the only symptom is that the preload silently stops working. **A win that
reverts behind a green build**, the shape
[`precache-glob-sweeps-new-chunks.md`](precache-glob-sweeps-new-chunks.md) is about.

The recommendation that produced this work said something stronger and wrong - *"a
dropped upload would leave every page in a fallback face behind a green deploy"* - and
five minutes reading `distArtifacts()` refuted it. **Read the gate you are about to
extend before quoting what it does not cover**, or the fix ships with a false reason
attached and the next reader inherits it.

Three arms, each watched:

```
ARM 1  the pre-2026-09-08 matcher, everything else identical  -> exit 1, guard fires,
                                                                 every route 5 -> 4
ARM 2  a preload href naming a file not in the build          -> exit 1, named twice:
                                                                 the equality half AND
                                                                 a 404 on the fetch
ARM 3  the shipped matcher, live documents as the local dist  -> exit 0, 8 assets, 5 routes
```

And the scope guard now runs on **every** invocation rather than once: zero woff2
across five app-booting routes means either the preload was dropped from every page or
the matcher stopped seeing it, and both are defects. That assertion is what turned Arm 1
red - the counts alone would have read as a healthy site.

## Related

- [`a-workflow-outside-the-repo-root-is-an-ordinary-text-file.md`](a-workflow-outside-the-repo-root-is-an-ordinary-text-file.md)
  - the same class one level up: a workflow GitHub never reads at all. There the
  failure is total and silent; here it is partial and silent.
- [`a-deploy-ledger-that-can-disagree-with-the-disk.md`](a-deploy-ledger-that-can-disagree-with-the-disk.md)
  - why an unnecessary FTP deploy is a cost rather than a no-op.
- [`a-threshold-tuned-against-todays-tree-goes-stale.md`](a-threshold-tuned-against-todays-tree-goes-stale.md)
  - the sibling for numbers. Same decay, different artifact.
