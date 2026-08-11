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
