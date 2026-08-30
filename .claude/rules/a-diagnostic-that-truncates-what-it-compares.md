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
| 2026-08-13 FTP liveness probe | `exec 3<>/dev/tcp/host/21 && head -c 120 <&3` under a 12 s timeout | the BANNER, not the connection. A slow greeting read as a dead port, and I reported "Hostinger's FTP is down, verified from my machine". A connect-only check succeeded on its FIRST attempt seconds later |
| 2026-08-14 holdem purity gate | `/^\s*\/\/.*$/gm` to strip comments before scanning for banned imports | every comment NOT at the start of a line. `export const X = 1; // sent over the WebSocket` fired the gate on the word in its own comment. A false POSITIVE, so it announced itself — the same regex pointed the other way is a purity gate that silently stops checking |
| 2026-08-21 CLS attribution | three arms with the offer, then two without | the ORDER. The offer arms read 0.28 and the controls 0.003, which is damning and false: interleaved, an `en-US` arm with no offer read **0.283**. The shift is the game mounting; it predates the change entirely. A differential whose arms are not interleaved measures the arm order as much as the arm |
| 2026-08-23 reach board copy probe | a mutation from `textContent` to `innerHTML` | **nothing - and that was the finding.** Not one of the seven real posts contains `&`, `<` or `>`; only `"`, which a text node serialises back UNESCAPED. So the escaping bug and the correct code copied identical bytes and the probe reported green. It plants a control post carrying `Tom & Jerry <b>bold</b>` now, and the same mutation reds on two assertions |
| 2026-08-21 doctrine step re-file | a listing printed with `[:1800]` | the last two steps of the routine. I re-filed against that listing, minted an explicit id it said was free, and **overwrote a step that already held it**. Restored from git. A stale read is bad; a read your own instrument truncated is worse, because nothing about it looks partial |
| 2026-08-23 build:check verdict | `npm run build:check 2>&1 \| tail -14` | **the exit code.** A pipeline's status is its LAST stage, so the harness recorded `tail` succeeding and printed `[exited with code 0]` directly beneath a line reading `FAIL  no locale-*.js chunks`. A gate that says FAIL beside exit 0 reads as a broken gate, and I nearly filed one - the gate was right, the pipe was lying. (The FAIL itself was a second measurement error: that build read `src/build/layout.ts` while I was still editing it.) `set -o pipefail`, or do not pipe a gate |
| 2026-08-30 prospect `freshness` | the FIRST structured date in the document | the `article:modified_time` three tags later. `weareteachers.com` - 208 dofollow anchors, one of the largest US teacher publications - was ruled **dormant** on a 2023 published date while the page had been modified **2026-07-28** |
| 2026-08-30 prospect `door` | `/about\|/contact` matched on ANY host | whose page it was. weareteachers' door came back as a page on **`nature.org`**: a real URL, a real 200, a real About page, and a letter about our children's games addressed to a conservation charity |
| 2026-08-30 prospect `get()` | `res.ok`, which is true for **202** | the page. Three library sites answered `HTTP 202` with a ~2 KB AWS WAF challenge - well-formed, `</html>` present, empty `<title>`, zero anchors - and all three were reported `blind`, a word this repo's own docs define as *"says nothing about the page"* and which prints in the same column as a real reading |
| 2026-08-30 backlinks `resolve1` | an `expected` row returned unchanged, whatever the fetch said | **every positive reading.** The instrument built to read the 2026-11-27 verdict could report a failure and not a success - fed a page carrying our link, an `expected` row still resolved to `expected`. Eighty-nine days early, and it would have read `expected` on the day whether or not a single editor had published us |
| 2026-08-30 prospect control's FAIL path | `c.bad.map(([k, v]) => ...)` on an array of OBJECTS | the entire message. It threw `object is not iterable`, losing the field name, losing the "believe nothing" sentence, and exiting **1** (*no candidates*) instead of **2** (*believe nothing*). The one path that exists to explain a broken instrument had never once been run |

**The frozen `resolve1` is the family's limit case, and worth separating from the
rest.** Every other row is an instrument that gave a wrong answer. This one was
incapable of giving the right one: not a matcher that missed, a branch that
returned the input. So there is no input that could have exposed it and no run
that would have looked wrong - it was only ever going to be found by asking, of
an instrument nobody had watched succeed, **what a success would look like**.

Ask it of anything you are about to depend on months from now: *what does this
print on the day it works?* If you cannot answer from the code, you do not have
an instrument, you have a thing that says no.

**The 2026-08-30 four share a shape the earlier ones do not: every one of them
produced a NON-VERDICT.** `dormant`, `blind`, `unchecked`, a crash - none of which
anybody argues with, because none of them claims anything. That is exactly why they
are dangerous: a wrong `TAKE` gets a letter written to it and is discovered, while a
wrong `dormant` retires a destination in silence and the run still reads healthy. So
the states that mean "nothing here" need controls at least as much as the states that
mean something, and a control on a null result has to pin a REAL destination that must
keep returning it.

**And a control's description is not the control.** `freetech4teachers.com` was written
up in `prospects.md` as the dormancy control - *"ruled out 2026-08-29, last post
2023-08-23"* - while the recorded output of the previous run says the script reported
`blind` on it, `ext=0`, `fresh=None`. It had never tested dormancy. Nobody noticed
because a control that is passing is a control nobody opens, and the only reason it
surfaced is that a fix changed its state. Read what a control PRINTED, not what the
file says it does.

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

The fifth adds the variant that reaches the OPERATOR rather than a log: **a probe measures a
weaker claim than the sentence you report.** "The TCP connection was accepted" and "the
service answered" are two different measurements, and only one of them was taken — but the
report said the stronger one, with the word *verified* attached. Ask of any liveness claim
which of the two you actually observed, and if the answer is "the probe timed out", the
honest report is "no answer within N seconds", never "it is down".

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
