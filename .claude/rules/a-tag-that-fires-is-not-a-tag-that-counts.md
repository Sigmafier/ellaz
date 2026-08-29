---
paths: "**/analytics.ts,**/build/**,**/sdk/**"
---

# A Tag That Fires Is Not a Tag That Counts, and the Prose Beside It Is Not the Code

**Scope**: Any analytics, telemetry or measurement tag this repo emits — the GA4 tag in `src/build/analytics.ts`, the PostHog port in `src/sdk/analytics.ts`, and anything added beside them.
**Origin**: 2026-08-22. The site had carried a working Google Analytics tag on all 164 documents for two days and the property was empty, while every check in this repo passed.

## Core Rule

**A `204` from a collect endpoint means the vendor accepted the packet. It has
never meant anybody counted it. Between "the request left the browser" and "a
number appears in the tool" sit consent state, sampling, filters, modelling
thresholds and provisioning — and every one of them is invisible from the
network panel, which is the only place this repo can look.**

**And when the explanation beside the tag disagrees with the tag, the tag is
right. Read the shipped literal, never the paragraph about it.**

## What it looked like

The tag was on every emitted page, absent from the 404 and the noindex mirror,
loaded `gtag/js` with a 200 and POSTed `/g/collect` with a 204 on every view. It
wrote no cookie. Every assertion in `analytics.test.ts` and every check in
`assert-pages.mjs` passed, and all of them were correct.

The collect URL is where the answer was, and nothing here had ever read it:

```
gcs=G100            ad_storage DENIED, analytics_storage DENIED
gcd=13p3p3p3p7l1    denied by DEFAULT, and never updated
ep.client_storage=none
cid=1546109085…  then  cid=1358236254…   two loads of the SAME url
```

`gcs` is the consent state string, and `G100` is both keys denied. A GA4 hit
under denied `analytics_storage` is a cookieless consent-mode ping: raw material
for behavioural modelling rather than a counted pageview, and modelling wants
roughly a thousand events a day for a week before it yields anything. This site
gets eight clicks a month.

**It was not a mistake.** It is exactly the cookieless, ads-off, no-banner
configuration that was asked for. What nobody priced was that at this size the
configuration also means no data, ever — two constraints that cannot both hold,
which nobody had multiplied out.

## The impossible middle, and why it was proposed

The obvious repair is "grant `analytics_storage`, keep `client_storage:'none'`,
so it counts AND stays cookieless". **It cannot be had.** Measured live on
`/games/sudoku/`, with a control that wrote and read back its own cookie in the
same run so the empty reading could not be a blind probe:

| state | `_ga` cookies |
|---|---|
| as shipped (`denied`) | none |
| after `consent update` to `granted`, `client_storage:'none'` untouched | `_ga`, `_ga_E25QBB8420` |

Consent governs the cookie; `client_storage` does not win. So the trade is
binary: **no cookie and no data, or data and a consent banner** — in four
languages, in front of a five-year-old.

## The prose was the actual trap

`analytics.ts`'s own doc comment contained both answers. One bullet declared the
file ships `analytics_storage: 'granted'` and explained that `client_storage`
overrides it; another described `'denied'`. They sat forty lines apart, on the
single question that decides whether anything reports, and the shipped literal
agreed with only one of them.

A reader could open that comment and leave with either answer, confidently. One
did — and put the impossible middle in front of the operator before reading the
whole file.

**`analytics.test.ts` now reads its own source** and fails when a doc bullet
declares a consent state the tag does not ship, when the granting-writes-a-cookie
fact goes missing, or when the shipped literal cannot be read at all (the
positive control — without it every assertion passes vacuously). Three
mutations, three killed, each checksum-verified to have landed.

Nothing else could have caught it: every other assertion reads the RENDERED tag,
and the tag was correct the whole time.

## The second failure, which no consent setting fixes

Nothing outside `src/build/analytics.ts` ever calls `gtag`, so GA sees
`page_view` and nothing else. Every game event — `levelStart`, `levelComplete`,
`reward_grant` — goes through `src/sdk/analytics.ts` to PostHog, and
`VITE_POSTHOG_KEY` has never been set. Measured the same day: the **live** shell
chunk has zero occurrences of `posthog`, `person_profiles`, `respect_dnt` and
`capture_pageview`.

So even a fully-counted GA would say nothing about the games, and the rewards
economy has still never been tuned against a real number. **Two independent
failures wearing one symptom** is the normal case, not an unlucky one — the same
shape as two real bugs on one screen with only one on the failing path.

## When to Apply

- Installing or reconfiguring any measurement tag
- Any report that a tool "shows no data" — read the collect request's own
  parameters before touching the code, and read the vendor's console before
  believing the browser
- Any claim that a tag "works" evidenced by a 2xx
- Editing a doc comment that explains a configuration literal: the two must be
  gated against each other, or they drift and the prose wins the argument
- Before quoting `users`, `sessions` or `engagement` from a cookieless property —
  every pageview is a new user, so those three are inflated and only `views`,
  `pages`, `countries`, `devices` and `referrers` are real

## Related

- [`a-diagnostic-that-truncates-what-it-compares.md`](a-diagnostic-that-truncates-what-it-compares.md)
  — the family: an instrument that cannot represent the failure it is looking
  for. A network panel cannot represent "accepted but not counted".
- [`a-deploy-ledger-that-can-disagree-with-the-disk.md`](a-deploy-ledger-that-can-disagree-with-the-disk.md)
  — a 200 that means nothing, and the same lesson that a green signal is not a
  working one.
- `~/.claude/rules/quality/an-armed-lever-with-no-caller-reads-as-yes.md` — a
  flag set to `true` is not a protection; here a tag that fires is not a count.
- `~/.claude/rules/planning/measure-the-script-before-accepting-the-duration.md`
  — two constraints that cannot both hold, and nobody multiplied them out.
