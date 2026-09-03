**Status**: draft

# Lists a machine lets you into — the osgameclones shape, swept wide

**Swept 2026-09-03.** The question was narrow and the answer is narrower than
expected: **which curated lists (a) render on their own domain rather than on
github.com, (b) link out dofollow, (c) are still merging, and (d) will take us?**

Every row below was FETCHED today by `scripts/reach/prospects.mjs`, which runs its
own matcher control on every invocation — a fixture carrying three dofollow and two
nofollow anchors, plus a freshness/door fixture — so a `nofollow=0` reading is
believable only because the same run proved the matcher can report a `nofollow`.
Merge recency comes from `gh pr list --state merged`, never from stars
(`seo-playbook` D7, rewritten to recency after `awesome-phaser`).

**Population: 35 destinations.** 8 TAKE · 11 dropped with a measured reason ·
12 unchecked (a fetch failure is never a no) · 6 thin/blind.

## The finding, before the table

**osgameclones let us in because it has no popularity gate.** It indexes *clones of
games*, and it judges the clone. Almost every `awesome-*` list inherits
sindresorhus's contribution guidelines instead, and those carry a floor:

> "The submitted project should be more than 30 days old and the repo should have at
> least 40 stars."
> — `michelpereira/awesome-open-source-games`, `contributing.md`, read 2026-09-03

`Sigmafier/ellaz` has **0 stars**, created 2026-07-19. So the largest, liveliest,
most on-topic list in the sweep — merged 20 days ago, only 3 PRs queued, 3,049 stars —
is closed to us by a number no amount of writing a better entry can move. That is not a
reason to write a worse entry; it is the measurement that says this lane is one door
wide, not twenty.

**And the convention matters as much as the gate.** In that same list, **414 of 419
entries link to the GitHub repo rather than to the game's website.** Its rules do allow
either ("Link to the website or GitHub repo"), but a repo link is rendered by
github.com, which is `nofollow` — 5/5 measured on our own repository page 2026-08-23.
A dofollow list that points at repos earns readers, not authority. Check the entry
FORMAT, not only the list's `rel` (`seo-doctrine` D15).

## Live, dofollow, and reachable

<!-- lists:rows -->

| Destination | df / ext | hosts | fresh | Door | Verdict |
|---|---|---|---|---|---|
| `osgameclones.com` | 679/679 | 97 | 2026-09-01 | **GitHub PR** | **DONE** — PR #5052 open, 8 entries, `expected` row watched |
| `libregamewiki.org` | 695/695 | **497** | 2026 | free wiki account, moderated | **TAKE — the find of the sweep** |
| `trackawesomelist.com` | 438/438 | 13 | 2026 | none of its own | **MULTIPLIER**, not a door |
| `awesome-selfhosted.net` | 3030/3030 | 1313 | 2027 | GitHub PR | proof the pattern scales; **wrong category** |
| `opengameart.org` | 49/49 | 20 | 2026 | account | **for art ASSETS, not games** — out of scope |
| `saashub.com` | 11/26 | 18 | 2026-08-26 | self-serve `/submit/list` | TAKE, but a category stretch |
| `gamingonlinux.com` | 15/17 | 9 | 2026-09-03 | contact form | TAKE, but the door is **a letter** |
| `techlearning.com` | 67/73 | 50 | 2025-12-24 | editorial | TAKE, but the door is **a letter** |

<!-- /lists:rows -->

**`libregamewiki.org` is the one that matters.** 695 external anchors, every one
dofollow, across **497 distinct hosts** — that host count is the tell, because it means
the wiki links out to 497 different games' own sites rather than repeating a handful.
Its category tree reads like our catalogue: *Educational games · Word games · Memory
games · Board games · Card games · Tetris-like games · Breakout-like games*.

Its bar is a licence, not a popularity score, and it is stated as two separate
requirements:

> "Their source code licensed under a free source code license."
> "Their media licensed under a free media license when applicable."
> — `Libregamewiki:Article_policy`, read 2026-09-03

