# Outreach and backlinks audit

**Run**: 2026-08-18, against clean `HEAD` `1e219fe` with `npm run build` output in `dist/`.
**Re-run it**: `npm run assert:outreach` for the mechanised half, and read § What is not
mechanised for the rest.

---

## The finding, in one line

**Every draft in this folder had gone stale in six days, and nothing in the repository
could see it** - because `docs/outreach/` is the only place here where a number about this
site is written by hand, and the only place whose contents are meant to leave the
repository and be read by strangers.

57 wrong figures across all eight files. The sitemap, `llms.txt` and the emitted home were
correct throughout, because they read the roster. These files do not.

## Why this folder and not the rest

This repo already decided the principle: **authors write prose, code supplies facts**
([`game-content-template.md`](../../.claude/rules/game-content-template.md)). Every page
under `src/content/` carries a `provenance` row per figure and `content.test.ts` checks
the deriving script still exists. Every emitted surface derives from `PAGE_LOCALES` and
the roster.

The outreach drafts have the provenance column and nothing that reads it. <!-- outreach-facts:off -->
They were
written on 2026-08-11 and 2026-08-12 against a tree with 23 games; ten more landed in the
week that followed, French was promoted, and the payload ceiling was raised.
<!-- outreach-facts:on --> The drafts
did not move, and they had no reason to: no gate, no test and no build step opens them.

That would be a documentation problem anywhere else. Here it is a publishing problem.
[`launch.md`](launch.md) says it itself - a Show HN happens once, a Product Hunt launch
happens once, a pull request into somebody else's list is read by a maintainer who checks.
**A stale figure in this folder is not corrected by editing this folder.**

<!-- outreach-facts:off -->
## What was wrong

Measured, then fixed, in this change:

| Claim | Drafts said | The tree says | Where it came from |
|---|---|---|---|
| games | 23 | **33** | `src/portal/games.ts` roster and `src/portal/catalog.ts` loaders, both 33 |
| games, spelled out | Twenty-three | **Thirty-three** | the same |
| games for young children | 16 | **24** | `ageBand: "kids"` across `src/games/*/meta.ts` |
| emitted pages | 52 | **144** | 4 page locales x (33 games + home + world + boards); `dist/sitemap.xml` lists 144 |
| page locales | 2 | **4** | `PAGE_LOCALES` - French was promoted 2026-08-16 |
| first visit | 88,234 B gz | **90,027 B gz** | `node scripts/assert-payload.mjs` |
| payload ceiling | 90,000 | **90,500** | `CEILING` in `scripts/assert-payload.mjs` |
| room left | 1,766 B | **473 B** | ceiling minus first visit |
| sudoku standalone | 224 KB | **226 KB** | `dist-standalone/sudoku` summed |
| 2048 standalone | 204 KB | **207 KB** | `dist-standalone/2048` summed |
| locale chunks | ~1.3 KB gz | **~1.5 KB gz** | `gzip -c dist/assets/locale-*.js` |
| sudoku levels, in one table | four difficulty tiers | **six** | `LEVEL_OPTIONS` in `Sudoku.tsx` - and the same file's provenance row already said six, so it contradicted itself |
| the Phaser importer | `src/games/snake/SnakeGame.tsx` | **`src/games/snake/SnakeScene.ts`** | a provenance row naming a file that does not exist |

The last two are the ones worth pausing on. Neither is a number that drifted; both were
**wrong when written**, in a column whose whole purpose is to make a claim checkable, and
both survived because nobody re-ran the check the column names.

## The claim that flipped from true to false

**"under 90 KB"** appears nine times across three drafts. It was true at 88,234 B gz. The
first visit is 90,027 B gz, so on the decimal reading the sentence is now false - by 27
bytes, in the most-repeated sentence in the folder.

**A numeric matcher cannot see this**, which is why the gate treats it separately: the
number in the sentence is the threshold, not the measurement, and it did not change. Only
the world did. The copy now says *about 90 KB*, which is accurate at 90,027 and does not
re-break on the next 200 bytes.
<!-- outreach-facts:on -->

## What held

An audit that only reports failures is not one. Re-measured on the same build, unchanged:

- **Phaser is 379,855 B gz** - the same digit for digit as on 2026-08-12.
- **Exactly one file imports it**: `grep -rln 'from "phaser"' src/` returns `SnakeScene.ts`.
- **Snake's standalone bundle is 1.9 MB**, and sudoku is still about nine times smaller.
- **Six sudoku levels** across three board sizes.
- **11 interface languages**, 9 of them lazy chunks.
- **MIT**, with a real `LICENSE` at the root - the PR bodies claim it and it is true.
- **The `awesome-pwa` patch still applies as written**: `Cybercar` is still line 168 and
  `Falling Nikochan` line 169, and `Ellaz` still sorts between them.

## The two pull-request targets, re-measured today

[`dev.md`](dev.md)'s method - rank candidate lists by **merge recency**, not by stars -
holds up, and both verdicts survive a week:

| | awesome-pwa | awesome-phaser |
|---|---|---|
| Last merge | 2026-08-10, a batch of **9** | **2025-04-14**, unchanged |
| The batch before | 2026-08-01, a batch of **11** | 2024-07-10 |
| Dormant for | 8 days | **16 months** |
| Verdict | still the one to open | still skip |

