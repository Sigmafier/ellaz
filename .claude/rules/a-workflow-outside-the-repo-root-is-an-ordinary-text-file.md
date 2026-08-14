# A Workflow Outside `.github/workflows/` at the REPO ROOT Is an Ordinary Text File

**Scope**: Any sub-project inside this repo that wants its own CI or deploy — `holdem/` today, anything else tomorrow.
**Origin**: 2026-08-14, taking the poker sub-project live. `holdem/.github/workflows/deploy.yml` had existed for as long as the sub-project had, and GitHub had never once read it.

## Core Rule

**GitHub discovers workflows in exactly one place: `.github/workflows/` at the root of
the repository. A `.github/workflows/` directory anywhere else is a directory of YAML
files that nothing parses, nothing validates, nothing lints and nothing runs. It is not
misconfigured. It is invisible.**

So a sub-project's workflow lives at the root, is named for the sub-project, and scopes
itself with `paths:` — the directory nesting that feels tidy is the one thing that
cannot work.

## Why it survives review

Every signal a person would check says the file is fine:

| What you check | What it says |
|---|---|
| The file exists, at a path that looks canonical | ✅ |
| The YAML parses, the keys are right, the steps are sensible | ✅ |
| `git log` shows it committed and pushed | ✅ |
| The Actions tab | it simply is not listed |
| A red run, an error, a warning, an annotation | **there is none** |

The absence of any failure is the whole problem. A *broken* workflow fails at "Prepare
all required actions" and tells you. An *undiscovered* one produces no artifact of any
kind, so the only way to notice is to go looking for a thing that was never there.

## The check, and it is one command

```bash
gh api repos/<owner>/<repo>/actions/workflows --jq '.workflows[] | "\(.id)\t\(.state)\t\(.path)"'
```

A workflow GitHub knows about has an **id** and a **state**. One it has never seen is
absent from that list entirely — not listed as disabled, not listed as failing, absent.
That call turned a suspicion into a fact here before anything was built on it, and the
same call afterwards showed both poker workflows `active`, which is the direct proof the
move worked rather than an inference from a green tick.

**Do not conclude a workflow is fine because a push did not complain.** Nothing
complains.

## The three things a sub-project workflow needs that a root one does not

Moving the file to the root is necessary and not sufficient. `holdem/` is its own npm
workspace root with its own `package.json`, its own lockfile and its own test suite, so:

1. **`defaults: run: working-directory: holdem`.** Without it, `npm ci && npm test` runs
   at the repository root — installing ellaz's dependencies, running ellaz's tests, and
   then deploying poker anyway. Every step reports success. The log reads perfectly. It
   proves nothing about the thing being shipped.
2. **`paths:` on the new workflow**, so an ellaz commit does not redeploy poker.
3. **`paths-ignore:` on the EXISTING workflows**, so a poker commit does not redeploy
   ellaz to Hostinger and Pages. This half is the one that gets forgotten, because
   nothing about it is visible from the file you are writing — it is an edit to two
   other files, on behalf of a third.

`deploy-hostinger.yml` and `deploy-pages.yml` both carry that `paths-ignore` now. If a
second sub-project ever lands, it needs adding to both again.

## When to Apply

- Adding CI or a deploy for anything under a subdirectory of this repo
- Any workflow that "should have run" and left no trace — check discovery before
  checking the trigger, the branch filter, or the credentials
- Reviewing a PR that adds a workflow: confirm the path starts `.github/workflows/` with
  nothing before it

## Related

- [`verify-the-deploy-target-not-just-the-run.md`](verify-the-deploy-target-not-just-the-run.md)
  — the sibling one step later: a workflow that IS discovered, runs, goes green, and
  deployed nothing. Together they cover both halves of "the pipeline says yes and the
  world did not change".
- [`a-second-published-artifact-needs-its-own-gate.md`](a-second-published-artifact-needs-its-own-gate.md)
  — the poker sub-project publishes to Cloudflare, which no gate in this repo can see.
  That is why `holdem/scripts/assert-holdem-live.mjs` exists.
- [`a-gate-must-tell-not-yet-from-wrong.md`](a-gate-must-tell-not-yet-from-wrong.md) —
  what that gate then got wrong on its first real run.
