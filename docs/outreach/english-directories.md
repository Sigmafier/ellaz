# English ed-tech editors - three letters, prepared and NOT sent

**Status**: draft, and that word now covers three letters rather than four.
**Letters 4 (weareteachers.com), 5 (libraries.oc.gov) and 6 (greenburghlibrary.org)
were all SENT 2026-08-30**;
letters 1 to 3 are still held and nothing about them has changed. The header stays `draft` because that is what the ledger
gate reads it as - a file holding several surfaces at different stages is `draft` while
any of them is, and the per-surface truth lives in the rows. Do not read this line as
"nothing has been sent": it said exactly that until 2026-08-30, which is how a header
outlives the fact it was describing.

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

## Letter 4 - weareteachers.com  **(SENT 2026-08-30)**

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

**Sent 2026-08-30. What was observed, and what it is worth.** The form element was gone
from the DOM and Gravity Forms' own confirmation stood in its place, *"Thanks for
contacting us! We will get in touch with you shortly."*, with zero `.gfield_error` nodes.
**That confirmation is not by itself evidence of delivery** - a honeypot trip returns the
identical screen, since returning the success screen is the entire mechanism. What
upgrades it is the reading taken twice immediately beforehand: `input_7` empty at fill,
and `input_7` still empty after the cookie banner was answered. The body was verified by
hash rather than by eye - 1,602 chars, sha256 `40393007cedf54a9`, byte-equal to this
letter as committed in `e79f451`. Network capture was not running at submit time, so no
wire record exists, and **re-submitting to obtain one would send a duplicate**, so this
grade is final.

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

## Letter 5 - libraries.oc.gov  **(SENT 2026-08-30)**

**And the honest revision of why it is here.** It was picked on 2026-08-30 for "167
external anchors, every one dofollow", which is a true number and a misleading one.
Reading the hosts behind it: `ocpl.org`, `catalog.ocpl.org`, `ocpl.libcal.com`,
`ocpl.overdrive.com`, `ocpl.kanopy.com`, `ocpl.beanstack.org` and a dozen *Friends of
the X Library* nonprofits, all external only because they are different registrable
domains from `oc.gov`. **The genuinely third-party sites that page sends a reader to
are four**: funbrain, nick, nickjr, pbskids.

So the case is not reach. It is that this is a `.gov` children's shelf with four names
on it, we would be the fifth, and the fit is better than one or two of the four. That
is a smaller claim and it is the true one.

**The door**: `libraries.oc.gov/contact/inquiries`, topic **General Inquiry** - the
dropdown has no resource-suggestion category, and the page explicitly routes book
marketing and purchase suggestions elsewhere, so General Inquiry is the honest pick
rather than a stretch. **The form carries a CAPTCHA**, so it cannot be submitted by
anyone but a person: fill, then hand over.

**Sent 2026-08-30, and it produced the best evidence any form in this lane has given.**
The submit redirected to `/form/inquiries/confirmation?token=b8BJjgiP…` and the page
reads **"New submission added to Inquiries."** That is a different kind of fact from a
thank-you string: a thank-you is what a honeypot returns, while this is Drupal Webform
reporting that a RECORD WAS STORED, with a server-issued identifier for it. The
redirect also proves the CAPTCHA validated, since a failed one re-renders the form with
an error instead of issuing a token. Body hash-verified before the click: 1,495 chars,
sha256 `6c60136e39307bc4`, byte-equal to this letter as committed in `80d1bae`.

The angle is the one no other letter here uses, because it only matters to a library.

> Subject: A free games site for the kids page, no account and nothing recorded
>
> Hello,
>
> Your children's games page lists four outside sites. I would like to suggest a fifth,
> and I will keep it short because you have presumably been asked this before.
>
> ellaz.fun is a set of browser games for children. What I think makes it fit a library
> page rather than a general list is that it asks a child for nothing. There is no
> account and no way to make one, no email, no name, no age, no sign-in of any kind.
> Nothing about who played is recorded or sent anywhere, because there is no server to
> send it to. It is not a privacy policy promising restraint, it is that the capability
> does not exist.
>
> Practically, that means it opens on a public terminal in one click, needs no
> installation and no plugin, and behaves the same on a phone a parent hands over in the
> reading room.
>
> The limitation is real and it is sharper in a library than anywhere else. Because
> there are no accounts, whatever a child collects is stored in that browser on that
> machine. On a shared public computer that means progress does not follow them home,
> and the next child may find someone else's. For a twenty-minute visit it does not
> matter. For anything a family wants to keep, it is the wrong tool and I would rather
> say that than have a parent discover it.
>
> If it is worth a look, ellaz.fun/games/kids/ is the page that matches yours.
>
> There is nothing being sold and no company here, so this needs no reply.
>
> Yatir
> yatiroffer@gmail.com

