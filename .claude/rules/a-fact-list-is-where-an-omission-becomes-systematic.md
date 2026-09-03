# A List of What to Include Is Where an Omission Stops Being a Mistake and Becomes a Policy

**Scope**: Every place in this repo where one list generates many artifacts - the
"facts used, and only these" header in `docs/outreach/places-posts.md`, a copy sheet a
door package is assembled from, a template a page kind is emitted through.
**Origin**: 2026-09-03. The dev.to article published naming `ellaz.fun` twice and
linking to it zero times. The instance was one missing `https://`. The class was a fact
list six other drafts had also been written from.

## Core Rule

**When one list is the source for many artifacts, an item missing from the list is
missing from every artifact, identically and confidently. That does not look like an
error in any single one of them - each reads as a deliberate, consistent choice - so it
survives every review that reads one artifact at a time. Check the LIST against what the
artifacts must contain, and then make the check a gate, because the list is prose and
prose is exactly what already failed.**

## What it looked like

```
docs/outreach/places-posts.md, the header:

  Facts used, and only these: 42 games, four languages, no ads,
  no accounts, plays offline as a PWA, MIT source at
  `github.com/Sigmafier/ellaz`.
                    ^ the repository
                    ^ and never the site

so, faithfully, in eight drafts:

  LinkedIn        "Ellaz, a free browser games site ... MIT-licensed at
                   github.com/Sigmafier/ellaz"          <- no address
  Hashnode        "... Code's MIT: github.com/Sigmafier/ellaz."   <- no address
  Bluesky         "... MIT source: github.com/Sigmafier/ellaz"    <- no address
  Made with Phaser, YouTube, Indie Hackers               <- no address
  Armor Games     "here's the game: [link to the built standalone bundle]"
                                     ^ an unfilled placeholder, one ACK from
                                       being emailed to a named person
```

Nine drafts, written from scratch, no two sharing a sentence, each with the destination's
rules read and quoted above it. Every one of them careful. Every one of them missing the
address, because the thing they were all written from was missing the address.

## Why reading one artifact cannot find it

A post that names the product and links the source is not obviously wrong. It is only
wrong against a fact nobody wrote down: *a reader must be able to reach the thing*. The
absence has no line number, no diff, and no odd-looking neighbour to compare against -
its neighbours all agree with it, which is the whole mechanism.

**And the more disciplined the generation, the worse it is.** The header's own promise -
"and only these" - is what guaranteed the omission propagated cleanly instead of one
author accidentally getting it right.

## What to do

- **Fix the list, then sweep the artifacts, in that order.** Fixing only the instance
  leaves the next artifact written from the same list carrying the same hole.
- **Then write the gate, because the list is prose.** `assert-outreach.mjs` now reads
  every quoted draft body out of `places-posts.md` - the population comes from the FILE,
  never from a hand-kept list of place names, so a place added tomorrow is in scope
  without anyone remembering.
- **An exemption states its reason and dangles loudly.** "No address" is right for some
  doors: Y8's draft is a question about whether the SDK is mandatory, and a URL inside a
  docs question is the promotion it would be. That is a decision on the record, not an
  omission - and an exemption naming a section that no longer exists reds, the same way
  `WATCHED` in `scripts/reach/backlinks.mjs` is checked in both directions.
- **Plant the defect.** On the day this gate was written every draft already carried the
  address, so a green run proved only that the corpus was clean. Stripping the address
  from one draft, renaming an exempt section, and feeding a file with no drafts are the
  three controls that make the green mean something.

## The sweep's own instrument was wrong twice first

A heuristic that fell back to a section's prose when it found no quoted lines reported
six false positives; and Y8 and Armor Games came back clean on a matcher that had simply
not looked at their bodies. **Every hit was opened.** Then the DANGLE control printed
FAIL: it renamed `## Y8 (forum` to `## Y8-was-renamed (forum`, which still
`startsWith("Y8")`, so the exemption was never dangling and the control measured nothing.
It is asserted now to actually clear the prefix. Three instrument errors in one twenty
minute pass, which is the ordinary rate.

## When to Apply

- Editing any "facts used" / "fields to fill" / "what every X must carry" list
- Writing a second artifact from a template that already produced one
- A defect found in one generated artifact - ask what generated it before fixing it
- Reviewing a set of files that are all careful and all agree with each other

## The tell

You just fixed something in one artifact, and the artifact was produced from a list.

## Related

- [`a-path-filter-is-a-hand-kept-mirror-of-an-import-graph.md`](a-path-filter-is-a-hand-kept-mirror-of-an-import-graph.md)
  - the same hand-kept-mirror shape, checked in both directions for the same reason.
- [`a-diagnostic-that-truncates-what-it-compares.md`](a-diagnostic-that-truncates-what-it-compares.md)
  - the family the three instrument errors above belong to.
- [`a-step-between-a-handover-and-the-button-is-skipped.md`](a-step-between-a-handover-and-the-button-is-skipped.md)
  - the other way a correct procedure produces a wrong artifact.
- [`a-comment-that-explains-a-cost-must-name-its-measurement.md`](a-comment-that-explains-a-cost-must-name-its-measurement.md)
  § the SCOPE WORD - prose standing in for a check.

---

**Last Updated**: 2026-09-03 (origin)
