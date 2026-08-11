# A Locale Page Whose Body Is Not Translated Is a Duplicate, Not a Partial Page

**Scope**: `src/i18n/locales.ts`, the route table, and every emitted document.
**Origin**: 2026-08-11, planning nine new app languages and two new page languages.

## Core Rule

**A language gets a fully written page, or it gets no page. There is no third
option, and the middle one — our chrome in their language over our article in
ours — is the exact thing Google's documentation names.**

From <https://developers.google.com/search/docs/specialty/international/localized-versions>:

> Localized versions of a page are only considered duplicates if the main content
> of the page remains untranslated.

And from the multi-regional guide, under things to avoid:

> Translating only the boilerplate text of your pages while keeping the bulk of
> your content in a single language.

So `/de/games/snake/` with a German header and an English body is not a smaller
German page. It is a duplicate of the English one, twenty-two times over, on a
site that currently has none of this.

## The two lists, and why the narrow one is a type

`src/i18n/locales.ts` holds both:

- **`APP_LOCALES`** — what the interface speaks. Adding one costs the translation
  of ~341 strings and **nothing else**: no route, no page, no sitemap row, no
  share card.
- **`PAGE_LOCALES`** — what has prose. `ROUTES` derives from this one.

`GameContent.copy` is `Record<PageLocale, GameCopy>` and `SITE` is
`Record<PageLocale, SiteCopy>`. So promoting a locale before its prose exists is a
**red build in all 22 content files plus site.ts** — not a lint warning, not a
convention a reviewer can miss, and not a script that can be wrong about what it
scanned.

Promotion is therefore always two commits, in this order:

```
1. write the prose into all 22 content files and site.ts
2. add the locale to PAGE_LOCALES
```

The other order fails to compile. That is the gate working, and it is worth
planting once so somebody has actually watched it happen.

## A gate that has never heard of a language must not answer for it

`src/content/voice.ts` was four `locale === "he" ? … : …` ternaries — banned
list, rule-of-three regex, contrast regex, case handling. Every one of them had
an ELSE arm, and a third language would have joined all four of them.

So Spanish prose would have been measured against the **English** tell
vocabulary. It would have found nothing, reported clean, and the page would have
shipped with none of the voice discipline the whole file exists to enforce. The
failure is not that the check is weak; it is that the check answers
**confidently** for a language nobody taught it, and a confident wrong answer is
worse than no answer because somebody stops looking.

It is now `VOICE: Record<PageLocale, VoiceRules>` — one entry per language,
holding everything this file knows about it. A language arrives with its own
rules or the build refuses it, which is the same guarantee the content files
carry and for the same reason.

The test beside it pins what a type cannot see: that two languages' banned lists
are **disjoint**. `es: VOICE.en` type-checks, runs, and is exactly the shape this
rule is about.

## The four gates that read `dist/`

The type gate proves the prose was *written*. It cannot prove the emitter then
put it in the right place, and it cannot see the artifact at all. Four checks in
`scripts/assert-pages.mjs` cover that, all reading `dist/pages.json`'s published
`locales` block rather than a second copy of the list:

| Gate | Catches | Mutation that proves it |
|---|---|---|
| stray locale directory | `dist/de/` for a language with no prose | `mkdir dist/de` → names the directory to delete |
| — its positive control | a *missing* `dist/en/`, so a broken emitter cannot pass by vacuum | `rm -rf dist/en` |
| cross-locale body difference | a content file copied to start a language and never rewritten | copy the en body onto the he page → `100%` shared |
| script sanity | a page emitted under the wrong locale's route | the same copy → `lang="he" but its prose is mostly latin` |
| hreflang reciprocity | A lists B while B never lists A | repoint one alternate → `does not link back` |

All seven mutations killed on 2026-08-11, against a real build, each cell
asserting its own mutation landed before running anything.

**Strip URLs before counting letters.** Six Hebrew letters beside one
34-character `https://ellaz.fun/games/snake/` reads as 85% Latin — the exact
shape that would misclassify a short Hebrew page as English.

**Count sentences, not words, and only sentences of five words or more.** A
game's name, a number and a nav label are identical across languages by design
and prove nothing in either direction.

