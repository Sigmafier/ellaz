---
paths: "**/scripts/**"
---

# A Script Whose Top Level Runs on Import Prints Its Verdict Into Its Importer's Output

**Scope**: Every `.mjs` under `scripts/`, and anything that imports one for a helper.
**Origin**: 2026-08-21. `scripts/reach/gsc-links.mjs` was imported for a single parsing helper; it ran its whole report, printed its own verdict, and exited 0 - so the importing script's controls reported `OK all controls behaved` having evaluated none of them.

## Core Rule

**A module that does its work at the top level does that work again the moment
anything imports it, inside the importer's process, into the importer's stdout,
and it takes the exit code with it. Guard every entry point, and never read a
verdict without first proving the thing that produces it actually ran.**

Both halves are needed. The guard stops the hijack; the assertion is what tells
you the guard was missing, because a hijacked run does not look like a failure -
it looks like a pass.

## The shape

```js
// wrong: importing this for `parseLinks` runs the report and exits
const rows = parseLinks(readFileSync(file));
report(rows);
process.exit(rows.length ? 0 : 2);

// right: the module is a library; the CLI is one guarded branch
export function parseLinks(text) { /* ... */ }
const isMain = process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) { /* read, report, exit */ }
```

`realpathSync` on both sides, not a string compare: a symlinked bin, a
`/mnt/c` path and a `file://` URL are the same file spelled three ways, and a
naive comparison silently decides the module is a library forever.

## The half that catches it

**A verdict derived from an ABSENCE cannot tell "fine" from "never ran".** So a
harness asserts its run PRODUCED its summary line before interpreting it, and a
mutation control asserts the mutation LANDED (a checksum, a byte count) before
believing that it survived.

That is not a new lesson here - it is the fourth instance in
[`a-diagnostic-that-truncates-what-it-compares.md`](a-diagnostic-that-truncates-what-it-compares.md),
and it fired again the next week from a new direction. The recurrence IS the
finding: this class does not get caught by remembering it.

## When to Apply

- Writing any script under `scripts/` - decide library-or-CLI on the first line
- Importing anything from `scripts/` for a helper
- Any harness whose verdict comes from output NOT appearing
- A controls run that reports everything behaving on the first try

## Related

- [`a-diagnostic-that-truncates-what-it-compares.md`](a-diagnostic-that-truncates-what-it-compares.md)
  - the family, and the running table of instances.
- [`a-second-published-artifact-needs-its-own-gate.md`](a-second-published-artifact-needs-its-own-gate.md)
  § "Write the matcher against the ARTIFACT" - the same failure from the
  authoring side.