Two things that changed and are worth knowing before opening it:

- **PR #441, a Games and Entertainment addition, is still unmerged** since 2026-07-14 -
  now ~35 days, across two batches that merged other sections. The caveat `dev.md` raised
  as one data point is now two. Do not read "merges within the day" as a promise for this
  section.
- **A direct positioning collision landed in that section**: `Play Park (harborplay.us)`
  is described as *"Free family games - trivia, word puzzles, memory match, and more. No
  account, no ads."* Our drafted entry leads on the same two negatives. It should lead on
  what that entry cannot say - Hebrew and RTL, offline, and a roster built for young
  children.

## Live surfaces outside this repo that are also stale

The drafts are not published, so nothing wrong there reached anybody. **One thing has**:

- **The GitHub repository description** reads *"Free browser games for kids, in Hebrew and
  English."* The site has four written languages and eleven interface languages, and 9 of
  the 33 games are `ageBand: "all"` rather than kids. It is the About box on the page every
  outreach link points at, it is public now, and no gate here can reach it.
  Homepage, topics and licence on that repo are all correct.

## What is not mechanised, and what could not be verified at all

**Not mechanised** - these still need a person, and the gate says nothing about them:

- Whether a draft's prose is still *true* in ways that are not a number: the tone, the
  claims about what a game feels like, the argument in the dev.to article.
- Dates in the provenance columns. They are prose; nothing checks that a row dated
  2026-08-18 was actually re-derived today.
- Anything measured about a destination rather than about us - the Reddit shells, the
  Poki and CrazyGames client-rendered pages, the Show HN guidelines. Those were fetched
  once, on 2026-08-11 and 2026-08-12, and none of them was re-fetched here.

**Could not be verified from this session, at all:**

- **Inbound links.** There is no backlink data here - no Search Console, no third-party
  index, and nothing in the repo records one. This audit therefore says nothing about how
  many sites link to ellaz.fun, or whether any of the earlier outreach produced a link.
  It audits the *claims we are about to make*, not the links we have.
- **Anything over the network.** Egress to `ellaz.fun` is refused by this environment's
  network policy (the proxy answers 403 to CONNECT), so `npm run assert:crawlable` and
  `npm run assert:live` could not run. Every figure above comes from the tree and from a
  local build. **The live site was not observed.** In a repo whose sharpest lesson is that
  every gate reads `dist/` and none reads what a visitor receives, that limitation is the
  one to hold on to: re-run `assert:crawlable` from somewhere with egress before treating
  any of this as a statement about the live site.

## The mechanism

`npm run assert:outreach` derives the facts, scans every draft, and reports drift. It is
**not in `build:check`**, on purpose - same placement as `assert:standalone`, which guards
an artifact published by hand. Wiring it into the build would red every lane that adds a
game until somebody edited eight markdown files, and a gate that reds on work it is not
about is a gate people learn to skip
([`a-gate-that-reds-on-day-one-teaches-you-to-ignore-it.md`](../../.claude/rules/a-gate-that-reds-on-day-one-teaches-you-to-ignore-it.md)).
`--fix` exists so the correction costs one command rather than eight files.

Three properties are load-bearing:

**The positive control is the point.** Each claim declares `minHits`, and a matcher that
finds fewer occurrences than the corpus is known to contain FAILS as `BLIND` rather than
passing. A pattern that silently stops matching - because a draft was rephrased, or a
language was added - reports a clean sweep over prose it never read, which is
[`a-diagnostic-that-truncates-what-it-compares.md`](../../.claude/rules/a-diagnostic-that-truncates-what-it-compares.md)
exactly. <!-- outreach-facts:off -->
That control has already earned itself twice here: the first version of the
matcher could not see `measured 88,234 on <date>` in three provenance rows, and could not
see `one game out of 23` in three more.
<!-- outreach-facts:on -->

**Hebrew is in the population.** `press.md` carries a Hebrew press letter and `hebrew.md`
two Hebrew posts, all quoting the counts. An English-only matcher reports the folder clean
while the one document written for a journalist stays wrong - the same shape as the
`LOCALES` literal in `content.test.ts` that ran zero Spanish pages through the voice gate.

**`--fix` cannot tell a claim from a history.** `press.md` recounts that its own payload
figure moved and names both the old number and the new one; the auto-fix rewrote the
history into a sentence contradicting itself. That paragraph is now wrapped in
`<!-- outreach-facts:off -->`, and the number of exempted regions is printed on every run,
because an exemption that could be applied quietly is a way to make the gate pass by
deleting its job.

<!-- outreach-facts:off -->
`node scripts/assert-outreach.mjs --control` runs six controls: a fixed corpus is clean, a
planted wrong count is caught, a rephrased corpus reports BLIND, and the `under 90 KB`
predicate answers **both ways** against a literal fixture - FALSE at 90,027 B gz and clean
at 89,000. The last pair matters: a control that only ever produces the failing reading
cannot tell a working predicate from one wired to a constant.
<!-- outreach-facts:on -->

## Before anything in this folder is published

1. `npm run build && npm run assert:outreach` - must print `OK`.
2. `npm run assert:crawlable` from a machine with network egress.
3. Re-read the destination's own rules; the ones recorded here are a week old.
4. Fix the GitHub repository description, since it is the About box beside every link.