**The script check is a comparison, not a threshold** — the expected script must
simply be the dominant one — so there is no tuned constant here to go stale
([`a-threshold-tuned-against-todays-tree-goes-stale.md`](a-threshold-tuned-against-todays-tree-goes-stale.md)).
The one number that does exist, the 20% shared-sentence ceiling, sits between a
measured 0% (a real translation) and 100% (a copy).

**Known limit, stated rather than discovered later:** with only `he` and `en`
live, any in-family duplication trips the script gate too, so the body-difference
gate has not yet been proven to catch something *no other gate* catches. Its unit
controls prove the mechanism; its independent value arrives with Spanish, which
is the first same-script pair.

## `/` is not in the population, and the gate said so out loud

`/` is `emitted: false` in the manifest — it is the app shell, head-enhanced in
place, not written from the route table. So the per-page loop never sees it, and
that is the identical blind spot that let `/` serve a 29-byte body to every AI
crawler for months
([`a-spa-shell-is-invisible-to-ai-crawlers.md`](a-spa-shell-is-invisible-to-ai-crawlers.md)).

It reproduced itself on the first run of the new reciprocity check, which
reported:

```
https://ellaz.fun/en/ lists https://ellaz.fun/ as an alternate,
but no emitted page has that canonical
```

`/` carried a complete, correct, reciprocal cluster the whole time. The gate
could not see it, and blamed the neighbour. **A blind spot that reports as a
defect on an adjacent page is the worst shape available** — it sends the reader
to fix something that was never broken.

When adding any gate here, ask which pages are *excluded* from its population
before asking whether its logic is right.

## Why this one had to be a type and not a script

Every other guard in this repo is a script reading `dist/` — `assert-pages`,
`assert-first-visit`, `assert-payload`, `assert-live`. The lesson of 2026-08-08 is
that such a script can be confidently wrong about what it is looking at: a
matcher that finds zero entries passes every assertion under it and prints
success. A `Record<K, V>` cannot be wrong about whether a key exists.

The strongest guarantee belongs at the strongest layer. The scripts still exist,
and they cover what the compiler cannot see — that no stray locale directory was
emitted, that no two locales' bodies are identical, that the hreflang cluster is
reciprocal.

## Why it would otherwise be invisible

Every symptom of getting this wrong points somewhere else:

| What you would see | What you would think |
|---|---|
| The page renders perfectly | it is fine |
| The build is green | it is fine |
| `assert-pages` passes the prose floor | it has enough words — they are just the wrong language's |
| The site loads in a browser | it is fine |
| Traffic arrives for two months | it is working |
| Traffic stops in month three | something else broke |

The last row is the trap. New pages get a freshness boost, then decay, then
de-index if they have not been recrawled within roughly 75 to 140 days without
engagement. **The early traffic is the boost, not success**, and a verdict taken
earlier than about ninety days is not a verdict.

## Two more rules that fall out of the same doc

- **`x-default` is English, not Hebrew.** It answers "we have no page in your
  language", and Hebrew is the wrong answer to that for everyone on earth except
  Hebrew speakers — who are matched by `hreflang="he"` long before `x-default` is
  consulted.
- **Never redirect on a guessed language.** Google says not to, and a crawler
  follows the redirect too, so every version except one becomes unreachable. The
  suggestion bar is an offer; it is dismissible and its dismissal persists.

## When to Apply

- Adding a language to `APP_LOCALES` — confirm it adds no routes.
- Adding a language to `PAGE_LOCALES` — the prose must already be committed.
- Any change to `ROUTES`, the hreflang emitter, or `assert-pages.mjs`.
- Reviewing a PR that adds a locale directory under `dist/`.

## Related

- [`game-content-template.md`](game-content-template.md) — authors write prose,
  code supplies facts, every number names its script. That rule is why a
  translated page still carries real information gain: the derived statistics
  survive translation intact.
- [`a-bot-challenge-at-the-edge-is-invisible-from-your-browser.md`](a-bot-challenge-at-the-edge-is-invisible-from-your-browser.md)
  — the other half of this subject. That one is a site that is perfect on disk and
  unreachable to crawlers; this one is a site that is reachable and duplicated.
  Both are invisible from the vantage point you naturally check from.
- [`a-deploy-ledger-that-can-disagree-with-the-disk.md`](a-deploy-ledger-that-can-disagree-with-the-disk.md)
  — why the strongest guarantee goes at the strongest layer.
- Skill `seo-aeo-geo` — the general version of all of this, for the next site.
