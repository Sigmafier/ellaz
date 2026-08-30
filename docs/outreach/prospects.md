# Prospects — destinations measured, before a letter is spent on them

**This is neither a draft nor a record.** [`ledger.md`](ledger.md) says what we
FIRED. [`backlinks.md`](backlinks.md) says what EXISTS. This says which
destinations are worth the one scarce thing in this whole lane: a letter, which
always needs the operator.

Read it with `node scripts/reach/prospects.mjs`. Nothing here is published, and a
row appearing here is not a decision to write to anyone.

## Why the verdict is not a score

A number invites ranking destinations against each other and these are not
comparable. A `.gov.il` that nofollows everything is worth more attention than a
blog that does not, because of who reads it. So the verdict answers one narrow
question — *would a link here carry authority* — and whether it is worth a letter
stays a person's call.

| verdict | meaning |
|---|---|
| `TAKE` | 5+ external anchors, dofollow, and the page is current |
| `thin` | links out, but barely |
| `nofollow` | links out and nofollows all of it. Readers only, never authority |
| `dormant` | anchors found, newest date on the page is over a year old |
| `blind` | **no external anchors found.** Says nothing about the page — says the instrument read nothing |
| `unchecked` | the fetch failed for OUR reasons. 403 and 429 are usually a user-agent block or a rate limit, never an outage |

`blind` and `unchecked` are deliberately not verdicts. Collapsing either into
"0 dofollow" is how a destination gets written off by a probe that never reached
it, which this repo has done twice
([`a-diagnostic-that-truncates-what-it-compares.md`](../../.claude/rules/a-diagnostic-that-truncates-what-it-compares.md)).

## Three instruments, all three controlled, on every run

`nofollow: 0` is very good news and it is exactly what a matcher that cannot see
`rel` reports about every page on earth. So fixtures are parsed before anything is
fetched, and a mismatch stops the run rather than printing numbers nobody should
believe.

**On 2026-08-30 the first real batch broke all three, and each one produced a
confident wrong answer rather than an error:**

| what broke | what it produced | how it is held now |
|---|---|---|
| `freshness` read the FIRST structured date | `weareteachers.com` ruled `dormant` on a 2023 published date, while its modified date three tags later read **2026-07-28**. One of the largest US teacher publications, 208 dofollow anchors, written off | newest of all structured dates, matching what the text fallback already did |
| `door` matched `/about` on ANY host | weareteachers' door came back as a page on **`nature.org`** — a real URL, a real 200, a real About page, belonging to a conservation charity | the door must resolve onto the destination's own host |
| a `2xx` was treated as a read | three library pages answered **`HTTP 202` with a ~2 KB AWS WAF challenge** — well-formed, `</html>` present, empty title, zero anchors — and were reported `blind`, which prints as a fact about *their* page | zero anchors on a 2xx is `unchecked`, and it names the byte count and the vendor |

The third is the one this repo has met before from the other side: `assert:crawlable`
exists because our own host once served crawlers a 200 with no content. A structural
check passes an AWS WAF page; only the absence of anchors gives it away. It is also
not rare — the very next run caught `freetech4teachers.com` serving a 9,756-byte
Blogger shell with no `<a` and no `<title>`, on a plain 200 with no challenge, which
this file had been describing as a dormancy control while the script had been quietly
recording it as `blind`. **A control whose description and whose recorded output
disagree is not a control**, and the only reason anyone looked is that a state changed.

Each fix was proved by planting the old behaviour back and watching the control name
the field — `freshness got 2019-01-02, want 2026-07-28`, `door got
https://other.example/...`, `readsAsDocument(challenge) got true, want false` — and
the document predicate is controlled in **both** directions, because one that rejects
everything makes every destination `unchecked` and nobody argues with a null result.

**A fourth, in the failure path itself.** The message explaining a broken matcher
destructured `bad` as a pair long after it had become an object, so it threw
`object is not iterable` — losing the field name, losing the "believe nothing"
sentence, and exiting `1` (which means *no candidates*) instead of `2` (which means
*believe nothing*). The one path that exists to explain a failure had never been run.

