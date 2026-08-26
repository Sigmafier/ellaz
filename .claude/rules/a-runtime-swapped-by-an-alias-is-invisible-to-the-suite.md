# A Runtime Swapped by a Build Alias Is Invisible to a Test Suite That Resolves Its Own Aliases

**Scope**: The `react` / `react-dom` -> `preact/compat` alias in `vite.config.ts`, and any future swap of a runtime performed by build configuration rather than by an import.
**Origin**: 2026-08-26. Preact replaced React across 125 files and shipped to ellaz.fun. All 4,303 tests passed before the swap, after the swap, and would have passed had the swap been broken.

## Core Rule

**A dependency replaced by a `resolve.alias` is replaced for the BUILD and for
nothing else. Vitest resolves aliases from `vitest.config.ts`, so the suite goes on
testing the library the build no longer ships - green about a runtime nobody
downloads. Whenever an alias substitutes a runtime, the same alias goes in the test
config in the same commit, and one test asserts it is in force.**

## Why it is worse than an untested change

An untested change is a known gap. This is a suite that answers **confidently about
the wrong artifact**: 154 files and 4,303 tests reporting green, none of them
touching what a child loads. Nothing in the diff says so - the alias is two lines in
a build config, and the test config is a different file nobody opened.

Three things had to be true at once here, and all three were:

- `vitest.config.ts` carried `@sdk`/`@ui`/`@juice`/`@i18n`/`@shared` and **not**
  `react` - so it looked like a complete alias list.
- `react` and `react-dom` are **still installed and still dependencies** (they are
  kept for their types and for a one-line revert), so an import resolves happily.
- No test rendered a component, so the divergence was latent rather than visible.
  The first component test written after the swap would have tested React 18 and
  passed.

## Preact impersonates React well enough to defeat the obvious control

The natural guard - "assert we got preact" - fails on every marker you would reach
for first. Measured on the installed packages:

| marker | React 18.3.1 | `preact/compat` |
|---|---|---|
| `version` | `"18.3.1"` | `"18.3.1"` |
| `createElement(...).$$typeof` | `Symbol(react.element)` | `Symbol(react.element)` |
| `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED` | present | present |
| **`createElement(...).constructor`** | **`Object`** | **`undefined`** |

Only the last one discriminates. A control built on any of the other three passes
under React and reports that the alias is working.

`src/games/nested-root-teardown.test.ts` carries it, and it has been watched
failing: with the two alias lines removed from `vitest.config.ts` it reds with
`expected [Function Object] to be undefined`.

## The suite is still not the proof, and must not be described as one

Aligning the config makes future component tests honest. It does not test the swap,
because nothing here renders the app. The evidence that the site works is a browser:

- `scripts/repro/repro-preact-swap.mjs` - every game mounts, and the lazy art and
  metadata chunks are blocked as controls so the counters cannot pass vacuously.
- `scripts/repro/repro-arm-parity.mjs` - both builds, all 42 games, pixels and
  behaviour compared, with a second pass that re-shoots ONE build to separate a
  random deal from a rendering difference.

## When to Apply

- Any `resolve.alias` that substitutes a package for a different implementation
- Adding the first test that renders a component, in a project that has one
- Reviewing an alias diff: open the test config in the same breath
- Writing a control for "is X really Y" - find the marker that actually differs,
  and watch it fail before trusting it

## Related

- [`a-diagnostic-that-truncates-what-it-compares.md`](a-diagnostic-that-truncates-what-it-compares.md)
  - the family: an instrument that cannot express the failure it looks for. Here it
  is a whole suite.
- [`react-nested-root-teardown.md`](react-nested-root-teardown.md) - the property
  the swap put back in question, and the test that now pins it through the alias.
- `~/.claude/rules/quality/an-armed-lever-with-no-caller-reads-as-yes.md` - a flag
  set to true is not a protection; a green suite is not coverage of what ships.
