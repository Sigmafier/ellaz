# A Survey of Other People's Artifacts Is Not a Prediction About Yours

**Scope**: Every measurement in this repo taken on a platform we do not own, to decide
whether to spend effort on it - a `rel` count, a page-size sample, a render check, a
"do they allow X" survey.
**Origin**: 2026-08-30. Newgrounds was chosen over the alternatives largely because its
author links are dofollow. That was measured properly, with a control, and it is still
true. Our own two listings publish `rel="nofollow"`.

## Core Rule

**A survey of N artifacts belonging to other people answers "what does this platform do
for them". It does not answer "what will this platform do for us", and those are different
questions whenever the platform can treat accounts differently - which is every platform
that has ever had a spam problem. Before spending effort on the strength of a survey, say
out loud which of the two questions you measured, and treat the second as unmeasured until
your own artifact exists.**

The failure has no error and no tell. The survey is reproducible, the control fires, the
number is right. It is simply the answer to a question one step away from the one being
asked, and nothing in the method can notice that.

## What it looked like

The pre-publication measurement, which was careful:

```
9 author anchors across 6 live pages   ->  rel="noreferrer noopener"
8 platform anchors on the same page    ->  rel="nofollow"     <- the control fires
```

Written up as *"the one claim that held, and it favours this door"*. Then Snake published:

```
ours    portal/view/1049495   ->  rel="nofollow"
ours    portal/view/1049504   ->  rel="nofollow"
```

Both of ours. On a platform where, re-measured the same hour, **36 external
author-comment anchors across 16 other submissions carried zero nofollow.**

## The recovery is a cause-elimination pass, and it belongs in the same session

A contradicted survey is not a dead end; it is a narrowed question. Each candidate cause
gets a population that can rule it out, and the populations are cheap because the survey
already built the machinery:

| candidate | ruled out by |
|---|---|
| our submission is Under Judgment | 8 anchors on **6 other under-judgment submissions**, all dofollow |
| they nofollow domains they do not know | controls link to `grottosoft.com`, `morushroom.net`, `idleangler.com` |
| the anchor text is a bare URL, not a label | 9 of the 36 controls are bare URLs |

Three candidates eliminated in one pass, leaving the account - created that day - as the
only survivor. **That is a hypothesis and it is written down as one.** It could not be
confirmed: the join date and trust level were not readable from their markup, and after two
attempts at guessing selectors the right move was to stop and name the cheap future test -
re-read that one anchor in a few weeks - rather than produce a fourth confident wrong
answer about the same link.

## What to write instead

- **Name the population in the claim itself.** "Newgrounds does not nofollow author links"
  is the sentence that failed. "Newgrounds does not nofollow author links *on established
  accounts, measured across 6 pages*" would have been true, and would have made the gap
  visible before anything was published.
- **Say what would change the answer.** Account age, reputation level, submission state,
  domain history - if any of these could plausibly gate the behaviour, the survey has an
  asterisk and the asterisk goes in the sentence.
- **Re-run the survey against your own artifact the moment it exists**, in the same
  session, before writing "verified" anywhere. It costs one fetch.
- **Amend the pushed file, not the conversation.** The wrong sentence was in a committed
  document that the next session would have read as settled.

## When to Apply

- Deciding between platforms on a measured property of those platforms
- Any `rel`, header, render or policy measurement taken on pages we do not own
- Reading a past survey in this repo before acting on it - check whether its population
  included anything of ours
- Writing "verified" about a third party's behaviour toward us

## The tell

A sentence about what a platform does, whose evidence is entirely other people's pages,
in a document that is about to be used to decide what we do.

## Related

- [`a-diagnostic-that-truncates-what-it-compares.md`](a-diagnostic-that-truncates-what-it-compares.md)
  - the family. There the instrument cannot express the failure; here it expresses it
  perfectly, about a different subject.
- [`a-comment-that-explains-a-cost-must-name-its-measurement.md`](a-comment-that-explains-a-cost-must-name-its-measurement.md)
  § the SCOPE WORD - a set claim true of its members and false at the scope it stated.
  This is the same defect pointed outward.
- [`a-build-gate-that-never-runs-the-artifact.md`](a-build-gate-that-never-runs-the-artifact.md)
  - the same shape one layer in: every assertion green, about the wrong object.
