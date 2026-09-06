# A Generator of Committed Literals Lives Beside Them, With a Byte-Identity Check

**Scope**: Every file in this repo whose rows were EMITTED by a tool rather than typed -
the roster's `pixels<H>.ts` and `rig<H>.ts`, a rendered doc, a fixture, a table of
numbers - and the tool that emitted it.
**Origin**: 2026-09-06. The eight roster characters were painted by 566 lines of Python
that lived in the session scratchpad under `/tmp`, a tmpfs. The repo kept only the
emitted rows. Found while writing the build log at parking time, not by any gate.

## Core Rule

**If a committed file was written by a program, that program is part of the source and
is committed beside it - and it ships with a check that re-emits into scratch and diffs
against the repo. Without the generator, every edit to the literals is by hand and the
next character costs a day instead of an hour. Without the check, the generator is a
claim about the literals that nothing tests, and it drifts the first time someone edits
the emitted file directly.**

The emitted file is the source of truth for what SHIPS. The generator is the source of
truth for how it was MADE. A repo needs both, or the second is lost in the first reboot.

## What it looked like

```
BEFORE                                          AFTER
------                                          -----
scratchpad/roster/{lib,kids,teen,adult,rigs,    studio/tools/roster-painter/  (same files)
  run}.py            <- /tmp, a tmpfs           + README.md      how to run it, what each file holds
studio/art/characters/<id>/pixels48.ts          + reproduce.sh   emit to scratch, diff: 16/16 same
                          rig48.ts                               control: one pixel flipped -> DIFF, exit 1
"the repo keeps only the emitted rows"          run.py: ROOT from __file__, ROSTER_ROOT to override
```

## The check needed two tries, which is the point of having one

- **A `.pyc` served the mutated source after the source was restored.** The mutation
  (`"W"` to `"K"`) kept the file's SIZE, and `mv`-ing the backup over it restored an
  OLDER mtime, so Python's `(mtime, size)` freshness key matched the stale bytecode. The
  control read green on a source that was already back to correct while the emitted
  file was still wrong. `python -B`, and `__pycache__/` is ignored.
- **`bash reproduce.sh | tail -2; echo $?` printed the exit of `tail`.** The gate said
  DIFF and the line under it said 0. The same pipe trap this repo already records in
  [`a-diagnostic-that-truncates-what-it-compares.md`](a-diagnostic-that-truncates-what-it-compares.md)
  (the 2026-08-23 `build:check` row). Capture the exit before the pipe.

## What to do

- **Commit the generator in a `tools/` directory beside what it emits**, with a README
  that names the interpreter it needs when that is not a project dependency (Pillow is
  not; the painter's README names the venv that has it).
- **Paths inside it are relative to the file, never to this machine.** The scratchpad
  copy had `/mnt/c/Users/.../studio/art/characters/` hard-coded and would have emitted
  nowhere on any other checkout.
- **Ship `reproduce.sh`**: emit into `mktemp -d`, diff every file, print `N emitted, M
  differ`, exit non-zero on any difference or on fewer files than expected. Then plant
  one change and watch it red BEFORE trusting a green.
- **When the emitted file must be hand-edited** (a fix the generator cannot express),
  either teach the generator or record in its README that this file has diverged and
  why. A silent hand edit turns the next `--emit` into a regression.

## When to Apply

- Any script in a scratchpad that has just written a file you are about to commit
- Reviewing a diff of large literal tables with no generator in the same change
- Writing a `/document` or build-log entry: ask where each emitted artifact came from
- Resuming parked work that depends on a tool - check the tool is in the tree first

## The tell

A commit message or comment saying "emitted by", "generated from", or "painted with",
naming a path under `/tmp`, a scratchpad, or nothing at all.

## Related

- [`a-path-filter-is-a-hand-kept-mirror-of-an-import-graph.md`](a-path-filter-is-a-hand-kept-mirror-of-an-import-graph.md)
  - the same asymmetry between a thing and the description of the thing.
- [`a-diagnostic-that-truncates-what-it-compares.md`](a-diagnostic-that-truncates-what-it-compares.md)
  - the two instrument errors above belong to that family.
- [`a-build-gate-that-never-runs-the-artifact.md`](a-build-gate-that-never-runs-the-artifact.md)
  - `reproduce.sh` RUNS the generator; reading its code proves nothing about the rows.

---

**Last Updated**: 2026-09-06 (origin)
