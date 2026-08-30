# English ed-tech editors - three letters, prepared and NOT sent

**Status**: draft. Nothing has been sent. The operator decides when, and whether.

**Why this lane exists.** 66% of our impressions land on the bare/English URLs while
every letter we have ever sent went to a Hebrew destination. The Hebrew authority lane
was sent 2026-08-29 and its verdict is due 2026-11-27, so these are deliberately held:
sending them now would give that reading two candidate causes and settle neither.

**The one thing to confirm before any of these goes out.** The Hebrew letters are signed
`יתיר`. These are signed **Yatir**, a transliteration I chose - and the operator
**approved it on 2026-08-30**, so it stands. It appears three times here and once in
`crazygames.md`.

---

## How these three were chosen, and what was ruled out

`rel` was counted on a **real recent post** reached through each site's own feed, never
on a homepage - a homepage links to its author's own social accounts and tells you
nothing. Measured 2026-08-29.

| Destination | Latest post | External anchors | dofollow | nofollow | Verdict |
|---|---|---|---|---|---|
| `askatechteacher.com` | **2026-08-28** | 63 | **63** | 0 | **TAKE** |
| `controlaltachieve.com` | **2026-08-24** | 41 | **41** | 0 | **TAKE** |
| `classtechtips.com` | **2026-08-26** | 10 | **10** | 0 | **TAKE** |
| `freetech4teachers.com` | **2023-08-23** | 0 \* | 0 \* | 0 \* | **DEAD** - three years cold, on the DATE. The zeros are not evidence \* |
| `igamemom.com` | 2026-03-12 | 6 | 4 | 2 | **DROP** - five months cold, and half its outbound is affiliate (`amzn.to`, `shareasale`) |
| `findpwa.com` | - | - | - | - | **DEAD** - answers 200 with **33 bytes**, an empty shell |
| `appsco.pe` | - | - | - | - | **DEAD** - HTTP 503 |
| `teachersfirst.com` · `practicaledtech.com` | - | - | - | - | **UNVERIFIED** - no readable feed, so no inner page was measured. Naming the next check, not making a claim |

**`freetech4teachers.com` is the Tapuz shape again**, and it is worth writing down twice
because it reads alive from every angle that is cheap to check: the homepage returns 200,
the design is current, the archive is enormous. Its most recent post is from **August
2023**. A site-wide 200 is not evidence that anybody is still publishing.

**\* But its three zeros above were never a measurement**, and that was found on
2026-08-30, not on the day this table was written. The host answers a plain 200 with a
9,756-byte Blogger shell carrying no `<a` and no `<title>` - a real status code in front
of a document we never received. So the DATE is the finding and the anchor counts say
only that nothing was read. The verdict is unchanged and its evidence is now one thing
instead of two, which is the honest state. `prospects.mjs` reports that host `unchecked`
now, and keeps it as the live control for exactly this shape.

**The contact route was fetched too**, because a destination with no door is not a
destination:

| Destination | Route, as served 2026-08-29 |
|---|---|
| `askatechteacher.com/contact/` | 200, a form, and `askatechteacher@gmail.com` on the page |
| `controlaltachieve.com/p/about.html` | 200, `ericcurts@gmail.com`. **`/p/contact.html` is a 404** - do not use the obvious URL |
| `classtechtips.com/contact/` | 200, a form, and `info@classtechtips.com` |

---

## Letter 1 - askatechteacher.com

Her site is a standing review desk for classroom tech, and it links out generously with
no `rel` at all on anything. The angle is the review itself: she writes about tools, this
is a tool, and the honest limitation is the one a teacher would hit in week one.

> Subject: A free browser games site for kids - no account, no ads, works offline
>
> Hello,
>
> I build a small site of browser games for children and I am writing because you review
> exactly this kind of thing, at length, and you are one of the few people who says out
> loud when a tool is not worth the trouble.
>
> The site is ellaz.fun. It is 42 games that run in a browser tab - counting, letters,
> matching, mazes, sudoku, a few arcade ones for older children. There is nothing to
> download, no account to make, no advertising anywhere, and after the first visit it
> works with the internet switched off.
>
> The thing I would want a reviewer to know first is what it does not do. There is no
> teacher dashboard. No class codes, no rosters, no progress reports, nothing that lets
> an adult see what a child did. That is a deliberate choice about not collecting
> anything from children, and it also means the site is not a classroom management tool
> and will disappoint anyone looking for one. It is for the fifteen minutes at the end of
> a lesson, or for a child at home.
>
> If it is useful to you, the pages worth opening first are ellaz.fun/games/kids/ for the
> young end and ellaz.fun/games/sudoku/ for the other end of the range.
>
> I am a parent who built this, not a company, and there is nothing to sell - so no reply
> is needed and none is expected.
>
> Yatir
> yatiroffer@gmail.com

---

## Letter 2 - controlaltachieve.com

Eric Curts writes for schools running Chromebook fleets behind a filter. Nothing about a
review desk applies here; what matters is whether the thing survives a locked-down
network and a shared device, so that is the whole letter.

> Subject: Browser games that need no sign-in and no whitelist beyond one domain
>
> Hi Eric,
>
> Your recent piece on AI games is what made me think this might be in scope rather than
> noise, so apologies in advance if it is not.
>
> I run ellaz.fun, a set of free browser games for children. The reason I think it is
> interesting to you specifically is what it needs from a school network, which is almost
> nothing: one domain, no sign-in of any kind, no Google account, no Classroom
> integration, and no calls out to anywhere else once the page has loaded. A game never
> contacts a third party. There is no advertising, so there is no ad network to whitelist
> either.
>
> It also installs as a web app and keeps working when the connection drops, which on a
> cart of Chromebooks in a room with one access point turns out to matter more than
> anything else about it.
>
> The honest limitation, and it is the flip side of the same decision: because there are
> no accounts, progress lives in the browser on that device. A child who plays on the
> school Chromebook and then at home starts again, and a wiped profile takes the coins
> with it. For a fifteen-minute filler that is fine. For anything a teacher wants to
> track across a term, it is the wrong tool and I would rather say so than have you find
> out.
>
> ellaz.fun, if you want a look.
>
> Yatir
> yatiroffer@gmail.com

