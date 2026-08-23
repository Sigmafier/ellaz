# Backlinks — every link we know of, and whether it is still there

**This is a RECORD, not a draft.** Nothing here is published; it is the list of
links that point at ellaz.fun, and the date each one was last confirmed alive.

Read it with `npm run reach:backlinks`, which re-fetches every row and writes
the result to `backlinks-checked.json`. `-- --html` renders the same board as a
page.

## Where the board lives, and what actually keeps it private

`npm run reach:site` builds `dist-reach/` and `.github/workflows/deploy-reach.yml`
publishes it to a Cloudflare Pages project of its own, re-checking every link on a
daily schedule as well as on a push. It is a **separate site**, and there were two
reasons rather than one:

- Four gates on ellaz.fun would have had to learn about a page that is deliberately
  unreadable — the PWA `globIgnores` (whose `**/*.html` glob would precache it onto
  every child's phone), `assert-pages.mjs`'s sitemap bijection,
  `assert-first-visit.mjs`'s full-path matcher, and `assert-live.mjs`, which asserts
  every artifact in `dist/` is FETCHABLE and would red on a page that correctly
  answers 401.
- **A subdomain would not have helped.** A subdomain is a separate site, crawled and
  indexed like any other, and every TLS certificate is published to public
  Certificate Transparency logs — so the *name* is discoverable whether or not
  anyone links to it. Isolation is real; invisibility is not.

**The only thing making the board private is a Cloudflare Access policy**, which
lives in a vendor dashboard, has no representation in this repository, and comes off
with one click.

And the obvious way to apply one does not work, which is worth knowing before
somebody tries it. Pages' own **Settings → General → Enable access policy** protects
PREVIEW deployments and, in Cloudflare's words, *"not your `*.pages.dev` domain or
custom domain"* — so the production URL is precisely the one it leaves open. The
other route, a Zero Trust self-hosted application, wants a domain that *"must belong
to an active zone in your Cloudflare account"*: `pages.dev` is not ours, and neither
is `ellaz.fun`, whose DNS is at Hostinger.

So the deploy publishes to a **named branch** rather than to production, which gives
a stable preview alias — `https://board.ellaz-reach.pages.dev` — that the toggle does
cover. Production (`ellaz-reach.pages.dev`) is deliberately left empty and 404s; it is
the URL the toggle would NOT have covered.

**Measured 2026-08-23, the moment the toggle went on**: `200` to an anonymous fetch
before, `302 → ellaz-reach-pages.cloudflareaccess.com/cdn-cgi/access/` after. That
also settles the thing the docs never state — Cloudflare auto-creates an Access
application whose destination is the **wildcard** `*.ellaz-reach.pages.dev`, so a
named branch alias is covered. The gate is **ARMED** from that same change, so a
future deploy reds if the protection is removed.

**What is still UNMEASURED, and only the operator can measure it: WHO gets in.** The
gate answers *whether* the board is readable anonymously, never *who* may sign in.
The auto-created policy reads `Allow Members - Cloudflare Pages` in one panel and
`Sources: All authenticated users` in another, and those are not the same claim. The
check is one private window: if the login page offers a one-time PIN to any email
address, anyone who receives that mail is in; if it demands a Cloudflare login, only
account members are. So `scripts/assert-reach-live.mjs` runs after every deploy with its
polarity inverted: a **200 is the alarm**, not the success. It ships ADVISORY,
because the Pages project necessarily exists before the policy does and an armed
gate would red on correct work on day one; arm it with `REACH_BOARD_PROTECTED=1` in
the same change that applies the policy.

`noindex`, `robots.txt` and `X-Robots-Tag` all ship too, and every one of them is
unreachable while Access is on — a crawler never gets past the login. They are there
for the window in which Access is *off*, which is the only window in which any of
this is exposed.

---

## Why this is separate from `ledger.md`

They answer different questions and the answers routinely disagree.

| | `ledger.md` | this file |
|---|---|---|
| tracks | what WE DID | what EXISTS |
| a row means | a surface was fired | a link points at us |
| goes stale because | a person posted and did not write it down | **somebody else deleted something** |

A surface can be `fired` and produce no link at all — which is the normal case,
not the failure case. And a link can die without anyone touching this repository:
a forum post is removed, a list entry is dropped in a rewrite, a page is edited
and our URL goes with it. **That is the whole reason this file needs re-checking
rather than reading**, and it is why `gone` is a status of its own.

## Why a status code is not the check

A page can return 200 with our link edited out of it. So the checker asserts our
domain appears in the **body**, exactly as `assert-crawlable.mjs` does for our own
pages, and for the same reason: the status answers "is that page alive", never
"does it still point at us".

**And a fetch that fails is not evidence of absence.** No network, a timeout, a
host refusing an automated client — each reports `unchecked`, never `gone`. A
probe that cannot reach a thing has not shown the thing is missing;
[`a-diagnostic-that-truncates-what-it-compares.md`](../../.claude/rules/a-diagnostic-that-truncates-what-it-compares.md)
is the same lesson, and it has cost this repo a wrong conclusion twice.

## Status vocabulary

| Status | Meaning |
|---|---|
| `live` | fetched, and our URL is in the body. The date is when that was last true. |
| `gone` | **was** live on a recorded date, and is not now. A finding, and the reason this file exists. |
| `claimed` | we believe it exists but cannot verify it from here — a login wall, a closed group, an automated-client block. Never counted as a link. |
| `expected` | a surface was fired and no link has appeared yet. Not a link. |
| `unchecked` | the fetch failed for our reasons, not theirs. Says nothing either way. |

**GSC rows are DERIVED and marked `[gsc]`** — read from Search Console's own
export, never typed here. That report is the authority on whether a link exists
(RCH8); this table is what we believe *between* exports, and the two are shown
apart so a belief can never be mistaken for a measurement.

## The ledger

<!-- backlinks:rows -->

| URL | Source | Status | First seen | Re-check | Notes |
|---|---|---|---|---|---|
| https://github.com/hemanth/awesome-pwa/pull/465 | awesome-pwa list PR | claimed | 2026-08-12 | 2026-11-10 | Open and mergeable since 2026-08-12, **not merged**, so there is no link yet — a PR page is not a listing. The list has merged nothing since 2026-08-10 and its queue went 10 → 24, so it batches. Do not wait on it. |

<!-- /backlinks:rows -->

## What GSC says

**Nothing yet, and that is a gap rather than a finding.** The Links report has
never been exported, so `npm run reach:links` prints UNMEASURED and exits 2 — it
will never print `0`, because zero is a real answer that says the lane produced
nothing, and the two are acted on differently.

Drop `Top linking sites` into `exports/` and both this file and that script start
reading it.
