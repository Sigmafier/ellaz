# Reach ledger — what was fired, when, and when we judge it

**This is the record. The drafts beside it are proposals.** Every draft describes
its surface as still available, because that is how a draft is written — so the
only thing that can answer *have we already used this* is a row here.

`npm run assert:outreach` reads this file. Every draft in this folder must have a
row, every row's status must match the `**Status**:` line in its draft, and a row
that is `fired` or `spent` must carry both dates. A disagreement fails the gate.

**Write the row before the post goes out, not after.** Written afterwards it is a
memory; written before, it is the thing that stops the same submission going out
twice — and the thing that makes the ninety-day wait a scheduled step rather than
patience. (`reach-doctrine` RCH2.)

## Status vocabulary

| Status | Meaning |
|---|---|
| `draft` | written, not sent. Nobody outside this repository has seen it. |
| `fired` | sent, and the surface can be used again if it is worth it. |
| `spent` | sent, and this surface cannot be re-run. Never fire it again. |
| `dropped` | decided against. The reason is in the notes column, so it is not re-derived next quarter. |

A verdict is due **90 days** after firing, never earlier: new pages get a
freshness boost, then decay, so an earlier reading measures the boost and
reverses a correct strategy (`seo-doctrine` SEO11).

## The ledger

**The ROW ORDER is the priority order**, highest measured demand first and the
one-shot surfaces last. There is no rank column, deliberately: a number beside a
row is a second place for the order to live, and the two drift the first time
somebody re-sorts one and not the other. To re-prioritise, move the row.

**`Who` says who can act**, because most of these cannot be done from here at
all. `YOU` needs an account, a login or a human in a group. `WAIT` means a clock
is running and there is nothing to do. `LAST` is a one-shot surface held back on
purpose. `DONE` is closed - dropped or spent - and the notes say why so it is not
re-derived next quarter.

**`Do next` is one imperative sentence**, and it is a different thing from
`Notes`: notes are the history of a surface, and history is what you read after
something has gone wrong. `Do next` is what a person does the moment they open
this file, which is the only column the published board renders.


