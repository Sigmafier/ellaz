# A Diagnostic That Truncates the Values It Compares Reports a Contradiction

**Scope**: Any gate, assertion or probe in this repo that compares two values and prints them.
**Origin**: 2026-08-12. `assert-standalone.mjs` refused a bundle with the message *"stamped 13840666dff557ae but the tree is 13840666dff557ae; rebuild before uploading"* — two identical values, and a correct refusal.

## Core Rule

**Compare in full, print in full. When a message shortens the values it is comparing, it
can shorten away the exact part that differs — and then it reads as a contradiction and
the gate reads as broken. A gate that reads as broken gets bypassed, which costs you the
thing the gate was protecting.**

The comparison was never wrong. `assert-standalone.mjs:292` compared full values; line 293
printed `.slice(0, 16)` of each. And `buildStamp()` marks a dirty tree by appending
`-dirty` at character 41:

```js
return dirty ? `${sha}-dirty` : sha;
```

So the one thing that differed was the one thing 16 characters could not show. Trigger:
**build, then edit any file** — the most ordinary sequence there is.

## The class is wider than truncation, and this repo has now hit it three times

Every instance is an instrument that **cannot represent the difference it exists to
report**. Ask of any probe: *could this even express the failure I am looking for?*

| Instance | The instrument | What it ate |
|---|---|---|
| 2026-08-12 stamp message | `.slice(0, 16)` on both sides | the `-dirty` suffix at char 41 |
| 2026-08-11 webfont matcher | a regex written from `global.css` | minified CSS emits `@import"…;…"` — no space, semicolons inside |
| 2026-08-12 fix verification | `grep -E` with a `\1` backreference | **ugrep rejected the pattern**; the script read the parse error as "no match" and printed FIXED |
| 2026-08-13 mutation harness | a verdict read from the ABSENCE of a message | the mutated copies were named `base.mjs`/`m.mjs`, and the script only runs `main()` when `argv[1]` ends in its own basename — so node loaded them, ran **nothing**, exited 0, and six controls read as SURVIVED |

The fourth is the third one wearing a harness instead of a script, and it fired the
very next day: **when a verdict is derived from the absence of a signal, a run that
never happened is indistinguishable from a run that passed.** The guard is cheap and
positive — assert the run PRODUCED its summary line, and assert the mutation actually
landed (checksum), before interpreting anything. Both guards were added after the
false SURVIVED above, and both immediately caught real harness faults (a `|` sed
delimiter colliding with `||`, and a missing `s` prefix) that would otherwise have
read as six more false survivors.

The third is the sharpest: **a check that errors and a check that passes are
indistinguishable if you only look at whether the branch was taken.** It reported success
about something it never evaluated. It was caught only by re-running the same question in
Python, where before came back `differ=False` and after `differ=True`.

The machine-wide sibling carries two more of these — a column-aligned `printf "%-8s"` whose
padding absorbed the leading whitespace it was measuring, and the same source-vs-artifact
regex class:
`~/.claude/rules/quality/sandbox-is-only-as-real-as-its-least-scoped-output.md` § Companion.

## What to do

- **Print the operands whole.** A long error line costs nothing; a wrong one costs trust in
  the gate. If they must be shortened, show the part that DIFFERS, never a fixed prefix.
- **Prove a matcher against the artifact, in both directions** — it must fire on the real
  bytes as they are, and stop firing once the fix lands.
- **Make a probe fail loudly rather than quietly.** A pattern the tool refused, a file that
  was not found, a mutation that did not land — each must abort, not fall through to the
  "no problem found" branch.
- **Assert the mutation landed before trusting what follows.** `assert n != s`, or a byte
  count, before the gate is allowed to speak.

## When to Apply

- Writing or reviewing any gate message that prints two values
- Any verification whose verdict comes from a regex, a grep, or a substring test
- A gate that says something self-contradicting — read its source before reaching for
  `--force`, because the refusal is probably right and only the sentence is wrong

## Related

- [`a-deploy-ledger-that-can-disagree-with-the-disk.md`](a-deploy-ledger-that-can-disagree-with-the-disk.md)
  — the cold-load probe there failed the same way: a stable, confident, wrong reading that
  looked exactly like a correct one until a control forced the opposite state.
- [`a-second-published-artifact-needs-its-own-gate.md`](a-second-published-artifact-needs-its-own-gate.md)
  § "Write the matcher against the ARTIFACT" — the same lesson from the authoring side.
- [`a-threshold-tuned-against-todays-tree-goes-stale.md`](a-threshold-tuned-against-todays-tree-goes-stale.md)
  — two implementations of "how many words" agreeing until they do not.
