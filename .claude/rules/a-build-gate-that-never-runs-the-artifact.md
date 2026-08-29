# A Gate That Reads the Bytes Cannot Tell You the Thing Runs

**Scope**: Every artifact in this repo that is gated before it leaves — the standalone
bundles above all, but the same shape for anything asserted by inspection rather than by
execution.
**Origin**: 2026-08-29. `dist-standalone/2048/` passed `assert:standalone` — including
its own 14/14 negative control — and rendered **"The game didn't load"** in a browser.
It was in a zip, in an upload package, one step from itch.io and Newgrounds.

## Core Rule

**Before an artifact leaves this repository, LOAD IT. A gate built from byte-level
assertions answers "does it contain anything forbidden"; nothing in it answers "does it
work", and the two feel like the same question right up to the moment somebody opens the
page. One browser load is the whole check, and no amount of static assertion substitutes
for it.**

`assert-standalone.mjs` is a good gate. It catches absolute paths, phone-home hosts, a
stale stamp, a torn bundle, a surviving placeholder — and it carries a negative control
that plants 14 defects and detects all 14. Every one of those 14 is a defect **in the
bytes**. A bundle whose own game module was replaced by a throwing stub has no defect in
its bytes at all: it is a correct, complete, well-formed bundle of the wrong graph.

## What actually happened

`vite.standalone.config.ts` keeps the other games out by stubbing any module resolving
to `src/games/<X>/index`, where `X !== meta.id`. The captured segment is the
**DIRECTORY**; `meta.id` is the **ID**; and for exactly one game in the roster those are
different words:

```
src/games/n2048/meta.ts      id: "2048"
catalog.ts                   "2048": () => import("../games/n2048/index")

match[1] = "n2048"   !==   meta.id = "2048"      ->  STUBBED ITSELF
```

So the 2048 build stubbed the one module it existed to ship. Build: green. Type-check:
green. Gate: green, control included. Browser: dead.

**One mismatch in 42 games, and it was in the three we picked to publish.** A trap that
fires on 1 of N is worse than one that fires on all of them: the other two bundles worked,
so every generalisation from "the standalone build works" was true and useless.

## The two fixes, and only one of them is the fix

1. **Resolve the directory from the id** (`gameDirFor()`), rather than assuming a game's
   folder is named after it. This repairs the instance.
2. **Assert the build saw its own game** (`sawOwnGame`, in `generateBundle`). This is the
   one that matters: a plugin that filters things out cannot otherwise distinguish *I kept
   the right one* from *I threw away everything including the target*. Both produce a
   clean build; only one plays. Put the positive assertion beside the filter, always.

## And a diagnostic that printed over its own finding

The first version of the control threw from `buildEnd`. The build did fail — exit 1 — but
rollup still ran `closeBundle`, whose webfont-strip assertion then failed against an
unwritten tree and printed **"no remote @import found in 0 css file(s)"**. The exit code
was right and every word on the screen sent the reader to the CSS. Two changes:
`generateBundle` for the control, and `closeBundle` returns early when `standalone.html`
was never written.

**A cleanup hook that asserts is a hook that can overwrite the real error.** Ask of any
`closeBundle`, `finally`, or teardown: what does this print when the thing before it
already failed?

## When to Apply

- Any change to `vite.standalone.config.ts`, or to the roster's directory names
- Before any upload, submission or publication of a built artifact — load it first
- Writing a plugin that removes, filters, prunes or stubs: add the positive assertion in
  the same change
- Reading a green gate and about to write "verified" — ask which question it answered

## Related

- [`a-diagnostic-that-truncates-what-it-compares.md`](a-diagnostic-that-truncates-what-it-compares.md)
  — the family. The masked `closeBundle` error is a new member of its table.
- [`a-comment-that-explains-a-cost-must-name-its-measurement.md`](a-comment-that-explains-a-cost-must-name-its-measurement.md)
  § the SCOPE WORD — a green test read as evidence for a broader claim than it tested.
- [`verify-the-deploy-target-not-just-the-run.md`](verify-the-deploy-target-not-just-the-run.md)
  — the deploy-side twin: a green run is not a live artifact.