| Surface | Draft | Status | Fired | Verdict due | Notes | Who | Do next |
|---|---|---|---|---|---|---|---|
| Hebrew directories & editors ×4 | `hebrew-directories.md` | draft | — | — | **The AUTHORITY lane, opened 2026-08-29.** Four Hebrew destinations whose real outbound anchors were counted for `rel=nofollow` and carry none: `digitalpedagogy.co` (dofollow verified on a 2026-08-06 tool post, one named editor), `kef-lilmod.co.il` (43 external anchors, zero nofollow, already lists Starfall/BrainPOP/Davidson), `portal.macam.ac.il` (`.ac.il`, 21 dofollow), `pop.education.gov.il` (`.gov.il`, 33 dofollow over 19 hosts — **and it cites digitalpedagogy.co**, so 1 is upstream of 4). Deliberately NOT run beside the Facebook lane above: that one is nofollow by construction, and running both makes the 90-day verdict unattributable. **Ruled out with evidence, so it is not re-derived**: FXP (terms §3.1.5 bans posting websites, in forums AND private messages), Tapuz parenting forums (site posts daily; `להיות-הורים` and `מערכת-החינוך` last posted 2020-06-04, `הורים-לילדים-ביסודי` 2025-02-26), Hebrew Wikipedia (COI + every external link nofollow), lainyan.co.il (its own `AD.htm` sells promotional-link placement — RCH7 IRON), Davidson/CET (publishers, no third-party outbound), baba-mail (ad-driven, old article). Letters carry `[[SIGNATURE]]`/`[[REPLY-ADDRESS]]` placeholders — unfilled on purpose. | YOU | **Operator ruled 2026-08-29: send all four this week.** Reply address settled (`yatiroffer@gmail.com`, filled in). **Signed and addressed 2026-08-29** (`יתיר` / `yatiroffer@gmail.com`, both confirmed by the operator, zero placeholders left). RCH12 and RCH13 were accepted as law the same day, so this lane is the first one run under them. Then, per destination on its sending day: re-run the `rel` count and re-read that site's terms (RCH3 — this file's reading is dated 2026-08-29). Order within the week: digitalpedagogy.co first regardless, because `pop.education.gov.il` already cites her. |
| Ministry catalogue (ecat) | `hebrew-directories.md` | draft | — | — | `ecat.education.gov.il`, `.gov.il`, the official catalogue of approved tools and games. `/applyvendor` **verified to exist** 2026-08-29, and the catalogue genuinely carries a `ללא עלות` filter and a `כלי בינלאומי` type, so a free tool is not out of place. But the route is formal procurement — application, dedicated forms, published criteria, tender eligibility — and it wants a supplier entity. Filed rather than dropped; highest ceiling, longest path. | YOU | Long shot. Do NOT let it hold up the four letters. Read `/applyvendor` end to end and decide whether a supplier entity is worth creating; if not, mark this row `dropped` with that reason. |
| Hebrew communities ×4 | `hebrew.md` | draft | — | — | **Destinations named 2026-08-21, rules NOT re-readable from here.** A direct fetch of a Facebook group returns its title and nothing else - no rules, no pinned post, no About panel - public or private. So RCH5's fetch is the operator's, in the group, on the day; `hebrew.md` carries the checklist it has to produce. One rule IS known without login: `מורות משקיעות` brokers promotion through a named person by phone, so an unbrokered link there reads as dodging it **2026-08-23: a FOURTH post was written.** The Ministry's Hebrew-language group (`הוראת השפה העברית ביסודי`) was listed under post 3, and post 3 names seven games of which none is a language game - a roster arriving in a room whose subject is Hebrew. Post 4 leads on `מרכיבים מילה`'s wrong-tile-is-never-placed decision and links to `/he/games/learn/` rather than the home page. Nothing posted. | YOU | Open each group, read its rules THAT DAY, post the matching draft. `מורות משקיעות` brokers promotion by phone - clear it there first or skip that one. |
| itch.io | `itch.md` | draft | — | — | **The three zips are BUILT and GATED at `44e0571` (2026-08-22)**: `dist-standalone/zips/ellaz-{sudoku,2048,snake}.zip`, 76 / 69 / 446 KB, `index.html` at the zip root. Gated as the ZIP rather than as the build directory - extracted and run back through `assert:standalone`, 14/14 planted cases caught. Stamp reads `ellaz:commit 44e0571…-dirty`; the `-dirty` is untracked build scratch and peers' in-flight files, not uncommitted source. **Still needs an account, which only the operator can create.** Rebuild if HEAD moves - the gate refuses a stale stamp, so they are built LAST, after the final commit. They live in `dist-standalone-zips/`, never inside `dist-standalone/`, where the gate would scan them as a fourth torn bundle | YOU | Create the account, upload the three zips in `dist-standalone-zips/`, paste the per-game copy from the draft. Rebuild the zips if HEAD has moved - the gate refuses a stale stamp. |
| Newgrounds | `newgrounds.md` | draft | — | — | same bundles - see the itch row; built and gated at `44e0571` | YOU | Same three zips, after itch, so the listing copy has been through one review first. |
| Poki / CrazyGames enquiry | `portals.md` | draft | — | — | approved 2026-08-20: their ads on their domain, our site stays ad-free (RCH1) | YOU | Read the draft's first section before sending: it recommends holding Poki, whose SDK is mandatory and would be an external call from a game. CrazyGames has an ad-free Basic Launch. Send or drop, one at a time. |
| Israeli tech press | `press.md` | draft | — | — | contacts verified 2026-08-11; re-verify before sending | YOU | Re-verify the contacts (last checked 2026-08-11), then send the Hebrew letter with the derived numbers as the story. |
| dev.to article | `dev.md` | draft | — | — | operator's to publish or discard | YOU | Yours to publish or drop. Needs an account we do not have. |
| Reddit ×3 | `reddit.md` | draft | — | — | destinations returned an identical generic shell to an automated fetch; not yet actually read | YOU | Read each subreddit's rules in a BROWSER first - a script gets an identical generic shell from all three - then post one per community, a week apart. |
| awesome-pwa (list PR) | `dev.md` | fired | 2026-08-12 | 2026-11-10 | **PR [#465](https://github.com/hemanth/awesome-pwa/pull/465), open, mergeable.** Found already open on 2026-08-20 while preparing to open it — the draft said "nothing is opened" for eight days. Entry corrected the same day: it advertised 23 games in Hebrew and English. List batches merges; last batch 2026-08-10, 10 PRs queued | WAIT | Nothing to do. PR #465 is open, mergeable and correct. The list batches and has merged nothing since 2026-08-10. Next look 2026-11-10. |
| Show HN | `launch.md` | draft | — | — | **one shot.** Fires last, after every lane above is green | LAST | ONE SHOT. Do not fire until at least one lane above has produced a live link - a launch aimed at a site nobody has linked to spends the surface for nothing. |
| Product Hunt | `launch.md` | draft | — | — | **one shot.** Same gate | LAST | ONE SHOT. Same gate as Show HN. |
| awesome-phaser (list PR) | `dev.md` | dropped | — | — | dormant 16 months, every open PR unanswered. Ranked by merge recency, not stars | DONE | Closed. Dormant 16 months, every open PR unanswered. Do not re-derive this next quarter. |

## What the outside world has sent back (2026-08-21, first real measurement)

Search Console, Performance, last 3 months, in
[`exports/performance-2026-08-21/`](exports/performance-2026-08-21/). Read it
with `npm run reach:perf`.

| | |
|---|---|
| indexed? | **yes** — 55 distinct URLs earn impressions, in all four written languages |
| impressions | 4 in the 9 days before 2026-08-10; **227** in the 9 days from it |
| clicks | 8 |
| where | **Israel 65%**, United States 6%, Spain 1% |
| what they search in | **Hebrew 76%**, Latin 24% |
| which URLs earn it | bare/English 66%, `/en/` 16%, **`/he/` 11%**, `/es/` 5%, `/fr/` 3% |
| position | only **26%** of impressions come from pages averaging page one |
| linking sites | **0. Measured** — the Links report was empty on the same visit |

Three things follow, and none of them was guessable from inside the repository.

**The crawl block is behind us.** The 08-10 step is the 2026-08-08 CDN fix
landing, two days later, as a recrawl.

**This is not a crawling or a content problem. It is an authority problem.** The
pages are indexed and they sit at 11 to 50. Zero links is exactly the curve a
three-week-old domain with no links produces, and links are the only lever that
moves it.

**The audience is Israeli and the English pages are absorbing their searches.**
That decides the order of the lanes below: the Hebrew communities are no longer
the best guess, they are where the measured demand already is.

## What has actually reached the outside world

Nothing from this folder. The two things that HAVE been public the whole time are
the repository's own metadata and the site itself — which is exactly why the
first lane of the backlinks routine is auditing what we already own, and why the
repository description was wrong for weeks while every check of the link passed.
