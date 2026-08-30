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

## The board has three halves, and only one of them is this file

`npm run reach:site` renders **do next**, then **posts ready to send**, then **links that exist**. The first
half is read from [`ledger.md`](ledger.md) - its `Who` and `Do next` columns, in
its own row order, which IS the priority order. The second half is this file.

That is not a merge of the two records and must not become one. They stay apart
for the reason below; what is joined is the VIEW, and a renderer has no state to
drift. The direction matters: a view can read two records, but a record that
learns to read another record has two answers to one question.

The middle one carries the post TEXT with a copy button, read out of the drafts
by `scripts/reach/posts.mjs`. Every surface marked `YOU` is blocked on one act - a
person pasting text into a room this repository cannot reach - so the distance left
is opening GitHub on a phone, finding the right markdown section, and select-dragging
a Hebrew blockquote past its `> ` prefixes. That distance is the whole reason a
drafted post stays drafted. **Two conventions are read, because two exist and neither
is wrong**: `hebrew.md` quotes with `> `, `reddit.md` fences `**Title**` and `**Body**`,
and normalising one to the other would be a rewrite of eight drafts to please a parser.
A `## Post` heading whose body cannot be read is COUNTED and printed on the page, never
dropped - a draft rendering as "no posts" is indistinguishable from one that never had
any.

**Each post section declares `**Go**:` and `**Do**:`.** `Go` is a FULL URL, or an
honest sentence when no room has been checked - post 1 in `hebrew.md` says
`none verified yet`, because its candidates are leads and one of the lists behind
them is from 2023. A URL becomes a real link on the board and a sentence is printed
as amber text, never linked: the board is read on a phone, where a name is something
to go and search for and a URL is something to press. `Do` is one imperative line -
what this particular room needs, not what posting is in general, which is why post 3
says *phone the promoter first* and post 4 says *do not swap the link for the home
page*. A post missing either is NAMED on every build rather than rendered blank,
because a guess in a published artifact is read as a decision by whoever opens it
next, and the next reader here is the person about to post.

Three things the renderer does that are load-bearing rather than styling:

- **A surface with an empty `Do next` says so on the page** rather than being
  skipped. Dropped silently, a board with seven blank instructions reads as a
  clean sweep; the placeholder is what makes an unwritten instruction visible.
- **A `DONE` surface is listed once, in `closed`** - never also in do-next. The
  control asserts the count, because asserting the closed *section exists*
  survives a build that puts closed work in both places.
- **Zero surfaces REFUSES the build**, exactly as zero rows does here. An empty
  ledger parse renders `0 waiting on you`, which is an all-clear rather than an
  empty section, and an all-clear is the one thing this board must never invent.

**The copy button is checked in a browser, not in a unit control**, by
`scripts/repro/repro-reach-board-copy.mjs`: it taps every button at 390x844 and
compares the CLIPBOARD byte-exact against what `posts.mjs` parsed. A unit control
can assert the text is on the page and that each block has a button; neither says
the button copies, and neither can see a handler that copies escaped markup into a
Facebook group.

**That probe carries a planted control post, and it had to.** Not one of the seven
real posts contains `&`, `<` or `>` - only `"`, which a text node serialises back
unescaped - so the mutation from `textContent` to `innerHTML` copies identical bytes
and the escaping check passes over the bug it exists for. Measured 2026-08-23: it
SURVIVED. With a fixture post carrying `Tom & Jerry <b>bold</b>`, the same mutation
reds on two assertions. A probe is only as good as its ability to disagree.

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
| https://ytrofr.itch.io/snake | our own itch.io project page for Snake | live | 2026-08-30 | 2026-11-28 | **Published 2026-08-30**, the third and last of the itch listings. Same class as its siblings and for the same two reasons - DISCOVERY under `RCH13` because we placed it, and `rel="nofollow noopener"` besides. Never an authority count. **The one that took four attempts to get the right BUILD onto**, and every failure was a different lie: a second `ellaz-doors` folder I had been writing to while the operator opened the other one, so the zip uploaded was from 00:18 the night before; then both builds attached at once with the OLD one still flagged "played in the browser"; then a scripted `.click()` on that flag which itch's uploader ignored, so Save wrote back the old file. Settled by CONTENT, not by clicking: Vite hashes each chunk from its bytes, so the served `index.html` naming `standalone-tBBZWxFJ.js` is the fixed build and `standalone-SFusrQJJ.js` is not - and the same probe run against the old upload still reports the old name, so it can say either. |
| https://ytrofr.itch.io/2048 | our own itch.io project page for 2048 | live | 2026-08-30 | 2026-11-28 | **Published 2026-08-30.** Same class as the Sudoku row and for the same two reasons - DISCOVERY under `RCH13` because we placed it, and `rel="nofollow noopener"` on top of that. Never counted as authority. **This is the bundle that shipped DEAD once**, and it was played on the live page before this row was written: board drew, tiles rendered, Difficulty Classic, Highest 2. Publishing it straight from the creation form skipped the embed block entirely - that block only exists on the EDIT page, after a file is uploaded - so it went live in itch's default 640x360 with the board clipped behind an inner scrollbar. Now 800x900, autostart on, fullscreen button on, verified by measuring the live iframe rather than by reading the setting back. |
| https://ytrofr.itch.io/sudoku | our own itch.io project page for Sudoku | live | 2026-08-30 | 2026-11-28 | **Published 2026-08-30**, verified anonymously: 200 with the game title in the BODY, not merely a 200, and `I.current_user = null` in the response so the reading is not our own session. **It is DISCOVERY, not an earned link, on two independent grounds.** (1) `RCH13` - we placed it ourselves, and that alone settles it however the `rel` reads. (2) The `rel` reads `nofollow noopener`. Measured the same day on two unrelated public profiles, itch renders a user-supplied website field as `rel="nofollow me"` too, so this is the platform and not our page; the control is that the same matcher on the same pages DID report `rel="me"` on those profiles' social anchors and `rel=(none)` on itch's own footer links. So it can express the answer we wanted and simply never returns it for a URL a person typed. **Never add this to an authority count, and never book it against the 2026-11-27 verdict.** What it does buy: a playable copy where the audience already browses, itch's own traffic, and an indexable page (no `robots` meta) carrying our tagline as its `og:description`. |
| https://github.com/Sigmafier/ellaz | our own repository's About box | live | 2026-08-23 | 2026-11-21 | **The only thing on the internet that points at ellaz.fun**, and it is ours. Measured 2026-08-23: 5 anchors on that page name the domain and **every one carries `rel="nofollow"`** - the homepage field, the README's own links, the sidebar. So it is discovery, never authority, which is one reason the Links report can be empty while this row is honestly `live`. It predates this row; 2026-08-23 is when it was first checked, not when it appeared. |
| https://github.com/hemanth/awesome-pwa/pull/465 | awesome-pwa list PR | claimed | 2026-08-12 | 2026-11-10 | Open and mergeable since 2026-08-12, **not merged**, so there is no link yet — a PR page is not a listing. The list has merged nothing since 2026-08-10 and its queue went 10 → 24, so it batches. Do not wait on it. |