---

## Letter 3 - classtechtips.com

Monica Burns publishes short pieces on single free tools. The letter is correspondingly
short, and it leads on the one property the other two letters do not mention at all: the
site is written in four languages, which is unusual and is the reason a dual-language
classroom might care.

> Subject: A free games site that runs in four languages
>
> Hello Monica,
>
> One free tool, briefly, since that is the shape of what you publish.
>
> ellaz.fun is 42 browser games for children, and the whole site - every page, every
> menu, every instruction - is written in English, Hebrew, Spanish and French. A child
> can switch and keep playing. That is the part I think is worth a mention to a dual
> language or newcomer classroom, where the usual problem is that the good free thing
> only speaks English.
>
> No account, no advertising, no download.
>
> The caveat is worth stating plainly: the four languages are the site and its
> instructions. Most of the games themselves are numbers, shapes, matching and mazes, so
> they were already language-neutral, and only a handful actually teach letters or words
> - and those are the ones where the language really is the content. So this is
> multilingual access to games, not a language-learning programme, and it should not be
> described as one.
>
> Thank you for reading.
>
> Yatir
> yatiroffer@gmail.com

---

## Letter 4 - weareteachers.com  **(THE ONE BEING SENT)**

Measured 2026-08-30, after the three above and by a different instrument: their standing
roundup *50+ Amazing Sources for Free Teacher Resources* carries **208 external anchors
and not one `nofollow`**, and the page was modified **2026-07-28**. It is by a wide
margin the largest audience in this file.

The angle is theirs rather than ours. The other three letters are addressed to people who
review, or who solve a network problem, or who publish short single-tool pieces. This one
is addressed to a page whose entire job is to hold a list of free things, so the letter
argues the one property that decides whether an entry on such a list is still good in two
years.

**The door**: `weareteachers.com/contact-weareteachers/`, a form whose topic dropdown must
be set to **Editorial Feedback or Inquiry**. Not *Work With Us*, and not the sponsorship
link beside it - `RCH7` is iron, nothing here is bought.

**The form carries a hidden LinkedIn field. Leave it empty.** It is a honeypot, the same
shape that would have binned the macam letter behind a success screen on 2026-08-29. A
filled honeypot does not produce an error; it produces a thank-you page and silence.

> Subject: A free games site for kids with no free tier, because there is no paid one
>
> Hello,
>
> You keep a running list of places teachers can get good things for nothing, so I am
> writing about one entry for it rather than about a company.
>
> ellaz.fun holds 42 games, all of which run in an ordinary browser tab with nothing
> installed. What I think earns it a line on a list like yours is narrow and easy to
> check: there is no paid version of it. No premium tier, no trial that runs out, no
> email address collected in exchange for a printable, no upgrade prompt anywhere in it.
>
> That property matters for a roundup specifically. The usual way an entry on a
> free-resources list goes bad is not that the site vanishes; it is that the free part
> quietly shrinks. Here there is nothing to move behind a wall later. No accounts exist
> at all, whatever a child earns is kept in that browser and nowhere else, and there is
> no business on the other end waiting to convert anyone.
>
> What it is not, said plainly so nobody has to discover it: it is not a curriculum, it
> aligns to no standards, and it produces nothing a teacher can collect or grade. The
> games are counting, letters, matching, mazes, sudoku, and a few faster ones for older
> children. As the last ten minutes of a lesson or a wet indoor break it does that job
> well. As instruction it does not, and I would rather say so first.
>
> The youngest material is collected at ellaz.fun/games/kids/ if you want one page to
> look at.
>
> There is no company behind this to follow up with you, so please treat this as
> information rather than a request.
>
> Yatir
> yatiroffer@gmail.com

---

## Provenance

| Claim | Where it comes from |
|---|---|
| 42 games | `src/portal/catalog.ts`, and `catalog.test.ts` ratchets the count |
| four languages | `PAGE_LOCALES` in `src/i18n/locales.ts` - `["en","he","es","fr"]` |
| no account, no ads, no external calls from a game | `CLAUDE.md` § non-negotiable conventions |
| works offline after one visit | the PWA precaches the shell, `vite.config.ts` workbox |
| progress lives on the device | `CLAUDE.md` § Known traps - `localStorage`, no backend by design |
| no teacher dashboard exists | there is no such surface in `src/portal/` |
| `rel` counts and latest-post dates | fetched 2026-08-29 through each site's own feed |
| contact routes | fetched 2026-08-29; `controlaltachieve.com/p/contact.html` returned 404 |

| there is no paid tier and nothing is sold | there is no payment path in the repo: no checkout, no plan, no billing. The site has no backend at all |
| nothing is collected in exchange for anything | no account exists; `CLAUDE.md` § What may leave the machine - anonymous events only, never `identify()` |
| weareteachers 208 anchors, 0 nofollow, modified 2026-07-28 | `npm run reach:prospects`, 2026-08-30, recorded in `prospects-checked.json` |
| the LinkedIn field is a honeypot | read off the served form 2026-08-30; the same shape as the macam Gravity Form on 2026-08-29 |

**66% of impressions on bare/English URLs**: `docs/outreach/exports/performance-2026-08-21/`.
