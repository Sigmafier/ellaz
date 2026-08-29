---
paths: "**/build/**,**/portal/**,**/scripts/**"
---

# A Proxy for "Which Page Is This" Stops Discriminating the Moment the Type Grows

**Scope**: `src/build/routes.ts`'s `PageKind` and `Route`, and every place that answers "which page is this" without reading the route table.
**Origin**: 2026-08-21, adding `kind: "category"`. Four defects in one change, all the same shape, three of them caught by gates and one of them not.

## Core Rule

**Nothing may identify a page by a PROXY for its identity — a path regex, a
filename built from two fields, a list of discriminators — because every proxy
is chosen against the route kinds that exist that day and stops discriminating
the moment a new one arrives. Key on the route table, or on something the route
type cannot outgrow. And when the proxy is wrong it does not throw: it produces
a valid artifact describing a different page.**

## The four instances

Two of them are *this* rule's own recurrence: the sibling-lookup bug had already
happened once, and the comment four lines above the buggy line described it.

| The proxy | What it could not tell apart | What it produced |
|---|---|---|
| `/(^|\/)games\//` in `build.test.ts` | `/games/snake/` from `/games/kids/` | a document held to the app-shell rules, failing for a reason unrelated to what was wrong |
| `route.kind` + `route.id` in `ogImageFile` | five category pages from each other | one valid PNG, of the wrong group, on four pages in five |
| `o.kind === r.kind && o.id === r.id` in `siteFiles.ts` | five category pages from each other | 16 of 20 pages naming `kids` as their hreflang twin in every language |
| an `else` branch in `siteFiles.ts`, 2026 earlier | the boards from the room | both boards pages declaring the ROOM as their twin, for as long as the boards existed |

`undefined === undefined` is the mechanism in two of the four. A category route
carries no `id`, so a key naming `id` compares nothing against nothing, matches
every category in the locale, and `find` returns whichever comes first —
**making the first one correct by position, which is what hides it.**

## Key on what cannot fall behind

A field list has to be extended by hand each time the route type grows, and the
person growing it is by definition not thinking about a lookup three files away.

```ts
// falls behind: needs a new clause per discriminator, forever
(o) => o.kind === r.kind && o.id === r.id && o.locale === locale

// cannot: the family IS the identity, whatever fields express it
(o) => familyOf(o.path) === familyOf(r.path) && o.locale === locale
```

Same for classification: `KIND_OF.get(fileName)` off `ROUTES` cannot be wrong
about what a page is. A regex over its path always can.

**The previous fix was a lookup replacing a branch.** That stopped a new page
KIND from falling into a wrong `else`. It could not stop a new DISCRIMINATOR
from being missing from the key, which is a different failure with the same
symptom — so "we fixed this class already" was true and insufficient.

## The gate has to read the artifact nobody opens

The sitemap bug survived a gate written for hreflang defects. `assert-pages.mjs`
checked reciprocity against each page's own `<link rel="alternate">` tags, and
those were perfect throughout: **two code paths emit the same cluster, and only
the one nobody opens was wrong.**

So when one fact is stated in two artifacts, the gate compares them to each
other. Checking either one alone is checking the wrong thing, and it reads green.

Both directions need a control. A parser that returns an empty map passes every
"they agree" assertion vacuously, so the control that earns its place is the one
proving the parser can see **present** —
[`a-diagnostic-that-truncates-what-it-compares.md`](a-diagnostic-that-truncates-what-it-compares.md).

## When to Apply

- Adding a value to `PageKind`, or a field to `Route`
- Writing anything that answers "which page is this" outside `routes.ts`
- Reviewing a lookup whose key is a list of fields — ask which routes have that
  field `undefined`, and what `find` returns when they all match
- Any derived filename: ask whether two different pages can produce the same one
- Adding a gate: ask which of the artifacts stating this fact it reads, and
  whether anything reads the other

## Related

- [`a-locale-page-without-a-translated-body-is-a-duplicate.md`](a-locale-page-without-a-translated-body-is-a-duplicate.md)
  — the hreflang rules the sitemap bug broke, and the gates that cover them.
- [`a-spa-shell-is-invisible-to-ai-crawlers.md`](a-spa-shell-is-invisible-to-ai-crawlers.md)
  — the same blind-spot question one level up: ask which pages a gate's
  population EXCLUDES before asking whether its logic is right.
- [`a-diagnostic-that-truncates-what-it-compares.md`](a-diagnostic-that-truncates-what-it-compares.md)
  — an instrument that cannot represent the failure it looks for.
- `CLAUDE.md` § "Adding a page kind means finding every list that says which
  pages boot the app" — the three lists, and why they do not live together.
