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

## Related

- [`a-workflow-outside-the-repo-root-is-an-ordinary-text-file.md`](a-workflow-outside-the-repo-root-is-an-ordinary-text-file.md)
  - the same class one level up: a workflow GitHub never reads at all. There the
  failure is total and silent; here it is partial and silent.
- [`a-deploy-ledger-that-can-disagree-with-the-disk.md`](a-deploy-ledger-that-can-disagree-with-the-disk.md)
  - why an unnecessary FTP deploy is a cost rather than a no-op.
- [`a-threshold-tuned-against-todays-tree-goes-stale.md`](a-threshold-tuned-against-todays-tree-goes-stale.md)
  - the sibling for numbers. Same decay, different artifact.