Ellaz is MIT, and the art is SVG committed in the same MIT repository, so both halves
are covered on the face of it — **to be re-read and argued on the day, not assumed**
(`reach-doctrine` RCH3). What it needs from us that osgameclones did not: **a
registered account**, free and not a social one, and the edit passes through
moderation (`ext.moderation.notify` is loaded on every page).

**`trackawesomelist.com` is a multiplier and has no door of its own.** It mirrors
awesome lists on its own dofollow domain, and it renders an entry's website URL when
the entry has one — measured on its `awesome-open-source-games` page: 425 github.com
anchors beside `mindustrygame.github.io`, `www.playreia.com`, `hurrycurry.org`,
`nzp.gay`. So a merged entry that links to a WEBSITE earns a dofollow there as well as
on the list's own site. It 404s on `hemanth/awesome-pwa`, so it does not mirror
everything.

## Dropped, each with the fact that dropped it

| Destination | Why |
|---|---|
| `michelpereira/awesome-open-source-games` | **alive and closed to us**: merged 2026-08-14, 3 PRs queued — and `contributing.md` requires ≥40 stars. We have 0 |
| `leereilly/games` | **24,942 stars, last merged PR 2018-08-20.** The whole reason D7 ranks by recency and not by stars |
| `proyecto26/awesome-jsgames` | last merge 2026-02-03, 15 PRs queued — seven months cold |
| `K3V1991/Awesome-Gaming-List` | last merge 2025-10-11 — eleven months cold |
| `GamH5/awesome-html5-games` | **has never merged a pull request**; last push 2025-05-22 |
| `kaigani/HTML5-games-list` | last merge 2014-06-03 |
| `zhaolinxu/games-list` | never merged a pull request; last push 2017-10-31 |
| `project-awesome.org` | renders awesome lists on its own domain and **is a graveyard** — newest date on the page 2021, and all 414 anchors resolve to one host |
| `directory.fsf.org` | dormant: newest date 2023 |
| `rawg.io` | every external anchor `nofollow` |
| `educationalappstore.com` | every external anchor `nofollow` |

## Unchecked — a fetch failure is NEVER a no

`mobygames.com` · `igdb.com` · `pcgamingwiki.com` · `alternativeto.net` ·
`openhub.net` · `gamedev.net` · `slant.co` (403 to both user agents) ·
`curlie.org` (504) · `teachersfirst.com` (300) · `kidsites.com` · `pwa.directory` ·
`reddit.com` (200 carrying no anchors — not the document).

Four more read **blind** — `freegamedev.net`, `itch.io`, `gamejolt.com`,
`kidzsearch.com` — which means the matcher found no anchors at all, usually a
client-rendered shell. Blind says the instrument read nothing; it says nothing about
the page (`seo-doctrine` SEO28).

**Six read thin**: `oercommons.org`, `merlot.org`, `phaser.io`, `commonsense.org`,
`producthunt.com`, `openbenches.org` — anchors found, but repeated across too few
distinct hosts to be reach.

## Two instrument errors in this sweep, both mine

**I read a page that does not exist as though it were policy.** Guessing
`LGW:Inclusion_criteria`, `LGW:Article_policy`, `LGW:About` and `Help:Adding_a_game`
returned four MediaWiki "There is currently no text in this page" stubs, and the first
one nearly went into this file as the wiki's rules. The namespace is `Libregamewiki:`,
not `LGW:`, and the correct page was reached by following the wiki's own link rather
than by guessing a fifth title. **A wiki answers 200 for a page it does not have.**

**And the first search for the multiplier pattern returned SEO spam** — "1000+ Free
Dofollow Backlink Sites", "Best Dofollow Social Bookmarking Sites". Those are precisely
what `RCH7` (IRON) forbids, and none was probed. A query containing the word "dofollow"
attracts the industry that sells it.

---

**Last checked**: 2026-09-03 · re-run with `node scripts/reach/prospects.mjs <url>...`