| https://digitalpedagogy.co/ | כלים קטנים גדולים - Hebrew tools encyclopedia, one named editor | expected | — | 2026-11-27 | **Pitched 2026-08-29** (`hebrew-directories.md`). Measured that day: outbound links on a real tool post carry NO nofollow, latest post 2026-08-06. Send first of the four - `pop.education.gov.il` already cites her, so a yes here warms that one. Nothing here until she publishes; a reply is not a link. |
| https://www.kef-lilmod.co.il/%D7%90%D7%AA%D7%A8%D7%99-%D7%94%D7%A2%D7%A9%D7%A8%D7%94/ | אתרי לימוד והעשרה - curated enrichment shelf for parents | expected | — | 2026-11-27 | **Pitched 2026-08-29.** Measured: 43 external anchors on that page, ZERO nofollow; already lists Starfall, BrainPOP, Davidson, Eureka. The only one of the four reached by a form rather than a person. |
| https://portal.macam.ac.il/article/educational-applications-hebrew/ | פורטל מס"ע - Israeli teacher-colleges portal (.ac.il) | expected | — | 2026-11-27 | **Pitched 2026-08-29.** Measured: 21 dofollow outbound to Duolingo, Khan Academy, BrainPOP, Kahoot, Quizlet. Editorial desk, so the ask is inclusion in a round-up rather than a submission. Highest realistically-pitchable authority of the four. |
| https://pop.education.gov.il/teaching-tools/teaching-practices/search-teaching-practices/digital-tools-building-knowledge-distance-learning/ | המרחב הפדגוגי - Ministry portal for teaching staff (.gov.il) | expected | — | 2026-11-27 | **Pitched 2026-08-29.** Measured: 33 dofollow over 19 distinct hosts (Nearpod, BrainPOP, Padlet) - **and it already cites digitalpedagogy.co**, which is why that one is sent first. Slowest to answer. |
<!-- /backlinks:rows -->

## Three things answer TRUE and are none of them a backlink

Measured 2026-08-23, because the obvious next move after reading this file is to
run the checker over some candidates, and three of them come back `true` for
reasons that have nothing to do with anybody linking to us:

| Candidate | Body has `ellaz.fun` | Why it is not a row |
|---|---|---|
| `sigmafier.github.io/ellaz/` | yes | **it IS us** - our own mirror, `noindex` and `Disallow: /`. A site cannot link to itself into existence |
| `web.archive.org/web/2026/https://ellaz.fun/` | yes | an archive OF our page, not a page pointing AT it |
| `github.com/Sigmafier/ellaz/blob/main/README.md` | yes | the same repository as the row above. One link, one row - counting the README separately doubles a single reference |

And the useful negative: `github.com/hemanth/awesome-pwa` itself answers **false**,
which is the independent confirmation that PR #465 is still unmerged. The PR page
answers `true` only because it renders its own diff.

**The check is "does somebody else's page point at us", and the string test cannot
tell that on its own.** A candidate is a row when a human has decided it is a
third party. That decision is not automatable and should not be automated.

## What GSC says

**Nothing yet, and that is a gap rather than a finding.** The Links report has
never been exported, so `npm run reach:links` prints UNMEASURED and exits 2 — it
will never print `0`, because zero is a real answer that says the lane produced
nothing, and the two are acted on differently.

Drop `Top linking sites` into `exports/` and both this file and that script start
reading it.