## The candidates

**Rows are measurements, not decisions.** Nothing here is a plan to write to anyone,
and the count is deliberately larger than the number of letters that should follow
from it: `RCH7` is that we submit only where a real person browsing that surface
would be glad to find us, and the way that rule fails is nine near-identical letters
sent because nine rows measured green.

**So the order is one at a time, and the library lane is tested with one library.**
`weareteachers.com` first — the largest audience, the clearest door, and a roundup
whose whole subject is free resources. Then `libraries.oc.gov`, as the single test of
whether a public library will add a site to its children's shelf at all. Only if that
lands is there a case for the other four libraries, and by then the letter will have
been written once and answered once, which is worth more than four guesses.

Four rows exist to be controls rather than prospects, and they are marked so nobody
sends them a letter. Each pins a state that would otherwise be unfalsifiable:
`sjpl.org` must come back `unchecked` (a live AWS WAF challenge), `freetech4teachers.com`
must come back `unchecked` (a plain 200 that is not a document, with no challenge at
all), `elementarylibrarian.com` must come back `dormant`, and our own itch page is the
only row whose `linksToUs` must come back true.

<!-- prospects:rows -->

| URL | Note |
|---|---|
| https://www.commonsense.org/education/top-picks | Common Sense Education. Enormous authority in exactly our category. **Demoted from `TAKE` to `thin` on 2026-08-30 by a rule change, not by the page changing**: 32 dofollow anchors across only **4 distinct hosts**. That is repetition, not reach, and it was listed first in this file on the strength of the anchor count. Still editorial and still worth a letter one day; the ask is inclusion in a list, never a submission. |
| https://www.weareteachers.com/free-teacher-resources/ | **The one to write first.** One of the largest US teacher publications, and its "50+ sources for free teacher resources" roundup carries **208 external anchors, every one dofollow**. Measured 2026-08-30. It is also the row that caught a defect in this very script: read on its `article:published_time` it looked `dormant` since 2023-07-03, and its `article:modified_time`, three tags later in the same document, says **2026-07-28**. Door: their own contact page. |
| https://ditchthattextbook.com/10-sites-for-students-with-free-time-on-their-hands/ | Matt Miller, a named author with a real audience, and the post says in its own words: *"Please add to the list! If you have a favorite, please include it in a comment at the end of the post."* Measured 2026-08-30: 120 external, 113 dofollow. **The invitation is to comment, and a comment is a link we placed ourselves — `RCH13`, discovery and never authority.** The ask is inclusion in the post; the comment is at best a way to be seen. |
| https://teachersfirst.org/spectopics/gamebasedlearning.cfm | An editor-reviewed directory of game-based learning tools, each with written commentary. 56 external anchors, all dofollow, measured 2026-08-30. **The route is UNCONFIRMED**: the contact form has no submission category and the site publishes no "suggest a resource" wording, so a letter here is a cold letter to an editorial desk. |
| https://www.kidsaitools.com/en/articles/best-free-educational-games-kids-no-ads-2026 | A 2026 roundup whose stated criteria are ours exactly — genuinely free, zero ads, zero in-app purchases. **429 twice**, so `prospects.mjs` will report it `unchecked` forever; a second 429 stops being a rate limit and becomes a user-agent block. **Measured BY HAND in a real browser, 2026-08-30: 4 external anchors, 4 dofollow, 0 nofollow** — commonsensemedia.org, code.org, scratch.mit.edu, learn.khanacademy.org, which is precisely our shelf. That is `thin` under this file's own rule (5+ dofollow for `TAKE`), and the four it does carry are the four best-known names in the category, so a fifth is a real ask rather than a filler. The numbers are hand-taken and labelled so, because the script cannot reach this host and a future green run here would mean the block lifted, not that the page changed. |
| https://www.learninggame.org/free-learning-games-for-children/ | A live roundup of free learning games, already linking to code.org and ed.stanford.edu. Measured 2026-08-30: 125 external, 122 dofollow, 3 nofollow. |
| https://libraries.oc.gov/kids/play/games | **The library lane's single test - and the row that forced the rule change above.** 167 external anchors, all dofollow, across 28 hosts. **The 28 are real hosts and one organisation**: `ocpl.org`, `catalog.ocpl.org`, `ocpl.libcal.com`, `ocpl.overdrive.com`, `ocpl.kanopy.com`, `ocpl.beanstack.org`, and a dozen *Friends of the X Library* nonprofits. **Four genuinely third-party sites: funbrain, nick, nickjr, pbskids.** A host check cannot see an organisation and no noise list will ever contain somebody else's satellites, so this number is a HAND-READ and is labelled as one. It stays a candidate on the honest case - a `.gov` shelf with four names and room for a fifth. Door: `/contact/inquiries`, topic General Inquiry, and it carries a CAPTCHA. |
| https://greenburghlibrary.org/childrens/games | A curated shelf of exactly our neighbours — ABCYa, PBS Kids, NatGeo Kids, NASA Space Place. 34 external anchors, all dofollow. **No door on their own host**: their contact routes live on `libanswers.com` and `libwizard.com`, which a host-scoped probe cannot claim as theirs, so the door here has to be found by hand. |
| https://mcpl.info/childrens/reading-games-web | Monroe County (Indiana). 18 external anchors, all dofollow, measured 2026-08-30. |
| https://www.sclibrary.org/kids-teens/kids/online-games-for-kids | Santa Clara City Library. 17 external anchors, all dofollow, measured 2026-08-30. |
| https://www.spl.org/programs-and-services/fun-and-games/digital-games-for-kids | Seattle Public Library. 13 external anchors, all dofollow. **The door the probe found is "suggest a title", which is for BOOKS** — a real form for a different purpose. A destination whose only visible door is the wrong door is not ready for a letter. |
| https://www.trpld.org/kids-games-2530 | Three Rivers (Illinois). 21 external anchors, all dofollow, measured 2026-08-30. |
| https://www.sjpl.org/kids-games/ | **CONTROL, NOT A PROSPECT.** San José Public Library answers `HTTP 202` with a 1,994-byte AWS WAF challenge — well-formed HTML, `</html>` present, empty `<title>`, not one anchor. It must come back `unchecked`. If it ever comes back `blind`, the script has gone back to reporting a bot challenge as a fact about somebody's page. |
| https://www.freetech4teachers.com/ | **CONTROL, NOT A PROSPECT — and it was the wrong control, described as something it never did.** This row was written up as the dormant case (*"ruled out 2026-08-29: last post 2023-08-23"*), and the previous run's own record says the script reported **`blind`** on it: `ext=0`, `fresh=None`. It serves a 9,756-byte Blogger shell with no `<a` and no `<title>`, on a plain 200 with no challenge of any kind. So it never tested dormancy, and the description of it would have been quoted as proof that dormancy was covered. It stays, as the second live example of a 200 that is not a document — the one that shows the failure is not only bot challenges. It must come back `unchecked`. |
| https://elementarylibrarian.com/free-library-games-and-resources/ | **CONTROL, NOT A PROSPECT — and the dormant one, because the row above turned out never to have been.** A real page, really fetched, really parsed: 7 external anchors, all dofollow, newest date on it **2022-01-28**. It must come back `dormant`. A destination reading `dormant` is the only proof this script can still tell a graveyard from a live page. |
| https://ytrofr.itch.io/sudoku | **CONTROL, NOT A PROSPECT.** Our own itch listing. It is the only row whose `linksToUs` must come back true, which is what proves that flag fires on a real page and not only on the fixture. |

<!-- /prospects:rows -->

## What a `TAKE` does not tell you

It does not say the destination will reply, that our games fit their audience, or
that a letter is due. It says a link there would count. Everything after that is
[`hebrew-directories.md`](hebrew-directories.md)'s method: read the destination's
own rules on the day, write one letter with no shared sentences, and put the
ledger row in before it goes.
