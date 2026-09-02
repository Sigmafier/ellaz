# A Contrast Floor Is a FLOOR, and the Ink Is the Wrong End to Fix

**Scope**: Every filled control in this app that carries a label - the primary button,
a selected chip, a filter pill, a badge with a word in it.
**Origin**: 2026-09-02. The operator, shown the report sheet's mock beside the build that
shipped: *"the mock is better it has better colors."* They were right about the look, the
mock was the one under the WCAG floor, and the shipped build was the compliant one. Both
sentences are true and neither is the answer.

## Core Rule

**Clearing 4.5:1 is what stops a label being invisible. It is not what makes the control
look like a control, and a screen can be rejected on sight while every ratio on it
passes. When a bright brand fill will not carry a white label, DARKEN THE FILL - do not
darken the ink. Reaching for the dark ink is what produces highlighter-pen UI: it
measures fine and reads as a marker swipe.**

## The before/after, measured on the built artifact at 390px

Two arms built from one tree, served side by side on 5176 and 5177, shot through the same
harness, sampled from the rendered PNG - not read off the CSS:

```
BEFORE  --brand-fill + --text          AFTER  --brand-strong + --on-brand

  [ Cancel ]  [   Send   ]               [ Cancel ]  [   Send   ]
              hot pink #ff4d8d                       raspberry #c2185b
              near-black label                       white label
              5.37:1  passes                         5.87:1  passes
              reads as a highlighter                 reads as a button
```

Same fill hue, same size, same everything else. The only source change is which token
pair the label uses.

## The four-cell table that settles it

The two arms of the argument each fail in the theme the other one passes, and nobody had
looked at both:

```
                                       market   night
  the MOCK    #fff       on --brand      3.14 X   4.86 ok
  SHIPPED     --text     on --brand-fill 5.37 ok  2.53 X
  the FIX     --on-brand on --brand-strong 5.87 ok 4.86 ok
```

Night is one tap away on Home (`Home.tsx` day/night pill), so the failing half was never
hypothetical.

## The gradient is not a colour, and that is why no ink saved it

Night's `--brand-fill` is `linear-gradient(180deg, --brand-2, --brand)`. **A gradient has
no contrast ratio - it has a worst stop.** Measured on a rendered 52px button:

```
  ink            light stop #a29bfe   dark stop #6c5ce7
  --on-brand              2.43                4.86
  --text                  2.25                4.51
```

**No ink clears 4.5 across it.** So the answer was never "pick a better label colour"; it
was that text must not sit on that token at all. `--brand-strong` is flat for exactly that
reason, and `contrast.test.ts` now asserts the gradient CANNOT carry a label - an
assertion that reds the day somebody flattens it, at which point it should be deleted
rather than widened.

## Why the suite was green over it

There was a contrast test. It had 70 assertions. It missed this twice over:

1. **It used the 3:1 floor for text.** `on-brand label on the brand fill` asserted
   `>= 3` - the floor for a UI component or a graphic, not for a label. It passed at
   3.14, which is the number that fails.
2. **It asserted a pair nothing rendered.** The test names `(--on-brand, --brand)`. What
   `Button`, `ReportSheet` and `Lab` all shipped is `(--text, --brand-fill)`, which the
   test never mentions. **A contrast suite built from a hand-kept list of token pairs
   measures the list, not the app** - the same shape as
   [`a-path-filter-is-a-hand-kept-mirror-of-an-import-graph.md`](a-path-filter-is-a-hand-kept-mirror-of-an-import-graph.md).

## The instrument needed three tries, which is the rule's own subject

Sampling the rendered button went wrong twice before it went right, and both wrong
answers were confident and plausible:

| attempt | what it did | what it reported |
|---|---|---|
| 1 | branched on a luminance threshold to guess dark-vs-light ink | the FILL, as the ink: 1.00:1 |
| 2 | took the ink from the whole screen row | the cream CARD beside the button, as a white label on pink: 3.14 for an arm whose label is black |
| 3 | bounding box of the fill, middle 40% band, inside the corners | 5.37 / 5.87, and the ink colours are the ones in the source |

Attempt 2 is the one worth remembering: it produced **the right number attached to the
wrong arm**, which is far more dangerous than an obvious error. `.claude/rules/`
already collects this family - see
[`a-diagnostic-that-truncates-what-it-compares.md`](a-diagnostic-that-truncates-what-it-compares.md);
this is "measuring the wrong element" from the global contrast law, in our own probe.

## Still open, deliberately not fixed here

`--on-brand on --brand` is **3.14 in market** and it ships today in `ShareSheet`'s primary
button and two `Boards` labels. That is a pre-existing defect this session found and did
not cause, so it is pinned by a named test rather than silently changed - fixing those
call sites to `--brand-strong` REDS that pin, which is the signal to delete it.

## When to Apply

- Adding or restyling any filled control that carries a word
- Reviewing a diff where a label's colour token is `--text` on a brand fill
- Any operator reaction of "the colours are better in X" - measure both, in both themes,
  before agreeing or disagreeing
- Writing a contrast assertion: name the pair the COMPONENT declares

## The tell

A "primary" button whose label colour is the same token as body text. Primary fills are
chosen against an on-colour; if the ink token did not move, nobody checked.

## Related

- [`a-comment-that-explains-a-cost-must-name-its-measurement.md`](a-comment-that-explains-a-cost-must-name-its-measurement.md)
  - the tokens now carry their two arms and the date, for exactly that reason.
- [`a-build-gate-that-never-runs-the-artifact.md`](a-build-gate-that-never-runs-the-artifact.md)
  - the before/after here is two real builds in a real browser, not a static read.
- `~/.claude/rules/quality/always-measure-contrast-against-the-real-surface.md` - the
  operator law this sits under; § 3.2 of skill `ui-ux-best-practices` carries the general
  form of this lesson.

---

**Last Updated**: 2026-09-02 (origin)
