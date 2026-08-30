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
| Hebrew directory - digitalpedagogy.co | `hebrew-directories.md` | fired | 2026-08-29 | 2026-11-27 | **Sent and CONFIRMED ON THE WIRE**, which is the strongest evidence in this lane: `POST /_api/wix-forms/v1/submit-form` returned **200**, preceded by `recaptcha/enterprise/userverify` 200 and followed by a `generate_lead` event carrying `Form Name: Contact`. **The first attempt silently FAILED** - the reCAPTCHA was unsolved, the submit was refused, and the page rendered no error at all; the operator solved it by hand and it went. Wix renders no confirmation string here, so the DOM alone could never have settled it: an empty form and a reloaded page are identical. `performance.timeOrigin` proved the document had not reloaded in 1455 s, so the clear happened IN PLACE. The surface: `כלים קטנים גדולים`, the Hebrew encyclopedia of digital tools for education, one named editor, dofollow verified on a real tool post. **The highest-value door of the four** - `pop.education.gov.il` cites her. | WAIT | Nothing to do until 2026-11-27. If she replies asking about a teacher panel, the letter already said there is none - do not invent one; that limitation is why the letter reads as honest. |
| Ministry portal - pop.education.gov.il | `hebrew-directories.md` | fired | 2026-08-29 | 2026-11-27 | **Sent by the operator from their own mailbox**, through a pre-filled Gmail compose link because the Gmail connector was expired all afternoon and only activates on a Claude Code restart. Body byte-verified against the repo before it went (`sha256` head `bd9d4274`). **NOT YET CONFIRMED, but confirmable** - it is email, so a copy is in the Sent folder; any session with a live Gmail connector can settle it in seconds. That is a different state from `kef-lilmod`, which no instrument can ever confirm. The surface: `.gov.il`, the Ministry portal for teaching staff, 33 dofollow outbound over 19 hosts including Nearpod, BrainPOP and Padlet - **and it cites `digitalpedagogy.co`**, whose letter went the same day, so the upstream ordering the lane was planned around actually held. | WAIT | Next session with Gmail awake: confirm the copy is in Sent, and mark the send log. Then nothing until 2026-11-27. |
| Hebrew directory - portal.macam.ac.il | `hebrew-directories.md` | fired | 2026-08-29 | 2026-11-27 | **Sent and CONFIRMED BY THE SERVER**, which nothing else in this lane can say: Gravity Forms rendered `תודה על הודעתך.` and removed the form from the DOM. The body was byte-verified in the live field first (`sha256` head `4e671884`), and the form's HONEYPOT (`input_2_4`, labelled *Comments*, `display:none`) was confirmed EMPTY before sending - filling it would have binned the message behind exactly the same success screen. The surface: `.ac.il`, the teacher-colleges portal, 21 dofollow outbound to Duolingo, Khan Academy, BrainPOP, Kahoot, Quizlet. | WAIT | Nothing to do until 2026-11-27. The letter deliberately keeps the paragraph admitting there is no efficacy research - if a reply challenges that, it is the letter working, not a mistake to walk back. |
| Hebrew directory - kef-lilmod.co.il | `hebrew-directories.md` | fired | 2026-08-29 | 2026-11-27 | **The first letter of the authority lane to actually leave.** Sent by the operator through the site's own Elementor contact form (no CAPTCHA); the body was byte-verified in the live field against this repo (`sha256` head `8d5bf534`) before it went. **Delivery is UNVERIFIABLE from here and always was**: the form notifies the site owner and sends the sender no receipt, so there is no bounce, no copy and no signal of any kind to read. The operator reported no confirmation email, which is the expected outcome rather than a failure. The surface: `אתרי לימוד והעשרה`, 43 external anchors and ZERO nofollow, already listing Starfall, BrainPOP, Davidson and Eureka. | WAIT | Nothing to do until 2026-11-27. **Do NOT re-send on the strength of the silence** - a duplicate to a curator who already has the letter is worse than one that quietly failed. If no link has appeared by the verdict date, write a SHORT follow-up that says it is a follow-up; never the same letter twice. |
| itch.io | `itch.md` | draft | — | — | **The three zips are BUILT and GATED at `167f7d2` (2026-08-29)** - `dist-standalone-zips/ellaz-{sudoku,2048,snake}.zip`, 78 / 78 / 450 KB, `index.html` at the zip root. Gated as the ZIP rather than as the build directory: extracted and run back through `assert:standalone`, 14/14 planted cases caught. **AND THEN LOADED IN A BROWSER, WHICH IS THE ONLY CHECK THAT CAUGHT ANYTHING.** The 2048 zip built on 2026-08-22 and re-gated on 2026-08-29 passed every byte-level assertion and rendered *The game didn't load*: its directory is `n2048`, its id is `2048`, and the one-game plugin compared the two, so the build stubbed out the module it existed to ship. Fixed in `167f7d2` with a `sawOwnGame` control that refuses a build which never resolved its own game. Still needs an account, which only the operator can create. Rebuild if HEAD moves - the gate refuses a stale stamp, so they are built LAST, after the final commit. They live in `dist-standalone-zips/`, never inside `dist-standalone/`, where the gate would scan them as a fourth torn bundle | **SUDOKU AND 2048 ARE BOTH LIVE (2026-08-30)** - <https://ytrofr.itch.io/sudoku> and <https://ytrofr.itch.io/2048>, each verified anonymously with the title in the BODY. **Two traps, both invisible until the artifact was looked at.** (1) Saving the form does not publish - visibility is a separate radio, and Sudoku 404'd for fifteen minutes while every field read correct. (2) Publishing straight from the CREATION form skips the embed block, which only exists on the edit page after a file is uploaded: 2048 went public in itch's default 640x360 with the board clipped, and the setting had to be measured on the live iframe, not read back from the form. **SUDOKU IS LIVE - published 2026-08-30**, <https://ytrofr.itch.io/sudoku>. Verified from OUTSIDE, not from the session that made it: anonymous 200 with the game's title in the BODY and `I.current_user = null` in the response, and `reach:backlinks` reads it LIVE at 22,011 B. Saving the form did NOT publish it - visibility is a separate radio and the page 404'd to everyone for fifteen minutes while every field read correct. **SUDOKU IS UP, AS A DRAFT** (2026-08-30) - <https://itch.io/game/edit/4953564>, public at <https://ytrofr.itch.io/sudoku>, which 404s logged out because that is what a draft looks like from outside. Account made, zip uploaded (79 KB, `embed` ticked so itch dropped the platform boxes itself), every field verified by reading the live form back rather than the screenshot, and **the game was PLAYED in itch's own player** - the one check that catches a bundle which builds, type-checks and gates 14/14 without running. **AND THE MEASUREMENT THAT CHANGES WHAT THIS ROW IS FOR: itch nofollows every user-supplied external URL on the platform** - our description link reads `rel="nofollow noopener"`, the profile website field reads `rel="nofollow me"` on two unrelated public profiles, while `rel="me"` and `rel=(none)` on other anchors of the same pages prove the matcher can say otherwise. So this lane buys a playable copy where the audience browses and the players who find it, and ZERO authority - `RCH13` already called it DISCOVERY because we placed it, and the `rel` is a second, independent reason. Do NOT book it against the 2026-11-27 backlink verdict. YOU | Snake last, and set its embed 800x900 + autostart + fullscreen BEFORE publishing rather than after. 2048 still needs its two screenshots and its AI-disclosure answer - the Save landed the embed settings and neither of those. Newgrounds after all three.
| Newgrounds | `newgrounds.md` | draft | — | — | same bundles - see the itch row; built and gated at `167f7d2`, and 2048's published size moved 204 -> 208 -> 228 KB in one day because the first two were measurements of a bundle that did not run | YOU | Snake and 2048 only, after itch, so the listing copy has been through one review first. The description quotes 228 KB and nothing gates that number - re-measure on the day. |
| Ministry catalogue (ecat) | `hebrew-directories.md` | draft | — | — | `ecat.education.gov.il`, `.gov.il`, the official catalogue of approved tools and games. `/applyvendor` **verified to exist** 2026-08-29, and the catalogue genuinely carries a `ללא עלות` filter and a `כלי בינלאומי` type, so a free tool is not out of place. But the route is formal procurement — application, dedicated forms, published criteria, tender eligibility — and it wants a supplier entity. Filed rather than dropped; highest ceiling, longest path. | YOU | Long shot. Do NOT let it hold up the four letters. Read `/applyvendor` end to end and decide whether a supplier entity is worth creating; if not, mark this row `dropped` with that reason. |
| English ed-tech editors ×3 | `english-directories.md` | draft | — | — | **Written 2026-08-29, deliberately HELD.** Three destinations verified by counting `rel` on a real recent post reached through each site's own feed, never a homepage: `askatechteacher.com` (latest post 2026-08-28, **63 external anchors, 63 dofollow, 0 nofollow**), `controlaltachieve.com` (2026-08-24, **41 dofollow, 0 nofollow**, and its current post is about AI games), `classtechtips.com` (2026-08-26, **10 dofollow, 0 nofollow**). Contact routes fetched the same day - note `controlaltachieve.com/p/contact.html` is a **404**, the door is `/p/about.html`. Four ruled out with reasons so they are not re-derived: `freetech4teachers.com` is the **Tapuz shape again** - 200, current design, huge archive, and its last post is **2023-08-23**; `igamemom.com` five months cold with half its outbound affiliate; `findpwa.com` answers 200 with **33 bytes**; `appsco.pe` 503. Three letters, **zero shared sentences** outside the signature - verified mechanically, not by eye. The one open item is the signature: the Hebrew letters are signed `יתיר` and these say **Yatir**, a transliteration nobody has approved. | YOU | Confirm or correct the signature `Yatir`, then decide WHEN. Held on purpose so the 2026-11-27 Hebrew reading has one candidate cause - sending these before it gives that verdict two. |
| Hebrew communities ×4 | `hebrew.md` | draft | — | — | **Destinations named 2026-08-21, rules NOT re-readable from here.** A direct fetch of a Facebook group returns its title and nothing else - no rules, no pinned post, no About panel - public or private. So RCH5's fetch is the operator's, in the group, on the day; `hebrew.md` carries the checklist it has to produce. One rule IS known without login: `מורות משקיעות` brokers promotion through a named person by phone, so an unbrokered link there reads as dodging it **2026-08-23: a FOURTH post was written.** The Ministry's Hebrew-language group (`הוראת השפה העברית ביסודי`) was listed under post 3, and post 3 names seven games of which none is a language game - a roster arriving in a room whose subject is Hebrew. Post 4 leads on `מרכיבים מילה`'s wrong-tile-is-never-placed decision and links to `/he/games/learn/` rather than the home page. Nothing posted. | YOU | Open each group, read its rules THAT DAY, post the matching draft. `מורות משקיעות` brokers promotion by phone - clear it there first or skip that one. |
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
