---
paths: "**/content/**,**/build/**"
---

# Game Pages - Authors Write Prose, Code Supplies Facts, Every Number Names Its Script

**Scope**: Every file under `src/content/`, and any new game page.
**Origin**: 2026-08-03, after auditing our own first draft and finding it accurate, unpadded, free of stock connectors, and still machine-sounding.

## Core Rule

A page author writes **prose**. They never write a **fact about the game**, and they
never write a **number they did not derive**.

```ts
// src/content/games/<id>.ts
export const memory: GameContent = {
  id: "memory",
  he: { lede, body, howToPlay, tips, teaches, ages, accessibility, together, faq, keywords },
  en: { /* written NATIVELY, not translated */ },
  provenance: [{ claim: "easy 9.2 moves with perfect recall", source: "scripts/sim/memory-moves.mjs" }],
};
```

Everything a page could get **wrong** about the game is read at render time instead of
typed: the difficulty tiers and their labels from the game's own `DifficultySelector`
options, what the record measures from `sdk/score.ts`, the title and age band from
`meta.ts`, and the platform facts (free, no ads, no account, works offline) from one
shared place. A writer cannot claim something the game does not do, because they are
not the one saying it.

`content.test.ts` and `voice.ts` enforce the rest.

## The three things that actually make it sound human

Vocabulary is not the problem. Our failing draft had zero stock connectors. The
measured defect was **uniformity**: five body paragraphs of 57, 53, 50, 56 and 54
words, a spread of 5%, where human prose runs 30 to 60.

1. **Break the rhythm.** At least one paragraph well under 30 words and one well over
   70. At least three sentences under six words in the body. Fragments are allowed.
   "That is it." is a sentence.
2. **One admission per page.** Name a real limit: the hard level frustrates a
   four-year-old, do not start there. Nothing reads more human than a stated limit,
   and it is also literally the Experience in Google's E-E-A-T.
3. **One number nobody else has.** Derived, never invented. See below.

The gate measures all three except whether the admission is true.

## Statistics: derive them, and say where from

GEO research (arXiv:2311.09735) found that adding statistics is one of the two biggest
levers for being quoted by an answer engine. `no-mock-data` forbids inventing one. Both
hold because **a game is a system you can measure**.

Every quoted figure needs a `provenance` row naming a repo-relative script, and
`content.test.ts` asserts the file exists. A statistic you cannot re-derive is a
fabrication with a decimal point in it.

The first draft of the memory page said *"ten pairs in under twenty-eight moves is
already something"*. Nothing produced that number. `scripts/sim/memory-moves.mjs`
replaced it with 15.6, from 20,000 simulated games on the boards the game actually
ships, parsed out of `Memory.tsx` so the script fails loudly if a difficulty changes.

Every game gets one. Sudoku: solve-time distribution by level. Minesweeper: what
fraction of boards are solvable without a guess. Snake: the length at which the board
becomes the enemy. It is the only part of the page that is genuinely ours, so it is
also the most quotable.

## A new game arrives in every language or it does not arrive

Step 6 of the add-a-game recipe is one content file **per `PAGE_LOCALES`**, and
nothing about that is a convention somebody has to remember. Proven by planting
a game in the roster with a `he|en` title and no content file at all:

```
tsc                Property 'es' is missing in type '{ he: string; en: string; }'
                   ... src/games/probegame/meta.ts(6,3)
content.test.ts    games in the catalog with no page: probegame
```

Two gates, two shapes. The compiler catches a game whose *strings* are short a
language and names the line; the test catches a game whose *page* is missing and
names the game. Neither can be satisfied halfway, so there is no state where a
game is live in two languages and pending in the third.

**The cost of a new language, per game, is one `es:` arm** — everything else
(routes, sitemap, hreflang, share card, chunk, the picker) derives.

## Never translate. Write it twice.

`en` is not `he` in English. A translation carries the source language's rhythm, and
that rhythm is exactly what reads as machine-made. The two pages may use different
examples, a different opener and a different joke. Same facts.

`content.test.ts` flags the cheapest symptom (both languages with the same paragraph
lengths to within a word). It cannot detect a good translation, and it does not try.

## What the gate cannot see

Three things, permanently, and they are the three that matter most:

- whether the admission is **true**
- whether the statistic was **derived or invented** (provenance proves a script exists,
  not that it produced that number)
- whether it **sounds like us**

Those are the operator's read, which is why three pilots ship before the other
eighteen. A voice problem found on page 3 costs three pages. Found on page 21 it costs
twenty-one.

## The gate bites its author

While writing the rewrite this rule came from, I broke the one-rule-of-three limit
**three times in one file** while actively trying to follow it, and could not see any
of them by reading. That is the entire argument for mechanising it. Run
`npx vitest run src/content/` before believing your own copy.

## When to Apply

- Adding a game page, or editing one.
- Reviewing a content PR: run the gate, then read the After column yourself for the
  three things it cannot see.
- Loosening a threshold in `voice.ts` - that is a decision, and `voice.test.ts` pins
  the numbers so it shows up as a diff rather than a quiet edit.

## Related

- [`score-contract-convention.md`](score-contract-convention.md) - the same
  report-what-happened shape, one layer down.
- [`rewards-economy-convention.md`](rewards-economy-convention.md) - games report
  reasons, `economy.ts` decides amounts. Same idea: the author does not get to invent
  the consequential number.
- Research report: `~/.claude/reports/research-human-voice-hebrew-english-seo-aeo-geo-2026-08-03.md`