---

## Letter 6 - greenburghlibrary.org  **(SENT 2026-08-30)**

**Why this one and not another library.** OC's page counted 167 dofollow anchors and
turned out to point mostly at its own county ecosystem. Greenburgh's does not: read on
2026-08-30 it lists **twenty-five outside children's game sites**, each with a written
description - ABCYa, PBS Kids, National Geographic Kids, NASA Space Place, Starfall,
Sheppard Software, Poptropica, Sesame Street, Toy Theater, Cool Math, Chess Kid, and so
on. Somebody maintains that page and writes a sentence about each entry. `prospects.mjs`
reads it as 34 external anchors across 30 hosts.

**And one of the twenty-five is `Arbol ABC`**, described in Spanish, *"Juegos gratis para
niños de 3 a 10 años"*. That is the hook, and it is theirs rather than ours: whoever
keeps this list has already decided a non-English entry belongs on it.

So the argument is about the SHELF, not about classrooms - one entry that covers four
languages rather than four entries. Letter 3 makes a language argument to a blogger about
teaching; this one makes a collection argument to whoever maintains a list.

**The door**: `greenburghlibrary.libanswers.com` - Ask a Librarian. Fields are Your
Question (required), More Detail, Email (required), Name (required), library card
(optional), plus a confirmation checkbox. **No resource-suggestion form exists on that
site**, and Ask a Librarian is built for patrons asking reference questions, which we are
not. That mismatch goes in the letter rather than being papered over; a librarian will
spot it in one line and the alternative is pretending not to have noticed.

**Sent 2026-08-30.** LibAnswers answered *"Thank you! We will contact you when the
question is answered."* and cleared the form. Body hash-verified before the click:
1,378 chars, sha256 `9d292820f7d5108b`. The Question field took the one-line ask
because `pquestion` is a single-line input, and the letter went in More Detail. All six
hidden fields were plumbing carrying values, so unlike the WeAreTeachers form there was
no honeypot to leave alone. **The confirmation box was ticked deliberately** - that
receipt would be a copy somebody else holds, which is a better grade than a string on a
page - and it had not arrived when checked minutes later, with `newer_than:1d`
returning 20 messages as the control. A not-yet, not a never.

> Subject: One entry for the games list, and it covers the Spanish gap too
>
> Hello,
>
> This is not a reference question and I am not a patron, so please pass it to whoever
> keeps the children's games page and ignore it if that is not a thing you take this way.
>
> That page lists twenty-five outside sites, each with a line of description, and one of
> them is Arbol ABC in Spanish. I am writing about a site that would sit next to it, and
> the reason I think it is worth one line rather than none is that it is the same site in
> four languages.
>
> ellaz.fun runs in English, Hebrew, Spanish and French. Not four sites and not a
> translation layer over an English one: the whole interface, every menu and every
> instruction, exists in all four, and a child switches with one tap and keeps playing.
> For a list like yours that means one entry doing what four would otherwise have to.
>
> It is free with nothing to buy, it asks for no account and no email, and it holds
> nothing about a child anywhere. The games are counting, letters, matching, mazes,
> sudoku, and some faster ones for older children.
>
> What it is not: there is no reading curriculum and no levelling, so it does not belong
> beside Starfall as an instruction tool. It belongs where Toy Theater and Cool Math are,
> which is why I am suggesting the games page rather than anything else.
>
> ellaz.fun, and ellaz.fun/es/ if you want to check the Spanish claim rather than take it
> from me.
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
| greenburgh lists 25 outside game sites, one Spanish | read off the served page 2026-08-30, each with its own description; `Arbol ABC` is the Spanish one. `prospects.mjs` reads the same page as 34 anchors / 30 hosts - the two count different things and both are recorded |
| ellaz.fun/es/ exists and is Spanish | `PAGE_LOCALES` in `src/i18n/locales.ts`, and `assert:pages` emits and checks the `es` arm of all 200 documents |
| the OC page links to four third-party sites | read off the served page 2026-08-30: funbrain, nick, nickjr, pbskids. The other 24 hosts are `ocpl.*` and *Friends of* nonprofits |
| the OC form has a CAPTCHA and no suggestion topic | fetched 2026-08-30; the topic list is Collection / Discover and Go / Programs / OC Stories / OC READ / Technical Support / Administration / General Inquiry / Genealogy |
| the LinkedIn field is a honeypot | read off the served form 2026-08-30; the same shape as the macam Gravity Form on 2026-08-29 |

**66% of impressions on bare/English URLs**: `docs/outreach/exports/performance-2026-08-21/`.
